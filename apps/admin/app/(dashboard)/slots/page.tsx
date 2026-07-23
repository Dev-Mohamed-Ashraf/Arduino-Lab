'use client';

import { ApiError, type SlotAvailability } from '@arduino-lab/contracts';
import {
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  toast,
} from '@arduino-lab/ui';
import { todayIso } from '@arduino-lab/web';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Plus } from 'lucide-react';
import * as React from 'react';

import { DatePicker } from '@/components/date-picker';
import { SlotCard } from '@/components/slots/slot-card';
import { SlotDialog } from '@/components/slots/slot-dialog';
import { api } from '@/lib/api';

export default function SlotsPage() {
  const [date, setDate] = React.useState(todayIso);
  const [editing, setEditing] = React.useState<SlotAvailability | undefined>();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['slots', 'availability', date],
    queryFn: () => api.slots.availability(date),
  });

  const update = useMutation({
    mutationFn: ({ id, capacity, isOpen }: { id: string; capacity?: number; isOpen?: boolean }) =>
      api.slots.update(id, { capacity, isOpen }),
    onSuccess: async () => {
      toast.success('تم حفظ التغيير.');
      await queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'تعذّر حفظ التغيير.');
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.slots.remove(id),
    onSuccess: async () => {
      toast.success('تم حذف الفترة.');
      await queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'تعذّر حذف الفترة.');
    },
  });

  function openCreate(): void {
    setEditing(undefined);
    setIsDialogOpen(true);
  }

  function openEdit(slot: SlotAvailability): void {
    setEditing(slot);
    setIsDialogOpen(true);
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="الفترات الزمنية"
        description="أضف فترة أو عدّل اسمها ومواعيدها وسعتها."
        action={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <DatePicker id="slots-date" label="" value={date} onChange={setDate} showLongDate />
            <Button onClick={openCreate}>
              <Plus aria-hidden />
              إضافة فترة
            </Button>
          </div>
        }
      />

      {isError ? (
        <ErrorState description="تعذّر تحميل الفترات." onRetry={() => void refetch()} />
      ) : isPending ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-56 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={<CalendarClock />}
          title="لا توجد فترات"
          description="أضف أول فترة حتى يتمكن الطلبة من الحجز."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              isSaving={update.isPending && update.variables?.id === slot.id}
              isDeleting={remove.isPending && remove.variables === slot.id}
              onSave={(changes) => update.mutate({ id: slot.id, ...changes })}
              onEdit={() => openEdit(slot)}
              onDelete={() => remove.mutate(slot.id)}
            />
          ))}
        </div>
      )}

      <SlotDialog slot={editing} open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
