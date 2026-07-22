'use client';

import { BOOKING_STATUS_LABELS_AR, type BookingStatus } from '@arduino-lab/contracts';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
} from '@arduino-lab/ui';
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, CalendarX, Lock, Printer, Receipt, Users } from 'lucide-react';
import Link from 'next/link';

import { api } from '@/lib/api';
import { formatLongDate } from '@arduino-lab/web';

const STATUS_VARIANTS: Record<BookingStatus, 'success' | 'destructive' | 'secondary'> = {
  CONFIRMED: 'success',
  CANCELLED: 'destructive',
  COMPLETED: 'secondary',
};

export function MyBookingsList() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['bookings', 'mine'],
    queryFn: () => api.bookings.mine(),
  });

  if (isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorState description="تعذّر تحميل حجوزاتك." onRetry={() => void refetch()} />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<CalendarX />}
        title="لا توجد حجوزات بعد"
        description="ابدأ بحجز موعد لمجموعتك في المعمل."
        action={
          <Button asChild>
            <Link href="/booking/new">
              <CalendarPlus aria-hidden />
              حجز موعد
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <Alert variant="info">
        <Lock aria-hidden />
        <AlertDescription>
          الحجز المؤكد مقفول للتعديل. لأي تغيير تواصل مع إدارة المعمل.
        </AlertDescription>
      </Alert>

      <ul className="space-y-3">
        {data.map((booking) => (
          <li key={booking.id}>
            <Card className="gap-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold" dir="ltr">
                    {booking.bookingNumber}
                  </p>
                  <p className="text-lg font-medium">{booking.projectTitle}</p>
                </div>
                <Badge variant={STATUS_VARIANTS[booking.status]}>
                  {BOOKING_STATUS_LABELS_AR[booking.status]}
                </Badge>
              </div>

              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <Fact label="التاريخ" value={formatLongDate(booking.bookingDate)} />
                <Fact label="الفترة" value={booking.timeSlot.label} />
                <Fact label="رقم المجموعة" value={String(booking.groupNumber)} />
                <Fact
                  label="عدد الطلاب"
                  value={`${booking.memberCount}`}
                  icon={<Users className="size-3.5" aria-hidden />}
                />
              </dl>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/booking/${booking.bookingNumber}`}>
                    <Receipt aria-hidden />
                    عرض الإيصال
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/booking/${booking.bookingNumber}/print`}>
                    <Printer aria-hidden />
                    طباعة
                  </Link>
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Fact({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}:
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
