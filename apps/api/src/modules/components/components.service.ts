import { Injectable } from '@nestjs/common';
import {
  ERROR_CODES,
  type Component,
  type CreateComponentInput,
  type ListComponentsQuery,
  type Paginated,
  type UpdateComponentInput,
} from '@arduino-lab/contracts';
import { AuditAction, Prisma } from '@prisma/client';

import { ConflictError, NotFoundError } from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toDateOnly, todayInLabTimeZone } from '../../common/utils/dates';
import { paginate, toPrismaPagination } from '../../common/utils/pagination';
import { AuditService } from '../audit/audit.service';
import { readComponentUsage } from './availability.query';
import { toComponentDto } from './component.mapper';

@Injectable()
export class ComponentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListComponentsQuery): Promise<Paginated<Component>> {
    const where: Prisma.ComponentWhereInput = {
      ...(query.includeInactive ? {} : { isActive: true }),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.component.findMany({
        where,
        ...toPrismaPagination(query),
        orderBy: { name: 'asc' },
      }),
      this.prisma.component.count({ where }),
    ]);

    // With a session in the query, availability is what is free in that period;
    // without one it is the lab's full holding. See plans/13-per-slot-stock.md.
    const usedById = await this.readSessionUsage(
      rows.map((row) => row.id),
      query,
    );
    const items = rows.map((row) => toComponentDto(row, usedById.get(row.id) ?? 0));

    // Stock status is a derived value, so it cannot be filtered in SQL without
    // duplicating the threshold rule in two places.
    const filtered = query.status ? items.filter((item) => item.status === query.status) : items;

    return paginate(filtered, query.status ? filtered.length : total, query);
  }

  async findAll(): Promise<Component[]> {
    const rows = await this.prisma.component.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => toComponentDto(row));
  }

  async findOne(id: string): Promise<Component> {
    const row = await this.prisma.component.findUnique({ where: { id } });
    if (!row) throw new NotFoundError(ERROR_CODES.COMPONENT_NOT_FOUND);
    return toComponentDto(row);
  }

  /**
   * The largest amount any single upcoming session already promised.
   *
   * Stock is per session, so what matters is not the sum across all future
   * bookings but the busiest one — that is the number the lab must be able to
   * hand out on the day. See plans/13-per-slot-stock.md.
   */
  private async countUpcomingDemand(componentId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ peak: bigint | null }[]>`
      SELECT MAX(session_total) AS peak
      FROM (
        SELECT SUM(bc.quantity) AS session_total
        FROM "BookingComponent" AS bc
        JOIN "Booking" AS b ON b.id = bc."bookingId"
        WHERE bc."componentId" = ${componentId}
          AND b.status = 'CONFIRMED'::"BookingStatus"
          AND b."bookingDate" >= ${toDateOnly(todayInLabTimeZone())}
        GROUP BY b."bookingDate", b."timeSlotId"
      ) AS sessions
    `;

    return Number(rows[0]?.peak ?? 0);
  }

  private async assertNotBelowUpcomingDemand(componentId: string, total: number): Promise<void> {
    const peak = await this.countUpcomingDemand(componentId);

    if (total < peak) {
      throw new ConflictError(ERROR_CODES.TOTAL_BELOW_RESERVED, {
        totalQuantity: [`أكبر عدد مطلوب في فترة قادمة واحدة هو ${peak}.`],
      });
    }
  }

  /** Empty unless the caller named both a date and a period. */
  private async readSessionUsage(
    componentIds: string[],
    query: ListComponentsQuery,
  ): Promise<Map<string, number>> {
    if (!query.date || !query.timeSlotId || componentIds.length === 0) {
      return new Map();
    }

    const usage = await readComponentUsage(this.prisma, componentIds, {
      bookingDate: toDateOnly(query.date),
      timeSlotId: query.timeSlotId,
    });

    return new Map(usage.map((row) => [row.id, row.usedQuantity]));
  }

  async create(actorId: string, input: CreateComponentInput): Promise<Component> {
    const existing = await this.prisma.component.findUnique({ where: { name: input.name } });
    if (existing) throw new ConflictError(ERROR_CODES.COMPONENT_NAME_TAKEN);

    const row = await this.prisma.component.create({
      data: {
        name: input.name,
        sku: input.sku || null,
        description: input.description || null,
        imageUrl: input.imageUrl || null,
        totalQuantity: input.totalQuantity,
        maxPerBooking: input.maxPerBooking,
      },
    });

    await this.audit.record({
      actorId,
      action: AuditAction.CREATE,
      entity: 'Component',
      entityId: row.id,
      after: row,
    });

    return toComponentDto(row);
  }

  async update(actorId: string, id: string, input: UpdateComponentInput): Promise<Component> {
    const before = await this.prisma.component.findUnique({ where: { id } });
    if (!before) throw new NotFoundError(ERROR_CODES.COMPONENT_NOT_FOUND);

    // Lowering the holding below what an upcoming session already promised would
    // leave those groups short on the day.
    if (input.totalQuantity !== undefined && input.totalQuantity < before.totalQuantity) {
      await this.assertNotBelowUpcomingDemand(id, input.totalQuantity);
    }

    if (input.name && input.name !== before.name) {
      const clash = await this.prisma.component.findUnique({ where: { name: input.name } });
      if (clash) throw new ConflictError(ERROR_CODES.COMPONENT_NAME_TAKEN);
    }

    const after = await this.prisma.component.update({
      where: { id },
      data: toUpdateData(input),
    });

    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entity: 'Component',
      entityId: id,
      before,
      after,
    });

    return toComponentDto(after);
  }

  /**
   * Removes a component, or deactivates it when history depends on it.
   *
   * Deleting a component that appears on a past booking would erase what a group
   * actually received, so those rows are only ever hidden.
   */
  async remove(actorId: string, id: string): Promise<{ deleted: boolean }> {
    const component = await this.prisma.component.findUnique({
      where: { id },
      include: { _count: { select: { bookingItems: true } } },
    });
    if (!component) throw new NotFoundError(ERROR_CODES.COMPONENT_NOT_FOUND);

    const upcoming = await this.countUpcomingDemand(id);
    if (upcoming > 0) {
      throw new ConflictError(ERROR_CODES.COMPONENT_IN_USE, {
        component: [`مطلوب منه ${upcoming} في حجوزات قادمة.`],
      });
    }

    if (component._count.bookingItems > 0) {
      await this.prisma.component.update({ where: { id }, data: { isActive: false } });
      await this.audit.record({
        actorId,
        action: AuditAction.UPDATE,
        entity: 'Component',
        entityId: id,
        before: component,
        after: { ...component, isActive: false },
      });
      return { deleted: false };
    }

    await this.prisma.component.delete({ where: { id } });
    await this.audit.record({
      actorId,
      action: AuditAction.DELETE,
      entity: 'Component',
      entityId: id,
      before: component,
    });
    return { deleted: true };
  }

  /** Bulk import. Existing names are skipped rather than overwritten. */
  async createMany(
    actorId: string,
    items: CreateComponentInput[],
  ): Promise<{ created: number; skipped: number }> {
    const existing = await this.prisma.component.findMany({
      where: { name: { in: items.map((item) => item.name) } },
      select: { name: true },
    });
    const taken = new Set(existing.map((row) => row.name));
    const fresh = items.filter((item) => !taken.has(item.name));

    if (fresh.length > 0) {
      await this.prisma.component.createMany({
        data: fresh.map((item) => ({
          name: item.name,
          sku: item.sku || null,
          description: item.description || null,
          totalQuantity: item.totalQuantity,
          maxPerBooking: item.maxPerBooking,
        })),
      });

      await this.audit.record({
        actorId,
        action: AuditAction.CREATE,
        entity: 'Component',
        entityId: 'bulk',
        after: { created: fresh.map((item) => item.name) },
      });
    }

    return { created: fresh.length, skipped: items.length - fresh.length };
  }
}

/**
 * Builds a partial update, keeping the distinction between "field omitted" and
 * "field cleared": an empty string from a form means null, not no-change.
 */
function toUpdateData(input: UpdateComponentInput): Prisma.ComponentUpdateInput {
  const data: Prisma.ComponentUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.sku !== undefined) data.sku = input.sku || null;
  if (input.description !== undefined) data.description = input.description || null;
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl || null;
  if (input.totalQuantity !== undefined) data.totalQuantity = input.totalQuantity;
  if (input.maxPerBooking !== undefined) data.maxPerBooking = input.maxPerBooking;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  return data;
}
