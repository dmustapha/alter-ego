import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the engine so the analyze path produces a WalletData with non-empty patterns without any
// network. buildWalletSignals returns signals that trigger classifier patterns (multi-chain +
// active trader). web3.okx.com is unreachable here, so no real fetch ever runs.
vi.mock("@/lib/okx-api", () => ({
  getWalletTxns: vi.fn().mockResolvedValue([]),
  getWalletBalances: vi.fn().mockResolvedValue([]),
  getTxDetail: vi.fn().mockResolvedValue({}),
  buildWalletSignals: vi.fn().mockReturnValue({
    totalTxns: 200,
    daysSinceLastTx: 1,
    activeSpanDays: 100,
    uniqueTokens: 10,
    uniqueChains: 3,
    swapCount: 40,
    tokensHeld: 12,
    riskTokenCount: 0,
    riskTokenPct: 0,
    topHoldingPct: 20,
    avgGasGwei: 5,
    networkMedianGasGwei: 10,
  }),
  deriveTrades: vi.fn().mockReturnValue([]),
}));

// Delegate the 402/paid decision to the SDK wrapper: unpaid unless X-PAYMENT present.
vi.mock("@/lib/x402/okx-x402", () => ({
  enforceX402: vi.fn(async (req: Request) =>
    req.headers.get("X-PAYMENT")
      ? { paid: true, paymentResponse: "cGF5LXJlc3A=" }
      : {
          paid: false,
          challenge: new Response(JSON.stringify({ error: "payment required" }), {
            status: 402,
            headers: { "content-type": "application/json", "PAYMENT-REQUIRED": "eyJ4NDAyVmVyc2lvbiI6Mn0=" },
          }),
        }
  ),
}));

import { POST, GET } from "./route";

const URL = "http://x/api/a2mcp";

describe("POST /api/a2mcp", () => {
  beforeEach(() => {
    delete process.env.DEMO_MODE;
  });

  it("acks an A2A system envelope without demanding payment", async () => {
    const res = await POST(
      new Request(URL, {
        method: "POST",
        body: JSON.stringify({ agentId: "6013", message: { source: "system", event: "JOB_CREATED", jobId: "j1" } }),
      })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).jobId).toBe("j1");
  });

  it("returns 402 with PAYMENT-REQUIRED (SDK challenge) when an analyze call lacks X-PAYMENT", async () => {
    const res = await POST(
      new Request(URL, { method: "POST", body: JSON.stringify({ address: "0xabcabc", chains: ["ethereum"] }) })
    );
    expect(res.status).toBe(402);
    expect(res.headers.get("PAYMENT-REQUIRED")).toBeTruthy();
  });

  it("serves real patterns when the analyze call carries X-PAYMENT", async () => {
    const res = await POST(
      new Request(URL, {
        method: "POST",
        headers: { "X-PAYMENT": "eyJ4NDAyIjp0cnVlfQ==" },
        body: JSON.stringify({ address: "0xabcabc", chains: ["ethereum"] }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.patterns.flatMap((p: { amplify: unknown[]; guard: unknown[] }) => [...p.amplify, ...p.guard]).length).toBeGreaterThan(0);
    expect(JSON.stringify(json)).not.toContain("_debug");
  });

  it("GET unpaid returns a 402 with PAYMENT-REQUIRED and the agent card in the body", async () => {
    const res = await GET(new Request(URL, { method: "GET" }));
    expect(res.status).toBe(402);
    expect(res.headers.get("PAYMENT-REQUIRED")).toBeTruthy();
    const json = await res.json();
    expect(Array.isArray(json.capabilities)).toBe(true);
    expect(json.error).toBe("payment required");
  });

  it("GET paid returns the agent card 200", async () => {
    const res = await GET(new Request(URL, { method: "GET", headers: { "X-PAYMENT": "x" } }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.capabilities)).toBe(true);
  });
});
