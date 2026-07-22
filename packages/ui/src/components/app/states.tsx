import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/cn';
import { Button } from '../ui/button';

/** Placeholder for a list or table that legitimately has nothing to show. */
function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center',
        className,
      )}
    >
      <span className="bg-muted text-muted-foreground grid size-12 place-items-center rounded-full [&_svg]:size-6">
        {icon ?? <Inbox aria-hidden />}
      </span>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Recoverable failure with a retry affordance. */
function ErrorState({
  title = 'تعذّر تحميل البيانات',
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-3 rounded-xl border px-6 py-12 text-center',
        className,
      )}
    >
      <span className="bg-destructive/10 text-destructive grid size-12 place-items-center rounded-full [&_svg]:size-6">
        <AlertCircle aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden />
          إعادة المحاولة
        </Button>
      ) : null}
    </div>
  );
}

export { EmptyState, ErrorState };
