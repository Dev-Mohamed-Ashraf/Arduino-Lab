import { LAB_TIME_ZONE } from '@arduino-lab/contracts';

const LONG_DATE = new Intl.DateTimeFormat('ar-EG', {
  timeZone: 'UTC',
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  numberingSystem: 'latn',
});

const SHORT_DATE = new Intl.DateTimeFormat('ar-EG', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  numberingSystem: 'latn',
});

/** "2026-08-05" → "الأربعاء، 5 أغسطس 2026" with Latin digits. */
export function formatLongDate(isoDate: string): string {
  return LONG_DATE.format(new Date(`${isoDate}T00:00:00Z`));
}

export function formatShortDate(isoDate: string): string {
  return SHORT_DATE.format(new Date(`${isoDate}T00:00:00Z`));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: LAB_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
    numberingSystem: 'latn',
  }).format(new Date(iso));
}

/** Today in the lab's timezone, as YYYY-MM-DD. */
export function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: LAB_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Adds days to a YYYY-MM-DD string without dragging in a date library. */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
