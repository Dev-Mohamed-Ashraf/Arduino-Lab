import { createHash, randomBytes } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ERROR_CODES, type AuthTokens, type Role } from '@arduino-lab/contracts';

import { AppConfigService } from '../../config/app-config.service';
import { UnauthorizedError } from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';

const REFRESH_TOKEN_BYTES = 48;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export interface TokenSubject {
  id: string;
  email: string;
  role: Role;
}

/**
 * Issues and rotates credentials.
 *
 * Refresh tokens are opaque random strings, not JWTs, and only their SHA-256
 * hash is stored. Every refresh revokes the presented token and issues a new
 * one; presenting an already-revoked token means it leaked, so the whole family
 * of that user's tokens is revoked.
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async issueTokens(user: TokenSubject, context: RequestContext = {}): Promise<AuthTokens> {
    // `expiresIn` is passed in seconds rather than as "15m": jsonwebtoken types
    // the string form as a narrow template literal that a plain env string
    // cannot satisfy.
    const accessTtlSeconds = Math.floor(parseDuration(this.config.jwt.accessTtl) / 1000);

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      { secret: this.config.jwt.accessSecret, expiresIn: accessTtlSeconds },
    );

    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + parseDuration(this.config.jwt.refreshTtl)),
        userAgent: context.userAgent?.slice(0, 255),
        ipAddress: context.ipAddress,
      },
    });

    return { accessToken, refreshToken, expiresIn: accessTtlSeconds };
  }

  /** Validates a refresh token, revokes it, and issues a fresh pair. */
  async rotate(refreshToken: string, context: RequestContext = {}): Promise<AuthTokens> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: { select: { id: true, email: true, role: true, isActive: true } } },
    });

    if (!stored) {
      throw new UnauthorizedError(ERROR_CODES.INVALID_TOKEN);
    }

    if (stored.revokedAt) {
      // Reuse of a revoked token: assume theft and drop every session.
      this.logger.warn(`Refresh token reuse detected for user ${stored.userId}`);
      await this.revokeAllForUser(stored.userId);
      throw new UnauthorizedError(ERROR_CODES.INVALID_TOKEN);
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedError(ERROR_CODES.TOKEN_EXPIRED);
    }

    if (!stored.user.isActive) {
      throw new UnauthorizedError(ERROR_CODES.ACCOUNT_DISABLED);
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.user, context);
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Creates a single-use email verification token and returns the raw value. */
  async createEmailVerificationToken(userId: string): Promise<string> {
    const raw = randomBytes(32).toString('base64url');
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
      },
    });
    return raw;
  }

  async createPasswordResetToken(userId: string): Promise<string> {
    const raw = randomBytes(32).toString('base64url');
    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });
    return raw;
  }
}

export interface RequestContext {
  userAgent?: string;
  ipAddress?: string;
}

/** Tokens are stored hashed so a database leak cannot be replayed. */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

const DURATION_UNITS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parses "15m" / "7d" into milliseconds. */
export function parseDuration(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match?.[1] || !match[2]) {
    throw new Error(`Invalid duration "${value}". Expected a form like "15m" or "7d".`);
  }
  const unit = DURATION_UNITS[match[2]];
  if (!unit) {
    throw new Error(`Unsupported duration unit "${match[2]}".`);
  }
  return Number(match[1]) * unit;
}
