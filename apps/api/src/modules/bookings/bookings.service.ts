import { Injectable, Logger } from '@nestjs/common';
import {
  ERROR_CODES,
  type Booking,
  type BookingSummary,
  type CreateBookingInput,
  type ListBookingsQuery,
  type Paginated,
} from '@arduino-lab/contracts';
import { Prisma, Role } from '@prisma/client';

import { AppConfigService } from '../../config/app-config.service';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { isPastDate, toDateOnly } from '../../common/utils/dates';
import { paginate, toPrismaPagination } from '../../common/utils/pagination';
import { MailService } from '../mail/mail.service';
import {
  BOOKING_DETAIL_INCLUDE,
  BOOKING_SUMMARY_INCLUDE,
  toBookingDto,
  toBookingSummaryDto,
} from './booking.mapper';
import {
  assertGroupNumberFree,
  assertSlotHasRoom,
  lockSlot,
  nextBookingNumber,
  readOccupancy,
} from './slot-lock.helper';
import { reserveComponents } from './stock.helper';

/**
 * Bookings queue behind a slot-level row lock, so a burst of students competing
 * for the last place in a period is serialised by design. The default 5-second
 * Prisma limit is far too tight for that queue once the database is a network
 * hop away — the tenth caller would fail with a transaction timeout instead of
 * an honest "slot full".
 */
const BOOKING_TRANSACTION_OPTIONS = { maxWait: 20_000, timeout: 30_000 } as const;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Creates a booking, or changes nothing at all.
   *
   * Capacity and stock are claimed inside one transaction: the slot row is
   * locked first, then every component is reserved with an atomic conditional
   * update. If any component is short, the whole transaction rolls back and no
   * stock is consumed. See plans/05-api-bookings.md.
   */
  async create(actor: RequestUser, input: CreateBookingInput): Promise<Booking> {
    if (isPastDate(input.bookingDate)) {
      throw new BadRequestError(ERROR_CODES.BOOKING_DATE_IN_PAST);
    }

    const bookingDate = toDateOnly(input.bookingDate);

    // Drawn before the transaction opens: the sequence is non-transactional, so
    // this only ever costs a gap in the numbering if the booking is rejected.
    const bookingNumber = await nextBookingNumber(this.prisma, bookingDate.getUTCFullYear());

    const booking = await this.prisma.$transaction(async (tx) => {
      const slot = await lockSlot(tx, input.timeSlotId);
      const occupancy = await readOccupancy(tx, slot.id, bookingDate, input.groupNumber);

      assertSlotHasRoom(slot, occupancy);
      assertGroupNumberFree(occupancy);

      await reserveComponents(tx, input.components);

      return tx.booking.create({
        data: {
          bookingNumber,
          groupNumber: input.groupNumber,
          projectTitle: input.projectTitle,
          projectDescription: input.projectDescription,
          bookingDate,
          timeSlotId: slot.id,
          idCardUrl: input.idCardUrl,
          idCardPublicId: input.idCardPublicId,
          notes: input.notes || null,
          ownerId: actor.id,
          createdById: actor.id,
          members: {
            create: input.members.map((member, index) => ({
              fullName: member.fullName,
              studentCode: member.studentCode || null,
              sortOrder: index,
            })),
          },
          components: {
            create: input.components.map((item) => ({
              componentId: item.componentId,
              quantity: item.quantity,
            })),
          },
        },
        include: BOOKING_DETAIL_INCLUDE,
      });
    }, BOOKING_TRANSACTION_OPTIONS);

    const dto = toBookingDto(booking);
    // Sent after the transaction commits: a mail outage must not undo a booking.
    void this.sendConfirmation(dto, booking.owner.email);
    return dto;
  }

  async findByNumber(actor: RequestUser, bookingNumber: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingNumber },
      include: BOOKING_DETAIL_INCLUDE,
    });

    if (!booking) throw new NotFoundError(ERROR_CODES.BOOKING_NOT_FOUND);

    const isStaff = actor.role === Role.ADMIN || actor.role === Role.TEACHING_TEAM;
    if (!isStaff && booking.ownerId !== actor.id) {
      throw new ForbiddenError();
    }

    return toBookingDto(booking);
  }

  async findMine(userId: string): Promise<BookingSummary[]> {
    const rows = await this.prisma.booking.findMany({
      where: { ownerId: userId },
      include: BOOKING_SUMMARY_INCLUDE,
      orderBy: [{ bookingDate: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map(toBookingSummaryDto);
  }

  async list(query: ListBookingsQuery): Promise<Paginated<BookingSummary>> {
    const where = buildListFilter(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        include: BOOKING_SUMMARY_INCLUDE,
        ...toPrismaPagination(query),
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return paginate(rows.map(toBookingSummaryDto), total, query);
  }

  private async sendConfirmation(booking: Booking, email: string): Promise<void> {
    try {
      await this.mail.sendBookingConfirmed(email, {
        fullName: booking.owner.fullName,
        bookingNumber: booking.bookingNumber,
        bookingDate: booking.bookingDate,
        slotLabel: booking.timeSlot.label,
        groupNumber: booking.groupNumber,
        projectTitle: booking.projectTitle,
        componentLines: booking.components.map((item) => `${item.name} × ${item.quantity}`),
        receiptUrl: `${this.config.studentAppUrl}/booking/${booking.bookingNumber}`,
      });
    } catch (error) {
      this.logger.error(`Confirmation email failed for ${booking.bookingNumber}`, error);
    }
  }
}

function buildListFilter(query: ListBookingsQuery): Prisma.BookingWhereInput {
  const dateFilter: Prisma.DateTimeFilter = {};
  if (query.dateFrom) dateFilter.gte = toDateOnly(query.dateFrom);
  if (query.dateTo) dateFilter.lte = toDateOnly(query.dateTo);

  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.timeSlotId ? { timeSlotId: query.timeSlotId } : {}),
    ...(Object.keys(dateFilter).length > 0 ? { bookingDate: dateFilter } : {}),
    ...(query.search ? { OR: buildSearchFilter(query.search) } : {}),
  };
}

/** Matches a receipt number, project title, owner, or any listed student. */
function buildSearchFilter(search: string): Prisma.BookingWhereInput[] {
  const filters: Prisma.BookingWhereInput[] = [
    { bookingNumber: { contains: search, mode: 'insensitive' } },
    { projectTitle: { contains: search, mode: 'insensitive' } },
    { owner: { fullName: { contains: search, mode: 'insensitive' } } },
    { members: { some: { fullName: { contains: search, mode: 'insensitive' } } } },
  ];

  const asNumber = Number(search);
  if (Number.isInteger(asNumber) && asNumber > 0) {
    filters.push({ groupNumber: asNumber });
  }

  return filters;
}
