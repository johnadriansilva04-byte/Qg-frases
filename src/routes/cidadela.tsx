import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Target, Trophy, Crown, Grid3X3, IdCard } from "lucide-react";
import { TrilhaGame } from "@/components/trilha/TrilhaGame";
import { TrilhaLoadingScreen } from "@/components/trilha/TrilhaLoadingScreen";
import { BotaoGame } from "@/components/botao/BotaoGame";
import { ConviteMesaScreen } from "@/components/botao/online/ConviteMesaScreen";
import { OnboardingGate } from "@/components/cidadela/OnboardingGate";
import { TourContextual, type PassoTour } from "@/components/cidadela/TourContextual";
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
import { useCelularCarreira } from "@/hooks/useCelularCarreira";
import { missoesTrilha } from "@/components/botao/career/trilhaIntegracao";
import { BolsaResumoCard } from "@/components/financial/BolsaResumoCard";

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
  // §11-§13: convite de mesa via link direto (?mesa=mesa_xxx) — abre o fluxo
  // do convidado (3 propostas de clube + cadastro rápido), nunca cai no hub.
  // §link-camp: convite de campeonato (?camp=CAMP-...) — mesma lógica.
  const [conviteMesaId, setConviteMesaId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("mesa");
  });
  const [conviteCampCodigo, setConviteCampCodigo] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("camp");
  });
  const passosTour: PassoTour[] =
    activeGame === "botao" ? PASSOS_TOUR_FUTEBOL : activeGame === "trilha" ? PASSOS_TOUR_TRILHA : [];
  const [loadingGame, setLoadingGame] = useState<"botao" | "trilha" | null>(null);
  const [activeModal, setActiveModal] = useState<"sobre" | "como" | "soberania" | null>(null);
  const [perfilCidadela, setPerfilCidadela] = useState<CidadelaPerfil | null>(null);
  const [mostrarProfissoes, setMostrarProfissoes] = useState(false);
  const { perfil } = useBotaoAuth();
  // Celular central: carreira + handlers vêm do hook único (mesma fiação do
  // Modo Carreira — responder/escolher/excluir persistem no Supabase).
  const {
    career,
    saldoSov,
    onEnviarMensagem: handleEnviarMensagemCelular,
    onEscolhaRpg: handleEscolhaRpgCelular,
    onExcluirConversa: handleExcluirConversaCelular,
    onRegistrarPosicao: handleRegistrarPosicaoCelular,
  } = useCelularCarreira(perfil?.user_id ?? null, perfil);

  // Identidade na Cidadela: carrega a profissão do jogador autenticado.
  useEffect(() => {
    const uid = perfil?.user_id;
    if (!uid) {
      setPerfilCidadela(null);
      return;
    }
    let vivo = true;
    void carregarPerfilCidadela(uid).then((p) => {
      if (vivo) setPerfilCidadela(p);
    });
    return () => {
      vivo = false;
    };
  }, [perfil?.user_id]);

  // Sessão ativa da ABA: o jogo aberto (Estádio/Trilha) sobrevive a F5 via
  // sessionStorage (por aba) — uma aba/login novo sempre entra com estado
  // limpo. Chave antiga em localStorage é removida de vez.
  const JOGO_ATIVO_KEY = "cidadela:jogo-ativo:v1";
  useEffect(() => {
    window.localStorage.removeItem("cidadela_active_game");
    try {
      const salvo = window.sessionStorage.getItem(JOGO_ATIVO_KEY);
      if (salvo === "botao" || salvo === "trilha") setActiveGame(salvo);
    } catch {
      /* storage indisponível */
    }
  }, []);

  useEffect(() => {
    try {
      if (activeGame) window.sessionStorage.setItem(JOGO_ATIVO_KEY, activeGame);
      else window.sessionStorage.removeItem(JOGO_ATIVO_KEY);
    } catch {
      /* storage indisponível */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGame]);

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
    // Futebol entra DIRETO na tela principal do jogo — a verificação de sessão
    // e o auto-login acontecem dentro do BotaoGame (sem loading duplicado).
    if (game === "botao") {
      setActiveGame("botao");
      return;
    }
    if (game === "trilha") {
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

  // REMOVIDO: Loading inicial da Cidadela (F5)
  // Só mostra loading ao entrar em jogos específicos
  if (!hydrated) {
    setHydrated(true);
  }

  // §11-§13: link de convite de mesa — o convidado escolhe o clube e entra.
  // Jogador JÁ autenticado pula o convite: vai direto para a mesa.
  if (conviteMesaId) {
    if (perfil?.user_id) {
      const mesaAlvo = conviteMesaId;
      return (
        <BotaoGame
          mesaConviteInicial={mesaAlvo}
          onBack={() => setConviteMesaId(null)}
        />
      );
    }
    return (
      <ConviteMesaScreen
        mesaId={conviteMesaId}
        onPronto={() => {
          // Conta criada + associada: entra DIRETO na mesa (link específico),
          // nunca no hub genérico.
          setActiveGame("botao");
        }}
        onCancelar={() => setConviteMesaId(null)}
      />
    );
  }

  // §link-camp: link direto do campeonato — o convidado cai direto na sala.
  if (conviteCampCodigo) {
    if (perfil?.user_id) {
      return (
        <BotaoGame
          campCodigoInicial={conviteCampCodigo}
          onBack={() => setConviteCampCodigo(null)}
        />
      );
    }
    return (
      <ConviteMesaScreen
        codigoCampeonato={conviteCampCodigo}
        modo="campeonato"
        onPronto={() => {
          setActiveGame("botao");
        }}
        onCancelar={() => setConviteCampCodigo(null)}
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
        extras={<BolsaResumoCard bolsa={career?.bolsa} />}
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
              SOV
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
        title="Economia SOV"
        content={SEO_CONTENT.soberania}
      />

      {/* Celular fixo no cantinho da tela — componente central, mesmos
          handlers do Modo Carreira (responder/escolher/excluir persistem). */}
      <CelularFixo
        userId={perfil?.user_id ?? null}
        nomeJogador={career?.coach.apelido || career?.coach.nome || perfil?.nome || null}
        perfilCidadela={perfilCidadela}
        conversas={career?.conversas ?? []}
        desafioPatrocinador={career?.desafioPatrocinador ?? null}
        feed={career?.feedCidadela ?? []}
        trilhaMissoes={career ? missoesTrilha(career) : []}
        onEnviarMensagem={handleEnviarMensagemCelular}
        onExcluirConversa={handleExcluirConversaCelular}
        onEscolhaRpg={handleEscolhaRpgCelular}
        onRegistrarPosicao={handleRegistrarPosicaoCelular}
        historia={career?.historia}
        naoLidas={career?.conversas?.filter((c) => c.naoLida).length ?? 0}
        saldoSov={saldoSov}
        clube={
          career
            ? {
                nome: perfil?.time_personalizado || "Clube",
                caixa: career.clubeCaixa ?? 0,
                extrato: career.clubeExtrato ?? [],
              }
            : undefined
        }
        bolsa={career?.bolsa}
        statsCarreira={
          career
            ? {
                decisoes:
                  (career.historia?.ledger.length ?? 0) +
                  (Array.isArray(career.ultimasEscolhas) ? career.ultimasEscolhas.length : 0),
                entrevistas: Array.isArray(career.entrevistas) ? career.entrevistas.length : 0,
              }
            : undefined
        }
      />

      {/* Tour contextual: bolhas ancoradas nos elementos reais do módulo
          escolhido (TRILHA/FUTEBOL). O hub NÃO tem tour — o usuário escolhe
          o módulo antes (§4-§7 do prompt mestre). */}
      <TourContextual userId={perfil?.user_id ?? null} passos={passosTour} />
    </>
  );
}

const PASSOS_TOUR_FUTEBOL: PassoTour[] = [
  { alvo: "perfil", titulo: "Meu Clube / Conta", texto: "Aqui você entra na sua conta e personaliza seu time: cores, tática e nomes dos botões." },
  { alvo: "carreira", titulo: "Carreira no Campus", texto: "Aqui fica a sua carreira: partidas do Brasileirão, Copa do Brasil, classificação e economia." },
  { alvo: "trofeus", titulo: "Sala de troféus", texto: "Seus títulos e conquistas ficam guardados aqui." },
  { alvo: "celular", titulo: "Seu celular", texto: "Mensagens do clube, recompensas em SOV, missões e notícias chegam aqui." },
];
const PASSOS_TOUR_TRILHA: PassoTour[] = [
  { alvo: "trilha-trofeus", titulo: "Troféus da Trilha", texto: "Suas conquistas na Trilha e o progresso do capítulo ficam aqui." },
  { alvo: "celular", titulo: "Seu celular", texto: "Mensagens, recompensas em SOV e missões chegam aqui — o mesmo celular de todo o jogo." },
];

// OnboardingGate: tour obrigatório do iniciante antes do hub (§2).
function Cidadela() {
  return (
    <OnboardingGate destinoInicial="cidadela">
      <CidadelaCompView />
    </OnboardingGate>
  );
}
