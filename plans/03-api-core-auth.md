---
id: 03
title: API Core + Auth
status: done
started: 2026-07-22
completed: 2026-07-22
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

---

## اللي اتنفّذ فعلاً — 2026-07-22

### الملفات
```
src/main.ts · src/app.module.ts
src/config/          env.schema.ts · app-config.service.ts · config.module.ts
src/common/prisma/   prisma.service.ts · prisma.module.ts
src/common/errors/   app.exception.ts (AppException + 5 أنواع فرعية)
src/common/filters/  all-exceptions.filter.ts
src/common/pipes/    zod-validation.pipe.ts
src/common/guards/   jwt-auth.guard.ts · roles.guard.ts · email-verified.guard.ts
src/common/decorators/ public · roles · current-user
src/common/interceptors/ logging.interceptor.ts
src/common/utils/    pagination.ts · dates.ts
src/modules/auth/    password.service · token.service · auth.service · auth.controller · auth.module
src/modules/users/   users.service · users.controller · users.module
src/modules/mail/    mail.templates · mail.service · mail.module
src/modules/health/  health.controller · health.module
```

### انحرافات عن الخطة

1. **`MailModule` اتعمل هنا بدل خطة 06.** المصادقة مش ممكن تشتغل من غير إيميل تأكيد.
   الموديول كامل بقوالبه (تأكيد · استعادة كلمة سر · تأكيد حجز · إلغاء حجز). خطة 06
   هتوصّل مفتاح Resend بس. من غير `RESEND_API_KEY` الرسالة بتتطبع في اللوج والطلب بينجح عادي.

2. **`app-config.service.ts` اتضاف.** الخطة كانت `config/env.schema.ts` بس. الخدمات
   بتعتمد على `AppConfigService` مش على `ConfigService` مباشرةً — كل قراءة متحققة وقت الترجمة.

3. **`common/utils/dates.ts` اتضاف.** Render بيشغّل UTC والمعمل بتوقيت القاهرة —
   `todayInLabTimeZone()` بيمنع اليوم إنه يقلب في الساعة الغلط.

4. **`expiresIn` بيتبعت بالثواني مش `"15m"`.** أنواع `jsonwebtoken` بتعرّف الصيغة النصية
   كـ template literal ضيق، ونص جاي من `.env` مش بيرضيه.

5. **قاعدة `consistent-type-imports` اتقفلت للباك-اند.** بتتعارك مع الحقن:
   بارامتر الكونستركتور شكله type-only للينتر، بس `emitDecoratorMetadata` محتاج
   الـ import وقت التشغيل. الإصلاح التلقائي كان هيكسر الـ DI عند الإقلاع.

6. **`tsBuildInfoFile` اتحط جوه `dist/`.** `nest-cli` بيمسح `dist` قبل كل بناء، وملف
   البناء المتزايد بره الفولدر كان بيقول "الملفات محدّثة" ويطلع بناء ناقص (6 ملفات
   بدل 32). الباج ده حصل فعلاً وضرب السيرفر.

7. **`JwtModule.register({ global: true })`.** `JwtAuthGuard` مسجّل عالميًا في
   `AppModule`، فـ `JwtService` لازم يكون متاح بره نطاق `AuthModule`.

### إجراءات أمان إضافية
- **مقاومة تحليل التوقيت**: لما الإيميل مش موجود، `login` بيعمل تحقق argon2 على
  hash وهمي عشان زمن الرد ما يفرقش.
- **ردود موحّدة** على register · resend-verification · forgot-password.
- **الحارس بيقرا صف المستخدم كل طلب** مش بيثق في التوكن — تعطيل حساب أو تغيير دور
  بينفّذ فورًا مش بعد 15 دقيقة.
- **تغيير كلمة السر بيلغي كل الجلسات.**
- **`AllExceptionsFilter` بيخفي أخطاء Prisma** ويحوّلها لأكواد عامة.

### التحقق الفعلي

`GET /docs` رجّع 200. سكربت فحص اتشغّل على السيرفر الشغّال، **24 فحص كلهم عدّوا**:

```
ok  GET /health returns 200                          ok  GET /auth/me returns the caller
ok  health reports database up                       ok  role defaults to STUDENT
ok  register with non-university domain rejected      ok  student cannot list users
ok  weak password rejected with field details         ok  refresh issues a new pair
ok  register with university domain accepted          ok  rotated refresh token differs
ok  duplicate registration → same neutral response    ok  replaying old refresh token rejected
ok  login before verification rejected                ok  reuse detection revoked whole family
ok  invalid verification token rejected               ok  seeded admin can log in
ok  email verification succeeds                       ok  admin can list users
ok  verification token cannot be reused               ok  admin cannot demote themselves
ok  login after verification succeeds                 ok  login rate limited after 5 attempts
ok  wrong password rejected
ok  protected route without token is 401
```

```
pnpm --filter @arduino-lab/api build      ✅ 32 ملف
pnpm --filter @arduino-lab/api lint       ✅
pnpm --filter @arduino-lab/api typecheck  ✅
```
السكربت اتمسح بعد التحقق. الاختبارات الدائمة في خطة 11.
