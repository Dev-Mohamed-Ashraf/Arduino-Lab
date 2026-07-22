import { Injectable } from '@nestjs/common';
import type { Dashboard } from '@arduino-lab/contracts';

import { todayInLabTimeZone } from '../../common/utils/dates';
import { ComponentsService } from '../components/components.service';
import { SlotsService } from '../slots/slots.service';

/**
 * Everything the public home page renders, in one round trip.
 *
 * It is the most-requested screen in the system and Render's free tier pays for
 * every cold connection, so three separate calls are collapsed into one.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly slots: SlotsService,
    private readonly components: ComponentsService,
  ) {}

  async get(date?: string): Promise<Dashboard> {
    const day = date ?? todayInLabTimeZone();

    const [slots, components] = await Promise.all([
      this.slots.availability(day),
      this.components.findAll(),
    ]);

    return {
      date: day,
      slots,
      components,
      summary: {
        totalBookingsToday: slots.reduce((sum, slot) => sum + slot.booked, 0),
        totalCapacityToday: slots.reduce((sum, slot) => sum + slot.capacity, 0),
        totalRemainingSeats: slots.reduce(
          (sum, slot) => sum + (slot.isOpen ? slot.remaining : 0),
          0,
        ),
        componentsCount: components.length,
        lowStockCount: components.filter((component) => component.status === 'low').length,
        outOfStockCount: components.filter((component) => component.status === 'out').length,
      },
    };
  }
}
