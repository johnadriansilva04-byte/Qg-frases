import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * FootballLoadingScreen — Tela de carregamento temática do Futebol de Botão.
 * Campo animado, botões (jogadores) deslizando, dicas do jogo, progresso suave.
 * Totalmente CSS/JS, zero imagens externas.
 */

const TIPS = [
  { title: "Controles", body: "Arraste os botões para chutar. Toque no goleiro para defender." },
  { title: "Estratégia", body: "Formações diferentes mudam a força do time. Teste todas!" },
  { title: "Modo Carreira", body: "Suba da Série C até a Série A. Cada temporada é uma nova história." },
  { title: "SOV", body: "Ganhe Soberania em partidas e invista no marketplace da Cidadela." },
  { title: "Online", body: "Desafie outros jogadores em tempo real. Apostas opcionais em SOV." },
  { title: "Copa do Brasil", body: "O mata-mata da Cidadela. 16 times, 4 fases, 1 campeão." },
];

export function FootballLoadingScreen({ onCompleto }: { onCompleto: () => void }) {
  const [pct, setPct] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const DURACAO = 2800;

  // Animação da barra
  useEffect(() => {
    startRef.current = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / DURACAO);
      const eased = 1 - Math.pow(1 - t, 3);
      setPct(Math.round(eased * 100));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!doneRef.current) {
        doneRef.current = true;
        onCompleto();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onCompleto]);

  // Rotação de dicas
  useEffect(() => {
    const interval = DURACAO / TIPS.length;
    const id = setInterval(() => {
      setTipIdx((i) => (i + 1) % TIPS.length);
    }, interval);
    return () => clearInterval(id);
  }, []);

  const tip = TIPS[tipIdx % TIPS.length] ?? TIPS[0]!;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-emerald-950">
      {/* Grade do campo */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.3) 40px, rgba(255,255,255,0.3) 41px)",
        }}
      />

      {/* Círculo central do campo */}
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/10 md:h-56 md:w-56" />
      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20" />

      {/* Linha de meio */}
      <div className="absolute left-1/2 top-0 h-full w-px bg-white/10" />

      {/* Bolas animadas (3 bolas deslizando pelo campo) */}
      <div className="absolute h-5 w-5 animate-[bounce-left_3s_linear_infinite] rounded-full bg-white/30 shadow-[0_0_12px_rgba(255,255,255,0.3)]" style={{ top: "20%", left: "-5%" }} />
      <div className="absolute h-4 w-4 animate-[bounce-right_4s_linear_infinite] rounded-full bg-amber-400/30 shadow-[0_0_10px_rgba(251,191,36,0.3)]" style={{ top: "60%", right: "-5%" }} />
      <div className="absolute h-3 w-3 animate-[bounce-left_5s_linear_infinite] rounded-full bg-cyan-400/25" style={{ top: "80%", left: "-5%" }} />

      {/* Conteúdo principal */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4 text-center">
        {/* Ícone do jogo */}
        <div className="relative">
          <div className="absolute -inset-6 rounded-full bg-green-400/20 blur-2xl animate-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-green-400/40 bg-gradient-to-br from-green-500/30 to-emerald-600/30 shadow-2xl shadow-green-500/20 md:h-24 md:w-24">
            <svg
              viewBox="0 0 64 64"
              fill="none"
              className="h-12 w-12 md:h-14 md:w-14"
            >
              {/* Bola de futebol estilizada */}
              <circle cx="32" cy="32" r="24" fill="url(#ballGrad)" stroke="#fff" strokeWidth="1.5" opacity="0.9" />
              <path
                d="M32 8 L38 18 L32 22 L26 18 Z M52 24 L46 30 L42 24 Z M56 40 L48 42 L50 48 Z M8 40 L16 42 L14 48 Z M12 24 L18 30 L22 24 Z"
                fill="#fff"
                opacity="0.3"
              />
              <path d="M32 8 L32 56 M8 32 L56 32" stroke="#fff" strokeWidth="0.8" opacity="0.15" />
              <defs>
                <linearGradient id="ballGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#22c55e" />
                  <stop offset="1" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Título */}
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">
            <span className="bg-gradient-to-r from-green-300 via-emerald-300 to-cyan-300 bg-clip-text text-transparent">
              ESTÁDIO DO CAMPUS
            </span>
          </h1>
          <p className="mt-1 text-sm text-green-200/60">Futebol de Botão · Cidadela</p>
        </div>

        {/* Barra de progresso */}
        <div className="w-full max-w-xs">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-300 transition-none shadow-[0_0_12px_rgba(74,222,128,0.5)]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-green-200/50">
            <Loader2 className="size-3 animate-spin" />
            <span>{pct}%</span>
          </div>
        </div>

        {/* Dica rotativa */}
        <div
          key={tipIdx}
          className="w-full max-w-sm animate-[fadeIn_0.3s_ease-out]"
        >
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-green-300/60">
              {tip.title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-green-100/80">
              {tip.body}
            </p>
          </div>
        </div>

        {/* Botões animados (jogadores deslizando) */}
        <div className="relative h-8 w-full max-w-xs overflow-hidden">
          <div className="absolute left-0 top-0 flex items-center gap-3 animate-[slideRight_2.5s_ease-in-out_infinite]">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/30">
              <span className="text-[8px] font-bold text-white">1</span>
            </div>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/30">
              <span className="text-[8px] font-bold text-white">2</span>
            </div>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/30">
              <span className="text-[8px] font-bold text-white">3</span>
            </div>
          </div>
          <div className="absolute right-0 top-4 flex items-center gap-3 animate-[slideLeft_3s_ease-in-out_infinite]">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 shadow-lg shadow-blue-500/30">
              <span className="text-[8px] font-bold text-white">4</span>
            </div>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 shadow-lg shadow-blue-500/30">
              <span className="text-[8px] font-bold text-white">5</span>
            </div>
          </div>
        </div>
      </div>

      {/* Keyframes inline via style tag */}
      <style>{`
        @keyframes bounce-left {
          0% { transform: translateX(0); opacity: 0; }
          10% { opacity: 0.4; }
          90% { opacity: 0.4; }
          100% { transform: translateX(110vw); opacity: 0; }
        }
        @keyframes bounce-right {
          0% { transform: translateX(0); opacity: 0; }
          10% { opacity: 0.3; }
          90% { opacity: 0.3; }
          100% { transform: translateX(-110vw); opacity: 0; }
        }
        @keyframes slideRight {
          0% { transform: translateX(-120%); }
          50% { transform: translateX(120%); }
          100% { transform: translateX(-120%); }
        }
        @keyframes slideLeft {
          0% { transform: translateX(120%); }
          50% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
