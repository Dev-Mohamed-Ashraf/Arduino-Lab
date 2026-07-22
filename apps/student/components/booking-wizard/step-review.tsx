'use client';

import type { CreateBookingInput } from '@arduino-lab/contracts';
import { Alert, AlertDescription, Badge, Card, Separator, Skeleton } from '@arduino-lab/ui';
import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import Image from 'next/image';
import { useFormContext } from 'react-hook-form';

import { api } from '@/lib/api';
import { formatLongDate } from '@/lib/format';

export function StepReview() {
  const { watch } = useFormContext<CreateBookingInput>();
  const values = watch();

  const { data: components, isPending } = useQuery({
    queryKey: ['components', 'all'],
    queryFn: () => api.components.list({ pageSize: 100 }),
  });

  const { data: slots } = useQuery({
    queryKey: ['slots', 'list'],
    queryFn: () => api.slots.list(),
  });

  const nameById = new Map((components?.items ?? []).map((item) => [item.id, item.name]));
  const slotLabel = slots?.find((slot) => slot.id === values.timeSlotId)?.label ?? '—';

  return (
    <div className="space-y-4">
      <Alert variant="warning">
        <Lock aria-hidden />
        <AlertDescription>
          بعد التأكيد يُقفل الحجز للتعديل. لأي تغيير لاحق تواصل مع إدارة المعمل.
        </AlertDescription>
      </Alert>

      <Card className="gap-4 p-5">
        <ReviewRow label="التاريخ" value={values.bookingDate ? formatLongDate(values.bookingDate) : '—'} />
        <ReviewRow label="الفترة" value={slotLabel} />
        <ReviewRow label="رقم المجموعة" value={String(values.groupNumber ?? '—')} />

        <Separator />

        <MembersSummary members={values.members ?? []} />

        <Separator />

        <ReviewRow label="اسم المشروع" value={values.projectTitle ?? '—'} />
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">وصف المشروع</p>
          <p className="text-sm leading-relaxed">{values.projectDescription}</p>
        </div>

        <Separator />

        <ComponentsSummary
          items={values.components ?? []}
          nameById={nameById}
          isPending={isPending}
        />

        {values.idCardUrl ? <IdCardPreview url={values.idCardUrl} /> : null}
      </Card>
    </div>
  );
}

function MembersSummary({ members }: { members: CreateBookingInput['members'] }) {
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-sm">أعضاء المجموعة ({members.length})</p>
      <ol className="grid gap-1 text-sm sm:grid-cols-2">
        {members.map((member, index) => (
          <li key={`${member.fullName}-${index}`} className="flex gap-2">
            <span className="text-muted-foreground tabular-nums">{index + 1}.</span>
            <span>{member.fullName}</span>
            {member.studentCode ? (
              <span className="text-muted-foreground" dir="ltr">
                ({member.studentCode})
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ComponentsSummary({
  items,
  nameById,
  isPending,
}: {
  items: CreateBookingInput['components'];
  nameById: Map<string, string>;
  isPending: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-sm">المكوّنات المطلوبة ({items.length})</p>
      {isPending ? (
        <Skeleton className="h-8 w-full" />
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item.componentId}>
              <Badge variant="secondary" className="py-1">
                {nameById.get(item.componentId) ?? '—'} × {item.quantity}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IdCardPreview({ url }: { url: string }) {
  return (
    <>
      <Separator />
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">صورة البطاقة</p>
        <div className="bg-muted relative aspect-[1.586/1] w-full max-w-xs overflow-hidden rounded-lg">
          <Image src={url} alt="صورة البطاقة المرفوعة" fill unoptimized className="object-cover" />
        </div>
      </div>
    </>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-end font-medium">{value}</span>
    </div>
  );
}
