import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { PrismaModule } from './common/prisma/prisma.module';
import { AppConfigModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MailModule } from './modules/mail/mail.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    MailModule,
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    AuthModule,
    UsersModule,
    HealthModule,
  ],
  providers: [
    // Order matters: throttling runs first, then authentication. Route-level
    // RolesGuard is applied per controller so anonymous routes stay cheap.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
