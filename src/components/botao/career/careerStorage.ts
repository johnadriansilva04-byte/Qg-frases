import { type CareerState, type Coach, type Divisao, type Headline } from "./types";
import { normalizarConversas } from "./conversasEngine";
import { HISTORIA_INICIAL, type HistoriaState } from "./historia/types";

const DIVISOES_VALIDAS: Divisao[] = ["serie-a", "serie-b", "serie-c"];

/** Saneia a história principal vinda do JSONB (registros antigos não a têm). */
export function normalizarHistoria(bruta: unknown): HistoriaState {
  const b = (bruta ?? {}) as Partial<HistoriaState>;
  return {
    capitulo: Number.isFinite(b.capitulo) ? Math.max(0, b.capitulo!) : HISTORIA_INICIAL.capitulo,
    pergaminhos: Array.isArray(b.pergaminhos) ? b.pergaminhos : [],
    perfil: {
      curiosidade: b.perfil?.curiosidade ?? 0,
      ceticismo: b.perfil?.ceticismo ?? 0,
      confronto: b.perfil?.confronto ?? 0,
      prudencia: b.perfil?.prudencia ?? 0,
    },
    ledger: Array.isArray(b.ledger) ? b.ledger : [],
    entrevistasProcessadas: Array.isArray(b.entrevistasProcessadas)
      ? b.entrevistasProcessadas
      : [],
    posicaoFinal:
      b.posicaoFinal === "padrao_existe" ||
      b.posicaoFinal === "padrao_nao_existe" ||
      b.posicaoFinal === "inconclusivo"
        ? b.posicaoFinal
        : null,
    ultimoMensageiro:
      b.ultimoMensageiro === "npc-bibliotecaria" || b.ultimoMensageiro === "npc-john-adrian"
        ? b.ultimoMensageiro
        : null,
  };
}

/**
 * Normaliza um CareerState vindo do banco (JSONB) para a forma que a UI espera.
 * Registros antigos podem ter coleções ausentes/nulas ou `divisao` inválida —
 * sem esta etapa, o celular e o menu da carreira quebravam ao renderizar.
 */
export function normalizarCareer(bruta: Partial<CareerState>): CareerState {
  const base: CareerState = { ...EMPTY_CAREER, ...bruta };
  return {
    ...base,
    coach: {
      ...EMPTY_CAREER.coach,
      ...(bruta.coach ?? {}),
      nome: bruta.coach?.nome ?? "",
      sov: Number.isFinite(bruta.coach?.sov) ? Math.max(0, Math.round(bruta.coach!.sov)) : 0,
      titulos: Number.isFinite(bruta.coach?.titulos) ? bruta.coach!.titulos : 0,
      campanhasJogadas: Number.isFinite(bruta.coach?.campanhasJogadas)
        ? bruta.coach!.campanhasJogadas
        : 0,
    },
    divisao: DIVISOES_VALIDAS.includes(bruta.divisao as Divisao)
      ? (bruta.divisao as Divisao)
      : "serie-c",
    rodadaAtual: Number.isFinite(bruta.rodadaAtual) ? bruta.rodadaAtual! : 0,
    rodadasDesdeEventoNarrativo: Number.isFinite(bruta.rodadasDesdeEventoNarrativo)
      ? bruta.rodadasDesdeEventoNarrativo!
      : 0,
    temporada: Number.isFinite(bruta.temporada) ? Math.max(1, bruta.temporada!) : 1,
    temporadasInadimplente: Number.isFinite(bruta.temporadasInadimplente)
      ? Math.max(0, Math.min(3, Math.round(bruta.temporadasInadimplente!)))
      : 0,
    marcoLiderTemporada: Number.isFinite(bruta.marcoLiderTemporada)
      ? Math.max(0, Math.round(bruta.marcoLiderTemporada!))
      : 0,
    ultimaRodadaProcessada: Number.isFinite(bruta.ultimaRodadaProcessada)
      ? bruta.ultimaRodadaProcessada!
      : -1,
    bonusProximaPartida: Number.isFinite(bruta.bonusProximaPartida)
      ? bruta.bonusProximaPartida!
      : 0,
    penaltiesProximaPartida: Number.isFinite(bruta.penaltiesProximaPartida)
      ? bruta.penaltiesProximaPartida!
      : 0,
    moralTime: Number.isFinite(bruta.moralTime)
      ? Math.max(0, Math.min(100, bruta.moralTime!))
      : 65,
    // Uma conversa por contato: funde duplicatas legadas (o modelo antigo
    // criava uma conversa por evento), dedup de mensagens por id, ids estáveis.
    conversas: normalizarConversas(bruta.conversas),
    headlines: Array.isArray(bruta.headlines) ? bruta.headlines : [],
    ultimasEscolhas: Array.isArray(bruta.ultimasEscolhas) ? bruta.ultimasEscolhas : [],
    feedCidadela: Array.isArray(bruta.feedCidadela) ? bruta.feedCidadela : [],
    memoriaNarrativa: Array.isArray(bruta.memoriaNarrativa) ? bruta.memoriaNarrativa : [],
    entrevistas: Array.isArray(bruta.entrevistas) ? bruta.entrevistas : [],
    eventoPendenteId: typeof bruta.eventoPendenteId === "string" ? bruta.eventoPendenteId : null,
    historia: normalizarHistoria(bruta.historia),
    // Propriedade de clubes: sanea participações corrompidas (participação negativa/NaN).
    propriedadeClubes: normalizarPropriedadeClubes(bruta.propriedadeClubes),
    // Torcida global: sanea valores corrompidos (fans negativos/NaN, seq
    // quebrada) sem recriar o estado — a soma global é mantida pelo engine.
    torcida: normalizarTorcida(bruta.torcida),
  };
}

function normalizarPropriedadeClubes(
  bruta: CareerState["propriedadeClubes"],
): CareerState["propriedadeClubes"] {
  if (!bruta || typeof bruta !== "object") return undefined;
  const participacoes = (bruta as { participacoes?: unknown }).participacoes;
  if (!participacoes || typeof participacoes !== "object") return undefined;
  
  const limpa: Record<string, any> = {};
  for (const [id, cota] of Object.entries(participacoes)) {
    if (!cota || typeof cota !== "object") continue;
    const participacao = Number((cota as { participacao?: unknown }).participacao);
    const custoMedio = Number((cota as { custoMedio?: unknown }).custoMedio);
    if (!Number.isFinite(participacao) || participacao < 0) continue;
    limpa[id] = {
      clubeId: id,
      participacao: Math.round(participacao),
      custoMedio: Number.isFinite(custoMedio) ? Math.max(0, custoMedio) : 0,
      adquiridoEm: (cota as { adquiridoEm?: string }).adquiridoEm ?? new Date().toISOString(),
    };
  }
  
  if (Object.keys(limpa).length === 0) return undefined;
  
  return {
    participacoes: limpa,
    totalDividendos: Number.isFinite((bruta as { totalDividendos?: unknown }).totalDividendos)
      ? Math.max(0, Number((bruta as { totalDividendos?: unknown }).totalDividendos))
      : 0,
    ultimaRodadaDividendos: Number.isFinite((bruta as { ultimaRodadaDividendos?: unknown }).ultimaRodadaDividendos)
      ? Number((bruta as { ultimaRodadaDividendos?: unknown }).ultimaRodadaDividendos)
      : 0,
  };
}

/** Saneia o mapa de torcida vindo do JSONB (dados antigos/corrompidos). */
function normalizarTorcida(
  bruta: CareerState["torcida"],
): CareerState["torcida"] {
  if (!bruta || typeof bruta !== "object") return undefined;
  const limpa: NonNullable<CareerState["torcida"]> = {};
  for (const [id, t] of Object.entries(bruta)) {
    if (!t || typeof t !== "object") continue;
    const fans = Number((t as { fans?: unknown }).fans);
    const seq = Number((t as { seq?: unknown }).seq);
    if (!Number.isFinite(fans) || fans < 0) continue;
    limpa[id] = {
      fans: Math.round(fans),
      seq: Number.isFinite(seq) ? Math.max(-38, Math.min(38, Math.round(seq))) : 0,
    };
  }
  return Object.keys(limpa).length > 0 ? limpa : undefined;
}

const EMPTY_COACH: Coach = {
  nome: "",
  apelido: "",
  cidade: "",
  estilo: "equilibrado",
  bio: "",
  sov: 0,
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
  temporadasInadimplente: 0,
  marcoLiderTemporada: 0,
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
