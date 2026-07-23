import { z } from 'zod';

import { cuidSchema, isoDateSchema, paginationQuerySchema } from './common.schema';

export const STOCK_STATUSES = ['available', 'low', 'out'] as const;
export const stockStatusSchema = z.enum(STOCK_STATUSES);
export type StockStatus = z.infer<typeof stockStatusSchema>;

/** Arabic label for each stock status, used by badges in both apps. */
export const STOCK_STATUS_LABELS_AR: Record<StockStatus, string> = {
  available: 'متوفر',
  low: 'كمية محدودة',
  out: 'غير متوفر',
};

export const componentSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string().nullable(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  totalQuantity: z.number().int(),
  maxPerBooking: z.number().int(),
  /** Taken by other bookings in the queried session; 0 when none was given. */
  usedQuantity: z.number().int(),
  availableQuantity: z.number().int(),
  status: stockStatusSchema,
  isActive: z.boolean(),
});

export const createComponentSchema = z.object({
  name: z.string().trim().min(2, 'اسم المكوّن قصير جدًا.').max(120, 'اسم المكوّن طويل جدًا.'),
  sku: z.string().trim().max(40).optional().or(z.literal('')),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  imageUrl: z.string().url('رابط الصورة غير صالح.').optional().or(z.literal('')),
  totalQuantity: z.coerce
    .number()
    .int('الكمية يجب أن تكون رقمًا صحيحًا.')
    .min(0, 'الكمية لا يمكن أن تكون سالبة.')
    .max(100_000, 'الكمية كبيرة بشكل غير منطقي.'),
  /** Ceiling per group. Defaults to one so a new part is rationed until reviewed. */
  maxPerBooking: z.coerce
    .number()
    .int('الحد يجب أن يكون رقمًا صحيحًا.')
    .min(1, 'الحد يجب أن يكون 1 على الأقل.')
    .max(1000, 'الحد كبير جدًا.')
    .default(1),
});

export const updateComponentSchema = createComponentSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const listComponentsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  status: stockStatusSchema.optional(),
  /** When true, inactive components are included — admin views only. */
  includeInactive: z.coerce.boolean().default(false),
  // Stock is per session: give both and availability is what is free in that
  // period; give neither and it is the lab's full holding.
  date: isoDateSchema.optional(),
  timeSlotId: cuidSchema.optional(),
});

/** One line of a component to be requested by a booking. */
export const componentRequestSchema = z.object({
  componentId: cuidSchema,
  quantity: z.coerce
    .number()
    .int('الكمية يجب أن تكون رقمًا صحيحًا.')
    .min(1, 'الكمية يجب أن تكون 1 على الأقل.')
    .max(1000, 'الكمية كبيرة جدًا.'),
});

export type Component = z.infer<typeof componentSchema>;
export type CreateComponentInput = z.infer<typeof createComponentSchema>;
export type UpdateComponentInput = z.infer<typeof updateComponentSchema>;
export type ListComponentsQuery = z.infer<typeof listComponentsQuerySchema>;
export type ComponentRequest = z.infer<typeof componentRequestSchema>;
