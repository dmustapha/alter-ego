import type { AnalyzeResponse, WalletData } from "./types";
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
  maxPages?: number;
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

  const maxPages = opts?.maxPages ?? 2;

  const walletResults: WalletData[] = await Promise.all(
    addresses.map(async (addr) => {
      const allTxns: unknown[] = [];
      const allBalances: unknown[] = [];

      // Fetch per chain -- EVM and Solana must not be mixed in one call
      for (const chainName of addr.chains) {
        const chainIndex = CHAIN_INDEX[chainName]!;
        const [txns, balances] = await Promise.all([
          withBackoff(() => getWalletTxnsPaged(addr.address, chainIndex, maxPages)),
          withBackoff(() => getWalletBalances(addr.address, chainIndex)),
        ]);
        allTxns.push(...txns.map((tx) => ({ ...(tx as object), _chainIndex: chainIndex })));
        allBalances.push(...balances);
      }

      // Sample up to 3 txns for detail/gas data (gas feeds only 2 minor patterns; 3 samples sufficient)
      const sampleTxns = allTxns.slice(0, 3) as Array<{ txHash?: string; _chainIndex?: string }>;
      const details = await Promise.all(
        sampleTxns
          .filter((tx) => tx.txHash)
          .map((tx) => {
            const chainIndex = tx._chainIndex ?? CHAIN_INDEX[addr.chains[0]]!;
            return withBackoff(() => getTxDetail(chainIndex, tx.txHash!));
          })
      );

      const primaryChainIndex = CHAIN_INDEX[addr.chains[0]]!;
      const signals = buildWalletSignals(allTxns, allBalances, details, primaryChainIndex, Date.now());
      const trades = deriveTrades(allTxns, addr.address, primaryChainIndex);
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

  const allPatterns = walletResults.map((w) => classifyPatterns(w));
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

  return {
    wallets: walletResults.length,
    chains: [...new Set(addresses.flatMap((a) => a.chains))],
    totalTxns: walletResults.reduce((s, w) => s + w.totalTxns, 0),
    patterns: allPatterns,
    personas,
    comparison,
  };
}
