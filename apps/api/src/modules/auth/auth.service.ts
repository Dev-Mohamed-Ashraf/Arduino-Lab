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
  ConflictError,
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

  /**
   * Creates an account and signs it in immediately.
   *
   * There is no email confirmation step, so the response has to say plainly
   * whether the address was already taken — otherwise the caller cannot tell
   * why they were not signed in. That makes registration enumerable, which is
   * an accepted trade-off here; login itself still reveals nothing.
   * See plans/12-remove-email-verification.md.
   */
  async register(input: RegisterInput, context: RequestContext): Promise<AuthTokens> {
    this.assertAllowedDomain(input.email);

    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictError(ERROR_CODES.EMAIL_ALREADY_REGISTERED);
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
      select: { id: true, email: true, role: true },
    });

    this.logger.log(`Account created for ${user.email}`);
    return this.tokens.issueTokens(user, context);
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
        createdAt: true,
      },
    });

    return { ...user, createdAt: user.createdAt.toISOString() };
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

}

/** A real argon2id digest of a random string, used only to equalise timing. */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA$5s7Zp0KQ0mUJ4t7bF8xUj5V2Z1oQ9wXqK3lN6hR4tYc';
