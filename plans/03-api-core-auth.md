---
id: 03
title: API Core + Auth
status: in-progress
started: 2026-07-22
completed: -
depends_on: [01, 02]
---

# 03 — API Core + Auth

## الهدف
هيكل NestJS الأساسي + المصادقة الكاملة بالإيميل الجامعي.

## البنية الأساسية

```
apps/api/src/
├── main.ts               helmet · CORS · global prefix /api/v1 · Swagger · shutdown hooks
├── app.module.ts
├── config/
│   ├── env.schema.ts     zod — الأبلكيشن ما يقومش لو متغير ناقص
│   └── config.module.ts
└── common/
    ├── prisma/           PrismaService (onModuleInit/onModuleDestroy) · PrismaModule (global)
    ├── pipes/            ZodValidationPipe
    ├── filters/          AllExceptionsFilter → { code, message, details?, timestamp, path }
    ├── interceptors/     LoggingInterceptor · TransformInterceptor
    ├── guards/           JwtAuthGuard (global) · RolesGuard · EmailVerifiedGuard
    └── decorators/       @Public() · @Roles() · @CurrentUser()
```

**`JwtAuthGuard` عالمي** — كل endpoint محمي افتراضياً، والفتح صريح بـ `@Public()`.

## Auth

| Endpoint | الوصف |
|---|---|
| `POST /auth/register` | إيميل جامعي بس (فحص `ALLOWED_EMAIL_DOMAINS`) → يبعت لينك تأكيد |
| `POST /auth/verify-email` | يستهلك التوكن، يحط `emailVerifiedAt` |
| `POST /auth/resend-verification` | rate-limited |
| `POST /auth/login` | يرجّع access + refresh، يرفض لو الإيميل مش متأكد |
| `POST /auth/refresh` | تدوير refresh token (القديم يتلغي، الجديد يتصدر) |
| `POST /auth/logout` | يلغي الـ refresh token |
| `POST /auth/forgot-password` · `POST /auth/reset-password` | استعادة كلمة السر |
| `GET /auth/me` | بيانات المستخدم الحالي |

### تفاصيل الأمان
- **argon2id** للباسورد (`@node-rs/argon2`).
- التوكنات في الداتابيز **hashed بـ SHA-256** — النص الصريح ما بيتخزنش أبداً.
- access 15 دقيقة · refresh 7 أيام دوّار.
- **كشف إعادة الاستخدام**: refresh token ملغي اتستخدم تاني → إلغاء كل توكنات المستخدم.
- `POST /auth/*` محكوم بـ `@nestjs/throttler`: 5 محاولات / دقيقة / IP.
- **ردود موحّدة** على "الإيميل موجود" و"الإيميل مش موجود" — منع تعداد الحسابات.

## Users module
`GET /users` (أدمن) · `PATCH /users/:id/role` (أدمن) · `GET /users/me` · `PATCH /users/me`

## Health module
`GET /health` — **عام**، بيرجع `{ status, uptime, database: 'up' | 'down' }`.
ده اللي UptimeRobot بيضربه كل 5 دقايق عشان Render ما ينامش.

## Swagger
`GET /docs` — في التطوير بس. Bearer auth مفعّل.

## التحقق
- `pnpm --filter @arduino-lab/api dev` بيقوم على 4000
- `GET /api/v1/health` بيرجع 200
- تسجيل بإيميل بره الدومين المسموح → 400 برسالة عربية
- تسجيل بإيميل جامعي → 201 + توكن تأكيد اتعمل
- لوجين قبل التأكيد → 403
- لوجين بعد التأكيد → access + refresh
- endpoint محمي من غير توكن → 401
- استخدام refresh token مرتين → المرة التانية 401 + كل توكنات المستخدم اتلغت
- 6 محاولات لوجين في دقيقة → السادسة 429
