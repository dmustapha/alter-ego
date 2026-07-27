import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    // Exclude Playwright spec files -- they use a different runner (playwright.config.ts)
    // and will fail when vitest picks them up due to incompatible test.describe() API.
    // Exclude daemon .mjs files -- they use node:test syntax, not vitest.
    exclude: ["**/node_modules/**", "**/*.spec.ts", "daemon/**/*.test.mjs"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
