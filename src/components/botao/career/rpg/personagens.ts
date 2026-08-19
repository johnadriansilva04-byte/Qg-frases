/**
 * Personagens da Cidadela — NPCs com identidade, objetivos e voz própria.
 * Cada um tem um systemPrompt (usado pela LLM local quando disponível) e
 * respostas procedurais com variação por faixa de relacionamento.
 */

import { faixaRelacao, type NpcId, type PersonagemNpc } from "./types";

export const PERSONAGENS: Record<NpcId, PersonagemNpc> = {
  "npc-valeria": {
    id: "npc-valeria",
    nome: "Valéria",
    avatar: "💛",
    cargo: "Namorada",
    relacaoInicial: 55,
    systemPrompt:
      "Você é Valéria, namorada do treinador. Apoia a carreira dele, mas sente " +
      "falta de atenção e cobra presença. Fala com carinho e ironia leve. Nunca " +
      "sabe de resultados antes dele contar. Responda em 1-2 frases, informal.",
  },
  "npc-dario": {
    id: "npc-dario",
    nome: "Dário Fontoura",
    avatar: "🕴️",
    cargo: "Empresário",
    relacaoInicial: 20,
    systemPrompt:
      "Você é Dário Fontoura, empresário de futebol ambicioso e calculista. " +
      "Elogia quando convém, pressiona quando há dinheiro em jogo e sempre " +
      "sugere 'atalhos'. Nunca revela tudo o que sabe. Responda em 1-2 frases, " +
      "tom de negócios.",
  },
  "npc-braganca": {
    id: "npc-braganca",
    nome: "Téc. Bragança",
    avatar: "😏",
    cargo: "Treinador rival",
    relacaoInicial: -35,
    systemPrompt:
      "Você é o técnico Bragança, rival histórico do jogador. Provocador, " +
      "irônico, adora minimizar as vitórias alheias e espalhar rumores. Por " +
      "trás da arrogância, respeita quem resiste. Responda em 1-2 frases, deboche.",
  },
  "npc-corretor": {
    id: "npc-corretor",
    nome: "O Corretor",
    avatar: "🕶️",
    cargo: "Desconhecido",
    relacaoInicial: -10,
    systemPrompt:
      "Você é 'O Corretor', figura misteriosa do submundo da Cidadela. Fala " +
      "pouco, por metáforas, e sempre oferece caminhos perigosos com calma " +
      "inquietante. Nunca ameaça diretamente — insinua. Responda em 1-2 frases " +
      "curtas, frias.",
  },
  "npc-donacida": {
    id: "npc-donacida",
    nome: "Dona Cida",
    avatar: "👵",
    cargo: "Mãe",
    relacaoInicial: 85,
    systemPrompt:
      "Você é Dona Cida, mãe do treinador. Amorosa, simples, orgulhosa, mas " +
      "preocupada com o filho se envolvendo em coisa errada. Pergunta se ele " +
      "comeu direito. Responda em 1-2 frases, jeito de mãe.",
  },
  "npc-torcedor": {
    id: "npc-torcedor",
    nome: "Zé do Arquibanco",
    avatar: "📣",
    cargo: "Torcedor fiel",
    relacaoInicial: 30,
    systemPrompt:
      "Você é Zé do Arquibanco, torcedor fanático do clube do jogador. Vive o " +
      "time, elogia vitórias com exagero e desaba em crises. Fala gíria de " +
      "arquibancada. Responda em 1-2 frases, passional.",
  },
};

export function personagem(id: NpcId): PersonagemNpc {
  return PERSONAGENS[id];
}

export function relacaoInicial(id: NpcId): number {
  return PERSONAGENS[id].relacaoInicial;
}

/** Rótulo elegante da faixa para a interface (não expõe o número cru). */
export function rotuloRelacao(score: number): string {
  const f = faixaRelacao(score);
  const mapa: Record<string, string> = {
    inimigo: "Inimigo declarado",
    hostil: "Relação hostil",
    desconhecido: "Quase um estranho",
    conhecido: "Conhecido",
    aliado: "Aliado",
    amigo: "Amigo de verdade",
    leal: "Lealdade máxima",
  };
  return mapa[f] ?? "Conhecido";
}

/* ------------------------------------------------------------------ */
/* Respostas procedurais (fallback quando a LLM local não roda).        */
/* Cada NPC tem bancos por faixa de relacionamento.                     */
/* ------------------------------------------------------------------ */

type Banco = Partial<Record<ReturnType<typeof faixaRelacao>, string[]>>;

const RESPOSTAS: Record<NpcId, Banco> = {
  "npc-valeria": {
    inimigo: [
      "A gente precisa conversar sério. Pessoalmente. Hoje.",
      "Você virou uma pessoa que eu não reconheço mais.",
    ],
    hostil: [
      "Você só lembra de mim quando perde, né?",
      "Tô sem paciência pra promessa. Me mostra atitude.",
    ],
    desconhecido: [
      "Oi, sumido. O time tá te consumindo inteiro, né.",
      "Vi o resultado. Pelo menos me conta antes de eu ler na rede.",
    ],
    conhecido: [
      "Tô torcendo por você, sabia? Só não esquece de mim no meio dessa loucura.",
      "Quando essa rodada acabar, a gente sai? Sem falar de futebol.",
    ],
    aliado: [
      "Você tá brilhando, amor. Mas dorme também, tá? O time não vai fugir.",
      "Sei lá como você aguenta essa pressão. Eu tô aqui, tá?",
    ],
    amigo: [
      "Orgulho de você, meu amor. A cidade inteira fala do seu trabalho.",
      "Quando você subir de divisão, quem comemora primeiro sou eu. Marcado.",
    ],
    leal: [
      "Conta comigo pra tudo. Até nas noites que o mundo desabar, eu tô aqui.",
      "Você não é só o técnico deles. É o meu amor. Não esquece disso.",
    ],
  },
  "npc-dario": {
    hostil: [
      "Você me deve uma explicação, treinador. E explicação não paga conta.",
      "Cuidado com quem você fecha a porta. Eu abro várias.",
    ],
    desconhecido: [
      "Treinador, tempo é dinheiro. Vamos direto ao ponto?",
      "Estou observando seu trabalho. Ainda não decidi se vale o investimento.",
    ],
    conhecido: [
      "Seus números chamam atenção. Posso te colocar num clube maior — por um preço.",
      "Tem gente grande perguntando de você. Responde rápido quando eu chamar.",
    ],
    aliado: [
      "Somos um bom time, você e eu. Continue ganhando que o resto eu resolvo.",
      "Tenho uma proposta interessante. Discreta. Daquelas que mudam carreiras.",
    ],
    amigo: [
      "Você é meu melhor investimento, treinador. E eu protejo meus investimentos.",
      "Qualquer problema, fala comigo. Qualquer um. Eu tenho os contatos certos.",
    ],
    leal: [
      "Por você eu movo a cidade inteira. Só não me esquece quando chegar no topo.",
      "Somos família agora, treinador. E família resolve tudo junto.",
    ],
  },
  "npc-braganca": {
    inimigo: [
      "Seu rebaixamento vai ser o melhor dia da minha vida. Anota.",
      "Corre, professor. O abismo tá logo ali.",
    ],
    hostil: [
      "Sorte de principiante não dura pra sempre, sabia?",
      "Ganhou? Ufa. Até relógio quebrado acerta duas vezes ao dia.",
    ],
    desconhecido: [
      "Você de novo. O que quer, autógrafo?",
      "A Cidadela tá pequena pra nós dois, treinador.",
    ],
    conhecido: [
      "Ok, admito: aquela jogada foi bonita. Só aquela.",
      "Não conte pra ninguém, mas seu time tá jogando direitinho.",
    ],
    aliado: [
      "Entre nós: aquele árbitro te roubou. E eu odeio admitir isso.",
      "Um dia a gente senta e troca ideia de verdade. Você tem futuro.",
    ],
  },
  "npc-corretor": {
    hostil: [
      "Portas que você fecha costumam abrir sozinhas. De noite.",
      "Todo mundo tem um preço, treinador. O seu só está em negociação.",
    ],
    desconhecido: [
      "Eu sei quem você é. E sei do que precisa. Quando chegar a hora, eu apareço.",
      "A Cidadela tem duas faces. Você só conheceu uma.",
    ],
    conhecido: [
      "Boa noite, treinador. Dorme bem? Tem gente que não dorme pensando em você.",
      "Ofertas como a minha não se repetem. Mas eu sou paciente.",
    ],
    aliado: [
      "Nosso acordo está de pé. E acordos comigo são sagrados.",
      "Você escolheu o caminho certo. O caminho de quem entende o jogo de verdade.",
    ],
  },
  "npc-donacida": {
    conhecido: [
      "Filho, você comeu direito hoje? Essa vida de treinador acaba com a saúde.",
      "Vi seu jogo na TV, mesmo sem entender nada. Chorei de orgulho.",
    ],
    aliado: [
      "Meu filho, seu pai ficaria orgulhoso. Mas promete que não tá se metendo em coisa errada?",
      "Liga pra sua mãe de vez em quando, viu? O coração aperta.",
    ],
    amigo: [
      "Você é meu maior presente. Ganhe ou perca, você já venceu na vida, meu filho.",
      "Tô rezando por você toda noite. E guardando comida no freezer.",
    ],
    leal: [
      "Até o fim do mundo, meu filho. Mãe não abandona. Nunca.",
      "Se alguém te fizer mal, quem resolve sou eu. Acredita.",
    ],
  },
  "npc-torcedor": {
    hostil: [
      "FORA, TÉCNICO! Minha vó escala melhor esse time!",
      "Eu pago ingresso pra isso? Devolve meu dinheiro, professor!",
    ],
    desconhecido: [
      "Ainda tô te avaliando, professor. Não me decepciona.",
      "Torcida não esquece. Nem o bem, nem o mal.",
    ],
    conhecido: [
      "Hoje teve garra! É disso que a arquibancada gosta!",
      "Tá no caminho, professor. A torcida tá começando a acreditar.",
    ],
    aliado: [
      "É O MISTER! A torcida tá contigo até o fim, professor!",
      "Que partida! Meu filho vai se chamar com seu nome, anota aí!",
    ],
    amigo: [
      "VOCÊ É LENDÁRIO! A Cidadela inteira canta seu nome!",
      "Por você eu pinto a cara, a casa e o cachorro! VAMO!",
    ],
  },
};

/** Resposta procedural do NPC conforme o relacionamento atual. */
export function respostaProcedural(id: NpcId, score: number): string {
  const faixa = faixaRelacao(score);
  const banco = RESPOSTAS[id];
  const lista = banco[faixa] ?? banco["conhecido"] ?? ["..."];
  return lista[Math.floor(Math.random() * lista.length)]!;
}
