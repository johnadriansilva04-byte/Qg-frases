import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Target, Trophy, Crown, Grid3X3, IdCard } from "lucide-react";
import { TrilhaGame } from "@/components/trilha/TrilhaGame";
import { TrilhaLoadingScreen } from "@/components/trilha/TrilhaLoadingScreen";
import { BotaoGame } from "@/components/botao/BotaoGame";
import { LoadingScreen } from "@/components/botao/career/LoadingScreen";
import { OnboardingGate } from "@/components/cidadela/OnboardingGate";
import { CidadelaEmblem } from "@/components/CidadelaBranding";
import { CelularFixo } from "@/components/CelularFixo";
import { ProfissaoSelect } from "@/components/cidadela/ProfissaoSelect";
import { CampusHub } from "@/components/campus/CampusHub";
import { EmpresarioHub } from "@/components/comercial/EmpresarioHub";
import { LaboratorioHub } from "@/components/laboratorio/LaboratorioHub";
import { useBotaoAuth } from "@/components/botao/online/useBotaoAuth";
import { InfoModal } from "@/components/InfoModal";
import { SEO_CONTENT } from "@/data/seoContent";
import {
  carregarPerfilCidadela,
  escolherProfissao,
  profissaoById,
  type CidadelaPerfil,
  type ProfissaoId,
} from "@/lib/cidadela/profissoes";
import { loadCareerFromSupabase } from "@/components/botao/career/careerRemote";
import { garantirContatosRpg } from "@/components/botao/career/rpg/rpgEngine";
import type { CareerState } from "@/components/botao/career/types";

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
type Game =
  | "trilha"
  | "dado"
  | "forca"
  | "jogodavelha"
  | "botao"
  | "online"
  | "campeonato"
  | "campus"
  | "comercial"
  | "laboratorio"
  | null;

const GAMES = [
  {
    id: "botao" as Game,
    label: "Futebol",
    description: "Estádio do Campus",
    icon: Trophy,
    status: "disponível",
  },
  {
    id: "trilha" as Game,
    label: "Trilha",
    description: "Estratégia",
    icon: Target,
    status: "disponível",
  },
  {
    id: "xadrez" as Game,
    label: "Xadrez",
    description: "Tática clássica",
    icon: Crown,
    status: "em breve",
  },
  {
    id: "dama" as Game,
    label: "Dama",
    description: "Capturas",
    icon: Grid3X3,
    status: "em breve",
  },
];

function CidadelaCompView() {
  const [hydrated, setHydrated] = useState(false);
  const [activeGame, setActiveGame] = useState<Game>(null);
  const [loadingGame, setLoadingGame] = useState<"botao" | "trilha" | null>(null);
  const [activeModal, setActiveModal] = useState<"sobre" | "como" | "soberania" | null>(null);
  const [perfilCidadela, setPerfilCidadela] = useState<CidadelaPerfil | null>(null);
  const [mostrarProfissoes, setMostrarProfissoes] = useState(false);
  const [career, setCareer] = useState<CareerState | null>(null);
  const { perfil } = useBotaoAuth();

  // Identidade na Cidadela: carrega a profissão do jogador autenticado.
  useEffect(() => {
    const uid = perfil?.user_id;
    if (!uid) {
      setPerfilCidadela(null);
      setCareer(null);
      return;
    }
    let vivo = true;
    void carregarPerfilCidadela(uid).then((p) => {
      if (vivo) setPerfilCidadela(p);
    });
    // Carrega também a carreira para ter as conversas do celular
    void loadCareerFromSupabase(uid).then((c) => {
      if (vivo && c) {
        setCareer(garantirContatosRpg(c));
      }
    }).catch(() => {
      // Sem carreira = celular vazio (normal para novos usuários)
    });
    return () => {
      vivo = false;
    };
  }, [perfil?.user_id]);

  // Sessão ativa não é persistida: cada login entra com estado limpo.
  useEffect(() => {
    window.localStorage.removeItem("cidadela_active_game");
  }, []);

  const handleEscolherProfissao = async (profissao: ProfissaoId) => {
    const uid = perfil?.user_id;
    if (!uid) return;
    const atualizado = await escolherProfissao(uid, profissao);
    setPerfilCidadela(atualizado);
    setMostrarProfissoes(false);
  };

  const openModal = (type: "sobre" | "como" | "soberania") => setActiveModal(type);
  const closeModal = () => setActiveModal(null);

  const handleGameSelect = (game: Game) => {
    if (game === "botao" || game === "trilha") {
      setLoadingGame(game);
      return;
    }
    if (game === "campus" || game === "comercial" || game === "laboratorio") {
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

  // Portão de identidade: jogador autenticado sem profissão escolhe quem é
  // na Cidadela antes de seguir. Pode ser reaberto pelo botão "Profissão".
  if (
    perfilCidadela &&
    perfil?.user_id &&
    (mostrarProfissoes || !perfilCidadela.profissao_atual)
  ) {
    return (
      <ProfissaoSelect
        perfil={perfilCidadela}
        nomeJogador={perfil?.nome}
        onEscolher={handleEscolherProfissao}
      />
    );
  }

  if (loadingGame === "botao") {
    return (
      <LoadingScreen
        passos={[
          "Abrindo o Estádio do Campus...",
          "Sincronizando sua conta com o Supabase...",
          "Inicializando IA Comentarista...",
          "Preparando o Campeonato do Campus...",
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

  if (activeGame === "campus") {
    return (
      <CampusHub
        userId={perfil?.user_id ?? null}
        perfil={perfilCidadela}
        onPerfilAtualizado={setPerfilCidadela}
        onVoltar={() => setActiveGame(null)}
      />
    );
  }

  if (activeGame === "comercial") {
    return (
      <EmpresarioHub
        userId={perfil?.user_id ?? null}
        perfil={perfilCidadela}
        onPerfilAtualizado={setPerfilCidadela}
        onVoltar={() => setActiveGame(null)}
      />
    );
  }

  if (activeGame === "laboratorio") {
    return (
      <LaboratorioHub
        userId={perfil?.user_id ?? null}
        perfil={perfilCidadela}
        onPerfilAtualizado={setPerfilCidadela}
        onVoltar={() => setActiveGame(null)}
      />
    );
  }

  if (activeGame === "botao") {
    return <BotaoGame onBack={() => setActiveGame(null)} />;
  }

  return (
    <>
      <div className="flex min-h-screen flex-col items-center gap-4 p-3 md:p-6">
        <main className="painel my-auto w-full max-w-3xl rounded-3xl p-5 shadow-2xl md:p-8">
          <header className="mb-6 flex flex-col items-center text-center">
            <CidadelaEmblem className="mb-3 h-16 w-16 drop-shadow-lg md:h-20 md:w-20" />
            <h1 className="texto-marca text-4xl font-black tracking-tight md:text-5xl">
              Cidadela dos Clássicos
            </h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground md:text-base">
              Jogos do Campus
            </p>
            {perfilCidadela?.profissao_atual && (
              <div className="mt-3">
                <button
                  onClick={() => setMostrarProfissoes(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-400/20"
                >
                  <IdCard className="size-4" />
                  {profissaoById(perfilCidadela.profissao_atual)?.nome ?? "Profissão"} · Nv.{" "}
                  {perfilCidadela.nivel_cidadela}
                </button>
              </div>
            )}
          </header>

          {/* Acontecimentos/notificações chegam ao celular (§1) — Cidadela limpa. */}

          <div className="mb-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {GAMES.map((game) => {
                const Icon = game.icon;
                const isAvailable = game.status === "disponível";
                return (
                  <button
                    key={game.id}
                    onClick={() => isAvailable && handleGameSelect(game.id)}
                    disabled={!isAvailable}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all w-full text-left ${
                      isAvailable
                        ? "border-border bg-surface/50 hover:bg-primary/10 hover:border-primary cursor-pointer active:scale-[0.98]"
                        : "border-border/50 bg-surface/30 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${isAvailable ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-sm">{game.label}</h3>
                      <p className="text-xs text-muted-foreground">{game.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </main>

        {/* Footer com links obrigatórios */}
        <footer className="w-full max-w-3xl text-center">
          <div className="mb-3 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
            <button onClick={() => openModal("sobre")} className="hover:text-primary transition-colors">
              Sobre a Pracinha
            </button>
            <span>•</span>
            <button onClick={() => openModal("como")} className="hover:text-primary transition-colors">
              Como Jogar
            </button>
            <span>•</span>
            <button onClick={() => openModal("soberania")} className="hover:text-primary transition-colors">
              Soberania
            </button>
          </div>
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
        title="Economia de Soberania"
        content={SEO_CONTENT.soberania}
      />

      {/* Celular fixo no cantinho da tela */}
      <CelularFixo
        userId={perfil?.user_id ?? null}
        nomeJogador={perfil?.nome ?? null}
        perfilCidadela={perfilCidadela}
        conversas={career?.conversas ?? []}
        feed={career?.feedCidadela ?? []}
      />
    </>
  );
}

// OnboardingGate: tour obrigatório do iniciante antes do hub (§2).
function Cidadela() {
  return (
    <OnboardingGate destinoInicial="cidadela">
      <CidadelaCompView />
    </OnboardingGate>
  );
}
