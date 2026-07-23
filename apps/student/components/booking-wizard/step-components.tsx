'use client';

import type { Component, CreateBookingInput } from '@arduino-lab/contracts';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Skeleton,
  StockBadge,
} from '@arduino-lab/ui';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, Minus, PackageSearch, Plus, Search, TriangleAlert } from 'lucide-react';
import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { api } from '@/lib/api';

/** Availability is re-read while the student browses so the numbers stay honest. */
const AVAILABILITY_REFETCH_MS = 15_000;

export function StepComponents() {
  const { setValue, watch, formState } = useFormContext<CreateBookingInput>();
  const [search, setSearch] = React.useState('');

  const bookingDate = watch('bookingDate');
  const timeSlotId = watch('timeSlotId');
  const selected = watch('components') ?? [];
  const selectedById = new Map(selected.map((item) => [item.componentId, item.quantity]));

  // Stock is per session, so availability is only meaningful once the period is
  // known — which is why the slot step comes first. See plans/13-per-slot-stock.md.
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['components', 'session', bookingDate, timeSlotId],
    queryFn: () => api.components.list({ pageSize: 100, date: bookingDate, timeSlotId }),
    enabled: Boolean(bookingDate && timeSlotId),
    refetchInterval: AVAILABILITY_REFETCH_MS,
  });

  /** A group may never take more than the lab allows, nor more than is free. */
  function ceilingFor(component: Component): number {
    return Math.min(component.availableQuantity, component.maxPerBooking);
  }

  function setQuantity(component: Component, quantity: number): void {
    const clamped = Math.max(0, Math.min(quantity, ceilingFor(component)));
    const others = selected.filter((item) => item.componentId !== component.id);

    setValue(
      'components',
      clamped === 0 ? others : [...others, { componentId: component.id, quantity: clamped }],
      { shouldValidate: true },
    );
  }

  const visible = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const items = data?.items ?? [];
    if (!term) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(term) || (item.description?.includes(term) ?? false),
    );
  }, [data, search]);

  if (!bookingDate || !timeSlotId) {
    return (
      <Alert variant="warning">
        <CalendarClock aria-hidden />
        <AlertDescription>اختر الموعد أولًا حتى نعرض لك المكوّنات المتاحة فيه.</AlertDescription>
      </Alert>
    );
  }

  if (isError) {
    return <ErrorState description="تعذّر تحميل قائمة المكوّنات." onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-4">
      <Alert variant="info">
        <CalendarClock aria-hidden />
        <AlertDescription>
          الأرقام دي للفترة اللي اخترتها. المكوّنات بترجع للمعمل بعد كل فترة، فاللي مش متاح
          هنا ممكن يكون متاح في فترة تانية.
        </AlertDescription>
      </Alert>

      <SelectionSummary
        selected={selected}
        components={data?.items ?? []}
        onRemove={(componentId) =>
          setValue(
            'components',
            selected.filter((item) => item.componentId !== componentId),
            { shouldValidate: true },
          )
        }
      />

      {typeof formState.errors.components?.message === 'string' ? (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden />
          <AlertDescription>{formState.errors.components.message}</AlertDescription>
        </Alert>
      ) : null}

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

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<PackageSearch />}
          title="لا توجد مكوّنات"
          description="جرّب كلمة أخرى، أو تواصل مع إدارة المعمل."
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((component) => (
            <ComponentRow
              key={component.id}
              component={component}
              quantity={selectedById.get(component.id) ?? 0}
              ceiling={ceilingFor(component)}
              onChange={(quantity) => setQuantity(component, quantity)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ComponentRow({
  component,
  quantity,
  ceiling,
  onChange,
}: {
  component: Component;
  quantity: number;
  ceiling: number;
  onChange: (quantity: number) => void;
}) {
  // A limit only worth showing when it is what actually stops the student.
  const isLimitedByRule = component.maxPerBooking < component.availableQuantity;

  return (
    <li>
      <Card className="flex-row items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{component.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StockBadge status={component.status} />
            <Badge variant="outline" className="tabular-nums">
              متاح في هذه الفترة: {component.availableQuantity}
            </Badge>
            {isLimitedByRule ? (
              <Badge variant="secondary" className="tabular-nums">
                الحد لمجموعتك: {component.maxPerBooking}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={`إنقاص كمية ${component.name}`}
            onClick={() => onChange(quantity - 1)}
            disabled={quantity === 0}
          >
            <Minus aria-hidden />
          </Button>
          <span className="w-10 text-center font-semibold tabular-nums" aria-live="polite">
            {quantity}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={`زيادة كمية ${component.name}`}
            onClick={() => onChange(quantity + 1)}
            disabled={quantity >= ceiling}
          >
            <Plus aria-hidden />
          </Button>
        </div>
      </Card>
    </li>
  );
}

function SelectionSummary({
  selected,
  components,
  onRemove,
}: {
  selected: { componentId: string; quantity: number }[];
  components: Component[];
  onRemove: (componentId: string) => void;
}) {
  if (selected.length === 0) {
    return (
      <Alert>
        <PackageSearch aria-hidden />
        <AlertDescription>اختر المكوّنات التي يحتاجها مشروعكم من القائمة بالأسفل.</AlertDescription>
      </Alert>
    );
  }

  const nameById = new Map(components.map((component) => [component.id, component.name]));

  return (
    <Card className="gap-2 p-4">
      <p className="text-sm font-medium">
        المكوّنات المختارة (<span className="tabular-nums">{selected.length}</span>)
      </p>
      <ul className="flex flex-wrap gap-2">
        {selected.map((item) => (
          <li key={item.componentId}>
            <Badge variant="secondary" className="gap-1.5 py-1">
              <span>{nameById.get(item.componentId) ?? '—'}</span>
              <span className="tabular-nums">× {item.quantity}</span>
              <button
                type="button"
                onClick={() => onRemove(item.componentId)}
                aria-label={`إزالة ${nameById.get(item.componentId) ?? ''}`}
                className="hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
