import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opts an endpoint out of the globally applied JwtAuthGuard.
 *
 * Authentication is on by default; every anonymous route must say so explicitly.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
