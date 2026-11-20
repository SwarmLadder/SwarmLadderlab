import { defineConfig } from "@playwright/test";
const baseURL = process.env.BASE_URL || "http://127.0.0.1:4190";
export default defineConfig({
  testDir: "./tests/browser",
  workers: 2,
  timeout: 240000,
  expect: { timeout: 20000 },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command:
          "vite preview --mode staging --host 127.0.0.1 --port 4190 --strictPort",
        url: baseURL,
        reuseExistingServer: false,
      },
  use: {
    baseURL,
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
  },
});
