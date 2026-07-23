import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { parseAllowedEmailDomains, type Env } from './env.schema';

/**
 * Typed accessor over the validated environment.
 *
 * Services depend on this rather than on `ConfigService` directly so that every
 * read is checked at compile time and defaults live in one place.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  get nodeEnv(): Env['NODE_ENV'] {
    return this.get('NODE_ENV');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get port(): number {
    return this.get('PORT');
  }

  get apiUrl(): string {
    return this.get('API_URL');
  }

  get jwt() {
    return {
      accessSecret: this.get('JWT_ACCESS_SECRET'),
      refreshSecret: this.get('JWT_REFRESH_SECRET'),
      accessTtl: this.get('JWT_ACCESS_TTL'),
      refreshTtl: this.get('JWT_REFRESH_TTL'),
    };
  }

  get allowedEmailDomains(): string[] {
    return parseAllowedEmailDomains(this.get('ALLOWED_EMAIL_DOMAINS'));
  }

  get corsOrigins(): string[] {
    // Empty entries (front ends not yet deployed) are dropped so CORS never
    // ends up allowing an empty origin.
    return [this.get('STUDENT_APP_URL'), this.get('ADMIN_APP_URL')].filter(Boolean);
  }

  get studentAppUrl(): string {
    return this.get('STUDENT_APP_URL');
  }

  get cloudinary() {
    return {
      cloudName: this.get('CLOUDINARY_CLOUD_NAME'),
      apiKey: this.get('CLOUDINARY_API_KEY'),
      apiSecret: this.get('CLOUDINARY_API_SECRET'),
      folder: this.get('CLOUDINARY_UPLOAD_FOLDER'),
    };
  }

  get isCloudinaryConfigured(): boolean {
    const { cloudName, apiKey, apiSecret } = this.cloudinary;
    return Boolean(cloudName && apiKey && apiSecret);
  }

  get mail() {
    return {
      apiKey: this.get('RESEND_API_KEY'),
      from: this.get('MAIL_FROM'),
    };
  }

  get isMailConfigured(): boolean {
    return Boolean(this.mail.apiKey);
  }
}
