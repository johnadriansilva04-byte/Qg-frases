/**
 * transferenciaEngine — ofertas de clubes para o treinador trocar de clube
 * durante a carreira (§6 do dono).
 *
 * Gatilhos de DATA (nunca por rodada solta):
 *  - MEIO da temporada (rodada 10): 1 oferta de um clube da MESMA divisão com
 *    força um pouco acima do nível atual do treinador;
 *  - FIM da temporada (rodada 19): 1-2 ofertas, possivelmente da divisão de
 *    cima se o treinador vai bem (promovido/prestígio).
 *
 * A oferta chega como conversa no celular (diretor do clube interessado), com
 * proposta clara: salário oferecido por 10 rodadas, bônus de assinatura e a
 * possibilidade de ACEITAR ou RECUSAR. Aceitar muda o clube-alvo da próxima
 * temporada (o treinador leva sua carreira; a receita esportiva passa a ir
 * para o caixa do NOVO clube).
 *
 * Determinístico por temporada+seed (F5 não duplica nem muda a oferta).
 *
 * Módulo PURO (sem alias `@/`) — testável com jiti.
 */

export type OfertaTransferencia = {
  id: string;
  clubeId: string;
  clubeNome: string;
  clubeSigla: string;
  escudo: string;
  divisaoOfertante: string;
  /** Salário oferecido por 10 rodadas (§13). */
  salarioPor10: number;
  /** Bônus de assinatura em SOV (dinheiro pessoal do treinador). */
  bonusAssinatura: number;
  /** Força do clube interessado (para o jogador comparar). */
  power: number;
  /** Texto da proposta (diretor do clube). */
  proposta: string;
  /** Rodada gatilho (10 = meio, 19 = fim). */
  rodadaGatilho: number;
  temporada: number;
  respondida: "pendente" | "aceita" | "recusada";
};

const RODADA_MEIO = 10;
const RODADA_FIM = 19;

function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export type ClubeElegivel = {
  id: string;
  nome: string;
  sigla: string;
  power: number;
  escudo?: string | undefined;
  divisao: string;
};

/**
 * Gera a oferta de transferência para a rodada atual, se houver gatilho.
 * `prestigio` = quão bem vai o treinador (posição na tabela invertida + moral):
 * prestígio alto no fim da temporada atrai clubes da divisão de cima.
 * Retorna null quando não é rodada de oferta ou já existe oferta pendente.
 */
export function gerarOfertaTransferencia(
  clubes: ClubeElegivel[],
  temporada: number,
  rodada: number,
  divisaoAtual: string,
  prestigio: number,
  seed: string,
): OfertaTransferencia | null {
  const ehMeio = rodada === RODADA_MEIO;
  const ehFim = rodada === RODADA_FIM;
  if (!ehMeio && !ehFim) return null;

  const h = hashSeed(`${seed}:t${temporada}:r${rodada}`);
  // No fim da temporada com prestígio alto, clubes da divisão de CIMA olham
  // o treinador; senão, clubes da mesma divisão.
  const divisaoAlvo =
    ehFim && prestigio >= 60
      ? divisaoAtual === "serie-c"
        ? "serie-b"
        : divisaoAtual === "serie-b"
          ? "serie-a"
          : "serie-a"
      : divisaoAtual;
  const pool = clubes.filter((c) => c.divisao === divisaoAlvo);
  if (pool.length === 0) return null;

  const escolhido = pool[h % pool.length]!;
  // Salário oferecido: um degrau acima do padrão da divisão alvo quando o
  // prestígio é alto (o clube "paga mais" para tirar o treinador).
  const salarioBase =
    divisaoAlvo === "serie-a" ? 25 : divisaoAlvo === "serie-b" ? 15 : 10;
  const salarioPor10 = salarioBase + (prestigio >= 60 ? 5 : 0);
  const bonusAssinatura = ehFim ? 15 + Math.floor(prestigio / 10) : 8 + Math.floor(prestigio / 20);

  return {
    id: `transfer-t${temporada}-r${rodada}-${escolhido.id}`,
    clubeId: escolhido.id,
    clubeNome: escolhido.nome,
    clubeSigla: escolhido.sigla,
    escudo: escolhido.escudo ?? "🛡️",
    divisaoOfertante: divisaoAlvo,
    salarioPor10,
    bonusAssinatura,
    power: escolhido.power,
    proposta:
      `Treinador, aqui é a diretoria do ${escolhido.nome}. ` +
      (ehFim
        ? `Acompanhamos sua temporada e queremos você comandando nosso projeto a partir da próxima. `
        : `Estamos na metade da temporada e precisamos de um comando novo com urgência. `) +
      `Oferecemos salário de ${salarioPor10} SOV a cada 10 rodadas` +
      (bonusAssinatura > 0 ? ` e bônus de assinatura de ${bonusAssinatura} SOV` : "") +
      `. O que me diz?`,
    rodadaGatilho: rodada,
    temporada,
    respondida: "pendente",
  };
}

/** Responde a oferta (aceita/recusa) — devolve a oferta marcada. */
export function responderOferta(
  oferta: OfertaTransferencia,
  aceitar: boolean,
): OfertaTransferencia {
  return { ...oferta, respondida: aceitar ? "aceita" : "recusada" };
}

/** Saneamento do JSONB (ofertas antigas/corrompidas). */
export function normalizarOfertasTransferencia(bruto: unknown): OfertaTransferencia[] {
  if (!Array.isArray(bruto)) return [];
  const saida: OfertaTransferencia[] = [];
  const vistos = new Set<string>();
  for (const o of bruto) {
    const x = o as Partial<OfertaTransferencia>;
    if (!x || typeof x.id !== "string" || vistos.has(x.id)) continue;
    if (typeof x.clubeId !== "string" || typeof x.clubeNome !== "string") continue;
    vistos.add(x.id);
    saida.push({
      id: x.id,
      clubeId: x.clubeId,
      clubeNome: x.clubeNome,
      clubeSigla: typeof x.clubeSigla === "string" ? x.clubeSigla : x.clubeId.slice(0, 3).toUpperCase(),
      escudo: typeof x.escudo === "string" ? x.escudo : "🛡️",
      divisaoOfertante: typeof x.divisaoOfertante === "string" ? x.divisaoOfertante : "serie-c",
      salarioPor10: Number.isFinite(Number(x.salarioPor10)) ? Number(x.salarioPor10) : 10,
      bonusAssinatura: Number.isFinite(Number(x.bonusAssinatura)) ? Number(x.bonusAssinatura) : 0,
      power: Number.isFinite(Number(x.power)) ? Number(x.power) : 50,
      proposta: typeof x.proposta === "string" ? x.proposta : "",
      rodadaGatilho: Number.isFinite(Number(x.rodadaGatilho)) ? Number(x.rodadaGatilho) : RODADA_MEIO,
      temporada: Number.isFinite(Number(x.temporada)) ? Number(x.temporada) : 1,
      respondida:
        x.respondida === "aceita" || x.respondida === "recusada" ? x.respondida : "pendente",
    });
    if (saida.length >= 6) break;
  }
  return saida;
}
