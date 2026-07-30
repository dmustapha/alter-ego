import { createHmac } from "node:crypto";
import type { HistoricalObservation, HistoricalSource, HistoricalSourceSnapshot } from "./validation-dataset";

export function issueHistoricalSourceSnapshot(source: HistoricalSource, observations: readonly HistoricalObservation[]): HistoricalSourceSnapshot {
  const key = process.env.ALTER_EGO_HISTORICAL_SOURCE_KEY;
  if (!key) throw new Error("Historical source attestation key is unavailable.");
  const frozenSource = Object.freeze({ ...source, interval: Object.freeze({ ...source.interval }) });
  const frozenObservations = Object.freeze(observations.map((observation) => Object.freeze({ ...observation, sourceEvidenceIds: Object.freeze([...observation.sourceEvidenceIds]) })));
  const attestation = createHmac("sha256", key).update(canonicalize([frozenSource, frozenObservations])).digest("hex");
  return Object.freeze({ source: frozenSource, observations: frozenObservations, attestation });
}

function canonicalize(value: unknown): string { return JSON.stringify(normalize(value)); }
function normalize(value: unknown): unknown { if (Array.isArray(value)) return value.map(normalize); if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalize((value as Record<string, unknown>)[key])])); return value; }
