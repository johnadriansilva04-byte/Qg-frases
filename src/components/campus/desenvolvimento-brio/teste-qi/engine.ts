/**
 * Motor de geração de problemas — tradução do pipeline de main.py (I-RAVEN):
 * sorteia regras → poda constraints → instancia o painel inicial → aplica
 * as regras por linha → gera os 7 distratores imparciais.
 */
import { PrunedConstraints, ruleConstraint } from './constraints';
import { generateOptions } from './distractors';
import { instantiateLayout, instantiatePanel, LayoutTemplate, PANEL_TEMPLATES, resampleLayout } from './layouts';
import { Rng } from './rng';
import { createRule, sampleRules } from './rules';
import type { ConfigName, GeneratedProblem, MatrixRule, PanelState } from './types';

export class RavenEngine {
  private readonly rng: Rng;

  constructor(seed?: number) {
    this.rng = new Rng(seed);
  }

  /** Gera um problema completo (matriz 3x3 + 8 opções). */
  generateProblem(config?: ConfigName): GeneratedProblem {
    const configName = config ?? this.rng.choice(Object.keys(PANEL_TEMPLATES) as ConfigName[]);
    const template = PANEL_TEMPLATES[configName];

    // 1. Sorteia regras até que sejam compatíveis com a configuração (prune).
    let ruleGroups: MatrixRule[][] | null = null;
    let pruned: PrunedConstraints[] | null = null;
    // Em configurações de painel único (ex.: In/Out), só Constant em Number/Position
    // é válido: o sorteio pode levar centenas de tentativas (while True no original).
    for (let attempt = 0; attempt < 100000 && !pruned; attempt++) {
      const candidate = sampleRules(this.rng);
      if (candidate.length !== template.components.length) continue;
      const constraints = this.prune(template.components.map((c) => c.layout), candidate);
      if (constraints) {
        ruleGroups = candidate;
        pruned = constraints;
      }
    }
    if (!ruleGroups || !pruned) {
      throw new Error(`Não foi possível sortear regras válidas para ${configName}`);
    }

    // 2. Instancia o painel inicial (start_node).
    const start = instantiatePanel(
      this.rng,
      template.structure,
      template.components.map((c, i) => ({
        name: c.name,
        layout: instantiateLayout(this.rng, c.layout, pruned[i]!.layout, pruned[i]!.entity),
      })),
    );

    // 3. Constrói as 3 linhas aplicando as regras (main.py: blocos row_*).
    const ruleInstances = ruleGroups.map((g) => g.map(createRule));
    const rows: PanelState[][] = [];
    for (let r = 0; r < 3; r++) {
      const col1 = structuredClone(start);
      if (r > 0) {
        for (const comp of col1.components) resampleLayout(this.rng, comp.layout, true);
      }
      let toMerge: PanelState[] = [];
      for (let l = 0; l < ruleInstances.length; l++) {
        const group = ruleInstances[l]!;
        let col2 = group[0]!.apply(this.rng, col1);
        let col3 = group[0]!.apply(this.rng, col2);
        for (let i = 1; i < group.length; i++) col2 = group[i]!.apply(this.rng, col1, col2);
        for (let i = 1; i < group.length; i++) col3 = group[i]!.apply(this.rng, col2, col3);
        if (l === 0) {
          toMerge = [col1, col2, col3];
        } else {
          toMerge[1]!.components[l] = col2.components[l]!;
          toMerge[2]!.components[l] = col3.components[l]!;
        }
      }
      rows.push(toMerge);
    }

    const context = [
      rows[0]![0]!, rows[0]![1]!, rows[0]![2]!,
      rows[1]![0]!, rows[1]![1]!, rows[1]![2]!,
      rows[2]![0]!, rows[2]![1]!,
    ];
    const answer = rows[2]![2]!;

    // 4. Distratores imparciais (a contribuição do I-RAVEN).
    const { options, answerIndex } = generateOptions(this.rng, answer, ruleGroups);

    return {
      config: configName,
      structure: template.structure,
      context,
      options,
      answerIndex,
      rules: ruleGroups.flat(),
    };
  }

  /** Poda as constraints de cada componente; null se alguma ficar vazia. */
  private prune(layouts: LayoutTemplate[], ruleGroups: MatrixRule[][]): PrunedConstraints[] | null {
    const out: PrunedConstraints[] = [];
    for (let i = 0; i < layouts.length; i++) {
      const t = layouts[i]!;
      const result = ruleConstraint(ruleGroups[i]!, {
        numMin: t.numberBounds[0]!,
        numMax: t.numberBounds[1]!,
        uniMin: t.uniBounds[0]!,
        uniMax: t.uniBounds[1]!,
        typeMin: t.entityConstraint.Type[0]!,
        typeMax: t.entityConstraint.Type[1]!,
        sizeMin: t.entityConstraint.Size[0]!,
        sizeMax: t.entityConstraint.Size[1]!,
        colorMin: t.entityConstraint.Color[0]!,
        colorMax: t.entityConstraint.Color[1]!,
      });
      if (!result) return null;
      out.push(result);
    }
    return out;
  }
}
