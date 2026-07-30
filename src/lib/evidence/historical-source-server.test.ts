import { describe, expect, it } from "vitest";
import { issueHistoricalSourceSnapshot } from "./historical-source-server";

const source = { id: "collector:history", version: "v1", retrievedAt: 1_700_000_000_000, interval: { startAt: 1_699_999_000_000, endAt: 1_700_000_000_000 } };
const observations = [{ id: "observation:1", observedAt: 1_699_999_000_000, outcomeAt: 1_700_000_000_000, chainId: "1", assetId: "asset:test", metric: "concentration" as const, metricValue: 0.8, outcomeUsd: 2, costUsd: 1, slippageUsd: 0, liquidityUsd: 10, sourceEvidenceIds: ["evidence:1"] }];

describe("issueHistoricalSourceSnapshot", () => {
  it("issues an immutable server-side attestation only when the deployment key exists", () => {
    process.env.ALTER_EGO_HISTORICAL_SOURCE_KEY = "collector-test-key";
    const snapshot = issueHistoricalSourceSnapshot(source, observations);
    expect(snapshot).toMatchObject({ source, observations, attestation: expect.any(String) });
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("fails closed when the deployment attestation key is unavailable", () => {
    delete process.env.ALTER_EGO_HISTORICAL_SOURCE_KEY;
    expect(() => issueHistoricalSourceSnapshot(source, observations)).toThrow("attestation key");
  });
});
