import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp, type TestContext } from './setup-app';

/** The auth invariants that protect the rest of the system. */
describe('auth flow', () => {
  let ctx: TestContext;
  const runId = Date.now();
  const email = `e2e.${runId}.auth@student.test.edu`;
  const password = 'Test@12345';

  // ALLOWED_EMAIL_DOMAINS is pinned to student.test.edu in vitest.e2e.config.ts,
  // before the app reads its cached config.
  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.prisma.user.deleteMany({ where: { email: { startsWith: `e2e.${runId}.` } } });
    await ctx.app.close();
  });

  async function post(path: string, body: unknown) {
    const response = await fetch(`${ctx.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  }

  it('rejects registration from a domain that is not allowed', async () => {
    const result = await post('/auth/register', {
      email: 'someone@gmail.com',
      password,
      confirmPassword: password,
      fullName: 'Outsider',
    });
    expect(result.status).toBe(400);
    expect((result.body as { code: string }).code).toBe('EMAIL_DOMAIN_NOT_ALLOWED');
  });

  it('refuses login before the email is verified, then allows it after', async () => {
    await post('/auth/register', { email, password, confirmPassword: password, fullName: 'Tester' });

    const beforeVerify = await post('/auth/login', { email, password });
    expect(beforeVerify.status).toBe(403);
    expect((beforeVerify.body as { code: string }).code).toBe('EMAIL_NOT_VERIFIED');

    await ctx.prisma.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } });

    const afterVerify = await post('/auth/login', { email, password });
    expect(afterVerify.status).toBe(200);
    expect((afterVerify.body as { accessToken?: string }).accessToken).toBeTruthy();
  });

  it('rotates refresh tokens and revokes the family on reuse', async () => {
    const login = await post('/auth/login', { email, password });
    const first = (login.body as { refreshToken: string }).refreshToken;

    const rotated = await post('/auth/refresh', { refreshToken: first });
    expect(rotated.status).toBe(200);
    const second = (rotated.body as { refreshToken: string }).refreshToken;
    expect(second).not.toBe(first);

    // Replaying the already-rotated token is reuse: it is rejected...
    const replay = await post('/auth/refresh', { refreshToken: first });
    expect(replay.status).toBe(401);

    // ...and the whole family, including the freshly issued token, is revoked.
    const afterReuse = await post('/auth/refresh', { refreshToken: second });
    expect(afterReuse.status).toBe(401);
  });
});
