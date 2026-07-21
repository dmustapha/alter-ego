import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    // Exclude Playwright spec files -- they use a different runner (playwright.config.ts)
    // and will fail when vitest picks them up due to incompatible test.describe() API.
    exclude: ["**/node_modules/**", "**/*.spec.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
