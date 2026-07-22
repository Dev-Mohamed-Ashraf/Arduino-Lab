import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  cuidSchema,
  slotAvailabilityQuerySchema,
  updateSlotSchema,
  type SlotAvailabilityQuery,
  type UpdateSlotInput,
} from '@arduino-lab/contracts';

import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { zodBody, zodQuery, ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SlotsService } from './slots.service';

@ApiTags('slots')
@Controller('slots')
@UseGuards(RolesGuard)
export class SlotsController {
  constructor(private readonly slots: SlotsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'The four fixed lab periods' })
  findAll() {
    return this.slots.findAll();
  }

  @Public()
  @Get('availability')
  @ApiOperation({ summary: 'Occupancy of each period on a given day' })
  availability(@Query(zodQuery(slotAvailabilityQuerySchema)) query: SlotAvailabilityQuery) {
    return this.slots.availability(query.date);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change a period capacity or open state' })
  update(
    @CurrentUser() actor: RequestUser,
    @Param('id', new ZodValidationPipe(cuidSchema)) id: string,
    @Body(zodBody(updateSlotSchema)) input: UpdateSlotInput,
  ) {
    return this.slots.update(actor.id, id, input);
  }
}
