import { test, expect } from "@playwright/test";

// Live A2MCP protocol probe. DEFERRED: run only against a deployed URL at the deploy stage
// (BASE_URL=https://alter-ego-wine-mu.vercel.app). Not run at build time.
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

test("GET /api/a2mcp returns a conformant agent card", async ({ request }) => {
  const card = await (await request.get(`${BASE}/api/a2mcp`)).json();
  expect(Array.isArray(card.capabilities)).toBe(true);
  expect(card.pricing.network).toBe("eip155:196");
  expect(card.service.type).toBe("A2MCP");
});

test("POST analyze without X-PAYMENT returns 402 + PAYMENT-REQUIRED", async ({ request }) => {
  const res = await request.post(`${BASE}/api/a2mcp`, { data: { address: "0xabc", chains: ["ethereum"] } });
  expect(res.status()).toBe(402);
  expect(res.headers()["payment-required"]).toBeTruthy();
});

test("POST an A2A system envelope is acknowledged (200, jobId echoed)", async ({ request }) => {
  const res = await request.post(`${BASE}/api/a2mcp`, {
    data: { agentId: "6013", message: { source: "system", event: "JOB_CREATED", jobId: "probe-1" } },
  });
  expect(res.status()).toBe(200);
  expect((await res.json()).jobId).toBe("probe-1");
});
