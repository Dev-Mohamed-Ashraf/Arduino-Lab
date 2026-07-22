import { z } from 'zod';

import { isoDateSchema } from './common.schema';

export const timeSlotSchema = z.object({
  id: z.string(),
  label: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  capacity: z.number().int(),
  isOpen: z.boolean(),
  sortOrder: z.number().int(),
});

/** A slot enriched with how full it is on a specific day. */
export const slotAvailabilitySchema = timeSlotSchema.extend({
  booked: z.number().int(),
  remaining: z.number().int(),
  isFull: z.boolean(),
  /** False when the slot is closed or already full — the UI disables it. */
  isBookable: z.boolean(),
});

export const updateSlotSchema = z
  .object({
    capacity: z.coerce
      .number()
      .int('السعة يجب أن تكون رقمًا صحيحًا.')
      .min(1, 'السعة يجب أن تكون 1 على الأقل.')
      .max(50, 'السعة كبيرة بشكل غير منطقي.')
      .optional(),
    isOpen: z.boolean().optional(),
  })
  .refine((data) => data.capacity !== undefined || data.isOpen !== undefined, {
    message: 'لا يوجد أي تغيير لحفظه.',
  });

export const slotAvailabilityQuerySchema = z.object({
  date: isoDateSchema.optional(),
});

export type TimeSlot = z.infer<typeof timeSlotSchema>;
export type SlotAvailability = z.infer<typeof slotAvailabilitySchema>;
export type UpdateSlotInput = z.infer<typeof updateSlotSchema>;
export type SlotAvailabilityQuery = z.infer<typeof slotAvailabilityQuerySchema>;
