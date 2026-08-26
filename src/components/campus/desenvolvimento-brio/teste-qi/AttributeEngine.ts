/**
 * Motor de atributos para geração de matrizes de QI
 * Tradução do Attribute.py do I-RAVEN para TypeScript
 */

import {
  NUM_VALUES,
  NUM_MIN,
  NUM_MAX,
  UNI_VALUES,
  UNI_MIN,
  UNI_MAX,
  TYPE_VALUES,
  TYPE_MIN,
  TYPE_MAX,
  SIZE_VALUES,
  SIZE_MIN,
  SIZE_MAX,
  COLOR_VALUES,
  COLOR_MIN,
  COLOR_MAX,
  ANGLE_VALUES,
  ANGLE_MIN,
  ANGLE_MAX,
} from "./iqConstants";

/**
 * Classe base para atributos
 */
class Attribute {
  name: string;
  valueLevel: number;
  values: number[] | string[];
  minLevel: number;
  maxLevel: number;
  previousValues: number[] = [];

  constructor(
    name: string,
    values: number[] | string[],
    minLevel: number,
    maxLevel: number,
    defaultValue: number = 0
  ) {
    this.name = name;
    this.values = values;
    this.minLevel = minLevel;
    this.maxLevel = maxLevel;
    this.valueLevel = defaultValue;
  }

  sample(minLevel?: number, maxLevel?: number): void {
    const actualMin = minLevel !== undefined ? Math.max(this.minLevel, minLevel) : this.minLevel;
    const actualMax = maxLevel !== undefined ? Math.min(this.maxLevel, maxLevel) : this.maxLevel;
    const range = actualMax - actualMin + 1;
    this.valueLevel = actualMin + Math.floor(Math.random() * range);
  }

  sampleNew(minLevel?: number, maxLevel?: number, previousValues?: number[]): number {
    const actualMin = minLevel !== undefined ? Math.min(this.minLevel, minLevel) : this.minLevel;
    const actualMax = maxLevel !== undefined ? Math.min(this.maxLevel, maxLevel) : this.maxLevel;
    const values: number[] = [];
    for (let i = actualMin; i <= actualMax; i++) {
      values.push(i);
    }

    const constraints = previousValues || this.previousValues;
    const available = new Set(values);
    available.delete(this.valueLevel);
    constraints.forEach((v) => available.delete(v));

    if (available.size === 0) {
      throw new Error("No available values to sample");
    }

    const availableArray = Array.from(available);
    const idx = Math.floor(Math.random() * availableArray.length);
    return availableArray[idx]!;
  }

  getValueLevel(): number {
    return this.valueLevel;
  }

  setValueLevel(valueLevel: number): void {
    this.valueLevel = valueLevel;
  }

  getValue(valueLevel?: number): number | string | boolean {
    const level = valueLevel !== undefined ? valueLevel : this.valueLevel;
    return this.values[level]!;
  }
}

/**
 * Atributo Number - quantidade de entidades
 */
export class NumberAttribute extends Attribute {
  constructor(minLevel: number = NUM_MIN, maxLevel: number = NUM_MAX) {
    super("Number", NUM_VALUES, minLevel, maxLevel, 0);
  }
}

/**
 * Atributo Type - tipo da forma geométrica
 */
export class TypeAttribute extends Attribute {
  constructor(minLevel: number = TYPE_MIN, maxLevel: number = TYPE_MAX) {
    super("Type", [...TYPE_VALUES], minLevel, maxLevel, 0);
  }

  override getValue(valueLevel?: number): string {
    const level = valueLevel !== undefined ? valueLevel : this.valueLevel;
    return this.values[level] as string;
  }
}

/**
 * Atributo Size - tamanho da forma
 */
export class SizeAttribute extends Attribute {
  constructor(minLevel: number = SIZE_MIN, maxLevel: number = SIZE_MAX) {
    super("Size", SIZE_VALUES, minLevel, maxLevel, 3);
  }
}

/**
 * Atributo Color - cor da forma
 */
export class ColorAttribute extends Attribute {
  constructor(minLevel: number = COLOR_MIN, maxLevel: number = COLOR_MAX) {
    super("Color", COLOR_VALUES, minLevel, maxLevel, 0);
  }
}

/**
 * Atributo Angle - rotação da forma
 */
export class AngleAttribute extends Attribute {
  constructor(minLevel: number = ANGLE_MIN, maxLevel: number = ANGLE_MAX) {
    super("Angle", ANGLE_VALUES, minLevel, maxLevel, 3);
  }
}

/**
 * Atributo Uniformity - se entidades são uniformes
 */
export class UniformityAttribute extends Attribute {
  constructor(minLevel: number = UNI_MIN, maxLevel: number = UNI_MAX) {
    super("Uniformity", UNI_VALUES.map((v) => (v ? 1 : 0)), minLevel, maxLevel, 0);
  }

  override getValue(valueLevel?: number): boolean {
    const level = valueLevel !== undefined ? valueLevel : this.valueLevel;
    return (this.values[level] as number) === 1;
  }

  override sampleNew(): number {
    // Uniformity nunca é ressampleada — mantém o nível atual (como no I-RAVEN).
    return this.valueLevel;
  }
}

/**
 * Atributo Position - posição das entidades no layout
 */
export class PositionAttribute {
  name: string;
  posType: "planar" | "angular";
  values: number[][];
  valueIdx: number[] | null = null;
  isChanged: boolean = false;
  previousValues: number[][] = [];

  constructor(posType: "planar" | "angular", posList: number[][]) {
    this.name = "Position";
    this.posType = posType;
    this.values = posList;
  }

  sample(num: number): void {
    const length = this.values.length;
    if (num > length) {
      throw new Error("Cannot sample more positions than available");
    }

    const indices = new Set<number>();
    while (indices.size < num) {
      indices.add(Math.floor(Math.random() * length));
    }
    this.valueIdx = Array.from(indices);
  }

  sampleNew(num: number, previousValues?: number[][]): number[] {
    const length = this.values.length;
    const constraints = previousValues || this.previousValues;

    while (true) {
      const indices = new Set<number>();
      while (indices.size < num) {
        indices.add(Math.floor(Math.random() * length));
      }
      const newValueIdx = Array.from(indices);

      // Verificar se é diferente do valor atual
      if (this.valueIdx && this.setsEqual(new Set(newValueIdx), new Set(this.valueIdx))) {
        continue;
      }

      // Verificar se é diferente de valores anteriores
      let finished = true;
      for (const prev of constraints) {
        if (this.setsEqual(new Set(newValueIdx), new Set(prev))) {
          finished = false;
          break;
        }
      }

      if (finished) {
        return newValueIdx;
      }
    }
  }

  sampleAdd(num: number): number[][] {
    const ret: number[][] = [];
    const available = new Set<number>();
    for (let i = 0; i < this.values.length; i++) {
      available.add(i);
    }
    if (this.valueIdx) {
      this.valueIdx.forEach((v) => available.delete(v));
    }

    const toAdd = Array.from(available).sort(() => Math.random() - 0.5).slice(0, num);
    for (const index of toAdd) {
      if (this.valueIdx) {
        this.valueIdx.unshift(index);
      }
      ret.push(this.values[index]!);
    }
    return ret;
  }

  getValueIdx(): number[] | null {
    return this.valueIdx;
  }

  setValueIdx(valueIdx: number[]): void {
    this.valueIdx = valueIdx;
  }

  getValue(valueIdx?: number[]): number[][] {
    const idx = valueIdx !== undefined ? valueIdx : this.valueIdx;
    if (!idx) return [];
    return idx.map((i) => this.values[i]!);
  }

  private setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }
}
