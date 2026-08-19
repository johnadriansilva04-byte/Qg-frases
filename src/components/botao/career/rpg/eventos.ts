/**
 * Catálogo de eventos narrativos da Cidadela.
 * Cada evento é um DILEMA: nunca existe opção "boa" ou "má" — toda escolha
 * carrega vantagem + consequência. Os tons vão do drama ao terror narrativo.
 */

import type { EventoRpg } from "./types";

export const EVENTOS_RPG: EventoRpg[] = [
  {
    id: "divida-corretor",
    remetente: "npc-corretor",
    titulo: "3h47",
    tom: "terror",
    texto:
      "Seu celular vibra no escuro. Número desconhecido.\n\n" +
      "«Treinador. O clube deve. Você deve. E dívida na Cidadela não prescreve — " +
      "ela amadurece. Eu posso fazer esse número sumir dos livros. Em troca, um dia " +
      "eu te ligo. E você atende.»",
    escolhas: [
      {
        texto: "Aceitar o favor (a dívida some — mas você fica devendo a ELE)",
        desfecho:
          "O número desaparece dos livros na mesma madrugada. Você dorme. Mas agora existe " +
          "um homem na Cidadela que pode ligar a qualquer hora. E você vai atender.",
        efeitos: {
          soberania: 60,
          moral: -10,
          segredo: {
            descricao: "Você deve um favor ao Corretor.",
            cobraEmRodada: 5,
          },
        },
      },
      {
        texto: "Recusar e encarar a dívida sozinho",
        desfecho:
          "«Respeito.» — é a única resposta. A dívida continua nos livros, mas a sua " +
          "consciência continua limpa. O elenco sente a firmeza.",
        efeitos: { soberania: -25, moral: 10 },
      },
      {
        texto: "Ignorar a mensagem",
        desfecho:
          "Você apaga a mensagem. Na manhã seguinte, um carro preto para duas vezes " +
          "na frente do CT. Ninguém desce. Ninguém precisa.",
        efeitos: { moral: -15, bonusPoder: -5 },
      },
    ],
  },
  {
    id: "aquela-noite",
    remetente: "npc-corretor",
    titulo: "Você lembra daquela noite?",
    tom: "suspense",
    texto:
      "«Boa noite, treinador. Você lembra daquela noite? Eu lembro.\n\n" +
      "Chegou a hora do favor. É simples: no próximo jogo, seu time entra com um " +
      "botão a menos em campo. Ninguém vai perceber. Ninguém precisa perceber.»",
    escolhas: [
      {
        texto: "Cumprir o acordo (entrar com 1 botão a menos)",
        desfecho:
          "Você obedece. O telefone fica em silêncio por semanas. O acordo está " +
          "encerrado — mas você nunca mais olha para o próprio time do mesmo jeito.",
        efeitos: { desfalqueBotao: 1, moral: -20 },
      },
      {
        texto: "Se recusar, custe o que custar",
        desfecho:
          "«Que pena.» Dois dias depois, um árbitro apita contra você um pênalti que " +
          "só ele viu. Coincidência? Na Cidadela, não existe coincidência.",
        efeitos: { moral: 5, relacao: { npc: "npc-corretor", delta: -40 } },
      },
    ],
  },
  {
    id: "seguidor",
    remetente: "npc-valeria",
    titulo: "Não olha pra trás",
    tom: "terror",
    texto:
      "Valéria liga com a voz baixa, trêmula:\n\n" +
      "«Amor, eu tava indo pro CT e tinha um homem parado em frente ao portão. " +
      "Quando eu passei, ele começou a andar atrás de mim. Eu entrei correndo na " +
      "padaria. Amor... ele sabia o seu nome.»",
    escolhas: [
      {
        texto: "Chamar a segurança do clube e investigar (custa SOV)",
        desfecho:
          "A segurança encontra apenas um celular quebrado na calçada, com uma única " +
          "foto: o seu time treinando. Tirada de dentro do CT.",
        efeitos: { soberania: -20, moral: -5, relacao: { npc: "npc-valeria", delta: 15 } },
      },
      {
        texto: "Dizer que é só um torcedor fanático",
        desfecho:
          "Valéria finge que acredita. Mas naquela noite ela tranqüila o celular no " +
          "modo silencioso pela primeira vez. E você também.",
        efeitos: { moral: -10, relacao: { npc: "npc-valeria", delta: -20 } },
      },
    ],
  },
  {
    id: "vestiario-mudo",
    remetente: "npc-torcedor",
    titulo: "O silêncio do vestiário",
    tom: "drama",
    texto:
      "Zé do Arquibanco manda áudio, preocupado:\n\n" +
      "«Professor, tava na grade hoje. Os botões entraram em campo em silêncio. " +
      "Ninguém brinca, ninguém grita. Vestiário morto é pior que time perdendo, " +
      "professor. Faz alguma coisa.»",
    escolhas: [
      {
        texto: "Pagar um jantar para o elenco (SOV por moral)",
        desfecho:
          "O churrasco vai até tarde. Alguém canta. Alguém ri pela primeira vez em " +
          "semanas. Na segunda-feira, o treino tem barulho de novo.",
        efeitos: { soberania: -30, moral: 20 },
      },
      {
        texto: "Convocar uma conversa dura, olho no olho",
        desfecho:
          "Você fecha a porta e fala dez minutos sem levantar a voz. Quando abre, " +
          "os botões saem em fila, em silêncio — mas um silêncio diferente. De foco.",
        efeitos: { moral: 10, bonusPoder: 5 },
      },
      {
        texto: "Ignorar — resultado resolve tudo",
        desfecho:
          "Resultado resolve tudo, até o dia em que não resolve. O vestiário continua " +
          "mudo. E vestiário mudo cobra caro.",
        efeitos: { moral: -15 },
      },
    ],
  },
  {
    id: "proposta-dario",
    remetente: "npc-dario",
    titulo: "Um jantar de negócios",
    tom: "suspense",
    texto:
      "Dário Fontoura, direto ao ponto como sempre:\n\n" +
      "«Treinador, jantei ontem com gente que decide coisas grandes nesta cidade. " +
      "Seu nome foi mencionado. Posso te colocar na vitrine — patrocínio, mídia, " +
      "tudo. Só preciso que você me escute com a mente aberta. Topa?»",
    escolhas: [
      {
        texto: "Ouvir a proposta (abre caminho — e cobranças)",
        desfecho:
          "A proposta é boa. Boa demais. Você assina, e no mesmo instante percebe " +
          "que agora trabalha também para Dário. A vitrine ilumina. E expõe.",
        efeitos: {
          soberania: 45,
          relacao: { npc: "npc-dario", delta: 25 },
          segredo: { descricao: "Dário Fontoura tem um contrato informal com você.", cobraEmRodada: 6 },
        },
      },
      {
        texto: "Recusar educadamente",
        desfecho:
          "Dário sorri. «Todo mundo diz não uma vez.» Ele paga a conta e sai. Você " +
          "fica olhando o café esfriar, pensando no que acabou de recusar.",
        efeitos: { moral: 5, relacao: { npc: "npc-dario", delta: -10 } },
      },
    ],
  },
  {
    id: "demissao-sombra",
    remetente: "npc-braganca",
    titulo: "Burburinho no corredor",
    tom: "suspense",
    texto:
      "Até o rival te avisa. Bragança, sem o deboche de sempre:\n\n" +
      "«Olha, a gente se detesta, mas futebol é futebol. Tem reunião marcada no seu " +
      "clube sem você na sala. Diretoria, advogado, o pacote inteiro. Se prepara, " +
      "professor. E boa sorte.»",
    escolhas: [
      {
        texto: "Enfrentar a diretoria antes da reunião",
        desfecho:
          "Você entra na sala sem ser convidado e fala primeiro. O presidente fica em " +
          "silêncio um minuto inteiro. Depois diz: «Mais três jogos. Só.»",
        efeitos: { moral: 10, bonusPoder: 5 },
      },
      {
        texto: "Esperar o veredito em silêncio",
        desfecho:
          "Você espera. Esperar é o pior. O time sente, a torcida sente, e o próximo " +
          "jogo vira uma final antecipada.",
        efeitos: { moral: -10 },
      },
    ],
  },
  {
    id: "festa-convite",
    remetente: "npc-dario",
    titulo: "A festa da colina",
    tom: "drama",
    texto:
      "«Treinador, sábado tem a festa da colina. Todo mundo que importa nesta cidade " +
      "vai estar lá: patrocinadores, jornalistas, dirigentes. Networking puro. " +
      "Mas é véspera de jogo. A escolha é sua.»",
    escolhas: [
      {
        texto: "Ir à festa (contatos e rumores — mas risco de desgaste)",
        desfecho:
          "Você sai de lá com três cartões e um boato valioso sobre o adversário. " +
          "Também sai de lá às 4h. O treino de domingo foi... curto.",
        efeitos: { moral: 5, bonusPoder: -5, relacao: { npc: "npc-dario", delta: 10 } },
      },
      {
        texto: "Ficar no CT estudando o adversário",
        desfecho:
          "Sábado à noite, sozinho com a prancheta. Domingo, o time entra sabendo " +
          "exatamente onde o rival cede. A colina que espere.",
        efeitos: { bonusPoder: 8, relacao: { npc: "npc-dario", delta: -5 } },
      },
    ],
  },
  {
    id: "mae-preocupada",
    remetente: "npc-donacida",
    titulo: "Sua mãe viu o jornal",
    tom: "drama",
    texto:
      "Dona Cida, com a voz apertada:\n\n" +
      "«Filho, li uma coisa no jornal sobre apostas e o seu nome perto dessa " +
      "história. Me diz que não é verdade. Você não se meteu com essa gente, " +
      "meteu? Me promete, filho.»",
    escolhas: [
      {
        texto: "Jurar que está tudo limpo (mesmo que não esteja)",
        desfecho:
          "Ela respira aliviada. Você desliga e fica olhando para o telefone. Mentir " +
          "pra mãe tem um peso que nenhum placar mede.",
        efeitos: { moral: -5, relacao: { npc: "npc-donacida", delta: -5 } },
      },
      {
        texto: "Contar a verdade e pedir ajuda",
        desfecho:
          "Ela chora. Depois respira fundo e diz: «A gente resolve junto. Mãe é pra " +
          "isso.» Você não está mais sozinho nessa.",
        efeitos: { moral: 15, relacao: { npc: "npc-donacida", delta: 15 } },
      },
    ],
  },
];

export function eventoPorId(id: string): EventoRpg | undefined {
  return EVENTOS_RPG.find((e) => e.id === id);
}
