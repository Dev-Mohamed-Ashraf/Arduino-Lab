import { describe, expect, it } from 'vitest';

import { hashToken, parseDuration } from './token.service';

describe('parseDuration', () => {
  it('parses seconds, minutes, hours and days', () => {
    expect(parseDuration('30s')).toBe(30_000);
    expect(parseDuration('15m')).toBe(900_000);
    expect(parseDuration('2h')).toBe(7_200_000);
    expect(parseDuration('7d')).toBe(604_800_000);
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseDuration('  15m ')).toBe(900_000);
  });

  it('rejects malformed input', () => {
    expect(() => parseDuration('15')).toThrow();
    expect(() => parseDuration('abc')).toThrow();
    expect(() => parseDuration('15w')).toThrow();
    expect(() => parseDuration('')).toThrow();
  });
});

describe('hashToken', () => {
  it('is deterministic', () => {
    expect(hashToken('same-token')).toBe(hashToken('same-token'));
  });

  it('produces a 64-char hex SHA-256 digest', () => {
    expect(hashToken('anything')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('never returns the raw token', () => {
    const raw = 'super-secret-refresh-token';
    expect(hashToken(raw)).not.toContain(raw);
  });

  it('gives different digests for different inputs', () => {
    expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
  });
});
