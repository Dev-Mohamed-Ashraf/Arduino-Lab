'use client';

import { registerSchema, type RegisterInput } from '@arduino-lab/contracts';
import { Alert, AlertDescription, Button } from '@arduino-lab/ui';
import { toErrorMessage, useAuth } from '@arduino-lab/web';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { AuthCard } from '@/components/auth/auth-card';
import { FormField } from '@/components/auth/form-field';
import { api, tokenStore } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      // There is no confirmation step: the API signs the new account in and
      // returns tokens directly. See plans/12-remove-email-verification.md.
      tokenStore.setTokens(await api.auth.register(values));
      await refreshUser();
      router.push('/booking/new');
      router.refresh();
    } catch (error) {
      setFormError(toErrorMessage(error));
    }
  });

  return (
    <AuthCard
      title="إنشاء حساب"
      description="سجّل بياناتك وابدأ الحجز مباشرة."
      footer={
        <>
          لديك حساب بالفعل؟{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            سجّل الدخول
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
          label="الاسم الكامل"
          autoComplete="name"
          required
          error={errors.fullName}
          {...register('fullName')}
        />

        <FormField
          label="البريد الإلكتروني"
          type="email"
          autoComplete="email"
          dir="ltr"
          className="text-start"
          required
          error={errors.email}
          {...register('email')}
        />

        <FormField
          label="الرقم الجامعي"
          inputMode="numeric"
          dir="ltr"
          className="text-start"
          error={errors.studentCode}
          hint="اختياري"
          {...register('studentCode')}
        />

        <FormField
          label="رقم الهاتف"
          type="tel"
          inputMode="numeric"
          dir="ltr"
          className="text-start"
          error={errors.phone}
          hint="اختياري — 11 رقمًا يبدأ بـ 01"
          {...register('phone')}
        />

        <FormField
          label="كلمة المرور"
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
          إنشاء الحساب والبدء
        </Button>
      </form>
    </AuthCard>
  );
}
