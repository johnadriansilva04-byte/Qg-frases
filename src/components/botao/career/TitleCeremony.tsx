import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Trophy, Sparkles } from "lucide-react";
import type { Coach } from "./types";
import type { Difficulty } from "../types";

type Props = {
  coach: Coach;
  timeName: string;
  difficulty: Difficulty;
  soberaniaAdd: number;
  onContinue: () => void;
};

const NIVEL_LABEL: Record<Difficulty, string> = {
  amador: "Copa Amador",
  profissional: "Copa Profissional",
  lenda: "Copa Lenda",
};

export function TitleCeremony({ coach, timeName, difficulty, soberaniaAdd, onContinue }: Props) {
  const rafRef = useRef<number | null>(null);
  const endRef = useRef(false);

  useEffect(() => {
    // Chuva de confete contínua por ~8s
    const duration = 8 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 60 } as const;

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const frame = () => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0 || endRef.current) return;
      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ["#FFD700", "#FF6B35", "#F7C948", "#FFFFFF", "#22c55e"],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ["#FFD700", "#FF6B35", "#F7C948", "#FFFFFF", "#22c55e"],
      });
      rafRef.current = window.requestAnimationFrame(frame);
    };
    frame();

    return () => {
      endRef.current = true;
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm" data-testid="title-ceremony">
      <div className="mx-4 w-full max-w-xl overflow-hidden rounded-2xl border border-yellow-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-yellow-950/40 p-8 shadow-2xl">
        <div className="mb-2 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.35em] text-yellow-300">
          <Sparkles className="size-4 animate-pulse" />
          <span>Cerimônia de Premiação</span>
          <Sparkles className="size-4 animate-pulse" />
        </div>

        <div className="my-6 flex flex-col items-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-yellow-500/20" />
            <Trophy className="relative size-32 text-yellow-400 drop-shadow-[0_0_25px_rgba(253,224,71,0.7)]" strokeWidth={1.5} />
          </div>
          <div className="mt-4 text-center">
            <p className="text-xs uppercase tracking-widest text-yellow-500">Campeão da {NIVEL_LABEL[difficulty]}</p>
            <p className="mt-2 font-display text-3xl">{timeName}</p>
            <p className="mt-1 text-lg text-muted-foreground">
              Sob o comando de <span className="font-display text-primary">{coach.apelido || coach.nome}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 border-y border-white/10 py-4">
          <Stat label="Sovereign" value={`+${soberaniaAdd}`} accent />
          <Stat label="Título" value={`${coach.titulos + 1}º`} />
          <Stat label="Campanhas" value={String(coach.campanhasJogadas)} />
        </div>

        <p className="mt-4 text-center text-sm italic text-muted-foreground">
          "{gerarFraseHeroi(coach.apelido || coach.nome, timeName)}"
        </p>

        <button
          data-testid="ceremony-continue"
          onClick={onContinue}
          className="btn-primary mt-6 w-full"
        >
          Erguer a taça
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-[10px] uppercase tracking-widest ${accent ? "text-yellow-400" : "text-muted-foreground"}`}>{label}</div>
      <div className={`font-display text-2xl ${accent ? "text-yellow-300" : ""}`}>{value}</div>
    </div>
  );
}

const FRASES = [
  "{coach} entra para a história do {time}. A taça é sua, treinador.",
  "Do vestiário ao Olimpo: {coach} coroado no {time}.",
  "A fé do {time} venceu. {coach}, você é lenda.",
  "Escreveram sobre você, {coach}. E agora, todos vão ler.",
  "A cidade não dorme hoje. {time} é campeão sob o comando de {coach}.",
];

function gerarFraseHeroi(coach: string, time: string) {
  const f = FRASES[Math.floor(Math.random() * FRASES.length)]!;
  return f.replace(/\{coach\}/g, coach).replace(/\{time\}/g, time);
}
