'use client';

import { Label } from '@arduino-lab/ui';
import { formatLongDate } from '@arduino-lab/web';

/**
 * Native date input.
 *
 * A custom calendar would need its own Arabic month names, RTL keyboard
 * handling and focus trap; the browser already ships all three and stays
 * usable on a phone.
 */
export function DatePicker({
  id,
  label,
  value,
  onChange,
  min,
  max,
  showLongDate = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  showLongDate?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-11 w-full rounded-md border px-3 text-base shadow-xs outline-none focus-visible:ring-[3px] sm:w-48 md:text-sm"
      />
      {showLongDate && value ? (
        <p className="text-muted-foreground text-xs">{formatLongDate(value)}</p>
      ) : null}
    </div>
  );
}
