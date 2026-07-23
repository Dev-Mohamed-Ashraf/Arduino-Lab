'use client';

import type { SlotAvailability } from '@arduino-lab/contracts';
import { Badge, Button, Card, Label, Progress, Switch } from '@arduino-lab/ui';
import { Pencil, Trash2 } from 'lucide-react';
import * as React from 'react';

import { InlineNumberField } from '@/components/components/inline-number-field';

export function SlotCard({
  slot,
  isSaving,
  isDeleting,
  onSave,
  onEdit,
  onDelete,
}: {
  slot: SlotAvailability;
  isSaving: boolean;
  isDeleting: boolean;
  onSave: (changes: { capacity?: number; isOpen?: boolean }) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const percent = slot.capacity > 0 ? (slot.booked / slot.capacity) * 100 : 0;

  return (
    <Card className="gap-4 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lg font-semibold">{slot.label}</p>
          <p className="text-muted-foreground text-sm tabular-nums" dir="ltr">
            {slot.startTime} – {slot.endTime}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant={slot.isOpen ? 'success' : 'secondary'}>
            {slot.isOpen ? 'مفتوحة' : 'مغلقة'}
          </Badge>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`تعديل فترة ${slot.label}`}
            onClick={onEdit}
          >
            <Pencil aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`حذف فترة ${slot.label}`}
            isLoading={isDeleting}
            onClick={() => {
              if (window.confirm(`حذف فترة "${slot.label}"؟`)) onDelete();
            }}
          >
            <Trash2 className="text-destructive" aria-hidden />
          </Button>
        </div>
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

      <div className="flex items-center justify-between gap-3">
        {/* The field labels itself with aria-label, so no htmlFor here. */}
        <span className="text-sm font-medium">عدد المجموعات</span>
        <InlineNumberField
          label={`سعة فترة ${slot.label}`}
          value={slot.capacity}
          min={1}
          max={50}
          isSaving={isSaving}
          onSave={(capacity) => onSave({ capacity })}
        />
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
