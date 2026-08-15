/**
 * MesaRealtime — camada de sincronização ao vivo para a mesa de futebol de botão.
 *
 * NÃO contém física, canvas ou renderização. Ele só:
 *  - conecta os 2 jogadores no mesmo canal (Presence)
 *  - transmite/recebe jogadas (Broadcast, baixa latência)
 *  - mantém turno, placar e status sincronizados (Postgres Changes + RPC)
 *  - deriva o cronômetro de 5 min do relógio do servidor
 *
 * Uso: ver docs/SINCRONIZACAO-MESA-ONLINE.md
 */
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type StatusMesa = "aguardando" | "em_andamento" | "finalizado";

export interface MesaRow {
  id: string;
  mesa_id: string;
  jogador_1_id: string;
  jogador_2_id: string | null;
  time_j1: string;
  time_j2: string | null;
  placar_j1: number;
  placar_j2: number;
  turno_atual_id: string | null;
  status: StatusMesa;
  duracao_segundos: number;
  iniciado_em: string | null;
  tempo_restante_segundos: number;
  seq_jogada: number;
  estado_fisico: unknown;
  vencedor_id: string | null;
  motivo_finalizacao: string | null;
}

/** Payload vetorial do chute — o mínimo necessário para reproduzir a jogada. */
export interface JogadaPayload {
  id_botao: string | number;
  forca: number;
  forca_x: number;
  forca_y: number;
  angulo: number;
  /** posição de origem, para corrigir divergência de física entre clientes */
  origem?: { x: number; y: number };
  /** contador incremental do emissor, usado para descartar jogadas fora de ordem */
  seq: number;
  autor_id: string;
  jogador_id: string;
  enviado_em: number;
}

export interface MesaRealtimeHandlers {
  /** jogada do adversário — aplique na sua física, sem remontar a mesa */
  onJogadaAdversaria?: (jogada: JogadaPayload) => void;
  /** qualquer mudança de estado da mesa (turno, placar, status) */
  onEstado?: (mesa: MesaRow) => void;
  /** true quando é a vez do jogador local */
  onTurno?: (meuTurno: boolean, turnoAtualId: string | null) => void;
  /** tick de 1s do cronômetro derivado do servidor */
  onTempo?: (segundosRestantes: number) => void;
  /** ambos jogadores presentes no canal */
  onOponente?: (online: boolean, oponenteId: string | null) => void;
  /** quando 2 jogadores estão conectados e prontos para começar */
  onDoisJogadoresConectados?: (jogador1Id: string, jogador2Id: string) => void;
  /** sincronização de posições finais após movimento */
  onSyncPositions?: (payload: { discos: any[]; bola: any }) => void;
  /** gol marcado - atualiza placar */
  onGoalScored?: (payload: { jogadorId: string; placar: { home: number; away: number } }) => void;
  /** fim de turno - sincroniza posições finais e passa turno */
  onFimDeTurno?: (payload: { 
    discos: Array<{ id: string; x: number; y: number }>; 
    bola: { x: number; y: number };
    jogadorId: string;
  }) => void;
  onPartidaIniciada?: (mesa: MesaRow) => void;
  onPartidaFinalizada?: (mesa: MesaRow) => void;
  onErro?: (erro: Error) => void;
}

export interface MesaRealtimeOptions {
  supabase: SupabaseClient;
  mesaId: string;
  userId: string;
  handlers?: MesaRealtimeHandlers;
  /** intervalo do heartbeat de presença, ms (padrão 10s) */
  heartbeatMs?: number;
}

export class MesaRealtime {
  private supabase: SupabaseClient;
  private mesaId: string;
  private userId: string;
  private h: MesaRealtimeHandlers;
  private heartbeatMs: number;

  private canal: RealtimeChannel | null = null;
  private mesa: MesaRow | null = null;
  private seqLocal = 0;
  private ultimaSeqRecebida = -1;
  private timerRelogio: ReturnType<typeof setInterval> | null = null;
  private timerHeartbeat: ReturnType<typeof setInterval> | null = null;
  private conectado = false;
  private meuNumeroJogador: 1 | 2 | null = null; // 1 = host, 2 = guest

  constructor(opts: MesaRealtimeOptions) {
    this.supabase = opts.supabase;
    this.mesaId = opts.mesaId;
    this.userId = opts.userId;
    this.h = opts.handlers ?? {};
    this.heartbeatMs = opts.heartbeatMs ?? 10_000;
  }

  // ---------------------------------------------------------------- conexão

  /** Conecta ao canal da mesa: Presence + Broadcast + Postgres Changes. */
  async conectarMesa(): Promise<MesaRow | null> {
    if (this.conectado) return this.mesa;
    this.conectado = true;

    this.canal = this.supabase.channel(`mesa_${this.mesaId}`, {
      config: {
        presence: { key: this.userId },
        broadcast: { self: false, ack: false },
      },
    });

    // 1) broadcast de jogadas em tempo real
    this.canal.on("broadcast", { event: "jogada" }, ({ payload }) => {
      console.log('[MesaRealtime] Recebendo broadcast de jogada:', payload);
      const j = payload as JogadaPayload;
      if (!j || j.autor_id === this.userId) return;
      if (j.seq <= this.ultimaSeqRecebida) return; // fora de ordem / duplicada
      this.ultimaSeqRecebida = j.seq;
      console.log('[MesaRealtime] Chamando onJogadaAdversaria:', j);
      this.h.onJogadaAdversaria?.(j);
    });

    // 1.1) sincronização de posições finais após movimento
    this.canal.on("broadcast", { event: "sync_positions" }, ({ payload }) => {
      this.h.onSyncPositions?.(payload as any);
    });

    // 1.2) gol marcado
    this.canal.on("broadcast", { event: "goal_scored" }, ({ payload }) => {
      this.h.onGoalScored?.(payload as any);
    });

    // 1.3) fim de turno - sincronização de posições finais
    this.canal.on("broadcast", { event: "fim_de_turno" }, ({ payload }) => {
      this.h.onFimDeTurno?.(payload as any);
    });

    // 2) estado autoritativo da mesa
    this.canal.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "mesas_futebol",
        filter: `mesa_id=eq.${this.mesaId}`,
      },
      ({ new: row }) => this.aplicarEstado(row as MesaRow),
    );

    // 3) presença - detectar quando 2 jogadores estão conectados
    this.canal.on("presence", { event: "sync" }, () => {
      const estado = this.canal?.presenceState() ?? {};
      const presentes = Object.keys(estado);

      // Determinar meu número de jogador baseado na ordem de entrada
      const meuIndice = presentes.indexOf(this.userId);
      if (meuIndice === 0) {
        this.meuNumeroJogador = 1;
      } else if (meuIndice === 1) {
        this.meuNumeroJogador = 2;
      }

      // Notificar sobre oponente
      const ids = presentes.filter((k) => k !== this.userId);
      this.h.onOponente?.(ids.length > 0, ids[0] ?? null);

      // Quando tiver 2 jogadores conectados, notificar para permitir início da partida
      if (presentes.length === 2) {
        const jogador1Id = presentes[0]!;
        const jogador2Id = presentes[1]!;
        this.h.onDoisJogadoresConectados?.(jogador1Id, jogador2Id);
      }
    });

    await new Promise<void>((resolve, reject) => {
      this.canal!.subscribe((status, err) => {
        if (status === "SUBSCRIBED") resolve();
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          reject(err ?? new Error(`Canal da mesa falhou: ${status}`));
        }
      });
    }).catch((e: Error) => {
      this.h.onErro?.(e);
    });

    await this.canal?.track({ user_id: this.userId, entrou_em: Date.now() });

    // Estado inicial + entrada como jogador 2, se houver vaga
    const mesa = await this.carregarOuEntrar();
    this.iniciarRelogio();
    this.iniciarHeartbeat();
    return mesa;
  }

  /** Encerra tudo. Chame no unmount do componente. */
  async desconectar(marcarAbandono = false) {
    if (this.timerRelogio) clearInterval(this.timerRelogio);
    if (this.timerHeartbeat) clearInterval(this.timerHeartbeat);
    this.timerRelogio = this.timerHeartbeat = null;

    if (marcarAbandono && this.mesa?.status === "em_andamento") {
      await this.supabase.rpc("abandonar_partida_mesa", { p_mesa_id: this.mesaId });
    }
    if (this.canal) {
      await this.canal.untrack().catch(() => {});
      await this.supabase.removeChannel(this.canal);
      this.canal = null;
    }
    this.conectado = false;
  }

  // ----------------------------------------------------------------- jogadas

  /** Envia o chute do jogador local: broadcast imediato + RPC de turno. */
  async enviarJogada(
    dados: Omit<JogadaPayload, "seq" | "autor_id" | "enviado_em" | "jogador_id">,
    opts: { trocarTurno?: boolean; estadoFisico?: unknown } = {},
  ): Promise<boolean> {
    if (!this.podeJogar()) return false;

    const payload: JogadaPayload = {
      ...dados,
      forca_x: dados.forca_x || 0,
      forca_y: dados.forca_y || 0,
      seq: ++this.seqLocal,
      autor_id: this.userId,
      jogador_id: this.userId,
      enviado_em: Date.now(),
    };

    // 1) adversário vê o chute na hora
    await this.canal?.send({ type: "broadcast", event: "jogada", payload });

    // 2) servidor valida turno mas NÃO alterna automaticamente
    const { data, error } = await this.supabase.rpc("registrar_jogada_mesa", {
      p_mesa_id: this.mesaId,
      p_estado_fisico: (opts.estadoFisico ?? null) as never,
      p_trocar_turno: false, // NÃO trocar turno automaticamente
    });

    if (error) {
      this.h.onErro?.(new Error(error.message));
      return false;
    }
    if (data) this.aplicarEstado(data as MesaRow);
    return true;
  }

  /** Registra gol do jogador local (ou de um id específico). */
  async registrarGol(jogadorId?: string) {
    const { data, error } = await this.supabase.rpc("registrar_gol_mesa", {
      p_mesa_id: this.mesaId,
      p_jogador_id: jogadorId ?? this.userId,
    });
    if (error) return this.h.onErro?.(new Error(error.message));
    if (data) this.aplicarEstado(data as MesaRow);
  }

  /** Envia sincronização de posições finais após movimento (broadcast) */
  async enviarSyncPositions(payload: { discos: any[]; bola: any }) {
    await this.canal?.send({ type: "broadcast", event: "sync_positions", payload });
  }

  /** Envia evento de gol marcado (broadcast) */
  async enviarGoalScored(payload: { jogadorId: string; placar: { home: number; away: number } }) {
    await this.canal?.send({ type: "broadcast", event: "goal_scored", payload });
  }

  /** Envia evento de fim de turno com posições finais (broadcast) */
  async enviarFimDeTurno(payload: { 
    discos: Array<{ id: string; x: number; y: number }>; 
    bola: { x: number; y: number };
    jogadorId: string;
  }) {
    await this.canal?.send({ type: "broadcast", event: "fim_de_turno", payload });
  }

  /** Atalho para registrar o listener sem instanciar handlers no construtor. */
  escutarJogadaAdversaria(cb: (j: JogadaPayload) => void) {
    this.h.onJogadaAdversaria = cb;
  }

  // ------------------------------------------------------------------ estado

  getMesa() {
    return this.mesa;
  }

  /** true quando é a vez do jogador local e a partida está rolando. */
  podeJogar(): boolean {
    return (
      this.mesa?.status === "em_andamento" &&
      this.mesa?.turno_atual_id === this.userId &&
      this.tempoRestante() > 0
    );
  }

  /** Aplique no wrapper do canvas: `el.style.pointerEvents = mesa.travado ? 'none' : 'auto'` */
  get travado(): boolean {
    return !this.podeJogar();
  }

  tempoRestante(): number {
    const m = this.mesa;
    if (!m) return 0;
    if (m.status === "finalizado") return 0;
    if (!m.iniciado_em) return m.duracao_segundos;
    const decorrido = (Date.now() - new Date(m.iniciado_em).getTime()) / 1000;
    return Math.max(0, Math.round(m.duracao_segundos - decorrido));
  }

  static formatarTempo(segundos: number) {
    const mm = String(Math.floor(segundos / 60)).padStart(2, "0");
    const ss = String(segundos % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  // ----------------------------------------------------------------- privado

  private async carregarOuEntrar(): Promise<MesaRow | null> {
    const { data: atual, error } = await this.supabase
      .from("mesas_futebol")
      .select("*")
      .eq("mesa_id", this.mesaId)
      .maybeSingle();

    if (error) {
      this.h.onErro?.(new Error(error.message));
      return null;
    }
    if (!atual) {
      this.h.onErro?.(new Error("Mesa não encontrada"));
      return null;
    }

    const row = atual as MesaRow;
    const souParticipante =
      row.jogador_1_id === this.userId || row.jogador_2_id === this.userId;

    if (!souParticipante && !row.jogador_2_id && row.status === "aguardando") {
      const { data, error: errEntrar } = await this.supabase.rpc("entrar_mesa_futebol", {
        p_mesa_id: this.mesaId,
        p_time: row.time_j2 ?? "MTI",
      });
      if (errEntrar) this.h.onErro?.(new Error(errEntrar.message));
      else if (data) return this.aplicarEstado(data as MesaRow);
    }

    return this.aplicarEstado(row);
  }

  private aplicarEstado(row: MesaRow): MesaRow {
    const anterior = this.mesa;
    this.mesa = row;

    this.h.onEstado?.(row);

    if (anterior?.turno_atual_id !== row.turno_atual_id || !anterior) {
      this.h.onTurno?.(row.turno_atual_id === this.userId, row.turno_atual_id);
    }
    if (anterior?.status !== "em_andamento" && row.status === "em_andamento") {
      this.h.onPartidaIniciada?.(row);
    }
    if (anterior?.status !== "finalizado" && row.status === "finalizado") {
      this.h.onPartidaFinalizada?.(row);
    }
    return row;
  }

  private iniciarRelogio() {
    if (this.timerRelogio) return;
    this.timerRelogio = setInterval(() => {
      if (!this.mesa || this.mesa.status !== "em_andamento") {
        return;
      }
      const tempo = this.tempoRestante();
      this.h.onTempo?.(tempo);
    }, 1000);
  }

  private iniciarHeartbeat() {
    if (this.timerHeartbeat) return;
    this.timerHeartbeat = setInterval(() => {
      void this.supabase.rpc("registrar_heartbeat_mesa", { p_mesa_id: this.mesaId });
    }, this.heartbeatMs);
  }
}

export default MesaRealtime;
