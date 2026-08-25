/**
 * Exportações do módulo de Teste de QI
 * Motor procedural de testes de QI baseado no I-RAVEN
 */

export { IQTestComponent } from "./IQTestComponent";
export { IQMatrixRenderer, IQAnswersRenderer, IQPanelRenderer } from "./IQRenderer";
export { generateIQProblem } from "./MatrixGenerator";
export { createRule, ConstantRule, ProgressionRule, ArithmeticRule, DistributeThreeRule } from "./RuleEngine";
export {
  NumberAttribute,
  TypeAttribute,
  SizeAttribute,
  ColorAttribute,
  AngleAttribute,
  UniformityAttribute,
  PositionAttribute,
} from "./AttributeEngine";

export * from "./iqTypes";
export * from "./iqConstants";
