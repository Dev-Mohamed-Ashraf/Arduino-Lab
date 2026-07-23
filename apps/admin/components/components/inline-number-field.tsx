'use client';

import { Button, Input } from '@arduino-lab/ui';
import { Check } from 'lucide-react';
import * as React from 'react';

/**
 * A number the admin can fix in place, without opening a dialog.
 *
 * The save button only appears once the value actually changed, so a table full
 * of these stays quiet until something is edited.
 */
export function InlineNumberField({
  label,
  value,
  min,
  max,
  isSaving,
  onSave,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  isSaving: boolean;
  onSave: (value: number) => void;
}) {
  const [draft, setDraft] = React.useState(String(value));

  // The server is the source of truth; a rejected save must not leave a stale
  // number sitting in the field.
  React.useEffect(() => setDraft(String(value)), [value]);

  const parsed = Number(draft);
  const isDirty = Number.isInteger(parsed) && parsed >= min && parsed <= max && parsed !== value;

  function commit(): void {
    if (isDirty) onSave(parsed);
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        aria-label={label}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          commit();
        }}
        className="h-9 w-20 tabular-nums"
      />
      {isDirty ? (
        <Button
          size="icon-sm"
          aria-label={`حفظ ${label}`}
          isLoading={isSaving}
          onClick={commit}
        >
          <Check aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}
