import { Trophy, Sparkles, ChevronRight, MessageSquare, X } from "lucide-react";
import { useState } from "react";
import { MatchEndAdCard } from "@/components/MatchEndAdCard";

interface TrilhaRPGScreenProps {
  resultado: "vitoria" | "derrota" | "empate";
  fase: string;
  onContinue: () => void;
}

export function TrilhaRPGScreen({ resultado, fase, onContinue }: TrilhaRPGScreenProps) {
  const [mostrarInteracao, setMostrarInteracao] = useState(false);

  const getTitulo = () => {
    if (resultado === "vitoria") return "Vitória Estratégica!";
    if (resultado === "derrota") return "Derrota Tática";
    return "Empate";
  };

  const getDescricao = () => {
    if (resultado === "vitoria") return "Sua estratégia foi impecável. O Pracinha reconhece seu talento tático.";
    if (resultado === "derrota") return "O oponente superou sua estratégia desta vez. Aprenda com a derrota.";
    return "Um confronto equilibrado. Ambos os lados mostraram determinação.";
  };

  const getNPC = () => ({
    nome: "Pracinha",
    cargo: "Guardião da Cidadela",
    avatar: "🤖",
    mensagem: resultado === "vitoria"
      ? "Excelente movimentação! Sua tática impressionou o comando. Continue assim e alcançará patentes superiores."
      : "Nem toda batalha é vencida. Analise seus movimentos e ajuste sua estratégia. A persistência é a chave.",
  });

  const npc = getNPC();
  const isVictory = resultado === "vitoria";

  if (mostrarInteracao) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
        <div className="max-w-lg w-full">
          <div className="bg-gradient-to-b from-[#0f172a] to-[#1e293b] border border-emerald-500/20 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <span className="text-3xl">{npc.avatar}</span>
              </div>
              <div>
                <h2 className="font-display text-lg font-black text-white tracking-wide">{npc.nome}</h2>
                <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">{npc.cargo}</p>
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-6">
              <p className="text-sm text-white/80 leading-relaxed">{npc.mensagem}</p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => onContinue()}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                Conhecer Novo Contato
              </button>
              <button
                onClick={onContinue}
                className="w-full bg-white/[0.04] border border-white/10 text-white/60 hover:bg-white/[0.08] hover:text-white/80 font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="max-w-lg w-full">
        <div className="bg-gradient-to-b from-[#0f172a] to-[#1e293b] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Icon */}
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5 ${isVictory ? "bg-amber-500/15 border border-amber-500/25" : resultado === "derrota" ? "bg-red-500/15 border border-red-500/25" : "bg-blue-500/15 border border-blue-500/25"}`}>
            <Trophy className={`w-10 h-10 ${isVictory ? "text-amber-400" : resultado === "derrota" ? "text-red-400" : "text-blue-400"}`} />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-black text-white tracking-tight mb-1">{getTitulo()}</h1>
          <p className="text-sm font-bold text-white/50 mb-4">Fase {fase}</p>
          <p className="text-xs text-white/40 leading-relaxed mb-6">{getDescricao()}</p>

          {/* Stats */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Progresso</span>
            </div>
            <span className="text-lg font-black text-white/80">
              {isVictory ? "+10 XP" : resultado === "derrota" ? "+2 XP" : "+5 XP"}
            </span>
          </div>

          {/* Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => setMostrarInteracao(true)}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 text-sm"
            >
              Interagir com o Pracinha
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onContinue}
              className="w-full bg-white/[0.04] border border-white/10 text-white/60 hover:bg-white/[0.08] hover:text-white/80 font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
              Continuar
            </button>
          </div>

          <div className="mt-4">
            <MatchEndAdCard />
          </div>
        </div>
      </div>
    </div>
  );
}
