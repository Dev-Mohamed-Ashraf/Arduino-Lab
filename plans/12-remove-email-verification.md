---
id: 12
title: إلغاء تأكيد الإيميل — تسجيل ودخول مباشر
status: done
started: 2026-07-23
completed: 2026-07-23
depends_on: [03, 07, 08]
---

# 12 — إلغاء تأكيد الإيميل

## الهدف
الطالب يعمل حساب → **يدخل فوراً** ويقدر يحجز. مفيش تأكيد إيميل، ومفيش موافقة أدمن.

## القرارات
| السؤال | الاختيار |
|---|---|
| بعد التسجيل | **دخول فوري** — التسجيل يرجّع `AuthTokens` |
| كود التأكيد القديم | **يتمسح بالكامل** (قاعدة "مفيش كود ميت") |
| استعادة كلمة السر + Resend | **تفضل شغّالة** |
| موافقة أدمن | **مرفوضة** — الحجز يفضل `CONFIRMED` فوراً |

## ⚠️ مقايضة أمنية مقصودة

التسجيل حالياً بيرجّع **رد موحّد** عشان يمنع **تعداد الحسابات**.
الدخول الفوري مش متوافق مع ده: لازم الرد يفرّق بين نجاح وإيميل مكرر، وإلا المستخدم
مش هيعرف ليه مدخلش.

يعني هيبقى فيه **تسريب تعداد عند التسجيل**. مقبول ومتعارف عليه، والأثر محدود
(نظام داخلي). **تسجيل الدخول نفسه بيفضل محمي** — كلمة سر غلط بترجّع
`INVALID_CREDENTIALS` من غير كشف، و`forgot-password` بيفضل بالرد الموحّد.

## اللي بيتشال

**الداتابيز** — `model EmailVerificationToken` + `User.emailVerifiedAt`
(من غير تدفّق تأكيد هتفضل `null` للأبد وشارة الأدمن هتكذب على كل الناس).

**الباك-اند** — `verifyEmail` · `resendVerification` · `dispatchVerification` ·
فحص `emailVerifiedAt` في `login` · `EmailVerifiedGuard` · `createEmailVerificationToken` ·
`verifyEmailTemplate` · `sendVerifyEmail` · `isEmailVerified` من `RequestUser`

**Contracts** — `verifyEmailSchema` · `resendVerificationSchema` · `EMAIL_NOT_VERIFIED` ·
`emailVerifiedAt` من `currentUserSchema` و`userSchema` · endpoints التأكيد

**الفرونت** — صفحة `verify-email` · `requireVerified` و`UnverifiedNotice` ·
شارة "مؤكد/غير مؤكد" في لوحة الأدمن

## التحقق
- `pnpm check` + `pnpm test` + `pnpm test:e2e`
- محلياً: تسجيل بإيميل جديد → دخول فوري · إيميل مكرر → 409 · `/verify-email` → 404
- إنتاج: `migrate deploy` يمشي · الحسابات القائمة (ومنها الأدمن) لسه بتدخل

⚠️ الـ migration **بتحذف عمود وجدول من قاعدة إنتاج**. الحسابات ما بتتأثرش —
اللي بيتشال طوابع التأكيد وتوكناته.

---

## حادثة أثناء التنفيذ — مسح بيانات الإنتاج

شغّلت `prisma migrate diff --shadow-database-url <DIRECT_URL>` وحطيت **رابط قاعدة
الإنتاج** كـ shadow database. Prisma بيعمل **reset** للـ shadow عشان يحسب الفرق —
فمسح كل الصفوف وسجل `_prisma_migrations`.

**ضاع:** 4 فترات · 38 مكوّن · حساب الأدمن (كلها seed).
**الهيكل فضل سليم:** كل CHECK constraints والـ trigger والـ sequence والدوال.

**قرار المستخدم:** سيب البيانات ممسوحة — بداية نظيفة، والمكوّنات هيضيفها بنفسه
كأدمن بكميات المعمل الحقيقية. فالـ seed اتعدّل: `COMPONENTS = []`.

**الاسترجاع:** `prisma migrate resolve --applied` للتلات هجرات (baseline)، ثم seed.

**الدرس:** ممنوع تمرير رابط قاعدة حقيقية لـ `--shadow-database-url` — Prisma
بيمسحها. الأمر ده يتشغّل على قاعدة مؤقتة بس، أو ما يتشغّلش خالص.

---

## اللي اتنفّذ فعلاً — 2026-07-23

### تمسح
```
apps/api/src/common/guards/email-verified.guard.ts
apps/student/app/(main)/(auth)/verify-email/page.tsx
```

### تعدّلت
```
schema.prisma            EmailVerificationToken + User.emailVerifiedAt
migrations/20260723000000_drop_email_verification/
auth.service.ts          register → AuthTokens · شيل verifyEmail/resendVerification/
                         dispatchVerification وفحص التأكيد من login
auth.controller.ts       شيل endpointين · register بيمرّر requestContext
token.service.ts         شيل createEmailVerificationToken
jwt-auth.guard.ts        شيل emailVerifiedAt · current-user.decorator شيل isEmailVerified
bookings.controller.ts   شيل @UseGuards(EmailVerifiedGuard)
mail.templates/service   شيل verifyEmailTemplate و sendVerifyEmail
users.service.ts         شيل emailVerifiedAt من كل select و toUserDto
contracts                errors · auth.schema · user.schema · endpoints
student/register         دخول فوري بـ tokenStore.setTokens + refreshUser
student/require-auth     شيل requireVerified و UnverifiedNotice
admin/users              شيل شارة "مؤكد/غير مؤكد"
seed-data.ts             COMPONENTS = []
auth.e2e-spec.ts         3 اختبارات جديدة بدل اختبار التأكيد
```

### التحقق الفعلي

```
pnpm lint       ✅ 7/7        pnpm typecheck  ✅ 7/7
pnpm build      ✅ 4/4        pnpm test       ✅ 32
pnpm test:e2e   ✅ 8 (منها التزامن: 5 بالظبط من 10 متوازية)
```

على الـ API المحلي:
| الفحص | النتيجة |
|---|---|
| تسجيل → توكن فوراً | ✅ |
| التوكن شغّال على `/auth/me` فوراً | ✅ 200 |
| `POST /bookings` بيوصل الـ handler | ✅ `VALIDATION_FAILED` (مش محجوب بحارس) |
| إيميل مكرر | ✅ 409 |
| لوجين بدون بوابة تأكيد | ✅ 200 |
| `POST /auth/verify-email` | ✅ 404 |

**حالة القاعدة النهائية:** `{ users: 1, slots: 4, components: 0, bookings: 0 }`

### ملاحظة
`.next` المولّد بيحتفظ بأنواع للصفحات المحذوفة — لازم `rimraf .next` بعد حذف صفحة،
وإلا الـ typecheck بيفشل على موديول مش موجود.
