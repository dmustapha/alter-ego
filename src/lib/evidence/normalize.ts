import type {
  EvidenceValue,
  NormalizedTransactionEvent,
  RawTransactionRecord,
  TransactionSource,
} from "./types";
import { isCanonicalTimestampMs } from "./types";
import { canonicalNativeAsset } from "./native-assets";

const CHAIN_NAMES: Record<string, string> = {
  "1": "ethereum",
  "196": "xlayer",
  "501": "solana",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isAddressList(value: unknown): boolean {
  return value === undefined || (Array.isArray(value) && value.every((entry) =>
    isRecord(entry) && isOptionalString(entry.address),
  ));
}

function isRawTransaction(value: unknown): value is RawTransactionRecord {
  return isRecord(value)
    && isOptionalString(value.txHash)
    && isOptionalString(value.txTime)
    && isAddressList(value.from)
    && isAddressList(value.to)
    && isOptionalString(value.amount)
    && isOptionalString(value.methodId)
    && isOptionalString(value.symbol)
    && isOptionalString(value.tokenContractAddress)
    && isOptionalString(value.txFee)
    && (value.txFeeUnit === undefined || value.txFeeUnit === "native-decimal")
    && (value.txFeeDecimals === undefined || typeof value.txFeeDecimals === "number");
}

function isTransactionSource(value: unknown): value is TransactionSource {
  return isRecord(value)
    && typeof value.walletAddress === "string" && value.walletAddress.trim() !== ""
    && typeof value.chainIndex === "string" && value.chainIndex.trim() !== ""
    && isCanonicalTimestampMs(value.retrievedAt, Date.now())
    && Array.isArray(value.transactions);
}

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

function feeUnit(record: RawTransactionRecord, chainIndex: string) {
  const native = canonicalNativeAsset({ id: chainIndex, name: CHAIN_NAMES[chainIndex] ?? "unknown" });
  const decimals = record.txFeeDecimals;
  return record.txFeeUnit === "native-decimal"
    && typeof decimals === "number"
    && Number.isInteger(decimals)
    && native !== null
    && decimals === native.decimals
    ? Object.freeze({
      representation: "native-decimal" as const,
      asset: Object.freeze({ ...native.asset }),
      decimals,
    })
    : undefined;
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
  if (event.gasFeeUnit) {
    Object.freeze(event.gasFeeUnit.asset);
    Object.freeze(event.gasFeeUnit);
  }
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
    gasFeeUnit: feeUnit(record, source.chainIndex),
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
  sources: readonly unknown[],
): readonly NormalizedTransactionEvent[] {
  if (!Array.isArray(sources)) return Object.freeze([]);
  const events = sources.flatMap((source) => isTransactionSource(source)
    ? source.transactions.flatMap((record, sourceIndex) => isRawTransaction(record)
      ? [normalizeTransaction(source, record, sourceIndex)]
      : [])
    : []);
  return Object.freeze(events);
}
