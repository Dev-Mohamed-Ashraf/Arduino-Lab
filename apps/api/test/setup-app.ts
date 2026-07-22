import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hash } from '@node-rs/argon2';
import { Role, type PrismaClient } from '@prisma/client';
import { sign } from 'jsonwebtoken';

import { AppModule } from '@/app.module';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  baseUrl: string;
}

/**
 * Boots the real application against the configured database.
 *
 * The rate limiter is left on but its ceilings are high enough that the specs
 * do not trip it; the concurrency spec mints tokens directly rather than
 * hammering /auth to avoid the anonymous login limiter.
 */
export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication();
  // Mirror main.ts: the same global prefix, and validation via the per-route
  // ZodValidationPipe rather than a global class-validator pipe.
  app.setGlobalPrefix('api/v1');

  await app.init();
  await app.listen(0);

  const url = (await app.getUrl()).replace('[::1]', '127.0.0.1');

  return { app, prisma: app.get(PrismaService), baseUrl: `${url}/api/v1` };
}

const ARGON2_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

/** Creates a verified user and returns a signed access token for it. */
export async function createUserWithToken(
  prisma: PrismaClient,
  options: { email: string; role?: Role; fullName?: string },
): Promise<{ id: string; token: string }> {
  const user = await prisma.user.create({
    data: {
      email: options.email,
      passwordHash: await hash('Test@12345', ARGON2_OPTIONS),
      fullName: options.fullName ?? 'Test User',
      role: options.role ?? Role.STUDENT,
      emailVerifiedAt: new Date(),
    },
  });

  const token = sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: 900 },
  );

  return { id: user.id, token };
}

export function authHeaders(token: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}
