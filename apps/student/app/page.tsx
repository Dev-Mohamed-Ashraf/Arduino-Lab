import { Button, ErrorState, PageHeader, StatCard } from '@arduino-lab/ui';
import { CalendarCheck, CalendarPlus, PackageSearch, TriangleAlert } from 'lucide-react';
import Link from 'next/link';

import { ComponentsPanel } from '@/components/dashboard/components-panel';
import { SlotsPanel } from '@/components/dashboard/slots-panel';
import { publicApi } from '@/lib/api';
import { formatLongDate, todayIso } from '@/lib/format';

// The lab's occupancy changes minute to minute; a short window keeps the page
// fast without showing numbers that are meaningfully stale.
export const revalidate = 30;

export default async function DashboardPage() {
  const today = todayIso();
  const dashboard = await publicApi.dashboard.get(today).catch(() => null);

  if (!dashboard) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <ErrorState
          title="تعذّر الاتصال بالخادم"
          description="لم نتمكن من تحميل بيانات المعمل. حدّث الصفحة بعد قليل."
        />
      </div>
    );
  }

  const { summary } = dashboard;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <PageHeader
        title="حالة معمل الأردوينو"
        description={formatLongDate(dashboard.date)}
        action={
          <Button asChild size="lg">
            <Link href="/booking/new">
              <CalendarPlus aria-hidden />
              احجز موعد
            </Link>
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="المجموعات المسجّلة اليوم"
          value={`${summary.totalBookingsToday} / ${summary.totalCapacityToday}`}
          icon={<CalendarCheck />}
        />
        <StatCard
          label="الأماكن المتبقية"
          value={summary.totalRemainingSeats}
          tone={summary.totalRemainingSeats === 0 ? 'destructive' : 'success'}
          icon={<CalendarPlus />}
        />
        <StatCard
          label="إجمالي المكوّنات"
          value={summary.componentsCount}
          icon={<PackageSearch />}
        />
        <StatCard
          label="مكوّنات غير متوفرة"
          value={summary.outOfStockCount}
          hint={summary.lowStockCount > 0 ? `${summary.lowStockCount} بكمية محدودة` : undefined}
          tone={summary.outOfStockCount > 0 ? 'destructive' : 'success'}
          icon={<TriangleAlert />}
        />
      </section>

      <SlotsPanel slots={dashboard.slots} />
      <ComponentsPanel components={dashboard.components} />
    </div>
  );
}
