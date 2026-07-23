import { z } from 'zod';

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../constants';

export const ROLES = ['STUDENT', 'TEACHING_TEAM', 'ADMIN'] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'البريد الإلكتروني مطلوب.')
  .email('صيغة البريد الإلكتروني غير صحيحة.');

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `كلمة المرور يجب ألا تقل عن ${PASSWORD_MIN_LENGTH} أحرف.`)
  .max(PASSWORD_MAX_LENGTH, 'كلمة المرور طويلة جدًا.')
  .regex(/[a-z]/, 'يجب أن تحتوي كلمة المرور على حرف إنجليزي صغير.')
  .regex(/[A-Z]/, 'يجب أن تحتوي كلمة المرور على حرف إنجليزي كبير.')
  .regex(/\d/, 'يجب أن تحتوي كلمة المرور على رقم.');

export const fullNameSchema = z
  .string()
  .trim()
  .min(3, 'الاسم قصير جدًا.')
  .max(120, 'الاسم طويل جدًا.');

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    fullName: fullNameSchema,
    studentCode: z.string().trim().max(30).optional(),
    phone: z
      .string()
      .trim()
      .regex(/^01\d{9}$/, 'رقم الهاتف يجب أن يكون 11 رقمًا ويبدأ بـ 01.')
      .optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'كلمتا المرور غير متطابقتين.',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'كلمة المرور مطلوبة.'),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'كلمتا المرور غير متطابقتين.',
    path: ['confirmPassword'],
  });

export const refreshTokenSchema = z.object({ refreshToken: z.string().min(1) });

/** Shape returned by login and refresh. */
export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int(),
});

export const currentUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  studentCode: z.string().nullable(),
  phone: z.string().nullable(),
  role: roleSchema,
  createdAt: z.string(),
});

/** JWT payload. `sub` is the user id, per RFC 7519. */
export const accessTokenPayloadSchema = z.object({
  sub: z.string(),
  email: z.string(),
  role: roleSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type AuthTokens = z.infer<typeof authTokensSchema>;
export type CurrentUser = z.infer<typeof currentUserSchema>;
export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;
