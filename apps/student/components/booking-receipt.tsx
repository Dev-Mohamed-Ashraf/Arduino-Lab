'use client';

import { BOOKING_STATUS_LABELS_AR } from '@arduino-lab/contracts';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  ErrorState,
  Separator,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@arduino-lab/ui';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CircleCheck, Lock, Printer } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { api } from '@/lib/api';
import { formatDateTime, formatLongDate } from '@/lib/format';

export function BookingReceipt({ bookingNumber }: { bookingNumber: string }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['booking', bookingNumber],
    queryFn: () => api.bookings.getByNumber(bookingNumber),
  });

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="تعذّر تحميل الحجز"
        description="قد يكون رقم الحجز غير صحيح أو لا تملك صلاحية عرضه."
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Alert variant="success">
        <CircleCheck aria-hidden />
        <AlertDescription>
          الحجز مؤكد. أحضر هذا الإيصال مطبوعًا عند حضوركم للمعمل.
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">رقم الحجز</p>
          <p className="text-2xl font-bold" dir="ltr">
            {data.bookingNumber}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/booking/${data.bookingNumber}/print`}>
              <Printer aria-hidden />
              طباعة الإيصال
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/my-bookings">
              حجوزاتي
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      <Card className="gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={data.status === 'CONFIRMED' ? 'success' : 'secondary'}>
            {BOOKING_STATUS_LABELS_AR[data.status]}
          </Badge>
          <Badge variant="outline">{data.timeSlot.label}</Badge>
          <Badge variant="outline">مجموعة {data.groupNumber}</Badge>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <Fact label="التاريخ" value={formatLongDate(data.bookingDate)} />
          <Fact label="الفترة" value={`${data.timeSlot.startTime} — ${data.timeSlot.endTime}`} />
          <Fact label="المسؤول" value={data.owner.fullName} />
          <Fact label="تاريخ التسجيل" value={formatDateTime(data.createdAt)} />
        </dl>

        <Separator />

        <section className="space-y-2">
          <h2 className="font-semibold">أسماء الطلاب</h2>
          <ol className="grid gap-1 text-sm sm:grid-cols-2">
            {data.members.map((member, index) => (
              <li key={member.id} className="flex gap-2">
                <span className="text-muted-foreground tabular-nums">{index + 1}.</span>
                <span>{member.fullName}</span>
                {member.studentCode ? (
                  <span className="text-muted-foreground" dir="ltr">
                    ({member.studentCode})
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        <Separator />

        <section className="space-y-2">
          <h2 className="font-semibold">{data.projectTitle}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">{data.projectDescription}</p>
        </section>

        <Separator />

        <section className="space-y-2">
          <h2 className="font-semibold">المكوّنات المستلمة</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>المكوّن</TableHead>
                <TableHead className="w-24">الكمية</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.components.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="tabular-nums">{index + 1}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="tabular-nums">{item.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <Separator />

        <section className="space-y-2">
          <h2 className="font-semibold">صورة البطاقة</h2>
          <div className="bg-muted relative aspect-[1.586/1] w-full max-w-xs overflow-hidden rounded-lg">
            <Image src={data.idCardUrl} alt="صورة بطاقة الهوية" fill unoptimized className="object-cover" />
          </div>
        </section>
      </Card>

      <Alert variant="warning">
        <Lock aria-hidden />
        <AlertDescription>
          هذا الحجز مقفول للتعديل. لأي تغيير تواصل مع إدارة المعمل.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
