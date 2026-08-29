/**
 * ============================================================
 *  BANCO DE FRASES DO pracinha.online
 * ============================================================
 *
 *  COMO ADICIONAR MAIS FRASES (é só isso):
 *
 *  1) Para adicionar frases numa categoria que já existe:
 *     ache a categoria abaixo e escreva mais linhas dentro de `frases: [ ... ]`
 *     Exemplo:  "Minha frase nova aqui.",
 *
 *  2) Para criar uma categoria NOVA:
 *     copie um bloco inteiro { id, nome, emoji, frases: [...] }
 *     e cole no final da lista CATEGORIAS. Pronto: o botão aparece sozinho no site.
 *
 *  3) Para gerar MILHÕES de frases automaticamente:
 *     veja o bloco COMBINACOES lá no final do arquivo. Cada categoria pode ter
 *     "peças" (inicio + meio + fim) que o site combina sozinho.
 *     Ex.: 100 x 100 x 100 = 1.000.000 de frases diferentes de uma categoria só.
 * ============================================================
 */

export type Categoria = {
  id: string;
  nome: string;
  emoji: string;
  frases: string[];
};

export const CATEGORIAS: Categoria[] = [
  {
    id: "biblia",
    nome: "Bíblia",
    emoji: "📖",
    frases: [
      "O Senhor é o meu pastor; nada me faltará. — Salmos 23:1",
      "Tudo posso naquele que me fortalece. — Filipenses 4:13",
      "Se Deus é por nós, quem será contra nós? — Romanos 8:31",
      "O amor é paciente, o amor é bondoso. — 1 Coríntios 13:4",
      "Lâmpada para os meus pés é tua palavra e luz para o meu caminho. — Salmos 119:105",
      "Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará. — Salmos 37:5",
      "Aquietai-vos e sabei que eu sou Deus. — Salmos 46:10",
      "O choro pode durar uma noite, mas a alegria vem pela manhã. — Salmos 30:5",
      "Não temas, porque eu sou contigo. — Isaías 41:10",
      "Os que esperam no Senhor renovarão as suas forças. — Isaías 40:31",
      "Buscai primeiro o Reino de Deus e a sua justiça. — Mateus 6:33",
      "A fé é a certeza daquilo que esperamos. — Hebreus 11:1",
      "Eu sou o caminho, a verdade e a vida. — João 14:6",
      "Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia. — Salmos 46:1",
      "Confia no Senhor de todo o teu coração. — Provérbios 3:5",
      "Alegrai-vos sempre no Senhor. — Filipenses 4:4",
      "Tudo tem o seu tempo determinado debaixo do céu. — Eclesiastes 3:1",
      "O Senhor pelejará por vós, e vós vos calareis. — Êxodo 14:14",
      "Grandes coisas fez o Senhor por nós, por isso estamos alegres. — Salmos 126:3",
      "A graça do Senhor se renova a cada manhã. — Lamentações 3:23",
    ],
  },
  {
    id: "legendas",
    nome: "Legendas / Reels",
    emoji: "📸",
    frases: [
      "Vivendo momentos, criando memórias. ✨",
      "Menos rotina, mais liberdade e paz no coração. 🌿",
      "Silenciando o barulho de fora para ouvir o de dentro. 🤍",
      "Colecionando momentos e fotos na praia. 🌊",
      "A vida é curta demais para não postar essa foto.",
      "Sorriso no rosto, plano na cabeça. 😌",
      "Feliz, leve e sem pressa de chegar. 🌤️",
      "Escrevendo capítulos que eu mesma escolhi. 📖",
      "Sol na pele, música alta, coração em paz. ☀️",
      "Nem todo dia é bom, mas tem coisa boa em todo dia.",
      "Fazendo do simples uma obra de arte. 🎨",
      "Vivendo a versão preferida de mim. 💫",
      "Se for pra ficar, que fique bom. 🤍",
      "Foto pra guardar o dia que eu não quero esquecer.",
      "Meu momento, minha vibe, minhas regras. 🔥",
      "A paz que eu achei não tem preço. 🌱",
      "Coleciono pôr do sol e boas conversas. 🌇",
      "Sendo luz até nos dias nublados. ☁️",
    ],
  },
  {
    id: "cantadas",
    nome: "Cantadas",
    emoji: "😏",
    frases: [
      "Seu nome é Wi-Fi? Porque estou sentindo uma conexão muito forte.",
      "Você tem um mapa? Me perdi no brilho dos seus olhos.",
      "Não sou fotógrafo, mas consigo imaginar a gente junto perfeitamente.",
      "Se beleza fosse tempo, você seria a eternidade.",
      "Cê é oração? Porque desde que te vi eu não paro de repetir seu nome.",
      "Se eu fosse escritor, você seria todos os meus finais felizes.",
      "Me empresta sua mão? Só pra ver se cabe na minha pra sempre.",
      "Você é o tipo de problema que eu não quero resolver.",
      "Tô sem sinal aqui... só pego quando você chega perto.",
      "Se sorriso pagasse boleto, você seria bilionária.",
      "Cê acredita em amor à primeira vista ou eu passo de novo?",
      "Meu coração é caroneiro e escolheu o seu caminho.",
    ],
  },
  {
    id: "motivacao",
    nome: "Motivação",
    emoji: "🚀",
    frases: [
      "O segredo para progredir é ter a coragem de começar.",
      "Pequenos passos todos os dias geram grandes resultados amanhã.",
      "Sua única competição é quem você foi ontem.",
      "Foco no processo que o resultado vem.",
      "Disciplina é escolher o que você quer mais em vez do que você quer agora.",
      "Ninguém vai remar o seu barco. Pega o remo.",
      "Cansaço passa, orgulho de ter feito fica.",
      "Comece feio, comece torto, mas comece.",
      "O plano só falha de verdade quando você para.",
      "Consistência vence talento que não aparece.",
      "Não espere motivação: crie o hábito.",
      "Você não precisa ser o melhor, precisa ser constante.",
      "A vida melhora quando você melhora.",
      "Um dia de cada vez, mas todo dia.",
      "Quem persiste sempre chega, mesmo devagar.",
    ],
  },
  {
    id: "indiretas",
    nome: "Indiretas",
    emoji: "🔥",
    frases: [
      "Tem gente que é tipo nuvem: quando some, o dia fica lindo.",
      "Quem muito fala, pouco faz. Ações valem mais que palavras.",
      "Atura ou surta, que a minha paz ninguém tira.",
      "Não sou difícil, sou seletiva. Tem diferença.",
      "Falta de atitude também é resposta. Entendi.",
      "Aprendi a agradecer pelas portas que se fecharam.",
      "Cuidado com quem só aparece quando precisa.",
      "Meu silêncio diz muito mais do que eu deveria falar.",
      "Se sumiu, não faltou. Simples assim.",
      "Sigo bem, obrigada por perguntar (você não perguntou).",
    ],
  },
  {
    id: "amor",
    nome: "Amor",
    emoji: "❤️",
    frases: [
      "Amar é escolher a mesma pessoa todos os dias.",
      "Com você até o silêncio tem som bonito.",
      "Você virou meu lugar favorito no mundo.",
      "Não é sorte, é escolha diária.",
      "Meu coração te reconheceu antes de eu entender.",
      "A gente não combina: a gente completa.",
      "Te amar é fácil como respirar.",
      "Quero café da manhã com você por muitos anos.",
    ],
  },
  {
    id: "gratidao",
    nome: "Gratidão",
    emoji: "🙏",
    frases: [
      "Gratidão transforma o que temos em suficiente.",
      "Obrigado, Deus, pelo que veio e pelo que não veio.",
      "Agradecer é o melhor jeito de pedir mais.",
      "Hoje eu escolho ver o que deu certo.",
      "Grato pelas pessoas certas na hora certa.",
      "Nada é pequeno quando é bênção.",
    ],
  },
  {
    id: "aniversario",
    nome: "Aniversário",
    emoji: "🎂",
    frases: [
      "Que esse novo ano venha cheio de motivos pra sorrir!",
      "Feliz aniversário! Que Deus continue te cobrindo de bênçãos.",
      "Mais um ano de vida, mais um ano de histórias boas.",
      "Parabéns! Que a vida te devolva tudo de bom que você planta.",
      "Hoje o mundo comemora ter você. 🎉",
    ],
  },
  {
    id: "boanoite",
    nome: "Bom dia / Boa noite",
    emoji: "🌙",
    frases: [
      "Bom dia! Que hoje seja mais leve que ontem. ☀️",
      "Boa noite, descansa que amanhã tem mais. 🌙",
      "Acorda, respira, agradece e vai. 🌤️",
      "Que o seu sono seja tão bom quanto o seu coração.",
      "Bom dia! Deus já acordou antes de você e cuidou de tudo.",
    ],
  },
  {
    id: "humor",
    nome: "Humor",
    emoji: "😂",
    frases: [
      "Meu plano era ser produtivo, mas o sofá tinha outros planos.",
      "Acordei disposto. Passou.",
      "Sou fluente em sarcasmo e em fome.",
      "Minha vida é uma comédia com trilha sonora dramática.",
      "Se cansaço desse XP, eu já era nível 100.",
    ],
  },

  /* ============================================================
   *  ADICIONE SUAS NOVAS CATEGORIAS ABAIXO (copie o modelo)
   * ============================================================
   * {
   *   id: "minha-categoria",
   *   nome: "Minha Categoria",
   *   emoji: "⭐",
   *   frases: [
   *     "Primeira frase.",
   *     "Segunda frase.",
   *   ],
   * },
   */
];

/**
 * ============================================================
 *  MOTOR DE COMBINAÇÕES — aqui nascem os MILHÕES de frases
 * ============================================================
 *  Cada categoria pode ter peças. O site junta início + meio + fim.
 *  Quantidade de frases = inicio.length × meio.length × fim.length
 *  Basta você ir colando mais linhas em qualquer uma das listas
 *  que o total cresce automaticamente (multiplicando!).
 */
export type Combinacao = { inicio: string[]; meio: string[]; fim: string[] };

export const COMBINACOES: Record<string, Combinacao> = {
  motivacao: {
    inicio: [
      "Acredite:",
      "Lembre-se:",
      "Nunca esqueça:",
      "A verdade é simples:",
      "Anota aí:",
      "Hoje eu entendi:",
      "No fim das contas,",
      "Enquanto tiver fôlego,",
      "Se depender de mim,",
      "Diga pra você mesmo:",
      "Sem drama:",
      "Do jeito difícil ou fácil,",
    ],
    meio: [
      "cada esforço seu",
      "cada dia de disciplina",
      "cada não que você ouviu",
      "cada madrugada acordado",
      "cada recomeço",
      "cada passo pequeno",
      "cada escolha difícil",
      "cada treino, cada estudo",
      "cada tentativa",
      "cada segundo investido",
      "cada obstáculo vencido",
      "cada promessa cumprida",
    ],
    fim: [
      "está construindo a sua virada.",
      "vai valer a pena lá na frente.",
      "te deixa mais perto do objetivo.",
      "conta muito mais do que você imagina.",
      "é semente de colheita boa.",
      "te transforma em alguém novo.",
      "prepara o seu futuro.",
      "escreve a sua história.",
      "vira orgulho no fim do ano.",
      "é degrau, não é muro.",
      "abre uma porta que ninguém fecha.",
      "faz diferença mesmo no silêncio.",
    ],
  },
  legendas: {
    inicio: [
      "Vivendo",
      "Colecionando",
      "Escolhendo",
      "Sentindo",
      "Buscando",
      "Construindo",
      "Guardando",
      "Cultivando",
      "Fazendo questão de",
      "Perseguindo",
      "Aproveitando",
      "Curtindo",
    ],
    meio: [
      "dias leves",
      "momentos simples",
      "boas conversas",
      "pôr do sol",
      "paz de espírito",
      "risadas sinceras",
      "planos novos",
      "domingos sem pressa",
      "viagens improváveis",
      "coisas pequenas",
      "manhãs de sol",
      "histórias boas",
    ],
    fim: [
      "e sem pedir desculpa por isso. ✨",
      "com quem soma. 🤍",
      "no meu tempo. 🌿",
      "e agradecendo por tudo. 🙏",
      "de coração cheio. 💫",
      "longe do que me tira a paz. 🌊",
      "com fé e sorriso. ☀️",
      "porque a vida é agora. 🔥",
      "sem correr atrás de ninguém. 😌",
      "e feliz do meu jeito. 🌸",
      "com música alta. 🎧",
      "e memória boa pra contar depois. 📸",
    ],
  },
  amor: {
    inicio: [
      "Com você",
      "Do seu lado",
      "Perto de você",
      "Desde que te conheci",
      "Todo dia com você",
      "Quando você chega",
      "No meio do caos,",
      "Sem pressa nenhuma,",
      "Se for com você,",
      "Enquanto der,",
    ],
    meio: [
      "o dia fica",
      "tudo fica",
      "até o silêncio fica",
      "a rotina vira",
      "o mundo parece",
      "meu peito fica",
      "o tempo passa",
      "a vida se torna",
      "qualquer lugar vira",
      "o comum vira",
    ],
    fim: [
      "mais bonito. ❤️",
      "mais leve e mais meu. 🤍",
      "melhor do que eu sonhei.",
      "um bom lugar pra ficar.",
      "casa. 🏡",
      "poesia sem esforço.",
      "calmaria no meio da correria.",
      "motivo pra recomeçar sempre.",
      "coisa boa demais pra explicar.",
      "a minha parte favorita do dia.",
    ],
  },
  gratidao: {
    inicio: [
      "Obrigado, Deus, por",
      "Sou grato por",
      "Hoje agradeço por",
      "Meu coração agradece por",
      "Que bom poder ter",
      "Nunca vou esquecer de agradecer por",
    ],
    meio: [
      "cada porta aberta",
      "cada livramento",
      "cada amigo verdadeiro",
      "cada recomeço",
      "cada oração respondida",
      "cada pão na mesa",
      "cada abraço na hora certa",
      "cada dia de saúde",
    ],
    fim: [
      "que eu nem pedi. 🙏",
      "no tempo certo. ✨",
      "mesmo quando eu duvidei.",
      "e pelo que ainda vem.",
      "que mudou minha história.",
      "e por me sustentar até aqui.",
    ],
  },
  indiretas: {
    inicio: [
      "Tem gente que",
      "Aprendi que quem",
      "Cuidado com quem",
      "Engraçado como quem",
      "Nunca confie em quem",
      "Já entendi: quem",
    ],
    meio: [
      "só aparece quando precisa",
      "fala demais e faz de menos",
      "some quando o assunto é ajudar",
      "cobra o que não entrega",
      "só lembra da gente no aperto",
      "critica todo mundo e não se olha",
    ],
    fim: [
      "não merece meu tempo.",
      "sai da minha lista sem aviso.",
      "vai encontrar a porta aberta pra sair.",
      "não faz falta nenhuma.",
      "ensina o que eu não quero ser.",
      "colhe exatamente o que planta.",
    ],
  },
  biblia: {
    inicio: [
      "Confie:",
      "Tenha fé,",
      "No tempo de Deus,",
      "Mesmo no deserto,",
      "Quando faltar força,",
      "Se o medo bater,",
    ],
    meio: [
      "o Senhor vai à frente",
      "a promessa continua de pé",
      "a fé é maior que a dúvida",
      "Deus cuida de cada detalhe",
      "a oração alcança o impossível",
      "o Espírito consola",
    ],
    fim: [
      "e nada te faltará.",
      "e tudo coopera para o bem.",
      "porque Ele é fiel.",
      "e a vitória vem no tempo certo.",
      "e a paz permanece.",
      "e o milagre acontece.",
    ],
  },
  humor: {
    inicio: [
      "Meu plano era",
      "Hoje eu acordei pra",
      "Já tentei",
      "Meu corpo pediu pra",
      "A vida adulta é",
    ],
    meio: [
      "ser produtivo",
      "resolver tudo antes do almoço",
      "arrumar a casa",
      "começar a dieta",
      "dormir cedo",
    ],
    fim: [
      "mas o sofá venceu. 😂",
      "e o Wi-Fi discordou.",
      "e acabei vendo vídeo de gato.",
      "aí lembrei que existe pizza.",
      "e o boleto riu de mim.",
    ],
  },
};

/** Total teórico de frases (curadas + combinações). */
export function totalDeFrases(): number {
  let total = CATEGORIAS.reduce((soma, c) => soma + c.frases.length, 0);
  for (const c of Object.values(COMBINACOES)) {
    total += c.inicio.length * c.meio.length * c.fim.length;
  }
  return total;
}

function sortear<T>(lista: T[]): T {
  return lista[Math.floor(Math.random() * lista.length)] as T;
}

function combinar(id: string): string | null {
  const c = COMBINACOES[id];
  if (!c) return null;
  return `${sortear(c.inicio)} ${sortear(c.meio)} ${sortear(c.fim)}`;
}

/** Gera uma frase aleatória da categoria (curada ou combinada). */
export function fraseAleatoria(categoriaId: string): string {
  const cat = CATEGORIAS.find((c) => c.id === categoriaId);
  const curadas = cat?.frases ?? [];
  const temCombo = Boolean(COMBINACOES[categoriaId]);
  if (temCombo && (curadas.length === 0 || Math.random() < 0.5)) {
    return combinar(categoriaId) as string;
  }
  if (curadas.length === 0) return "Nenhuma frase cadastrada nesta categoria ainda.";
  return sortear(curadas);
}

/** Busca por palavra-chave em todas as categorias. */
export function buscarFrases(termo: string, limite = 40): string[] {
  const q = termo.toLowerCase().trim();
  if (!q) return [];
  const achadas: string[] = [];
  for (const cat of CATEGORIAS) {
    for (const f of cat.frases) {
      if (f.toLowerCase().includes(q)) achadas.push(f);
      if (achadas.length >= limite) return achadas;
    }
  }
  // também tenta gerar combinações que contenham o termo
  for (const id of Object.keys(COMBINACOES)) {
    for (let i = 0; i < 200 && achadas.length < limite; i++) {
      const f = combinar(id);
      if (f && f.toLowerCase().includes(q)) achadas.push(f);
    }
  }
  return achadas;
}
