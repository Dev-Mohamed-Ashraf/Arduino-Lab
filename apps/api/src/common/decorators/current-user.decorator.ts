import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Role } from '@arduino-lab/contracts';
import type { Request } from 'express';

/** The authenticated principal attached to the request by JwtAuthGuard. */
export interface RequestUser {
  id: string;
  email: string;
  role: Role;
}

export type AuthenticatedRequest = Request & { user?: RequestUser };

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestUser | undefined =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
