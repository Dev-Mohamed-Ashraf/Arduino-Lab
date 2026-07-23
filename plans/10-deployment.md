---
id: 10
title: Deployment
status: done
started: 2026-07-23
completed: 2026-07-23
depends_on: [07, 08, 09]
---

# 10 — Deployment

## المعمارية

```
  Vercel (student)  ─┐
                     ├──→  Render (NestJS API)  ──→  Neon (PostgreSQL)
  Vercel (admin)    ─┘              ↑
                                    │
                          UptimeRobot ping /health كل 5 دقايق
                                    │
                          Cloudinary (الصور)  ·  Resend (الإيميل)
```

## Neon

- مشروع واحد، فرعين: `main` (إنتاج) و `dev` (تطوير).
- **رابطين مختلفين:**
  - `DATABASE_URL` → الرابط **المجمّع** (`-pooler`) — للتشغيل
  - `DIRECT_URL` → الرابط **المباشر** — للـ migrations بس
- في `schema.prisma`:
  ```prisma
  datasource db {
    provider  = "postgresql"
    url       = env("DATABASE_URL")
    directUrl = env("DIRECT_URL")
  }
  ```
- ⚠️ Neon الفري بينام بعد خمول — أول طلب بياخد ~500ms. مقبول.

## Render (API)

`render.yaml` في الجذر:

| الإعداد | القيمة |
|---|---|
| Root Directory | `.` (monorepo) |
| Build Command | `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @arduino-lab/api db:generate && pnpm --filter @arduino-lab/api build && pnpm --filter @arduino-lab/api db:deploy` |
| Start Command | `node apps/api/dist/main.js` |
| Health Check Path | `/api/v1/health` |
| Node Version | 22 (`.node-version` في الجذر) |

- `PORT` بيجي من Render — `main.ts` لازم يقرا `process.env.PORT`.
- `db:deploy` (مش `migrate dev`) في الـ build — بيطبّق migrations من غير تفاعل.
- ⚠️ Render الفري بينام بعد 15 دقيقة خمول، والصحيان ~50 ثانية. الحل UptimeRobot.

## UptimeRobot

- Monitor نوع HTTP(s) على `https://<api>.onrender.com/api/v1/health`
- الفترة: **5 دقايق** (أقل من 15 بهامش أمان)
- تنبيه بالإيميل عند التوقف

## Vercel — مشروعين من نفس الريبو

| | student | admin |
|---|---|---|
| Root Directory | `apps/student` | `apps/admin` |
| Framework | Next.js | Next.js |
| Build Command | `cd ../.. && pnpm --filter @arduino-lab/student build` | نفسه لـ admin |
| Install Command | `pnpm install --frozen-lockfile` | نفسه |
| Output | `apps/student/.next` | `apps/admin/.next` |

`vercel.json` في كل تطبيق + `"ignoreCommand"` بـ `turbo-ignore` عشان ما يبنيش لو التطبيق ما اتغيّرش.

## متغيرات البيئة

| المتغير | Render | Vercel student | Vercel admin |
|---|---|---|---|
| `DATABASE_URL` · `DIRECT_URL` | ✅ | — | — |
| `JWT_ACCESS_SECRET` · `JWT_REFRESH_SECRET` | ✅ | — | — |
| `CLOUDINARY_*` · `RESEND_API_KEY` | ✅ | — | — |
| `ALLOWED_EMAIL_DOMAINS` | ✅ | — | — |
| `STUDENT_APP_URL` · `ADMIN_APP_URL` | ✅ (للـ CORS) | — | — |
| `NEXT_PUBLIC_API_URL` | — | ✅ | ✅ |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | — | ✅ | ✅ |

## CORS

```ts
app.enableCors({
  origin: [env.STUDENT_APP_URL, env.ADMIN_APP_URL],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
});
```
ممنوع `origin: '*'` مع `credentials: true` — مرفوض من المتصفح أصلاً.

---

## 🔴 الخطوات اليدوية المطلوبة من المستخدم

Claude بيجهّز كل ملفات الإعداد. الخطوات دي محتاجة حساباتك:

1. **Neon** → اعمل مشروع → انسخ الرابطين (pooled + direct).
2. **Cloudinary** → حساب مجاني → انسخ `cloud name` · `api key` · `api secret`.
3. **Resend** → حساب → وثّق دومين (أو استخدم دومين الاختبار) → انسخ API key.
4. **GitHub** → اعمل ريبو فاضي وابعتلي الرابط (أنا بعمل الـ push بعد إذنك).
5. **Render** → New Web Service → اربط الريبو → الإعدادات فوق → حط المتغيرات.
6. **Vercel** → استورد الريبو مرتين بـ Root Directory مختلف → حط المتغيرات.
7. **UptimeRobot** → Monitor على رابط `/health`.

ابعتلي المفاتيح وأنا بحطها في المكان الصح.

## التحقق
- `GET https://<api>.onrender.com/api/v1/health` → 200
- الموقعين بيحمّلوا بيانات من الـ API من غير أخطاء CORS في الكونسول
- `prisma migrate deploy` ظاهرة ناجحة في build log بتاع Render
- UptimeRobot أخضر، وبعد 30 دقيقة خمول أول طلب لسه سريع
- رفع صورة من الإنتاج بيوصل Cloudinary
- إيميل تأكيد بيوصل من الإنتاج

---

## اللي اتنفّذ فعلاً — 2026-07-23

### الروابط الحيّة
| الخدمة | الرابط |
|---|---|
| API | https://arduino-lab-api.onrender.com |
| موقع الطلبة | https://arduino-lab-student.vercel.app |
| لوحة الأدمن | https://arduino-lab-admin.vercel.app |
| GitHub | https://github.com/Dev-Mohamed-Ashraf/Arduino-Lab |

### 5 باجّات نشر اتصادت — كلها من نمط الـ monorepo، ما ظهرتش محليًا

1. **`prisma: not found`** — `NODE_ENV=production` بيخلّي pnpm يتخطّى devDependencies،
   وprisma/nest-cli منهم. الحل: `pnpm install --frozen-lockfile --prod=false`.
2. **`Cannot find module '@arduino-lab/contracts'` (Render)** — الحزمة بتشحن TS محتاج
   `dist/`، والأمر كان بيبني الـ API بس. الحل: بناء contracts قبل الـ API.
3. **الـ dist فاضي رغم نجاح tsc** — `.tsbuildinfo` قديم بره `dist` خلّى tsc يفتكر
   إن كله محدّث. الحل: `tsBuildInfoFile` جوه `dist`. (على Render checkout نضيف
   فمكنش هيحصل، بس اتصلّح للمتانة المحلية.)
4. **`STUDENT_APP_URL/ADMIN_APP_URL Required`** — مشكلة الدجاجة والبيضة: الـ API لازم
   يقوم قبل ما الفرونت يتنشر، والفرونت محتاج رابط الـ API. الحل: الرابطين اختياريين
   بـ default فاضي، وCORS بيفلتر الفاضي.
5. **`Cannot find module '@arduino-lab/contracts'` (Vercel)** — نفس باج 2 للفرونت.
   `transpilePackages` بيحوّل المصدر بس module resolution بيدوّر على `dist`. الحل:
   بناء contracts قبل `next build` في `vercel.json`.

### التحقق الفعلي على الإنتاج

```
GET /health                                → status:ok · database:up
GET /slots · /dashboard                    → 200 · 4 فترات من Neon
admin login (admin@university.edu.eg)      → 200
موقع الطلبة SSR                             → dir=rtl · الفترات والمكونات بترندر من الـ API
لوحة الأدمن /login                          → 200 · noindex
CORS: دومين الطلبة → مسموح · الأدمن → مسموح · غريب → مرفوض
رحلة كاملة: register 201 (+ إيميل Resend) → admin login → list users 200
```

### الخطوات اليدوية اللي عملها المستخدم
Cloudinary keys · Resend key · Neon URLs · حسابات Render + Vercel × 2 · إضافة
متغيرات البيئة · `Save, rebuild, and deploy`.

### متبقٍ (اختياري)
- **UptimeRobot** على `/health` كل 5 دقايق — يمنع Render المجاني من النوم.
- توثيق دومين Resend خاص (بدل `onboarding@resend.dev`) لو الإيميلات راحت سبام.
