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
  sources: ReadonlyArray<BalanceSource>,
): readonly BalanceSnapshot[] {
  return Object.freeze(sources.flatMap((source) =>
    source.balances.map((record, sourceIndex) => normalizeBalance(source, record, sourceIndex)),
  ));
}
