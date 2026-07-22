import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';

import { PrismaService } from '../../common/prisma/prisma.service';

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
}

function toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === undefined || value === null) {
    return Prisma.JsonNull;
  }
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
