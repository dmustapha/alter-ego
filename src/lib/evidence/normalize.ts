import type {
  EvidenceValue,
  NormalizedTransactionEvent,
  RawTransactionRecord,
  TransactionSource,
} from "./types";
import { isCanonicalTimestampMs } from "./types";

const CHAIN_NAMES: Record<string, string> = {
  "1": "ethereum",
  "196": "xlayer",
  "501": "solana",
};

function unknown<T>(reason: "missing" | "unavailable", raw?: string): EvidenceValue<T> {
  return raw === undefined ? { status: "unknown", reason } : { status: "unknown", reason, raw };
}

function numeric(value: string | undefined): EvidenceValue<number> {
  if (value === undefined || value.trim() === "") return unknown("missing");
  const normalized = value.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(normalized)) return unknown("unavailable", value);
  const significantDigits = normalized.replace(".", "").replace(/^0+/, "").length;
  if (significantDigits > 15) return unknown("unavailable", value);
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed <= Number.MAX_SAFE_INTEGER && exactlyRepresentableFraction(normalized)
    ? { status: "known", value: parsed }
    : unknown("unavailable", value);
}

function exactlyRepresentableFraction(value: string): boolean {
  const fraction = value.split(".")[1]?.replace(/0+$/, "");
  if (!fraction) return true;
  let numerator = Number(fraction);
  const scale = 10 ** fraction.length;
  let denominator = scale;
  while (numerator !== 0) {
    const remainder = denominator % numerator;
    denominator = numerator;
    numerator = remainder;
  }
  let reducedDenominator = scale / denominator;
  while (reducedDenominator % 2 === 0) reducedDenominator /= 2;
  return reducedDenominator === 1;
}

function timestamp(value: string | undefined, retrievedAt: number | null): { value: number | null; reason: "missing" | "unavailable" | null } {
  if (value === undefined || value.trim() === "") return { value: null, reason: "missing" };
  const parsed = numeric(value);
  return retrievedAt !== null && parsed.status === "known" && isCanonicalTimestampMs(parsed.value, retrievedAt)
    ? { value: parsed.value, reason: null }
    : { value: null, reason: "unavailable" };
}

function nonBlank(value: string | undefined): string | null {
  return value?.trim() || null;
}

function direction(record: RawTransactionRecord, walletAddress: string): EvidenceValue<"inflow" | "outflow"> {
  const from = record.from ?? [];
  const to = record.to ?? [];
  if (from.length === 0 && to.length === 0) return unknown("missing");

  const isFromWallet = from.some(({ address }) => address === walletAddress);
  const isToWallet = to.some(({ address }) => address === walletAddress);
  if (isFromWallet === isToWallet) return unknown("unavailable");
  return { status: "known", value: isFromWallet ? "outflow" : "inflow" };
}

function freezeEvent(event: NormalizedTransactionEvent): NormalizedTransactionEvent {
  Object.freeze(event.chain);
  Object.freeze(event.asset);
  Object.freeze(event.direction);
  Object.freeze(event.amount);
  Object.freeze(event.priceUsd);
  Object.freeze(event.gasFeeNative);
  Object.freeze(event.protocol);
  Object.freeze(event.provenance);
  return Object.freeze(event);
}

function normalizeTransaction(
  source: TransactionSource,
  record: RawTransactionRecord,
  sourceIndex: number,
): NormalizedTransactionEvent {
  const transactionHash = nonBlank(record.txHash);
  const trustedRetrievedAt = isCanonicalTimestampMs(source.retrievedAt, Date.now()) ? source.retrievedAt : null;
  const observedAt = timestamp(record.txTime, trustedRetrievedAt);
  return freezeEvent({
    id: `okx-web3:${source.chainIndex}:${transactionHash ?? "unknown"}:${sourceIndex}`,
    walletAddress: source.walletAddress,
    chain: { id: source.chainIndex, name: CHAIN_NAMES[source.chainIndex] ?? "unknown" },
    timestampMs: observedAt.value,
    asset: { address: nonBlank(record.tokenContractAddress), symbol: nonBlank(record.symbol) },
    direction: direction(record, source.walletAddress),
    amount: numeric(record.amount),
    priceUsd: unknown("unavailable"),
    gasFeeNative: numeric(record.txFee),
    protocol: unknown("unavailable"),
    provenance: {
      provider: "okx-web3",
      endpoint: "transactions-by-address",
      chainIndex: source.chainIndex,
      transactionHash,
      retrievedAt: source.retrievedAt,
      sourceIndex,
      rawTimestamp: record.txTime ?? null,
      timestampReason: observedAt.reason,
    },
  });
}

export function normalizeTransactions(
  sources: ReadonlyArray<TransactionSource>,
): readonly NormalizedTransactionEvent[] {
  const events = sources.flatMap((source) =>
    source.transactions.map((record, sourceIndex) => normalizeTransaction(source, record, sourceIndex)),
  );
  return Object.freeze(events);
}
