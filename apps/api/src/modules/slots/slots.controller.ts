import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createSlotSchema,
  cuidSchema,
  slotAvailabilityQuerySchema,
  updateSlotSchema,
  type CreateSlotInput,
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

  @Post()
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a lab period' })
  create(
    @CurrentUser() actor: RequestUser,
    @Body(zodBody(createSlotSchema)) input: CreateSlotInput,
  ) {
    return this.slots.create(actor.id, input);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rename a period or change its times, capacity or open state' })
  update(
    @CurrentUser() actor: RequestUser,
    @Param('id', new ZodValidationPipe(cuidSchema)) id: string,
    @Body(zodBody(updateSlotSchema)) input: UpdateSlotInput,
  ) {
    return this.slots.update(actor.id, id, input);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a period that has no bookings' })
  remove(
    @CurrentUser() actor: RequestUser,
    @Param('id', new ZodValidationPipe(cuidSchema)) id: string,
  ) {
    return this.slots.remove(actor.id, id);
  }
}
