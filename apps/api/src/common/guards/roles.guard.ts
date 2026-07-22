import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@arduino-lab/contracts';

import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequest } from '../decorators/current-user.decorator';
import { ForbiddenError, UnauthorizedError } from '../errors/app.exception';

/** Enforces `@Roles(...)`. Runs after JwtAuthGuard has attached the principal. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!user) throw new UnauthorizedError();
    if (!required.includes(user.role)) throw new ForbiddenError();

    return true;
  }
}
