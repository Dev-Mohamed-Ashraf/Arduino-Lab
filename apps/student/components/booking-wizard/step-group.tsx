'use client';

import type { CreateBookingInput } from '@arduino-lab/contracts';
import { Alert, AlertDescription } from '@arduino-lab/ui';
import { Info } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

import { FormField } from '@/components/auth/form-field';

export function StepGroup() {
  const {
    register,
    formState: { errors },
  } = useFormContext<CreateBookingInput>();

  return (
    <div className="space-y-4">
      <FormField
        label="رقم المجموعة"
        type="number"
        inputMode="numeric"
        min={1}
        max={999}
        required
        error={errors.groupNumber}
        hint="الرقم الذي حدّده لكم فريق التدريس"
        {...register('groupNumber')}
      />

      <Alert variant="info">
        <Info aria-hidden />
        <AlertDescription>
          لا يمكن أن تحمل مجموعتان الرقم نفسه في الفترة والتاريخ نفسيهما.
        </AlertDescription>
      </Alert>
    </div>
  );
}
