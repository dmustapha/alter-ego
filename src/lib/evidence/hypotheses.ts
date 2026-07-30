import type { CohortSynthesis, StrategyHypothesis } from "./types";

export function compileHypotheses(synthesis: CohortSynthesis): readonly StrategyHypothesis[] {
  return Object.freeze(synthesis.findings.flatMap((finding) => {
    if (finding.kind !== "consensus" || finding.value.status !== "known") return [];
    return [Object.freeze({
      id: `hypothesis:${finding.id}`,
      status: "draft" as const,
      findingIds: Object.freeze([finding.id]),
      sourceEvidenceIds: Object.freeze([...finding.evidenceIds]),
      condition: Object.freeze({ metric: finding.metric, operator: "within-range" as const, minimum: finding.distribution.minimum, maximum: finding.distribution.maximum }),
      scope: Object.freeze({ chainIds: Object.freeze([]), assetIds: Object.freeze([]), outcomeHorizonMs: 24 * 60 * 60 * 1_000 }),
      outcomeDefinition: "Measure the supplied out-of-sample outcome after documented costs.",
      assumptions: Object.freeze(["This is a test specification, not a recommendation."]),
    })];
  }));
}
