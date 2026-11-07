import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // CI không có GPU (WebGL vẽ bằng CPU) nên các bài dài như smoke chậm hơn máy dev 3–4 lần
  timeout: process.env.CI ? 120_000 : 60_000,
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
