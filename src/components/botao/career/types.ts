import type { Difficulty } from "../types";

export type TacticalStyle = "ataque" | "equilibrado" | "defesa";

export type Coach = {
  nome: string;
  apelido: string;
  cidade: string;
  estilo: TacticalStyle;
  bio: string;
  soberania: number;
  campanhasJogadas: number;
  titulos: number;
  criadoEm: string;
};

export const COACH_LEVELS: { nome: string; min: number; icon: string }[] = [
  { nome: "Aprendiz", min: 0, icon: "🎓" },
  { nome: "Promessa", min: 30, icon: "🌱" },
  { nome: "Treinador Consolidado", min: 100, icon: "⚙️" },
  { nome: "Estrategista", min: 250, icon: "♟️" },
  { nome: "Ídolo", min: 500, icon: "⭐" },
  { nome: "Lenda", min: 1000, icon: "👑" },
];

export function nivelDoTreinador(soberania: number) {
  let atual = COACH_LEVELS[0]!;
  let proximo: typeof COACH_LEVELS[number] | null = null;
  for (let i = 0; i < COACH_LEVELS.length; i++) {
    if (soberania >= COACH_LEVELS[i]!.min) {
      atual = COACH_LEVELS[i]!;
      proximo = COACH_LEVELS[i + 1] ?? null;
    }
  }
  return { atual, proximo };
}

export type Choice = {
  id: string;
  texto: string;
  descricao?: string;
  bonusPoder?: number; // afeta o power do time só na próxima partida (+/-)
  bonusMoral?: number; // afeta soberania se ganhar
  penaltyPontos?: number; // desconta soberania se resultado ruim
  riscoAlto?: boolean;
};

export type ChoiceEvent = {
  id: string;
  titulo: string;
  descricao: string; // narrativa contextual
  escolhas: Choice[];
};

export type Headline = {
  id: string;
  manchete: string;
  subtitulo?: string;
  tag: "geral" | "seu-time" | "polemica" | "zebra" | "coletiva";
  rodada: number;
};

export type CareerState = {
  coach: Coach;
  dificuldadeAtual: Difficulty | null;
  bonusProximaPartida: number; // acumulado por escolhas
  penaltiesProximaPartida: number;
  moralTime: number; // 0-100
  ultimasEscolhas: string[]; // ids
  headlines: Headline[]; // últimas manchetes
  ultimaRodadaProcessada: number; // pra saber quando gerar novo jornal
  eventoPendenteId: string | null; // choice event a ser mostrado antes da próxima
};

export const CAREER_KEY = "botao:career:v1";

export const POINTS = {
  VITORIA: 3,
  EMPATE: 1,
  DERROTA: -3,
  CAMPEAO: 20,
  VICE: 15,
  TERCEIRO: 10,
  QUARTO: 5,
  CLASSIFICOU_MATA: 5,
  VENCEU_GRUPO: 3,
  TITULO_AMADOR: 100,
  TITULO_PROFISSIONAL: 250,
  TITULO_LENDA: 500,
};
