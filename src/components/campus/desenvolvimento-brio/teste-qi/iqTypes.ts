/**
 * Tipos e interfaces para o motor de geração de matrizes de QI
 */

import type { ShapeType, RuleName, AttributeName } from "./iqConstants";

// Atributos de uma forma geométrica
export interface ShapeAttributes {
  type: ShapeType;
  size: number; // index em SIZE_VALUES
  color: number; // index em COLOR_VALUES
  angle: number; // index em ANGLE_VALUES
}

// Bounding box de uma entidade [x, y, w, h] ou [x, y, w, h, x_c, y_c, omega]
export type BBox = [number, number, number, number] | [number, number, number, number, number, number, number];

// Posição no layout
export interface Position {
  type: "planar" | "angular";
  values: BBox[];
  valueIdx: number[];
}

// Entidade individual na matriz
export interface Entity {
  name: string;
  bbox: BBox;
  attributes: ShapeAttributes;
}

// Layout de um painel
export interface Layout {
  number: number; // quantidade de entidades
  position: Position;
  uniformity: boolean; // se todas as entidades têm os mesmos atributos
  entities: Entity[];
}

// Componente de um painel
export interface Component {
  name: string;
  layout: Layout;
}

// Estrutura de um painel
export interface Structure {
  name: string;
  components: Component[];
}

// Painel completo
export interface Panel {
  structure: Structure;
}

// Regra aplicada
export interface MatrixRule {
  name: RuleName;
  attr: AttributeName;
  param: number[] | null;
  componentIdx: number;
}

// Configuração de restrições
export interface LayoutConstraint {
  Number: [number, number];
  Position: ["planar" | "angular", BBox[]];
  Uni: [number, number];
}

export interface EntityConstraint {
  Type: [number, number];
  Size: [number, number];
  Color: [number, number];
  Angle: [number, number];
}

// Matriz 3x3 de painéis
export type Matrix3x3 = Panel[][];

// Opção de resposta
export interface AnswerOption {
  panel: Panel;
  isCorrect: boolean;
}

// Problema completo de QI
export interface IQProblem {
  matrix: Matrix3x3;
  answers: AnswerOption[];
  correctAnswer: number;
  rules: MatrixRule[][];
}
