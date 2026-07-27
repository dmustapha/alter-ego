import { chromium } from "playwright";

const base = process.env.BASE ?? "https://alter-ego-wine-mu.vercel.app";
const cohort = [
  "JDd3hy3gQn2V982mi1zqhNqUw1GfV2UL6g76STojCJPN (solana)",
  "CyaE1VxvBrahnPWkqm5VsdCvyS2QmNht2UFrKJHga54o (solana)",
  "2fg5QD1eD7rzNNCsvnhmXFm5hqNgwTTG8p7kQ6f3rx6f (solana)",
].join("\\n");
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();
const errors = [];

page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("response", (response) => {
  if (response.url().includes("/api/") && response.status() >= 500) {
    errors.push(`${response.status()} ${response.url()}`);
  }
});

console.log("REHEARSAL: opening live site");
await page.goto(base, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2_000);
await page.locator("#wallets").fill(cohort);
await page.getByRole("button", { name: /analyze/i }).click();
console.log("REHEARSAL: demo scan started");
await page.waitForTimeout(50_000);
const resultVisible = await page.getByText(/3 wallets\. 1 chains\. 3,000 transactions/i).count();
await page.screenshot({ path: "video/rehearsal-final-frame.png", fullPage: true });

console.log(errors.length || !resultVisible
  ? `REHEARSAL FAIL\n${[...errors, !resultVisible && "results summary not visible"].filter(Boolean).join("\n")}`
  : "REHEARSAL PASS");
await browser.close();
