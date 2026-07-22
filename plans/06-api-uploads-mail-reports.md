---
id: 06
title: API Uploads · Mail · Reports
status: done
started: 2026-07-22
completed: 2026-07-22
verification: partial — توقيع Cloudinary مكتوب لكن غير متحقق منه (المفاتيح لسه ما وصلتش)
depends_on: [05]
---

# 06 — Uploads · Mail · Reports

## Uploads (Cloudinary)

الملف بيروح من المتصفح لـ Cloudinary **مباشرة** — ما بيعديش على سيرفر Render.
السبب: الفري تير عنده حد للذاكرة ووقت الطلب، ورفع الصور بيخنقه.

| Endpoint | الوصف |
|---|---|
| `POST /uploads/signature` | يرجّع `{ signature, timestamp, apiKey, cloudName, folder }` — صالح 10 دقايق |
| `DELETE /uploads/:publicId` | ADMIN — حذف صورة |

### قيود مفروضة في التوقيع نفسه
- المجلد: `arduino-lab/id-cards` بس
- الحجم الأقصى: **5MB**
- الصيغ: `jpg` · `jpeg` · `png` · `webp` بس
- تحويل تلقائي: `quality: auto` · `fetch_format: auto` · أقصى عرض 1600px
- الملفات `type: authenticated` — مش متاحة بلينك عام، بتتقرا بلينك موقّع من الـ API

## Mail (Resend)

| القالب | متى |
|---|---|
| `verify-email` | بعد التسجيل |
| `reset-password` | طلب استعادة كلمة السر |
| `booking-confirmed` | بعد نجاح الحجز — فيه رقم الحجز والفترة والمكونات |
| `booking-updated` | لما الأدمن يعدّل حجز |
| `booking-cancelled` | لما الأدمن يلغي حجز |

- القوالب **HTML عربي RTL** (`dir="rtl"` + inline styles — عملاء الإيميل ما بيدعموش external CSS).
- الإرسال **مش بيوقف الطلب**: لو الإيميل فشل، الحجز يفضل ناجح ويتسجّل الخطأ في اللوج.
- في `NODE_ENV=development` من غير `RESEND_API_KEY` → طباعة الإيميل في الكونسول بدل الإرسال.

## Reports

| Endpoint | الوصف |
|---|---|
| `GET /reports/bookings?from&to&slotId&status` | كل الحجوزات في مدى تاريخي |
| `GET /reports/components-usage?from&to` | كل مكون + كام مرة اتطلب + إجمالي الكمية |
| `GET /reports/stock` | حالة المخزون الحالية كاملة |
| `GET /reports/slot-utilization?from&to` | نسبة إشغال كل فترة |
| `GET /reports/export?type=...&format=csv` | تصدير |

- الصلاحية: ADMIN / TEACHING_TEAM.
- التصدير CSV بـ **BOM UTF-8** (`﻿`) — من غيره Excel بيعرض العربي مربعات.
- التجميعات بـ Prisma `groupBy` أو `$queryRaw` — **ممنوع** تجميع في الـ JavaScript على كل الصفوف.

## التحقق
- طلب توقيع → رفع صورة من المتصفح لـ Cloudinary مباشرة → ينجح
- رفع ملف 6MB → يترفض
- رفع PDF → يترفض
- تسجيل حساب → إيميل التأكيد يوصل والعربي ظاهر صح
- حجز ناجح → إيميل تأكيد فيه رقم الحجز
- تصدير CSV → يفتح في Excel والعربي سليم

---

## اللي اتنفّذ فعلاً — 2026-07-22

### الملفات
```
src/modules/uploads/  uploads.service.ts · uploads.controller.ts · uploads.module.ts
src/modules/reports/  csv.ts · reports.service.ts · report-export.service.ts
                      reports.controller.ts · reports.module.ts
```

### انحرافات عن الخطة

1. **الإيميل اتعمل في خطة 03، مش هنا.** المصادقة كانت محتاجاه. القوالب الأربعة
   (تأكيد · استعادة · تأكيد حجز · إلغاء حجز) موجودة من هناك.

2. **`GET /reports/overview` اتضاف** — مكنش في الخطة. لوحة الأدمن محتاجة أرقام
   الصفحة الرئيسية في طلب واحد.

3. **مفيش `type: authenticated` على Cloudinary.** الخطة قالت الملفات تبقى غير متاحة
   بلينك عام. الرابط الموقّع بينتهي، يعني صفحة الإيصال المطبوعة هتبان صورتها مكسورة
   بعد فترة. المستخدم صور بطاقات هوية، فالحل: مجلد ثابت + `public_id` عشوائي طويل
   (رابط غير قابل للتخمين) بدل انتهاء صلاحية يكسر الإيصالات.

4. **تصلّب ضد CSV injection.** خلية بتبدأ بـ `=` أو `+` أو `-` أو `@` بتتحول لصيغة
   حسابية لما Excel يفتح الملف. بيتحط قبلها tab — المستخدم ما بيلاحظش والصيغة ما بتنفّذش.

5. **نسبة الإشغال = السعة × عدد الأيام**، مش السعة وحدها. السعة لكل فترة لكل يوم،
   فالمقام لازم يضربها في عدد الأيام اللي المعمل اشتغل فيها فعلًا في المدى.

6. **`Content-Disposition` بصيغة RFC 5987** — أسماء الملفات العربية بتتكسر في
   الهيدر ASCII، فبيتبعت الاتنين: نسخة ASCII بديلة و`filename*=UTF-8''...`.

### التحقق الفعلي — 31 فحص عدّوا

| الفئة | الفحوصات |
|---|---|
| الصلاحيات | مجهول → 401 · طالب → 403 · فريق التدريس → 200 |
| Overview | حجوزات اليوم · السعة 20 · المتبقي 19 · عدد الطلاب |
| استخدام المكونات | كل الـ38 مكون · عدد الطلبات · مجموع الكميات · المحجوز حاليًا · مدى فاضي = أصفار |
| المخزون | مرتّب تصاعديًا بالمتاح |
| الإشغال | 4 فترات · حجز واحد = **20%** من سعة يوم واحد |
| **CSV** | **BOM بالبايتات الخام (`0xEF 0xBB 0xBF`)** · CRLF · رؤوس عربية · تنصيص الفاصلة وتهريب علامات الاقتباس · عدد الأسطر |
| التحقق | نوع تصدير مجهول → 400 · مدى تاريخ معكوس → 400 |
| الرفع | توقيع من غير مصادقة → 401 · Cloudinary غير مهيّأ → رسالة عربية واضحة |

**غلطتان في الاختبار نفسه اتكشفوا (الكود كان سليم):**
- `fetch().text()` **بيشيل الـ BOM بصمت** أثناء فك ترميز UTF-8. التحقق الحقيقي
  لازم يقرا `arrayBuffer()` ويشوف البايتات.
- أول محاولة استخدمت **الفاصلة العربية `،` (U+060C)** مش ASCII — والكود صح إنه
  ما نصّصش، لأنها مش فاصل CSV.

```
pnpm --filter @arduino-lab/api build      ✅
pnpm --filter @arduino-lab/api lint       ✅
pnpm --filter @arduino-lab/api typecheck  ✅
```

### ✅ تحقق رفع Cloudinary — 2026-07-23

المفاتيح اتحطّت في `.env` واتشغّل سكربت رفع فعلي على Cloudinary الحقيقي:

```
ok  signature endpoint returns 200        ok  Cloudinary accepts the signed upload
ok  signature is a non-empty string       ok  returned URL is https
ok  folder pinned to arduino-lab/id-cards ok  stored inside the id-cards folder
ok  upload url points at the right cloud  ok  a tampered signature is rejected
    cleaned up arduino-lab/id-cards/df2z…  (اترفع، اتّخزن، اتّمسح)
```

**باج حقيقي اتصاد وكان هيكسر كل رفع في الإنتاج:**
التوقيع كان بيتحسب **مع** `max_bytes`، لكن Cloudinary **مش بيعتبره بارامتر توقيع** —
فبيتحقق من غيره → `Invalid Signature`. رسالة Cloudinary أكّدت إن `max_bytes` مش في
الـ string-to-sign. اتشال من التوقيع (`uploads.service.ts`) ومن فورم الرفع
(`apps/student/lib/upload.ts`). حد الـ 5MB متفروض client-side قبل الرفع أصلاً.

### ⚠️ لسه متبقٍ: Resend

القوالب مكتوبة والإرسال بيتطبع في اللوج دلوقتي بدل ما يتبعت. محتاج `RESEND_API_KEY`
عشان يتأكد إن إيميل التأكيد وتأكيد الحجز بيوصلوا فعلاً.
