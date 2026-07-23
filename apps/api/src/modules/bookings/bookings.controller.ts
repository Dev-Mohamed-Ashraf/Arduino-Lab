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
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createBookingSchema,
  cuidSchema,
  listBookingsQuerySchema,
  moveBookingSchema,
  updateBookingSchema,
  type CreateBookingInput,
  type ListBookingsQuery,
  type MoveBookingInput,
  type UpdateBookingInput,
} from '@arduino-lab/contracts';

import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { zodBody, zodQuery, ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BookingsAdminService } from './bookings-admin.service';
import { BookingsService } from './bookings.service';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
@UseGuards(RolesGuard)
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly admin: BookingsAdminService,
  ) {}

  @Post()
  // Per user, not per IP — see UserThrottlerGuard. Generous enough for a teaching
  // assistant registering a full session of groups back to back.
  @Throttle({ default: { limit: 30, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Reserve a slot and claim components atomically' })
  create(
    @CurrentUser() actor: RequestUser,
    @Body(zodBody(createBookingSchema)) input: CreateBookingInput,
  ) {
    return this.bookings.create(actor, input);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Bookings owned by the caller' })
  findMine(@CurrentUser() actor: RequestUser) {
    return this.bookings.findMine(actor.id);
  }

  @Get()
  @Roles('ADMIN', 'TEACHING_TEAM')
  @ApiOperation({ summary: 'Search and filter all bookings' })
  list(@Query(zodQuery(listBookingsQuerySchema)) query: ListBookingsQuery) {
    return this.bookings.list(query);
  }

  // Declared after the static routes so "mine" is not swallowed by this pattern.
  @Get(':bookingNumber')
  @ApiOperation({ summary: 'Booking detail by receipt number' })
  findOne(@CurrentUser() actor: RequestUser, @Param('bookingNumber') bookingNumber: string) {
    return this.bookings.findByNumber(actor, bookingNumber);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Edit a booking and reconcile stock (admin only)' })
  update(
    @CurrentUser() actor: RequestUser,
    @Param('id', new ZodValidationPipe(cuidSchema)) id: string,
    @Body(zodBody(updateBookingSchema)) input: UpdateBookingInput,
  ) {
    return this.admin.update(actor.id, id, input);
  }

  @Patch(':id/slot')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Move a booking to another period or day (admin only)' })
  move(
    @CurrentUser() actor: RequestUser,
    @Param('id', new ZodValidationPipe(cuidSchema)) id: string,
    @Body(zodBody(moveBookingSchema)) input: MoveBookingInput,
  ) {
    return this.admin.move(actor.id, id, input);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a booking and return its components (admin only)' })
  cancel(
    @CurrentUser() actor: RequestUser,
    @Param('id', new ZodValidationPipe(cuidSchema)) id: string,
  ) {
    return this.admin.cancel(actor.id, id);
  }
}
