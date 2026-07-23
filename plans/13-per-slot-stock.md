---
id: 13
title: مخزون لكل فترة · حد لكل مجموعة · إدارة الفترات
status: done
started: 2026-07-23
completed: 2026-07-23
depends_on: [04, 05, 07, 08]
---

# 13 — مخزون لكل فترة

## الهدف
1. **المخزون بيرجع بعد كل فترة** — المجموعة تتنافس على القطع مع مجموعات نفس
   (اليوم + الفترة) بس. فترة تانية أو يوم تاني = مخزون كامل.
2. **حد لكل مجموعة من كل مكوّن** — `maxPerBooking` افتراضي 1، الأدمن يعدّله.
3. **تحكّم كامل في الفترات** — تعديل الاسم والمواعيد والسعة + إضافة + حذف.

## التغيير الجذري

`Component.reservedQuantity` (عدّاد عالمي) **يتشال خالص**. المتاح بقى مشتقّاً:

```
المتاح(مكوّن, تاريخ, فترة) = totalQuantity − SUM(BookingComponent.quantity)
                              للحجوزات CONFIRMED في نفس (التاريخ، الفترة)
```

**ده بيبسّط الكود:** `reserveComponents` و `releaseComponents` و
`applyComponentDelta` كلها تتشال. الإلغاء والتعديل ما بقاش لهم أثر على المخزون،
وخطر انحراف العدّاد بيختفي.

**ضمان التزامن بيفضل قائم:** `lockSlot()` بياخد `FOR UPDATE` على صف الفترة وبيسلسل
كل الحجوزات عليها، فـ `SUM(...)` جوّه القفل مستحيل يسابقه حد.
الضمان بتاع [خطة 05](./05-api-bookings.md) صحيح زي ما هو.

## نتيجة لازمة: ترتيب الويزارد

مينفعش نعرض المتاح قبل ما نعرف الفترة.

```
قبل:  المجموعة → الأعضاء → البطاقة → المشروع → المكوّنات → الموعد → المراجعة
بعد:  المجموعة → الأعضاء → البطاقة → المشروع → الموعد → المكوّنات → المراجعة
```

## التحقق
- e2e: نفس الفترة يتنافسوا · فترة تانية متاحة كاملة · يوم تاني متاح ·
  تجاوز الحد → 409 · الإلغاء يرجّع المتاح · تعديل الأدمن ما يحسبش نفسه
- `bookings-concurrency` القائم لازم يفضل أخضر

---

## اللي اتنفّذ فعلاً

### الداتابيز
- `apps/api/prisma/schema.prisma` — `reservedQuantity` اتشال، `maxPerBooking` اتضاف.
- `apps/api/prisma/migrations/20260723010000_per_slot_stock_and_limits/migration.sql` —
  اتطبّقت على Neon. القيد القديم `component_quantities_valid` اتشال واتعوّض بـ
  `component_total_quantity_valid` + `component_max_per_booking_positive`.
  **من غير index في SQL خام** — Prisma بيشيل أي index مش معرّف في الـ schema
  (الدرس ده من [خطة 01](./01-database-schema.md)).

### الباك-اند
- **جديد** `modules/components/availability.query.ts` — استعلام واحد مشترك بيرجّع
  `usedQuantity` لكل مكوّن في (تاريخ + فترة) بـ subquery مترابط.
- `modules/bookings/stock.helper.ts` — اتكتب من الأول: `reserveComponents` و
  `releaseComponents` و `applyComponentDelta` اتشالوا، وبقى فيه دالة واحدة
  `assertComponentsAvailable`.
- `bookings.service.ts` · `bookings-admin.service.ts` — التحقق جوّه الترانزاكشن بعد
  القفل؛ `cancel` بقى تغيير حالة بس؛ `update` بيبعت `excludeBookingId`.
- `components.service.ts` — `readSessionUsage` · `countUpcomingDemand` ·
  `assertNotBelowUpcomingDemand`؛ الحذف بيتفحص الطلب القادم مش العدّاد.
- `slots.service.ts` + `slots.controller.ts` — `POST /slots` و `DELETE /slots/:id`
  و `update` وسّعت للاسم والمواعيد. الحذف بيترفض بـ `SLOT_HAS_BOOKINGS`.
- `reports.service.ts` — `currentlyReserved`/`availableQuantity` اتعوّضوا بـ
  `peakSessionDemand` (أعلى مجموع في فترة واحدة).

### العقود
- `component.schema.ts` — `maxPerBooking` + `usedQuantity`، والاستعلام بيقبل
  `date` + `timeSlotId`.
- `slot.schema.ts` — `createSlotSchema` + `updateSlotSchema` موسّعة (HH:MM بـ regex).
- `errors.ts` — `COMPONENT_EXCEEDS_LIMIT` · `SLOT_HAS_BOOKINGS` · `SLOT_LABEL_TAKEN`.

### موقع الطلبة
- `booking-wizard/steps.ts` + `booking-wizard.tsx` — الموعد بقى قبل المكوّنات،
  و`stepIndexForErrorCode` اتظبطت على الترتيب الجديد.
- `step-components.tsx` — بيجيب المتاح للفترة المختارة ويحدّث كل 15 ثانية،
  والزرار بيقف عند `min(المتاح, الحد لكل مجموعة)`، وبادج «الحد لمجموعتك».
- `dashboard/components-panel.tsx` — «الكمية بالمعمل» و«الحد لكل مجموعة» بدل رقم
  متاح عالمي بلا معنى.

### لوحة الأدمن
- **جديد** `components/inline-number-field.tsx` — تعديل رقم من الجدول مباشرة.
- `components/page.tsx` — «الكمية بالمعمل» و«الحد لكل مجموعة» الاتنين بيتعدّلوا
  inline، وعمود «المحجوز» اتشال.
- `component-dialog.tsx` — حقل `maxPerBooking` بشرح تحته.
- **جديد** `slots/slot-dialog.tsx` + `slots/slot-card.tsx`؛ `slots/page.tsx`
  بقى فيه إضافة وتعديل وحذف بتأكيد.
- `bookings/component-picker.tsx` — بيقرا المتاح لفترة الحجز نفسها.
- `reports/page.tsx` + `overview-stats.tsx` — «أعلى طلب في فترة» و«الحالة عند الذروة»
  هما إشارة إعادة التخزين الجديدة.

### انحرافات عن الخطة
- **الأدمن كمان محكوم بـ `maxPerBooking`** — القاعدة واحدة على السيرفر لكل المسارات،
  والأدمن لو عايز أكتر يرفع الحد نفسه. أبسط من استثناء في الخدمة.
- **تقارير المخزون** بتعرض الضغط عند الذروة بدل «المتاح»، لأن رقم متاح واحد من غير
  فترة بقى بلا معنى.

### نتيجة التحقق
```
pnpm check    → lint + typecheck + build ✅ (4 tasks)
pnpm test     → 25 اختبار ✅
pnpm test:e2e → 15 اختبار ✅ (منهم 7 جداد في per-slot-stock.e2e-spec.ts)
```
`bookings-concurrency` فضل أخضر: ضمان القفل ما اتغيّرش.
