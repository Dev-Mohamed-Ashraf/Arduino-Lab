---
id: 00
title: Foundation — هيكل الـ monorepo
status: done
started: 2026-07-22
completed: 2026-07-22
depends_on: []
---

# 00 — Foundation

## الهدف
تجهيز هيكل الـ monorepo والإعدادات المشتركة، عشان كل الخطط اللي بعدها تشتغل عليه.

## المخرجات

### ملفات الجذر
- `package.json` — pnpm workspace root + كل السكربتات
- `pnpm-workspace.yaml` — `apps/*` + `packages/*`
- `turbo.json` — تعريف المهام والاعتماديات والـ cache outputs
- `.npmrc` · `.gitignore` · `.prettierrc` · `.prettierignore` · `.editorconfig`
- `.env.example` — كل متغيرات البيئة بقيم وهمية موصوفة
- `CLAUDE.md` — ملف الرول
- `README.md` — نظرة عامة + خطوات التشغيل
- `.claude/settings.json` — permissions allowlist

### الحزم المشتركة للإعدادات
- `packages/tsconfig/` — `base.json` · `nextjs.json` · `nestjs.json` · `react-library.json`
- `packages/eslint-config/` — `base.js` · `next.js` · `nest.js` (ESLint 9 flat config)

### Git
- `git init` + أول commit

## التحقق
- `pnpm install` بينجح من غير أخطاء
- `pnpm -r list` بيعرض كل الحزم
- `git status` نضيف، و `.env` مش ظاهر

## ملاحظات
- Node 22+ · pnpm 9+
- `node-linker=isolated` في `.npmrc` عشان يمنع الاعتماديات الشبح (phantom deps)

---

## اللي اتنفّذ فعلاً — 2026-07-22

### ملفات الجذر
`package.json` · `pnpm-workspace.yaml` · `turbo.json` · `.npmrc` · `.gitignore` ·
`.prettierrc` · `.prettierignore` · `.editorconfig` · `.node-version` (22) ·
`.env.example` · `CLAUDE.md` · `README.md` · `.claude/settings.json`

### الخطط
`plans/README.md` + 12 ملف خطة (00–11) بـ frontmatter وحالة.

### الحزم
- `packages/tsconfig` — `base.json` · `library.json` · `react-library.json` · `nextjs.json` · `nestjs.json`
- `packages/eslint-config` — `base.js` · `next.js` · `nest.js` (ESLint 9 flat config)

### انحرافات عن الخطة
1. **ترقيم الخطط اتغيّر** — `Shared Packages` اتنقلت من 06 لـ 02 لأنها اعتمادية
   لكل تطبيقات الفرونت والباك، فمنطقي تيجي بدري.
2. **قاعدة ESLint إضافية**: `no-restricted-syntax` في `next.js` بترفض
   `ml-*` `mr-*` `pl-*` `pr-*` `left-*` `right-*` `text-left` `text-right` في `className` —
   بتفرض قاعدة RTL بتاعة `CLAUDE.md` آلياً بدل الاعتماد على المراجعة اليدوية.
3. **`.env.example` أشمل من المخطط** — اتضاف `DIRECT_URL` (Neon migrations) و
   `SEED_ADMIN_*` و `ALLOWED_EMAIL_DOMAINS`.

### التحقق
```
pnpm install   ✅ Done in 1m 45.3s — prettier 3.9.6 · turbo 2.10.6 · typescript 5.9.3
git init + commit 489fa5d  ✅
```
`.env` مش ظاهر في `git status` (متجاهل صح).
