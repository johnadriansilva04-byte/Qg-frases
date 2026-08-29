/**
 * Teste de QI — motor procedural I-RAVEN (completo) integrado ao React.
 *
 * Usa o RavenEngine (types/rules/engine/distractors) para gerar problemas
 * reais de matrizes 3x3 com 7 distratores imparciais, renderiza via SVG
 * responsivo e, após cada resposta, mostra a explicação pedagógica das
 * regras ocultas e concede recompensas em SALVE ($SOVEREIGN).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { BrainCircuit, Lightbulb, Sparkles } from "lucide-react";
import { RavenEngine } from "./engine";
import { renderMatrix, renderPanel } from "./renderer/svgRenderer";
import { explainProblem, EDUCATIONAL_DISCLAIMER, type RuleExplanation } from "./pedagogy";
import { computeSalveReward, SALVE_CURRENCY, type SalveReward } from "./rewards";
import type { GeneratedProblem } from "./types";

interface IQTestComponentProps {
  onProblemComplete?: (correct: boolean, timeTaken: number) => void;
  /** Chamado com o total de SALVE ganho em cada desafio (0 em caso de erro). */
  onReward?: (amount: number, rewards: SalveReward[]) => void;
  showSolution?: boolean;
}

export const IQTestComponent: React.FC<IQTestComponentProps> = ({
  onProblemComplete,
  onReward,
  showSolution = true,
}) => {
  const engineRef = useRef<RavenEngine | null>(null);
  if (!engineRef.current) engineRef.current = new RavenEngine();

  const [problem, setProblem] = useState<GeneratedProblem | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [explanations, setExplanations] = useState<RuleExplanation[]>([]);
  const [lastRewards, setLastRewards] = useState<SalveReward[]>([]);
  const [streak, setStreak] = useState(0);
  const [startTime, setStartTime] = useState(0);

  const generateNewProblem = useCallback(() => {
    setSelected(null);
    setShowAnswer(false);
    setExplanations([]);
    setLastRewards([]);
    setProblem(engineRef.current!.generateProblem());
    setStartTime(Date.now());
  }, []);

  useEffect(() => {
    generateNewProblem();
  }, [generateNewProblem]);

  const handleSelect = (idx: number) => {
    if (showAnswer || !problem) return;
    setSelected(idx);
    const correct = idx === problem.answerIndex;
    const timeTaken = Date.now() - startTime;
    const newStreak = correct ? streak + 1 : 0;
    setStreak(newStreak);

    const rewards = computeSalveReward({ correct, firstTry: true, hintsUsed: 0, streak: newStreak });
    setLastRewards(rewards);
    const total = rewards.reduce((s, r) => s + r.amount, 0);
    if (total > 0 && onReward) onReward(total, rewards);

    setExplanations(explainProblem(problem));
    onProblemComplete?.(correct, timeTaken);
    if (showSolution) setShowAnswer(true);
  };

  if (!problem) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        Gerando desafio de raciocínio...
      </div>
    );
  }

  const correct = selected !== null && selected === problem.answerIndex;
  const salveTotal = lastRewards.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="flex flex-col items-center gap-4 p-2 md:p-4">
      <div className="flex items-center gap-2">
        <BrainCircuit className="h-5 w-5 text-emerald-500" />
        <h2 className="text-lg font-black text-foreground">Teste de QI — Matrizes de Raciocínio</h2>
      </div>

      <div className="grid w-full grid-cols-1 items-start justify-items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Matriz 3x3 (SVG responsivo) — maior e com moldura limpa */}
        <div
          className="w-full max-w-[520px] overflow-hidden rounded-xl border-2 border-emerald-500/30 bg-gradient-to-b from-white to-slate-50 shadow-xl shadow-emerald-500/5"
          dangerouslySetInnerHTML={{ __html: renderMatrix(problem) }}
        />

        {/* Opções clicáveis — ao lado da matriz em telas largas */}
        <div className="w-full">
          <h3 className="mb-3 text-center text-sm font-semibold text-muted-foreground">
            Selecione a peça que completa a matriz:
          </h3>
          <div className="mx-auto grid max-w-[420px] grid-cols-4 gap-2 lg:max-w-none">
            {problem.options.map((opt, idx) => {
              const isSelected = selected === idx;
              const isCorrect = idx === problem.answerIndex;
              const ring = showAnswer
                ? isCorrect
                  ? "ring-2 ring-emerald-500"
                  : isSelected
                    ? "ring-2 ring-red-500"
                    : ""
                : isSelected
                  ? "ring-2 ring-blue-500"
                  : "";
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(idx)}
                  disabled={showAnswer}
                  className={`overflow-hidden rounded-lg border border-border bg-white transition hover:border-emerald-500 hover:shadow-lg disabled:cursor-default ${ring}`}
                  aria-label={`Opção ${idx + 1}`}
                >
                  <span className="block w-full" dangerouslySetInnerHTML={{ __html: renderPanel(opt) }} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Feedback + recompensa */}
      {showAnswer && selected !== null && (
        <div className="w-full space-y-3">
          <div
            className={`rounded-lg border p-3 text-center text-sm font-bold ${
              correct
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/40 bg-red-500/10 text-red-400"
            }`}
          >
            {correct ? "✓ Correto!" : "✗ Incorreto — veja a explicação abaixo."}
            {correct && salveTotal > 0 && (
              <span className="ml-2 text-amber-400">
                +{salveTotal} {SALVE_CURRENCY.symbol}
              </span>
            )}
          </div>

          {lastRewards.length > 0 && correct && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
              <p className="mb-1 flex items-center gap-1 font-bold uppercase tracking-wide">
                <Sparkles className="h-3 w-3" /> Recompensas em {SALVE_CURRENCY.name}
              </p>
              {lastRewards.map((r, i) => (
                <p key={i}>
                  +{r.amount} {SALVE_CURRENCY.symbol} — {r.reason}
                </p>
              ))}
            </div>
          )}

          {/* Explicação pedagógica das regras ocultas */}
          {explanations.length > 0 && (
            <div className="rounded-lg border border-border bg-surface/50 p-3 text-xs text-muted-foreground">
              <p className="mb-2 flex items-center gap-1 font-bold uppercase tracking-wide text-foreground">
                <Lightbulb className="h-3 w-3 text-emerald-500" /> Regras ocultas deste desafio
              </p>
              <ul className="space-y-1">
                {explanations.map((e, i) => (
                  <li key={i}>
                    <span className="font-semibold text-foreground">{e.titulo}:</span> {e.explicacao}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] italic opacity-70">{EDUCATIONAL_DISCLAIMER}</p>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={generateNewProblem}
        className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-emerald-500"
      >
        Novo desafio
      </button>
    </div>
  );
};
