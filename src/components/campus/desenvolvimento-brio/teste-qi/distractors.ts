/**
 * Geração de distratores imparciais — a contribuição central do I-RAVEN
 * (SRAN, Hu et al., AAAI 2021): cada opção incorreta difere da resposta
 * em atributos específicos, eliminando o viés estatístico do RAVEN original.
 *
 * Tradução de sampling.py (sample_attr_avail) + main.py (bloco de
 * candidates) + AoT.py (Layout._sample_new_value / _apply_new_value).
 */
import { sampleNewLevel } from './layouts';
import { clone, comb, irange, Rng } from './rng';
import { sampleNewPositions } from './rules';
import type { LayoutState, MatrixRule, PanelState } from './types';

export type DistractorAttr = 'Number' | 'Position' | 'Type' | 'Size' | 'Color';

export interface ModifiableAttr {
  componentIdx: number;
  attr: DistractorAttr;
  /** Quantas modificações distintas ainda são possíveis. */
  times: number;
  minLevel: number | null;
  maxLevel: number | null;
  /** Consistência de valor dentro do painel (attr_uni do original). */
  uni: boolean | null;
}

/**
 * Lista os atributos que podem ser modificados na resposta sem violar as
 * regras (sample_attr_avail do sampling.py).
 */
export function sampleAttrAvail(ruleGroups: MatrixRule[][], answer: PanelState): ModifiableAttr[] {
  const ret: ModifiableAttr[] = [];
  for (let i = 0; i < ruleGroups.length; i++) {
    const group = ruleGroups[i]!;
    const layout = answer.components[i]!.layout;
    const uni = layout.uniformity;
    const num = layout.numberLevel + 1;
    const mostNum = layout.posList.length;
    const [numMin, numMax] = layout.origLayoutConstraint.Number;

    const rule0 = group[0]!;
    const numTimes = irange(numMin, numMax)
      .filter((k) => k + 1 !== num)
      .reduce((acc, k) => acc + comb(mostNum, k + 1), 0);
    if (numTimes > 0) {
      ret.push({ componentIdx: i, attr: 'Number', times: numTimes, minLevel: numMin, maxLevel: numMax, uni: null });
    }
    // Com regra sobre Position (ou Constant), Position também é modificável.
    if (rule0.attr !== 'Number') {
      const posTimes = comb(mostNum, num) - 1;
      if (posTimes > 0) {
        ret.push({ componentIdx: i, attr: 'Position', times: posTimes, minLevel: null, maxLevel: null, uni: null });
      }
    }

    for (let j = 1; j < group.length; j++) {
      const rule = group[j]!;
      const attr = rule.attr as DistractorAttr;
      const [minLevel, maxLevel] = layout.origEntityConstraint[attr as 'Type' | 'Size' | 'Color'];
      const times = maxLevel - minLevel;
      if (times <= 0) continue;
      if (rule.name === 'Constant') {
        // Só é modificável se o valor for consistente no painel.
        if (uni || group[0]!.name === 'Constant'
          || (group[0]!.attr === 'Position' && (group[0]!.name === 'Progression' || group[0]!.name === 'Distribute_Three'))) {
          ret.push({ componentIdx: i, attr, times, minLevel, maxLevel, uni });
        }
      } else {
        ret.push({ componentIdx: i, attr, times, minLevel, maxLevel, uni: true });
      }
    }
  }
  return ret;
}

type NewValue = Array<number | number[]>;

/** Sorteia um novo valor para o atributo (Layout._sample_new_value). */
function sampleNewValue(rng: Rng, answer: PanelState, attr: ModifiableAttr, mode3: string | null): NewValue {
  const layout = answer.components[attr.componentIdx]!.layout;

  switch (attr.attr) {
    case 'Number': {
      const prevNum = layout.numberLevel + 1;
      let valueLevel = layout.numberLevel;
      for (let attempt = 0; attempt < 10000; attempt++) {
        valueLevel = sampleNewLevel(rng, layout.numberLevel, attr.minLevel!, attr.maxLevel!);
        const counter = layout.sampleNewNumCount[valueLevel];
        if (mode3 === '3-Position-Number' && counter && counter[0] === 1) continue;
        if ((layout.numCount[valueLevel] ?? 1) === 1) {
          layout.numCount[valueLevel] = 0;
          break;
        }
      }
      const newNum = valueLevel + 1;
      // Seleciona quais entidades existentes serão mantidas/duplicadas.
      let select: number[];
      if (prevNum >= newNum) {
        select = rng.sample(irange(0, prevNum - 1), newNum);
      } else {
        select = [];
        let rest = newNum;
        while (prevNum < rest) {
          select.push(...irange(0, prevNum - 1));
          rest -= prevNum;
        }
        if (rest > 0) select.push(...rng.sample(irange(0, prevNum - 1), rest));
      }
      const ret: NewValue = [valueLevel, select];
      const t = mode3 === '3-Position-Number' ? 2 : 1;
      for (let i = 0; i < t; i++) {
        const counter = layout.sampleNewNumCount[valueLevel];
        const seen = counter ? counter[1] : [];
        const idx = sampleNewPositions(rng, layout.posList.length, newNum, layout.posIdx, seen);
        if (counter) {
          counter[0] -= 1;
          counter[1].push([...idx].sort((a, b) => a - b).join(','));
        }
        ret.push(idx);
      }
      // Esgotou os níveis de quantidade: reinicia os disponíveis.
      const remaining = Object.values(layout.numCount).reduce((a, b) => a + b, 0);
      if (remaining === 1) {
        for (const key of Object.keys(layout.numCount)) {
          if ((layout.sampleNewNumCount[+key]?.[0] ?? 0) > 0) layout.numCount[+key] = 1;
        }
      }
      return ret;
    }
    case 'Position': {
      return [sampleNewPositions(rng, layout.posList.length, layout.numberLevel + 1, layout.posIdx)];
    }
    case 'Type':
    case 'Size':
    case 'Color': {
      const field = `${attr.attr.toLowerCase()}Level` as 'typeLevel' | 'sizeLevel' | 'colorLevel';
      if (attr.uni) {
        return [sampleNewLevel(rng, layout.entities[0]![field], attr.minLevel!, attr.maxLevel!)];
      }
      return layout.entities.map((e) => sampleNewLevel(rng, e[field], attr.minLevel!, attr.maxLevel!));
    }
  }
}

/** Aplica o novo valor a um clone da resposta (Layout._apply_new_value). */
function applyNewValue(panel: PanelState, attr: ModifiableAttr, value: NewValue): void {
  const layout: LayoutState = panel.components[attr.componentIdx]!.layout;

  switch (attr.attr) {
    case 'Number': {
      const level = value[0] as number;
      const select = value[1] as number[];
      const posIdx = (value.length === 4 && layout.positionChanged ? value[3] : value[2]) as number[];
      layout.numberLevel = level;
      layout.posIdx = posIdx;
      const kept = select.map((i) => clone(layout.entities[i]!));
      layout.entities = posIdx.map((p, i) => {
        const e = kept[i]!;
        e.name = String(i);
        e.bbox = layout.posList[p]!;
        return e;
      });
      break;
    }
    case 'Position': {
      layout.posIdx = value[0] as number[];
      layout.positionChanged = true;
      layout.entities.forEach((e, i) => { e.bbox = layout.posList[layout.posIdx[i]!]!; });
      break;
    }
    case 'Type':
    case 'Size':
    case 'Color': {
      const field = `${attr.attr.toLowerCase()}Level` as 'typeLevel' | 'sizeLevel' | 'colorLevel';
      layout.entities.forEach((e, i) => { e[field] = (value[i % value.length]) as number; });
      break;
    }
  }
}

/**
 * Gera as 8 opções (resposta + 7 distratores) — bloco de candidates do main.py.
 * Retorna as opções embaralhadas e o índice da resposta correta.
 */
export function generateOptions(
  rng: Rng,
  answer: PanelState,
  ruleGroups: MatrixRule[][],
): { options: PanelState[]; answerIndex: number } {
  const modifiable = sampleAttrAvail(ruleGroups, answer);
  const attrNum = 3;

  let selected: ModifiableAttr[];
  if (attrNum <= modifiable.length) {
    selected = rng.sample(modifiable, attrNum);
  } else {
    selected = modifiable.slice();
  }

  // Conveniência do I-RAVEN: Number por último; se Position também estiver
  // presente, ativa o modo especial 'Position-Number'.
  let mode: string | null = null;
  const numPos = selected.findIndex((a) => a.attr === 'Number');
  if (numPos >= 0) {
    [selected[numPos], selected[selected.length - 1]] = [selected[selected.length - 1]!, selected[numPos]!];
    if (selected.some((a) => a.attr === 'Position')) mode = 'Position-Number';
  }

  const candidates: PanelState[] = [answer];
  if (selected.length >= 3) {
    const mode3 = mode === 'Position-Number' ? '3-Position-Number' : null;
    for (let i = 0; i < attrNum; i++) {
      const attr = selected[i]!;
      const value = sampleNewValue(rng, answer, attr, mode3);
      const clones = candidates.map((c) => {
        const n = clone(c);
        applyNewValue(n, attr, value);
        return n;
      });
      candidates.push(...clones);
    }
  } else if (selected.length === 2) {
    const first = selected[0]!;
    const value = sampleNewValue(rng, answer, first, null);
    const c0 = clone(answer);
    applyNewValue(c0, first, value);
    candidates.push(c0);

    const second = selected[1]!;
    const [ran, qu] = mode === 'Position-Number' ? [6, 1] : [3, 2];
    for (let i = 0; i < ran; i++) {
      const v = sampleNewValue(rng, answer, second, null);
      for (let j = 0; j < qu; j++) {
        const c = clone(candidates[j]!);
        applyNewValue(c, second, v);
        candidates.push(c);
      }
    }
  } else if (selected.length === 1) {
    const attr = selected[0]!;
    for (let i = 0; i < 7; i++) {
      const value = sampleNewValue(rng, answer, attr, null);
      const c = clone(answer);
      applyNewValue(c, attr, value);
      candidates.push(c);
    }
  }

  rng.shuffle(candidates);
  return { options: candidates, answerIndex: candidates.indexOf(answer) };
}
