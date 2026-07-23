'use client';

import {
  ApiError,
  createSlotSchema,
  type CreateSlotInput,
  type SlotAvailability,
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
  toast,
} from '@arduino-lab/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { api } from '@/lib/api';

const DEFAULT_SLOT: CreateSlotInput = {
  label: '',
  startTime: '11:00',
  endTime: '12:00',
  capacity: 5,
};

/** Create and edit share one form; only the submit target differs. */
export function SlotDialog({
  slot,
  open,
  onOpenChange,
}: {
  slot?: SlotAvailability;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState<string | null>(null);
  const isEditing = Boolean(slot);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSlotInput>({ resolver: zodResolver(createSlotSchema) });

  React.useEffect(() => {
    if (!open) return;
    setFormError(null);
    reset(
      slot
        ? {
            label: slot.label,
            startTime: slot.startTime,
            endTime: slot.endTime,
            capacity: slot.capacity,
          }
        : DEFAULT_SLOT,
    );
  }, [open, slot, reset]);

  const save = useMutation({
    mutationFn: (values: CreateSlotInput) =>
      slot ? api.slots.update(slot.id, values) : api.slots.create(values),
    onSuccess: async () => {
      toast.success(isEditing ? 'تم حفظ التعديلات.' : 'تمت إضافة الفترة.');
      await queryClient.invalidateQueries({ queryKey: ['slots'] });
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
          <DialogTitle>{isEditing ? 'تعديل الفترة' : 'إضافة فترة'}</DialogTitle>
          <DialogDescription>
            الاسم هو ما يراه الطالب في صفحة الحجز، والسعة هي عدد المجموعات المسموح بها في الفترة.
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

          <Field id="label" label="اسم الفترة" required error={errors.label?.message}>
            <Input id="label" placeholder="مثال: 11-12" {...register('label')} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="startTime" label="من" required error={errors.startTime?.message}>
              <Input id="startTime" type="time" dir="ltr" {...register('startTime')} />
            </Field>

            <Field id="endTime" label="إلى" required error={errors.endTime?.message}>
              <Input id="endTime" type="time" dir="ltr" {...register('endTime')} />
            </Field>
          </div>

          <Field
            id="capacity"
            label="عدد المجموعات"
            required
            error={errors.capacity?.message}
          >
            <Input id="capacity" type="number" min={1} max={50} {...register('capacity')} />
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
