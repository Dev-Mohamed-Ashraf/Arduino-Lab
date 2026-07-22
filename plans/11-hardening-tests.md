---
id: 11
title: Hardening + Tests
status: planned
started: -
completed: -
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
