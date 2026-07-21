import { describe, it, expect } from "vitest";
import {
  enforceX402,
  USDT0_ADDRESS,
  XLAYER_NETWORK,
  X402_TIMEOUT_SECONDS,
  type X402Server,
} from "@/lib/x402/okx-x402";

// web3.okx.com is unreachable from this machine, so we never call the real facilitator.
// enforceX402 exposes a test seam (serverOverride): a fake x402ResourceServer whose
// processPaymentRequest(null, ...) returns a real v2 PaymentRequired object. This asserts
// enforceX402 encodes that object into the corrected v2 402 (USDT0 / eip155:196 / 300s).
const REQUIREMENTS = {
  scheme: "exact",
  network: XLAYER_NETWORK,
  asset: USDT0_ADDRESS,
  maxAmountRequired: "1000000",
  payTo: "0x000000000000000000000000000000000000dEaD",
  resource: "https://alter-ego-wine-mu.vercel.app/api/a2mcp",
  maxTimeoutSeconds: X402_TIMEOUT_SECONDS,
  extra: { name: "USD₮0", version: "1" },
};
const PAYMENT_REQUIRED = {
  x402Version: 2,
  resource: {
    url: "https://alter-ego-wine-mu.vercel.app/api/a2mcp",
    description: "Alter Ego wallet analysis",
    mimeType: "application/json",
  },
  accepts: [REQUIREMENTS],
};

const fakeServer: X402Server = {
  async processPaymentRequest(payload) {
    if (!payload) return { success: false, requiresPayment: PAYMENT_REQUIRED };
    return { success: true, settlementResult: { success: true, status: "success", transaction: "0xabc" } };
  },
};

const RES = "https://alter-ego-wine-mu.vercel.app/api/a2mcp";

describe("enforceX402 delegation (SDK-issued v2 402)", () => {
  it("returns an unpaid challenge that is a real 402 with a v2 PAYMENT-REQUIRED header", async () => {
    const r = await enforceX402(new Request(RES, { method: "POST" }), RES, fakeServer);
    expect(r.paid).toBe(false);
    if (r.paid) return;
    expect(r.challenge.status).toBe(402);
    const b64 = r.challenge.headers.get("PAYMENT-REQUIRED");
    expect(b64).toBeTruthy();
    const decoded = JSON.parse(Buffer.from(b64!, "base64").toString("utf8"));
    expect(decoded.x402Version).toBe(2);
    expect(decoded.resource.mimeType).toBe("application/json");
    const a = decoded.accepts[0];
    expect(a.scheme).toBe("exact");
    expect(a.network).toBe("eip155:196");
    expect(a.maxTimeoutSeconds).toBe(300);
    expect(a.asset.toLowerCase()).toBe(USDT0_ADDRESS.toLowerCase());
    expect(/^\d+$/.test(a.maxAmountRequired)).toBe(true);
  });
});
