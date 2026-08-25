/**
 * Constantes para o motor de geração de matrizes de QI (I-RAVEN)
 * Baseado no arquivo const.py do I-RAVEN
 */

// Parâmetros do canvas
export const IMAGE_SIZE = 160;
export const CENTER = { x: IMAGE_SIZE / 2, y: IMAGE_SIZE / 2 };
export const DEFAULT_RADIUS = IMAGE_SIZE / 4;
export const DEFAULT_WIDTH = 2;

// Valores de atributos
export const NUM_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const NUM_MIN = 0;
export const NUM_MAX = NUM_VALUES.length - 1;

export const UNI_VALUES = [false, false, false, true];
export const UNI_MIN = 0;
export const UNI_MAX = UNI_VALUES.length - 1;

export const TYPE_VALUES = ["none", "triangle", "square", "pentagon", "hexagon", "circle"] as const;
export type ShapeType = typeof TYPE_VALUES[number];
export const TYPE_MIN = 0;
export const TYPE_MAX = TYPE_VALUES.length - 1;

export const SIZE_VALUES = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
export const SIZE_MIN = 0;
export const SIZE_MAX = SIZE_VALUES.length - 1;

export const COLOR_VALUES = [255, 224, 196, 168, 140, 112, 84, 56, 28, 0];
export const COLOR_MIN = 0;
export const COLOR_MAX = COLOR_VALUES.length - 1;

export const ANGLE_VALUES = [-135, -90, -45, 0, 45, 90, 135, 180];
export const ANGLE_MIN = 0;
export const ANGLE_MAX = ANGLE_VALUES.length - 1;

// Estruturas de regras
export const META_TARGET_FORMAT = [
  "Constant",
  "Progression",
  "Arithmetic",
  "Distribute_Three",
  "Number",
  "Position",
  "Type",
  "Size",
  "Color",
] as const;

export const META_STRUCTURE_FORMAT = [
  "Singleton",
  "Left_Right",
  "Up_Down",
  "Out_In",
  "Left",
  "Right",
  "Up",
  "Down",
  "Out",
  "In",
  "Grid",
  "Center_Single",
  "Distribute_Four",
  "Distribute_Nine",
  "Left_Center_Single",
  "Right_Center_Single",
  "Up_Center_Single",
  "Down_Center_Single",
  "Out_Center_Single",
  "In_Center_Single",
  "In_Distribute_Four",
] as const;

// Configuração de regras por atributo
export const RULE_ATTR = [
  [
    ["Progression", "Number", [-2, -1, 1, 2]],
    ["Progression", "Position", [-2, -1, 1, 2]],
    ["Arithmetic", "Number", [1, -1]],
    ["Arithmetic", "Position", [1, -1]],
    ["Distribute_Three", "Number", null],
    ["Distribute_Three", "Position", null],
    ["Constant", "Number/Position", null],
  ],
  [
    ["Progression", "Type", [-2, -1, 1, 2]],
    ["Distribute_Three", "Type", null],
    ["Constant", "Type", null],
  ],
  [
    ["Progression", "Size", [-2, -1, 1, 2]],
    ["Arithmetic", "Size", [1, -1]],
    ["Distribute_Three", "Size", null],
    ["Constant", "Size", null],
  ],
  [
    ["Progression", "Color", [-2, -1, 1, 2]],
    ["Arithmetic", "Color", [1, -1]],
    ["Distribute_Three", "Color", null],
    ["Constant", "Color", null],
  ],
] as const;

export type RuleName = "Constant" | "Progression" | "Arithmetic" | "Distribute_Three";
export type AttributeName = "Number" | "Position" | "Type" | "Size" | "Color";
