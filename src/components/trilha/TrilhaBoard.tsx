import { useMemo } from "react";
import { BOARD_EDGES, MILLS, NODE_COORDS, NODE_LABELS } from "@/lib/trilha/board";
import type { Cell, GameState, Player } from "@/lib/trilha/engine";

const PAD = 8;
const SPAN = 84;

function px(v: number) {
  return PAD + (v / 6) * SPAN;
}

export interface BoardProps {
  state: GameState;
  perspective?: Player | undefined;
  selected: number | null;
  targets: ReadonlySet<number>;
  captureTargets: ReadonlySet<number>;
  lastMove?: { from: number | null; to: number; remove: number | null } | null | undefined;
  interactive?: boolean | undefined;
  onNodeClick: (node: number) => void;
}

function activeMills(board: Cell[]) {
  return MILLS.filter((m) => {
    const a = board[m[0]!];
    return a !== 0 && a === board[m[1]!] && a === board[m[2]!];
  });
}

function Piece({
  node,
  owner,
  isSelected,
  isCaptureTarget,
  inMill,
  isLast,
  onClick,
  clickable,
  isFlying,
}: {
  node: number;
  owner: Player;
  isSelected: boolean;
  isCaptureTarget: boolean;
  inMill: boolean;
  isLast: boolean;
  clickable: boolean;
  onClick: () => void;
  isFlying?: boolean;
}) {
  const [gx, gy] = NODE_COORDS[node]!;
  const x = px(gx);
  const y = px(gy);
  const feb = owner === 1;

  const pieceR = 4.6;
  const glowR = 6.2;

  return (
    <g
      transform={`translate(${x} ${y})`}
      onClick={clickable ? onClick : undefined}
      className={`origin-center transition-all duration-200 ${
        clickable ? "cursor-pointer" : ""
      }`}
      role={clickable ? "button" : undefined}
      aria-label={`${feb ? "Pracinha da FEB" : "Tropa inimiga"} em ${NODE_LABELS[node]}`}
    >
      {/* Drop shadow */}
      <ellipse
        cx="0.5"
        cy="1.8"
        rx={pieceR - 0.5}
        ry={pieceR * 0.7}
        fill="rgba(0,0,0,0.55)"
      />

      {/* Selected: golden glow ring */}
      {isSelected && (
        <>
          <circle r={glowR + 1.5} fill="none" stroke="#fbbf24" strokeWidth="0.6" opacity="0.5">
            <animate attributeName="r" values={`${glowR};${glowR + 2.5};${glowR}`} dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0.15;0.5" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle r={glowR} fill="none" stroke="#fbbf24" strokeWidth="1.2" opacity="0.9" />
        </>
      )}

      {/* Capture target: red pulsing ring */}
      {isCaptureTarget && (
        <>
          <circle r={glowR + 1} fill="none" stroke="#ef4444" strokeWidth="0.5" opacity="0.4">
            <animate attributeName="r" values={`${glowR};${glowR + 3};${glowR}`} dur="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.05;0.4" dur="1s" repeatCount="indefinite" />
          </circle>
          <circle r={glowR} fill="none" stroke="#ef4444" strokeWidth="1.4" strokeDasharray="2.5 1.5" opacity="0.9">
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="4s" repeatCount="indefinite" />
          </circle>
        </>
      )}

      {/* Mill glow */}
      {inMill && !isSelected && !isCaptureTarget && (
        <circle r={pieceR + 1.2} fill="none" stroke="#22c55e" strokeWidth="0.8" opacity="0.6">
          <animate attributeName="opacity" values="0.6;0.25;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Piece body: gradient fill */}
      <circle
        r={pieceR}
        fill={`url(#piece-${feb ? "feb" : "eixo"})`}
        stroke={
          isSelected
            ? "#fbbf24"
            : inMill
            ? "#22c55e"
            : isCaptureTarget
            ? "#ef4444"
            : "rgba(0,0,0,0.9)"
        }
        strokeWidth={isSelected || isCaptureTarget ? "0.9" : "0.6"}
      />

      {/* Sheen */}
      <circle r={pieceR - 0.3} fill="url(#pieceSheen)" />

      {/* FEB: Cobra Fumando symbol */}
      {feb ? (
        <g fill="none" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" opacity="0.9">
          <path d="M -2.2 1.8 C 0.3 2.2, 2.3 1.0, 1.8 -0.6 C 1.4 -1.9, -0.4 -2.0, -0.7 -0.7" />
          <path d="M -0.7 -0.7 L -2.5 -2.0" />
          <path d="M -2.7 -2.5 c 0.6 -0.6, -0.6 -1.0, 0 -1.6" />
        </g>
      ) : (
        /* Eixo: Capacete de aço */
        <g fill="#ffffff" fillOpacity="0.9">
          <path d="M -2.8 0.7 a 2.8 2.9 0 0 1 5.6 0 z" />
          <rect x="-3.4" y="0.8" width="6.8" height="1.0" rx="0.5" />
        </g>
      )}

      {/* Last move indicator */}
      {isLast && !isSelected && (
        <circle
          r={pieceR + 0.8}
          fill="none"
          stroke="#60a5fa"
          strokeWidth="0.6"
          strokeDasharray="1.5 1.5"
          opacity="0.8"
        >
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="6s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Flying indicator */}
      {isFlying && (
        <g opacity="0.7">
          <path d={`M 0 ${-pieceR - 1.5} l -1.5 -2.5 h 3 z`} fill="#fbbf24" />
        </g>
      )}
    </g>
  );
}

export function TrilhaBoard({
  state,
  perspective: _perspective = 1,
  selected,
  targets,
  captureTargets,
  lastMove,
  interactive = true,
  onNodeClick,
}: BoardProps) {
  const mills = useMemo(() => activeMills(state.board), [state.board]);
  const millNodes = useMemo(() => new Set(mills.flat()), [mills]);
  const totalP1 = useMemo(
    () => state.board.filter((c) => c === 1).length,
    [state.board]
  );
  const totalP2 = useMemo(
    () => state.board.filter((c) => c === 2).length,
    [state.board]
  );

  return (
    <div className="relative aspect-square w-full max-w-[min(80vh,600px)] select-none">
      {/* Board background */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#0a0f1a] via-[#0d1525] to-[#0a0f1a] border border-slate-700/50 shadow-2xl shadow-black/40" />
      <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.04)_0%,transparent_70%)]" />

      <svg
        viewBox="0 0 100 100"
        className="relative h-full w-full"
        role="grid"
        aria-label="Tabuleiro tático da Trilha"
        data-perspective={_perspective}
      >
        <defs>
          {/* Piece gradients */}
          <radialGradient id="piece-feb" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </radialGradient>
          <radialGradient id="piece-eixo" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </radialGradient>
          <radialGradient id="pieceSheen" cx="35%" cy="25%" r="65%">
            <stop offset="0%" stopColor="white" stopOpacity="0.35" />
            <stop offset="50%" stopColor="white" stopOpacity="0.08" />
            <stop offset="100%" stopColor="black" stopOpacity="0.25" />
          </radialGradient>
          {/* Board line glow */}
          <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Subtle grid pattern */}
        <g stroke="rgba(100,116,139,0.06)" strokeWidth="0.2">
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`h${i}`} x1="6" y1={6 + i * 11} x2="94" y2={6 + i * 11} />
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`v${i}`} x1={6 + i * 11} y1="6" x2={6 + i * 11} y2="94" />
          ))}
        </g>

        {/* Board lines — base (dark) */}
        <g stroke="rgba(148,163,184,0.15)" strokeWidth="1.3" strokeLinecap="round">
          {BOARD_EDGES.map(([a, b]) => {
            const [ax, ay] = NODE_COORDS[a]!;
            const [bx, by] = NODE_COORDS[b]!;
            return <line key={`base-${a}-${b}`} x1={px(ax)} y1={px(ay)} x2={px(bx)} y2={px(by)} />;
          })}
        </g>

        {/* Board lines — glow layer */}
        <g
          stroke="rgba(148,163,184,0.25)"
          strokeWidth="0.6"
          strokeLinecap="round"
          filter="url(#lineGlow)"
        >
          {BOARD_EDGES.map(([a, b]) => {
            const [ax, ay] = NODE_COORDS[a]!;
            const [bx, by] = NODE_COORDS[b]!;
            return <line key={`glow-${a}-${b}`} x1={px(ax)} y1={px(ay)} x2={px(bx)} y2={px(by)} />;
          })}
        </g>

        {/* Active mills — green glow */}
        {mills.map((m) => {
          const [ax, ay] = NODE_COORDS[m[0]]!;
          const [bx, by] = NODE_COORDS[m[2]]!;
          return (
            <g key={`mill-${m.join("-")}`}>
              <line
                x1={px(ax)}
                y1={px(ay)}
                x2={px(bx)}
                y2={px(by)}
                stroke="#22c55e"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.15"
                filter="url(#lineGlow)"
              />
              <line
                x1={px(ax)}
                y1={px(ay)}
                x2={px(bx)}
                y2={px(by)}
                stroke="#22c55e"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.8"
              />
            </g>
          );
        })}

        {/* Empty intersections */}
        {NODE_COORDS.map(([gx, gy], node) => {
          if (state.board[node] !== 0) return null;
          const isTarget = targets.has(node);
          return (
            <g key={`n${node}`} transform={`translate(${px(gx)} ${px(gy)})`}>
              {/* Node dot */}
              <circle r="1.3" fill="rgba(148,163,184,0.4)" />
              {isTarget && (
                <>
                  <circle r="3.2" fill="rgba(251,191,36,0.08)" stroke="#fbbf24" strokeWidth="0.5" opacity="0.6">
                    <animate attributeName="r" values="3.2;4.2;3.2" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                  <circle r="1.8" fill="rgba(251,191,36,0.25)" />
                </>
              )}
              {/* Touch target (larger for mobile) */}
              <circle
                r="5.5"
                fill="transparent"
                className={interactive && isTarget ? "cursor-pointer" : "cursor-default"}
                onClick={interactive && isTarget ? () => onNodeClick(node) : undefined}
                role={isTarget ? "button" : undefined}
                aria-label={`Interseção ${NODE_LABELS[node]}`}
              />
            </g>
          );
        })}

        {/* Pieces */}
        {state.board.map((cell, node) =>
          cell === 0 ? null : (
            <Piece
              key={`p${node}`}
              node={node}
              owner={cell}
              isSelected={selected === node}
              isCaptureTarget={captureTargets.has(node)}
              inMill={millNodes.has(node)}
              isLast={lastMove?.to === node}
              isFlying={false}
              clickable={
                interactive &&
                (captureTargets.has(node) ||
                  (cell === state.turn && targets.size >= 0))
              }
              onClick={() => onNodeClick(node)}
            />
          )
        )}

        {/* Piece count badges */}
        <g>
          {/* P1 count (bottom-left) */}
          <rect x="1" y="93" width="12" height="5.5" rx="1.5" fill="rgba(15,23,42,0.85)" stroke="rgba(59,130,246,0.4)" strokeWidth="0.4" />
          <circle cx="4" cy="95.75" r="1.5" fill="#3b82f6" />
          <text x="7.5" y="97" textAnchor="middle" fill="#94a3b8" fontSize="2.8" fontFamily="monospace" fontWeight="bold">
            {totalP1}
          </text>

          {/* P2 count (top-right) */}
          <rect x="87" y="1.5" width="12" height="5.5" rx="1.5" fill="rgba(15,23,42,0.85)" stroke="rgba(239,68,68,0.4)" strokeWidth="0.4" />
          <circle cx="90" cy="4.25" r="1.5" fill="#ef4444" />
          <text x="93.5" y="5.5" textAnchor="middle" fill="#94a3b8" fontSize="2.8" fontFamily="monospace" fontWeight="bold">
            {totalP2}
          </text>
        </g>
      </svg>
    </div>
  );
}
