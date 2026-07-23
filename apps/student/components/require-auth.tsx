'use client';

import { Skeleton } from '@arduino-lab/ui';
import { useAuth } from '@arduino-lab/web';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

/**
 * Client-side gate for pages that need a session.
 *
 * This is a convenience, not a control: every protected endpoint is enforced on
 * the server. Rendering a skeleton until the session resolves avoids the flash
 * of a login redirect for users who are in fact signed in.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, router, pathname]);

  if (isLoading || !user) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
