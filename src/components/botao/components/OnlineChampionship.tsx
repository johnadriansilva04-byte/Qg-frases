/**
 * OnlineChampionship — modo Campeonato Online (multi-jogador, round-robin).
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
import { ArrowLeft, Plus, RefreshCw, Users, Crown, Play, Link2, Coins, Bot } from "lucide-react";
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
import { obterSaldoSov } from "@/lib/financial/sovApi";
import { loadProgressFromSupabase, saveProgressToSupabase } from "@/components/botao/storage";
import { useAdManager } from "@/lib/adManager";

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

  /** Regra dos 50 SOV: valida antes de chamar a RPC (mensagem clara); a RPC
   *  continua sendo a autoridade final. */
  const validarSaldoMinimo = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    const saldo = await obterSaldoSov(userId);
    if (saldo !== null && saldo < SOV_MINIMO_CAMPEONATO) {
      setErro(
        `Você precisa de pelo menos ${SOV_MINIMO_CAMPEONATO} SOV para o Campeonato Online (saldo atual: ${saldo} SOV).`,
      );
      return false;
    }
    return true;
  }, [userId]);

  const handleCriar = useCallback(async () => {
    if (!perfil) {
      setErro("Faça login para criar um campeonato.");
      return;
    }
    if (!(await validarSaldoMinimo())) return;
    setCriando(true);
    setErro(null);
    try {
      const camp = await criarCampeonato(nomeSala || "Campeonato Online", maxJogadores, premioSov);
      setCodigo(camp.codigo);
      recarregarAbertos();
    } catch (e: unknown) {
      setErro((e as Error)?.message ?? "Erro ao criar campeonato.");
    } finally {
      setCriando(false);
    }
  }, [perfil, nomeSala, maxJogadores, premioSov, recarregarAbertos, validarSaldoMinimo]);

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
      if (!(await validarSaldoMinimo())) return;
      setErro(null);
      try {
        await entrarCampeonato(alvo);
        setCodigo(alvo);
        setCodigoEntrar("");
      } catch (e: unknown) {
        setErro((e as Error)?.message ?? "Erro ao entrar no campeonato.");
      }
    },
    [perfil, codigoEntrar, validarSaldoMinimo],
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
      // Marcar que o usuário jogou o primeiro jogo (habilita anúncios após)
      markFirstGamePlayed();

      if (!campeonato || !confrontoAtivo || !mesaAtiva) return;
      try {
        const j1 = confrontoAtivo.j1_id;
        const j2 = confrontoAtivo.j2_id;
        const golsJ1 = j1 === mesaAtiva.jogador_1_id ? r.golsJ1 : r.golsJ2;
        const golsJ2 = j2 === mesaAtiva.jogador_1_id ? r.golsJ1 : r.golsJ2;
        await registrarResultadoCampeonato(campeonato.id, mesaAtiva.mesa_id, golsJ1, golsJ2);
        // Recarrega perfil (SOV atualizado pelas RPCs)
        const novoPerfil = await recarregar();
        if (novoPerfil) aplicarPerfil(novoPerfil);
      } catch (e: unknown) {
        setErro((e as Error)?.message ?? "Erro ao registrar resultado do confronto.");
      } finally {
        setMesaAtiva(null);
        setConfrontoAtivo(null);
        queryClient.invalidateQueries({ queryKey: ["campeonato", codigo] });
      }
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

  /** Fim da partida contra BOT: cria a mesa de registro, vincula ao confronto
   *  e registra o placar real jogado. */
  const handleFimConfrontoBot = useCallback(
    async (r: MatchResult) => {
      markFirstGamePlayed();
      if (!campeonato || !confrontoBot || !perfil) return;
      const { confronto, euSouJ1 } = confrontoBot;
      const golsJ1 = euSouJ1 ? r.homeGoals : r.awayGoals;
      const golsJ2 = euSouJ1 ? r.awayGoals : r.homeGoals;
      const meusGols = euSouJ1 ? golsJ1 : golsJ2;
      const golsBot = euSouJ1 ? golsJ2 : golsJ1;
      try {
        // Contra bot: registra direto no confronto (sem mesa realtime — bot não
        // é usuário real e quebraria a FK).
        await registrarResultadoVsBot(campeonato.id, confronto.rodada, meusGols, golsBot);
        const novoPerfil = await recarregar();
        if (novoPerfil) aplicarPerfil(novoPerfil);
      } catch (e: unknown) {
        setErro((e as Error)?.message ?? "Erro ao registrar o confronto.");
      } finally {
        setConfrontoBot(null);
        queryClient.invalidateQueries({ queryKey: ["campeonato", codigo] });
      }
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

  // ============ Lista de salas abertas ============
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <button onClick={onBack} className="btn-ghost">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h2 className="font-display text-2xl">Campeonato Online</h2>
      </div>

      <section className="surface mb-6 space-y-4 p-5">
        <h3 className="text-lg font-display">Criar sala</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Nome da sala</label>
            <input
              className="input w-full"
              value={nomeSala}
              onChange={(e) => setNomeSala(e.target.value)}
              placeholder="Campeonato Online"
              maxLength={40}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Máximo de jogadores</label>
            <select
              className="input w-full"
              value={maxJogadores}
              onChange={(e) => setMaxJogadores(Number(e.target.value))}
            >
              {[2, 4, 6, 8, 12, 16, 20, 24, 32].map((n) => (
                <option key={n} value={n}>
                  {n} jogadores
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              <Coins className="mr-1 inline size-4" /> Prêmio do campeão (SOV, opcional)
            </label>
            <input
              className="input w-full"
              type="number"
              min={0}
              max={10000}
              value={premioSov}
              onChange={(e) => setPremioSov(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Para criar ou entrar no Campeonato Online é preciso ter pelo menos{" "}
            {SOV_MINIMO_CAMPEONATO} SOV.
          </p>
          <button onClick={handleCriar} disabled={criando || !perfil} className="btn-primary">
            <Plus className="mr-1 h-4 w-4" /> {criando ? "Criando..." : "Abrir sala"}
          </button>
          {!perfil && <p className="text-sm text-red-500">Faça login para criar um campeonato.</p>}
        </div>
      </section>

      <section className="surface mb-6 space-y-4 p-5">
        <h3 className="text-lg font-display">Entrar por código</h3>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            value={codigoEntrar}
            onChange={(e) => setCodigoEntrar(e.target.value)}
            placeholder="CAMP-..."
          />
          <button onClick={() => void handleEntrar()} disabled={!perfil} className="btn-primary">
            <Users className="mr-1 h-4 w-4" /> Entrar
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-display">Salas abertas</h3>
          <button className="btn-ghost text-sm" onClick={() => recarregarAbertos()}>
            <RefreshCw className="mr-1 h-4 w-4" /> Atualizar
          </button>
        </div>
        {abertos.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma sala aberta. Crie a primeira!</p>
        )}
        {abertos.map((c) => {
          const numPart = Array.isArray(c.participantes) ? c.participantes.length : 0;
          return (
            <article key={c.id} className="surface flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-lg leading-tight">{c.nome}</h4>
                <p className="text-xs text-muted-foreground">
                  Código <span className="font-mono">{c.codigo}</span> · {numPart}/{c.max_jogadores}{" "}
                  jogadores
                  {(c.premio_sov ?? 0) > 0 && (
                    <span className="text-amber-300"> · prêmio {c.premio_sov} SOV</span>
                  )}
                </p>
              </div>
              <button onClick={() => void handleEntrar(c.codigo)} disabled={!perfil} className="btn-primary">
                <Users className="mr-1 h-4 w-4" /> Entrar
              </button>
            </article>
          );
        })}
        {erro && <p className="text-sm text-red-500">{erro}</p>}
      </section>
    </main>
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

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="btn-ghost">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-display text-2xl">{camp.nome}</h2>
            <p className="text-xs text-muted-foreground">
              Código <span className="font-mono">{camp.codigo}</span> ·{" "}
              {camp.status === "aguardando"
                ? `Aguardando (${participantes.length}/${camp.max_jogadores})`
                : camp.status === "em_andamento"
                  ? `Rodada ${camp.rodada_atual} de ${totalRodadas}`
                  : camp.status === "finalizado"
                    ? "Finalizado"
                    : "Cancelado"}
              {(camp.premio_sov ?? 0) > 0 && (
                <span className="text-amber-300"> · prêmio {camp.premio_sov} SOV</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {camp.status === "aguardando" && (
        <>
          <section className="surface mb-4 space-y-4 p-5">
            <div>
              <p className="mb-2 text-sm text-muted-foreground">
                Compartilhe o link direto: quem entra cai direto nesta sala. Mínimo de 2 para
                iniciar.
              </p>
              <ul className="space-y-1 text-sm" data-testid="lista-participantes">
                {participantes.map((p) => (
                  <li key={p.user_id} className="flex items-center gap-2">
                    {p.bot ? (
                      <Bot className="h-4 w-4 text-sky-400" />
                    ) : (
                      <Users className="h-4 w-4 text-muted-foreground" />
                    )}{" "}
                    {p.nome} · <span className="font-mono">{p.abreviacao ?? "MTI"}</span>
                    {p.user_id === camp.criador_id && <Crown className="h-3.5 w-3.5 text-amber-300" />}
                  </li>
                ))}
                {Array.from({ length: Math.max(0, vagas) }).map((_, i) => (
                  <li key={`vaga-${i}`} className="flex items-center gap-2 text-slate-600">
                    <Users className="h-4 w-4" /> vaga aberta
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={onCopiarLink} className="btn-ghost" data-testid="copiar-link-camp">
                <Link2 className="mr-1 h-4 w-4" /> Copiar link da sala
              </button>
              {isCriador && vagas > 0 && (
                <button
                  onClick={onPreencherBots}
                  disabled={preenchendoBots}
                  className="btn-primary"
                  data-testid="preencher-bots"
                >
                  <Bot className="mr-1 h-4 w-4" />{" "}
                  {preenchendoBots ? "Preenchendo..." : `Preencher com Bots (${vagas} vagas)`}
                </button>
              )}
              {isCriador && (
                <button
                  onClick={onIniciar}
                  disabled={iniciando || participantes.length < 2}
                  className="btn-primary"
                  data-testid="iniciar-campeonato"
                >
                  <Play className="mr-1 h-4 w-4" /> {iniciando ? "Iniciando..." : "Iniciar campeonato"}
                </button>
              )}
            </div>
            {!isCriador && (
              <p className="text-xs text-muted-foreground">Aguarde o criador iniciar o campeonato.</p>
            )}
          </section>

          {/* Painel do administrador da sala (dono): visão completa. */}
          {isCriador && (
            <section className="surface mb-4 p-5" data-testid="admin-campeonato-panel">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Administração da sala
              </p>
              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                <div className="rounded-lg bg-slate-900/60 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Vagas</p>
                  <p className="font-display text-xl text-white">
                    {participantes.length}/{camp.max_jogadores}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/60 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Humanos</p>
                  <p className="font-display text-xl text-emerald-300">
                    {participantes.filter((p) => !p.bot).length}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/60 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Bots</p>
                  <p className="font-display text-xl text-sky-300">
                    {participantes.filter((p) => p.bot).length}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900/60 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Prêmio</p>
                  <p className="font-display text-xl text-amber-300">{camp.premio_sov ?? 0} SOV</p>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {camp.status === "em_andamento" && (
        <>
          <section className="surface mb-6 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg">Sua próxima partida</p>
                {meuConfrontoPendente ? (
                  <p className="text-sm text-muted-foreground">
                    Rodada {meuConfrontoPendente.rodada} ·{" "}
                    {abrevDoParticipante(camp, meuConfrontoPendente.j1_id!)} x{" "}
                    {abrevDoParticipante(camp, meuConfrontoPendente.j2_id!)}
                    {participanteDo(
                      camp,
                      meuConfrontoPendente.j1_id === userId
                        ? meuConfrontoPendente.j2_id
                        : meuConfrontoPendente.j1_id,
                    )?.bot && <span className="text-sky-300"> (bot — joga na hora)</span>}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sem confronto pendente nesta rodada (bye ou já jogou). Aguarde a próxima rodada.
                  </p>
                )}
              </div>
              {meuConfrontoPendente && (
                <button onClick={onJogar} className="btn-primary" data-testid="jogar-confronto">
                  <Play className="mr-1 h-4 w-4" /> Jogar
                </button>
              )}
            </div>
          </section>

          <section className="surface mb-6 p-5">
            <h3 className="mb-3 font-display text-lg">Classificação</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] tracking-wider text-muted-foreground uppercase">
                  <th className="text-left font-normal">#</th>
                  <th className="text-left font-normal">Jogador</th>
                  <th className="w-8 font-normal">Pts</th>
                  <th className="w-8 font-normal">J</th>
                  <th className="w-10 font-normal">SG</th>
                </tr>
              </thead>
              <tbody>
                {classificacao.map((r, i) => (
                  <tr key={r.user_id} className={r.user_id === userId ? "text-accent-foreground" : ""}>
                    <td className="py-1">{i + 1}</td>
                    <td className="py-1">
                      <span className="font-mono">{r.abreviacao ?? "MTI"}</span>{" "}
                      <span className="text-muted-foreground">
                        {r.nome}
                        {r.bot && <Bot className="ml-1 inline size-3 text-sky-400" />}
                      </span>
                    </td>
                    <td className="text-center">{r.pontos ?? 0}</td>
                    <td className="text-center">
                      {
                        confrontos.filter(
                          (c) =>
                            c.status === "finalizado" &&
                            !c.bye &&
                            (c.j1_id === r.user_id || c.j2_id === r.user_id),
                        ).length
                      }
                    </td>
                    <td className="text-center">{(r.gols_pro ?? 0) - (r.gols_contra ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="surface p-5">
            <h3 className="mb-3 font-display text-lg">Confrontos</h3>
            <div className="space-y-3">
              {Array.from({ length: totalRodadas }, (_, i) => i + 1).map((rod) => {
                const lista = confrontos.filter((c) => c.rodada === rod);
                return (
                  <div key={rod}>
                    <p className="mb-1 text-xs tracking-wider text-muted-foreground uppercase">
                      Rodada {rod}
                    </p>
                    <ul className="space-y-1 text-sm">
                      {lista.map((c, idx) => {
                        const envolvido = c.j1_id === userId || c.j2_id === userId;
                        if (c.j1_id && c.j2_id && c.j1_id === c.j2_id) return null;
                        return (
                          <li
                            key={idx}
                            className={`flex items-center justify-between gap-2 ${envolvido ? "text-accent-foreground" : ""}`}
                          >
                            <span>
                              {abrevDoParticipante(camp, c.j1_id ?? "")} x{" "}
                              {abrevDoParticipante(camp, c.j2_id ?? "")}
                              {c.bye && <span className="text-muted-foreground"> (bye)</span>}
                            </span>
                            <span className="font-mono text-muted-foreground">
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
          </section>
        </>
      )}

      {camp.status === "finalizado" && (
        <section className="surface p-8 text-center">
          <Crown className="mx-auto mb-3 h-10 w-10 text-yellow-500" />
          <p className="font-display text-2xl">
            Campeão: {nomeDoParticipante(camp, camp.vencedor_id ?? "")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {souCamp
              ? `Parabéns, você levou o título! +50 SOV${(camp.premio_sov ?? 0) > 0 ? ` e prêmio de ${camp.premio_sov} SOV` : ""}.`
              : "Parabéns ao campeão!"}
          </p>
          <button onClick={onBack} className="btn-ghost mt-4">
            Voltar às salas
          </button>
        </section>
      )}

      {erro && <p className="mt-4 text-sm text-red-500">{erro}</p>}
      {toastLink && (
        <p className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs break-all">
          Link copiado: {toastLink}
        </p>
      )}
    </main>
  );
}

export default OnlineChampionship;
