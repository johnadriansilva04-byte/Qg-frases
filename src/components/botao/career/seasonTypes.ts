/**
 * Sistema de Seasons e Campeonatos Integrados
 * Brasileirão + Copa do Brasil + Libertadores correndo juntos
 */

export type CompetitionType = "brasileirao" | "copa_brasil" | "libertadores";
export type CompetitionStatus = "nao_iniciada" | "em_andamento" | "finalizada";
export type CompetitionPhase = "fase_grupos" | "oitavas" | "quartas" | "semifinal" | "final";
export type SeasonStatus = "planejado" | "em_andamento" | "finalizado";
export type MatchStatus = "agendada" | "em_andamento" | "finalizada" | "cancelada";

export interface Season {
  id: number;
  ano: number;
  status: SeasonStatus;
  data_inicio: string;
  data_fim: string;
  criado_em: string;
  atualizado_em: string;
}

export interface SeasonParticipant {
  id: number;
  season_id: number;
  user_id: string;
  time_id: string;
  time_nome: string;
  time_abreviacao: string;
  time_cores: string[];
  pontos_soberania_inicio: number;
  classificacao_libertadores_anterior: number | null;
}

export interface Competition {
  id: number;
  season_id: number;
  tipo: CompetitionType;
  nome: string;
  status: CompetitionStatus;
  fase_atual: CompetitionPhase | null;
  dados: CompetitionData;
  criado_em: string;
  atualizado_em: string;
}

export interface CompetitionData {
  times?: string[]; // IDs dos times participantes
  tabela?: TableData[]; // para pontos-corridos
  confrontos?: MatchData[]; // para mata-mata
  grupos?: GroupData[]; // para grupos+mata
}

export interface TableData {
  time_id: string;
  time_nome: string;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_pro: number;
  gols_contra: number;
  saldo_gols: number;
  pontos: number;
}

export interface MatchData {
  id?: number;
  rodada: number;
  time_casa_id: string;
  time_casa_nome: string;
  time_fora_id: string;
  time_fora_nome: string;
  gols_casa?: number;
  gols_fora?: number;
  status: MatchStatus;
  data?: string;
}

export interface GroupData {
  nome: string;
  times: string[];
  tabela: TableData[];
}

export interface SeasonMatch {
  id: number;
  competicao_id: number;
  season_id: number;
  rodada: number;
  data_partida: string;
  time_casa_id: string;
  time_casa_nome: string;
  time_fora_id: string;
  time_fora_nome: string;
  gols_casa: number | null;
  gols_fora: number | null;
  status: MatchStatus;
  jogada_por_user: string | null;
  criado_em: string;
}

export interface CampaignEconomy {
  id: number;
  user_id: string;
  season_id: number;
  soberania_atual: number;
  custo_mensal: number;
  meses_negativos: number;
  game_over: boolean;
  transacoes: Transaction[];
  criado_em: string;
  atualizado_em: string;
}

export interface Transaction {
  tipo: "entrada" | "saida";
  valor: number;
  descricao: string;
  data: string;
}

export interface SeasonState {
  season: Season | null;
  participante: SeasonParticipant | null;
  competicoes: Competition[];
  economia: CampaignEconomy | null;
  partidas: SeasonMatch[];
  rodada_atual: number; // rodada atual do Brasileirão
  mes_atual: number; // mês atual (1-12)
}
