// a11y.spec.ts
import { test, expect } from "@playwright/test";

test.describe("a11y", () => {
  test("keyboard focus produces a visible ring", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const shadow = await page.evaluate(() => getComputedStyle(document.activeElement!).boxShadow);
    expect(shadow).toMatch(/0, 255, 255|rgb\(0, 255, 255\)/); // cyan ring present
  });

  test("prefers-reduced-motion mounts content already visible", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/");
    await page.waitForTimeout(150);
    const heroOpacity = await page.$eval("h1", el => getComputedStyle(el).opacity);
    expect(Number(heroOpacity)).toBeGreaterThan(0.99);
    await ctx.close();
  });

  test("no illegible sub-8px prose labels remain", async ({ page }) => {
    await page.goto("/");
    const tiny = await page.$$eval("*", els =>
      els.filter(e => {
        const t = e.textContent?.trim() ?? "";
        const size = parseFloat(getComputedStyle(e).fontSize);
        return e.children.length === 0 && /[a-z]{3,}/i.test(t) &&
               getComputedStyle(e).fontFamily.includes("Press Start") && size < 9;
      }).length
    );
    expect(tiny).toBe(0);
  });

  test("dim body text token resolves to the AA color, not the old rgba", async ({ page }) => {
    await page.goto("/");
    const bad = await page.$$eval("*", els =>
      els.filter(e => getComputedStyle(e).color === "rgba(160, 160, 210, 0.45)").length
    );
    expect(bad).toBe(0);
  });

  test("single h1, all images have alt, all buttons have accessible names", async ({ page }) => {
    await page.goto("/");
    expect(await page.$$eval("h1", e => e.length)).toBe(1);
    expect(await page.$$eval("img", els => els.filter(e => !e.alt).length)).toBe(0);
    expect(await page.$$eval("button", els =>
      els.filter(e => !e.textContent?.trim() && !e.getAttribute("aria-label")).length)).toBe(0);
  });
});
