'use client';

import {
  AUDIT_ACTION_LABELS_AR,
  AUDIT_ENTITY_LABELS_AR,
  type AuditAction,
  type AuditLogEntry,
} from '@arduino-lab/contracts';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@arduino-lab/ui';
import { formatDateTime } from '@arduino-lab/web';
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import * as React from 'react';

import { RequireStaff } from '@/components/require-staff';
import { api } from '@/lib/api';

const ACTION_VARIANTS: Record<AuditAction, 'success' | 'default' | 'destructive'> = {
  CREATE: 'success',
  UPDATE: 'default',
  DELETE: 'destructive',
};

type EntityFilter = keyof typeof AUDIT_ENTITY_LABELS_AR | 'ALL';

export default function AuditLogPage() {
  return (
    <RequireStaff roles={['ADMIN']}>
      <AuditLogContent />
    </RequireStaff>
  );
}

function AuditLogContent() {
  const [entity, setEntity] = React.useState<EntityFilter>('ALL');
  const [action, setAction] = React.useState<AuditAction | 'ALL'>('ALL');
  const [page, setPage] = React.useState(1);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['audit', entity, action, page],
    queryFn: () =>
      api.audit.list({
        entity: entity === 'ALL' ? undefined : entity,
        action: action === 'ALL' ? undefined : action,
        page,
        pageSize: 25,
      }),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title="سجل التغييرات" description="كل تعديلات الإدارة على النظام." />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Select
          value={entity}
          onValueChange={(value) => {
            setEntity(value as EntityFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-48" aria-label="فلترة بالعنصر">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل العناصر</SelectItem>
            <SelectItem value="Booking">حجز</SelectItem>
            <SelectItem value="Component">مكوّن</SelectItem>
            <SelectItem value="TimeSlot">فترة زمنية</SelectItem>
            <SelectItem value="User">مستخدم</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={action}
          onValueChange={(value) => {
            setAction(value as AuditAction | 'ALL');
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-48" aria-label="فلترة بالإجراء">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل الإجراءات</SelectItem>
            <SelectItem value="CREATE">إضافة</SelectItem>
            <SelectItem value="UPDATE">تعديل</SelectItem>
            <SelectItem value="DELETE">حذف</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <ErrorState description="تعذّر تحميل السجل." onRetry={() => void refetch()} />
      ) : isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<History />}
          title="السجل فارغ"
          description="لم تُسجَّل أي تغييرات بعد."
        />
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((entry) => (
              <li key={entry.id}>
                <AuditRow entry={entry} />
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">
              إجمالي السجلات: <span className="tabular-nums">{data.total}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                السابق
              </Button>
              <span className="text-sm tabular-nums">
                {page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                التالي
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const entityLabel =
    AUDIT_ENTITY_LABELS_AR[entry.entity as keyof typeof AUDIT_ENTITY_LABELS_AR] ?? entry.entity;

  return (
    <Card className="gap-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={ACTION_VARIANTS[entry.action]}>{AUDIT_ACTION_LABELS_AR[entry.action]}</Badge>
        <Badge variant="outline">{entityLabel}</Badge>
        <span className="text-muted-foreground text-xs" dir="ltr">
          {entry.entityId}
        </span>
        <span className="text-muted-foreground ms-auto text-xs">
          {formatDateTime(entry.createdAt)}
        </span>
      </div>

      <p className="text-sm">
        <span className="text-muted-foreground">بواسطة: </span>
        {entry.actor?.fullName ?? 'مستخدم محذوف'}
      </p>

      {entry.before || entry.after ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => setIsExpanded((value) => !value)}
            aria-expanded={isExpanded}
          >
            {isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
          </Button>

          {isExpanded ? (
            <div className="grid gap-3 md:grid-cols-2">
              <JsonBlock title="قبل" value={entry.before} />
              <JsonBlock title="بعد" value={entry.after} />
            </div>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  if (value === null || value === undefined) return null;

  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs font-medium">{title}</p>
      {/* Raw payloads are English keys from the database, so this block reads LTR. */}
      <pre
        dir="ltr"
        className="bg-muted max-h-64 overflow-auto rounded-md p-3 text-start font-mono text-xs"
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
