import type { AnalyzeResponse, AnalyzeProgress, WalletData } from "./types";
import {
  getWalletTxnsPaged,
  getWalletBalances,
  getTxDetail,
  buildWalletSignals,
  deriveTrades,
} from "./okx-api";
import { withBackoff } from "./okx-cache";
import { classifyPatterns } from "./classifier";
import { generatePersona } from "./persona";
import { computeBehavioralGrade } from "./grade";
import { computePnl } from "./pnl";
import { loadComparison } from "./cache";

// Chain name to OKX numeric chainIndex
const CHAIN_INDEX: Record<string, string> = {
  ethereum: "1",
  solana: "501",
  xlayer: "196",
};

const MAX_CHAINS = 5;
const BAD_CHARS = /[<>"'&`\\]/;

export class ValidationError extends Error {}

export interface AddressInput {
  address: string;
  chains: string[];
}

export interface AnalyzeOpts {
  /** Explicit page cap; overrides the adaptive budget (used by tests). */
  maxPages?: number;
  /** Deep scan: larger call budget for near-complete history. */
  deep?: boolean;
  /** Real-time progress callback fired at genuine milestones during the scan. */
  onProgress?: (p: AnalyzeProgress) => void;
}

function validateInput(addresses: AddressInput[]): void {
  if (!Array.isArray(addresses)) {
    throw new ValidationError("Invalid request: addresses must be an array");
  }
  if (addresses.length === 0) {
    throw new ValidationError("At least one address required");
  }
  if (addresses.length > 5) {
    throw new ValidationError("Maximum 5 wallets per analysis");
  }
  for (const addr of addresses) {
    if (
      !addr.address ||
      typeof addr.address !== "string" ||
      addr.address.length < 6 ||
      addr.address.length > 100
    ) {
      throw new ValidationError(`Invalid address: ${addr.address?.slice(0, 10)}...`);
    }
    if (BAD_CHARS.test(addr.address)) {
      throw new ValidationError("Invalid address: contains disallowed characters");
    }
    if (!addr.chains || !Array.isArray(addr.chains) || addr.chains.length === 0) {
      throw new ValidationError(`Missing or invalid chains for address: ${addr.address?.slice(0, 10)}...`);
    }
    if (addr.chains.length > MAX_CHAINS) {
      throw new ValidationError(`Maximum ${MAX_CHAINS} chains per wallet`);
    }
    for (const chainName of addr.chains) {
      if (!CHAIN_INDEX[chainName]) {
        throw new ValidationError(`Unknown chain "${chainName}". Supported: ethereum, solana, xlayer`);
      }
    }
  }
}

export async function analyzeWallets(
  addresses: AddressInput[],
  opts?: AnalyzeOpts
): Promise<AnalyzeResponse> {
  validateInput(addresses);

  // ── Adaptive depth ────────────────────────────────
  // Size page depth to the wallet/chain count so wall-clock lands in the
  // ~20-30s band regardless of how many wallets were submitted. At ~0.45s/call
  // the budget keeps standard scans well under the 60s route ceiling; deep
  // scans trade time for near-complete history. Explicit maxPages wins (tests).
  const walletChainCount = addresses.reduce((s, a) => s + a.chains.length, 0) || 1;
  const detailSamples = opts?.deep ? 5 : 3;
  const overhead = walletChainCount + addresses.length * detailSamples;
  const callBudget = opts?.deep ? 110 : 44;
  const pageCap = opts?.deep ? 30 : 12;
  const computedPages = Math.max(
    2,
    Math.min(pageCap, Math.floor((callBudget - overhead) / walletChainCount))
  );
  const maxPages = opts?.maxPages ?? computedPages;

  // ── Honest progress aggregator ────────────────────
  // Counts real OKX calls as they complete; pct is capped at 95 until "done".
  let calls = 0;
  let txnsSoFar = 0;
  const totalCallsEst = Math.max(
    1,
    walletChainCount * (maxPages + 1) + addresses.length * detailSamples
  );
  const emit = (stage: string, detail: string) =>
    opts?.onProgress?.({
      stage,
      detail,
      txns: txnsSoFar,
      calls,
      pct: Math.min(95, Math.round((calls / totalCallsEst) * 100)),
    });
  emit("fetch", "Connecting to OnchainOS...");

  const walletResults: WalletData[] = await Promise.all(
    addresses.map(async (addr) => {
      const allTxns: unknown[] = [];
      const allBalances: unknown[] = [];

      // Fetch per chain -- EVM and Solana must not be mixed in one call
      for (const chainName of addr.chains) {
        const chainIndex = CHAIN_INDEX[chainName]!;
        const [txns, balances] = await Promise.all([
          withBackoff(() =>
            getWalletTxnsPaged(addr.address, chainIndex, maxPages, (inPage) => {
              calls++;
              txnsSoFar += inPage;
              emit("fetch", `Retrieved ${txnsSoFar.toLocaleString()} transactions...`);
            })
          ),
          withBackoff(() => getWalletBalances(addr.address, chainIndex)),
        ]);
        calls++;
        emit("balances", `Loaded holdings for ${addr.address.slice(0, 6)}...`);
        allTxns.push(...txns.map((tx) => ({ ...(tx as object), _chainIndex: chainIndex })));
        allBalances.push(...balances);
      }

      // Sample txns for detail/gas data (gas feeds 2 minor patterns; a small sample suffices)
      const sampleTxns = allTxns.slice(0, detailSamples) as Array<{ txHash?: string; _chainIndex?: string }>;
      const details = await Promise.all(
        sampleTxns
          .filter((tx) => tx.txHash)
          .map((tx) => {
            const chainIndex = tx._chainIndex ?? CHAIN_INDEX[addr.chains[0]]!;
            return withBackoff(() => getTxDetail(chainIndex, tx.txHash!)).then((d) => {
              calls++;
              emit("gas", "Reading gas + transaction detail...");
              return d;
            });
          })
      );

      const primaryChainIndex = CHAIN_INDEX[addr.chains[0]]!;
      const signals = buildWalletSignals(allTxns, allBalances, details, primaryChainIndex, Date.now());
      const trades = deriveTrades(allTxns, addr.address, primaryChainIndex);
      emit("pricing", "Pricing trades + realized PnL...");
      const pnl = await computePnl(trades, addr.chains[0]);

      return {
        address: addr.address,
        chain: addr.chains[0],
        chainId: Number(primaryChainIndex),
        totalTxns: signals.totalTxns,
        avgGasGwei: signals.avgGasGwei,
        networkMedianGasGwei: signals.networkMedianGasGwei,
        trades,
        signals,
        approvals: [],
        tokenScans: [],
        realizedPnl: pnl.realizedPnl,
        winRate: pnl.winRate,
      } satisfies WalletData;
    })
  );

  emit("patterns", "Detecting behavioral patterns...");
  const allPatterns = walletResults.map((w) => classifyPatterns(w));
  emit("personas", "Building your personas...");
  const personas = allPatterns.map((p, i) => {
    const w = walletResults[i];
    const grade = computeBehavioralGrade(w.signals);
    const pnl = { realizedPnl: w.realizedPnl, winRate: w.winRate };
    return generatePersona(
      p,
      w.chain === "solana" ? "SOLANA SELF" : "ETHEREUM SELF",
      grade,
      pnl
    );
  });

  let comparison = null;
  try {
    comparison = loadComparison();
  } catch {
    // Comparison unavailable -- proceed without
  }

  const totalTxns = walletResults.reduce((s, w) => s + w.totalTxns, 0);
  opts?.onProgress?.({ stage: "done", detail: "Analysis complete", txns: totalTxns, calls, pct: 100 });

  return {
    wallets: walletResults.length,
    chains: [...new Set(addresses.flatMap((a) => a.chains))],
    totalTxns,
    patterns: allPatterns,
    personas,
    comparison,
  };
}
