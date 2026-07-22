'use client';

import { registerSchema, type RegisterInput } from '@arduino-lab/contracts';
import { Alert, AlertDescription, AlertTitle, Button } from '@arduino-lab/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, MailCheck } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { AuthCard } from '@/components/auth/auth-card';
import { FormField } from '@/components/auth/form-field';
import { api } from '@/lib/api';
import { toErrorMessage } from '@arduino-lab/web';

export default function RegisterPage() {
  const [formError, setFormError] = React.useState<string | null>(null);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api.auth.register(values);
      setSentTo(values.email);
    } catch (error) {
      setFormError(toErrorMessage(error));
    }
  });

  if (sentTo) {
    return (
      <AuthCard
        title="تحقّق من بريدك الإلكتروني"
        footer={
          <Link href="/login" className="text-primary font-medium hover:underline">
            العودة لتسجيل الدخول
          </Link>
        }
      >
        <Alert variant="success">
          <MailCheck aria-hidden />
          <AlertTitle>أرسلنا رسالة تأكيد</AlertTitle>
          <AlertDescription>
            <span>
              إذا كان <span dir="ltr">{sentTo}</span> مسجّلًا لدينا فستصلك رسالة خلال دقائق. افتح
              الرابط داخلها لتفعيل حسابك.
            </span>
            <span className="text-muted-foreground">
              لم تصلك؟ راجع مجلد الرسائل غير المرغوب فيها.
            </span>
          </AlertDescription>
        </Alert>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="إنشاء حساب"
      description="التسجيل متاح بالبريد الجامعي فقط."
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
          إنشاء الحساب
        </Button>
      </form>
    </AuthCard>
  );
}
