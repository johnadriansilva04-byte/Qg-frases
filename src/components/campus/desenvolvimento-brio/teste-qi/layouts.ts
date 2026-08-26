/**
 * Configurações de painel e instanciação de layouts — tradução de
 * build_tree.py + partes de AoT.py (Layout._sample / _resample, Entity).
 */
import {
  ANGLE_MAX, ANGLE_MIN, COLOR_MAX, COLOR_MIN, NUM_MAX, NUM_MIN,
  SIZE_MAX, SIZE_MIN, TYPE_MAX, UNI_VALUES,
} from './constants';
import { comb, irange, Rng } from './rng';
import type {
  BBox, ComponentState, ConfigName, EntityConstraint, EntityState,
  LayoutConstraint, LayoutName, LayoutState, PanelState, StructureName,
} from './types';

/** Gabarito estático de um layout (posições fixas + constraints originais). */
export interface LayoutTemplate {
  name: LayoutName;
  posList: BBox[];
  numberBounds: [number, number];
  uniBounds: [number, number];
  entityConstraint: EntityConstraint;
}

export interface ComponentTemplate {
  name: string;
  layout: LayoutTemplate;
}

export interface PanelTemplate {
  structure: StructureName;
  components: ComponentTemplate[];
}

const bbox = (cy: number, cx: number, maxH: number, maxW: number): BBox => [cy, cx, maxH, maxW];

function entityConstraint(
  typeMin = 1, typeMax = TYPE_MAX,
  sizeMin = SIZE_MIN, sizeMax = SIZE_MAX,
  colorMin = COLOR_MIN, colorMax = COLOR_MAX,
  angleMin = ANGLE_MIN, angleMax = ANGLE_MAX,
): EntityConstraint {
  return { Type: [typeMin, typeMax], Size: [sizeMin, sizeMax], Color: [colorMin, colorMax], Angle: [angleMin, angleMax] };
}

function layoutTemplate(
  name: LayoutName,
  posList: BBox[],
  numMin = NUM_MIN,
  numMax = NUM_MAX,
  entity: EntityConstraint = entityConstraint(),
  uniBounds: [number, number] = [0, UNI_VALUES.length - 1],
): LayoutTemplate {
  if (numMax + 1 > posList.length) {
    throw new Error(`${name}: numMax (${numMax}) excede as posições disponíveis (${posList.length})`);
  }
  return { name, posList, numberBounds: [numMin, numMax], uniBounds, entityConstraint: entity };
}

/** As 7 configurações do I-RAVEN (build_tree.py). */
export const PANEL_TEMPLATES: Record<ConfigName, PanelTemplate> = {
  center_single: {
    structure: 'Singleton',
    components: [{
      name: 'Grid',
      layout: layoutTemplate('Center_Single', [bbox(0.5, 0.5, 1, 1)], 0, 0),
    }],
  },
  distribute_four: {
    structure: 'Singleton',
    components: [{
      name: 'Grid',
      layout: layoutTemplate('Distribute_Four', [
        bbox(0.25, 0.25, 0.5, 0.5), bbox(0.25, 0.75, 0.5, 0.5),
        bbox(0.75, 0.25, 0.5, 0.5), bbox(0.75, 0.75, 0.5, 0.5),
      ], 0, 3),
    }],
  },
  distribute_nine: {
    structure: 'Singleton',
    components: [{
      name: 'Grid',
      layout: layoutTemplate('Distribute_Nine', [
        bbox(0.16, 0.16, 0.33, 0.33), bbox(0.16, 0.5, 0.33, 0.33), bbox(0.16, 0.83, 0.33, 0.33),
        bbox(0.5, 0.16, 0.33, 0.33), bbox(0.5, 0.5, 0.33, 0.33), bbox(0.5, 0.83, 0.33, 0.33),
        bbox(0.83, 0.16, 0.33, 0.33), bbox(0.83, 0.5, 0.33, 0.33), bbox(0.83, 0.83, 0.33, 0.33),
      ], 0, 8),
    }],
  },
  left_center_single_right_center_single: {
    structure: 'Left_Right',
    components: [
      { name: 'Left', layout: layoutTemplate('Left_Center_Single', [bbox(0.5, 0.25, 0.5, 0.5)], 0, 0) },
      { name: 'Right', layout: layoutTemplate('Right_Center_Single', [bbox(0.5, 0.75, 0.5, 0.5)], 0, 0) },
    ],
  },
  up_center_single_down_center_single: {
    structure: 'Up_Down',
    components: [
      { name: 'Up', layout: layoutTemplate('Up_Center_Single', [bbox(0.25, 0.5, 0.5, 0.5)], 0, 0) },
      { name: 'Down', layout: layoutTemplate('Down_Center_Single', [bbox(0.75, 0.5, 0.5, 0.5)], 0, 0) },
    ],
  },
  in_center_single_out_center_single: {
    structure: 'Out_In',
    components: [
      {
        name: 'Out',
        layout: layoutTemplate('Out_Center_Single', [bbox(0.5, 0.5, 1, 1)], 0, 0, entityConstraint(1, TYPE_MAX, 3, SIZE_MAX, COLOR_MIN, 0)),
      },
      { name: 'In', layout: layoutTemplate('In_Center_Single', [bbox(0.5, 0.5, 0.33, 0.33)], 0, 0) },
    ],
  },
  in_distribute_four_out_center_single: {
    structure: 'Out_In',
    components: [
      {
        name: 'Out',
        layout: layoutTemplate('Out_Center_Single', [bbox(0.5, 0.5, 1, 1)], 0, 0, entityConstraint(1, TYPE_MAX, 3, SIZE_MAX, COLOR_MIN, 0)),
      },
      {
        name: 'In',
        layout: layoutTemplate('In_Distribute_Four', [
          bbox(0.42, 0.42, 0.15, 0.15), bbox(0.42, 0.58, 0.15, 0.15),
          bbox(0.58, 0.42, 0.15, 0.15), bbox(0.58, 0.58, 0.15, 0.15),
        ], 0, 3, entityConstraint(1, TYPE_MAX, 2, SIZE_MAX)),
      },
    ],
  },
};

/** Sorteia um nível inteiro dentro de [min, max] ∩ bounds da instância. */
export function sampleLevel(rng: Rng, min: number, max: number): number {
  return rng.randint(min, max);
}

/** Sorteia um nível novo, excluindo o atual e os valores já usados (Attribute.sample_new). */
export function sampleNewLevel(
  rng: Rng,
  currentLevel: number,
  min: number,
  max: number,
  previousValues: readonly number[] = [],
): number {
  const available = irange(min, max).filter((v) => v !== currentLevel && !previousValues.includes(v));
  if (available.length === 0) {
    // Fallback defensivo: qualquer valor diferente do atual dentro da faixa global.
    const fallback = irange(min, max).filter((v) => v !== currentLevel);
    return rng.choice(fallback.length > 0 ? fallback : [currentLevel]);
  }
  return rng.choice(available);
}

function createEntity(rng: Rng, name: string, box: BBox, constraint: EntityConstraint): EntityState {
  return {
    name,
    bbox: box,
    typeLevel: sampleLevel(rng, constraint.Type[0], constraint.Type[1]),
    sizeLevel: sampleLevel(rng, constraint.Size[0], constraint.Size[1]),
    colorLevel: sampleLevel(rng, constraint.Color[0], constraint.Color[1]),
    angleLevel: sampleLevel(rng, constraint.Angle[0], constraint.Angle[1]),
    previousValues: { Type: [], Size: [], Color: [] },
  };
}

/** Re-sorteia os atributos visuais de uma entidade (Entity.resample). */
export function resampleEntity(rng: Rng, entity: EntityState, constraint: EntityConstraint): void {
  entity.typeLevel = sampleLevel(rng, constraint.Type[0], constraint.Type[1]);
  entity.sizeLevel = sampleLevel(rng, constraint.Size[0], constraint.Size[1]);
  entity.colorLevel = sampleLevel(rng, constraint.Color[0], constraint.Color[1]);
  entity.angleLevel = sampleLevel(rng, constraint.Angle[0], constraint.Angle[1]);
}

function buildEntities(rng: Rng, layout: LayoutState): EntityState[] {
  const boxes = layout.posIdx.map((i) => layout.posList[i]!);
  if (layout.uniformity) {
    const first = createEntity(rng, '0', boxes[0]!, layout.entityConstraint);
    return boxes.map((box, i) => (i === 0 ? first : { ...first, name: String(i), bbox: box, previousValues: { Type: [], Size: [], Color: [] } }));
  }
  return boxes.map((box, i) => createEntity(rng, String(i), box, layout.entityConstraint));
}

/**
 * Instancia um layout a partir do gabarito com constraints (já podadas).
 * Equivale a Layout.__init__ + Layout._sample do AoT.py.
 */
export function instantiateLayout(
  rng: Rng,
  template: LayoutTemplate,
  layoutConstraint: LayoutConstraint,
  entityConstraint: EntityConstraint,
): LayoutState {
  const numberLevel = sampleLevel(rng, layoutConstraint.Number[0], layoutConstraint.Number[1]);
  const uniformity = UNI_VALUES[rng.randint(template.uniBounds[0]!, template.uniBounds[1]!)]!;
  const posIdx = rng.sample(irange(0, template.posList.length - 1), numberLevel + 1);

  // Contadores de exaustão usados na geração de distratores, baseados nas
  // constraints ORIGINAIS (o AoT.py herda sample_new_num_count do template).
  const sampleNewNumCount: Record<number, [number, string[]]> = {};
  const numCount: Record<number, number> = {};
  for (let lvl = template.numberBounds[0]; lvl <= template.numberBounds[1]; lvl++) {
    sampleNewNumCount[lvl] = [comb(template.posList.length, lvl + 1), []];
    numCount[lvl] = 1;
  }

  const layout: LayoutState = {
    name: template.name,
    posList: template.posList,
    numberLevel,
    uniformity,
    posIdx,
    entities: [],
    layoutConstraint,
    entityConstraint,
    origLayoutConstraint: { Number: [...template.numberBounds], Uni: [...template.uniBounds] },
    origEntityConstraint: template.entityConstraint,
    sampleNewNumCount,
    numCount,
    positionChanged: false,
  };
  layout.entities = buildEntities(rng, layout);
  return layout;
}

/**
 * Re-amostragem entre linhas da matriz (Layout._resample): sorteia nova
 * quantidade (opcional), novas posições e novas entidades. A uniformidade
 * é preservada, como no original.
 */
export function resampleLayout(rng: Rng, layout: LayoutState, changeNumber: boolean): void {
  if (changeNumber) {
    layout.numberLevel = sampleLevel(rng, layout.layoutConstraint.Number[0], layout.layoutConstraint.Number[1]);
  }
  layout.posIdx = rng.sample(irange(0, layout.posList.length - 1), layout.numberLevel + 1);
  layout.entities = buildEntities(rng, layout);
}

/** Instancia um painel completo (Root.sample). */
export function instantiatePanel(
  rng: Rng,
  structure: StructureName,
  components: Array<{ name: string; layout: LayoutState }>,
): PanelState {
  return { structure, components: components as ComponentState[] };
}
