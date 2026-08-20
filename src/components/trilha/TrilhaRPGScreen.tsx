import { Trophy, Sparkles, ChevronRight, MessageSquare } from "lucide-react";
import { useState } from "react";

interface TrilhaRPGScreenProps {
  resultado: "vitoria" | "derrota" | "empate";
  fase: string;
  onContinue: () => void;
}

export function TrilhaRPGScreen({ resultado, fase, onContinue }: TrilhaRPGScreenProps) {
  const [mostrarInteracao, setMostrarInteracao] = useState(false);

  const getTitulo = () => {
    if (resultado === "vitoria") {
      return "Vitória Estratégica!";
    } else if (resultado === "derrota") {
      return "Derrota Tática";
    }
    return "Empate";
  };

  const getDescricao = () => {
    if (resultado === "vitoria") {
      return "Sua estratégia foi impecável. O Pracinha reconhece seu talento tático.";
    } else if (resultado === "derrota") {
      return "O oponente superou sua estratégia desta vez. Aprenda com a derrota.";
    }
    return "Um confronto equilibrado. Ambos os lados mostraram determinação.";
  };

  const getNPC = () => {
    if (resultado === "vitoria") {
      return {
        nome: "Pracinha",
        cargo: "Guardião da Cidadela",
        avatar: "🤖",
        mensagem: "Excelente movimentação! Sua tática impressionou o comando. Continue assim e alcançará patentes superiores.",
      };
    }
    return {
      nome: "Pracinha",
      cargo: "Guardião da Cidadela",
      avatar: "🤖",
      mensagem: "Nem toda batalha é vencida. Analise seus movimentos e ajuste sua estratégia. A persistência é a chave.",
    };
  };

  const npc = getNPC();

  if (mostrarInteracao) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 p-4">
        <div className="max-w-lg w-full">
          <div className="bg-surface/80 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl">
            {/* NPC Avatar */}
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-emerald-500/20 p-4 rounded-full">
                <span className="text-4xl">{npc.avatar}</span>
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">{npc.nome}</h2>
                <p className="text-sm text-emerald-400">{npc.cargo}</p>
              </div>
            </div>

            {/* Mensagem do NPC */}
            <div className="bg-surface/50 rounded-lg p-4 mb-6 border border-border/50">
              <p className="text-foreground leading-relaxed">{npc.mensagem}</p>
            </div>

            {/* Botão de interação com ControlledMonetagButton */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  // Aqui seria o ControlledMonetagButton
                  onContinue();
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                Conhecer Novo Contato
              </button>
              <button
                onClick={onContinue}
                className="w-full bg-secondary/70 hover:bg-secondary text-foreground font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                Voltar ao Quartel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-lg w-full">
        <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Conteúdo de resultado */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className={`${resultado === "vitoria" ? "bg-yellow-500/20" : resultado === "derrota" ? "bg-red-500/20" : "bg-blue-500/20"} p-4 rounded-full`}>
                <Trophy className={`w-16 h-16 ${resultado === "vitoria" ? "text-yellow-500" : resultado === "derrota" ? "text-red-500" : "text-blue-500"}`} />
              </div>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
              {getTitulo()}
            </h1>
            <p className="text-lg sm:text-xl text-primary font-semibold mb-2">
              Fase {fase}
            </p>
            <p className="text-muted-foreground text-sm sm:text-base">
              {getDescricao()}
            </p>
          </div>

          {/* Stats */}
          <div className="bg-surface/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold text-foreground">Progresso</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className="text-lg font-bold text-primary">
                {resultado === "vitoria" ? "+10 XP" : resultado === "derrota" ? "+2 XP" : "+5 XP"}
              </span>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="space-y-3">
            <button
              onClick={() => setMostrarInteracao(true)}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              Interagir com o Pracinha
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={onContinue}
              className="w-full bg-secondary/70 hover:bg-secondary text-foreground font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
