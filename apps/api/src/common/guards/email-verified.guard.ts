import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { ERROR_CODES } from '@arduino-lab/contracts';

import type { AuthenticatedRequest } from '../decorators/current-user.decorator';
import { ForbiddenError, UnauthorizedError } from '../errors/app.exception';

/**
 * Blocks actions that create real lab commitments until the university address
 * is confirmed. Applied per-controller, not globally: reading is fine unverified.
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!user) throw new UnauthorizedError();
    if (!user.isEmailVerified) throw new ForbiddenError(ERROR_CODES.EMAIL_NOT_VERIFIED);

    return true;
  }
}
