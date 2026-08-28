/**
 * Gerador do banco de questões QI (EXERCÍCIOS × SIMULAÇÃO).
 *
 * Usa o motor procedural I-RAVEN (já existente em
 * src/components/campus/desenvolvimento-brio/teste-qi) com seeds fixos e
 * regras controladas por dificuldade para gerar:
 *   - 32 questões de SIMULAÇÃO  (mode = 'simulation', difficulty_order 1..7)
 *   - 24 questões de EXERCÍCIO  (mode = 'exercise',  difficulty_order 1..4)
 *
 * NUNCA uma questão de exercício é usada na simulação, e vice-versa: o
 * gerador grava mode em cada linha e o RPC qi_buscar_questoes filtra por
 * mode. As questões da simulação são as ÚNICAS da prova.
 *
 * Formato bancável (por questão):
 *   id, mode, difficulty, difficulty_order, category, matrix_data,
 *   options[6 {id, panel}], correct_option, active, version
 *
 * matrix_data = { cells: 8 painéis de contexto } (a 9ª célula é a resposta
 * — NÃO vai no banco, evita vazar a solução). options[].panel usa o
 * formato leve { structure?, entities[] } que o renderer desenha em SVG.
 *
 * Uso: node --import tsx testes/gerador-qi-seed.mts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { clone, Rng } from "../src/components/campus/desenvolvimento-brio/teste-qi/rng.ts";
import { PANEL_TEMPLATES, instantiateLayout, instantiatePanel, resampleLayout, sampleNewLevel } from "../src/components/campus/desenvolvimento-brio/teste-qi/layouts.ts";
import { ruleConstraint } from "../src/components/campus/desenvolvimento-brio/teste-qi/constraints.ts";
import { createRule, sampleNewPositions } from "../src/components/campus/desenvolvimento-brio/teste-qi/rules.ts";
import { generateOptions } from "../src/components/campus/desenvolvimento-brio/teste-qi/distractors.ts";
import type { ConfigName, MatrixRule, PanelState, RuleAttr, RuleName } from "../src/components/campus/desenvolvimento-brio/teste-qi/types.ts";

/* ------------------------------------------------------------------ */
/* Tipos locais de especificação.                                      */
/* ------------------------------------------------------------------ */

type Rule = readonly [name: RuleName, value: number];

export interface QuestaoSpec {
  id: string;
  /** 1..7 — deve crescer ao longo da prova. */
  difficulty_order: number;
  difficulty: string;
  category: string;
  config: ConfigName;
  /** Por componente; cada item é [attr, name, value] na ordem canônica. */
  rules: Array<Array<readonly [attr: RuleAttr, name: RuleName, value: number]>>;
  seed: number;
}

const P: RuleName = "Progression";
const A: RuleName = "Arithmetic";
const D: RuleName = "Distribute_Three";
const K: RuleName = "Constant";
const v1: Rule = [P, 1];
const vm1: Rule = [P, -1];
const v2: Rule = [P, 2];
const a1: Rule = [A, 1];
const am1: Rule = [A, -1];
const k0: Rule = [K, 0];
const d0: Rule = [D, 0];

/**
 * Constrói o grupo de regras de UM componente na ordem canônica do I-RAVEN:
 * índice 0 = regra de QUANTIDADE/POSIÇÃO (slot 0, atributo Number ou
 * Position), índice 1 = Type, índice 2 = Size, índice 3 = Color.
 */
function g0(
  attr0: "Number" | "Position",
  rule0: Rule,
  typ?: Rule,
  size?: Rule,
  color?: Rule,
): Array<readonly [RuleAttr, RuleName, number]> {
  const out: Array<readonly [RuleAttr, RuleName, number]> = [];
  out.push([attr0, rule0[0], rule0[1]]);
  if (typ) out.push(["Type", typ[0], typ[1]]);
  if (size) out.push(["Size", size[0], size[1]]);
  if (color) out.push(["Color", color[0], color[1]]);
  return out;
}

/* ------------------------------------------------------------------ */
/* Especificação das 32 questões de simulação (ordem ASC de dificuldade)*/
/* ------------------------------------------------------------------ */

export const SIMULATION_SPECS: QuestaoSpec[] = [
  // -- Q1-6 · ordem 1 · introdutório (padrões simples) --
  { id: "sim-01", difficulty_order: 1, difficulty: "introdutório", category: "Continuidade e quantidade", config: "center_single", rules: [g0("Number", k0)], seed: 101 },
  { id: "sim-02", difficulty_order: 1, difficulty: "introdutório", category: "Quantidade — um passo", config: "distribute_four", rules: [g0("Number", v1)], seed: 102 },
  { id: "sim-03", difficulty_order: 1, difficulty: "introdutório", category: "Quantidade — um passo", config: "distribute_four", rules: [g0("Number", vm1)], seed: 103 },
  { id: "sim-04", difficulty_order: 1, difficulty: "introdutório", category: "Sequência básica de forma", config: "center_single", rules: [g0("Number", k0, v1)], seed: 104 },
  { id: "sim-05", difficulty_order: 1, difficulty: "introdutório", category: "Posição — rolagem simples", config: "distribute_four", rules: [g0("Position", v1)], seed: 105 },
  { id: "sim-06", difficulty_order: 1, difficulty: "introdutório", category: "Quantidade e posição", config: "distribute_four", rules: [g0("Number", v1)], seed: 106 },

  // -- Q7-12 · ordem 2 · fácil/intermediário (alternância, rotação simples, reflexão) --
  { id: "sim-07", difficulty_order: 2, difficulty: "fácil/intermediário", category: "Progressão de quantidade", config: "distribute_nine", rules: [g0("Number", v2)], seed: 207 },
  { id: "sim-08", difficulty_order: 2, difficulty: "fácil/intermediário", category: "Alternância de forma", config: "center_single", rules: [g0("Number", k0, d0)], seed: 208 },
  { id: "sim-09", difficulty_order: 2, difficulty: "fácil/intermediário", category: "Rotação simples (posição)", config: "distribute_four", rules: [g0("Position", v1)], seed: 209 },
  { id: "sim-10", difficulty_order: 2, difficulty: "fácil/intermediário", category: "Reflexão no espelho", config: "left_center_single_right_center_single", rules: [g0("Number", k0, v1), g0("Number", k0, v1)], seed: 210 },
  { id: "sim-11", difficulty_order: 2, difficulty: "fácil/intermediário", category: "Relações entre elementos", config: "distribute_four", rules: [g0("Position", v1)], seed: 211 },
  { id: "sim-12", difficulty_order: 2, difficulty: "fácil/intermediário", category: "Combinação de dois padrões", config: "center_single", rules: [g0("Number", k0, v1)], seed: 212 },

  // -- Q13-18 · ordem 3 · intermediário (regras simultâneas/relações linha-coluna) --
  { id: "sim-13", difficulty_order: 3, difficulty: "intermediário", category: "Duas regras simultâneas", config: "distribute_four", rules: [g0("Number", v1, v1)], seed: 313 },
  { id: "sim-14", difficulty_order: 3, difficulty: "intermediário", category: "Relações entre linhas e colunas", config: "center_single", rules: [g0("Number", k0, d0)], seed: 314 },
  { id: "sim-15", difficulty_order: 3, difficulty: "intermediário", category: "Transformação de elementos", config: "center_single", rules: [g0("Number", k0, v1, v1)], seed: 315 },
  { id: "sim-16", difficulty_order: 3, difficulty: "intermediário", category: "Composição/decomposição", config: "left_center_single_right_center_single", rules: [g0("Number", k0, d0), g0("Number", k0, d0)], seed: 316 },
  { id: "sim-17", difficulty_order: 3, difficulty: "intermediário", category: "Regras simultâneas", config: "in_center_single_out_center_single", rules: [g0("Number", k0, v1), g0("Number", k0, v1)], seed: 317 },
  { id: "sim-18", difficulty_order: 3, difficulty: "intermediário", category: "Relações entre elementos", config: "distribute_four", rules: [g0("Number", a1)], seed: 318 },

  // -- Q19-24 · ordem 4 · intermediário/avançado (múltiplas regras) --
  { id: "sim-19", difficulty_order: 4, difficulty: "intermediário/avançado", category: "Múltiplas regras", config: "in_center_single_out_center_single", rules: [g0("Number", k0, v1), g0("Number", k0, vm1)], seed: 419 },
  { id: "sim-20", difficulty_order: 4, difficulty: "intermediário/avançado", category: "Rotação + quantidade", config: "distribute_four", rules: [g0("Position", v1, v1)], seed: 420 },
  { id: "sim-21", difficulty_order: 4, difficulty: "intermediário/avançado", category: "Posição + forma", config: "distribute_four", rules: [g0("Position", v1, d0)], seed: 421 },
  { id: "sim-22", difficulty_order: 4, difficulty: "intermediário/avançado", category: "Transformações combinadas", config: "center_single", rules: [g0("Number", k0, v1, a1)], seed: 422 },
  { id: "sim-23", difficulty_order: 4, difficulty: "intermediário/avançado", category: "Regras cruzadas", config: "in_distribute_four_out_center_single", rules: [g0("Number", k0, v1), g0("Number", k0, v1)], seed: 423 },
  { id: "sim-24", difficulty_order: 4, difficulty: "intermediário/avançado", category: "Padrões menos óbvios", config: "up_center_single_down_center_single", rules: [g0("Number", k0, v1, v1), g0("Number", k0, v1, v1)], seed: 424 },

  // -- Q25-28 · ordem 5 · avançado (abstração, relações implícitas) --
  { id: "sim-25", difficulty_order: 5, difficulty: "avançado", category: "Abstração — distribuição de três", config: "distribute_four", rules: [g0("Number", d0, v1, v1)], seed: 525 },
  { id: "sim-26", difficulty_order: 5, difficulty: "avançado", category: "Múltiplas operações simultâneas", config: "in_center_single_out_center_single", rules: [g0("Number", k0, v1), g0("Number", k0, vm1)], seed: 526 },
  { id: "sim-27", difficulty_order: 5, difficulty: "avançado", category: "Relações entre linhas e colunas", config: "center_single", rules: [g0("Number", k0, d0, v1)], seed: 527 },
  { id: "sim-28", difficulty_order: 5, difficulty: "avançado", category: "Regras implícitas", config: "up_center_single_down_center_single", rules: [g0("Number", k0, d0, v1), g0("Number", k0, v1)], seed: 528 },

  // -- Q29-32 · ordem 6 · muito avançado (as 4 mais difíceis, sempre no fim) --
  { id: "sim-29", difficulty_order: 6, difficulty: "muito avançado", category: "Abstração elevada", config: "in_distribute_four_out_center_single", rules: [g0("Number", k0, v1), g0("Position", v1, vm1)], seed: 629 },
  { id: "sim-30", difficulty_order: 6, difficulty: "muito avançado", category: "Múltiplas operações simultâneas", config: "distribute_four", rules: [g0("Number", v1, v1, a1)], seed: 630 },
  { id: "sim-31", difficulty_order: 6, difficulty: "muito avançado", category: "Composição de padrões", config: "up_center_single_down_center_single", rules: [g0("Number", k0, d0, a1), g0("Number", k0, v1, a1)], seed: 631 },
  { id: "sim-32", difficulty_order: 6, difficulty: "muito avançado", category: "Relações espaciais", config: "in_center_single_out_center_single", rules: [g0("Number", k0, d0), g0("Number", k0, v1)], seed: 632 },
];

export const EXERCISE_SPECS: QuestaoSpec[] = [
  { id: "ex-01", difficulty_order: 1, difficulty: "muito fácil", category: "Continuidade", config: "center_single", rules: [g0("Number", k0)], seed: 9001 },
  { id: "ex-02", difficulty_order: 1, difficulty: "muito fácil", category: "Quantidade", config: "distribute_four", rules: [g0("Number", v1)], seed: 9002 },
  { id: "ex-03", difficulty_order: 1, difficulty: "muito fácil", category: "Posição", config: "distribute_four", rules: [g0("Position", v1)], seed: 9003 },
  { id: "ex-04", difficulty_order: 1, difficulty: "muito fácil", category: "Sequência básica", config: "center_single", rules: [g0("Number", k0, v1)], seed: 9004 },
  { id: "ex-05", difficulty_order: 1, difficulty: "muito fácil", category: "Forma", config: "center_single", rules: [g0("Number", k0, v1)], seed: 9005 },
  { id: "ex-06", difficulty_order: 1, difficulty: "muito fácil", category: "Tamanho", config: "center_single", rules: [g0("Number", k0, undefined, v1)], seed: 9006 },

  { id: "ex-07", difficulty_order: 2, difficulty: "fácil", category: "Alternância", config: "center_single", rules: [g0("Number", k0, d0)], seed: 9007 },
  { id: "ex-08", difficulty_order: 2, difficulty: "fácil", category: "Rotação simples", config: "distribute_four", rules: [g0("Position", v1)], seed: 9008 },
  { id: "ex-09", difficulty_order: 2, difficulty: "fácil", category: "Sequência de quantidade", config: "distribute_four", rules: [g0("Number", v1)], seed: 9009 },
  { id: "ex-10", difficulty_order: 2, difficulty: "fácil", category: "Relações entre elementos", config: "left_center_single_right_center_single", rules: [g0("Number", k0, v1), g0("Number", k0, v1)], seed: 9010 },
  { id: "ex-11", difficulty_order: 2, difficulty: "fácil", category: "Transformação de forma", config: "center_single", rules: [g0("Number", k0, v1)], seed: 9011 },
  { id: "ex-12", difficulty_order: 2, difficulty: "fácil", category: "Combinação de padrões", config: "center_single", rules: [g0("Number", k0, d0)], seed: 9012 },

  { id: "ex-13", difficulty_order: 3, difficulty: "fácil/intermediário", category: "Duas regras", config: "distribute_four", rules: [g0("Number", v1, v1)], seed: 9013 },
  { id: "ex-14", difficulty_order: 3, difficulty: "fácil/intermediário", category: "Relações entre linhas", config: "center_single", rules: [g0("Number", k0, v1, v1)], seed: 9014 },
  { id: "ex-15", difficulty_order: 3, difficulty: "fácil/intermediário", category: "Composição/decomposição", config: "left_center_single_right_center_single", rules: [g0("Number", k0, d0), g0("Number", k0, d0)], seed: 9015 },
  { id: "ex-16", difficulty_order: 3, difficulty: "fácil/intermediário", category: "Duas regras", config: "center_single", rules: [g0("Number", k0, d0, v1)], seed: 9016 },
  { id: "ex-17", difficulty_order: 3, difficulty: "fácil/intermediário", category: "Regras simultâneas", config: "in_center_single_out_center_single", rules: [g0("Number", k0, v1), g0("Number", k0, v1)], seed: 9017 },
  { id: "ex-18", difficulty_order: 3, difficulty: "fácil/intermediário", category: "Composição", config: "distribute_four", rules: [g0("Number", a1)], seed: 9018 },

  { id: "ex-19", difficulty_order: 4, difficulty: "intermediário", category: "Múltiplas regras", config: "in_center_single_out_center_single", rules: [g0("Number", k0, v1), g0("Number", k0, vm1)], seed: 9019 },
  { id: "ex-20", difficulty_order: 4, difficulty: "intermediário", category: "Transformações combinadas", config: "distribute_four", rules: [g0("Position", v1, v1)], seed: 9020 },
  { id: "ex-21", difficulty_order: 4, difficulty: "intermediário", category: "Regras cruzadas", config: "in_distribute_four_out_center_single", rules: [g0("Number", k0, v1), g0("Number", k0, v1)], seed: 9021 },
  { id: "ex-22", difficulty_order: 4, difficulty: "intermediário", category: "Relações entre linhas e colunas", config: "up_center_single_down_center_single", rules: [g0("Number", k0, v1, v1), g0("Number", k0, v1, v1)], seed: 9022 },
  { id: "ex-23", difficulty_order: 4, difficulty: "intermediário", category: "Progressão dupla", config: "center_single", rules: [g0("Number", k0, d0, v1)], seed: 9023 },
  { id: "ex-24", difficulty_order: 4, difficulty: "intermediário", category: "Distribuição", config: "center_single", rules: [g0("Number", k0, d0, v1)], seed: 9024 },
];

/* ------------------------------------------------------------------ */
/* Construção controlada do problema (espelha engine.generateProblem). */
/* ------------------------------------------------------------------ */

function makeRuleGroups(spec: QuestaoSpec): MatrixRule[][] {
  const compCount = PANEL_TEMPLATES[spec.config].components.length;
  return spec.rules.slice(0, compCount).map((entries, i) =>
    entries.map(([attr, name, value]) => ({ name, attr, value, componentIdx: i })),
  );
}

function panelSignature(p: PanelState): string {
  return JSON.stringify(p.components.map((c) =>
    c.layout.entities.map((e) => [e.typeLevel, e.sizeLevel, e.colorLevel, e.angleLevel, e.bbox]),
  ));
}

/**
 * Gera distratores adicionais determinísticos modificando UM atributo de UMA
 * entidade do primeiro componente (Number/Position/Type/Size). Garante que
 * sempre haja 5 distratores (o gerador I-RAVEN pode retornar menos para
 * regras Constant — para RAVEN a resposta fica única e o reto não existe).
 */
function gerarDistratoresSuficientes(rng: Rng, options: PanelState[], answerSig: string, count: number, excludedSigs: Set<string>): PanelState[] {
  const out: PanelState[] = [];
  const sigs = new Set(excludedSigs);
  const first = options[0] || null;
  const comp = first?.components?.[0]?.layout;
  const entity = comp?.entities?.[0];
  if (!comp || !entity) return out;

  const attrs: Array<"Number" | "Position" | "Type" | "Size"> = ["Number", "Position", "Type", "Size"];
  let iteration = 0;
  while (out.length < count && iteration < 400) {
    iteration++;
    const base = clone(first);
    const layout = base.components[0]!.layout;
    const attr = attrs[rng.randint(0, attrs.length - 1)]!;
    try {
      if (attr === "Number") {
        const ol = layout.numberLevel;
        const nl = sampleNewLevel(rng, ol, 0, Math.max(0, comp.posList.length - 1));
        layout.numberLevel = nl;
        if (nl + 1 <= comp.posList.length) {
          const idx = rng.sample(comp.posList.map((_, i) => i), nl + 1);
          layout.posIdx = idx;
          layout.entities = idx.map((p, i) => {
            const e = clone(entity);
            return { ...e, name: String(i), bbox: comp.posList[p]! };
          });
        }
      } else if (attr === "Position") {
        if (layout.posIdx.length >= comp.posList.length) {
          // Todas as posições ocupadas: não há posição alternativa (constraint inválida).
          continue;
        }
        layout.posIdx = sampleNewPositions(rng, comp.posList.length, layout.posIdx.length, layout.posIdx);
        layout.entities = layout.posIdx.map((p, i) => ({ ...clone(entity), name: String(i), bbox: comp.posList[p]! }));
      } else if (attr === "Type") {
        const e = layout.entities[0]!;
        e.typeLevel = sampleNewLevel(rng, e.typeLevel, 1, 5);
      } else if (attr === "Size") {
        const e = layout.entities[0]!;
        e.sizeLevel = sampleNewLevel(rng, e.sizeLevel, 0, 5);
      }
    } catch {
      continue; // mutação inválida (ex.: conjunto de posições sem espaço) → tenta outra.
    }
    const sig = panelSignature(base);
    if (sig === answerSig || sigs.has(sig)) continue;
    sigs.add(sig);
    out.push(base);
  }
  return out;
}

function buildQuestion(spec: QuestaoSpec, rngSeed: number) {
  const rng = new Rng(rngSeed);
  const template = PANEL_TEMPLATES[spec.config];
  const ruleGroups = makeRuleGroups(spec);
  if (ruleGroups.length !== template.components.length) {
    throw new Error(`[${spec.id}] grupos de regras (${ruleGroups.length}) ≠ componentes (${template.components.length})`);
  }

  const pruned = ruleGroups.map((group, i) => {
    const l = template.components[i]!.layout;
    return ruleConstraint(group, {
      numMin: l.numberBounds[0]!, numMax: l.numberBounds[1]!,
      uniMin: l.uniBounds[0]!, uniMax: l.uniBounds[1]!,
      typeMin: l.entityConstraint.Type[0]!, typeMax: l.entityConstraint.Type[1]!,
      sizeMin: l.entityConstraint.Size[0]!, sizeMax: l.entityConstraint.Size[1]!,
      colorMin: l.entityConstraint.Color[0]!, colorMax: l.entityConstraint.Color[1]!,
    });
  });
  if (pruned.some((p) => p === null)) {
    throw new Error(`[${spec.id}] poda inválida para ${spec.config}`);
  }

  const start = instantiatePanel(
    rng,
    template.structure,
    template.components.map((c, i) => ({
      name: c.name,
      layout: instantiateLayout(rng, c.layout, pruned[i]!.layout, pruned[i]!.entity),
    })),
  );

  const ruleInstances = ruleGroups.map((g) => g.map(createRule));
  const rows: PanelState[][] = [];
  for (let r = 0; r < 3; r++) {
    const col1 = clone(start);
    if (r > 0) {
      for (const comp of col1.components) resampleLayout(rng, comp.layout, true);
    }
    let toMerge: PanelState[] = [];
    for (let l = 0; l < ruleInstances.length; l++) {
      const group = ruleInstances[l]!;
      let col2 = group[0]!.apply(rng, col1);
      let col3 = group[0]!.apply(rng, col2);
      for (let i = 1; i < group.length; i++) col2 = group[i]!.apply(rng, col1, col2);
      for (let i = 1; i < group.length; i++) col3 = group[i]!.apply(rng, col2, col3);
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

  const { options, answerIndex } = generateOptions(rng, answer, ruleGroups);

  // Exatamente 6 opções: resposta + 5 distratores (seed determinístico).
  const answerSig = panelSignature(answer);
  const correct = options[answerIndex]!;
  const ravenDistractors = options
    .filter((_, i) => i !== answerIndex && panelSignature(options[i]!) !== answerSig)
    .map((p) => ({ p, sig: panelSignature(p) }));
  const rng2 = new Rng(rngSeed + 999);
  // Complementa com distratores determinísticos até ter 5.
  const needed = 5 - ravenDistractors.length;
  const extra = needed > 0
    ? gerarDistratoresSuficientes(rng2, [correct], answerSig, needed, new Set(ravenDistractors.map((d) => d.sig)))
    : [];
  const allDistractors = [...ravenDistractors.map((d) => d.p), ...extra];
  if (allDistractors.length < 5) {
    throw new Error(`[${spec.id}] impossível gerar 5 distratores (só ${allDistractors.length})`);
  }
  const six = rng2.shuffle([correct, ...allDistractors.slice(0, 5)]);
  const correctIndex = six.indexOf(correct);
  if (correctIndex < 0) throw new Error(`[${spec.id}] resposta fora das 6 opções`);

  return {
    id: spec.id,
    matrix_data: { cells: context.map(serializePanel) },
    options: six.map((p, i) => ({ id: `op-${i}-${spec.id}`, panel: serializePanel(p) })),
    correct_option: correctIndex,
  };
}

/* ------------------------------------------------------------------ */
/* Serialização leve (o renderer desenha isto).                        */
/* ------------------------------------------------------------------ */

function serializePanel(p: PanelState) {
  const structure: "Left_Right" | "Up_Down" | "Out_In" | undefined =
    p.structure === "Left_Right" || p.structure === "Up_Down" || p.structure === "Out_In"
      ? p.structure
      : undefined;
  return {
    structure,
    entities: p.components.flatMap((c) =>
      c.layout.entities.map((e) => [
        e.typeLevel, e.sizeLevel, e.colorLevel, e.angleLevel,
        e.bbox[0], e.bbox[1], e.bbox[2], e.bbox[3],
      ] as const),
    ),
  };
}

/* ------------------------------------------------------------------ */
/* Geração + escrita do SQL.                                           */
/* ------------------------------------------------------------------ */

const simQuestions = SIMULATION_SPECS.map((spec) => buildQuestion(spec, spec.seed * 1000 + spec.difficulty_order * 7));
const exQuestions = EXERCISE_SPECS.map((spec) => buildQuestion(spec, spec.seed * 1000 + spec.difficulty_order * 7));

for (const q of [...simQuestions, ...exQuestions]) {
  if (q.options.length !== 6) throw new Error(`${q.id}: ${q.options.length} opções`);
  if (q.correct_option < 0 || q.correct_option > 5) throw new Error(`${q.id}: correct_option inválida`);
  if (q.matrix_data.cells.length !== 8) throw new Error(`${q.id}: matriz incompleta`);
}
const simSet = new Set(simQuestions.map((q) => q.id));
for (const q of exQuestions) {
  if (simSet.has(q.id)) throw new Error(`id colidiu entre modos: ${q.id}`);
  if (!q.id.startsWith("ex-")) throw new Error(`exercício sem prefixo ex-: ${q.id}`);
}
for (const q of simQuestions) if (!q.id.startsWith("sim-")) throw new Error(`simulação sem prefixo sim-: ${q.id}`);

function seedRow(spec: QuestaoSpec, q: ReturnType<typeof buildQuestion>) {
  const esc = (s: string) => s.replace(/'/g, "''");
  const mode = spec.id.startsWith("sim-") ? "simulation" : "exercise";
  return `  ('${q.id}', '${mode}', '${esc(spec.difficulty)}', ${spec.difficulty_order}, '${esc(spec.category)}', '${esc(JSON.stringify(q.matrix_data))}'::jsonb, '${esc(JSON.stringify(q.options))}'::jsonb, ${q.correct_option}, TRUE, 1)`;
}

function renderMigration(nowIso: string) {
  const simRows = simQuestions.map((q, i) => seedRow(SIMULATION_SPECS[i]!, q));
  const exRows = exQuestions.map((q, i) => seedRow(EXERCISE_SPECS[i]!, q));
  const allRows = [...simRows, ...exRows].join(",\n");

  return `-- ============================================================
-- QI — SIMULAÇÃO (questões próprias de raciocínio não verbal)
-- Banco de questões (EXERCÍCIOS × SIMULAÇÃO) + tentativas + RPCs
-- de pontuação calculada NO SERVIDOR.
-- Gerado por testes/gerador-qi-seed.mts em ${nowIso}.
-- Idempotente (IF NOT EXISTS / CREATE OR REPLACE / ON CONFLICT).
-- ============================================================

-- ---------- 1. Banco de questões ----------
CREATE TABLE IF NOT EXISTS public.qi_questions (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('exercise', 'simulation')),
  difficulty TEXT NOT NULL,
  difficulty_order INTEGER NOT NULL CHECK (difficulty_order BETWEEN 1 AND 7),
  category TEXT NOT NULL,
  matrix_data JSONB NOT NULL,
  options JSONB NOT NULL,
  correct_option INTEGER NOT NULL CHECK (correct_option BETWEEN 0 AND 5),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.qi_questions IS
  'Banco de questões de raciocínio não verbal. mode = exercise (EXERCÍCIOS) '
  'ou simulation (SIMULAÇÃO). A simulação SÓ consulta mode=simulation; os '
  'exercícios SÓ mode=exercise. correct_option é o índice canônico em '
  'options (antes do embaralhamento) — nunca exposto por RPC pública.';

ALTER TABLE public.qi_questions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.qi_questions FROM anon, authenticated;
GRANT SELECT ON public.qi_questions TO service_role;
-- Sem policies: acesso apenas via RPC qi_buscar_questoes (renderização sem
-- correct_option) e qi_finalizar_simulacao (SECURITY DEFINER, valida dono).

CREATE INDEX IF NOT EXISTS qi_questions_modo_idx
  ON public.qi_questions (mode, active, difficulty_order);

-- ---------- 2. Tentativas da simulação ----------
CREATE TABLE IF NOT EXISTS public.qi_test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  test_type TEXT NOT NULL DEFAULT 'simulation',
  version INTEGER NOT NULL DEFAULT 1,
  total_questions INTEGER NOT NULL DEFAULT 32,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  answered_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  raw_score INTEGER NOT NULL DEFAULT 0,
  estimated_result INTEGER,
  time_limit_seconds INTEGER NOT NULL DEFAULT 1500,
  time_used_seconds INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'expired', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qi_attempts_user_idx
  ON public.qi_test_attempts (user_id, started_at DESC);

ALTER TABLE public.qi_test_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.qi_test_attempts FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qi_test_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qi_test_attempts TO service_role;

-- RLS: cada usuário vê/edita APENAS as próprias tentativas.
CREATE POLICY qi_attempts_proprias_select ON public.qi_test_attempts
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY qi_attempts_proprias_insert ON public.qi_test_attempts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY qi_attempts_proprias_update ON public.qi_test_attempts
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY qi_attempts_proprias_delete ON public.qi_test_attempts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ---------- 3. RPC: questões por modo (SEM correct_option) ----------
CREATE OR REPLACE FUNCTION public.qi_buscar_questoes(p_mode TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows JSONB;
BEGIN
  IF p_mode NOT IN ('exercise', 'simulation') THEN
    RAISE EXCEPTION 'modo inválido: %', p_mode;
  END IF;
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'mode', q.mode,
      'difficulty', q.difficulty,
      'difficulty_order', q.difficulty_order,
      'category', q.category,
      'matrix_data', q.matrix_data,
      'options', q.options,
      'active', q.active,
      'version', q.version
    ) ORDER BY q.difficulty_order ASC, q.id ASC
  )
  INTO v_rows
  FROM public.qi_questions q
  WHERE q.mode = p_mode AND q.active = TRUE;
  RETURN COALESCE(v_rows, '[]'::jsonb);
END
$$;

REVOKE ALL ON FUNCTION public.qi_buscar_questoes(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qi_buscar_questoes(TEXT) TO anon, authenticated;

-- ---------- 4. RPC: criar tentativa ----------
CREATE OR REPLACE FUNCTION public.qi_criar_tentativa()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_questions JSONB;
  v_attempt UUID;
  v_total INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;
  SELECT jsonb_agg(jsonb_build_object('question_id', q.id, 'difficulty_order', q.difficulty_order)
                   ORDER BY q.difficulty_order ASC, q.id ASC)
  INTO v_questions
  FROM public.qi_questions q
  WHERE q.mode = 'simulation' AND q.active = TRUE;
  v_total := COALESCE(jsonb_array_length(v_questions), 0);
  IF v_total = 0 THEN
    RAISE EXCEPTION 'banco de simulação vazio — aplique a migration qi_simulacao.sql';
  END IF;
  INSERT INTO public.qi_test_attempts (user_id, test_type, version, total_questions, questions, answers, status)
  VALUES (v_uid, 'simulation', 1, v_total, v_questions,
          (SELECT jsonb_agg(x) FROM generate_series(1, v_total) g(x)),
          'in_progress')
  RETURNING id INTO v_attempt;
  RETURN jsonb_build_object('attempt_id', v_attempt, 'total_questions', v_total);
END
$$;

REVOKE ALL ON FUNCTION public.qi_criar_tentativa() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qi_criar_tentativa() TO authenticated;

-- ---------- 5. RPC: tentativa ativa (F5 / retomada) ----------
CREATE OR REPLACE FUNCTION public.qi_obter_tentativa_ativa()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.qi_test_attempts%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;
  SELECT * INTO v_row FROM public.qi_test_attempts
  WHERE user_id = v_uid AND test_type = 'simulation' AND status = 'in_progress'
  ORDER BY started_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'attempt_id', v_row.id,
    'test_type', v_row.test_type,
    'version', v_row.version,
    'total_questions', v_row.total_questions,
    'questions', v_row.questions,
    'answers', v_row.answers,
    'answered_questions', v_row.answered_questions,
    'time_limit_seconds', v_row.time_limit_seconds,
    'started_at', v_row.started_at,
    'status', v_row.status
  );
END
$$;

REVOKE ALL ON FUNCTION public.qi_obter_tentativa_ativa() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qi_obter_tentativa_ativa() TO authenticated;

-- ---------- 6. RPC: salvar respostas (prova em andamento) ----------
CREATE OR REPLACE FUNCTION public.qi_salvar_respostas(p_attempt_id UUID, p_answers JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_answered INT;
  v_found BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;
  UPDATE public.qi_test_attempts
  SET answers = p_answers,
      answered_questions = (SELECT COUNT(*)
                            FROM jsonb_array_elements_text(COALESCE(p_answers, '[]'::jsonb)) e
                            WHERE e IS NOT NULL AND e <> '')
  WHERE id = p_attempt_id AND user_id = v_uid AND status = 'in_progress';
  GET DIAGNOSTICS v_found = ROW_COUNT;
  IF NOT v_found THEN
    RAISE EXCEPTION 'tentativa não encontrada, de outro usuário ou já encerrada';
  END IF;
  RETURN jsonb_build_object('ok', TRUE);
END
$$;

REVOKE ALL ON FUNCTION public.qi_salvar_respostas(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qi_salvar_respostas(UUID, JSONB) TO authenticated;

-- ---------- 7. RPC: finalizar (pontuação NO SERVIDOR) ----------
CREATE OR REPLACE FUNCTION public.qi_finalizar_simulacao(
  p_attempt_id UUID,
  p_answers JSONB,
  p_finalizacao TEXT DEFAULT 'submit'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.qi_test_attempts%ROWTYPE;
  v_total INT;
  v_correct INT := 0;
  v_answered INT := 0;
  v_ans TEXT;
  v_qrow public.qi_questions%ROWTYPE;
  v_op JSONB;
  v_correct_id TEXT;
  v_time_used INT;
  v_status TEXT;
  v_est INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;
  IF p_finalizacao NOT IN ('submit', 'expired') THEN
    RAISE EXCEPTION 'finalização inválida';
  END IF;

  SELECT * INTO v_row FROM public.qi_test_attempts
  WHERE id = p_attempt_id AND user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'tentativa não encontrada ou de outro usuário';
  END IF;
  IF v_row.status <> 'in_progress' THEN
    RETURN jsonb_build_object('already_finalized', TRUE, 'attempt_id', v_row.id);
  END IF;

  v_total := v_row.total_questions;
  -- Contagem REAL: cruza as respostas com o banco de questões.
  FOR i IN 0 .. jsonb_array_length(v_row.questions) - 1 LOOP
    v_ans := NULLIF(COALESCE(p_answers->>i, ''), '');
    IF v_ans IS NOT NULL THEN
      v_answered := v_answered + 1;
      SELECT * INTO v_qrow FROM public.qi_questions WHERE id = v_row.questions->i->>'question_id';
      IF FOUND THEN
        v_op := v_qrow.options->(v_qrow.correct_option);
        v_correct_id := v_op->>'id';
        IF v_ans = v_correct_id THEN
          v_correct := v_correct + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;

  v_time_used := GREATEST(0, LEAST(v_row.time_limit_seconds,
    EXTRACT(EPOCH FROM (now() - v_row.started_at))::INT));
  v_status := CASE WHEN p_finalizacao = 'expired' THEN 'expired' ELSE 'completed' END;
  -- Estimativa experimental (MESMA fórmula do calculateEstimatedResult).
  v_est := round(100.0 + (v_correct::numeric - v_total::numeric / 2.0) * 2.0);

  UPDATE public.qi_test_attempts
  SET answers = p_answers,
      answered_questions = v_answered,
      correct_answers = v_correct,
      raw_score = v_correct,
      estimated_result = v_est,
      time_used_seconds = v_time_used,
      status = v_status,
      completed_at = now()
  WHERE id = p_attempt_id;

  RETURN jsonb_build_object(
    'attempt_id', v_row.id,
    'status', v_status,
    'raw_score', v_correct,
    'correct_answers', v_correct,
    'answered_questions', v_answered,
    'total_questions', v_total,
    'percentual', round((v_correct::numeric / NULLIF(v_total, 0)) * 100.0),
    'estimated_result', v_est,
    'time_used_seconds', v_time_used,
    'time_limit_seconds', v_row.time_limit_seconds
  );
END
$$;

REVOKE ALL ON FUNCTION public.qi_finalizar_simulacao(UUID, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qi_finalizar_simulacao(UUID, JSONB, TEXT) TO authenticated;

-- ---------- 8. RPC: histórico do usuário ----------
CREATE OR REPLACE FUNCTION public.qi_listar_tentativas(p_limite INT DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_rows JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'attempt_id', t.id,
      'total_questions', t.total_questions,
      'answered_questions', t.answered_questions,
      'correct_answers', t.correct_answers,
      'raw_score', t.raw_score,
      'estimated_result', t.estimated_result,
      'time_used_seconds', t.time_used_seconds,
      'time_limit_seconds', t.time_limit_seconds,
      'started_at', t.started_at,
      'completed_at', t.completed_at,
      'status', t.status
    ) ORDER BY t.started_at DESC), '[]'::jsonb)
  INTO v_rows
  FROM public.qi_test_attempts t
  WHERE t.user_id = v_uid
  LIMIT GREATEST(1, LEAST(COALESCE(p_limite, 50), 200));
  RETURN v_rows;
END
$$;

REVOKE ALL ON FUNCTION public.qi_listar_tentativas(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qi_listar_tentativas(INT) TO authenticated;

-- ---------- 9. Seed (56 questões: 32 simulação + 24 exercício) ----------
INSERT INTO public.qi_questions
  (id, mode, difficulty, difficulty_order, category, matrix_data, options, correct_option, active, version)
VALUES
${allRows}
ON CONFLICT (id) DO UPDATE SET
  mode = EXCLUDED.mode,
  difficulty = EXCLUDED.difficulty,
  difficulty_order = EXCLUDED.difficulty_order,
  category = EXCLUDED.category,
  matrix_data = EXCLUDED.matrix_data,
  options = EXCLUDED.options,
  correct_option = EXCLUDED.correct_option,
  active = EXCLUDED.active,
  version = 1;
`;
}

function specOf(specs: QuestaoSpec[], q: ReturnType<typeof buildQuestion>): QuestaoSpec {
  const found = specs.find((s) => s.id === q.id);
  if (!found) throw new Error(`spec ausente para ${q.id}`);
  return found;
}

function toLocalQuestion(q: ReturnType<typeof buildQuestion>): {
  // Formato do que a RPC qi_buscar_questoes devolve (sem correct_option).
  row: Record<string, unknown>;
  correct_option: number;
} {
  const spec = specOf([...SIMULATION_SPECS, ...EXERCISE_SPECS], q);
  const row = {
    id: q.id,
    mode: spec.id.startsWith("sim-") ? "simulation" : "exercise",
    difficulty: spec.difficulty,
    difficulty_order: spec.difficulty_order,
    category: spec.category,
    matrix_data: q.matrix_data,
    options: q.options,
    active: true,
    version: 1,
  };
  return { row, correct_option: q.correct_option };
}

/** Banco local determinístico (espelho do seed) para quando a migration
 * qi_simulacao.sql ainda não foi aplicada. O app usa o RPC quando existe e
 * degrada com segurança para este banco (avisando que o resultado não
 * persiste). O gabarito NUNCA viaja na RPC pública. */
function renderBancoLocal() {
  const sim = simQuestions.map((q) => toLocalQuestion(q));
  const ex = exQuestions.map((q) => toLocalQuestion(q));

  const simRows = sim.map(({ row }) => `  ${JSON.stringify(row)},\n`).join("");
  const exRows = ex.map(({ row }) => `  ${JSON.stringify(row)},\n`).join("");
  const gabSim = new Map(sim.map(({ row, correct_option }) => [String(row.id), correct_option]));
  const gabEx = new Map(ex.map(({ row, correct_option }) => [String(row.id), correct_option]));

  return `/**
 * BANCO LOCAL DETERMINÍSTICO — espelho do seed de supabase/migrations/
 * qi_simulacao.sql. GERADO por testes/gerador-qi-seed.mts. NÃO editar à mão.
 *
 * Usado APENAS como degradação segura quando a migration ainda não foi
 * aplicada no Supabase (a RPC qi_buscar_questoes não existe). O resultado
 * calculado com este banco é LOCAL e avisado ao usuário — não persiste.
 * As questões são EXATAMENTE as mesmas do banco (mesmos ids e conteúdos).
 */
import type { QiQuestionDB } from "./types";

export const BANCO_SIMULACAO_LOCAL: QiQuestionDB[] = [
${simRows}];

export const BANCO_EXERCICIO_LOCAL: QiQuestionDB[] = [
${exRows}];

/** Gabarito canônico (índice em options) — SÓ usado no modo local. */
export const GABARITO_SIMULACAO_LOCAL: Record<string, number> = ${JSON.stringify(Object.fromEntries(gabSim))};

export const GABARITO_EXERCICIO_LOCAL: Record<string, number> = ${JSON.stringify(Object.fromEntries(gabEx))};
`;
}

const nowIso = new Date().toISOString();
mkdirSync("src/components/campus/desenvolvimento-brio/simulacao-qi", { recursive: true });
mkdirSync("supabase/migrations", { recursive: true });
writeFileSync("supabase/migrations/qi_simulacao.sql", renderMigration(nowIso));
writeFileSync("src/components/campus/desenvolvimento-brio/simulacao-qi/banco-local.ts", renderBancoLocal());

console.log(`Gerados ${simQuestions.length} questões de simulação e ${exQuestions.length} de exercício.`);
console.log("Migration escrita em supabase/migrations/qi_simulacao.sql");
console.log("Banco local escrito em simulacao-qi/banco-local.ts");
console.log("Ordem de dificuldade (simulação):", simQuestions.map((q) => q.id).join(", "));
console.log("Ordem de dificuldade (exercícios):", exQuestions.map((q) => q.id).join(", "));