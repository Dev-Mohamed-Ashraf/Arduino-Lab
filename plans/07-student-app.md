---
id: 07
title: Student App
status: done
started: 2026-07-22
completed: 2026-07-23
depends_on: [06]
---

# 07 — Student App (`apps/student` → Vercel)

## الهدف
واجهة الطلبة: داشبورد عام + حساب بالإيميل الجامعي + ويزارد الحجز + عرض الحجوزات.

## الراوتس

```
app/
├── layout.tsx                    <html lang="ar" dir="rtl"> · خط عربي · Providers
├── page.tsx                      الداشبورد العام (Server Component)
├── (auth)/
│   ├── login · register · verify-email · forgot-password · reset-password
├── (app)/
│   ├── booking/new               الويزارد (Client)
│   ├── my-bookings               حجوزاتي
│   └── booking/[bookingNumber]   الإيصال
└── booking/[bookingNumber]/print صفحة الطباعة (layout منفصل، خطة 09)
```

## الداشبورد `/` — بدون لوجين

- **Server Component** بيجيب `GET /dashboard` — يظهر فوراً من غير loading spinner.
- قسم الفترات: 4 كروت — الفترة · `3 / 5` · شريط تقدم · بادج (متاحة / شبه ممتلئة / مكتملة).
- قسم المكونات: جدول على الديسكتوب، كروت على الموبايل — الاسم · الإجمالي · المتاح · بادج الحالة.
- بحث فوري في المكونات + فلتر "المتاح بس".
- `revalidate = 30` + زرار تحديث يدوي.
- زرار كبير "احجز موعد" فوق.

## الويزارد `/booking/new`

6 خطوات، حالة محفوظة في `sessionStorage` (لو الصفحة اتقفلت بالغلط ما يضيعش الشغل):

| # | الخطوة | التحقق |
|---|---|---|
| 1 | رقم المجموعة | رقم موجب، مش مستخدم في نفس اليوم/الفترة |
| 2 | أعضاء المجموعة | 1–6 أسماء، إضافة/حذف ديناميكي |
| 3 | صورة البطاقة | معاينة قبل الرفع، ≤5MB، صور بس، رفع مباشر لـ Cloudinary بشريط تقدم |
| 4 | المشروع | الاسم (3–120 حرف) + الوصف (10–1000 حرف) |
| 5 | المكونات | بحث + الكمية المتاحة لحظياً + منع تجاوزها + سلة جانبية |
| 6 | الموعد + المراجعة | اختيار التاريخ والفترة (المكتملة مقفولة) + مراجعة كل حاجة + تأكيد |

### قواعد
- كل خطوة `zodResolver` بالسكيما من `@arduino-lab/contracts` — نفس التحقق بتاع السيرفر.
- زرار "التالي" مقفول لحد ما الخطوة تبقى صالحة.
- المكونات المتاحة بتتحدّث كل 15 ثانية (`refetchInterval`) — الأرقام ما تبقاش قديمة.
- عند التأكيد: زرار مقفول + spinner + منع الإرسال المزدوج.
- عند الرفض من السيرفر (`SLOT_FULL` / `COMPONENT_OUT_OF_STOCK`) → رسالة عربية واضحة
  **وإرجاع المستخدم للخطوة المسؤولة** مع تحديث الأرقام.
- عند النجاح → تحويل لصفحة الإيصال + toast.

## `/my-bookings`

- كروت الحجوزات: الحالة · التاريخ · الفترة · رقم المجموعة · المشروع.
- أزرار: عرض الإيصال · طباعة.
- **مفيش تعديل ولا حذف** — بدالهم رسالة: «الحجز مؤكد ومقفول للتعديل. للتعديل تواصل مع إدارة المعمل.»

## التقنيات
Next.js 15 App Router · React 19 · TanStack Query v5 · react-hook-form + zod ·
`@arduino-lab/ui` · sonner · access token في الذاكرة و refresh في httpOnly cookie.

## Responsive
- Mobile-first، متجرّب على 375 · 768 · 1440.
- الويزارد على الموبايل: خطوة واحدة على الشاشة + شريط تقدم علوي ثابت + أزرار تنقّل سفلية ثابتة.
- الجداول → كروت تحت `md`.

## التحقق
- الداشبورد شغّال من غير لوجين، ومظبوط على التلات مقاسات
- تسجيل بإيميل بره الدومين → رسالة رفض عربية
- الويزارد كامل → حجز ناجح → إيصال
- محاولة اختيار فترة مكتملة → مقفولة في الواجهة
- محاولة كمية أكبر من المتاح → ممنوعة في الواجهة **و** مرفوضة من السيرفر
- قفل الصفحة في نص الويزارد وفتحها تاني → البيانات موجودة
- `pnpm --filter @arduino-lab/student build` بينجح

---

## اللي اتنفّذ فعلاً — 2026-07-23

### الملفات
```
app/            layout.tsx · providers.tsx · globals.css · page.tsx (الداشبورد)
app/(auth)/     layout · login · register · verify-email · forgot-password · reset-password
app/(app)/      booking/new · my-bookings · booking/[bookingNumber]
components/     site-header · require-auth · my-bookings-list · booking-receipt
components/auth/        auth-card · form-field
components/dashboard/   slots-panel · components-panel
components/booking-wizard/  booking-wizard · wizard-progress · steps · use-booking-draft
                            step-group · step-members · step-id-card · step-project
                            step-components · step-slot · step-review
lib/            api · token-store · auth-context · upload · format
```

### انحرافات عن الخطة

1. **صفحة الإيصال جوّه مجموعة `(app)` مش في الجذر.** الخطة حطّتها في الجذر، بس هي
   محتاجة مصادقة زي باقي صفحات التطبيق. صفحة الطباعة هي اللي هتحتاج layout منفصل (خطة 09).

2. **`@custom-variant` و `@import 'tailwindcss'` اتنقلوا لملف CSS بتاع التطبيق.**
   كانوا في `packages/ui`. لما يكونوا في ملف مستورد، Tailwind بيعامله كـ stylesheet عادي
   وبيطلّع الـ at-rules زي ما هي، وبعدين ضغط الـ CSS بيقع عليها. دول تعليمات نقطة دخول
   ومكانها الصح هو ملف التطبيق.

3. **التوكن: access في الذاكرة و refresh في `localStorage`.** الخطة قالت refresh في
   httpOnly cookie. مش عملي هنا: الـ API على Render والواجهة على Vercel — دومينين
   مختلفين، والكوكي عبر المواقع بيتحجب افتراضيًا في معظم المتصفحات. البديل: التوكن
   القصير (15 دقيقة) بره التخزين تمامًا، والـ refresh بيتدوّر مع كل استخدام مع كشف
   إعادة الاستخدام على السيرفر.

4. **`publicApi` منفصل عن `api`.** الـ Server Component بيستخدم كلاينت من غير مخزن
   توكنات — الرندر على السيرفر مشترك بين المستخدمين وما ينفعش يلتقط جلسة حد تاني.

5. **مسح المسودّة في `sessionStorage` مش `localStorage`** — المسودّة تموت مع التبويب
   وما تظهرش للشخص اللي بعده على جهاز معمل مشترك.

### باجّين اتصادوا

1. **`Button asChild` كان بيكسر كل صفحة فيها زرار-رابط.**
   ```
   Slot failed to slot onto its children.
   Expected a single React element child or `Slottable`.
   ```
   الكومبوننت كان بيحقن الـ spinner جنب `children`، فـ Radix Slot بيستلم ولدين
   وهو عايز واحد. دلوقتي `asChild` بيرندر ولد المستخدم من غير حقن.

2. **`useSearchParams()` في `/login` من غير Suspense** كان بيفشّل بناء الإنتاج
   (`prerender-error`). اتلفّ في `<Suspense>` زي `verify-email` و `reset-password`.

3. **أسهم الويزارد**: حطّيت `.rtl-flip` على أسهم السابق/التالي بالغلط. في RTL
   بداية السطر هي اليمين، فسهم "السابق" لليمين **صح أصلاً** — الـ flip كان هيعكسه غلط.

### التحقق الفعلي

كل الـ 8 مسارات رجّعت 200 من السيرفر الفعلي، والمحتوى العربي المتوقع موجود في كل واحدة.

| الفحص | النتيجة |
|---|---|
| `<html lang="ar" dir="rtl">` | ✅ |
| الفترات الأربعة و`0 / 5` والـ38 مكون في الداشبورد | ✅ |
| **كلاسات اتجاهية فيزيائية (`ml-` `pl-` `text-left`…)** | **✅ صفر عبر كل المسارات** |
| خصائص منطقية مستخدمة | 472 |
| مدخلات `/register` بلا `<label>` مرتبطة | **0 من 6** |
| مساحات لمس 44px (`h-11`/`size-11`) | 6 |
| `aria-describedby` على الحقول | ✅ |
| نقاط الاستجابة في الداشبورد | `sm`×57 · `md`×5 · `lg`×4 |
| الجدول مخفي على الموبايل والكروت ظاهرة | ✅ |
| أرقام غربية مصفوفة (`tabular-nums`) | 182 |

```
pnpm --filter @arduino-lab/student typecheck  ✅
pnpm --filter @arduino-lab/student lint       ✅
pnpm --filter @arduino-lab/student build      ✅ 11 مسار
```

### ملاحظة
`/booking/[bookingNumber]/print` مربوط من صفحة الإيصال و"حجوزاتي" لكنه **لسه ما اتعملش** —
ده نطاق خطة 09.
