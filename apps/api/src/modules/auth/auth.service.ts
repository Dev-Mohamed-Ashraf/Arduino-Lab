import { Injectable, Logger } from '@nestjs/common';
import {
  ERROR_CODES,
  type AuthTokens,
  type CurrentUser,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
} from '@arduino-lab/contracts';
import { Role } from '@prisma/client';

import { AppConfigService } from '../../config/app-config.service';
import {
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PasswordService } from './password.service';
import { hashToken, TokenService, type RequestContext } from './token.service';

/** Returned by endpoints that must not reveal whether an address exists. */
const NEUTRAL_RESPONSE = {
  message: 'إذا كان البريد الإلكتروني مسجّلًا لدينا، فستصلك رسالة خلال دقائق.',
} as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    private readonly config: AppConfigService,
  ) {}

  async register(input: RegisterInput): Promise<{ message: string }> {
    this.assertAllowedDomain(input.email);

    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, emailVerifiedAt: true, fullName: true },
    });

    // Same response either way — a different message would let an attacker
    // enumerate which university addresses have accounts.
    if (existing) {
      if (!existing.emailVerifiedAt) {
        await this.dispatchVerification(existing.id, input.email, existing.fullName);
      }
      return NEUTRAL_RESPONSE;
    }

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: await this.passwords.hash(input.password),
        fullName: input.fullName,
        studentCode: input.studentCode || null,
        phone: input.phone || null,
        role: Role.STUDENT,
      },
      select: { id: true, email: true, fullName: true },
    });

    await this.dispatchVerification(user.id, user.email, user.fullName);
    return NEUTRAL_RESPONSE;
  }

  async verifyEmail(rawToken: string): Promise<{ message: string }> {
    const token = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { user: { select: { id: true, emailVerifiedAt: true } } },
    });

    if (!token) throw new BadRequestError(ERROR_CODES.INVALID_TOKEN);
    if (token.usedAt) throw new BadRequestError(ERROR_CODES.TOKEN_ALREADY_USED);
    if (token.expiresAt < new Date()) throw new BadRequestError(ERROR_CODES.TOKEN_EXPIRED);

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: token.userId },
        data: { emailVerifiedAt: token.user.emailVerifiedAt ?? new Date() },
      }),
    ]);

    return { message: 'تم تأكيد بريدك الإلكتروني. يمكنك تسجيل الدخول الآن.' };
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, fullName: true, emailVerifiedAt: true },
    });

    if (user && !user.emailVerifiedAt) {
      await this.dispatchVerification(user.id, user.email, user.fullName);
    }

    return NEUTRAL_RESPONSE;
  }

  async login(input: LoginInput, context: RequestContext): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        email: true,
        role: true,
        passwordHash: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    // Hash a throwaway value when the user is missing so the response time does
    // not reveal whether the address exists.
    const passwordMatches = user
      ? await this.passwords.verify(user.passwordHash, input.password)
      : await this.passwords.verify(DUMMY_HASH, input.password);

    if (!user || !passwordMatches) {
      throw new UnauthorizedError(ERROR_CODES.INVALID_CREDENTIALS);
    }

    if (!user.isActive) throw new ForbiddenError(ERROR_CODES.ACCOUNT_DISABLED);
    if (!user.emailVerifiedAt) throw new ForbiddenError(ERROR_CODES.EMAIL_NOT_VERIFIED);

    return this.tokens.issueTokens(user, context);
  }

  refresh(refreshToken: string, context: RequestContext): Promise<AuthTokens> {
    return this.tokens.rotate(refreshToken, context);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revoke(refreshToken);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, fullName: true, isActive: true },
    });

    if (user?.isActive) {
      const token = await this.tokens.createPasswordResetToken(user.id);
      await this.mail.sendPasswordReset(user.email, user.fullName, token);
    }

    return NEUTRAL_RESPONSE;
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(input.token) },
    });

    if (!token) throw new BadRequestError(ERROR_CODES.INVALID_TOKEN);
    if (token.usedAt) throw new BadRequestError(ERROR_CODES.TOKEN_ALREADY_USED);
    if (token.expiresAt < new Date()) throw new BadRequestError(ERROR_CODES.TOKEN_EXPIRED);

    const passwordHash = await this.passwords.hash(input.password);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({ where: { id: token.userId }, data: { passwordHash } }),
    ]);

    // A password change invalidates every existing session.
    await this.tokens.revokeAllForUser(token.userId);

    return { message: 'تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن.' };
  }

  async getCurrentUser(userId: string): Promise<CurrentUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        studentCode: true,
        phone: true,
        role: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });

    return {
      ...user,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private assertAllowedDomain(email: string): void {
    const domain = email.split('@')[1]?.toLowerCase();
    const allowed = this.config.allowedEmailDomains;

    if (!domain || !allowed.includes(domain)) {
      throw new BadRequestError(ERROR_CODES.EMAIL_DOMAIN_NOT_ALLOWED, {
        email: [`النطاقات المسموح بها: ${allowed.join('، ')}`],
      });
    }
  }

  private async dispatchVerification(userId: string, email: string, fullName: string): Promise<void> {
    const token = await this.tokens.createEmailVerificationToken(userId);
    await this.mail.sendVerifyEmail(email, fullName, token);
    this.logger.log(`Verification email dispatched for ${email}`);
  }
}

/** A real argon2id digest of a random string, used only to equalise timing. */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA$5s7Zp0KQ0mUJ4t7bF8xUj5V2Z1oQ9wXqK3lN6hR4tYc';
