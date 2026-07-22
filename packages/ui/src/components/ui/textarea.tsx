import * as React from 'react';

import { cn } from '../../lib/cn';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-input bg-background text-foreground placeholder:text-muted-foreground',
        'flex min-h-24 w-full rounded-md border px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/25 aria-invalid:ring-[3px]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'field-sizing-content resize-y md:text-sm',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
