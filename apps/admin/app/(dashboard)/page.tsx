'use client';

import { Badge, Card, ErrorState, PageHeader, SlotCard } from '@arduino-lab/ui';
import { formatShortDate, todayIso } from '@arduino-lab/web';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import { DatePicker } from '@/components/date-picker';
import { OverviewStatCards, StockAlert } from '@/components/overview/overview-stats';
import { api } from '@/lib/api';

export default function OverviewPage() {
  const [date, setDate] = React.useState(todayIso);

  const overview = useQuery({
    queryKey: ['reports', 'overview', date],
    queryFn: () => api.reports.overview(date),
  });

  const slots = useQuery({
    queryKey: ['slots', 'availability', date],
    queryFn: () => api.slots.availability(date),
  });

  const stock = useQuery({
    queryKey: ['reports', 'stock'],
    queryFn: () => api.reports.stock(),
  });

  const recent = useQuery({
    queryKey: ['bookings', 'recent'],
    queryFn: () => api.bookings.list({ pageSize: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
  });

  if (overview.isError) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="تعذّر تحميل الإحصائيات." onRetry={() => void overview.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="نظرة عامة"
        description="حالة المعمل والمخزون في يوم محدد."
        action={
          <DatePicker id="overview-date" label="" value={date} onChange={setDate} showLongDate />
        }
      />

      <OverviewStatCards stats={overview.data} isLoading={overview.isPending} />

      <StockAlert rows={stock.data ?? []} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">إشغال الفترات</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(slots.data ?? []).map((slot) => (
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

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">آخر الحجوزات</h2>
          <Link href="/bookings" className="text-primary text-sm hover:underline">
            عرض الكل
          </Link>
        </div>

        <ul className="space-y-2">
          {(recent.data?.items ?? []).map((booking) => (
            <li key={booking.id}>
              <Card className="flex-row flex-wrap items-center gap-3 p-3">
                <span className="font-medium" dir="ltr">
                  {booking.bookingNumber}
                </span>
                <span className="min-w-0 flex-1 truncate">{booking.projectTitle}</span>
                <Badge variant="outline">{booking.timeSlot.label}</Badge>
                <Badge variant="secondary">{formatShortDate(booking.bookingDate)}</Badge>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
