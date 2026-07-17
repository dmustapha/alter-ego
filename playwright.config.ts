import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "stress-browser.spec.ts",
  timeout: 150_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "stress-results.json" }]],
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 10_000,
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
