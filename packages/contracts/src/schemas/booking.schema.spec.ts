import { describe, expect, it } from 'vitest';

import { MAX_GROUP_MEMBERS } from '../constants';
import { createBookingSchema } from './booking.schema';

const cuid = 'cldz1a2b3c4d5e6f7g8h9i0j';

function validBooking(overrides: Record<string, unknown> = {}) {
  return {
    groupNumber: 3,
    members: [{ fullName: 'طالب أول' }],
    projectTitle: 'نظام ري ذكي',
    projectDescription: 'مشروع يقيس رطوبة التربة ويشغّل المضخة تلقائيًا.',
    bookingDate: '2026-08-05',
    timeSlotId: cuid,
    idCardUrl: 'https://example.com/id.jpg',
    idCardPublicId: 'folder/id',
    components: [{ componentId: cuid, quantity: 2 }],
    ...overrides,
  };
}

describe('createBookingSchema', () => {
  it('accepts a well-formed booking', () => {
    expect(createBookingSchema.safeParse(validBooking()).success).toBe(true);
  });

  it('rejects an empty group', () => {
    expect(createBookingSchema.safeParse(validBooking({ members: [] })).success).toBe(false);
  });

  it(`rejects more than ${MAX_GROUP_MEMBERS} members`, () => {
    const members = Array.from({ length: MAX_GROUP_MEMBERS + 1 }, (_, i) => ({
      fullName: `طالب ${i + 1}`,
    }));
    expect(createBookingSchema.safeParse(validBooking({ members })).success).toBe(false);
  });

  it(`accepts exactly ${MAX_GROUP_MEMBERS} members`, () => {
    const members = Array.from({ length: MAX_GROUP_MEMBERS }, (_, i) => ({
      fullName: `طالب ${i + 1}`,
    }));
    expect(createBookingSchema.safeParse(validBooking({ members })).success).toBe(true);
  });

  it('rejects a non-positive or non-integer quantity', () => {
    expect(
      createBookingSchema.safeParse(validBooking({ components: [{ componentId: cuid, quantity: 0 }] }))
        .success,
    ).toBe(false);
    expect(
      createBookingSchema.safeParse(
        validBooking({ components: [{ componentId: cuid, quantity: -1 }] }),
      ).success,
    ).toBe(false);
  });

  it('rejects the same component listed twice', () => {
    const components = [
      { componentId: cuid, quantity: 1 },
      { componentId: cuid, quantity: 2 },
    ];
    expect(createBookingSchema.safeParse(validBooking({ components })).success).toBe(false);
  });

  it('rejects a booking with no components', () => {
    expect(createBookingSchema.safeParse(validBooking({ components: [] })).success).toBe(false);
  });

  it('rejects a malformed date', () => {
    expect(createBookingSchema.safeParse(validBooking({ bookingDate: '05-08-2026' })).success).toBe(
      false,
    );
  });

  it('rejects a too-short project description', () => {
    expect(createBookingSchema.safeParse(validBooking({ projectDescription: 'قصير' })).success).toBe(
      false,
    );
  });
});
