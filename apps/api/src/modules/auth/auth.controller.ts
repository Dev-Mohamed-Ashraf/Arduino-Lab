import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  type AuthTokens,
  type CurrentUser,
  type ForgotPasswordInput,
  type LoginInput,
  type RefreshTokenInput,
  type RegisterInput,
  type ResetPasswordInput,
} from '@arduino-lab/contracts';

import { CurrentUser as User, type RequestUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { zodBody } from '../../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import type { RequestContext } from './token.service';
import type { Request } from 'express';

/** Credential endpoints are the prime brute-force target, so they throttle hard. */
const STRICT_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @Throttle(STRICT_THROTTLE)
  @ApiOperation({ summary: 'Create an account and sign in immediately' })
  register(
    @Body(zodBody(registerSchema)) input: RegisterInput,
    @Req() request: Request,
  ): Promise<AuthTokens> {
    return this.auth.register(input, requestContext(request));
  }

  @Public()
  @Post('login')
  @Throttle(STRICT_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange credentials for an access/refresh pair' })
  login(@Body(zodBody(loginSchema)) input: LoginInput, @Req() request: Request): Promise<AuthTokens> {
    return this.auth.login(input, requestContext(request));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a refresh token' })
  refresh(
    @Body(zodBody(refreshTokenSchema)) input: RefreshTokenInput,
    @Req() request: Request,
  ): Promise<AuthTokens> {
    return this.auth.refresh(input.refreshToken, requestContext(request));
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  logout(@Body(zodBody(refreshTokenSchema)) input: RefreshTokenInput): Promise<void> {
    return this.auth.logout(input.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @Throttle(STRICT_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a password reset link' })
  forgotPassword(@Body(zodBody(forgotPasswordSchema)) input: ForgotPasswordInput) {
    return this.auth.forgotPassword(input.email);
  }

  @Public()
  @Post('reset-password')
  @Throttle(STRICT_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a new password using a reset token' })
  resetPassword(@Body(zodBody(resetPasswordSchema)) input: ResetPasswordInput) {
    return this.auth.resetPassword(input);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profile of the authenticated user' })
  me(@User() user: RequestUser): Promise<CurrentUser> {
    return this.auth.getCurrentUser(user.id);
  }
}

function requestContext(request: Request): RequestContext {
  return {
    userAgent: request.headers['user-agent'],
    ipAddress: request.ip,
  };
}
