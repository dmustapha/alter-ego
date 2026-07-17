/**
 * OKX OnchainOS API client — direct REST calls (no CLI binary needed).
 * Works on Vercel serverless. Bypasses the Linux binary header bug.
 *
 * Base URL: https://web3.okx.com
 * Auth: OKX-ACCESS-KEY + HMAC-SHA256 signature + project header
 */

const BASE = "https://web3.okx.com";
const PROJECT_ID = "4d156bf0c61130f2692d097ecb68dbe4";

function sign(
  timestamp: string,
  method: string,
  path: string,
  body: string
): string {
  const crypto = require("crypto");
  return crypto
    .createHmac("sha256", process.env.OKX_SECRET_KEY || "")
    .update(timestamp + method + path + body)
    .digest("base64");
}

async function okxCall(
  method: string,
  path: string,
  body?: Record<string, unknown>
) {
  const timestamp = new Date().toISOString();
  const bodyStr = body ? JSON.stringify(body) : "";
  const signature = sign(timestamp, method, path, bodyStr);

  const headers: Record<string, string> = {
    "OKX-ACCESS-KEY": process.env.OKX_API_KEY || "",
    "OKX-ACCESS-SIGN": signature,
    "OKX-ACCESS-TIMESTAMP": timestamp,
    "OKX-ACCESS-PASSPHRASE": process.env.OKX_PASSPHRASE || "",
    "OKX-ACCESS-PROJECT": PROJECT_ID,
    "Content-Type": "application/json",
  };

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    ...(body ? { body: bodyStr } : {}),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OKX ${res.status}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

// ─── Auth ────────────────────────────────────────────

export async function initApiKey() {
  return okxCall("POST", "/priapi/v5/wallet/agentic/auth/ak/init");
}

export async function verifyApiKey(sessionId: string, code: string) {
  return okxCall("POST", "/priapi/v5/wallet/agentic/auth/ak/verify", {
    sessionId,
    code,
  });
}

// ─── Portfolio ───────────────────────────────────────

export async function getAllTokenBalances(
  addresses: string[],
  chains: string[]
) {
  return okxCall(
    "POST",
    "/priapi/v5/wallet/agentic/asset/wallet-all-token-balances-batch",
    { addresses, chains }
  );
}

// ─── Account ─────────────────────────────────────────

export async function getAccountList() {
  return okxCall("GET", "/priapi/v5/wallet/agentic/account/list");
}

// ─── Token Info ──────────────────────────────────────

export async function getTokenInfo(
  chainIndex: string,
  tokenAddress: string
) {
  return okxCall(
    "POST",
    "/priapi/v5/wallet/agentic/token/get-token-info",
    { chainIndex, tokenAddress }
  );
}
