import { useEffect, useMemo, useState } from "react";
import { Trophy, Swords, Medal, Lock, Shuffle, ChevronRight, Globe, Trash2 } from "lucide-react";
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
import { UserMenu } from "./components/UserMenu";
import { OnlineMatchV3 } from "./components/OnlineMatchV3";
import { OnlineChampionship } from "./components/OnlineChampionship";
import { useBotaoAuth } from "./online/useBotaoAuth";
import type { Perfil } from "./online/auth";
import { CoachSetup } from "./career/CoachSetup";
import { NewsFeed } from "./career/NewsFeed";
import { SovereigntyPanel } from "./career/SovereigntyPanel";
import { ChoiceModal } from "./career/ChoiceModal";
import { SubornoStory } from "./career/SubornoStory";
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
import { POINTS, type CareerState, type Choice } from "./career/types";
import { TitleCeremony } from "./career/TitleCeremony";
import { LeaderboardTreinadores } from "./career/LeaderboardTreinadores";
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

  // Carregar time personalizado do usuário
  const customTeamData = useMemo(() => {
    const timeNome = localStorage.getItem("botao_online_time_personalizado") || "Meu Time";
    const abreviacao = localStorage.getItem("botao_online_abreviacao_time") || "MTI";
    const cores = JSON.parse(
      localStorage.getItem("botao_online_cores") || '["#FF0000", "#00FF00", "#0000FF"]',
    );
    const numero = localStorage.getItem("botao_online_numero_jogador") || "10";

    return {
      nome: timeNome,
      short: abreviacao,
      primary: cores[0],
      secondary: cores[1],
      numero: parseInt(numero),
    };
  }, [perfil]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nota: O time personalizado é carregado automaticamente via customTeamData useMemo
  // que depende dos dados do localStorage, que são atualizados pelo useBotaoAuth

  const userTeam = useMemo(() => {
    return createCustomTeam(
      "custom",
      customTeamData.nome,
      customTeamData.short,
      customTeamData.primary,
      customTeamData.secondary,
      75,
    );
  }, [customTeamData]);

  const [rivalTeam, setRivalTeam] = useState("fla");
  const [difficulty, setDifficulty] = useState<Difficulty>("amador");
  const [formatoTorneio, setFormatoTorneio] = useState<"copa" | "pontos-corridos">("copa");
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
    saveTournament(t);
    // Salvar no Supabase se o usuário estiver logado
    if (perfil?.user_id && t) {
      saveTournamentToSupabase(perfil.user_id, t);
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
    if (p) aplicarPerfil(p);
    // Carregar progresso do Supabase se o usuário estiver logado
    if (p?.user_id) {
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

  const iniciarCampanha = (c: CareerState) => {
    const t =
      formatoTorneio === "pontos-corridos"
        ? createLeague(userTeam.id, difficulty, 10, userTeam)
        : createTournament(userTeam.id, difficulty, userTeam);
    persistTournament(t);
    const novaCareer: CareerState = {
      ...c,
      dificuldadeAtual: difficulty,
      bonusProximaPartida: 0,
      penaltiesProximaPartida: 0,
      moralTime: 65,
      headlines: manchetesDeEstreia(c.coach.apelido || c.coach.nome, userTeam.name),
      ultimaRodadaProcessada: -1,
      eventoPendenteId: null,
      coach: { ...c.coach, campanhasJogadas: c.coach.campanhasJogadas + 1 },
    };
    persistCareer(novaCareer);
    // RPC remota (limpa manchetes antigas do banco + registra nova campanha)
    if (perfil?.user_id) {
      iniciarCampanhaRemota(difficulty)
        .then(() => {
          // grava manchetes de estreia no banco
          const semId = novaCareer.headlines.map(({ id: _id, ...rest }) => rest);
          return inserirManchetesRemotas(perfil.user_id, semId);
        })
        .catch(() => {});
    }
    setScreen("hub");
  };

  const finishCoachSetup = (coach: CareerState["coach"]) => {
    const base = career ?? EMPTY_CAREER;
    const nova: CareerState = { ...base, coach };
    persistCareer(nova);
    iniciarCampanha(nova);
  };

  // Prepara o próximo evento de escolha entre partidas (se houver)
  const preparaEscolha = (c: CareerState, faseAtual: string): CareerState => {
    let next = c;
    // Enredo de suborno (narrativa paralela). Tem prioridade e pode disparar em
    // momentos específicos da campanha (fase de grupos, semi/final).
    const sub = next.suborno ?? SUBORNO_INICIAL;
    if (deveOfertarSuborno(sub, faseAtual) && !sub.nodeAtual) {
      next = { ...next, suborno: iniciarOferta(sub) };
    }
    if (next.eventoPendenteId) return next;
    // Sortear evento de carreira antes de cada partida do usuário (60% chance)
    if (Math.random() > 0.6) return next;
    const evento = sortearEvento(next.ultimasEscolhas);
    return { ...next, eventoPendenteId: evento.id };
  };

  const playNext = () => {
    if (!tour) return;
    // O enredo de suborno, se ativo, abre antes de qualquer outra decisão.
    if (career?.suborno?.nodeAtual) {
      setScreen("suborno");
      return;
    }
    // Se houver evento de carreira pendente, mostra a escolha antes
    if (career?.eventoPendenteId) {
      setScreen("choice");
      return;
    }
    const f = nextUserFixture(tour);
    if (!f) return;
    setCurrent(f);
    setScreen("tournament-match");
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
      persistCareer(addHeadlines(novo, [
        {
          id: `suborno-${Date.now()}`,
          manchete,
          tag: "polemica",
          rodada: 99,
        },
      ]));
    }
    // Após fechar o capítulo final, segue para a partida (ou decisão de carreira).
    if (finalizado) {
      const f = nextUserFixture(tour!);
      if (!f) {
        setScreen("hub");
        return;
      }
      setCurrent(f);
      setScreen("tournament-match");
    }
  };

  const aplicarEscolha = (choice: Choice) => {
    if (!career) return;
    let bonusPoder = career.bonusProximaPartida + (choice.bonusPoder ?? 0);
    let moral = Math.max(0, Math.min(100, career.moralTime + (choice.bonusMoral ?? 0)));
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

    // Segue para a partida
    const f = nextUserFixture(tour!);
    if (!f) {
      setScreen("hub");
      return;
    }
    setCurrent(f);
    setScreen("tournament-match");
  };

  const finishTournamentMatch = (r: MatchResult) => {
    if (!tour || !current) return;
    const t: Tournament = structuredClone(tour);

    const userIsHome = r.homeId === userTeam.id;
    const gf = userIsHome ? r.homeGoals : r.awayGoals;
    const ga = userIsHome ? r.awayGoals : r.homeGoals;

    if (t.phase === "grupos") {
      const fx = t.groupFixtures.find((x) => x.id === current.id)!;
      applyResult(t, fx, r);

      // Simula apenas os jogos da mesma rodada que NÃO envolvem o usuário
      const currentRound = fx.stage.split("·")[1]?.trim();
      t.groupFixtures
        .filter(
          (x) =>
            !x.played &&
            x.stage.includes(currentRound!) &&
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
          setToast(
            t.champion === t.userTeamId
              ? "CAMPEÃO DA LIGA! Pontos corridos conquistados."
              : "Fim da liga — você não ficou em 1º.",
          );
        } else {
          buildKnockout(t);
          setToast(qualified(t) ? "Classificado para o mata-mata!" : "Eliminado na fase de grupos.");
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
      let manchetesFim: string[] = [];
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
      persistCareer(novaCareer);

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
        <UserMenu perfil={perfil} onLogin={() => setScreen("auth")} onLogout={handleLogout} />
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
        <UserMenu perfil={perfil} onLogin={() => setScreen("auth")} onLogout={handleLogout} />
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
        <UserMenu perfil={perfil} onLogin={() => setScreen("auth")} onLogout={handleLogout} />
        <AuthScreen onPronto={aoLogar} />
      </Shell>
    );
  }

  if (screen === "coach-setup") {
    return (
      <Shell>
        <UserMenu perfil={perfil} onLogin={() => setScreen("auth")} onLogout={handleLogout} />
        <CoachSetup
          timeName={userTeam.name}
          onFinish={finishCoachSetup}
          onBack={() => setScreen("menu")}
        />
      </Shell>
    );
  }

  if (screen === "suborno" && career?.suborno?.nodeAtual) {
    return (
      <Shell>
        <UserMenu perfil={perfil} onLogin={() => setScreen("auth")} onLogout={handleLogout} />
        <SubornoStory
          state={career.suborno}
          onAvancar={aplicarSuborno}
          onFechar={() => setScreen("hub")}
        />
      </Shell>
    );
  }

  if (screen === "choice" && career?.eventoPendenteId) {
    const evento = CHOICE_EVENTS.find((e) => e.id === career.eventoPendenteId);
    if (!evento) {
      setScreen("hub");
      return null;
    }
    return (
      <Shell>
        <UserMenu perfil={perfil} onLogin={() => setScreen("auth")} onLogout={handleLogout} />
        <ChoiceModal evento={evento} onChoose={aplicarEscolha} />
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
        <UserMenu perfil={perfil} onLogin={() => setScreen("auth")} onLogout={handleLogout} />
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
        />
      </Shell>
    );
  }

  return (
    <Shell>
      {showCeremony && career?.coach.nome && (
        <TitleCeremony
          coach={career.coach}
          timeName={userTeam.name}
          difficulty={tour?.difficulty ?? difficulty}
          soberaniaAdd={ceremonyBonus}
          onContinue={() => setShowCeremony(false)}
        />
      )}
      {screen === "menu" && (
        <UserMenu perfil={perfil} onLogin={() => setScreen("auth")} onLogout={handleLogout} />
      )}
      <div className="mx-auto w-full max-w-5xl px-4 pb-16">
        {screen !== "auth" && (
          <Header
            progress={progress}
            onTrophies={() => setScreen("trophies")}
            onHome={() => setScreen("menu")}
          />
        )}

        {screen === "menu" && (
          <Menu
            progress={progress}
            onFriendly={() => setScreen("friendly-setup")}
            onOnline={() => setScreen("online")}
            onOnlineChampionship={() => setScreen("online-championship")}
            onTournament={() => setScreen("tournament-setup")}
            onTrophies={() => setScreen("trophies")}
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
            title="Torneio"
            subtitle="Escolha o formato: Copa (grupos + mata-mata) ou Pontos Corridos (liga). Três títulos liberam o próximo nível."
            userTeam={userTeam}
            rivalTeam={rivalTeam}
            setRivalTeam={setRivalTeam}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            progress={progress}
            formato={formatoTorneio}
            setFormato={setFormatoTorneio}
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
          />
        )}

        {screen === "trophies" && (
          <TrophyRoom progress={progress} onBack={() => setScreen("menu")} />
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
  onTournament,
  onTrophies,
  hasTour,
  onResume,
  onDeleteCampaign,
  onSaveCampaign,
}: {
  progress: Progress;
  onFriendly: () => void;
  onOnline: () => void;
  onOnlineChampionship: () => void;
  onTournament: () => void;
  onTrophies: () => void;
  hasTour: boolean;
  onResume: () => void;
  onDeleteCampaign: () => void;
  onSaveCampaign: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <MenuCard
          icon={<Swords className="size-5" />}
          title="Amistoso"
          desc="Partida rápida contra qualquer time. Bom pra treinar o dedo."
          onClick={onFriendly}
        />
        <MenuCard
          icon={<Globe className="size-5" />}
          title="Amistoso Online"
          desc="Partida em tempo real contra jogadores reais. Crie ou entre numa mesa."
          onClick={onOnline}
        />
        <MenuCard
          icon={<Trophy className="size-5" />}
          title="Campeonato Online"
          desc="Campeonato round-robin com até 8 jogadores. Pontos contam no ranking."
          onClick={onOnlineChampionship}
        />
        <MenuCard
          icon={<Medal className="size-5" />}
          title="Torneio"
          desc="Fase de grupos + mata-mata. Sorteio aleatório a cada campanha."
          onClick={onTournament}
        />
        <MenuCard
          icon={<Medal className="size-5" />}
          title="Sala de troféus"
          desc={`${progress.trophies.length} título(s) · amistosos ${progress.friendlies.w}V ${progress.friendlies.d}E ${progress.friendlies.l}D`}
          onClick={onTrophies}
        />
        {hasTour && (
          <MenuCard
            icon={<ChevronRight className="size-5" />}
            title="Continuar campanha"
            desc="Voltar para o torneio em andamento."
            onClick={onResume}
          />
        )}
        {hasTour && (
          <MenuCard
            icon={<Shuffle className="size-5" />}
            title="Salvar campanha"
            desc="Salva o progresso atual da campanha no servidor."
            onClick={onSaveCampaign}
          />
        )}
        {hasTour && (
          <MenuCard
            icon={<Trash2 className="size-5 text-destructive" />}
            title="Excluir campanha"
            desc="Apaga todo o progresso da campanha atual. Não pode desfazer."
            onClick={onDeleteCampaign}
            destructive
          />
        )}
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
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`panel group text-left ${destructive ? "border-destructive/50 hover:border-destructive" : ""}`}
    >
      <span
        className={`mb-3 flex items-center gap-2 ${destructive ? "text-destructive" : "text-accent-foreground"}`}
      >
        {icon}
      </span>
      <span className="block font-display text-2xl">{title}</span>
      <span className="mt-1 block text-sm text-muted-foreground">{desc}</span>
      <span
        className={`mt-4 block font-display text-xs tracking-[0.2em} uppercase ${destructive ? "text-destructive" : "text-accent-foreground"}`}
      >
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
  formato?: "copa" | "pontos-corridos";
  setFormato?: (f: "copa" | "pontos-corridos") => void;
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
    formato,
    setFormato,
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

      {formato && setFormato && (
        <div>
          <p className="mb-2 font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Formato do torneio
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              {
                id: "copa" as const,
                nome: "Copa (Grupos + Mata-mata)",
                desc: "8 grupos de 4 + oitavas até a final. Clássico.",
              },
              {
                id: "pontos-corridos" as const,
                nome: "Pontos Corridos (Liga)",
                desc: "Turno único de 10 times. Quem somar mais, é campeão.",
              },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFormato(f.id)}
                className={`diff-card ${formato === f.id ? "diff-card-active" : ""}`}
              >
                <span className="font-display text-lg">{f.nome}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{f.desc}</span>
              </button>
            ))}
          </div>
        </div>
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
}: {
  tour: Tournament;
  userTeam: Team;
  career: CareerState | null;
  onPlay: () => void;
  onExit: () => void;
}) {
  const next = useMemo(() => nextUserFixture(tour), [tour]);
  const stage = tour.knockout[tour.knockout.length - 1];

  // Função auxiliar para buscar time, usando o time personalizado do usuário se necessário
  const getTeam = (teamId: string): Team => {
    if (teamId === userTeam.id) return userTeam;
    return teamByIdSync(teamId);
  };

  return (
    <div className="space-y-6">
      {career?.coach.nome && <SovereigntyPanel coach={career.coach} moral={career.moralTime} />}

      <div className="panel">
        <p className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
          {tour.phase === "fim"
            ? "Campanha encerrada"
            : tour.phase === "grupos"
              ? "Fase de grupos"
              : stage?.stage}
        </p>
        {tour.phase === "fim" ? (
          <p className="mt-2 font-display text-2xl">
            Campeão: <TeamBadge team={getTeam(tour.champion!)} />
          </p>
        ) : next ? (
          <>
            <p className="mt-2 font-display text-2xl">
              {getTeam(next.homeId).short} vs {getTeam(next.awayId).short}
            </p>
            <p className="text-sm text-muted-foreground">{next.stage}</p>
            {career?.eventoPendenteId && (
              <p className="mt-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                ⚠ Uma decisão importante espera por você antes desta partida
              </p>
            )}
            {career?.suborno?.nodeAtual && (
              <p className="mt-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300">
                💼 Alguém quer falar com você no estacionamento...
              </p>
            )}
            <button
              data-testid="entrar-em-campo"
              onClick={onPlay}
              className="btn-primary mt-4 w-full sm:w-auto"
            >
              {career?.eventoPendenteId ? "Tomar decisão →" : "Entrar em campo"}
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Seu time está fora da disputa.</p>
        )}
      </div>

      {career && career.headlines.length > 0 && <NewsFeed headlines={career.headlines} />}

      {tour.phase === "grupos" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {tour.groups.map((g) => (
            <div key={g.name} className="panel">
              <p className="mb-2 font-display text-lg">Grupo {g.name}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] tracking-wider text-muted-foreground uppercase">
                    <th className="text-left font-normal">Time</th>
                    <th className="w-8 font-normal">P</th>
                    <th className="w-8 font-normal">J</th>
                    <th className="w-10 font-normal">SG</th>
                  </tr>
                </thead>
                <tbody>
                  {sortTable(g.table).map((r, i) => (
                    <tr
                      key={r.teamId}
                      className={r.teamId === tour.userTeamId ? "text-accent-foreground" : ""}
                    >
                      <td className="py-1">
                        <span className={i < 2 ? "font-medium" : "text-muted-foreground"}>
                          <TeamBadge team={getTeam(r.teamId)} size="sm" />
                        </span>
                      </td>
                      <td className="text-center">{r.p}</td>
                      <td className="text-center">{r.j}</td>
                      <td className="text-center">{r.gp - r.gc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {tour.knockout.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {tour.knockout.map((k) => (
            <div key={k.stage} className="panel">
              <p className="mb-2 font-display text-lg">{k.stage}</p>
              <ul className="space-y-2 text-sm">
                {k.fixtures.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">
                      {getTeam(f.homeId).short} x {getTeam(f.awayId).short}
                    </span>
                    <span className="shrink-0 font-mono text-muted-foreground">
                      {f.result
                        ? `${f.result.homeGoals}-${f.result.awayGoals}${
                            f.result.penHome !== undefined
                              ? ` (${f.result.penHome}-${f.result.penAway})`
                              : ""
                          }`
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
              {k.fixtures.every((f) => f.played) && (
                <p className="mt-2 text-[11px] tracking-wider text-muted-foreground uppercase">
                  Avançam: {k.fixtures.map((f) => getTeam(winnerOf(f.result!)).short).join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <button onClick={onExit} className="btn-ghost">
        Menu principal
      </button>
    </div>
  );
}

function TrophyRoom({ progress, onBack }: { progress: Progress; onBack: () => void }) {
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
                <TeamBadge team={teamByIdSync(t.teamId)} size="sm" />
                <span className="shrink-0 text-muted-foreground">
                  {DIFFICULTIES.find((d) => d.id === t.difficulty)?.label} ·{" "}
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
