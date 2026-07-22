import { Injectable } from '@nestjs/common';
import type {
  ComponentUsageRow,
  DateRangeQuery,
  OverviewStats,
  SlotUtilisationRow,
} from '@arduino-lab/contracts';
import { BookingStatus, Prisma, Role } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';
import { toDateOnly, todayInLabTimeZone } from '../../common/utils/dates';
import { availableQuantity, stockStatus } from '../components/component.mapper';
import { SlotsService } from '../slots/slots.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slots: SlotsService,
  ) {}

  async overview(date?: string): Promise<OverviewStats> {
    const day = date ?? todayInLabTimeZone();

    const [availability, components, activeBookings, students] = await Promise.all([
      this.slots.availability(day),
      this.prisma.component.findMany({
        where: { isActive: true },
        select: { totalQuantity: true, reservedQuantity: true },
      }),
      this.prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
      this.prisma.user.count({ where: { role: Role.STUDENT } }),
    ]);

    return {
      date: day,
      bookingsToday: availability.reduce((sum, slot) => sum + slot.booked, 0),
      remainingSeatsToday: availability.reduce(
        (sum, slot) => sum + (slot.isOpen ? slot.remaining : 0),
        0,
      ),
      totalCapacityToday: availability.reduce((sum, slot) => sum + slot.capacity, 0),
      activeBookingsTotal: activeBookings,
      lowStockCount: components.filter((row) => stockStatus(row) === 'low').length,
      outOfStockCount: components.filter((row) => stockStatus(row) === 'out').length,
      studentsCount: students,
    };
  }

  /**
   * How often each component was requested in a period.
   *
   * The aggregation runs in the database rather than by loading every booking
   * row and summing in JavaScript — with a term's worth of history that would be
   * thousands of rows crossing the wire to produce forty numbers.
   */
  async componentsUsage(range: DateRangeQuery): Promise<ComponentUsageRow[]> {
    const where = bookingRangeFilter(range);

    const [usage, components] = await Promise.all([
      this.prisma.bookingComponent.groupBy({
        by: ['componentId'],
        where: { booking: where },
        _count: { _all: true },
        _sum: { quantity: true },
      }),
      this.prisma.component.findMany({ orderBy: { name: 'asc' } }),
    ]);

    const usageById = new Map(usage.map((row) => [row.componentId, row]));

    return components.map((component) => {
      const stats = usageById.get(component.id);
      return {
        componentId: component.id,
        name: component.name,
        sku: component.sku,
        timesRequested: stats?._count._all ?? 0,
        totalQuantityRequested: stats?._sum.quantity ?? 0,
        currentlyReserved: component.reservedQuantity,
        totalQuantity: component.totalQuantity,
        availableQuantity: availableQuantity(component),
      };
    });
  }

  /** Current inventory snapshot, sorted with the problems first. */
  async stock(): Promise<ComponentUsageRow[]> {
    const components = await this.prisma.component.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return components
      .map((component) => ({
        componentId: component.id,
        name: component.name,
        sku: component.sku,
        timesRequested: 0,
        totalQuantityRequested: 0,
        currentlyReserved: component.reservedQuantity,
        totalQuantity: component.totalQuantity,
        availableQuantity: availableQuantity(component),
      }))
      .sort((a, b) => a.availableQuantity - b.availableQuantity);
  }

  async slotUtilisation(range: DateRangeQuery): Promise<SlotUtilisationRow[]> {
    const where = bookingRangeFilter(range);

    const [slots, counts, distinctDays] = await Promise.all([
      this.prisma.timeSlot.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.booking.groupBy({
        by: ['timeSlotId'],
        where,
        _count: { _all: true },
      }),
      this.prisma.booking.findMany({
        where,
        select: { bookingDate: true },
        distinct: ['bookingDate'],
      }),
    ]);

    // Capacity is per slot per day, so the denominator is capacity × the number
    // of days the lab actually ran in this range.
    const activeDays = Math.max(1, distinctDays.length);
    const countsBySlot = new Map(counts.map((row) => [row.timeSlotId, row._count._all]));

    return slots.map((slot) => {
      const totalBookings = countsBySlot.get(slot.id) ?? 0;
      const totalCapacity = slot.capacity * activeDays;

      return {
        timeSlotId: slot.id,
        label: slot.label,
        totalBookings,
        totalCapacity,
        utilisationPercent: Math.round((totalBookings / totalCapacity) * 1000) / 10,
      };
    });
  }

  /** Full booking rows for the CSV export and the admin report table. */
  async bookingsInRange(range: DateRangeQuery) {
    return this.prisma.booking.findMany({
      where: bookingRangeFilter(range),
      include: {
        timeSlot: { select: { label: true } },
        owner: { select: { fullName: true, email: true } },
        members: { orderBy: { sortOrder: 'asc' }, select: { fullName: true } },
        components: {
          include: { component: { select: { name: true } } },
          orderBy: { component: { name: 'asc' } },
        },
      },
      orderBy: [{ bookingDate: 'asc' }, { timeSlot: { sortOrder: 'asc' } }, { groupNumber: 'asc' }],
    });
  }
}

export type BookingReportRow = Awaited<ReturnType<ReportsService['bookingsInRange']>>[number];

function bookingRangeFilter(range: DateRangeQuery): Prisma.BookingWhereInput {
  const bookingDate: Prisma.DateTimeFilter = {};
  if (range.from) bookingDate.gte = toDateOnly(range.from);
  if (range.to) bookingDate.lte = toDateOnly(range.to);

  return {
    status: BookingStatus.CONFIRMED,
    ...(Object.keys(bookingDate).length > 0 ? { bookingDate } : {}),
  };
}
