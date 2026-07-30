import { DECISION_METRIC_UNITS, type CohortFinding, type CohortSynthesis, type WalletBehaviorProfile } from "./types";

const LIMIT = "Selected wallets are a user-defined cohort and do not imply shared ownership.";
type SynthesizableMetric = "concentration" | "turnover" | "holding-horizon" | "risk-exposure";
const METRICS: readonly SynthesizableMetric[] = ["concentration", "turnover", "holding-horizon", "risk-exposure"];
const AGREEMENT_RANGE: Readonly<Record<SynthesizableMetric, number>> = Object.freeze({ concentration: 0.1, turnover: 0.1, "holding-horizon": 24 * 60 * 60 * 1_000, "risk-exposure": 0.1 });

function isEligibleMetric(metric: WalletBehaviorProfile["metrics"][number]): boolean {
  return metric.value.status === "known" && metric.confidence >= 0.5 && metric.sourceCoverage >= 0.8 && metric.observationCount >= 2 && (metric.recency === "current" || metric.recency === "recent");
}

export function synthesizeCohort(profiles: readonly WalletBehaviorProfile[]): CohortSynthesis {
  const findings: CohortFinding[] = [];
  const excludedWallets = profiles.flatMap((profile) => {
    const unknown = profile.metrics.find((metric) => metric.value.status === "unknown");
    return profile.metrics.some((metric) => metric.value.status === "known")
      ? []
      : [Object.freeze({ walletAddress: profile.walletAddress, reason: unknown?.value.status === "unknown" ? unknown.value.reason : "unavailable" as const })];
  });
  for (const metric of METRICS) {
    const values = profiles.flatMap((profile) => profile.metrics.filter((item) => item.name === metric && isEligibleMetric(item)).map((item) => ({ profile, item })));
    if (values.length < 2) {
      findings.push(Object.freeze({ id: `insufficient:${metric}`, kind: "insufficient", metric, unit: DECISION_METRIC_UNITS[metric], profileIds: Object.freeze(values.map(({ profile }) => profile.id)), evidenceIds: Object.freeze([...new Set(values.flatMap(({ item }) => item.evidenceIds))]), distribution: Object.freeze({ minimum: 0, maximum: 0, count: values.length }), value: Object.freeze({ status: "unknown", reason: "unavailable" }), confidence: 0, limitations: Object.freeze(["Fewer than two current, sufficiently covered profiles are eligible."]) }));
      continue;
    }
    const numbers = values.map(({ item }) => item.value.status === "known" ? item.value.value : 0);
    const spread = Math.max(...numbers) - Math.min(...numbers);
    const kind = spread <= AGREEMENT_RANGE[metric] ? "consensus" : "disagreement";
    findings.push(Object.freeze({ id: `${kind}:${metric}`, kind, metric, unit: DECISION_METRIC_UNITS[metric], profileIds: Object.freeze(values.map(({ profile }) => profile.id)), evidenceIds: Object.freeze([...new Set(values.flatMap(({ item }) => item.evidenceIds))]), distribution: Object.freeze({ minimum: Math.min(...numbers), maximum: Math.max(...numbers), count: numbers.length }), value: Object.freeze({ status: "known", value: numbers.reduce((sum, value) => sum + value, 0) / numbers.length }), confidence: values.reduce((sum, { item }) => sum + item.confidence, 0) / values.length, limitations: Object.freeze(kind === "consensus" ? [] : ["Eligible profiles materially disagree."]) }));
  }
  return Object.freeze({ cohortSize: profiles.length, findings: Object.freeze(findings), excludedWallets: Object.freeze(excludedWallets), limits: Object.freeze([LIMIT]) });
}
