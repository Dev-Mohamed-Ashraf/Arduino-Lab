---
id: 06
title: API Uploads · Mail · Reports
status: planned
started: -
completed: -
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
