import { LOW_STOCK_THRESHOLD_RATIO, type Component, type StockStatus } from '@arduino-lab/contracts';
import type { Component as ComponentRow } from '@prisma/client';

/**
 * How much of a part is free.
 *
 * `usedQuantity` is what other bookings in the *same* (date, slot) already hold —
 * stock is per session, so it is only meaningful with that context. Callers
 * without a session (the public catalogue, the admin inventory table) pass 0 and
 * get the lab's full holding. See plans/13-per-slot-stock.md.
 */
export function availableQuantity(totalQuantity: number, usedQuantity: number): number {
  return Math.max(0, totalQuantity - usedQuantity);
}

export function stockStatus(totalQuantity: number, usedQuantity: number): StockStatus {
  const available = availableQuantity(totalQuantity, usedQuantity);

  if (available <= 0) return 'out';
  if (totalQuantity > 0 && available / totalQuantity <= LOW_STOCK_THRESHOLD_RATIO) {
    return 'low';
  }
  return 'available';
}

export function toComponentDto(row: ComponentRow, usedQuantity = 0): Component {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    description: row.description,
    imageUrl: row.imageUrl,
    totalQuantity: row.totalQuantity,
    maxPerBooking: row.maxPerBooking,
    usedQuantity,
    availableQuantity: availableQuantity(row.totalQuantity, usedQuantity),
    status: stockStatus(row.totalQuantity, usedQuantity),
    isActive: row.isActive,
  };
}
