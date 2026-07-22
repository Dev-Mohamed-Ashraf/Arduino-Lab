# Arduino Lab Reservation & Components Management System

نظام ويب متكامل لإدارة حجز مواعيد معمل الأردوينو وتنظيم صرف المكونات.

## المشكلة اللي بيحلها

- تضارب مواعيد المجموعات في المعمل
- عدم معرفة المكونات المتاحة قبل الحجز
- صرف مكونات مش موجودة فعلياً
- غياب توثيق منظم لكل مجموعة ومشروعها

## المعمارية

```
apps/student   Next.js 15  →  Vercel     واجهة الطلبة + الداشبورد العام
apps/admin     Next.js 15  →  Vercel     لوحة تحكم الأدمن وفريق التدريس
apps/api       NestJS 11   →  Render     الباك-اند (الوحيد اللي بيلمس الداتابيز)
                           →  Neon       PostgreSQL
                           →  Cloudinary صور بطاقات الهوية
                           →  Resend     الإيميلات
                           →  UptimeRobot يمنع Render من النوم
```

```
packages/contracts       zod schemas + types + API client — مصدر الحقيقة الوحيد
packages/ui              كومبوننتس مشتركة (shadcn/ui معدّلة لـ RTL)
packages/tsconfig        إعدادات TypeScript
packages/eslint-config   إعدادات ESLint
```

## المميزات

- 4 فترات زمنية ثابتة × 5 مجموعات لكل فترة في اليوم
- حجز **ذرّي** — مستحيل يحصل تجاوز للسعة أو صرف مكون غير متاح، حتى مع الطلبات المتزامنة
- إدارة مخزون لحظية بحالة توفر لكل مكون
- حد أقصى 6 طلاب للمجموعة
- تسجيل بالإيميل الجامعي مع تأكيد
- الحجز يتقفل بعد التأكيد — الأدمن بس يعدّل
- ورقة حجز قابلة للطباعة أو الحفظ PDF
- لوحة تحكم كاملة + تقارير + تصدير CSV
- واجهة عربي RTL كاملة ومتجاوبة على كل الأجهزة

## التشغيل المحلي

```bash
pnpm install
cp .env.example .env      # املا القيم
pnpm db:migrate
pnpm db:seed
pnpm dev
```

| التطبيق | الرابط |
|---|---|
| موقع الطلبة | http://localhost:3000 |
| لوحة الأدمن | http://localhost:3001 |
| الـ API | http://localhost:4000/api/v1 |
| توثيق الـ API | http://localhost:4000/docs |

## المتطلبات

Node ≥ 22 · pnpm ≥ 9 · قاعدة بيانات PostgreSQL (Neon)

## الأوامر

كل الأوامر في [`CLAUDE.md`](./CLAUDE.md) قسم 6.

## التوثيق

- [`CLAUDE.md`](./CLAUDE.md) — قواعد العمل ومعايير الكود
- [`plans/`](./plans/) — خطط التنفيذ وحالة كل واحدة
