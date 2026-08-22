/**
 * OnlineChampionship — modo Campeonato Online (multi-jogador, round-robin).
 *
 * Fluxo:
 *  1. Sala (lobby): criar / entrar por código / iniciar (criador).
 *  2. Em andamento: cada rodada lista os confrontos do usuário; ao jogar um
 *     confronto, cria/vincula uma mesa (mesas_futebol) e abre o MesaOnlineMatch.
 *  3. Ao finalizar a mesa, o resultado é enviado à RPC registrar_resultado_campeonato,
 *     que computa pontos (3/1/0), gols e soberania, e avança/finaliza o campeonato.
 *  4. Tabela de classificação e confrontos atualizam em tempo real (Postgres Changes).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, RefreshCw, Users, Crown, Play } from "lucide-react";
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
  avancarFaseCampeonato,
  type CampeonatoOnline,
  type ConfrontoCampeonato,
  type ParticipanteCampeonato,
} from "@/lib/multiplayer/campeonato.api";
import { abrirMesaCampeonato, buscarMesa, type MesaFutebol } from "@/lib/multiplayer/mesa.api";
import { MesaOnlineMatch, type ResultadoMesa } from "./MesaOnlineMatch";
import { useAdManager } from "@/lib/adManager";

type Screen = "lobby-list" | "sala" | "jogo";

const STORAGE = {
  CODIGO: "botao_campeonato_codigo",
};

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
  return p?.nome ?? "Jogador";
}

function abrevDoParticipante(camp: CampeonatoOnline, uid: string): string {
  const p = (camp.participantes as ParticipanteCampeonato[]).find((x) => x.user_id === uid);
  return p?.abreviacao ?? "ADV";
}

export function OnlineChampionship({
  onBack,
  onEstadoPartida,
}: {
  onBack?: () => void;
  onEstadoPartida?: (emPartida: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { perfil, recarregar, aplicarPerfil } = useBotaoAuth();
  const { data: jogador } = useJogador();
  const { markFirstGamePlayed } = useAdManager("/botao");
  const userId = jogador?.user_id ?? perfil?.user_id ?? "";

  const [codigo, setCodigo] = useState<string | null>(null);
  const [codigoEntrar, setCodigoEntrar] = useState("");
  const [nomeSala, setNomeSala] = useState("Campeonato Online");
  const [maxJogadores, setMaxJogadores] = useState(4);
  const [formato, setFormato] = useState<"liga" | "grupos">("liga");
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [mesaAtiva, setMesaAtiva] = useState<MesaFutebol | null>(null);
  const [confrontoAtivo, setConfrontoAtivo] = useState<ConfrontoCampeonato | null>(null);

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
    refetchInterval: mesaAtiva ? false : 5000,
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
    if (onEstadoPartida) onEstadoPartida(!!mesaAtiva);
  }, [mesaAtiva, onEstadoPartida]);

  // Limpa mesa ativa se o campeonato mudar de status finalizado
  useEffect(() => {
    if (campeonato?.status === "finalizado" && !mesaAtiva) {
      // nada a fazer aqui; a tela de sala mostra o campeão
    }
  }, [campeonato?.status, mesaAtiva]);

  const handleCriar = useCallback(async () => {
    if (!perfil) {
      setErro("Faça login para criar um campeonato.");
      return;
    }
    setCriando(true);
    setErro(null);
    try {
      const camp = await criarCampeonato(nomeSala || "Campeonato Online", maxJogadores);
      // Define o formato (a RPC criar usa defaults; formato é aditivo).
      if (formato !== "liga") {
        await supabase
          .from("botao_campeonatos_online")
          .update({ formato })
          .eq("id", camp.id);
      }
      setCodigo(camp.codigo);
      recarregarAbertos();
    } catch (e: unknown) {
      setErro((e as Error)?.message ?? "Erro ao criar campeonato.");
    } finally {
      setCriando(false);
    }
  }, [perfil, nomeSala, maxJogadores, formato, recarregarAbertos]);

  const handleEntrar = useCallback(async () => {
    if (!perfil) {
      setErro("Faça login para entrar em um campeonato.");
      return;
    }
    if (!codigoEntrar.trim()) {
      setErro("Informe o código da sala.");
      return;
    }
    setErro(null);
    try {
      await entrarCampeonato(codigoEntrar.trim());
      setCodigo(codigoEntrar.trim());
      setCodigoEntrar("");
    } catch (e: unknown) {
      setErro((e as Error)?.message ?? "Erro ao entrar no campeonato.");
    }
  }, [perfil, codigoEntrar]);

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

  const handleSairSala = useCallback(() => {
    setCodigo(null);
    setConfrontoAtivo(null);
    setMesaAtiva(null);
    recarregarAbertos();
  }, [recarregarAbertos]);

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
    try {
      // Idempotente: cria UMA mesa compartilhada para o confronto (ou devolve
      // a já existente). Ambos os jogadores chamam a mesma RPC e caem na mesma
      // mesa, com jogador_1=j1_id e jogador_2=j2_id definidos pelo confronto.
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
  }, [campeonato, perfil, meuConfrontoPendente]);

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
        // Formato grupos: tenta avançar de fase (idempotente — no-op se a fase
        // não estiver completa). Roda após cada resultado.
        if (campeonato.formato === "grupos") {
          await avancarFaseCampeonato(campeonato.id).catch(() => {});
        }
        // Recarrega perfil (soberania atualizada pelas RPCs)
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
    [campeonato, confrontoAtivo, mesaAtiva, recarregar, aplicarPerfil, queryClient, codigo, markFirstGamePlayed],
  );

  // ============ Tela de jogo (mesa ativa) ============
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
              {(formato === "grupos" ? [8, 16, 32] : [2, 3, 4, 5, 6, 7, 8, 16, 32]).map((n) => (
                <option key={n} value={n}>
                  {n} jogadores
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Formato</label>
            <select
              className="input w-full"
              value={formato}
              onChange={(e) => setFormato(e.target.value as "liga" | "grupos")}
            >
              <option value="liga">Liga (pontos corridos)</option>
              <option value="grupos">Grupos + Mata-mata</option>
            </select>
          </div>
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
          <button onClick={handleEntrar} disabled={!perfil} className="btn-primary">
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
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!perfil) {
                    setErro("Faça login para entrar.");
                    return;
                  }
                  try {
                    await entrarCampeonato(c.codigo);
                    setCodigo(c.codigo);
                  } catch (e: unknown) {
                    setErro((e as Error)?.message ?? "Erro ao entrar.");
                  }
                }}
                disabled={!perfil}
                className="btn-primary"
              >
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
}) {
  const souCamp = camp.vencedor_id === userId;
  const confrontos = useMemo(
    () => (camp.confrontos as ConfrontoCampeonato[]) ?? [],
    [camp.confrontos],
  );
  const totalRodadas = useMemo(
    () => confrontos.reduce((m, c) => Math.max(m, c.rodada), 0),
    [confrontos],
  );
  const participantes = useMemo(
    () => (camp.participantes as ParticipanteCampeonato[]) ?? [],
    [camp.participantes],
  );

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
            </p>
          </div>
        </div>
      </div>

      {camp.status === "aguardando" && (
        <section className="surface mb-6 space-y-4 p-5">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              Compartilhe o código para outros jogadores entrarem. Mínimo de 2 para iniciar.
            </p>
            <ul className="space-y-1 text-sm">
              {participantes.map((p) => (
                <li key={p.user_id} className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" /> {p.nome} ·{" "}
                  <span className="font-mono">{p.abreviacao ?? "MTI"}</span>
                </li>
              ))}
            </ul>
          </div>
          {isCriador && (
            <button
              onClick={onIniciar}
              disabled={iniciando || participantes.length < 2}
              className="btn-primary"
            >
              <Play className="mr-1 h-4 w-4" /> {iniciando ? "Iniciando..." : "Iniciar campeonato"}
            </button>
          )}
          {!isCriador && (
            <p className="text-xs text-muted-foreground">Aguarde o criador iniciar o campeonato.</p>
          )}
        </section>
      )}

      {camp.status === "em_andamento" && (
        <>
          {/* Painel do evento ao vivo: fase, mesa, próxima partida com nomes. */}
          <PainelAoVivo camp={camp} userId={userId} meuConfronto={meuConfrontoPendente} onJogar={onJogar} />

          <section className="surface mb-6 p-5">
            <h3 className="mb-3 font-display text-lg">
              {camp.formato === "grupos" ? "Classificação por grupo" : "Classificação"}
            </h3>
            <ClassificacaoCampeonato camp={camp} userId={userId} />
          </section>

          <section className="surface p-5">
            <h3 className="mb-3 font-display text-lg">Confrontos</h3>
            <ConfrontosCampeonato camp={camp} userId={userId} totalRodadas={totalRodadas} />
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
              ? "Parabéns, você levou o título! +50 pontos de soberania."
              : "Parabéns ao campeão!"}
          </p>
          <button onClick={onBack} className="btn-ghost mt-4">
            Voltar às salas
          </button>
        </section>
      )}

      {erro && <p className="mt-4 text-sm text-red-500">{erro}</p>}
    </main>
  );
}

/** Rótulo legível da fase (grupos/mata-mata). */
function rotuloFase(fase: ConfrontoCampeonato["fase"] | null | undefined): string {
  switch (fase) {
    case "grupos":
      return "Fase de Grupos";
    case "oitavas":
      return "Oitavas de Final";
    case "quartas":
      return "Quartas de Final";
    case "semifinal":
      return "Semifinal";
    case "final":
      return "Final";
    default:
      return "Liga";
  }
}

/** Fase atual do campeonato (a mais avançada com confrontos). */
function faseAtual(camp: CampeonatoOnline): ConfrontoCampeonato["fase"] | null {
  const ordem: Array<NonNullable<ConfrontoCampeonato["fase"]>> = [
    "grupos",
    "oitavas",
    "quartas",
    "semifinal",
    "final",
  ];
  let atual: ConfrontoCampeonato["fase"] | null = null;
  for (const f of ordem) {
    if ((camp.confrontos as ConfrontoCampeonato[]).some((c) => c.fase === f)) atual = f;
  }
  return atual;
}

/**
 * Painel do evento ao vivo — mostra fase, mesa e a próxima partida do jogador
 * com NOMES reais (nunca ID técnico). O jogador pode estar jogando, esperando
 * ou acompanhando (arquibancada) — a competição segue pelo calendário.
 */
function PainelAoVivo({
  camp,
  userId,
  meuConfronto,
  onJogar,
}: {
  camp: CampeonatoOnline;
  userId: string;
  meuConfronto: ConfrontoCampeonato | null;
  onJogar: () => void;
}) {
  const fase = faseAtual(camp);
  const emAndamento = (camp.confrontos as ConfrontoCampeonato[]).filter(
    (c) => c.status === "pendente" && c.mesa_id,
  ).length;
  const nomeAdv = meuConfronto
    ? nomeDoParticipante(
        camp,
        meuConfronto.j1_id === userId ? meuConfronto.j2_id! : meuConfronto.j1_id!,
      )
    : null;

  return (
    <section className="surface mb-6 p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
          🏆 Campeonato ao Vivo · {rotuloFase(fase)}
        </p>
        <p className="text-xs text-muted-foreground">
          {(camp.participantes as ParticipanteCampeonato[]).length} participantes
          {emAndamento > 0 ? ` · ${emAndamento} em andamento` : ""}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          {meuConfronto ? (
            <>
              <p className="text-sm text-muted-foreground">
                {rotuloFase(meuConfronto.fase)} · Rodada {meuConfronto.rodada}
                {meuConfronto.mesa ? ` · Mesa ${meuConfronto.mesa}` : ""}
              </p>
              <p className="mt-1 truncate font-display text-xl">
                {nomeDoParticipante(camp, userId)}{" "}
                <span className="text-muted-foreground">vs</span> {nomeAdv}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {camp.formato === "grupos" && fase === "grupos"
                ? "Você já jogou sua partida nesta rodada (ou está de bye). Acompanhe os resultados abaixo."
                : "Sem confronto pendente agora. Acompanhe a classificação — você permanece no evento."}
            </p>
          )}
        </div>
        {meuConfronto && (
          <button onClick={onJogar} className="btn-primary shrink-0">
            <Play className="mr-1 h-4 w-4" /> Jogar
          </button>
        )}
      </div>
    </section>
  );
}

/** Classificação — global (liga) ou por grupo (formato grupos, fase de grupos). */
function ClassificacaoCampeonato({ camp, userId }: { camp: CampeonatoOnline; userId: string }) {
  const participantes = (camp.participantes as ParticipanteCampeonato[]) ?? [];
  const confrontos = (camp.confrontos as ConfrontoCampeonato[]) ?? [];
  const fase = faseAtual(camp);

  // Pontos por participante derivados dos confrontos finalizados (escopo opcional por grupo).
  const stats = (uid: string, grupo: string | null) => {
    let pontos = 0;
    let j = 0;
    let gp = 0;
    let gc = 0;
    for (const c of confrontos) {
      if (c.status !== "finalizado") continue;
      if (grupo !== null && c.grupo !== grupo) continue;
      if (c.j1_id === uid) {
        j++;
        gp += c.pl_j1 ?? 0;
        gc += c.pl_j2 ?? 0;
        pontos += (c.pl_j1 ?? 0) > (c.pl_j2 ?? 0) ? 3 : c.pl_j1 === c.pl_j2 ? 1 : 0;
      } else if (c.j2_id === uid) {
        j++;
        gp += c.pl_j2 ?? 0;
        gc += c.pl_j1 ?? 0;
        pontos += (c.pl_j2 ?? 0) > (c.pl_j1 ?? 0) ? 3 : c.pl_j2 === c.pl_j1 ? 1 : 0;
      }
    }
    return { pontos, j, sg: gp - gc };
  };

  const tabela = (uids: string[], grupo: string | null) =>
    uids
      .map((uid) => ({ uid, ...stats(uid, grupo) }))
      .sort((a, b) => b.pontos - a.pontos || b.sg - a.sg);

  const linha = (r: { uid: string; pontos: number; j: number; sg: number }, i: number) => {
    const p = participantes.find((x) => x.user_id === r.uid);
    return (
      <tr key={r.uid} className={r.uid === userId ? "text-accent-foreground" : ""}>
        <td className="py-1">{i + 1}</td>
        <td className="py-1">
          <span className="font-mono">{p?.abreviacao ?? "MTI"}</span>{" "}
          <span className="text-muted-foreground">{p?.nome ?? "Jogador"}</span>
        </td>
        <td className="text-center">{r.pontos}</td>
        <td className="text-center">{r.j}</td>
        <td className="text-center">{r.sg}</td>
      </tr>
    );
  };

  const header = (
    <thead>
      <tr className="text-[11px] tracking-wider text-muted-foreground uppercase">
        <th className="text-left font-normal">#</th>
        <th className="text-left font-normal">Jogador</th>
        <th className="w-8 font-normal">Pts</th>
        <th className="w-8 font-normal">J</th>
        <th className="w-10 font-normal">SG</th>
      </tr>
    </thead>
  );

  // Fase de grupos: uma tabela por grupo.
  if (camp.formato === "grupos" && fase === "grupos") {
    const grupos = Array.from(
      new Set(confrontos.filter((c) => c.grupo).map((c) => c.grupo!)),
    ).sort();
    return (
      <div className="space-y-4">
        {grupos.map((g) => {
          const uids = new Set<string>();
          confrontos.forEach((c) => {
            if (c.grupo === g) {
              if (c.j1_id) uids.add(c.j1_id);
              if (c.j2_id) uids.add(c.j2_id);
            }
          });
          return (
            <div key={g}>
              <p className="mb-1 text-xs tracking-wider text-muted-foreground uppercase">
                Grupo {g} · Mesa {g}
              </p>
              <table className="w-full text-sm">
                {header}
                <tbody>{tabela(Array.from(uids), g).map(linha)}</tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  }

  // Liga ou mata-mata: tabela global.
  return (
    <table className="w-full text-sm">
      {header}
      <tbody>{tabela(participantes.map((p) => p.user_id), null).map(linha)}</tbody>
    </table>
  );
}

/** Lista de confrontos agrupados por fase/rodada (com mesa e nomes). */
function ConfrontosCampeonato({
  camp,
  userId,
  totalRodadas,
}: {
  camp: CampeonatoOnline;
  userId: string;
  totalRodadas: number;
}) {
  const confrontos = (camp.confrontos as ConfrontoCampeonato[]) ?? [];
  const ehGrupos = camp.formato === "grupos";

  const linha = (c: ConfrontoCampeonato, idx: number) => {
    const envolvido = c.j1_id === userId || c.j2_id === userId;
    if (c.j1_id && c.j2_id && c.j1_id === c.j2_id) return null;
    return (
      <li
        key={idx}
        className={`flex items-center justify-between gap-2 ${envolvido ? "text-accent-foreground" : ""}`}
      >
        <span className="min-w-0 truncate">
          {ehGrupos && c.grupo ? <span className="text-muted-foreground">[{c.grupo}] </span> : null}
          {nomeDoParticipante(camp, c.j1_id ?? "")} x {nomeDoParticipante(camp, c.j2_id ?? "")}
          {c.bye && <span className="text-muted-foreground"> (bye)</span>}
        </span>
        <span className="font-mono text-muted-foreground">
          {c.status === "finalizado" ? `${c.pl_j1 ?? 0} - ${c.pl_j2 ?? 0}` : "—"}
        </span>
      </li>
    );
  };

  if (ehGrupos) {
    // Agrupa por fase, depois por rodada dentro da fase.
    const fases: Array<NonNullable<ConfrontoCampeonato["fase"]>> = [
      "grupos",
      "oitavas",
      "quartas",
      "semifinal",
      "final",
    ];
    return (
      <div className="space-y-4">
        {fases.map((f) => {
          const daFase = confrontos.filter((c) => c.fase === f);
          if (daFase.length === 0) return null;
          const rodadas = Array.from(new Set(daFase.map((c) => c.rodada))).sort((a, b) => a - b);
          return (
            <div key={f}>
              <p className="mb-1 font-display text-sm">{rotuloFase(f)}</p>
              {rodadas.map((rod) => (
                <div key={rod} className="mb-2">
                  <p className="mb-1 text-xs tracking-wider text-muted-foreground uppercase">
                    Rodada {rod}
                  </p>
                  <ul className="space-y-1 text-sm">
                    {daFase.filter((c) => c.rodada === rod).map(linha)}
                  </ul>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  // Liga: por rodada.
  return (
    <div className="space-y-3">
      {Array.from({ length: totalRodadas }, (_, i) => i + 1).map((rod) => {
        const lista = confrontos.filter((c) => c.rodada === rod);
        return (
          <div key={rod}>
            <p className="mb-1 text-xs tracking-wider text-muted-foreground uppercase">
              Rodada {rod}
            </p>
            <ul className="space-y-1 text-sm">{lista.map(linha)}</ul>
          </div>
        );
      })}
    </div>
  );
}

export default OnlineChampionship;
