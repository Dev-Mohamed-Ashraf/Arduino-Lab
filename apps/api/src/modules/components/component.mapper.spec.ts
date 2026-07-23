import { describe, expect, it } from 'vitest';

import { availableQuantity, stockStatus } from './component.mapper';

describe('availableQuantity', () => {
  it('is what the lab owns minus what this session already took', () => {
    expect(availableQuantity(10, 3)).toBe(7);
  });

  it('is zero once the session has taken everything', () => {
    expect(availableQuantity(5, 5)).toBe(0);
  });

  it('never goes negative even if the data is inconsistent', () => {
    expect(availableQuantity(5, 8)).toBe(0);
  });

  it('is the full holding when no session is in play', () => {
    expect(availableQuantity(12, 0)).toBe(12);
  });
});

describe('stockStatus', () => {
  it('reports out when nothing is left in the session', () => {
    expect(stockStatus(4, 4)).toBe('out');
  });

  it('reports low at or below a quarter of the holding', () => {
    // 25 owned, 6 free → 24% ≤ threshold
    expect(stockStatus(25, 19)).toBe('low');
    // exactly 25%
    expect(stockStatus(20, 15)).toBe('low');
  });

  it('reports available above a quarter of the holding', () => {
    expect(stockStatus(20, 10)).toBe('available');
  });

  it('treats a part the lab owns none of as out', () => {
    expect(stockStatus(0, 0)).toBe('out');
  });
});
