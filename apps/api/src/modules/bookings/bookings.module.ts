import { Module } from '@nestjs/common';

import { BookingsAdminService } from './bookings-admin.service';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService, BookingsAdminService],
  exports: [BookingsService],
})
export class BookingsModule {}
