/**
 * Engine do enredo de suborno — narrativa ramificada com múltiplos desfechos.
 *
 * Atravessador misterioso oferece propina ao treinador durante o torneio. As
 * decisões formam um caminho num grafo de cenas (BriberyNode) até um de vários
 * finais (denúncia, queda, impunidade, redenção...). O estado é persistido no
 * CareerState.suborno para a história continuar entre as partidas.
 */

export type SubornoDesfecho =
  "denuncia" | "aceitou" | "jogar_duplo" | "recusou_limpo" | "caiu_em_armadilha";

export type SubornoEscolha = {
  id: string;
  texto: string;
  descricao: string;
  /** Próximo nó da narrativa (ou final, se ausente). */
  proximoId?: string;
  /** Desfecho final quando proximoId não existe. */
  desfecho?: SubornoDesfecho;
  efeitos?: SubornoEfeitos;
};

export type SubornoEfeitos = {
  /** Variação de SOV aplicada imediatamente. */
  sov?: number;
  /** Variação de moral do elenco (0-100). */
  moral?: number;
  /** Bônus/penalidade de poder para a próxima partida. */
  bonusPoder?: number;
  /** Marca uma flag narrativa (ex.: "viu_envelope", "aceitou_dinheiro"). */
  flag?: string;
};

export type SubornoNode = {
  id: string;
  cena: string;
  escolhas: SubornoEscolha[];
  /** true = cena de final (mostra o desfecho). */
  final?: boolean;
  /** Desfecho final, quando a cena é um nó terminal. */
  desfecho?: SubornoDesfecho;
};

export type SubornoState = {
  /** Id do nó atual da narrativa. null = história não iniciada. */
  nodeAtual: string | null;
  /** Número da "oferta" (1ª, 2ª aproximação...) para escalar tensão. */
  oferta: number;
  /** Flags narrativas acumuladas. */
  flags: string[];
  /** Desfecho final, se já resolvido. */
  desfecho: SubornoDesfecho | null;
};

export const SUBORNO_INICIAL: SubornoState = {
  nodeAtual: null,
  oferta: 0,
  flags: [],
  desfecho: null,
};

export const SUBORNO_NODES: Record<string, SubornoNode> = {
  // ===================== 1ª abordagem =====================
  aprox1: {
    id: "aprox1",
    cena:
      "Após mais uma vitória, um homem de terno escuro te espera no estacionamento. " +
      "Ele não se apresenta — apenas sorri.\n\n" +
      "— Treinador, seus botões estão indo longe. Talvez longe demais pra alguns interesses. " +
      "Aceitaria um 'incentivo' pra jogar com calma na próxima fase?",
    escolhas: [
      {
        id: "recusar_direto",
        texto: "Recusar na lata",
        descricao: "Manda-o embora. Afastamento limpo, mas ele pode voltar.",
        proximoId: "recusou1",
        efeitos: { moral: 3, flag: "recusou_primeira" },
      },
      {
        id: "ouvir_mais",
        texto: "Ouvir sem comprometer",
        descricao: "Curiosidade custa caro? Você deixa ele falar.",
        proximoId: "detalhes1",
        efeitos: { flag: "ouvindo" },
      },
      {
        id: "pedir_prova",
        texto: "Pedir pra ver o dinheiro",
        descricao: "Mostra confiança suspeita. Sua comissão técnica nota.",
        proximoId: "envelope1",
        efeitos: { moral: -2, flag: "viu_envelope" },
      },
    ],
  },

  detalhes1: {
    id: "detalhes1",
    cena:
      "Ele apanha um envelope grosso e o apoia no capô do carro.\n\n" +
      "— São só dois resultados pra ajustar. Ninguém se machuca. O dinheiro " +
      "cobre reformas, contratos... o que você quiser. Pensa com a cabeça.",
    escolhas: [
      {
        id: "recusar_agora",
        texto: "Empurrar o envelope de volta",
        descricao: "Recusa definitiva desta oferta.",
        proximoId: "recusou1",
        efeitos: { moral: 4, flag: "recusou_primeira" },
      },
      {
        id: "aceitar_aprovacao",
        texto: "Aceitar, mas 'só pra pensar'",
        descricao: "Você embolsa. Agora você está comprometido.",
        proximoId: "aceitou1",
        efeitos: { sov: -5, moral: -5, bonusPoder: 2, flag: "aceitou_dinheiro" },
      },
      {
        id: "gravar_conversa",
        texto: "Gravar a conversa no celular",
        descricao: "Você finge ceder e liga o gravador. Arriscado.",
        proximoId: "jogar_duplo1",
        efeitos: { flag: "gravando" },
      },
    ],
  },

  envelope1: {
    id: "envelope1",
    cena:
      "Ele abre o envelope diante de você. Dinheiro grosso, em notas velhas.\n\n" +
      "— Tá tudo aí. Só não vence por mais de dois. Simples assim.\n\n" +
      "Sua comissão técnica cochicha no corredor. Alguém viu vocês conversando.",
    escolhas: [
      {
        id: "negar_e_denunciar",
        texto: "Negar tudo e ir à diretoria",
        descricao: "Denúncia formal. Ele some, mas a diretoria desconfia de você.",
        proximoId: "denuncia1",
        efeitos: { sov: -3, flag: "denunciou" },
      },
      {
        id: "embolsar",
        texto: "Embolsar o dinheiro",
        descricao: "Você cede. -8 SOV, +2 poder (recursos pra contratos).",
        proximoId: "aceitou1",
        efeitos: { sov: -8, moral: -6, bonusPoder: 2, flag: "aceitou_dinheiro" },
      },
    ],
  },

  // ===================== Desfechos da 1ª rodada =====================
  recusou1: {
    id: "recusou1",
    cena:
      "Você mandou o homem embora. Ele dá de ombros antes de partir:\n\n" +
      "— Tudo bem, treinador. A gente se fala mais tarde.\n\n" +
      "O elenco sente orgulho da postura firme. Mas a sombra dele não sumiu.",
    final: true,
    desfecho: "recusou_limpo",
    escolhas: [],
  },

  denuncia1: {
    id: "denuncia1",
    cena:
      "Você levou o caso à diretoria e à confederação. O homem some no mesmo dia. " +
      "A imprensa elogia sua integridade, mas rumores de que 'algo aconteceu' " +
      "mancham levemente o nome do clube.",
    final: true,
    desfecho: "denuncia",
    escolhas: [],
  },

  aceitou1: {
    id: "aceitou1",
    cena:
      "Você guardou o dinheiro. Na partida seguinte, o adversário parece " +
      "saber onde você vai jogar antes de você. E ele, estranhamente, vacila " +
      "no momento certo. O 'acerto' cumpre o prometido — mas o preço virá.",
    final: true,
    desfecho: "aceitou",
    escolhas: [],
  },

  jogar_duplo1: {
    id: "jogar_duplo1",
    cena:
      "Você fingiu concordar e gravou tudo. Na hora da partida, jogou pra vencer de verdade " +
      "e levou o áudio à confederação. O esquema caiu. Virou herói da integridade — " +
      "mas agora tem gente poderosa te vigiando.",
    final: true,
    desfecho: "jogar_duplo",
    escolhas: [],
  },

  // ===================== 2ª abordagem (escala tensão) =====================
  aprox2: {
    id: "aprox2",
    cena:
      "Novamente o terno escuro. Desta vez não sorri.\n\n" +
      "— Treinador, da última vez a gente ficou em impasse. Agora os valores " +
      "dobraram. E o prazo é a final. Recusar agora... tem consequência.",
    escolhas: [
      {
        id: "manter_firme",
        texto: "Manter o recuso e ameaçar expor",
        descricao: "Postura inabalável. Pode haver retaliação.",
        proximoId: "ameaca2",
        efeitos: { flag: "firme_final" },
      },
      {
        id: "ceder_final",
        texto: "Ceder na final",
        descricao: "Aceita a propina decisiva. Dinheiro grande, queda certa.",
        proximoId: "caiu2",
        efeitos: { sov: -15, moral: -10, bonusPoder: 3, flag: "aceitou_final" },
      },
      {
        id: "armadilhar",
        texto: "Armar uma emboscada pra prender no flagrante",
        descricao: "Risco altíssimo: se errar, o esquema vira contra você.",
        proximoId: "flagrante2",
        efeitos: { flag: "armou_flagrante" },
      },
    ],
  },

  ameaca2: {
    id: "ameaca2",
    cena:
      "Você diz que vai a público. Ele ri baixo:\n\n" +
      "— Treinador, eu tenho fotos de você com o envelope da outra vez. " +
      "A imprensa adora um herói caído.\n\n" +
      "Se você NÃO embolsou antes, é blefe. Se embolsou, é aperto real.",
    final: true,
    desfecho: "recusou_limpo",
    escolhas: [],
  },

  caiu2: {
    id: "caiu2",
    cena:
      "O dinheiro entrou. A final sai torta. Os botões parecem obedecer a outro comando. " +
      "Você vence o torneio, mas uma carta anônima chega à confederação no dia seguinte. " +
      "Agora começa a queda.",
    final: true,
    desfecho: "caiu_em_armadilha",
    escolhas: [],
  },

  flagrante2: {
    id: "flagrante2",
    cena:
      "A polícia entra no momento da entrega. O esquema é desbaratado. " +
      "Você vira símbolo da limpa no futebol de botão. Soberania dispara — " +
      "mas a insegurança segue: cada novo estranho pode ser um novo emissário.",
    final: true,
    desfecho: "denuncia",
    escolhas: [],
  },
};

/**
 * Decide se uma nova abordagem de suborno deve ocorrer antes da partida.
 * Acontece: na semifinal/final (oferta 2) e uma vez na fase de grupos (oferta 1),
 * desde que não haja desfecho já resolvido.
 */
export function deveOfertarSuborno(state: SubornoState, faseAtual: string): boolean {
  if (state.desfecho) return false; // história já resolvida
  const fase = faseAtual.toLowerCase();
  const naFinal = fase.includes("final");
  const naSemi = fase.includes("semifinal") || fase.includes("semi");
  const emGrupos = fase.includes("grupo") || fase.includes("rodada");

  if (state.oferta === 0 && emGrupos) return true;
  if (state.oferta === 1 && (naSemi || naFinal)) return true;
  return false;
}

export function iniciarOferta(state: SubornoState): SubornoState {
  const oferta = state.oferta + 1;
  const nodeAtual = oferta === 1 ? "aprox1" : "aprox2";
  return { ...state, oferta, nodeAtual };
}

export function avancarSuborno(
  state: SubornoState,
  escolha: SubornoEscolha,
): { state: SubornoState; efeitos: SubornoEfeitos; finalizado: boolean } {
  const flags = escolha.efeitos?.flag
    ? [...new Set([...state.flags, escolha.efeitos.flag])]
    : state.flags;
  const nodeFinalizado = !!escolha.desfecho || !escolha.proximoId;
  const novoState: SubornoState = {
    ...state,
    flags,
    nodeAtual: escolha.proximoId ?? null,
    desfecho: escolha.desfecho ?? (nodeFinalizado ? state.desfecho : null),
  };
  return {
    state: novoState,
    efeitos: escolha.efeitos ?? {},
    finalizado: nodeFinalizado,
  };
}

export function tituloDesfecho(d: SubornoDesfecho): string {
  switch (d) {
    case "denuncia":
      return "O Denunciante";
    case "aceitou":
      return "O Comprometido";
    case "jogar_duplo":
      return "O Duplo";
    case "recusou_limpo":
      return "O Íntegro";
    case "caiu_em_armadilha":
      return "O Queda";
  }
}
