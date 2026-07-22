---
id: 01
title: Database Schema
status: done
started: 2026-07-22
completed: 2026-07-22
depends_on: [00]
---

# 01 — Database Schema

## الهدف
تعريف كل نماذج الداتابيز في Prisma، أول migration، القيود اليدوية، والبيانات المبدئية.

## المخرجات

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/` — أول migration
- migration يدوية للقيود اللي Prisma مش بيعملها (check constraints + sequence)
- `apps/api/prisma/seed.ts`

## النماذج

| النموذج | الغرض |
|---|---|
| `User` | طالب / فريق تدريس / أدمن |
| `EmailVerificationToken` | تأكيد الإيميل الجامعي |
| `PasswordResetToken` | استعادة كلمة السر |
| `RefreshToken` | refresh tokens دوّارة (hash مخزّن) |
| `TimeSlot` | الفترات الأربعة + السعة + مفتوحة/مقفولة |
| `Component` | مكون أردوينو + `totalQuantity` + `reservedQuantity` |
| `Booking` | الحجز |
| `BookingMember` | أعضاء المجموعة (≤6) |
| `BookingComponent` | المكونات المطلوبة + الكمية |
| `AuditLog` | سجل تعديلات الأدمن |

## قرارات تصميمية

1. **`bookingDate` موجود في `Booking`** — الفترات بتتكرر كل يوم، فالسعة 5 لكل
   `(bookingDate, timeSlotId)` مش 5 للأبد.
2. **`reservedQuantity` عدّاد منفصل** بدل تنقيص `totalQuantity` — الإجمالي الأصلي يفضل
   محفوظ للتقارير، والمتاح = `totalQuantity - reservedQuantity` (محسوب، مش مخزّن).
3. **`bookingNumber` من Postgres sequence** — مش عدّاد في الكود (بيتكسر مع التوازي).
4. القيود الحرجة مفروضة في الداتابيز نفسها، مش في الكود بس.

## قيود يدوية في migration منفصلة

```sql
-- الكميات مينفعش تبقى سالبة والمحجوز مايزيدش عن الإجمالي
ALTER TABLE "Component"
  ADD CONSTRAINT "component_quantities_valid"
  CHECK ("totalQuantity" >= 0
     AND "reservedQuantity" >= 0
     AND "reservedQuantity" <= "totalQuantity");

-- سعة الفترة موجبة
ALTER TABLE "TimeSlot"
  ADD CONSTRAINT "timeslot_capacity_positive" CHECK ("capacity" > 0);

-- كمية المكون في الحجز موجبة
ALTER TABLE "BookingComponent"
  ADD CONSTRAINT "booking_component_qty_positive" CHECK ("quantity" > 0);

-- عدّاد أرقام الحجوزات
CREATE SEQUENCE booking_number_seq START 1;
```

## Seed

- 4 فترات: `11:00-12:00` · `12:00-13:00` · `13:00-14:00` · `14:00-15:00` — سعة 5، مفتوحة.
- مستخدم أدمن من `SEED_ADMIN_*` في `.env`.
- ~25 مكون أردوينو شائع بكميات مبدئية (Arduino Uno, Breadboard, Jumper Wires,
  LED, Resistors, Servo SG90, Ultrasonic HC-SR04, DHT11, LCD 16x2, Relay,
  Buzzer, IR Sensor, LDR, Potentiometer, Push Button, Motor Driver L298N,
  Bluetooth HC-05, ESP8266, Battery Holder, Soil Moisture, Gas MQ-2, Flame Sensor,
  Stepper 28BYJ-48, RFID RC522, Keypad 4x4).
- الـ seed **idempotent** — `upsert` مش `create`، ينفع يتشغّل أكتر من مرة.

## التحقق
- `pnpm db:migrate` بينجح
- `pnpm db:seed` بينجح ولما يتشغّل تاني ما بيعملش تكرار
- `pnpm db:studio` بيعرض الفترات الأربعة والمكونات
- محاولة `UPDATE "Component" SET "reservedQuantity" = 9999` بترفض من الـ check constraint

---

## اللي اتنفّذ فعلاً — 2026-07-22

### الملفات
- `apps/api/prisma/schema.prisma` — 10 نماذج + 3 enums
- `apps/api/prisma/migrations/20260722000000_init/` — 50 عملية إنشاء جدول/فهرس/مفتاح أجنبي
- `apps/api/prisma/migrations/20260722000100_add_constraints_and_sequence/` — القيود اليدوية
- `apps/api/prisma/seed.ts` + `apps/api/prisma/seed-data.ts`
- `apps/api/prisma.config.ts` · `apps/api/package.json` · `tsconfig.json` · `nest-cli.json` · `eslint.config.mjs`
- `packages/contracts/` أُنشئت مبكرًا هنا لأن `apps/api` بيعتمد عليها في الـ workspace

### انحرافات عن الخطة

1. **رقم المجموعة الفريد اتشال من الداتابيز.**
   الخطة كانت `@@unique([bookingDate, timeSlotId, groupNumber])`. المشكلة: القيد ده
   بيمنع إعادة استخدام رقم المجموعة بعد إلغاء الحجز، لأن الصف الملغي بيفضل شاغل القيد.
   Postgres بيدعم partial unique index (`WHERE status = 'CONFIRMED'`) لكن Prisma
   بيعتبره drift وبيحاول يحذفه في أول `migrate dev`.
   **الحل**: الفرادة اتفرضت في `BookingsService` تحت قفل `FOR UPDATE` على صف الفترة —
   القفل بيسلسل كل حجوزات الفترة، فالفحص آمن. اتساب `@@index([groupNumber])` للبحث.

2. **`prisma.config.ts` بدل `package.json#prisma`.**
   البلوك القديم بيطلع تحذير deprecation مع كل أمر وهيتشال في Prisma 7.
   الملف الجديد بيوقف تحميل `.env` التلقائي بتاع Prisma، فاتضاف `dotenv` بيقرا
   `.env` من جذر الـ monorepo ثم `.env` المحلي (لو موجود يـ override).

3. **`DIRECT_URL` اتشتق من الرابط المجمّع** — Neon بيستخدم نفس الهوست من غير `-pooler`.

4. **قيود إضافية مش في الخطة**: `booking_group_number_positive` و
   trigger `booking_member_limit`. الفهارس اليدوية اتتجنّبت عمدًا (Prisma بيديرها وبيحذف
   أي فهرس مش معرّف في الـ schema).

5. **38 مكون بدل 25** — اتقسّموا: لوحات · تجارب · إخراج · حساسات · محرّكات · اتصالات · عناصر خاملة.

### التحقق الفعلي

```
prisma migrate deploy   ✅ الـ migrationين اتطبقوا على Neon
prisma db seed          ✅ 4 فترات · 1 أدمن · 38 مكون
prisma db seed (تاني)   ✅ نفس الأعداد بالظبط — idempotent
```

سكربت تحقق مؤقت اتشغّل على الداتابيز الحقيقية وكل الحالات عدّت:

| الحالة | النتيجة |
|---|---|
| `reservedQuantity > totalQuantity` | ✅ اترفض — `23514 component_quantities_valid` |
| `totalQuantity = -1` | ✅ اترفض — نفس القيد |
| `capacity = 0` | ✅ اترفض — `timeslot_capacity_positive` |
| `next_booking_number(2026)` | ✅ رجّع `ARD-2026-0001` |
| حجز بـ 6 أعضاء بالظبط | ✅ اتقبل |
| إضافة العضو السابع | ✅ اترفض — `Booking … exceeds the 6 member limit` |
| `BookingComponent.quantity = 0` | ✅ اترفض — `booking_component_quantity_positive` |
| نفس المكون مرتين في حجز | ✅ اترفض — unique `(bookingId, componentId)` |
| حذف الحجز | ✅ الأعضاء اتحذفوا cascade، مفيش صفوف يتيمة |

السكربت اتمسح بعد التحقق. الاختبارات الدائمة في خطة 11.
