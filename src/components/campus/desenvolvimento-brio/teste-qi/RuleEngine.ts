/**
 * Motor de regras para geração de matrizes de QI
 * Tradução do Rule.py do I-RAVEN para TypeScript
 */

import type { Panel, MatrixRule } from "./iqTypes";
import { RuleName, AttributeName, COLOR_MAX, COLOR_MIN } from "./iqConstants";

/**
 * Classe base para regras
 */
abstract class Rule {
  name: RuleName;
  attr: AttributeName;
  params: number[] | null;
  componentIdx: number;
  value: number = 0;

  constructor(name: RuleName, attr: AttributeName, params: number[] | null, componentIdx: number = 0) {
    this.name = name;
    this.attr = attr;
    this.params = params;
    this.componentIdx = componentIdx;
    this.sample();
  }

  sample(): void {
    if (this.params !== null && this.params.length > 0) {
      const idx = Math.floor(Math.random() * this.params.length);
      this.value = this.params[idx]!;
    }
  }

  abstract applyRule(aot: Panel, inAot?: Panel): Panel;
}

/**
 * Regra Constant - nada muda
 */
export class ConstantRule extends Rule {
  applyRule(aot: Panel, inAot?: Panel): Panel {
    return inAot ? JSON.parse(JSON.stringify(inAot)) : JSON.parse(JSON.stringify(aot));
  }
}

/**
 * Regra Progression - diferença constante entre painéis consecutivos
 */
export class ProgressionRule extends Rule {
  private firstCol: boolean = true;

  applyRule(aot: Panel, inAot?: Panel): Panel {
    const target = inAot || aot;
    const result = JSON.parse(JSON.stringify(target)) as Panel;

    // Implementação simplificada - precisa ser expandida com a lógica completa
    // do Python, manipulando os atributos das entidades

    this.firstCol = !this.firstCol;
    return result;
  }
}

/**
 * Regra Arithmetic - operação binária (Panel_3 = Panel_1 + Panel_2)
 */
export class ArithmeticRule extends Rule {
  private memory: number[] = [];
  private colorCount: number = 0;
  private colorWhiteAlarm: boolean = false;

  applyRule(aot: Panel, inAot?: Panel): Panel {
    const target = inAot || aot;
    const result = JSON.parse(JSON.stringify(target)) as Panel;

    // Implementação simplificada - precisa ser expandida com a lógica completa
    // do Python, incluindo a lógica especial para cores

    return result;
  }
}

/**
 * Regra Distribute_Three - três valores fixos distribuídos nas colunas
 */
export class DistributeThreeRule extends Rule {
  private valueLevels: number[][][] = [];
  private count: number = 0;

  applyRule(aot: Panel, inAot?: Panel): Panel {
    const target = inAot || aot;
    const result = JSON.parse(JSON.stringify(target)) as Panel;

    // Implementação simplificada - precisa ser expandida com a lógica completa
    // do Python

    this.count = (this.count + 1) % 6;
    return result;
  }
}

/**
 * Factory para criar regras
 */
export function createRule(name: RuleName, attr: AttributeName, param: number[] | null, componentIdx: number): Rule {
  switch (name) {
    case "Constant":
      return new ConstantRule(name, attr, param, componentIdx);
    case "Progression":
      return new ProgressionRule(name, attr, param, componentIdx);
    case "Arithmetic":
      return new ArithmeticRule(name, attr, param, componentIdx);
    case "Distribute_Three":
      return new DistributeThreeRule(name, attr, param, componentIdx);
    default:
      throw new Error(`Unsupported rule: ${name}`);
  }
}
