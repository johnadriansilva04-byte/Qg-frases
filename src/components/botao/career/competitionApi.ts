import { TEAMS as TEAMS_LOCAL, teamByIdSync, timesDaDivisao, type Team } from "../data/teams";
import { shuffle, simulateMatch, sortTable } from "../tournament";
import type { Difficulty, Fixture, MatchResult, Tournament } from "../types";
import type { Divisao } from "./types";

export type Competicao = "brasileirao" | "copa-brasil";

export interface StatsData {
  artilheiro?: { team: Team; gols: number };
  goleiro?: { team: Team; gols: number };
  maiorGoleada?: { vencedor: Team; perdedor: Team; placar: string; diff: number } | null;
}

export const DIVISAO_LABEL: Record<Divisao, string> = {
  "serie-a": "Série A",
  "serie-b": "Série B",
  "serie-c": "Série C",
};

export const DIVISAO_SHORT: Record<Divisao, string> = {
  "serie-a": "SÉRIE A",
  "serie-b": "SÉRIE B",
  "serie-c": "SÉRIE C",
};

/** Resolve um time pelo id, caindo para o time do usuário quando for o clube personalizado. */
export function resolveTeam(teamId: string, userTeam: Team): Team {
  if (teamId === userTeam.id) return userTeam;
  return teamByIdSync(teamId);
}

/**
 * Calcula as estatísticas reais de um torneio (liga de pontos corridos).
 * Os dados são derivados da tabela e das partidas já disputadas — nunca duplicados,
 * pois cada time é resolvido pelo seu id real.
 */
export function calcularStats(tour: Tournament, userTeam: Team): StatsData | null {
  if (tour.phase !== "grupos" || tour.groups.length === 0) return null;
  const tabela = sortTable(tour.groups[0]!.table);
  if (tabela.length === 0) return null;

  // Remove duplicatas da tabela (mesmo teamId) para evitar exibição repetida
  const tabelaUnica = tabela.filter((r, i, arr) => arr.findIndex((x) => x.teamId === r.teamId) === i);
  if (tabelaUnica.length === 0) return null;

  const artilheiro = tabelaUnica.reduce((max, r) => (r.gp > max.gp ? r : max), tabelaUnica[0]!);
  const menosGols = tabelaUnica.reduce((min, r) => (r.gc < min.gc ? r : min), tabelaUnica[0]!);

  let maiorVitoria: {
    homeId: string;
    awayId: string;
    homeGoals: number;
    awayGoals: number;
    diff: number;
  } | null = null;
  for (const f of tour.groupFixtures) {
    if (!f.result || !f.played) continue;
    // Ignora confrontos inválidos (mesmo time dos dois lados) que gerariam
    // exibições duplicadas como "FB vs FB" no card de maior goleada.
    if (f.homeId === f.awayId) continue;
    const diff = Math.abs(f.result.homeGoals - f.result.awayGoals);
    if (!maiorVitoria || diff > maiorVitoria.diff) {
      maiorVitoria = {
        homeId: f.homeId,
        awayId: f.awayId,
        homeGoals: f.result.homeGoals,
        awayGoals: f.result.awayGoals,
        diff,
      };
    }
  }

  let maiorGoleada: StatsData["maiorGoleada"] = null;
  if (maiorVitoria) {
    const m = maiorVitoria;
    const vencedorId = m.homeGoals > m.awayGoals ? m.homeId : m.awayId;
    const perdedorId = m.homeGoals > m.awayGoals ? m.awayId : m.homeId;
    const golsVencedor = Math.max(m.homeGoals, m.awayGoals);
    const golsPerdedor = Math.min(m.homeGoals, m.awayGoals);
    maiorGoleada = {
      vencedor: resolveTeam(vencedorId, userTeam),
      perdedor: resolveTeam(perdedorId, userTeam),
      placar: `${golsVencedor}-${golsPerdedor}`,
      diff: m.diff,
    };
  }

  return {
    artilheiro: { team: resolveTeam(artilheiro.teamId, userTeam), gols: artilheiro.gp },
    goleiro: { team: resolveTeam(menosGols.teamId, userTeam), gols: menosGols.gc },
    maiorGoleada,
  };
}

/**
 * Mata-mata da Copa do Brasil. Gera um chaveamento de 16 times (oitavas -> final)
 * com a 2ª fase já definida e as fases seguintes como confrontos pendentes (TBD),
 * que vão se resolvendo conforme o usuário avança. As rodadas ganham rótulos próprios
 * para aparecerem no calendário da temporada.
 */
export const COPA_BRASIL_STAGES = [
  "Copa do Brasil · Oitavas",
  "Copa do Brasil · Quartas",
  "Copa do Brasil · Semifinal",
  "Copa do Brasil · Final",
];

export interface CopaBrasilState {
  rounds: { stage: string; fixtures: Fixture[] }[];
  champion: string | null;
  finished: boolean;
  /** Última rodada do Brasileirão em que um jogo de copa foi disputado, para
   *  evitar disparar duas fases na mesma rodada-gatilho. */
  rodadaGatilhoConsumida: number | null;
}

export function gerarCopaBrasil(
  userTeam: Team,
  _difficulty: Difficulty,
  pool?: Team[],
): CopaBrasilState {
  // A Copa reúne os clubes mais fortes das 3 divisões. O usuário sempre entra
  // no chaveamento para evitar uma competição "espectável" paralela.
  const poolTodas = [
    ...timesDaDivisao("serie-a"),
    ...timesDaDivisao("serie-b"),
    ...timesDaDivisao("serie-c"),
  ];
  const base = [...(pool && pool.length > 0 ? pool : poolTodas.length > 0 ? poolTodas : TEAMS_LOCAL)];
  const unique = new Map<string, Team>();
  for (const team of base) unique.set(team.id, team);
  unique.set(userTeam.id, userTeam);
  const seed = Array.from(unique.values()).sort((a, b) => b.power - a.power).slice(0, 16);
  if (!seed.some((team) => team.id === userTeam.id)) {
    seed.splice(Math.max(seed.length - 1, 0), 1, userTeam);
  }
  const participantes = shuffle(seed);

  const rounds: { stage: string; fixtures: Fixture[] }[] = [];
  // 2ª fase: 8 confrontos definidos.
  const primeira: Fixture[] = [];
  for (let i = 0; i < participantes.length; i += 2) {
    primeira.push({
      id: `copa-r0-${i}`,
      homeId: participantes[i]!.id,
      awayId: participantes[i + 1]!.id,
      played: false,
      stage: COPA_BRASIL_STAGES[0]!,
    });
  }
  rounds.push({ stage: COPA_BRASIL_STAGES[0]!, fixtures: primeira });

  // Fases seguintes: confrontos pendentes (TBD), preenchidos conforme avança.
  let count = primeira.length / 2; // 4 oitavas...
  for (let r = 1; r < COPA_BRASIL_STAGES.length; r++) {
    count = Math.max(1, count / 2);
    const fixtures: Fixture[] = [];
    for (let i = 0; i < count; i++) {
      fixtures.push({
        id: `copa-r${r}-${i}`,
        homeId: "TBD",
        awayId: "TBD",
        played: false,
        stage: COPA_BRASIL_STAGES[r]!,
      });
    }
    rounds.push({ stage: COPA_BRASIL_STAGES[r]!, fixtures });
  }

  return { rounds, champion: null, finished: false, rodadaGatilhoConsumida: null };
}

/** Rótulo de rodada + "data" simbólica derivada do índice, para o calendário. */
export function dataDaRodada(indice: number): string {
  const base = new Date();
  base.setDate(base.getDate() + indice * 7);
  return base.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/* =========================================================================
 * Copa do Brasil jogável (paralela ao Brasileirão) + Economia de Soberania
 * ========================================================================= */

/**
 * Custo de manutenção da temporada — Soberania necessária ao fim de cada
 * temporada para manter o clube e seguir no comando. Sobe com a divisão.
 * Não cobrir o custo NUNCA bloqueia a carreira: o clube segue endividado
 * (saldo pode ficar negativo — a economia do SOV aceita dívida via 'penalty'
 * no ledger) e o jogador se recupera jogando.
 */
export const CUSTO_MANUTENCAO: Record<Divisao, number> = {
  "serie-a": 120,
  "serie-b": 80,
  "serie-c": 50,
};

/** Veredito de fim de temporada. */
export interface VereditoTemporada {
  soberaniaFinal: number;
  custoManutencao: number;
  sobrou: number;
  /** Sempre true: falta de dinheiro nunca encerra a carreira — só endivida. */
  continua: boolean;
  motivo: string;
  /** Temporadas consecutivas sem pagar a manutenção (contador INTERNO —
   *  nunca exibido ao jogador; limitado a MAX_TEMPORADAS_INADIMPLENTE). */
  temporadasInadimplente: number;
}

/** Teto do contador interno de tolerância à dívida (mecânica oculta). */
export const MAX_TEMPORADAS_INADIMPLENTE = 3;

/**
 * Avisos narrativos da diretoria por nível de inadimplência. NUNCA expõem
 * número de chances/tentativas — o jogador só percebe a "cutucada" da
 * diretoria, que endurece conforme a dívida persiste.
 */
const AVISO_DIRETORIA = [
  `Manutenção em débito. A diretoria manteve você no cargo, mas cobrou ` +
    `resultados na sala de reunião. O clube segue com você.`,
  `Manutenção em débito de novo. A cobrança foi dura: o presidente lembrou ` +
    `que paciência e orçamento têm limite. Você permanece no comando.`,
  `A diretoria assumiu a dívida do clube por decisão de emergência. Você ` +
    `segue no cargo — sob observação permanente da mesa.`,
];

/**
 * Avalia o fim da temporada. Pagou a manutenção → confiança renovada e
 * contador interno zerado. Não pagou → a temporada SEGUINTE começa mesmo
 * assim, o saldo fica negativo (dívida real) e a diretoria deixa seu aviso.
 * O jogador nunca fica preso por falta de dinheiro.
 */
export function avaliarFimTemporada(
  soberania: number,
  divisao: Divisao,
  temporadasInadimplente = 0,
): VereditoTemporada {
  const custo = CUSTO_MANUTENCAO[divisao];
  const sobrou = soberania - custo;
  if (sobrou >= 0) {
    return {
      soberaniaFinal: soberania,
      custoManutencao: custo,
      sobrou,
      continua: true,
      motivo: `Custo de manutenção pago. Diretoria renova a confiança.`,
      temporadasInadimplente: 0,
    };
  }
  const novasInad = Math.min(temporadasInadimplente + 1, MAX_TEMPORADAS_INADIMPLENTE);
  return {
    soberaniaFinal: soberania,
    custoManutencao: custo,
    sobrou,
    continua: true,
    motivo: AVISO_DIRETORIA[novasInad - 1] ?? AVISO_DIRETORIA[0]!,
    temporadasInadimplente: novasInad,
  };
}

/**
 * Deduz o custo de manutenção ao iniciar a temporada seguinte. O saldo PODE
 * ficar negativo — é a dívida do clube, recuperável com resultados,
 * dividendos e negócios. A carreira é INFINITA.
 */
export function iniciarNovaTemporada(soberania: number, divisao: Divisao): number {
  return soberania - CUSTO_MANUTENCAO[divisao];
}

/* ---------- Marco de 1º lugar (§10) ---------- */

/**
 * Verdade quando a rodada recém-jogada levou o usuário ao topo pela primeira
 * vez NA TEMPORADA ATUAL — 1x por temporada, nunca a cada jogo no topo nem
 * após hidratação (o marco persiste no JSONB da carreira).
 */
export function chegouAoPrimeiroLugar(
  posicaoAtual: number,
  temporada: number,
  marcoLiderTemporada: number | undefined,
): boolean {
  return posicaoAtual === 1 && (marcoLiderTemporada ?? 0) < temporada;
}

/* ---------- Copa do Brasil jogável ---------- */

/** A cada quantas rodadas do Brasileirão a Copa do Brasil "atravessa" com uma
 * fase jogável (paralelismo). Espelha um calendário real: jogos de copa
 * intercalados com rodadas de pontos corridos. */
export const COPA_RODADAS_GATILHO = [4, 9, 14, 18];

/** Próximo jogo de copa pendente para o usuário, se houver. */
export function proximoJogoCopa(copa: CopaBrasilState, userId: string): Fixture | null {
  for (const round of copa.rounds) {
    for (const f of round.fixtures) {
      if (!f.played && (f.homeId === userId || f.awayId === userId)) {
        return f;
      }
    }
  }
  return null;
}

/** Indica se o usuário ainda está vivo na Copa do Brasil. */
export function usuarioVivoNaCopa(copa: CopaBrasilState, userId: string): boolean {
  // Se já foi eliminado em rodada jogada, retorna false.
  for (const round of copa.rounds) {
    const fix = round.fixtures.find(
      (f) => !f.played && (f.homeId === userId || f.awayId === userId),
    );
    if (fix) return true;
    // Se a fase do usuário foi jogada e ele perdeu, está morto.
    const jogado = round.fixtures.find(
      (f) => f.played && (f.homeId === userId || f.awayId === userId),
    );
    if (jogado?.result) {
      const r = jogado.result;
      const userHome = jogado.homeId === userId;
      const userGols = userHome ? r.homeGoals : r.awayGoals;
      const advGols = userHome ? r.awayGoals : r.homeGoals;
      if (userGols < advGols) return false;
      // Empate com pênaltis:
      if (userGols === advGols) {
        const userPen = userHome ? (r.penHome ?? 0) : (r.penAway ?? 0);
        const advPen = userHome ? (r.penAway ?? 0) : (r.penHome ?? 0);
        if (userPen < advPen) return false;
      }
    }
  }
  return !copa.finished;
}

/** Indica se a Copa do Brasil está disponível nesta rodada do Brasileirão. */
export function copaDisponivelNaRodada(
  rodadaBrasileirao: number,
  copa: CopaBrasilState,
  userId: string,
  _divisao: Divisao,
): boolean {
  // Copa é alimentada pelas três divisões e sempre inclui o usuário; a divisão
  // atual decide apenas o grau de desafio, não bloqueia participação.
  if (copa.finished) return false;
  if (!usuarioVivoNaCopa(copa, userId)) return false;
  if (!COPA_RODADAS_GATILHO.includes(rodadaBrasileirao)) return false;
  // Evita disparar duas fases na mesma rodada-gatilho: só libera se a rodada
  // atual for diferente da última já consumida.
  if (copa.rodadaGatilhoConsumida === rodadaBrasileirao) return false;
  return proximoJogoCopa(copa, userId) !== null;
}

/** Vencedor de um jogo de mata-mata (com pênaltis em empate). */
function vencedorCopa(r: MatchResult): string {
  if (r.homeGoals > r.awayGoals) return r.homeId;
  if (r.awayGoals > r.homeGoals) return r.awayId;
  return (r.penHome ?? 0) > (r.penAway ?? 0) ? r.homeId : r.awayId;
}

/**
 * Aplica o resultado do jogo de copa do usuário, simula o outro jogo da fase
 * (se houver) e avança o chaveamento. Retorna a CopaBrasilState atualizada.
 */
export function advanceCopaBrasil(
  copa: CopaBrasilState,
  userFixture: Fixture,
  userResult: MatchResult,
  difficulty: Difficulty,
): CopaBrasilState {
  const rounds = copa.rounds.map((round) => ({
    ...round,
    fixtures: round.fixtures.map((f) => ({ ...f })),
  }));

  // Marca o jogo do usuário.
  for (const round of rounds) {
    const fx = round.fixtures.find((f) => f.id === userFixture.id);
    if (fx) {
      fx.played = true;
      fx.result = userResult;
      break;
    }
  }

  // Simula os demais jogos pendentes da mesma fase.
  const faseAtual = rounds.find((r) => r.fixtures.some((f) => f.id === userFixture.id));
  if (faseAtual) {
    for (const f of faseAtual.fixtures) {
      if (!f.played && f.homeId !== "TBD" && f.awayId !== "TBD") {
        f.played = true;
        f.result = simulateMatch(f.homeId, f.awayId, difficulty, true);
      }
    }
    avancarFaseCopa(rounds, faseAtual.stage, difficulty);
  }

  const finished =
    rounds[rounds.length - 1]!.fixtures.every((f) => f.played) &&
    rounds[rounds.length - 1]!.fixtures.length === 1;

  return {
    rounds,
    champion: finished
      ? rounds[rounds.length - 1]!.fixtures[0]!.result
        ? vencedorCopa(rounds[rounds.length - 1]!.fixtures[0]!.result!)
        : null
      : null,
    finished,
    rodadaGatilhoConsumida: copa.rodadaGatilhoConsumida,
  };
}

/** Preenche a próxima fase com os vencedores da fase atual, se toda ela já
 * estiver resolvida. Caso contrário (ainda há confronto do usuário pendente),
 * espera a próxima chamada. */
function avancarFaseCopa(
  rounds: { stage: string; fixtures: Fixture[] }[],
  stageName: string,
  difficulty: Difficulty,
) {
  const idx = rounds.findIndex((r) => r.stage === stageName);
  if (idx < 0) return;
  const fase = rounds[idx]!;
  // Só avança se a fase atual está totalmente resolvida (todos jogados).
  if (fase.fixtures.some((f) => !f.played)) return;
  const next = rounds[idx + 1];
  if (!next) return;
  const winners = fase.fixtures
    .filter((f) => f.played && f.result)
    .map((f) => vencedorCopa(f.result!));
  if (winners.length < 2) return;
  const pares: [string, string][] = [];
  for (let i = 0; i < winners.length; i += 2) {
    pares.push([winners[i]!, winners[i + 1]!]);
  }
  // Preenche os confrontos TBD da próxima fase (respeitando a ordem).
  let preenchidos = 0;
  for (const f of next.fixtures) {
    if (f.homeId === "TBD" && pares[preenchidos]) {
      f.homeId = pares[preenchidos]![0];
      f.awayId = pares[preenchidos]![1];
      preenchidos++;
    }
  }
  void difficulty;
}

/** Inicializa uma Copa do Brasil jogável (cópia de gerarCopaBrasil, explícita). */
export function iniciarCopaBrasil(userTeam: Team, difficulty: Difficulty): CopaBrasilState {
  return gerarCopaBrasil(userTeam, difficulty);
}
