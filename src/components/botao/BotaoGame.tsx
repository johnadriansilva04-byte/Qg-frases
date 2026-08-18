import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { TEAMS, teamByIdSync, createCustomTeam, getAllTeams, type Team } from "./data/teams";
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
  saveTournamentToSupabase,
  loadTournamentFromSupabase,
  atualizarPontosSoberania,
  adicionarPontosVideo,
  type Progress,
} from "./storage";
import {
  advanceKnockout,
  applyResult,
  buildKnockout,
  createTournament,
  createLeague,
  nextUserFixture,
  shuffle,
  simulateMatch,
  sortTable,
  winnerOf,
} from "./tournament";
import { MatchView } from "./components/MatchView";
import { TeamPicker, TeamBadge } from "./components/TeamPicker";
import { AuthScreen } from "./components/AuthScreen";
import { OnlineMatchV3 } from "./components/OnlineMatchV3";
import { OnlineChampionship } from "./components/OnlineChampionship";
import { useBotaoAuth } from "./online/useBotaoAuth";
import type { Perfil } from "./online/auth";
import { CoachSetup } from "./career/CoachSetup";
import { ProfileSetup } from "./career/ProfileSetup";
import { NewsFeed } from "./career/NewsFeed";
import { SovereigntyPanel } from "./career/SovereigntyPanel";
import { ChoiceModal } from "./career/ChoiceModal";
import { SubornoStory } from "./career/SubornoStory";
import { CalendarView } from "./career/CalendarView";
import { ChampionshipModule, ZoneLegend } from "./career/ChampionshipModule";
import {
  gerarCopaBrasil,
  iniciarCopaBrasil,
  resolveTeam,
  proximoJogoCopa,
  usuarioVivoNaCopa,
  copaDisponivelNaRodada,
  advanceCopaBrasil,
  avaliarFimTemporada,
  iniciarNovaTemporada,
  CUSTO_MANUTENCAO,
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
import { CareerMenu } from "./career/CareerMenu";
import { SeasonTransition } from "./career/SeasonTransition";
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
import { POINTS, type CareerState, type Choice, type Divisao, type Headline } from "./career/types";
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
} from "./career/careerRemote";

type Screen =
  | "auth"
  | "menu"
  | "profile"
  | "friendly-setup"
  | "friendly-match"
  | "online"
  | "online-championship"
  | "coach-setup"
  | "tournament-setup"
  | "hub"
  | "tournament-match"
  | "choice"
  | "suborno"
  | "celular"
  | "trophies";

interface BotaoGameProps {
  onBack?: () => void;
}

export function BotaoGame({ onBack }: BotaoGameProps = {}) {
  const { perfil, carregando, logout, aplicarPerfil, recarregar } = useBotaoAuth();
  const [screen, setScreen] = useState<Screen>("menu");
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [allTeams, setAllTeams] = useState<Team[]>(TEAMS);
  const [emPartidaOnline, setEmPartidaOnline] = useState(false);
  const [tour, setTour] = useState<Tournament | null>(() => loadTournament());
  const [career, setCareer] = useState<CareerState | null>(() => loadCareer());
  const [showCeremony, setShowCeremony] = useState(false);
  const [ceremonyBonus, setCeremonyBonus] = useState(0);
  // Veredito de fim de temporada (continua/Game Over). Quando presente, exibe
  // a tela SeasonTransition por cima de tudo.
  const [veredito, setVeredito] = useState<VereditoTemporada | null>(null);
  // Fixture de copa ativa (para distinguir do fixture de liga no finishTournament).
  const [currentCopaFix, setCurrentCopaFix] = useState<Fixture | null>(null);

  // Debug: permite visualizar a cerimônia via ?debug_ceremony=1
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      new URLSearchParams(window.location.search).get("debug_ceremony") === "1" &&
      career?.coach.nome
    ) {
      setCeremonyBonus(POINTS.CAMPEAO + POINTS.TITULO_AMADOR);
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

  // Monitorar login automático e mudar para menu se já estiver logado
  useEffect(() => {
    if (!carregando && perfil && screen === "auth") {
      setScreen("menu");
    }
  }, [perfil, carregando, screen]);

  // Salvar tela atual no localStorage
  useEffect(() => {
    localStorage.setItem("botao_screen", screen);
  }, [screen]);

  // Carregar time personalizado do usuário (prioridade: perfil Supabase > localStorage)
  const customTeamData = useMemo(() => {
    if (perfil?.time_personalizado && perfil?.abreviacao_time && perfil?.cores) {
      return {
        nome: perfil.time_personalizado,
        short: perfil.abreviacao_time,
        primary: perfil.cores[0],
        secondary: perfil.cores[1],
        botoesNomes: perfil.botoes_nomes ?? undefined,
      };
    }
    const timeNome = localStorage.getItem("botao_online_time_personalizado") || "Meu Time";
    const abreviacao = localStorage.getItem("botao_online_abreviacao_time") || "MTI";
    const cores = JSON.parse(
      localStorage.getItem("botao_online_cores") || '["#FF0000", "#00FF00", "#0000FF"]',
    );
    let botoesNomes: string[] | undefined;
    try {
      const raw = localStorage.getItem("botao_online_botoes_nomes");
      if (raw) botoesNomes = JSON.parse(raw);
    } catch {}
    return {
      nome: timeNome,
      short: abreviacao,
      primary: cores[0],
      secondary: cores[1],
      botoesNomes,
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
    const tatica = perfil?.tatica ?? localStorage.getItem("botao_online_tatica") ?? undefined;
    return formacaoById(tatica).posicoes;
  }, [perfil?.tatica]);

  const [rivalTeam, setRivalTeam] = useState("fla");
  const [difficulty, setDifficulty] = useState<Difficulty>("amador");
  const [current, setCurrent] = useState<Fixture | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => setProgress(loadProgress()), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

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
    // Salvar no Supabase se o usuário estiver logado
    const uid = perfil?.user_id;
    if (uid && t) {
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

  // Ao logar (perfil ficar disponível), puxar carreira do Supabase
  useEffect(() => {
    if (!perfil?.user_id) return;
    loadCareerFromSupabase(perfil.user_id)
      .then((remote) => {
        if (remote && remote.coach.nome) {
          setCareer(remote);
          saveCareer(remote);
        }
      })
      .catch(() => {});
  }, [perfil?.user_id]);

  const handleLogout = async () => {
    if (emPartidaOnline) {
      setToast("Não dá pra sair da conta durante uma partida online.");
      return;
    }
    await logout();
    setScreen("auth");
    localStorage.removeItem("botao_screen"); // Limpar tela salva ao fazer logout
    setToast("Você saiu da conta.");
  };

  const aoLogar = async (p?: Perfil) => {
    console.log("[BotaoGame] aoLogar chamado:", { perfil: p });
    // Sem perfil = logout ou exclusão de conta → volta à tela de login.
    if (!p) {
      setScreen("auth");
      setToast("Você saiu da conta.");
      return;
    }
    aplicarPerfil(p);
    // Carregar progresso do Supabase se o usuário estiver logado
    if (p.user_id) {
      const supabaseProgress = await loadProgressFromSupabase(p.user_id);
      setProgress(supabaseProgress);
      saveProgress(supabaseProgress);

      // Carregar torneio do Supabase
      const supabaseTournament = await loadTournamentFromSupabase(p.user_id);
      if (supabaseTournament) {
        persistTournament(supabaseTournament);
      }
    }
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
    const email = localStorage.getItem("botao_online_email");
    if (email) {
      await deleteProgressFromSupabase(email);
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

    // Atualizar pontos de soberania se estiver logado
    if (perfil?.user_id) {
      const vitoria = gf > ga;
      atualizarPontosSoberania(perfil.user_id, gf, ga, vitoria);
    }

    // Patrocinador: valida a meta da partida no modo carreira também.
    if (career?.desafioPatrocinador) {
      const rDesafio = aplicarDesafioPatrocinador(career, gf, ga, true);
      persistCareer(rDesafio.estado);
    }

    setToast(
      gf > ga ? "Vitória no amistoso!" : gf < ga ? "Derrota no amistoso." : "Empate no amistoso.",
    );
    setScreen("menu");
  };

  /* ---------- torneio ---------- */
  const startTournament = () => {
    // Se não existir treinador ainda, entra no fluxo de criação primeiro
    if (!career || !career.coach.nome) {
      setScreen("coach-setup");
      return;
    }
    iniciarCampanha(career);
  };

  const iniciarCampanha = async (c: CareerState) => {
    // Criar Brasileirão (pontos corridos com 20 times) - modo infinito
    const t = createLeague(userTeam.id, difficulty, 20, userTeam);
    persistTournament(t);

    // Copa do Brasil jogável (paralela ao Brasileirão, intercalada).
    const copa = iniciarCopaBrasil(userTeam, difficulty);

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
      copaBrasil: copa,
      narrativa: NARRATIVA_INICIAL,
      // Patrocinador propõe a primeira meta do celular (desafio por partida).
      desafioPatrocinador: gerarDesafioPatrocinador(0),
      conversas: [],
      coach: { ...c.coach, campanhasJogadas: c.coach.campanhasJogadas + 1 },
    };
    persistCareer(novaCareer);

    // Se estiver logado, sincronizar com Supabase
    if (perfil?.user_id) {
      try {
        await iniciarCampanhaRemota(difficulty);
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
    const nova: CareerState = { ...base, coach };
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
    // Decisões pendentes vão ao celular (chat em 1ª pessoa). Ordem:
    // suborno -> narrativa -> choice event.
    if (career.suborno?.nodeAtual) {
      setScreen("celular");
      return;
    }
    if (career.narrativa?.cenaAtual) {
      setScreen("celular");
      return;
    }
    if (career.eventoPendenteId) {
      setScreen("celular");
      return;
    }
    // Copa do Brasil paralela: se disponível nesta rodada, joga a copa.
    const rodada = career.rodadaAtual;
    if (career.copaBrasil) {
      const copaFix = proximoJogoCopa(career.copaBrasil, userTeam.id);
      if (copaFix && copaDisponivelNaRodada(rodada, career.copaBrasil, userTeam.id)) {
        setCurrentCopaFix(copaFix);
        setCurrent(copaFix);
        setScreen("tournament-match");
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
    setScreen("tournament-match");
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
    }
  };

  // Inicia a próxima temporada (carreira infinita): deduz custo de manutenção,
  // regenera Brasileirão + Copa do Brasil, mantém progresso e soberania.
  const startNextSeason = () => {
    if (!career) return;
    const divisao = career.divisao;
    const novaSoberania = iniciarNovaTemporada(career.coach.soberania, divisao);
    const t = createLeague(userTeam.id, difficulty, 20, userTeam);
    persistTournament(t);
    const copa = iniciarCopaBrasil(userTeam, difficulty);
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

    const nova: CareerState = {
      ...career,
      bonusProximaPartida: bonusPoder,
      moralTime: moral,
      coach: { ...career.coach, soberania: Math.max(0, soberania) },
      ultimasEscolhas: [...career.ultimasEscolhas, choice.id].slice(-8),
      eventoPendenteId: null,
    };
    persistCareer(nova);
    // RPC remota (autoritativa) para escolha
    if (perfil?.user_id) {
      aplicarEscolhaRemoto(choice.id, choice.bonusPoder ?? 0, choice.bonusMoral ?? 0).catch(
        () => {},
      );
    }

    // Segue para o hub (não inicia o jogo automaticamente)
    setScreen("hub");
  };

  // Handlers para o sistema de conversas do celular
  const handleEnviarMensagem = (conversaId: string, texto: string) => {
    if (!career) return;
    const timestamp = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const novasConversas = career.conversas.map((conv) => {
      if (conv.id === conversaId) {
        return {
          ...conv,
          mensagens: [
            ...conv.mensagens,
            {
              id: `msg-${Date.now()}`,
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
  };

  const handleExcluirConversa = (conversaId: string) => {
    if (!career) return;
    const novasConversas = career.conversas.filter((c) => c.id !== conversaId);
    const novo: CareerState = { ...career, conversas: novasConversas };
    persistCareer(novo);
    setCareer(novo);
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
      novaSoberania += POINTS.CAMPEAO;
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
  };

  const finishTournamentMatch = (r: MatchResult) => {
    if (!tour || !current) return;
    const t: Tournament = structuredClone(tour);

    const userIsHome = r.homeId === userTeam.id;
    const gf = userIsHome ? r.homeGoals : r.awayGoals;
    const ga = userIsHome ? r.awayGoals : r.homeGoals;

    // Copa do Brasil (paralela ao Brasileirão): se a partida atual é da copa,
    // aplica o resultado ao chaveamento da copa e NÃO avança o Brasileirão.
    if (currentCopaFix && career?.copaBrasil) {
      finishCopaMatch(r, gf, ga);
      setCurrent(null);
      setCurrentCopaFix(null);
      setScreen("hub");
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

      // só monta o mata-mata quando todos os jogos da fase de grupos terminarem
      if (t.groupFixtures.every((x) => x.played)) {
        if (t.format === "pontos-corridos") {
          // Liga: campeão é o líder da tabela única.
          const tabela = sortTable(t.groups[0]!.table);
          t.champion = tabela[0]!.teamId;
          t.phase = "fim";

          // Lógica de promoção/rebaixamento (2 primeiros sobem, 2 últimos caem)
          if (career) {
            const userPosition = tabela.findIndex((r) => r.teamId === t.userTeamId);
            const novaDivisao =
              userPosition <= 1
                ? career.divisao === "serie-c"
                  ? "serie-b"
                  : career.divisao === "serie-b"
                    ? "serie-a"
                    : "serie-a"
                : userPosition >= 18
                  ? career.divisao === "serie-a"
                    ? "serie-b"
                    : career.divisao === "serie-b"
                      ? "serie-c"
                      : "serie-c"
                  : career.divisao;

            const careerAtualizado: CareerState = {
              ...career,
              divisao: novaDivisao,
            };
            persistCareer(careerAtualizado);
            setCareer(careerAtualizado);

            if (novaDivisao !== career.divisao) {
              if (userPosition <= 1) {
                setToast(
                  `PROMOÇÃO! Você subiu para ${novaDivisao === "serie-b" ? "SÉRIE B" : "SÉRIE A"}!`,
                );
              } else if (userPosition >= 18) {
                setToast(
                  `REBAIXAMENTO! Você caiu para ${novaDivisao === "serie-b" ? "SÉRIE B" : "SÉRIE C"}.`,
                );
              }
            }
          }

          setToast(
            t.champion === t.userTeamId
              ? "CAMPEÃO DA LIGA! Pontos corridos conquistados."
              : "Fim da liga — você não ficou em 1º.",
          );
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
    if (career) {
      let novaSoberania = career.coach.soberania;
      let moral = career.moralTime;

      // Pontos escassos: V=+3 / E=+1 / D=-3
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
          novaSoberania += POINTS.CAMPEAO;
          novoTitulos += 1;
          const bonusTitulo =
            t.difficulty === "amador"
              ? POINTS.TITULO_AMADOR
              : t.difficulty === "profissional"
                ? POINTS.TITULO_PROFISSIONAL
                : POINTS.TITULO_LENDA;
          novaSoberania += bonusTitulo;
          manchetesFim.push(`CAMPEÃO! ${career.coach.apelido || career.coach.nome} é herói eterno`);
          // Cerimônia de premiação!
          setCeremonyBonus(POINTS.CAMPEAO + bonusTitulo);
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
        penaltiesProximaPartida: 0,
        moralTime: moral,
        // Avança a rodada do Brasileirão para distribuir narrativas/Copa.
        rodadaAtual: (career.rodadaAtual ?? 0) + 1,
        rodadasDesdeEventoNarrativo: (career.rodadasDesdeEventoNarrativo ?? 0) + 1,
        coach: {
          ...career.coach,
          soberania: Math.max(0, Math.round(novaSoberania)),
          titulos: novoTitulos,
        },
      };
      novaCareer = addHeadlines(novaCareer, novas);
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
      persistCareer(novaCareer);

      // Fim de temporada (liga concluída): economia de Soberania decide se o
      // treinador segue (temporada infinita) ou é demitido (Game Over).
      if (t.phase === "fim") {
        const v = avaliarFimTemporada(novaCareer.coach.soberania, novaCareer.divisao);
        setVeredito(v);
      }

      // Sync remoto (autoritativo) — não bloqueia UX
      if (perfil?.user_id) {
        const isUserFixture = current.homeId === t.userTeamId || current.awayId === t.userTeamId;
        if (isUserFixture) {
          const lastChoice = career.ultimasEscolhas[career.ultimasEscolhas.length - 1] ?? null;
          aplicarResultadoRemoto(gf, ga, lastChoice).catch(() => {});
        }
        if (t.phase === "fim") {
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

    // Atualizar pontos de soberania se estiver logado
    if (perfil?.user_id) {
      const vitoria = gf > ga;
      atualizarPontosSoberania(perfil.user_id, gf, ga, vitoria);
    }

    persistTournament(t);
    setCurrent(null);
    setScreen("hub");
  };

  const qualified = (t: Tournament) =>
    t.knockout[0]?.fixtures.some((f) => f.homeId === t.userTeamId || f.awayId === t.userTeamId) ??
    false;

  /* ---------- telas ---------- */
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
                setScreen("hub");
              }
            }}
            onNewCareer={() => {
              if (!career?.coach.nome) {
                setScreen("coach-setup");
              } else {
                setScreen("tournament-setup");
              }
            }}
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

  if (screen === "celular") {
    // Inbox unificado do celular: suborno, narrativa dinâmica, decisões e o
    // desafio do patrocinador (meta ativa por partida) — tudo em primeira
    // pessoa (chat). Ordem de prioridade: suborno > narrativa > choice event.
    const subornoAtivo = career?.suborno && (career.suborno.nodeAtual || career.suborno.desfecho);
    const narrativaAtiva = career?.narrativa?.cenaAtual ? cenaDaNarrativa(career.narrativa) : null;
    const eventoPendente = career?.eventoPendenteId
      ? CHOICE_EVENTS.find((e) => e.id === career.eventoPendenteId)
      : null;
    const desafio = career?.desafioPatrocinador;
    const nomeTreinador = career?.coach.apelido || career?.coach.nome;

    return (
      <Shell>
        <div className="mx-auto w-full max-w-5xl px-4 pb-16">
          <Header
            progress={progress}
            onTrophies={() => setScreen("trophies")}
            onHome={() => setScreen("menu")}
          />

          {/* Cabeçalho do celular: treinador + campanha sincronizada */}
          <div className="celular-header">
            <div className="celular-avatar">📱</div>
            <div>
              <p className="font-display text-lg">{nomeTreinador ?? "Treinador"}</p>
              <p className="text-xs text-muted-foreground">
                {career ? `Temporada ${career.temporada} · ${career.divisao.toUpperCase().replace("SERIE-", "SÉRIE ")}` : "Aguardando campanha"}
              </p>
            </div>
            <button onClick={() => setScreen("hub")} className="celular-close">
              Fechar
            </button>
          </div>

          {/* Mensagens prioritárias: suborno, narrativa, evento */}
          {subornoAtivo ? (
            <SubornoStory
              state={career!.suborno!}
              onAvancar={aplicarSuborno}
              onFechar={() => {
                if (!career?.suborno?.nodeAtual) {
                  playNext();
                } else {
                  setScreen("hub");
                }
              }}
            />
          ) : narrativaAtiva && career?.narrativa ? (
            <NarrativeModal
              state={career.narrativa}
              cena={narrativaAtiva}
              onAvancar={aplicarNarrativa}
              onBack={() => setScreen("hub")}
            />
          ) : eventoPendente ? (
            <ChoiceModal
              evento={eventoPendente}
              onChoose={aplicarEscolha}
              onBack={() => setScreen("hub")}
            />
          ) : desafio && !desafio.concluido ? (
            <div className="patrocinador-msg">
              <div className="patrocinador-bubble">
                <p className="patrocinador-nome">{desafio.patrocinador}</p>
                <p className="patrocinador-texto">{desafio.mensagem}</p>
                <p className="patrocinador-recompensa">
                  Recompensa: +{desafio.recompensa} soberania
                </p>
                <button 
                  onClick={() => setScreen("hub")}
                  className="btn-ghost mt-2 text-xs"
                >
                  Entendido
                </button>
              </div>
            </div>
          ) : (
            <div className="panel text-center py-12">
              <p className="font-display text-2xl">Sem mensagens</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tudo em dia por aqui. O próximo desafio de patrocinador chega
                antes da próxima partida.
              </p>
              <button onClick={() => setScreen("hub")} className="btn-primary mt-4">
                Voltar ao hub
              </button>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  if (
    screen === "celular-conversas" &&
    career
  ) {
    return (
      <Shell>
        <CelularConversas
          conversas={career.conversas}
          onEnviarMensagem={handleEnviarMensagem}
          onExcluirConversa={handleExcluirConversa}
          onVoltar={() => setScreen("hub")}
        />
      </Shell>
    );
  }

  if (
    screen === "suborno" &&
    career?.suborno &&
    (career.suborno.nodeAtual || career.suborno.desfecho)
  ) {
    return (
      <Shell>
        <SubornoStory
          state={career.suborno}
          onAvancar={aplicarSuborno}
          onFechar={() => {
            // Se o suborno foi finalizado (nodeAtual é null), vai para a partida
            if (!career.suborno?.nodeAtual) {
              playNext();
            } else {
              setScreen("hub");
            }
          }}
        />
      </Shell>
    );
  }

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
            title="Modo Carreira"
            subtitle="Brasileirão (pontos corridos) + Copa do Brasil integrada. Continue jogando enquanto tiver soberania."
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
          <Hub
            tour={tour}
            userTeam={userTeam}
            career={career}
            onPlay={playNext}
            onExit={() => setScreen("menu")}
            onOpenCelular={() => setScreen("celular")}
          />
        )}

        {screen === "trophies" && (
          <TrophyRoom progress={progress} userTeam={userTeam} onBack={() => setScreen("menu")} />
        )}
      </div>

      {toast && <div className="toast font-display">{toast}</div>}
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
        <span className="logo-chip shrink-0">FB</span>
        <span className="min-w-0">
          <span className="block truncate font-display text-xl leading-none sm:text-2xl">
            Futebol de Botão
          </span>
          <span className="block truncate text-[11px] tracking-[0.25em] text-muted-foreground uppercase">
            Copa dos Botões
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
}) {
  return (
    <div className="space-y-6">
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
          title="Modo Carreira"
          desc="Brasileirão + Copa do Brasil. Suba de divisão e conquiste títulos."
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

function Hub({
  tour,
  userTeam,
  career,
  onPlay,
  onExit,
  onOpenCelular,
}: {
  tour: Tournament;
  userTeam: Team;
  career: CareerState | null;
  onPlay: () => void;
  onExit: () => void;
  onOpenCelular: () => void;
}) {
  const [showCalendar, setShowCalendar] = useState(false);
  const next = useMemo(() => nextUserFixture(tour), [tour]);
  const stage = tour.knockout[tour.knockout.length - 1];

  const getTeam = (teamId: string): Team => resolveTeam(teamId, userTeam);

  // Copa do Brasil: estado jogável persistido em career.copaBrasil; se ausente
  // (carregamento antigo), gera um chaveamento apenas p/ exibição no calendário.
  const copaBrasil = career?.copaBrasil ?? gerarCopaBrasil(userTeam, tour.difficulty);
  const copaFixPend = copaBrasil ? proximoJogoCopa(copaBrasil, userTeam.id) : null;
  const vivoNaCopa = copaBrasil ? usuarioVivoNaCopa(copaBrasil, userTeam.id) : false;

  const divisao = career?.divisao ?? "serie-c";
  const divisaoShort =
    divisao === "serie-a" ? "SÉRIE A" : divisao === "serie-b" ? "SÉRIE B" : "SÉRIE C";
  const temporada = career?.temporada ?? 1;
  const custoManutencao = CUSTO_MANUTENCAO[divisao];

  // Contagem de mensagens não lidas no celular (narrativa + suborno + decisões +
  // desafio de patrocinador). O desafio fica sempre acessível no celular.
  const temDesafioPatrocinador = !!career?.desafioPatrocinador && !career.desafioPatrocinador.concluido;
  const mensagensPendentes =
    (career?.eventoPendenteId ? 1 : 0) +
    (career?.suborno?.nodeAtual ? 1 : 0) +
    (career?.narrativa?.cenaAtual ? 1 : 0);
  const temCelular = mensagensPendentes > 0 || temDesafioPatrocinador;

  const userPos =
    tour.phase === "grupos" && tour.groups.length > 0
      ? sortTable(tour.groups[0]!.table).findIndex((r) => r.teamId === tour.userTeamId) + 1
      : 0;

  return (
    <div className="space-y-5">
      {career?.coach.nome && (
        <SovereigntyPanel
          coach={career.coach}
          moral={career.moralTime}
          temporada={temporada}
          divisao={divisao}
        />
      )}

      {/* Próximo jogo em destaque */}
      <div className="next-match-card">
        <div className="next-match-head">
          <span className="next-match-tag">
            {tour.phase === "fim"
              ? "Campanha encerrada"
              : tour.phase === "grupos"
                ? "Brasileirão"
                : stage?.stage}
          </span>
          <span className="next-match-div">{divisaoShort}</span>
        </div>
        {tour.phase === "fim" ? (
          <p className="mt-3 font-display text-2xl">
            Campeão: <TeamBadge team={getTeam(tour.champion!)} />
          </p>
        ) : next ? (
          <>
            <div className="mt-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <TeamBadge team={getTeam(next.homeId)} size="md" />
                <span className="font-display text-2xl text-muted-foreground">×</span>
                <TeamBadge team={getTeam(next.awayId)} size="md" />
              </div>
              <button
                data-testid="entrar-em-campo"
                onClick={onPlay}
                className="btn-primary px-5 py-2.5 text-sm"
              >
                Entrar em campo
              </button>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span>{next.stage}</span>
              {userPos > 0 && <span>Posição: {userPos}º</span>}
              {temCelular && <span className="text-amber-300">Celular com mensagens</span>}
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Aguardando próximo jogo...</p>
        )}
      </div>

      {/* Status da Copa do Brasil (paralela ao Brasileirão) */}
      {copaBrasil && (
        <div className="copa-status-card">
          <div className="copa-status-head">
            <span className="copa-status-tag">Copa do Brasil</span>
            <span className="copa-status-badge">
              {copaBrasil.finished
                ? copaBrasil.champion === userTeam.id
                  ? "CAMPEÃO"
                  : "Encerrada"
                : vivoNaCopa
                  ? "Em jogo"
                  : "Eliminado"}
            </span>
          </div>
          {copaFixPend ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TeamBadge team={getTeam(copaFixPend.homeId)} size="sm" />
                <span className="font-display text-lg text-muted-foreground">×</span>
                <TeamBadge team={getTeam(copaFixPend.awayId)} size="sm" />
              </div>
              <span className="text-[11px] text-muted-foreground">{copaFixPend.stage}</span>
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {copaBrasil.finished
                ? "Torneio concluído nesta temporada."
                : "Próxima fase será disponibilizada no calendário do Brasileirão."}
            </p>
          )}
        </div>
      )}

      {/* Layout principal: 2 colunas sem blocos vazios */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* COLUNA ESQUERDA — ações e celular */}
        <div className="flex flex-col gap-3">
          {/* Celular / mensagens em primeira pessoa — sempre acessível
              (patrocinador deixa uma meta ativa por partida). */}
          <button onClick={onOpenCelular} className="celular-card">
            <span className="celular-emoji">📱</span>
            <div className="celular-info">
              <span className="celular-title">Celular do Treinador</span>
              <span className="celular-sub">
                {mensagensPendentes > 0
                  ? `${mensagensPendentes} mensagem${mensagensPendentes !== 1 ? "s" : ""} nova${mensagensPendentes !== 1 ? "s" : ""}`
                  : temDesafioPatrocinador
                    ? "Desafio de patrocinador ativo"
                    : "Tudo em dia por aqui"}
              </span>
            </div>
            {mensagensPendentes > 0 && (
              <span className="celular-badge">{mensagensPendentes}</span>
            )}
            <span className="celular-cta">Abrir</span>
          </button>

          {/* Notícias (resumo) */}
          {career && career.headlines.length > 0 && (
            <div className="panel">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-display text-sm font-bold tracking-wide">Últimas Notícias</h3>
              </div>
              <p className="line-clamp-2 text-xs text-foreground/80">
                {career.headlines[0]?.manchete}
              </p>
            </div>
          )}

          {/* Calendário */}
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="panel flex items-center justify-between hover:border-emerald-500/50"
          >
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-emerald-400" />
              <span className="font-display text-sm tracking-wide">Calendário da Temporada</span>
            </div>
            <ChevronRight
              className={`size-4 transition-transform ${showCalendar ? "rotate-90" : ""}`}
            />
          </button>
          {showCalendar && (
            <CalendarView
              tour={tour}
              userTeam={userTeam}
              currentDivisao={divisao}
              copaBrasil={copaBrasil}
            />
          )}

          <button onClick={onExit} className="btn-ghost w-full">
            Voltar ao menu
          </button>
        </div>

        {/* COLUNA DIREITA — campeonatos + classificação (centraliza stats) */}
        <div className="flex flex-col gap-3">
          <ChampionshipModule tour={tour} userTeam={userTeam} currentDivisao={divisao} />

          {tour.phase === "grupos" && tour.groups.length > 0 && (
            <div className="panel">
              <h3 className="mb-2 font-display text-sm font-bold tracking-wide">Classificação</h3>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="w-8 py-1">#</th>
                    <th className="py-1">TIME</th>
                    <th className="w-8 text-center">P</th>
                    <th className="w-8 text-center">J</th>
                    <th className="w-10 text-center">SG</th>
                  </tr>
                </thead>
                <tbody>
                  {sortTable(tour.groups[0]!.table)
                    .filter((r, i, arr) => arr.findIndex((x) => x.teamId === r.teamId) === i)
                    .map((r, i) => {
                    const position = i + 1;
                    const zone =
                      position <= 4
                        ? "libertadores"
                        : position <= 6
                          ? "copa-brasil"
                          : position >= 18
                            ? "rebaixamento"
                            : "";
                    return (
                      <tr
                        key={r.teamId}
                        className={`zone-row zone-${zone} ${r.teamId === tour.userTeamId ? "is-user" : ""}`}
                      >
                        <td className="py-1 text-center font-bold">{position}º</td>
                        <td className="py-1">
                          <span className={i < 2 ? "font-medium" : "text-muted-foreground"}>
                            <TeamBadge team={getTeam(r.teamId)} size="sm" />
                          </span>
                        </td>
                        <td className="py-1 text-center">{r.p}</td>
                        <td className="py-1 text-center">{r.j}</td>
                        <td className="py-1 text-center">{r.gp - r.gc}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <ZoneLegend />
            </div>
          )}
        </div>
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
