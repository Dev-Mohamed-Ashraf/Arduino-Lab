import path from 'node:path';

import { defineConfig } from 'vitest/config';

/** Unit tests only. E2E lives in vitest.e2e.config.ts and hits a running DB. */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    passWithNoTests: false,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
