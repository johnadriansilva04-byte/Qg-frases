/**
 * DADOS DOS TOURS POR MÓDULO — Pracinha da FEB.
 *
 * Cada módulo tem seus passos de tour com targets data-tour,
 * títulos e textos curtos em 1ª pessoa (voz do Pracinha).
 *
 * A persistência de conclusão fica em visitedModules no
 * onboarding engine (useOnboarding). Se o módulo já foi
 * visitado, o tour NÃO aparece.
 */

export type TourModule =
  | "futebol"
  | "clube"
  | "amistoso"
  | "amistoso-online"
  | "campeonato-online"
  | "carreira"
  | "teste-qi"
  | "cidadela"
  | "campus";

export interface TourStep {
  alvo?: string;       // data-tour target (real UI element)
  titulo: string;
  texto: string;       // 1ª pessoa — voz do Pracinha
}

/** Mapa de tours por módulo. */
export const PRACINHA_TOURS: Record<TourModule, TourStep[]> = {
  futebol: [
    {
      titulo: "Bem-vindo ao Estádio!",
      texto: "Sou o Pracinha, seu guia aqui na Cidadela. Este é o menu principal do Futebol de Botão — por aqui você acessa todos os modos de jogo.",
    },
    {
      alvo: "perfil",
      titulo: "Seu Clube",
      texto: "Neste card você personaliza seu time: nome, cores, tática e evolução dos botões. Seu time, suas regras.",
    },
    {
      titulo: "Pronto pra jogar?",
      texto: "Escolha um modo e bora pro campo! Estarei por aqui se precisar de ajuda — é só clicar no ícone de suporte.",
    },
  ],

  clube: [
    {
      titulo: "Gestão do Clube",
      texto: "Aqui você administra tudo do seu time. Identidade, tática de campo e evolução dos seus 5 botões jogadores.",
    },
    {
      titulo: "Identidade",
      texto: "Altere nome do treinador, nome do clube, sigla e cores. Salve suas mudanças e elas aparecem em todo o jogo.",
    },
    {
      alvo: "tatica",
      titulo: "Tática de Campo",
      texto: "Escolha uma formação predefinida ou monte a sua com arrastar e soltar. Cada posição afeta o estilo de jogo.",
    },
  ],

  amistoso: [
    {
      titulo: "Amistoso (vs IA)",
      texto: "Partida rápida contra a inteligência artificial. Treine sua tática e evolua seus botões sem pressão.",
    },
    {
      titulo: "Seleção",
      texto: "Escolha o adversário e a dificuldade. O layout VS mostra os times lado a lado antes do jogo.",
    },
  ],

  "amistoso-online": [
    {
      titulo: "Amistoso Online",
      texto: "Partida 1v1 contra jogadores reais em tempo real. Crie uma mesa ou entre usando um código de convite.",
    },
    {
      titulo: "Criar Mesa",
      texto: "Defina a aposta em SOV e, se quiser, uma data de liberação. Compartilhe o link com seu adversário.",
    },
    {
      titulo: "Entrar numa Mesa",
      texto: "Veja as mesas abertas na coluna da direita e clique 'Entrar'. A partida começa quando os dois estão prontos.",
    },
  ],

  "campeonato-online": [
    {
      titulo: "Campeonato Online",
      texto: "Torneios com múltiplos jogadores: Mata-Mata (eliminação) ou Pontos Corridos. Crie salas e dispute o título.",
    },
    {
      titulo: "Criar Sala",
      texto: "Escolha o formato, quantidade de jogadores e o prêmio em SOV. Compartilhe o código para preencher as vagas.",
    },
    {
      titulo: "Bracket Visual",
      texto: "No Mata-Mata, acompanhe o chaveamento em tempo real. Vencedores avançam automaticamente até a final.",
    },
  ],

  carreira: [
    {
      titulo: "Modo Carreira",
      texto: "Sua jornada como treinador: comece em clubes pequenos, suba de divisão e conquiste títulos. Tudo com narrativa dinâmica.",
    },
    {
      titulo: "Entrada Triunfal",
      texto: "Escolha entre 3 propostas de clubes aleatórias. Cada um tem orçamento, torcida e expectativas diferentes.",
    },
    {
      titulo: "Dashboard do Treinador",
      texto: "Seu painel central: próximo confronto, calendário, tabela, economia e mercado de transferências. Tudo em cards clicáveis.",
    },
    {
      titulo: "Celular do Treinador",
      texto: "Notícias da diretoria, propostas de transferência e eventos narrativos chegam pelo celular. Fique de olho nas notificações.",
    },
  ],

  "teste-qi": [
    {
      titulo: "Teste de QI",
      texto: "Avaliação de raciocínio não verbal com figuras matriciais. Não é um teste oficial — é uma referência interna da Cidadela.",
    },
    {
      titulo: "Exercícios",
      texto: "Pratique no seu ritmo. O motor gera matrizes novas a cada vez e explica as regras ocultas após cada resposta.",
    },
    {
      titulo: "Simulação",
      texto: "A prova cronometrada: 32 questões, 25 minutos, sem feedback. Ao final, veja seu resultado experimental.",
    },
  ],

  cidadela: [
    {
      titulo: "Cidadela dos Clássicos",
      texto: "Este é o coração da plataforma. Aqui você acessa todas as profissões, atividades e o mercado da cidade.",
    },
    {
      titulo: "Escolha sua Profissão",
      texto: "Estudante, Técnico, Empresário, Bibliotecário ou Pesquisador. Cada profissão tem atividades e recompensas próprias.",
    },
    {
      titulo: "Reputação",
      texto: "Suas ações constroem reputação. Quanto maior, mais oportunidades e conteúdo desbloqueia na Cidadela.",
    },
  ],

  campus: [
    {
      titulo: "Campus Universitário",
      texto: "O centro de atividades acadêmicas. Aqui você estuda, pesquisa e interage com outros cidadãos.",
    },
    {
      titulo: "Atividades Diárias",
      texto: "Novas atividades aparecem todo dia, conectando diferentes profissões. Complete-as para ganhar SOV e reputação.",
    },
  ],
};
