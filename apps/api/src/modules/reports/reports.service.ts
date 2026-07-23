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
import { stockStatus } from '../components/component.mapper';
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
      this.stock(),
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
      // "Low" and "out" now mean: an upcoming session already wants most or all
      // of what the lab owns. See plans/13-per-slot-stock.md.
      lowStockCount: components.filter(
        (row) => stockStatus(row.totalQuantity, row.peakSessionDemand) === 'low',
      ).length,
      outOfStockCount: components.filter(
        (row) => stockStatus(row.totalQuantity, row.peakSessionDemand) === 'out',
      ).length,
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

    const [usage, peaks, components] = await Promise.all([
      this.prisma.bookingComponent.groupBy({
        by: ['componentId'],
        where: { booking: where },
        _count: { _all: true },
        _sum: { quantity: true },
      }),
      this.readPeakSessionDemand(range),
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
        totalQuantity: component.totalQuantity,
        maxPerBooking: component.maxPerBooking,
        peakSessionDemand: peaks.get(component.id) ?? 0,
      };
    });
  }

  /** Inventory snapshot with the most contended parts first. */
  async stock(): Promise<ComponentUsageRow[]> {
    const [components, peaks] = await Promise.all([
      this.prisma.component.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      this.readPeakSessionDemand({ from: todayInLabTimeZone() }),
    ]);

    return components
      .map((component) => ({
        componentId: component.id,
        name: component.name,
        sku: component.sku,
        timesRequested: 0,
        totalQuantityRequested: 0,
        totalQuantity: component.totalQuantity,
        maxPerBooking: component.maxPerBooking,
        peakSessionDemand: peaks.get(component.id) ?? 0,
      }))
      .sort(
        (a, b) =>
          a.totalQuantity - a.peakSessionDemand - (b.totalQuantity - b.peakSessionDemand),
      );
  }

  /**
   * The largest quantity of each part wanted by any single (date, slot).
   *
   * Parts return to the shelf between periods, so the number that decides
   * whether the lab has enough is the busiest session, not the range total.
   */
  private async readPeakSessionDemand(range: DateRangeQuery): Promise<Map<string, number>> {
    const from = range.from ? toDateOnly(range.from) : new Date(0);
    const to = range.to ? toDateOnly(range.to) : new Date('9999-12-31');

    const rows = await this.prisma.$queryRaw<{ componentId: string; peak: bigint }[]>`
      SELECT "componentId", MAX(session_total) AS peak
      FROM (
        SELECT bc."componentId", SUM(bc.quantity) AS session_total
        FROM "BookingComponent" AS bc
        JOIN "Booking" AS b ON b.id = bc."bookingId"
        WHERE b.status = ${BookingStatus.CONFIRMED}::"BookingStatus"
          AND b."bookingDate" >= ${from}
          AND b."bookingDate" <= ${to}
        GROUP BY bc."componentId", b."bookingDate", b."timeSlotId"
      ) AS sessions
      GROUP BY "componentId"
    `;

    return new Map(rows.map((row) => [row.componentId, Number(row.peak)]));
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
