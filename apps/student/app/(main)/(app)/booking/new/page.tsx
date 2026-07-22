import { PageHeader } from '@arduino-lab/ui';
import type { Metadata } from 'next';

import { BookingWizard } from '@/components/booking-wizard/booking-wizard';
import { RequireAuth } from '@/components/require-auth';

export const metadata: Metadata = { title: 'حجز موعد' };

export default function NewBookingPage() {
  return (
    <RequireAuth requireVerified>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <PageHeader
          title="حجز موعد في المعمل"
          description="املأ بيانات المجموعة والمشروع واختر الفترة المناسبة."
        />
        <BookingWizard />
      </div>
    </RequireAuth>
  );
}
