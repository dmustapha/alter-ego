// A2MCP agent card: a static, deterministic public document (no wallet, no network, no credentials).
// Shape grounded in docs/A2MCP-CONTRACT.md. input/output JSON Schemas mirror AnalyzeRequest /
// AnalyzeResponse (src/lib/types.ts) so the card and the served payload cannot drift.

import {
  XLAYER_NETWORK,
  USDT0_ADDRESS,
  X402_AMOUNT_ATOMIC,
  X402_FEE_USDT,
  X402_TIMEOUT_SECONDS,
} from "./constants";

export interface A2mcpService {
  name: string; // 5-30 char noun phrase, no price in name
  description: string; // 2-part, no em-dashes, no links, no tech-stack
  type: "A2MCP"; // literal, per identity-register Step 2
  fee: string; // quoted-string digits only, USDT default (e.g. "1")
  endpoint: string; // https:// public, <=512 chars
}

export interface A2mcpPricing {
  scheme: "exact";
  network: "eip155:196";
  asset: string; // USDT0 X Layer address
  amount: string; // atomic USDT0 (6 decimals) for `fee`
  payTo: string; // ASP payout address (env-driven)
  maxTimeoutSeconds: 300;
}

export interface A2mcpAgentCard {
  name: string;
  description: string; // no em-dashes
  capabilities: string[];
  input: object; // JSON Schema for AnalyzeRequest
  output: object; // JSON Schema for AnalyzeResponse
  pricing: A2mcpPricing;
  service: A2mcpService; // the ASP serviceList entry, mirrored in the card
}

const DEFAULT_ENDPOINT = "https://alter-ego-wine-mu.vercel.app/api/a2mcp";

// JSON Schema mirror of AnalyzeRequest. The { address, chains } shorthand is also accepted at
// runtime, so both the array form and the single-address form are described.
function inputSchema(): object {
  const chains = { type: "array", items: { type: "string" }, minItems: 1 };
  const addressEntry = {
    type: "object",
    required: ["address", "chains"],
    properties: { address: { type: "string" }, chains },
  };
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "AnalyzeRequest",
    type: "object",
    oneOf: [
      { required: ["addresses"], properties: { addresses: { type: "array", items: addressEntry } } },
      { required: ["address"], properties: { address: { type: "string" }, chains } },
    ],
  };
}

// JSON Schema mirror of AnalyzeResponse. Must name patterns and personas.
function outputSchema(): object {
  const trade = {
    type: "object",
    additionalProperties: true,
  };
  const pattern = {
    type: "object",
    additionalProperties: true,
    required: ["id", "tag", "type", "confidence", "evidence", "count", "insight"],
    properties: {
      id: { type: "string" },
      tag: { type: "string" },
      type: { type: "string", enum: ["AMPLIFY", "GUARD"] },
      confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
      evidence: { type: "array", items: trade },
      count: { type: "number" },
      costUsd: { type: "number" },
      insight: { type: "string" },
    },
  };
  const patternResult = {
    type: "object",
    required: ["walletAddress", "chain", "amplify", "guard"],
    properties: {
      walletAddress: { type: "string" },
      chain: { type: "string" },
      amplify: { type: "array", items: pattern },
      guard: { type: "array", items: pattern },
    },
  };
  const persona = {
    type: "object",
    additionalProperties: true,
    required: ["walletLabel", "archetype", "catchphrase"],
    properties: {
      walletLabel: { type: "string" },
      archetype: { type: "string" },
      catchphrase: { type: "string" },
    },
  };
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "AnalyzeResponse",
    type: "object",
    required: ["wallets", "chains", "totalTxns", "patterns", "personas", "comparison"],
    properties: {
      wallets: { type: "number" },
      chains: { type: "array", items: { type: "string" } },
      totalTxns: { type: "number" },
      patterns: { type: "array", items: patternResult },
      personas: { type: "array", items: persona },
      comparison: { type: ["object", "null"], additionalProperties: true },
    },
  };
}

export function buildAgentCard(): A2mcpAgentCard {
  const endpoint = process.env.A2MCP_ENDPOINT_URL || DEFAULT_ENDPOINT;
  const payTo =
    process.env.A2MCP_PAYTO_ADDRESS || process.env.X402_PAYTO_ADDRESS || "";

  const service: A2mcpService = {
    name: "Alter Ego Wallet Analysis",
    description:
      "Multi-chain wallet behavior analysis: transaction cadence, gas habits, holdings, and trade patterns, for traders reviewing their own on-chain behavior. Provide 1. one or more wallet addresses 2. the chains to read (ethereum, solana, xlayer).",
    type: "A2MCP",
    fee: X402_FEE_USDT,
    endpoint,
  };

  const pricing: A2mcpPricing = {
    scheme: "exact",
    network: XLAYER_NETWORK,
    asset: USDT0_ADDRESS,
    amount: X402_AMOUNT_ATOMIC,
    payTo,
    maxTimeoutSeconds: X402_TIMEOUT_SECONDS,
  };

  return {
    name: "Alter Ego",
    description:
      "Multi-chain wallet behavior analysis for traders who want to understand their on-chain habits. Provide one or more wallet addresses plus the chains to read.",
    capabilities: [
      "wallet-behavior-analysis",
      "multi-chain-persona",
      "trade-pattern-classification",
    ],
    input: inputSchema(),
    output: outputSchema(),
    pricing,
    service,
  };
}
