import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ERROR_CODES, accessTokenPayloadSchema } from '@arduino-lab/contracts';

import { AppConfigService } from '../../config/app-config.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthenticatedRequest } from '../decorators/current-user.decorator';
import { UnauthorizedError } from '../errors/app.exception';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Applied globally, so every route is authenticated unless marked `@Public()`.
 *
 * The user row is re-read on each request rather than trusted from the token:
 * a disabled account or a role change must take effect immediately, not after
 * the 15-minute access token expires.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedError();
    }

    const user = await this.resolveUser(token, isPublic);
    if (user) {
      request.user = user;
    }

    return true;
  }

  /** Returns the principal, or undefined when the route is public and the token is unusable. */
  private async resolveUser(token: string, isPublic: boolean) {
    try {
      const payload = accessTokenPayloadSchema.parse(
        await this.jwt.verifyAsync(token, { secret: this.config.jwt.accessSecret }),
      );

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, isActive: true },
      });

      if (!user) throw new UnauthorizedError();
      if (!user.isActive) throw new UnauthorizedError(ERROR_CODES.ACCOUNT_DISABLED);

      return { id: user.id, email: user.email, role: user.role };
    } catch (error) {
      // A stale token on a public route just means "treat this as anonymous".
      if (isPublic) return undefined;
      if (error instanceof UnauthorizedError) throw error;
      throw new UnauthorizedError(ERROR_CODES.INVALID_TOKEN);
    }
  }
}

function extractBearerToken(header: string | undefined): string | undefined {
  const [scheme, token] = header?.split(' ') ?? [];
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
}
