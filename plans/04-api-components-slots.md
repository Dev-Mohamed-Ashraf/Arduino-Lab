---
id: 04
title: API Components + Slots
status: done
started: 2026-07-22
completed: 2026-07-22
depends_on: [03]
---

# 04 — API Components + Slots

## الهدف
إدارة مخزون المكونات + إدارة الفترات الزمنية + endpoint الداشبورد العام.

## Components

| Endpoint | الصلاحية | الوصف |
|---|---|---|
| `GET /components` | عام | قائمة + `availableQuantity` محسوب + فلترة/بحث/ترقيم |
| `GET /components/:id` | عام | تفاصيل |
| `POST /components` | ADMIN | إضافة مكون |
| `PATCH /components/:id` | ADMIN | تعديل الاسم/الوصف/الكمية |
| `DELETE /components/:id` | ADMIN | حذف — **يترفض لو مرتبط بحجز نشط** (soft delete: `isActive=false`) |
| `POST /components/bulk` | ADMIN | إضافة جماعية من CSV |

### قواعد
- `availableQuantity = totalQuantity - reservedQuantity` — **محسوب**، مش عمود مخزّن.
- حالة التوفر: `available` (>25%) · `low` (1–25%) · `out` (0).
- تقليل `totalQuantity` لأقل من `reservedQuantity` → **409** برسالة عربية توضح إن فيه كمية محجوزة.
- كل تعديل من الأدمن يتسجّل في `AuditLog`.

## Slots

| Endpoint | الصلاحية | الوصف |
|---|---|---|
| `GET /slots` | عام | الفترات الأربعة |
| `GET /slots/availability?date=YYYY-MM-DD` | عام | لكل فترة: `booked` · `capacity` · `remaining` · `isOpen` · `isFull` |
| `PATCH /slots/:id` | ADMIN | تغيير `capacity` أو `isOpen` |

### قواعد
- تقليل `capacity` لأقل من عدد الحجوزات الحالية في نفس اليوم → **409**.
- `isOpen=false` بيمنع الحجوزات الجديدة بس، ما بيلغيش القديمة.
- التاريخ الافتراضي لو مش متبعت = النهارده بتوقيت `Africa/Cairo`.

## Dashboard endpoint

`GET /dashboard?date=YYYY-MM-DD` — **عام**، طلب واحد بيرجّع كل اللي الصفحة الرئيسية محتاجاه:

```ts
{
  date: string,
  slots: Array<{ id, label, booked, capacity, remaining, isOpen, isFull }>,
  components: Array<{ id, name, totalQuantity, availableQuantity, status }>,
  summary: { totalBookingsToday, totalRemainingSeats, lowStockCount, outOfStockCount }
}
```

السبب: الصفحة الرئيسية أكتر صفحة بتتفتح — طلب واحد أحسن من تلاتة، ومهم مع Render المجاني.

## التحقق
- `GET /dashboard` بيرجّع 4 فترات و`0/5` وكل المكونات
- إضافة مكون بأدمن ينجح، وبطالب يرجّع 403
- تقليل `totalQuantity` تحت المحجوز → 409
- تقليل `capacity` تحت عدد المحجوز → 409
- `GET /slots/availability?date=2026-08-01` بيرجّع أرقام صح

---

## اللي اتنفّذ فعلاً — 2026-07-22

### الملفات
```
src/modules/audit/       audit.service.ts · audit.module.ts
src/modules/components/  component.mapper.ts · components.service.ts
                         components.controller.ts · components.module.ts
src/modules/slots/       slots.service.ts · slots.controller.ts · slots.module.ts
src/modules/dashboard/   dashboard.service.ts · dashboard.controller.ts · dashboard.module.ts
```

### انحرافات عن الخطة

1. **`AuditModule` اتعمل هنا بدل خطة 05.** الخطة كانت بتقول إن سجل التدقيق مع الحجوزات،
   بس تعديلات الأدمن على المكونات والفترات محتاجة تتسجّل من دلوقتي. الموديول global.

2. **تسجيل التدقيق ما بيوقعش العملية أبدًا.** لو الإدراج في `AuditLog` فشل، التغيير اللي
   الأدمن عمله بيفضل ناجح والفشل بيتسجّل في اللوج. سجل التدقيق مش أهم من العملية نفسها.

3. **الحذف بيتحوّل لتعطيل لو فيه تاريخ.** الخطة قالت "soft delete". التنفيذ بيفرّق:
   - فيه كمية محجوزة حاليًا → **409** (لا حذف ولا تعطيل)
   - مربوط بحجوزات سابقة → **تعطيل** (`{ deleted: false }`)
   - مفيش أي ارتباط → **حذف فعلي** (`{ deleted: true }`)
   حذف مكون ظاهر في حجز قديم كان هيمسح إيه اللي المجموعة استلمته فعلًا.

4. **فلترة `status` بتتم في الذاكرة مش في SQL.** حالة التوفر قيمة مشتقة من نسبة
   `LOW_STOCK_THRESHOLD_RATIO`؛ تنفيذها في SQL كان معناه تكرار قاعدة العتبة في مكانين.

5. **فحص تقليل السعة بيستخدم أكتر يوم مزدحم.** السعة لكل فترة **لكل يوم**، فالحد الأدنى
   المسموح هو أكبر عدد مجموعات محجوز في يوم واحد قادم، مش الإجمالي.

6. **`GET /components/:id` بيرجّع المعطّل كمان** — لوحة الأدمن محتاجة تعرضه.

### التحقق الفعلي

سكربت فحص اتشغّل على السيرفر والداتابيز الحقيقية، **34 فحص كلهم عدّوا**:

| المجموعة | الأمثلة |
|---|---|
| Dashboard | عام · 4 فترات · `0/5` · 38 مكون · الملخص متسق · التاريخ بتوقيت القاهرة |
| Slots | مرتّبة · مجهول ما يقدرش يعدّل · إغلاق يمنع الحجز · `capacity=0` مرفوض · patch فاضي مرفوض |
| Components | ترقيم · المتاح مشتق · بحث · اسم مكرر → 409 · `low` عند 5/25 · `out` عند 0 |
| القيود | تقليل الإجمالي تحت المحجوز → 409 · الحذف والكمية محجوزة → 409 |
| Bulk | الأسماء الموجودة اتتخطّت (`created: 1, skipped: 1`) |
| الحذف | مكون بدون تاريخ اتحذف فعليًا · بعده 404 |
| Audit | تعديلات المكونات والفترات اتسجّلت |

```
pnpm --filter @arduino-lab/api build      ✅
pnpm --filter @arduino-lab/api lint       ✅
pnpm --filter @arduino-lab/api typecheck  ✅
```

`ComponentsService.update` كان تعقيده 16 (الحد 12) بسبب نمط الـ conditional spread —
اتفكّك لدالة `toUpdateData` مستقلة. السكربت اتمسح بعد التحقق.
