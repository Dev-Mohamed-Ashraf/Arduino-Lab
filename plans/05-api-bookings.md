---
id: 05
title: API Bookings
status: in-progress
started: 2026-07-22
completed: -
depends_on: [04]
---

# 05 — API Bookings

## الهدف
قلب النظام. إنشاء الحجز بشكل **ذرّي** من غير أي احتمال تجاوز السعة أو صرف مكون مش متاح.

## Endpoints

| Endpoint | الصلاحية | الوصف |
|---|---|---|
| `POST /bookings` | STUDENT / TEACHING_TEAM / ADMIN | إنشاء حجز (ترانزاكشن) |
| `GET /bookings/mine` | مسجّل دخول | حجوزات المستخدم |
| `GET /bookings/:bookingNumber` | صاحب الحجز أو ADMIN/TEAM | تفاصيل الحجز |
| `GET /bookings` | ADMIN / TEACHING_TEAM | كل الحجوزات + بحث + فلاتر + ترقيم |
| `PATCH /bookings/:id` | **ADMIN فقط** | تعديل أي بيانات + تسوية المخزون |
| `PATCH /bookings/:id/slot` | **ADMIN فقط** | نقل الحجز لفترة/تاريخ تاني |
| `DELETE /bookings/:id` | **ADMIN فقط** | إلغاء + إرجاع الكميات للمخزون |

**قفل التعديل:** الطالب مش بيقدر يعدّل ولا يحذف حجزه بعد التأكيد. مفروض بـ guard على السيرفر
(مش إخفاء زرار في الفرونت).

## خوارزمية إنشاء الحجز — الجزء الحرج

```ts
await this.prisma.$transaction(
  async (tx) => {
    // 1) قفل صف الفترة — يمنع سباق التوازي على السعة
    const [slot] = await tx.$queryRaw`
      SELECT id, capacity, "isOpen" FROM "TimeSlot"
      WHERE id = ${input.timeSlotId} FOR UPDATE`;
    if (!slot) throw new SlotNotFoundError();
    if (!slot.isOpen) throw new SlotClosedError();

    // 2) عدّ الحجوزات النشطة لنفس اليوم/الفترة
    const booked = await tx.booking.count({
      where: { timeSlotId: slot.id, bookingDate: input.bookingDate, status: 'CONFIRMED' },
    });
    if (booked >= slot.capacity) throw new SlotFullError();

    // 3) حجز كل مكون بتحديث شرطي ذرّي
    for (const item of input.components) {
      const affected = await tx.$executeRaw`
        UPDATE "Component"
        SET "reservedQuantity" = "reservedQuantity" + ${item.quantity}
        WHERE id = ${item.componentId}
          AND "isActive" = true
          AND ("totalQuantity" - "reservedQuantity") >= ${item.quantity}`;
      if (affected === 0) throw new ComponentOutOfStockError(item.componentId);
    }

    // 4) رقم الحجز من sequence الداتابيز
    const bookingNumber = await nextBookingNumber(tx);

    // 5) إنشاء الحجز + الأعضاء + المكونات
    return tx.booking.create({ /* ... */ });
  },
  { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 },
);
```

### ليه كده بالظبط
- **`FOR UPDATE` على الفترة** — من غيره، اتنين بيحجزوا في نفس اللحظة الاتنين يشوفوا `booked=4`
  والاتنين ينجحوا → 6 مجموعات في فترة سعتها 5.
- **`UPDATE ... WHERE available >= qty`** — الفحص والتعديل في عملية واحدة ذرّية.
  فحص بـ `SELECT` بعده `UPDATE` = ثغرة سباق.
- **`Serializable`** — أعلى مستوى عزل. لو Postgres رجّع `40001` (serialization failure)،
  نعيد المحاولة مرة واحدة تلقائياً.
- **sequence من الداتابيز** لرقم الحجز — عدّاد في الكود بيدي أرقام مكررة تحت الضغط.

## تسوية المخزون عند التعديل / الحذف

| العملية | الأثر على `reservedQuantity` |
|---|---|
| حذف / إلغاء حجز | `-= quantity` لكل مكون فيه |
| تعديل كمية مكون | `+= (الجديدة - القديمة)`، بفحص التوفر |
| إزالة مكون من الحجز | `-= quantity` |
| إضافة مكون للحجز | `+= quantity` بفحص التوفر |
| نقل لفترة تانية | المخزون ما يتغيرش، لكن يتفحص سعة الفترة الجديدة |

كله جوه ترانزاكشن واحدة. لو أي خطوة فشلت، ولا حاجة تتغير.

## AuditLog
كل `PATCH` و `DELETE` من الأدمن بيتسجّل: `actorId` · `action` · `entity` · `entityId` · `before` · `after`.

## التحقق
- إنشاء حجز → المخزون نقص بالظبط بالكميات المطلوبة
- 6 حجوزات لنفس الفترة/اليوم → السادسة 409 `SLOT_FULL`
- طلب كمية أكبر من المتاح → 409 `COMPONENT_OUT_OF_STOCK` **والمخزون ما اتغيّرش**
- مجموعة بـ 7 أعضاء → 400 من zod
- طالب يحاول `PATCH` حجزه → 403
- أدمن يعدّل → 200 + سطر في `AuditLog`
- حذف حجز → الكميات رجعت للمخزون بالظبط
- **10 طلبات متوازية لنفس الفترة → 5 بالظبط ينجحوا** (اختبار e2e في خطة 11)
