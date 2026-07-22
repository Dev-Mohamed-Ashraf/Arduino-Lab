'use client';

import { Button, ErrorState, Skeleton } from '@arduino-lab/ui';
import { formatDateTime, formatLongDate } from '@arduino-lab/web';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import * as React from 'react';

import { api } from '@/lib/api';

/**
 * The official lab receipt, laid out for A4.
 *
 * Printing is left to the browser rather than generating a PDF on the server:
 * server-side renderers mangle Arabic letter joining, and Chromium on Render's
 * free tier would blow the memory budget. The browser shapes the Arabic
 * correctly, costs nothing, and the user saves a PDF from the same dialog.
 */
export function PrintReceipt({ bookingNumber }: { bookingNumber: string }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['booking', bookingNumber],
    queryFn: () => api.bookings.getByNumber(bookingNumber),
  });

  // Auto-open the print dialog once the receipt has painted, so the link acts
  // like a "print" button while still leaving a readable page on screen.
  React.useEffect(() => {
    if (!data) return undefined;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [data]);

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-8">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <ErrorState
          title="تعذّر تحميل الحجز"
          description="قد يكون رقم الحجز غير صحيح أو لا تملك صلاحية عرضه."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl bg-white p-6 text-black sm:p-10">
      <div className="no-print mb-6 flex justify-end">
        <Button onClick={() => window.print()}>
          <Printer aria-hidden />
          طباعة
        </Button>
      </div>

      <article className="space-y-6">
        <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-4">
          <div>
            <h1 className="text-xl font-bold">إيصال حجز معمل الأردوينو</h1>
            <p className="mt-1 text-sm text-gray-600">Arduino Lab Booking Receipt</p>
          </div>
          <div className="text-end">
            <p className="text-xs text-gray-600">رقم الحجز</p>
            <p className="text-lg font-bold" dir="ltr">
              {data.bookingNumber}
            </p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Field label="التاريخ" value={formatLongDate(data.bookingDate)} />
          <Field label="الفترة" value={data.timeSlot.label} />
          <Field label="رقم المجموعة" value={String(data.groupNumber)} />
          <Field label="عدد الطلاب" value={String(data.members.length)} />
        </section>

        <section className="avoid-break space-y-2">
          <h2 className="border-b border-gray-300 pb-1 font-semibold">أسماء الطلاب</h2>
          <ol className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
            {data.members.map((member, index) => (
              <li key={member.id} className="flex gap-2">
                <span className="text-gray-500 tabular-nums">{index + 1}.</span>
                <span>{member.fullName}</span>
                {member.studentCode ? (
                  <span className="text-gray-500" dir="ltr">
                    ({member.studentCode})
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        <section className="avoid-break space-y-1">
          <h2 className="border-b border-gray-300 pb-1 font-semibold">المشروع</h2>
          <p className="font-medium">{data.projectTitle}</p>
          <p className="text-sm leading-relaxed text-gray-700">{data.projectDescription}</p>
        </section>

        <section className="space-y-2">
          <h2 className="border-b border-gray-300 pb-1 font-semibold">المكوّنات المستلمة</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-400 text-start">
                <th className="w-10 py-1.5 text-start font-semibold">#</th>
                <th className="py-1.5 text-start font-semibold">المكوّن</th>
                <th className="w-20 py-1.5 text-start font-semibold">الكمية</th>
                <th className="w-20 py-1.5 text-start font-semibold">استُلم</th>
                <th className="w-20 py-1.5 text-start font-semibold">أُرجع</th>
              </tr>
            </thead>
            <tbody>
              {data.components.map((item, index) => (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="py-1.5 tabular-nums">{index + 1}</td>
                  <td className="py-1.5">{item.name}</td>
                  <td className="py-1.5 tabular-nums">{item.quantity}</td>
                  <td className="py-1.5">&nbsp;</td>
                  <td className="py-1.5">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="avoid-break flex items-end justify-between gap-8 pt-8 text-sm">
          <div className="flex-1">
            <div className="mb-1 border-b border-black" />
            <p className="text-center text-gray-600">توقيع الطالب المسؤول</p>
          </div>
          <div className="flex-1">
            <div className="mb-1 border-b border-black" />
            <p className="text-center text-gray-600">توقيع المشرف</p>
          </div>
        </section>

        <footer className="border-t border-gray-300 pt-3 text-xs text-gray-500">
          تاريخ التسجيل: {formatDateTime(data.createdAt)} — هذا الإيصال وثيقة رسمية تُقدَّم عند
          حضور المجموعة إلى المعمل.
        </footer>
      </article>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-600">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
