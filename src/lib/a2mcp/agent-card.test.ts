import { describe, it, expect, beforeEach } from "vitest";
import { buildAgentCard } from "./agent-card";
import { USDT0_ADDRESS } from "./constants";

describe("buildAgentCard", () => {
  beforeEach(() => {
    process.env.A2MCP_ENDPOINT_URL = "https://alter-ego-wine-mu.vercel.app/api/a2mcp";
    process.env.A2MCP_PAYTO_ADDRESS = "0x000000000000000000000000000000000000dEaD";
  });

  it("exposes capabilities, input schema, output schema, and pricing", () => {
    const c = buildAgentCard();
    expect(c.capabilities.length).toBeGreaterThan(0);
    // input schema names the analyze body fields
    expect(JSON.stringify(c.input)).toContain("addresses");
    // output schema names the AnalyzeResponse fields
    const out = JSON.stringify(c.output);
    expect(out).toContain("patterns");
    expect(out).toContain("personas");
  });

  it("prices in USDT0 on eip155:196 with a 300s timeout (x402 v2 exact)", () => {
    const c = buildAgentCard();
    expect(c.pricing.scheme).toBe("exact");
    expect(c.pricing.network).toBe("eip155:196");
    expect(c.pricing.asset.toLowerCase()).toBe(USDT0_ADDRESS.toLowerCase());
    expect(c.pricing.maxTimeoutSeconds).toBe(300);
    expect(/^\d+$/.test(c.pricing.amount)).toBe(true); // atomic units, digits only
  });

  it("mirrors the ASP serviceList entry with a valid A2MCP service (no em-dash, https endpoint)", () => {
    const c = buildAgentCard();
    expect(c.service.type).toBe("A2MCP");
    expect(/^\d+$/.test(c.service.fee)).toBe(true); // quoted digits, USDT default
    expect(c.service.endpoint.startsWith("https://")).toBe(true);
    expect(c.service.name.length).toBeGreaterThanOrEqual(5);
    expect(c.service.name.length).toBeLessThanOrEqual(30);
    expect(c.description.includes("—")).toBe(false); // no em-dash
    expect(c.service.description.includes("—")).toBe(false); // no em-dash
  });
});
