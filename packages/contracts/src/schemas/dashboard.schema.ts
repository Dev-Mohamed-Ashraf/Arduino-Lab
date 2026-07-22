import { z } from 'zod';

import { componentSchema } from './component.schema';
import { isoDateSchema } from './common.schema';
import { slotAvailabilitySchema } from './slot.schema';

/**
 * Everything the public home page needs, in a single request.
 *
 * The home page is by far the most visited screen; one round trip instead of
 * three matters on Render's free tier.
 */
export const dashboardSchema = z.object({
  date: z.string(),
  slots: z.array(slotAvailabilitySchema),
  components: z.array(componentSchema),
  summary: z.object({
    totalBookingsToday: z.number().int(),
    totalCapacityToday: z.number().int(),
    totalRemainingSeats: z.number().int(),
    componentsCount: z.number().int(),
    lowStockCount: z.number().int(),
    outOfStockCount: z.number().int(),
  }),
});

export const dashboardQuerySchema = z.object({
  date: isoDateSchema.optional(),
});

export type Dashboard = z.infer<typeof dashboardSchema>;
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
