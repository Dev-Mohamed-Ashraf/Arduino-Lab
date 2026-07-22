'use client';

import type { Role } from '@arduino-lab/contracts';
import { Alert, AlertDescription, Button, Skeleton } from '@arduino-lab/ui';
import { useAuth } from '@arduino-lab/web';
import { ShieldX } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { AdminShell } from './admin-shell';

const STAFF_ROLES: Role[] = ['ADMIN', 'TEACHING_TEAM'];

/**
 * Gate for the whole panel.
 *
 * Convenience only — every endpoint behind these screens checks the role on the
 * server. Hiding a link never grants or denies anything.
 */
export function RequireStaff({
  children,
  roles = STAFF_ROLES,
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!STAFF_ROLES.includes(user.role)) {
    return <Denied />;
  }

  if (!roles.includes(user.role)) {
    return (
      <AdminShell user={user}>
        <Denied inShell />
      </AdminShell>
    );
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}

function Denied({ inShell = false }: { inShell?: boolean }) {
  return (
    <div className={inShell ? 'p-6' : 'flex min-h-dvh items-center justify-center p-6'}>
      <div className="w-full max-w-md space-y-4">
        <Alert variant="destructive">
          <ShieldX aria-hidden />
          <AlertDescription>لا تملك صلاحية الوصول إلى هذه الصفحة.</AlertDescription>
        </Alert>
        {!inShell ? (
          <Button variant="outline" asChild className="w-full">
            <Link href="/login">تسجيل الدخول بحساب آخر</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
