import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    // shared/protocol.ts nằm ngoài server/ → chỉ định zod của server/node_modules
    alias: { zod: path.resolve(import.meta.dirname, 'node_modules/zod') },
  },
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 15000,
    pool: 'forks',
  },
});
