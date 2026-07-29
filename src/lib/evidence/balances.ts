import type {
  BalanceSnapshot,
  BalanceSource,
  EvidenceValue,
  RawBalanceRecord,
  UnknownReason,
} from "./types";

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

function isRawBalance(value: unknown): value is RawBalanceRecord {
  return isRecord(value)
    && isOptionalString(value.chainIndex)
    && isOptionalString(value.tokenContractAddress)
    && isOptionalString(value.symbol)
    && isOptionalString(value.balance)
    && isOptionalString(value.tokenPrice)
    && (value.isRiskToken === undefined || typeof value.isRiskToken === "boolean");
}

function isBalanceSource(value: unknown): value is BalanceSource {
  return isRecord(value)
    && typeof value.walletAddress === "string" && value.walletAddress.trim() !== ""
    && typeof value.chainIndex === "string" && value.chainIndex.trim() !== ""
    && typeof value.retrievedAt === "number" && Number.isFinite(value.retrievedAt)
    && Array.isArray(value.balances);
}

function unknown<T>(reason: UnknownReason): EvidenceValue<T> {
  return Object.freeze({ status: "unknown" as const, reason });
}

function numeric(value: string | undefined): EvidenceValue<number> {
  if (value === undefined || value.trim() === "") return unknown("missing");
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0
    ? Object.freeze({ status: "known" as const, value: parsed })
    : unknown("unavailable");
}

function flag(value: boolean | undefined): EvidenceValue<boolean> {
  if (value === undefined) return unknown("missing");
  return Object.freeze({ status: "known" as const, value });
}

function text(value: string | undefined): string | null {
  return value?.trim() || null;
}

function quotedUsd(
  balance: EvidenceValue<number>,
  tokenPrice: EvidenceValue<number>,
): EvidenceValue<number> {
  if (balance.status === "unknown") return unknown(balance.reason);
  if (tokenPrice.status === "unknown") return unknown(tokenPrice.reason);
  const value = balance.value * tokenPrice.value;
  return Number.isFinite(value)
    ? Object.freeze({ status: "known" as const, value })
    : unknown("unavailable");
}

function freezeSnapshot(snapshot: BalanceSnapshot): BalanceSnapshot {
  Object.freeze(snapshot.chain);
  Object.freeze(snapshot.asset);
  Object.freeze(snapshot.balance);
  Object.freeze(snapshot.quotedUsd);
  Object.freeze(snapshot.riskToken);
  Object.freeze(snapshot.evidenceIds);
  Object.freeze(snapshot.provenance);
  return Object.freeze(snapshot);
}

function normalizeBalance(
  source: BalanceSource,
  record: RawBalanceRecord,
  sourceIndex: number,
): BalanceSnapshot {
  const rowChainIndex = text(record.chainIndex);
  const hasChainConflict = rowChainIndex !== null && rowChainIndex !== source.chainIndex;
  const balance = hasChainConflict ? unknown<number>("unavailable") : numeric(record.balance);
  const tokenPrice = hasChainConflict ? unknown<number>("unavailable") : numeric(record.tokenPrice);
  const evidenceId = `okx-web3:balance-row:${source.chainIndex}:${source.walletAddress}:${sourceIndex}:${source.retrievedAt}`;

  return freezeSnapshot({
    id: `okx-web3:balance:${source.chainIndex}:${source.walletAddress}:${text(record.tokenContractAddress) ?? "unknown"}:${sourceIndex}:${source.retrievedAt}`,
    walletAddress: source.walletAddress,
    chain: { id: source.chainIndex, name: CHAIN_NAMES[source.chainIndex] ?? "unknown" },
    asset: { address: text(record.tokenContractAddress), symbol: text(record.symbol) },
    observedAt: source.retrievedAt,
    balance,
    quotedUsd: quotedUsd(balance, tokenPrice),
    riskToken: hasChainConflict ? unknown<boolean>("unavailable") : flag(record.isRiskToken),
    evidenceIds: Object.freeze([evidenceId]),
    provenance: {
      provider: "okx-web3",
      endpoint: "balances-by-address",
      chainIndex: source.chainIndex,
      retrievedAt: source.retrievedAt,
      sourceIndex,
    },
  });
}

export function normalizeBalanceSnapshots(
  sources: readonly unknown[],
): readonly BalanceSnapshot[] {
  if (!Array.isArray(sources)) return Object.freeze([]);
  return Object.freeze(sources.flatMap((source) => isBalanceSource(source)
    ? source.balances.flatMap((record, sourceIndex) => isRawBalance(record)
      ? [normalizeBalance(source, record, sourceIndex)]
      : [])
    : []));
}
