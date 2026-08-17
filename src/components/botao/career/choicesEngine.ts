import type { ChoiceEvent } from "./types";

// Lista de eventos possíveis entre partidas. Escolha modifica bonusProximaPartida,
// moralTime, penaltiesProximaPartida e/ou soberania.

export const CHOICE_EVENTS: ChoiceEvent[] = [
  {
    id: "craque-dor",
    titulo: "Craque com desconforto muscular",
    descricao:
      "Seu principal jogador reclamou de dor após o treino. O departamento médico deixou a decisão nas suas mãos.",
    escolhas: [
      {
        id: "arriscar",
        texto: "Escalar mesmo assim (arriscar)",
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
    ],
  },
  {
    id: "coletiva",
    titulo: "Coletiva de imprensa",
    descricao: "Os jornalistas querem saber como você encara o próximo adversário.",
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
    descricao: "Um moleque da base vem treinando muito. O clube pressiona por uma chance.",
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
    descricao: "A torcida organizada quer estender uma faixa gigante no estádio, mas está desalinhada com os dirigentes.",
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
    ],
  },
  {
    id: "treino-intensivo",
    titulo: "Preparação intensiva",
    descricao: "Você pode aplicar um treino puxado antes da rodada. Rende, mas cansa.",
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
    ],
  },
];

export function sortearEvento(idsUsadosRecentes: string[]): ChoiceEvent {
  const disponiveis = CHOICE_EVENTS.filter((e) => !idsUsadosRecentes.slice(-3).includes(e.id));
  const pool = disponiveis.length > 0 ? disponiveis : CHOICE_EVENTS;
  return pool[Math.floor(Math.random() * pool.length)]!;
}
