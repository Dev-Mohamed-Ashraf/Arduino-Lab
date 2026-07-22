---
id: 02
title: Shared Packages
status: in-progress
started: 2026-07-22
completed: -
depends_on: [00]
---

# 02 — Shared Packages

## الهدف
بناء `@arduino-lab/contracts` و `@arduino-lab/ui` — مصدر الحقيقة الوحيد للأنواع والواجهة.

## `packages/contracts`

مكتبة TypeScript خالصة (مفيش React، مفيش Node APIs) — بتستخدمها التلات تطبيقات.

```
src/
├── constants.ts        MAX_GROUP_MEMBERS=6 · DEFAULT_SLOT_CAPACITY=5 · ROLES · حدود الرفع
├── errors.ts           أكواد الأخطاء (SLOT_FULL · COMPONENT_OUT_OF_STOCK · ...) + الرسالة العربية
├── schemas/
│   ├── auth.schema.ts
│   ├── user.schema.ts
│   ├── component.schema.ts
│   ├── slot.schema.ts
│   ├── booking.schema.ts
│   ├── report.schema.ts
│   └── common.schema.ts     pagination · معرّفات · الرد الموحّد
├── types/              كلها `z.infer` — ممنوع تعريف يدوي
└── client/
    ├── http-client.ts       fetch wrapper + إعادة إصدار التوكن تلقائياً + شكل خطأ موحّد
    └── endpoints/           دالة مكتوبة الأنواع لكل endpoint
```

### قواعد
- كل شكل بيانات بيتنقل بين الفرونت والـ API يتعرّف **هنا مرة واحدة**.
- النوع دايماً `z.infer<typeof schema>` — ممنوع `interface` مكرر.
- رسايل الخطأ للمستخدم **عربي**، الأكواد **إنجليزي**.
- `http-client` بيتعامل مع 401 تلقائياً: يجرّب `/auth/refresh` مرة واحدة، ولو فشل يعمل logout.

## `packages/ui`

كومبوننتس presentational مشتركة — **ممنوع** تعرف أي حاجة عن الـ API أو الراوتنج.

```
src/
├── styles/globals.css   Tailwind v4 + design tokens + خط عربي
├── lib/cn.ts            clsx + tailwind-merge
├── components/          shadcn/ui معدّلة لـ RTL
│   button · input · label · select · dialog · sheet · table · card
│   badge · toast(sonner) · tabs · dropdown-menu · form · skeleton
│   alert · progress · avatar · separator · tooltip · calendar · popover
└── components/app/      كومبوننتس المشروع
    stat-card · slot-availability-card · component-stock-badge
    empty-state · error-state · page-header · data-table
```

### التصميم
- **Tailwind CSS v4** — الإعداد بـ `@theme` في CSS مش `tailwind.config.js`.
- خصائص منطقية بس (`ms-*`, `pe-*`, `start-*`) — RTL يشتغل من غير أي override.
- الخط: **IBM Plex Sans Arabic** من `next/font/google` (متغيّر CSS `--font-arabic`).
- Design tokens: ألوان بـ `oklch` + دعم light/dark بـ `next-themes`.
- Mobile-first — كل كومبوننت متجرّب على 375px.

## التحقق
- `pnpm --filter @arduino-lab/contracts build` بينجح
- `pnpm --filter @arduino-lab/ui build` بينجح
- استيراد نوع من `contracts` في تطبيق Next.js شغّال مع IntelliSense
- كل كومبوننتس `ui` بتترندر مقلوبة صح جوه `dir="rtl"`
