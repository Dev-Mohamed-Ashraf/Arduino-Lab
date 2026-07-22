---
id: 11
title: Hardening + Tests
status: done
started: 2026-07-23
completed: 2026-07-23
depends_on: [10]
---

# 11 — Hardening + Tests

## التشديد الأمني

| البند | التنفيذ |
|---|---|
| Helmet | `app.use(helmet())` + CSP |
| Rate limiting | `@nestjs/throttler` — عام 100/دقيقة · `/auth/*` 5/دقيقة · `POST /bookings` 10/ساعة/مستخدم |
| حجم الطلب | `bodyParser` حد أقصى 1MB (الصور بتروح Cloudinary مباشرة) |
| تسريب الأخطاء | `AllExceptionsFilter` — في الإنتاج، أخطاء 500 ترجع رسالة عامة واللوج فيه التفاصيل |
| تعداد الحسابات | ردود موحّدة على register / forgot-password |
| SQL injection | Prisma بيعمل parameterize، و `$queryRaw` بالـ tagged template **بس** — ممنوع string concat |
| XSS | React بيهرّب افتراضياً · ممنوع `dangerouslySetInnerHTML` |
| Secrets | فحص إن مفيش سر في git history |
| Headers | `X-Powered-By` متشال · HSTS في الإنتاج |

## الاختبارات

### Unit (Vitest)
- `BookingsService` — كل مسارات الرفض
- `ComponentsService` — حساب المتاح، رفض تقليل الإجمالي تحت المحجوز
- `SlotsService` — حساب التوفر
- `AuthService` — تدوير التوكن، كشف إعادة الاستخدام، فحص دومين الإيميل
- Zod schemas — الحدود (0 عضو · 7 أعضاء · كمية سالبة · نص طويل)

### E2E (Vitest + Supertest، على داتابيز Neon فرع اختبار)

**السيناريوهات الحرجة — دي أهم حاجة في الخطة دي:**

```
1. التزامن — السعة
   10 طلبات POST /bookings متوازية لنفس (التاريخ، الفترة)
   ✓ بالظبط 5 يرجعوا 201
   ✓ بالظبط 5 يرجعوا 409 SLOT_FULL
   ✓ count في الداتابيز == 5

2. التزامن — المخزون
   مكون كميته 1، طلبين متوازيين عليه
   ✓ واحد بس 201
   ✓ التاني 409 COMPONENT_OUT_OF_STOCK
   ✓ reservedQuantity == 1 (مش 2)

3. ذرّية الفشل
   حجز فيه مكون متاح ومكون نافد
   ✓ 409
   ✓ مفيش أي صف Booking اتعمل
   ✓ reservedQuantity بتاع المكون المتاح ما اتغيّرش

4. الصلاحيات
   ✓ طالب PATCH على حجزه → 403
   ✓ طالب على /admin endpoints → 403
   ✓ TEACHING_TEAM على /users → 403
   ✓ أدمن → 200

5. دورة المخزون الكاملة
   المتاح 10 → حجز بـ 3 → المتاح 7 → إلغاء → المتاح 10 بالظبط

6. دورة المصادقة
   تسجيل → تأكيد → لوجين → refresh → استخدام التوكن القديم → 401 + كل التوكنات اتلغت
```

**اختبار التزامن بيتعمل بـ `Promise.all` على `supertest` requests فعلية** — مش mocks.
لو الاختبار ده عدّى، الترانزاكشن سليمة.

### إعداد
- `apps/api/vitest.config.ts`
- `apps/api/test/setup.ts` — reset للداتابيز قبل كل ملف اختبار
- `.env.test` — يشاور على فرع Neon مخصص للاختبار
- `pnpm test` (unit) · `pnpm test:e2e` (تكامل)

## الأداء
- فهارس على `Booking(bookingDate, timeSlotId, status)` · `Booking(bookingNumber)` ·
  `Booking(ownerId)` · `Component(name)` · `RefreshToken(tokenHash)`
- `select` صريح في استعلامات Prisma — ممنوع جلب أعمدة مش محتاجينها
- منع N+1 بـ `include` مش loops
- الترقيم مفروض على السيرفر (حد أقصى 100 صف للطلب)

## التحقق النهائي
- `pnpm check` عدّى
- `pnpm test` — كل الاختبارات خضرا
- `pnpm test:e2e` — **خصوصاً اختباري التزامن**
- فحص يدوي للسيناريوهات السبعة في قسم التحقق بتاع الخطة الأصلية
- Lighthouse على الموقعين: Performance ≥ 90 · Accessibility ≥ 95

---

## اللي اتنفّذ فعلاً — 2026-07-23

### الملفات
```
apps/api/vitest.config.ts · vitest.e2e.config.ts
apps/api/test/setup-app.ts · bookings-concurrency.e2e-spec.ts · auth.e2e-spec.ts
apps/api/src/**/*.spec.ts   (token.service · component.mapper · csv · dates)
packages/contracts/src/schemas/booking.schema.spec.ts
```

### التشديد الأمني — كان معمول أصلاً في خطط سابقة
| البند | مكانه |
|---|---|
| Helmet + CSP | `main.ts` (خطة 03) |
| Rate limiting عام 100/دقيقة | `ThrottlerModule` (خطة 03) |
| `/auth/*` 5/دقيقة | `@Throttle` على الكونترولر (خطة 03) |
| `POST /bookings` 30/ساعة **لكل مستخدم** | `UserThrottlerGuard` (خطة 05) |
| حجم الطلب 1MB | `main.ts` bodyParser |
| تسريب أخطاء Prisma | `AllExceptionsFilter` (خطة 03) |
| تعداد الحسابات | ردود موحّدة (خطة 03) |
| SQL injection | Prisma parameterized + `$queryRaw` tagged templates بس |
| **فحص أسرار git** | ✅ `.env` متجاهل · صفر مفاتيح حقيقية في ملفات متتبّعة |

### الاختبارات — 38 اختبار

**وحدة (32):**
- `token.service` — `parseDuration` (وحدات + مدخل خاطئ) · `hashToken` (حتمي · SHA-256 · ما بيرجّعش الخام)
- `component.mapper` — المتاح المشتق · حالات `out`/`low`/`available` عند الحدود
- `csv` — BOM · CRLF · تنصيص الفاصلة · تهريب الاقتباس · **حقن الصيغ (`=`/`+`/`-`/`@`)** · الأسماء العربية
- `dates` — round-trip بدون انزياح يوم
- `booking.schema` — 0/6/7 أعضاء · كمية سالبة · مكون مكرر · بدون مكونات · تاريخ خاطئ

**e2e على داتابيز حقيقية (6) — الأهم:**
```
✓ 10 طلبات متوازية لنفس الفترة → 5 بالظبط ينجحوا · 5 → 409 · الصفوف = السعة   (24.6s)
✓ آخر قطعة مخزون · 6 متنافسين → واحد بس يكسب · reservedQuantity ≤ total       (10s)
✓ مكون متاح + مكون ناقص → 409 · المتاح ما اتخصمش · مفيش صف حجز                 (2.5s)
✓ login قبل التأكيد → 403 · بعده → 200
✓ تدوير refresh · replay القديم → 401 · كشف إعادة الاستخدام يلغي العائلة كلها
```

### باجّات الإعداد اللي اتصادت

1. **DI بيقع تحت Vitest.** الـ esbuild الافتراضي **مبيصدرش decorator metadata**،
   فـ NestJS ما بيعرفش أنواع بارامترات الكونستركتور و `AppConfigService` بيرجع
   `undefined`. الحل: `unplugin-swc` بيعيد إصدار الـ metadata + `reflect-metadata`
   في `setupFiles`.
2. **`ValidationPipe` بتحمّل `class-validator`** اللي مش متسطّب (المشروع zod). اتشالت
   من إعداد الاختبار — التحقق بيتم عبر `ZodValidationPipe` على مستوى الراوت.
3. **`ALLOWED_EMAIL_DOMAINS` cached.** تعيينها في `beforeAll` جه متأخر لأن
   `AppConfigService` بيخزّن البيئة وقت الإقلاع. اتنقلت لـ `vitest.e2e.config.ts`
   قبل ما التطبيق يقوم.
4. **BOM حرفي في regex** بملف اختبار CSV → `no-irregular-whitespace`. اتحوّل لـ
   `new RegExp('^\\uFEFF')`.

### إعدادات الاختبار
- `unplugin-swc` + `@swc/core` (decorator metadata) · `jsonwebtoken` (سك توكن مباشر)
- e2e: `fileParallelism: false` + `singleFork` — داتابيز واحدة، صفوف مشتركة
- مهل 60 ثانية للـ e2e — الحجوزات بتصطف على قفل الفترة وNeon بعيد
- استثناء ملفات الاختبار من `max-lines`/`no-console` في قاعدة ESLint الأساسية

### التحقق النهائي
```
pnpm --filter @arduino-lab/api test          ✅ 23
pnpm --filter @arduino-lab/contracts test    ✅ 9
pnpm --filter @arduino-lab/api test:e2e      ✅ 6 (على Neon)
pnpm check (lint + typecheck + build)        ✅ 7/7 · 7/7 · 4/4 — صفر تحذيرات
git secret scan                              ✅ نضيف
```

### متبقٍ (محتاج بيئة/متصفح)
- Lighthouse على الموقعين — محتاج متصفح
- فحص رفع الصور الفعلي — محتاج مفاتيح Cloudinary (البند المؤجّل من خطة 06)
