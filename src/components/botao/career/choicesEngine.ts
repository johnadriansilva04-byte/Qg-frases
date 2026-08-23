import type { ChoiceEvent } from "./types";

// Lista de eventos possíveis entre partidas. Escolha modifica bonusProximaPartida,
// moralTime, penaltiesProximaPartida e/ou soberania.

export const CHOICE_EVENTS: ChoiceEvent[] = [
  {
    id: "craque-dor",
    titulo: "Craque com desconforto muscular",
    descricao:
      "Treinador, aqui é o Dr. Maurício. O craque sentiu um incômodo muscular depois do treino de hoje. " +
      "Não é lesão confirmada, mas não quero assumir o risco sozinho. Como quer encaminhar isso pra próxima partida?",
    escolhas: [
      {
        id: "arriscar",
        texto: "Escala mesmo assim (arriscar)",
        descricao: "+2 força ofensiva na próxima partida, mas moral cai se não vencer.",
        bonusPoder: 2,
        penaltyPontos: 1,
        riscoAlto: true,
      },
      {
        id: "poupar",
        texto: "Poupar o craque",
        descricao: "-1 força ofensiva, +5 de moral do elenco.",
        bonusPoder: -1,
        bonusMoral: 5,
      },
      {
        id: "banco",
        texto: "Colocar no banco (reserva)",
        descricao: "Sem alteração de força, pode entrar se necessário.",
      },
    ],
  },
  {
    id: "coletiva",
    titulo: "Coletiva de imprensa",
    descricao:
      "Treinador, é o Carlos, da assessoria. Os jornalistas já estão na sala de imprensa perguntando " +
      "como a gente encara o próximo adversário. Qual o recado que eu repasso pra eles?",
    escolhas: [
      {
        id: "goleada",
        texto: "'Vamos ganhar de goleada'",
        descricao: "Se vencer por 2+ gols: +5 soberania. Se perder: -3 soberania (imprensa não perdoa).",
        riscoAlto: true,
        bonusPoder: 1,
      },
      {
        id: "respeito",
        texto: "'Respeito o adversário, mas jogaremos pra vencer'",
        descricao: "Postura equilibrada. Se vencer: +2 soberania de bônus.",
        bonusMoral: 2,
      },
      {
        id: "silencio",
        texto: "Recusar a entrevista",
        descricao: "-3 de moral. Torcida acha que você fugiu.",
        bonusMoral: -3,
      },
    ],
  },
  {
    id: "escalar-jovem",
    titulo: "A joia da base pede oportunidade",
    descricao:
      "Treinador, aqui é o Sebastião, da base. Tem um moleque que tá treinando demais, " +
      "o menino tá pedindo uma chance. O clube tá cobrando uma oportunidade. O que eu falo pra ele?",
    escolhas: [
      {
        id: "titular",
        texto: "Escalar como titular",
        descricao: "-1 força, mas +8 moral se vencer.",
        bonusPoder: -1,
        bonusMoral: 4,
        riscoAlto: true,
      },
      {
        id: "banco",
        texto: "Deixar no banco",
        descricao: "Sem efeito imediato. Elenco cobra.",
        bonusMoral: -1,
      },
      {
        id: "ignorar",
        texto: "Ignorar o pedido",
        descricao: "-4 de moral. Diretoria vai comentar.",
        bonusMoral: -4,
      },
    ],
  },
  {
    id: "torcida",
    titulo: "Bandeira da torcida organizada",
    descricao:
      "Treinador, sou o Beto, da torcida organizada. A gente quer estender uma faixa gigante no estádio, " +
      "mas os dirigentes tão implicando com a gente. Conta com o seu apoio aí?",
    escolhas: [
      {
        id: "apoiar",
        texto: "Apoiar publicamente a torcida",
        descricao: "+5 de moral. Dirigentes ficam irritados.",
        bonusMoral: 5,
      },
      {
        id: "neutro",
        texto: "Manter neutralidade",
        descricao: "Sem grandes efeitos.",
      },
      {
        id: "negar",
        texto: "Negar o pedido da torcida",
        descricao: "-3 de moral, mas diretoria aprova.",
        bonusMoral: -3,
      },
    ],
  },
  {
    id: "treino-intensivo",
    titulo: "Preparação intensiva",
    descricao:
      "Treinador, é o Professor Léo, preparador físico. Posso aplicar um treino puxado antes da rodada. " +
      "Rende bem, mas o pessoal vai chegar cansado. Como prefere?",
    escolhas: [
      {
        id: "puxar",
        texto: "Treino puxadíssimo",
        descricao: "+2 força, -3 de moral.",
        bonusPoder: 2,
        bonusMoral: -3,
      },
      {
        id: "leve",
        texto: "Treino leve e regenerativo",
        descricao: "+3 de moral. Sem alteração de força.",
        bonusMoral: 3,
      },
      {
        id: "normal",
        texto: "Treino padrão",
        descricao: "Sem alterações significativas.",
      },
    ],
  },
  {
    id: "presidente-ultimato",
    titulo: "Ultimato da diretoria",
    descricao:
      "Treinador, aqui é o Presidente. As contas do clube não fecham e a torcida tá impaciente. " +
      "Vou ser direto: se essa rodada não vier vitória, não respondo pela sua continuidade no cargo. " +
      "Como o senhor quer encarar esse jogo?",
    escolhas: [
      {
        id: "prometer-goleada",
        texto: "Prometer goleada ao presidente",
        descricao: "+1 força, mas se perder: -8 soberania e -3 pontos na tabela (punição).",
        bonusPoder: 1,
        perdaPontos: 3,
        penaltyPontos: 8,
        riscoAlto: true,
      },
      {
        id: "pedir-tempo",
        texto: "Pedir tempo pra reestruturar",
        descricao: "-2 soberania imediato (impressão de fraqueza), mas sem punição de tabela.",
        impactoFinanceiro: -2,
      },
      {
        id: "focar-jogo",
        texto: "Focar apenas no jogo (sem promessas)",
        descricao: "Sem alterações. Deixa o resultado falar.",
      },
    ],
  },
  {
    id: "empresario-proposta",
    titulo: "Proposta de empresário",
    descricao:
      "Treinador, aqui é o Wagner, empresário. Tenho uma proposta boa pra um dos seus botões, " +
      "vende agora e a gente forra o caixa. Só que o elenco já tá curto. Decide rápido.",
    escolhas: [
      {
        id: "vender-botao",
        texto: "Vender o botão (fechar caixa)",
        descricao: "+15 soberania imediato, mas joga a próxima partida com 1 botão a menos (desfalque).",
        impactoFinanceiro: 15,
        desfalqueBotao: 1,
      },
      {
        id: "reter-botao",
        texto: "Reter o botão (não vender)",
        descricao: "Sem efeito financeiro. Elenco mantém força total.",
      },
      {
        id: "negociar",
        texto: "Negociar melhor oferta",
        descricao: "+5 soberania se conseguir, mas arrisca perder o negócio.",
        impactoFinanceiro: 5,
        riscoAlto: true,
      },
    ],
  },
  {
    id: "namorada-cobranca",
    titulo: "Mensagem da Valéria",
    descricao:
      "Amor, aqui é a Valéria. Você de novo enrolado no estádio? Tá ficando difícil lidar com " +
      "essas semanas sem te ver. Promete que hoje sai cedo e a gente conversa?",
    escolhas: [
      {
        id: "priorizar-familia",
        texto: "Prometer sair cedo (priorizar ela)",
        descricao: "+5 moral, mas -1 força (cabeça longe do jogo).",
        bonusPoder: -1,
        bonusMoral: 5,
      },
      {
        id: "focar-time",
        texto: "Dizer que o time vem primeiro hoje",
        descricao: "-4 moral (relação abalada), sem efeito na força.",
        bonusMoral: -4,
      },
      {
        id: "compromisso",
        texto: "Prometer compensar depois do jogo",
        descricao: "+2 moral, sem efeito na força.",
        bonusMoral: 2,
      },
    ],
  },
  {
    id: "subornador-abordagem",
    titulo: "Abordagem suspeita",
    descricao:
      "Treinador, desculpa te incomodar. Sou eu, o 'intermediário'. Olha, tem uma graninha " +
      "extra pra você se o jogo de hoje... digamos... não sair do jeito que a torcida espera. " +
      "Ninguém precisa saber. Topa?",
    escolhas: [
      {
        id: "aceitar-suborno",
        texto: "Aceitar o envelope",
        descricao: "+25 soberania imediato, mas joga a próxima partida DESFALCADO e perde 5 pontos na tabela. Risco de W.O. se lesar de novo.",
        impactoFinanceiro: 25,
        desfalqueBotao: 1,
        perdaPontos: 5,
        riscoAlto: true,
      },
      {
        id: "recusar-suborno",
        texto: "Recusar e ameaçar denunciar",
        descricao: "+6 soberania (imagem limpa) e a diretoria confia mais em você.",
        impactoFinanceiro: 6,
        bonusMoral: 2,
      },
      {
        id: "jogar-duplo",
        texto: "Fingir que topa e recolher provas",
        descricao: "Sem dinheiro, mas +4 soberania ao denunciar depois. Arriscado.",
        impactoFinanceiro: 4,
        riscoAlto: true,
      },
    ],
  },
];

export function sortearEvento(idsUsadosRecentes: string[]): ChoiceEvent {
  const disponiveis = CHOICE_EVENTS.filter((e) => !idsUsadosRecentes.slice(-3).includes(e.id));
  const pool = disponiveis.length > 0 ? disponiveis : CHOICE_EVENTS;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

/** Remetente em primeira pessoa de cada decisão (identidade estável do
 *  contato no celular: a decisão vira mensagem na conversa DESTE remetente). */
export const REMETENTE_DECISAO: Record<string, { nome: string; cargo: string; avatar: string }> = {
  "craque-dor": { nome: "Dr. Maurício", cargo: "Departamento Médico", avatar: "🩺" },
  coletiva: { nome: "Carlos", cargo: "Assessoria de Imprensa", avatar: "🎙️" },
  "escalar-jovem": { nome: "Sebastião", cargo: "Coordenador da Base", avatar: "🧢" },
  torcida: { nome: "Beto", cargo: "Líder da Torcida", avatar: "📣" },
  "treino-intensivo": { nome: "Professor Léo", cargo: "Preparador Físico", avatar: "🏃" },
  "presidente-ultimato": { nome: "Presidente", cargo: "Dono do Clube", avatar: "🎩" },
  "empresario-proposta": { nome: "Wagner", cargo: "Empresário", avatar: "💼" },
  "namorada-cobranca": { nome: "Valéria", cargo: "Namorada", avatar: "💛" },
  "subornador-abordagem": { nome: "Intermediário", cargo: "Subornador", avatar: "🕶️" },
};

export function remetenteDecisao(eventoId: string): { nome: string; cargo: string; avatar: string } {
  return REMETENTE_DECISAO[eventoId] ?? { nome: "Diretoria", cargo: "Clube", avatar: "🏟️" };
}
