import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', timeout: 180000, workers: 1,
  grep: /register, reload|two friends chat|four browsers play|narrow touch|visual tutorial|match modes/,
  use: {
    baseURL: 'http://localhost:18080', trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
});
