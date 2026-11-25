import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results/playwright",
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || "msedge",
    viewport: { width: 1440, height: 900 },
    navigationTimeout: 90_000,
    screenshot: "only-on-failure",
  },
});
