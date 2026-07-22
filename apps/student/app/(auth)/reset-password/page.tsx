'use client';

import { resetPasswordSchema, type ResetPasswordInput } from '@arduino-lab/contracts';
import { Alert, AlertDescription, Button, Skeleton } from '@arduino-lab/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { AuthCard } from '@/components/auth/auth-card';
import { FormField } from '@/components/auth/form-field';
import { api } from '@/lib/api';
import { toErrorMessage } from '@/lib/auth-context';

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<ResetSkeleton />}>
      <ResetPasswordForm />
    </React.Suspense>
  );
}

function ResetPasswordForm() {
  const token = useSearchParams().get('token') ?? '';
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isDone, setIsDone] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api.auth.resetPassword(values);
      setIsDone(true);
    } catch (error) {
      setFormError(toErrorMessage(error));
    }
  });

  if (!token) {
    return (
      <AuthCard title="إعادة تعيين كلمة المرور">
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>الرابط غير صالح أو ناقص.</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="w-full">
          <Link href="/forgot-password">طلب رابط جديد</Link>
        </Button>
      </AuthCard>
    );
  }

  if (isDone) {
    return (
      <AuthCard title="تم تغيير كلمة المرور">
        <Alert variant="success">
          <CircleCheck aria-hidden />
          <AlertDescription>يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.</AlertDescription>
        </Alert>
        <Button asChild className="w-full" size="lg">
          <Link href="/login">تسجيل الدخول</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="إعادة تعيين كلمة المرور" description="اختر كلمة مرور جديدة لحسابك.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError ? (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <input type="hidden" {...register('token')} />

        <FormField
          label="كلمة المرور الجديدة"
          type="password"
          autoComplete="new-password"
          required
          error={errors.password}
          hint="8 أحرف على الأقل، وتحتوي على حرف كبير وحرف صغير ورقم"
          {...register('password')}
        />

        <FormField
          label="تأكيد كلمة المرور"
          type="password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword}
          {...register('confirmPassword')}
        />

        <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
          حفظ كلمة المرور
        </Button>
      </form>
    </AuthCard>
  );
}

function ResetSkeleton() {
  return (
    <AuthCard title="إعادة تعيين كلمة المرور">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </AuthCard>
  );
}
