'use client';

import { Alert, AlertDescription, Button, Skeleton } from '@arduino-lab/ui';
import { MailWarning } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

import { api } from '@/lib/api';
import { useAuth } from '@arduino-lab/web';

/**
 * Client-side gate for pages that need a session.
 *
 * This is a convenience, not a control: every protected endpoint is enforced on
 * the server. Rendering nothing until the session resolves avoids the flash of
 * a login redirect for users who are in fact signed in.
 */
export function RequireAuth({
  children,
  requireVerified = false,
}: {
  children: React.ReactNode;
  requireVerified?: boolean;
}) {
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

  if (requireVerified && !user.emailVerifiedAt) {
    return <UnverifiedNotice email={user.email} />;
  }

  return <>{children}</>;
}

function UnverifiedNotice({ email }: { email: string }) {
  const [isSending, setIsSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function resend(): Promise<void> {
    setIsSending(true);
    try {
      await api.auth.resendVerification(email);
      setSent(true);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Alert variant="warning">
        <MailWarning aria-hidden />
        <AlertDescription>
          <span>
            لتأكيد حجز موعد يجب تأكيد بريدك الإلكتروني أولًا. راجع الرسالة المرسلة إلى{' '}
            <span dir="ltr">{email}</span>.
          </span>
          {sent ? <span className="text-success">تم إرسال رسالة جديدة.</span> : null}
        </AlertDescription>
      </Alert>

      <div className="mt-4 flex gap-2">
        <Button onClick={() => void resend()} isLoading={isSending} disabled={sent}>
          إعادة إرسال الرسالة
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">العودة للرئيسية</Link>
        </Button>
      </div>
    </div>
  );
}
