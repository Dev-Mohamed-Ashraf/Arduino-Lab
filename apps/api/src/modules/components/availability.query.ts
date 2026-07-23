import { BookingStatus, Prisma, type PrismaClient } from '@prisma/client';

/** Works with the root client or a transaction client. */
type Queryable = Pick<PrismaClient, '$queryRaw'> | Prisma.TransactionClient;

/** One lab session: parts are free again once the period ends. */
export interface SessionScope {
  bookingDate: Date;
  timeSlotId: string;
  /** Ignore this booking's own rows — used when an admin edits an existing one. */
  excludeBookingId?: string;
}

export interface ComponentUsageRow {
  id: string;
  name: string;
  isActive: boolean;
  totalQuantity: number;
  maxPerBooking: number;
  /** Quantity already taken by other bookings in this same date + slot. */
  usedQuantity: number;
}

/**
 * Reads components together with how much of each is already booked in one
 * session.
 *
 * The count is a correlated subquery rather than a join so that every requested
 * component comes back exactly once, including the ones with no bookings at all
 * and the ones booked only in *other* sessions — those must report zero usage,
 * not disappear. See plans/13-per-slot-stock.md.
 *
 * Pass `componentIds: null` to read the whole catalogue.
 */
export async function readComponentUsage(
  client: Queryable,
  componentIds: string[] | null,
  scope: SessionScope,
): Promise<ComponentUsageRow[]> {
  const idFilter =
    componentIds === null ? Prisma.sql`TRUE` : Prisma.sql`c.id = ANY(${componentIds})`;

  const rows = await client.$queryRaw<
    (Omit<ComponentUsageRow, 'usedQuantity'> & { usedQuantity: bigint | null })[]
  >(Prisma.sql`
    SELECT
      c.id,
      c.name,
      c."isActive",
      c."totalQuantity",
      c."maxPerBooking",
      COALESCE((
        SELECT SUM(bc.quantity)
        FROM "BookingComponent" AS bc
        JOIN "Booking" AS b ON b.id = bc."bookingId"
        WHERE bc."componentId" = c.id
          AND b."bookingDate" = ${scope.bookingDate}
          AND b."timeSlotId" = ${scope.timeSlotId}
          AND b.status = ${BookingStatus.CONFIRMED}::"BookingStatus"
          AND b.id <> ${scope.excludeBookingId ?? ''}
      ), 0) AS "usedQuantity"
    FROM "Component" AS c
    WHERE ${idFilter}
    ORDER BY c.name ASC
  `);

  // Postgres SUM() returns bigint, which does not survive JSON serialisation.
  return rows.map((row) => ({ ...row, usedQuantity: Number(row.usedQuantity ?? 0) }));
}
