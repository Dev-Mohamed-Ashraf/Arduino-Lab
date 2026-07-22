import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { listAuditQuerySchema, type ListAuditQuery } from '@arduino-lab/contracts';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { zodQuery } from '../../common/pipes/zod-validation.pipe';
import { AuditService } from './audit.service';

/** Read-only view of the trail. Entries are written by the services themselves. */
@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Browse the administrative audit trail' })
  list(@Query(zodQuery(listAuditQuerySchema)) query: ListAuditQuery) {
    return this.audit.list(query);
  }
}
