import { describe, it, expect, vi } from "vitest";
import { withBackoff, memo } from "./okx-cache";

describe("withBackoff", () => {
  it("retries then succeeds", async () => {
    let n = 0;
    const r = await withBackoff(async () => { if (n++ < 2) throw new Error("429"); return "ok"; }, 4, 1);
    expect(r).toBe("ok"); expect(n).toBe(3);
  });
});

describe("memo", () => {
  it("memoizes within ttl", async () => {
    const fn = vi.fn(async () => Math.random());
    const a = await memo("k", 10_000, fn); const b = await memo("k", 10_000, fn);
    expect(a).toBe(b); expect(fn).toHaveBeenCalledTimes(1);
  });
});
