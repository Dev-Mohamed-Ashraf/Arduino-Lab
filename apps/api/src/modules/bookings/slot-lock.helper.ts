import { ERROR_CODES } from '@arduino-lab/contracts';
import { BookingStatus } from '@prisma/client';

import { ConflictError, NotFoundError } from '../../common/errors/app.exception';
import type { TransactionClient } from './stock.helper';

interface LockedSlot {
  id: string;
  capacity: number;
  isOpen: boolean;
}

/**
 * Takes a row lock on a time slot for the rest of the transaction.
 *
 * This is what makes capacity accounting correct: without it, two bookings
 * arriving together both read "4 of 5 taken" and both succeed, putting six
 * groups in a five-group period. Holding the lock serialises every booking that
 * touches this slot, so the count read afterwards is authoritative.
 */
export async function lockSlot(tx: TransactionClient, timeSlotId: string): Promise<LockedSlot> {
  const rows = await tx.$queryRaw<LockedSlot[]>`
    SELECT id, capacity, "isOpen"
    FROM "TimeSlot"
    WHERE id = ${timeSlotId}
    FOR UPDATE
  `;

  const slot = rows[0];
  if (!slot) {
    throw new NotFoundError(ERROR_CODES.SLOT_NOT_FOUND);
  }

  return slot;
}

export interface SlotOccupancy {
  booked: number;
  groupTaken: boolean;
}

/**
 * Reads how full the slot is and whether the group number is free.
 *
 * Deliberately a separate statement from {@link lockSlot}: under READ COMMITTED
 * each statement takes a fresh snapshot, so a count folded into the locking
 * query would be evaluated against the snapshot from *before* the lock was
 * granted and would miss a competing booking that had just committed. Both
 * questions are answered in one round trip because the enclosing transaction
 * holds a slot lock the whole time and every avoided hop is time other bookings
 * spend queued behind it.
 */
export async function readOccupancy(
  tx: TransactionClient,
  timeSlotId: string,
  bookingDate: Date,
  groupNumber: number,
  excludeBookingId?: string,
): Promise<SlotOccupancy> {
  const exclude = excludeBookingId ?? '';

  const rows = await tx.$queryRaw<{ booked: bigint; group_taken: boolean }[]>`
    SELECT
      COUNT(*) AS booked,
      COUNT(*) FILTER (WHERE "groupNumber" = ${groupNumber}) > 0 AS group_taken
    FROM "Booking"
    WHERE "timeSlotId" = ${timeSlotId}
      AND "bookingDate" = ${bookingDate}
      AND status = ${BookingStatus.CONFIRMED}::"BookingStatus"
      AND id <> ${exclude}
  `;

  const row = rows[0];
  return {
    booked: Number(row?.booked ?? 0),
    groupTaken: row?.group_taken ?? false,
  };
}

/** Rejects the booking when the period is closed or already full for that day. */
export function assertSlotHasRoom(slot: LockedSlot, occupancy: SlotOccupancy): void {
  if (!slot.isOpen) {
    throw new ConflictError(ERROR_CODES.SLOT_CLOSED);
  }

  if (occupancy.booked >= slot.capacity) {
    throw new ConflictError(ERROR_CODES.SLOT_FULL, {
      timeSlotId: [`اكتمل العدد (${occupancy.booked} من ${slot.capacity}) في هذه الفترة.`],
    });
  }
}

/**
 * Group numbers must be unique within a period on a given day, but only among
 * live bookings — a cancelled group must be able to re-register with the same
 * number. A database unique constraint cannot express that, so it is checked
 * while the slot lock is held. See plans/01-database-schema.md.
 */
export function assertGroupNumberFree(occupancy: SlotOccupancy): void {
  if (occupancy.groupTaken) {
    throw new ConflictError(ERROR_CODES.GROUP_NUMBER_TAKEN);
  }
}

/**
 * Draws the next receipt number from a PostgreSQL sequence.
 *
 * A counter in application code would hand out duplicates the moment two
 * bookings are created at the same instant. Sequences are non-transactional, so
 * this is called *outside* the booking transaction: a rolled-back booking leaves
 * a gap in the numbering, which is harmless, and it keeps one more round trip
 * out of the critical section.
 */
export async function nextBookingNumber(tx: TransactionClient, year: number): Promise<string> {
  const rows = await tx.$queryRaw<{ next_booking_number: string }[]>`
    SELECT next_booking_number(${year}::integer)
  `;

  const bookingNumber = rows[0]?.next_booking_number;
  if (!bookingNumber) {
    throw new Error('next_booking_number() returned no value');
  }

  return bookingNumber;
}
