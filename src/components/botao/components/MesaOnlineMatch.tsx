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
import { supabase } from "@/integrations/supabase/client";
import { createCustomTeam, teamByIdSync } from "@/components/botao/data/teams";
import type { MatchResult } from "@/components/botao/types";
import { MesaRealtime, type JogadaPayload } from "@/lib/multiplayer/MesaRealtime";
import type { MesaFutebol } from "@/lib/multiplayer/mesa.api";
import {
  aplicarResultadoRemoto,
  inserirManchetesRemotas,
} from "@/components/botao/career/careerRemote";
import type { Perfil } from "@/components/botao/online/auth";

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
  };
  /** Chamado quando a partida termina (status=finalizado) ou ao sair. */
  onSair: () => void;
  /** Resultado final da partida (vencedor + gols). */
  onFinalizada?: (r: ResultadoMesa) => void;
  /** Rótulo exibido no MatchView (ex.: "Amistoso Online" / "Campeonato · Rodada 2"). */
  stageLabel?: string;
};

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
  const TOTAL_JOGADAS = 12;
  const turnsLeft = Math.max(0, TOTAL_JOGADAS - seqJogada);
  const [tempoRestante, setTempoRestante] = useState(mesa.tempo_restante_segundos || 300);
  const [oponenteOnline, setOponenteOnline] = useState(false);
  const [doisJogadoresConectados, setDoisJogadoresConectados] = useState(
    mesa.status === "em_andamento" || mesa.jogador_2_id !== null,
  );
  const [partidaIniciada, setPartidaIniciada] = useState(mesa.status === "em_andamento");
  const [finalizado, setFinalizado] = useState(mesa.status === "finalizado");
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
  const onFinalizadaRef = useRef(onFinalizada);
  onFinalizadaRef.current = onFinalizada;

  const userTeam = useMemo(() => {
    if (!meuTime) return createCustomTeam("custom", "Meu Time", "MTI", "#FF0000", "#00FF00", 75);
    return createCustomTeam(
      meuTime.id,
      meuTime.nome,
      meuTime.abreviacao,
      meuTime.cores[0] ?? "#FF0000",
      meuTime.cores[1] ?? "#00FF00",
      75,
    );
  }, [meuTime]);

  const opponentTeam = useMemo(() => {
    const opponentTimeId = souJogador1 ? mesa.time_j2 : mesa.time_j1;
    if (!opponentTimeId)
      return createCustomTeam("opponent", "Aguardando...", "---", "#666666", "#999999", 75);
    if (opponentTimeId.startsWith("custom-"))
      return createCustomTeam(opponentTimeId, "Adversário", "ADV", "#FF0000", "#FFFFFF", 75);
    const teamFromDb = teamByIdSync(opponentTimeId);
    if (teamFromDb) return teamFromDb;
    return createCustomTeam(opponentTimeId, "Adversário", "ADV", "#0000FF", "#FFFF00", 75);
  }, [mesa.time_j1, mesa.time_j2, souJogador1]);

  const homeId = souJogador1 ? userTeam.id : opponentTeam.id;
  const awayId = souJogador1 ? opponentTeam.id : userTeam.id;
  const userSide = souJogador1 ? "home" : "away";

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

  // Detecta fim de partida (status=finalizado) e dispara onFinalizada
  useEffect(() => {
    if (!finalizado) return;
    const golsJ1 = placar[0] ?? 0;
    const golsJ2 = placar[1] ?? 0;
    let vencedorId: string | null = null;
    if (golsJ1 > golsJ2) vencedorId = mesa.jogador_1_id;
    else if (golsJ2 > golsJ1) vencedorId = mesa.jogador_2_id;
    onFinalizadaRef.current?.({ vencedorId, golsJ1, golsJ2, empate: golsJ1 === golsJ2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalizado]);

  // Reabre a mesa se o status mudar de finalizado → em_andamento (reconexão/restart)
  useEffect(() => {
    if (mesa.status === "em_andamento") {
      setPartidaIniciada(true);
      setDoisJogadoresConectados(true);
      setFinalizado(false);
    } else if (mesa.status === "finalizado") {
      setFinalizado(true);
    }
  }, [mesa.status]);

  const handleFinish = useCallback(
    async (_result: MatchResult) => {
      const gf = souJogador1 ? placar[0]! : placar[1]!;
      const ga = souJogador1 ? placar[1]! : placar[0]!;
      const meuNomeCurto = userTeam.short;
      const nomeOponente = souJogador1
        ? teamByIdSync(mesa.time_j2 || "MTI").short
        : teamByIdSync(mesa.time_j1 || "MTI").short;

      // Finaliza a mesa no servidor com o vencedor (status=finalizado)
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
        // Pontos escassos + estatísticas no perfil (Amistoso Online)
        await aplicarResultadoRemoto(gf, ga, null);
        let manchete: string;
        if (gf > ga)
          manchete = `Vitória online! ${meuNomeCurto} bate ${nomeOponente} por ${gf} a ${ga}`;
        else if (gf < ga)
          manchete = `Derrota amarga: ${meuNomeCurto} cai para ${nomeOponente} (${gf}-${ga})`;
        else manchete = `Empate equilibrado: ${meuNomeCurto} ${gf} x ${ga} ${nomeOponente}`;
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

      onFinalizadaRef.current?.({ vencedorId, golsJ1, golsJ2, empate: vencedorId === null });
      onSair();
    },
    [
      onSair,
      souJogador1,
      placar,
      mesa.mesa_id,
      mesa.time_j1,
      mesa.time_j2,
      mesa.jogador_1_id,
      mesa.jogador_2_id,
      userId,
      userTeam.short,
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
      try {
        if (
          jogadaData &&
          jogadaData.discId !== "own_goal" &&
          jogadaData.discId !== "goal" &&
          jogadaData.discId !== "pass_turn" &&
          jogadaData.discId !== "no_goal"
        ) {
          await mesaRef.current.enviarJogada({
            id_botao: jogadaData.discId,
            forca: Math.round(jogadaData.power * 100),
            forca_x: jogadaData.ix,
            forca_y: jogadaData.iy,
            angulo: Math.round(Math.atan2(jogadaData.iy, jogadaData.ix) * (180 / Math.PI)),
            origem: { x: 0, y: 0 },
          });
        }

        if (goals > 0) {
          await mesaRef.current.registrarGol();
          // Após o gol, troca o turno no servidor (quem sofreu o gol recebe a bola)
          await mesaRef.current.trocarTurno();
        }

        if (goals === 0 && posicoesFinais && jogadaData?.discId === "no_goal") {
          const proximoTurno =
            mesa.jogador_1_id === userId
              ? mesa.jogador_2_id || mesa.jogador_1_id
              : mesa.jogador_1_id;
          const novoSeqJogada = mesa.jogador_1_id === userId ? seqJogada + 1 : seqJogada;
          await mesaRef.current.enviarFimDeTurno({
            discos: posicoesFinais.discos,
            bola: posicoesFinais.bola,
            jogadorId: userId,
            novoTurnoId: proximoTurno,
          });
          if (mesa.jogador_1_id === userId) setSeqJogada(novoSeqJogada);
        }
      } catch (error) {
        console.error("[MesaOnlineMatch] erro no handlePlay:", error);
      }
    },
    [userId, mesa.jogador_1_id, mesa.jogador_2_id, seqJogada],
  );

  const handleQuit = useCallback(() => {
    if (mesaRef.current) mesaRef.current.desconectar(true);
    onSair();
  }, [onSair]);

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

  return (
    <div className="space-y-4">
      <div className="surface p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl">Mesa {mesa.mesa_id}</h2>
          <p className="text-sm text-muted-foreground">
            Placar: {placar[0]} x {placar[1]} · Tempo: {Math.floor(tempoRestante / 60)}:
            {(tempoRestante % 60).toString().padStart(2, "0")}
          </p>
          <p className="text-sm text-muted-foreground">
            {meuTurno ? "Seu turno" : "Turno do oponente"} · Oponente:{" "}
            {oponenteOnline ? "Online" : "Offline"}
          </p>
        </div>
        <button onClick={handleQuit} className="btn-ghost">
          <X className="w-5 h-5" />
        </button>
      </div>

      <MatchView
        key={mesa.id}
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
      />
    </div>
  );
}

export default MesaOnlineMatch;
