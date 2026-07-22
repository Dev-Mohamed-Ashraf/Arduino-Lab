import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { dashboardQuerySchema, type DashboardQuery } from '@arduino-lab/contracts';

import { Public } from '../../common/decorators/public.decorator';
import { zodQuery } from '../../common/pipes/zod-validation.pipe';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Slot occupancy and component stock for one day' })
  get(@Query(zodQuery(dashboardQuerySchema)) query: DashboardQuery) {
    return this.dashboard.get(query.date);
  }
}
