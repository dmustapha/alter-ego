// Throwaway x402 seller-side spike (Plan 3 Task 1 HARD GATE).
// Part A: pin USDT0 on-chain + emit/capture a real v2 402 from the OKX SDK (no payer key).
// Part B: full payer round-trip + on-chain settlement (needs X402_PAYER_KEY funded on X Layer).
// Run: node scripts/spike-x402.mjs   (reads .env.local; never commits secrets)

import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createPublicClient, http, getContract } from "viem";
import { xLayer } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

import { x402ResourceServer } from "@okxweb3/x402-core/server";
import { OKXFacilitatorClient } from "@okxweb3/x402-core";
import { ExactEvmScheme as ExactEvmServer } from "@okxweb3/x402-evm/exact/server";
import { encodePaymentRequiredHeader, decodePaymentSignatureHeader, encodePaymentResponseHeader, decodePaymentResponseHeader } from "@okxweb3/x402-core/http";
import { wrapFetchWithPaymentFromConfig } from "@okxweb3/x402-fetch";
import { ExactEvmScheme as ExactEvmClient, toClientEvmSigner } from "@okxweb3/x402-evm";

// ---- load .env.local (read-only) ----
const env = {};
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* no .env.local */ }
const OKX = { apiKey: env.OKX_API_KEY, secretKey: env.OKX_SECRET_KEY, passphrase: env.OKX_PASSPHRASE };
const PAYTO = env.X402_PAYTO_ADDRESS || "0xd97c85d61337f8e4366bff2d8b482cfc59d76340"; // placeholder = owner
const PAYER_KEY = env.X402_PAYER_KEY;
const RPC = env.XLAYER_RPC || "https://rpc.xlayer.tech";
const USDT0 = "0x779ded0c9e1022225f8e0630b35a9b54be713736";
const NETWORK = "eip155:196";
const RESOURCE = "http://localhost:4021/api/a2mcp";

const erc20 = [
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
];

const pub = createPublicClient({ chain: xLayer, transport: http(RPC) });
const log = (...a) => console.log(...a);
const line = () => log("-".repeat(72));

async function partA_pinToken() {
  line(); log("PART A1 — pin USDT0 on X Layer (chain 196) via viem");
  const token = getContract({ address: USDT0, abi: erc20, client: pub });
  const [symbol, decimals] = await Promise.all([token.read.symbol(), token.read.decimals()]);
  log("  address :", USDT0);
  log("  symbol  :", symbol);
  log("  decimals:", decimals, decimals === 6 ? "(OK, 6dp)" : "(!! expected 6)");
  return { symbol, decimals };
}

function makeServer() {
  const facilitator = new OKXFacilitatorClient({ ...OKX, syncSettle: true });
  return { facilitator, server: new x402ResourceServer(facilitator).register(NETWORK, new ExactEvmServer()) };
}

async function partA_emitChallenge() {
  line(); log("PART A2 — emit + capture a real v2 402 from the SDK seller path");
  const { server } = makeServer();
  // sync supported kinds from the facilitator (needs OKX creds)
  let synced = true;
  try { await server.initialize(); log("  facilitator.initialize() OK"); }
  catch (e) { synced = false; log("  facilitator.initialize() FAILED:", e?.message || e); }

  const resourceConfig = { scheme: "exact", network: NETWORK, payTo: PAYTO, price: "$0.01", maxTimeoutSeconds: 300 };
  const requirements = await server.buildPaymentRequirements(resourceConfig);
  const challenge = await server.createPaymentRequiredResponse(requirements, {
    url: RESOURCE, description: "Alter Ego wallet analysis", mimeType: "application/json",
  });
  log("  decoded PaymentRequired:");
  log(JSON.stringify(challenge, null, 2).split("\n").map((l) => "    " + l).join("\n"));
  const a = challenge.accepts?.[0] || {};
  const checks = {
    x402Version: challenge.x402Version === 2,
    mimeType: challenge.resource?.mimeType === "application/json",
    scheme: a.scheme === "exact",
    network: a.network === NETWORK,
    asset: (a.asset || "").toLowerCase() === USDT0,
    amount: a.amount === "10000",
    payTo: (a.payTo || "").toLowerCase() === PAYTO.toLowerCase(),
    maxTimeoutSeconds: a.maxTimeoutSeconds === 300,
  };
  line(); log("  SHAPE CHECKS:", JSON.stringify(checks));
  return { challenge, checks, synced };
}

async function partB_roundTrip() {
  line();
  if (!PAYER_KEY) { log("PART B — SKIPPED (no X402_PAYER_KEY in .env.local yet)"); return null; }
  log("PART B — full payer round-trip + on-chain settlement");
  const account = privateKeyToAccount(PAYER_KEY.startsWith("0x") ? PAYER_KEY : "0x" + PAYER_KEY);
  log("  payer address:", account.address);
  const token = getContract({ address: USDT0, abi: erc20, client: pub });
  const bal = await token.read.balanceOf([account.address]);
  log("  payer USDT0 balance (atomic):", bal.toString());
  const payToBefore = await token.read.balanceOf([PAYTO]);

  // Stand up a seller on localhost driven by core processPaymentRequest (no next/server dep).
  const { server } = makeServer();
  await server.initialize();
  const resourceConfig = { scheme: "exact", network: NETWORK, payTo: PAYTO, price: "$0.01", maxTimeoutSeconds: 300 };
  const resourceInfo = { url: RESOURCE, description: "Alter Ego wallet analysis", mimeType: "application/json" };

  const httpServer = createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const payHeader = req.headers["x-payment"] || req.headers["X-PAYMENT"];
    const payload = payHeader ? decodePaymentSignatureHeader(String(payHeader)) : null;
    const result = await server.processPaymentRequest(payload, resourceConfig, resourceInfo);
    if (!result.success) {
      res.writeHead(402, { "content-type": "application/json", "PAYMENT-REQUIRED": encodePaymentRequiredHeader(result.requiresPayment) });
      res.end(JSON.stringify({ error: "payment required" }));
      return;
    }
    res.writeHead(200, { "content-type": "application/json", "PAYMENT-RESPONSE": encodePaymentResponseHeader(result.settlementResult) });
    res.end(JSON.stringify({ ok: true, analysis: "stub" }));
  });
  await new Promise((r) => httpServer.listen(4021, r));
  log("  seller listening on :4021");

  try {
    const signer = toClientEvmSigner(account, pub);
    const fetchWithPay = wrapFetchWithPaymentFromConfig(fetch, { schemes: [{ network: NETWORK, client: new ExactEvmClient(signer) }] });
    const resp = await fetchWithPay(RESOURCE, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: "0xabc", chains: ["ethereum"], tier: "paid" }) });
    log("  paid response status:", resp.status);
    const settle = decodePaymentResponseHeader(resp.headers.get("PAYMENT-RESPONSE") || resp.headers.get("payment-response") || "");
    log("  settlement:", JSON.stringify(settle));
    const payToAfter = await token.read.balanceOf([PAYTO]);
    log("  payTo delta (atomic):", (payToAfter - payToBefore).toString());
    return { status: resp.status, settle, delta: (payToAfter - payToBefore).toString() };
  } finally {
    httpServer.close();
  }
}

(async () => {
  log("X402 SELLER-SIDE SPIKE — Plan 3 Task 1");
  try {
    const a1 = await partA_pinToken();
    const a2 = await partA_emitChallenge();
    const b = await partB_roundTrip();
    line();
    const shapeOk = Object.values(a2.checks).every(Boolean);
    log("GATE SUMMARY:");
    log("  USDT0 6dp on-chain :", a1.decimals === 6);
    log("  v2 402 shape valid :", shapeOk);
    log("  facilitator synced :", a2.synced);
    log("  settlement (Part B):", b ? (b.settle?.status || b.status) : "pending payer key");
  } catch (e) {
    line(); console.error("SPIKE ERROR:", e?.stack || e);
    process.exit(1);
  }
})();
