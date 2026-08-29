/**
 * Constantes do motor — tradução direta de const.py (I-RAVEN).
 */
import type { RuleAttr, RuleName, ShapeType } from './types';

/** Tamanho virtual do painel em px (o SVG usa viewBox, então escala livre). */
export const IMAGE_SIZE = 160;
export const DEFAULT_WIDTH = 2;
export const MAX_COMPONENTS = 2;

/** Quantidade de entidades por painel: nível k => k+1 entidades. */
export const NUM_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export const NUM_MIN = 0;
export const NUM_MAX = NUM_VALUES.length - 1;

/** Uniformidade: 75% dos painéis têm entidades heterogêneas. */
export const UNI_VALUES = [false, false, false, true] as const;
export const UNI_MIN = 0;
export const UNI_MAX = UNI_VALUES.length - 1;

export const TYPE_VALUES: readonly ShapeType[] = ['none', 'triangle', 'square', 'pentagon', 'hexagon', 'circle'];
export const TYPE_MIN = 0;
export const TYPE_MAX = TYPE_VALUES.length - 1;

export const SIZE_VALUES = [0.55, 0.65, 0.75, 0.85, 0.95, 1.05] as const;
export const SIZE_MIN = 0;
export const SIZE_MAX = SIZE_VALUES.length - 1;

/** Escala de cinza: nível 0 = branco (255) ... nível 9 = preto (0). */
export const COLOR_VALUES = [255, 224, 196, 168, 140, 112, 84, 56, 28, 0] as const;
export const COLOR_MIN = 0;
export const COLOR_MAX = COLOR_VALUES.length - 1;

export const ANGLE_VALUES = [-135, -90, -45, 0, 45, 90, 135, 180] as const;
export const ANGLE_MIN = 0;
export const ANGLE_MAX = ANGLE_VALUES.length - 1;

/**
 * Tabela regra × atributo (RULE_ATTR do const.py).
 * O grupo 0 (Number/Position) tem prioridade: exatamente uma regra desse
 * grupo é sorteada por componente, seguida de uma regra para Type, Size e Color.
 * O 3º elemento é a lista de parâmetros possíveis para sorteio (null = sem parâmetro).
 */
export const RULE_ATTR: ReadonlyArray<ReadonlyArray<readonly [RuleName, RuleAttr, readonly number[] | null]>> = [
  [
    ['Progression', 'Number', [-2, -1, 1, 2]],
    ['Progression', 'Position', [-2, -1, 1, 2]],
    ['Arithmetic', 'Number', [1, -1]],
    ['Arithmetic', 'Position', [1, -1]],
    ['Distribute_Three', 'Number', null],
    ['Distribute_Three', 'Position', null],
    ['Constant', 'Number/Position', null],
  ],
  [
    ['Progression', 'Type', [-2, -1, 1, 2]],
    ['Distribute_Three', 'Type', null],
    ['Constant', 'Type', null],
  ],
  [
    ['Progression', 'Size', [-2, -1, 1, 2]],
    ['Arithmetic', 'Size', [1, -1]],
    ['Distribute_Three', 'Size', null],
    ['Constant', 'Size', null],
  ],
  [
    ['Progression', 'Color', [-2, -1, 1, 2]],
    ['Arithmetic', 'Color', [1, -1]],
    ['Distribute_Three', 'Color', null],
    ['Constant', 'Color', null],
  ],
];
