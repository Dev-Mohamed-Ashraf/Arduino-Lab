import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { authHeaders, createTestApp, createUserWithToken, type TestContext } from './setup-app';

/**
 * The load-bearing tests of the whole system.
 *
 * They prove the two guarantees the lab depends on, against a real database and
 * real HTTP requests fired in parallel — not mocks:
 *   1. a period never holds more groups than its capacity;
 *   2. a component is never reserved beyond what exists.
 *
 * See plans/05-api-bookings.md for the transaction design these tests pin down.
 */
describe('booking concurrency', () => {
  let ctx: TestContext;
  const runId = Date.now();
  const bookingDate = '2027-03-15';

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await cleanup();
    await ctx.app.close();
  });

  async function cleanup(): Promise<void> {
    await ctx.prisma.booking.deleteMany({
      where: { bookingDate: new Date(`${bookingDate}T00:00:00Z`) },
    });
    await ctx.prisma.user.deleteMany({ where: { email: { startsWith: `e2e.${runId}.` } } });
    await ctx.prisma.component.deleteMany({ where: { name: { startsWith: `E2E ${runId}` } } });
  }

  function bookingBody(overrides: Record<string, unknown>) {
    return JSON.stringify({
      groupNumber: 1,
      members: [{ fullName: 'طالب اختبار' }],
      projectTitle: 'مشروع اختبار التزامن',
      projectDescription: 'حجز آلي للتحقق من ضمانات السعة والمخزون تحت الضغط.',
      bookingDate,
      idCardUrl: 'https://example.com/id.jpg',
      idCardPublicId: `e2e-${runId}`,
      ...overrides,
    });
  }

  it('admits exactly the slot capacity when many bookings race', async () => {
    const slots = await fetch(`${ctx.baseUrl}/slots`).then((r) => r.json());
    const slot = slots[0] as { id: string; capacity: number };

    const component = await ctx.prisma.component.create({
      data: { name: `E2E ${runId} plentiful`, totalQuantity: 1000 },
    });

    const contenders = await Promise.all(
      Array.from({ length: slot.capacity + 5 }, (_, index) =>
        createUserWithToken(ctx.prisma, { email: `e2e.${runId}.cap.${index}@student.test.edu` }),
      ),
    );

    const responses = await Promise.all(
      contenders.map((user, index) =>
        fetch(`${ctx.baseUrl}/bookings`, {
          method: 'POST',
          headers: authHeaders(user.token),
          body: bookingBody({
            groupNumber: 100 + index,
            timeSlotId: slot.id,
            components: [{ componentId: component.id, quantity: 1 }],
          }),
        }),
      ),
    );

    const statuses = responses.map((r) => r.status);
    const accepted = statuses.filter((s) => s === 201).length;
    const rejected = statuses.filter((s) => s === 409).length;

    expect(accepted).toBe(slot.capacity);
    expect(rejected).toBe(5);

    const confirmed = await ctx.prisma.booking.count({
      where: {
        timeSlotId: slot.id,
        bookingDate: new Date(`${bookingDate}T00:00:00Z`),
        status: 'CONFIRMED',
      },
    });
    expect(confirmed).toBe(slot.capacity);
  });

  it('never reserves a component beyond its stock', async () => {
    const slots = await fetch(`${ctx.baseUrl}/slots`).then((r) => r.json());
    const slot = slots[1] as { id: string };

    // One unit, many bidders: exactly one booking may win it.
    const scarce = await ctx.prisma.component.create({
      data: { name: `E2E ${runId} scarce`, totalQuantity: 1 },
    });

    const bidders = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        createUserWithToken(ctx.prisma, { email: `e2e.${runId}.stock.${index}@student.test.edu` }),
      ),
    );

    const responses = await Promise.all(
      bidders.map((user, index) =>
        fetch(`${ctx.baseUrl}/bookings`, {
          method: 'POST',
          headers: authHeaders(user.token),
          body: bookingBody({
            groupNumber: 200 + index,
            timeSlotId: slot.id,
            components: [{ componentId: scarce.id, quantity: 1 }],
          }),
        }),
      ),
    );

    const accepted = responses.filter((r) => r.status === 201).length;
    expect(accepted).toBe(1);

    const row = await ctx.prisma.component.findUniqueOrThrow({ where: { id: scarce.id } });
    expect(row.reservedQuantity).toBe(1);
    expect(row.reservedQuantity).toBeLessThanOrEqual(row.totalQuantity);
  });

  it('rolls back the whole booking when one component is short', async () => {
    const slots = await fetch(`${ctx.baseUrl}/slots`).then((r) => r.json());
    const slot = slots[2] as { id: string };

    const plentiful = await ctx.prisma.component.create({
      data: { name: `E2E ${runId} rollback-ok`, totalQuantity: 50 },
    });
    const empty = await ctx.prisma.component.create({
      data: { name: `E2E ${runId} rollback-short`, totalQuantity: 1 },
    });

    const user = await createUserWithToken(ctx.prisma, {
      email: `e2e.${runId}.atomic@student.test.edu`,
    });

    const response = await fetch(`${ctx.baseUrl}/bookings`, {
      method: 'POST',
      headers: authHeaders(user.token),
      body: bookingBody({
        groupNumber: 300,
        timeSlotId: slot.id,
        components: [
          { componentId: plentiful.id, quantity: 3 },
          { componentId: empty.id, quantity: 5 },
        ],
      }),
    });

    expect(response.status).toBe(409);
    expect(((await response.json()) as { code: string }).code).toBe('COMPONENT_OUT_OF_STOCK');

    // The available component must not have been touched, and no booking row created.
    const plentifulRow = await ctx.prisma.component.findUniqueOrThrow({
      where: { id: plentiful.id },
    });
    expect(plentifulRow.reservedQuantity).toBe(0);

    const created = await ctx.prisma.booking.count({ where: { groupNumber: 300 } });
    expect(created).toBe(0);
  });
});
