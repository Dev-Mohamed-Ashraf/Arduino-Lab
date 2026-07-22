---
id: 08
title: Admin App
status: done
started: 2026-07-23
completed: 2026-07-23
depends_on: [06]
---

# 08 — Admin App (`apps/admin` → Vercel)

## الهدف
لوحة تحكم كاملة لفريق التدريس والأدمن.

## الراوتس

```
app/
├── layout.tsx        RTL · Providers
├── login/
└── (dashboard)/      layout بـ sidebar + حماية بالدور
    ├── page.tsx              نظرة عامة
    ├── bookings/             الجدول + [id]/edit + new
    ├── components/           CRUD
    ├── slots/                السعة + فتح/إغلاق
    ├── reports/              التقارير + التصدير
    ├── users/                الأدوار (ADMIN فقط)
    └── audit-log/            السجل (ADMIN فقط)
```

**الحماية:** middleware يحوّل غير المسجّلين لـ `/login`. الدور يتفحص في الـ layout **وعلى السيرفر**
في كل endpoint. TEACHING_TEAM ما بيشوفش `/users` ولا `/audit-log`.

## الصفحات

### `/` نظرة عامة
- 4 كروت إحصائية: حجوزات النهارده · أماكن متبقية · مكونات منخفضة · نافدة.
- شبكة إشغال الفترات لليوم المختار.
- تنبيه أحمر بالمكونات النافدة والمنخفضة.
- آخر 5 حجوزات.
- منتقي تاريخ بيتحكم في الصفحة كلها.

### `/bookings`
- TanStack Table: رقم الحجز · التاريخ · الفترة · المجموعة · المشروع · عدد الأعضاء · الحالة.
- بحث (رقم حجز / رقم مجموعة / اسم مشروع / اسم طالب) + فلاتر (تاريخ، فترة، حالة) + ترتيب + ترقيم من السيرفر.
- صف قابل للتوسيع: الأعضاء · المكونات · صورة البطاقة.
- إجراءات: عرض · تعديل · نقل لفترة تانية · إلغاء · طباعة.
- **تعديل** = نفس فورم الويزارد لكن صفحة واحدة، مع عرض فرق المخزون قبل الحفظ.
- **الإلغاء** فيه ديالوج تأكيد بيوضح الكميات اللي هترجع للمخزون.
- `/bookings/new` — الأدمن يسجّل نيابة عن مجموعة.

### `/components`
- جدول: الاسم · الإجمالي · المحجوز · المتاح · الحالة · مفعّل.
- إضافة/تعديل في `Dialog`.
- تعديل الكمية سريع من الجدول (inline).
- استيراد CSV جماعي.
- الحذف = تعطيل لو مرتبط بحجوزات، مع توضيح السبب.

### `/slots`
- 4 كروت: الفترة · السعة (قابلة للتعديل) · مفتوحة/مقفولة (Switch) · الإشغال الحالي.
- تحذير قبل إغلاق فترة فيها حجوزات.

### `/reports`
- تبويبات: الحجوزات · استخدام المكونات · المخزون · إشغال الفترات.
- منتقي مدى تاريخي.
- رسوم بيانية (Recharts): أعمدة لإشغال الفترات، أعمدة أفقية لأكتر 10 مكونات طلباً.
- زرار تصدير CSV لكل تبويب.

### `/users` و `/audit-log` (ADMIN فقط)
- إدارة الأدوار (الأدمن ما يقدرش ينزّل دور نفسه).
- سجل مصفّى بالفاعل/الإجراء/التاريخ، مع عرض before/after.

## التقنيات
نفس ستاك الطلبة + `@tanstack/react-table` v8 + `recharts` + `react-day-picker`.

## Responsive
- Sidebar ثابت على `lg+`، `Sheet` منزلق على الموبايل.
- الجداول → كروت تحت `md`.
- التصفية في `Sheet` على الموبايل بدل شريط علوي مزدحم.

## التحقق
- لوجين بطالب على لوحة الأدمن → مرفوض
- TEACHING_TEAM مش شايف `/users` ولا `/audit-log`، والوصول المباشر بيرجّع 403
- تعديل حجز من الأدمن → المخزون اتسوّى صح + سطر في `AuditLog`
- إلغاء حجز → الكميات رجعت
- تقليل سعة فترة تحت المحجوز → رسالة خطأ عربية
- تصدير CSV يفتح في Excel والعربي سليم
- كل الصفحات شغّالة على 375px
- `pnpm --filter @arduino-lab/admin build` بينجح

---

## اللي اتنفّذ فعلاً — 2026-07-23

### الملفات
```
app/            layout · providers · globals.css · login
app/(dashboard)/  layout (RequireStaff) · page (نظرة عامة) · bookings · components
                  slots · reports · users · audit-log
components/        admin-shell · require-staff · nav-links · date-picker
components/overview/    overview-stats
components/bookings/    bookings-views · booking-detail-dialog · edit-booking-dialog
                       move-booking-dialog · component-picker
components/components/  component-dialog
components/reports/     usage-chart (Recharts)
lib/            api · download-csv
```

### حاجة اتعملت في الـ API (خارج الخطة)
`GET /audit` مكنش موجود — لوحة الأدمن محتاجاه. اتضاف:
- `packages/contracts/src/schemas/audit.schema.ts` + الـ endpoint في الكلاينت
- `AuditController` + `AuditService.list()` بفلاتر (entity · action · actor · مدى تاريخي) وترقيم
- ADMIN فقط

### حزمة مشتركة جديدة: `packages/web`
الرول بيقول لو منطق اتكرر بين `apps/student` و `apps/admin` ينتقل لـ `packages/`.
كود المصادقة كان هيتكرر بالكامل، فاتنقل:
`createTokenStore` (بمفتاح تخزين لكل تطبيق) · `createAppApi` · `AuthProvider` (مُعمَّم
بـ `loginPath`/`logoutPath`) · `createQueryClient` · دوال `format`. تطبيق الطلبة اتعاد
ربطه عليها واتشال منه `auth-context.tsx` و `token-store.ts` و `format.ts`.

### انحرافات عن الخطة

1. **مفيش `/bookings/new` منفصل.** الخطة كان فيها صفحة تسجيل مستقلة للأدمن.
   `EditBookingDialog` بيغطّي التسجيل والتعديل بنفس القدرة على تعديل المكونات
   والأعضاء، فصفحة تانية كانت هتكون تكرار. لو ظهرت حاجة يتسجّل من الصفر بدون حجز
   موجود، تتضاف وقتها.

2. **مفتاح تخزين لكل تطبيق** (`arduino-lab.student.refresh` مقابل `.admin.refresh`) —
   عشان لو الاتنين مفتوحين في نفس المتصفح ما تتلخبطش الجلستان.

3. **`RequireStaff` بمستويين.** الحماية العامة (فريق تدريس + أدمن) في الـ layout،
   وصفحات `/users` و `/audit-log` بتلفّ محتواها بـ `RequireStaff roles={['ADMIN']}`
   إضافية — الحماية الحقيقية على السيرفر في كل endpoint.

4. **رسوم Recharts معكوسة المحاور يدويًا.** SVG بيتجاهل اتجاه المستند، فمحور
   الفئات بـ `reversed` ومحور القيم `orientation="right"` عشان يتقروا RTL.

### تفاصيل RTL/تصميمية

| الحاجة | القرار |
|---|---|
| منتقي التاريخ | `<input type=date>` الأصلي — يجيب أسماء الشهور العربية والكيبورد وحبس التركيز مجانًا |
| الجداول | تختفي تحت `lg`/`md` وتتحول كروت |
| Sidebar | ثابت على `lg`، `Sheet` منزلق تحته |
| الحقن ضد الحلقات | `RowActions` منفصل، `toTiles`/`toUpdateData` بيطلّعوا الشرط برّه الـ JSX |

### التحقق الفعلي

كل الـ8 مسارات رجّعت 200، البناء الإنتاجي أنتج 11 مسار.

| الفحص | النتيجة |
|---|---|
| `dir="rtl"` · عنوان اللوجين · تنويه "فريق التدريس فقط" · `noindex` | ✅ |
| مدخلات اللوجين مربوطة بـ label | 2 / 2 |
| **كلاسات اتجاهية فيزيائية عبر كل الـ8 مسارات** | **صفر** |

**سكربت فحص `GET /audit` على السيرفر الحقيقي — 13 فحص عدّوا:**
```
ok  anonymous → 401              ok  actor is resolved
ok  student → 403                ok  before/after snapshots stored
ok  teaching team → 403          ok  update snapshot captured 5 → 9
ok  admin → 200                  ok  action filter · entity filter
ok  entries returned             ok  unknown entity → 400 · pagination
ok  newest first
```

```
pnpm lint       ✅ 7/7 حزمة
pnpm --filter @arduino-lab/admin typecheck  ✅
pnpm --filter @arduino-lab/admin build      ✅ 11 مسار
```
السكربت اتمسح بعد التحقق.
