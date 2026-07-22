'use client';

import { MAX_GROUP_MEMBERS, type CreateBookingInput } from '@arduino-lab/contracts';
import { Alert, AlertDescription, Button, Card } from '@arduino-lab/ui';
import { Plus, Trash2, TriangleAlert } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import { FormField } from '@/components/auth/form-field';

export function StepMembers() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<CreateBookingInput>();

  const { fields, append, remove } = useFieldArray({ control, name: 'members' });
  const canAdd = fields.length < MAX_GROUP_MEMBERS;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          عدد الطلاب: <span className="text-foreground font-semibold tabular-nums">{fields.length}</span>{' '}
          من {MAX_GROUP_MEMBERS}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => append({ fullName: '' })} disabled={!canAdd}>
          <Plus aria-hidden />
          إضافة طالب
        </Button>
      </div>

      {typeof errors.members?.message === 'string' ? (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden />
          <AlertDescription>{errors.members.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <Card key={field.id} className="gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-sm font-medium">
                الطالب {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`حذف الطالب ${index + 1}`}
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="text-destructive" aria-hidden />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label="الاسم الكامل"
                required
                error={errors.members?.[index]?.fullName}
                {...register(`members.${index}.fullName`)}
              />
              <FormField
                label="الرقم الجامعي"
                dir="ltr"
                className="text-start"
                hint="اختياري"
                error={errors.members?.[index]?.studentCode}
                {...register(`members.${index}.studentCode`)}
              />
            </div>
          </Card>
        ))}
      </div>

      {!canAdd ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden />
          <AlertDescription>
            وصلت للحد الأقصى: {MAX_GROUP_MEMBERS} طلاب في المجموعة الواحدة.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
