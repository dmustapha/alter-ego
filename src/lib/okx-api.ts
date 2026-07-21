/**
 * OKX public Web3 API client.
 *
 * Base URL: https://web3.okx.com
 * Auth: OK-ACCESS-KEY / OK-ACCESS-SIGN / OK-ACCESS-TIMESTAMP / OK-ACCESS-PASSPHRASE / OK-ACCESS-PROJECT
 * Prehash: timestamp + method + path(+query) + body
 *
 * NOTE: The agentic priapi surface (OKX-ACCESS-* headers) returns 405 and is not used.
 */

import { createHmac } from "crypto";
import type { WalletSignals, Trade } from "./types";

const BASE = "https://web3.okx.com";
const PROJECT_ID = "4d156bf0c61130f2692d097ecb68dbe4";

// Chain index to human-readable name (both directions used by callers)
const CHAIN_NAME: Record<string, string> = {
  "1": "ethereum",
  "501": "solana",
  "196": "xlayer",
};

// Static per-chain median gas in gwei -- placeholder pending GRD-03 live data
const NETWORK_MEDIAN_GAS_GWEI: Record<string, number> = {
  "1": 20,
  "196": 0.05,
  "501": 0,
};

function sign(
  timestamp: string,
  method: string,
  path: string,
  body: string
): string {
  return createHmac("sha256", process.env.OKX_SECRET_KEY || "")
    .update(timestamp + method + path + body)
    .digest("base64");
}

async function okxPublicCall(method: string, path: string) {
  const timestamp = new Date().toISOString();
  const signature = sign(timestamp, method, path, "");

  const headers: Record<string, string> = {
    "OK-ACCESS-KEY": process.env.OKX_API_KEY || "",
    "OK-ACCESS-SIGN": signature,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": process.env.OKX_PASSPHRASE || "",
    "OK-ACCESS-PROJECT": PROJECT_ID,
    "Content-Type": "application/json",
  };

  const res = await fetch(`${BASE}${path}`, { method, headers });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OKX ${res.status}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

// ─── Public endpoints ────────────────────────────────

/**
 * Returns the transaction list for a wallet on a given chain.
 * chain: numeric chainIndex string ("1", "196", "501")
 */
export async function getWalletTxns(
  address: string,
  chain: string
): Promise<unknown[]> {
  const path = `/api/v5/dex/post-transaction/transactions-by-address?address=${address}&chains=${chain}&limit=50`;
  const json = await okxPublicCall("GET", path);
  return json?.data?.[0]?.transactions ?? [];
}

/**
 * Returns token balances for a wallet on a given chain.
 */
export async function getWalletBalances(
  address: string,
  chain: string
): Promise<unknown[]> {
  const path = `/api/v5/dex/balance/all-token-balances-by-address?address=${address}&chains=${chain}`;
  const json = await okxPublicCall("GET", path);
  return json?.data?.[0]?.tokenAssets ?? [];
}

/**
 * Returns detail for a single transaction.
 */
export async function getTxDetail(
  chain: string,
  txHash: string
): Promise<unknown> {
  const path = `/api/v5/dex/post-transaction/transaction-detail-by-txhash?chainIndex=${chain}&txHash=${txHash}`;
  const json = await okxPublicCall("GET", path);
  return json?.data?.[0] ?? null;
}

// ─── Signal builder (pure, unit-tested) ──────────────

/**
 * Builds behavioral signals from raw OKX responses.
 * Pass nowMs explicitly so the function is deterministic in tests.
 */
export function buildWalletSignals(
  txns: unknown[],
  balances: unknown[],
  details: unknown[],
  chain: string,
  nowMs: number = Date.now()
): WalletSignals {
  type Txn = {
    chainIndex: string;
    tokenContractAddress: string;
    symbol: string;
    txTime: string;
    hitBlacklist: boolean;
  };

  type Balance = {
    tokenContractAddress: string;
    balance: string;
    tokenPrice: string;
    isRiskToken: boolean;
  };

  type Detail = { gasPrice: string };

  const t = txns as Txn[];
  const b = balances as Balance[];
  const d = details as Detail[];

  if (t.length === 0 && b.length === 0) {
    return {
      totalTxns: 0,
      daysSinceLastTx: 0,
      activeSpanDays: 0,
      uniqueTokens: 0,
      uniqueChains: 0,
      swapCount: 0,
      tokensHeld: 0,
      riskTokenCount: 0,
      riskTokenPct: 0,
      topHoldingPct: 0,
      avgGasGwei: 0,
      // networkMedianGasGwei is a per-chain network constant, returned even for empty input
      networkMedianGasGwei: NETWORK_MEDIAN_GAS_GWEI[chain] ?? 0,
    };
  }

  const txTimes = t.map((tx) => Number(tx.txTime));
  const maxTime = txTimes.length ? Math.max(...txTimes) : 0;
  const minTime = txTimes.length ? Math.min(...txTimes) : 0;

  const txnAddrs = new Set(
    t.map((tx) => tx.tokenContractAddress).filter(Boolean)
  );
  const balAddrs = new Set(
    b.map((ba) => ba.tokenContractAddress).filter(Boolean)
  );
  const allTokenAddrs = new Set([...txnAddrs, ...balAddrs]);

  const uniqueChains = new Set(t.map((tx) => tx.chainIndex).filter(Boolean))
    .size;

  const swapCount = t.filter(
    (tx) => tx.tokenContractAddress && tx.symbol !== "ETH" && tx.symbol !== "SOL"
  ).length;

  const blacklistedAddrs = new Set(
    t
      .filter((tx) => tx.hitBlacklist === true && tx.tokenContractAddress)
      .map((tx) => tx.tokenContractAddress)
  );

  const riskTokenCount = b.filter(
    (ba) =>
      ba.isRiskToken === true ||
      blacklistedAddrs.has(ba.tokenContractAddress)
  ).length;

  const cleanBalances = b.filter((ba) => ba.isRiskToken !== true);
  const cleanValues = cleanBalances.map(
    (ba) => Number(ba.balance) * Number(ba.tokenPrice)
  );
  const totalValue = cleanValues.reduce((s, v) => s + v, 0);
  const topHoldingPct =
    totalValue > 0 ? (Math.max(...cleanValues) / totalValue) * 100 : 0;

  const gasGweis = d.map((det) => Number(det.gasPrice) / 1e9);
  const avgGasGwei =
    gasGweis.length
      ? gasGweis.reduce((s, v) => s + v, 0) / gasGweis.length
      : 0;

  return {
    totalTxns: t.length,
    daysSinceLastTx: maxTime ? (nowMs - maxTime) / 86400000 : 0,
    activeSpanDays: txTimes.length > 1 ? (maxTime - minTime) / 86400000 : 0,
    uniqueTokens: allTokenAddrs.size,
    uniqueChains,
    swapCount,
    tokensHeld: b.length,
    riskTokenCount,
    riskTokenPct: (riskTokenCount / Math.max(b.length, 1)) * 100,
    topHoldingPct,
    avgGasGwei,
    networkMedianGasGwei: NETWORK_MEDIAN_GAS_GWEI[chain] ?? 0,
  };
}

// ─── Trade deriver ────────────────────────────────────

/**
 * Maps raw OKX transactions to Trade objects.
 * pnl/price/amountUsd/holdDurationDays are 0 (no PnL endpoint in Path B).
 */
export function deriveTrades(
  txns: unknown[],
  walletAddress: string,
  chainIndex: string
): Trade[] {
  type Txn = {
    txHash: string;
    txTime: string;
    tokenContractAddress: string;
    symbol: string;
    from: Array<{ address: string }>;
    amount: string;
  };

  const chainName = CHAIN_NAME[chainIndex] ?? chainIndex;

  return (txns as Txn[]).map((tx) => {
    const isSell =
      tx.from.length > 0 &&
      tx.from[0].address.toLowerCase() === walletAddress.toLowerCase();

    return {
      id: tx.txHash,
      timestamp: Number(tx.txTime),
      token: tx.tokenContractAddress,
      tokenSymbol: tx.symbol,
      chain: chainName,
      type: isSell ? "SELL" : "BUY",
      amount: Number(tx.amount),
      amountUsd: 0,
      price: 0,
      pnlPct: 0,
      pnlUsd: 0,
      holdDurationDays: 0,
    };
  });
}
