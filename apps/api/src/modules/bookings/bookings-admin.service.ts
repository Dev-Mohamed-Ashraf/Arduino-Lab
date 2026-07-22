import { Injectable, Logger } from '@nestjs/common';
import {
  ERROR_CODES,
  type Booking,
  type BookingMemberInput,
  type ComponentRequest,
  type MoveBookingInput,
  type UpdateBookingInput,
} from '@arduino-lab/contracts';
import { AuditAction, BookingStatus, Prisma } from '@prisma/client';

import { ConflictError, NotFoundError } from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { formatDateOnly, toDateOnly } from '../../common/utils/dates';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { BOOKING_DETAIL_INCLUDE, toBookingDto } from './booking.mapper';
import {
  assertGroupNumberFree,
  assertSlotHasRoom,
  lockSlot,
  readOccupancy,
} from './slot-lock.helper';

/** Matches the create path — see the note in bookings.service.ts. */
const BOOKING_TRANSACTION_OPTIONS = { maxWait: 20_000, timeout: 30_000 } as const;
import { applyComponentDelta, releaseComponents, type TransactionClient } from './stock.helper';

/**
 * Administrative changes to confirmed bookings.
 *
 * Students cannot reach any of this: once a booking is confirmed it is locked,
 * and only an admin may edit, move or cancel it. Every path adjusts stock inside
 * the same transaction as the change itself.
 */
@Injectable()
export class BookingsAdminService {
  private readonly logger = new Logger(BookingsAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  async update(actorId: string, id: string, input: UpdateBookingInput): Promise<Booking> {
    const before = await this.loadOrThrow(id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const timeSlotId = input.timeSlotId ?? before.timeSlotId;
      const bookingDate = input.bookingDate ? toDateOnly(input.bookingDate) : before.bookingDate;
      const groupNumber = input.groupNumber ?? before.groupNumber;

      const slotChanged =
        timeSlotId !== before.timeSlotId || bookingDate.getTime() !== before.bookingDate.getTime();

      // Re-checking capacity is only needed when the booking moves; the slot is
      // still locked either way so the group-number check cannot race.
      const slot = await lockSlot(tx, timeSlotId);
      const occupancy = await readOccupancy(tx, timeSlotId, bookingDate, groupNumber, id);

      if (slotChanged) {
        assertSlotHasRoom(slot, occupancy);
      }
      assertGroupNumberFree(occupancy);

      if (input.components) {
        await applyComponentDelta(tx, toRequests(before.components), input.components);
        await replaceComponents(tx, id, input.components);
      }

      if (input.members) {
        await replaceMembers(tx, id, input.members);
      }

      // Cancelling through the edit form must also return the stock.
      if (input.status === BookingStatus.CANCELLED && before.status !== BookingStatus.CANCELLED) {
        await releaseComponents(tx, toRequests(before.components));
      }

      return tx.booking.update({
        where: { id },
        data: buildBookingData(input, { timeSlotId, bookingDate, groupNumber }),
        include: BOOKING_DETAIL_INCLUDE,
      });
    }, BOOKING_TRANSACTION_OPTIONS);

    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entity: 'Booking',
      entityId: id,
      before: toBookingDto(before),
      after: toBookingDto(updated),
    });

    return toBookingDto(updated);
  }

  /** Moves a booking to another period or day, leaving its components untouched. */
  async move(actorId: string, id: string, input: MoveBookingInput): Promise<Booking> {
    const before = await this.loadOrThrow(id);
    const bookingDate = toDateOnly(input.bookingDate);

    const moved = await this.prisma.$transaction(async (tx) => {
      const slot = await lockSlot(tx, input.timeSlotId);
      const occupancy = await readOccupancy(tx, slot.id, bookingDate, before.groupNumber, id);

      assertSlotHasRoom(slot, occupancy);
      assertGroupNumberFree(occupancy);

      return tx.booking.update({
        where: { id },
        data: { timeSlotId: slot.id, bookingDate },
        include: BOOKING_DETAIL_INCLUDE,
      });
    }, BOOKING_TRANSACTION_OPTIONS);

    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entity: 'Booking',
      entityId: id,
      before: { timeSlotId: before.timeSlotId, bookingDate: formatDateOnly(before.bookingDate) },
      after: { timeSlotId: moved.timeSlotId, bookingDate: formatDateOnly(moved.bookingDate) },
    });

    return toBookingDto(moved);
  }

  /**
   * Cancels a booking and returns its components to the pool.
   *
   * The row is kept rather than deleted so the lab retains a record of what was
   * booked and by whom.
   */
  async cancel(actorId: string, id: string): Promise<void> {
    const booking = await this.loadOrThrow(id);

    if (booking.status === BookingStatus.CANCELLED) {
      throw new ConflictError(ERROR_CODES.BOOKING_ALREADY_CANCELLED);
    }

    await this.prisma.$transaction(async (tx) => {
      await releaseComponents(tx, toRequests(booking.components));
      await tx.booking.update({
        where: { id },
        data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
      });
    }, BOOKING_TRANSACTION_OPTIONS);

    await this.audit.record({
      actorId,
      action: AuditAction.DELETE,
      entity: 'Booking',
      entityId: id,
      before: toBookingDto(booking),
    });

    void this.notifyCancellation(booking);
  }

  private async loadOrThrow(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: BOOKING_DETAIL_INCLUDE,
    });

    if (!booking) throw new NotFoundError(ERROR_CODES.BOOKING_NOT_FOUND);
    return booking;
  }

  private async notifyCancellation(
    booking: Awaited<ReturnType<BookingsAdminService['loadOrThrow']>>,
  ): Promise<void> {
    try {
      await this.mail.sendBookingCancelled(booking.owner.email, {
        fullName: booking.owner.fullName,
        bookingNumber: booking.bookingNumber,
        bookingDate: formatDateOnly(booking.bookingDate),
        slotLabel: booking.timeSlot.label,
        groupNumber: booking.groupNumber,
        projectTitle: booking.projectTitle,
      });
    } catch (error) {
      this.logger.error(`Cancellation email failed for ${booking.bookingNumber}`, error);
    }
  }
}

type BookingComponentRow = { componentId: string; quantity: number };

function toRequests(items: BookingComponentRow[]): ComponentRequest[] {
  return items.map((item) => ({ componentId: item.componentId, quantity: item.quantity }));
}

/** Rows are replaced wholesale; the stock delta has already been applied. */
async function replaceComponents(
  tx: TransactionClient,
  bookingId: string,
  components: ComponentRequest[],
): Promise<void> {
  await tx.bookingComponent.deleteMany({ where: { bookingId } });
  await tx.bookingComponent.createMany({
    data: components.map((item) => ({
      bookingId,
      componentId: item.componentId,
      quantity: item.quantity,
    })),
  });
}

/** Replacing rather than patching keeps sortOrder contiguous from zero. */
async function replaceMembers(
  tx: TransactionClient,
  bookingId: string,
  members: BookingMemberInput[],
): Promise<void> {
  await tx.bookingMember.deleteMany({ where: { bookingId } });
  await tx.bookingMember.createMany({
    data: members.map((member, index) => ({
      bookingId,
      fullName: member.fullName,
      studentCode: member.studentCode || null,
      sortOrder: index,
    })),
  });
}

function buildBookingData(
  input: UpdateBookingInput,
  resolved: { timeSlotId: string; bookingDate: Date; groupNumber: number },
): Prisma.BookingUpdateInput {
  const data: Prisma.BookingUpdateInput = {
    groupNumber: resolved.groupNumber,
    bookingDate: resolved.bookingDate,
    timeSlot: { connect: { id: resolved.timeSlotId } },
  };

  if (input.projectTitle !== undefined) data.projectTitle = input.projectTitle;
  if (input.projectDescription !== undefined) data.projectDescription = input.projectDescription;
  if (input.idCardUrl !== undefined) data.idCardUrl = input.idCardUrl;
  if (input.idCardPublicId !== undefined) data.idCardPublicId = input.idCardPublicId;
  if (input.notes !== undefined) data.notes = input.notes || null;
  if (input.ownerId !== undefined) data.owner = { connect: { id: input.ownerId } };
  if (input.status !== undefined) {
    data.status = input.status;
    data.cancelledAt = input.status === BookingStatus.CANCELLED ? new Date() : null;
  }

  return data;
}
