import { Role } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { authHeaders, createTestApp, createUserWithToken, type TestContext } from './setup-app';

/**
 * Pins down the per-session stock model.
 *
 * Parts go back on the shelf when a period ends, so a booking only competes with
 * bookings in the *same period on the same day*. Availability is derived from the
 * bookings themselves — there is no counter — which is what makes cancelling and
 * editing free of bookkeeping. See plans/13-per-slot-stock.md.
 */
describe('per-session stock', () => {
  let ctx: TestContext;
  const runId = Date.now();
  const firstDate = '2027-05-10';
  const secondDate = '2027-05-11';
  let slots: { id: string }[] = [];
  let groupNumber = 500;

  beforeAll(async () => {
    ctx = await createTestApp();
    slots = (await fetch(`${ctx.baseUrl}/slots`).then((response) =>
      response.json(),
    )) as typeof slots;
  });

  /** The seeded lab has four periods; the specs need them addressed by position. */
  function slotId(index: number): string {
    const slot = slots[index];
    if (!slot) throw new Error(`the lab has no period at index ${index}`);
    return slot.id;
  }

  afterAll(async () => {
    await ctx.prisma.booking.deleteMany({
      where: {
        bookingDate: {
          in: [new Date(`${firstDate}T00:00:00Z`), new Date(`${secondDate}T00:00:00Z`)],
        },
      },
    });
    await ctx.prisma.user.deleteMany({ where: { email: { startsWith: `stock.${runId}.` } } });
    await ctx.prisma.component.deleteMany({ where: { name: { startsWith: `STOCK ${runId}` } } });
    await ctx.app.close();
  });

  /** Each booking needs its own group number and its own owner. */
  async function book(input: {
    componentId: string;
    quantity: number;
    date: string;
    slotId: string;
  }): Promise<Response> {
    groupNumber += 1;
    const user = await createUserWithToken(ctx.prisma, {
      email: `stock.${runId}.${groupNumber}@student.test.edu`,
    });

    return fetch(`${ctx.baseUrl}/bookings`, {
      method: 'POST',
      headers: authHeaders(user.token),
      body: JSON.stringify({
        groupNumber,
        members: [{ fullName: 'طالب اختبار' }],
        projectTitle: 'مشروع اختبار المخزون',
        projectDescription: 'حجز آلي للتحقق من رجوع المخزون بعد كل فترة.',
        bookingDate: input.date,
        timeSlotId: input.slotId,
        idCardUrl: 'https://example.com/id.jpg',
        idCardPublicId: `stock-${runId}-${groupNumber}`,
        components: [{ componentId: input.componentId, quantity: input.quantity }],
      }),
    });
  }

  function createComponent(suffix: string, totalQuantity: number, maxPerBooking = 1) {
    return ctx.prisma.component.create({
      data: { name: `STOCK ${runId} ${suffix}`, totalQuantity, maxPerBooking },
    });
  }

  it('refuses a second group once the session has taken the last unit', async () => {
    const component = await createComponent('last-unit', 1);

    const first = await book({
      componentId: component.id,
      quantity: 1,
      date: firstDate,
      slotId: slotId(0),
    });
    expect(first.status).toBe(201);

    const second = await book({
      componentId: component.id,
      quantity: 1,
      date: firstDate,
      slotId: slotId(0),
    });
    expect(second.status).toBe(409);
    expect(((await second.json()) as { code: string }).code).toBe('COMPONENT_OUT_OF_STOCK');
  });

  it('starts a different period on the same day with the full quantity', async () => {
    const component = await createComponent('other-period', 1);

    const first = await book({
      componentId: component.id,
      quantity: 1,
      date: firstDate,
      slotId: slotId(0),
    });
    expect(first.status).toBe(201);

    // The heart of the requirement: another period is a clean slate.
    const other = await book({
      componentId: component.id,
      quantity: 1,
      date: firstDate,
      slotId: slotId(1),
    });
    expect(other.status).toBe(201);
  });

  it('starts the same period on another day with the full quantity', async () => {
    const component = await createComponent('other-day', 1);

    const first = await book({
      componentId: component.id,
      quantity: 1,
      date: firstDate,
      slotId: slotId(2),
    });
    expect(first.status).toBe(201);

    const nextDay = await book({
      componentId: component.id,
      quantity: 1,
      date: secondDate,
      slotId: slotId(2),
    });
    expect(nextDay.status).toBe(201);
  });

  it('refuses a group that asks for more than its per-booking limit', async () => {
    const component = await createComponent('limited', 100, 2);

    const response = await book({
      componentId: component.id,
      quantity: 3,
      date: firstDate,
      slotId: slotId(0),
    });

    expect(response.status).toBe(409);
    expect(((await response.json()) as { code: string }).code).toBe('COMPONENT_EXCEEDS_LIMIT');
  });

  it('frees the parts of a cancelled booking with no counter to adjust', async () => {
    const component = await createComponent('cancelled', 1);

    const created = await book({
      componentId: component.id,
      quantity: 1,
      date: secondDate,
      slotId: slotId(0),
    });
    expect(created.status).toBe(201);
    const booking = (await created.json()) as { id: string };

    const blocked = await book({
      componentId: component.id,
      quantity: 1,
      date: secondDate,
      slotId: slotId(0),
    });
    expect(blocked.status).toBe(409);

    const admin = await createUserWithToken(ctx.prisma, {
      email: `stock.${runId}.admin-cancel@student.test.edu`,
      role: Role.ADMIN,
    });
    const cancelled = await fetch(`${ctx.baseUrl}/bookings/${booking.id}`, {
      method: 'DELETE',
      headers: authHeaders(admin.token),
    });
    expect(cancelled.status).toBeLessThan(300);

    const retry = await book({
      componentId: component.id,
      quantity: 1,
      date: secondDate,
      slotId: slotId(0),
    });
    expect(retry.status).toBe(201);
  });

  it('does not count an edited booking against itself', async () => {
    const component = await createComponent('self-edit', 2, 5);

    const created = await book({
      componentId: component.id,
      quantity: 2,
      date: secondDate,
      slotId: slotId(1),
    });
    expect(created.status).toBe(201);
    const booking = (await created.json()) as {
      id: string;
      groupNumber: number;
      projectTitle: string;
      projectDescription: string;
      members: { fullName: string }[];
    };

    const admin = await createUserWithToken(ctx.prisma, {
      email: `stock.${runId}.admin-edit@student.test.edu`,
      role: Role.ADMIN,
    });

    // Re-saving the same two units must pass: the booking's own usage is excluded.
    const response = await fetch(`${ctx.baseUrl}/bookings/${booking.id}`, {
      method: 'PATCH',
      headers: authHeaders(admin.token),
      body: JSON.stringify({
        groupNumber: booking.groupNumber,
        projectTitle: booking.projectTitle,
        projectDescription: booking.projectDescription,
        members: booking.members.map((member) => ({ fullName: member.fullName })),
        components: [{ componentId: component.id, quantity: 2 }],
      }),
    });

    expect(response.status).toBe(200);
  });

  it('reports availability for the queried session only', async () => {
    const component = await createComponent('reported', 5, 5);

    const created = await book({
      componentId: component.id,
      quantity: 2,
      date: secondDate,
      slotId: slotId(2),
    });
    expect(created.status).toBe(201);

    const scoped = await readComponent(component.id, {
      date: secondDate,
      timeSlotId: slotId(2),
    });
    expect(scoped.usedQuantity).toBe(2);
    expect(scoped.availableQuantity).toBe(3);

    const otherPeriod = await readComponent(component.id, {
      date: secondDate,
      timeSlotId: slotId(3),
    });
    expect(otherPeriod.usedQuantity).toBe(0);
    expect(otherPeriod.availableQuantity).toBe(5);

    // Without a session there is nothing to subtract: the lab's full holding.
    const unscoped = await readComponent(component.id, {});
    expect(unscoped.availableQuantity).toBe(5);
  });

  async function readComponent(
    componentId: string,
    scope: { date?: string; timeSlotId?: string },
  ): Promise<{ usedQuantity: number; availableQuantity: number }> {
    const query = new URLSearchParams({ search: `STOCK ${runId}`, pageSize: '100', ...scope });
    const page = (await fetch(`${ctx.baseUrl}/components?${query.toString()}`).then((response) =>
      response.json(),
    )) as { items: { id: string; usedQuantity: number; availableQuantity: number }[] };

    const row = page.items.find((item) => item.id === componentId);
    if (!row) throw new Error('component missing from listing');
    return row;
  }
});
