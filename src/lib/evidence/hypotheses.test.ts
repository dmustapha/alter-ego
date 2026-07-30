import { describe, expect, it } from "vitest";
import { compileHypotheses } from "./hypotheses";
import type { CohortSynthesis } from "./types";

const synthesis: CohortSynthesis = { cohortSize: 2, excludedWallets: [], limits: [], findings: [{ id: "consensus:concentration", kind: "consensus", metric: "concentration", unit: "ratio", profileIds: ["profile:0xa", "profile:0xb"], evidenceIds: ["balance:1"], distribution: { minimum: 0.75, maximum: 0.85, count: 2 }, value: { status: "known", value: 0.8 }, confidence: 0.9, limitations: [] }] };

describe("compileHypotheses", () => {
  it("creates a neutral measurable draft from a consensus finding", () => {
    const [hypothesis] = compileHypotheses(synthesis);

    expect(hypothesis).toMatchObject({
      status: "draft",
      findingIds: ["consensus:concentration"],
      sourceEvidenceIds: ["balance:1"],
      condition: { metric: "concentration", operator: "within-range", minimum: 0.75, maximum: 0.85 },
      scope: { chainIds: [], outcomeHorizonMs: 86_400_000 },
    });
  });
});
