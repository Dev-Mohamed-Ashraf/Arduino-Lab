'use client';

import { ApiError, type Component } from '@arduino-lab/contracts';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Skeleton,
  StockBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@arduino-lab/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PackageSearch, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import * as React from 'react';

import { ComponentDialog } from '@/components/components/component-dialog';
import { api } from '@/lib/api';

export default function ComponentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [editing, setEditing] = React.useState<Component | undefined>();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['components', 'admin', search],
    queryFn: () =>
      api.components.list({ search: search || undefined, includeInactive: true, pageSize: 100 }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.components.remove(id),
    onSuccess: async (result) => {
      toast.success(
        (result as unknown as { deleted: boolean }).deleted
          ? 'تم حذف المكوّن.'
          : 'تم تعطيل المكوّن لارتباطه بحجوزات سابقة.',
      );
      await queryClient.invalidateQueries({ queryKey: ['components'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'تعذّر الحذف.');
    },
  });

  function openCreate(): void {
    setEditing(undefined);
    setIsDialogOpen(true);
  }

  function openEdit(component: Component): void {
    setEditing(component);
    setIsDialogOpen(true);
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="المكوّنات"
        description="إدارة المخزون والكميات المتاحة."
        action={
          <Button onClick={openCreate}>
            <Plus aria-hidden />
            إضافة مكوّن
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث بالاسم أو الكود…"
          className="ps-9"
          aria-label="ابحث عن مكوّن"
        />
      </div>

      {isError ? (
        <ErrorState description="تعذّر تحميل المكوّنات." onRetry={() => void refetch()} />
      ) : isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : items.length === 0 ? (
        <EmptyState icon={<PackageSearch />} title="لا توجد مكوّنات" description="أضف أول مكوّن." />
      ) : (
        <>
          <Card className="hidden overflow-hidden py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المكوّن</TableHead>
                  <TableHead className="w-24">الكلية</TableHead>
                  <TableHead className="w-24">المحجوز</TableHead>
                  <TableHead className="w-24">المتاح</TableHead>
                  <TableHead className="w-36">الحالة</TableHead>
                  <TableHead className="w-28">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((component) => (
                  <TableRow key={component.id} className={component.isActive ? undefined : 'opacity-60'}>
                    <TableCell>
                      <div className="font-medium">{component.name}</div>
                      {component.sku ? (
                        <div className="text-muted-foreground text-xs" dir="ltr">
                          {component.sku}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="tabular-nums">{component.totalQuantity}</TableCell>
                    <TableCell className="tabular-nums">{component.reservedQuantity}</TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {component.availableQuantity}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <StockBadge status={component.status} />
                        {!component.isActive ? <Badge variant="secondary">معطّل</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <RowActions
                        component={component}
                        onEdit={() => openEdit(component)}
                        onDelete={() => remove.mutate(component.id)}
                        isDeleting={remove.isPending && remove.variables === component.id}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 md:hidden">
            {items.map((component) => (
              <Card key={component.id} className="gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{component.name}</p>
                    {component.sku ? (
                      <p className="text-muted-foreground text-xs" dir="ltr">
                        {component.sku}
                      </p>
                    ) : null}
                  </div>
                  <StockBadge status={component.status} />
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant="outline" className="tabular-nums">
                    المتاح: {component.availableQuantity}
                  </Badge>
                  <Badge variant="secondary" className="tabular-nums">
                    المحجوز: {component.reservedQuantity}
                  </Badge>
                </div>
                <RowActions
                  component={component}
                  onEdit={() => openEdit(component)}
                  onDelete={() => remove.mutate(component.id)}
                  isDeleting={remove.isPending && remove.variables === component.id}
                />
              </Card>
            ))}
          </div>
        </>
      )}

      <ComponentDialog component={editing} open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}

function RowActions({
  component,
  onEdit,
  onDelete,
  isDeleting,
}: {
  component: Component;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon-sm" aria-label={`تعديل ${component.name}`} onClick={onEdit}>
        <Pencil aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`حذف ${component.name}`}
        isLoading={isDeleting}
        onClick={() => {
          if (window.confirm(`حذف "${component.name}"؟`)) onDelete();
        }}
      >
        <Trash2 className="text-destructive" aria-hidden />
      </Button>
    </div>
  );
}
