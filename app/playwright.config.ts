import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 540, height: 960 },
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  webServer: {
    command: `npx vite preview --port 4173 --strictPort --outDir ${process.env.E2E_DIST ?? 'dist'}`,
    port: 4173,
    reuseExistingServer: true,
  },
});
