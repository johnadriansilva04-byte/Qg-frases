/**
 * MesaOnlineMatch — wrapper de partida online reutilizável.
 *
 * Renderiza o MatchView conectado ao MesaRealtime ( Presence + Broadcast +
 * Postgres Changes ) e cuida de placar, turno, cronômetro, início e fim.
 *
 * Reutilizado tanto pelo Amistoso Online (OnlineMatchV3) quanto pelo
 * Campeonato Online (OnlineChampionship): o callback `onFinalizada` entrega
 * o vencedor (ou null para empate) e os gols de cada lado, permitindo que
 * cada modo decida o que fazer com o resultado (soberania, ranking, etc.).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { MatchView } from "@/components/botao/components/MatchView";
import { ChatOverlay, type ChatMsg } from "@/components/botao/components/ChatOverlay";
import { supabase } from "@/integrations/supabase/client";
import { createCustomTeam, cachedTeamsSync, TEAMS } from "@/components/botao/data/teams";
import type { MatchResult } from "@/components/botao/types";
import { MesaRealtime, type JogadaPayload } from "@/lib/multiplayer/MesaRealtime";
import type { MesaFutebol } from "@/lib/multiplayer/mesa.api";
import {
  aplicarResultadoRemoto,
  inserirManchetesRemotas,
} from "@/components/botao/career/careerRemote";
import { buscarPerfil, type Perfil } from "@/components/botao/online/auth";

export type ResultadoMesa = {
  vencedorId: string | null;
  golsJ1: number;
  golsJ2: number;
  empate: boolean;
};

type Props = {
  mesa: MesaFutebol;
  perfil: Perfil;
  userId: string;
  /** Time do usuário logado (id, nome, abreviacao, cores). */
  meuTime: {
    id: string;
    nome: string;
    abreviacao: string;
    cores: string[];
    botoesNomes?: string[] | undefined;
  };
  /** Chamado quando a partida termina (status=finalizado) ou ao sair. */
  onSair: () => void;
  /** Resultado final da partida (vencedor + gols). */
  onFinalizada?: (r: ResultadoMesa) => void;
  /** Rótulo exibido no MatchView (ex.: "Amistoso Online" / "Campeonato · Rodada 2"). */
  stageLabel?: string;
};

/** Total de jogadas da partida (28 = 14 por jogador). */
const TOTAL_JOGADAS = 28;
/** Vitórias necessárias para vencer a série (melhor de 3 = primeiro a 2). */
const VITORIAS_SERIE = 2;

export function MesaOnlineMatch({
  mesa,
  perfil,
  userId,
  meuTime,
  onSair,
  onFinalizada,
  stageLabel = "Partida Online",
}: Props) {
  const souJogador1 = mesa.jogador_1_id === userId;

  const [currentTurn, setCurrentTurn] = useState<"home" | "away">(souJogador1 ? "home" : "away");
  const [placar, setPlacar] = useState<[number, number]>([mesa.placar_j1, mesa.placar_j2]);
  const [seqJogada, setSeqJogada] = useState(mesa.seq_jogada || 0);
  const turnsLeft = Math.max(0, TOTAL_JOGADAS - seqJogada);
  const [tempoRestante, setTempoRestante] = useState(mesa.tempo_restante_segundos || 300);
  const [oponenteOnline, setOponenteOnline] = useState(false);
  const [doisJogadoresConectados, setDoisJogadoresConectados] = useState(
    mesa.status === "em_andamento" || mesa.jogador_2_id !== null,
  );
  const [partidaIniciada, setPartidaIniciada] = useState(mesa.status === "em_andamento");
  const [finalizado, setFinalizado] = useState(mesa.status === "finalizado");
  // Série melhor de 3 (rastreada localmente, derivada do fim autoritativo de cada jogo)
  const [serieJ1, setSerieJ1] = useState(0);
  const [serieJ2, setSerieJ2] = useState(0);
  const [jogoAtual, setJogoAtual] = useState(1);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);

  const mesaRef = useRef<MesaRealtime | null>(null);
  const jogadaAdversariaHandlerRef = useRef<((jogada: JogadaPayload) => void) | null>(null);
  const fimDeTurnoHandlerRef = useRef<
    | ((payload: {
        discos: { id: string; x: number; y: number }[];
        bola: { x: number; y: number };
        jogadorId: string;
        novoTurnoId?: string;
      }) => void)
    | null
  >(null);
  const golAdversarioHandlerRef = useRef<(() => void) | null>(null);
  const onFinalizadaRef = useRef(onFinalizada);
  onFinalizadaRef.current = onFinalizada;

  const userSide = souJogador1 ? "home" : "away";
  const dispareiRef = useRef(false);

  const userTeam = useMemo(() => {
    if (!meuTime) return createCustomTeam("custom", "Meu Time", "MTI", "#FF0000", "#00FF00", 75);
    return createCustomTeam(
      meuTime.id,
      meuTime.nome,
      meuTime.abreviacao,
      meuTime.cores[0] ?? "#FF0000",
      meuTime.cores[1] ?? "#00FF00",
      75,
      meuTime.botoesNomes,
    );
  }, [meuTime]);

  // Time do oponente sincronizado via Supabase (busca o perfil do adversário).
  const [perfilOponente, setPerfilOponente] = useState<Perfil | null>(null);
  useEffect(() => {
    const opId = souJogador1 ? mesa.jogador_2_id : mesa.jogador_1_id;
    if (!opId) {
      setPerfilOponente(null);
      return;
    }
    let vivo = true;
    buscarPerfil(opId).then((p) => {
      if (vivo) setPerfilOponente(p);
    });
    return () => {
      vivo = false;
    };
  }, [souJogador1, mesa.jogador_1_id, mesa.jogador_2_id]);

  const opponentTeam = useMemo(() => {
    const opTimeId = souJogador1 ? mesa.time_j2 : mesa.time_j1;
    const opUid = souJogador1 ? mesa.jogador_2_id : mesa.jogador_1_id;
    // Guarda contra mesa inconsistente: se o "oponente" é o próprio usuário
    // (ambos slots apontam para o mesmo jogador), exibe um time neutro em vez de
    // duplicar o time do usuário (bug "FB vs FB" no placar).
    if (!opUid || opUid === userId) {
      return createCustomTeam("opponent", "Aguardando...", "---", "#666666", "#999999", 75);
    }
    // Prioriza o perfil real do oponente (nome/cores sincronizados do Supabase).
    if (perfilOponente && perfilOponente.user_id !== userId) {
      return createCustomTeam(
        opTimeId || `custom-${perfilOponente.user_id}`,
        perfilOponente.time_personalizado || "Adversário",
        perfilOponente.abreviacao_time || "ADV",
        perfilOponente.cores?.[0] ?? "#0000FF",
        perfilOponente.cores?.[1] ?? "#FFFF00",
        75,
      );
    }
    if (!opTimeId)
      return createCustomTeam("opponent", "Aguardando...", "---", "#666666", "#999999", 75);
    if (opTimeId === userTeam.id)
      return createCustomTeam("opponent", "Adversário", "ADV", "#FF0000", "#FFFFFF", 75);
    if (opTimeId.startsWith("custom-"))
      return createCustomTeam(opTimeId, "Adversário", "ADV", "#FF0000", "#FFFFFF", 75);
    // timeByIdSync sempre retorna algo (fallback TEAMS[0]); só usá-lo se o id
    // realmente existir no cache do banco, senão mostra "ADV" em vez de um
    // time real que poderia coincidir com a sigla do usuário.
    const teamFromDb = cachedTeamsSync().find((t) => t.id === opTimeId);
    if (teamFromDb) return teamFromDb;
    const teamLocal = TEAMS.find((t) => t.id === opTimeId);
    if (teamLocal) return teamLocal;
    return createCustomTeam(opTimeId, "Adversário", "ADV", "#0000FF", "#FFFF00", 75);
  }, [mesa.time_j1, mesa.time_j2, mesa.jogador_1_id, mesa.jogador_2_id, souJogador1, perfilOponente, userId, userTeam.id]);

  const homeId = souJogador1 ? userTeam.id : opponentTeam.id;
  const awayId = souJogador1 ? opponentTeam.id : userTeam.id;

  const nomeOponente = perfilOponente?.nome ?? "Adversário";
  const meuNome = perfil.nome || "Você";

  // Conexão com a mesa (realtime)
  useEffect(() => {
    if (!userId || !mesa.mesa_id) return;
    const mesaRealtime = new MesaRealtime({
      supabase,
      mesaId: mesa.mesa_id,
      userId,
      handlers: {
        onJogadaAdversaria: (jogada) => {
          if (jogadaAdversariaHandlerRef.current) jogadaAdversariaHandlerRef.current(jogada);
        },
        onEstado: (m) => {
          setPlacar([m.placar_j1, m.placar_j2]);
          setSeqJogada(m.seq_jogada || 0);
          if (m.status === "finalizado") setFinalizado(true);
          if (m.status === "em_andamento" && m.seq_jogada === 0) setFinalizado(false);
        },
        onTurno: (_meuTurno, turnoAtualId) => {
          setCurrentTurn(turnoAtualId === mesa.jogador_1_id ? "home" : "away");
        },
        onTempo: (segundos) => setTempoRestante(segundos),
        onOponente: (online) => setOponenteOnline(online),
        onDoisJogadoresConectados: () => setDoisJogadoresConectados(true),
        onPartidaIniciada: () => setPartidaIniciada(true),
        onPartidaFinalizada: () => setFinalizado(true),
        onFimDeTurno: (payload) => {
          if (payload.novoTurnoId)
            setCurrentTurn(payload.novoTurnoId === mesa.jogador_1_id ? "home" : "away");
          if (fimDeTurnoHandlerRef.current) fimDeTurnoHandlerRef.current(payload);
        },
        onGoalScored: () => {
          if (golAdversarioHandlerRef.current) golAdversarioHandlerRef.current();
        },
        onChat: (msg) => {
          setChatMsgs((prev) => [
            ...prev,
            { autorId: msg.autorId, autorNome: msg.autorNome, texto: msg.texto, enviadoEm: msg.enviadoEm, eu: false },
          ]);
        },
        onErro: () => {},
      },
    });
    mesaRealtime.conectarMesa();
    mesaRef.current = mesaRealtime;
    return () => {
      mesaRealtime.desconectar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesa.mesa_id, userId]);

  // Detecta fim de um jogo da série e decide próximo passo (melhor de 3).
  useEffect(() => {
    if (!finalizado) return;
    const golsJ1 = placar[0] ?? 0;
    const golsJ2 = placar[1] ?? 0;
    // Vencedor do jogo atual (determinado autoritativamente pelo placar).
    const jogoVencidoPorJ1 = golsJ1 > golsJ2;
    const jogoVencidoPorJ2 = golsJ2 > golsJ1;

    setSerieJ1((prev) => {
      const prox = prev + (jogoVencidoPorJ1 ? 1 : 0);
      return prox;
    });
    setSerieJ2((prev) => prev + (jogoVencidoPorJ2 ? 1 : 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalizado]);

  // Reabre a mesa se o status mudar de finalizado → em_andamento (reconexão/restart)
  useEffect(() => {
    if (mesa.status === "em_andamento") {
      setPartidaIniciada(true);
      setDoisJogadoresConectados(true);
      if (mesa.seq_jogada === 0) setFinalizado(false);
    } else if (mesa.status === "finalizado") {
      setFinalizado(true);
    }
  }, [mesa.status, mesa.seq_jogada]);

  const handleFinish = useCallback(
    async (_result: MatchResult) => {
      const gf = souJogador1 ? placar[0]! : placar[1]!;
      const ga = souJogador1 ? placar[1]! : placar[0]!;
      const meuNomeCurto = userTeam.short;
      const nomeOponenteCurto = opponentTeam.short;

      const golsJ1 = placar[0] ?? 0;
      const golsJ2 = placar[1] ?? 0;
      let vencedorId: string | null = null;
      if (golsJ1 > golsJ2) vencedorId = mesa.jogador_1_id;
      else if (golsJ2 > golsJ1) vencedorId = mesa.jogador_2_id;

      try {
        if (mesaRef.current && vencedorId) await mesaRef.current.finalizarPartida(vencedorId);
      } catch (e) {
        console.error("[MesaOnlineMatch] erro ao finalizar mesa:", e);
      }

      try {
        await aplicarResultadoRemoto(gf, ga, null, undefined, "online");
        let manchete: string;
        if (gf > ga)
          manchete = `Vitória online! ${meuNomeCurto} bate ${nomeOponenteCurto} por ${gf} a ${ga}`;
        else if (gf < ga)
          manchete = `Derrota amarga: ${meuNomeCurto} cai para ${nomeOponenteCurto} (${gf}-${ga})`;
        else manchete = `Empate equilibrado: ${meuNomeCurto} ${gf} x ${ga} ${nomeOponenteCurto}`;
        await inserirManchetesRemotas(userId, [
          {
            manchete,
            subtitulo: `Partida online · Mesa ${mesa.mesa_id}`,
            tag: "seu-time",
            rodada: 0,
          },
        ]);
      } catch (e) {
        console.error("[MesaOnlineMatch] erro ao aplicar soberania online:", e);
      }

      // Resultado do jogo (não da série) — o efeito de série decide continuação.
      onFinalizadaRef.current?.({ vencedorId, golsJ1, golsJ2, empate: vencedorId === null });
    },
    [
      souJogador1,
      placar,
      mesa.mesa_id,
      mesa.jogador_1_id,
      mesa.jogador_2_id,
      userId,
      userTeam.short,
      opponentTeam.short,
    ],
  );

  const handlePlay = useCallback(
    async (
      goals: number,
      jogadaData?: { discId: string; ix: number; iy: number; power: number },
      posicoesFinais?: {
        discos: Array<{ id: string; x: number; y: number }>;
        bola: { x: number; y: number };
      },
    ) => {
      if (!mesaRef.current) return;
      const ehDiscoReal =
        jogadaData &&
        jogadaData.discId !== "own_goal" &&
        jogadaData.discId !== "goal" &&
        jogadaData.discId !== "pass_turn" &&
        jogadaData.discId !== "no_goal";

      try {
        if (ehDiscoReal) {
          dispareiRef.current = true;
          await mesaRef.current.enviarJogada({
            id_botao: jogadaData!.discId,
            forca: Math.round(jogadaData!.power * 100),
            forca_x: jogadaData!.ix,
            forca_y: jogadaData!.iy,
            angulo: Math.round(Math.atan2(jogadaData!.iy, jogadaData!.ix) * (180 / Math.PI)),
            origem: { x: 0, y: 0 },
          });
        }

        if (dispareiRef.current) {
          if (goals > 0) {
            const ehGolContra = jogadaData?.discId === "own_goal";
            const autorDoGol = ehGolContra
              ? mesa.jogador_1_id === userId
                ? (mesa.jogador_2_id ?? mesa.jogador_1_id)
                : mesa.jogador_1_id
              : userId;
            await mesaRef.current.registrarGol(autorDoGol);
            await mesaRef.current.enviarGoalScored({
              jogadorId: userId,
              placar: { home: placar[0] ?? 0, away: placar[1] ?? 0 },
            });
            await mesaRef.current.trocarTurno();
            dispareiRef.current = false;
          } else if (posicoesFinais && jogadaData?.discId === "no_goal") {
            const proximoTurno =
              mesa.jogador_1_id === userId
                ? mesa.jogador_2_id || mesa.jogador_1_id
                : mesa.jogador_1_id;
            await mesaRef.current.enviarFimDeTurno({
              discos: posicoesFinais.discos,
              bola: posicoesFinais.bola,
              jogadorId: userId,
              novoTurnoId: proximoTurno,
            });
            await mesaRef.current.trocarTurno();
            dispareiRef.current = false;
          }
        }
      } catch (error) {
        console.error("[MesaOnlineMatch] erro no handlePlay:", error);
      }
    },
    [userId, mesa.jogador_1_id, mesa.jogador_2_id, placar],
  );

  const handleQuit = useCallback(() => {
    if (mesaRef.current) mesaRef.current.desconectar(true);
    onSair();
  }, [onSair]);

  const enviarChat = useCallback(
    (texto: string) => {
      const msg = { autorId: userId, autorNome: perfil.nome || "Você", texto };
      setChatMsgs((prev) => [...prev, { ...msg, enviadoEm: Date.now(), eu: true }]);
      mesaRef.current?.enviarChat(msg);
    },
    [userId, perfil.nome],
  );

  const meuTurno = currentTurn === userSide;

  const iniciarPartida = async () => {
    if (!mesaRef.current || !doisJogadoresConectados) return;
    try {
      const { error } = await supabase.rpc("iniciar_partida_mesa", { p_mesa_id: mesa.mesa_id });
      if (!error) setPartidaIniciada(true);
    } catch {
      /* ignore */
    }
  };

  // Reinicia a mesa para o próximo jogo da série (melhor de 3).
  const proximoJogo = async () => {
    try {
      const { error } = await supabase.rpc("reiniciar_mesa", { p_mesa_id: mesa.mesa_id });
      if (error) {
        console.error("[MesaOnlineMatch] erro ao reiniciar mesa:", error.message);
        return;
      }
      setFinalizado(false);
      setPlacar([0, 0]);
      setSeqJogada(0);
      setJogoAtual((j) => j + 1);
    } catch (e) {
      console.error("[MesaOnlineMatch] exceção ao reiniciar mesa:", e);
    }
  };

  const serieDecidida = serieJ1 >= VITORIAS_SERIE || serieJ2 >= VITORIAS_SERIE;
  const serieVencedorId =
    serieJ1 >= VITORIAS_SERIE
      ? mesa.jogador_1_id
      : serieJ2 >= VITORIAS_SERIE
        ? mesa.jogador_2_id
        : null;

  // Quando a série é decidida, notifica e sai.
  useEffect(() => {
    if (!serieDecidida || !finalizado) return;
    onFinalizadaRef.current?.({
      vencedorId: serieVencedorId,
      golsJ1: serieJ1,
      golsJ2: serieJ2,
      empate: false,
    });
    onSair();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serieDecidida, finalizado]);

  if (!doisJogadoresConectados) {
    return (
      <div className="space-y-4">
        <div className="surface p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl">Mesa {mesa.mesa_id}</h2>
            <p className="text-sm text-muted-foreground">
              Aguardando oponente... {oponenteOnline ? "Oponente conectado!" : "Aguardando conexão"}
            </p>
          </div>
          <button onClick={handleQuit} className="btn-ghost">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="surface p-8 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-lg font-medium">Aguardando segundo jogador...</p>
          <p className="text-sm text-muted-foreground mt-2">
            Compartilhe o código da sala:{" "}
            <span className="font-mono font-bold">{mesa.mesa_id}</span>
          </p>
        </div>
      </div>
    );
  }

  if (doisJogadoresConectados && !partidaIniciada) {
    return (
      <div className="space-y-4">
        <div className="surface p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl">Mesa {mesa.mesa_id}</h2>
            <p className="text-sm text-muted-foreground">
              2 jogadores conectados! Pronto para começar.
            </p>
          </div>
          <button onClick={handleQuit} className="btn-ghost">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="surface p-8 text-center">
          <p className="text-lg font-medium mb-4">Ambos os jogadores estão conectados!</p>
          <button onClick={iniciarPartida} className="btn-primary">
            Iniciar Partida
          </button>
        </div>
      </div>
    );
  }

  // Fim de um jogo da série (mas a série ainda não acabou) → botão próximo jogo.
  if (finalizado && !serieDecidida) {
    const serieMeu = souJogador1 ? serieJ1 : serieJ2;
    const serieOp = souJogador1 ? serieJ2 : serieJ1;
    return (
      <div className="space-y-4">
        <div className="surface p-6 text-center">
          <h2 className="font-display text-2xl">Jogo {jogoAtual} encerrado</h2>
          <p className="mt-2 text-lg">
            Placar do jogo: {placar[0]} x {placar[1]}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Melhor de 3 — primeiro a 2 vitórias</p>
          <div className="mt-4 inline-flex items-center gap-4 rounded-lg border border-border p-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{userTeam.short}</p>
              <p className="font-display text-3xl">{serieMeu}</p>
            </div>
            <span className="text-xl text-muted-foreground">×</span>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{opponentTeam.short}</p>
              <p className="font-display text-3xl">{serieOp}</p>
            </div>
          </div>
          <button onClick={proximoJogo} className="btn-primary mt-5">
            Próximo jogo
          </button>
          <button onClick={handleQuit} className="btn-ghost mt-2 ml-2">
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="surface p-4 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          {/* Placar limpo: NOME 1 × 0 NOME — sem ID técnico, sem debug. */}
          <p className="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
            {stageLabel}
          </p>
          <div className="mt-1 flex items-center justify-center gap-3 text-lg sm:gap-4">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ background: (souJogador1 ? userTeam : opponentTeam).primary }}
              />
              <span className="truncate font-semibold">{meuNome}</span>
            </span>
            <span className="font-display text-2xl tabular-nums sm:text-3xl">
              {souJogador1 ? placar[0] : placar[1]}
              <span className="mx-1 text-muted-foreground">×</span>
              {souJogador1 ? placar[1] : placar[0]}
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-semibold">{nomeOponente}</span>
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ background: (souJogador1 ? opponentTeam : userTeam).primary }}
              />
            </span>
          </div>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            {meuTurno ? "Seu turno" : "Turno do oponente"}
          </p>
        </div>
        <button onClick={handleQuit} className="btn-ghost shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative">
        <MatchView
          key={`${mesa.id}-${jogoAtual}`}
          homeId={homeId}
          awayId={awayId}
          userSide={userSide}
          difficulty="amador"
          turns={turnsLeft}
          knockout={false}
          stageLabel={`${stageLabel} - ${meuTurno ? "Seu turno" : "Turno do oponente"}`}
          onFinish={handleFinish}
          onQuit={handleQuit}
          isOnline
          customTeam={userTeam}
          onPlay={handlePlay}
          initialTurn={currentTurn}
          score={{ home: placar[0] ?? 0, away: placar[1] ?? 0 }}
          onJogadaAdversaria={(handler) => {
            jogadaAdversariaHandlerRef.current = handler;
          }}
          onFimDeTurno={(handler) => {
            if (typeof handler === "function") fimDeTurnoHandlerRef.current = handler;
          }}
          onGolAdversario={(resetHandler) => {
            if (typeof resetHandler === "function") golAdversarioHandlerRef.current = resetHandler;
          }}
        />
        <ChatOverlay mensagens={chatMsgs} onEnviar={enviarChat} meuNome={perfil.nome || "Você"} />
      </div>
    </div>
  );
}

export default MesaOnlineMatch;
