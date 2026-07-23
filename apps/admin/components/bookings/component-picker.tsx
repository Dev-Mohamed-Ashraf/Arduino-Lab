'use client';

import type { Component, ComponentRequest } from '@arduino-lab/contracts';
import { Badge, Button, Card, Input, Skeleton, StockBadge } from '@arduino-lab/ui';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus, Search } from 'lucide-react';
import * as React from 'react';

import { api } from '@/lib/api';

/**
 * Component selector for the admin edit form.
 *
 * Availability is read for the booking's own session, since stock resets each
 * period. `alreadyHeld` is what this booking takes in that session; those units
 * are added back because the server excludes the edited booking from its own
 * check — without that an admin could not raise a quantity on a component this
 * very booking already took.
 */
export function ComponentPicker({
  value,
  alreadyHeld,
  bookingDate,
  timeSlotId,
  onChange,
}: {
  value: ComponentRequest[];
  alreadyHeld: Map<string, number>;
  bookingDate: string;
  timeSlotId: string;
  onChange: (next: ComponentRequest[]) => void;
}) {
  const [search, setSearch] = React.useState('');

  const { data, isPending } = useQuery({
    queryKey: ['components', 'picker', bookingDate, timeSlotId],
    queryFn: () =>
      api.components.list({ pageSize: 100, date: bookingDate, timeSlotId }),
  });

  const selected = new Map(value.map((item) => [item.componentId, item.quantity]));

  /** Free in this session, plus what this booking gives back, capped by the rule. */
  function ceilingFor(component: Component): number {
    const free = component.availableQuantity + (alreadyHeld.get(component.id) ?? 0);
    return Math.min(free, component.maxPerBooking);
  }

  function setQuantity(component: Component, quantity: number): void {
    const clamped = Math.max(0, Math.min(quantity, ceilingFor(component)));
    const others = value.filter((item) => item.componentId !== component.id);

    onChange(clamped === 0 ? others : [...others, { componentId: component.id, quantity: clamped }]);
  }

  const visible = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const items = data?.items ?? [];
    return term ? items.filter((item) => item.name.toLowerCase().includes(term)) : items;
  }, [data, search]);

  if (isPending) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث عن مكوّن…"
          className="ps-9"
          aria-label="ابحث عن مكوّن"
        />
      </div>

      <ul className="max-h-72 space-y-2 overflow-y-auto pe-1">
        {visible.map((component) => {
          const quantity = selected.get(component.id) ?? 0;
          const ceiling = ceilingFor(component);

          return (
            <li key={component.id}>
              <Card className="flex-row items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{component.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StockBadge status={component.status} />
                    <Badge variant="outline" className="tabular-nums">
                      يمكن حجز: {ceiling}
                    </Badge>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label={`إنقاص ${component.name}`}
                    onClick={() => setQuantity(component, quantity - 1)}
                    disabled={quantity === 0}
                  >
                    <Minus aria-hidden />
                  </Button>
                  <span className="w-9 text-center text-sm font-semibold tabular-nums">
                    {quantity}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label={`زيادة ${component.name}`}
                    onClick={() => setQuantity(component, quantity + 1)}
                    disabled={quantity >= ceiling}
                  >
                    <Plus aria-hidden />
                  </Button>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
