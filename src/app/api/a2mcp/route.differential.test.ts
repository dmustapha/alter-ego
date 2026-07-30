/**
 * Differential regression test: two genuinely different wallets produce
 * different, non-empty pattern tag sets through the REAL signal builder
 * and classifier. Network calls are mocked; all engine logic runs for real.
 *
 * This is the guard the pipeline never had -- it catches classifiers that
 * return identical or empty output regardless of input.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// ─── Load fixtures (offline) ─────────────────────────

import ethTxnsRaw from "@/lib/__fixtures__/okx-txns-eth.json";
import ethBalancesRaw from "@/lib/__fixtures__/okx-balances-eth.json";
import xlayerTxnsRaw from "@/lib/__fixtures__/okx-txns-xlayer.json";
import xlayerBalancesRaw from "@/lib/__fixtures__/okx-balances-xlayer.json";
import txDetailRaw from "@/lib/__fixtures__/okx-txdetail-eth.json";

const ETH_TXNS = ethTxnsRaw.data[0].transactions;
const ETH_BALANCES = ethBalancesRaw.data[0].tokenAssets;
const XLAYER_TXNS = xlayerTxnsRaw.data[0].transactions;
// XLayer balance fixture has empty data -- wallet holds 0 tokens
const XLAYER_BALANCES = xlayerBalancesRaw.data.length > 0
  ? (xlayerBalancesRaw.data[0] as { tokenAssets: unknown[] }).tokenAssets
  : [];
const ETH_DETAIL = txDetailRaw.data[0];

// ─── Mock only the network functions ─────────────────
// The pure engine (buildWalletSignals, deriveTrades, classifyPatterns, generatePersona)
// is NOT mocked -- it runs for real so this test proves actual differentiation.

vi.mock("@/lib/okx-api", async (importActual) => {
  const real = await importActual<typeof import("@/lib/okx-api")>();
  return {
    ...real,
    getWalletTxnsPaged: vi.fn((_address: string, chain: string) => {
      if (chain === "1") return Promise.resolve(ETH_TXNS);
      if (chain === "196") return Promise.resolve(XLAYER_TXNS);
      return Promise.resolve([]);
    }),
    getWalletBalances: vi.fn((_address: string, chain: string) => {
      if (chain === "1") return Promise.resolve(ETH_BALANCES);
      if (chain === "196") return Promise.resolve(XLAYER_BALANCES);
      return Promise.resolve([]);
    }),
    getTxDetail: vi.fn(() => Promise.resolve(ETH_DETAIL)),
  };
});

// withBackoff is a pass-through in tests (no retries needed with mocked network).
vi.mock("@/lib/okx-cache", async (importActual) => {
  const real = await importActual<typeof import("@/lib/okx-cache")>();
  return {
    ...real,
    withBackoff: vi.fn(<T>(fn: () => Promise<T>) => fn()),
  };
});

vi.mock("@/lib/defillama", () => ({
  getHistoricalPrices: vi.fn((requests: Array<{ chain: string; address: string; ts: number }>) =>
    Promise.resolve(new Map(requests.map((request) => [`${request.chain}:${request.address}:${request.ts}`, 1])))
  ),
}));

// The route now gates the analyze path on x402 payment (issued by the OKX Payment SDK, whose
// facilitator host is unreachable from this machine). This test exercises the real engine, not
// payment, so treat every request as paid. This does NOT weaken the differential assertion below.
// Always-paid: withX402 mock runs the handler directly so the differential exercises the
// real classifier regardless of X-PAYMENT.
vi.mock("@okxweb3/x402-next", () => ({
  withX402: (handler: (r: Request) => Promise<Response>) => async (req: Request) => handler(req),
  x402ResourceServer: class {
    register() {
      return this;
    }
  },
}));
vi.mock("@okxweb3/x402-core", () => ({ OKXFacilitatorClient: class {} }));
vi.mock("@okxweb3/x402-evm/exact/server", () => ({ ExactEvmScheme: class {} }));

// Cache is filesystem-based. Stub it out so the route takes the live analysis
// path regardless of whether a demo seed exists on disk.
vi.mock("@/lib/cache", () => ({
  cacheExists: vi.fn(() => false),
  loadAllDemoData: vi.fn(() => { throw new Error("should not be called in live mode"); }),
  loadComparison: vi.fn(() => { throw new Error("no comparison in test"); }),
}));

// ─── Helpers ─────────────────────────────────────────

type PatternResult = {
  amplify: Array<{ tag: string }>;
  guard: Array<{ tag: string }>;
};

type AnalyzeResponse = {
  patterns: PatternResult[];
  [key: string]: unknown;
};

function tagsOf(result: PatternResult): string[] {
  return [
    ...result.amplify.map((x) => x.tag),
    ...result.guard.map((x) => x.tag),
  ].sort();
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/a2mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Tests ───────────────────────────────────────────

describe("a2mcp differential regression", () => {
  beforeEach(() => {
    // Ensure demo mode is off so the route takes the live analysis path
    delete process.env.DEMO_MODE;
  });

  it("ETH wallet produces non-empty pattern tags", async () => {
    const req = makeRequest({ address: "0xAAAA000000000000000000000000000000000001", chains: ["ethereum"] });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = (await res.json()) as AnalyzeResponse;
    expect(json.patterns).toBeDefined();
    expect(json.patterns.length).toBeGreaterThan(0);

    const tags = tagsOf(json.patterns[0]);
    expect(tags.length).toBeGreaterThan(0);
  });

  it("XLayer wallet produces non-empty pattern tags", async () => {
    const req = makeRequest({ address: "0xBBBB000000000000000000000000000000000002", chains: ["xlayer"] });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = (await res.json()) as AnalyzeResponse;
    expect(json.patterns).toBeDefined();
    expect(json.patterns.length).toBeGreaterThan(0);

    const tags = tagsOf(json.patterns[0]);
    expect(tags.length).toBeGreaterThan(0);
  });

  it("two different wallets produce genuinely different pattern tag sets", async () => {
    const [ethRes, xlayerRes] = await Promise.all([
      POST(makeRequest({ address: "0xAAAA000000000000000000000000000000000001", chains: ["ethereum"] })),
      POST(makeRequest({ address: "0xBBBB000000000000000000000000000000000002", chains: ["xlayer"] })),
    ]);

    expect(ethRes.status).toBe(200);
    expect(xlayerRes.status).toBe(200);

    const ethJson = (await ethRes.json()) as AnalyzeResponse;
    const xlayerJson = (await xlayerRes.json()) as AnalyzeResponse;

    const ethTags = tagsOf(ethJson.patterns[0]);
    const xlayerTags = tagsOf(xlayerJson.patterns[0]);

    // Log observed tag sets so any failure can be diagnosed
    console.log("[differential] ethTags:", ethTags);
    console.log("[differential] xlayerTags:", xlayerTags);

    // Guard: both must be non-empty
    expect(ethTags.length).toBeGreaterThan(0);
    expect(xlayerTags.length).toBeGreaterThan(0);

    // Core differential assertion: the classifier must produce DIFFERENT outputs
    // for these two genuinely different wallets. If this fails, the classifier
    // is not differentiating -- investigate the signal builder or pattern rules.
    // DO NOT weaken this assertion to force a pass.
    expect(ethTags.join(",")).not.toEqual(xlayerTags.join(","));
  });
});
