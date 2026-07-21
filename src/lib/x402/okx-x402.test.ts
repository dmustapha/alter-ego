import { describe, it, expect } from "vitest";
import {
  encodePaymentSignatureHeader,
  decodePaymentResponseHeader,
} from "@okxweb3/x402-core/http";
import {
  enforceX402,
  USDT0_ADDRESS,
  XLAYER_NETWORK,
  X402_TIMEOUT_SECONDS,
  type X402Server,
} from "./okx-x402";

// A real v2 PaymentRequired the SDK would emit for USDT0 / eip155:196.
const REQUIREMENTS = {
  scheme: "exact",
  network: XLAYER_NETWORK,
  asset: USDT0_ADDRESS,
  amount: "10000",
  payTo: "0x000000000000000000000000000000000000dEaD",
  maxTimeoutSeconds: X402_TIMEOUT_SECONDS,
  extra: { name: "USD₮0", version: "1" },
};
const PAYMENT_REQUIRED = {
  x402Version: 2,
  resource: { url: "https://x/api/a2mcp", description: "Alter Ego wallet analysis", mimeType: "application/json" },
  accepts: [REQUIREMENTS],
};

// Fake x402ResourceServer: unpaid unless a payload was decoded from X-PAYMENT.
const fakeServer: X402Server = {
  async processPaymentRequest(payload) {
    if (!payload) return { success: false, requiresPayment: PAYMENT_REQUIRED };
    return {
      success: true,
      settlementResult: {
        success: true,
        status: "success",
        transaction: "0xabc",
        network: XLAYER_NETWORK,
        payer: "0xpayer",
      },
    };
  },
};

const RES = "https://x/api/a2mcp";

describe("enforceX402", () => {
  it("unpaid: returns 402 with a base64 PAYMENT-REQUIRED decoding to a v2 USDT0/eip155:196 challenge", async () => {
    const req = new Request(RES, { method: "POST", body: JSON.stringify({ address: "0xabc" }) });
    const res = await enforceX402(req, RES, fakeServer);
    expect(res.paid).toBe(false);
    if (res.paid) return;
    expect(res.challenge.status).toBe(402);
    const header = res.challenge.headers.get("PAYMENT-REQUIRED");
    expect(header).toBeTruthy();
    const challenge = JSON.parse(Buffer.from(header!, "base64").toString("utf8"));
    expect(challenge.x402Version).toBe(2);
    expect(challenge.resource.mimeType).toBe("application/json");
    const a = challenge.accepts[0];
    expect(a.scheme).toBe("exact");
    expect(a.network).toBe("eip155:196");
    expect(a.asset.toLowerCase()).toBe(USDT0_ADDRESS);
    expect(a.maxTimeoutSeconds).toBe(300);
    expect(/^\d+$/.test(a.amount)).toBe(true);
  });

  it("paid: returns paid:true with a decodable PAYMENT-RESPONSE when a valid X-PAYMENT is present", async () => {
    const xPayment = encodePaymentSignatureHeader({
      x402Version: 2,
      accepted: REQUIREMENTS,
      payload: { signature: "0xsig", authorization: {} },
    } as never);
    const req = new Request(RES, { method: "POST", headers: { "X-PAYMENT": xPayment }, body: "{}" });
    const res = await enforceX402(req, RES, fakeServer);
    expect(res.paid).toBe(true);
    if (!res.paid) return;
    expect(res.paymentResponse).toBeTruthy();
    const settle = decodePaymentResponseHeader(res.paymentResponse!);
    expect(settle.status).toBe("success");
    expect(settle.transaction).toBe("0xabc");
  });

  it("invalid payment: returns a 402 challenge when the facilitator rejects", async () => {
    const rejectingServer: X402Server = {
      async processPaymentRequest() {
        return { success: false, requiresPayment: PAYMENT_REQUIRED, error: "invalid signature" };
      },
    };
    const xPayment = encodePaymentSignatureHeader({
      x402Version: 2,
      accepted: REQUIREMENTS,
      payload: { signature: "0xbad", authorization: {} },
    } as never);
    const req = new Request(RES, { method: "POST", headers: { "X-PAYMENT": xPayment }, body: "{}" });
    const res = await enforceX402(req, RES, rejectingServer);
    expect(res.paid).toBe(false);
    if (res.paid) return;
    expect(res.challenge.status).toBe(402);
  });
});
