import { SlotCard } from '@arduino-lab/ui';
import type { SlotAvailability } from '@arduino-lab/contracts';

/** The four fixed periods with today's occupancy. */
export function SlotsPanel({ slots }: { slots: SlotAvailability[] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold sm:text-xl">مواعيد الحجز</h2>
        <p className="text-muted-foreground text-sm">كل فترة تتسع لعدد محدود من المجموعات</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {slots.map((slot) => (
          <SlotCard
            key={slot.id}
            label={slot.label}
            booked={slot.booked}
            capacity={slot.capacity}
            isOpen={slot.isOpen}
          />
        ))}
      </div>
    </section>
  );
}
