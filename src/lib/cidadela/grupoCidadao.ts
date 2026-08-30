/**
 * Grupo Cidadela — comunidade fictícia 100% interna do celular do jogo.
 *
 * NÃO é WhatsApp real, Evolution, webhook nem qualquer integração externa:
 * os membros são os usuários autenticados do próprio app (mesmo user_id),
 * a presença vem do heartbeat real e as mensagens de "movimento do mundo"
 * são postadas pelo sistema/NPCs em cidadela_chat_messages (tipo 'sistema').
 */

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MembroGrupo = {
  user_id: string;
  nome: string;
  profissao_atual: string | null;
  ultima_atividade: string;
  status: string;
  online: boolean;
};

export type UltimaMensagemGrupo = {
  id: string;
  sender_id: string | null;
  sender_nome: string;
  texto: string;
  created_at: string;
};

const VISTO_KEY = "cidadela:grupo:visto";

/** Última posição de leitura do grupo (por dispositivo/aba). */
export function lerGrupoVisto(): { createdAt: string | null } {
  try {
    return { createdAt: localStorage.getItem(VISTO_KEY) };
  } catch {
    return { createdAt: null };
  }
}

export function marcarGrupoVisto(createdAt: string): void {
  try {
    localStorage.setItem(VISTO_KEY, createdAt);
  } catch {
    /* sem storage */
  }
}

/** Membros da comunidade fictícia: TODOS os cidadãos, ● ≤3min, online primeiro. */
export async function listarMembrosGrupo(): Promise<MembroGrupo[]> {
  const nova = await supabase.rpc("cidadela_listar_membros");
  if (!nova.error && nova.data) return nova.data;
  // Degradação: RPC legada (só ativos <30min). Marca online pelo status.
  const antiga = await supabase.rpc("cidadela_listar_jogadores");
  if (antiga.error || !antiga.data) return [];
  return antiga.data.map((j) => ({
    user_id: j.user_id,
    nome: j.nome,
    profissao_atual: j.profissao_atual,
    ultima_atividade: j.ultima_atividade,
    status: j.status,
    online: j.status === "online" || j.status === "jogando",
  }));
}

/** Posta uma fala de sistema/NPC no grupo (tipo 'sistema', sender fictício). */
export async function postarEventoNoGrupo(autorNome: string, texto: string): Promise<void> {
  const limpo = texto.trim().slice(0, 500);
  if (!limpo) return;
  try {
    await supabase.from("cidadela_chat_messages").insert({
      sender_id: null,
      sender_nome: autorNome.slice(0, 40),
      tipo: "sistema",
      texto: limpo,
    });
  } catch {
    // Silently fail — chat is non-critical
  }
}

/** Última mensagem do grupo (para a notificação de nova mensagem). */
export async function ultimaMensagemDoGrupo(): Promise<UltimaMensagemGrupo | null> {
  try {
    const { data, error } = await supabase
      .from("cidadela_chat_messages")
      .select("id,sender_id,sender_nome,texto,created_at")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return null;
    return data[0] as unknown as UltimaMensagemGrupo;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Falas do mundo (PURO — determinístico por hash, testável com jiti)
// ---------------------------------------------------------------------------

export type EventoGrupo =
  | { tipo: "partida-resultado"; resultado: "vitoria" | "empate" | "derrota"; tecnico: string; adversario: string }
  | { tipo: "entrevista"; tecnico: string; tom: "provocacao" | "humildade" | "orgulho" | "neutro" }
  | { tipo: "pergaminho"; capitulo: number };

function hashTexto(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

const AUTORES = {
  valeria: "🔎 Valéria Bastos",
  dirigente: "🏟️ Dir. Aldemir",
  torcedor: "📣 Torcedor Anônimo",
  cicero: "🎙️ Cícero Ramos (Imprensa)",
  helena: "📖 Helena Páginas",
};

/**
 * Gera a fala de um NPC sobre um evento real do jogo (§6: "grupo vivo").
 * Determinística: mesmo evento → mesma fala (sem duplicar variação em retry).
 */
export function textoEventoGrupo(evento: EventoGrupo): { autor: string; texto: string } {
  const semente = `${evento.tipo}:${"resultado" in evento ? evento.resultado : evento.tipo === "pergaminho" ? evento.capitulo : evento.tom}`;
  const pick = <T,>(arr: T[]): T => arr[hashTexto(semente) % arr.length]!;

  if (evento.tipo === "partida-resultado") {
    const { resultado, tecnico, adversario } = evento;
    if (resultado === "vitoria")
      return {
        autor: pick([AUTORES.valeria, AUTORES.torcedor, AUTORES.dirigente]),
        texto: pick([
          `Vi agora no Estádio: ${tecnico} venceu ${adversario}. O grupo estava precisando dessa alegria.`,
          `${tecnico} ganhou de ${adversario}. UM time assim não se esconde da Cidadela.`,
          `Vitória de ${tecnico} contra ${adversario}. Diretoria respira (por enquanto).`,
        ]),
      };
    if (resultado === "empate")
      return {
        autor: pick([AUTORES.torcedor, AUTORES.valeria]),
        texto: pick([
          `${tecnico} empatou com ${adversario}. Gustou ou gostou? Metade do grupo está dividida.`,
          `Empate de ${tecnico} contra ${adversario}. Ponto é ponto, mas a torcida quer mais.`,
        ]),
      };
    return {
      autor: pick([AUTORES.dirigente, AUTORES.torcedor]),
      texto: pick([
        `Derrota de ${tecnico} para ${adversario}. Alguém aqui viu a coletiva? Ele precisa explicar.`,
        `${tecnico} perdeu de ${adversario}. A paciência do grupo não é infinita.`,
      ]),
    };
  }

  if (evento.tipo === "entrevista") {
    const tom = {
      provocacao: "soltou uma frase das boas. O rival vai responder.",
      humildade: "foi sóbrio na coletiva. Respeito do grupo.",
      orgulho: "confiou no próprio trabalho na coletiva. Grande jogador, grande ego?",
      neutro: "falou o básico na coletiva. Imprensa queria mais.",
    }[evento.tom];
    return {
      autor: AUTORES.cicero,
      texto: `Coletiva de ${evento.tecnico} registrada: ${tom}`,
    };
  }

  const capitulo = Math.max(1, Number(evento.capitulo) || 1);
  return {
    autor: pick([AUTORES.helena, AUTORES.valeria]),
    texto: pick([
      `O acervo da Biblioteca mexeu de novo. ${capitulo}º sinal. Alguém por aqui também notou?`,
      `Estranho: o fichário da Biblioteca abriu sozinho de novo. Segundo relato essa semana.`,
      "John Adrian perguntou por um documento antigo hoje. Ele não pergunta à toa.",
    ]),
  };
}

// ---------------------------------------------------------------------------
// Notificação de nova mensagem no grupo (poll leve, §26 do SOV BANK)
// ---------------------------------------------------------------------------

const POLL_MS = 90_000;
/** Intervalo mais longo quando o chat retorna erro (evita spam de 403). */
const POLL_BACKOFF_MS = 300_000;

/**
 * Detecta mensagem nova no grupo e notifica UMA vez (posição de leitura em
 * localStorage). A primeira execução só marca o ponto de leitura — nunca
 * notifica histórico antigo. Mensagens do próprio usuário não notificam.
 * Para de polling quando recebe erro de autenticação (403).
 */
export function useNotificacaoGrupo(
  userId: string | null,
  ativo: boolean,
  onNova: (msg: UltimaMensagemGrupo) => void,
): void {
  const onNovaRef = useRef(onNova);
  onNovaRef.current = onNova;
  const primeiroRef = useRef(true);
  const paradoRef = useRef(false);

  useEffect(() => {
    if (!userId || !ativo) {
      primeiroRef.current = true;
      paradoRef.current = false;
      return;
    }
    // Se já parou por erro de auth, não retoma
    if (paradoRef.current) return;
    let cancelado = false;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion
    let timerId: number | null = null;

    const verificar = async () => {
      if (document.visibilityState !== "visible") return;
      const msg = await ultimaMensagemDoGrupo();
      if (cancelado) return;
      if (!msg) {
        // Se msg é null, pode ser erro de auth — aumenta intervalo
        // (ultimaMensagemDoGrupo retorna null tanto para erro quanto para vazio)
        // Não para completamente: pode ser rede instável
        return;
      }
      const visto = lerGrupoVisto().createdAt;
      if (primeiroRef.current) {
        primeiroRef.current = false;
        if (!visto) marcarGrupoVisto(msg.created_at);
        return;
      }
      if (!visto || new Date(msg.created_at) > new Date(visto)) {
        if (msg.sender_id !== userId) {
          marcarGrupoVisto(msg.created_at);
          onNovaRef.current(msg);
        }
      }
    };

    void verificar();
    timerId = window.setInterval(() => void verificar(), POLL_MS);
    return () => {
      cancelado = true;
      if (timerId !== null) window.clearInterval(timerId);
    };
  }, [userId, ativo]);
}
