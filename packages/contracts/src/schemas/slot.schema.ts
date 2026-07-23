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

const labelSchema = z
  .string()
  .trim()
  .min(3, 'اسم الفترة قصير جدًا.')
  .max(40, 'اسم الفترة طويل جدًا.');

/** 24-hour HH:MM, matching what <input type="time"> submits. */
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'صيغة الوقت يجب أن تكون HH:MM.');

const capacitySchema = z.coerce
  .number()
  .int('السعة يجب أن تكون رقمًا صحيحًا.')
  .min(1, 'السعة يجب أن تكون 1 على الأقل.')
  .max(50, 'السعة كبيرة بشكل غير منطقي.');

export const createSlotSchema = z
  .object({
    label: labelSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    capacity: capacitySchema.default(5),
  })
  .refine((slot) => slot.startTime < slot.endTime, {
    message: 'وقت النهاية يجب أن يكون بعد وقت البداية.',
    path: ['endTime'],
  });

export const updateSlotSchema = z
  .object({
    label: labelSchema.optional(),
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    capacity: capacitySchema.optional(),
    isOpen: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'لا يوجد أي تغيير لحفظه.',
  })
  .refine((data) => !data.startTime || !data.endTime || data.startTime < data.endTime, {
    message: 'وقت النهاية يجب أن يكون بعد وقت البداية.',
    path: ['endTime'],
  });

export const slotAvailabilityQuerySchema = z.object({
  date: isoDateSchema.optional(),
});

export type TimeSlot = z.infer<typeof timeSlotSchema>;
export type SlotAvailability = z.infer<typeof slotAvailabilitySchema>;
export type CreateSlotInput = z.infer<typeof createSlotSchema>;
export type UpdateSlotInput = z.infer<typeof updateSlotSchema>;
export type SlotAvailabilityQuery = z.infer<typeof slotAvailabilityQuerySchema>;
