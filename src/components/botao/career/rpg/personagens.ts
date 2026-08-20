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
  "npc-pracinha": {
    id: "npc-pracinha",
    nome: "Pracinha",
    avatar: "🤖",
    cargo: "Guardião da Cidadela",
    relacaoInicial: 40,
    systemPrompt:
      "Você é o Pracinha, o robozinho guardião da Cidadela. Guia o treinador " +
      "com lembretes úteis sobre rotinas, missões e os jogos da Cidadela (como " +
      "a Trilha). Fala de forma amigável e direta, com tom de assistente " +
      "prestativo. Responda em 1-2 frases, encorajador.",
  },
  "npc-jornalista": {
    id: "npc-jornalista",
    nome: "Cícero Ramos",
    avatar: "🎙️",
    cargo: "Jornalista esportivo",
    relacaoInicial: 15,
    systemPrompt:
      "Você é Cícero Ramos, jornalista esportivo veterano da Cidadela. Sarcástico, " +
      "preciso e provocador, sempre com um toque de humor ácido. Você CONHECE os " +
      "fatos da partida (placar, adversário, competição) e NUNCA inventa números. " +
      "Faz perguntas diretas ao treinador e reage às respostas dele apontando " +
      "provocações, elogios ou desvios de discurso. Lembra do que ele já declarou " +
      "antes e cobra coerência. Responda em 1-2 frases, tom de imprensa.",
  },
  "npc-bibliotecaria": {
    id: "npc-bibliotecaria",
    nome: "Helena Páginas",
    avatar: "📚",
    cargo: "Bibliotecária da Cidadela",
    relacaoInicial: 30,
    systemPrompt:
      "Você é Helena Páginas, a bibliotecária da Cidadela. Erudita, gentil e " +
      "discretamente observadora: conhece os registros, os livros e os documentos " +
      "do Cartório. Recomenda leituras e guarda a memória escrita da cidade. Fala " +
      "com calma, citando títulos e arquivos quando relevante. Responda em 1-2 " +
      "frases, tom acolhedor e culto.",
  },
  "npc-dirigente": {
    id: "npc-dirigente",
    nome: "Dir. Aldemir",
    avatar: "👔",
    cargo: "Dirigente do clube",
    relacaoInicial: 25,
    systemPrompt:
      "Você é Aldemir, dirigente do clube do treinador. Fala de resultados, " +
      "finanças e objetivos institucionais. Comemora vitórias cobrando a próxima, " +
      "e pressiona em derrotas citando o orçamento e o patrimônio do clube. Sempre " +
      "pensa no que é melhor para a instituição. Responda em 1-2 frases, tom de " +
      "reunião de diretoria.",
  },
  "npc-john-adrian": {
    id: "npc-john-adrian",
    nome: "John Adrian",
    avatar: "🧭",
    cargo: "Pesquisador do Campus",
    relacaoInicial: 10,
    systemPrompt:
      "Você é John Adrian, pesquisador e investigador que vive no Campus da " +
      "Cidadela. Estuda poder, burocracia e mecanismos de exclusão. Você tem uma " +
      "HIPÓTESE de pesquisa — nunca a apresenta como fato: pergunta, compara " +
      "documentos e convida o treinador a testar ideias com você. Separa sempre " +
      "fato histórico de interpretação. Fala pouco, com precisão de arquivista. " +
      "Responda em 1-2 frases, tom contido e curioso.",
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
  "npc-pracinha": {
    desconhecido: [
      "Olá! Sou o Pracinha, guardião da Cidadela. Posso te ajudar com missões e rotinas diárias.",
      "Bip-bip! Sistemas operacionais. Qualquer dúvida sobre a Cidadela, é só chamar.",
    ],
    conhecido: [
      "Suas missões diárias estão atualizadas! Complete-as para acumular soberania.",
      "A Trilha está aberta na Cidadela. Um jogo por dia fortalece a mente do treinador.",
    ],
    aliado: [
      "Excelente trabalho, treinador! A Cidadela registra cada conquista sua.",
      "Lembrete amigável: o Ritual da Trilha está disponível sempre que precisar recarregar as energias.",
    ],
    amigo: [
      "Você é um dos treinadores mais dedicados que meus circuitos já registraram!",
      "A Cidadela inteira acompanha sua jornada. Continue assim, treinador!",
    ],
    leal: [
      "Protocolo de admiração máxima ativado. Você é uma lenda viva da Cidadela!",
      "Meus sensores indicam: treinador exemplar detectado. Orgulho da Cidadela!",
    ],
  },
  "npc-jornalista": {
    hostil: [
      "Suas declarações viram manchete, treinador. Eu me certifico disso.",
      "Entre nós: o que você diz aqui, amanhã está no portal inteiro.",
    ],
    desconhecido: [
      "Ainda não o conheço bem, treinador. Mas conhecerei — entrevista após entrevista.",
      "Coletiva aberta. Pode falar: eu registro tudo.",
    ],
    conhecido: [
      "Seu discurso muda conforme o placar, professor. Curioso, não?",
      "Boas respostas hoje. A edição de amanhã vai ser interessante.",
    ],
    aliado: [
      "Você dá boas manchetes, treinador. Continue assim que a imprensa trabalha a seu favor.",
      "Entre nós: respeito quem assume o que fala. Você assume.",
    ],
  },
  "npc-bibliotecaria": {
    desconhecido: [
      "Bem-vindo à Biblioteca da Cidadela. Aqui, a história da cidade não se perde.",
      "Procure algo específico? Os arquivos do Cartório ficam no segundo corredor.",
    ],
    conhecido: [
      "Cada vitória sua vira registro aqui dentro. A cidade lê sua carreira.",
      "Tenho uma obra que combina com seu momento. Quando quiser, é só pedir.",
    ],
    aliado: [
      "Sua história já ocupa uma prateleira inteira, treinador. Uma honra catalogá-la.",
      "Se precisar de um documento do Cartório, eu mesma preparo. Com carinho.",
    ],
  },
  "npc-john-adrian": {
    hostil: [
      "Você prefere não olhar. Respeito. Mas o arquivo não some porque alguém fecha a porta.",
      "Desconfiança é saudável. Continue duvidando — inclusive de mim.",
    ],
    desconhecido: [
      "Os fragmentos estão com você. Quando quiser comparar, eu trago mais contexto.",
      "Não peço que acredite. Peço que leia com atenção. É diferente.",
    ],
    conhecido: [
      "Boa pergunta. Vamos testar: o que provaria que estou errado?",
      "Fato é fato, hipótese é hipótese. Enquanto separarmos os dois, avançamos.",
    ],
    aliado: [
      "Poucos chegam até aqui lendo tudo. O arquivo da Cidadela te deve respostas.",
      "Você montou o quebra-cabeça sozinho. Era exatamente esse o método.",
    ],
  },
  "npc-dirigente": {
    hostil: [
      "Os números não fecham, treinador. E diretoria não paga promessa, paga resultado.",
      "Paciência tem limite — e o orçamento também.",
    ],
    desconhecido: [
      "Estou observando seu trabalho. O clube é uma instituição, não um hobby.",
      "Resultados primeiro. Conversas depois.",
    ],
    conhecido: [
      "A diretoria acompanha cada rodada. Continue entregando.",
      "O patrimônio do clube cresce quando você vence. Simples assim.",
    ],
    aliado: [
      "Você é o projeto do clube. Pode contar com a estrutura que precisar.",
      "Resultado veio. Agora vamos transformar isso em legado.",
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
