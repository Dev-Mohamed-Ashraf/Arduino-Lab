import type { Metadata } from 'next';

import { BookingReceipt } from '@/components/booking-receipt';
import { RequireAuth } from '@/components/require-auth';

export const metadata: Metadata = { title: 'إيصال الحجز' };

export default async function BookingPage({
  params,
}: {
  params: Promise<{ bookingNumber: string }>;
}) {
  const { bookingNumber } = await params;

  return (
    <RequireAuth>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <BookingReceipt bookingNumber={bookingNumber} />
      </div>
    </RequireAuth>
  );
}
