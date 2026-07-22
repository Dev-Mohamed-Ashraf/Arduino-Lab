'use client';

import { Input, Label, cn } from '@arduino-lab/ui';
import * as React from 'react';
import type { FieldError } from 'react-hook-form';

interface FormFieldProps extends React.ComponentProps<'input'> {
  label: string;
  error?: FieldError;
  hint?: string;
  required?: boolean;
}

/**
 * Label + input + message, wired for accessibility.
 *
 * `aria-describedby` and `aria-invalid` are set here so no caller can forget
 * them, which is the usual way an Arabic form ends up unusable with a screen
 * reader.
 */
export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, error, hint, required, id, className, ...props },
  ref,
) {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId} required={required}>
        {label}
      </Label>
      <Input
        id={fieldId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(className)}
        {...props}
      />
      {error ? (
        <p id={messageId} className="text-destructive text-sm" role="alert">
          {error.message}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
