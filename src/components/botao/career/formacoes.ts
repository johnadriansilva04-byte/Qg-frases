/**
 * Táticas/formações e nomes de botões (personalização PS2).
 *
 * Cada formação define as posições (fração do campo [x,y], 0..1) dos 5 botões
 * de linha — o goleiro é fixo e adicionado pela engine. x cresce do próprio
 * gol (0) ao gol adversário (1); y cresce de cima (0) a baixo (1).
 *
 * A engine espelha automaticamente a formação para o lado "away" (1 - x).
 */

export type Tatica = "1-2-2" | "1-3-1" | "1-1-3" | "1-2-1-1" | "2-2-1";

export type Formacao = {
  id: Tatica;
  label: string;
  desc: string;
  /** Posições dos 5 botões de linha, em ordem [zagueiro ... atacante]. */
  posicoes: Array<[number, number]>;
  /** Rótulos padrão dos 5 botões (o usuário pode renomear). */
  nomesPadrao: [string, string, string, string, string];
};

export const FORMACOES: Formacao[] = [
  {
    id: "1-2-2",
    label: "1-2-2 · Equilibrado",
    desc: "Dois zagueiros, dois atacantes. Sólido e versátil.",
    posicoes: [
      [0.16, 0.5],
      [0.3, 0.24],
      [0.3, 0.76],
      [0.44, 0.38],
      [0.44, 0.62],
    ],
    nomesPadrao: ["Zagueiro", "Lateral-Esq", "Lateral-Dir", "Ponta", "Centroavante"],
  },
  {
    id: "1-3-1",
    label: "1-3-1 · Defensivo",
    desc: "Três na defesa, um atacante. Fecha a porta.",
    posicoes: [
      [0.16, 0.5],
      [0.3, 0.2],
      [0.3, 0.5],
      [0.3, 0.8],
      [0.44, 0.5],
    ],
    nomesPadrao: ["Zagueiro", "Volante-Esq", "Volante-Cen", "Volante-Dir", "Centroavante"],
  },
  {
    id: "1-1-3",
    label: "1-1-3 · Ofensivo",
    desc: "Três atacantes. Pressão total no ataque.",
    posicoes: [
      [0.16, 0.5],
      [0.3, 0.5],
      [0.44, 0.24],
      [0.44, 0.5],
      [0.44, 0.76],
    ],
    nomesPadrao: ["Zagueiro", "Volante", "Ponta-Esq", "Centroavante", "Ponta-Dir"],
  },
  {
    id: "1-2-1-1",
    label: "1-2-1-1 · Losango",
    desc: "Losango no meio, ponta e atacante. Controle de meio.",
    posicoes: [
      [0.16, 0.5],
      [0.28, 0.26],
      [0.28, 0.74],
      [0.4, 0.5],
      [0.47, 0.5],
    ],
    nomesPadrao: ["Zagueiro", "Meia-Esq", "Meia-Dir", "Armador", "Centroavante"],
  },
  {
    id: "2-2-1",
    label: "2-2-1 · Muralha",
    desc: "Dois zagueiros, dois volantes, um atacante. Fecha tudo.",
    posicoes: [
      [0.14, 0.32],
      [0.14, 0.68],
      [0.3, 0.32],
      [0.3, 0.68],
      [0.45, 0.5],
    ],
    nomesPadrao: ["Zagueiro-Esq", "Zagueiro-Dir", "Volante-Esq", "Volante-Dir", "Centroavante"],
  },
];

export const FORMACAO_DEFAULT: Tatica = "1-2-2";

export const BOTOES_NOMES_DEFAULT: [string, string, string, string, string] = [
  "Zagueiro",
  "Lateral-Esq",
  "Lateral-Dir",
  "Ponta",
  "Centroavante",
];

export function formacaoById(id: Tatica | string | undefined): Formacao {
  return FORMACOES.find((f) => f.id === id) ?? FORMACOES[0]!;
}

/** Normaliza um array de nomes vindo do JSONB garantindo 5 entradas de texto. */
export function normalizarBotoesNomes(
  raw: unknown,
  fallback: [string, string, string, string, string] = BOTOES_NOMES_DEFAULT,
): [string, string, string, string, string] {
  if (!Array.isArray(raw) || raw.length < 5) return [...fallback];
  const out: [string, string, string, string, string] = [...fallback];
  for (let i = 0; i < 5; i++) {
    const v = raw[i];
    if (typeof v === "string" && v.trim()) out[i] = v.trim().slice(0, 18);
  }
  return out;
}
