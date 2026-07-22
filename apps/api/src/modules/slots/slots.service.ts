import { Injectable } from '@nestjs/common';
import {
  ERROR_CODES,
  type SlotAvailability,
  type TimeSlot,
  type UpdateSlotInput,
} from '@arduino-lab/contracts';
import { AuditAction, BookingStatus, type TimeSlot as TimeSlotRow } from '@prisma/client';

import { ConflictError, NotFoundError } from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toDateOnly, todayInLabTimeZone } from '../../common/utils/dates';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(): Promise<TimeSlot[]> {
    const rows = await this.prisma.timeSlot.findMany({ orderBy: { sortOrder: 'asc' } });
    return rows.map(toSlotDto);
  }

  /**
   * How full each period is on one calendar day.
   *
   * Capacity is per slot per day, so the booking counts are grouped by date as
   * well as slot — see plans/01-database-schema.md.
   */
  async availability(date?: string): Promise<SlotAvailability[]> {
    const bookingDate = date ?? todayInLabTimeZone();

    const [slots, counts] = await Promise.all([
      this.prisma.timeSlot.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.booking.groupBy({
        by: ['timeSlotId'],
        where: { bookingDate: toDateOnly(bookingDate), status: BookingStatus.CONFIRMED },
        _count: { _all: true },
      }),
    ]);

    const bookedBySlot = new Map(counts.map((row) => [row.timeSlotId, row._count._all]));

    return slots.map((slot) => {
      const booked = bookedBySlot.get(slot.id) ?? 0;
      const remaining = Math.max(0, slot.capacity - booked);
      const isFull = remaining === 0;

      return {
        ...toSlotDto(slot),
        booked,
        remaining,
        isFull,
        isBookable: slot.isOpen && !isFull,
      };
    });
  }

  async update(actorId: string, id: string, input: UpdateSlotInput): Promise<TimeSlot> {
    const before = await this.prisma.timeSlot.findUnique({ where: { id } });
    if (!before) throw new NotFoundError(ERROR_CODES.SLOT_NOT_FOUND);

    if (input.capacity !== undefined && input.capacity < before.capacity) {
      await this.assertCapacityNotBelowBooked(id, input.capacity);
    }

    const after = await this.prisma.timeSlot.update({
      where: { id },
      data: {
        ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
        ...(input.isOpen !== undefined ? { isOpen: input.isOpen } : {}),
      },
    });

    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entity: 'TimeSlot',
      entityId: id,
      before,
      after,
    });

    return toSlotDto(after);
  }

  /**
   * Lowering capacity must not strand groups that already hold a place, so the
   * busiest upcoming day sets the floor.
   */
  private async assertCapacityNotBelowBooked(slotId: string, capacity: number): Promise<void> {
    const busiest = await this.prisma.booking.groupBy({
      by: ['bookingDate'],
      where: {
        timeSlotId: slotId,
        status: BookingStatus.CONFIRMED,
        bookingDate: { gte: toDateOnly(todayInLabTimeZone()) },
      },
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    });

    const peak = busiest[0]?._count._all ?? 0;

    if (capacity < peak) {
      throw new ConflictError(ERROR_CODES.SLOT_CAPACITY_BELOW_BOOKED, {
        capacity: [`أكبر عدد مجموعات محجوز في يوم واحد لهذه الفترة هو ${peak}.`],
      });
    }
  }
}

function toSlotDto(row: TimeSlotRow): TimeSlot {
  return {
    id: row.id,
    label: row.label,
    startTime: row.startTime,
    endTime: row.endTime,
    capacity: row.capacity,
    isOpen: row.isOpen,
    sortOrder: row.sortOrder,
  };
}
