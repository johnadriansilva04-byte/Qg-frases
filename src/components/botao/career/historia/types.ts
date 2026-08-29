/**
 * Tipos da História Principal do Modo Carreira (John Adrian).
 *
 * Princípios:
 *  - A história é OPCIONAL: quem só quer jogar futebol ignora tudo (§23, §40).
 *  - A ENTREVISTA pós-partida é o único gatilho de progressão (§20, §39).
 *  - Toda decisão gera uma entrada no NARRATIVE LEDGER persistido no
 *    CareerState (§29, §30) — a história sobrevive a sair e voltar.
 *  - Toda informação carrega uma ClassificacaoFonte (§19): o jogador sempre
 *    distingue fato de hipótese, interpretação e ficção.
 */

/** Classificação interna de cada informação da investigação (§19). */
export type ClassificacaoFonte =
  | "HISTORICAL_FACT"
  | "PRIMARY_SOURCE"
  | "SECONDARY_SOURCE"
  | "CHARACTER_INTERPRETATION"
  | "HYPOTHESIS"
  | "FICTION"
  | "UNVERIFIED_CLAIM";

export const CLASSIFICACAO_LABEL: Record<ClassificacaoFonte, string> = {
  HISTORICAL_FACT: "Fato histórico",
  PRIMARY_SOURCE: "Fonte primária",
  SECONDARY_SOURCE: "Fonte secundária",
  CHARACTER_INTERPRETATION: "Interpretação do personagem",
  HYPOTHESIS: "Hipótese",
  FICTION: "Ficção do universo",
  UNVERIFIED_CLAIM: "Alegação não verificada",
};

/** Uma referência real do banco de referências (§34). */
export type ReferenciaHistorica = {
  id: string;
  titulo: string;
  /** Resumo curto — sem citações longas (§14). */
  resumo: string;
  /** Instituição/fonte verificável (ex.: US Holocaust Memorial Museum). */
  fonte: string;
  classificacao: ClassificacaoFonte;
};

/**
 * Um Pergaminho = FRAGMENTO da pesquisa de John Adrian (§12).
 * Nunca contém a tese inteira: fragmento → referência → pergunta.
 */
export type PergaminhoFragmento = {
  id: string;
  capitulo: number;
  titulo: string;
  /** O texto do fragmento (curto, evocativo — nunca a resposta). */
  fragmento: string;
  /** Id da referência real ligada ao fragmento (ver referencias.ts). */
  referenciaId: string;
  /** A pergunta que o fragmento deixa com o jogador. */
  pergunta: string;
  classificacao: ClassificacaoFonte;
};

/** Entrada do Narrative Ledger (§29): cada decisão reconstruível. */
export type DecisaoHistoria = {
  decisaoId: string;
  capitulo: number;
  /** Evento de origem (ex.: "entrevista:{partidaId}", "arquivo:desfecho"). */
  sourceEvent: string;
  /** Resumo da escolha/resposta do jogador. */
  playerChoice: string;
  timestamp: string;
  consequencia: string;
  /** Próximo estado narrativo (ex.: "capitulo:2"). */
  nextState: string;
};

/** Variável narrativa acumulada a partir das respostas das entrevistas (§21). */
export type PerfilDecisao = {
  curiosidade: number;
  ceticismo: number;
  confronto: number;
  prudencia: number;
};

/** Posição final do jogador sobre a questão central (§28) — nunca dogmática. */
export type PosicaoFinal = "padrao_existe" | "padrao_nao_existe" | "inconclusivo";

/** Estado persistente da história principal (vive em CareerState.historia). */
export type HistoriaState = {
  /** Capítulo atual (0 = latente, sem história descoberta). */
  capitulo: number;
  /** Fragmentos de pergaminho já obtidos (ids de PergaminhoFragmento). */
  pergaminhos: string[];
  /** Perfil de decisão acumulado das entrevistas (§21). */
  perfil: PerfilDecisao;
  /** Narrative ledger: todas as decisões/eventos da linha principal (§30). */
  ledger: DecisaoHistoria[];
  /** partidaIds cuja entrevista já alimentou a história (idempotência §7). */
  entrevistasProcessadas: string[];
  /** Posição final registrada no desfecho (null = arco aberto). */
  posicaoFinal: PosicaoFinal | null;
  /** Quem entregou a última pista (para variar os mensageiros). */
  ultimoMensageiro: "npc-bibliotecaria" | "npc-john-adrian" | null;
};

export const HISTORIA_INICIAL: HistoriaState = {
  capitulo: 0,
  pergaminhos: [],
  perfil: { curiosidade: 0, ceticismo: 0, confronto: 0, prudencia: 0 },
  ledger: [],
  entrevistasProcessadas: [],
  posicaoFinal: null,
  ultimoMensageiro: null,
};

/** Total de capítulos do primeiro arco (último = desfecho). */
export const CAPITULO_DESFECHO = 6;
