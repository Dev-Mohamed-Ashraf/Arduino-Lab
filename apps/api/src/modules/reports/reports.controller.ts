import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  dateRangeQuerySchema,
  exportQuerySchema,
  slotAvailabilityQuerySchema,
  type DateRangeQuery,
  type ExportQuery,
  type SlotAvailabilityQuery,
} from '@arduino-lab/contracts';
import type { Response } from 'express';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { zodQuery } from '../../common/pipes/zod-validation.pipe';
import { attachmentHeader } from './csv';
import { ReportExportService } from './report-export.service';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(RolesGuard)
@Roles('ADMIN', 'TEACHING_TEAM')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly exports: ReportExportService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Headline numbers for the admin home page' })
  overview(@Query(zodQuery(slotAvailabilityQuerySchema)) query: SlotAvailabilityQuery) {
    return this.reports.overview(query.date);
  }

  @Get('components-usage')
  @ApiOperation({ summary: 'How often each component was requested' })
  componentsUsage(@Query(zodQuery(dateRangeQuerySchema)) query: DateRangeQuery) {
    return this.reports.componentsUsage(query);
  }

  @Get('stock')
  @ApiOperation({ summary: 'Current inventory, scarcest first' })
  stock() {
    return this.reports.stock();
  }

  @Get('slot-utilization')
  @ApiOperation({ summary: 'Occupancy rate of each period over a range' })
  slotUtilisation(@Query(zodQuery(dateRangeQuerySchema)) query: DateRangeQuery) {
    return this.reports.slotUtilisation(query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Download a report as CSV' })
  async exportCsv(
    @Query(zodQuery(exportQuerySchema)) query: ExportQuery,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.exports.export(query);

    response
      .status(200)
      .setHeader('Content-Type', 'text/csv; charset=utf-8')
      .setHeader('Content-Disposition', attachmentHeader(file.filename))
      .send(file.content);
  }
}
