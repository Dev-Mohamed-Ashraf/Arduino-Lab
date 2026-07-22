import { LAB_TIME_ZONE } from '@arduino-lab/contracts';

/**
 * "Today" in the lab's own timezone.
 *
 * The server may run in UTC on Render while the lab operates in Cairo; using the
 * server's local date would roll the booking day over at the wrong hour.
 */
export function todayInLabTimeZone(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: LAB_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Converts a `YYYY-MM-DD` string into the UTC midnight Date that Prisma's
 * `@db.Date` column round-trips without shifting by a day.
 */
export function toDateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/** Inverse of {@link toDateOnly}. */
export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isPastDate(isoDate: string): boolean {
  return isoDate < todayInLabTimeZone();
}
