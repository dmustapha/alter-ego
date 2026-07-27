import { describe, it, expect, vi } from "vitest";
vi.mock("./okx-api", async (orig) => ({ ...(await orig()),
  getWalletTxnsPaged: vi.fn(async () => Array(60).fill({ txHash: "0x1", chainIndex: "1", txTime: String(Date.now()), from: [{address:"0xabc"}], amount:"1", symbol:"X", tokenContractAddress:"0xt" })),
  getWalletBalances: vi.fn(async () => []),
  getTxDetail: vi.fn(async () => ({ gasPrice: "1000000000" })),
}));
vi.mock("./pnl", () => ({
  computePnl: vi.fn(async () => ({ realizedPnl: 1234.56, winRate: 62, pricedTrades: [], source: "fifo" })),
}));
it("analyzes a wallet end to end", async () => {
  const { analyzeWallets } = await import("./analyze");
  const r = await analyzeWallets([{ address: "0xabc0000000000000000000000000000000000000", chains: ["ethereum"] }], { maxPages: 1 });
  expect(r.wallets).toBe(1);
  expect(r.totalTxns).toBe(60);
  expect(Array.isArray(r.patterns)).toBe(true);
  expect(r.personas[0].walletLabel).toBe("ETHEREUM · 0xabc0…0000");
  // grade is wired from computeBehavioralGrade
  expect(typeof r.personas[0].grade.score).toBe("number");
  expect(typeof r.personas[0].grade.letter).toBe("string");
  expect(["S","A","B","C","D","F"]).toContain(r.personas[0].grade.letter);
  // pnl is wired from mocked computePnl
  expect(r.personas[0].realizedPnl).toBe(1234.56);
  expect(r.personas[0].winRate).toBe(62);
});
