import { SetMetadata } from '@nestjs/common';
import type { Role } from '@arduino-lab/contracts';

export const ROLES_KEY = 'roles';

/** Restricts an endpoint to the listed roles. Enforced by RolesGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
