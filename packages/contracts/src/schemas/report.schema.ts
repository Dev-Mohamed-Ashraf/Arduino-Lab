import { z } from 'zod';

import { isoDateSchema } from './common.schema';

export const dateRangeQuerySchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .refine((range) => !range.from || !range.to || range.from <= range.to, {
    message: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية.',
    path: ['from'],
  });

export const componentUsageRowSchema = z.object({
  componentId: z.string(),
  name: z.string(),
  sku: z.string().nullable(),
  timesRequested: z.number().int(),
  totalQuantityRequested: z.number().int(),
  currentlyReserved: z.number().int(),
  totalQuantity: z.number().int(),
  availableQuantity: z.number().int(),
});

export const slotUtilisationRowSchema = z.object({
  timeSlotId: z.string(),
  label: z.string(),
  totalBookings: z.number().int(),
  totalCapacity: z.number().int(),
  /** 0–100, rounded to one decimal. */
  utilisationPercent: z.number(),
});

export const overviewStatsSchema = z.object({
  date: z.string(),
  bookingsToday: z.number().int(),
  remainingSeatsToday: z.number().int(),
  totalCapacityToday: z.number().int(),
  activeBookingsTotal: z.number().int(),
  lowStockCount: z.number().int(),
  outOfStockCount: z.number().int(),
  studentsCount: z.number().int(),
});

export const EXPORT_TYPES = ['bookings', 'components-usage', 'stock', 'slot-utilization'] as const;
export const exportQuerySchema = z.object({
  type: z.enum(EXPORT_TYPES),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;
export type ComponentUsageRow = z.infer<typeof componentUsageRowSchema>;
export type SlotUtilisationRow = z.infer<typeof slotUtilisationRowSchema>;
export type OverviewStats = z.infer<typeof overviewStatsSchema>;
export type ExportQuery = z.infer<typeof exportQuerySchema>;
