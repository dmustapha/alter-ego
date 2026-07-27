import { chromium } from "playwright";

const base = process.env.BASE ?? "https://alter-ego-wine-mu.vercel.app";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: "video/raw", size: { width: 1920, height: 1080 } },
});
const page = await context.newPage();

await page.goto(base, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2_000);
await page.getByRole("button", { name: /load demo/i }).click();
await page.waitForTimeout(45_000);
await context.close();
await browser.close();
