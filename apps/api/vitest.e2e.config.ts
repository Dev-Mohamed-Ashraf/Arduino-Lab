import path from 'node:path';

import swc from 'unplugin-swc';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'vitest/config';

// E2E talks to a real database. The root .env points at the dev Neon branch;
// set DATABASE_URL in .env.test to isolate a throwaway branch instead.
loadEnv({ path: path.resolve(__dirname, '../../.env') });
loadEnv({ path: path.resolve(__dirname, '.env.test'), override: true });

// The auth spec registers accounts on a test domain. This must be set before
// the app boots because AppConfigService caches the environment at init.
process.env.ALLOWED_EMAIL_DOMAINS = 'student.test.edu';

export default defineConfig({
  // NestJS DI reads constructor param types from decorator metadata, which the
  // default esbuild transform drops. SWC re-emits it so providers resolve.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    setupFiles: ['reflect-metadata'],
    // Booking transactions serialise on a slot lock and Neon is a network hop
    // away, so give the concurrency specs room.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // One database, shared rows — files must not run in parallel against it.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
