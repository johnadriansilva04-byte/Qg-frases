/**
 * Campeonato de Trilha — lógica de estados e formatos.
 *
 * Dois formatos:
 *  - "pontos": todos vs todos (round-robin), campeão = mais pontos.
 *  - "grupos": distribui jogadores em grupos, cada grupo faz round-robin,
 *    os 2 melhores de cada grupo avançam para eliminatórias (chave fechada).
 *
 * Toda a orquestração é feita no cliente — as partidas individuais usam as
 * RPCs de mesa existentes (`criar_mesa_trilha`, `entrar_mesa_trilha`, etc.)
 * e o estado do campeonato é mantido em React state (+ localStorage para
 * persistir entre F5).
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
  vencedor_id: string | null; // null = empate
  mesa_id: string;
  rodada: number;
};

export type Grupo = {
  nome: string; // "A", "B", "C", ...
  participantes: string[]; // user_ids
  resultados: ResultadoPartida[];
};

export type ConfrontoEliminatorio = {
  rodada: number; // 1 = final, 2 = semi, 3 = quartas, etc.
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

/** Embaralha Fisher-Yates (in-place) e retorna o array. */
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

/** Nomes de robots disponíveis para preencher vagas. */
const BOT_NAMES = [
  "TrilhaBot Alpha",
  "TrilhaBot Beta",
  "TrilhaBot Gamma",
  "TrilhaBot Delta",
  "TrilhaBot Epsilon",
  "TrilhaBot Zeta",
  "TrilhaBot Eta",
  "TrilhaBot Theta",
  "TrilhaBot Iota",
  "TrilhaBot Kappa",
  "TrilhaBot Lambda",
  "TrilhaBot Mu",
  "TrilhaBot Nu",
  "TrilhaBot Xi",
  "TrilhaBot Omicron",
  "TrilhaBot Pi",
  "TrilhaBot Rho",
  "TrilhaBot Sigma",
  "TrilhaBot Tau",
  "TrilhaBot Upsilon",
  "TrilhaBot Phi",
  "TrilhaBot Chi",
  "TrilhaBot Psi",
  "TrilhaBot Omega",
  "TrilhaBot Astra",
  "TrilhaBot Nova",
  "TrilhaBot Blaze",
  "TrilhaBot Storm",
  "TrilhaBot Frost",
  "TrilhaBot Shadow",
  "TrilhaBot Phantom",
  "TrilhaBot Vector",
];

/** Preenche vagas vazias com robots. */
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

  return {
    ...camp,
    participantes: [...camp.participantes, ...novosBots],
  };
}

/** Simula um confronto entre dois robots. Retorna vencedor_id (null = empate). */
export function simularConfrontoBots(
  j1_id: string,
  j2_id: string,
): { vencedor_id: string | null } {
  // Simulação determinística baseada no hash do ID
  const hash1 = j1_id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const hash2 = j2_id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const total = hash1 + hash2;
  const rand = ((hash1 * 31 + hash2 * 17) % 100) / 100;
  
  if (rand < 0.45) return { vencedor_id: j1_id };
  if (rand < 0.90) return { vencedor_id: j2_id };
  return { vencedor_id: null }; // empate
}

/** Verifica se um user_id é um robot. */
export function isRobot(userId: string): boolean {
  return userId.startsWith("bot-");
}

export function entrarCampeonatoTrilha(
  camp: CampeonatoTrilha,
  jogador: ParticipanteTrilha,
): CampeonatoTrilha {
  if (camp.status !== "aguardando") throw new Error("Campeonato já iniciado.");
  if (camp.participantes.some((p) => p.user_id === jogador.user_id)) {
    return camp; // já está
  }
  if (camp.participantes.length >= 32) throw new Error("Campeonato cheio.");
  return {
    ...camp,
    participantes: [...camp.participantes, jogador],
  };
}

export function sairCampeonatoTrilha(
  camp: CampeonatoTrilha,
  userId: string,
): CampeonatoTrilha {
  if (camp.status !== "aguardando") throw new Error("Campeonato já iniciado.");
  return {
    ...camp,
    participantes: camp.participantes.filter((p) => p.user_id !== userId),
  };
}

// ─────────────────────────── início ───────────────────────────

export function iniciarCampeonatoTrilha(
  camp: CampeonatoTrilha,
): CampeonatoTrilha {
  if (camp.participantes.length < 2) {
    throw new Error("Precisa de pelo menos 2 jogadores.");
  }

  if (camp.formato === "pontos") {
    const status: StatusCampeonato = "em_grupos";
    return { ...camp, status, rodadaAtual: 1 };
  }

  // "grupos": distribuir em grupos de até 4
  const grupos = distribuirGrupos(camp.participantes);
  return {
    ...camp,
    status: "em_grupos",
    grupos,
    rodadaAtual: 1,
  };
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

  const grupos: Grupo[] = [];
  for (let i = 0; i < numGrupos; i++) {
    grupos.push({ nome: nomes[i] ?? `${i + 1}`, participantes: [], resultados: [] });
  }

  shuffled.forEach((p, idx) => {
    const g = grupos[idx % numGrupos];
    if (g) g.participantes.push(p.user_id);
  });

  return grupos;
}

// ─────────────────────────── jogos ───────────────────────────

/**
 * Gera os confrontos pendentes de uma rodada de round-robin dentro de um grupo.
 */
export function confrontosPendentesGrupo(
  grupo: Grupo,
): [string, string][] {
  const ids = grupo.participantes;
  const jogados = new Set<string>();
  for (const r of grupo.resultados) {
    const key = [r.j1_id, r.j2_id].sort().join(":");
    jogados.add(key);
  }
  const pendentes: [string, string][] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const ii = ids[i];
      const jj = ids[j];
      if (ii && jj) {
        const key = [ii, jj].sort().join(":");
        if (!jogados.has(key)) {
          pendentes.push([ii, jj]);
        }
      }
    }
  }
  return pendentes;
}

/**
 * Retorna True se todos os confrontos de TODOS os grupos foram finalizados.
 */
export function todosGruposFinalizados(grupos: Grupo[]): boolean {
  return grupos.every((g) => confrontosPendentesGrupo(g).length === 0);
}

/**
 * Classificação de um grupo: ordena por pontos (vitória=3, empate=1, derrota=0),
 * depois por saldo de vitórias.
 */
export function classificacaoGrupo(grupo: Grupo): { user_id: string; pts: number; v: number; d: number; e: number }[] {
  const stats = new Map<string, { pts: number; v: number; d: number; e: number }>();
  for (const id of grupo.participantes) {
    stats.set(id, { pts: 0, v: 0, d: 0, e: 0 });
  }
  for (const r of grupo.resultados) {
    const s1 = stats.get(r.j1_id);
    const s2 = stats.get(r.j2_id);
    if (!s1 || !s2) continue;
    if (r.vencedor_id === r.j1_id) {
      s1.pts += 3; s1.v++;
      s2.d++;
    } else if (r.vencedor_id === r.j2_id) {
      s2.pts += 3; s2.v++;
      s1.d++;
    } else {
      s1.pts += 1; s1.e++;
      s2.pts += 1; s2.e++;
    }
  }
  return Array.from(stats.entries())
    .map(([user_id, s]) => ({ user_id, ...s }))
    .sort((a, b) => b.pts - a.pts || b.v - a.v || a.d - b.d);
}

/**
 * Retorna os 2 classificados de cada grupo para as eliminatórias.
 */
export function classificadosDosGrupos(grupos: Grupo[]): string[] {
  const classificados: string[] = [];
  for (const g of grupos) {
    const cls = classificacaoGrupo(g);
    const first = cls[0];
    const second = cls[1];
    if (first) classificados.push(first.user_id);
    if (second) classificados.push(second.user_id);
  }
  return classificados;
}

/**
 * Retorna o nome da fase baseado no número de confrontos na rodada.
 */
export function nomeFaseEliminatoria(numConfrontos: number): string {
  if (numConfrontos === 1) return "Final";
  if (numConfrontos === 2) return "Semifinal";
  if (numConfrontos === 4) return "Quartas de Final";
  if (numConfrontos === 8) return "Oitavas de Final";
  return `Rodada de ${numConfrontos} vagas`;
}

// ─────────────────────────── registrar resultado ───────────────

/**
 * Registra resultado de uma partida no campeonato.
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

  if (camp.formato === "pontos") {
    const grupos = [...camp.grupos];
    if (grupos.length === 0) {
      grupos.push({
        nome: "Liga",
        participantes: camp.participantes.map((p) => p.user_id),
        resultados: [],
      });
    }
    const first = grupos[0];
    if (first) {
      grupos[0] = {
        ...first,
        resultados: [...first.resultados, resultado],
      };

      const totalPartidas = (first.participantes.length * (first.participantes.length - 1)) / 2;
      const finalizado = grupos[0].resultados.length >= totalPartidas;

      if (finalizado) {
        const cls = classificacaoGrupo(grupos[0]);
        const winner = cls[0];
        return { ...camp, grupos, status: "finalizado", vencedor_id: winner?.user_id ?? null };
      }
    }

    return { ...camp, grupos };
  }

  // "grupos" — encontrar em qual grupo está a partida
  const grupos = camp.grupos.map((g) => {
    if (g.participantes.includes(j1_id) && g.participantes.includes(j2_id)) {
      return { ...g, resultados: [...g.resultados, resultado] };
    }
    return g;
  });

  if (todosGruposFinalizados(grupos)) {
    const classificados = classificadosDosGrupos(grupos);
    const confrontos = montarEliminatorias(classificados);
    return {
      ...camp,
      grupos,
      confrontosEliminatorios: confrontos,
      status: "eliminatorias",
    };
  }

  return { ...camp, grupos };
}

// ─────────────────────────── eliminatórias ─────────────────────

/**
 * Monta a chave eliminatória a partir dos classificados.
 */
export function montarEliminatorias(classificados: string[]): ConfrontoEliminatorio[] {
  const confrontos: ConfrontoEliminatorio[] = [];
  const n = classificados.length;
  const nPares = Math.floor(n / 2);
  const rodadaBase = Math.ceil(Math.log2(Math.max(n, 2)));

  for (let i = 0; i < nPares; i++) {
    const j1 = classificados[i * 2] ?? null;
    const j2 = classificados[i * 2 + 1] ?? null;
    confrontos.push({
      rodada: rodadaBase,
      j1_id: j1,
      j2_id: j2,
      vencedor_id: null,
      mesa_id: null,
      bye: false,
    });
  }

  if (n % 2 !== 0) {
    const last = classificados[n - 1] ?? null;
    confrontos.push({
      rodada: rodadaBase,
      j1_id: last,
      j2_id: null,
      vencedor_id: last,
      mesa_id: null,
      bye: true,
    });
  }

  return confrontos;
}

/**
 * Registra resultado de um confronto eliminatório.
 */
export function registrarResultadoEliminatorio(
  camp: CampeonatoTrilha,
  indexConfronto: number,
  vencedor_id: string,
  mesa_id: string,
): CampeonatoTrilha {
  const confrontos = [...camp.confrontosEliminatorios];
  const c = confrontos[indexConfronto];
  if (!c) return camp;

  confrontos[indexConfronto] = {
    ...c,
    vencedor_id,
    mesa_id,
  };

  // Verificar se todos os confrontos da rodada atual foram finalizados
  const rodadaAtual = confrontos[0]?.rodada ?? 1;
  const daRodada = confrontos.filter((x) => x.rodada === rodadaAtual);
  const todosFinalizados = daRodada.every((x) => x.vencedor_id !== null);

  if (!todosFinalizados) {
    return { ...camp, confrontosEliminatorios: confrontos };
  }

  // Se era a final (1 confronto), campeão definido
  if (daRodada.length === 1 && rodadaAtual === 1) {
    const winner = daRodada[0];
    return {
      ...camp,
      confrontosEliminatorios: confrontos,
      status: "finalizado",
      vencedor_id: winner?.vencedor_id ?? null,
    };
  }

  // Gerar próxima rodada
  const vencedores = daRodada
    .filter((x) => !x.bye)
    .map((x) => x.vencedor_id!)
    .concat(daRodada.filter((x) => x.bye).map((x) => x.j1_id!));

  const proximaRodada = Math.max(0, rodadaAtual - 1) || 1;
  const novosConfrontos: ConfrontoEliminatorio[] = [];
  for (let i = 0; i < vencedores.length; i += 2) {
    const j1 = vencedores[i] ?? null;
    const j2 = vencedores[i + 1] ?? null;
    novosConfrontos.push({
      rodada: proximaRodada,
      j1_id: j1,
      j2_id: j2,
      vencedor_id: j2 === undefined ? j1 : null,
      mesa_id: null,
      bye: j2 === undefined,
    });
  }

  return {
    ...camp,
    confrontosEliminatorios: [...confrontos, ...novosConfrontos],
  };
}

// ─────────────────────────── persistence ───────────────────────

const STORAGE_KEY = "trilha_championship_state";

export function salvarCampeonato(camp: CampeonatoTrilha): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(camp));
  } catch { /* noop */ }
}

export function carregarCampeonato(): CampeonatoTrilha | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CampeonatoTrilha;
  } catch {
    return null;
  }
}

export function limparCampeonato(): void {
  localStorage.removeItem(STORAGE_KEY);
}
