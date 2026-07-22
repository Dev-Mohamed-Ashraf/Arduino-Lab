'use client';

import { ApiError, type BookingSummary } from '@arduino-lab/contracts';
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  SlotCard,
  Skeleton,
  toast,
} from '@arduino-lab/ui';
import { todayIso } from '@arduino-lab/web';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import * as React from 'react';

import { DatePicker } from '@/components/date-picker';
import { api } from '@/lib/api';

/** Moves a booking to another period or day. Components are left untouched. */
export function MoveBookingDialog({
  booking,
  onOpenChange,
}: {
  booking: BookingSummary | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [date, setDate] = React.useState(todayIso);
  const [slotId, setSlotId] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (booking) {
      setDate(booking.bookingDate);
      setSlotId(booking.timeSlot.id);
      setError(null);
    }
  }, [booking]);

  const slots = useQuery({
    queryKey: ['slots', 'availability', date],
    queryFn: () => api.slots.availability(date),
    enabled: Boolean(booking),
  });

  const move = useMutation({
    mutationFn: () => api.bookings.move(booking?.id ?? '', { timeSlotId: slotId, bookingDate: date }),
    onSuccess: async () => {
      toast.success('تم نقل الحجز.');
      await queryClient.invalidateQueries();
      onOpenChange(false);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'تعذّر نقل الحجز.');
    },
  });

  const isUnchanged = booking?.bookingDate === date && booking.timeSlot.id === slotId;

  return (
    <Dialog open={Boolean(booking)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>نقل الحجز</DialogTitle>
          <DialogDescription>
            اختر التاريخ والفترة الجديدين. المكوّنات المحجوزة لن تتغيّر.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <DatePicker
            id="move-date"
            label="التاريخ"
            value={date}
            onChange={(value) => {
              setDate(value);
              setSlotId('');
            }}
            min={todayIso()}
            showLongDate
          />

          <div className="space-y-2">
            <Label>الفترة</Label>
            {slots.isPending ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-40 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {(slots.data ?? []).map((slot) => (
                  <SlotCard
                    key={slot.id}
                    label={slot.label}
                    booked={slot.booked}
                    capacity={slot.capacity}
                    isOpen={slot.isOpen}
                    selectable
                    selected={slot.id === slotId}
                    onSelect={() => setSlotId(slot.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            disabled={!slotId || isUnchanged}
            isLoading={move.isPending}
            onClick={() => move.mutate()}
          >
            نقل الحجز
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
