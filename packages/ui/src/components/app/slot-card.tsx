import { cn } from '../../lib/cn';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';

export interface SlotCardProps {
  label: string;
  booked: number;
  capacity: number;
  isOpen: boolean;
  /** Renders the card as a selectable option inside the booking wizard. */
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

type SlotState = 'closed' | 'full' | 'last' | 'open';

const SLOT_BADGES: Record<SlotState, { text: string; variant: 'secondary' | 'destructive' | 'warning' | 'success' }> = {
  closed: { text: 'مغلقة', variant: 'secondary' },
  full: { text: 'مكتملة', variant: 'destructive' },
  last: { text: 'مكان واحد متبقٍ', variant: 'warning' },
  open: { text: 'متاحة', variant: 'success' },
};

const SLOT_FILL_CLASSES: Record<SlotState, string> = {
  closed: 'bg-muted-foreground',
  full: 'bg-destructive',
  last: 'bg-warning',
  open: 'bg-success',
};

function resolveSlotState(remaining: number, isOpen: boolean): SlotState {
  if (!isOpen) return 'closed';
  if (remaining === 0) return 'full';
  if (remaining === 1) return 'last';
  return 'open';
}

/** Occupancy card for one lab period: "3 / 5" plus a fill bar and a state pill. */
function SlotCard({
  label,
  booked,
  capacity,
  isOpen,
  selectable = false,
  selected = false,
  onSelect,
  className,
}: SlotCardProps) {
  const remaining = Math.max(0, capacity - booked);
  const isFull = remaining === 0;
  const isBookable = isOpen && !isFull;
  const percent = capacity > 0 ? (booked / capacity) * 100 : 0;
  const state = resolveSlotState(remaining, isOpen);
  const badge = SLOT_BADGES[state];

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-semibold tabular-nums">{label}</span>
        <Badge variant={badge.variant}>{badge.text}</Badge>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-muted-foreground text-sm">المجموعات المسجّلة</span>
          <span className="text-lg font-bold tabular-nums">
            {booked} / {capacity}
          </span>
        </div>
        <Progress value={percent} indicatorClassName={SLOT_FILL_CLASSES[state]} />
        <p className="text-muted-foreground text-xs">
          {isFull ? 'لا توجد أماكن متبقية' : `المتبقي: ${remaining}`}
        </p>
      </div>
    </>
  );

  if (!selectable) {
    return <Card className={cn('p-4 sm:p-5', className)}>{content}</Card>;
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!isBookable}
      aria-pressed={selected}
      className={cn(
        'bg-card text-card-foreground w-full rounded-xl border p-4 text-start shadow-sm transition-all sm:p-5',
        'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
        isBookable && 'hover:border-primary/60 cursor-pointer hover:shadow-md',
        selected && 'border-primary ring-primary/30 ring-2',
        !isBookable && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      {content}
    </button>
  );
}

export { SlotCard };
