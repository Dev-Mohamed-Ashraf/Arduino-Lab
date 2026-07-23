'use client';

import type { Component } from '@arduino-lab/contracts';
import {
  Badge,
  Card,
  EmptyState,
  Input,
  StockBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
} from '@arduino-lab/ui';
import { PackageSearch, Search } from 'lucide-react';
import * as React from 'react';

/**
 * Inventory list.
 *
 * Shows what the lab owns, not what is free right now: stock is per session, so
 * a single "available" number means nothing outside a chosen date and period.
 * The live figure appears in the booking wizard once the period is picked.
 *
 * Rendered as a table from `md` up and as cards below it — a horizontally
 * scrolling table is unusable on a phone, which is where most students will
 * check the inventory before coming to the lab.
 */
export function ComponentsPanel({ components }: { components: Component[] }) {
  const [search, setSearch] = React.useState('');
  const [availableOnly, setAvailableOnly] = React.useState(false);

  const visible = React.useMemo(() => {
    const term = search.trim().toLowerCase();

    return components.filter((component) => {
      if (availableOnly && component.status === 'out') return false;
      if (!term) return true;

      return (
        component.name.toLowerCase().includes(term) ||
        (component.sku?.toLowerCase().includes(term) ?? false) ||
        (component.description?.includes(term) ?? false)
      );
    });
  }, [components, search, availableOnly]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold sm:text-xl">مكوّنات المعمل</h2>
          <p className="text-muted-foreground text-sm">
            المكوّنات ترجع للمعمل بعد كل فترة — المتاح فعليًا يظهر لك بعد اختيار الموعد.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث عن مكوّن…"
              className="ps-9 sm:w-64"
              aria-label="ابحث عن مكوّن"
            />
          </div>

          <Button
            variant={availableOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAvailableOnly((value) => !value)}
            aria-pressed={availableOnly}
          >
            الموجود فقط
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<PackageSearch />}
          title="لا توجد نتائج"
          description="جرّب كلمة بحث أخرى أو ألغِ الفلترة."
        />
      ) : (
        <>
          <Card className="hidden overflow-hidden py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المكوّن</TableHead>
                  <TableHead className="w-32">الكمية بالمعمل</TableHead>
                  <TableHead className="w-36">الحد لكل مجموعة</TableHead>
                  <TableHead className="w-36">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((component) => (
                  <TableRow key={component.id}>
                    <TableCell>
                      <div className="font-medium">{component.name}</div>
                      {component.description ? (
                        <div className="text-muted-foreground text-xs">{component.description}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {component.totalQuantity}
                    </TableCell>
                    <TableCell className="tabular-nums">{component.maxPerBooking}</TableCell>
                    <TableCell>
                      <StockBadge status={component.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 md:hidden">
            {visible.map((component) => (
              <Card key={component.id} className="gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{component.name}</p>
                    {component.description ? (
                      <p className="text-muted-foreground text-xs">{component.description}</p>
                    ) : null}
                  </div>
                  <StockBadge status={component.status} />
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="tabular-nums">
                    بالمعمل: {component.totalQuantity}
                  </Badge>
                  <Badge variant="secondary" className="tabular-nums">
                    الحد لكل مجموعة: {component.maxPerBooking}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <p className="text-muted-foreground text-sm">
        عدد المكوّنات المعروضة: <span className="tabular-nums">{visible.length}</span> من{' '}
        <span className="tabular-nums">{components.length}</span>
      </p>
    </section>
  );
}
