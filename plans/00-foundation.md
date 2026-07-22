---
id: 00
title: Foundation — هيكل الـ monorepo
status: planned
started: -
completed: -
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
