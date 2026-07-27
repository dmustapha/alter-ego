import { chromium } from "playwright";

const base = process.env.BASE ?? "https://alter-ego-wine-mu.vercel.app";
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
await page.getByRole("button", { name: /load demo/i }).click();
console.log("REHEARSAL: demo scan started");
await page.waitForTimeout(45_000);
const resultVisible = await page.getByText(/wallets\. 2 chains\. 2,400 transactions/i).count();
await page.screenshot({ path: "video/rehearsal-final-frame.png", fullPage: true });

console.log(errors.length || !resultVisible
  ? `REHEARSAL FAIL\n${[...errors, !resultVisible && "results summary not visible"].filter(Boolean).join("\n")}`
  : "REHEARSAL PASS");
await browser.close();
