'use client';

import { forgotPasswordSchema, type ForgotPasswordInput } from '@arduino-lab/contracts';
import { Alert, AlertDescription, Button } from '@arduino-lab/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, MailCheck } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { AuthCard } from '@/components/auth/auth-card';
import { FormField } from '@/components/auth/form-field';
import { api } from '@/lib/api';
import { toErrorMessage } from '@arduino-lab/web';

export default function ForgotPasswordPage() {
  const [formError, setFormError] = React.useState<string | null>(null);
  const [sentMessage, setSentMessage] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const result = await api.auth.forgotPassword(values);
      setSentMessage(result.message);
    } catch (error) {
      setFormError(toErrorMessage(error));
    }
  });

  return (
    <AuthCard
      title="استعادة كلمة المرور"
      description="أدخل بريدك الجامعي وسنرسل لك رابط إعادة التعيين."
      footer={
        <Link href="/login" className="text-primary font-medium hover:underline">
          العودة لتسجيل الدخول
        </Link>
      }
    >
      {sentMessage ? (
        <Alert variant="success">
          <MailCheck aria-hidden />
          <AlertDescription>{sentMessage}</AlertDescription>
        </Alert>
      ) : (
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

          <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
            إرسال الرابط
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
