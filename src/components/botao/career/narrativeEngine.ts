/**
 * Módulo de Histórias Dinâmicas — narrativas de suspense/drama que chegam ao
 * celular do treinador como mensagens pessoais (Direct/WhatsApp), nunca em
 * terceira pessoa. Cada evento é um grafo de ramificação (cena raiz -> escolhas
 * -> cena de desfecho com efeitos). A combinação de persona × cenário ×
 * complicação × reviravolta gera bem mais de 1.000 variações distintas.
 *
 * Categorias:
 *  - amoroso:   torcedora/influenciadora dando em cima (risco de escândalo)
 *  - bastidores: empresário/punter propondo acerto sujo
 *  - traicao:   estrela/comissão tramando derrubar o técnico ou vazar tática
 *  - midia:     polêmica em rede social, chantagem anônima por fotos
 *
 * O estado da história ativa é persistido em CareerState.narrativa para a
 * sequência continuar entre as partidas até o desfecho.
 */

export type CategoriaNarrativa = "amoroso" | "bastidores" | "traicao" | "midia";

export type NarrativaEfeitos = {
  sov?: number;
  moral?: number;
  bonusPoder?: number;
  /** Pressão da torcida (0-100): alto pune SOV em casa e amplifica crises. */
  pressaoTorcida?: number;
  /** Marca narrativa persistente (ex.: "escandalo_estourou", "gravou_audio"). */
  flag?: string;
};

export type NarrativaEscolha = {
  id: string;
  /** Texto do botão de resposta (chat). */
  texto: string;
  /** Subtítulo/dica sob o botão. */
  descricao: string;
  /** Próximo nó de cena (desfecho quando ausente). */
  proximoId?: string;
  /** Desfecho final se proximoId ausente. */
  desfecho?: NarrativaDesfecho;
  efeitos?: NarrativaEfeitos;
  /** Risca alta: consequência severa caso dê errado. */
  riscoAlto?: boolean;
};

export type NarrativaDesfecho =
  "escandalo" | "contido" | "lucro_imoral" | "integridade" | "queda_carrasco" | "vinganca_elenco";

export type NarrativaCena = {
  id: string;
  /** Texto da mensagem recebida (primeira pessoa do remetente). */
  mensagem: string;
  escolhas: NarrativaEscolha[];
  final?: boolean;
  desfecho?: NarrativaDesfecho;
};

export type NarrativaState = {
  /** Id da cena atual. null = sem história ativa. */
  cenaAtual: string | null;
  categoria: CategoriaNarrativa | null;
  /** Remetente derivado da variação gerada. */
  remetente: { nome: string; cargo: string; initials: string } | null;
  /** Índices das variações escolhidas — permitem reconstruir as cenas de forma
   * determinística ao recarregar (persistência JSONB). */
  ganchoIdx: number;
  reviravoltaIdx: number;
  flags: string[];
  desfecho: NarrativaDesfecho | null;
};

export const NARRATIVA_INICIAL: NarrativaState = {
  cenaAtual: null,
  categoria: null,
  remetente: null,
  ganchoIdx: 0,
  reviravoltaIdx: 0,
  flags: [],
  desfecho: null,
};

/** Bancos de variação — combinados produzem milhares de mensagens distintas. */
const PERSONAS_AMOROSO = [
  {
    nome: "Bianca",
    cargo: "Influenciadora digital",
    initials: "BI",
    perfis: ["@bianca.oficial", "1.2M seguidores"],
  },
  {
    nome: "Camila",
    cargo: "Torcedora organizada",
    initials: "CA",
    perfis: ["arquibancada norte", "faixa 'casamento com o clube'"],
  },
  {
    nome: "Rakel",
    cargo: "Modelo / embaixadora",
    initials: "RA",
    perfis: ["capa de revista", "embaixadora de marca"],
  },
  {
    nome: "Sofia",
    cargo: "Repórter esportiva",
    initials: "SO",
    perfis: ["cobertura exclusiva", "acesso ao vestiário"],
  },
  {
    nome: "Letícia",
    cargo: "Filha de dirigente",
    initials: "LE",
    perfis: ["acesso ao palco", "jantar de diretoria"],
  },
  {
    nome: "Marina",
    cargo: "Cantora pop",
    initials: "MA",
    perfis: ["show no estádio", "compact disc de ouro"],
  },
  {
    nome: "Pâmela",
    cargo: "Ex-namorada",
    initials: "PA",
    perfis: ["reapareceu do nada", "sabe segredos antigos"],
  },
  {
    nome: "Dandara",
    cargo: "Vereadora fã do clube",
    initials: "DA",
    perfis: ["tribuna da câmara", "projeto de lei sobre o estádio"],
  },
];

const PERSONAS_BASTIDORES = [
  {
    nome: "Sr. Honório",
    cargo: "Empresário de jogadores",
    initials: "HO",
    iscos: ["carteira abarrotada", "estrangeiro na manga"],
  },
  {
    nome: "Doutor Faria",
    cargo: "Apostador profissional",
    initials: "FA",
    iscos: ["casa de apostas offshore", "aplicativo cripto"],
  },
  {
    nome: "Nestor",
    cargo: "Diretor de futebol de clube rival",
    initials: "NE",
    iscos: ["proposta de emprego duplo", "cargo de olheiro secreto"],
  },
  {
    nome: "Velho Turi",
    cargo: "Conselheiro do clube",
    initials: "TU",
    iscos: ["caixa dois histórico", "reforma do CT pedida"],
  },
  {
    nome: "Kléber Mãos-Limpas",
    cargo: "Investidor misterioso",
    initials: "KL",
    iscos: ["fundo de investimento", "cripto anônima"],
  },
];

const PERSONAS_TRAICAO = [
  {
    nome: "Marcelo Vetter",
    cargo: "Estrela do elenco",
    initials: "MV",
    iscos: ["contrato em renovação", "conta no banco suíço"],
  },
  {
    nome: "Cauã Basílio",
    cargo: "Treinador adjunto",
    initials: "CB",
    iscos: ["almeja seu cargo", "reunião secreta na cantina"],
  },
  {
    nome: "Robson Tato",
    cargo: "Preparador de goleiros",
    initials: "RT",
    iscos: ["descontente com horas", "contato com rival"],
  },
  {
    nome: "Analista Fonseca",
    cargo: "Olheiro da comissão",
    initials: "FO",
    iscos: ["tabela tática no pendrive", "janta com jornalista"],
  },
  {
    nome: "Capitão Otto",
    cargo: "Zagueiro e líder do vestiário",
    initials: "OT",
    iscos: ["comanda 'conselho de jogadores'", "quer o comando das escalações"],
  },
];

const PERSONAS_MIDIA = [
  { nome: "Número desconhecido", cargo: "Chantagem anônima", initials: "??" },
  { nome: "Tadeu Bicalho", cargo: "Colunista marrom", initials: "TB" },
  { nome: "Foco Sensacionalista", cargo: "Portal de fofoca", initials: "FS" },
  { nome: "Mári@_blogueira", cargo: "Bastidores do clube", initials: "MB" },
];

const GANCHOS_AMOROSO = [
  "Vi você no banco na rodada passada e confesso: travou. Sou {perfil}. Me chama pra conversar? Sem compromisso…",
  "Treinador, aqui é {nome}. Sou {perfil}. A torcida inteira me cobra por um autografo seu, mas o que eu queria era um café a sós.",
  "Oi, {nome} aqui ({perfil}). Achei sua postura na coletiva incrível. Bora trocar ideia fora dos holofotes?",
  "Treinador, {nome} da {perfil}. Tenho passaporte pro jantar de diretoria amanhã e sobrou uma cadeira do seu lado. Vem?",
  "Sou {nome} ({perfil}). Falam que quem comanda o clube é você fora de campo também. Curiosa… pode?",
];

const GANCHOS_BASTIDORES = [
  "Treinador, aqui é {nome}, {cargo}. Tenho {isco}. Quer conversar sobre uma 'oportunidade'? Discreto, juro.",
  "Aqui é {nome}, {cargo}. O {isco} tá pronto. Preciso só de um ajuste seu no resultado de sábado. O que acha?",
  "Treinador, {nome} ({cargo}). {isco}. Posso transformar seu ano financeiramente. Só não vence por dois. Fechado?",
  "Sou {nome}, {cargo}. Tenho {isco} na manga. O craque ruim do seu elenco? Eu assino a transferência amanhã se me der sinal verde.",
  "Treinador, {nome} ({cargo}). {isco}. A diretoria nem precisa saber. Um sinal seu e eu cuido do resto. Topa?",
];

const GANCHOS_TRAICAO = [
  "Treinador, aqui é {nome} ({cargo}). Preciso te contar algo que ouvi no vestiário: {isco}. Melhor a gente conversar olho no olho.",
  "Treinador, {nome} ({cargo}). {isco}. Não quero ser delator, mas o comando tá escapando da sua mão. Pode?",
  "Treinador, {nome}. {cargo}. {isco}. Tem gente querendo seu lugar. Como a gente neutraliza isso?",
  "Treinador, {nome} ({cargo}). {isco}. Decidi te avisar lealmente. Como você prefere agir?",
  "Treinador, {nome} ({cargo}). {isco}. Eu fico do seu lado, mas preciso saber seu plano antes de me comprometer. Olha, confia?",
];

const GANCHOS_MIDIA = [
  "Treinador, aqui é {nome} ({cargo}). Recebi um material comprometedor seu. Antes de publicar, abro espaço pra sua versão. Quer?",
  "Treinador, {nome} ({cargo}). Rodou um vídeo seu nas redes. Preciso do seu comentário em 6h pra subir a matéria. Posso?",
  "Sou {nome} ({cargo}). Tenho fontes. Foto sua de madrugada. Vai falar agora ou deixo a torcida julgar?",
  "Treinador, {nome} ({cargo}). Vazou um áudio do vestiário. Antes que eu publique, conta a sua. Que hours?",
  "Treinador, {nome} ({cargo}). Um infiltrado me passou um dossiê. Posso segurar 24h — ou solto em pico de audiência. Decida.",
];

const REVINAVOLTAS = [
  "e o principal acionista do clube ligou perguntando de você",
  "e um repórter já está confirmado na coletiva de amanhã",
  "e o capitão do elenco ouviu tudo",
  "e um print disso já circula no grupo de diretoria",
  "e sua comissão técnica viu você conversando",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

type Persona = { nome: string; cargo: string; initials: string };

/**
 * Gera uma nova história (estado + cena raiz) sorteando persona + gancho +
 * reviravolta. Cada evento é um mini-arco de 2 cenas: cena raiz com escolhas e
 * cena de desfecho com efeitos. As variações (persona × gancho × reviravolta ×
 * escolha) garantem milhares de desdobramentos únicos.
 */
export function gerarNarrativa(state: NarrativaState): NarrativaState {
  const categoria: CategoriaNarrativa = pick<CategoriaNarrativa>([
    "amoroso",
    "bastidores",
    "traicao",
    "midia",
  ]);
  let persona: Persona;
  const ganchoIdx = Math.floor(Math.random() * 5);
  const reviravoltaIdx = Math.floor(Math.random() * REVINAVOLTAS.length);

  if (categoria === "amoroso") {
    persona = pick(PERSONAS_AMOROSO);
  } else if (categoria === "bastidores") {
    persona = pick(PERSONAS_BASTIDORES);
  } else if (categoria === "traicao") {
    persona = pick(PERSONAS_TRAICAO);
  } else {
    persona = pick(PERSONAS_MIDIA);
  }

  const estadoId = `narr-${categoria}-${Math.random().toString(36).slice(2, 7)}`;
  const raiz = construirArco(estadoId, categoria, persona, ganchoIdx, reviravoltaIdx);
  return {
    ...NARRATIVA_INICIAL,
    cenaAtual: `${estadoId}-raiz`,
    categoria,
    remetente: persona,
    ganchoIdx,
    reviravoltaIdx,
    flags: state.flags,
  };
}

/**
 * Monta o grafo de cenas de um arco (raiz + 1 cenário de desfecho por escolha).
 * As escolhas levam a cenas terminais distintas com efeitos próprios, criando
 * ramificação de consequências real. Determinístico por (estadoId, persona,
 * ganchoIdx, reviravoltaIdx) para suportar persistência.
 */
function construirArco(
  estadoId: string,
  categoria: CategoriaNarrativa,
  persona: Persona,
  ganchoIdx: number,
  reviravoltaIdx: number,
): Record<string, NarrativaCena> {
  const raizId = `${estadoId}-raiz`;
  const mensagem = mensagemRaiz(categoria, persona, ganchoIdx);
  const reviravolta = REVINAVOLTAS[reviravoltaIdx % REVINAVOLTAS.length]!;
  const cenárioPós = (msg: string) => `${msg}\n\n(... ${reviravolta}.)`;

  if (categoria === "amoroso") {
    return {
      [raizId]: {
        id: raizId,
        mensagem,
        escolhas: [
          {
            id: "aceitar",
            texto: "Topar o encontro",
            descricao: "Risco de escândalo. +4 moral (papo cabeça), mas pressão da torcida sobe.",
            proximoId: `${estadoId}-encontro`,
            efeitos: { moral: 4, pressaoTorcida: 18, flag: "encontro_marcado" },
            riscoAlto: true,
          },
          {
            id: "adiar",
            texto: "Adiar: 'depois da rodada'",
            descricao: "Ganha tempo, mas ela pode se antecipar e expor.",
            proximoId: `${estadoId}-adiamento`,
            efeitos: { flag: "adiou" },
          },
          {
            id: "recusar",
            texto: "Recusar com educação",
            descricao: "Postura íntegra. -1 moral, mas pressão cai.",
            proximoId: `${estadoId}-recusa`,
            efeitos: { moral: -1, pressaoTorcida: -6, flag: "recusou" },
          },
        ],
      },
      [`${estadoId}-encontro`]: {
        id: `${estadoId}-encontro`,
        mensagem: cenárioPós(
          `O encontro foi ótimo... até os flashes. ${persona.nome} postou indireta e o colunista Tadeu Bicalho já ligou pra diretoria.`,
        ),
        final: true,
        desfecho: "escandalo",
        escolhas: [],
      },
      [`${estadoId}-adiamento`]: {
        id: `${estadoId}-adiamento`,
        mensagem: cenárioPós(
          `Você adiou. ${persona.nome} não gostou. 'Tudo bem, treinador. Vou usar meus próprios canais.'`,
        ),
        final: true,
        desfecho: "escandalo",
        escolhas: [],
      },
      [`${estadoId}-recusa`]: {
        id: `${estadoId}-recusa`,
        mensagem: cenárioPós(
          `Você recusou com classe. ${persona.nome} respeitou. O vestiário percebe o profissionalismo — moral em alta.`,
        ),
        final: true,
        desfecho: "integridade",
        escolhas: [],
      },
    };
  }

  if (categoria === "bastidores") {
    return {
      [raizId]: {
        id: raizId,
        mensagem,
        escolhas: [
          {
            id: "denunciar",
            texto: "Ir à diretoria e denunciar",
            descricao: "Símbolo da integridade. +soberania, mas o alvo pode se vingar.",
            proximoId: `${estadoId}-denuncia`,
            efeitos: { sov: 8, moral: 4, pressaoTorcida: -4, flag: "denunciou" },
          },
          {
            id: "gravar",
            texto: "Fingir ceder e gravar tudo",
            descricao: "Arriscado. Pode virar herói da limpa — ou cair em armadilha.",
            proximoId: `${estadoId}-gravacao`,
            efeitos: { flag: "gravando" },
            riscoAlto: true,
          },
          {
            id: "aceitar",
            texto: "Aceitar a propina",
            descricao: "Lucro imediato. SOV despenca, moral afunda.",
            proximoId: `${estadoId}-propina`,
            efeitos: { sov: -10, moral: -8, bonusPoder: 2, flag: "aceitou_dinheiro" },
            riscoAlto: true,
          },
        ],
      },
      [`${estadoId}-denuncia`]: {
        id: `${estadoId}-denuncia`,
        mensagem: cenárioPós(
          `${persona.nome} foi afastado. A imprensa te chama de 'treinador de principles'. Mas a sombra dele não sumiu.`,
        ),
        final: true,
        desfecho: "integridade",
        escolhas: [],
      },
      [`${estadoId}-gravacao`]: {
        id: `${estadoId}-gravacao`,
        mensagem: cenárioPós(
          `Você gravou e levou à confederação. O esquema caiu. Virou símbolo da limpa — agora cada estranho pode ser um novo emissário.`,
        ),
        final: true,
        desfecho: "integridade",
        escolhas: [],
      },
      [`${estadoId}-propina`]: {
        id: `${estadoId}-propina`,
        mensagem: cenárioPós(
          `O dinheiro entrou. Na partida, o adversário parece saber onde você joga. E ${persona.nome} agora tem prova contra você.`,
        ),
        final: true,
        desfecho: "lucro_imoral",
        escolhas: [],
      },
    };
  }

  if (categoria === "traicao") {
    return {
      [raizId]: {
        id: raizId,
        mensagem,
        escolhas: [
          {
            id: "confrontar",
            texto: "Chamar o suspeito e confrontar em particular",
            descricao: "Pune a traição na lata. Moral pode dividir o vestiário.",
            proximoId: `${estadoId}-confronto`,
            efeitos: { moral: -3, pressaoTorcida: 4, flag: "confrontou" },
          },
          {
            id: "reuniao",
            texto: "Convocar reunião fechada de comissão",
            descricao: "Refça lealdade. +moral, descobre quem vazou se confirmar.",
            proximoId: `${estadoId}-reuniao`,
            efeitos: { moral: 5, flag: "reuniu_comissao" },
          },
          {
            id: "isolar",
            texto: "Isolar o suspeito das escalações",
            descricao: "Retaliação silenciosa. -2 poder, mas manda mensagem.",
            proximoId: `${estadoId}-isolamento`,
            efeitos: { bonusPoder: -2, moral: -2, flag: "isolou" },
          },
        ],
      },
      [`${estadoId}-confronto`]: {
        id: `${estadoId}-confronto`,
        mensagem: cenárioPós(
          `O confronto foi duro. ${persona.nome} negou na frente do elenco, mas a fenda ficou aberta. O vestiário rachou em dois.`,
        ),
        final: true,
        desfecho: "vinganca_elenco",
        escolhas: [],
      },
      [`${estadoId}-reuniao`]: {
        id: `${estadoId}-reuniao`,
        mensagem: cenárioPós(
          `A reunião fechou o vestiário. ${persona.nome} baixou a cabeça. O vazamento secou. Elenco unido de novo.`,
        ),
        final: true,
        desfecho: "contido",
        escolhas: [],
      },
      [`${estadoId}-isolamento`]: {
        id: `${estadoId}-isolamento`,
        mensagem: cenárioPós(
          `Você isolou ${persona.nome}. O elenco percebeu a retaliação. Respeito por medo — e um ressentimento que vai crescer.`,
        ),
        final: true,
        desfecho: "vinganca_elenco",
        escolhas: [],
      },
    };
  }

  // midia
  return {
    [raizId]: {
      id: raizId,
      mensagem,
      escolhas: [
        {
          id: "versao",
          texto: "Dar sua versão oficial",
          descricao: "Transparência controla a narrativa. +pressão controlada.",
          proximoId: `${estadoId}-versao`,
          efeitos: { pressaoTorcida: -3, moral: 2, flag: "deu_versao" },
        },
        {
          id: "calar",
          texto: "Manter silêncio oficial",
          descricao: "Sem comentários. A imprensa pode enforcar o silêncio.",
          proximoId: `${estadoId}-silencio`,
          efeitos: { flag: "silenciou" },
          riscoAlto: true,
        },
        {
          id: "comprar",
          texto: "Negociar exclusiva (com vantagem)",
          descricao: "Dá a matéria a um veículo aliado. Cínico, mas eficaz.",
          proximoId: `${estadoId}-exclusiva`,
          efeitos: { sov: -3, pressaoTorcida: -8, flag: "comprou_voz" },
        },
      ],
    },
    [`${estadoId}-versao`]: {
      id: `${estadoId}-versao`,
      mensagem: cenárioPós(
        `Sua versão saiu first. O material de ${persona.nome} perdeu força. A torcida elogia a postura transparente.`,
      ),
      final: true,
      desfecho: "contido",
      escolhas: [],
    },
    [`${estadoId}-silencio`]: {
      id: `${estadoId}-silencio`,
      mensagem: cenárioPós(
        `O silêncio virou manchete. ${persona.nome} publicou o material. A diretoria quer conversar 'urgentemente'.`,
      ),
      final: true,
      desfecho: "escandalo",
      escolhas: [],
    },
    [`${estadoId}-exclusiva`]: {
      id: `${estadoId}-exclusiva`,
      mensagem: cenárioPós(
        `Você plantou a versão aliada. ${persona.nome} ficou isolada. Sujo, mas o caso morreu antes de estourar.`,
      ),
      final: true,
      desfecho: "contido",
      escolhas: [],
    },
  };
}

/** Cenas ativas da história corrente — reconstruídas de forma determinística
 * a partir dos metadados persistidos (categoria, remetente, índices). */
export function cenaDaNarrativa(state: NarrativaState): NarrativaCena | null {
  if (!state.cenaAtual || !state.categoria || !state.remetente) return null;
  const base = state.cenaAtual.replace(
    /-(raiz|denuncia|gravacao|propina|encontro|adiamento|recusa|confronto|reuniao|isolamento|versao|silencio|exclusiva)$/,
    "",
  );
  const arco = construirArco(
    base,
    state.categoria,
    state.remetente,
    state.ganchoIdx,
    state.reviravoltaIdx,
  );
  return arco[state.cenaAtual] ?? null;
}

function mensagemRaiz(categoria: CategoriaNarrativa, persona: Persona, idx: number): string {
  if (categoria === "amoroso") {
    const template = GANCHOS_AMOROSO[idx % GANCHOS_AMOROSO.length];
    return fillTemplate(template ?? "Erro ao carregar mensagem.", persona);
  }
  if (categoria === "bastidores") {
    const template = GANCHOS_BASTIDORES[idx % GANCHOS_BASTIDORES.length];
    return fillTemplate(template ?? "Erro ao carregar mensagem.", persona);
  }
  if (categoria === "traicao") {
    const p = PERSONAS_TRAICAO.find((x) => x.nome === persona.nome) ?? PERSONAS_TRAICAO[0]!;
    const template = GANCHOS_TRAICAO[idx % GANCHOS_TRAICAO.length];
    return fillTemplate(template ?? "Erro ao carregar mensagem.", {
      nome: p.nome,
      cargo: p.cargo,
      isco: p.iscos[idx % p.iscos.length]!,
    });
  }
  if (categoria === "midia") {
    const template = GANCHOS_MIDIA[idx % GANCHOS_MIDIA.length];
    return fillTemplate(template ?? "Erro ao carregar mensagem.", {
      nome: persona.nome,
      cargo: persona.cargo,
      perfis: "fontes",
    });
  }
  return "Erro: categoria desconhecida.";
}

export function avancarNarrativa(
  state: NarrativaState,
  escolha: NarrativaEscolha,
): { state: NarrativaState; efeitos: NarrativaEfeitos; finalizado: boolean } {
  const flags = escolha.efeitos?.flag
    ? [...new Set([...state.flags, escolha.efeitos.flag])]
    : state.flags;
  const nodeFinalizado = !!escolha.desfecho || !escolha.proximoId;
  const novoState: NarrativaState = {
    ...state,
    flags,
    cenaAtual: escolha.proximoId ?? null,
    desfecho: escolha.desfecho ?? (nodeFinalizado ? state.desfecho : null),
  };
  return {
    state: novoState,
    efeitos: escolha.efeitos ?? {},
    finalizado: nodeFinalizado,
  };
}

export function tituloDesfecho(d: NarrativaDesfecho): string {
  switch (d) {
    case "escandalo":
      return "Escândalo Estourado";
    case "contido":
      return "Crise Contida";
    case "lucro_imoral":
      return "Lucro Imoral";
    case "integridade":
      return "Íntegro até o Fim";
    case "queda_carrasco":
      return "Queda do Carrasco";
    case "vinganca_elenco":
      return "Vingança do Elenco";
  }
}

/**
 * Decide se um novo evento narrativo deve ser distribuído antes da próxima
 * partida. Alvo: 2 a 4 eventos por "mês" (a cada ~4 rodadas). Usa um contador
 * de rodadas desde o último evento para espalhar de forma orgânica.
 */
export function deveGerarNarrativa(rodadasDesdeUltimo: number, rodadaAtual: number): boolean {
  // Primeiro evento cai cedo (rodada 2-3); depois a cada 3-6 rodadas.
  if (rodadaAtual <= 1) return false;
  if (rodadasDesdeUltimo >= 6) return true;
  if (rodadasDesdeUltimo >= 3 && Math.random() < 0.5) return true;
  return false;
}
