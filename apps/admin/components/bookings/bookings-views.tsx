'use client';

import {
  BOOKING_STATUS_LABELS_AR,
  type BookingStatus,
  type BookingSummary,
} from '@arduino-lab/contracts';
import {
  Badge,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@arduino-lab/ui';
import { formatShortDate } from '@arduino-lab/web';
import { Eye, MoveRight, Pencil, Trash2 } from 'lucide-react';

const STATUS_VARIANTS: Record<BookingStatus, 'success' | 'destructive' | 'secondary'> = {
  CONFIRMED: 'success',
  CANCELLED: 'destructive',
  COMPLETED: 'secondary',
};

export interface BookingActions {
  onView: (booking: BookingSummary) => void;
  onEdit: (booking: BookingSummary) => void;
  onMove: (booking: BookingSummary) => void;
  onCancel: (booking: BookingSummary) => void;
  cancellingId?: string;
}

/** Wide layout. Hidden below `lg`, where {@link BookingsCards} takes over. */
export function BookingsTable({
  bookings,
  actions,
}: {
  bookings: BookingSummary[];
  actions: BookingActions;
}) {
  return (
    <Card className="hidden overflow-hidden py-0 lg:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>رقم الحجز</TableHead>
            <TableHead>التاريخ</TableHead>
            <TableHead>الفترة</TableHead>
            <TableHead className="w-20">المجموعة</TableHead>
            <TableHead>المشروع</TableHead>
            <TableHead className="w-16">الطلاب</TableHead>
            <TableHead className="w-24">الحالة</TableHead>
            <TableHead className="w-32">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell dir="ltr" className="text-start font-medium">
                {booking.bookingNumber}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatShortDate(booking.bookingDate)}
              </TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">
                {booking.timeSlot.label}
              </TableCell>
              <TableCell className="tabular-nums">{booking.groupNumber}</TableCell>
              <TableCell className="max-w-56 truncate">{booking.projectTitle}</TableCell>
              <TableCell className="tabular-nums">{booking.memberCount}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[booking.status]}>
                  {BOOKING_STATUS_LABELS_AR[booking.status]}
                </Badge>
              </TableCell>
              <TableCell>
                <RowActions booking={booking} actions={actions} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

/** Narrow layout: one card per booking instead of a sideways-scrolling table. */
export function BookingsCards({
  bookings,
  actions,
}: {
  bookings: BookingSummary[];
  actions: BookingActions;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
      {bookings.map((booking) => (
        <Card key={booking.id} className="gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium" dir="ltr">
                {booking.bookingNumber}
              </p>
              <p className="truncate text-sm">{booking.projectTitle}</p>
            </div>
            <Badge variant={STATUS_VARIANTS[booking.status]}>
              {BOOKING_STATUS_LABELS_AR[booking.status]}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{formatShortDate(booking.bookingDate)}</Badge>
            <Badge variant="outline" className="tabular-nums">
              {booking.timeSlot.label}
            </Badge>
            <Badge variant="secondary" className="tabular-nums">
              مجموعة {booking.groupNumber}
            </Badge>
          </div>
          <RowActions booking={booking} actions={actions} />
        </Card>
      ))}
    </div>
  );
}

function RowActions({ booking, actions }: { booking: BookingSummary; actions: BookingActions }) {
  const isCancelled = booking.status === 'CANCELLED';

  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`عرض تفاصيل ${booking.bookingNumber}`}
        onClick={() => actions.onView(booking)}
      >
        <Eye aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`تعديل ${booking.bookingNumber}`}
        onClick={() => actions.onEdit(booking)}
        disabled={isCancelled}
      >
        <Pencil aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`نقل ${booking.bookingNumber} لفترة أخرى`}
        onClick={() => actions.onMove(booking)}
        disabled={isCancelled}
      >
        <MoveRight aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`إلغاء ${booking.bookingNumber}`}
        disabled={isCancelled}
        isLoading={actions.cancellingId === booking.id}
        onClick={() => {
          if (window.confirm(`إلغاء الحجز ${booking.bookingNumber} وإرجاع مكوّناته للمخزون؟`)) {
            actions.onCancel(booking);
          }
        }}
      >
        <Trash2 className="text-destructive" aria-hidden />
      </Button>
    </div>
  );
}
