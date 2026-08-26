/**
 * Motor de regras — tradução de Rule.py (I-RAVEN) para TypeScript.
 *
 * Hierarquia de aplicação (main.py): para cada linha da matriz e cada
 * componente, a regra do grupo Number/Position é aplicada duas vezes
 * (col1→col2→col3) e depois as regras de Type/Size/Color são aplicadas
 * sobre os painéis resultantes. As instâncias de regra mantêm estado
 * interno (memória, contadores) entre as aplicações — como no original.
 */
import {
  COLOR_MAX, COLOR_MIN, MAX_COMPONENTS, NUM_MAX, NUM_MIN, RULE_ATTR,
  SIZE_MAX, SIZE_MIN,
} from './constants';
import { resampleEntity, resampleLayout, sampleLevel, sampleNewLevel } from './layouts';
import { clone, irange, Rng } from './rng';
import type { LayoutState, MatrixRule, PanelState } from './types';

export interface IRule {
  readonly spec: MatrixRule;
  /** Aplica a regra; quando `input` é omitido, equivale a apply(current, current). */
  apply(rng: Rng, current: PanelState, input?: PanelState): PanelState;
}

const layoutOf = (panel: PanelState, idx: number): LayoutState => panel.components[idx]!.layout;

/** Reconstrói as entidades de `second` a partir da 1ª entidade de `current`. */
function rebuildEntities(rng: Rng, current: LayoutState, second: LayoutState): void {
  second.entities = second.posIdx.map((p, i) => {
    const entity = clone(current.entities[0]!);
    entity.name = String(i);
    entity.bbox = second.posList[p]!;
    if (!current.uniformity) resampleEntity(rng, entity, current.entityConstraint);
    return entity;
  });
}

function samplePositions(rng: Rng, layout: LayoutState, count: number): number[] {
  return rng.sample(irange(0, layout.posList.length - 1), count);
}

/** Amostra nível de quantidade respeitando os limites globais (Number.sample). */
function sampleNumberLevel(rng: Rng, layout: LayoutState): number {
  const [min, max] = layout.layoutConstraint.Number;
  return rng.randint(Math.max(min, NUM_MIN), Math.min(max, NUM_MAX));
}

/** Sorteia um conjunto de posições diferente do atual e dos conjuntos anteriores. */
export function sampleNewPositions(
  rng: Rng,
  posListLength: number,
  count: number,
  currentIdx: readonly number[],
  previousKeys: readonly string[] = [],
): number[] {
  const keyOf = (idx: number[]) => [...idx].sort((a, b) => a - b).join(',');
  const currentKey = keyOf([...currentIdx]);
  for (let attempt = 0; attempt < 10000; attempt++) {
    const idx = rng.sample(irange(0, posListLength - 1), count);
    const key = keyOf(idx);
    if (key !== currentKey && !previousKeys.includes(key)) return idx;
  }
  throw new Error('sampleNewPositions: espaço de posições esgotado');
}

/** Sorteia as regras de um problema (sample_rules do sampling.py). */
export function sampleRules(rng: Rng): MatrixRule[][] {
  const numComponents = rng.randint(1, MAX_COMPONENTS);
  const groups: MatrixRule[][] = [];
  for (let i = 0; i < numComponents; i++) {
    const group: MatrixRule[] = [];
    for (const ruleAttrGroup of RULE_ATTR) {
      const [name, attr, params] = rng.choice(ruleAttrGroup);
      group.push({
        name,
        attr,
        value: params ? rng.choice(params) : 0,
        componentIdx: i,
      });
    }
    groups.push(group);
  }
  return groups;
}

/** Fábrica de instâncias com estado (Rule_Wrapper). */
export function createRule(spec: MatrixRule): IRule {
  switch (spec.name) {
    case 'Constant': return new ConstantRule(spec);
    case 'Progression': return new ProgressionRule(spec);
    case 'Arithmetic': return new ArithmeticRule(spec);
    case 'Distribute_Three': return new DistributeThreeRule(spec);
  }
}

class ConstantRule implements IRule {
  constructor(readonly spec: MatrixRule) {}
  apply(_rng: Rng, current: PanelState, input?: PanelState): PanelState {
    return clone(input ?? current);
  }
}

class ProgressionRule implements IRule {
  /** true na aplicação col1→col2: força consistência de valor na 1ª coluna. */
  private firstCol = true;

  constructor(readonly spec: MatrixRule) {}

  apply(rng: Rng, current: PanelState, input?: PanelState): PanelState {
    const ci = this.spec.componentIdx;
    const cur = layoutOf(current, ci);
    const second = clone(input ?? current);
    const sec = layoutOf(second, ci);

    switch (this.spec.attr) {
      case 'Number': {
        sec.numberLevel = sec.numberLevel + this.spec.value;
        sec.posIdx = samplePositions(rng, sec, sec.numberLevel + 1);
        rebuildEntities(rng, cur, sec);
        break;
      }
      case 'Position': {
        const n = sec.posList.length;
        sec.posIdx = sec.posIdx.map((i) => (((i + this.spec.value) % n) + n) % n);
        sec.entities.forEach((e, i) => { e.bbox = sec.posList[sec.posIdx[i]!]!; });
        break;
      }
      case 'Type':
      case 'Size':
      case 'Color': {
        const field = `${this.spec.attr.toLowerCase()}Level` as 'typeLevel' | 'sizeLevel' | 'colorLevel';
        const oldLevel = cur.entities[0]![field];
        if (this.firstCol && !cur.uniformity) {
          for (const e of cur.entities) e[field] = oldLevel;
        }
        for (const e of sec.entities) e[field] = oldLevel + this.spec.value;
        break;
      }
      default:
        throw new Error(`Progression não suporta o atributo ${this.spec.attr}`);
    }
    this.firstCol = !this.firstCol;
    return second;
  }
}

class ArithmeticRule implements IRule {
  /** Pilha com o valor da 1ª coluna entre as aplicações col1→col2→col3. */
  private memory: Array<number | number[]> = [];
  private colorCount = 0;
  private colorWhiteAlarm = false;

  constructor(readonly spec: MatrixRule) {}

  apply(rng: Rng, current: PanelState, input?: PanelState): PanelState {
    const ci = this.spec.componentIdx;
    const cur = layoutOf(current, ci);
    const second = clone(input ?? current);
    const sec = layoutOf(second, ci);

    switch (this.spec.attr) {
      case 'Number': this.applyNumber(rng, cur, sec); break;
      case 'Position': this.applyPosition(rng, cur, sec); break;
      case 'Size': this.applySize(rng, cur, sec); break;
      case 'Color': this.applyColor(rng, cur, sec); break;
      default:
        throw new Error(`Arithmetic não suporta o atributo ${this.spec.attr}`);
    }
    return second;
  }

  private applyNumber(rng: Rng, cur: LayoutState, sec: LayoutState): void {
    if (this.memory.length > 0) {
      // Terceira coluna: N3 = N1 ± N2.
      const firstLevel = this.memory.pop() as number;
      const total = this.spec.value > 0
        ? firstLevel + 1 + (cur.numberLevel + 1)
        : firstLevel + 1 - (cur.numberLevel + 1);
      sec.numberLevel = total - 1;
    } else {
      // Segunda coluna: restringe a faixa para a soma/diferença ser válida.
      const oldLevel = cur.numberLevel;
      this.memory.push(oldLevel);
      if (this.spec.value > 0) {
        const numMaxOrig = cur.layoutConstraint.Number[0] + cur.layoutConstraint.Number[1] + 1;
        sec.layoutConstraint.Number[1] = numMaxOrig - oldLevel - 1;
      } else {
        const numMinOrig = Math.floor((sec.layoutConstraint.Number[0] - 1) / 2);
        sec.layoutConstraint.Number = [numMinOrig, oldLevel - numMinOrig - 1];
      }
      sec.numberLevel = sampleNumberLevel(rng, sec);
    }
    sec.posIdx = samplePositions(rng, sec, sec.numberLevel + 1);
    rebuildEntities(rng, cur, sec);
  }

  private applyPosition(rng: Rng, cur: LayoutState, sec: LayoutState): void {
    if (this.memory.length > 0) {
      // Terceira coluna: value > 0 => UNIÃO (OR); value < 0 => DIFERENÇA (XOR-like).
      const firstIdx = this.memory.pop() as number[];
      const curSet = new Set(cur.posIdx);
      const result = this.spec.value > 0
        ? new Set([...firstIdx, ...curSet])
        : new Set([...firstIdx].filter((p) => !curSet.has(p)));
      sec.numberLevel = result.size - 1;
      sec.posIdx = [...result].sort((a, b) => a - b);
    } else {
      // Segunda coluna: sorteia posições que não sejam sub/superconjunto total.
      const curIdx = [...cur.posIdx];
      this.memory.push(curIdx);
      const curSet = new Set(curIdx);
      for (let attempt = 0; attempt < 10000; attempt++) {
        sec.numberLevel = sampleNumberLevel(rng, sec);
        sec.posIdx = samplePositions(rng, sec, sec.numberLevel + 1);
        const secSet = new Set(sec.posIdx);
        const secSubsetOfCur = [...secSet].every((p) => curSet.has(p));
        const curSubsetOfSec = [...curSet].every((p) => secSet.has(p));
        if (this.spec.value > 0 ? !secSubsetOfCur : !curSubsetOfSec) break;
      }
    }
    rebuildEntities(rng, cur, sec);
  }

  private applySize(rng: Rng, cur: LayoutState, sec: LayoutState): void {
    if (this.memory.length > 0) {
      const firstLevel = this.memory.pop() as number;
      const newLevel = this.spec.value > 0
        ? firstLevel + cur.entities[0]!.sizeLevel + 1
        : firstLevel - cur.entities[0]!.sizeLevel - 1;
      for (const e of sec.entities) e.sizeLevel = newLevel;
    } else {
      const oldLevel = cur.entities[0]!.sizeLevel;
      this.memory.push(oldLevel);
      if (!cur.uniformity) {
        for (const e of cur.entities) e.sizeLevel = oldLevel;
      }
      if (this.spec.value > 0) {
        const sizeMaxOrig = cur.entityConstraint.Size[0] + cur.entityConstraint.Size[1] + 1;
        sec.entityConstraint.Size[1] = sizeMaxOrig - oldLevel - 1;
      } else {
        const sizeMinOrig = Math.floor((cur.entityConstraint.Size[0] - 1) / 2);
        sec.entityConstraint.Size = [sizeMinOrig, oldLevel - sizeMinOrig - 1];
      }
      const [min, max] = sec.entityConstraint.Size;
      const newLevel = rng.randint(Math.max(min, SIZE_MIN), Math.min(max, SIZE_MAX));
      for (const e of sec.entities) e.sizeLevel = newLevel;
    }
  }

  private applyColor(rng: Rng, cur: LayoutState, sec: LayoutState): void {
    this.colorCount += 1;
    if (this.memory.length > 0) {
      const firstLevel = this.memory.pop() as number;
      const newLevel = this.spec.value > 0
        ? firstLevel + cur.entities[0]!.colorLevel
        : firstLevel - cur.entities[0]!.colorLevel;
      for (const e of sec.entities) e.colorLevel = newLevel;
      return;
    }
    // Evita o caso ambíguo em que a 2ª coluna ficaria toda branca (nível 0),
    // tornando impossível distinguir soma de subtração.
    let oldLevel = cur.entities[0]!.colorLevel;
    let resetCurrent = false;
    if (this.colorCount === 3 && this.colorWhiteAlarm) {
      if (this.spec.value > 0 && oldLevel === COLOR_MAX) {
        oldLevel = sampleNewLevel(rng, oldLevel, cur.entityConstraint.Color[0], cur.entityConstraint.Color[1]);
        resetCurrent = true;
      }
      if (this.spec.value < 0 && oldLevel === COLOR_MIN) {
        oldLevel = sampleNewLevel(rng, oldLevel, cur.entityConstraint.Color[0], cur.entityConstraint.Color[1]);
        resetCurrent = true;
      }
    }
    this.memory.push(oldLevel);
    if (resetCurrent || !cur.uniformity) {
      for (const e of cur.entities) e.colorLevel = oldLevel;
    }
    if (this.spec.value > 0) {
      const colorMaxOrig = cur.entityConstraint.Color[0] + cur.entityConstraint.Color[1];
      sec.entityConstraint.Color[1] = colorMaxOrig - oldLevel;
    } else {
      const colorMinOrig = Math.floor(sec.entityConstraint.Color[0] / 2);
      sec.entityConstraint.Color = [colorMinOrig, oldLevel];
    }
    const [min, max] = sec.entityConstraint.Color;
    let newLevel = rng.randint(Math.max(min, COLOR_MIN), Math.min(max, COLOR_MAX));
    if (this.colorCount === 1) this.colorWhiteAlarm = newLevel === 0;
    if (this.colorCount === 3 && this.colorWhiteAlarm && newLevel === 0) {
      newLevel = sampleNewLevel(rng, newLevel, Math.max(min, COLOR_MIN), Math.min(max, COLOR_MAX));
    }
    for (const e of sec.entities) e.colorLevel = newLevel;
  }
}

/** Célula da tabela de distribuição: nível escalar ou conjunto de posições. */
type Cell = number | number[];

class DistributeThreeRule implements IRule {
  /** Três linhas × três colunas com permutações cíclicas dos 3 valores. */
  private valueLevels: Cell[][] = [];
  private count = 0;

  constructor(readonly spec: MatrixRule) {}

  apply(rng: Rng, current: PanelState, input?: PanelState): PanelState {
    const ci = this.spec.componentIdx;
    const cur = layoutOf(current, ci);
    let second = clone(input ?? current);
    let sec = layoutOf(second, ci);

    switch (this.spec.attr) {
      case 'Number': {
        if (this.count === 0) {
          const all = irange(cur.layoutConstraint.Number[0], cur.layoutConstraint.Number[1])
            .filter((l) => l !== cur.numberLevel);
          const [a, b] = rng.sample(all, 2) as [number, number];
          this.pushRows(cur.numberLevel, a, b, rng);
          sec.numberLevel = this.valueLevels[0]![1] as number;
        } else {
          const [row, col] = [Math.floor(this.count / 2), this.count % 2];
          if (col === 0) {
            cur.numberLevel = this.valueLevels[row]![0] as number;
            resampleLayout(rng, cur, false);
            second = clone(current);
            sec = layoutOf(second, ci);
            sec.numberLevel = this.valueLevels[row]![1] as number;
          } else {
            sec.numberLevel = this.valueLevels[row]![2] as number;
          }
        }
        sec.posIdx = samplePositions(rng, sec, sec.numberLevel + 1);
        rebuildEntities(rng, cur, sec);
        break;
      }
      case 'Position': {
        if (this.count === 0) {
          const num = cur.numberLevel + 1;
          const pos0 = [...cur.posIdx];
          const pos1 = sampleNewPositions(rng, cur.posList.length, num, pos0);
          const pos2 = sampleNewPositions(rng, cur.posList.length, num, pos0, [keyOfPositions(pos1)]);
          this.pushRows(pos0, pos1, pos2, rng);
          sec.posIdx = [...(this.valueLevels[0]![1] as number[])];
        } else {
          const [row, col] = [Math.floor(this.count / 2), this.count % 2];
          if (col === 0) {
            cur.numberLevel = (this.valueLevels[row]![0] as number[]).length - 1;
            resampleLayout(rng, cur, false);
            cur.posIdx = [...(this.valueLevels[row]![0] as number[])];
            cur.entities.forEach((e, i) => { e.bbox = cur.posList[cur.posIdx[i]!]!; });
            second = clone(current);
            sec = layoutOf(second, ci);
            sec.posIdx = [...(this.valueLevels[row]![1] as number[])];
          } else {
            sec.posIdx = [...(this.valueLevels[row]![2] as number[])];
          }
        }
        sec.entities.forEach((e, i) => { e.bbox = sec.posList[sec.posIdx[i]!]!; });
        break;
      }
      case 'Type':
      case 'Size':
      case 'Color': {
        const field = `${this.spec.attr.toLowerCase()}Level` as 'typeLevel' | 'sizeLevel' | 'colorLevel';
        if (this.count === 0) {
          const all = irange(cur.entityConstraint[this.spec.attr][0], cur.entityConstraint[this.spec.attr][1]);
          const [a, b, c] = rng.sample(all, 3) as [number, number, number];
          this.pushRows(a, b, c, rng);
          for (const e of cur.entities) e[field] = this.valueLevels[0]![0] as number;
          for (const e of sec.entities) e[field] = this.valueLevels[0]![1] as number;
        } else {
          const [row, col] = [Math.floor(this.count / 2), this.count % 2];
          if (col === 0) {
            for (const e of cur.entities) e[field] = this.valueLevels[row]![0] as number;
            for (const e of sec.entities) e[field] = this.valueLevels[row]![1] as number;
          } else {
            for (const e of sec.entities) e[field] = this.valueLevels[row]![2] as number;
          }
        }
        break;
      }
      default:
        throw new Error(`Distribute_Three não suporta o atributo ${this.spec.attr}`);
    }
    this.count = (this.count + 1) % 6;
    return second;
  }

  /** Registra as 3 linhas como permutações cíclicas dos 3 valores (ordem aleatória). */
  private pushRows(a: Cell, b: Cell, c: Cell, rng: Rng): void {
    this.valueLevels = rng.next() >= 0.5
      ? [[a, b, c], [b, c, a], [c, a, b]]
      : [[a, b, c], [c, a, b], [b, c, a]];
  }
}

function keyOfPositions(idx: readonly number[]): string {
  return [...idx].sort((a, b) => a - b).join(',');
}
