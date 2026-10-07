import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', timeout: 180000, workers: 1,
  use: {
    baseURL: 'http://localhost:8181', trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  webServer: [
    { command: 'node --import tsx e2e/server.ts', url: 'http://127.0.0.1:3101/health', reuseExistingServer: false, timeout: 30000 },
    { command: 'npm run web -w client -- --port 8181 --localhost', url: 'http://localhost:8181', reuseExistingServer: false, timeout: 120000, env: { EXPO_PUBLIC_SERVER_URL: 'http://localhost:3101', EXPO_OFFLINE: '1', CI: '1' } },
  ],
});
