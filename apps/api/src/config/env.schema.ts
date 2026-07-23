import { z } from 'zod';

/**
 * Environment contract.
 *
 * Validated at boot: a missing or malformed variable stops the process with a
 * readable message rather than surfacing as a runtime error hours later.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_URL: z.string().url().default('http://localhost:4000'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  /** Comma-separated list; students may only register with one of these domains. */
  ALLOWED_EMAIL_DOMAINS: z.string().min(1),

  // Optional so the API can boot before the front ends exist — they are hosted
  // separately and cannot be deployed until this service has a URL to point at.
  // Until each is set, its origin is simply absent from the CORS allow-list.
  STUDENT_APP_URL: z.string().url().or(z.literal('')).default(''),
  ADMIN_APP_URL: z.string().url().or(z.literal('')).default(''),

  // Optional until the accounts are provisioned; the owning module degrades
  // gracefully and logs instead of failing the request.
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('arduino-lab/id-cards'),

  RESEND_API_KEY: z.string().default(''),
  MAIL_FROM: z.string().default('Arduino Lab <onboarding@resend.dev>'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return result.data;
}

/** Parsed, trimmed, lower-cased list of domains students may register with. */
export function parseAllowedEmailDomains(value: string): string[] {
  return value
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
}
