import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Module({
  // Secrets are passed per call because access and refresh tokens use different
  // keys. Registered globally so the app-wide JwtAuthGuard can inject JwtService.
  imports: [JwtModule.register({ global: true })],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService],
  exports: [TokenService, PasswordService],
})
export class AuthModule {}
