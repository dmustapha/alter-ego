import { chromium } from "playwright";

const base = process.env.BASE ?? "https://alter-ego-wine-mu.vercel.app";
const cohort = [
  "JDd3hy3gQn2V982mi1zqhNqUw1GfV2UL6g76STojCJPN (solana)",
  "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o (solana)",
  "2fg5QD1eD7rzNNCsvnhmXFm5hqNgwTTG8p7kQ6f3rx6f (solana)",
].join("\\n");
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: "video/raw", size: { width: 1920, height: 1080 } },
});
const page = await context.newPage();

await page.goto(base, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2_000);
await page.locator("#wallets").fill(cohort);
await page.getByRole("button", { name: /analyze/i }).click();
await page.waitForTimeout(50_000);
await context.close();
await browser.close();
