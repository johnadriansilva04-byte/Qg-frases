/* ═══ Car Brawl — Loading Screen ═══ */

import { useState, useEffect } from "react";

const TIPS = [
  "Use WASD ou setas para dirigir. SHIFT = Nitro!",
  "Empurre adversários para fora da arena — último sobrevive!",
  "Monte seu carrinho com sabedoria: peso empurra, potência acelera!",
  "No celular, toque e arraste para controlar o volante.",
  "O Nitro dá um boost de velocidade — mas dura pouco!",
  "Aderência afeta quanto você derrapa nas curvas.",
  "Cuidado com a borda — quem sai, perde!",
  "Cada derrota ainda dá SOV — nunca é tempo perdido.",
  "Na carreira, complete fases para desbloquear novas arenas!",
  "Estabilidade te ajuda a não cair quando empurram você.",
];

interface Props {
  onCompleto: () => void;
}

export function CarBrawlLoadingScreen({ onCompleto }: Props) {
  const [tipIdx, setTipIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const tipTimer = setInterval(() => setTipIdx((p) => (p + 1) % TIPS.length), 2200);
    const progressTimer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(progressTimer);
          clearInterval(tipTimer);
          setTimeout(onCompleto, 200);
          return 100;
        }
        return p + 5;
      });
    }, 70);
    return () => { clearInterval(tipTimer); clearInterval(progressTimer); };
  }, [onCompleto]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0e1a] text-white px-6">
      <div className="text-center max-w-sm">
        <span className="text-5xl animate-bounce block mb-6">🏎️</span>
        <h2 className="text-2xl font-display font-black mb-1">
          <span className="text-red-400">CAR</span>{" "}
          <span className="text-amber-400">BRAWL</span>
        </h2>
        <p className="text-xs text-white/40 mb-8">Preparando a arena...</p>
        <div className="w-full max-w-[200px] mx-auto mb-6">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <p className="text-[10px] text-white/30 mb-1 uppercase tracking-wider">Dica</p>
          <p className="text-xs text-white/60">{TIPS[tipIdx]}</p>
        </div>
      </div>
    </div>
  );
}
