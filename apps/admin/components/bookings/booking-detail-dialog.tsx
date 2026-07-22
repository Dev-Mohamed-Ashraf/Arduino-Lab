'use client';

import { BOOKING_STATUS_LABELS_AR } from '@arduino-lab/contracts';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Separator,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@arduino-lab/ui';
import { formatDateTime, formatLongDate } from '@arduino-lab/web';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';

import { api } from '@/lib/api';

const STUDENT_APP_URL = process.env.NEXT_PUBLIC_STUDENT_APP_URL ?? 'http://localhost:3000';

export function BookingDetailDialog({
  bookingNumber,
  onOpenChange,
}: {
  bookingNumber: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isPending } = useQuery({
    queryKey: ['booking', bookingNumber],
    queryFn: () => api.bookings.getByNumber(bookingNumber ?? ''),
    enabled: Boolean(bookingNumber),
  });

  return (
    <Dialog open={Boolean(bookingNumber)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle dir="ltr" className="text-start">
            {bookingNumber}
          </DialogTitle>
          <DialogDescription>تفاصيل الحجز كاملة.</DialogDescription>
        </DialogHeader>

        {isPending || !data ? (
          <Skeleton className="h-80 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={data.status === 'CONFIRMED' ? 'success' : 'secondary'}>
                {BOOKING_STATUS_LABELS_AR[data.status]}
              </Badge>
              <Badge variant="outline">{data.timeSlot.label}</Badge>
              <Badge variant="outline">{formatLongDate(data.bookingDate)}</Badge>
              <Badge variant="secondary">مجموعة {data.groupNumber}</Badge>
            </div>

            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <Fact label="المسؤول" value={data.owner.fullName} />
              <Fact label="البريد" value={data.owner.email} isLtr />
              <Fact label="تاريخ التسجيل" value={formatDateTime(data.createdAt)} />
              <Fact label="آخر تعديل" value={formatDateTime(data.updatedAt)} />
            </dl>

            <Separator />

            <section className="space-y-1">
              <h3 className="font-semibold">{data.projectTitle}</h3>
              <p className="text-muted-foreground text-sm">{data.projectDescription}</p>
            </section>

            <Separator />

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">أعضاء المجموعة ({data.members.length})</h3>
              <ol className="grid gap-1 text-sm sm:grid-cols-2">
                {data.members.map((member, index) => (
                  <li key={member.id}>
                    <span className="text-muted-foreground tabular-nums">{index + 1}. </span>
                    {member.fullName}
                  </li>
                ))}
              </ol>
            </section>

            <Separator />

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">المكوّنات ({data.components.length})</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المكوّن</TableHead>
                    <TableHead className="w-24">الكمية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.components.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="tabular-nums">{item.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>

            <Separator />

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">صورة البطاقة</h3>
              <div className="bg-muted relative aspect-[1.586/1] w-full max-w-sm overflow-hidden rounded-lg">
                <Image
                  src={data.idCardUrl}
                  alt="صورة بطاقة الهوية"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            </section>

            <Button variant="outline" asChild className="w-full">
              <a
                href={`${STUDENT_APP_URL}/booking/${data.bookingNumber}/print`}
                target="_blank"
                rel="noreferrer"
              >
                فتح صفحة الطباعة
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Fact({ label, value, isLtr }: { label: string; value: string; isLtr?: boolean }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium" dir={isLtr ? 'ltr' : undefined}>
        {value}
      </dd>
    </div>
  );
}
