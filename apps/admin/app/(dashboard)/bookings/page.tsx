'use client';

import { ApiError, type BookingStatus, type BookingSummary } from '@arduino-lab/contracts';
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  toast,
} from '@arduino-lab/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarX, Search } from 'lucide-react';
import * as React from 'react';

import { BookingDetailDialog } from '@/components/bookings/booking-detail-dialog';
import { BookingsCards, BookingsTable } from '@/components/bookings/bookings-views';
import { EditBookingDialog } from '@/components/bookings/edit-booking-dialog';
import { MoveBookingDialog } from '@/components/bookings/move-booking-dialog';
import { api } from '@/lib/api';

const PAGE_SIZE = 20;

export default function BookingsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<BookingStatus | 'ALL'>('ALL');
  const [page, setPage] = React.useState(1);
  const [detailNumber, setDetailNumber] = React.useState<string | null>(null);
  const [editNumber, setEditNumber] = React.useState<string | null>(null);
  const [movingBooking, setMovingBooking] = React.useState<BookingSummary | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['bookings', 'list', search, status, page],
    queryFn: () =>
      api.bookings.list({
        search: search || undefined,
        status: status === 'ALL' ? undefined : status,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api.bookings.cancel(id),
    onSuccess: async () => {
      toast.success('تم إلغاء الحجز وإرجاع المكوّنات للمخزون.');
      await queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'تعذّر إلغاء الحجز.');
    },
  });

  const actions = {
    onView: (booking: BookingSummary) => setDetailNumber(booking.bookingNumber),
    onEdit: (booking: BookingSummary) => setEditNumber(booking.bookingNumber),
    onMove: (booking: BookingSummary) => setMovingBooking(booking),
    onCancel: (booking: BookingSummary) => cancel.mutate(booking.id),
    cancellingId: cancel.isPending ? cancel.variables : undefined,
  };

  const items = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title="الحجوزات" description="بحث وعرض ونقل وإلغاء حجوزات المعمل." />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="رقم حجز، رقم مجموعة، مشروع، أو اسم طالب…"
            className="ps-9"
            aria-label="ابحث في الحجوزات"
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as BookingStatus | 'ALL');
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-48" aria-label="فلترة بالحالة">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل الحالات</SelectItem>
            <SelectItem value="CONFIRMED">مؤكد</SelectItem>
            <SelectItem value="CANCELLED">ملغي</SelectItem>
            <SelectItem value="COMPLETED">مكتمل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <ErrorState description="تعذّر تحميل الحجوزات." onRetry={() => void refetch()} />
      ) : isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : items.length === 0 ? (
        <EmptyState icon={<CalendarX />} title="لا توجد حجوزات" description="جرّب بحثًا آخر." />
      ) : (
        <>
          <BookingsTable bookings={items} actions={actions} />
          <BookingsCards bookings={items} actions={actions} />
          <Pagination page={page} totalPages={data.totalPages} total={data.total} onChange={setPage} />
        </>
      )}

      <BookingDetailDialog
        bookingNumber={detailNumber}
        onOpenChange={(open) => !open && setDetailNumber(null)}
      />
      <EditBookingDialog
        bookingNumber={editNumber}
        onOpenChange={(open) => !open && setEditNumber(null)}
      />
      <MoveBookingDialog
        booking={movingBooking}
        onOpenChange={(open) => !open && setMovingBooking(null)}
      />
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-muted-foreground text-sm">
        إجمالي النتائج: <span className="tabular-nums">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          السابق
        </Button>
        <span className="text-sm tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          التالي
        </Button>
      </div>
    </div>
  );
}
