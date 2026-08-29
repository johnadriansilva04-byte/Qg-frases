/**
 * ofertasIniciais — entrada da carreira (prompt do dono, §4).
 *
 * O treinador começa DESCONHECIDO: nunca recebe proposta dos maiores clubes.
 * A tela inicial da carreira mostra "Estes clubes estão interessados em você"
 * — 3 ofertas de clubes PEQUENOS (pouca força, pouca torcida, orçamento
 * apertado, estrutura simples). O treinador analisa e escolhe onde começar.
 *
 * O clube escolhido define a vaga que o time do jogador assume na Série C
 * (o clube que "apostou" no treinador sai da composição da liga e o time do
 * jogador entra no lugar) + um bônus de assinatura em SOV.
 *
 * As ofertas são DETERMINÍSTICAS por seed (userId) — F5 não muda as propostas.
 *
 * Módulo PURO (sem alias `@/`) — testável com jiti. A lista de clubes e o
 * mapa de torcida entram por parâmetro (o chamador resolve a base).
 */

import { estruturaDoClube, porteDoClube, type PorteClube } from "./forcaClube";

export type ClubeOfertavel = {
  id: string;
  nome: string;
  sigla: string;
  cidade: string;
  power: number;
  escudo?: string | undefined;
};

export type OfertaClube = {
  clubeId: string;
  nome: string;
  sigla: string;
  escudo: string;
  cidade: string;
  power: number;
  porte: PorteClube;
  estrutura: number;
  torcida: number;
  /** Bônus de assinatura em SOV (clube pequeno = orçamento pequeno). */
  bonusAssinatura: number;
  /** Custo de manutenção por temporada da divisão de origem. */
  manutencao: number;
  /** Frase curta da diretoria (tom da proposta). */
  discurso: string;
};

/** Hash estável (FNV-1a) para determinismo sem Math.random. */
function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const DISCURSOS: readonly string[] = [
  "Aqui não tem estrela. Tem trabalho. Se topar, o vestiário é seu.",
  "Somos um clube de bairro com uma torcida que nunca abandona. Venha construir algo.",
  "Nosso orçamento é curto, mas a paciência com projeto é longa.",
  "Precisamos de alguém com fome de provar. O clube oferece a porta de entrada.",
  "Estamos na parte de baixo da tabela há anos. Queremos alguém para mudar isso.",
  "Não prometemos glória imediata. Prometemos time nas mãos e apoio da diretoria.",
];

/** Quantas ofertas a tela inicial mostra. */
export const TOTAL_OFERTAS = 3;

/**
 * Gera as ofertas iniciais: os clubes MAIS FRACOS da lista (ordenados por
 * power ascendente), escolhendo TOTAL_OFERTAS de forma determinística a
 * partir do seed. Treinador desconhecido NUNCA recebe proposta de clube
 * médio/grande — o chamador deve passar apenas clubes da divisão inicial.
 */
export function gerarOfertasIniciais(
  clubes: ClubeOfertavel[],
  seed: string,
  torcidaPorClube: Record<string, number>,
  manutencao: number,
): OfertaClube[] {
  const pequenos = [...clubes].sort((a, b) => a.power - b.power || a.id.localeCompare(b.id));
  if (pequenos.length === 0) return [];

  // Janela: só os mais fracos entram no sorteio (dobro das vagas, mín. total).
  const janela = pequenos.slice(0, Math.max(TOTAL_OFERTAS, Math.min(pequenos.length, TOTAL_OFERTAS * 2)));
  const h = hashSeed(seed || "treinador-desconhecido");
  const escolhidos: ClubeOfertavel[] = [];
  const usados = new Set<number>();
  for (let k = 0; k < TOTAL_OFERTAS && escolhidos.length < janela.length; k++) {
    let idx = (h + k * 7) % janela.length;
    while (usados.has(idx)) idx = (idx + 1) % janela.length;
    usados.add(idx);
    escolhidos.push(janela[idx]!);
  }

  return escolhidos.map((c, i) => {
    const torcida = Math.max(0, Math.round(torcidaPorClube[c.id] ?? 0));
    // Orçamento de clube pequeno: bônus de assinatura modesto (5-20 SOV),
    // proporcional à força dentro da faixa real da divisão inicial (51+).
    const bonusAssinatura = 5 + Math.max(0, c.power - 50);
    return {
      clubeId: c.id,
      nome: c.nome,
      sigla: c.sigla,
      escudo: c.escudo ?? "🛡️",
      cidade: c.cidade,
      power: c.power,
      porte: porteDoClube(c.power),
      estrutura: estruturaDoClube(c.power),
      torcida,
      bonusAssinatura,
      manutencao,
      discurso: DISCURSOS[(h + i) % DISCURSOS.length]!,
    };
  });
}
