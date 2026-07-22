'use client';

import { loginSchema, type LoginInput } from '@arduino-lab/contracts';
import { Alert, AlertDescription, Button, Skeleton } from '@arduino-lab/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { AuthCard } from '@/components/auth/auth-card';
import { FormField } from '@/components/auth/form-field';
import { toErrorMessage, useAuth } from '@arduino-lab/web';

export default function LoginPage() {
  // useSearchParams opts the page out of static prerendering unless it sits
  // inside a Suspense boundary.
  return (
    <React.Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      router.push(searchParams.get('next') ?? '/my-bookings');
      router.refresh();
    } catch (error) {
      setFormError(toErrorMessage(error));
    }
  });

  return (
    <AuthCard
      title="تسجيل الدخول"
      description="ادخل ببريدك الجامعي للوصول إلى حجوزاتك."
      footer={
        <>
          ليس لديك حساب؟{' '}
          <Link href="/register" className="text-primary font-medium hover:underline">
            أنشئ حسابًا
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError ? (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          label="البريد الإلكتروني الجامعي"
          type="email"
          autoComplete="email"
          dir="ltr"
          className="text-start"
          required
          error={errors.email}
          {...register('email')}
        />

        <FormField
          label="كلمة المرور"
          type="password"
          autoComplete="current-password"
          required
          error={errors.password}
          {...register('password')}
        />

        <div className="text-start">
          <Link href="/forgot-password" className="text-primary text-sm hover:underline">
            نسيت كلمة المرور؟
          </Link>
        </div>

        <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
          دخول
        </Button>
      </form>
    </AuthCard>
  );
}

function LoginSkeleton() {
  return (
    <AuthCard title="تسجيل الدخول">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </AuthCard>
  );
}
