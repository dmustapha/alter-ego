#!/usr/bin/env node
// Decode the PAYMENT-REQUIRED header (base64) and assert the OKX x402 v2 challenge.
// Usage: echo "<base64 header value>" | node scripts/gate/decode-payment-required.mjs
import { readFileSync } from "node:fs";

const b64 = readFileSync(0, "utf8").trim();
if (!b64) { console.error("FAIL Gate2: empty PAYMENT-REQUIRED header"); process.exit(1); }

let challenge;
try {
  challenge = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
} catch (e) {
  console.error("FAIL Gate2: PAYMENT-REQUIRED is not valid base64 JSON:", e.message);
  process.exit(1);
}
console.error("decoded challenge:", JSON.stringify(challenge, null, 2));

const fail = (m) => { console.error("FAIL Gate2:", m, "-> route to Plan 3"); process.exit(1); };

if (challenge.x402Version !== 2) fail(`x402Version is ${challenge.x402Version}, expected 2`);
if (!challenge.resource || typeof challenge.resource !== "object") fail("missing resource object");
if (!challenge.resource.url) fail("missing resource.url");
if (challenge.resource.mimeType !== "application/json") fail(`resource.mimeType is ${challenge.resource.mimeType}, expected application/json`);
if (!Array.isArray(challenge.accepts) || challenge.accepts.length === 0) fail("accepts[] missing or empty");

const a = challenge.accepts[0];
if (a.network !== "eip155:196") fail(`accepts[0].network is ${a.network}, expected eip155:196 (X Layer)`);

// Asset identity. OKX's real x402 SDK format encodes the token as a bare contract
// ADDRESS in `asset` plus a human name in `extra.name` (e.g. "USD₮0"); it does NOT
// carry a `decimals` field (6dp is implied by the USDT0 contract on X Layer). Assert
// the address is the canonical USDT0 contract and reject the old USDG address.
const USDT0 = "0x779ded0c9e1022225f8e0630b35a9b54be713736";
const badUsdg = "0x4ae46a";
const assetAddr = (a.asset?.address ?? a.asset ?? "").toString().toLowerCase();
if (assetAddr.startsWith(badUsdg)) fail("asset is the old USDG address (0x4ae46a...) -> must be USDT0");
if (assetAddr !== USDT0) fail(`asset is ${assetAddr}, expected the USDT0 contract ${USDT0}`);
// name check: accept USDT0 / USDT / USD₮0 (the ₮ glyph) from asset.symbol or extra.name
const name = (a.asset?.symbol ?? a.assetSymbol ?? a.extra?.name ?? "").toString().toUpperCase().replace("₮", "T");
if (name && !name.startsWith("USDT")) fail(`asset name is ${name}, expected USDT0`);
// If a decimals field IS present (some encoders include it), it must be 6.
const decimals = a.asset?.decimals ?? a.decimals;
if (decimals !== undefined && Number(decimals) !== 6) fail(`asset decimals is ${decimals}, expected 6 (USDT0)`);

// maxTimeoutSeconds (field name is maxTimeoutSeconds, not requiredDeadlineSeconds)
const timeout = a.maxTimeoutSeconds ?? challenge.maxTimeoutSeconds;
if (timeout !== undefined && Number(timeout) !== 300) console.error(`WARN: maxTimeoutSeconds is ${timeout}, spec says 300`);

console.log("PASS Gate2-decode: valid v2 challenge, eip155:196, USDT0/6dp");
