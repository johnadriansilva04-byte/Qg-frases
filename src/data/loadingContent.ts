/**
 * Conteúdo central de carregamento da Cidadela.
 * UMA informação por vez: cada categoria contém textos lentos e completos.
 */

export type LoadingCategoria =
  | "DICAS"
  | "CURIOSIDADES"
  | "SEGREDOS"
  | "JOGOS"
  | "MASTER_LIGA"
  | "SOV"
  | "NARRATIVA"
  | "COMUNIDADE"
  | "PUBLICIDADE";

export interface IntroTexto {
  titulo: string;
  corpo: string;
}

export const LOADING_CONTENT: Record<LoadingCategoria, IntroTexto[]> = {
  DICAS: [
    {
      titulo: "Dica de Estratégia",
      corpo:
        "Na Trilha, às vezes avançar rápido demais é exatamente o que faz você perder a posição.",
    },
    {
      titulo: "Dica da Master Liga",
      corpo: "A moral do elenco muda seu desempenho. Resolva as mensagens do celular antes de entrar em campo.",
    },
    {
      titulo: "Dica de SOV",
      corpo: "Soberania gasta mal vira dívida narrativa. Pague contas do clube antes de assumir novos desafios.",
    },
    {
      titulo: "Dica do Celular",
      corpo: "O Robozinho só avisa quando importa: primeiro jogue, depois responda as mensagens pendente no celular.",
    },
    {
      titulo: "Dica de Defesa",
      corpo: "No Campeonato do Campus, a formação 1-3-1 aguenta mais rotas de ataque no final das jogadas.",
    },
  ],
  CURIOSIDADES: [
    { titulo: "Você sabia?", corpo: "Uma partida pode mudar sua trajetória dentro da Master Liga da Cidadela." },
    { titulo: "Você sabia?", corpo: "O saldo da sua Conta Money (SOV) também é auditado por narradores veteranos." },
    { titulo: "Você sabia?", corpo: "Os Pergaminhos de John Adrian só abrem o segredo quando todos são reunidos." },
    {
      titulo: "Você sabia?",
      corpo:
        "A Rede da Cidadela reage ao mesmo tempo em que você joga: vitórias geram manchete, derrotas geram rumor.",
    },
  ],
  SEGREDOS: [
    {
      titulo: "Segredo da Cidadela",
      corpo: "Nem toda oportunidade que aparece para você é uma boa oportunidade. Nem tudo tem preço justo.",
    },
    {
      titulo: "Segredo da Cidadela",
      corpo: "O grupo CIDADELA parece inocente, mas conversas vazadas lá podem virar manchete no portal da Rede.",
    },
    { titulo: "Segredo do Vestiário", corpo: "Sponsors abandonam treinadores com reputação baixa. Preserve a moral do seu clube." },
  ],
  JOGOS: [
    {
      titulo: "Campeonato do Campus",
      corpo: "Física de mesa, táctica real e economia SOV. Torneios, Copa do Brasil e Master Liga a cada temporada.",
    },
    { titulo: "Trilha", corpo: "O tabuleiro clássico da disciplina: posicione, forme linhas e elimine a defesa adversária." },
    {
      titulo: "Online Play-to-Play",
      corpo: "Duelos P2P em tempo real com apostas em SOV opcionais — sem robôs, sem simulação: habilidade pura.",
    },
  ],
  MASTER_LIGA: [
    {
      titulo: "Master Liga",
      corpo: "Sua carreira começa na Série C. Cada temporada encerra com promoção, rebaixamento ou crise narrativa.",
    },
    {
      titulo: "Copa do Brasil",
      corpo: "O mata-mata da Cidadela junta as três divisões. Vencer garante glória — e mais decisões no celular.",
    },
  ],
  SOV: [
    { titulo: "SOV — Soberania", corpo: "A moeda da Cidadela. Ganhe em jogos, na carreira, ou no marketplace de pergaminhos." },
    {
      titulo: "Registo financeiro",
      corpo: "Toda transação de SOV é registrada. O Mercado não aceita pagamento em balda — só em soberania.",
    },
  ],
  NARRATIVA: [
    {
      titulo: "O mundo continua",
      corpo: "Você não precisa estar jogando: a Cidadela vive de rumores, apostas e notícias sincronizadas pela IA.",
    },
    {
      titulo: "Memória narrativa",
      corpo: "O sistema lembra. Alguém que você ajudou ontem pode quebrar sua rede de patrocinadores amanhã.",
    },
  ],
  COMUNIDADE: [
    { titulo: "Rede da Cidadela", corpo: "Posts, curtidas e rumores no estilo clássico: cidadão, treinadores e torcedores convocativos." },
    {
      titulo: "Grupo CIDADELA",
      corpo: "O chat do telefone universal junta comunidade e IA: conteúdos e convites aparecem em tempo real.",
    },
  ],
  PUBLICIDADE: [
    { titulo: "Patrocinador da Cidadela", corpo: "Transmissão apoiada por parceiros. Sem deixo: o carregamento continua mesmo sem anuncio." },
    { titulo: "Transmissão apoiada", corpo: "Este espaço é elegante. Se a publicidade falhar, a Cidadela segue funcionando em modo offline." },
  ],
};

/** Conteúdo padrão exibido quando a categoria for pega automaticamente. */
export function selecionarConteudo(categoria?: LoadingCategoria, quantidade = 1): IntroTexto[] {
  const base = categoria ? LOADING_CONTENT[categoria] : Object.values(LOADING_CONTENT).flat();
  const copia = [...base].sort(() => Math.random() - 0.5);
  return copia.slice(0, Math.max(1, quantidade));
}

/** Quantas intros cabem confortavelmente numa duração (≈2.6s por texto). */
export function introsPorDuracao(duracaoMs: number): number {
  return Math.max(1, Math.round(duracaoMs / 2600));
}
