import 'reflect-metadata';

import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

const API_PREFIX = 'api/v1';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(AppConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: undefined });

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Credentialed requests forbid a wildcard origin, so the two front ends are
  // listed explicitly.
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Images go straight from the browser to Cloudinary, so no request needs to
  // be large; a small cap blunts memory-exhaustion attempts on the free tier.
  app.useBodyParser('json', { limit: '1mb' });

  app.enableShutdownHooks();

  if (!config.isProduction) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Arduino Lab API')
        .setDescription('Reservation and component inventory API')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // Render injects PORT; binding to 0.0.0.0 is required for its health checks.
  await app.listen(config.port, '0.0.0.0');

  logger.log(`API listening on ${config.apiUrl}/${API_PREFIX}`);
  if (!config.isProduction) {
    logger.log(`Swagger UI at ${config.apiUrl}/docs`);
  }
  if (!config.isMailConfigured) {
    logger.warn('RESEND_API_KEY is not set — emails will be logged instead of sent');
  }
  if (!config.isCloudinaryConfigured) {
    logger.warn('Cloudinary is not configured — ID card uploads will fail');
  }
}

void bootstrap();
