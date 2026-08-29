import { useState, type ReactNode } from "react";
import { ArrowLeft, Plus, Link2, RefreshCw, Users, Zap } from "lucide-react";

// ── Friendly room name generator ──
const ARENA_PREFIXES = ["Arena", "Mesa", "Sala", "Campo", "Quadra"];
const ARENA_ADJECTIVES = [
  "Central", "Azul", "Ouro", "Prata", "Bronze",
  "Norte", "Sul", "Leste", "Oeste", "Elite",
  "Premium", "Virtual", "Digital", "Esportiva", "Competitiva",
];

let roomCounter = 0;

export function nomeAmigavel(roomId: string): string {
  // Deterministic name from room ID hash
  let hash = 0;
  for (let i = 0; i < roomId.length; i++) {
    hash = ((hash << 5) - hash + roomId.charCodeAt(i)) | 0;
  }
  const absHash = Math.abs(hash);
  const prefix = ARENA_PREFIXES[absHash % ARENA_PREFIXES.length];
  const adj = ARENA_ADJECTIVES[(absHash >> 3) % ARENA_ADJECTIVES.length];
  return `${prefix} ${adj}`;
}

// ── Types ──
export type RoomStatus = "aguardando" | "em_andamento" | "finalizado" | "bloqueada";

export type LobbyRoom = {
  id: string;
  /** Friendly name to display (if null, auto-generated from ID) */
  name?: string | undefined;
  status: RoomStatus;
  playerCount: number;
  maxPlayers?: number | undefined;
  /** Optional label like "Aposta: 10 SOV" */
  meta?: string | undefined;
  /** Whether the current user is already in this room */
  isParticipant?: boolean | undefined;
  /** Whether the current user is the creator */
  isCreator?: boolean | undefined;
};

export type LobbyRoomCardProps = {
  room: LobbyRoom;
  onJoin: (roomId: string) => void;
  onReenter?: ((roomId: string) => void) | undefined;
  onAdmin?: ((roomId: string) => void) | undefined;
  onCopyLink?: ((roomId: string) => void) | undefined;
  joinLabel?: string | undefined;
  joinDisabled?: boolean | undefined;
};

// ── Sub-components ──

function RoomCard({ room, onJoin, onReenter, onAdmin, onCopyLink, joinLabel, joinDisabled }: LobbyRoomCardProps) {
  const displayName = room.name ?? nomeAmigavel(room.id);

  const statusColors: Record<RoomStatus, { border: string; bg: string; text: string; label: string }> = {
    aguardando: {
      border: "border-emerald-500/15",
      bg: "from-emerald-950/20 to-slate-950/60",
      text: "bg-emerald-500/15 text-emerald-400",
      label: "Aberta",
    },
    em_andamento: {
      border: "border-amber-500/15",
      bg: "from-amber-950/20 to-slate-950/60",
      text: "bg-amber-500/15 text-amber-400",
      label: "Em jogo",
    },
    finalizado: {
      border: "border-white/5",
      bg: "from-white/[0.02] to-white/[0.02]",
      text: "bg-slate-500/15 text-slate-400",
      label: "Finalizada",
    },
    bloqueada: {
      border: "border-white/5",
      bg: "from-white/[0.02] to-white/[0.02]",
      text: "bg-slate-500/15 text-slate-400",
      label: "Bloqueada",
    },
  };

  const sc = statusColors[room.status];

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${sc.border} bg-gradient-to-r ${sc.bg}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-white">{displayName}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${sc.text}`}>
            {sc.label}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-white/40">
          {room.playerCount}{room.maxPlayers ? `/${room.maxPlayers}` : ""} jogadores
          {room.meta && <span className="ml-2 text-amber-300/70">· {room.meta}</span>}
        </p>
        {onCopyLink && (
          <button onClick={() => onCopyLink(room.id)} className="mt-1 text-[10px] text-sky-400/60 hover:text-sky-300 transition">
            📋 Copiar link
          </button>
        )}
      </div>

      <div className="flex flex-col items-end gap-1">
        {room.isParticipant && room.status !== "finalizado" ? (
          <>
            {onReenter && (
              <button onClick={() => onReenter(room.id)} className="rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white transition hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.97]">
                Reentrar
              </button>
            )}
            {room.isCreator && onAdmin && (
              <button onClick={() => onAdmin(room.id)} className="text-[10px] text-slate-500 hover:text-white transition">
                Admin
              </button>
            )}
          </>
        ) : room.status === "aguardando" ? (
          <button
            onClick={() => onJoin(room.id)}
            disabled={joinDisabled}
            className="rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white transition hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.97] disabled:opacity-50"
          >
            <Users className="mr-1 inline size-3" /> {joinLabel ?? "Entrar"}
          </button>
        ) : (
          <span className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">
            {room.status === "bloqueada" ? "🔒" : room.status === "finalizado" ? "✓" : "Ocupada"}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main Layout ──

export type OnlineLobbyLayoutProps = {
  /** Title shown in header */
  title: string;
  /** Subtitle below title */
  subtitle?: string;
  /** Icon component to show in header */
  icon?: ReactNode;
  /** Back button handler */
  onBack?: (() => void) | undefined;
  /** Background accent color: "emerald" | "sky" | "amber" | "purple" */
  accent?: "emerald" | "sky" | "amber" | "purple";

  // ── Left Column ──
  /** Create form children (rendered inside the create card) */
  createForm: ReactNode;
  /** Join-by-code input value */
  joinCode?: string;
  /** Join-by-code input setter */
  setJoinCode?: (v: string) => void;
  /** Join handler */
  onJoinByCode?: (code: string) => void;
  /** Join button disabled */
  joinDisabled?: boolean;
  /** Extra content below join (e.g. SOV balance, settings) */
  leftExtra?: ReactNode;

  // ── Right Column ──
  /** Open rooms list */
  rooms: LobbyRoom[];
  /** Room-specific props */
  onJoinRoom?: (roomId: string) => void;
  onReenterRoom?: (roomId: string) => void;
  onAdminRoom?: (roomId: string) => void;
  onCopyRoomLink?: (roomId: string) => void;
  /** Refresh rooms handler */
  onRefresh?: () => void;
  /** Loading state for rooms */
  roomsLoading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Join label override for room cards */
  joinLabel?: string;

  // ── Toast / Error ──
  toastLink?: string | null;
  onDismissToast?: () => void;
  error?: string | null;
  onDismissError?: () => void;
};

const ACCENT_STYLES = {
  emerald: { header: "text-emerald-400", glow: "bg-emerald-500/4", border: "border-emerald-500/15", createBg: "from-emerald-950/30 to-slate-950/60", createIcon: "bg-emerald-500/15 text-emerald-400" },
  sky: { header: "text-sky-400", glow: "bg-sky-500/4", border: "border-sky-500/15", createBg: "from-sky-950/30 to-slate-950/60", createIcon: "bg-sky-500/15 text-sky-400" },
  amber: { header: "text-amber-400", glow: "bg-amber-500/4", border: "border-amber-500/15", createBg: "from-amber-950/30 to-slate-950/60", createIcon: "bg-amber-500/15 text-amber-400" },
  purple: { header: "text-purple-400", glow: "bg-purple-500/4", border: "border-purple-500/15", createBg: "from-purple-950/30 to-slate-950/60", createIcon: "bg-purple-500/15 text-purple-400" },
} as const;

export function OnlineLobbyLayout({
  title, subtitle, icon, onBack, accent = "emerald",
  createForm, joinCode, setJoinCode, onJoinByCode, joinDisabled, leftExtra,
  rooms, onJoinRoom, onReenterRoom, onAdminRoom, onCopyRoomLink, onRefresh, roomsLoading, emptyMessage,
  joinLabel, toastLink, onDismissToast, error, onDismissError,
}: OnlineLobbyLayoutProps) {
  const [showAllRooms, setShowAllRooms] = useState(false);
  const a = ACCENT_STYLES[accent];
  const visibleRooms = showAllRooms ? rooms : rooms.slice(0, 5);

  return (
    <main className="relative mx-auto w-full max-w-4xl px-4 py-5">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -top-16 left-1/4 h-[250px] w-[250px] rounded-full ${a.glow} blur-[100px]`} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          {onBack && (
            <button onClick={onBack} className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition hover:bg-white/10">
              <ArrowLeft className="size-4 text-white" />
            </button>
          )}
          {icon && <div className={`flex size-8 items-center justify-center rounded-lg ${a.createIcon}`}>{icon}</div>}
          <div>
            <h2 className="font-display text-lg font-black text-white">{title}</h2>
            {subtitle && <p className="text-[9px] uppercase tracking-[0.3em] text-slate-500">{subtitle}</p>}
          </div>
        </div>

        {/* Toasts */}
        {toastLink && (
          <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-950/90 p-2.5 text-[10px] text-emerald-300 flex items-center gap-2 shadow-xl">
            <span>🔗</span>
            <span className="flex-1 truncate font-mono">{toastLink}</span>
            <button onClick={onDismissToast} className="shrink-0 text-emerald-400/60 hover:text-emerald-300">fechar</button>
          </div>
        )}
        {error && (
          <div className="mb-3 rounded-lg border border-red-500/30 bg-red-950/90 p-2.5 text-[10px] text-red-300 flex items-center gap-2 shadow-xl">
            <span>⚠️</span>
            <span className="flex-1">{error}</span>
            <button onClick={onDismissError} className="shrink-0 text-red-400/60 hover:text-red-300">fechar</button>
          </div>
        )}

        {/* 2-Column Layout */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr] items-start">
          {/* ── Left: Actions ── */}
          <div className="space-y-3">
            {/* Create Card */}
            <div className={`rounded-xl border ${a.border} bg-gradient-to-br ${a.createBg} p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`flex size-7 items-center justify-center rounded-lg ${a.createIcon}`}>
                  <Plus className="size-3.5" />
                </div>
                <p className="text-xs font-black uppercase tracking-wider text-white">Criar Sala</p>
              </div>
              {createForm}
            </div>

            {/* Join by Code */}
            {onJoinByCode && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
                    <Link2 className="size-3.5" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-wider text-white">Entrar por Código</p>
                </div>
                <div className="flex gap-2">
                  <input
                    value={joinCode ?? ""}
                    onChange={(e) => setJoinCode?.(e.target.value)}
                    placeholder="Cole o código ou link..."
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white placeholder-white/30 font-mono focus:border-sky-500/40 focus:outline-none"
                  />
                  <button
                    onClick={() => onJoinByCode(joinCode ?? "")}
                    disabled={joinDisabled || !joinCode?.trim()}
                    className="shrink-0 rounded-lg bg-sky-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-sky-500 disabled:opacity-50"
                  >
                    Entrar
                  </button>
                </div>
              </div>
            )}

            {leftExtra}
          </div>

          {/* ── Right: Open Rooms ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className={`size-3.5 ${a.header}`} />
                <span className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-bold">Salas Abertas</span>
                <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-white/30">{rooms.length}</span>
              </div>
              {onRefresh && (
                <button onClick={onRefresh} className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-white/30 transition hover:text-white/60">
                  <RefreshCw className={`size-3 ${roomsLoading ? "animate-spin" : ""}`} /> Atualizar
                </button>
              )}
            </div>

            {rooms.length === 0 ? (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                <p className="text-xs text-white/25">{emptyMessage ?? "Nenhuma sala disponível"}</p>
                <p className="text-[10px] text-white/15 mt-1">Seja o primeiro a abrir uma partida</p>
              </div>
            ) : (
              <div className="space-y-2">
                {visibleRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onJoin={onJoinRoom ?? (() => {})}
                    onReenter={onReenterRoom}
                    onAdmin={onAdminRoom}
                    onCopyLink={onCopyRoomLink}
                    joinLabel={joinLabel}
                  />
                ))}
                {rooms.length > 5 && !showAllRooms && (
                  <button
                    onClick={() => setShowAllRooms(true)}
                    className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] py-2 text-[10px] font-bold text-white/25 transition hover:text-white/50"
                  >
                    Ver Todas ({rooms.length}) <span className="ml-1">→</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
