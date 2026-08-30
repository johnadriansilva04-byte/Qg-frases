/**
 * OnlineChampionship — modo Campeonato Online.
 *
 * Fluxo:
 *  1. Sala (lobby): criar / entrar por código ou LINK DIRETO (?camp=...) /
 *     iniciar (criador). Entrar custa no mínimo 50 SOV de saldo (regra do
 *     servidor; o frontend valida antes para uma mensagem clara).
 *  2. O dono da sala pode "Preencher com Bots": as vagas restantes são
 *     completadas com clubes que JÁ existem no universo (base TEAMS) —
 *     nenhum usuário novo é criado.
 *  3. Em andamento: confronto contra HUMANO abre a MesaOnlineMatch (realtime);
 *     confronto contra BOT é jogado localmente contra o motor do jogo
 *     (MatchView) e o resultado segue o mesmo caminho de registro. Confrontos
 *     bot × bot são simulados pelo motor (dono da sala) com placar
 *     determinístico.
 *  4. Ao finalizar, registrar_resultado_campeonato computa pontos (3/1/0),
 *     gols, estatísticas do perfil e avança/finaliza o campeonato. O título
 *     do campeão humano vira troféu na sala de troféus.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Users, Crown, Play, Link2, Bot, Zap } from "lucide-react";
import { useBotaoAuth } from "../online/useBotaoAuth";
import { useJogador } from "@/hooks/useJogador";
import { supabase } from "@/integrations/supabase/client";
import {
  criarCampeonato,
  entrarCampeonato,
  iniciarCampeonato,
  buscarCampeonato,
  buscarCampeonatosAbertos,
  registrarResultadoCampeonato,
  preencherCampeonatoComBots,
  resolverConfrontoBots,
  registrarResultadoVsBot,
  simularConfrontoBots,
  linkConviteCampeonato,
  type CampeonatoOnline,
  type ConfrontoCampeonato,
  type ParticipanteCampeonato,
  type BotCampeonato,
  type FormatoCampeonato,
} from "@/lib/multiplayer/campeonato.api";
import {
  abrirMesaCampeonato,
  buscarMesa,
  type MesaFutebol,
} from "@/lib/multiplayer/mesa.api";
import { MesaOnlineMatch, type ResultadoMesa } from "./MesaOnlineMatch";
import { MatchView } from "@/components/botao/components/MatchView";
import { TEAMS } from "@/components/botao/data/teams";
import type { MatchResult } from "@/components/botao/types";
import { loadProgressFromSupabase, saveProgressToSupabase } from "@/components/botao/storage";
import { useAdManager } from "@/lib/adManager";
import { OnlineLobbyLayout, type LobbyRoom, nomeAmigavel } from "@/components/online/OnlineLobbyLayout";
import { MataMataBracket } from "./MataMataBracket";

/** Saldo mínimo de SOV para criar/entrar no Campeonato Online (regra §5). */
export const SOV_MINIMO_CAMPEONATO = 50;

function obterTimePerfil(perfil: {
  user_id: string;
  time_personalizado: string;
  abreviacao_time: string;
  cores: string[];
  botoes_nomes?: string[] | null;
}) {
  return {
    id: `custom-${perfil.user_id}`,
    nome: perfil.time_personalizado,
    abreviacao: perfil.abreviacao_time,
    cores: perfil.cores,
    botoesNomes: perfil.botoes_nomes ?? undefined,
  };
}

function nomeDoParticipante(camp: CampeonatoOnline, uid: string): string {
  const p = (camp.participantes as ParticipanteCampeonato[]).find((x) => x.user_id === uid);
  return p ? `${p.nome}${p.bot ? " (bot)" : ""}` : "Jogador";
}

function abrevDoParticipante(camp: CampeonatoOnline, uid: string): string {
  const p = (camp.participantes as ParticipanteCampeonato[]).find((x) => x.user_id === uid);
  return p?.abreviacao ?? "ADV";
}

function participanteDo(camp: CampeonatoOnline, uid: string | null): ParticipanteCampeonato | null {
  if (!uid) return null;
  return (camp.participantes as ParticipanteCampeonato[]).find((x) => x.user_id === uid) ?? null;
}

/** Pool de bots = clubes que JÁ existem no universo (base TEAMS), excluindo
 *  times já presentes na sala. */
function botsDisponiveis(camp: CampeonatoOnline): BotCampeonato[] {
  const usados = new Set(
    (camp.participantes as ParticipanteCampeonato[]).flatMap((p) => [p.time_id, p.nome]),
  );
  return TEAMS.filter((t) => !usados.has(t.id) && !usados.has(t.name)).map((t) => ({
    nome: t.name,
    time_id: t.id,
    abreviacao: t.short,
    power: t.power,
  }));
}

export function OnlineChampionship({
  onBack,
  onEstadoPartida,
  codigoInicial,
}: {
  onBack?: () => void;
  onEstadoPartida?: (emPartida: boolean) => void;
  /** Link direto (?camp=CODIGO): entra direto na sala, sem procurar. */
  codigoInicial?: string | undefined;
}) {
  const queryClient = useQueryClient();
  const { perfil, recarregar, aplicarPerfil } = useBotaoAuth();
  const { data: jogador } = useJogador();
  const { markFirstGamePlayed } = useAdManager("/botao");
  const userId = jogador?.user_id ?? perfil?.user_id ?? "";

  const [codigo, setCodigo] = useState<string | null>(null);
  const [codigoEntrar, setCodigoEntrar] = useState("");
  const [nomeSala, setNomeSala] = useState("Campeonato Online");
  const [maxJogadores, setMaxJogadores] = useState(8);
  const [formato, setFormato] = useState<FormatoCampeonato>("pontos");
  const [premioSov, setPremioSov] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [preenchendoBots, setPreenchendoBots] = useState(false);
  const [mesaAtiva, setMesaAtiva] = useState<MesaFutebol | null>(null);
  const [confrontoAtivo, setConfrontoAtivo] = useState<ConfrontoCampeonato | null>(null);
  const [confrontoBot, setConfrontoBot] = useState<{
    confronto: ConfrontoCampeonato;
    bot: ParticipanteCampeonato;
    euSouJ1: boolean;
  } | null>(null);
  const [toastLink, setToastLink] = useState<string | null>(null);
  const entradaLinkTentada = useRef<string | null>(null);
  const trofeuRegistrado = useRef<string | null>(null);

  // Lista de campeonatos abertos
  const { data: abertos = [], refetch: recarregarAbertos } = useQuery({
    queryKey: ["campeonatos_abertos"],
    queryFn: buscarCampeonatosAbertos,
    refetchInterval: 6000,
    enabled: !codigo,
  });

  // Campeonato atual (tempo real via Postgres Changes)
  const { data: campeonato } = useQuery({
    queryKey: ["campeonato", codigo],
    queryFn: () => (codigo ? buscarCampeonato(codigo) : null),
    enabled: !!codigo,
    refetchInterval: mesaAtiva || confrontoBot ? false : 5000,
  });

  // Inscrição em realtime para atualizar a sala instantaneamente
  useEffect(() => {
    if (!codigo) return;
    const canal = supabase
      .channel(`campeonato_${codigo}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "botao_campeonatos_online",
          filter: `codigo=eq.${codigo}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["campeonato", codigo] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [codigo, queryClient]);

  useEffect(() => {
    if (onEstadoPartida) onEstadoPartida(!!mesaAtiva || !!confrontoBot);
  }, [mesaAtiva, confrontoBot, onEstadoPartida]);

  // LINK DIRETO (?camp=CODIGO): entra na sala assim que o perfil carrega —
  // sem o usuário precisar procurar o campeonato.
  useEffect(() => {
    if (!codigoInicial || !perfil || entradaLinkTentada.current === codigoInicial) return;
    entradaLinkTentada.current = codigoInicial;
    void (async () => {
      try {
        await entrarCampeonato(codigoInicial);
        setCodigo(codigoInicial);
      } catch (e) {
        // Sala cheia/começou: ainda assim abre a sala para acompanhar.
        const existente = await buscarCampeonato(codigoInicial).catch(() => null);
        if (existente) setCodigo(codigoInicial);
        else setErro((e as Error)?.message ?? "Não foi possível abrir a sala do campeonato.");
      }
    })();
  }, [codigoInicial, perfil]);

  const handleCriar = useCallback(async () => {
    if (!perfil) {
      setErro("Faça login para criar um campeonato.");
      return;
    }
    setCriando(true);
    setErro(null);
    try {
      const camp = await criarCampeonato(nomeSala || "Campeonato Online", maxJogadores, premioSov, formato);
      setCodigo(camp.codigo);
      recarregarAbertos();
    } catch (e: unknown) {
      setErro((e as Error)?.message ?? "Erro ao criar campeonato.");
    } finally {
      setCriando(false);
    }    }, [perfil, nomeSala, maxJogadores, premioSov, recarregarAbertos]);

  const handleEntrar = useCallback(
    async (codigoAlvo?: string) => {
      if (!perfil) {
        setErro("Faça login para entrar em um campeonato.");
        return;
      }
      const alvo = (codigoAlvo ?? codigoEntrar).trim();
      if (!alvo) {
        setErro("Informe o código da sala.");
        return;
      }
      setErro(null);
      try {
        await entrarCampeonato(alvo);
        setCodigo(alvo);
        setCodigoEntrar("");
      } catch (e: unknown) {
        setErro((e as Error)?.message ?? "Erro ao entrar no campeonato.");
      }    }, [perfil, codigoEntrar],
  );

  const handleIniciar = useCallback(async () => {
    if (!campeonato) return;
    setIniciando(true);
    setErro(null);
    try {
      await iniciarCampeonato(campeonato.codigo);
    } catch (e: unknown) {
      setErro((e as Error)?.message ?? "Erro ao iniciar campeonato.");
    } finally {
      setIniciando(false);
    }
  }, [campeonato]);

  const handlePreencherBots = useCallback(async () => {
    if (!campeonato || campeonato.criador_id !== userId) return;
    setPreenchendoBots(true);
    setErro(null);
    try {
      const bots = botsDisponiveis(campeonato);
      await preencherCampeonatoComBots(campeonato.codigo, bots);
      queryClient.invalidateQueries({ queryKey: ["campeonato", codigo] });
    } catch (e: unknown) {
      setErro((e as Error)?.message ?? "Erro ao preencher com bots.");
    } finally {
      setPreenchendoBots(false);
    }
  }, [campeonato, userId, queryClient, codigo]);

  const handleSairSala = useCallback(() => {
    setCodigo(null);
    setConfrontoAtivo(null);
    setMesaAtiva(null);
    setConfrontoBot(null);
    recarregarAbertos();
  }, [recarregarAbertos]);

  const copiarLink = useCallback(() => {
    if (!campeonato) return;
    const link = linkConviteCampeonato(campeonato.codigo);
    void navigator.clipboard?.writeText(link).catch(() => {});
    setToastLink(link);
    window.setTimeout(() => setToastLink(null), 6000);
  }, [campeonato]);

  // Encontrar confronto pendente do usuário na rodada atual
  const meuConfrontoPendente = useMemo<ConfrontoCampeonato | null>(() => {
    if (!campeonato || campeonato.status !== "em_andamento") return null;
    const lista = (campeonato.confrontos as ConfrontoCampeonato[]) ?? [];
    return (
      lista.find(
        (c) =>
          c.rodada === campeonato.rodada_atual &&
          !c.bye &&
          (c.j1_id === userId || c.j2_id === userId) &&
          c.status === "pendente",
      ) ?? null
    );
  }, [campeonato, userId]);

  const handleJogarConfronto = useCallback(async () => {
    if (!campeonato || !perfil || !meuConfrontoPendente) return;
    setErro(null);
    const adversarioId =
      meuConfrontoPendente.j1_id === userId ? meuConfrontoPendente.j2_id : meuConfrontoPendente.j1_id;
    const adversario = participanteDo(campeonato, adversarioId);

    // Confronto contra BOT: partida local contra o motor do jogo — o resultado
    // segue o mesmo caminho de registro (mesa vinculada + registrar_resultado).
    if (adversario?.bot) {
      setConfrontoBot({
        confronto: meuConfrontoPendente,
        bot: adversario,
        euSouJ1: meuConfrontoPendente.j1_id === userId,
      });
      return;
    }

    try {
      const mesaId = await abrirMesaCampeonato(campeonato.id, meuConfrontoPendente.rodada);
      const mesa = await buscarMesa(mesaId);

      if (!mesa) {
        setErro("Não foi possível carregar a mesa.");
        return;
      }

      setConfrontoAtivo(meuConfrontoPendente);
      setMesaAtiva(mesa);
    } catch (e: unknown) {
      setErro((e as Error)?.message ?? "Erro ao iniciar confronto.");
    }
  }, [campeonato, perfil, meuConfrontoPendente, userId]);

  const handleFinalizada = useCallback(
    async (r: ResultadoMesa) => {
      markFirstGamePlayed();

      if (!campeonato || !confrontoAtivo || !mesaAtiva) return;
      try {
        const j1 = confrontoAtivo.j1_id;
        const j2 = confrontoAtivo.j2_id;
        const golsJ1 = j1 === mesaAtiva.jogador_1_id ? r.golsJ1 : r.golsJ2;
        const golsJ2 = j2 === mesaAtiva.jogador_1_id ? r.golsJ1 : r.golsJ2;
        await registrarResultadoCampeonato(campeonato.id, mesaAtiva.mesa_id, golsJ1, golsJ2);
      } catch (e: unknown) {
        // RPC pode falhar se auth expirou — o jogo já terminou, mostrar resultado
        console.warn("[Championship] registrar resultado falhou:", (e as Error)?.message);
      }
      // Recarregar perfil (pode falhar — não bloqueia)
      try {
        const novoPerfil = await recarregar();
        if (novoPerfil) aplicarPerfil(novoPerfil);
      } catch {
        // Silencioso
      }
      // SEMPRE limpar estado e avançar o fluxo
      setMesaAtiva(null);
      setConfrontoAtivo(null);
      queryClient.invalidateQueries({ queryKey: ["campeonato", codigo] });
    },
    [
      campeonato,
      confrontoAtivo,
      mesaAtiva,
      recarregar,
      aplicarPerfil,
      queryClient,
      codigo,
      markFirstGamePlayed,
    ],
  );

  /** Fim da partida contra BOT: mapeia os gols de home/away para os slots
   *  j1/j2 do confronto. O bot pode estar em qualquer slot — nunca usar
   *  "meusGols" como atalho. */
  const handleFimConfrontoBot = useCallback(
    async (r: MatchResult) => {
      markFirstGamePlayed();
      if (!campeonato || !confrontoBot || !perfil) return;
      const { confronto, euSouJ1 } = confrontoBot;
      const golsJ1 = euSouJ1 ? r.homeGoals : r.awayGoals;
      const golsJ2 = euSouJ1 ? r.awayGoals : r.homeGoals;
      try {
        await registrarResultadoVsBot(campeonato.id, confronto.rodada, golsJ1, golsJ2);
      } catch (e: unknown) {
        console.warn("[Championship] registrar resultado vs bot falhou:", (e as Error)?.message);
      }
      try {
        const novoPerfil = await recarregar();
        if (novoPerfil) aplicarPerfil(novoPerfil);
      } catch {
        // Silencioso
      }
      // SEMPRE limpar estado e avançar
      setConfrontoBot(null);
      queryClient.invalidateQueries({ queryKey: ["campeonato", codigo] });
    },
    [
      campeonato,
      confrontoBot,
      perfil,
      recarregar,
      aplicarPerfil,
      queryClient,
      codigo,
      markFirstGamePlayed,
    ],
  );

  // Confrontos bot × bot da rodada atual: o DONO simula pelo motor (placar
  // determinístico por poder dos clubes) e o servidor valida que os dois
  // lados são bots antes de gravar.
  const resolvendoBots = useRef(false);
  useEffect(() => {
    if (!campeonato || campeonato.status !== "em_andamento") return;
    if (campeonato.criador_id !== userId) return;
    if (mesaAtiva || confrontoBot || resolvendoBots.current) return;
    const rodada = campeonato.rodada_atual;
    const botxbot = ((campeonato.confrontos as ConfrontoCampeonato[]) ?? []).filter((c) => {
      if (c.rodada !== rodada || c.bye || c.status !== "pendente") return false;
      const p1 = participanteDo(campeonato, c.j1_id);
      const p2 = participanteDo(campeonato, c.j2_id);
      return Boolean(p1?.bot && p2?.bot);
    });
    if (botxbot.length === 0) return;
    resolvendoBots.current = true;
    void (async () => {
      try {
        for (const c of botxbot) {
          const p1 = participanteDo(campeonato, c.j1_id);
          const p2 = participanteDo(campeonato, c.j2_id);
          const { golsJ1, golsJ2 } = simularConfrontoBots(
            p1?.power ?? 50,
            p2?.power ?? 50,
            `${campeonato.id}:r${rodada}:${c.j1_id}x${c.j2_id}`,
          );
          await resolverConfrontoBots(campeonato.id, rodada, c.j1_id!, c.j2_id!, golsJ1, golsJ2);
        }
      } catch {
        /* o servidor valida; em erro, tenta de novo na próxima atualização */
      } finally {
        resolvendoBots.current = false;
        queryClient.invalidateQueries({ queryKey: ["campeonato", codigo] });
      }
    })();
  }, [campeonato, userId, mesaAtiva, confrontoBot, queryClient, codigo]);

  // Título do campeonato → troféu na sala de troféus (uma vez por campeonato).
  useEffect(() => {
    if (!campeonato || campeonato.status !== "finalizado") return;
    if (campeonato.vencedor_id !== userId || !userId) return;
    const chave = `camp-online-${campeonato.codigo}`;
    if (trofeuRegistrado.current === chave) return;
    trofeuRegistrado.current = chave;
    void (async () => {
      const progress = await loadProgressFromSupabase(userId);
      if (!progress) return;
      if ((progress.trophies ?? []).some((t) => t.teamId === chave)) return;
      await saveProgressToSupabase(userId, {
        ...progress,
        trophies: [
          ...(progress.trophies ?? []),
          { difficulty: "lenda", teamId: chave, date: new Date().toISOString() },
        ],
      });
    })();
  }, [campeonato, userId]);

  // ============ Tela de jogo contra BOT (motor local) ============
  if (confrontoBot && perfil && campeonato) {
    const meuTime = obterTimePerfil(perfil);
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Campeonato · Rodada {confrontoBot.confronto.rodada} · {meuTime.abreviacao} ×{" "}
            {confrontoBot.bot.abreviacao} <Bot className="inline size-3" />
          </p>
          <button className="btn-ghost text-sm" onClick={() => setConfrontoBot(null)}>
            Sair
          </button>
        </div>
        <MatchView
          key={`bot-${campeonato.id}-r${confrontoBot.confronto.rodada}`}
          homeId={confrontoBot.euSouJ1 ? meuTime.id : confrontoBot.bot.time_id}
          awayId={confrontoBot.euSouJ1 ? confrontoBot.bot.time_id : meuTime.id}
          userSide={confrontoBot.euSouJ1 ? "home" : "away"}
          difficulty="profissional"
          turns={24}
          stageLabel={`Campeonato · Rodada ${confrontoBot.confronto.rodada}`}
          onFinish={(r) => void handleFimConfrontoBot(r)}
          onQuit={() => setConfrontoBot(null)}
          customTeam={{
            id: meuTime.id,
            name: meuTime.nome,
            short: meuTime.abreviacao,
            primary: meuTime.cores[0] ?? "#1e3a8a",
            secondary: meuTime.cores[1] ?? "#0b7a3b",
            power: 75,
            city: "Cidadela",
            escudo: "⚽",
            divisaoInicial: "serie-c",
            botoesNomes: meuTime.botoesNomes,
          }}
        />
      </main>
    );
  }

  // ============ Tela de jogo (mesa ativa, humano × humano) ============
  if (mesaAtiva && perfil && campeonato) {
    const meuTime = obterTimePerfil(perfil);
    return (
      <MesaOnlineMatch
        mesa={mesaAtiva}
        perfil={perfil}
        userId={userId}
        meuTime={meuTime}
        stageLabel={`Campeonato · Rodada ${confrontoAtivo?.rodada ?? campeonato.rodada_atual}`}
        isChampionship
        onSair={() => {
          setMesaAtiva(null);
          setConfrontoAtivo(null);
        }}
        onFinalizada={handleFinalizada}
      />
    );
  }

  // ============ Tela da sala ============
  if (campeonato) {
    return (
      <SalaCampeonato
        camp={campeonato}
        userId={userId}
        isCriador={campeonato.criador_id === userId}
        onBack={handleSairSala}
        onIniciar={handleIniciar}
        iniciando={iniciando}
        erro={erro}
        onJogar={handleJogarConfronto}
        meuConfrontoPendente={meuConfrontoPendente}
        onPreencherBots={handlePreencherBots}
        preenchendoBots={preenchendoBots}
        onCopiarLink={copiarLink}
        toastLink={toastLink}
      />
    );
  }

  // ============ Hub — shared lobby layout ============
  const lobbyRooms: LobbyRoom[] = abertos.map((c) => {
    const numPart = Array.isArray(c.participantes) ? c.participantes.length : 0;
    return {
      id: c.codigo,
      name: c.nome,
      status: c.status === "aguardando" ? "aguardando" : c.status === "em_andamento" ? "em_andamento" : "finalizado",
      playerCount: numPart,
      maxPlayers: c.max_jogadores,
      meta: `${c.formato === "mata-mata" ? "Mata-Mata" : "Pontos Corridos"}${(c.premio_sov ?? 0) > 0 ? ` · ${c.premio_sov} SOV` : ""}`,
    };
  });

  const champCreateForm = (
    <div className="space-y-3">
      <div>
        <p className="text-[9px] uppercase tracking-wider text-white/20 font-bold mb-1.5">Nome da sala</p>
        <input
          value={nomeSala}
          onChange={(e) => setNomeSala(e.target.value)}
          placeholder="Campeonato Online"
          maxLength={40}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 focus:border-emerald-400/50 focus:outline-none"
        />
      </div>
      <div>
        <p className="text-[9px] uppercase tracking-wider text-white/20 font-bold mb-1.5">Formato</p>
        <div className="grid grid-cols-3 gap-1.5">
          {([["pontos", "Pontos Corridos", "Todos vs todos"], ["mata-mata", "Mata-Mata", "Grupos + Eliminatório"]] as const).map(([id, label, desc]) => (
            <button key={id} onClick={() => setFormato(id)} className={`rounded-lg border p-3 text-left transition ${formato === id ? "border-emerald-400/60 bg-emerald-400/10" : "border-white/10 hover:border-white/20"}`}>
              <p className="text-xs font-bold text-white">{label}</p>
              <p className="text-[10px] text-white/40">{desc}</p>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[9px] uppercase tracking-wider text-white/20 font-bold mb-1.5">Vagas</p>
        <div className="flex gap-1.5">
          {[8, 12, 16, 32].map((n) => (
            <button key={n} onClick={() => setMaxJogadores(n)} className={`rounded-md px-3 py-1.5 text-[10px] font-bold transition ${maxJogadores === n ? "bg-emerald-500 text-white" : "border border-white/10 text-white/40 hover:border-white/20"}`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleCriar} disabled={criando || !perfil} className="w-full rounded-lg bg-emerald-500 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-emerald-400 disabled:opacity-50">
        {criando ? "Criando..." : "+ Criar Campeonato"}
      </button>
      {!perfil && <p className="text-center text-[10px] text-red-400/80">Faça login para criar.</p>}
    </div>
  );

  return (
    <OnlineLobbyLayout
      title="CAMPEONATO ONLINE"
      subtitle={`${formato === "mata-mata" ? "Mata-Mata + Grupos" : "Pontos Corridos"}`}
      icon={<span className="text-sm">🏆</span>}
      onBack={onBack}
      accent="amber"
      createForm={champCreateForm}
      joinCode={codigoEntrar}
      setJoinCode={setCodigoEntrar}
      onJoinByCode={(c) => void handleEntrar(c)}
      joinDisabled={!perfil || !codigoEntrar.trim()}
      rooms={lobbyRooms}
      onJoinRoom={(id) => void handleEntrar(id)}
      onRefresh={() => recarregarAbertos()}
      toastLink={toastLink}
      onDismissToast={() => setToastLink(null)}
      error={erro}
      onDismissError={() => setErro(null)}
    />
  );
}

function SalaCampeonato({
  camp,
  userId,
  isCriador,
  onBack,
  onIniciar,
  iniciando,
  erro,
  onJogar,
  meuConfrontoPendente,
  onPreencherBots,
  preenchendoBots,
  onCopiarLink,
  toastLink,
}: {
  camp: CampeonatoOnline;
  userId: string;
  isCriador: boolean;
  onBack: () => void;
  onIniciar: () => void;
  iniciando: boolean;
  erro: string | null;
  onJogar: () => void;
  meuConfrontoPendente: ConfrontoCampeonato | null;
  onPreencherBots: () => void;
  preenchendoBots: boolean;
  onCopiarLink: () => void;
  toastLink: string | null;
}) {
  const participantes = useMemo(
    () => (camp.participantes as ParticipanteCampeonato[]) ?? [],
    [camp.participantes],
  );
  const confrontos = useMemo(() => (camp.confrontos as ConfrontoCampeonato[]) ?? [], [camp.confrontos]);
  const classificacao = useMemo(
    () =>
      [...participantes].sort(
        (a, b) =>
          (b.pontos ?? 0) - (a.pontos ?? 0) ||
          (b.gols_pro ?? 0) - (b.gols_contra ?? 0) - ((a.gols_pro ?? 0) - (a.gols_contra ?? 0)),
      ),
    [participantes],
  );

  const souCamp = camp.vencedor_id === userId;
  const totalRodadas = useMemo(() => confrontos.reduce((m, c) => Math.max(m, c.rodada), 0), [confrontos]);
  const vagas = camp.max_jogadores - participantes.length;

  // ── Shared header ──
  const statusLabel =
    camp.status === "aguardando"
      ? `${participantes.length}/${camp.max_jogadores} jogadores`
      : camp.status === "em_andamento"
        ? `Rodada ${camp.rodada_atual} de ${totalRodadas}`
        : camp.status === "finalizado"
          ? "Finalizado"
          : "Cancelado";

  const formatoLabel = camp.formato === "mata-mata" ? "Mata-Mata" : "Pontos Corridos";

  return (
    <main className="relative mx-auto w-full max-w-4xl px-4 py-6">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 left-1/3 h-[300px] w-[300px] rounded-full bg-amber-500/4 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-[250px] w-[250px] rounded-full bg-emerald-500/3 blur-[80px]" />
      </div>

      <div className="relative z-10">
        {/* ═══ Header da Sala ═══ */}
        <div className="mb-5 rounded-2xl border border-white/10 bg-gradient-to-r from-slate-950/80 to-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={onBack} className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10">
                <ArrowLeft className="size-4 text-white" />
              </button>
              <div className="min-w-0">
                <h2 className="font-display text-xl font-black text-white truncate">{camp.nome}</h2>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                  <span className="font-mono">{camp.codigo}</span>
                  <span className="text-slate-700">·</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                    camp.formato === "mata-mata" ? "bg-amber-500/15 text-amber-300" : camp.formato === "grupos" ? "bg-purple-500/15 text-purple-300" : "bg-sky-500/15 text-sky-300"
                  }`}>{formatoLabel}</span>
                  <span className="text-slate-700">·</span>
                  <span>{statusLabel}</span>
                  {(camp.premio_sov ?? 0) > 0 && (
                    <>
                      <span className="text-slate-700">·</span>
                      <span className="text-amber-300">🏆 {camp.premio_sov} SOV</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ STATUS: Aguardando ═══ */}
        {camp.status === "aguardando" && (
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            {/* Left: Player Slots */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/30 to-transparent" />
                <span className="text-[9px] uppercase tracking-[0.3em] text-emerald-500/50 font-bold">Jogadores</span>
                <div className="h-px flex-1 bg-gradient-to-l from-emerald-500/30 to-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-2" data-testid="lista-participantes">
                {participantes.map((p) => (
                  <div
                    key={p.user_id}
                    className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                      p.user_id === camp.criador_id
                        ? "border-amber-500/30 bg-amber-500/5"
                        : p.bot
                          ? "border-sky-500/15 bg-sky-500/5"
                          : "border-emerald-500/15 bg-emerald-500/5"
                    }`}
                  >
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-sm ${
                      p.user_id === camp.criador_id
                        ? "bg-amber-500/15 text-amber-400"
                        : p.bot
                          ? "bg-sky-500/15 text-sky-400"
                          : "bg-emerald-500/15 text-emerald-400"
                    }`}>
                      {p.user_id === camp.criador_id ? <Crown className="size-4" /> : p.bot ? <Bot className="size-4" /> : <Users className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{p.nome}</p>
                      <p className="text-[10px] text-slate-500">
                        <span className="font-mono">{p.abreviacao ?? "MTI"}</span>
                        {p.user_id === camp.criador_id && <span className="ml-1 text-amber-300/60">host</span>}
                      </p>
                    </div>
                    <span className={`text-[9px] uppercase tracking-wider font-bold ${
                      p.user_id === camp.criador_id ? "text-amber-400" : "text-emerald-400"
                    }`}>Pronto</span>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, vagas) }).map((_, i) => (
                  <div key={`vaga-${i}`} className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-slate-900/30 p-3">
                    <Users className="size-4 text-slate-700" />
                    <span className="text-xs text-slate-700">Vaga aberta</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Controls */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-gradient-to-r from-amber-500/30 to-transparent" />
                <span className="text-[9px] uppercase tracking-[0.3em] text-amber-500/50 font-bold">Controles</span>
                <div className="h-px flex-1 bg-gradient-to-l from-amber-500/30 to-transparent" />
              </div>

              {/* Invite button */}
              <button
                onClick={onCopiarLink}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 transition hover:border-emerald-500/40 hover:bg-emerald-500/15"
                data-testid="copiar-link-camp"
              >
                <Link2 className="size-4" /> Copiar Link / Convidar Amigos
              </button>

              {/* Stats */}
              <div className="mb-3 grid grid-cols-4 gap-2">
                {[
                  { label: "Vagas", value: `${participantes.length}/${camp.max_jogadores}`, color: "text-white" },
                  { label: "Humanos", value: String(participantes.filter((p) => !p.bot).length), color: "text-emerald-300" },
                  { label: "Bots", value: String(participantes.filter((p) => p.bot).length), color: "text-sky-300" },
                  { label: "Prêmio", value: `${camp.premio_sov ?? 0}`, color: "text-amber-300" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-white/5 bg-slate-900/40 p-2 text-center">
                    <p className="text-[8px] uppercase tracking-widest text-slate-600">{s.label}</p>
                    <p className={`font-display text-sm font-black ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Host actions */}
              {isCriador && (
                <div className="space-y-2">
                  {vagas > 0 && (
                    <button
                      onClick={onPreencherBots}
                      disabled={preenchendoBots}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-2.5 text-sm font-bold text-sky-300 transition hover:border-sky-500/30 disabled:opacity-50"
                      data-testid="preencher-bots"
                    >
                      <Bot className="size-4" /> {preenchendoBots ? "Preenchendo..." : `Preencher com Bots (${vagas})`}
                    </button>
                  )}
                  <button
                    onClick={onIniciar}
                    disabled={iniciando || participantes.length < 2}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-40 disabled:shadow-none"
                    data-testid="iniciar-campeonato"
                  >
                    <Play className="size-4" /> {iniciando ? "Iniciando..." : "INICIAR CAMPEONATO"}
                  </button>
                </div>
              )}
              {!isCriador && (
                <p className="mt-3 text-center text-xs text-slate-600">Aguarde o host iniciar o campeonato.</p>
              )}
            </div>
          </div>
        )}

        {/* ═══ STATUS: Em andamento ═══ */}
        {camp.status === "em_andamento" && (
          <div className="space-y-5">
            {/* VS Card / Próxima partida */}
            {meuConfrontoPendente ? (
              <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-slate-950/60 to-cyan-950/30 p-5">
                <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
                  style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 11px)" }}
                />
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <p className="text-[9px] uppercase tracking-[0.3em] text-emerald-400/80 font-bold">
                      {meuConfrontoPendente.rodada === totalRodadas && confrontos.length > 0 ? "🏆 FINAL" : "Sua Próxima Partida"}
                    </p>
                    <p className="mt-1 font-display text-lg font-black text-white">
                      {abrevDoParticipante(camp, meuConfrontoPendente.j1_id!)} <span className="text-white/30">×</span> {abrevDoParticipante(camp, meuConfrontoPendente.j2_id!)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Rodada {meuConfrontoPendente.rodada}
                      {meuConfrontoPendente.rodada === totalRodadas && confrontos.filter((c) => c.rodada === meuConfrontoPendente!.rodada && !c.bye).length <= 2 && (
                        <span className="text-amber-300"> · FINAL</span>
                      )}
                      {participanteDo(camp, meuConfrontoPendente.j1_id === userId ? meuConfrontoPendente.j2_id : meuConfrontoPendente.j1_id)?.bot && (
                        <span className="text-sky-300"> · Bot</span>
                      )}
                    </p>
                  </div>
                  <button onClick={onJogar} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.97]" data-testid="jogar-confronto">
                    <Zap className="size-4" /> Entrar em Campo
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 text-center">
                <p className="text-sm text-slate-500">Sem confronto pendente nesta rodada. Aguarde a próxima.</p>
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
              {/* Classification Table */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-amber-500/30 to-transparent" />
                  <span className="text-[9px] uppercase tracking-[0.3em] text-amber-500/50 font-bold">Classificação</span>
                  <div className="h-px flex-1 bg-gradient-to-l from-amber-500/30 to-transparent" />
                </div>
                <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="pb-2 text-left font-normal text-slate-600">#</th>
                        <th className="pb-2 text-left font-normal text-slate-600">JOGADOR</th>
                        <th className="pb-2 w-8 text-center font-normal text-slate-600">PTS</th>
                        <th className="pb-2 w-8 text-center font-normal text-slate-600">J</th>
                        <th className="pb-2 w-10 text-center font-normal text-slate-600">SG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classificacao.map((r, i) => {
                        const isUser = r.user_id === userId;
                        return (
                          <tr key={r.user_id} className={`border-b border-white/5 last:border-0 ${isUser ? "bg-emerald-500/5" : ""}`}>
                            <td className="py-2 font-bold text-slate-400">{i + 1}º</td>
                            <td className="py-2">
                              <span className="font-mono font-bold text-white">{r.abreviacao ?? "MTI"}</span>
                              <span className="ml-1.5 text-slate-500">
                                {r.nome}
                                {r.bot && <Bot className="ml-1 inline size-2.5 text-sky-400" />}
                              </span>
                            </td>
                            <td className="py-2 text-center font-black text-amber-300">{r.pontos ?? 0}</td>
                            <td className="py-2 text-center text-slate-400">
                              {confrontos.filter((c) => c.status === "finalizado" && !c.bye && (c.j1_id === r.user_id || c.j2_id === r.user_id)).length}
                            </td>
                            <td className="py-2 text-center text-slate-400">{(r.gols_pro ?? 0) - (r.gols_contra ?? 0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bracket / Confrontos */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/30 to-transparent" />
                  <span className="text-[9px] uppercase tracking-[0.3em] text-cyan-500/50 font-bold">
                    {camp.formato === "mata-mata" ? "Chaveamento" : "Confrontos"}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-cyan-500/30 to-transparent" />
                </div>
                <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4">                    {(camp.formato === "mata-mata" || camp.formato === "grupos") ? (
                    <MataMataBracket
                      confrontos={confrontos}
                      participantes={participantes}
                      userId={userId}
                      totalRodadas={totalRodadas}
                    />
                  ) : (
                    <div className="space-y-3">
                      {Array.from({ length: totalRodadas }, (_, i) => i + 1).map((rod) => {
                        const lista = confrontos.filter((c) => c.rodada === rod);
                        return (
                          <div key={rod}>
                            <p className="mb-1 text-[10px] uppercase tracking-widest text-slate-600">Rodada {rod}</p>
                            <ul className="space-y-1">
                              {lista.map((c, idx) => {
                                const envolvido = c.j1_id === userId || c.j2_id === userId;
                                if (c.j1_id && c.j2_id && c.j1_id === c.j2_id) return null;
                                return (
                                  <li key={idx} className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs ${envolvido ? "bg-emerald-500/5 text-white" : "text-slate-400"}`}>
                                    <span>
                                      <span className="font-mono font-bold">{abrevDoParticipante(camp, c.j1_id ?? "")}</span>
                                      <span className="mx-1 text-slate-600">×</span>
                                      <span className="font-mono font-bold">{abrevDoParticipante(camp, c.j2_id ?? "")}</span>
                                      {c.bye && <span className="ml-1 text-slate-600">(bye)</span>}
                                    </span>
                                    <span className="font-mono text-slate-600">
                                      {c.status === "finalizado" && !c.bye ? `${c.pl_j1} - ${c.pl_j2}` : "—"}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STATUS: Finalizado (Pódio) ═══ */}
        {camp.status === "finalizado" && (
          <div className="flex flex-col items-center py-8">
            {/* VENCEDOR: Campeão */}
            {souCamp && (
              <>
                <div className="relative mb-4">
                  <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-2xl animate-pulse" />
                  <div className="relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/30 to-amber-600/15 border-2 border-amber-400/50 shadow-lg shadow-amber-500/20">
                    <Crown className="size-12 text-amber-400" />
                  </div>
                </div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-amber-400/80 font-bold">🏆 CAMPEÃO!</p>
                <h2 className="mt-2 font-display text-3xl font-black text-white">
                  {nomeDoParticipante(camp, camp.vencedor_id ?? "")}
                </h2>
                <p className="mt-3 text-center text-sm text-emerald-300/80">
                  Parabéns! Você venceu o torneio!
                </p>
                <div className="mt-4 flex flex-col items-center gap-1">
                  {(camp.premio_sov ?? 0) > 0 && (
                    <p className="text-xs text-amber-300/80">🏆 +{camp.premio_sov} SOV de prêmio</p>
                  )}
                  <p className="text-xs text-slate-500">+50 SOV por título conquistado</p>
                </div>
                <div className="mt-8 flex gap-3">
                  <button onClick={onBack} className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-6 py-3 text-sm font-black uppercase tracking-wider text-slate-950 transition hover:from-amber-400 hover:to-amber-300 active:scale-[0.97]">
                    Voltar às Salas
                  </button>
                </div>
              </>
            )}

            {/* PERDEDOR: Fim do Torneio */}
            {!souCamp && (
              <>
                <div className="relative mb-4">
                  <div className="absolute inset-0 rounded-full bg-slate-500/10 blur-2xl" />
                  <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-slate-600/20 to-slate-800/10 border border-slate-500/30">
                    <Crown className="size-10 text-slate-500/60" />
                  </div>
                </div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-slate-500/60 font-bold">FIM DO TORNEIO</p>
                <p className="mt-2 text-sm text-slate-400">Você perdeu a final.</p>
                <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 px-6 py-3 text-center">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-amber-400/60 font-bold">🏆 CAMPEÃO</p>
                  <p className="mt-1 font-display text-xl font-black text-amber-300">
                    {nomeDoParticipante(camp, camp.vencedor_id ?? "")}
                  </p>
                </div>
                <div className="mt-8 flex gap-3">
                  <button onClick={onBack} className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-slate-400 transition hover:border-white/20 hover:text-white">
                    Voltar às Salas
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {erro && <p className="mt-4 text-sm text-red-400">{erro}</p>}
        {toastLink && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs break-all text-emerald-300">
            ✓ Link copiado: {toastLink}
          </div>
        )}
      </div>
    </main>
  );
}


export default OnlineChampionship;
