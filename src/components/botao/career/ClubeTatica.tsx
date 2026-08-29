import { useCallback, useRef, useState } from "react";
import { ArrowLeft, GripVertical, Move, Target } from "lucide-react";
import { FORMACAO_DEFAULT, FORMACOES, formacaoById, type Formacao, type Tatica } from "./formacoes";

type Props = {
  tatica: Tatica | string;
  onSalvar: (tatica: Tatica, posicoes: Array<[number, number]>) => void;
  onBack: () => void;
};

export function ClubeTatica({ tatica, onSalvar, onBack }: Props) {
  const [taticaSel, setTaticaSel] = useState<Tatica>(tatica as Tatica);
  const [custom, setCustom] = useState(false);
  const [posicoes, setPosicoes] = useState<Array<[number, number]>>(
    formacaoById(tatica).posicoes,
  );
  const [arrastando, setArrastando] = useState<number | null>(null);
  const campoRef = useRef<HTMLDivElement>(null);

  const formacao = custom ? null : formacaoById(taticaSel);
  const posicoesAtuais = custom ? posicoes : (formacao?.posicoes ?? posicoes);

  const handleSelect = (id: Tatica) => {
    setTaticaSel(id);
    setCustom(false);
    setPosicoes(formacaoById(id).posicoes);
  };

  const handleCustom = () => {
    setCustom(true);
    setPosicoes(formacaoById(taticaSel).posicoes);
  };

  // Drag-and-drop no campo
  const getPosFromEvent = useCallback((clientX: number, clientY: number): [number, number] | null => {
    const el = campoRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0.05, Math.min(0.55, (clientX - rect.left) / rect.width));
    const y = Math.max(0.05, Math.min(0.95, (clientY - rect.top) / rect.height));
    return [x, y];
  }, []);

  const handlePointerDown = (idx: number, e: React.PointerEvent) => {
    if (!custom) return;
    e.preventDefault();
    setArrastando(idx);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (arrastando === null) return;
    const pos = getPosFromEvent(e.clientX, e.clientY);
    if (!pos) return;
    setPosicoes((prev) => prev.map((p, i) => (i === arrastando ? pos : p)));
  };

  const handlePointerUp = () => {
    setArrastando(null);
  };

  const salvar = () => {
    onSalvar(custom ? "custom" as Tatica : taticaSel, posicoesAtuais);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-md">
        <button onClick={onBack} className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10">
          <ArrowLeft className="size-4 text-white" />
        </button>
        <Target className="size-5 text-emerald-400" />
        <h1 className="font-display text-lg text-white">Tática de Campo</h1>
      </div>

      <div className="flex-1 space-y-5 p-4 pb-8">
        {/* Campo interativo */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div
            ref={campoRef}
            className="relative w-full overflow-hidden rounded-xl"
            style={{ aspectRatio: "100/62" }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <CampoSVG posicoes={posicoesAtuais} arrastando={arrastando} onPointerDown={handlePointerDown} custom={custom} />
          </div>
          {custom && (
            <div className="mt-2 flex items-center gap-2 text-[10px] text-white/40">
              <Move className="size-3" />
              <span>Arraste os botões para posicionar</span>
            </div>
          )}
        </div>

        {/* Formações predefinidas */}
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">Formação</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {FORMACOES.map((f) => (
              <button
                key={f.id}
                onClick={() => handleSelect(f.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  !custom && taticaSel === f.id
                    ? "border-emerald-400/60 bg-emerald-400/10"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <p className="font-display text-sm text-white">{f.label}</p>
                <p className="mt-0.5 text-[11px] text-white/50">{f.desc}</p>
              </button>
            ))}
            <button
              onClick={handleCustom}
              className={`rounded-xl border p-3 text-left transition ${
                custom
                  ? "border-amber-400/60 bg-amber-400/10"
                  : "border-dashed border-white/20 hover:border-white/30"
              }`}
            >
              <p className="font-display text-sm text-white">⚙️ Personalizada</p>
              <p className="mt-0.5 text-[11px] text-white/50">Arraste os botões no campo</p>
            </button>
          </div>
        </div>

        {/* Salvar */}
        <button
          onClick={salvar}
          className="w-full rounded-xl bg-emerald-500 py-3 font-display text-sm font-bold text-white transition hover:bg-emerald-400"
        >
          Salvar formação
        </button>
      </div>
    </div>
  );
}

/** Campo SVG com botões arrastáveis */
function CampoSVG({
  posicoes,
  arrastando,
  onPointerDown,
  custom,
}: {
  posicoes: Array<[number, number]>;
  arrastando: number | null;
  onPointerDown: (idx: number, e: React.PointerEvent) => void;
  custom: boolean;
}) {
  const W = 100;
  const H = 62;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full select-none">
      {/* Gramado */}
      {Array.from({ length: 12 }).map((_, i) => (
        <rect key={i} x={(W / 12) * i} y={0} width={W / 12} height={H} fill={i % 2 === 0 ? "#166534" : "#15803d"} opacity={0.5} />
      ))}
      {/* Linhas */}
      <rect x={1} y={1} width={W - 2} height={H - 2} fill="none" stroke="#fff" strokeWidth={0.4} opacity={0.6} />
      <line x1={W / 2} y1={1} x2={W / 2} y2={H - 1} stroke="#fff" strokeWidth={0.4} opacity={0.6} />
      <circle cx={W / 2} cy={H / 2} r={6} fill="none" stroke="#fff" strokeWidth={0.4} opacity={0.6} />
      <circle cx={W / 2} cy={H / 2} r={1} fill="#fff" opacity={0.3} />
      {/* Gols */}
      <rect x={0} y={H / 2 - 10} width={3} height={20} fill="none" stroke="#fff" strokeWidth={0.3} opacity={0.4} />
      <rect x={W - 3} y={H / 2 - 10} width={3} height={20} fill="none" stroke="#fff" strokeWidth={0.3} opacity={0.4} />

      {/* Goleiro */}
      <circle cx={5} cy={H / 2} r={3} fill="#f59e0b" stroke="#fff" strokeWidth={0.8} opacity={0.8} />
      <text x={5} y={H / 2 + 1} textAnchor="middle" fontSize={2.8} fontWeight="bold" fill="#fff" opacity={0.9}>G</text>

      {/* 5 botões */}
      {posicoes.map((pos, i) => {
        const x = pos[0] * W;
        const y = pos[1] * H;
        const isActive = arrastando === i;
        return (
          <g
            key={i}
            style={custom ? { cursor: "grab" } : undefined}
            onPointerDown={(e) => onPointerDown(i, e)}
          >
            <circle
              cx={x} cy={y} r={isActive ? 4 : 3.2}
              fill={isActive ? "#22d3ee" : "#1e3a8a"}
              stroke={isActive ? "#fff" : "#f59e0b"}
              strokeWidth={isActive ? 1.5 : 1}
              opacity={isActive ? 1 : 0.9}
            />
            <text x={x} y={y + 1} textAnchor="middle" fontSize={3} fontWeight="bold" fill="#fff">
              {i + 1}
            </text>
            {custom && (
              <circle cx={x} cy={y} r={5} fill="transparent" stroke="transparent" />
            )}
          </g>
        );
      })}
    </svg>
  );
}
