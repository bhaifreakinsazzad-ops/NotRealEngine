import { defineConfig, devices } from "@playwright/test";

// When PLAYWRIGHT_BASE_URL is set, tests run against that already-hosted deployment (e.g. a
// Vercel staging/preview URL) instead of spinning up a local `next start`. That's the only way
// to get real hosted-behavior evidence rather than localhost verification -- see
// docs/STAGING_VERIFICATION.md. These tests include state-mutating flows (lead submission,
// quote acceptance); never point this at a production URL.
const stagingBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim();

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: stagingBaseUrl || "http://localhost:3005", trace: "retain-on-failure" },
  webServer: stagingBaseUrl
    ? undefined
    : {
        command: "npm run start -- -p 3005",
        url: "http://localhost:3005",
        reuseExistingServer: false,
        env: { NEXT_TELEMETRY_DISABLED: "1", ENGINE_OS_ENV: process.env.ENGINE_OS_ENV || "staging" }
      },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } }
  ]
});
