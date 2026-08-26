/**
 * Gerador de matrizes de QI
 * Motor principal que combina atributos, regras e renderização
 */

import type { IQProblem, Matrix3x3, Panel, AnswerOption, MatrixRule } from "./iqTypes";
import { RULE_ATTR, META_STRUCTURE_FORMAT } from "./iqConstants";
import { createRule } from "./RuleEngine";
import { NumberAttribute, TypeAttribute, SizeAttribute, ColorAttribute, AngleAttribute, UniformityAttribute, PositionAttribute } from "./AttributeEngine";

/**
 * Gerador de posições para o layout
 */
function generatePositionLayout(type: "planar" | "angular", count: number): number[][] {
  const positions: number[][] = [];

  if (type === "planar") {
    // Grid 3x3 simplificado
    const gridSize = 3;
    const cellSize = 1 / gridSize;

    for (let i = 0; i < count && i < 9; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      positions.push([
        col * cellSize + cellSize / 2, // x
        row * cellSize + cellSize / 2, // y
        cellSize * 0.8, // w
        cellSize * 0.8, // h
      ]);
    }
  } else {
    // Angular - posições em círculo
    const centerX = 0.5;
    const centerY = 0.5;
    const radius = 0.3;

    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count;
      positions.push([
        centerX + radius * Math.cos(angle), // x
        centerY + radius * Math.sin(angle), // y
        0.2, // w
        0.2, // h
        centerX, // x_c
        centerY, // y_c
        (angle * 180) / Math.PI, // omega
      ]);
    }
  }

  return positions;
}

/**
 * Cria um painel vazio com estrutura básica
 */
function createEmptyPanel(): Panel {
  return {
    structure: {
      name: "Center_Single",
      components: [],
    },
  };
}

/**
 * Gera um painel com entidades aleatórias
 */
function generateRandomPanel(): Panel {
  const panel = createEmptyPanel();

  // Número de entidades (1-3)
  const numAttr = new NumberAttribute();
  numAttr.sample(0, 2); // 0-2 index = 1-3 entidades
  const numEntities = numAttr.getValue() as number;

  // Posição
  const positions = generatePositionLayout("planar", numEntities);
  const posAttr = new PositionAttribute("planar", positions);
  posAttr.sample(numEntities);

  // Uniformity
  const uniAttr = new UniformityAttribute();
  uniAttr.sample();
  const isUniform = uniAttr.getValue();

  // Criar entidades
  const entities = [];
  for (let i = 0; i < numEntities; i++) {
    const typeAttr = new TypeAttribute();
    typeAttr.sample(1, 5); // Excluir "none"

    const sizeAttr = new SizeAttribute();
    sizeAttr.sample();

    const colorAttr = new ColorAttribute();
    colorAttr.sample();

    const angleAttr = new AngleAttribute();
    angleAttr.sample();

    entities.push({
      name: `entity_${i}`,
      bbox: positions[i] as [number, number, number, number],
      attributes: {
        type: typeAttr.getValue() as any,
        size: sizeAttr.getValueLevel(),
        color: colorAttr.getValueLevel(),
        angle: angleAttr.getValueLevel(),
      },
    });
  }

  panel.structure.components.push({
    name: "component_0",
    layout: {
      number: numEntities,
      position: {
        type: "planar",
        values: positions as any,
        valueIdx: posAttr.getValueIdx() || [],
      },
      uniformity: isUniform,
      entities,
    },
  });

  return panel;
}

/**
 * Aplica regras de progressão para gerar uma linha da matriz
 */
function applyProgressionRules(basePanel: Panel, ruleGroup: MatrixRule[]): Panel[] {
  const panels: Panel[] = [basePanel];

  // Painel 2 = Painel 1 + regra
  let panel2 = JSON.parse(JSON.stringify(basePanel)) as Panel;
  for (const rule of ruleGroup) {
    const ruleInstance = createRule(rule.name, rule.attr, rule.param, rule.componentIdx);
    panel2 = ruleInstance.applyRule(basePanel, panel2);
  }
  panels.push(panel2);

  // Painel 3 = Painel 2 + regra
  let panel3 = JSON.parse(JSON.stringify(panel2)) as Panel;
  for (const rule of ruleGroup) {
    const ruleInstance = createRule(rule.name, rule.attr, rule.param, rule.componentIdx);
    panel3 = ruleInstance.applyRule(panel2, panel3);
  }
  panels.push(panel3);

  return panels;
}

/**
 * Gera uma matriz 3x3 completa
 */
function generateMatrix3x3(): Matrix3x3 {
  const matrix: Matrix3x3 = [];

  // Gerar 3 linhas
  for (let row = 0; row < 3; row++) {
    // Painel base da linha (resample para cada linha)
    const basePanel = generateRandomPanel();

    // Selecionar regras aleatórias para esta linha
    const ruleGroup: MatrixRule[] = [];
    const attrGroups = RULE_ATTR[Math.floor(Math.random() * RULE_ATTR.length)]!;
    const selectedRule = attrGroups[Math.floor(Math.random() * attrGroups.length)]!;

    ruleGroup.push({
      name: selectedRule[0] as any,
      attr: selectedRule[1] as any,
      param: selectedRule[2] ? [...selectedRule[2]] : null,
      componentIdx: 0,
    });

    // Aplicar regras para gerar a linha
    const rowPanels = applyProgressionRules(basePanel, ruleGroup);
    matrix.push(rowPanels);
  }

  return matrix;
}

/**
 * Gera opções de resposta (distratores + correta)
 */
function generateAnswerOptions(correctPanel: Panel): AnswerOption[] {
  const options: AnswerOption[] = [];

  // Opção correta
  options.push({
    panel: JSON.parse(JSON.stringify(correctPanel)),
    isCorrect: true,
  });

  // Gerar 7 distratores
  for (let i = 0; i < 7; i++) {
    const distractor = JSON.parse(JSON.stringify(correctPanel)) as Panel;

    // Modificar aleatoriamente um atributo
    const firstComponent = distractor.structure.components[0];
    if (firstComponent) {
      const layout = firstComponent.layout;
      if (layout.entities.length > 0) {
        const entity = layout.entities[0]!;
        const modifications = ["type", "size", "color", "angle"];
        const mod = modifications[Math.floor(Math.random() * modifications.length)];

        switch (mod) {
          case "type":
            const typeAttr = new TypeAttribute();
            typeAttr.sample(1, 5);
            entity.attributes.type = typeAttr.getValue() as any;
            break;
          case "size":
            const sizeAttr = new SizeAttribute();
            sizeAttr.sample();
            entity.attributes.size = sizeAttr.getValueLevel();
            break;
          case "color":
            const colorAttr = new ColorAttribute();
            colorAttr.sample();
            entity.attributes.color = colorAttr.getValueLevel();
            break;
          case "angle":
            const angleAttr = new AngleAttribute();
            angleAttr.sample();
            entity.attributes.angle = angleAttr.getValueLevel();
            break;
        }
      }
    }

    options.push({
      panel: distractor,
      isCorrect: false,
    });
  }

  // Embaralhar opções
  return options.sort(() => Math.random() - 0.5);
}

/**
 * Gera um problema completo de QI
 */
export function generateIQProblem(): IQProblem {
  // Gerar matriz 3x3 (8 painéis, o 9º é a resposta)
  const matrix = generateMatrix3x3();

  // O painel correto seria o resultado da progressão da terceira linha
  const correctPanel = JSON.parse(JSON.stringify(matrix[2]![1]!)) as Panel;

  // Remover o último painel (será a resposta)
  matrix[2]![2] = createEmptyPanel();

  // Gerar opções de resposta
  const answers = generateAnswerOptions(correctPanel);

  // Encontrar índice da resposta correta
  const correctAnswer = answers.findIndex((a) => a.isCorrect)!;

  // Regras usadas (simplificado)
  const rules: MatrixRule[][] = [];

  return {
    matrix,
    answers,
    correctAnswer,
    rules,
  };
}
