import { PageHeader } from '@arduino-lab/ui';
import type { Metadata } from 'next';

import { MyBookingsList } from '@/components/my-bookings-list';
import { RequireAuth } from '@/components/require-auth';

export const metadata: Metadata = { title: 'حجوزاتي' };

export default function MyBookingsPage() {
  return (
    <RequireAuth>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <PageHeader title="حجوزاتي" description="جميع الحجوزات المسجّلة باسمك." />
        <MyBookingsList />
      </div>
    </RequireAuth>
  );
}
