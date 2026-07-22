'use client';

import { loginSchema, type LoginInput } from '@arduino-lab/contracts';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@arduino-lab/ui';
import { toErrorMessage, useAuth } from '@arduino-lab/web';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CircuitBoard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';

/** Only staff may use this panel; students are turned away after a valid login. */
const STAFF_ROLES = ['ADMIN', 'TEACHING_TEAM'];

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, logout } = useAuth();
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      const user = await login(values);

      if (!STAFF_ROLES.includes(user.role)) {
        // The credentials were valid, so a session now exists; drop it rather
        // than leave a student holding an admin-panel token.
        await logout();
        setFormError('هذا الحساب لا يملك صلاحية الدخول إلى لوحة التحكم.');
        return;
      }

      router.push('/');
      router.refresh();
    } catch (error) {
      setFormError(toErrorMessage(error));
    }
  });

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md gap-5">
        <CardHeader>
          <div className="text-primary mb-2 flex items-center gap-2">
            <CircuitBoard className="size-7" aria-hidden />
            <span className="font-bold">معمل الأردوينو</span>
          </div>
          <CardTitle className="text-xl">لوحة التحكم</CardTitle>
          <CardDescription>الدخول متاح لفريق التدريس وإدارة المعمل فقط.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {formError ? (
              <Alert variant="destructive">
                <AlertCircle aria-hidden />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="email" required>
                البريد الإلكتروني
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                dir="ltr"
                className="text-start"
                aria-invalid={errors.email ? true : undefined}
                {...register('email')}
              />
              {errors.email ? (
                <p className="text-destructive text-sm" role="alert">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" required>
                كلمة المرور
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password ? true : undefined}
                {...register('password')}
              />
              {errors.password ? (
                <p className="text-destructive text-sm" role="alert">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
              دخول
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
