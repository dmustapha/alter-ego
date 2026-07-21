/**
 * TDD test for /api/analyze route.
 * Mocks only network calls; lets pure builders run for real.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// -- Fixtures --

const MOCK_TXNS = [
  {
    txHash: "0xaaa",
    txTime: String(Date.now() - 86400000),
    tokenContractAddress: "0xtoken1",
    symbol: "USDC",
    chainIndex: "1",
    hitBlacklist: false,
    from: [{ address: "0xabc" }],
    amount: "100",
  },
  {
    txHash: "0xbbb",
    txTime: String(Date.now() - 172800000),
    tokenContractAddress: "0xtoken2",
    symbol: "DAI",
    chainIndex: "1",
    hitBlacklist: false,
    from: [{ address: "0xother" }],
    amount: "50",
  },
];

const MOCK_BALANCES = [
  {
    tokenContractAddress: "0xtoken1",
    symbol: "USDC",
    balance: "100",
    tokenPrice: "1",
    isRiskToken: false,
  },
  {
    tokenContractAddress: "0xtoken2",
    symbol: "DAI",
    balance: "50",
    tokenPrice: "1",
    isRiskToken: false,
  },
];

const MOCK_DETAIL = { gasPrice: "20000000000" }; // 20 gwei

// -- Mock setup --

vi.mock("@/lib/okx-api", async (importActual) => {
  const real = await importActual<typeof import("@/lib/okx-api")>();
  return {
    ...real,
    getWalletTxns: vi.fn().mockResolvedValue(MOCK_TXNS),
    getWalletBalances: vi.fn().mockResolvedValue(MOCK_BALANCES),
    getTxDetail: vi.fn().mockResolvedValue(MOCK_DETAIL),
  };
});

// Mock cache and classifier/persona so route is testable in isolation
vi.mock("@/lib/cache", () => ({
  loadComparison: vi.fn().mockReturnValue(null),
  loadAllDemoData: vi.fn(),
  cacheExists: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/classifier", () => ({
  classifyPatterns: vi.fn().mockReturnValue({
    walletAddress: "0xabc",
    chain: "ethereum",
    amplify: [],
    guard: [],
  }),
}));

vi.mock("@/lib/persona", () => ({
  generatePersona: vi.fn().mockReturnValue({
    walletLabel: "ETHEREUM SELF",
    archetype: "The Test",
    catchphrase: "test",
    vice: "none",
    superpower: "none",
    kryptonite: "none",
    tradingStyle: "test",
    emojiSignature: "T",
    pnlTotal: 0,
    amplifyTags: [],
    guardTags: [],
  }),
}));

// -- Tests --

describe("POST /api/analyze", () => {
  beforeEach(() => {
    delete process.env.DEMO_MODE;
  });

  it("returns 200 with live signals when DEMO_MODE is unset", async () => {
    const { POST } = await import("./route");

    const req = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addresses: [{ address: "0xabcdef1234", chains: ["ethereum"] }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();

    expect(json.wallets).toBe(1);
    expect(typeof json.totalTxns).toBe("number");
    expect(json.totalTxns).toBeGreaterThan(0);
    expect(Array.isArray(json.patterns)).toBe(true);

    // signals.uniqueTokens >= 1 (two tokens in balances fixture)
    // The route returns patterns[], not walletResults directly.
    // We verify via the response shape; totalTxns is aggregated from signals.
  });

  it("rejects unknown chain with 400", async () => {
    const { POST } = await import("./route");

    const req = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addresses: [{ address: "0xabcdef1234", chains: ["unknownchain"] }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects addresses with disallowed characters with 400", async () => {
    const { POST } = await import("./route");

    const req = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addresses: [{ address: "<script>alert(1)</script>", chains: ["ethereum"] }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 429 on the 11th rapid request from one IP", async () => {
    const { POST } = await import("./route");
    const mk = () =>
      new Request("http://localhost/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "9.9.9.9",
        },
        body: JSON.stringify({
          addresses: [{ address: "0xabcdef1234", chains: ["ethereum"] }],
        }),
      });
    let last: Response | undefined;
    for (let i = 0; i < 11; i++) last = await POST(mk());
    expect(last!.status).toBe(429);
  });
});
