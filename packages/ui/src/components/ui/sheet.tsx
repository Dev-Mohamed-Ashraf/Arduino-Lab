'use client';

import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/cn';

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

/**
 * Side panel used for mobile navigation and filter drawers.
 *
 * `side="start"` / `"end"` are logical: under RTL the panel slides in from the
 * right, matching where the reader expects it.
 */
function SheetContent({
  className,
  children,
  side = 'end',
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: 'start' | 'end' | 'top' | 'bottom';
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay
        className={cn(
          'fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        )}
      />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          'bg-background fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
          // Positioning is logical (inset-inline), but the slide keyframes are
          // physical — tw-animate-css has no logical variant — so the direction
          // is selected with the rtl:/ltr: variants.
          side === 'end' &&
            cn(
              'inset-y-0 end-0 h-full w-3/4 border-s sm:max-w-sm',
              'ltr:data-[state=open]:slide-in-from-right ltr:data-[state=closed]:slide-out-to-right',
              'rtl:data-[state=open]:slide-in-from-left rtl:data-[state=closed]:slide-out-to-left',
            ),
          side === 'start' &&
            cn(
              'inset-y-0 start-0 h-full w-3/4 border-e sm:max-w-sm',
              'ltr:data-[state=open]:slide-in-from-left ltr:data-[state=closed]:slide-out-to-left',
              'rtl:data-[state=open]:slide-in-from-right rtl:data-[state=closed]:slide-out-to-right',
            ),
          side === 'top' &&
            'inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
          side === 'bottom' &&
            'inset-x-0 bottom-0 h-auto border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          className={cn(
            'absolute top-4 end-4 rounded-sm p-1 opacity-70 transition-opacity',
            'hover:opacity-100 focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
          )}
        >
          <X className="size-4" />
          <span className="sr-only">إغلاق</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-header" className={cn('flex flex-col gap-1.5 p-4', className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-footer" className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-foreground font-semibold', className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger };
