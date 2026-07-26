import { describe, it, expect, vi } from "vitest";
import Ajv from "ajv";

// Mock analyzeWallets so the conformance test runs without network.
vi.mock("@/lib/analyze", async (importActual) => {
  const real = await importActual<typeof import("@/lib/analyze")>();
  return {
    ...real,
    analyzeWallets: vi.fn().mockResolvedValue({
      wallets: 1,
      chains: ["ethereum"],
      totalTxns: 200,
      patterns: [
        {
          walletAddress: "0xabcabc",
          chain: "ethereum",
          amplify: [{ id: "p1", tag: "ACTIVE_TRADER", type: "AMPLIFY", confidence: "HIGH", evidence: [], count: 200, insight: "Trades frequently" }],
          guard: [{ id: "p2", tag: "MULTI_CHAIN", type: "GUARD", confidence: "MEDIUM", evidence: [], count: 3, insight: "Uses multiple chains" }],
        },
      ],
      personas: [
        {
          walletLabel: "ETHEREUM SELF",
          archetype: "The Active Trader",
          catchphrase: "Buy high sell higher",
          vice: "FOMO",
          superpower: "Speed",
          kryptonite: "Volatility",
          tradingStyle: "aggressive",
          emojiSignature: "T",
          pnlTotal: 0,
          amplifyTags: ["ACTIVE_TRADER"],
          guardTags: ["MULTI_CHAIN"],
        },
      ],
      comparison: null,
    }),
  };
});

vi.mock("@/lib/cache", () => ({
  loadAllDemoData: vi.fn(),
  cacheExists: vi.fn().mockReturnValue(false),
}));
vi.mock("@okxweb3/x402-next", () => ({
  withX402: (handler: (r: Request) => Promise<Response>) => async (req: Request) =>
    req.headers.get("X-PAYMENT") ? handler(req) : new Response(null, { status: 402, headers: { "PAYMENT-REQUIRED": "eyJ4NDAyVmVyc2lvbiI6Mn0=" } }),
  x402ResourceServer: class {
    register() {
      return this;
    }
  },
}));
vi.mock("@okxweb3/x402-core", () => ({ OKXFacilitatorClient: class {} }));
vi.mock("@okxweb3/x402-evm/exact/server", () => ({ ExactEvmScheme: class {} }));

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
