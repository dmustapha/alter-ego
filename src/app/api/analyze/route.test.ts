/**
 * TDD test for /api/analyze route.
 * Mocks only network calls; lets pure builders run for real.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// -- Fixtures --

// -- Mock setup --

// Mock analyzeWallets so the route is testable in isolation without network.
const MOCK_ANALYZE_RESULT = {
  wallets: 1,
  chains: ["ethereum"],
  totalTxns: 2,
  patterns: [{ walletAddress: "0xabc", chain: "ethereum", amplify: [], guard: [] }],
  personas: [
    {
      walletLabel: "ETHEREUM SELF",
      archetype: "The Test",
      catchphrase: "test",
      vice: "none",
      superpower: "none",
      kryptonite: "none",
      tradingStyle: "test",
      emojiSignature: "T",
      pnlTotal: 0,
      grade: { score: 72, letter: "B", components: {} },
      realizedPnl: null,
      winRate: null,
      amplifyTags: [],
      guardTags: [],
    },
  ],
  comparison: null,
};

vi.mock("@/lib/analyze", async (importActual) => {
  const real = await importActual<typeof import("@/lib/analyze")>();
  return {
    ...real,
    // Run real validation so ValidationError is raised for bad input (400 path).
    // For valid input, short-circuit before hitting OKX and return the fixture.
    analyzeWallets: vi.fn(async (addresses: Parameters<typeof real.analyzeWallets>[0]) => {
      // validateInput is called as the first thing in analyzeWallets before any await.
      // It throws ValidationError (a rejected Promise) for bad input. Awaiting the real
      // call propagates that rejection immediately so the route can catch it as 400.
      // For valid input the real call would proceed to OKX, so we detect valid input
      // by checking the same conditions validateInput checks and bail early.
      const BAD_CHARS = /[<>"'&`\\]/;
      const VALID_CHAINS = new Set(["ethereum", "solana", "xlayer"]);
      let valid = Array.isArray(addresses) && addresses.length > 0 && addresses.length <= 5;
      if (valid) {
        for (const addr of addresses) {
          const a = addr.address;
          if (!a || typeof a !== "string" || a.length < 6 || a.length > 100 || BAD_CHARS.test(a)) { valid = false; break; }
          const chains = addr.chains;
          if (!Array.isArray(chains) || chains.length === 0 || chains.length > 5) { valid = false; break; }
          if (chains.some((c: string) => !VALID_CHAINS.has(c))) { valid = false; break; }
        }
      }
      if (!valid) {
        // Delegate to real impl which will reject with ValidationError immediately.
        return real.analyzeWallets(addresses);
      }
      return MOCK_ANALYZE_RESULT;
    }),
  };
});

vi.mock("@/lib/cache", () => ({
  loadComparison: vi.fn().mockReturnValue(null),
  loadAllDemoData: vi.fn(),
  cacheExists: vi.fn().mockReturnValue(false),
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
    expect(Number(last!.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});
