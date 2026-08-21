import type { Difficulty } from "../types";

export type TacticalStyle = "ataque" | "equilibrado" | "defesa";

/** Divisão do Brasileirão em que o treinador está disputando a temporada. */
export type Divisao = "serie-a" | "serie-b" | "serie-c";

export type Coach = {
  nome: string;
  apelido: string;
  cidade: string;
  estilo: TacticalStyle;
  bio: string;
  sov: number;
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

export function nivelDoTreinador(sov: number) {
  let atual = COACH_LEVELS[0]!;
  let proximo: (typeof COACH_LEVELS)[number] | null = null;
  for (let i = 0; i < COACH_LEVELS.length; i++) {
    if (sov >= COACH_LEVELS[i]!.min) {
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
  bonusMoral?: number; // afeta SOV se ganhar
  penaltyPontos?: number; // desconta SOV se resultado ruim
  riscoAlto?: boolean;
  /** Derrota por W.O. na próxima partida (sanção grave — sem jogar). */
  wo?: boolean;
  /** Desfalca N botões na próxima partida (joga com elenco reduzido). */
  desfalqueBotao?: number;
  /** Perde N pontos na tabela de classificação (punição da diretoria/CBJF). */
  perdaPontos?: number;
  /** Impacto financeiro (SOV) imediato, positivo ou negativo. */
  impactoFinanceiro?: number;
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

/**
 * Desafio de patrocinador: mensagem em primeira pessoa no celular do
 * treinador estipulando uma meta para a próxima partida. Ao atingir a meta,
 * o treinador ganha SOV (recompensa). Cada desafio tem um tipo de meta.
 */
export type TipoMetaPatrocinador =
  | "vencer"
  | "vencer_margem"
  | "gols_feitos"
  | "nao_sofrer"
  | "empatar_ou_vencer";

export type DesafioPatrocinador = {
  id: string;
  patrocinador: string;
  mensagem: string;
  meta: TipoMetaPatrocinador;
  /** Parâmetro numérico da meta (ex.: margem mínima de gols, qtd de gols). */
  alvo?: number | undefined;
  /** SOV premiada ao concluir. */
  recompensa: number;
  /** Rodada em que o desafio foi proposto. */
  rodada: number;
  /** Indica se já foi concluído/contabilizado. */
  concluido: boolean;
};

export type ConversaTipo = "evento" | "medico" | "noticia" | "rpg" | "patrocinador" | "narrativa";

/**
 * Memória narrativa dos personagens (§5): um acontecimento relevante que um ou
 * mais personagens "conhecem" e podem usar em reações futuras. Não armazena
 * tudo — só o que tem importância para a continuidade da história.
 */
export type EventoNarrativo = {
  id: string;
  /** Declaração do jogador (entrevista), resultado de partida, reação de NPC. */
  tipo: "declaracao" | "resultado" | "reacao";
  /** Personagem afetado/proprietário do fato (quem "sabe" disto). */
  npc?: import("./rpg/types").NpcId | undefined;
  /** Fato registrado (ex.: "Venceu o rival por 5x1", "Disse: '...'"). */
  evento: string;
  /** Interpretação da IA (ex.: "Declaração provocativa contra o adversário"). */
  interpretacao?: string | undefined;
  importancia: "alta" | "media" | "baixa";
  rodada: number;
  temporada: number;
};

/** Uma declaração do jogador numa entrevista, já interpretada pelo sistema. */
export type DeclaracaoEntrevista = {
  texto: string;
  interpretacao: string;
  tom: "provocacao" | "humildade" | "orgulho" | "neutro";
  importancia: "alta" | "media" | "baixa";
};

/** Registro completo de uma entrevista coletiva pós-jogo. */
export type EntrevistaRegistro = {
  id: string;
  partidaId: string;
  competicao: string;
  adversario: string;
  placar: string;
  rodada: number;
  temporada: number;
  declaracoes: DeclaracaoEntrevista[];
  /** Recompensa em SOV coletada ao final. */
  recompensa: number;
};

/* ----------------------- Bolsa de Valores da Cidadela ----------------------- */

export type AtivoId = "clube" | "ciencia" | "biblioteca" | "trilha";

export type PosicaoBolsa = {
  ativoId: AtivoId;
  quantidade: number;
  /** Preço médio de compra (SOV por cota). */
  custoMedio: number;
};

export type TransacaoBolsa = {
  id: string;
  tipo: "compra" | "venda" | "dividendo";
  ativoId: AtivoId;
  quantidade: number;
  /** Valor total em SOV (positivo = crédito, negativo = débito). */
  valor: number;
  rodada: number;
  temporada: number;
  timestamp: string;
};

/**
 * Estado da bolsa persistido no JSONB da carreira (fonte de verdade = Supabase,
 * via `progresso_caminpanha`). Preços evoluem com os acontecimentos reais da
 * carreira (resultados, eventos do mundo) — nunca são valores de tela.
 */
export type BolsaState = {
  precos: Record<AtivoId, number>;
  /** Preço da rodada anterior (para variação exibida). */
  precosAnteriores: Record<AtivoId, number>;
  /** Histórico curto de preços por ativo (sparkline, últimas 12 rodadas). */
  historicoPrecos: Partial<Record<AtivoId, number[]>>;
  carteira: PosicaoBolsa[];
  transacoes: TransacaoBolsa[];
  /** Última rodada em que preços/dividendos foram processados. */
  ultimaRodadaBolsa: number;
  /** Patrimônio total da Cidadela (índice econômico do ecossistema). */
  patrimonioCidadela: number;
};

export type ConversaCelular = {
  id: string;
  tipo: ConversaTipo;
  nome: string;
  avatar: string;
  cargo: string;
  mensagens: Array<{
    id: string;
    texto: string;
    remetente: "eu" | "outro";
    timestamp: string;
  }>;
  naoLida: boolean;
  /** NPC do RPG que responde em tempo real nesta conversa. */
  npcId?: import("./rpg/types").NpcId | undefined;
  /** Canal estável para conversas sem NPC (ex.: "medico", "redes",
   *  "decisao:craque-dor"). Garante UMA conversa por canal — mensagens novas
   *  entram na conversa existente, nunca criam outra. */
  canal?: string | undefined;
  /** Evento RPG com escolhas (dilema) anexado à conversa. */
  eventoRpg?:
    | { eventoId: string; respondido: boolean; tom: "drama" | "suspense" | "terror" }
    | undefined;
  /** Link (rota interna) para o Cartório/Biblioteca com contexto do pedido. */
  linkCartorio?: string | undefined;
  /** Link de ação genérico (rota interna) anexado à conversa — ex.: convite
   *  do Ritual da Trilha enviado pelo Pracinha apontando para a Cidadela. */
  linkExterno?: { rotulo: string; to: string } | undefined;
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
  // Divisão atual do Brasileirão (promoção/rebaixamento entre séries).
  divisao: Divisao;
  /** Snapshot completo das 3 divisões da temporada (A/B/C). Garante que
   * estatísticas e tabelas de todas as séries sejam consultáveis no hub. */
  ligas?: import("./seasonEngine").LigasTemporada | undefined;
  /** Comparação das divisões na próxima temporada (para recriar ligas após
   * promoção/rebaixamento). */
  composicoes?: import("./seasonEngine").ComposicoesDivisoes | undefined;
  // Enredo de suborno (narrativa paralela). Veja subornoEngine.ts.
  suborno?: import("./subornoEngine").SubornoState | undefined;
  // Histórias dinâmicas no celular (suspense/drama). Veja narrativeEngine.ts.
  narrativa?: import("./narrativeEngine").NarrativaState | undefined;
  // Copa do Brasil jogável, paralela ao Brasileirão (pontos corridos).
  copaBrasil?: import("./competitionApi").CopaBrasilState | undefined;
  // Rodada corrente do Brasileirão — base para distribuição de eventos.
  rodadaAtual: number;
  // Rodadas desde o último evento narrativo (para espaçar 2-4/mês).
  rodadasDesdeEventoNarrativo: number;
  // Número da temporada (carreira infinita enquanto houver soberania).
  temporada: number;
  // Desafio de patrocinador ativo (mensagem no celular com meta → soberania).
  desafioPatrocinador?: DesafioPatrocinador | null | undefined;
  // Conversas do celular (patrocinador, namorada, suborno, etc.)
  conversas: ConversaCelular[];
  // Sanções de decisões pendentes a aplicar na próxima partida real.
  // wo=true força derrota por W.O. (sem jogar); desfalqueBotao remove N botões;
  // perdaPontos desconta pontos da tabela na próxima partida (punição CBJF).
  woProximaPartida?: boolean | undefined;
  desfalqueBotaoProxima?: number | undefined;
  perdaPontosProxima?: number | undefined;
  // Memória narrativa do RPG (relacionamentos, segredos, sequência).
  memoriaRpg?: import("./rpg/types").MemoriaRpg | undefined;
  // Memória narrativa dos personagens-IA: declarações, resultados e reações
  // relevantes que alimentam o contexto futuro de cada personagem (§5).
  memoriaNarrativa?: EventoNarrativo[] | undefined;
  // Histórico de entrevistas coletivas concedidas (§6: fonte narrativa).
  entrevistas?: EntrevistaRegistro[] | undefined;
  // Carteira na Bolsa de Valores da Cidadela (§22-25).
  bolsa?: BolsaState | undefined;
  // Feed da Rede da Cidadela (posts reativos a eventos do jogo).
  feedCidadela?: import("./rpg/types").PostFeed[] | undefined;
  // Ritual da Trilha: válvula narrativa do Modo Carreira (progresso diário).
  trilhaRitual?:
    | {
        ultimoDia: string;
        jogosHoje: number;
        vitoriasHoje: number;
        pagasHoje: string[];
      }
    | undefined;
  // História principal (John Adrian): capítulos, pergaminhos, Narrative Ledger.
  // OPCIONAL — só avança quando o jogador conclui entrevistas pós-partida.
  historia?: import("./historia/types").HistoriaState | undefined;
  // Torcida global do universo (Σ = 1.000.000, zero-sum): cada clube tem
  // fans + sequência. Persistida no JSONB da carreira — sobrevive a F5.
  torcida?: import("./torcidaEngine").TorcidaState | undefined;
};

export const CAREER_KEY = "botao:career:v1";

export const POINTS = {
  VITORIA: 3,
  EMPATE: 1,
  DERROTA: 0,
  // Campeão ganha entre +100 e +200 de SOV (base + bônus por dificuldade).
  CAMPEAO_BASE: 100,
  CAMPEAO_BONUS_MAX: 100, // somado ao base conforme dificuldade → 100..200
  VICE: 15,
  TERCEIRO: 10,
  QUARTO: 5,
  CLASSIFICOU_MATA: 5,
  VENCEU_GRUPO: 3,
  TITULO_AMADOR: 0,
  TITULO_PROFISSIONAL: 0,
  TITULO_LENDA: 0,
};
