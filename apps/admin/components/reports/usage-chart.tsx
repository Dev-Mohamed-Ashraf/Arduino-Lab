'use client';

import type { ComponentUsageRow, SlotUtilisationRow } from '@arduino-lab/contracts';
import { Card } from '@arduino-lab/ui';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

const AXIS_STYLE = { fontSize: 12, fill: 'var(--color-muted-foreground)' } as const;

/**
 * Recharts renders SVG, which ignores the document direction, so the category
 * axis is reversed explicitly to read right to left.
 */
export function SlotUtilisationChart({ rows }: { rows: SlotUtilisationRow[] }) {
  return (
    <Card className="p-4">
      <h3 className="mb-4 font-semibold">نسبة إشغال الفترات</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" reversed tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <YAxis
              orientation="right"
              domain={[0, 100]}
              unit="%"
              tick={AXIS_STYLE}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              cursor={{ fill: 'var(--color-muted)' }}
              contentStyle={tooltipStyle}
              formatter={(value: number) => [`${value}%`, 'الإشغال']}
            />
            <Bar dataKey="utilisationPercent" radius={[6, 6, 0, 0]}>
              {rows.map((row, index) => (
                <Cell key={row.timeSlotId} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function TopComponentsChart({ rows }: { rows: ComponentUsageRow[] }) {
  const top = [...rows]
    .sort((a, b) => b.totalQuantityRequested - a.totalQuantityRequested)
    .slice(0, 10)
    .reverse();

  return (
    <Card className="p-4">
      <h3 className="mb-4 font-semibold">أكثر 10 مكوّنات طلبًا</h3>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top} layout="vertical" margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
            <XAxis type="number" reversed tick={AXIS_STYLE} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              orientation="right"
              width={150}
              tick={AXIS_STYLE}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: 'var(--color-muted)' }}
              contentStyle={tooltipStyle}
              formatter={(value: number) => [value, 'إجمالي الكمية']}
            />
            <Bar
              dataKey="totalQuantityRequested"
              fill="var(--color-chart-1)"
              radius={[0, 6, 6, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

const tooltipStyle = {
  backgroundColor: 'var(--color-popover)',
  border: '1px solid var(--color-border)',
  borderRadius: '0.5rem',
  fontSize: 12,
  direction: 'rtl' as const,
};
