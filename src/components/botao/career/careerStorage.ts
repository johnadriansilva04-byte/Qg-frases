import { CAREER_KEY, type CareerState, type Coach, type Headline } from "./types";

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
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CAREER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CareerState;
    return { ...EMPTY_CAREER, ...parsed, coach: { ...EMPTY_COACH, ...parsed.coach } };
  } catch {
    return null;
  }
}

export function saveCareer(c: CareerState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CAREER_KEY, JSON.stringify(c));
}

export function deleteCareer() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CAREER_KEY);
}

export function addHeadlines(state: CareerState, novas: Headline[]): CareerState {
  const headlines = [...novas, ...state.headlines].slice(0, 60);
  return { ...state, headlines };
}
