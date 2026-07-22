import { z } from 'zod';

import { fullNameSchema, roleSchema } from './auth.schema';
import { paginationQuerySchema } from './common.schema';

export const ROLE_LABELS_AR: Record<z.infer<typeof roleSchema>, string> = {
  STUDENT: 'طالب',
  TEACHING_TEAM: 'فريق التدريس',
  ADMIN: 'مدير النظام',
};

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  studentCode: z.string().nullable(),
  phone: z.string().nullable(),
  role: roleSchema,
  emailVerifiedAt: z.string().nullable(),
  isActive: z.boolean(),
  bookingsCount: z.number().int(),
  createdAt: z.string(),
});

export const listUsersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  role: roleSchema.optional(),
});

export const updateUserRoleSchema = z.object({ role: roleSchema });

export const updateProfileSchema = z.object({
  fullName: fullNameSchema.optional(),
  studentCode: z.string().trim().max(30).optional().or(z.literal('')),
  phone: z
    .string()
    .trim()
    .regex(/^01\d{9}$/, 'رقم الهاتف يجب أن يكون 11 رقمًا ويبدأ بـ 01.')
    .optional()
    .or(z.literal('')),
});

export type User = z.infer<typeof userSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
