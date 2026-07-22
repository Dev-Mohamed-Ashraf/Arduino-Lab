import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Bookings hold an interactive transaction while they queue behind a slot lock,
 * and each one occupies a pooled connection for its whole duration. The Prisma
 * default (cpus × 2 + 1) is a single-digit number on Render's shared instances,
 * which would starve a burst of concurrent bookings before the lock ever became
 * the bottleneck.
 */
const CONNECTION_LIMIT = 20;
const POOL_TIMEOUT_SECONDS = 30;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ datasources: { db: { url: withPoolSettings(process.env.DATABASE_URL ?? '') } } });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Lightweight round trip used by the health endpoint. */
  async isReachable(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return false;
    }
  }
}

/** Appends pool sizing to the datasource URL without overriding explicit values. */
function withPoolSettings(rawUrl: string): string {
  if (!rawUrl) return rawUrl;

  const url = new URL(rawUrl);
  if (!url.searchParams.has('connection_limit')) {
    url.searchParams.set('connection_limit', String(CONNECTION_LIMIT));
  }
  if (!url.searchParams.has('pool_timeout')) {
    url.searchParams.set('pool_timeout', String(POOL_TIMEOUT_SECONDS));
  }
  return url.toString();
}
