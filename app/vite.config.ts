import { defineConfig } from 'vitest/config';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Đóng dấu phiên bản build vào tên cache của service worker. */
const swVersion = () => ({
  name: 'sw-version',
  closeBundle() {
    const p = resolve(__dirname, 'dist/sw.js');
    if (!existsSync(p)) return;
    writeFileSync(p, readFileSync(p, 'utf8').replaceAll('__BUILD_ID__', Date.now().toString(36)));
  },
});

export default defineConfig({
  base: './',
  plugins: [swVersion()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
