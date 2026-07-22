'use client';

import type { ExportQuery } from '@arduino-lab/contracts';
import {
  Button,
  Card,
  ErrorState,
  PageHeader,
  Skeleton,
  StockBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@arduino-lab/ui';
import { addDays, todayIso } from '@arduino-lab/web';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import * as React from 'react';

import { DatePicker } from '@/components/date-picker';
import { SlotUtilisationChart, TopComponentsChart } from '@/components/reports/usage-chart';
import { api } from '@/lib/api';
import { downloadReportCsv } from '@/lib/download-csv';

export default function ReportsPage() {
  const [from, setFrom] = React.useState(() => addDays(todayIso(), -30));
  const [to, setTo] = React.useState(todayIso);

  const range = { from, to };

  const usage = useQuery({
    queryKey: ['reports', 'usage', from, to],
    queryFn: () => api.reports.componentsUsage(range),
  });

  const utilisation = useQuery({
    queryKey: ['reports', 'utilisation', from, to],
    queryFn: () => api.reports.slotUtilisation(range),
  });

  const stock = useQuery({
    queryKey: ['reports', 'stock'],
    queryFn: () => api.reports.stock(),
  });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title="التقارير" description="استخدام المكوّنات وإشغال الفترات والمخزون." />

      <Card className="flex-row flex-wrap items-end gap-4 p-4">
        <DatePicker id="from" label="من تاريخ" value={from} onChange={setFrom} max={to} />
        <DatePicker id="to" label="إلى تاريخ" value={to} onChange={setTo} min={from} />
      </Card>

      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="usage">استخدام المكوّنات</TabsTrigger>
          <TabsTrigger value="utilisation">إشغال الفترات</TabsTrigger>
          <TabsTrigger value="stock">المخزون</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-4">
          <ExportButton query={{ type: 'components-usage', from, to }} />
          {usage.isError ? (
            <ErrorState onRetry={() => void usage.refetch()} />
          ) : usage.isPending ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <>
              <TopComponentsChart rows={usage.data} />
              <UsageTable rows={usage.data} />
            </>
          )}
        </TabsContent>

        <TabsContent value="utilisation" className="space-y-4">
          <ExportButton query={{ type: 'slot-utilization', from, to }} />
          {utilisation.isError ? (
            <ErrorState onRetry={() => void utilisation.refetch()} />
          ) : utilisation.isPending ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <>
              <SlotUtilisationChart rows={utilisation.data} />
              <Card className="overflow-hidden py-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الفترة</TableHead>
                      <TableHead className="w-32">عدد الحجوزات</TableHead>
                      <TableHead className="w-32">السعة الإجمالية</TableHead>
                      <TableHead className="w-28">الإشغال</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {utilisation.data.map((row) => (
                      <TableRow key={row.timeSlotId}>
                        <TableCell className="tabular-nums">{row.label}</TableCell>
                        <TableCell className="tabular-nums">{row.totalBookings}</TableCell>
                        <TableCell className="tabular-nums">{row.totalCapacity}</TableCell>
                        <TableCell className="font-semibold tabular-nums">
                          {row.utilisationPercent}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          <ExportButton query={{ type: 'stock' }} />
          {stock.isError ? (
            <ErrorState onRetry={() => void stock.refetch()} />
          ) : stock.isPending ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <Card className="overflow-hidden py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المكوّن</TableHead>
                    <TableHead className="w-24">الكلية</TableHead>
                    <TableHead className="w-24">المحجوز</TableHead>
                    <TableHead className="w-24">المتاح</TableHead>
                    <TableHead className="w-36">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock.data.map((row) => (
                    <TableRow key={row.componentId}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="tabular-nums">{row.totalQuantity}</TableCell>
                      <TableCell className="tabular-nums">{row.currentlyReserved}</TableCell>
                      <TableCell className="font-semibold tabular-nums">
                        {row.availableQuantity}
                      </TableCell>
                      <TableCell>
                        <StockBadge status={toStatus(row.availableQuantity, row.totalQuantity)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UsageTable({ rows }: { rows: { componentId: string; name: string; timesRequested: number; totalQuantityRequested: number; availableQuantity: number }[] }) {
  const requested = rows.filter((row) => row.timesRequested > 0);

  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المكوّن</TableHead>
            <TableHead className="w-32">مرات الطلب</TableHead>
            <TableHead className="w-36">إجمالي الكمية</TableHead>
            <TableHead className="w-24">المتاح</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requested.map((row) => (
            <TableRow key={row.componentId}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="tabular-nums">{row.timesRequested}</TableCell>
              <TableCell className="tabular-nums">{row.totalQuantityRequested}</TableCell>
              <TableCell className="tabular-nums">{row.availableQuantity}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function ExportButton({ query }: { query: ExportQuery }) {
  const [isExporting, setIsExporting] = React.useState(false);

  async function handleClick(): Promise<void> {
    setIsExporting(true);
    try {
      await downloadReportCsv(query);
    } catch {
      toast.error('تعذّر تصدير الملف.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button variant="outline" isLoading={isExporting} onClick={() => void handleClick()}>
      <Download aria-hidden />
      تصدير CSV
    </Button>
  );
}

function toStatus(available: number, total: number): 'available' | 'low' | 'out' {
  if (available <= 0) return 'out';
  if (total > 0 && available / total <= 0.25) return 'low';
  return 'available';
}
