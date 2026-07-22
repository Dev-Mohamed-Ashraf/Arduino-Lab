---
id: 04
title: API Components + Slots
status: planned
started: -
completed: -
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
