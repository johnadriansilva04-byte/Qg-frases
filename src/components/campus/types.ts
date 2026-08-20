/**
 * Tipos do Campus Universitário (Estudante/Pesquisador).
 * Engine puro: sem dependências de React ou Supabase — testável via jiti.
 */

export type AtividadeTipo = "pesquisa" | "experimento" | "prova" | "trabalho" | "publicacao";

export type Traco = "diligente" | "arriscado" | "pragmatico" | "malandro" | "solidario";

/** Efeitos de uma decisão acadêmica. SOV/reputação/nota com trade-offs. */
export interface EfeitosOpcao {
  sov?: number;
  reputacao?: number;
  nota?: number;
  /** Marca de personalidade construída pelo jogador (nunca pré-definida). */
  traco?: Traco;
}

export interface OpcaoAtividade {
  texto: string;
  desfecho: string;
  efeitos: EfeitosOpcao;
}

export interface Atividade {
  id: string;
  tipo: AtividadeTipo;
  /** Área do campus onde acontece (biblioteca, laboratorio, aula, convivencia). */
  area: "biblioteca" | "laboratorio" | "aula" | "convivencia" | "comercial";
  titulo: string;
  descricao: string;
  dificuldade: number; // 1-5
  opcoes: OpcaoAtividade[];
  prerequisitos: string[];
}

export interface AtividadeConcluida {
  atividadeId: string;
  opcaoIdx: number;
  desfecho: string;
  efeitos: EfeitosOpcao;
}

/** Estado individual do Estudante (vive em cidadela_perfis.estado.estudante). */
export interface EstudanteState {
  cursoId: string;
  semestre: number;
  atividades: Atividade[];
  concluidas: AtividadeConcluida[];
  /** Média 0-100 por tipo de atividade. */
  notas: Partial<Record<AtividadeTipo, number>>;
  /** Primeira encurralação narrativa resolvida. */
  conflitoInicial: string | null;
  tourConcluido: boolean;
  /** Personalidade emergente: trilha de traços das decisões tomadas. */
  tracos: Partial<Record<Traco, number>>;
}

export const CURSOS: Array<{ id: string; nome: string }> = [
  { id: "ciencias-do-jogo", nome: "Ciências do Jogo" },
  { id: "economia-soberana", nome: "Economia Soberana" },
  { id: "engenharia-tatica", nome: "Engenharia Tática" },
  { id: "memoria-e-verdade", nome: "Memória e Verdade (Arquivos)" },
];
