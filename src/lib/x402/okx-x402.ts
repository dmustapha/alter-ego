// OKX x402 seller-side wrapper (Plan 3). Issues the SDK-standard v2 402 and verifies X-PAYMENT.
// Contract pinned in docs/X402-CONTRACT.md. USDT0 / 6dp / eip155:196 are baked into the OKX SDK.
// Built on @okxweb3/x402-core so a single request branch (the paid a2mcp tier) can be gated;
// withX402 wraps a whole handler and cannot gate one branch of the classify-first route.

import { x402ResourceServer } from "@okxweb3/x402-core/server";
import { OKXFacilitatorClient } from "@okxweb3/x402-core";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";
import {
  encodePaymentRequiredHeader,
  decodePaymentSignatureHeader,
  encodePaymentResponseHeader,
} from "@okxweb3/x402-core/http";

// Canonical x402 literals (single source of truth; re-exported by src/lib/a2mcp/constants.ts).
export const XLAYER_NETWORK = "eip155:196" as const;
export const XLAYER_CHAIN_INDEX = 196 as const;
export const USDT0_ADDRESS = "0x779ded0c9e1022225f8e0630b35a9b54be713736" as const;
export const USDT0_DECIMALS = 6 as const;
export const X402_TIMEOUT_SECONDS = 300 as const;
// Price string the ExactEvmScheme converts to USDT0 atomic units ("$1" -> "1000000" at 6dp).
// 1 USDT0 keeps the marketplace fee (digits-only integer), the agent card, and the x402
// challenge one consistent honest number. Override with X402_PRICE if needed.
export const X402_PRICE = process.env.X402_PRICE || "$1";
export const X402_AMOUNT_ATOMIC = process.env.X402_AMOUNT_ATOMIC || "1000000"; // 1 USDT0 at 6dp
export const X402_FEE_USDT = process.env.X402_FEE_USDT || "1"; // marketplace fee, digits only

export type EnforceResult =
  | { paid: true; paymentResponse?: string }
  | { paid: false; challenge: Response };

// Minimal shape the wrapper needs from x402ResourceServer (lets tests inject a fake).
export interface X402Server {
  processPaymentRequest(
    payload: unknown,
    resourceConfig: Record<string, unknown>,
    resourceInfo: Record<string, unknown>,
  ): Promise<{
    success: boolean;
    requiresPayment?: unknown;
    settlementResult?: unknown;
    error?: string;
  }>;
}

// Lazy singleton: no network at import; facilitator /supported is fetched on first request.
let serverPromise: Promise<X402Server> | null = null;
function getServer(): Promise<X402Server> {
  if (!serverPromise) {
    serverPromise = (async () => {
      const facilitator = new OKXFacilitatorClient({
        apiKey: process.env.OKX_API_KEY || "",
        secretKey: process.env.OKX_SECRET_KEY || "",
        passphrase: process.env.OKX_PASSPHRASE || "",
        syncSettle: true,
      });
      const server = new x402ResourceServer(facilitator).register(
        XLAYER_NETWORK,
        new ExactEvmScheme(),
      );
      await server.initialize();
      return server as unknown as X402Server;
    })();
  }
  return serverPromise;
}

function resourceConfig() {
  return {
    scheme: "exact",
    network: XLAYER_NETWORK,
    payTo: process.env.X402_PAYTO_ADDRESS || "",
    price: X402_PRICE,
    maxTimeoutSeconds: X402_TIMEOUT_SECONDS,
  };
}

/**
 * Gate one request against the OKX x402 v2 protocol.
 * No X-PAYMENT   -> { paid: false, challenge } (402 + base64 PAYMENT-REQUIRED header).
 * Valid X-PAYMENT -> { paid: true, paymentResponse } (facilitator verified + settled).
 * Invalid payment -> { paid: false, challenge } (402).
 *
 * `serverOverride` is a test seam; production passes only (req, resourceUrl).
 */
export async function enforceX402(
  req: Request,
  resourceUrl: string,
  serverOverride?: X402Server,
): Promise<EnforceResult> {
  const server = serverOverride ?? (await getServer());
  const resourceInfo = {
    url: resourceUrl,
    description: "Alter Ego wallet analysis",
    mimeType: "application/json",
  };

  const xPayment = req.headers.get("X-PAYMENT");
  const payload = xPayment ? decodePaymentSignatureHeader(xPayment) : null;

  const result = await server.processPaymentRequest(payload, resourceConfig(), resourceInfo);

  if (!result.success) {
    const header = encodePaymentRequiredHeader(result.requiresPayment as never);
    return {
      paid: false,
      challenge: new Response(JSON.stringify({ error: "payment required" }), {
        status: 402,
        headers: { "PAYMENT-REQUIRED": header, "Content-Type": "application/json" },
      }),
    };
  }

  return {
    paid: true,
    paymentResponse: encodePaymentResponseHeader(result.settlementResult as never),
  };
}
