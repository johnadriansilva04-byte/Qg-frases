/**
 * MOTOR DE PROPRIEDADE DE CLUBES
 * 
 * Sistema de progressão: Técnico → Reputação → Patrimônio → Cotas → Proprietário → Múltiplos Clubes
 * 
 * O técnico pode comprar participações em clubes da Cidadela à medida que acumula SOV.
 * Com 100% de participação, torna-se proprietário do clube. Pode possuir múltiplos clubes.
 * 
 * Toda transação econômica passa pelo Banco Central SOV (registrarTransacaoSov).
 */

import type { CareerState, CotaClube, PropriedadeClubes } from "./types";
import type { Team } from "../data/teams";

/**
 * Preço base de uma cota de 1% de um clube (SOV).
 * Calculado com base no poder do clube (power) e prestigio.
 */
export function precoCotaClube(clube: Team): number {
  // Fórmula: power * 10 + prestigio * 5
  // Clubes mais fortes custam mais
  const base = clube.power * 10;
  const prestigio = clube.power >= 80 ? 50 : clube.power >= 60 ? 30 : 10;
  return base + prestigio;
}

/**
 * Preço para comprar 100% do clube (clube inteiro).
 */
export function precoClubeInteiro(clube: Team): number {
  return precoCotaClube(clube) * 100;
}

/**
 * Verifica se o treinador pode comprar uma cota com base no saldo SOV.
 */
export function podeComprarCota(
  career: CareerState,
  clube: Team,
  porcentagem: number,
): boolean {
  const custo = precoCotaClube(clube) * porcentagem;
  return career.coach.sov >= custo;
}

/**
 * Verifica se o treinador pode comprar o clube inteiro.
 */
export function podeComprarClubeInteiro(career: CareerState, clube: Team): boolean {
  return podeComprarCota(career, clube, 100);
}

/**
 * Calcula a participação atual do treinador em um clube.
 */
export function participacaoAtual(career: CareerState, clubeId: string): number {
  return career.propriedadeClubes?.participacoes[clubeId]?.participacao ?? 0;
}

/**
 * Verifica se o treinador é proprietário (100%) de um clube.
 */
export function eProprietario(career: CareerState, clubeId: string): boolean {
  return participacaoAtual(career, clubeId) >= 100;
}

/**
 * Compra uma cota de participação em um clube.
 * 
 * IMPORTANTE: Esta função NÃO modifica coach.sov diretamente.
 * Retorna o delta para que o chamador registre no Banco Central SOV.
 */
export function comprarCota(
  career: CareerState,
  clube: Team,
  porcentagem: number,
): { career: CareerState; deltaSov: number; custo: number } {
  const propriedade = career.propriedadeClubes ?? {
    participacoes: {},
    totalDividendos: 0,
    ultimaRodadaDividendos: 0,
  };

  const custo = precoCotaClube(clube) * porcentagem;
  const cotaExistente = propriedade.participacoes[clube.id];

  let novaParticipacao: CotaClube;
  if (cotaExistente) {
    // Aumenta participação existente (média ponderada)
    const participacaoTotal = cotaExistente.participacao + porcentagem;
    const custoTotal = cotaExistente.custoMedio * cotaExistente.participacao + custo;
    novaParticipacao = {
      clubeId: clube.id,
      participacao: participacaoTotal,
      custoMedio: custoTotal / participacaoTotal,
      adquiridoEm: cotaExistente.adquiridoEm, // Mantém data inicial
    };
  } else {
    // Nova participação
    novaParticipacao = {
      clubeId: clube.id,
      participacao: porcentagem,
      custoMedio: custo / porcentagem,
      adquiridoEm: new Date().toISOString(),
    };
  }

  const novaPropriedade: PropriedadeClubes = {
    ...propriedade,
    participacoes: {
      ...propriedade.participacoes,
      [clube.id]: novaParticipacao,
    },
  };

  return {
    career: {
      ...career,
      propriedadeClubes: novaPropriedade,
    },
    deltaSov: -custo,
    custo,
  };
}

/**
 * Vende uma cota de participação em um clube.
 * 
 * IMPORTANTE: Esta função NÃO modifica coach.sov diretamente.
 * Retorna o delta para que o chamador registre no Banco Central SOV.
 */
export function venderCota(
  career: CareerState,
  clube: Team,
  porcentagem: number,
): { career: CareerState; deltaSov: number; valor: number } | null {
  const cotaExistente = career.propriedadeClubes?.participacoes[clube.id];
  if (!cotaExistente || cotaExistente.participacao < porcentagem) {
    return null; // Não possui participação suficiente
  }

  const valor = precoCotaClube(clube) * porcentagem;
  const novaParticipacao = cotaExistente.participacao - porcentagem;

  const propriedade = career.propriedadeClubes!;
  const novaPropriedade: PropriedadeClubes = {
    ...propriedade,
    participacoes: {
      ...propriedade.participacoes,
    },
  };

  if (novaParticipacao === 0) {
    // Remove participação completamente
    delete novaPropriedade.participacoes[clube.id];
  } else {
    // Atualiza participação
    novaPropriedade.participacoes[clube.id] = {
      ...cotaExistente,
      participacao: novaParticipacao,
    };
  }

  return {
    career: {
      ...career,
      propriedadeClubes: novaPropriedade,
    },
    deltaSov: valor,
    valor,
  };
}

/**
 * Calcula dividendos de um clube baseados na participação do treinador.
 * 
 * Fórmula: (poder do clube * 0.5) * (participação / 100)
 * Clubes mais fortes pagam mais dividendos.
 */
export function calcularDividendoClube(
  clube: Team,
  participacao: number,
): number {
  const base = clube.power * 0.5;
  return Math.round(base * (participacao / 100));
}

/**
 * Processa dividendos de todos os clubes que o treinador possui participação.
 * 
 * IMPORTANTE: Esta função NÃO modifica coach.sov diretamente.
 * Retorna o delta total para que o chamador registre no Banco Central SOV.
 */
export function processarDividendosProprietario(
  career: CareerState,
  rodada: number,
  temporada: number,
): { career: CareerState; deltaSov: number; detalhes: Array<{ clubeId: string; valor: number; participacao: number }> } {
  const propriedade = career.propriedadeClubes;
  if (!propriedade || Object.keys(propriedade.participacoes).length === 0) {
    return { career, deltaSov: 0, detalhes: [] };
  }

  // Evita pagar dividendos duas vezes na mesma rodada
  if (propriedade.ultimaRodadaDividendos >= rodada) {
    return { career, deltaSov: 0, detalhes: [] };
  }

  let totalDividendos = 0;
  const detalhes: Array<{ clubeId: string; valor: number; participacao: number }> = [];

  // Importação dinâmica para evitar circular dependency
  const { TEAMS } = require("../data/teams");

  for (const [clubeId, cota] of Object.entries(propriedade.participacoes)) {
    const clube = TEAMS.find((t: Team) => t.id === clubeId);
    if (!clube) continue;

    const dividendo = calcularDividendoClube(clube, cota.participacao);
    if (dividendo > 0) {
      totalDividendos += dividendo;
      detalhes.push({
        clubeId,
        valor: dividendo,
        participacao: cota.participacao,
      });
    }
  }

  if (totalDividendos === 0) {
    return { career, deltaSov: 0, detalhes: [] };
  }

  const novaPropriedade: PropriedadeClubes = {
    ...propriedade,
    totalDividendos: propriedade.totalDividendos + totalDividendos,
    ultimaRodadaDividendos: rodada,
  };

  return {
    career: {
      ...career,
      propriedadeClubes: novaPropriedade,
    },
    deltaSov: totalDividendos,
    detalhes,
  };
}

/**
 * Lista todos os clubes que o treinador possui participação.
 */
export function listarClubesProprietario(career: CareerState): Array<{
  clubeId: string;
  participacao: number;
  custoMedio: number;
  adquiridoEm: string;
}> {
  const propriedade = career.propriedadeClubes;
  if (!propriedade) return [];

  return Object.entries(propriedade.participacoes).map(([clubeId, cota]) => ({
    clubeId,
    participacao: cota.participacao,
    custoMedio: cota.custoMedio,
    adquiridoEm: cota.adquiridoEm,
  }));
}

/**
 * Calcula o patrimônio total em participações de clubes.
 */
export function patrimonioParticipacoes(career: CareerState): number {
  const propriedade = career.propriedadeClubes;
  if (!propriedade) return 0;

  let total = 0;
  const { TEAMS } = require("../data/teams");

  for (const [clubeId, cota] of Object.entries(propriedade.participacoes)) {
    const clube = TEAMS.find((t: Team) => t.id === clubeId);
    if (!clube) continue;
    total += precoCotaClube(clube) * cota.participacao;
  }

  return total;
}
