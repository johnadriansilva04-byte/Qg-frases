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
  atualizarPontosSoberania,
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
import { AuthScreen } from "./components/AuthScreen";
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
import { eventoPorId } from "./career/rpg/eventos";
import {
  criarPedidoCartorio,
  type CartorioTipo,
} from "./career/rpg/cartorioApi";
import { anexarPost, gerarPostPartida } from "./career/rpg/socialEngine";
import { registrarTransacaoSov } from "@/lib/financial/sovApi";
import {
  aplicarRitualNaCarreira,
  consumirRitualPendente,
  convidarRitualTrilha,
  missoesTrilha,
} from "./career/trilhaIntegracao";
import { CareerHub } from "./career/CareerHub";
import { CareerMenu } from "./career/CareerMenu";
import { SeasonTransition } from "./career/SeasonTransition";
import { LoadingScreen } from "./career/LoadingScreen";
import { AIService } from "./ai/AIService";
import { relatorioMedico, redesSociaisRodada } from "./ai/aiContent";
import { tocarNotificacao } from "@/lib/notificacao";
import {
  consequenciasEntrevista,
  registrarEntrevista,
  type DadosEntrevista,
} from "./career/entrevistaEngine";
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
import { sortearEvento, CHOICE_EVENTS } from "./career/choicesEngine";
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
  inserirManchetesRemotas,
  aplicarResultadoRemoto,
  aplicarFimCampanhaRemoto,
  aplicarEscolhaRemoto,
  iniciarCampanhaRemota,
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
  simularRodadaDivisoes,
  type LigasTemporada,
} from "./career/seasonEngine";
import { registrarEventoMissao } from "@/lib/cidadela/pracinhaCore";
import { carregarPerfilCidadela } from "@/lib/cidadela/profissoes";
import type { CidadelaPerfil } from "@/lib/cidadela/profissoes";

type Screen =
  | "auth"
  | "menu"
  | "profile"
  | "career-menu"
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
  | "tournament-match"
  | "match-end"
  | "trophies";

interface BotaoGameProps {
  onBack?: () => void;
}

/**
 * Bônus de Soberania do campeão: entre +100 e +200. A base é 100 e somamos até
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
  // a tela SeasonTransition por cima de tudo.
  const [veredito, setVeredito] = useState<VereditoTemporada | null>(null);
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
      const { career: novo, resumo } = aplicarRitualNaCarreira(atual, pendente.resultado);
      persistCareer(novo);
      // Ritual da Trilha move soberania: registra no Banco Central (module 'rpg').
      const deltaRitual = (novo.coach?.soberania ?? 0) - (atual.coach?.soberania ?? 0);
      const uidRitual = perfilRef.current?.user_id;
      if (deltaRitual !== 0 && uidRitual) {
        void registrarTransacaoSov(
          uidRitual,
          deltaRitual,
          deltaRitual > 0 ? "reward" : "penalty",
          "Ritual da Trilha — integração de carreira",
          "rpg",
          { ritual: pendente.resultado },
        );
      }
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
        const convs = Array.isArray(atual.conversas) ? atual.conversas : [];
        persistCareer({ ...atual, conversas: [prox, ...convs].slice(0, 30) });
      }
      setToast(`📱 Nova mensagem: ${prox.nome}`);
      tocarNotificacao();
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
        }

        setTour(torneioAtivo);
        setCareer(careerHidratada);
        if (remoteCareer && careerHidratada) {
          // Repara registros antigos que tinham coach vazio no JSONB e
          // persiste contatos/convite recém-gerados.
          void saveCareerToSupabase(userId, careerHidratada);
        }
        // Navegação: NUNCA abrir o Modo Carreira automaticamente. O Estádio do
        // Campus abre no menu; a carreira é acessada pelo usuário em
        // "Carreira no Campus" → "Continuar Campanha" (estado já persistido).
        setScreen("menu");
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

  const handleLogout = async () => {
    if (emPartidaOnline) {
      setToast("Não dá pra sair da conta durante uma partida online.");
      return;
    }
    await logout();
    zerarEstadoDaConta();
    setScreen("auth");
    setToast("Você saiu da conta.");
  };

  const aoLogar = async (p?: Perfil) => {
    console.log("[BotaoGame] aoLogar chamado:", { perfil: p });
    // Sem perfil = logout ou exclusão de conta → volta à tela de login.
    if (!p) {
      zerarEstadoDaConta();
      setScreen("auth");
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
      // Offline: vai direto à criação do treinador/setup.
      if (!career?.coach.nome) setScreen("coach-setup");
      else setScreen("tournament-setup");
      return;
    }
    const ok = confirm(
      "Iniciar uma NOVA carreira? A campanha atual será substituída por um novo registro no servidor (a conta/treinador é mantido).",
    );
    if (!ok) return;

    // Se não há treinador ainda, cria antes de iniciar a campanha.
    if (!career?.coach.nome) {
      setScreen("coach-setup");
      return;
    }

    try {
      // Zera a campanha no Supabase (novo registro limpo no JSONB) e reinicia
      // localmente o estado de carreira (mantém o coach para reaproveitar).
      await iniciarCampanhaRemota(difficulty).catch(() => {});
      const zerada: CareerState = {
        ...(career ?? EMPTY_CAREER),
        ...EMPTY_CAREER,
        coach: { ...(career?.coach ?? EMPTY_CAREER.coach) },
        temporada: 1,
        conversas: [],
      };
      persistCareer(zerada);
      persistTournament(null);
      setCurrent(null);
      setCurrentCopaFix(null);
      setToast("Nova carreira criada! Escolha a dificuldade para começar.");
      setScreen("tournament-setup");
    } catch (e) {
      console.error("[BotaoGame] handleNewCareer error:", e);
      setToast("Não foi possível criar a nova carreira. Tente novamente.");
    }
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
      setToast(`+5 pontos! Você agora tem ${novosPontos} pontos de soberania.`);
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

    // Atualizar pontos de soberania se estiver logado (Banco Central SOV)
    if (perfil?.user_id) {
      const vitoria = gf > ga;
      void atualizarPontosSoberania(perfil.user_id, gf, ga, vitoria);
    }

    // Patrocinador: valida a meta da partida no modo carreira também.
    if (career?.desafioPatrocinador) {
      const rDesafio = aplicarDesafioPatrocinador(career, gf, ga, true);
      persistCareer(rDesafio.estado);
      // Recompensa do patrocinador no Banco Central SOV.
      if (rDesafio.ganhou > 0 && perfil?.user_id) {
        void registrarTransacaoSov(
          perfil.user_id,
          rDesafio.ganhou,
          "reward",
          "Desafio de patrocinador cumprido (amistoso)",
          "career",
          { golsPro: gf, golsContra: ga, tipo: "amistoso" },
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
      soberaniaDelta: 0,
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
    // Celular nasce com os contatos-base (Valéria, Dona Cida, Zé e Pracinha).
    persistCareer(garantirContatosRpg(novaCareer));

    // Se estiver logado, sincronizar com Supabase
    if (perfil?.user_id) {
      try {
        await iniciarCampanhaRemota(difficulty);
        void registrarTemporadaRemota(perfil.user_id, novaCareer);
        const semId = novaCareer.headlines.map(({ id: _id, ...rest }) => rest);
        await inserirManchetesRemotas(perfil.user_id, semId);
      } catch (error) {
        console.error("Erro ao sincronizar campanha com Supabase:", error);
      }
    }

    setScreen("hub");
  };

  const finishCoachSetup = (coach: CareerState["coach"]) => {
    const base = career ?? EMPTY_CAREER;
    const coachComSaldo = { ...coach, soberania: perfil?.pontos_soberania ?? coach.soberania };
    const nova: CareerState = { ...base, coach: coachComSaldo };
    persistCareer(nova);
    iniciarCampanha(nova);
  };

  /**
   * Avalia o desafio de patrocinador pendente contra o resultado da partida.
   * Se a meta for cumprida, soma a recompensa à soberania e gera um novo
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
        coach: { ...c.coach, soberania: c.coach.soberania + recompensa },
        desafioPatrocinador: novoDesafio,
      };
      setToast(`Patrocinador satisfeito! +${recompensa} de soberania.`);
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
      coach: {
        ...career.coach,
        soberania: Math.max(0, career.coach.soberania + (efeitos.soberania ?? 0)),
      },
    };
    persistCareer(novo);
    setCareer(novo);
    // Narrativa move soberania: registra no Banco Central (module 'rpg').
    if (efeitos.soberania && perfil?.user_id) {
      void registrarTransacaoSov(
        perfil.user_id,
        efeitos.soberania,
        efeitos.soberania >= 0 ? "reward" : "penalty",
        `Narrativa: ${career.narrativa?.cenaAtual ?? "cena"} — escolha narrativa`,
        "rpg",
        { cena: career.narrativa?.cenaAtual },
      );
    }
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
  // regenera Brasileirão + Copa do Brasil, mantém progresso e soberania.
  const startNextSeason = () => {
    if (!career) return;
    const divisao = career.divisao;
    const novaSoberania = iniciarNovaTemporada(career.coach.soberania, divisao);
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
        soberania: novaSoberania,
        campanhasJogadas: career.coach.campanhasJogadas + 1,
      },
    };
    persistCareer(novaCareer);
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
        soberania: 0,
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
      coach: {
        ...career.coach,
        soberania: Math.max(0, career.coach.soberania + (efeitos.soberania ?? 0)),
      },
    };
    persistCareer(novo);
    setCareer(novo);
    // Suborno move soberania: registra no Banco Central (module 'rpg').
    if (efeitos.soberania && perfil?.user_id) {
      void registrarTransacaoSov(
        perfil.user_id,
        efeitos.soberania,
        efeitos.soberania >= 0 ? "reward" : "penalty",
        `Suborno: escolha "${escolha}" — efeito de soberania`,
        "rpg",
        { subornoEscolha: escolha, node: novoSub.nodeAtual },
      );
    }
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
    let soberania = career.coach.soberania;
    // Penalty imediata (não aplica bônus/penal condicional aqui — vai no finish)
    if (choice.penaltyPontos && choice.penaltyPontos < 0) soberania += choice.penaltyPontos;
    // Impacto financeiro imediato (venda de botão, suborno aceito, multa…).
    if (choice.impactoFinanceiro) soberania += choice.impactoFinanceiro;

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
    // Registra a decisão como conversa de celular (histórico em 1ª pessoa),
    // sem poluir com mensagens automáticas — só decisões reais do treinador.
    const msgTimestamp = Date.now();
    const novaConversa = evento
      ? [
          {
            id: `conv-${msgTimestamp}`,
            tipo: "evento" as const,
            nome: evento.titulo,
            avatar: "💬",
            cargo: "Decisão de carreira",
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
          },
        ]
      : [];

    const nova: CareerState = {
      ...career,
      bonusProximaPartida: bonusPoder,
      moralTime: moral,
      coach: { ...career.coach, soberania: Math.max(0, soberania) },
      ultimasEscolhas: [...career.ultimasEscolhas, choice.id].slice(-8),
      eventoPendenteId: null,
      woProximaPartida,
      desfalqueBotaoProxima,
      perdaPontosProxima,
      conversas: [...novaConversa, ...career.conversas].slice(0, 30),
    };
    persistCareer(nova);
    // RPC remota (autoritativa) para escolha
    if (perfil?.user_id) {
      aplicarEscolhaRemoto(choice.id, choice.bonusPoder ?? 0, choice.bonusMoral ?? 0).catch(
        () => {},
      );
      void registrarEventoMissao("celular_decisao");
      // Impacto financeiro/penalty imediato no Banco Central SOV (module 'rpg').
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

    if (evento && efeitos?.soberania && userId) {
      void registrarTransacaoSov(
        userId,
        efeitos.soberania,
        efeitos.soberania >= 0 ? "reward" : "penalty",
        `RPG: ${evento.titulo} — "${efeitos.soberania >= 0 ? "ganho" : "custo"} de soberania"`,
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
            soberania: career.coach.soberania,
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
    if (patrocinioPagoPartida === partidaAtual) {
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
          coach: { ...career.coach, soberania: career.coach.soberania + ganho },
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
      persistCareer(c);
      enfileirarConversas(res.reacoes);
      setToast("🎙️ Contexto registrado. Recompensa coletada.");
    } else {
      setToast("🎙️ Entrevista concluída. Recompensa coletada.");
    }
  };

  /** Compra/venda na Bolsa (§23-25): débito/crédito SOV no ledger (module
   *  'market'), com persistência no JSONB da carreira. */
  const handleComprarAtivo = (ativoId: AtivoId, quantidade: number) => {
    if (!career) return;
    const bolsaAtual = garantirBolsa(career.bolsa);
    const custo = custoCompra(bolsaAtual, ativoId, quantidade);
    if (career.coach.soberania < custo) {
      setToast("Saldo SOV insuficiente.");
      return;
    }
    const uid = perfil?.user_id;
    if (uid) {
      void registrarTransacaoSov(uid, -custo, "fee", `Bolsa: compra de ${quantidade} cota(s) de ${ativoId}`, "market", {
        ativoId,
        quantidade,
      });
    }
    persistCareer({
      ...career,
      coach: { ...career.coach, soberania: career.coach.soberania - custo },
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
      });
    }
    persistCareer({
      ...career,
      coach: { ...career.coach, soberania: career.coach.soberania + valor },
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
    let novaSoberania = career.coach.soberania;
    let moral = career.moralTime;
    if (gf > ga) {
      novaSoberania += 4;
      moral = Math.min(100, moral + 5);
    } else if (gf < ga) {
      novaSoberania = Math.max(0, novaSoberania - 2);
      moral = Math.max(0, moral - 5);
    } else {
      // Empate no tempo normal, vencedor nos pênaltis:
      const userHome = r.homeId === userTeam.id;
      const userPen = userHome ? (r.penHome ?? 0) : (r.penAway ?? 0);
      const advPen = userHome ? (r.penAway ?? 0) : (r.penHome ?? 0);
      if (userPen > advPen) {
        novaSoberania += 2;
        moral = Math.min(100, moral + 2);
      } else {
        novaSoberania = Math.max(0, novaSoberania - 1);
        moral = Math.max(0, moral - 3);
      }
    }

    // Campeão da copa: bônus de Soberania + manchete.
    let novas: Headline[] = [];
    if (copa.finished && copa.champion === userTeam.id) {
      novaSoberania += bonusCampeao(tour?.difficulty ?? difficulty);
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
      coach: { ...career.coach, soberania: Math.max(0, novaSoberania) },
    };
    if (novas.length > 0) novaCareer = addHeadlines(novaCareer, novas);

    // Resultado da copa no Banco Central SOV (module 'career').
    const deltaCopa = Math.max(0, novaSoberania) - career.coach.soberania;
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
    const sobAnterior = career.coach.soberania;
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
      soberaniaDelta: (novaCareer.coach.soberania ?? 0) - sobAnterior,
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
        .forEach((x) => applyResult(t, x, simulateMatch(x.homeId, x.awayId, t.difficulty)));

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
      let novaSoberania = career.coach.soberania;
      let moral = career.moralTime;

      // Pontos escassos: V=+3 / E=+1 / D=0
      if (gf > ga) {
        novaSoberania += POINTS.VITORIA;
        moral = Math.min(100, moral + 4);
      } else if (gf < ga) {
        novaSoberania = Math.max(0, novaSoberania + POINTS.DERROTA);
        moral = Math.max(0, moral - 6);
      } else {
        novaSoberania += POINTS.EMPATE;
        moral = Math.max(0, moral - 1);
      }

      // Bônus condicionais da última escolha:
      const lastChoice = career.ultimasEscolhas[career.ultimasEscolhas.length - 1];
      if (lastChoice === "goleada") {
        if (gf - ga >= 2) novaSoberania += 5;
        else if (gf < ga) novaSoberania = Math.max(0, novaSoberania - 3);
      }
      if (lastChoice === "respeito" && gf > ga) novaSoberania += 2;
      if (lastChoice === "titular" && gf > ga) moral = Math.min(100, moral + 4);

      let novoTitulos = career.coach.titulos;

      // Bônus de classificação para mata-mata (só quando entra a fase)
      const classificouAgora =
        tour?.phase === "grupos" &&
        t.phase === "mata-mata" &&
        t.knockout[0]?.fixtures.some((f) => f.homeId === t.userTeamId || f.awayId === t.userTeamId);
      if (classificouAgora) novaSoberania += POINTS.CLASSIFICOU_MATA;

      // Fim de campanha: bônus de posição final
      const manchetesFim: string[] = [];
      if (t.phase === "fim") {
        // Determina posição do usuário
        if (t.champion === t.userTeamId) {
          const bonus = bonusCampeao(t.difficulty);
          novaSoberania += bonus;
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
            novaSoberania += POINTS.VICE;
            manchetesFim.push(`Vice-campeão: ${career.coach.apelido} chega perto do título`);
          } else if (foiSemi) {
            novaSoberania += POINTS.TERCEIRO;
            manchetesFim.push(`Semifinalista: ${career.coach.apelido} termina no Top 4`);
          } else {
            novaSoberania += POINTS.QUARTO;
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
          soberania: Math.max(0, Math.round(novaSoberania)),
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
            coach: {
              ...novaCareer.coach,
              soberania: novaCareer.coach.soberania + div.total,
            },
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
            );
          }
        } else {
          novaCareer = { ...novaCareer, bolsa: div.bolsa };
        }
      }
      persistCareer(novaCareer);

      // Recompensa do patrocinador no Banco Central SOV (module 'career').
      if (rDesafio.ganhou > 0 && perfil?.user_id) {
        void registrarTransacaoSov(
          perfil.user_id,
          rDesafio.ganhou,
          "reward",
          "Desafio de patrocinador cumprido (carreira)",
          "career",
          { rodada: career.rodadaAtual, golsPro: gf, golsContra: ga },
        );
      }

      // Captura para a tela de fim de jogo (deltas reais pós-desafio).
      patchSob = novaCareer.coach.soberania - career.coach.soberania;
      patchMoral = novaCareer.moralTime - career.moralTime;
      posTabela = posicaoUsuario > 0 ? posicaoUsuario : undefined;
      extraMsg = manchetesFim[0];

      // Fim de temporada (liga concluída): economia de Soberania decide se o
      // treinador segue (temporada infinita) ou é demitido (Game Over).
      if (t.phase === "fim") {
        const v = avaliarFimTemporada(novaCareer.coach.soberania, novaCareer.divisao);
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
          aplicarResultadoRemoto(gf, ga, lastChoice).catch(() => {});
          void registrarEventoMissao("botao_partida_carreira");
          if (gf > ga) void registrarEventoMissao("botao_vitoria_carreira");
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
          aplicarFimCampanhaRemoto(posicao, t.difficulty).catch(() => {});
        }
        // Persistir manchetes novas
        if (novas.length > 0) {
          const semId = novas.map(({ id: _id, ...rest }) => rest);
          inserirManchetesRemotas(perfil.user_id, semId).catch(() => {});
        }
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
          soberania: career.coach.soberania,
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
        const msgTimestamp = Date.now();
        const novasConv: ConversaCelular[] = [];
        if (relMed) {
          novasConv.push({
            id: `ia-med-${msgTimestamp}`,
            tipo: "medico",
            nome: "Dr. Maurício",
            avatar: "🩺",
            cargo: "Departamento Médico",
            mensagens: [
              { id: `m-med-${msgTimestamp}`, texto: relMed, remetente: "outro", timestamp: agora },
            ],
            naoLida: true,
          });
        }
        for (let i = 0; i < (redes?.length ?? 0); i++) {
          const t = redes[i]!;
          novasConv.push({
            id: `ia-redes-${msgTimestamp}-${i}`,
            tipo: "evento",
            nome: "Torcida (Redes Sociais)",
            avatar: "📱",
            cargo: "Menções da rodada",
            mensagens: [
              { id: `m-red-${msgTimestamp}-${i}`, texto: t, remetente: "outro", timestamp: agora },
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
        soberaniaDelta: patchSob,
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
              <button onClick={() => setScreen("auth")} className="btn-primary mt-4">
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
              <button onClick={() => setScreen("auth")} className="btn-primary mt-4">
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

  if (screen === "auth") {
    return (
      <Shell>
        <AuthScreen onPronto={aoLogar} />
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
                runWithLoading(() => setScreen("hub"), 1500);
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

  if (screen === "coach-setup") {
    return (
      <Shell>
        <CoachSetup
          timeName={userTeam.name}
          onFinish={finishCoachSetup}
          onBack={() => setScreen("menu")}
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
        />
      </Shell>
    );
  }

  return (
    <Shell>
      {/* REMOVIDO: AdsterraSocialBar - causava disparos indevidos em cliques globais */}
      {carregando && !loading && <LoadingScreen pronto={false} onCompleto={() => {}} />}
      {loading && <LoadingScreen pronto={loadingReady} onCompleto={loadingOnComplete} />}
      {veredito && career && (
        <SeasonTransition
          veredito={veredito}
          divisao={career.divisao}
          temporada={career.temporada ?? 1}
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
        prioridade={prioridadeCelular}
        naoLidas={naoLidasCelular}
        perfilCidadela={perfilCidadela}
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
        />
        <MenuCard
          icon={<Trophy className="size-5" />}
          title="Sala de troféus"
          desc={`${progress.trophies.length} título(s) · amistosos ${progress.friendlies.w}V ${progress.friendlies.d}E ${progress.friendlies.l}D`}
          onClick={onTrophies}
          accent="gold"
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
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  destructive?: boolean;
  accent?: "gold" | "sky" | "emerald" | "fuchsia" | "amber";
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
