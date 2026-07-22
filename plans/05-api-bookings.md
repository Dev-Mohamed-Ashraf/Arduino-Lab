---
id: 05
title: API Bookings
status: done
started: 2026-07-22
completed: 2026-07-22
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

---

## اللي اتنفّذ فعلاً — 2026-07-22

### الملفات
```
src/modules/bookings/  booking.mapper.ts · stock.helper.ts · slot-lock.helper.ts
                       bookings.service.ts · bookings-admin.service.ts
                       bookings.controller.ts · bookings.module.ts
src/common/guards/     user-throttler.guard.ts
```

### انحرافات عن الخطة

1. **مستوى العزل `ReadCommitted` مش `Serializable`.**
   الخطة كانت بتحدد Serializable. المشكلة إنه بيخلّي التحديث الشرطي الذرّي يفشل بـ
   `40001` بدل ما ينجح، فيحتاج منطق إعادة محاولة من غير أي مكسب: قفل `FOR UPDATE`
   على الفترة + `UPDATE ... WHERE available >= qty` الاتنين آليات قفل صحيحة تحت
   ReadCommitted. Postgres بيعيد تقييم شرط `WHERE` على أحدث نسخة من الصف لما
   ترانزاكشنين يتنافسوا عليه — وده بالظبط اللي محتاجينه.

2. **`readOccupancy` منفصل عن `lockSlot` عمدًا.**
   دمج العدّ في استعلام القفل كان هيبان تحسين، بس هو **غلط**: تحت ReadCommitted كل
   جملة بتاخد snapshot جديد وقت بدايتها. لو الجملة اتعلّقت مستنية القفل، الـ snapshot
   بتاعها بقى قديم والعدّ مش هيشوف الحجز اللي التزم لسه. لازم يبقى جملة تانية.

3. **رقم الحجز بيتسحب قبل الترانزاكشن.** الـ sequences في Postgres مش ترانزاكشنية أصلًا،
   فالسحب جوّه مكنش بيضيف أمان — كان بس بيضيف رحلة شبكة جوّه القسم الحرج.

4. **حجز المكونات بقى جملتين بدل N.** الأول `SELECT ... ORDER BY id FOR UPDATE`
   بيقفل كل الصفوف بترتيب ثابت (يمنع الـ deadlock)، وبعده `UPDATE ... FROM UNNEST(...)`
   واحد بيحجز الكل ويرجّع الـ ids اللي نجحت.

5. **`UserThrottlerGuard` اتعمل.** الـ ThrottlerGuard الافتراضي بيتتبّع بالـ IP بس —
   والمعمل كله ورا NAT واحد، يعني أول 10 حجوزات كانت هتقفل كل الطلبة الباقيين.
   دلوقتي بيتتبّع بالـ user id، وترتيب الحُرّاس اتعكس (`JwtAuthGuard` قبل الـ throttler)
   عشان `request.user` يكون متاح. الحد بقى 30/ساعة/مستخدم عشان معيد يقدر يسجّل جلسة كاملة.

### الباج اللي اتصاد

أول تشغيل للسباق: **1 نجح و9 رجّعوا 500**، مش 5 و5.

```
Transaction already closed: the timeout for this transaction was 5000 ms,
however 5149 ms passed since the start of the transaction.
```

مهلة Prisma الافتراضية للترانزاكشن التفاعلية 5 ثواني. الحجوزات بتصطف ورا قفل الفترة
بحكم التصميم، وكل واحدة كانت فيها 8 رحلات ذهاب وعودة لـ Neon البعيد. العاشر كان
بيتجاوز المهلة ويرجّع 500 بدل "الفترة مكتملة".

**الحل من تلات اتجاهات:**
- الرحلات جوّه الترانزاكشن نزلت من ~8 لـ 4 (البنود 2 و3 و4 فوق)
- `maxWait: 20s` و `timeout: 30s`
- `connection_limit=20` و `pool_timeout=30` بيتحطوا على رابط الداتاسورس في
  `PrismaService` — الافتراضي (عدد المعالجات × 2 + 1) رقم أحادي على Render وكان
  هيجوّع دفعة الحجوزات المتزامنة قبل ما القفل نفسه يبقى عنق الزجاجة

### التحقق الفعلي

**32 فحص كلهم عدّوا، والسباق اتعاد مرتين بنفس النتيجة:**

```
race outcomes: 201 201 201 201 409:SLOT_FULL 409:SLOT_FULL 201 409 409 409
race outcomes: 201 201 201 409:SLOT_FULL 409:SLOT_FULL 201 201 409 409 409
```

| الفئة | الفحوصات |
|---|---|
| المسار السليم | حجز ناجح · رقم `ARD-2026-NNNN` · ترتيب الأعضاء · خصم دقيق · الداشبورد اتحدّث |
| التحقق | تاريخ ماضٍ · العضو السابع · رقم مجموعة مكرر |
| **الذرّية** | مكون متاح + مكون ناقص → 409، **المتاح ما اتخصمش**، **مفيش صف حجز اتعمل** |
| **التزامن** | 10 متوازية → **5 بالظبط** · صفوف الداتابيز = 5 · آخر قطعة → **واحد بس يكسب** · `reservedQuantity` ما زادش عن الإجمالي |
| القفل | الطالب ما يعدّلش ولا يلغي · ما يقراش حجز غيره · صاحب الحجز يقرا |
| الأدمن | تعديل + تسوية دلتا المخزون · نقل فترة · النقل لفترة مكتملة → 409 |
| الإلغاء | الكميات رجعت بالظبط · إلغاء مرتين → 409 · رقم المجموعة بيتعاد استخدامه |
| Audit | إجراءات الأدمن اتسجّلت |

```
pnpm --filter @arduino-lab/api build      ✅
pnpm --filter @arduino-lab/api lint       ✅
pnpm --filter @arduino-lab/api typecheck  ✅
```
السكربت اتمسح. الاختبارات الدائمة في خطة 11.
