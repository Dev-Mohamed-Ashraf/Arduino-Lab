import { ERROR_CODES, type ComponentRequest } from '@arduino-lab/contracts';
import type { Prisma } from '@prisma/client';

import { ConflictError } from '../../common/errors/app.exception';
import { readComponentUsage, type SessionScope } from '../components/availability.query';

/** The subset of PrismaClient available inside an interactive transaction. */
export type TransactionClient = Prisma.TransactionClient;

/**
 * Rejects a component selection the lab cannot actually hand out.
 *
 * Stock is per session: parts go back on the shelf when a period ends, so a
 * booking only ever competes with other bookings in the *same period on the same
 * day*. Nothing is decremented — availability is derived from the bookings
 * themselves, so cancelling or editing a booking frees its parts with no
 * bookkeeping and no counter that can drift.
 *
 * Race-free without a conditional UPDATE because every caller runs inside a
 * transaction already holding the slot's `FOR UPDATE` lock, which serialises all
 * bookings for that period. See plans/13-per-slot-stock.md.
 */
export async function assertComponentsAvailable(
  tx: TransactionClient,
  requests: ComponentRequest[],
  scope: SessionScope,
): Promise<void> {
  if (requests.length === 0) return;

  const usage = await readComponentUsage(
    tx,
    requests.map((request) => request.componentId),
    scope,
  );
  const byId = new Map(usage.map((row) => [row.id, row]));

  for (const request of requests) {
    const component = byId.get(request.componentId);

    if (!component) {
      throw new ConflictError(ERROR_CODES.COMPONENT_NOT_FOUND);
    }

    if (!component.isActive) {
      throw new ConflictError(ERROR_CODES.COMPONENT_INACTIVE, {
        components: [`المكوّن "${component.name}" غير متاح حاليًا.`],
      });
    }

    if (request.quantity > component.maxPerBooking) {
      throw new ConflictError(ERROR_CODES.COMPONENT_EXCEEDS_LIMIT, {
        components: [
          `الحد الأقصى من "${component.name}" هو ${component.maxPerBooking} لكل مجموعة.`,
        ],
      });
    }

    const free = component.totalQuantity - component.usedQuantity;
    if (request.quantity > free) {
      throw new ConflictError(ERROR_CODES.COMPONENT_OUT_OF_STOCK, {
        components: [
          `المتاح من "${component.name}" في هذه الفترة هو ${free} فقط، وطلبت ${request.quantity}.`,
        ],
      });
    }
  }
}
