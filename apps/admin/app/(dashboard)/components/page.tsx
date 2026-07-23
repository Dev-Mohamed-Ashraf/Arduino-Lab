'use client';

import { ApiError, type Component, type UpdateComponentInput } from '@arduino-lab/contracts';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@arduino-lab/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, PackageSearch, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import * as React from 'react';

import { ComponentDialog } from '@/components/components/component-dialog';
import { InlineNumberField } from '@/components/components/inline-number-field';
import { api } from '@/lib/api';

const MAX_TOTAL_QUANTITY = 100_000;
const MAX_PER_BOOKING_CEILING = 1000;

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

  const update = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: UpdateComponentInput }) =>
      api.components.update(id, changes),
    onSuccess: async () => {
      toast.success('تم حفظ التغيير.');
      await queryClient.invalidateQueries({ queryKey: ['components'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'تعذّر حفظ التغيير.');
    },
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

  function rowProps(component: Component) {
    return {
      component,
      isSaving: update.isPending && update.variables?.id === component.id,
      onSave: (changes: UpdateComponentInput) => update.mutate({ id: component.id, changes }),
      onEdit: () => openEdit(component),
      onDelete: () => remove.mutate(component.id),
      isDeleting: remove.isPending && remove.variables === component.id,
    };
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="المكوّنات"
        description="عدّل الكميات والحدود مباشرة من الجدول."
        action={
          <Button onClick={openCreate}>
            <Plus aria-hidden />
            إضافة مكوّن
          </Button>
        }
      />

      <Alert variant="info">
        <Info aria-hidden />
        <AlertDescription>
          المكوّنات ترجع للمعمل بعد كل فترة: المجموعات تتنافس على الكمية داخل نفس الفترة واليوم
          فقط، وكل فترة جديدة تبدأ بالكمية كاملة.
        </AlertDescription>
      </Alert>

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
                  <TableHead className="w-32">الكمية بالمعمل</TableHead>
                  <TableHead className="w-36">الحد لكل مجموعة</TableHead>
                  <TableHead className="w-24">الحالة</TableHead>
                  <TableHead className="w-28">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((component) => (
                  <ComponentRow key={component.id} {...rowProps(component)} />
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 md:hidden">
            {items.map((component) => (
              <ComponentCard key={component.id} {...rowProps(component)} />
            ))}
          </div>
        </>
      )}

      <ComponentDialog component={editing} open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}

interface RowProps {
  component: Component;
  isSaving: boolean;
  onSave: (changes: UpdateComponentInput) => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function ComponentRow({ component, isSaving, onSave, onEdit, onDelete, isDeleting }: RowProps) {
  return (
    <TableRow className={component.isActive ? undefined : 'opacity-60'}>
      <TableCell>
        <div className="font-medium">{component.name}</div>
        {component.sku ? (
          <div className="text-muted-foreground text-xs" dir="ltr">
            {component.sku}
          </div>
        ) : null}
      </TableCell>
      <TableCell>
        <InlineNumberField
          label={`الكمية بالمعمل من ${component.name}`}
          value={component.totalQuantity}
          min={0}
          max={MAX_TOTAL_QUANTITY}
          isSaving={isSaving}
          onSave={(totalQuantity) => onSave({ totalQuantity })}
        />
      </TableCell>
      <TableCell>
        <InlineNumberField
          label={`الحد لكل مجموعة من ${component.name}`}
          value={component.maxPerBooking}
          min={1}
          max={MAX_PER_BOOKING_CEILING}
          isSaving={isSaving}
          onSave={(maxPerBooking) => onSave({ maxPerBooking })}
        />
      </TableCell>
      <TableCell>
        <Badge variant={component.isActive ? 'success' : 'secondary'}>
          {component.isActive ? 'مفعّل' : 'معطّل'}
        </Badge>
      </TableCell>
      <TableCell>
        <RowActions
          component={component}
          onEdit={onEdit}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
      </TableCell>
    </TableRow>
  );
}

function ComponentCard({ component, isSaving, onSave, onEdit, onDelete, isDeleting }: RowProps) {
  return (
    <Card className={`gap-3 p-4 ${component.isActive ? '' : 'opacity-60'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{component.name}</p>
          {component.sku ? (
            <p className="text-muted-foreground text-xs" dir="ltr">
              {component.sku}
            </p>
          ) : null}
        </div>
        <Badge variant={component.isActive ? 'success' : 'secondary'}>
          {component.isActive ? 'مفعّل' : 'معطّل'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">الكمية بالمعمل</p>
          <InlineNumberField
            label={`الكمية بالمعمل من ${component.name}`}
            value={component.totalQuantity}
            min={0}
            max={MAX_TOTAL_QUANTITY}
            isSaving={isSaving}
            onSave={(totalQuantity) => onSave({ totalQuantity })}
          />
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">الحد لكل مجموعة</p>
          <InlineNumberField
            label={`الحد لكل مجموعة من ${component.name}`}
            value={component.maxPerBooking}
            min={1}
            max={MAX_PER_BOOKING_CEILING}
            isSaving={isSaving}
            onSave={(maxPerBooking) => onSave({ maxPerBooking })}
          />
        </div>
      </div>

      <RowActions
        component={component}
        onEdit={onEdit}
        onDelete={onDelete}
        isDeleting={isDeleting}
      />
    </Card>
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
