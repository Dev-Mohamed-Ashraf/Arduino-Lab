import * as React from 'react';

import { cn } from '../../lib/cn';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'destructive';
  isLoading?: boolean;
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-primary bg-primary/10',
  success: 'text-success bg-success/10',
  warning: 'text-warning-foreground bg-warning/20',
  destructive: 'text-destructive bg-destructive/10',
};

/** Single headline number with a label — the building block of both dashboards. */
function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  isLoading = false,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('gap-0 p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground truncate text-sm">{label}</p>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-20" />
          ) : (
            <p className="mt-1 text-2xl font-bold tabular-nums sm:text-3xl">{value}</p>
          )}
          {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
        </div>
        {icon ? (
          <span
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-lg [&_svg]:size-5',
              TONE_CLASSES[tone],
            )}
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
      </div>
    </Card>
  );
}

export { StatCard };
