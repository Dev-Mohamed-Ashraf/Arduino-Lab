'use client';

import {
  ApiError,
  createComponentSchema,
  type Component,
  type CreateComponentInput,
} from '@arduino-lab/contracts';
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  toast,
} from '@arduino-lab/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { api } from '@/lib/api';

/** Create and edit share one form; only the submit target differs. */
export function ComponentDialog({
  component,
  open,
  onOpenChange,
}: {
  component?: Component;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<string | null>(null);
  const isEditing = Boolean(component);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateComponentInput>({ resolver: zodResolver(createComponentSchema) });

  React.useEffect(() => {
    if (!open) return;
    setFormError(null);
    reset({
      name: component?.name ?? '',
      sku: component?.sku ?? '',
      description: component?.description ?? '',
      totalQuantity: component?.totalQuantity ?? 0,
    });
  }, [open, component, reset]);

  const save = useMutation({
    mutationFn: (values: CreateComponentInput) =>
      component ? api.components.update(component.id, values) : api.components.create(values),
    onSuccess: async () => {
      toast.success(isEditing ? 'تم حفظ التعديلات.' : 'تمت إضافة المكوّن.');
      await queryClient.invalidateQueries({ queryKey: ['components'] });
      onOpenChange(false);
    },
    onError: (error) => {
      setFormError(error instanceof ApiError ? error.message : 'تعذّر الحفظ.');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل مكوّن' : 'إضافة مكوّن'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'لا يمكن تقليل الكمية الكلية لأقل من الكمية المحجوزة حاليًا.'
              : 'أدخل بيانات المكوّن الجديد وكميته في المخزون.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => save.mutate(values))}
          className="space-y-4"
          noValidate
        >
          {formError ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <Field id="name" label="اسم المكوّن" required error={errors.name?.message}>
            <Input id="name" {...register('name')} />
          </Field>

          <Field id="sku" label="الكود" error={errors.sku?.message}>
            <Input id="sku" dir="ltr" className="text-start" {...register('sku')} />
          </Field>

          <Field id="description" label="الوصف" error={errors.description?.message}>
            <Textarea id="description" rows={3} {...register('description')} />
          </Field>

          <Field
            id="totalQuantity"
            label="الكمية الكلية"
            required
            error={errors.totalQuantity?.message}
          >
            <Input id="totalQuantity" type="number" min={0} {...register('totalQuantity')} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" isLoading={save.isPending}>
              {isEditing ? 'حفظ' : 'إضافة'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
