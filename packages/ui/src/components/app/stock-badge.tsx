import { cn } from '../../lib/cn';
import { Badge } from '../ui/badge';

export type StockStatus = 'available' | 'low' | 'out';

const STATUS_LABELS: Record<StockStatus, string> = {
  available: 'متوفر',
  low: 'كمية محدودة',
  out: 'غير متوفر',
};

const STATUS_VARIANTS: Record<StockStatus, 'success' | 'warning' | 'destructive'> = {
  available: 'success',
  low: 'warning',
  out: 'destructive',
};

/** Availability pill shown next to every component row. */
function StockBadge({ status, className }: { status: StockStatus; className?: string }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]} className={cn('gap-1.5', className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export { StockBadge, STATUS_LABELS as STOCK_STATUS_LABELS };
