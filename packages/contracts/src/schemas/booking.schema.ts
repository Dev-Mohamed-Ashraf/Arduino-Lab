import { z } from 'zod';

import {
  MAX_GROUP_MEMBERS,
  MIN_GROUP_MEMBERS,
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_DESCRIPTION_MIN_LENGTH,
  PROJECT_TITLE_MAX_LENGTH,
  PROJECT_TITLE_MIN_LENGTH,
} from '../constants';
import { componentRequestSchema } from './component.schema';
import { cuidSchema, isoDateSchema, paginationQuerySchema } from './common.schema';

export const BOOKING_STATUSES = ['CONFIRMED', 'CANCELLED', 'COMPLETED'] as const;
export const bookingStatusSchema = z.enum(BOOKING_STATUSES);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

export const BOOKING_STATUS_LABELS_AR: Record<BookingStatus, string> = {
  CONFIRMED: 'مؤكد',
  CANCELLED: 'ملغي',
  COMPLETED: 'مكتمل',
};

export const bookingMemberInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, 'اسم الطالب قصير جدًا.')
    .max(120, 'اسم الطالب طويل جدًا.'),
  studentCode: z.string().trim().max(30).optional().or(z.literal('')),
});

export const createBookingSchema = z.object({
  groupNumber: z.coerce
    .number()
    .int('رقم المجموعة يجب أن يكون رقمًا صحيحًا.')
    .min(1, 'رقم المجموعة يجب أن يكون 1 على الأقل.')
    .max(999, 'رقم المجموعة كبير جدًا.'),

  members: z
    .array(bookingMemberInputSchema)
    .min(MIN_GROUP_MEMBERS, 'يجب إضافة طالب واحد على الأقل.')
    .max(MAX_GROUP_MEMBERS, `الحد الأقصى ${MAX_GROUP_MEMBERS} طلاب في المجموعة.`),

  projectTitle: z
    .string()
    .trim()
    .min(PROJECT_TITLE_MIN_LENGTH, 'اسم المشروع قصير جدًا.')
    .max(PROJECT_TITLE_MAX_LENGTH, 'اسم المشروع طويل جدًا.'),

  projectDescription: z
    .string()
    .trim()
    .min(PROJECT_DESCRIPTION_MIN_LENGTH, 'وصف المشروع قصير جدًا.')
    .max(PROJECT_DESCRIPTION_MAX_LENGTH, 'وصف المشروع طويل جدًا.'),

  bookingDate: isoDateSchema,
  timeSlotId: cuidSchema,

  idCardUrl: z.string().url('لم يتم رفع صورة البطاقة.'),
  idCardPublicId: z.string().min(1, 'لم يتم رفع صورة البطاقة.'),

  components: z
    .array(componentRequestSchema)
    .min(1, 'يجب اختيار مكوّن واحد على الأقل.')
    .max(50, 'عدد المكوّنات كبير جدًا.')
    .refine(
      (items) => new Set(items.map((item) => item.componentId)).size === items.length,
      { message: 'لا يمكن اختيار نفس المكوّن أكثر من مرة.' },
    ),

  notes: z.string().trim().max(500).optional().or(z.literal('')),
});

/**
 * Admin-only edit. `ownerId` is included so an admin can reassign a booking that
 * was registered on a student's behalf.
 */
export const updateBookingSchema = createBookingSchema
  .partial()
  .extend({
    ownerId: cuidSchema.optional(),
    status: bookingStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'لا يوجد أي تغيير لحفظه.' });

export const moveBookingSchema = z.object({
  timeSlotId: cuidSchema,
  bookingDate: isoDateSchema,
});

export const listBookingsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  status: bookingStatusSchema.optional(),
  timeSlotId: cuidSchema.optional(),
  dateFrom: isoDateSchema.optional(),
  dateTo: isoDateSchema.optional(),
  sortBy: z.enum(['createdAt', 'bookingDate', 'groupNumber']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ─── Output shapes ───────────────────────────────────────────

export const bookingMemberSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  studentCode: z.string().nullable(),
  sortOrder: z.number().int(),
});

export const bookingComponentSchema = z.object({
  id: z.string(),
  componentId: z.string(),
  name: z.string(),
  sku: z.string().nullable(),
  quantity: z.number().int(),
});

export const bookingSchema = z.object({
  id: z.string(),
  bookingNumber: z.string(),
  groupNumber: z.number().int(),
  projectTitle: z.string(),
  projectDescription: z.string(),
  bookingDate: z.string(),
  status: bookingStatusSchema,
  notes: z.string().nullable(),
  idCardUrl: z.string(),
  timeSlot: z.object({
    id: z.string(),
    label: z.string(),
    startTime: z.string(),
    endTime: z.string(),
  }),
  owner: z.object({
    id: z.string(),
    fullName: z.string(),
    email: z.string(),
  }),
  members: z.array(bookingMemberSchema),
  components: z.array(bookingComponentSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Trimmed row used by list views, to keep table payloads small. */
export const bookingSummarySchema = bookingSchema.pick({
  id: true,
  bookingNumber: true,
  groupNumber: true,
  projectTitle: true,
  bookingDate: true,
  status: true,
  timeSlot: true,
  createdAt: true,
}).extend({
  memberCount: z.number().int(),
  componentCount: z.number().int(),
  ownerName: z.string(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type MoveBookingInput = z.infer<typeof moveBookingSchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
export type BookingMemberInput = z.infer<typeof bookingMemberInputSchema>;
export type Booking = z.infer<typeof bookingSchema>;
export type BookingSummary = z.infer<typeof bookingSummarySchema>;
