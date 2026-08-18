import { Brain, Target, TrendingUp, GraduationCap } from "lucide-react";
import { InfoModal, InfoButton } from "./InfoModal";
import { SEO_CONTENT } from "@/data/seoContent";
import { useState } from "react";

interface CidadelaIntroProps {
  onContinue: () => void;
}

export function CidadelaIntro({ onContinue }: CidadelaIntroProps) {
  const [activeModal, setActiveModal] = useState<"sobre" | "como" | "soberania" | null>(null);

  const openModal = (type: "sobre" | "como" | "soberania") => setActiveModal(type);
  const closeModal = () => setActiveModal(null);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-2xl p-8 sm:p-12 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/20 p-4 rounded-full">
                <GraduationCap className="size-12 text-primary" />
              </div>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-2">
              Cidadela de Jogos
            </h1>
            <p className="text-muted-foreground text-lg">
              Entretenimento que transforma mentes
            </p>
          </div>

          {/* Mensagem educativa */}
          <div className="space-y-6 mb-8">
            <p className="text-center text-foreground leading-relaxed">
              Nossos jogos são desenvolvidos para ajudar no ensino de{" "}
              <span className="text-primary font-semibold">tática</span>,{" "}
              <span className="text-primary font-semibold">raciocínio lógico</span> e{" "}
              <span className="text-primary font-semibold">gestão financeira</span>{" "}
              para nossas crianças e educação.
            </p>

            <p className="text-center text-muted-foreground leading-relaxed">
              São jogos educativos e informativos que visam transformar o modo de
              pensar e o raciocínio para ser mais estratégico e evoluir o QI.
            </p>
          </div>

          {/* Cards de benefícios */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-surface/50 border border-border rounded-xl p-4 text-center">
              <Brain className="size-8 text-emerald-400 mx-auto mb-2" />
              <h3 className="font-semibold text-sm mb-1">Raciocínio</h3>
              <p className="text-xs text-muted-foreground">Desenvolve pensamento lógico</p>
            </div>
            <div className="bg-surface/50 border border-border rounded-xl p-4 text-center">
              <Target className="size-8 text-amber-400 mx-auto mb-2" />
              <h3 className="font-semibold text-sm mb-1">Tática</h3>
              <p className="text-xs text-muted-foreground">Estratégia e planejamento</p>
            </div>
            <div className="bg-surface/50 border border-border rounded-xl p-4 text-center">
              <TrendingUp className="size-8 text-sky-400 mx-auto mb-2" />
              <h3 className="font-semibold text-sm mb-1">Gestão</h3>
              <p className="text-xs text-muted-foreground">Controle financeiro</p>
            </div>
          </div>

          {/* Botões Saiba Mais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <InfoButton onClick={() => openModal("sobre")} label="Sobre a Pracinha" className="justify-center" />
            <InfoButton onClick={() => openModal("como")} label="Como Jogar" className="justify-center" />
            <InfoButton onClick={() => openModal("soberania")} label="Soberania" className="justify-center" />
          </div>

          {/* Botão Continuar */}
          <button
            onClick={onContinue}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
          >
            Continuar
          </button>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Aprenda brincando • Evolua seu QI • Divirta-se
          </p>
        </div>
      </div>

      {/* Modais de Informação */}
      <InfoModal
        isOpen={activeModal === "sobre"}
        onClose={closeModal}
        title="Sobre a Pracinha Online"
        content={SEO_CONTENT.sobrePracinha}
      />
      <InfoModal
        isOpen={activeModal === "como"}
        onClose={closeModal}
        title="Como Jogar"
        content={SEO_CONTENT.comoJogar}
      />
      <InfoModal
        isOpen={activeModal === "soberania"}
        onClose={closeModal}
        title="Economia da Soberania"
        content={SEO_CONTENT.soberania}
      />
    </div>
  );
}
