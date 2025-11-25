import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/playwright",
  timeout: 120_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    actionTimeout: 30_000,
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm --filter nexus-frontend dev --hostname 127.0.0.1 --port 4173",
    cwd: "../..",
    port: 4173,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
