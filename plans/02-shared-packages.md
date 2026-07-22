---
id: 02
title: Shared Packages
status: done
started: 2026-07-22
completed: 2026-07-22
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

---

## اللي اتنفّذ فعلاً — 2026-07-22

### `packages/contracts`
`constants.ts` · `errors.ts` (48 كود خطأ + رسالة عربية لكل واحد) ·
8 ملفات schema (`common` `auth` `user` `component` `slot` `booking` `dashboard` `report` `upload`) ·
`client/api-error.ts` · `client/http-client.ts` · `client/endpoints.ts`

### `packages/ui`
`styles/globals.css` (Tailwind v4 `@theme inline` + tokens بـ oklch + light/dark) ·
`lib/cn.ts` ·
18 primitive: `alert` `badge` `button` `card` `checkbox` `dialog` `dropdown-menu` `input` `label`
`popover` `progress` `select` `separator` `sheet` `skeleton` `sonner` `switch` `table` `tabs`
`textarea` `theme-provider` `tooltip` ·
5 كومبوننت مشروع: `stat-card` `slot-card` `stock-badge` `states` (empty/error) `page-header`

### انحرافات عن الخطة

1. **`@arduino-lab/ui` مش بيتبني.** بيشحن TypeScript خام والتطبيقات بتحوّله بـ
   `transpilePackages` — النمط المعتمد في Turborepo. أبسط، ومفيش خطوة build ولا مشاكل CSS.

2. **`packages/eslint-config/react.js` اتضافت.** الخطة كان فيها `base` و `next` و `nest` بس.
   بس `packages/ui` مش تطبيق Next، وplugin بتاع Next كان بيحذّر عن `pages/` مش موجودة.
   دلوقتي: `base` ← `react` (فيه قاعدة RTL) ← `next` (بيزوّد plugin بتاع Next).

3. **`rootDir` اتشال من `packages/tsconfig/react-library.json`.**
   المسارات النسبية في `extends` بتتحل نسبةً لمكان الملف الأصلي، فـ `rootDir: "src"`
   كان بيشاور على `packages/tsconfig/src`. الحزمة اللي بتستخدمه هي اللي بتحدده دلوقتي.

4. **`lib: ["ES2023", "DOM"]` في `contracts`** — الـ HTTP client بيستخدم
   `fetch` و `URL` و `AbortSignal`.

### تفاصيل RTL اتظبطت يدويًا

CSS transforms **فيزيائية** ومش بتتقلب مع `dir`. اتصلّحت في مكانين:

| الكومبوننت | المشكلة | الحل |
|---|---|---|
| `Progress` | `translateX` كان هيملا الشريط من الشمال في RTL | الملء بـ `width` — block child بيبدأ من inline-start في الاتجاهين |
| `Switch` | الإبهام كان هيتحرك في الاتجاه الغلط | `ltr:translate-x-5` / `rtl:-translate-x-5` |
| `Sheet` | `slide-in-from-end` مش موجود في tw-animate-css | الموضع منطقي (`inset-inline`)، والأنيميشن بـ `ltr:`/`rtl:` variants |

كمان `.rtl-flip` utility للأيقونات الاتجاهية، و `font-variant-numeric: lining-nums tabular-nums`
عشان الأرقام تفضل غربية ومحاذية في الجداول.

### التحقق الفعلي
```
pnpm --filter @arduino-lab/contracts build      ✅
pnpm --filter @arduino-lab/contracts lint       ✅
pnpm --filter @arduino-lab/ui typecheck         ✅
pnpm --filter @arduino-lab/ui lint              ✅
```
التحقق البصري من RTL بيتم في خطة 07 لما يبقى فيه صفحة تترندر.
