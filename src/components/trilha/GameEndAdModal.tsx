import { useState, useEffect } from "react";
import { Trophy, X, Play, TrendingDown, Minus, Sparkles } from "lucide-react";

type GameResult = "victory" | "defeat" | "draw";

interface GameEndAdModalProps {
  isOpen: boolean;
  result: GameResult;
  baseScore: number;
  onWatchVideo: () => Promise<boolean>;
  onClose: () => void;
}

export function GameEndAdModal({ isOpen, result, baseScore, onWatchVideo, onClose }: GameEndAdModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [showCancelButton, setShowCancelButton] = useState(false);

  const getResultInfo = () => {
    switch (result) {
      case "victory":
        return {
          title: "Vitória!",
          description: `+${baseScore} pontos`,
          buttonText: "Assistir vídeo para dobrar",
          icon: <Trophy className="h-12 w-12 text-amber-400" />,
          gradient: "from-amber-500/20 to-yellow-500/10",
          border: "border-amber-500/30",
          afterScore: baseScore * 2,
          improvement: `+${baseScore} pontos extras`,
        };
      case "defeat":
        return {
          title: "Derrota",
          description: `${baseScore} pontos`,
          buttonText: "Assistir vídeo para recuperar",
          icon: <TrendingDown className="h-12 w-12 text-red-400" />,
          gradient: "from-red-500/20 to-red-900/10",
          border: "border-red-500/30",
          afterScore: baseScore + 2,
          improvement: "Recupera 2 pontos",
        };
      case "draw":
        return {
          title: "Empate",
          description: `+${baseScore} ponto`,
          buttonText: "Assistir vídeo para dobrar",
          icon: <Minus className="h-12 w-12 text-blue-400" />,
          gradient: "from-blue-500/20 to-blue-900/10",
          border: "border-blue-500/30",
          afterScore: baseScore * 2,
          improvement: `+${baseScore} ponto extra`,
        };
    }
  };

  const resultInfo = getResultInfo();

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      setShowCancelButton(false);
      setError(null);
      return;
    }
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { setShowCancelButton(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const handleWatchVideo = async () => {
    setLoading(true);
    setError(null);
    try {
      const success = await onWatchVideo();
      if (success) onClose();
      else setError("Não temos vídeo disponível no momento.");
    } catch {
      setError("Erro ao carregar vídeo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`relative max-w-sm w-full rounded-2xl bg-gradient-to-b from-[#0f172a] to-[#1e293b] border ${resultInfo.border} p-6 shadow-2xl`}>
        {showCancelButton && (
          <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors">
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Icon */}
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${resultInfo.gradient} mb-5`}>
          {resultInfo.icon}
        </div>

        {/* Title + Score */}
        <h2 className="text-2xl font-black text-white tracking-tight mb-1">{resultInfo.title}</h2>
        <p className="text-lg font-bold text-white/60 mb-5">{resultInfo.description}</p>

        {/* Double points CTA */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-bold text-white/80">
              {result === "defeat" ? "Recuperar pontos?" : "Dobrar seus pontos?"}
            </span>
          </div>
          <p className="text-xs text-white/40">
            Após assistir:{" "}
            <span className="font-bold text-white/70">{resultInfo.afterScore} pontos</span>
            <span className="text-white/30"> ({resultInfo.improvement})</span>
          </p>
        </div>

        {/* Watch video button */}
        <button
          onClick={handleWatchVideo}
          disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-sm hover:from-emerald-500 hover:to-emerald-400 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              Carregando...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              {resultInfo.buttonText}
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Countdown */}
        {!showCancelButton && (
          <p className="mt-3 text-center text-[10px] text-white/25">
            Saindo em {countdown}s...
          </p>
        )}
      </div>
    </div>
  );
}
