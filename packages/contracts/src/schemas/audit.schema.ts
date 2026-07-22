import { z } from 'zod';

import { cuidSchema, isoDateSchema, paginationQuerySchema } from './common.schema';

export const AUDIT_ACTIONS = ['CREATE', 'UPDATE', 'DELETE'] as const;
export const auditActionSchema = z.enum(AUDIT_ACTIONS);
export type AuditAction = z.infer<typeof auditActionSchema>;

export const AUDIT_ACTION_LABELS_AR: Record<AuditAction, string> = {
  CREATE: 'إضافة',
  UPDATE: 'تعديل',
  DELETE: 'حذف',
};

/** Entities the trail can reference, for the admin filter dropdown. */
export const AUDIT_ENTITIES = ['Booking', 'Component', 'TimeSlot', 'User'] as const;
export const auditEntitySchema = z.enum(AUDIT_ENTITIES);

export const AUDIT_ENTITY_LABELS_AR: Record<z.infer<typeof auditEntitySchema>, string> = {
  Booking: 'حجز',
  Component: 'مكوّن',
  TimeSlot: 'فترة زمنية',
  User: 'مستخدم',
};

export const auditLogSchema = z.object({
  id: z.string(),
  action: auditActionSchema,
  entity: z.string(),
  entityId: z.string(),
  actor: z
    .object({ id: z.string(), fullName: z.string(), email: z.string() })
    .nullable(),
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.string(),
});

export const listAuditQuerySchema = paginationQuerySchema.extend({
  entity: auditEntitySchema.optional(),
  action: auditActionSchema.optional(),
  actorId: cuidSchema.optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

export type AuditLogEntry = z.infer<typeof auditLogSchema>;
export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;
