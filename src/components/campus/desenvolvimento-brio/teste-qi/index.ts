/**
 * Módulo "Teste de QI" — motor procedural completo traduzido do I-RAVEN
 * (100% cliente, sem Python), com explicações pedagógicas e recompensas
 * em SOV (Soberania).
 */
export { IQTestComponent } from "./IQTestComponent";
export { RavenEngine } from "./engine";
export { renderMatrix, renderPanel, renderOptions, mountProblem } from "./renderer/svgRenderer";
export { explainRule, explainProblem, EDUCATIONAL_DISCLAIMER } from "./pedagogy";
export type { RuleExplanation } from "./pedagogy";
export {
  SOV_CURRENCY,
  SOV_REWARDS,
  computeSovReward,
  sessionCompletionReward,
  settleRewards,
} from "./rewards";
export type { ChallengeResult, SovReward, SovWallet } from "./rewards";
export * from "./types";
export * from "./constants";
