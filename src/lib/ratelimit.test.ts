// src/lib/ratelimit.test.ts
import { describe, it, expect } from "vitest";
import { rateLimit } from "./ratelimit";

describe("rateLimit (per-IP token bucket)", () => {
  it("allows 10 requests then returns 429 on the 11th from one IP", () => {
    const ip = "1.2.3.4";
    for (let i = 0; i < 10; i++) expect(rateLimit(ip).ok).toBe(true);
    const eleventh = rateLimit(ip);
    expect(eleventh.ok).toBe(false);
    expect(eleventh.retryAfter).toBeGreaterThan(0);
  });
});
