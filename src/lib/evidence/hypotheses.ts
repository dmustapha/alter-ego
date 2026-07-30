import type { CohortSynthesis, StrategyHypothesis } from "./types";

export function compileHypotheses(synthesis: CohortSynthesis): readonly StrategyHypothesis[] {
  return Object.freeze(synthesis.findings.flatMap((finding) => {
    if (finding.kind !== "consensus" || finding.value.status !== "known") return [];
    return [Object.freeze({
      id: `hypothesis:${finding.id}`,
      status: "draft" as const,
      findingIds: Object.freeze([finding.id]),
      condition: `${finding.metric} remains within the observed cohort range`,
      outcomeDefinition: "Measure the supplied out-of-sample outcome after documented costs.",
      assumptions: Object.freeze(["This is a test specification, not a recommendation."]),
    })];
  }));
}
