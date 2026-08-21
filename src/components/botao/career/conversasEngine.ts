/**
 * Motor central de conversas do celular.
 *
 * REGRA DE OURO: um contato é UMA conversa. Mensagens novas de um contato
 * entram na conversa existente dele — nunca criam outra conversa.
 *
 * Identidade estável da conversa (nesta ordem):
 *   1. npcId  → chave "npc:{npcId}"  (Valéria, Pracinha, Bragança...)
 *   2. canal  → chave "canal:{canal}" (medico, redes, decisao:{eventoId}...)
 *   3. nome   → chave "nome:{nome}"   (fallback p/ dados legados sem npcId/
 *      canal — o modelo antigo criava uma conversa por evento com o MESMO
 *      nome de contato, ex.: várias "Dr. Maurício"/"Torcida (Redes Sociais)")
 *
 * O id da conversa mesclada é determinístico ("conv-npc-...", "conv-canal-...")
 * para que reload/hidratação reconheça a mesma conversa e a idempotência por
 * mensagem (dedupe por id) funcione.
 *
 * PURO: sem efeitos colaterais, sem imports com alias "@/" — testável com jiti.
 */

import type { CareerState, ConversaCelular } from "./types";

/** Máximo de conversas mantidas no celular (as mais antigas caem). */
export const MAX_CONVERSAS = 30;
/** Máximo de mensagens por conversa (histórico longo é podado, não duplicado). */
export const MAX_MENSAGENS_POR_CONVERSA = 100;

type MensagemConversa = ConversaCelular["mensagens"][number];

/** Chave de identidade estável de uma conversa. */
export function chaveConversa(
  c: Pick<ConversaCelular, "id" | "npcId" | "canal" | "nome">,
): string {
  if (c.npcId) return `npc:${c.npcId}`;
  if (c.canal) return `canal:${c.canal}`;
  return `nome:${c.nome.trim().toLowerCase()}`;
}

/** Id determinístico da conversa para contatos/canais estáveis. */
export function idConversaEstavel(c: Pick<ConversaCelular, "id" | "npcId" | "canal">): string {
  if (c.npcId) return `conv-npc-${c.npcId}`;
  if (c.canal) return `conv-canal-${c.canal.replace(/[^a-z0-9:-]/gi, "_")}`;
  return c.id;
}

function mesclarMensagens(
  antigas: MensagemConversa[],
  novas: MensagemConversa[],
): MensagemConversa[] {
  const vistos = new Set(antigas.map((m) => m.id));
  const acrescentar = novas.filter((m) => !vistos.has(m.id));
  return [...antigas, ...acrescentar].slice(-MAX_MENSAGENS_POR_CONVERSA);
}

/**
 * Entrega uma conversa/mensagem no celular: se já existe conversa do mesmo
 * contato (npcId/canal), as mensagens novas entram nela (dedupe por id) e a
 * conversa sobe para o topo marcada como não lida. Senão, cria a conversa.
 *
 * Exceção de segurança: se a conversa existente tem um dilema RPG NÃO
 * respondido e a entrega traz OUTRO dilema, a nova fica separada para não
 * esconder a escolha pendente (caso raro — eventos são espaçados).
 */
export function anexarConversa(career: CareerState, nova: ConversaCelular): CareerState {
  const conversas = Array.isArray(career.conversas) ? career.conversas : [];
  const chave = chaveConversa(nova);
  const idx = conversas.findIndex((c) => chaveConversa(c) === chave);

  if (idx === -1) {
    const criada: ConversaCelular = { ...nova, id: idConversaEstavel(nova) };
    return { ...career, conversas: [criada, ...conversas].slice(0, MAX_CONVERSAS) };
  }

  const existente = conversas[idx]!;
  const dilemaPendente =
    existente.eventoRpg && !existente.eventoRpg.respondido ? existente.eventoRpg : null;
  if (nova.eventoRpg && dilemaPendente && nova.eventoRpg.eventoId !== dilemaPendente.eventoId) {
    // Não sobrescreve a escolha pendente: entrada separada (id único).
    const separada: ConversaCelular = { ...nova, id: `${nova.id}-${Date.now()}` };
    return { ...career, conversas: [separada, ...conversas].slice(0, MAX_CONVERSAS) };
  }

  const mesclada: ConversaCelular = {
    ...existente,
    id: idConversaEstavel(existente),
    // Identidade visual estável: nome/avatar do contato não mudam por evento.
    nome: existente.nome,
    avatar: existente.avatar,
    // Cargo é a identidade fixa do contato (ex.: "Guardião da Cidadela") —
    // não muda a cada evento; só usa o da entrega se o existente for vazio.
    cargo: existente.cargo || nova.cargo,
    npcId: existente.npcId ?? nova.npcId,
    canal: existente.canal ?? nova.canal,
    mensagens: mesclarMensagens(existente.mensagens, nova.mensagens),
    // Chegou mensagem nova não lida → conversa não lida. Entrega "lida"
    // (ex.: registro da própria decisão do usuário) não marca a conversa.
    naoLida: nova.naoLida || existente.naoLida,
    eventoRpg: nova.eventoRpg ?? existente.eventoRpg,
    linkExterno: nova.linkExterno ?? existente.linkExterno,
    linkCartorio: nova.linkCartorio ?? existente.linkCartorio,
  };

  const resto = conversas.filter((_, i) => i !== idx);
  return { ...career, conversas: [mesclada, ...resto].slice(0, MAX_CONVERSAS) };
}

/** Atalho: entrega apenas uma mensagem nova de um contato já identificado. */
export function anexarMensagem(
  career: CareerState,
  base: Omit<ConversaCelular, "mensagens">,
  mensagem: MensagemConversa,
): CareerState {
  return anexarConversa(career, { ...base, mensagens: [mensagem] });
}

/**
 * Saneia o histórico vindo do banco: funde conversas duplicadas do mesmo
 * contato (legado que criava uma conversa por evento), remove mensagens
 * duplicadas por id e aplica os limites de tamanho. A conversa resultante
 * recebe o id estável — a próxima hidratação reconhece o mesmo contato.
 */
export function normalizarConversas(brutas: unknown): ConversaCelular[] {
  if (!Array.isArray(brutas)) return [];
  const validas = brutas.filter(
    (c): c is ConversaCelular =>
      !!c &&
      typeof (c as ConversaCelular).id === "string" &&
      Array.isArray((c as ConversaCelular).mensagens),
  );

  const porChave = new Map<string, ConversaCelular[]>();
  for (const c of validas) {
    const chave = chaveConversa(c);
    const grupo = porChave.get(chave);
    if (grupo) grupo.push(c);
    else porChave.set(chave, [c]);
  }

  const resultado: ConversaCelular[] = [];
  for (const grupo of porChave.values()) {
    // Lista é "mais nova primeiro": a base é a mais recente; mensagens das
    // cópias mais antigas entram ANTES (ordem cronológica aproximada).
    const base = grupo[0]!;
    const mensagens: MensagemConversa[] = [];
    const vistos = new Set<string>();
    for (const conv of [...grupo].reverse()) {
      for (const m of conv.mensagens) {
        if (vistos.has(m.id)) continue;
        vistos.add(m.id);
        mensagens.push(m);
      }
    }
    const dilemaAberto = grupo.find((c) => c.eventoRpg && !c.eventoRpg.respondido)?.eventoRpg;
    resultado.push({
      ...base,
      id: idConversaEstavel(base),
      mensagens: mensagens.slice(-MAX_MENSAGENS_POR_CONVERSA),
      naoLida: grupo.some((c) => c.naoLida),
      eventoRpg: dilemaAberto ?? base.eventoRpg,
      linkExterno: grupo.find((c) => c.linkExterno)?.linkExterno,
      linkCartorio: grupo.find((c) => c.linkCartorio)?.linkCartorio,
    });
  }
  return resultado.slice(0, MAX_CONVERSAS);
}
