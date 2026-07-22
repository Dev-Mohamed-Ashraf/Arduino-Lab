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
import { paginate, toPrismaPagination } from '../../common/utils/pagination';
import { AuditService } from '../audit/audit.service';
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

    const items = rows.map(toComponentDto);

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
    return rows.map(toComponentDto);
  }

  async findOne(id: string): Promise<Component> {
    const row = await this.prisma.component.findUnique({ where: { id } });
    if (!row) throw new NotFoundError(ERROR_CODES.COMPONENT_NOT_FOUND);
    return toComponentDto(row);
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

    // The DB check constraint would also catch this, but a typed 409 gives the
    // admin an actionable Arabic message instead of a generic conflict.
    if (input.totalQuantity !== undefined && input.totalQuantity < before.reservedQuantity) {
      throw new ConflictError(ERROR_CODES.TOTAL_BELOW_RESERVED, {
        totalQuantity: [`الكمية المحجوزة حاليًا ${before.reservedQuantity} قطعة.`],
      });
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

    if (component.reservedQuantity > 0) {
      throw new ConflictError(ERROR_CODES.COMPONENT_IN_USE, {
        component: [`لا يزال ${component.reservedQuantity} منها محجوزًا في حجوزات قائمة.`],
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
  if (input.isActive !== undefined) data.isActive = input.isActive;

  return data;
}
