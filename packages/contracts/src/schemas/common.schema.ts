import { z } from 'zod';

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants';

export const cuidSchema = z.string().cuid({ message: 'معرّف غير صالح.' });

/** Calendar day with no time component, e.g. "2026-08-05". */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'صيغة التاريخ يجب أن تكون YYYY-MM-DD.' })
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'تاريخ غير صالح.' });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type SortOrder = z.infer<typeof sortOrderSchema>;

/** Envelope every list endpoint returns. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const idParamSchema = z.object({ id: cuidSchema });
export type IdParam = z.infer<typeof idParamSchema>;
