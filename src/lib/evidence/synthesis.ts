import { DECISION_METRIC_UNITS, type BehaviorMetricName, type CohortFinding, type CohortSynthesis, type WalletBehaviorProfile } from "./types";

const LIMIT = "Selected wallets are a user-defined cohort and do not imply shared ownership.";
const METRICS: readonly BehaviorMetricName[] = ["concentration", "turnover", "holding-horizon", "risk-exposure", "execution-cost", "realized-outcome"];

export function synthesizeCohort(profiles: readonly WalletBehaviorProfile[]): CohortSynthesis {
  const findings: CohortFinding[] = [];
  const excludedWallets = profiles.flatMap((profile) => {
    const unknown = profile.metrics.find((metric) => metric.value.status === "unknown");
    return profile.metrics.some((metric) => metric.value.status === "known")
      ? []
      : [Object.freeze({ walletAddress: profile.walletAddress, reason: unknown?.value.status === "unknown" ? unknown.value.reason : "unavailable" as const })];
  });
  for (const metric of METRICS) {
    const values = profiles.flatMap((profile) => profile.metrics.filter((item) => item.name === metric && item.value.status === "known").map((item) => ({ profile, item })));
    if (values.length < 2) continue;
    const numbers = values.map(({ item }) => item.value.status === "known" ? item.value.value : 0);
    const spread = Math.max(...numbers) - Math.min(...numbers);
    const kind = spread <= 0.1 ? "consensus" : "disagreement";
    findings.push(Object.freeze({ id: `${kind}:${metric}`, kind, metric, unit: DECISION_METRIC_UNITS[metric], profileIds: Object.freeze(values.map(({ profile }) => profile.id)), evidenceIds: Object.freeze([...new Set(values.flatMap(({ item }) => item.evidenceIds))]), distribution: Object.freeze({ minimum: Math.min(...numbers), maximum: Math.max(...numbers), count: numbers.length }), value: Object.freeze({ status: "known", value: numbers.reduce((sum, value) => sum + value, 0) / numbers.length }), confidence: values.reduce((sum, { item }) => sum + item.confidence, 0) / values.length, limitations: Object.freeze(kind === "consensus" ? [] : ["Eligible profiles materially disagree."]) }));
  }
  return Object.freeze({ cohortSize: profiles.length, findings: Object.freeze(findings), excludedWallets: Object.freeze(excludedWallets), limits: Object.freeze([LIMIT]) });
}
