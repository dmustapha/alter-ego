// Buyer round-trip against the LIVE seller. Proves real on-chain x402 settlement.
// Requires X402_PAYER_KEY funded with USDT0 on X Layer (payer != payTo). Run: node scripts/buy-a2mcp.mjs
import { readFileSync } from "node:fs";
import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from "@okxweb3/x402-fetch";
import { ExactEvmScheme, toClientEvmSigner } from "@okxweb3/x402-evm";

const env = {};
for (const l of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const RPC = env.XLAYER_RPC || "https://xlayerrpc.okx.com";
const URL_ = "https://alter-ego-wine-mu.vercel.app/api/a2mcp";
const xLayer = { id: 196, name: "X Layer", nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } };
const account = privateKeyToAccount(env.X402_PAYER_KEY);
console.log("payer:", account.address);
const publicClient = createPublicClient({ chain: xLayer, transport: http(RPC) });
const signer = toClientEvmSigner(account, publicClient);
const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, { schemes: [{ network: "eip155:196", client: new ExactEvmScheme(signer) }] });
const res = await fetchWithPayment(URL_, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
console.log("status:", res.status);
const settleHeader = res.headers.get("PAYMENT-RESPONSE");
if (!settleHeader) { console.error("NO PAYMENT-RESPONSE header - did not settle"); process.exit(1); }
const settle = decodePaymentResponseHeader(settleHeader);
console.log("SETTLEMENT:", JSON.stringify(settle));
console.log("tx:", settle.transaction, "| success:", settle.success, "| status:", settle.status, "| payer:", settle.payer);
console.log("PROOF: https://www.oklink.com/xlayer/tx/" + settle.transaction);
