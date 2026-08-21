import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Trophy,
  Swords,
  Medal,
  Lock,
  Shuffle,
  ChevronRight,
  Globe,
  Trash2,
  Calendar,
  UserCircle,
  ArrowLeft,
} from "lucide-react";
import { TEAMS, teamByIdSync, createCustomTeam, getAllTeams, type Team } from "./data/teams";
import { useAdManager } from "@/lib/adManager";
import { adManager } from "@/lib/adManager";
import {
  DIFFICULTIES,
  type Difficulty,
  type Fixture,
  type MatchResult,
  type Tournament,
} from "./types";
import {
  isUnlocked,
  loadProgress,
  saveProgress,
  saveProgressToSupabase,
  loadProgressFromSupabase,
  deleteProgressFromSupabase,
  deleteProgressLocal,
  saveTournament,
  loadTournament,
  deleteTournamentLocal,
  saveTournamentToSupabase,
  adicionarPontosVideo,
  type Progress,
} from "./storage";
import {
  advanceKnockout,
  applyResult,
  buildKnockout,
  nextUserFixture,
  shuffle,
  simulateMatch,
  sortTable,
} from "./tournament";
import { MatchView } from "./components/MatchView";
import { MatchEndScreen, type MatchEndData } from "./components/MatchEndScreen";
import { EntrevistaColetiva } from "./components/EntrevistaColetiva";
import { TeamPicker, TeamBadge } from "./components/TeamPicker";
// Tela de auth separada REMOVIDA: login mora só em módulos (celular do
// OnboardingTour, CelularConversas) e no hub ("Meu Clube / Conta").
import { OnlineMatchV3 } from "./components/OnlineMatchV3";
import { OnlineChampionship } from "./components/OnlineChampionship";
import { useBotaoAuth } from "./online/useBotaoAuth";
import type { Perfil } from "./online/auth";
import { CoachSetup } from "./career/CoachSetup";
import { ProfileSetup } from "./career/ProfileSetup";
import { ChoiceModal } from "./career/ChoiceModal";
import { SubornoStory } from "./career/SubornoStory";
import { ClassificacaoScreen } from "./career/ClassificacaoScreen";
import { EconomiaScreen } from "./career/EconomiaScreen";
import { CalendarView } from "./career/CalendarView";
import {
  gerarCopaBrasil,
  resolveTeam,
  proximoJogoCopa,
  copaDisponivelNaRodada,
  advanceCopaBrasil,
  avaliarFimTemporada,
  iniciarNovaTemporada,
  chegouAoPrimeiroLugar,
  type VereditoTemporada,
} from "./career/competitionApi";
import {
  NARRATIVA_INICIAL,
  gerarNarrativa,
  cenaDaNarrativa,
  avancarNarrativa,
  deveGerarNarrativa,
  tituloDesfecho,
  type NarrativaEscolha,
} from "./career/narrativeEngine";
import { NarrativeModal } from "./career/NarrativeModal";
import { CelularConversas } from "./career/CelularConversas";
import { CelularFixo } from "@/components/CelularFixo";
import {
  aplicarEscolhaRpg,
  atualizarSequenciaRpg,
  garantirContatosRpg,
  processarEventosRpg,
  responderContatoNpc,
} from "./career/rpg/rpgEngine";
import { PERSONAGENS } from "./career/rpg/personagens";
import { eventoPorId } from "./career/rpg/eventos";
import {
  criarPedidoCartorio,
  type CartorioTipo,
} from "./career/rpg/cartorioApi";
import { anexarPost, gerarPostManual, gerarPostPartida } from "./career/rpg/socialEngine";
import { obterSaldoSov, registrarTransacaoSov } from "@/lib/financial/sovApi";
import { atualizarPerfilClube } from "@/lib/botao/api";
import {
  aplicarRitualNaCarreira,
  consumirRitualPendente,
  convidarRitualTrilha,
  missoesTrilha,
} from "./career/trilhaIntegracao";
import { CareerIntro } from "./career/CareerIntro";
import { precoClube } from "./career/marketplaceClubes";
import {
  comprarCota,
  venderCota,
  processarDividendosProprietario,
  listarClubesProprietario,
  patrimonioParticipacoes,
  podeComprarCota,
} from "./career/propriedadeEngine";
import { CareerHub } from "./career/CareerHub";
import { CareerMenu } from "./career/CareerMenu";
import { PropriedadeScreen } from "./career/PropriedadeScreen";
import { LoadingScreen } from "./career/LoadingScreen";
import { AIService } from "./ai/AIService";
import { relatorioMedico, redesSociaisRodada } from "./ai/aiContent";
import { tocarSom } from "@/lib/notificacao";
import { textoEventoGrupo, postarEventoNoGrupo, type EventoGrupo } from "@/lib/cidadela/grupoCidadao";
import {
  consequenciasEntrevista,
  registrarEntrevista,
  type DadosEntrevista,
} from "./career/entrevistaEngine";
import {
  processarGatilhoEntrevista,
  registrarPosicaoFinal,
} from "./career/historia/historiaEngine";
import type { PosicaoFinal } from "./career/historia/types";
import {
  comprarAtivo,
  custoCompra,
  evoluirBolsa,
  garantirBolsa,
  pagarDividendos,
  venderAtivo,
} from "./career/bolsaEngine";
import {
  SUBORNO_INICIAL,
  deveOfertarSuborno,
  iniciarOferta,
  avancarSuborno,
  type SubornoEscolha,
} from "./career/subornoEngine";
import {
  EMPTY_CAREER,
  loadCareer,
  saveCareer,
  addHeadlines,
  deleteCareer,
} from "./career/careerStorage";
import { gerarManchetesDaRodada, manchetesDeEstreia } from "./career/newsGenerator";
import { sortearEvento, CHOICE_EVENTS, remetenteDecisao } from "./career/choicesEngine";
import { anexarConversa } from "./career/conversasEngine";
import { gerarDesafioPatrocinador, cumpriuDesafio } from "./career/patrocinadorEngine";
import {
  POINTS,
  type AtivoId,
  type CareerState,
  type Choice,
  type ConversaCelular,
  type DeclaracaoEntrevista,
  type Divisao,
  type EntrevistaRegistro,
  type Headline,
} from "./career/types";
import { TitleCeremony } from "./career/TitleCeremony";
import { LeaderboardTreinadores } from "./career/LeaderboardTreinadores";
import { formacaoById } from "./career/formacoes";
import {
  loadCareerFromSupabase,
  saveCareerToSupabase,
  aplicarResultadoRemoto,
  aplicarFimCampanhaRemoto,
  registrarTemporadaRemota,
  registrarPartidaRemota,
  finalizarTemporadaRemota,
  registrarEventoCarreiraRemoto,
} from "./career/careerRemote";
import {
  composicoesIniciais,
  criarLigasDaTemporada,
  ligasConcluidas,
  processarResultadoTemporada,
  resumoTemporada,
  simularRodadaDivisoes,
  type LigasTemporada,
} from "./career/seasonEngine";
import {
  aplicarRodadaTorcida,
  aplicarTitulosDaTemporada,
  formaDoJogador,
  forcasDaTemporada,
  garantirTorcidaUniverso,
} from "./career/torcidaIntegracao";
import { SeasonEndScreen } from "./career/SeasonEndScreen";
import { registrarEventoMissao } from "@/lib/cidadela/pracinhaCore";
import { carregarPerfilCidadela } from "@/lib/cidadela/profissoes";
import type { CidadelaPerfil } from "@/lib/cidadela/profissoes";

type Screen =
  | "menu"
  | "profile"
  | "career-menu"
  | "career-intro"
  | "friendly-setup"
  | "friendly-match"
  | "online"
  | "online-championship"
  | "coach-setup"
  | "tournament-setup"
  | "hub"
  | "classificacao"
  | "calendario"
  | "economia"
  | "propriedade"
  | "tournament-match"
  | "match-end"
  | "trophies";

interface BotaoGameProps {
  onBack?: () => void;
}

/** Chave do resume pós-F5 (sessionStorage, por aba e por usuário). */
const RESUME_KEY = "botao:resume:v1";
/** Noop estável (identidade congelada) para o onCompleto do splash de auth. */
const noop = () => {};
/** Telas seguras para restaurar após F5 (partidas em andamento não entram). */
const TELAS_RESTAURAVEIS: Screen[] = [
  "hub",
  "career-menu",
  "classificacao",
  "calendario",
  "economia",
  "trophies",
  "profile",
];

/**
 * Bônus SOV do campeão: entre +100 e +200. A base é 100 e somamos até
 * 100 de bônus conforme a dificuldade (amador 0, profissional 50, lenda 100).
 */
function bonusCampeao(dificuldade: Difficulty): number {
  const bonus = dificuldade === "lenda" ? 100 : dificuldade === "profissional" ? 50 : 0;
  return POINTS.CAMPEAO_BASE + bonus;
}

export function BotaoGame({ onBack }: BotaoGameProps = {}) {
  const { perfil, carregando, logout, aplicarPerfil, recarregar } = useBotaoAuth();
  const [screen, setScreen] = useState<Screen>("menu");
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [allTeams, setAllTeams] = useState<Team[]>(TEAMS);
  const [emPartidaOnline, setEmPartidaOnline] = useState(false);
  const [tour, setTour] = useState<Tournament | null>(() => loadTournament());
  const [career, setCareer] = useState<CareerState | null>(() => {
    const c = loadCareer();
    return c ? garantirContatosRpg(c) : c;
  });
  // NPC respondendo no celular (conversaId) — exibe "digitando...".
  const [npcDigitando, setNpcDigitando] = useState<string | null>(null);
  const hydratedUserRef = useRef<string | null>(null);
  const [showCeremony, setShowCeremony] = useState(false);
  const [ceremonyBonus, setCeremonyBonus] = useState(0);
  // Veredito de fim de temporada (continua/Game Over). Quando presente, exibe
  // a SeasonEndScreen animada por cima de tudo. Também é DERIVADO das ligas
  // concluídas na hidratação — F5 no fim da temporada não trava a carreira.
  const [veredito, setVeredito] = useState<VereditoTemporada | null>(null);
  // Saldo REAL de SOV (user_wallets via bank_ledger) — barra de status do
  // celular. O remoto é autoritativo; o cache da carreira cobre o instante
  // entre a partida e a confirmação do ledger.
  const [saldoSovRemoto, setSaldoSovRemoto] = useState<number | null>(null);
  // Fixture de copa ativa (para distinguir do fixture de liga no finishTournament).
  const [currentCopaFix, setCurrentCopaFix] = useState<Fixture | null>(null);
  // Dados da tela de fim de jogo (estatísticas + monetização discreta).
  const [matchEnd, setMatchEnd] = useState<MatchEndData | null>(null);
  // Tela de destino do botão "Continuar" da tela de fim de jogo.
  const [matchEndDestino, setMatchEndDestino] = useState<Screen>("menu");
  // Entrevista de patrocínio pós-jogo (abre após o usuário confirmar o anúncio).
  const [entrevistaAberta, setEntrevistaAberta] = useState(false);
  // Idempotência do patrocínio: guarda o partidaId cuja recompensa JÁ foi paga.
  // Impede que o fluxo de anúncio pague 2x ao retornar ao jogo.
  const [patrocinioPagoPartida, setPatrocinioPagoPartida] = useState<string | null>(null);
  // Tela de carregamento (splash) controlada por contexto: inicia de carreira,
  // entrada em campo, consultas ao Supabase e inicialização da IA.
  const [loading, setLoading] = useState(false);
  const [loadingReady, setLoadingReady] = useState(true);
  const [loadingOnComplete, setLoadingOnComplete] = useState<() => void>(() => () => {});
  const [perfilCidadela, setPerfilCidadela] = useState<CidadelaPerfil | null>(null);

  // Detecta se foi refresh direto (F5) vs navegação normal
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Marca que foi refresh direto (F5 ou recarregar página)
      sessionStorage.setItem("botao:refresh", Date.now().toString());
    };
    
    const handlePageShow = (e: PageTransitionEvent) => {
      // Se o evento persisted é true, foi cache do navegador (back/forward)
      // Se não, foi refresh direto ou nova navegação
      if (e.persisted) {
        console.log("[BotaoGame] Navegação via cache (back/forward)");
      } else {
        const refreshTime = sessionStorage.getItem("botao:refresh");
        if (refreshTime && Date.now() - parseInt(refreshTime) < 2000) {
          console.log("[BotaoGame] Refresh direto detectado (F5)");
          sessionStorage.removeItem("botao:refresh");
        }
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pageshow", handlePageShow);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  // Inicializa AdManager para rota /botao (Adsterra)
  const { init: initAdManager, markFirstGamePlayed } = useAdManager("/botao");

  useEffect(() => {
    initAdManager();
    return () => {
      // Limpa apenas scripts da Adsterra ao sair do módulo
      adManager.cleanupAdsterra();
    };
  }, [initAdManager]);

  // Debug: permite visualizar a cerimônia via ?debug_ceremony=1
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      new URLSearchParams(window.location.search).get("debug_ceremony") === "1" &&
      career?.coach.nome
    ) {
      setCeremonyBonus(POINTS.CAMPEAO_BASE + POINTS.CAMPEAO_BONUS_MAX);
      setShowCeremony(true);
    }
  }, [career?.coach.nome]);

  // Carregar times do banco de dados ao montar
  useEffect(() => {
    let mounted = true;
    getAllTeams()
      .then((teams) => {
        if (mounted && teams.length > 0) {
          setAllTeams(teams);
        }
      })
      .catch(() => {
        // Silenciosamente usar times padrão em caso de erro
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Inicializa a IA central (detecção de hardware + pré-carga do WebLLM se
  // potente). Não bloqueia a UI — roda em background. Zero crash: se falhar,
  // o Motor de Templates Procedurais assume automaticamente.
  useEffect(() => {
    AIService.init().catch(() => {});
  }, []);

  // Ritual da Trilha (mesmo universo): se a TrilhaGame marcou um resultado
  // pendente, consumir e integrar na carreira — SOV, sombra, feed social.
  // Checa na montagem e ao voltar o foco (ex.: usuário voltou da aba da Trilha).
  const careerRef = useRef<CareerState | null>(null);
  const perfilRef = useRef<Perfil | null>(null);
  useEffect(() => {
    careerRef.current = career;
    perfilRef.current = perfil;
  }, [career, perfil]);

  useEffect(() => {
    const consumir = () => {
      const pendente = consumirRitualPendente();
      if (!pendente) return;
      const atual = careerRef.current;
      if (!atual) return;
      const { career: novo, resumo, deltaSov } = aplicarRitualNaCarreira(atual, pendente.resultado);
      // Ritual da Trilha move SOV: registra no Banco Central (module 'rpg') ANTES de persistir.
      const uidRitual = perfilRef.current?.user_id;
      if (deltaSov !== 0 && uidRitual) {
        void registrarTransacaoSov(
          uidRitual,
          deltaSov,
          deltaSov > 0 ? "reward" : "penalty",
          "Ritual da Trilha — integração de carreira",
          "rpg",
          { ritual: pendente.resultado },
        );
      }
      persistCareer(novo);
      setToast(resumo);
    };
    consumir();
    window.addEventListener("focus", consumir);
    document.addEventListener("visibilitychange", consumir);
    return () => {
      window.removeEventListener("focus", consumir);
      document.removeEventListener("visibilitychange", consumir);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A tela atual fica apenas em memória; nunca restaura estado de outra sessão.

  // Time personalizado vem exclusivamente do perfil autenticado no Supabase.
  const customTeamData = useMemo(() => {
    return {
      nome: perfil?.time_personalizado ?? "Meu Time",
      short: perfil?.abreviacao_time ?? "MTI",
      primary: perfil?.cores?.[0] ?? "#FF0000",
      secondary: perfil?.cores?.[1] ?? "#00FF00",
      botoesNomes: perfil?.botoes_nomes ?? undefined,
    };
  }, [perfil]);

  // Nota: O time personalizado é carregado automaticamente via customTeamData useMemo
  // que depende dos dados do perfil Supabase

  const userTeam = useMemo(() => {
    // Bônus/penalidades da última decisão narrativa/celular alteram o poder
    // efetivo do time na próxima partida (reflete moral/tática do elenco).
    const bonus = career?.bonusProximaPartida ?? 0;
    const penal = career?.penaltiesProximaPartida ?? 0;
    return createCustomTeam(
      "custom",
      customTeamData.nome,
      customTeamData.short,
      customTeamData.primary,
      customTeamData.secondary,
      Math.max(40, Math.min(99, 75 + bonus - penal)),
      customTeamData.botoesNomes,
    );
  }, [customTeamData, career?.bonusProximaPartida, career?.penaltiesProximaPartida]);

  // Formação PS2 escolhida pelo usuário no perfil (tática + posições dos botões).
  const formation = useMemo<Array<[number, number]>>(() => {
    return formacaoById(perfil?.tatica ?? undefined).posicoes;
  }, [perfil?.tatica]);

  const [rivalTeam, setRivalTeam] = useState("fla");
  const [difficulty, setDifficulty] = useState<Difficulty>("amador");
  const [current, setCurrent] = useState<Fixture | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const zerarEstadoDaConta = useCallback(() => {
    setProgress(loadProgress());
    setTour(null);
    setCareer(null);
    setCurrent(null);
    setCurrentCopaFix(null);
    setVeredito(null);
    setShowCeremony(false);
    setCeremonyBonus(0);
    setRivalTeam("fla");
    setDifficulty("amador");
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // ===== Restauração de estado após refresh (§20/§22 + F5 sem reset) =====
  // Fim de partida/entrevista e a tela atual vivem só em memória; um refresh
  // os perderia. Persistimos o mínimo em sessionStorage (por aba, por usuário)
  // e restauramos uma única vez após o login ser reconhecido — mesma sessão,
  // mesma página, MESMO contexto. Telas de partida online/em andamento não são
  // restauradas (estado volátil); telas seguras do Modo Carreira, sim.
  const resumeRestauradoRef = useRef(false);
  // Sinaliza à hidratação que uma tela foi restaurada — ela NÃO pode mandar o
  // usuário de volta ao menu quando terminar de carregar a carreira.
  const telaRestauradaRef = useRef(false);
  useEffect(() => {
    const uid = perfil?.user_id;
    if (!uid) return;
    try {
      if (screen === "match-end" && matchEnd) {
        sessionStorage.setItem(
          RESUME_KEY,
          JSON.stringify({
            uid,
            tela: "match-end",
            matchEnd,
            matchEndDestino,
            patrocinioPagoPartida,
            ts: Date.now(),
          }),
        );
      } else if (TELAS_RESTAURAVEIS.includes(screen)) {
        sessionStorage.setItem(
          RESUME_KEY,
          JSON.stringify({ uid, tela: screen, matchEnd: null, ts: Date.now() }),
        );
      } else {
        // Tela volátil ou inicial: nada a restaurar depois.
        sessionStorage.removeItem(RESUME_KEY);
      }
    } catch {
      /* storage indisponível */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, matchEnd, matchEndDestino, patrocinioPagoPartida, perfil?.user_id]);
  useEffect(() => {
    const uid = perfil?.user_id;
    if (!uid || resumeRestauradoRef.current) return;
    resumeRestauradoRef.current = true;
    try {
      const bruto = sessionStorage.getItem(RESUME_KEY);
      if (!bruto) return;
      sessionStorage.removeItem(RESUME_KEY);
      const salvo = JSON.parse(bruto) as {
        uid: string;
        tela?: Screen;
        matchEnd: MatchEndData | null;
        matchEndDestino?: Screen;
        patrocinioPagoPartida?: string | null;
        ts: number;
      };
      // Só restaura para o MESMO usuário e por até 2h (sessão recente).
      if (salvo.uid !== uid || Date.now() - salvo.ts > 2 * 3600_000) return;
      if (salvo.patrocinioPagoPartida) setPatrocinioPagoPartida(salvo.patrocinioPagoPartida);
      if (salvo.matchEnd) {
        // Fim de partida: a entrevista reabre fechada (abertura idempotente).
        setMatchEnd(salvo.matchEnd);
        setMatchEndDestino(salvo.matchEndDestino ?? "menu");
        setScreen("match-end");
        telaRestauradaRef.current = true;
      } else if (salvo.tela && salvo.tela !== "menu" && salvo.tela !== "match-end") {
        // Mesma tela do Modo Carreira de antes do F5 (hub, calendário, etc.).
        setScreen(salvo.tela);
        telaRestauradaRef.current = true;
      }
    } catch {
      /* blob corrompido: ignora */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.user_id]);

  /**
   * Mostra a tela de carregamento (splash) e executa o callback ao completar.
   * Usado em transições pesadas: início de carreira, entrada em campo, consultas
   * ao Supabase e inicialização da IA.
   */
  const runWithLoading = (onComplete: () => void, duracao = 2200) => {
    setLoadingOnComplete(() => () => {
      setLoading(false);
      onComplete();
    });
    setLoadingReady(true);
    setLoading(true);
    void duracao;
  };

  const persist = (p: Progress) => {
    setProgress(p);
    saveProgress(p);
    // Salvar no Supabase se o usuário estiver logado
    if (perfil?.user_id) {
      saveProgressToSupabase(perfil.user_id, p);
    }
  };

  const persistTournament = (t: Tournament | null) => {
    setTour(t);
    if (t) saveTournament(t);
    else deleteTournamentLocal();

    const uid = perfil?.user_id;
    if (uid) {
      saveTournamentToSupabase(uid, t);
    }
  };

  const persistCareer = (c: CareerState | null) => {
    setCareer(c);
    if (c) saveCareer(c);
    else deleteCareer();
    // Supabase é fonte da verdade quando o usuário está logado
    if (perfil?.user_id && c) {
      saveCareerToSupabase(perfil.user_id, c).catch(() => {});
    }
  };

  /* ============ Fila de mensagens do celular (§13, §14) ============
   * Mensagens de personagens chegam UMA POR VEZ — nunca um dump de N
   * mensagens instantâneas. Cada entrega emite notificação (toast + som).
   */
  const filaConversasRef = useRef<ConversaCelular[]>([]);
  const filaProcessandoRef = useRef(false);
  // GRUPO CIDADELA (fictício/interno §8): partidaId já comentado no grupo.
  const grupoPostadoRef = useRef<Set<string>>(new Set());

  /** Comenta um evento real no Grupo Cidadela (fictício; idempotente por chave). */
  const postarNoGrupoUmaVez = (chave: string, evento: EventoGrupo) => {
    if (grupoPostadoRef.current.has(chave)) return;
    grupoPostadoRef.current.add(chave);
    const fala = textoEventoGrupo(evento);
    void postarEventoNoGrupo(fala.autor, fala.texto).catch(() => {});
  };
  const enfileirarConversas = (novas: ConversaCelular[]) => {
    if (novas.length === 0) return;
    filaConversasRef.current.push(...novas);
    if (filaProcessandoRef.current) return;
    filaProcessandoRef.current = true;
    const drain = () => {
      const prox = filaConversasRef.current.shift();
      if (!prox) {
        filaProcessandoRef.current = false;
        return;
      }
      const atual = careerRef.current;
      if (atual) {
        // UMA conversa por contato: a entrega mescla na conversa existente
        // (npcId/canal/id estável) — nunca empilha "Pracinha, Pracinha...".
        persistCareer(anexarConversa(atual, prox));
      }
      setToast(`📱 Nova mensagem: ${prox.nome}`);
      // Identidade sonora por categoria (§13): mensagem de NPC vs notícia do
      // mundo vs relatório financeiro — sons distintos, centralizados.
      tocarSom(
        prox.tipo === "narrativa" || prox.tipo === "rpg"
          ? prox.npcId === "npc-bibliotecaria" || prox.npcId === "npc-john-adrian"
            ? "pergaminho"
            : "mensagem"
          : prox.tipo === "patrocinador"
            ? "recompensa"
            : "noticia",
      );
      window.setTimeout(drain, 2600);
    };
    window.setTimeout(drain, 1200);
  };

  /** Hidrata progresso + carreira + torneio apenas do usuário autenticado. */
  const hidratarCampanha = useCallback(
    async (userId: string) => {
      if (hydratedUserRef.current === userId) return;
      hydratedUserRef.current = userId;
      zerarEstadoDaConta();
      setLoadingOnComplete(() => () => setLoading(false));
      setLoadingReady(false);
      setLoading(true);

      try {
        const [remoteProgress, remoteCareer] = await Promise.all([
          loadProgressFromSupabase(userId),
          loadCareerFromSupabase(userId),
        ]);

        setProgress(remoteProgress);
        let careerHidratada = remoteCareer;
        let torneioAtivo = remoteProgress.tournament ?? null;
        if (remoteCareer && !remoteCareer.ligas) {
          const divisao = remoteCareer.divisao ?? "serie-c";
          const composicoes = composicoesIniciais(userTeam, divisao);
          const ligas = criarLigasDaTemporada(composicoes, userTeam, difficulty);
          if (torneioAtivo) ligas[divisao] = torneioAtivo;
          careerHidratada = { ...remoteCareer, ligas, composicoes };
        } else if (remoteCareer?.ligas && !careerHidratada?.composicoes) {
          careerHidratada = {
            ...remoteCareer,
            composicoes: Object.fromEntries(
              Object.entries(remoteCareer.ligas).map(([divisao, liga]) => [
                divisao,
                liga.groups[0]?.teamIds ?? [],
              ]),
            ) as NonNullable<typeof remoteCareer.composicoes>,
          };
        }
        if (careerHidratada?.ligas && careerHidratada.divisao) {
          torneioAtivo = careerHidratada.ligas[careerHidratada.divisao] ?? torneioAtivo;
        }

        // Celular restaurado com a carreira: garante os contatos-base (inclui o
        // Pracinha) e, se a sombra estiver ativa, entrega o convite do Ritual
        // da Trilha como notificação (idempotente por rodada).
        if (careerHidratada) {
          careerHidratada = garantirContatosRpg(careerHidratada);
          careerHidratada = convidarRitualTrilha(careerHidratada);
          // Universo de torcida: cria a distribuição inicial (1M) ou cobre
          // clubes faltantes — sempre zero-sum, persistido no JSONB.
          careerHidratada = garantirTorcidaUniverso(careerHidratada, userTeam);
        }

        setTour(torneioAtivo);
        setCareer(careerHidratada);
        // F5 no fim da temporada: o veredito é DERIVADO das ligas concluídas
        // (idempotente — após iniciar a nova temporada as ligas nascem zeradas
        // e a condição fica falsa). Sem isso, o refresh deixava a carreira
        // travada em "Campanha encerrada" sem caminho para a próxima temporada.
        if (careerHidratada?.ligas && ligasConcluidas(careerHidratada.ligas)) {
          setVeredito(
            avaliarFimTemporada(
              careerHidratada.coach.sov,
              careerHidratada.divisao,
              careerHidratada.temporadasInadimplente ?? 0,
            ),
          );
        }
        if (remoteCareer && careerHidratada) {
          // Repara registros antigos que tinham coach vazio no JSONB e
          // persiste contatos/convite recém-gerados.
          void saveCareerToSupabase(userId, careerHidratada);
        }
        // Navegação: NUNCA abrir o Modo Carreira automaticamente. O Estádio do
        // Campus abre no menu; a carreira é acessada pelo usuário em
        // "Carreira no Campus" → "Continuar Campanha" (estado já persistido).
        // EXCEÇÃO: se um refresh (F5) restaurou uma tela da sessão, ela manda —
        // a hidratação só repõe os dados, não muda a tela.
        if (!telaRestauradaRef.current) setScreen("menu");
      } catch (error) {
        hydratedUserRef.current = null;
        console.error("[BotaoGame] Erro ao hidratar campanha do Supabase:", error);
        zerarEstadoDaConta();
        setToast("Não foi possível carregar seus dados. Estado da conta limpo.");
      } finally {
        setLoadingReady(true);
      }
    },
    [zerarEstadoDaConta],
  );

  useEffect(() => {
    const userId = perfil?.user_id;
    if (!userId) {
      hydratedUserRef.current = null;
      zerarEstadoDaConta();
      setPerfilCidadela(null);
      return;
    }
    void hidratarCampanha(userId);
    void carregarPerfilCidadela(userId).then(setPerfilCidadela).catch(() => {});
  }, [perfil?.user_id, hidratarCampanha, zerarEstadoDaConta]);

  // Saldo REAL de SOV: busca autoritativa no ledger. Refaz a leitura quando o
  // cache da carreira muda (pós-partida) com pequeno atraso para a escrita do
  // ledger já ter aterrissado — o celular nunca exibe valor defasado por muito
  // tempo nem precisa confiar no cache local.
  useEffect(() => {
    const uid = perfil?.user_id;
    if (!uid) {
      setSaldoSovRemoto(null);
      return;
    }
    let vivo = true;
    const buscar = () => {
      void obterSaldoSov(uid).then((s) => {
        if (vivo && s != null) setSaldoSovRemoto(s);
      });
    };
    buscar();
    const t = window.setTimeout(buscar, 1800);
    return () => {
      vivo = false;
      window.clearTimeout(t);
    };
  }, [perfil?.user_id, career?.coach.sov]);

  // Saldo exibido: remoto (autoritativo) quando disponível; senão o cache da
  // carreira (atualizado localmente no instante da partida).
  const saldoSov = saldoSovRemoto ?? career?.coach.sov ?? null;

  const handleLogout = async () => {
    if (emPartidaOnline) {
      setToast("Não dá pra sair da conta durante uma partida online.");
      return;
    }
    await logout();
    zerarEstadoDaConta();
    setScreen("menu");
    setToast("Você saiu da conta.");
  };

  const aoLogar = async (p?: Perfil) => {
    console.log("[BotaoGame] aoLogar chamado:", { perfil: p });
    // Sem perfil = logout ou exclusão de conta → volta ao hub (login é o
    // módulo "Meu Clube / Conta", junto de Amistoso e Modo Carreira).
    if (!p) {
      zerarEstadoDaConta();
      setScreen("menu");
      setToast("Você saiu da conta.");
      return;
    }
    aplicarPerfil(p);
    void hidratarCampanha(p.user_id);
    setScreen("menu");
    setToast("Bem-vindo de volta!");
  };

  const handleDeleteCampaign = async () => {
    if (
      !confirm("Tem certeza que deseja excluir toda a campanha? Esta ação não pode ser desfeita.")
    ) {
      return;
    }

    // Excluir progresso local
    deleteProgressLocal();

    // Excluir progresso do Supabase (se usuário estiver logado)
    if (perfil?.user_id) {
      await deleteProgressFromSupabase(perfil.user_id);
    }

    // Resetar estado do torneio
    persistTournament(null);
    setCurrent(null);
    // Resetar carreira (mas mantendo o coach pra reuso — só limpa estado da campanha)
    if (career) {
      persistCareer({
        ...career,
        dificuldadeAtual: null,
        bonusProximaPartida: 0,
        penaltiesProximaPartida: 0,
        moralTime: 65,
        headlines: [],
        ultimaRodadaProcessada: -1,
        eventoPendenteId: null,
      });
    }

    // Resetar progresso local
    setProgress(loadProgress());

    setToast("Campanha excluída com sucesso!");
  };

  const handleSaveCampaign = async () => {
    if (!perfil?.user_id) {
      setToast("Faça login para salvar a campanha.");
      return;
    }

    // Salvar progresso no Supabase
    await saveProgressToSupabase(perfil.user_id, progress);

    // Salvar torneio no Supabase se existir
    if (tour) {
      await saveTournamentToSupabase(perfil.user_id, tour);
    }

    setToast("Campanha salva com sucesso!");
  };

  /**
   * Cria uma NOVA carreira: zera o estado da campanha atual (no local E no
   * Supabase, criando um novo registro de progresso_caminpanha limpo) e envia
   * o treinador à seleção de dificuldade para iniciar uma nova temporada.
   * Mantém apenas os dados de conta (coach nome/apelido) p/ reuso.
   */
  const handleNewCareer = async () => {
    if (!perfil?.user_id) {
      // Offline: entrada triunfal → setup (treinador direto).
      if (!career?.coach.nome) setScreen("coach-setup");
      else setScreen("career-intro");
      return;
    }

    try {
      // Zera a campanha (o persistCareer abaixo já grava o snapshot limpo no
      // JSONB — nenhum reset remoto paralelo é necessário).
      const zerada: CareerState = {
        ...(career ?? EMPTY_CAREER),
        ...EMPTY_CAREER,
        coach: { ...(career?.coach ?? EMPTY_CAREER.coach) },
        temporada: 1,
        conversas: [],
        // A entrada é escolhida na tela triunfal (§11).
        modoEntrada: undefined,
      };
      persistCareer(zerada);
      persistTournament(null);
      setCurrent(null);
      setCurrentCopaFix(null);
      setScreen("career-intro");
    } catch (e) {
      console.error("[BotaoGame] handleNewCareer error:", e);
      setToast("Não foi possível criar a nova carreira. Tente novamente.");
    }
  };

  const handleComprarCota = async (clube: Team, porcentagem: number) => {
    if (!career || !perfil?.user_id) return;

    const { career: novaCareer, deltaSov, custo } = comprarCota(career, clube, porcentagem);

    // Registra no Banco Central SOV ANTES de persistir
    const saldoLedger = await registrarTransacaoSov(
      perfil.user_id,
      deltaSov,
      "fee",
      `Compra de ${porcentagem}% de ${clube.name}`,
      "market",
      { clubeId: clube.id, porcentagem },
      {
        sourceEvent: "compra-cota",
        idempotencyKey: `cota-compra:${clube.id}:${perfil.user_id}:${Date.now()}`,
      },
    );

    if (saldoLedger === null) {
      setToast("Compra não concluída — saldo insuficiente.");
      return;
    }

    persistCareer(novaCareer);
    setCareer(novaCareer);
    setToast(`Comprou ${porcentagem}% de ${clube.name} por ${custo.toFixed(0)} SOV!`);

    // Notificação no celular
    if (porcentagem >= 100) {
      enfileirarConversas([
        {
          id: `proprietario-${clube.id}-${Date.now()}`,
          tipo: "evento",
          nome: "Diretoria",
          avatar: "🏢",
          cargo: "Clube",
          naoLida: true,
          mensagens: [
            {
              id: `prop-msg-${Date.now()}`,
              texto: `Parabéns! Você agora é o PROPRIETÁRIO do ${clube.name}. O clube é seu — decida o futuro da trajetória.`,
              remetente: "outro",
              timestamp: new Date().toISOString(),
            },
          ],
        },
      ]);
    } else {
      enfileirarConversas([
        {
          id: `cota-${clube.id}-${Date.now()}`,
          tipo: "evento",
          nome: "Diretoria",
          avatar: "🏢",
          cargo: "Clube",
          naoLida: true,
          mensagens: [
            {
              id: `cota-msg-${Date.now()}`,
              texto: `Você adquiriu ${porcentagem}% de participação no ${clube.name}. Continue construindo seu patrimônio.`,
              remetente: "outro",
              timestamp: new Date().toISOString(),
            },
          ],
        },
      ]);
    }
  };

  const handleVenderCota = async (clube: Team, porcentagem: number) => {
    if (!career || !perfil?.user_id) return;

    const resultado = venderCota(career, clube, porcentagem);
    if (!resultado) {
      setToast("Não possui participação suficiente para vender.");
      return;
    }

    const { career: novaCareer, deltaSov, valor } = resultado;

    // Registra no Banco Central SOV ANTES de persistir
    const saldoLedger = await registrarTransacaoSov(
      perfil.user_id,
      deltaSov,
      "reward",
      `Venda de ${porcentagem}% de ${clube.name}`,
      "market",
      { clubeId: clube.id, porcentagem },
      {
        sourceEvent: "venda-cota",
        idempotencyKey: `cota-venda:${clube.id}:${perfil.user_id}:${Date.now()}`,
      },
    );

    if (saldoLedger === null) {
      setToast("Venda não concluída.");
      return;
    }

    persistCareer(novaCareer);
    setCareer(novaCareer);
    setToast(`Vendeu ${porcentagem}% de ${clube.name} por ${valor.toFixed(0)} SOV!`);
  };

  const handleAssistirVideo = async (): Promise<boolean> => {
    if (!perfil?.user_id) {
      setToast("Faça login para ganhar pontos assistindo vídeos.");
      return false;
    }

    // Simular assistir vídeo (na implementação real, isso seria integrado com AdSense)
    // Aqui verificaria se o vídeo está disponível antes de dar pontos
    const novosPontos = await adicionarPontosVideo(perfil.user_id, 5);

    if (novosPontos !== null) {
      setToast(`+5 pontos! Você agora tem ${novosPontos} pontos de SOV.`);
      // Recarregar perfil para atualizar pontos
      const novoPerfil = await recarregar();
      if (novoPerfil) {
        aplicarPerfil(novoPerfil);
      }
      return true; // Vídeo assistido com sucesso
    }

    return false; // Não foi possível assistir o vídeo
  };

  /* ---------- amistoso ---------- */
  const finishFriendly = (r: MatchResult) => {
    // Marcar que o usuário jogou o primeiro jogo (habilita anúncios após)
    markFirstGamePlayed();

    const userIsHome = r.homeId === userTeam.id;
    const gf = userIsHome ? r.homeGoals : r.awayGoals;
    const ga = userIsHome ? r.awayGoals : r.homeGoals;
    const f = { ...progress.friendlies };
    if (gf > ga) f.w++;
    else if (gf < ga) f.l++;
    else f.d++;

    // Atualizar gols no progresso
    const novoProgresso = {
      ...progress,
      friendlies: f,
      gols_feitos: (progress.gols_feitos || 0) + gf,
      gols_sofridos: (progress.gols_sofridos || 0) + ga,
    };

    persist(novoProgresso);

    // Patrocinador: valida a meta da partida no modo carreira também.
    if (career?.desafioPatrocinador) {
      const rDesafio = aplicarDesafioPatrocinador(career, gf, ga, true);
      persistCareer(rDesafio.estado);
      // Recompensa do patrocinador no Banco Central SOV (idempotente por desafio).
      if (rDesafio.ganhou > 0 && perfil?.user_id) {
        void registrarTransacaoSov(
          perfil.user_id,
          rDesafio.ganhou,
          "reward",
          "Desafio de patrocinador cumprido (amistoso)",
          "career",
          { golsPro: gf, golsContra: ga, tipo: "amistoso" },
          career.desafioPatrocinador?.id
            ? {
                sourceEvent: "desafio_patrocinador",
                idempotencyKey: `desafio:${perfil.user_id}:${career.desafioPatrocinador.id}`,
              }
            : undefined,
        );
      }
    }

    setToast(
      gf > ga ? "Vitória no amistoso!" : gf < ga ? "Derrota no amistoso." : "Empate no amistoso.",
    );
    const advId = userIsHome ? r.awayId : r.homeId;
    const advTeam = teamByIdSync(advId);
    setMatchEnd({
      partidaId: `amistoso-${Date.now()}`,
      resultado: gf > ga ? "vitoria" : gf < ga ? "derrota" : "empate",
      placarUser: gf,
      placarAdv: ga,
      timeUserNome: userTeam.name,
      timeAdvNome: advTeam?.name ?? advId,
      competicao: "Amistoso",
      rodada: "Jogo único",
      sovDelta: 0,
      moralDelta: 0,
    });
    setMatchEndDestino("menu");
    setScreen("match-end");
  };

  /* ---------- torneio ---------- */
  const startTournament = () => {
    // Se não existir treinador ainda, entra no fluxo de criação primeiro
    if (!career || !career.coach.nome) {
      setScreen("coach-setup");
      return;
    }
    // Splash de carregamento: consulta Supabase + inicialização da IA + mesa.
    runWithLoading(() => iniciarCampanha(career));
  };

  const iniciarCampanha = async (c: CareerState) => {
    const divisaoInicial = c.divisao ?? "serie-c";
    const composicoes = c.composicoes ?? composicoesIniciais(userTeam, divisaoInicial);
    const ligas = criarLigasDaTemporada(composicoes, userTeam, difficulty);
    const ativa = ligas[divisaoInicial];
    persistTournament(ativa);

    const poolCopa = Object.values(ligas)
      .flatMap((liga) => liga.groups.flatMap((g) => g.teamIds))
      .map((id) => resolveTeam(id, userTeam));
    const copa = gerarCopaBrasil(userTeam, difficulty, poolCopa);

    const novaCareer: CareerState = {
      ...c,
      dificuldadeAtual: difficulty,
      bonusProximaPartida: 0,
      penaltiesProximaPartida: 0,
      moralTime: 65,
      headlines: manchetesDeEstreia(c.coach.apelido || c.coach.nome, userTeam.name),
      ultimaRodadaProcessada: -1,
      eventoPendenteId: null,
      rodadaAtual: 0,
      rodadasDesdeEventoNarrativo: 0,
      temporada: c.temporada ?? 1,
      divisao: divisaoInicial,
      ligas,
      composicoes,
      copaBrasil: copa,
      narrativa: NARRATIVA_INICIAL,
      // Patrocinador propõe a primeira meta do celular (desafio por partida).
      desafioPatrocinador: gerarDesafioPatrocinador(0),
      conversas: [],
      coach: { ...c.coach, campanhasJogadas: c.coach.campanhasJogadas + 1 },
    };
    // Celular nasce com os contatos-base (Valéria, Dona Cida, Zé e Pracinha)
    // e o universo de torcida (1M distribuído por força, zero-sum).
    persistCareer(garantirTorcidaUniverso(garantirContatosRpg(novaCareer), userTeam));

    // Se estiver logado, registra a temporada no histórico relacional. O
    // snapshot da campanha (estado + manchetes de estreia) já foi persistido
    // pelo persistCareer acima — regravá-lo aqui duplicava manchetes e
    // re-incrementava campanhasJogadas após F5.
    if (perfil?.user_id) {
      void registrarTemporadaRemota(perfil.user_id, novaCareer);
    }

    setScreen("hub");
  };

  const finishCoachSetup = (coach: CareerState["coach"]) => {
    const base = career ?? EMPTY_CAREER;
    const coachComSaldo = { ...coach, sov: perfil?.pontos_soberania ?? coach.sov };
    const nova: CareerState = { ...base, coach: coachComSaldo };
    persistCareer(nova);
    iniciarCampanha(nova);
  };

  /**
   * Avalia o desafio de patrocinador pendente contra o resultado da partida.
   * Se a meta for cumprida, soma a recompensa ao SOV e gera um novo
   * desafio (se houver próxima partida). Retorna o estado atualizado.
   */
  const aplicarDesafioPatrocinador = (
    c: CareerState,
    golsPro: number,
    golsContra: number,
    temProxima: boolean,
  ): { estado: CareerState; ganhou: number } => {
    const desafio = c.desafioPatrocinador;
    if (!desafio || desafio.concluido) {
      return { estado: c, ganhou: 0 };
    }
    if (cumpriuDesafio(desafio, golsPro, golsContra)) {
      const recompensa = desafio.recompensa;
      const novoDesafio = temProxima ? gerarDesafioPatrocinador(c.rodadaAtual) : null;
      const estado: CareerState = {
        ...c,
        desafioPatrocinador: novoDesafio,
      };
      setToast(`Patrocinador satisfeito! +${recompensa} de SOV.`);
      return { estado, ganhou: recompensa };
    }
    // Não cumpriu: marca como concluído e propõe novo desafio se houver próxima.
    const novoDesafio = temProxima ? gerarDesafioPatrocinador(c.rodadaAtual) : null;
    return { estado: { ...c, desafioPatrocinador: novoDesafio }, ganhou: 0 };
  };

  // Prepara o próximo evento de escolha/narrativa entre partidas (se houver).
  // Ordem de prioridade: suborno > narrativa dinâmica > choice event.
  const preparaEscolha = (c: CareerState, faseAtual: string): CareerState => {
    let next = c;
    // Enredo de suborno (narrativa paralela). Tem prioridade e pode disparar em
    // momentos específicos da campanha (fase de grupos, semi/final).
    const sub = next.suborno ?? SUBORNO_INICIAL;
    if (deveOfertarSuborno(sub, faseAtual) && !sub.nodeAtual) {
      next = { ...next, suborno: iniciarOferta(sub) };
    }
    if (next.suborno?.nodeAtual) return next;
    // História dinâmica no celular (2-4/mês): gera se ainda não há uma ativa.
    if (!next.narrativa?.cenaAtual) {
      const rodada = next.rodadaAtual;
      const desde = next.rodadasDesdeEventoNarrativo;
      if (deveGerarNarrativa(desde, rodada)) {
        const narr = gerarNarrativa(next.narrativa ?? NARRATIVA_INICIAL);
        return {
          ...next,
          narrativa: narr,
          rodadasDesdeEventoNarrativo: 0,
        };
      }
    }
    if (next.narrativa?.cenaAtual) return next;
    if (next.eventoPendenteId) return next;
    // Sortear evento de carreira antes de cada partida do usuário (40% chance)
    if (Math.random() > 0.4) return next;
    const evento = sortearEvento(next.ultimasEscolhas);
    return { ...next, eventoPendenteId: evento.id };
  };

  const playNext = () => {
    if (!tour || !career) return;
    // Sanção de W.O. pendente: a partida sequer é disputada — registra derrota
    // por W.O. automaticamente (1x0 a favor do adversário) e segue o campeonato.
    // (Mensagens do celular — suborno/narrativa/evento — NÃO bloqueiam a entrada
    //  em campo: o jogador as resolve no módulo Celular, independente da partida.)
    if (career.woProximaPartida) {
      aplicarWO();
      return;
    }
    // Copa do Brasil paralela: se disponível nesta rodada, joga a copa.
    const rodada = career.rodadaAtual;
    if (career.copaBrasil) {
      const copaFix = proximoJogoCopa(career.copaBrasil, userTeam.id);
      if (
        copaFix &&
        copaDisponivelNaRodada(rodada, career.copaBrasil, userTeam.id, career.divisao)
      ) {
        // Splash curto de "entrada em campo" (inicializa mesa + IA).
        runWithLoading(() => {
          setCurrentCopaFix(copaFix);
          setCurrent(copaFix);
          setScreen("tournament-match");
        }, 1400);
        return;
      }
    }
    const f = nextUserFixture(tour);
    if (!f) {
      setScreen("hub");
      return;
    }
    setCurrentCopaFix(null);
    setCurrent(f);
    // Splash curto de "entrada em campo".
    runWithLoading(() => setScreen("tournament-match"), 1400);
  };

  /**
   * Aplica uma derrota por W.O. (sanção de decisão): registra 1x0 contra o
   * usuário, simula a rodada e avança o campeonato, sem abrir a partida.
   */
  const aplicarWO = () => {
    if (!tour || !career) return;
    const f = nextUserFixture(tour);
    if (!f) {
      setScreen("hub");
      return;
    }
    const userIsHome = f.homeId === userTeam.id;
    const r: MatchResult = {
      homeId: f.homeId,
      awayId: f.awayId,
      homeGoals: userIsHome ? 0 : 1,
      awayGoals: userIsHome ? 1 : 0,
    };
    setToast("W.O. decretado! Derrota automática por decisão anterior.");
    // Limpa a sanção de W.O. antes de finalizar (evita loop).
    if (career.woProximaPartida) {
      persistCareer({ ...career, woProximaPartida: undefined });
    }
    finishTournamentMatch(r);
  };

  // Avança a narrativa dinâmica aplicando efeitos e, no desfecho, gera manchete.
  const aplicarNarrativa = (escolha: NarrativaEscolha) => {
    if (!career?.narrativa) return;
    const { state: novoState, efeitos, finalizado } = avancarNarrativa(career.narrativa, escolha);
    const novo: CareerState = {
      ...career,
      narrativa: novoState,
      bonusProximaPartida: Math.max(0, career.bonusProximaPartida + (efeitos.bonusPoder ?? 0)),
      moralTime: Math.max(0, Math.min(100, career.moralTime + (efeitos.moral ?? 0))),
    };
    // Narrativa move SOV: registra no Banco Central (module 'rpg') ANTES de persistir.
    if (efeitos.sov && perfil?.user_id) {
      void registrarTransacaoSov(
        perfil.user_id,
        efeitos.sov,
        efeitos.sov >= 0 ? "reward" : "penalty",
        `Narrativa: ${career.narrativa?.cenaAtual ?? "cena"} — escolha narrativa`,
        "rpg",
        { cena: career.narrativa?.cenaAtual },
      );
    }
    persistCareer(novo);
    setCareer(novo);
    // No desfecho, registra manchete narrativa e zera a história.
    if (finalizado && novoState.desfecho) {
      const tag =
        novoState.desfecho === "escandalo" || novoState.desfecho === "lucro_imoral"
          ? "polemica"
          : "seu-time";
      const comManchete = addHeadlines(novo, [
        {
          id: `narr-${Date.now()}`,
          manchete: tituloDesfecho(novoState.desfecho),
          tag,
          rodada: novo.rodadaAtual,
        },
      ]);
      const zerado: CareerState = {
        ...comManchete,
        narrativa: { ...novoState, cenaAtual: null },
      };
      persistCareer(zerado);
      setCareer(zerado);
      if (perfil?.user_id) {
        void registrarEventoCarreiraRemoto(
          perfil.user_id,
          zerado,
          "narrativa",
          tituloDesfecho(novoState.desfecho),
          typeof zerado.narrativa?.desfecho === "string" ? zerado.narrativa.desfecho : "Desfecho",
          { desfecho: novoState.desfecho },
        );
        void registrarEventoMissao("celular_decisao");
      }
    }
  };

  // Inicia a próxima temporada (carreira infinita): deduz custo de manutenção,
  // regenera Brasileirão + Copa do Brasil, mantém progresso e SOV.
  const startNextSeason = () => {
    if (!career) return;
    const divisao = career.divisao;
    const novaSov = iniciarNovaTemporada(career.coach.sov, divisao);
    // Regra da dívida (§9): pagou → zera; falhou → registra a temporada
    // na sequência; atinge o teto → o botão de continuar não era exibido.
    const novaInad = veredito?.temporadasInadimplente ?? 0;
    const composicoes = career.composicoes ?? composicoesIniciais(userTeam, divisao);
    const ligas = criarLigasDaTemporada(composicoes, userTeam, difficulty);
    const ativa = ligas[divisao];
    persistTournament(ativa);
    const poolCopa = Object.values(ligas)
      .flatMap((liga) => liga.groups.flatMap((g) => g.teamIds))
      .map((id) => resolveTeam(id, userTeam));
    const copa = gerarCopaBrasil(userTeam, difficulty, poolCopa);
    const novaCareer: CareerState = {
      ...career,
      dificuldadeAtual: difficulty,
      bonusProximaPartida: 0,
      penaltiesProximaPartida: 0,
      moralTime: 65,
      headlines: manchetesDeEstreia(career.coach.apelido || career.coach.nome, userTeam.name),
      ultimaRodadaProcessada: -1,
      eventoPendenteId: null,
      rodadaAtual: 0,
      rodadasDesdeEventoNarrativo: 0,
      temporada: (career.temporada ?? 1) + 1,
      temporadasInadimplente: novaInad,
      divisao,
      ligas,
      composicoes,
      copaBrasil: copa,
      narrativa: NARRATIVA_INICIAL,
      suborno: undefined,
      desafioPatrocinador: gerarDesafioPatrocinador(0),
      conversas: [],
      coach: {
        ...career.coach,
        sov: novaSov,
        campanhasJogadas: career.coach.campanhasJogadas + 1,
      },
    };
    // A torcida atravessa temporadas (clubes promovidos/rebaixados levam seus
    // torcedores); garante cobertura se o universo mudou.
    persistCareer(garantirTorcidaUniverso(novaCareer, userTeam));
    if (perfil?.user_id) void registrarTemporadaRemota(perfil.user_id, novaCareer);
    setVeredito(null);
    setCurrentCopaFix(null);
    setScreen("hub");
  };

  // Game Over: reinicia a carreira do zero (mantém apenas o coach).
  const gameOverReset = () => {
    if (!career) return;
    const novaCareer: CareerState = {
      ...EMPTY_CAREER,
      coach: {
        ...career.coach,
        sov: 0,
        titulos: 0,
        campanhasJogadas: career.coach.campanhasJogadas + 1,
      },
      temporada: 1,
      conversas: [],
    };
    persistCareer(novaCareer);
    persistTournament(null);
    setVeredito(null);
    setCurrentCopaFix(null);
    setScreen("menu");
    setToast("Carreira reiniciada após falência. Recomece do zero.");
  };

  const aplicarSuborno = (escolha: SubornoEscolha) => {
    if (!career) return;
    const subAtual = career.suborno ?? SUBORNO_INICIAL;
    const { state: novoSub, efeitos, finalizado } = avancarSuborno(subAtual, escolha);
    const novo: CareerState = {
      ...career,
      suborno: novoSub,
      bonusProximaPartida: career.bonusProximaPartida + (efeitos.bonusPoder ?? 0),
      moralTime: Math.max(0, Math.min(100, career.moralTime + (efeitos.moral ?? 0))),
    };
    // Suborno move SOV: registra no Banco Central (module 'rpg') ANTES de persistir.
    if (efeitos.sov && perfil?.user_id) {
      void registrarTransacaoSov(
        perfil.user_id,
        efeitos.sov,
        efeitos.sov >= 0 ? "reward" : "penalty",
        `Suborno: escolha "${escolha}" — efeito de SOV`,
        "rpg",
        { subornoEscolha: escolha, node: novoSub.nodeAtual },
      );
    }
    persistCareer(novo);
    setCareer(novo);
    // Se a cena resolveu o capítulo, gera manchete narrativa do desfecho.
    if (finalizado && novoSub.desfecho) {
      const manchete =
        novoSub.desfecho === "caiu_em_armadilha"
          ? "Treinador cai em esquema de suborno na final"
          : novoSub.desfecho === "denuncia"
            ? "Treinador denuncia propina e vira símbolo da integridade"
            : novoSub.desfecho === "jogar_duplo"
              ? "Operação dupla do treinador desbarata esquema"
              : novoSub.desfecho === "aceitou"
                ? "Sombras rondam o banco após resultados suspeitos"
                : "Treinador recusa propina e mantém nome limpo";
      const comManchete = addHeadlines(novo, [
        {
          id: `suborno-${Date.now()}`,
          manchete,
          tag: "polemica",
          rodada: 99,
        },
      ]);
      persistCareer(comManchete);
      setCareer(comManchete);
    }
    // Não vai direto para a partida - espera o usuário clicar em "Continuar" no SubornoStory
  };

  const aplicarEscolha = (choice: Choice) => {
    if (!career) return;
    const bonusPoder = career.bonusProximaPartida + (choice.bonusPoder ?? 0);
    const moral = Math.max(0, Math.min(100, career.moralTime + (choice.bonusMoral ?? 0)));
    let sov = career.coach.sov;
    // Penalty imediata (não aplica bônus/penal condicional aqui — vai no finish)
    if (choice.penaltyPontos && choice.penaltyPontos < 0) sov += choice.penaltyPontos;
    // Impacto financeiro imediato (venda de botão, suborno aceito, multa…).
    if (choice.impactoFinanceiro) sov += choice.impactoFinanceiro;

    // Sanções pendentes para a próxima partida real (W.O. / desfalque / perda de pts).
    const woProximaPartida = choice.wo ? true : career.woProximaPartida;
    const desfalqueBotaoProxima =
      (career.desfalqueBotaoProxima ?? 0) + (choice.desfalqueBotao ?? 0);
    const perdaPontosProxima = (career.perdaPontosProxima ?? 0) + (choice.perdaPontos ?? 0);

    const evento = CHOICE_EVENTS.find((e) => e.id === career.eventoPendenteId);
    const timestamp = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    // Registra a decisão como mensagem na conversa do REMETENTE do evento
    // (Dr. Maurício, Carlos, Beto...): um contato = uma conversa (histórico
    // em 1ª pessoa), sem poluir com mensagens automáticas — só decisões reais.
    const msgTimestamp = Date.now();
    const remetente = evento ? remetenteDecisao(evento.id) : null;
    const conversaDecisao: ConversaCelular | null = evento && remetente
      ? {
          id: `conv-canal-decisao:${evento.id}`,
          tipo: "evento" as const,
          nome: remetente.nome,
          avatar: remetente.avatar,
          cargo: remetente.cargo,
          canal: `decisao:${evento.id}`,
          mensagens: [
            {
              id: `m-${msgTimestamp}`,
              texto: evento.descricao,
              remetente: "outro" as const,
              timestamp,
            },
            { id: `r-${msgTimestamp + 1}`, texto: choice.texto, remetente: "eu" as const, timestamp },
          ],
          naoLida: false,
        }
      : null;

    const base: CareerState = {
      ...career,
      bonusProximaPartida: bonusPoder,
      moralTime: moral,
      coach: { ...career.coach, sov: Math.max(0, sov) },
      ultimasEscolhas: [...career.ultimasEscolhas, choice.id].slice(-8),
      eventoPendenteId: null,
      woProximaPartida,
      desfalqueBotaoProxima,
      perdaPontosProxima,
    };
    const nova: CareerState = conversaDecisao ? anexarConversa(base, conversaDecisao) : base;
    persistCareer(nova);
    if (perfil?.user_id) {
      void registrarEventoMissao("celular_decisao");
      // Impacto financeiro/penalty imediato no Banco Central SOV (module 'rpg').
      // Idempotente por decisão — F5/retry não credita nem debita duas vezes.
      // Os efeitos de poder/moral já foram persistidos no snapshot acima.
      const deltaEscolha =
        (choice.penaltyPontos && choice.penaltyPontos < 0 ? choice.penaltyPontos : 0) +
        (choice.impactoFinanceiro ?? 0);
      if (deltaEscolha !== 0) {
        void registrarTransacaoSov(
          perfil.user_id,
          deltaEscolha,
          deltaEscolha > 0 ? "reward" : "penalty",
          `Decisão de carreira: ${evento?.titulo ?? choice.id}`,
          "rpg",
          { choiceId: choice.id, eventoId: career.eventoPendenteId },
          { sourceEvent: "decisao_carreira", idempotencyKey: `decisao:${perfil.user_id}:${choice.id}` },
        );
      }
    }

    // Feedback de sanções graves.
    if (choice.wo) setToast("Decisão gravíssima: a próxima partida será por W.O.!");
    else if (choice.desfalqueBotao)
      setToast(`Próxima partida: desfalque de ${choice.desfalqueBotao} botão(ões).`);
    else if (choice.perdaPontos) setToast(`Punição: -${choice.perdaPontos} pts na tabela.`);

    // Volta ao hub (não inicia o jogo automaticamente). A decisão resolvida
    // some da prioridade do celular fixo e vira parte do histórico de mensagens.
    setScreen("hub");
  };

  // Handlers para o sistema de conversas do celular
  const handleEnviarMensagem = (conversaId: string, texto: string) => {
    if (!career) return;
    const timestamp = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const msgTimestamp = Date.now();
    const novasConversas = career.conversas.map((conv) => {
      if (conv.id === conversaId) {
        return {
          ...conv,
          mensagens: [
            ...conv.mensagens,
            {
              id: `msg-${msgTimestamp}`,
              texto,
              remetente: "eu" as const,
              timestamp,
            },
          ],
          naoLida: false,
        };
      }
      return conv;
    });
    const novo: CareerState = { ...career, conversas: novasConversas };
    persistCareer(novo);
    setCareer(novo);

    // Contato RPG responde em tempo real (LLM local → fallback procedural).
    const alvo = career.conversas.find((c) => c.id === conversaId);
    if (alvo?.npcId) {
      setNpcDigitando(conversaId);
      void responderContatoNpc(novo, conversaId, texto)
        .then((atualizado) => {
          persistCareer(atualizado);
          setCareer(atualizado);
          setNpcDigitando(null);
        })
        .catch(() => setNpcDigitando(null));
    }
  };

  // Escolha num dilema RPG (suspense/terror/drama): aplica efeitos reais.
  const handleEscolhaRpg = (conversaId: string, indice: number) => {
    if (!career) return;
    const { career: comEscolha, desfecho } = aplicarEscolhaRpg(career, conversaId, indice);
    persistCareer(comEscolha);
    setCareer(comEscolha);
    setToast(`Escolha registrada: ${desfecho.slice(0, 90)}${desfecho.length > 90 ? "…" : ""}`);

    // Integrações externas da escolha: SOV no Banco Central + pedido no Cartório.
    const conversa = career.conversas.find((c) => c.id === conversaId);
    const evento = conversa?.eventoRpg ? eventoPorId(conversa.eventoRpg.eventoId) : undefined;
    const efeitos = evento?.escolhas[indice]?.efeitos;
    const userId = perfil?.user_id;

    if (evento && efeitos?.sov && userId) {
      void registrarTransacaoSov(
        userId,
        efeitos.sov,
        efeitos.sov >= 0 ? "reward" : "penalty",
        `RPG: ${evento.titulo} — "${efeitos.sov >= 0 ? "ganho" : "custo"} de SOV"`,
        "rpg",
        { eventoId: evento.id, escolha: indice, titulo: evento.titulo },
      );
    }

    if (evento && efeitos?.cartorio) {
      const { tipo, titulo } = efeitos.cartorio;
      if (userId) {
        void (async () => {
          const dados = {
            eventoId: evento.id,
            temporada: career.temporada ?? 1,
            rodada: career.rodadaAtual,
            timeId: userTeam.id,
            timeNome: userTeam.name,
            coach: career.coach.nome,
            sov: career.coach.sov,
          };
          const pedidoId = await criarPedidoCartorio(
            userId,
            tipo as CartorioTipo,
            titulo,
            dados,
          );
          const link = `/biblioteca?acao=${tipo}&pedidoId=${pedidoId ?? ""}`;
          const atualizado: CareerState = {
            ...comEscolha,
            conversas: comEscolha.conversas.map((cv) =>
              cv.id === conversaId ? { ...cv, linkCartorio: link } : cv,
            ),
          };
          persistCareer(atualizado);
          setCareer(atualizado);
          setToast(
            pedidoId
              ? "Pedido criado no Cartório! A conversa ganhou um link para a Biblioteca."
              : "A conversa ganhou um link para a Biblioteca.",
          );
        })();
      }
    }
  };

  const handleExcluirConversa = (conversaId: string) => {
    if (!career) return;
    const novasConversas = career.conversas.filter((c) => c.id !== conversaId);
    const novo: CareerState = { ...career, conversas: novasConversas };
    persistCareer(novo);
    setCareer(novo);
  };

  /**
   * COLETA FINAL da coletiva de imprensa (§9): é o ÚNICO lugar onde o "onClick"
   * de processamento (recompensa + contexto) executa. Idempotente por partida:
   * a recompensa desta partida só é paga UMA vez. Registra: recompensa SOV,
   * entrevista no histórico, declarações na memória narrativa, consequências
   * dos personagens (fila) e segue a carreira.
   */
  const concluirColetiva = (declaracoes: DeclaracaoEntrevista[]) => {
    setEntrevistaAberta(false);
    if (!matchEnd) return;
    const ganho =
      matchEnd.resultado === "vitoria" ? 30 : matchEnd.resultado === "empate" ? 20 : 10;
    const partidaAtual = matchEnd.partidaId ?? "sem-id";
    // Idempotência em DUAS camadas: (1) guarda da sessão (patrocinioPagoPartida,
    // também persistida no resume p/ sobreviver a F5) e (2) histórico persistido
    // da carreira — se a entrevista desta partida já está no JSONB, o F5 não
    // permite coletar de novo (SOV local, consequências e fila não repetem).
    const jaRegistrada = (career?.entrevistas ?? []).some((e) => e.partidaId === partidaAtual);
    if (patrocinioPagoPartida === partidaAtual || jaRegistrada) {
      setPatrocinioPagoPartida(partidaAtual);
      setToast("Recompensa desta partida já foi coletada.");
      return;
    }
    setPatrocinioPagoPartida(partidaAtual);

    const uid = perfil?.user_id;
    if (uid) {
      void registrarTransacaoSov(
        uid,
        ganho,
        "reward",
        `Coletiva de imprensa (${matchEnd.competicao})`,
        career ? "career" : "market",
        {
          adversario: matchEnd.timeAdvNome,
          placar: `${matchEnd.placarUser}x${matchEnd.placarAdv}`,
        },
        // Idempotência também no servidor: a chave por partida bloqueia
        // duplo clique/retry além do guarda local patrocinioPagoPartida.
        { sourceEvent: "coletiva", idempotencyKey: `coletiva:${partidaAtual}` },
      );
    }

    if (career) {
      const registro: EntrevistaRegistro = {
        id: `ent-${partidaAtual}`,
        partidaId: partidaAtual,
        competicao: matchEnd.competicao,
        adversario: matchEnd.timeAdvNome,
        placar: `${matchEnd.placarUser}x${matchEnd.placarAdv}`,
        rodada: career.rodadaAtual,
        temporada: career.temporada,
        declaracoes,
        recompensa: ganho,
      };
      let c = registrarEntrevista(
        {
          ...career,
        },
        registro,
      );
      // Consequências (§12): personagens reagem às declarações — entregas na
      // fila (uma por vez, §13). Contexto/memória persistidos no JSONB.
      const dadosEnt: DadosEntrevista = {
        placarUser: matchEnd.placarUser,
        placarAdv: matchEnd.placarAdv,
        timeUserNome: matchEnd.timeUserNome,
        timeAdvNome: matchEnd.timeAdvNome,
        competicao: matchEnd.competicao,
        rodada: matchEnd.rodada,
      };
      const res = consequenciasEntrevista(c, dadosEnt);
      c = res.career;

      // HISTÓRIA PRINCIPAL (§20, §39): a entrevista concluída é o gatilho.
      // Quem pula a coletiva nunca chega aqui — a história não avança (§40).
      // Idempotente por partidaId: a mesma entrevista não avança 2 capítulos.
      const gatilho = processarGatilhoEntrevista(c, partidaAtual, declaracoes);
      c = gatilho.career;
      if (gatilho.post) {
        c = anexarPost(c, gerarPostManual(c, gatilho.post));
      }
      persistCareer(c);
      enfileirarConversas([...res.reacoes, ...gatilho.conversas]);

      // Economia + narrativa (§31): recompensa discreta no SOV Bank — o
      // extrato diz "Recompensa de investigação", nunca revela o segredo.
      if (gatilho.recompensaSov > 0 && uid) {
        const capNovo = c.historia?.capitulo ?? 0;
        void registrarTransacaoSov(
          uid,
          gatilho.recompensaSov,
          "reward",
          "Recompensa de investigação",
          "career",
          { capitulo: capNovo, partidaId: partidaAtual },
          {
            sourceEvent: "investigacao",
            idempotencyKey: `historia:cap${capNovo}:${partidaAtual}`,
          },
        );
        if (capNovo > 0) setToast(`📜 Um documento chamou sua atenção. (+${gatilho.recompensaSov} SOV)`);
        else setToast("🎙️ Contexto registrado. Recompensa coletada.");

        // GRUPO CIDADELA (§6): Cícero comenta a coletiva; se um sinal novo
        // surgiu, Helena/Valéria comentam o acervo (sem revelar o segredo).
        const tomFinal = declaracoes[declaracoes.length - 1]?.tom ?? "neutro";
        postarNoGrupoUmaVez(`entrevista:${partidaAtual}`, {
          tipo: "entrevista",
          tecnico: c.coach?.apelido || c.coach?.nome || userTeam.name,
          tom: tomFinal,
        });
        if (capNovo > 0) {
          postarNoGrupoUmaVez(`pergaminho:${partidaAtual}:cap${capNovo}`, {
            tipo: "pergaminho",
            capitulo: capNovo,
          });
        }
      } else {
        setToast("🎙️ Contexto registrado. Recompensa coletada.");
      }
    } else {
      setToast("🎙️ Entrevista concluída. Recompensa coletada.");
    }
  };

  /**
   * Desfecho do primeiro arco (§28): o jogador registra sua posição sobre a
   * questão central no Arquivo. Persistido no Narrative Ledger e recompensado
   * no SOV Bank uma única vez (chave idempotente por usuário).
   */
  const handleRegistrarPosicao = (posicao: PosicaoFinal) => {
    const atual = careerRef.current;
    if (!atual) return;
    const res = registrarPosicaoFinal(atual, posicao);
    if (res.recompensaSov === 0) return; // já registrado ou arco incompleto
    persistCareer(res.career);
    enfileirarConversas(res.conversas);
    const uid = perfil?.user_id;
    if (uid) {
      void registrarTransacaoSov(
        uid,
        res.recompensaSov,
        "reward",
        "Recompensa de investigação",
        "career",
        { posicao },
        { sourceEvent: "investigacao", idempotencyKey: `historia:desfecho:${uid}` },
      );
    }
    setToast("📜 Sua posição foi registrada no arquivo. (+40 SOV)");
  };

  /** Compra/venda na Bolsa (§23-25): débito/crédito SOV no ledger (module
   *  'market'), com persistência no JSONB da carreira. */
  const handleComprarAtivo = (ativoId: AtivoId, quantidade: number) => {
    if (!career) return;
    const bolsaAtual = garantirBolsa(career.bolsa);
    const custo = custoCompra(bolsaAtual, ativoId, quantidade);
    if (career.coach.sov < custo) {
      setToast("Saldo SOV insuficiente.");
      return;
    }
    const uid = perfil?.user_id;
    if (uid) {
      void registrarTransacaoSov(uid, -custo, "fee", `Bolsa: compra de ${quantidade} cota(s) de ${ativoId}`, "market", {
        ativoId,
        quantidade,
      }, {
        sourceEvent: "bolsa-compra",
        idempotencyKey: `bolsa-compra:${uid}:${ativoId}:${Date.now()}`,
      });
    }
    persistCareer({
      ...career,
      bolsa: comprarAtivo(bolsaAtual, ativoId, quantidade, career.rodadaAtual, career.temporada),
    });
  };

  const handleVenderAtivo = (ativoId: AtivoId, quantidade: number) => {
    if (!career) return;
    const bolsaAtual = garantirBolsa(career.bolsa);
    const preco = bolsaAtual.precos[ativoId];
    const valor = Math.round(preco * quantidade * 100) / 100;
    const pos = bolsaAtual.carteira.find((p) => p.ativoId === ativoId);
    if (!pos || pos.quantidade < quantidade) {
      setToast("Você não possui essas cotas.");
      return;
    }
    const uid = perfil?.user_id;
    if (uid) {
      void registrarTransacaoSov(uid, valor, "reward", `Bolsa: venda de ${quantidade} cota(s) de ${ativoId}`, "market", {
        ativoId,
        quantidade,
      }, {
        sourceEvent: "bolsa-venda",
        idempotencyKey: `bolsa-venda:${uid}:${ativoId}:${Date.now()}`,
      });
    }
    persistCareer({
      ...career,
      bolsa: venderAtivo(bolsaAtual, ativoId, quantidade, career.rodadaAtual, career.temporada),
    });
  };

  // Processa o resultado de um jogo da Copa do Brasil (paralela ao
  // Brasileirão). Avança o chaveamento da copa e aplica efeitos de carreira.
  const finishCopaMatch = (r: MatchResult, gf: number, ga: number) => {
    if (!career?.copaBrasil || !currentCopaFix) return;
    const copa = advanceCopaBrasil(
      career.copaBrasil,
      currentCopaFix,
      r,
      tour?.difficulty ?? difficulty,
    );
    // Marca a rodada-gatilho como consumida para evitar disparar a próxima fase
    // na mesma rodada do Brasileirão.
    copa.rodadaGatilhoConsumida = career.rodadaAtual;

    // Soberania/moral simples pelo resultado da copa (peso um pouco maior que
    // a liga por ser mata-mata).
    let novaSov = career.coach.sov;
    let moral = career.moralTime;
    if (gf > ga) {
      novaSov += 4;
      moral = Math.min(100, moral + 5);
    } else if (gf < ga) {
      novaSov = Math.max(0, novaSov - 2);
      moral = Math.max(0, moral - 5);
    } else {
      // Empate no tempo normal, vencedor nos pênaltis:
      const userHome = r.homeId === userTeam.id;
      const userPen = userHome ? (r.penHome ?? 0) : (r.penAway ?? 0);
      const advPen = userHome ? (r.penAway ?? 0) : (r.penHome ?? 0);
      if (userPen > advPen) {
        novaSov += 2;
        moral = Math.min(100, moral + 2);
      } else {
        novaSov = Math.max(0, novaSov - 1);
        moral = Math.max(0, moral - 3);
      }
    }

    // Campeão da copa: bônus de Soberania + manchete.
    let novas: Headline[] = [];
    if (copa.finished && copa.champion === userTeam.id) {
      novaSov += bonusCampeao(tour?.difficulty ?? difficulty);
      novas = [
        {
          id: `copa-campeao-${Date.now()}`,
          manchete: "CAMPEÃO DA COPA DO BRASIL! Glória eterna",
          tag: "seu-time",
          rodada: career.rodadaAtual,
        },
      ];
    } else if (copa.finished) {
      novas = [
        {
          id: `copa-fim-${Date.now()}`,
          manchete: "Copa do Brasil encerrada",
          tag: "seu-time",
          rodada: career.rodadaAtual,
        },
      ];
    }

    let novaCareer: CareerState = {
      ...career,
      copaBrasil: copa,
      moralTime: moral,
    };
    if (novas.length > 0) novaCareer = addHeadlines(novaCareer, novas);

    // Resultado da copa no Banco Central SOV (module 'career').
    const deltaCopa = Math.max(0, novaSov) - career.coach.sov;
    if (deltaCopa !== 0 && perfil?.user_id) {
      void registrarTransacaoSov(
        perfil.user_id,
        deltaCopa,
        deltaCopa > 0 ? "reward" : "penalty",
        `Copa do Brasil: ${gf}x${ga} (${currentCopaFix.stage})`,
        "career",
        {
          competicao: "copa-do-brasil",
          stage: currentCopaFix.stage,
          campeao: copa.finished && copa.champion === userTeam.id,
        },
      );
    }

    if (perfil?.user_id) {
      void registrarPartidaRemota(
        perfil.user_id,
        novaCareer,
        userTeam.id,
        currentCopaFix,
        r,
        "copa-brasil",
      );
    }
    persistCareer(novaCareer);
    setToast(
      copa.finished && copa.champion === userTeam.id
        ? "CAMPEÃO DA COPA DO BRASIL!"
        : gf > ga
          ? "Vitória na Copa do Brasil!"
          : gf < ga
            ? "Eliminado da Copa do Brasil."
            : "Avançou nos pênaltis na Copa.",
    );

    // Tela de fim de jogo com estatísticas da copa (estilo esportivo).
    const adversario = currentCopaFix.homeId === userTeam.id ? currentCopaFix.awayId : currentCopaFix.homeId;
    const advNome = resolveTeam(adversario, userTeam).name;
    const sobAnterior = career.coach.sov;
    const moralAnterior = career.moralTime;
    setMatchEnd({
      partidaId: `copa-${Date.now()}`,
      resultado: gf > ga ? "vitoria" : gf < ga ? "derrota" : "empate",
      placarUser: gf,
      placarAdv: ga,
      timeUserNome: userTeam.name,
      timeAdvNome: advNome,
      competicao: "Copa do Brasil",
      rodada: currentCopaFix.stage,
      sovDelta: (novaCareer.coach.sov ?? 0) - sobAnterior,
      moralDelta: (novaCareer.moralTime ?? 0) - moralAnterior,
      extra:
        copa.finished && copa.champion === userTeam.id
          ? "CAMPEÃO DA COPA DO BRASIL!"
          : undefined,
    });
    setMatchEndDestino("hub");
    setScreen("match-end");
  };

  const finishTournamentMatch = (r: MatchResult) => {
    if (!tour || !current) return;
    let t: Tournament = structuredClone(tour);
    let ligasAtualizadas: LigasTemporada | undefined;
    let resultadoTemp: ReturnType<typeof processarResultadoTemporada> | null = null;

    // Marcar que o usuário jogou o primeiro jogo (habilita anúncios após)
    markFirstGamePlayed();

    const userIsHome = r.homeId === userTeam.id;
    const gf = userIsHome ? r.homeGoals : r.awayGoals;
    const ga = userIsHome ? r.awayGoals : r.homeGoals;

    // Copa do Brasil (paralela ao Brasileirão): se a partida atual é da copa,
    // aplica o resultado ao chaveamento da copa e NÃO avança o Brasileirão.
    // A própria `finishCopaMatch` navega para a tela de fim de jogo.
    if (currentCopaFix && career?.copaBrasil) {
      finishCopaMatch(r, gf, ga);
      setCurrent(null);
      setCurrentCopaFix(null);
      return;
    }

    if (t.phase === "grupos") {
      const fx = t.groupFixtures.find((x) => x.id === current.id)!;
      applyResult(t, fx, r);

      // Força efetiva (qualidade + torcida + forma) alimenta a simulação
      // de TODOS os clubes — a torcida pesa no universo inteiro (§7-§8).
      const forcas = career ? forcasDaTemporada(career, userTeam) : {};
      const overrides = Object.keys(forcas).length > 0 ? forcas : undefined;

      // Simula apenas os jogos da mesma rodada que NÃO envolvem o usuário
      const currentRound = fx.stage;
      t.groupFixtures
        .filter(
          (x) =>
            !x.played &&
            x.stage === currentRound &&
            x.homeId !== t.userTeamId &&
            x.awayId !== t.userTeamId,
        )
        .forEach((x) =>
          applyResult(t, x, simulateMatch(x.homeId, x.awayId, t.difficulty, false, overrides)),
        );

      if (career?.ligas) {
        const ligasParciais: LigasTemporada = {
          ...career.ligas,
          [career.divisao]: t,
        };
        ligasAtualizadas = simularRodadaDivisoes(
          ligasParciais,
          userTeam.id,
          currentRound,
          t.difficulty,
          overrides,
        );
        t = ligasAtualizadas[career.divisao];
      }

      // só monta o mata-mata quando todos os jogos da fase de grupos terminarem
      if (t.groupFixtures.every((x) => x.played)) {
        if (t.format === "pontos-corridos") {
          // Liga: campeão é o líder da tabela única.
          const tabela = sortTable(t.groups[0]!.table);
          t.champion = tabela[0]!.teamId;
          t.phase = "fim";

          if (career?.ligas && ligasAtualizadas && ligasConcluidas(ligasAtualizadas)) {
            resultadoTemp = processarResultadoTemporada(ligasAtualizadas, userTeam.id);
            if (resultadoTemp.promovido) {
              setToast(
                `PROMOÇÃO! Você subiu para a ${resultadoTemp.novaDivisao === "serie-a" ? "SÉRIE A" : "SÉRIE B"}!`,
              );
            } else if (resultadoTemp.rebaixado) {
              setToast(
                `REBAIXAMENTO! Você caiu para a ${resultadoTemp.novaDivisao === "serie-b" ? "SÉRIE B" : "SÉRIE C"}.`,
              );
            }
          } else {
            setToast(
              t.champion === t.userTeamId
                ? "CAMPEÃO DA LIGA! Pontos corridos conquistados."
                : "Fim da liga — você não ficou em 1º.",
            );
          }
        } else {
          buildKnockout(t);
          setToast(
            qualified(t) ? "Classificado para o mata-mata!" : "Eliminado na fase de grupos.",
          );
        }
      }
    } else {
      const stage = t.knockout[t.knockout.length - 1]!;
      const fx = stage.fixtures.find((x) => x.id === current.id)!;
      fx.played = true;
      fx.result = r;

      // Simula TODOS os jogos não jogados da fase atual
      stage.fixtures
        .filter((x) => !x.played)
        .forEach((x) => {
          x.played = true;
          x.result = simulateMatch(x.homeId, x.awayId, t.difficulty, true);
        });

      advanceKnockout(t);

      // se o usuário caiu, roda o resto do torneio
      while (t.phase === "mata-mata" && !nextUserFixture(t)) {
        const st = t.knockout[t.knockout.length - 1]!;
        st.fixtures.forEach((x) => {
          if (!x.played) {
            x.played = true;
            x.result = simulateMatch(x.homeId, x.awayId, t.difficulty, true);
          }
        });
        advanceKnockout(t);
      }

      if (t.phase === "fim" && t.champion === t.userTeamId) {
        const titles = { ...progress.titles, [t.difficulty]: progress.titles[t.difficulty] + 1 };
        persist({
          ...progress,
          titles,
          trophies: [
            ...progress.trophies,
            { difficulty: t.difficulty, teamId: t.userTeamId, date: new Date().toISOString() },
          ],
        });
        setToast("CAMPEÃO! Troféu adicionado à sala.");
      }
    }

    // ============ CARREIRA / SOBERANIA / MANCHETES ============
    // Variáveis capturadas no bloco de carreira para a tela de fim de jogo.
    let patchSob = 0;
    let patchMoral = 0;
    let posTabela: number | undefined;
    let extraMsg: string | undefined;
    if (career) {
      let novaSov = career.coach.sov;
      let moral = career.moralTime;

      // Pontos escassos: V=+3 / E=+1 / D=0
      if (gf > ga) {
        novaSov += POINTS.VITORIA;
        moral = Math.min(100, moral + 4);
      } else if (gf < ga) {
        novaSov = Math.max(0, novaSov + POINTS.DERROTA);
        moral = Math.max(0, moral - 6);
      } else {
        novaSov += POINTS.EMPATE;
        moral = Math.max(0, moral - 1);
      }

      // Bônus condicionais da última escolha:
      const lastChoice = career.ultimasEscolhas[career.ultimasEscolhas.length - 1];
      if (lastChoice === "goleada") {
        if (gf - ga >= 2) novaSov += 5;
        else if (gf < ga) novaSov = Math.max(0, novaSov - 3);
      }
      if (lastChoice === "respeito" && gf > ga) novaSov += 2;
      if (lastChoice === "titular" && gf > ga) moral = Math.min(100, moral + 4);

      let novoTitulos = career.coach.titulos;

      // Bônus de classificação para mata-mata (só quando entra a fase)
      const classificouAgora =
        tour?.phase === "grupos" &&
        t.phase === "mata-mata" &&
        t.knockout[0]?.fixtures.some((f) => f.homeId === t.userTeamId || f.awayId === t.userTeamId);
      if (classificouAgora) novaSov += POINTS.CLASSIFICOU_MATA;

      // Fim de campanha: bônus de posição final
      const manchetesFim: string[] = [];
      if (t.phase === "fim") {
        // Determina posição do usuário
        if (t.champion === t.userTeamId) {
          const bonus = bonusCampeao(t.difficulty);
          novaSov += bonus;
          novoTitulos += 1;
          manchetesFim.push(`CAMPEÃO! ${career.coach.apelido || career.coach.nome} é herói eterno`);
          // Cerimônia de premiação!
          setCeremonyBonus(bonus);
          setShowCeremony(true);
        } else {
          // Vice? Terceiro? Quarto?
          const finalStage = t.knockout[t.knockout.length - 1];
          const foiVice = finalStage?.fixtures.some(
            (f) =>
              (f.homeId === t.userTeamId || f.awayId === t.userTeamId) &&
              f.stage.toLowerCase().includes("final"),
          );
          const semiStage = t.knockout[t.knockout.length - 2];
          const foiSemi = semiStage?.fixtures.some(
            (f) => f.homeId === t.userTeamId || f.awayId === t.userTeamId,
          );
          if (foiVice) {
            novaSov += POINTS.VICE;
            manchetesFim.push(`Vice-campeão: ${career.coach.apelido} chega perto do título`);
          } else if (foiSemi) {
            novaSov += POINTS.TERCEIRO;
            manchetesFim.push(`Semifinalista: ${career.coach.apelido} termina no Top 4`);
          } else {
            novaSov += POINTS.QUARTO;
          }
        }
      }

      // Gera manchetes da rodada
      const rodadaTexto = current.stage;
      const jogadosNessaRodada =
        t.phase === "grupos"
          ? t.groupFixtures.filter((f) => f.stage === current.stage && f.played)
          : (t.knockout[t.knockout.length - 1]?.fixtures.filter((f) => f.played) ?? []);
      const fixDoUsuario = jogadosNessaRodada.find(
        (f) => f.homeId === t.userTeamId || f.awayId === t.userTeamId,
      );
      const teamName = userTeam.name;
      // Classificação do usuário na tabela do grupo (ou liga) pra manchetes de líder/rebaixa.
      const grupoDoUser = t.groups.find((g) => g.teamIds.includes(t.userTeamId));
      const tabelaOrdenada = grupoDoUser ? sortTable(grupoDoUser.table) : [];
      const posicaoUsuario = tabelaOrdenada.findIndex((r) => r.teamId === t.userTeamId) + 1;
      const novas = gerarManchetesDaRodada(
        t,
        teamName,
        career.coach,
        rodadaTexto,
        jogadosNessaRodada,
        fixDoUsuario,
        {
          subornoAtivo: !!career.suborno?.nodeAtual,
          posicaoUsuario,
          totalTimes: tabelaOrdenada.length,
        },
      );
      manchetesFim.forEach((m, i) =>
        novas.unshift({
          id: `end-${Date.now()}-${i}`,
          manchete: m,
          tag: "seu-time",
          rodada: 99,
        }),
      );

      let novaCareer: CareerState = {
        ...career,
        bonusProximaPartida: 0,
        penaltiesProximaPartida:
          // Sanção de desfalque vira penalidade de poder na próxima partida
          // (elenco reduzido). Aplicada uma única vez e consumida.
          (career.desfalqueBotaoProxima ?? 0) * 3,
        moralTime: moral,
        // Sanções consumidas após a partida real (W.O. já foi tratado em playNext).
        woProximaPartida: undefined,
        desfalqueBotaoProxima: undefined,
        // Perda de pontos da tabela (punição CBJF) é refletida na soberania como
        // desconto simbólico — a pontuação da tabela é derivada dos resultados.
        perdaPontosProxima: undefined,
        // Avança a rodada do Brasileirão para distribuir narrativas/Copa.
        rodadaAtual: (career.rodadaAtual ?? 0) + 1,
        rodadasDesdeEventoNarrativo: (career.rodadasDesdeEventoNarrativo ?? 0) + 1,
        divisao: resultadoTemp?.novaDivisao ?? career.divisao,
        ligas: ligasAtualizadas ?? career.ligas,
        composicoes: resultadoTemp?.composicoes ?? career.composicoes,
        coach: {
          ...career.coach,
          sov: Math.max(0, Math.round(novaSov)),
          titulos: novoTitulos,
        },
      };
      novaCareer = addHeadlines(novaCareer, novas);

      // === RPG narrativo: sequência, rede social e gatilhos de eventos ===
      const resultadoRpg = gf > ga ? ("vitoria" as const) : gf < ga ? ("derrota" as const) : ("empate" as const);
      novaCareer = atualizarSequenciaRpg(novaCareer, resultadoRpg);
      const advId = userIsHome ? r.awayId : r.homeId;
      const advNome = teamByIdSync(advId)?.name ?? advId;
      const tipoPost =
        gf - ga >= 3
          ? ("goleada_pro" as const)
          : ga - gf >= 3
            ? ("goleada_contra" as const)
            : resultadoRpg;
      novaCareer = anexarPost(
        novaCareer,
        gerarPostPartida(novaCareer, {
          tipo: tipoPost,
          timeNome: userTeam.name,
          adversarioNome: advNome,
          golsPro: gf,
          golsContra: ga,
          divisao: novaCareer.divisao,
        }),
      );
      const comEvento = processarEventosRpg(novaCareer);
      if (comEvento) novaCareer = comEvento;
      // Ritual da Trilha: se a sombra está ativa (SOV < 30 ou 3+ derrotas
      // seguidas), o Pracinha envia o convite como notificação no celular.
      novaCareer = convidarRitualTrilha(novaCareer);
      // === fim RPG ===

      // Se o torneio ainda não acabou e ainda tem próxima do usuário, prepara evento
      if (t.phase !== "fim" && nextUserFixture(t)) {
        const proximoFix = nextUserFixture(t)!;
        novaCareer = preparaEscolha(novaCareer, proximoFix.stage);
      }
      // Patrocinador: avalia a meta contra o resultado e propõe novo desafio
      // se ainda houver partida por vir.
      const temProxima = t.phase !== "fim" && !!nextUserFixture(t);
      const rDesafio = aplicarDesafioPatrocinador(novaCareer, gf, ga, temProxima);
      novaCareer = rDesafio.estado;

      // === Bolsa de Valores da Cidadela (§24, §25): o Clube reage ao resultado
      // real da rodada; demais setores driftam; dividendos são distribuídos e
      // creditados em SOV (persistido no JSONB da carreira = fonte de verdade).
      {
        const resultadoBolsa =
          gf > ga ? ("vitoria" as const) : gf < ga ? ("derrota" as const) : ("empate" as const);
        const bolsaAtual = evoluirBolsa(garantirBolsa(novaCareer.bolsa), {
          rodada: novaCareer.rodadaAtual,
          resultado: resultadoBolsa,
          goleada: Math.abs(gf - ga) >= 3,
          moral: novaCareer.moralTime,
        });
        const div = pagarDividendos(bolsaAtual, novaCareer.rodadaAtual, novaCareer.temporada);
        if (div.total > 0) {
          novaCareer = {
            ...novaCareer,
            bolsa: div.bolsa,
          };
          if (perfil?.user_id) {
            void registrarTransacaoSov(
              perfil.user_id,
              Math.round(div.total * 100) / 100,
              "reward",
              "Dividendos da Bolsa de Valores da Cidadela",
              "market",
              { rodada: novaCareer.rodadaAtual, tipo: "dividendo" },
              // Dividendo por rodada: idempotente também no servidor
              // (reforça o guarda local ultimaRodadaBolsa).
              {
                sourceEvent: "dividendo",
                idempotencyKey: `dividendo:${novaCareer.temporada}:r${novaCareer.rodadaAtual}`,
              },
            );
          }
        } else {
          novaCareer = { ...novaCareer, bolsa: div.bolsa };
        }
      }

      // === Dividendos de Proprietário de Clubes (sistema de cotas) ===
      const propDividendos = processarDividendosProprietario(
        novaCareer,
        novaCareer.rodadaAtual,
        novaCareer.temporada ?? 1,
      );
      if (propDividendos.deltaSov > 0 && perfil?.user_id) {
        novaCareer = propDividendos.career;
        void registrarTransacaoSov(
          perfil.user_id,
          propDividendos.deltaSov,
          "reward",
          "Dividendos de Proprietário de Clubes",
          "market",
          { rodada: novaCareer.rodadaAtual, tipo: "dividendo-proprietario" },
          {
            sourceEvent: "dividendo-proprietario",
            idempotencyKey: `dividendo-prop:${novaCareer.temporada}:r${novaCareer.rodadaAtual}`,
          },
        );

        // Notificação no celular sobre dividendos
        const clubesComDividendos = propDividendos.detalhes.map((d) => {
          const clube = TEAMS.find((t: Team) => t.id === d.clubeId);
          return clube ? `${clube.name} (${d.participacao.toFixed(0)}%)` : d.clubeId;
        }).join(", ");

        enfileirarConversas([
          {
            id: `dividendos-${novaCareer.temporada}-r${novaCareer.rodadaAtual}`,
            tipo: "evento",
            nome: "Banco",
            avatar: "🏦",
            cargo: "Financeiro",
            naoLida: true,
            mensagens: [
              {
                id: `div-msg-${Date.now()}`,
                texto: `Dividendos recebidos: ${propDividendos.deltaSov.toFixed(0)} SOV. Clubes: ${clubesComDividendos}.`,
                remetente: "outro",
                timestamp: new Date().toISOString(),
              },
            ],
          },
        ]);
      }

      // === Torcida global (§5-§8): a rodada INTEIRA migra torcedores — o
      // jogo real do usuário e todos os simulados das 3 divisões. No fim da
      // temporada, cada campeão atrai torcedores do resto do universo.
      // Tudo zero-sum (Σ = 1.000.000) e persistido no JSONB da carreira.
      if (ligasAtualizadas) {
        novaCareer = aplicarRodadaTorcida(novaCareer, ligasAtualizadas, current.stage);
        if (t.phase === "fim" && ligasConcluidas(ligasAtualizadas)) {
          novaCareer = aplicarTitulosDaTemporada(novaCareer, ligasAtualizadas);
        }
      }

      // === Marco de 1º lugar (§10): chegou ao topo pela 1ª vez na temporada →
      // comemoração REAL (celular + toast), UMA vez por temporada. O marco é
      // persistido — F5/hidratação não repete a celebração.
      if (
        posicaoUsuario === 1 &&
        chegouAoPrimeiroLugar(
          posicaoUsuario,
          novaCareer.temporada ?? 1,
          career.marcoLiderTemporada,
        )
      ) {
        const temp = novaCareer.temporada ?? 1;
        novaCareer = { ...novaCareer, marcoLiderTemporada: temp };
        setTimeout(
          () => setToast("🏆 PARABÉNS! VOCÊ CHEGOU AO PRIMEIRO LUGAR!"),
          1200,
        );
        enfileirarConversas([
          {
            id: `marco-lider-t${temp}`,
            tipo: "evento",
            nome: PERSONAGENS["npc-dirigente"].nome,
            avatar: "🏢",
            cargo: "Dirigente",
            npcId: "npc-dirigente",
            naoLida: true,
            mensagens: [
              {
                id: `marco-lider-m-${temp}`,
                texto:
                  "Treinador, o estágio NUNCA cantou seu nome assim. O clube está no TOPO da tabela — segura o rojão: o vestiário agora é seu. Mantenha o foco: o topo se segura com pés no chão.",
                remetente: "outro",
                timestamp: new Date().toISOString(),
              },
            ],
          },
        ]);
      }

      persistCareer(novaCareer);

      // Delta exibido na tela de fim de partida. O LEDGER recebe cada componente
      // UMA vez por escritor próprio: delta da partida → aplicarResultadoRemoto
      // (chave `partida:{uid}:{fixture}`), dividendos → bloco da Bolsa acima
      // (chave `dividendo:{t}:r{n}`), desafio → abaixo, bônus de fim de
      // temporada → aplicarFimCampanhaRemoto. Registrar o patchSob inteiro aqui
      // CREDITAVA TUDO DUAS VEZES (saldo do ledger divergia da UI).
      patchSob = novaCareer.coach.sov - career.coach.sov;

      // Recompensa do patrocinador no Banco Central SOV (module 'career'),
      // idempotente por desafio (o id do desafio é único por proposta).
      if (rDesafio.ganhou > 0 && perfil?.user_id) {
        void registrarTransacaoSov(
          perfil.user_id,
          rDesafio.ganhou,
          "reward",
          "Desafio de patrocinador cumprido (carreira)",
          "career",
          { rodada: career.rodadaAtual, golsPro: gf, golsContra: ga },
          career.desafioPatrocinador?.id
            ? {
                sourceEvent: "desafio_patrocinador",
                idempotencyKey: `desafio:${perfil.user_id}:${career.desafioPatrocinador.id}`,
              }
            : undefined,
        );
      }
      patchMoral = novaCareer.moralTime - career.moralTime;
      posTabela = posicaoUsuario > 0 ? posicaoUsuario : undefined;
      extraMsg = manchetesFim[0];

      // Fim de temporada (liga concluída): economia de Soberania decide se o
      // treinador segue (temporada infinita) ou é demitido (Game Over).
      if (t.phase === "fim") {
        const v = avaliarFimTemporada(
          novaCareer.coach.sov,
          novaCareer.divisao,
          career.temporadasInadimplente ?? 0,
        );
        setVeredito(v);
      }

      // Sync remoto (autoritativo) — não bloqueia UX
      if (perfil?.user_id) {
        void registrarPartidaRemota(
          perfil.user_id,
          novaCareer,
          userTeam.id,
          current,
          r,
          "brasileirao",
        );
        const isUserFixture = current.homeId === t.userTeamId || current.awayId === t.userTeamId;
        if (isUserFixture) {
          const lastChoice = career.ultimasEscolhas[career.ultimasEscolhas.length - 1] ?? null;
          // partidaId → crédito/débito da partida idempotente no ledger (§19).
          aplicarResultadoRemoto(gf, ga, lastChoice, current.id).catch(() => {});
          void registrarEventoMissao("botao_partida_carreira");
          if (gf > ga) void registrarEventoMissao("botao_vitoria_carreira");
          // GRUPO CIDADELA (§6): NPCs comentam o resultado — o grupo parece vivo.
          const advIdGrupo = current.homeId === t.userTeamId ? current.awayId : current.homeId;
          postarNoGrupoUmaVez(`partida:${current.id}`, {
            tipo: "partida-resultado",
            resultado: gf > ga ? "vitoria" : gf === ga ? "empate" : "derrota",
            tecnico: userTeam.name,
            adversario: resolveTeam(advIdGrupo, userTeam).name,
          });
        }
        if (t.phase === "fim") {
          void finalizarTemporadaRemota(perfil.user_id, novaCareer);
          let posicao: "campeao" | "vice" | "terceiro" | "quarto" | "fora" = "fora";
          if (t.champion === t.userTeamId) posicao = "campeao";
          else {
            const finalStage = t.knockout[t.knockout.length - 1];
            const foiVice = finalStage?.fixtures.some(
              (f) =>
                (f.homeId === t.userTeamId || f.awayId === t.userTeamId) &&
                f.stage.toLowerCase().includes("final"),
            );
            const semiStage = t.knockout[t.knockout.length - 2];
            const foiSemi = semiStage?.fixtures.some(
              (f) => f.homeId === t.userTeamId || f.awayId === t.userTeamId,
            );
            if (foiVice) posicao = "vice";
            else if (foiSemi) posicao = "terceiro";
            else posicao = "quarto";
          }
          // careerAtual autoritativa (evita race que apagava a promoção no
          // JSONB) + chave por temporada/divisão (bônus nunca paga 2×, §19).
          aplicarFimCampanhaRemoto(posicao, t.difficulty, {
            careerAtual: novaCareer,
            temporada: novaCareer.temporada,
            divisao: novaCareer.divisao,
          }).catch(() => {});
        }
        // As manchetes da rodada já foram persistidas no snapshot da carreira
        // (persistCareer acima) — não regravar aqui (duplicava headlines).
      }
    }
    // ============ FIM CARREIRA ============

    // Atualizar gols no progresso
    const novoProgresso = {
      ...progress,
      gols_feitos: (progress.gols_feitos || 0) + gf,
      gols_sofridos: (progress.gols_sofridos || 0) + ga,
    };
    persist(novoProgresso);

    // A soberania da partida de carreira já foi registrada no Banco Central por
    // `aplicarResultadoRemoto` (module 'career'). A escrita anterior dobrava o
    // delta — removida como parte da migração SOV.

    persistTournament(t);
    setCurrent(null);

    // Geração de conteúdo pós-jogo pela IA central (relatório médico + redes
    // sociais — a coletiva duplicada foi removida: NÃO há segunda entrevista,
    // §8). As conversas entram na fila e chegam UMA POR VEZ (§13), com
    // notificação (toast + som, §14). Fallback procedural garante texto.
    (async () => {
      try {
        if (!career) return;
        const adversario = current.homeId === userTeam.id ? current.awayId : current.homeId;
        const advTeam = teamByIdSync(adversario);
        const tabelaAtiva = career.ligas?.[career.divisao]?.groups ?? t.groups;
        const linhaUsuario = tabelaAtiva
          .find((g) => g.teamIds.includes(userTeam.id))
          ? sortTable(tabelaAtiva.find((g) => g.teamIds.includes(userTeam.id))!.table)
            .findIndex((row) => row.teamId === userTeam.id) + 1
          : 0;
        const resultado = {
          golsPro: gf,
          golsContra: ga,
          timeNome: userTeam.name,
          coach: career.coach.apelido || "Treinador",
          adversarioNome: advTeam?.name,
          rodada: career.rodadaAtual,
          competicao: currentCopaFix ? "copa" : "liga",
          competicaoNome: currentCopaFix ? "Copa do Brasil" : "Brasileirão",
          divisao: career.divisao,
          temporada: career.temporada,
          posicaoTabela: linhaUsuario,
          moralTime: career.moralTime,
          sov: career.coach.sov,
          rodadasRestantes: t.groupFixtures.filter((fx) => !fx.played).length,
        } as const;
        const [relMed, redes] = await Promise.all([
          relatorioMedico(resultado),
          redesSociaisRodada(resultado),
        ]);
        const agora = new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        // Canais estáveis: médico e redes sociais têm UMA conversa cada; as
        // mensagens da rodada entram na conversa existente (merge na fila).
        // Ids de mensagem por partida: reprocessar a mesma partida não duplica.
        const partidaRef = current.id;
        const novasConv: ConversaCelular[] = [];
        if (relMed) {
          novasConv.push({
            id: "conv-canal-medico",
            tipo: "medico",
            nome: "Dr. Maurício",
            avatar: "🩺",
            cargo: "Departamento Médico",
            canal: "medico",
            mensagens: [
              { id: `m-med-${partidaRef}`, texto: relMed, remetente: "outro", timestamp: agora },
            ],
            naoLida: true,
          });
        }
        for (let i = 0; i < (redes?.length ?? 0); i++) {
          const t = redes[i]!;
          novasConv.push({
            id: "conv-canal-redes",
            tipo: "evento",
            nome: "Torcida (Redes Sociais)",
            avatar: "📱",
            cargo: "Menções da rodada",
            canal: "redes",
            mensagens: [
              { id: `m-red-${partidaRef}-${i}`, texto: t, remetente: "outro", timestamp: agora },
            ],
            naoLida: true,
          });
        }
        // Entrega gradual: nunca dump de N mensagens de uma vez (§13).
        enfileirarConversas(novasConv);
      } catch {
        // fallback silencioso: o jogo segue sem conteúdo IA
      }
    })();

    // Tela de fim de jogo com estatísticas reais (estilo esportivo). O botão
    // "Continuar" volta ao hub.
    {
      const advId2 = userIsHome ? r.awayId : r.homeId;
      const advNome2 = teamByIdSync(advId2)?.name ?? advId2;
      setMatchEnd({
        partidaId: `liga-${Date.now()}`,
        resultado: gf > ga ? "vitoria" : gf < ga ? "derrota" : "empate",
        placarUser: gf,
        placarAdv: ga,
        timeUserNome: userTeam.name,
        timeAdvNome: advNome2,
        competicao: career
          ? `Brasileirão · ${(career.divisao ?? "serie-a").replace("-", " ").toUpperCase()}`
          : "Torneio",
        rodada: current.stage,
        sovDelta: patchSob,
        moralDelta: patchMoral,
        posicaoTabela: posTabela,
        extra: extraMsg,
      });
      setMatchEndDestino("hub");
      setScreen("match-end");
    }
  };

  const qualified = (t: Tournament) =>
    t.knockout[0]?.fixtures.some((f) => f.homeId === t.userTeamId || f.awayId === t.userTeamId) ??
    false;

  /* ---------- telas ---------- */
  if (screen === "match-end" && matchEnd) {
    // Ganho da coletiva escala com o resultado (incentiva a entrevista).
    const ganhoColetiva =
      matchEnd.resultado === "vitoria" ? 30 : matchEnd.resultado === "empate" ? 20 : 10;
    const partidaAtual = matchEnd.partidaId ?? "sem-id";
    const coletivaJaPaga = patrocinioPagoPartida === partidaAtual;
    // Career mínima para coletivas em amistosos (contexto escopado, §31).
    const careerConvite: CareerState = career ?? {
      ...EMPTY_CAREER,
      coach: {
        ...EMPTY_CAREER.coach,
        nome: perfil?.nome ?? "Treinador",
        apelido: perfil?.nome ?? "Treinador",
      },
    };
    return (
      <>
        <MatchEndScreen
          dados={matchEnd}
          patrocinioPago={coletivaJaPaga}
          entrevistaAberta={entrevistaAberta}
          onPatrocinio={() => {
            // Abre a coletiva direto (SEM anúncio — §9). O retorno de qualquer
            // aba anterior nunca ressuscita ação: guardas explícitas.
            if (!entrevistaAberta && !coletivaJaPaga) setEntrevistaAberta(true);
          }}
          onContinuar={() => {
            setMatchEnd(null);
            setEntrevistaAberta(false);
            setScreen(matchEndDestino);
          }}
        />
        {entrevistaAberta && (
          <EntrevistaColetiva
            career={careerConvite}
            dados={{
              placarUser: matchEnd.placarUser,
              placarAdv: matchEnd.placarAdv,
              timeUserNome: matchEnd.timeUserNome,
              timeAdvNome: matchEnd.timeAdvNome,
              competicao: matchEnd.competicao,
              rodada: matchEnd.rodada,
            }}
            ganho={ganhoColetiva}
            coachNome={careerConvite.coach.apelido || careerConvite.coach.nome || "Treinador"}
            onColetar={concluirColetiva}
            onFechar={() => setEntrevistaAberta(false)}
          />
        )}
      </>
    );
  }

  if (screen === "online") {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-5xl px-4 pb-16">
          <Header
            progress={progress}
            onTrophies={() => setScreen("trophies")}
            onHome={() => setScreen("menu")}
          />
          {!perfil ? (
            <div className="panel text-center py-12">
              <Globe className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h2 className="font-display text-2xl">Amistoso Online</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Faça login para desafiar outros jogadores em tempo real.
              </p>
              <button onClick={() => setScreen("profile")} className="btn-primary mt-4">
                Entrar / Cadastrar
              </button>
            </div>
          ) : (
            <OnlineMatchV3 onBack={() => setScreen("menu")} onEstadoPartida={setEmPartidaOnline} />
          )}
        </div>
      </Shell>
    );
  }

  if (screen === "online-championship") {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-5xl px-4 pb-16">
          <Header
            progress={progress}
            onTrophies={() => setScreen("trophies")}
            onHome={() => setScreen("menu")}
          />
          {!perfil ? (
            <div className="panel text-center py-12">
              <Trophy className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h2 className="font-display text-2xl">Campeonato Online</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Faça login para participar de campeonatos contra outros jogadores.
              </p>
              <button onClick={() => setScreen("profile")} className="btn-primary mt-4">
                Entrar / Cadastrar
              </button>
            </div>
          ) : (
            <OnlineChampionship
              onBack={() => setScreen("menu")}
              onEstadoPartida={setEmPartidaOnline}
            />
          )}
        </div>
      </Shell>
    );
  }

  if (screen === "profile") {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-5xl px-4 pb-16">
          <Header
            progress={progress}
            onTrophies={() => setScreen("trophies")}
            onHome={() => setScreen("menu")}
          />
          <ProfileSetup perfil={perfil} onPronto={aoLogar} onBack={() => setScreen("menu")} />
        </div>
      </Shell>
    );
  }

  if (screen === "career-menu") {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-5xl px-4 pb-16">
          <Header
            progress={progress}
            onTrophies={() => setScreen("trophies")}
            onHome={() => setScreen("menu")}
          />
          <CareerMenu
            career={career}
            onLoadCareer={() => {
              if (career) {
                setLoading(true);
                setTimeout(() => {
                  setScreen("hub");
                  setLoading(false);
                }, 1500);
              } else {
                setToast("Nenhuma campanha carregada. Tente novamente.");
              }
            }}
            onNewCareer={handleNewCareer}
            onSaveCampaign={handleSaveCampaign}
            onDeleteCareer={handleDeleteCampaign}
            onBack={() => setScreen("menu")}
          />
        </div>
      </Shell>
    );
  }

  if (screen === "career-intro") {
    return (
      <Shell>
        <CareerIntro
          nomeJogador={perfil?.nome}
          onIniciar={() => setScreen("coach-setup")}
          onBack={() => setScreen("career-menu")}
        />
      </Shell>
    );
  }

  if (screen === "coach-setup") {
    return (
      <Shell>
        <CoachSetup
          timeName={userTeam.name}
          nomeInicial={perfil?.nome}
          onFinish={finishCoachSetup}
          onBack={() => setScreen("menu")}
        />
      </Shell>
    );
  }

  if (screen === "propriedade") {
    return (
      <Shell>
        <PropriedadeScreen
          career={career ?? EMPTY_CAREER}
          onBack={() => setScreen("hub")}
          onComprarCota={handleComprarCota}
          onVenderCota={handleVenderCota}
        />
      </Shell>
    );
  }

  /* ---------- prioridade do celular oficial (§15) ---------- */
  // Decisão prioritária (suborno > narrativa > choice) renderizada no celular
  // FIXO, único celular do jogo (§15). Calculada antes das telas de jogo.
  let prioridadeCelular: React.ReactNode = null;
  try {
    if (career?.suborno && (career.suborno.nodeAtual || career.suborno.desfecho)) {
      prioridadeCelular = (
        <SubornoStory
          state={career.suborno}
          onAvancar={aplicarSuborno}
          onFechar={() => setScreen("hub")}
        />
      );
    } else if (career?.narrativa?.cenaAtual) {
      const cena = cenaDaNarrativa(career.narrativa);
      if (cena) {
        prioridadeCelular = (
          <NarrativeModal
            state={career.narrativa}
            cena={cena}
            onAvancar={aplicarNarrativa}
            onBack={() => setScreen("hub")}
          />
        );
      }
    } else if (career?.eventoPendenteId) {
      const evento = CHOICE_EVENTS.find((e) => e.id === career.eventoPendenteId);
      if (evento) {
        prioridadeCelular = (
          <ChoiceModal
            evento={evento}
            onChoose={aplicarEscolha}
            onBack={() => setScreen("hub")}
          />
        );
      }
    }
  } catch {
    prioridadeCelular = null;
  }
  const naoLidasCelular =
    (career?.conversas?.filter((c) => c.naoLida).length ?? 0) +
    (prioridadeCelular ? 1 : 0) +
    (career?.desafioPatrocinador && !career.desafioPatrocinador.concluido ? 1 : 0);


  if (screen === "friendly-match" || screen === "tournament-match") {
    const f =
      screen === "friendly-match"
        ? { homeId: userTeam.id, awayId: rivalTeam, stage: "Amistoso" }
        : current!;
    const userSide = f.homeId === userTeam.id ? "home" : "away";
    const knockout = screen === "tournament-match" && (tour?.phase ?? "") === "mata-mata";
    // Contexto estratégico da CPU: força EFETIVA do adversário (qualidade +
    // torcida + forma) e a forma recente do jogador (balanceamento dinâmico).
    const advId = f.homeId === userTeam.id ? f.awayId : f.homeId;
    const forcas = career ? forcasDaTemporada(career, userTeam) : {};
    const aiContext = {
      forcaCpu: forcas[advId] ?? resolveTeam(advId, userTeam).power,
      forcaJogador: userTeam.power,
      formaJogador: career
        ? formaDoJogador(career, userTeam.id)
        : { sequenciaVitorias: 0, sequenciaDerrotas: 0, invicto: false },
    };
    return (
      <Shell>
        <MatchView
          key={`${f.homeId}-${f.awayId}-${screen}`}
          homeId={f.homeId}
          awayId={f.awayId}
          userSide={userSide}
          difficulty={difficulty}
          knockout={knockout}
          turns={knockout ? 28 : 24}
          stageLabel={f.stage}
          onFinish={screen === "friendly-match" ? finishFriendly : finishTournamentMatch}
          onQuit={() => setScreen(screen === "friendly-match" ? "menu" : "hub")}
          customTeam={userTeam}
          formation={formation}
          aiContext={aiContext}
        />
        {/* Celular também disponível durante partidas */}
        <CelularFixo
          userId={perfil?.user_id ?? null}
          nomeJogador={career?.coach.apelido || career?.coach.nome || perfil?.nome || null}
          onLogin={aoLogar}
          conversas={career?.conversas ?? []}
          desafioPatrocinador={career?.desafioPatrocinador ?? null}
          feed={career?.feedCidadela ?? []}
          trilhaMissoes={career ? missoesTrilha(career) : []}
          npcDigitandoId={npcDigitando}
          onEnviarMensagem={handleEnviarMensagem}
          onExcluirConversa={handleExcluirConversa}
          onEscolhaRpg={handleEscolhaRpg}
          historia={career?.historia}
          onRegistrarPosicao={handleRegistrarPosicao}
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
          prioridade={prioridadeCelular}
          naoLidas={naoLidasCelular}
          perfilCidadela={perfilCidadela}
          saldoSov={saldoSov}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      {/* REMOVIDO: AdsterraSocialBar - causava disparos indevidos em cliques globais */}
      {/* Loading ÚNICO com identidade estável: cobre a fase de auth
          (carregando) e a de hidratação/ações (loading) sem montar novamente
          (o que reiniciava a barra a cada re-render). O callback congela com
          useCallback para não re-disparar o efeito do rAF. */}
      {(carregando || loading) && (
        <LoadingScreen
          pronto={loading ? loadingReady : !carregando}
          onCompleto={loading ? loadingOnComplete : noop}
        />
      )}
      {/* A tela de fim de temporada só aparece DEPOIS que o usuário sair da
          tela de fim de partida (sequência: partida → estatísticas → hub →
          celebração da temporada). Nunca duas overlays empilhadas. */}
      {veredito && career?.ligas && screen !== "match-end" && (
        <SeasonEndScreen
          resumo={resumoTemporada(career.ligas, userTeam.id)}
          veredito={veredito}
          temporada={career.temporada ?? 1}
          userTeam={userTeam}
          onContinuar={startNextSeason}
          onReiniciar={gameOverReset}
        />
      )}
      {showCeremony && career?.coach.nome && (
        <TitleCeremony
          coach={career.coach}
          timeName={userTeam.name}
          difficulty={tour?.difficulty ?? difficulty}
          soberaniaAdd={ceremonyBonus}
          onContinue={() => setShowCeremony(false)}
        />
      )}
      <div className="mx-auto w-full max-w-5xl px-4 pb-16">
        <Header
          progress={progress}
          onTrophies={() => setScreen("trophies")}
          onHome={() => setScreen("menu")}
        />

        {screen === "menu" && (
          <Menu
            progress={progress}
            onFriendly={() => setScreen("friendly-setup")}
            onOnline={() => setScreen("online")}
            onOnlineChampionship={() => setScreen("online-championship")}
            onCareerMenu={() => setScreen("career-menu")}
            onTrophies={() => setScreen("trophies")}
            onProfile={() => setScreen("profile")}
            hasTour={!!tour && tour.phase !== "fim"}
            onResume={() => setScreen("hub")}
            onDeleteCampaign={handleDeleteCampaign}
            onSaveCampaign={handleSaveCampaign}
            {...(onBack ? { onBack } : {})}
          />
        )}

        {screen === "friendly-setup" && (
          <Setup
            title="Amistoso"
            subtitle="Seu time personalizado vs adversário. Escolha o nível e o oponente."
            userTeam={userTeam}
            rivalTeam={rivalTeam}
            setRivalTeam={setRivalTeam}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            progress={progress}
            showRival
            onStart={() => setScreen("friendly-match")}
            onBack={() => setScreen("menu")}
          />
        )}

        {screen === "tournament-setup" && (
          <Setup
            title="Carreira no Campus"
            subtitle="Brasileirão (pontos corridos) + Copa do Brasil integrada. Continue jogando enquanto tiver Soberania."
            userTeam={userTeam}
            rivalTeam={rivalTeam}
            setRivalTeam={setRivalTeam}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            progress={progress}
            onStart={startTournament}
            onBack={() => setScreen("menu")}
          />
        )}

        {screen === "hub" && tour && (
          <CareerHub
            tour={tour}
            userTeam={userTeam}
            career={career}
            ligas={career?.ligas}
            onPlay={playNext}
            onExit={() => setScreen("menu")}
            onOpenClassificacao={() => setScreen("classificacao")}
            onOpenCalendario={() => setScreen("calendario")}
            onOpenEconomia={() => setScreen("economia")}
            onOpenPropriedade={() => setScreen("propriedade")}
          />
        )}

        {screen === "classificacao" && tour && (
          <ClassificacaoScreen
            tour={tour}
            userTeam={userTeam}
            currentDivisao={career?.divisao ?? "serie-c"}
            ligas={career?.ligas}
            copaBrasil={career?.copaBrasil ?? null}
            onBack={() => setScreen("hub")}
          />
        )}

        {/* Módulos em tela própria (§17): título + conteúdo + voltar. */}
        {screen === "calendario" && tour && career && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => setScreen("hub")} className="btn-ghost text-sm">
                Voltar ao Hub
              </button>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                Calendário da Temporada
              </span>
            </div>
            <CalendarView
              tour={tour}
              userTeam={userTeam}
              currentDivisao={career.divisao ?? "serie-c"}
              copaBrasil={career.copaBrasil ?? null}
            />
          </div>
        )}

        {screen === "economia" && career && (
          <EconomiaScreen
            career={career}
            onComprar={handleComprarAtivo}
            onVender={handleVenderAtivo}
            onBack={() => setScreen("hub")}
          />
        )}

        {screen === "trophies" && (
          <TrophyRoom progress={progress} userTeam={userTeam} onBack={() => setScreen("menu")} />
        )}
      </div>

      {toast && <div className="toast font-display">{toast}</div>}

      {/* Celular oficial — ÚNICO celular do Modo Carreira (§15). Recebe a
          decisão prioritária e a contagem de não lidas para a notificação. */}
      <CelularFixo
        userId={perfil?.user_id ?? null}
        nomeJogador={career?.coach.apelido || career?.coach.nome || perfil?.nome || null}
        onLogin={aoLogar}
        conversas={career?.conversas ?? []}
        desafioPatrocinador={career?.desafioPatrocinador ?? null}
        feed={career?.feedCidadela ?? []}
        trilhaMissoes={career ? missoesTrilha(career) : []}
        npcDigitandoId={npcDigitando}
        onEnviarMensagem={handleEnviarMensagem}
        onExcluirConversa={handleExcluirConversa}
        onEscolhaRpg={handleEscolhaRpg}
        historia={career?.historia}
        onRegistrarPosicao={handleRegistrarPosicao}
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
        prioridade={prioridadeCelular}
        naoLidas={naoLidasCelular}
        perfilCidadela={perfilCidadela}
        saldoSov={saldoSov}
        bolsa={career?.bolsa}
      />
    </Shell>
  );
}

/* ================= sub-telas ================= */

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="botao-root min-h-screen py-5 relative">{children}</div>;
}

function Header({
  progress,
  onTrophies,
  onHome,
}: {
  progress: Progress;
  onTrophies: () => void;
  onHome: () => void;
}) {
  const total = progress.trophies.length;
  return (
    <header className="mb-7 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
      <button onClick={onHome} className="flex min-w-0 items-center gap-3 text-left">
        <span className="logo-chip shrink-0">EC</span>
        <span className="min-w-0">
          <span className="block truncate font-display text-xl leading-none sm:text-2xl">
            Estádio do Campus
          </span>
          <span className="block truncate text-[11px] tracking-[0.25em] text-muted-foreground uppercase">
            Campeonato do Campus
          </span>
        </span>
      </button>
      <button onClick={onTrophies} className="btn-ghost shrink-0 gap-2">
        <Trophy className="size-4" /> {total}
      </button>
    </header>
  );
}

function Menu({
  progress,
  onFriendly,
  onOnline,
  onOnlineChampionship,
  onCareerMenu,
  onTrophies,
  onProfile,
  hasTour,
  onResume,
  onDeleteCampaign,
  onSaveCampaign,
  onBack,
}: {
  progress: Progress;
  onFriendly: () => void;
  onOnline: () => void;
  onOnlineChampionship: () => void;
  onCareerMenu: () => void;
  onTrophies: () => void;
  onProfile: () => void;
  hasTour: boolean;
  onResume: () => void;
  onDeleteCampaign: () => void;
  onSaveCampaign: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="space-y-6">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Voltar à Cidadela
        </button>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <MenuCard
          icon={<UserCircle className="size-5" />}
          title="Meu Clube / Conta"
          desc="Login, personalizar time, tática, nomear botões e cores. Acesso à conta."
          onClick={onProfile}
          accent="sky"
          dataTour="perfil"
        />
        <MenuCard
          icon={<Swords className="size-5" />}
          title="Amistoso"
          desc="Partida rápida contra qualquer time. Bom pra treinar o dedo."
          onClick={onFriendly}
          accent="sky"
        />
        <MenuCard
          icon={<Globe className="size-5" />}
          title="Amistoso Online"
          desc="Partida em tempo real contra jogadores reais. Crie ou entre numa mesa."
          onClick={onOnline}
          accent="emerald"
        />
        <MenuCard
          icon={<Trophy className="size-5" />}
          title="Campeonato Online"
          desc="Campeonato round-robin com até 8 jogadores. Pontos contam no ranking."
          onClick={onOnlineChampionship}
          accent="amber"
        />
        <MenuCard
          icon={<Medal className="size-5" />}
          title="Carreira no Campus"
          desc="Brasileirão + Copa do Brasil. Suba de divisão e conquiste títulos no Campeonato do Campus."
          onClick={onCareerMenu}
          accent="fuchsia"
          dataTour="carreira"
        />
        <MenuCard
          icon={<Trophy className="size-5" />}
          title="Sala de troféus"
          desc={`${progress.trophies.length} título(s) · amistosos ${progress.friendlies.w}V ${progress.friendlies.d}E ${progress.friendlies.l}D`}
          onClick={onTrophies}
          accent="gold"
          dataTour="trofeus"
        />
      </div>
      <LeaderboardTreinadores compact />
    </div>
  );
}

function MenuCard({
  icon,
  title,
  desc,
  onClick,
  destructive,
  accent = "gold",
  dataTour,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  destructive?: boolean;
  accent?: "gold" | "sky" | "emerald" | "fuchsia" | "amber";
  /** Âncora do tour contextual (bolhas apontam para elementos reais). */
  dataTour?: string;
}) {
  const accentMap = {
    gold: "menu-accent-gold",
    sky: "menu-accent-sky",
    emerald: "menu-accent-emerald",
    fuchsia: "menu-accent-fuchsia",
    amber: "menu-accent-amber",
  };
  return (
    <button
      onClick={onClick}
      {...(dataTour ? { "data-tour": dataTour } : {})}
      className={`menu-card group ${destructive ? "menu-card-destructive" : accentMap[accent]}`}
    >
      <span
        className={`menu-card-icon ${destructive ? "menu-card-icon-destructive" : accentMap[accent]}`}
      >
        {icon}
      </span>
      <span className="mt-3 block font-display text-2xl leading-tight">{title}</span>
      <span className="mt-1 block text-sm text-muted-foreground">{desc}</span>
      <span className={`menu-card-cta ${destructive ? "text-destructive" : ""}`}>
        {destructive ? "Excluir →" : "Entrar →"}
      </span>
    </button>
  );
}

function Setup(props: {
  title: string;
  subtitle: string;
  userTeam: Team;
  rivalTeam: string;
  setRivalTeam: (v: string) => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  progress: Progress;
  showRival?: boolean;
  onStart: () => void;
  onBack: () => void;
}) {
  const {
    title,
    subtitle,
    userTeam,
    rivalTeam,
    setRivalTeam,
    difficulty,
    setDifficulty,
    progress,
    showRival,
    onStart,
    onBack,
  } = props;

  const sorteio = () => {
    const s = shuffle(TEAMS);
    setRivalTeam(s[0]!.id);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-3xl">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <button onClick={sorteio} className="btn-ghost shrink-0 gap-2">
          <Shuffle className="size-4" /> Sortear
        </button>
      </div>

      <div>
        <p className="mb-2 font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
          Dificuldade
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {DIFFICULTIES.map((d) => {
            const unlocked = isUnlocked(progress, d.id);
            return (
              <button
                key={d.id}
                disabled={!unlocked}
                onClick={() => setDifficulty(d.id)}
                className={`diff-card ${difficulty === d.id ? "diff-card-active" : ""} ${unlocked ? "" : "opacity-50"}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg">{d.label}</span>
                  {!unlocked && <Lock className="size-4 shrink-0" />}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {unlocked ? d.desc : "Ganhe 3 títulos no nível anterior."}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Seu Time</label>
        <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg">
          <TeamBadge team={userTeam} size="sm" />
          <span className="font-display text-lg">{userTeam.name}</span>
        </div>
      </div>
      {showRival && (
        <TeamPicker
          label="Adversário"
          value={rivalTeam}
          onChange={setRivalTeam}
          exclude={userTeam.id}
        />
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-ghost">
          Voltar
        </button>
        <button onClick={onStart} className="btn-primary flex-1">
          Começar
        </button>
      </div>
    </div>
  );
}


function TrophyRoom({
  progress,
  userTeam,
  onBack,
}: {
  progress: Progress;
  userTeam: Team;
  onBack: () => void;
}) {
  const getTeam = (teamId: string): Team => {
    if (teamId === userTeam.id) return userTeam;
    return teamByIdSync(teamId);
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-3xl">Sala de troféus</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {DIFFICULTIES.map((d) => {
          const count = progress.titles[d.id];
          const unlocked = isUnlocked(progress, d.id);
          return (
            <div key={d.id} className="panel">
              <p className="font-display text-xl">{d.label}</p>
              <p className="text-sm text-muted-foreground">{count} título(s)</p>
              <div className="mt-3 flex gap-1">
                {Array.from({ length: 3 }, (_, i) => (
                  <Trophy
                    key={i}
                    className={`size-6 ${i < count ? "trophy-on" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>
              <p className="mt-3 text-[11px] tracking-wider text-muted-foreground uppercase">
                {unlocked
                  ? count >= 3
                    ? "Nível dominado"
                    : `Faltam ${3 - count} para liberar o próximo`
                  : "Bloqueado"}
              </p>
            </div>
          );
        })}
      </div>

      <div className="panel">
        <p className="mb-3 font-display text-lg">Conquistas</p>
        {progress.trophies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum troféu ainda. Bora buscar o primeiro.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {progress.trophies.map((t, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <TeamBadge team={getTeam(t.teamId)} size="sm" />
                <span className="shrink-0 text-muted-foreground">
                  {new Date(t.date).toLocaleDateString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button onClick={onBack} className="btn-ghost">
        Voltar
      </button>
    </div>
  );
}
