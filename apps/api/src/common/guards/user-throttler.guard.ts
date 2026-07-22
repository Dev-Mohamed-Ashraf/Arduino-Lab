import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import type { AuthenticatedRequest } from '../decorators/current-user.decorator';

/**
 * Rate limits per user, falling back to IP for anonymous traffic.
 *
 * The stock ThrottlerGuard keys on IP alone, which is wrong here: the whole lab
 * sits behind one NAT address, so the first ten bookings of the day would lock
 * out every remaining student. Registered after JwtAuthGuard so `request.user`
 * is already resolved.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(request: AuthenticatedRequest): Promise<string> {
    return Promise.resolve(request.user?.id ?? request.ip ?? 'unknown');
  }
}
