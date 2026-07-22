import path from 'node:path';

import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI configuration.
 *
 * Replaces the deprecated `package.json#prisma` block (removed in Prisma 7).
 * Declaring a config file switches off Prisma's implicit .env loading, so the
 * files are loaded explicitly below. The repo root is read first because that is
 * where the shared .env lives; an app-local .env may override it.
 */
loadEnv({ path: path.resolve(__dirname, '../../.env') });
loadEnv({ path: path.resolve(__dirname, '.env'), override: true });

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
