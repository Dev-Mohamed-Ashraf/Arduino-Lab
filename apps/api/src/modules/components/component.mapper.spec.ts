import { describe, expect, it } from 'vitest';

import { availableQuantity, stockStatus } from './component.mapper';

const base = {
  id: 'c1',
  name: 'Part',
  sku: null,
  description: null,
  imageUrl: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('availableQuantity', () => {
  it('is total minus reserved', () => {
    expect(availableQuantity({ totalQuantity: 10, reservedQuantity: 3 })).toBe(7);
  });

  it('is zero when everything is reserved', () => {
    expect(availableQuantity({ totalQuantity: 5, reservedQuantity: 5 })).toBe(0);
  });
});

describe('stockStatus', () => {
  it('reports out when nothing is available', () => {
    expect(stockStatus({ ...base, totalQuantity: 4, reservedQuantity: 4 })).toBe('out');
  });

  it('reports low at or below a quarter of stock', () => {
    // 25 total, 6 available → 24% ≤ threshold
    expect(stockStatus({ ...base, totalQuantity: 25, reservedQuantity: 19 })).toBe('low');
    // exactly 25%
    expect(stockStatus({ ...base, totalQuantity: 20, reservedQuantity: 15 })).toBe('low');
  });

  it('reports available above a quarter of stock', () => {
    expect(stockStatus({ ...base, totalQuantity: 20, reservedQuantity: 10 })).toBe('available');
  });

  it('treats a zero-total component as out', () => {
    expect(stockStatus({ ...base, totalQuantity: 0, reservedQuantity: 0 })).toBe('out');
  });
});
