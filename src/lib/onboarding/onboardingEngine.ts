/**
 * MOTOR DO ONBOARDING — PURO, DETERMINÍSTICO (testável com jiti).
 *
 * O Pracinha é uma IA ativa (§4): as respostas dependem do estágio real do
 * onboarding e do texto do usuário — não são uma lista fixa de mensagens.
 * Engines de decisão do projeto NÃO podem importar módulos com alias "@/"
 * (só caminhos relativos), e o texto é estável ao retry (determinístico).
 */

export type OnboardingStage =
  | "nao-iniciado"
  | "identificacao"
  | "introducao"
  | "ambientes"
  | "sov"
  | "destino"
  | "primeiro-jogo"
  | "concluido";

export type OnboardingDestinoKey = "cidadela" | "campus" | "gerador";

export interface OnboardingEstado {
  stage: OnboardingStage;
  destino: OnboardingDestinoKey | null;
  /** Data ISO de conclusão; se preenchido, o tour NUNCA reabre (§7). */
  concluidoEm: string | null;
  atualizadoEm: string;
}

export interface DestinoInfo {
  key: OnboardingDestinoKey;
  rotulo: string;
  descricao: string;
  link: string;
  fala: string;
}

const ORDEM: OnboardingStage[] = [
  "nao-iniciado",
  "identificacao",
  "introducao",
  "ambientes",
  "sov",
  "destino",
  "primeiro-jogo",
  "concluido",
];

export const DESTINOS: DestinoInfo[] = [
  {
    key: "cidadela",
    rotulo: "Cidadela dos Clássicos",
    descricao: "Futebol, Trilha e o Estádio do Campus",
    link: "/cidadela",
    fala:
      "Aqui ficam os jogos clássicos da Cidadela: Futebol de Botão no Estádio, " +
      "Trilha dos Mistérios e campeonato com times reais. 🕹️",
  },
  {
    key: "campus",
    rotulo: "Campus Universitário",
    descricao: "Onde a vida acontece",
    link: "/campus",
    fala:
      "O Campus é onde vive a rotina da Cidadela: o Brio (Biblioteca, Laboratórios " +
      "e Setor Comercial) e a sua profissão. 🎓",
  },
  {
    key: "gerador",
    rotulo: "Gerador de Texto",
    descricao: "Frases e correção",
    link: "/gerador",
    fala:
      "O Gerador cria frases únicas para todo momento e o Corretor ajusta seu " +
      "texto em tempo real. Escreva e brilhe. ✍️",
  },
];

export function destinoPorKey(key: OnboardingDestinoKey | null | undefined): DestinoInfo | null {
  if (!key) return null;
  return DESTINOS.find((d) => d.key === key) ?? null;
}

/** Estado inicial puro (nunca abriu). */
export function estadoInicialOnboarding(): OnboardingEstado {
  return {
    stage: "nao-iniciado",
    destino: null,
    concluidoEm: null,
    atualizadoEm: new Date(0).toISOString(),
  };
}

/** Saneia qualquer JSON (Supabase/localStorage) sem quebrar o app (§7). */
export function normalizarEstadoOnboarding(raw: unknown): OnboardingEstado {
  const base = estadoInicialOnboarding();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const stageValida = ORDEM.includes(r["stage"] as OnboardingStage)
    ? (r["stage"] as OnboardingStage)
    : base.stage;
  const destinoValido = destinoPorKey(r["destino"] as OnboardingDestinoKey)
    ? (r["destino"] as OnboardingDestinoKey)
    : null;
  return {
    stage: stageValida,
    destino: destinoValido,
    concluidoEm: typeof r["concluidoEm"] === "string" ? r["concluidoEm"] : null,
    atualizadoEm: typeof r["atualizadoEm"] === "string" ? r["atualizadoEm"] : base.atualizadoEm,
  };
}

export function ehConcluido(estado: OnboardingEstado): boolean {
  return estado.stage === "concluido";
}

/** Próximo estágio da sequência obrigatória; nunca retrocede (§38). */
export function proximoStage(atual: OnboardingStage): OnboardingStage | null {
  const i = ORDEM.indexOf(atual);
  if (i < 0) return null;
  return (ORDEM[i + 1] ?? null) as OnboardingStage | null;
}

/** Escolha de destino: marca e vai ao pré-jogo; idempotente. */
export function marcarDestino(
  estado: OnboardingEstado,
  destino: OnboardingDestinoKey,
  agora?: string,
): OnboardingEstado {
  if (ehConcluido(estado)) return estado;
  return normalizarEstadoOnboarding({
    ...estado,
    destino,
    stage: "primeiro-jogo",
    atualizadoEm: agora ?? new Date().toISOString(),
  });
}

/** Conclusão definitiva do tour (§7/§31). */
export function concluirOnboarding(
  estado: OnboardingEstado,
  agora?: string,
): OnboardingEstado {
  if (ehConcluido(estado)) return estado;
  return normalizarEstadoOnboarding({
    ...estado,
    stage: "concluido",
    concluidoEm: agora ?? new Date().toISOString(),
    atualizadoEm: agora ?? new Date().toISOString(),
  });
}

/** Avança um estágio deterministicamente (§7: máquina clara). */
export function avancarStage(estado: OnboardingEstado, agora?: string): OnboardingEstado {
  if (ehConcluido(estado)) return estado;
  const prox = proximoStage(estado.stage);
  if (!prox) return estado;
  return normalizarEstadoOnboarding({
    ...estado,
    stage: prox,
    atualizadoEm: agora ?? new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// IA ATIVA DO PRACINHA (§4) — respostas dependem do estado + texto.
// ---------------------------------------------------------------------------

export interface RespostaPracinha {
  texto: string;
}

const OFENSIVAS = [
  "tomar no cu",
  "vtnc",
  "se foder",
  "porra",
  "caralho",
  "cacete",
  "puta",
  "fdp",
  "corno",
  "buceta",
  "escrota",
  "escroto",
  "corno",
];

export function detectarOfensiva(texto: string): boolean {
  const t = ` ${texto.toLowerCase()} `;
  return OFENSIVAS.some((termo) => t.includes(termo));
}

function hashTexto(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

const RESPOSTAS_OFENSIVA = [
  "Ei. Sem palavrão por aqui 😅 Vamos rápido.",
  "Opa, com calma! Aqui a gente conversa de boa 😊",
  "Eita! Palavrão não ajuda 😅 Direto ao ponto!",
];

/** Fala inicial de cada estágio — texto do tour (§8, §9). */
const MENSAGENS_STAGE: Record<OnboardingStage, string> = {
  "nao-iniciado":
    "Opa, chegou visita! Sou o Pracinha, guia oficial da Cidadela. Tour rápido e você já entra no jogo. Bora?",
  identificacao:
    "Primeiro: quem está entrando? Cadastra rapidinho pra eu te reconectar em qualquer dispositivo. Direto, sem fila. 👇",
  introducao:
    "A Cidadela é um universo de jogos com um mundo vivo no seu celular. Eu respondo mensagens, dou dicas e guardo seu progresso real. 📱",
  ambientes:
    "São 3 áreas principais: Cidadela dos Clássicos (jogos), Campus Universitário (rotina da Cidadela) e Gerador de Texto (frases + correção). 👇",
  sov: "Aqui dentro existe o SOV — abreviação de Soberania. Quanto mais você joga, conquista e evolui, mais sua trajetória vale. 🪙",
  destino: "Por onde você quer começar? Escolhe e eu te acompanho até o fim do tour. 👇",
  "primeiro-jogo": "Pratique no seu destino. Volte quando quiser — agora você é de casa. 🎉",
  concluido: "Jogo liberado! Você já é cidadão da Cidadela. 🏆",
};

function pick<T>(arr: T[], semente: string): T {
  return arr[hashTexto(semente) % arr.length]!;
}

/** Correção determinística ao detectar palavrão (§4 exemplo). */
export function respostaOfensiva(texto: string): RespostaPracinha {
  return {
    texto: pick(RESPOSTAS_OFENSIVA, texto) + " Primeiro preciso saber quem está entrando na Cidadela.",
  };
}

/** Fala inicial do estágio (abertura contextual). */
export function mensagemDoStage(stage: OnboardingStage): RespostaPracinha {
  return { texto: MENSAGENS_STAGE[stage] };
}

/** Resposta principal da IA: usa o estado real + texto do usuário (§4). */
export function responderPracinha(
  estado: OnboardingEstado,
  texto: string,
): RespostaPracinha {
  if (detectarOfensiva(texto)) return respostaOfensiva(texto);
  const t = texto.toLowerCase();

  // Descrições de destino (USUÁRIO menciona destino diretamente).
  for (const d of DESTINOS) {
    if (t.includes(d.key) || t.includes(d.rotulo.toLowerCase())) {
      return { texto: d.fala };
    }
  }

  /** Keywords por estágio (resposta genuante ao tópico). */
  const porEstagio: Record<OnboardingStage, { g: string[]; resp: string }> = {
    "nao-iniciado": {
      g: ["cid", "cidadela", "pracinha"],
      resp: "A Cidadela é o meu universo. Bora conferir? 👇",
    },
    identificacao: {
      g: ["por qu", "pra qu", "import", "porqu", "login", "entrar", "conta", "cadast", "senha"],
      resp: "É aqui mesmo no celular 👇 Preenche email e senha no card — se for sua primeira vez, toca em criar conta. Salva sua trajetória inteira. 🙂",
    },
    introducao: { g: ["o que", "mundo", "cell", "jog"], resp: "Aqui dentro o celular recebe notícias do jogo, e o mundo reage às suas partidas e declarações. 📱" },
    ambientes: { g: ["quad", "área", "conteúd", "coisas"], resp: "São 3 áreas. Me diz por onde quer começar e eu te acompanho. 👇" },
    sov: { g: ["sov", "soberania", "moed", "dinhe"], resp: "SOV mora no seu banco. Vem de partidas, conquistas e decisões — fica no extrato do Banco. 🪙" },
    destino: { g: ["onde", "destino", "começo", "vou"], resp: "Escolhe entre Cidadela, Campus ou Gerador de Texto. Eu te acompanho. 👇" },
    "primeiro-jogo": { g: ["pronto", "concluido"], resp: "Pronto! Agora você mora na Cidadela. 🎉" },
    concluido: { g: ["pronto"], resp: "Pronto! Você já é cidadão. 🏆" },
  };

  const regra = porEstagio[estado.stage] as { g: string[]; resp: string } | undefined;
  if (regra && regra.g.some((g) => t.includes(g))) {
    return { texto: regra.resp };
  }

  // Fallback contextual, nunca deixa a conversa morta.
  const aberturaAtual = MENSAGENS_STAGE[estado.stage] ?? "Bora seguir? 👇";
  const fallbacks = [
    `Boa pergunta! ${aberturaAtual}`,
    `Anotado: "${texto.slice(0, 60)}" 🙂 ${aberturaAtual}`,
    "Certo! To na mesma página. Vamos em frente? 👇",
  ];
  return { texto: pick(fallbacks, texto) };
}
