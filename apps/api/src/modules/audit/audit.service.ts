import { Injectable, Logger } from '@nestjs/common';
import type { AuditLogEntry, ListAuditQuery, Paginated } from '@arduino-lab/contracts';
import { AuditAction, Prisma } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';
import { toDateOnly } from '../../common/utils/dates';
import { paginate, toPrismaPagination } from '../../common/utils/pagination';

export interface AuditEntry {
  actorId: string | null;
  action: AuditAction;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
}

/**
 * Append-only trail of administrative mutations.
 *
 * Recording must never fail the operation it describes: if the audit insert
 * throws, the change the admin made still stands and the failure is logged.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: entry.actorId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          before: toJson(entry.before),
          after: toJson(entry.after),
          ipAddress: entry.ipAddress,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record audit entry for ${entry.entity}:${entry.entityId}`, error);
    }
  }

  async list(query: ListAuditQuery): Promise<Paginated<AuditLogEntry>> {
    const createdAt: Prisma.DateTimeFilter = {};
    if (query.from) createdAt.gte = toDateOnly(query.from);
    // `to` is inclusive of the whole day, so the bound is the following midnight.
    if (query.to) createdAt.lt = new Date(toDateOnly(query.to).getTime() + 86_400_000);

    const where: Prisma.AuditLogWhereInput = {
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        ...toPrismaPagination(query),
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, fullName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginate(
      rows.map((row) => ({
        id: row.id,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        actor: row.actor,
        before: row.before,
        after: row.after,
        ipAddress: row.ipAddress,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      query,
    );
  }
}

function toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined || value === null) {
    return Prisma.JsonNull;
  }
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
