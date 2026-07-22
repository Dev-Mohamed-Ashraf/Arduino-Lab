'use client';

import { PROJECT_DESCRIPTION_MAX_LENGTH, type CreateBookingInput } from '@arduino-lab/contracts';
import { Label, Textarea } from '@arduino-lab/ui';
import { useFormContext } from 'react-hook-form';

import { FormField } from '@/components/auth/form-field';

export function StepProject() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<CreateBookingInput>();

  const description = watch('projectDescription') ?? '';

  return (
    <div className="space-y-4">
      <FormField
        label="اسم فكرة المشروع"
        required
        error={errors.projectTitle}
        hint="مثال: نظام ري ذكي يعتمد على رطوبة التربة"
        {...register('projectTitle')}
      />

      <div className="space-y-1.5">
        <Label htmlFor="projectDescription" required>
          وصف مختصر للمشروع
        </Label>
        <Textarea
          id="projectDescription"
          rows={5}
          aria-invalid={errors.projectDescription ? true : undefined}
          aria-describedby="projectDescription-message"
          {...register('projectDescription')}
        />
        <div className="flex items-start justify-between gap-3">
          <p id="projectDescription-message" className="text-sm">
            {errors.projectDescription ? (
              <span className="text-destructive" role="alert">
                {errors.projectDescription.message}
              </span>
            ) : (
              <span className="text-muted-foreground text-xs">
                اشرح فكرة المشروع وكيف يعمل في سطور قليلة.
              </span>
            )}
          </p>
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {description.length} / {PROJECT_DESCRIPTION_MAX_LENGTH}
          </span>
        </div>
      </div>
    </div>
  );
}
