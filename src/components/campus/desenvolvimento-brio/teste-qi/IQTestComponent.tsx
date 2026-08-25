/**
 * Componente principal do teste de QI
 * Integra geração, renderização e interação
 */

import React, { useState, useEffect } from "react";
import { generateIQProblem } from "./MatrixGenerator";
import { IQMatrixRenderer } from "./IQRenderer";
import { IQAnswersRenderer } from "./IQRenderer";
import type { IQProblem } from "./iqTypes";

interface IQTestComponentProps {
  onProblemComplete?: (correct: boolean, timeTaken: number) => void;
  showSolution?: boolean;
}

export const IQTestComponent: React.FC<IQTestComponentProps> = ({ onProblemComplete, showSolution = false }) => {
  const [problem, setProblem] = useState<IQProblem | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(true);

  // Gerar novo problema ao montar
  useEffect(() => {
    generateNewProblem();
  }, []);

  const generateNewProblem = () => {
    setIsGenerating(true);
    setSelectedAnswer(null);
    setShowAnswer(false);

    // Pequeno delay para permitir que a UI atualize
    setTimeout(() => {
      try {
        const newProblem = generateIQProblem();
        setProblem(newProblem);
        setStartTime(Date.now());
      } catch (error) {
        console.error("Erro ao gerar problema:", error);
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  };

  const handleAnswerSelect = (answerIdx: number) => {
    if (showAnswer || !problem) return;

    setSelectedAnswer(answerIdx);
    const timeTaken = Date.now() - startTime;
    const correct = answerIdx === problem.correctAnswer;

    if (onProblemComplete) {
      onProblemComplete(correct, timeTaken);
    }

    if (showSolution) {
      setShowAnswer(true);
    }
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleNewProblem = () => {
    generateNewProblem();
  };

  if (isGenerating || !problem) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Gerando problema de QI...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      <h2 className="text-2xl font-bold text-gray-800">Teste de QI - Matrizes de Progressão</h2>

      {/* Matriz 3x3 */}
      <IQMatrixRenderer matrix={problem.matrix} />

      {/* Opções de resposta */}
      <div className="w-full">
        <h3 className="text-lg font-semibold mb-2 text-center">Selecione a resposta correta:</h3>
        <IQAnswersRenderer
          answers={problem.answers}
          onAnswerSelect={handleAnswerSelect}
          selectedAnswer={selectedAnswer ?? undefined}
          showAnswer={showAnswer}
          correctAnswer={problem.correctAnswer}
        />
      </div>

      {/* Controles */}
      <div className="flex gap-4">
        {!showAnswer && selectedAnswer !== null && !showSolution && (
          <button
            onClick={handleShowAnswer}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Mostrar Resposta
          </button>
        )}
        <button
          onClick={handleNewProblem}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Novo Problema
        </button>
      </div>

      {/* Feedback */}
      {showAnswer && selectedAnswer !== null && (
        <div className={`text-lg font-semibold ${selectedAnswer === problem.correctAnswer ? "text-green-600" : "text-red-600"}`}>
          {selectedAnswer === problem.correctAnswer ? "✓ Correto!" : "✗ Incorreto!"}
        </div>
      )}
    </div>
  );
};
