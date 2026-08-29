/**
 * Campeonato de Trilha — lógica de rodadas e grupos.
 *
 * Fluxo (replicado do módulo Futebol):
 *  1. Sala: criar / entrar / preencher com robots / iniciar.
 *  2. Fase de grupos: rodadas com round-robin. Cada rodada tem N/2 jogos.
 *     O jogador só vê SUA partida da rodada. Os demais são simulados.
 *  3. Após o jogador jogar: simula bot×bot da rodada, avança rodada.
 *  4. Quando todos os grupos finalizam: eliminatórias (se formato="grupos").
 *  5. Final → campeão.
 */

export type FormatoTrilha = "pontos" | "grupos";

export type ParticipanteTrilha = {
  user_id: string;
  nome: string;
  bot?: boolean;
};

export type ResultadoPartida = {
  j1_id: string;
  j2_id: string;
  vencedor_id: string | null;
  mesa_id: string;
  rodada: number;
};

export type Grupo = {
  nome: string;
  participantes: string[];
  resultados: ResultadoPartida[];
  /** Rodada atual deste grupo (1-indexed). */
  rodadaAtual: number;
  /** Total de rodadas deste grupo. */
  totalRodadas: number;
};

export type ConfrontoEliminatorio = {
  rodada: number;
  j1_id: string | null;
  j2_id: string | null;
  vencedor_id: string | null;
  mesa_id: string | null;
  bye: boolean;
};

export type StatusCampeonato =
  | "aguardando"
  | "em_grupos"
  | "eliminatorias"
  | "finalizado";

export type CampeonatoTrilha = {
  id: string;
  nome: string;
  formato: FormatoTrilha;
  criador_id: string;
  status: StatusCampeonato;
  participantes: ParticipanteTrilha[];
  grupos: Grupo[];
  confrontosEliminatorios: ConfrontoEliminatorio[];
  rodadaAtual: number;
  vencedor_id: string | null;
};

// ─────────────────────────── helpers ───────────────────────────

let _counter = 0;
function uid(): string {
  return `camp-${Date.now()}-${++_counter}`;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

// ─────────────────────────── criação ───────────────────────────

export function criarCampeonatoTrilha(
  nome: string,
  formato: FormatoTrilha,
  criador: ParticipanteTrilha,
): CampeonatoTrilha {
  return {
    id: uid(),
    nome,
    formato,
    criador_id: criador.user_id,
    status: "aguardando",
    participantes: [criador],
    grupos: [],
    confrontosEliminatorios: [],
    rodadaAtual: 0,
    vencedor_id: null,
  };
}

// ─────────────────── robots ──────────────────────────────────

const BOT_NAMES = [
  "TrilhaBot Alpha", "TrilhaBot Beta", "TrilhaBot Gamma", "TrilhaBot Delta",
  "TrilhaBot Epsilon", "TrilhaBot Zeta", "TrilhaBot Eta", "TrilhaBot Theta",
  "TrilhaBot Iota", "TrilhaBot Kappa", "TrilhaBot Lambda", "TrilhaBot Mu",
  "TrilhaBot Nu", "TrilhaBot Xi", "TrilhaBot Omicron", "TrilhaBot Pi",
  "TrilhaBot Rho", "TrilhaBot Sigma", "TrilhaBot Tau", "TrilhaBot Upsilon",
  "TrilhaBot Phi", "TrilhaBot Chi", "TrilhaBot Psi", "TrilhaBot Omega",
  "TrilhaBot Astra", "TrilhaBot Nova", "TrilhaBot Blaze", "TrilhaBot Storm",
  "TrilhaBot Frost", "TrilhaBot Shadow", "TrilhaBot Phantom", "TrilhaBot Vector",
];

export function preencherComRobots(
  camp: CampeonatoTrilha,
  maxJogadores: number,
): CampeonatoTrilha {
  if (camp.status !== "aguardando") throw new Error("Só é possível preencher antes de iniciar.");
  const botsExistentes = camp.participantes.filter((p) => p.bot).length;
  const vagas = maxJogadores - camp.participantes.length;
  if (vagas <= 0) return camp;

  const novosBots: ParticipanteTrilha[] = [];
  for (let i = 0; i < vagas; i++) {
    const nomeBot = BOT_NAMES[botsExistentes + i] ?? `Robot ${botsExistentes + i + 1}`;
    novosBots.push({
      user_id: `bot-${camp.id}-${botsExistentes + i}`,
      nome: nomeBot,
      bot: true,
    });
  }

  return { ...camp, participantes: [...camp.participantes, ...novosBots] };
}

export function simularConfrontoBots(j1_id: string, j2_id: string): { vencedor_id: string | null } {
  const hash1 = j1_id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const hash2 = j2_id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = ((hash1 * 31 + hash2 * 17) % 100) / 100;
  if (rand < 0.45) return { vencedor_id: j1_id };
  if (rand < 0.90) return { vencedor_id: j2_id };
  return { vencedor_id: null };
}

export function isRobot(userId: string): boolean {
  return userId.startsWith("bot-");
}

// ─────────────────────────── entrada/saída ─────────────────────

export function entrarCampeonatoTrilha(
  camp: CampeonatoTrilha,
  jogador: ParticipanteTrilha,
): CampeonatoTrilha {
  if (camp.status !== "aguardando") throw new Error("Campeonato já iniciado.");
  if (camp.participantes.some((p) => p.user_id === jogador.user_id)) return camp;
  if (camp.participantes.length >= 32) throw new Error("Campeonato cheio.");
  return { ...camp, participantes: [...camp.participantes, jogador] };
}

export function sairCampeonatoTrilha(camp: CampeonatoTrilha, userId: string): CampeonatoTrilha {
  if (camp.status !== "aguardando") throw new Error("Campeonato já iniciado.");
  return { ...camp, participantes: camp.participantes.filter((p) => p.user_id !== userId) };
}

// ─────────────────────────── início + geração de rodadas ───────

/**
 * Gera rodadas de round-robin usando algoritmo de round-robin
 * (circular fix um jogador, rotaciona o resto).
 * Retorna array de rodadas, cada uma com pares [j1, j2].
 */
function gerarRodadas(participantes: string[]): [string, string][][] {
  const ids = [...participantes];
  const n = ids.length;
  // Se ímpar, adiciona "bye"
  const hasBye = n % 2 !== 0;
  if (hasBye) ids.push("__BYE__");

  const m = ids.length; // sempre par
  const rodadas: [string, string][][] = [];

  for (let r = 0; r < m - 1; r++) {
    const rodada: [string, string][] = [];
    for (let i = 0; i < m / 2; i++) {
      const j1 = ids[i]!;
      const j2 = ids[m - 1 - i]!;
      if (j1 === "__BYE__" || j2 === "__BYE__") continue; // bye
      rodada.push([j1, j2]);
    }
    rodadas.push(rodada);
    // Rotaciona (fixa o último, gira o resto)
    const last = ids.pop()!;
    ids.splice(1, 0, last);
  }

  return rodadas;
}

export function iniciarCampeonatoTrilha(camp: CampeonatoTrilha): CampeonatoTrilha {
  if (camp.participantes.length < 2) throw new Error("Precisa de pelo menos 2 jogadores.");

  if (camp.formato === "pontos") {
    // Liga: todos vs todos em um único "grupo"
    const ids = camp.participantes.map((p) => p.user_id);
    const rodadas = gerarRodadas(ids);
    const grupo: Grupo = {
      nome: "Liga",
      participantes: ids,
      resultados: [],
      rodadaAtual: 1,
      totalRodadas: rodadas.length,
    };
    return { ...camp, status: "em_grupos", grupos: [grupo], rodadaAtual: 1 };
  }

  // "grupos": distribuir em grupos de até 4
  const grupos = distribuirGrupos(camp.participantes);
  return { ...camp, status: "em_grupos", grupos, rodadaAtual: 1 };
}

// ─────────────────────────── distribuição de grupos ────────────

function distribuirGrupos(parts: ParticipanteTrilha[]): Grupo[] {
  const nomes = "ABCDEFGHIJ";
  const n = parts.length;
  const shuffled = shuffle([...parts]);

  let numGrupos: number;
  if (n <= 4) numGrupos = 1;
  else if (n <= 8) numGrupos = 2;
  else if (n <= 16) numGrupos = 4;
  else numGrupos = 8;

  const tempGrupos: string[][] = [];
  for (let i = 0; i < numGrupos; i++) tempGrupos.push([]);

  shuffled.forEach((p, idx) => {
    tempGrupos[idx % numGrupos]!.push(p.user_id);
  });

  return tempGrupos.map((ids, i) => {
    const rodadas = gerarRodadas(ids);
    return {
      nome: nomes[i] ?? `${i + 1}`,
      participantes: ids,
      resultados: [],
      rodadaAtual: 1,
      totalRodadas: rodadas.length,
    };
  });
}

// ─────────────────────────── rodada atual ──────────────────────

/**
 * Retorna os confrontos pendentes da rodada atual de um grupo.
 * Cada par é [j1_id, j2_id].
 */
export function confrontosDaRodada(grupo: Grupo): [string, string][] {
  const rodadas = gerarRodadas(grupo.participantes);
  const rodadaIdx = grupo.rodadaAtual - 1;
  if (rodadaIdx < 0 || rodadaIdx >= rodadas.length) return [];

  const pares = rodadas[rodadaIdx]!;
  // Filtra apenas os que ainda não foram jogados
  const jogados = new Set<string>();
  for (const r of grupo.resultados) {
    if (r.rodada === grupo.rodadaAtual) {
      jogados.add([r.j1_id, r.j2_id].sort().join(":"));
    }
  }

  return pares.filter(([j1, j2]) => {
    const key = [j1, j2].sort().join(":");
    return !jogados.has(key);
  });
}

/**
 * Retorna True se a rodada atual do grupo está completa.
 */
export function rodadaCompleta(grupo: Grupo): boolean {
  return confrontosDaRodada(grupo).length === 0;
}

/**
 * Retorna True se TODOS os grupos terminaram todas as rodadas.
 */
export function todosGruposFinalizados(grupos: Grupo[]): boolean {
  return grupos.every((g) => g.rodadaAtual > g.totalRodadas);
}

/**
 * Retorna a partida do jogador (humano) na rodada atual do grupo.
 * Se não há partida para o jogador, retorna null.
 */
export function partidaDoJogador(grupo: Grupo, userId: string): [string, string] | null {
  const confrontos = confrontosDaRodada(grupo);
  for (const [j1, j2] of confrontos) {
    if (j1 === userId || j2 === userId) return [j1, j2];
  }
  return null;
}

/**
 * Retorna True se a rodada atual só tem bots (sem nenhum humano pendente).
 */
export function rodadaSoBots(grupo: Grupo): boolean {
  const confrontos = confrontosDaRodada(grupo);
  return confrontos.length > 0 && confrontos.every(([j1, j2]) => isRobot(j1) && isRobot(j2));
}

// ─────────────────────────── classificação ─────────────────────

export function classificacaoGrupo(grupo: Grupo): { user_id: string; pts: number; v: number; d: number; e: number }[] {
  const stats = new Map<string, { pts: number; v: number; d: number; e: number }>();
  for (const id of grupo.participantes) stats.set(id, { pts: 0, v: 0, d: 0, e: 0 });

  for (const r of grupo.resultados) {
    const s1 = stats.get(r.j1_id);
    const s2 = stats.get(r.j2_id);
    if (!s1 || !s2) continue;
    if (r.vencedor_id === r.j1_id) { s1.pts += 3; s1.v++; s2.d++; }
    else if (r.vencedor_id === r.j2_id) { s2.pts += 3; s2.v++; s1.d++; }
    else { s1.pts += 1; s1.e++; s2.pts += 1; s2.e++; }
  }

  return Array.from(stats.entries())
    .map(([user_id, s]) => ({ user_id, ...s }))
    .sort((a, b) => b.pts - a.pts || b.v - a.v || a.d - b.d);
}

export function classificadosDosGrupos(grupos: Grupo[]): string[] {
  const classificados: string[] = [];
  for (const g of grupos) {
    const cls = classificacaoGrupo(g);
    if (cls[0]) classificados.push(cls[0].user_id);
    if (cls[1]) classificados.push(cls[1].user_id);
  }
  return classificados;
}

export function nomeFaseEliminatoria(numConfrontos: number): string {
  if (numConfrontos === 1) return "Final";
  if (numConfrontos === 2) return "Semifinal";
  if (numConfrontos === 4) return "Quartas de Final";
  if (numConfrontos === 8) return "Oitavas de Final";
  return `Rodada de ${numConfrontos} vagas`;
}

// ─────────────────────────── registrar resultado ───────────────

/**
 * Registra resultado de uma partida. Se for a última da rodada,
 * avança automaticamente a rodada do grupo.
 */
export function registrarResultado(
  camp: CampeonatoTrilha,
  j1_id: string,
  j2_id: string,
  vencedor_id: string | null,
  mesa_id: string,
): CampeonatoTrilha {
  const resultado: ResultadoPartida = {
    j1_id,
    j2_id,
    vencedor_id,
    mesa_id,
    rodada: camp.rodadaAtual,
  };

  const grupos = camp.grupos.map((g) => {
    if (!g.participantes.includes(j1_id) || !g.participantes.includes(j2_id)) return g;
    const novosResultados = [...g.resultados, resultado];
    return { ...g, resultados: novosResultados };
  });

  // Verificar se algum grupo completou a rodada e avançar
  const gruposAtualizados = grupos.map((g) => {
    // Conta resultados desta rodada
    const resultadosRodada = g.resultados.filter((r) => r.rodada === g.rodadaAtual);
    const paresEsperados = Math.floor(g.participantes.length / 2);
    if (resultadosRodada.length >= paresEsperados && g.rodadaAtual <= g.totalRodadas) {
      return { ...g, rodadaAtual: g.rodadaAtual + 1 };
    }
    return g;
  });

  // Verificar se todos os grupos finalizaram
  if (todosGruposFinalizados(gruposAtualizados)) {
    if (camp.formato === "pontos") {
      const cls = classificacaoGrupo(gruposAtualizados[0]!);
      return { ...camp, grupos: gruposAtualizados, status: "finalizado", vencedor_id: cls[0]?.user_id ?? null };
    }
    const classificados = classificadosDosGrupos(gruposAtualizados);
    const confrontos = montarEliminatorias(classificados);
    return { ...camp, grupos: gruposAtualizados, confrontosEliminatorios: confrontos, status: "eliminatorias" };
  }

  return { ...camp, grupos: gruposAtualizados };
}

/**
 * Registra uma rodada inteira de bot×bot de uma vez.
 */
export function registrarRodadaBots(
  camp: CampeonatoTrilha,
  grupoIdx: number,
): CampeonatoTrilha {
  const grupo = camp.grupos[grupoIdx];
  if (!grupo) return camp;

  const confrontos = confrontosDaRodada(grupo);
  let atualizado = { ...camp };
  let grupoAtualizado = { ...grupo };

  for (const [j1, j2] of confrontos) {
    if (!isRobot(j1) || !isRobot(j2)) continue;
    const { vencedor_id } = simularConfrontoBots(j1, j2);
    const resultado: ResultadoPartida = {
      j1_id: j1,
      j2_id: j2,
      vencedor_id,
      mesa_id: "bot-sim",
      rodada: grupo.rodadaAtual,
    };
    grupoAtualizado = { ...grupoAtualizado, resultados: [...grupoAtualizado.resultados, resultado] };
  }

  // Avançar rodada se completa
  const resultadosRodada = grupoAtualizado.resultados.filter((r) => r.rodada === grupoAtualizado.rodadaAtual);
  const paresEsperados = Math.floor(grupoAtualizado.participantes.length / 2);
  if (resultadosRodada.length >= paresEsperados && grupoAtualizado.rodadaAtual <= grupoAtualizado.totalRodadas) {
    grupoAtualizado = { ...grupoAtualizado, rodadaAtual: grupoAtualizado.rodadaAtual + 1 };
  }

  const grupos = [...atualizado.grupos];
  grupos[grupoIdx] = grupoAtualizado;

  // Verificar fim
  if (todosGruposFinalizados(grupos)) {
    if (camp.formato === "pontos") {
      const cls = classificacaoGrupo(grupos[0]!);
      return { ...atualizado, grupos, status: "finalizado", vencedor_id: cls[0]?.user_id ?? null };
    }
    const classificados = classificadosDosGrupos(grupos);
    const confrontosElim = montarEliminatorias(classificados);
    return { ...atualizado, grupos, confrontosEliminatorios: confrontosElim, status: "eliminatorias" };
  }

  return { ...atualizado, grupos };
}

// ─────────────────────────── eliminatórias ─────────────────────

export function montarEliminatorias(classificados: string[]): ConfrontoEliminatorio[] {
  const confrontos: ConfrontoEliminatorio[] = [];
  const n = classificados.length;
  const nPares = Math.floor(n / 2);
  const rodadaBase = Math.ceil(Math.log2(Math.max(n, 2)));

  for (let i = 0; i < nPares; i++) {
    confrontos.push({
      rodada: rodadaBase,
      j1_id: classificados[i * 2] ?? null,
      j2_id: classificados[i * 2 + 1] ?? null,
      vencedor_id: null,
      mesa_id: null,
      bye: false,
    });
  }

  if (n % 2 !== 0) {
    const last = classificados[n - 1] ?? null;
    confrontos.push({ rodada: rodadaBase, j1_id: last, j2_id: null, vencedor_id: last, mesa_id: null, bye: true });
  }

  return confrontos;
}

export function registrarResultadoEliminatorio(
  camp: CampeonatoTrilha,
  indexConfronto: number,
  vencedor_id: string,
  mesa_id: string,
): CampeonatoTrilha {
  const confrontos = [...camp.confrontosEliminatorios];
  const c = confrontos[indexConfronto];
  if (!c) return camp;

  confrontos[indexConfronto] = { ...c, vencedor_id, mesa_id };

  const rodadaAtual = c.rodada;
  const daRodada = confrontos.filter((x) => x.rodada === rodadaAtual);
  const todosFinalizados = daRodada.every((x) => x.vencedor_id !== null);

  if (!todosFinalizados) return { ...camp, confrontosEliminatorios: confrontos };

  if (daRodada.length === 1 && rodadaAtual === 1) {
    return { ...camp, confrontosEliminatorios: confrontos, status: "finalizado", vencedor_id: daRodada[0]?.vencedor_id ?? null };
  }

  const vencedores = daRodada.filter((x) => !x.bye).map((x) => x.vencedor_id!)
    .concat(daRodada.filter((x) => x.bye).map((x) => x.j1_id!));

  const proximaRodada = Math.max(0, rodadaAtual - 1) || 1;
  const novos: ConfrontoEliminatorio[] = [];
  for (let i = 0; i < vencedores.length; i += 2) {
    const j1 = vencedores[i] ?? null;
    const j2 = vencedores[i + 1] ?? null;
    novos.push({ rodada: proximaRodada, j1_id: j1, j2_id: j2, vencedor_id: j2 === undefined ? j1 : null, mesa_id: null, bye: j2 === undefined });
  }

  return { ...camp, confrontosEliminatorios: [...confrontos, ...novos] };
}

// ─────────────────────────── persistence ───────────────────────

const STORAGE_KEY = "trilha_championship_state";

export function salvarCampeonato(camp: CampeonatoTrilha): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(camp)); } catch { /* noop */ }
}

export function carregarCampeonato(): CampeonatoTrilha | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CampeonatoTrilha;
  } catch { return null; }
}

export function limparCampeonato(): void {
  localStorage.removeItem(STORAGE_KEY);
}
