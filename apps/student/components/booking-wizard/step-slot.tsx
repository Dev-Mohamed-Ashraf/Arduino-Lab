'use client';

import type { CreateBookingInput } from '@arduino-lab/contracts';
import { Alert, AlertDescription, ErrorState, Label, Skeleton, SlotCard } from '@arduino-lab/ui';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, TriangleAlert } from 'lucide-react';
import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { api } from '@/lib/api';
import { addDays, formatLongDate, todayIso } from '@/lib/format';

/** Bookings open for the next four weeks. */
const BOOKING_HORIZON_DAYS = 28;

export function StepSlot() {
  const { setValue, watch, formState } = useFormContext<CreateBookingInput>();

  const today = React.useMemo(todayIso, []);
  const selectedDate = watch('bookingDate') || today;
  const selectedSlotId = watch('timeSlotId');

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['slots', 'availability', selectedDate],
    queryFn: () => api.slots.availability(selectedDate),
    refetchInterval: 15_000,
  });

  // Keep the form in sync when the field is still empty on first render.
  React.useEffect(() => {
    if (!watch('bookingDate')) {
      setValue('bookingDate', today, { shouldValidate: false });
    }
  }, [setValue, today, watch]);

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="bookingDate" required>
          تاريخ الحجز
        </Label>
        <input
          id="bookingDate"
          type="date"
          value={selectedDate}
          min={today}
          max={addDays(today, BOOKING_HORIZON_DAYS)}
          onChange={(event) => {
            setValue('bookingDate', event.target.value, { shouldValidate: true });
            // The chosen period may be full on the new day, so the selection is
            // cleared rather than silently carried over.
            setValue('timeSlotId', '', { shouldValidate: false });
          }}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-11 w-full rounded-md border px-3 text-base shadow-xs outline-none focus-visible:ring-[3px] md:text-sm"
        />
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <CalendarDays className="size-3.5" aria-hidden />
          {formatLongDate(selectedDate)}
        </p>
      </div>

      <div className="space-y-3">
        <Label>اختر الفترة</Label>

        {isError ? (
          <ErrorState description="تعذّر تحميل الفترات." onRetry={() => void refetch()} />
        ) : isPending ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-40 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.map((slot) => (
              <SlotCard
                key={slot.id}
                label={slot.label}
                booked={slot.booked}
                capacity={slot.capacity}
                isOpen={slot.isOpen}
                selectable
                selected={slot.id === selectedSlotId}
                onSelect={() => setValue('timeSlotId', slot.id, { shouldValidate: true })}
              />
            ))}
          </div>
        )}

        {formState.errors.timeSlotId ? (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden />
            <AlertDescription>اختر فترة متاحة للمتابعة.</AlertDescription>
          </Alert>
        ) : null}

        {formState.errors.bookingDate ? (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden />
            <AlertDescription>{formState.errors.bookingDate.message}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
