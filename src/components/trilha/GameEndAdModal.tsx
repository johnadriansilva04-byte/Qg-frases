import { useState, useEffect } from "react";
import { Trophy, X, Play, Video, TrendingDown, Minus } from "lucide-react";

type GameResult = "victory" | "defeat" | "draw";

interface GameEndAdModalProps {
  isOpen: boolean;
  result: GameResult;
  baseScore: number;
  onWatchVideo: () => Promise<boolean>;
  onClose: () => void;
}

const VIDEO_LIMIT_KEY = "trilha_video_limit";
const VIDEO_COUNT_KEY = "trilha_video_count";
const VIDEO_DATE_KEY = "trilha_video_date";

export function GameEndAdModal({ isOpen, result, baseScore, onWatchVideo, onClose }: GameEndAdModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videosWatchedToday, setVideosWatchedToday] = useState(0);
  const [canWatchVideo, setCanWatchVideo] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [showCancelButton, setShowCancelButton] = useState(false);

  // Calcular pontos baseados no resultado
  const getResultInfo = () => {
    switch (result) {
      case "victory":
        return {
          title: "Parabéns!",
          description: `Você ganhou ${baseScore} pontos`,
          buttonText: "Assistir vídeo para dobrar",
          icon: <Trophy className="h-10 w-10 text-yellow-500" />,
          iconBg: "bg-yellow-500/10",
          afterVideoScore: baseScore * 2,
          improvement: `+${baseScore} pontos extras`
        };
      case "defeat":
        return {
          title: "Que pena!",
          description: `Você perdeu ${Math.abs(baseScore)} pontos`,
          buttonText: "Assistir vídeo para recuperar",
          icon: <TrendingDown className="h-10 w-10 text-red-500" />,
          iconBg: "bg-red-500/10",
          afterVideoScore: baseScore + 2, // -3 + 2 = -1
          improvement: "Recupera 2 pontos"
        };
      case "draw":
        return {
          title: "Empate!",
          description: `Você ganhou ${baseScore} ponto`,
          buttonText: "Assistir vídeo para dobrar",
          icon: <Minus className="h-10 w-10 text-blue-500" />,
          iconBg: "bg-blue-500/10",
          afterVideoScore: baseScore * 2,
          improvement: `+${baseScore} ponto extra`
        };
    }
  };

  const resultInfo = getResultInfo();

  // Verificar limite de vídeos por dia
  useEffect(() => {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem(VIDEO_DATE_KEY);
    const savedCount = parseInt(localStorage.getItem(VIDEO_COUNT_KEY) || "0");
    const limit = parseInt(localStorage.getItem(VIDEO_LIMIT_KEY) || "5");

    if (savedDate !== today) {
      // Novo dia, resetar contador
      localStorage.setItem(VIDEO_DATE_KEY, today);
      localStorage.setItem(VIDEO_COUNT_KEY, "0");
      setVideosWatchedToday(0);
    } else {
      setVideosWatchedToday(savedCount);
    }

    setCanWatchVideo(savedCount < limit);
  }, []);

  // Countdown para mostrar botão de cancelar
  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      setShowCancelButton(false);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setShowCancelButton(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const handleWatchVideo = async () => {
    if (!canWatchVideo) {
      setError("Limite diário de vídeos atingido.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await onWatchVideo();
      
      if (success) {
        // Incrementar contador de vídeos
        const today = new Date().toDateString();
        const currentCount = parseInt(localStorage.getItem(VIDEO_COUNT_KEY) || "0");
        localStorage.setItem(VIDEO_DATE_KEY, today);
        localStorage.setItem(VIDEO_COUNT_KEY, (currentCount + 1).toString());
        setVideosWatchedToday(currentCount + 1);
        
        // Verificar se ainda pode assistir mais vídeos
        const limit = parseInt(localStorage.getItem(VIDEO_LIMIT_KEY) || "5");
        setCanWatchVideo(currentCount + 1 < limit);
        
        onClose();
      } else {
        setError("Não temos vídeo no momento, infelizmente.");
      }
    } catch (err) {
      setError("Erro ao carregar vídeo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-md w-full p-6 shadow-2xl relative">
        {/* Botão de cancelar após 5 segundos */}
        {showCancelButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        )}

        <div className="text-center mb-6">
          <div className={`${resultInfo.iconBg} rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4`}>
            {resultInfo.icon}
          </div>
          <h2 className="text-2xl font-bold mb-2">{resultInfo.title}</h2>
          <p className="text-muted-foreground mb-4">
            {resultInfo.description}
          </p>
          <p className="text-lg font-semibold text-primary mb-6">
            {result === "victory" || result === "draw" 
              ? "Quer dobrar seus pontos?" 
              : "Quer diminuir sua perda?"}
          </p>
          {result !== "draw" && (
            <p className="text-sm text-muted-foreground mb-4">
              Após assistir vídeo: <span className="font-bold text-foreground">{resultInfo.afterVideoScore} pontos</span> ({resultInfo.improvement})
            </p>
          )}
        </div>

        {/* Google AdSense Video Ad */}
        <div className="mb-6 bg-surface/50 rounded-lg p-4 border border-border">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Video className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Anúncio</span>
          </div>
          
          {/* Google AdSense Code */}
          <div className="relative min-h-[200px] flex items-center justify-center bg-black/5 rounded-lg overflow-hidden">
            <ins
              className="adsbygoogle block"
              style={{ display: "block" }}
              data-ad-client="ca-pub-2783546143377409"
              data-ad-slot="3577664762"
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
            
            {/* Placeholder visual enquanto o anúncio carrega */}
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              Carregando anúncio...
            </div>
          </div>
        </div>

        {/* Botão de assistir vídeo */}
        <button
          onClick={handleWatchVideo}
          disabled={loading || !canWatchVideo}
          className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Mensagens de erro ou limite */}
        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {!canWatchVideo && !error && (
          <div className="mt-4 p-3 bg-muted/50 border border-border rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Limite diário atingido ({videosWatchedToday}/5 vídeos)
            </p>
          </div>
        )}

        {/* Contador para cancelar */}
        {!showCancelButton && (
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Botão de sair disponível em {countdown} segundos...
            </p>
          </div>
        )}

        {/* Informação subliminar para o Google */}
        <div className="hidden">
          <span data-ad-rewarded="true" data-ad-points={baseScore * 2}>
            Google AdSense - Dobrar pontos após assistir vídeo
          </span>
        </div>
      </div>
    </div>
  );
}