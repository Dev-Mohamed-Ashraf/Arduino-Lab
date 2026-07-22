'use client';

import { ApiError, type SlotAvailability } from '@arduino-lab/contracts';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Input,
  Label,
  PageHeader,
  Progress,
  Skeleton,
  Switch,
  toast,
} from '@arduino-lab/ui';
import { todayIso } from '@arduino-lab/web';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

import { DatePicker } from '@/components/date-picker';
import { api } from '@/lib/api';

export default function SlotsPage() {
  const [date, setDate] = React.useState(todayIso);
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

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="الفترات الزمنية"
        description="عدّل سعة كل فترة أو أغلقها مؤقتًا."
        action={<DatePicker id="slots-date" label="" value={date} onChange={setDate} showLongDate />}
      />

      {isError ? (
        <ErrorState description="تعذّر تحميل الفترات." onRetry={() => void refetch()} />
      ) : isPending ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-56 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.map((slot) => (
            <SlotEditor
              key={slot.id}
              slot={slot}
              isSaving={update.isPending && update.variables?.id === slot.id}
              onSave={(changes) => update.mutate({ id: slot.id, ...changes })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SlotEditor({
  slot,
  isSaving,
  onSave,
}: {
  slot: SlotAvailability;
  isSaving: boolean;
  onSave: (changes: { capacity?: number; isOpen?: boolean }) => void;
}) {
  const [capacity, setCapacity] = React.useState(String(slot.capacity));

  // The server is the source of truth; a rejected save must not leave a stale
  // number sitting in the field.
  React.useEffect(() => setCapacity(String(slot.capacity)), [slot.capacity]);

  const parsed = Number(capacity);
  const isDirty = Number.isInteger(parsed) && parsed > 0 && parsed !== slot.capacity;
  const percent = slot.capacity > 0 ? (slot.booked / slot.capacity) * 100 : 0;

  return (
    <Card className="gap-4 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-lg font-semibold tabular-nums">{slot.label}</span>
        <Badge variant={slot.isOpen ? 'success' : 'secondary'}>
          {slot.isOpen ? 'مفتوحة' : 'مغلقة'}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">الإشغال في هذا اليوم</span>
          <span className="font-semibold tabular-nums">
            {slot.booked} / {slot.capacity}
          </span>
        </div>
        <Progress value={percent} />
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor={`capacity-${slot.id}`}>السعة</Label>
          <Input
            id={`capacity-${slot.id}`}
            type="number"
            min={1}
            max={50}
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
          />
        </div>
        <Button
          size="default"
          disabled={!isDirty}
          isLoading={isSaving}
          onClick={() => onSave({ capacity: parsed })}
        >
          حفظ
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-3">
        <div className="min-w-0">
          <Label htmlFor={`open-${slot.id}`}>متاحة للحجز</Label>
          <p className="text-muted-foreground text-xs">
            {slot.booked > 0 && slot.isOpen
              ? `الإغلاق لن يلغي ${slot.booked} حجزًا قائمًا.`
              : 'الإغلاق يمنع الحجوزات الجديدة فقط.'}
          </p>
        </div>
        <Switch
          id={`open-${slot.id}`}
          checked={slot.isOpen}
          onCheckedChange={(isOpen) => onSave({ isOpen })}
        />
      </div>
    </Card>
  );
}
