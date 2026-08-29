/**
 * Tipos centrais do módulo "Teste de QI" (fins educativos — letramento cognitivo).
 *
 * Tradução das estruturas do gerador I-RAVEN (SRAN, Hu et al., AAAI 2021),
 * originalmente em AoT.py / Attribute.py / Rule.py, para TypeScript puro
 * executável 100% no cliente (PWA).
 */

/** Formas geométricas disponíveis (TYPE_VALUES do const.py). */
export type ShapeType = 'none' | 'triangle' | 'square' | 'pentagon' | 'hexagon' | 'circle';

/** Regras suportadas pelo motor (Rule.py). */
export type RuleName = 'Constant' | 'Progression' | 'Arithmetic' | 'Distribute_Three';

/** Atributos sobre os quais uma regra pode incidir. */
export type RuleAttr = 'Number' | 'Position' | 'Number/Position' | 'Type' | 'Size' | 'Color';

/** Estruturas de painel (build_tree.py). */
export type StructureName = 'Singleton' | 'Left_Right' | 'Up_Down' | 'Out_In';

/** Layouts canônicos das 7 configurações do I-RAVEN. */
export type LayoutName =
  | 'Center_Single'
  | 'Distribute_Four'
  | 'Distribute_Nine'
  | 'Left_Center_Single'
  | 'Right_Center_Single'
  | 'Up_Center_Single'
  | 'Down_Center_Single'
  | 'Out_Center_Single'
  | 'In_Center_Single'
  | 'In_Distribute_Four';

/** As 7 configurações de matriz do I-RAVEN. */
export type ConfigName =
  | 'center_single'
  | 'distribute_four'
  | 'distribute_nine'
  | 'left_center_single_right_center_single'
  | 'up_center_single_down_center_single'
  | 'in_center_single_out_center_single'
  | 'in_distribute_four_out_center_single';

/**
 * Caixa delimitadora normalizada (0..1) de uma entidade no painel.
 * Mesma ordem do I-RAVEN: [cy, cx, maxH, maxW] — no rendering.py original,
 * o centro em pixels é (bbox[1] * SIZE, bbox[0] * SIZE).
 */
export type BBox = readonly [cy: number, cx: number, maxH: number, maxW: number];

/**
 * Atributos visuais de uma forma. Os valores são armazenados como NÍVEIS
 * (índices nas tabelas de constants.ts), exatamente como o `value_level`
 * do Attribute.py — isso é o que permite aplicar Progression/Arithmetic
 * com aritmética inteira sobre os níveis.
 */
export interface ShapeAttributes {
  /** Índice em TYPE_VALUES (1..5 nas entidades; 0 = "none"). */
  typeLevel: number;
  /** Índice em SIZE_VALUES (0..5) — escala relativa da forma. */
  sizeLevel: number;
  /** Índice em COLOR_VALUES (0..9) — 0 = branco, 9 = preto (preenchimento). */
  colorLevel: number;
  /** Índice em ANGLE_VALUES (0..7) — rotação da forma em graus. */
  angleLevel: number;
  /** Posição normalizada da forma no painel. */
  bbox: BBox;
}

/** Uma entidade (forma) instanciada dentro de um painel. */
export interface EntityState extends ShapeAttributes {
  name: string;
  /** Níveis já usados por este atributo na geração de distratores (I-RAVEN). */
  previousValues: { Type: number[]; Size: number[]; Color: number[] };
}

/** Limites [min, max] de nível para sorteio, por atributo de entidade. */
export interface EntityConstraint {
  Type: [number, number];
  Size: [number, number];
  Color: [number, number];
  Angle: [number, number];
}

/** Limites [min, max] de nível para atributos de layout. */
export interface LayoutConstraint {
  /** Níveis de quantidade: nível k representa k+1 entidades. */
  Number: [number, number];
  /** Níveis de uniformidade (UNI_VALUES: 75% false, 25% true). */
  Uni: [number, number];
}

/**
 * Estado completo de um layout (um componente de um painel).
 * Equivale ao nó Layout do AoT.py após amostragem.
 */
export interface LayoutState {
  name: LayoutName;
  /** Lista fixa de posições possíveis do layout. */
  posList: BBox[];
  /** Nível de quantidade atual (quantidade = numberLevel + 1). */
  numberLevel: number;
  /** Se true, todas as entidades do painel têm os mesmos atributos. */
  uniformity: boolean;
  /** Índices (em posList) das posições ocupadas. */
  posIdx: number[];
  entities: EntityState[];
  /** Constraints vigentes (já podadas pelas regras). */
  layoutConstraint: LayoutConstraint;
  entityConstraint: EntityConstraint;
  /** Constraints originais da configuração (antes da poda) — usadas nos distratores. */
  origLayoutConstraint: LayoutConstraint;
  origEntityConstraint: EntityConstraint;
  /**
   * Controle de exaustão de combinações de posição por nível de quantidade,
   * para gerar distratores sem repetição (sample_new_num_count do AoT.py).
   * Chave = nível; valor = [combinações restantes, assinaturas já usadas].
   */
  sampleNewNumCount: Record<number, [number, string[]]>;
  /** Níveis de quantidade ainda não usados em distratores (1 = disponível). */
  numCount: Record<number, number>;
  /** Flag interna: posição já foi alterada por um distrator anterior. */
  positionChanged: boolean;
}

/** Um componente de painel (ex.: "Left" dentro de "Left_Right"). */
export interface ComponentState {
  name: string;
  layout: LayoutState;
}

/** Um painel completo (uma célula da matriz 3x3). Equivale ao Root amostrado. */
export interface PanelState {
  structure: StructureName;
  components: ComponentState[];
}

/**
 * Regra instanciada que governa um atributo ao longo de uma linha da matriz.
 * - Progression: value = deslocamento de nível por passo (±1, ±2).
 * - Arithmetic:  value = +1 (soma / UNIÃO de conjuntos) ou -1 (subtração /
 *   DIFERENÇA de conjuntos). No atributo Position, correspondem às operações
 *   lógicas OR (união) e XOR-like (diferença de conjuntos) do RPM clássico.
 * - Distribute_Three / Constant: value = 0 (sem parâmetro).
 */
export interface MatrixRule {
  name: RuleName;
  attr: RuleAttr;
  value: number;
  /** Componente do painel ao qual a regra se aplica. */
  componentIdx: number;
}

/** Problema completo gerado pelo motor. */
export interface GeneratedProblem {
  config: ConfigName;
  structure: StructureName;
  /** Os 8 painéis de contexto (a 9ª célula é a resposta). */
  context: PanelState[];
  /** As 8 opções (1 correta + 7 distratores), já embaralhadas. */
  options: PanelState[];
  /** Índice da opção correta em `options`. */
  answerIndex: number;
  /** Regras efetivamente aplicadas (uma por atributo, por componente). */
  rules: MatrixRule[];
}
