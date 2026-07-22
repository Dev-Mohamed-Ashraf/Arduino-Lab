import { describe, expect, it } from 'vitest';

import { formatDateOnly, toDateOnly } from './dates';

describe('toDateOnly / formatDateOnly', () => {
  it('round-trips a calendar date without shifting by a day', () => {
    expect(formatDateOnly(toDateOnly('2026-08-05'))).toBe('2026-08-05');
  });

  it('anchors the date at UTC midnight', () => {
    expect(toDateOnly('2026-08-05').toISOString()).toBe('2026-08-05T00:00:00.000Z');
  });

  it('handles a year boundary', () => {
    expect(formatDateOnly(toDateOnly('2026-12-31'))).toBe('2026-12-31');
    expect(formatDateOnly(toDateOnly('2027-01-01'))).toBe('2027-01-01');
  });
});
