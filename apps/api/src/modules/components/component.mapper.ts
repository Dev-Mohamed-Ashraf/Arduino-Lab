import { LOW_STOCK_THRESHOLD_RATIO, type Component, type StockStatus } from '@arduino-lab/contracts';
import type { Component as ComponentRow } from '@prisma/client';

/**
 * Availability is always derived, never stored — see the note on the Component
 * model in schema.prisma.
 */
export function availableQuantity(row: Pick<ComponentRow, 'totalQuantity' | 'reservedQuantity'>): number {
  return row.totalQuantity - row.reservedQuantity;
}

export function stockStatus(row: Pick<ComponentRow, 'totalQuantity' | 'reservedQuantity'>): StockStatus {
  const available = availableQuantity(row);

  if (available <= 0) return 'out';
  if (row.totalQuantity > 0 && available / row.totalQuantity <= LOW_STOCK_THRESHOLD_RATIO) {
    return 'low';
  }
  return 'available';
}

export function toComponentDto(row: ComponentRow): Component {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    description: row.description,
    imageUrl: row.imageUrl,
    totalQuantity: row.totalQuantity,
    reservedQuantity: row.reservedQuantity,
    availableQuantity: availableQuantity(row),
    status: stockStatus(row),
    isActive: row.isActive,
  };
}
