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

  it('signs the new account in straight away — no confirmation step', async () => {
    const result = await post('/auth/register', {
      email,
      password,
      confirmPassword: password,
      fullName: 'Tester',
    });

    expect(result.status).toBe(201);
    const tokens = result.body as { accessToken?: string; refreshToken?: string };
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();

    // The returned token must actually work against a protected route.
    const me = await fetch(`${ctx.baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    expect(me.status).toBe(200);
    expect(((await me.json()) as { email: string }).email).toBe(email);
  });

  it('rejects a duplicate email instead of silently succeeding', async () => {
    const duplicate = await post('/auth/register', {
      email,
      password,
      confirmPassword: password,
      fullName: 'Tester Again',
    });

    expect(duplicate.status).toBe(409);
    expect((duplicate.body as { code: string }).code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('accepts login with the registered credentials', async () => {
    const result = await post('/auth/login', { email, password });
    expect(result.status).toBe(200);
    expect((result.body as { accessToken?: string }).accessToken).toBeTruthy();
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
