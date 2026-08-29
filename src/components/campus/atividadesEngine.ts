import type {
  Atividade,
  AtividadeConcluida,
  AtividadeTipo,
  EfeitosOpcao,
  EstudanteState,
  OpcaoAtividade,
  Traco,
} from "./types";
import { CURSOS } from "./types";

/**
 * Engine puro de atividades acadêmicas do Campus.
 * Princípio da encurralação narrativa: nenhuma opção é obviamente perfeita —
 * toda decisão troca algo (necessário para personalidade emergente).
 */

export const ATIVIDADES_INICIAIS: Atividade[] = [
  {
    id: "pesq-caboteba",
    tipo: "pesquisa",
    area: "biblioteca",
    titulo: "Pesquisa: História da Caboteba",
    descricao:
      "Seu primeiro trabalho vale nota cheia: pesquisar na Biblioteca a origem do esporte mais amado da Cidadela. O prazo termina hoje.",
    dificuldade: 1,
    prerequisitos: [],
    opcoes: [
      {
        texto: "Pesquisar fundo nos arquivos antigos",
        desfecho:
          "Descobriu que a Caboteba nasceu nos torneios de rua da Pracinha. O professor abre um sorriso raro.",
        efeitos: { nota: 30, reputacao: 4, traco: "diligente" },
      },
      {
        texto: "Copiar o resumo do colega e improvisar",
        desfecho: "O trabalho passou, mas o professor desconfia daquelas frases perfeitas demais.",
        efeitos: { nota: 10, reputacao: -2, traco: "malandro" },
      },
    ],
  },
  {
    id: "prova-calculo-sov",
    tipo: "prova",
    area: "aula",
    titulo: "Prova Teórica: Cálculo da Soberania",
    descricao:
      "A avaliação de Economia Soberana é hoje. Um veterano oferece cola; assistir à revisão da matéria levaria a tarde inteira.",
    dificuldade: 2,
    prerequisitos: [],
    opcoes: [
      {
        texto: "Aceitar a cola do veterano",
        desfecho: "Você passou com folga, mas agora deve uma ao veterano — e ele cobra.",
        efeitos: { nota: 25, reputacao: -3, traco: "malandro" },
      },
      {
        texto: "Estudar a tarde inteira com honestidade",
        desfecho: "Nota mediana, consciência limpa. O professor nota seu esforço.",
        efeitos: { nota: 15, reputacao: 3, traco: "diligente" },
      },
      {
        texto: "Recusar a cola e delatar o esquema",
        desfecho: "A sala inteira te olha torto. A coordenação te respeita.",
        efeitos: { nota: 5, reputacao: 6, traco: "pragmatico" },
      },
    ],
  },
  {
    id: "trab-liga-campus",
    tipo: "trabalho",
    area: "convivencia",
    titulo: "Trabalho em Grupo: Liga do Campus",
    descricao:
      "O grupo valendo 40% da nota discute a tese final. Você pode assumir tudo, dividir ou deixar os outros empurrarem.",
    dificuldade: 3,
    prerequisitos: [],
    opcoes: [
      {
        texto: "Assumir tudo sozinho na madrugada",
        desfecho: "Nota máxima do grupo, nome só seu no trabalho. Os colegas se afastam.",
        efeitos: { nota: 25, reputacao: -3, traco: "arriscado" },
      },
      {
        texto: "Dividir de verdade e mediar conflitos",
        desfecho: "Trabalho sólido e um grupo que volta a te procurar.",
        efeitos: { nota: 15, reputacao: 4, traco: "solidario" },
      },
      {
        texto: "Sumir e assinar só o nome final",
        desfecho: "O grupo levou a edição toda. Você ganhou pessoas que fingem que não te conhecem.",
        efeitos: { nota: 5, sov: 2, reputacao: -5, traco: "malandro" },
      },
    ],
  },
];

/** Primeira encurralação narrativa do Estudante: bico vs prova. */
export const CONFLITO_INICIAL: Atividade = {
  id: "conflito-bico-vs-prova",
  tipo: "trabalho",
  area: "comercial",
  titulo: "Primeiro Dilema: Clín do Bar ou Prova de Amanhã",
  descricao:
    "O dono do bar do Campus oferece um bico pagando 20 SOV esta noite. Amanhã cedo, porém, é sua prova decisiva de Economia Soberana.",
  dificuldade: 4,
  prerequisitos: [],
  opcoes: [
    {
      texto: "Trabalhar no bico — o aluguel não espera",
      desfecho: "20 SOV no bolso, cabeça pesada na prova. A nota pode doer.",
      efeitos: { sov: 20, nota: -10, traco: "pragmatico" },
    },
    {
      texto: "Recusar o bico e estudar a noite inteira",
      desfecho: "Você chega woke, preparado e quebrado financeiramente.",
      efeitos: { nota: 20, reputacao: 3, traco: "diligente" },
    },
    {
      texto: "Conseguir o bico de meio-período estudando no intervalo",
      desfecho: "Um meio a meio exausto: um pouco de dinheiro, um pouco de estudo.",
      efeitos: { sov: 10, nota: 5, traco: "arriscado" },
    },
  ],
};

export function novoEstudante(cursoId?: string): EstudanteState {
  const curso = cursoId && CURSOS.some((c) => c.id === cursoId) ? cursoId : CURSOS[0]!.id;
  return {
    cursoId: curso,
    semestre: 1,
    atividades: ATIVIDADES_INICIAIS,
    concluidas: [],
    notas: {},
    conflitoInicial: null,
    tourConcluido: false,
    tracos: {},
  };
}

export function normalizarEstudante(raw: unknown): EstudanteState {
  const base = novoEstudante();
  if (!raw || typeof raw !== "object") return base;
  const parcial = raw as Partial<EstudanteState>;
  return {
    ...base,
    ...parcial,
    atividades: Array.isArray(parcial.atividades) ? parcial.atividades : base.atividades,
    concluidas: Array.isArray(parcial.concluidas) ? parcial.concluidas : [],
    notas: parcial.notas ?? {},
    tracos: parcial.tracos ?? {},
  };
}

/** Traço dominante da personalidade emergente do jogador. */
export function tracoDominante(state: EstudanteState): Traco | null {
  let melhor: Traco | null = null;
  let maior = 0;
  for (const [traco, valor] of Object.entries(state.tracos)) {
    const v = valor ?? 0;
    if (v > maior) {
      maior = v;
      melhor = traco as Traco;
    }
  }
  return melhor;
}

export function mediaGeral(state: EstudanteState): number {
  const valores = Object.values(state.notas).filter((v): v is number => typeof v === "number");
  if (valores.length === 0) return 0;
  return Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
}

export interface ResultadoOpcao {
  estado: EstudanteState;
  sov: number;
  reputacao: number;
  desfecho: string;
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/**
 * Aplica uma opção de atividade — remove da fila, registra desfecho,
 * atualiza nota do tipo e trilha de traços. Todas as mudanças são puras.
 */
export function aplicarOpcao(
  estado: EstudanteState,
  atividade: Atividade,
  opcaoIdx: number,
): ResultadoOpcao {
  const opcao: OpcaoAtividade | undefined = atividade.opcoes[opcaoIdx];
  if (!opcao) throw new Error(`opção inválida (${opcaoIdx}) para atividade ${atividade.id}`);

  const efeitos: EfeitosOpcao = opcao.efeitos;
  const concluida: AtividadeConcluida = {
    atividadeId: atividade.id,
    opcaoIdx,
    desfecho: opcao.desfecho,
    efeitos,
  };

  const notas = { ...estado.notas };
  const anterior = notas[atividade.tipo] ?? 50;
  const delta = efeitos.nota ?? 0;
  // Média móvel para evitar extremos imediatas
  notas[atividade.tipo] = clamp100(anterior * 0.5 + (anterior + delta) * 0.5);

  const tracos = { ...estado.tracos };
  if (efeitos.traco) {
    tracos[efeitos.traco] = (tracos[efeitos.traco] ?? 0) + 1;
  }

  return {
    estado: {
      ...estado,
      atividades: estado.atividades.filter((a) => a.id !== atividade.id),
      concluidas: [...estado.concluidas, concluida],
      notas,
      tracos,
      conflitoInicial:
        atividade.id === CONFLITO_INICIAL.id ? opcao.texto : estado.conflitoInicial,
    },
    sov: efeitos.sov ?? 0,
    reputacao: efeitos.reputacao ?? 0,
    desfecho: opcao.desfecho,
  };
}

/** Filtra atividades cujos pré-requisitos estão satisfeitos. */
export function atividadesElegiveis(state: EstudanteState): Atividade[] {
  const fechadas = new Set(state.concluidas.map((c) => c.atividadeId));
  return state.atividades.filter((a) => a.prerequisitos.every((p) => fechadas.has(p)));
}
