import { type CareerState, type Coach, type Headline } from "./types";

const EMPTY_COACH: Coach = {
  nome: "",
  apelido: "",
  cidade: "",
  estilo: "equilibrado",
  bio: "",
  soberania: 0,
  campanhasJogadas: 0,
  titulos: 0,
  criadoEm: new Date().toISOString(),
};

export const EMPTY_CAREER: CareerState = {
  coach: EMPTY_COACH,
  dificuldadeAtual: null,
  bonusProximaPartida: 0,
  penaltiesProximaPartida: 0,
  moralTime: 65,
  ultimasEscolhas: [],
  headlines: [],
  ultimaRodadaProcessada: -1,
  eventoPendenteId: null,
  divisao: "serie-c",
  rodadaAtual: 0,
  rodadasDesdeEventoNarrativo: 0,
  temporada: 1,
  conversas: [],
};

export function loadCareer(): CareerState | null {
  // Isolamento: a carreira não usa localStorage compartilhado entre contas.
  return null;
}

export function saveCareer(_c: CareerState) {
  // Persistência é feita apenas no Supabase.
}

export function deleteCareer() {
  // Dados da carreira não ficam em cache do navegador.
}

export function addHeadlines(state: CareerState, novas: Headline[]): CareerState {
  const headlines = [...novas, ...state.headlines].slice(0, 60);
  return { ...state, headlines };
}
