import { describe, expect, it } from "vitest";
import { synthesizeCohort } from "./synthesis";
import type { WalletBehaviorProfile, WalletCoverageSummary } from "./types";

const coverage: WalletCoverageSummary = { walletAddress: "", chainIds: ["1"], eventCount: 1, knownDirectionCount: 1, knownAmountCount: 1, knownPriceCount: 1, score: 1, transactionFieldCoverage: { eventCount: 1, knownDirectionCount: 1, knownAmountCount: 1, knownPriceCount: 1, score: 1 }, collectorCoverage: { collectedKinds: ["balance-snapshot"], score: 1 / 6 }, newestEventAt: 1_700_000_000_000, ageMs: 0, recency: "current" };

function profile(walletAddress: string, value: number): WalletBehaviorProfile {
  return { id: `profile:${walletAddress}`, walletAddress, chainIds: ["1"], coverage: { ...coverage, walletAddress }, limitations: [], metrics: [{ name: "concentration", value: { status: "known", value }, confidence: 1, sourceCoverage: 1, observationCount: 2, recency: "current", evidenceIds: ["balance:1"] }] };
}

describe("synthesizeCohort", () => {
  it("emits a consensus only from agreement across eligible profiles", () => {
    const result = synthesizeCohort([profile("0xa", 0.8), profile("0xb", 0.75)]);

    expect(result.findings).toContainEqual(expect.objectContaining({ kind: "consensus", metric: "concentration", unit: "ratio", evidenceIds: ["balance:1"] }));
    expect(result.limits).toContain("Selected wallets are a user-defined cohort and do not imply shared ownership.");
  });

  it("surfaces profiles without eligible metrics as excluded evidence", () => {
    const incomplete = { ...profile("0xc", 0.7), metrics: [{ name: "concentration" as const, value: { status: "unknown" as const, reason: "unavailable" as const }, confidence: 0, sourceCoverage: 0, observationCount: 0, recency: "current" as const, evidenceIds: [] }] };
    const result = synthesizeCohort([profile("0xa", 0.8), incomplete]);

    expect(result.excludedWallets).toEqual([{ walletAddress: "0xc", reason: "unavailable" }]);
  });
});
