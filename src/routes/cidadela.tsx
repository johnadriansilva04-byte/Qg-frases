import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Target, Dice2, Skull, CircleDot, Gamepad2, Trophy, Smartphone, Crown, Grid3X3, Book, PenTool } from "lucide-react";
import { TrilhaGame } from "@/components/trilha/TrilhaGame";
import { TrilhaLoadingScreen } from "@/components/trilha/TrilhaLoadingScreen";
import { BotaoGame } from "@/components/botao/BotaoGame";
import { LoadingScreen } from "@/components/botao/career/LoadingScreen";
import { CidadelaIntro, PracinhaIntro } from "@/components/CidadelaIntro";
import { CelularConversas } from "@/components/botao/career/CelularConversas";
import { useBotaoAuth } from "@/components/botao/online/useBotaoAuth";
import { InfoModal, InfoButton } from "@/components/InfoModal";
import { armarSponsor } from "@/lib/sponsorGate";
import { SEO_CONTENT } from "@/data/seoContent";
// #BRIO: Importar BibliotecaBRIO e ForjaPalavras
import { BibliotecaBRIO } from "@/components/botao/career/BibliotecaBRIO";
import { ForjaPalavras } from "@/components/botao/career/ForjaPalavras";
// #BRIO: Importar tipos para conversa com Bibliotecária
import type { ConversaCelular } from "@/components/botao/career/types";
import { personagem } from "@/components/botao/career/rpg/personagens";

export const Route = createFileRoute("/cidadela")({
  head: () => ({
    meta: [
      { title: "Cidadela de Jogos | QG Frases" },
      {
        name: "description",
        content:
          "Conheça nossa cidadela de jogos clássicos. Trilha, dado, forca, jogo da velha e muito mais.",
      },
      { property: "og:title", content: "Cidadela de Jogos | QG Frases" },
      {
        property: "og:description",
        content:
          "Conheça nossa cidadela de jogos clássicos. Trilha, dado, forca, jogo da velha e muito mais.",
      },
      { property: "og:url", content: "https://pracinha.online/cidadela" },
      { property: "og:image", content: "https://pracinha.online/og-image.png" },
    ],
  }),
  component: Cidadela,
});

// #BRIO: Adicionar biblioteca e forja ao tipo Game
type Game = "trilha" | "botao" | "dado" | "forca" | "velha" | "snake" | "dama" | "xadrez" | "biblioteca" | "forja" | null;

const GAMES = [
  {
    id: "trilha" as Game,
    label: "Trilha",
    description: "Jogo de estratégia tática",
    icon: Target,
    status: "disponível",
  },
  {
    id: "botao" as Game,
    label: "Futebol de Botão",
    description: "Campeonato com física realista",
    icon: Trophy,
    status: "disponível",
  },
  // #BRIO: Adicionar Biblioteca e Forja como áreas de conhecimento
  {
    id: "biblioteca" as Game,
    label: "Biblioteca",
    description: "Livros, resumos e a Bibliotecária IA",
    icon: Book,
    status: "disponível",
  },
  {
    id: "forja" as Game,
    label: "Forja de Palavras",
    description: "Gerador de textos e correção com IA",
    icon: PenTool,
    status: "disponível",
  },
  {
    id: "dama" as Game,
    label: "Dama",
    description: "Capturas e leitura de tabuleiro",
    icon: Grid3X3,
    status: "em breve",
  },
  {
    id: "xadrez" as Game,
    label: "Xadrez",
    description: "Tática clássica e estratégia",
    icon: Crown,
    status: "em breve",
  },
  {
    id: "dado" as Game,
    label: "Dado Virtual",
    description: "Role o dado da sorte",
    icon: Dice2,
    status: "em breve",
  },
  {
    id: "forca" as Game,
    label: "Jogo da Forca",
    description: "Adivinhe a palavra secreta",
    icon: Skull,
    status: "em breve",
  },
  {
    id: "velha" as Game,
    label: "Jogo da Velha",
    description: "Clássico de estratégia",
    icon: CircleDot,
    status: "em breve",
  },
  {
    id: "snake" as Game,
    label: "Snake",
    description: "Relíquia da Nokia",
    icon: Gamepad2,
    status: "em breve",
  },
];

function Cidadela() {
  const [hydrated, setHydrated] = useState(false);
  const [activeGame, setActiveGame] = useState<Game>(null);
  const [loadingGame, setLoadingGame] = useState<"botao" | "trilha" | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [showPracinha, setShowPracinha] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<"sobre" | "como" | "soberania" | null>(null);
  const { perfil } = useBotaoAuth();

  // Sessão ativa não é persistida: cada login entra com estado limpo.
  useEffect(() => {
    window.localStorage.removeItem("cidadela_active_game");
    const seen = window.localStorage.getItem("cidadela_intro_seen");
    setShowIntro(!seen);
  }, []);

  const handleContinueIntro = () => {
    window.localStorage.setItem("cidadela_intro_seen", "true");
    setShowIntro(false);
    setShowPracinha(true);
  };

  const openModal = (type: "sobre" | "como" | "soberania") => setActiveModal(type);
  const closeModal = () => setActiveModal(null);

  // #BRIO: Adicionar lógica para abrir Biblioteca e Forja
  const handleGameSelect = (game: Game) => {
    if (game === "botao" || game === "trilha") {
      setLoadingGame(game);
      return;
    }
    // #BRIO: Abrir Biblioteca/Forja diretamente (sem loading por enquanto)
    if (game === "biblioteca" || game === "forja") {
      setActiveGame(game);
      return;
    }
    // Jogos em breve não fazem nada
    console.log("Jogo em breve:", game);
  };

  if (!hydrated) {
    return (
      <TrilhaLoadingScreen
        titulo="Carregando Cidadela"
        subtitulo="Sincronizando módulos de estratégia"
        passos={[
          "Limpando sessão anterior...",
          "Preparando jogos...",
          "Carregando conteúdo da Cidadela...",
          "Pronto!",
        ]}
        categoria="COMUNIDADE"
        duracao={2600}
        onCompleto={() => setHydrated(true)}
      />
    );
  }

  if (showIntro) {
    return <CidadelaIntro onContinue={handleContinueIntro} />;
  }

  if (showPracinha) {
    return (
      <PracinhaIntro
        nomeJogador={perfil?.nome}
        onComplete={() => {
          setShowPracinha(false);
          setPhoneOpen(!!perfil?.user_id);
        }}
      />
    );
  }

  if (phoneOpen) {
    // #BRIO: Criar conversa com Bibliotecária para o celular
    const bibliotecaria = personagem("npc-bibliotecaria");
    const conversaBibliotecaria: ConversaCelular = {
      id: "conv-bibliotecaria",
      tipo: "bibliotecaria",
      nome: bibliotecaria.nome,
      avatar: bibliotecaria.avatar,
      cargo: bibliotecaria.cargo,
      npcId: bibliotecaria.id,
      mensagens: [
        {
          id: "msg-1",
          texto: "Bem-vindo à Biblioteca dos Clássicos. O que busca hoje?",
          remetente: "outro",
          timestamp: new Date().toISOString(),
        },
      ],
      naoLida: true,
    };

    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#0f2e24_0%,#020617_55%)]">
        <CelularConversas
          conversas={[conversaBibliotecaria]}
          userId={perfil?.user_id ?? null}
          nomeJogador={perfil?.nome ?? "Recruta"}
          onEnviarMensagem={() => undefined}
          onExcluirConversa={() => undefined}
          onVoltar={() => setPhoneOpen(false)}
        />
      </div>
    );
  }

  if (loadingGame === "botao") {
    return (
      <LoadingScreen
        passos={[
          "Carregando Futebol de Botão...",
          "Sincronizando sua conta com o Supabase...",
          "Inicializando IA Comentarista...",
          "Preparando times...",
          "Pronto!",
        ]}
        categoria="MASTER_LIGA"
        duracao={2600}
        onCompleto={() => {
          setLoadingGame(null);
          setActiveGame("botao");
        }}
      />
    );
  }

  if (loadingGame === "trilha") {
    return (
      <TrilhaLoadingScreen
        categoria="DICAS"
        duracao={2600}
        onCompleto={() => {
          setLoadingGame(null);
          setActiveGame("trilha");
        }}
      />
    );
  }

  if (activeGame === "trilha") {
    return <TrilhaGame onBack={() => setActiveGame(null)} />;
  }

  if (activeGame === "botao") {
    return <BotaoGame onBack={() => setActiveGame(null)} />;
  }

  // #BRIO: Renderizar BibliotecaBRIO
  if (activeGame === "biblioteca") {
    return <BibliotecaBRIO onBack={() => setActiveGame(null)} />;
  }

  // #BRIO: Renderizar ForjaPalavras
  if (activeGame === "forja") {
    return <ForjaPalavras onBack={() => setActiveGame(null)} />;
  }

  return (
    <>
      <div className="flex min-h-screen flex-col items-center gap-4 p-3 md:p-6">
        <main className="painel my-auto w-full max-w-3xl rounded-3xl p-5 shadow-2xl md:p-8">
          <header className="mb-6 text-center">
            <h1 className="texto-marca text-4xl font-black tracking-tight md:text-5xl">
              🏰 Cidadela de Jogos
            </h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground md:text-base">
              Uma cidade de jogos para se divertir e bater recorde
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Jogue clássicos como Trilha, quebre seus recordes e desafie a IA
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <InfoButton onClick={() => openModal("sobre")} label="Sobre a Pracinha" />
              <InfoButton onClick={() => openModal("como")} label="Como Jogar" />
              <InfoButton onClick={() => openModal("soberania")} label="Soberania" />
              <button
                onClick={() => setPhoneOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-400/20"
              >
                <Smartphone className="size-4" />
                Celular da Cidadela
              </button>
            </div>
          </header>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Jogos Disponíveis</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {GAMES.map((game) => {
                const Icon = game.icon;
                const isAvailable = game.status === "disponível";
                return (
                  <button
                    key={game.id}
                    onClick={() => isAvailable && handleGameSelect(game.id)}
                    disabled={!isAvailable}
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all w-full text-left ${
                      isAvailable
                        ? "border-border bg-surface/50 hover:bg-primary/10 hover:border-primary cursor-pointer active:scale-[0.98]"
                        : "border-border/50 bg-surface/30 opacity-60 cursor-not-allowed"
                    }`}
                    style={{ minHeight: "88px" }}
                  >
                    <div
                      className={`p-3 rounded-lg ${isAvailable ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-foreground">{game.label}</h3>
                      <p className="text-sm text-muted-foreground">{game.description}</p>
                      <span
                        className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${
                          isAvailable
                            ? "bg-success/20 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {game.status === "disponível" ? "Disponível" : "Em breve"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>Mais jogos em breve! Fique ligado.</p>
          </div>
        </main>

        {/* Footer com links obrigatórios */}
        <footer className="w-full max-w-3xl text-center">
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <Link to="/privacidade" className="hover:text-primary transition-colors">
              Política de Privacidade
            </Link>
            <span>•</span>
            <Link to="/termos" className="hover:text-primary transition-colors">
              Termos de Uso
            </Link>
          </div>
        </footer>
      </div>

      {/* Modais de Informação */}
      <InfoModal
        isOpen={activeModal === "sobre"}
        onClose={closeModal}
        title="Sobre a Pracinha Online"
        content={SEO_CONTENT.sobrePracinha}
      />
      <InfoModal
        isOpen={activeModal === "como"}
        onClose={closeModal}
        title="Como Jogar"
        content={SEO_CONTENT.comoJogar}
      />
      <InfoModal
        isOpen={activeModal === "soberania"}
        onClose={closeModal}
        title="Economia da Soberania"
        content={SEO_CONTENT.soberania}
      />
    </>
  );
}
