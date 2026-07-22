import path from 'node:path';

import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import { AppConfigService } from './app-config.service';
import { validateEnv } from './env.schema';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      // The monorepo keeps one .env at the root; an app-local file may override it.
      envFilePath: [path.resolve(process.cwd(), '.env'), path.resolve(process.cwd(), '../../.env')],
      validate: validateEnv,
      cache: true,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
