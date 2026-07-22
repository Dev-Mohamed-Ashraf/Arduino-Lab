'use client';

import type { CreateBookingInput } from '@arduino-lab/contracts';
import * as React from 'react';
import type { UseFormReturn } from 'react-hook-form';

const DRAFT_KEY = 'arduino-lab.booking-draft';

export type BookingDraft = Partial<CreateBookingInput>;

/**
 * Keeps the in-progress booking in sessionStorage.
 *
 * The wizard is six steps long and includes an image upload; a stray refresh or
 * a phone switching apps would otherwise throw all of it away. sessionStorage
 * rather than localStorage so the draft dies with the tab and never resurfaces
 * for the next person on a shared lab machine.
 */
export function useBookingDraft(form: UseFormReturn<CreateBookingInput>): { clear: () => void } {
  const { reset, watch } = form;
  const [isRestored, setIsRestored] = React.useState(false);

  React.useEffect(() => {
    const saved = readDraft();
    if (saved) {
      reset(saved as CreateBookingInput, { keepDefaultValues: true });
    }
    setIsRestored(true);
  }, [reset]);

  React.useEffect(() => {
    // Writing before the restore lands would overwrite the saved draft with the
    // empty defaults the form starts from.
    if (!isRestored) return;

    const subscription = watch((values) => {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(values));
    });

    return () => subscription.unsubscribe();
  }, [watch, isRestored]);

  const clear = React.useCallback(() => {
    window.sessionStorage.removeItem(DRAFT_KEY);
  }, []);

  return { clear };
}

function readDraft(): BookingDraft | null {
  if (typeof window === 'undefined') return null;

  const raw = window.sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as BookingDraft;
  } catch {
    window.sessionStorage.removeItem(DRAFT_KEY);
    return null;
  }
}
