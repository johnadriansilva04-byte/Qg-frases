/* ═══ Car Brawl — Loading Screen ═══ */

import { useState, useEffect } from "react";

const TIPS = [
  "Use o impulso para empurrar adversários para fora da arena!",
  "Fique longe das bordas — quem cai, perde!",
  "Cada eliminação vale 1 ponto.",
  "O último carro na arena vence a batalha!",
  "WASD ou setas para jogar no teclado.",
  "No celular, toque e arraste para dirigir.",
  "Cada oponente tem uma cor — saiba quem é quem!",
  "A arena é circular — cuidado com as bordas!",
  "O impulso é mais forte quando você está de frente!",
  "Planeje seus ataques — empurre e recue!",
];

interface Props {
  onCompleto: () => void;
}

export function CarBrawlLoadingScreen({ onCompleto }: Props) {
  const [tipIdx, setTipIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const tipTimer = setInterval(() => {
      setTipIdx((p) => (p + 1) % TIPS.length);
    }, 2000);

    const progressTimer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(progressTimer);
          clearInterval(tipTimer);
          setTimeout(onCompleto, 200);
          return 100;
        }
        return p + 4;
      });
    }, 80);

    return () => {
      clearInterval(tipTimer);
      clearInterval(progressTimer);
    };
  }, [onCompleto]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0e1a] text-white px-6">
      <div className="text-center max-w-sm">
        {/* Car icon */}
        <div className="mb-6">
          <span className="text-5xl animate-bounce">🏎️</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-display font-black mb-1">
          <span className="text-red-400">CAR</span>{" "}
          <span className="text-amber-400">BRAWL</span>
        </h2>
        <p className="text-xs text-white/40 mb-8">Preparando a arena...</p>

        {/* Progress bar */}
        <div className="w-full max-w-[200px] mx-auto mb-6">
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Tip */}
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <p className="text-[10px] text-white/30 mb-1 uppercase tracking-wider">Dica</p>
          <p className="text-xs text-white/60">{TIPS[tipIdx]}</p>
        </div>
      </div>
    </div>
  );
}
