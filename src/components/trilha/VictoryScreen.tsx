import { Trophy, Sparkles, Award, ChevronRight } from "lucide-react";

interface VictoryScreenProps {
  phase: string;
  onNextPhase: () => void;
  onContinue: () => void;
}

export function VictoryScreen({ phase, onNextPhase, onContinue }: VictoryScreenProps) {
  const getPhaseTitle = () => {
    switch (phase) {
      case "recruta":
        return "Fase Recruta Completada!";
      case "sargento":
        return "Fase Sargento Completada!";
      case "general":
        return "Fase General Completada!";
      default:
        return "Fase Completada!";
    }
  };

  const getPhaseDescription = () => {
    switch (phase) {
      case "recruta":
        return "Você dominou os fundamentos da Trilha. Pronto para o próximo desafio?";
      case "sargento":
        return "Sua estratégia está melhorando. O teste final está próximo.";
      case "general":
        return "Você alcançou o ápice da estratégia tática. Mestre da Trilha!";
      default:
        return "Excelente progresso. Continue sua jornada!";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-lg w-full">
        <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Banner Monetag no topo */}
          <div className="mb-6 bg-surface/30 rounded-lg p-3 border border-border/50">
            <div className="text-center text-xs text-muted-foreground mb-2">
              Publicidade
            </div>
            <div
              id="monetag-victory-ad"
              className="min-h-[90px] flex items-center justify-center"
            >
              {/* Container para anúncio Monetag */}
              <ins
                className="adsbygoogle"
                style={{ display: "block" }}
                data-ad-client="ca-pub-2783546143377409"
                data-ad-slot="3577664762"
                data-ad-format="auto"
                data-full-width-responsive="true"
              />
            </div>
          </div>

          {/* Conteúdo de vitória */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="bg-yellow-500/20 p-4 rounded-full">
                <Trophy className="w-16 h-16 text-yellow-500" />
              </div>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Parabéns! Você venceu!
            </h1>
            <p className="text-lg sm:text-xl text-primary font-semibold mb-2">
              {getPhaseTitle()}
            </p>
            <p className="text-muted-foreground text-sm sm:text-base">
              {getPhaseDescription()}
            </p>
          </div>

          {/* Stats de vitória */}
          <div className="bg-surface/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold text-foreground">Próxima Fase</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Award className="w-8 h-8 text-primary" />
              <span className="text-lg font-bold text-primary">
                {phase === "recruta" ? "Sargento" : phase === "sargento" ? "General" : "Mestre"}
              </span>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="space-y-3">
            <button
              onClick={onNextPhase}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              Ir para Próxima Fase
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={onContinue}
              className="w-full bg-secondary/70 hover:bg-secondary text-foreground font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              Continuar no Nível Atual
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Continue sua jornada para se tornar o Mestre da Trilha!
          </p>
        </div>
      </div>
    </div>
  );
}
