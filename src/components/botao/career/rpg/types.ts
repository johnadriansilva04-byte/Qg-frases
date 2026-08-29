/**
 * Tipos do módulo RPG narrativo da Cidadela.
 *
 * Princípio: a IA narra o mundo, o SISTEMA controla o mundo.
 * Relacionamentos, dívidas e segredos vivem no CareerState (persistido);
 * a LLM apenas interpreta esse estado em voz de personagem.
 */

export type NpcId =
  | "npc-valeria"
  | "npc-dario"
  | "npc-braganca"
  | "npc-corretor"
  | "npc-donacida"
  | "npc-torcedor"
  | "npc-pracinha"
  | "npc-jornalista"
  | "npc-bibliotecaria"
  | "npc-dirigente"
  | "npc-john-adrian";

export interface PersonagemNpc {
  id: NpcId;
  nome: string;
  avatar: string;
  cargo: string;
  /** System prompt usado quando a LLM local está disponível. */
  systemPrompt: string;
  /** Relacionamento inicial (-100..100). */
  relacaoInicial: number;
}

/** Faixas de relacionamento (interface traduz o número para texto elegante). */
export type FaixaRelacao = "inimigo" | "hostil" | "desconhecido" | "conhecido" | "aliado" | "amigo" | "leal";

export function faixaRelacao(score: number): FaixaRelacao {
  if (score <= -60) return "inimigo";
  if (score <= -25) return "hostil";
  if (score < 15) return "desconhecido";
  if (score < 45) return "conhecido";
  if (score < 70) return "aliado";
  if (score < 90) return "amigo";
  return "leal";
}

/** Um segredo/dívida narrativa que pode voltar a cobrar no futuro. */
export interface SegredoNarrativo {
  id: string;
  /** Texto curto do que ficou pendente (ex.: "Você deve um favor ao Corretor"). */
  descricao: string;
  /** Rodada em que foi criado. */
  rodada: number;
  /** Rodada a partir da qual pode "cobrar". */
  cobraEmRodada: number;
  /** Já cobrado (não volta mais). */
  cobrado: boolean;
}

/** Memória narrativa persistente do RPG (dentro do CareerState). */
export interface MemoriaRpg {
  /** Relacionamento por NPC (-100..100). */
  relacoes: Partial<Record<NpcId, number>>;
  /** Segredos/dívidas pendentes que podem retornar como evento. */
  segredos: SegredoNarrativo[];
  /** IDs de eventos RPG já disparados (não repetir o mesmo arco). */
  eventosVistos: string[];
  /** Última rodada em que um evento RPG disparou (espaçamento). */
  ultimaRodadaEvento: number;
  /** Contagem de derrotas seguidas (gatilho de crise/demissão). */
  derrotasSeguidas: number;
  /** Se o treinador já foi demitido alguma vez nesta carreira. */
  jaFoiDemitido: boolean;
}

export const MEMORIA_INICIAL: MemoriaRpg = {
  relacoes: {},
  segredos: [],
  eventosVistos: [],
  ultimaRodadaEvento: -99,
  derrotasSeguidas: 0,
  jaFoiDemitido: false,
};

/** Um post da Rede da Cidadela. */
export interface PostFeed {
  id: string;
  autor: string;
  avatar: string;
  selo: "noticia" | "torcedor" | "rival" | "oficial" | "rumor";
  texto: string;
  curtidas: number;
  comentarios: Array<{ autor: string; avatar: string; texto: string }>;
  rodada: number;
  timestamp: string;
}

/** Escolha de um evento RPG (dilema com vantagem/consequência). */
export interface EscolhaRpg {
  texto: string;
  /** Desfecho narrativo exibido após escolher. */
  desfecho: string;
  efeitos: {
    sov?: number;
    moral?: number;
    bonusPoder?: number;
    wo?: boolean;
    desfalqueBotao?: number;
    /** Delta de relacionamento com um NPC específico. */
    relacao?: { npc: NpcId; delta: number };
    /** Cria um segredo que pode ser cobrado depois. */
    segredo?: Omit<SegredoNarrativo, "id" | "rodada" | "cobrado">;
    /**
     * Gera pedido pendente no Cartório da Cidadela (contrato/peticao/multa).
     * O BotaoGame cria o pedido e anexa link para a Biblioteca na conversa.
     */
    cartorio?: { tipo: "contrato" | "peticao" | "multa"; titulo: string };
  };
}

export interface EventoRpg {
  id: string;
  /** Quem envia no celular (NPC remetente). */
  remetente: NpcId;
  titulo: string;
  texto: string;
  escolhas: EscolhaRpg[];
  /** Tom visual: suspense/terror muda o estilo do modal. */
  tom: "drama" | "suspense" | "terror";
}
