import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://localhost:3005", trace: "retain-on-failure" },
  webServer: { command: "npm run start -- -p 3005", url: "http://localhost:3005", reuseExistingServer: false, env: { NEXT_TELEMETRY_DISABLED: "1" } },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } }
  ]
});
