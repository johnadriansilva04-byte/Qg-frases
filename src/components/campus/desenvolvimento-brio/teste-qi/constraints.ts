/**
 * Poda de constraints em função das regras sorteadas — tradução de
 * constraints.py (rule_constraint). Garante que, após aplicar as regras
 * duas vezes por linha, os níveis permanecem dentro das faixas válidas.
 */
import { ANGLE_MAX, ANGLE_MIN } from './constants';
import type { EntityConstraint, LayoutConstraint, MatrixRule } from './types';

export interface Bounds {
  numMin: number;
  numMax: number;
  uniMin: number;
  uniMax: number;
  typeMin: number;
  typeMax: number;
  sizeMin: number;
  sizeMax: number;
  colorMin: number;
  colorMax: number;
}

export interface PrunedConstraints {
  layout: LayoutConstraint;
  entity: EntityConstraint;
}

/**
 * Aplica as restrições de um grupo de regras sobre os limites originais.
 * Retorna null quando a combinação é impossível (faixa vazia), o que faz
 * o motor re-sorteair as regras (equivalente ao prune() retornando None).
 */
export function ruleConstraint(rules: MatrixRule[], b: Bounds): PrunedConstraints | null {
  let { numMin, numMax, uniMin, uniMax, typeMin, typeMax, sizeMin, sizeMax, colorMin, colorMax } = b;

  for (const rule of rules) {
    if (rule.name === 'Progression') {
      const v = rule.value;
      switch (rule.attr) {
        case 'Number':
          if (v > 0) numMax -= v * 2; else numMin -= v * 2;
          break;
        case 'Position':
          // Progressão de posição = rolagem pelas posições do layout.
          numMax -= Math.abs(v) * 2;
          break;
        case 'Type':
          if (v > 0) typeMax -= v * 2; else typeMin -= v * 2;
          break;
        case 'Size':
          if (v > 0) sizeMax -= v * 2; else sizeMin -= v * 2;
          break;
        case 'Color':
          if (v > 0) colorMax -= v * 2; else colorMin -= v * 2;
          break;
      }
    } else if (rule.name === 'Arithmetic') {
      switch (rule.attr) {
        case 'Number':
          if (rule.value > 0) numMax = numMax - numMin - 1;
          else numMin = 2 * numMin + 1;
          break;
        case 'Position':
          // SET_UNION: pelo menos duas configurações de posição.
          if (rule.value > 0) numMax = numMax - 1;
          // SET_DIFF: garante sobreposição e resultado não vazio.
          else {
            numMin = Math.floor((numMax + 2) / 2) - 1;
            numMax = numMax - 1;
          }
          break;
        case 'Size':
          if (rule.value > 0) sizeMax = sizeMax - sizeMin - 1;
          else sizeMin = 2 * sizeMin + 1;
          break;
        case 'Color':
          // São necessárias ao menos duas cores distintas.
          if (colorMax - colorMin < 1) colorMax = colorMin - 1;
          else if (rule.value > 0) colorMax = colorMax - colorMin;
          else colorMin = 2 * colorMin;
          break;
      }
    } else if (rule.name === 'Distribute_Three') {
      // Sem ao menos 3 valores possíveis, a regra é inválida.
      switch (rule.attr) {
        case 'Number':
          if (numMax - numMin + 1 < 3) numMax = numMin - 1;
          break;
        case 'Position':
          if (numMax + 1 < 3) numMax = numMin - 1;
          else numMax = numMax - 1;
          break;
        case 'Type':
          if (typeMax - typeMin + 1 < 3) typeMax = typeMin - 1;
          break;
        case 'Size':
          if (sizeMax - sizeMin + 1 < 3) sizeMax = sizeMin - 1;
          break;
        case 'Color':
          if (colorMax - colorMin + 1 < 3) colorMax = colorMin - 1;
          break;
      }
    }
  }

  if (numMin > numMax || uniMin > uniMax || typeMin > typeMax || sizeMin > sizeMax || colorMin > colorMax) {
    return null;
  }
  return {
    layout: { Number: [numMin, numMax], Uni: [uniMin, uniMax] },
    // O original (rule_constraint) não poda Angle: sempre retorna a faixa completa.
    entity: { Type: [typeMin, typeMax], Size: [sizeMin, sizeMax], Color: [colorMin, colorMax], Angle: [ANGLE_MIN, ANGLE_MAX] },
  };
}
