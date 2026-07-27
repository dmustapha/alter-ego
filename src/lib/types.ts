// ─── OnchainOS Response Types ──────────────────────
// WARNING: All numeric fields from OnchainOS are Strings. Parse before using.

export interface TokenAsset {
  chainIndex: string;        // String "1", "501", "196"
  tokenContractAddress: string;
  symbol: string;
  balance: string;           // String -- parseFloat() before math
  rawBalance: string;
  tokenPrice: string;
  isRiskToken: boolean;      // Real API returns boolean, not string
}

export interface PortfolioOverview {
  realizedPnlUsd: string;    // String
  winRate: string;           // String e.g. "0.41" = 41%
  topPnlTokenList: Array<{
    symbol: string;
    pnlUsd: string;
  }>;
  buyTxCount: string;
  preferredMarketCap: string;
}

export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  realizedPnlUsd: string;
  winRatePercent: string;
  txs: string;
  txVolume: string;
}

export interface ApprovalEntry {
  contractAddress: string;
  spender: string;
  tokenSymbol: string;
  amount: string;
  riskLevel?: string;
}

export interface TokenScanResult {
  tokenAddress: string;
  chainId: string;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  buyTaxes: string | null;
  sellTaxes: string | null;
  isHoneypot: boolean;
  isRugpull: boolean;
}

// ─── Domain Types ──────────────────────────────────

export interface Trade {
  id: string;
  timestamp: number;         // Unix ms
  token: string;
  tokenSymbol: string;
  chain: string;             // "ethereum" | "solana" | "xlayer"
  type: "BUY" | "SELL";
  amount: number;
  amountUsd: number;
  price: number;
  pnlPct: number;
  pnlUsd: number;
  holdDurationDays: number;
}

export interface WalletSignals {
  totalTxns: number;
  daysSinceLastTx: number;
  activeSpanDays: number;
  uniqueTokens: number;
  uniqueChains: number;
  swapCount: number;
  tokensHeld: number;
  riskTokenCount: number;
  riskTokenPct: number;
  topHoldingPct: number;
  avgGasGwei: number;
  networkMedianGasGwei: number;
}

export interface WalletData {
  address: string;
  chain: string;
  chainId: number;
  totalTxns: number;
  realizedPnl: number | null;
  winRate: number | null;    // 0-100, null when unavailable
  trades: Trade[];
  approvals: ApprovalEntry[];
  tokenScans: TokenScanResult[];
  avgGasGwei: number;
  networkMedianGasGwei: number;
  signals: WalletSignals;
}

export interface Pattern {
  id: string;                // "AMP-01" through "GRD-06"
  tag: string;               // Human-readable tag name
  type: "AMPLIFY" | "GUARD";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidence: Trade[];         // Supporting trades
  count: number;
  costUsd?: number;          // Only for GUARD patterns - dollar cost of bad behavior
  insight: string;           // Human-readable insight
}

export interface PatternResult {
  walletAddress: string;
  chain: string;
  amplify: Pattern[];
  guard: Pattern[];
}

export interface BehavioralGrade {
  score: number;
  letter: string;
  components: Record<string, number>;
}

export interface Persona {
  walletLabel: string;       // "ETHEREUM SELF" | "SOLANA SELF"
  archetype: string;         // "The Professional" | "The Degen"
  catchphrase: string;
  vice: string;
  superpower: string;
  kryptonite: string;
  tradingStyle: string;
  emojiSignature: string;
  /** @deprecated Do not render or feed to text/LLM. 0 here means PnL unavailable. Use realizedPnl (null-safe). */
  pnlTotal: number;          // backward-compat; equals realizedPnl ?? 0
  realizedPnl: number | null;
  winRate: number | null;
  grade: BehavioralGrade;
  amplifyTags: Pattern[];
  guardTags: Pattern[];
}

export interface CompareResult {
  userWinRate: number;
  topTraderWinRate: number;
  userAvgExit: number;
  topTraderAvgExit: number;
  gapCostUsd: number;
  worstHabit: string;
  theirStrategy: string;
  topTrader: LeaderboardEntry;
}

export interface RoastLine {
  round: number;
  speaker: string;           // "ETHEREUM SELF" | "SOLANA SELF" | "BOTH"
  text: string;
  onScreenTag: string;       // GUARD tag that flashes
  onScreenData: string;      // Specific on-chain evidence
}

export interface RoastBattle {
  walletA: Persona;
  walletB: Persona;
  lines: RoastLine[];
}

export interface AnalyzeRequest {
  addresses: Array<{
    address: string;
    chains: string[];
  }>;
}

/** Honest, real-time progress emitted by analyzeWallets during a live scan. */
export interface AnalyzeProgress {
  stage: string;    // machine key: "fetch" | "balances" | "gas" | "pricing" | "patterns" | "personas" | "done"
  detail: string;   // human line for the loading screen
  txns: number;     // transactions retrieved so far
  calls: number;    // OKX requests completed so far
  pct: number;      // 0-100, capped at 95 until the final "done"
}

export interface AnalyzeResponse {
  wallets: number;
  chains: string[];
  totalTxns: number;
  patterns: PatternResult[];
  personas: Persona[];
  comparison: CompareResult | null;
}

// ─── Demo Mode Types ────────────────────────────────

export interface CachedDemoData {
  walletA: WalletData;
  walletB: WalletData;
  walletC: WalletData;
  patterns: PatternResult[];
  personas: Persona[];
  comparison: CompareResult;
  roastBattle: RoastBattle;
  leaderboard: LeaderboardEntry[];
}
