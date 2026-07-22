import { ERROR_CODES, type ComponentRequest } from '@arduino-lab/contracts';
import { Prisma } from '@prisma/client';

import { ConflictError } from '../../common/errors/app.exception';

/** The subset of PrismaClient available inside an interactive transaction. */
export type TransactionClient = Prisma.TransactionClient;

/**
 * Reserves stock for a set of components.
 *
 * Two properties matter here and both are bought with SQL rather than
 * application logic:
 *
 * 1. **Atomicity.** Availability is checked and decremented in the same UPDATE.
 *    A SELECT followed by an UPDATE would leave a window in which another
 *    booking takes the last unit; PostgreSQL instead re-evaluates the WHERE
 *    clause against the freshly committed row when two transactions contend.
 *
 * 2. **No deadlocks.** Every requested row is locked up front in id order, so
 *    two bookings that share components can never grab them in opposite orders.
 *
 * Both steps are single statements: the database sits behind a network hop and
 * the enclosing transaction holds a slot lock, so every avoided round trip is
 * time no other booking spends queued.
 */
export async function reserveComponents(
  tx: TransactionClient,
  requests: ComponentRequest[],
): Promise<void> {
  if (requests.length === 0) return;

  const ids = requests.map((request) => request.componentId).sort();
  await tx.$queryRaw`SELECT id FROM "Component" WHERE id = ANY(${ids}) ORDER BY id FOR UPDATE`;

  const claimed = await tx.$queryRaw<{ id: string }[]>`
    UPDATE "Component" AS c
    SET "reservedQuantity" = c."reservedQuantity" + r.qty
    FROM (
      SELECT * FROM UNNEST(
        ${requests.map((request) => request.componentId)}::text[],
        ${requests.map((request) => request.quantity)}::int[]
      ) AS t(id, qty)
    ) AS r
    WHERE c.id = r.id
      AND c."isActive" = true
      AND (c."totalQuantity" - c."reservedQuantity") >= r.qty
    RETURNING c.id
  `;

  if (claimed.length !== requests.length) {
    const claimedIds = new Set(claimed.map((row) => row.id));
    const missing = requests.find((request) => !claimedIds.has(request.componentId));

    // A short claim always has an unclaimed request behind it; the fallback only
    // satisfies the type checker.
    throw await outOfStockError(tx, missing ?? { componentId: ids[0] ?? '', quantity: 0 });
  }
}

/** Returns stock to the pool, e.g. when a booking is cancelled or edited down. */
export async function releaseComponents(
  tx: TransactionClient,
  requests: ComponentRequest[],
): Promise<void> {
  if (requests.length === 0) return;

  await tx.$executeRaw`
    UPDATE "Component" AS c
    SET "reservedQuantity" = GREATEST(0, c."reservedQuantity" - r.qty)
    FROM (
      SELECT * FROM UNNEST(
        ${requests.map((request) => request.componentId)}::text[],
        ${requests.map((request) => request.quantity)}::int[]
      ) AS t(id, qty)
    ) AS r
    WHERE c.id = r.id
  `;
}

/**
 * Applies the difference between two component selections.
 *
 * Releases run before reservations so that freeing units of a component makes
 * them immediately available to the same edit.
 */
export async function applyComponentDelta(
  tx: TransactionClient,
  previous: ComponentRequest[],
  next: ComponentRequest[],
): Promise<void> {
  const previousById = new Map(previous.map((item) => [item.componentId, item.quantity]));
  const nextById = new Map(next.map((item) => [item.componentId, item.quantity]));

  const toRelease: ComponentRequest[] = [];
  const toReserve: ComponentRequest[] = [];

  for (const [componentId, before] of previousById) {
    const after = nextById.get(componentId) ?? 0;
    if (after < before) {
      toRelease.push({ componentId, quantity: before - after });
    }
  }

  for (const [componentId, after] of nextById) {
    const before = previousById.get(componentId) ?? 0;
    if (after > before) {
      toReserve.push({ componentId, quantity: after - before });
    }
  }

  await releaseComponents(tx, toRelease);
  await reserveComponents(tx, toReserve);
}

/** Distinguishes "no such component" from "not enough of it" for the error message. */
async function outOfStockError(
  tx: TransactionClient,
  request: ComponentRequest,
): Promise<ConflictError> {
  const component = await tx.component.findUnique({
    where: { id: request.componentId },
    select: { name: true, isActive: true, totalQuantity: true, reservedQuantity: true },
  });

  if (!component) {
    return new ConflictError(ERROR_CODES.COMPONENT_NOT_FOUND);
  }

  if (!component.isActive) {
    return new ConflictError(ERROR_CODES.COMPONENT_INACTIVE, {
      components: [`المكوّن "${component.name}" غير متاح حاليًا.`],
    });
  }

  const available = component.totalQuantity - component.reservedQuantity;
  return new ConflictError(ERROR_CODES.COMPONENT_OUT_OF_STOCK, {
    components: [`المتاح من "${component.name}" هو ${available} فقط، وطلبت ${request.quantity}.`],
  });
}
