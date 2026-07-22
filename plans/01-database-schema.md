---
id: 01
title: Database Schema
status: in-progress
started: 2026-07-22
completed: -
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
