'use client';

import { Alert, AlertDescription, AlertTitle, Button, Skeleton } from '@arduino-lab/ui';
import { AlertCircle, CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

import { AuthCard } from '@/components/auth/auth-card';
import { api } from '@/lib/api';
import { toErrorMessage } from '@arduino-lab/web';

export default function VerifyEmailPage() {
  return (
    <React.Suspense fallback={<VerifySkeleton />}>
      <VerifyEmailContent />
    </React.Suspense>
  );
}

function VerifyEmailContent() {
  const token = useSearchParams().get('token');
  const [state, setState] = React.useState<'pending' | 'done' | 'failed'>('pending');
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    if (!token) {
      setState('failed');
      setMessage('الرابط غير صالح.');
      return;
    }

    let isActive = true;

    api.auth
      .verifyEmail({ token })
      .then((result) => {
        if (!isActive) return;
        setMessage(result.message);
        setState('done');
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setMessage(toErrorMessage(error));
        setState('failed');
      });

    // React runs effects twice in development; the flag stops the second run
    // from overwriting the result of the first.
    return () => {
      isActive = false;
    };
  }, [token]);

  if (state === 'pending') return <VerifySkeleton />;

  return (
    <AuthCard title="تأكيد البريد الإلكتروني">
      {state === 'done' ? (
        <>
          <Alert variant="success">
            <CircleCheck aria-hidden />
            <AlertTitle>تم التأكيد</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          <Button asChild className="w-full" size="lg">
            <Link href="/login">تسجيل الدخول</Link>
          </Button>
        </>
      ) : (
        <>
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertTitle>تعذّر التأكيد</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          <Button asChild variant="outline" className="w-full">
            <Link href="/register">طلب رابط جديد</Link>
          </Button>
        </>
      )}
    </AuthCard>
  );
}

function VerifySkeleton() {
  return (
    <AuthCard title="تأكيد البريد الإلكتروني" description="جارٍ التحقق من الرابط…">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-11 w-full" />
    </AuthCard>
  );
}
