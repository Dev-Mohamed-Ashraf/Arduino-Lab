'use client';

import type { ComponentUsageRow, OverviewStats } from '@arduino-lab/contracts';
import { Alert, AlertDescription, AlertTitle, StatCard } from '@arduino-lab/ui';
import { CalendarCheck, PackageX, TriangleAlert, Users } from 'lucide-react';

const LOW_STOCK_RATIO = 0.25;

type Tone = 'success' | 'destructive';

interface StatTile {
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
  icon: React.ReactNode;
}

/** All the branching happens here so the JSX below is a plain list. */
function toTiles(stats?: OverviewStats): StatTile[] {
  if (!stats) {
    return [
      { label: 'حجوزات اليوم', value: '—', icon: <CalendarCheck /> },
      { label: 'الأماكن المتبقية', value: '—', icon: <CalendarCheck /> },
      { label: 'مكوّنات نافدة', value: '—', icon: <PackageX /> },
      { label: 'عدد الطلاب المسجّلين', value: '—', icon: <Users /> },
    ];
  }

  return [
    {
      label: 'حجوزات اليوم',
      value: `${stats.bookingsToday} / ${stats.totalCapacityToday}`,
      icon: <CalendarCheck />,
    },
    {
      label: 'الأماكن المتبقية',
      value: stats.remainingSeatsToday,
      tone: stats.remainingSeatsToday === 0 ? 'destructive' : 'success',
      icon: <CalendarCheck />,
    },
    {
      label: 'مكوّنات نافدة',
      value: stats.outOfStockCount,
      hint: stats.lowStockCount > 0 ? `${stats.lowStockCount} بكمية محدودة` : undefined,
      tone: stats.outOfStockCount > 0 ? 'destructive' : 'success',
      icon: <PackageX />,
    },
    { label: 'عدد الطلاب المسجّلين', value: stats.studentsCount, icon: <Users /> },
  ];
}

export function OverviewStatCards({
  stats,
  isLoading,
}: {
  stats?: OverviewStats;
  isLoading: boolean;
}) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {toTiles(stats).map((tile) => (
        <StatCard
          key={tile.label}
          label={tile.label}
          value={tile.value}
          hint={tile.hint}
          tone={tile.tone}
          isLoading={isLoading}
          icon={tile.icon}
        />
      ))}
    </section>
  );
}

/**
 * Names the components that need restocking rather than just counting them.
 *
 * Stock resets each period, so the signal is the busiest single session: a part
 * that ran out at peak is the one to buy more of.
 */
export function StockAlert({ rows }: { rows: ComponentUsageRow[] }) {
  const spareAtPeak = (row: ComponentUsageRow): number =>
    row.totalQuantity - row.peakSessionDemand;

  const empty = rows.filter((row) => spareAtPeak(row) <= 0);
  const low = rows.filter(
    (row) =>
      spareAtPeak(row) > 0 && spareAtPeak(row) / Math.max(1, row.totalQuantity) <= LOW_STOCK_RATIO,
  );

  if (empty.length === 0 && low.length === 0) return null;

  return (
    <Alert variant={empty.length > 0 ? 'destructive' : 'warning'}>
      <TriangleAlert aria-hidden />
      <AlertTitle>تنبيه المخزون</AlertTitle>
      <AlertDescription>
        {empty.length > 0 ? (
          <span>نفدت الكمية من: {empty.map((row) => row.name).join('، ')}</span>
        ) : null}
        {low.length > 0 ? (
          <span>كمية محدودة من: {low.map((row) => row.name).join('، ')}</span>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
