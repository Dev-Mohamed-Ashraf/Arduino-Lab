import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Liveness probe.
 *
 * UptimeRobot pings this every five minutes to keep Render's free instance from
 * sleeping, so it must stay anonymous, cheap, and exempt from rate limiting.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @SkipThrottle()
  @Get()
  @ApiOperation({ summary: 'Service and database health' })
  async check() {
    const databaseUp = await this.prisma.isReachable();

    return {
      status: databaseUp ? 'ok' : 'degraded',
      database: databaseUp ? 'up' : 'down',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
