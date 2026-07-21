import { describe, it, expect, vi } from "vitest";
import Ajv from "ajv";

// Same engine mock as the route test: a WalletData with non-empty patterns, no network.
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
vi.mock("@/lib/x402/okx-x402", () => ({
  enforceX402: vi.fn(async (req: Request) =>
    req.headers.get("X-PAYMENT") ? { paid: true } : { paid: false, challenge: new Response(null, { status: 402 }) }
  ),
}));

import { POST } from "@/app/api/a2mcp/route";
import { buildAgentCard } from "./agent-card";

describe("A2MCP conformance", () => {
  it("the served analyze payload validates against the card's advertised output schema", async () => {
    process.env.A2MCP_ENDPOINT_URL = "https://x/api/a2mcp";
    process.env.A2MCP_PAYTO_ADDRESS = "0x000000000000000000000000000000000000dEaD";
    const res = await POST(
      new Request("http://x/api/a2mcp", {
        method: "POST",
        headers: { "X-PAYMENT": "eyJ4NDAyIjp0cnVlfQ==" },
        body: JSON.stringify({ address: "0xabcabc", chains: ["ethereum"] }),
      })
    );
    const payload = await res.json();
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(buildAgentCard().output as object);
    const ok = validate(payload);
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });
});
