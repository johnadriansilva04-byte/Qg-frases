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
    id: "contrato-pendente",
    remetente: "npc-dario",
    titulo: "O contrato do clube",
    tom: "drama",
    texto:
      "Dário Fontoura, direto ao ponto como sempre:\n\n" +
      "«Treinador, o clube cresceu e agora tudo precisa constar em papel: cláusulas, " +
      "temporada, valores. Leva isso ao Cartório da Cidadela e formalise o vínculo — " +
      "ou deixe a relação cair no informal de novo. Sua escolha.»",
    escolhas: [
      {
        texto: "Levar o vínculo ao Cartório (formaliza em papel)",
        desfecho:
          "Você recebe uma ficha do empresário preenchida com os dados do vínculo — " +
          "basta lavrar no Cartório. A diretoria finalmente para de encher.",
        efeitos: {
          relacao: { npc: "npc-dario", delta: 15 },
          cartorio: { tipo: "contrato", titulo: "Contrato do vínculo do clube" },
        },
      },
      {
        texto: "Seguir no informal (sem papel, sem dor de cabeça)",
        desfecho:
          "Dário sorri: «Informal é rápido. Só não reclama quando a justiça " +
          "entrar na história.» Enquanto isso, o acordo vale o saldo da confiança.",
        efeitos: { moral: 5, relacao: { npc: "npc-dario", delta: -5 } },
      },
    ],
  },
  {
    id: "peticao-necessaria",
    remetente: "npc-corretor",
    titulo: "Incidente na quadra",
    tom: "suspense",
    texto:
      "O Corretor manda a desgraça em áudio, meio sorriso na voz:\n\n" +
      "«Aquele lance na quadra? Alguém filmou e quer processar. Petício judicial " +
      "só pega no Cartório — e o prazo é curto. Leva a descrição e as provas. Ou... " +
      "só espera a absolta.»",
    escolhas: [
      {
        texto: "Fazer a petição no Cartório (junto às provas)",
        desfecho:
          "Você recebe o dossiê do incidente com os detalhes — basta redigir a " +
          "petição da defesa no Cartório e apresentá-la dentro do prazo.",
        efeitos: {
          moral: -5,
          cartorio: { tipo: "peticao", titulo: "Petição de defesa do clube" },
        },
      },
      {
        texto: "Disputar pelo informal (inspira o desfecho bizarro)",
        desfecho:
          "O árbitro começa o processo sem a sua versão. O veredito sai pior — " +
          "e o vestiário sente.",
        efeitos: { soberania: -20, moral: -8 },
      },
    ],
  },
  {
    id: "multa-judicial",
    remetente: "npc-braganca",
    titulo: "Multa com prazo",
    tom: "suspense",
    texto:
      "Bragança, provando que o rival também avisa:\n\n" +
      "«A justiça marcou uma multa no seu clube por aquela confusão. Pague no Cartório " +
      "e receba a comprovação em papel — ou conteste lá próprio e arrisque dobrar. " +
      "Prazo é curto, viu?»",
    escolhas: [
      {
        texto: "Pagar a multa no Cartório (quita nos documentos)",
        desfecho:
          "O recibo da multa é lavrado com condição aceita — a dívida some dos " +
          "livros.",
        efeitos: {
          soberania: -30,
          moral: 5,
          cartorio: { tipo: "multa", titulo: "Multa judicial do incidente" },
        },
      },
      {
        texto: "Contestar e arriscar",
        desfecho:
          "Você contesta e o juiz acredita na versão mais colorida do clube... " +
          "mas a verdade custa o dobro quando sai pior. — aumenta a indefinição.",
        efeitos: { moral: -10 },
      },
    ],
  },
];

export function eventoPorId(id: string): EventoRpg | undefined {
  return EVENTOS_RPG.find((e) => e.id === id);
}
