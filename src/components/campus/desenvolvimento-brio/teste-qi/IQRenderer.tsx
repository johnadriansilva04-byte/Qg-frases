/**
 * Renderizador visual para matrizes de QI usando SVG
 * Baseado no rendering.py do I-RAVEN
 */

import React from "react";
import type { Panel, Entity, ShapeType } from "./iqTypes";
import { TYPE_VALUES, SIZE_VALUES, COLOR_VALUES, ANGLE_VALUES, IMAGE_SIZE, DEFAULT_WIDTH } from "./iqConstants";

interface IQRendererProps {
  panel: Panel;
  size?: number;
}

/**
 * Componente para renderizar uma forma geométrica
 */
const ShapeRenderer: React.FC<{ entity: Entity; size: number }> = ({ entity, size }) => {
  const { bbox, attributes } = entity;
  const type = attributes.type as ShapeType;
  const sizeValue = SIZE_VALUES[attributes.size];
  const colorValue = COLOR_VALUES[attributes.color];
  const angleValue = ANGLE_VALUES[attributes.angle];

  // Converter coordenadas normalizadas para pixels
  const x = bbox[1] * size;
  const y = bbox[0] * size;
  const w = bbox[2] * size;
  const h = bbox[3] * size;
  const centerX = x;
  const centerY = y;
  const unit = Math.min(w, h) / 2;
  const scale = unit * sizeValue;

  // Cor (invertida como no original)
  const color = `rgb(${255 - colorValue}, ${255 - colorValue}, ${255 - colorValue})`;
  const stroke = "rgb(0, 0, 0)";
  const strokeWidth = DEFAULT_WIDTH;

  // Rotação
  const transform = `rotate(${angleValue}, ${centerX}, ${centerY})`;

  const renderShape = () => {
    switch (type) {
      case "triangle":
        const hTri = scale * Math.sqrt(3) / 2;
        return (
          <polygon
            points={`${centerX},${centerY - scale} ${centerX + scale / 2},${centerY + hTri / 2} ${centerX - scale / 2},${centerY + hTri / 2}`}
            fill={colorValue > 0 ? color : "none"}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );

      case "square":
        const halfSquare = scale / Math.sqrt(2);
        return (
          <rect
            x={centerX - halfSquare}
            y={centerY - halfSquare}
            width={halfSquare * 2}
            height={halfSquare * 2}
            fill={colorValue > 0 ? color : "none"}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );

      case "pentagon":
        const pentagonPoints = [];
        for (let i = 0; i < 5; i++) {
          const angle = (-Math.PI / 2) + (2 * Math.PI * i) / 5;
          pentagonPoints.push(`${centerX + scale * Math.cos(angle)},${centerY + scale * Math.sin(angle)}`);
        }
        return (
          <polygon
            points={pentagonPoints.join(" ")}
            fill={colorValue > 0 ? color : "none"}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );

      case "hexagon":
        const hexagonPoints = [];
        for (let i = 0; i < 6; i++) {
          const angle = (2 * Math.PI * i) / 6;
          hexagonPoints.push(`${centerX + scale * Math.cos(angle)},${centerY + scale * Math.sin(angle)}`);
        }
        return (
          <polygon
            points={hexagonPoints.join(" ")}
            fill={colorValue > 0 ? color : "none"}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );

      case "circle":
        return (
          <circle
            cx={centerX}
            cy={centerY}
            r={scale}
            fill={colorValue > 0 ? color : "none"}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );

      case "none":
      default:
        return null;
    }
  };

  return <g transform={transform}>{renderShape()}</g>;
};

/**
 * Componente para renderizar um painel completo
 */
export const IQPanelRenderer: React.FC<IQRendererProps> = ({ panel, size = IMAGE_SIZE }) => {
  const entities = panel.structure.components.flatMap((c) => c.layout.entities);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ backgroundColor: "white" }}>
      {/* Renderizar estrutura se necessário */}
      {panel.structure.name === "Left_Right" && <line x1={size / 2} y1={0} x2={size / 2} y2={size} stroke="black" strokeWidth={2} />}
      {panel.structure.name === "Up_Down" && <line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke="black" strokeWidth={2} />}

      {/* Renderizar entidades */}
      {entities.map((entity, idx) => (
        <ShapeRenderer key={entity.name || idx} entity={entity} size={size} />
      ))}
    </svg>
  );
};

/**
 * Componente para renderizar a matriz 3x3
 */
interface IQMatrixRendererProps {
  matrix: Panel[][];
  onAnswerSelect?: (answer: number) => void;
  selectedAnswer?: number;
  showAnswer?: boolean;
  correctAnswer?: number;
}

export const IQMatrixRenderer: React.FC<IQMatrixRendererProps> = ({
  matrix,
  onAnswerSelect,
  selectedAnswer,
  showAnswer = false,
  correctAnswer,
}) => {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Matriz 3x3 */}
      <div className="grid grid-cols-3 gap-1 bg-gray-300 p-1">
        {matrix.map((row, rowIdx) =>
          row.map((panel, colIdx) => {
            const isEmpty = rowIdx === 2 && colIdx === 2;
            return (
              <div
                key={`${rowIdx}-${colIdx}`}
                className={`bg-white ${isEmpty ? "border-2 border-dashed border-gray-400" : ""}`}
                style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
              >
                {isEmpty ? (
                  <div className="flex items-center justify-center h-full text-gray-400">?</div>
                ) : (
                  <IQPanelRenderer panel={panel} />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

/**
 * Componente para renderizar as opções de resposta
 */
interface IQAnswersRendererProps {
  answers: Array<{ panel: Panel; isCorrect: boolean }>;
  onAnswerSelect?: (answer: number) => void;
  selectedAnswer?: number;
  showAnswer?: boolean;
  correctAnswer?: number;
}

export const IQAnswersRenderer: React.FC<IQAnswersRendererProps> = ({
  answers,
  onAnswerSelect,
  selectedAnswer,
  showAnswer = false,
  correctAnswer,
}) => {
  return (
    <div className="grid grid-cols-4 gap-2">
      {answers.map((answer, idx) => {
        const isSelected = selectedAnswer === idx;
        const isCorrect = answer.isCorrect;
        const showCorrect = showAnswer && isCorrect;
        const showWrong = showAnswer && isSelected && !isCorrect;

        return (
          <div
            key={idx}
            onClick={() => onAnswerSelect && onAnswerSelect(idx)}
            className={`cursor-pointer border-2 transition-all ${
              isSelected ? "border-blue-500 bg-blue-50" : "border-gray-300"
            } ${showCorrect ? "border-green-500 bg-green-50" : ""} ${showWrong ? "border-red-500 bg-red-50" : ""}`}
            style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
          >
            <IQPanelRenderer panel={answer.panel} />
          </div>
        );
      })}
    </div>
  );
};
