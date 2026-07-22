import { Module } from '@nestjs/common';

import { ComponentsModule } from '../components/components.module';
import { SlotsModule } from '../slots/slots.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [SlotsModule, ComponentsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
