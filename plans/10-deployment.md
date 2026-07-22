---
id: 10
title: Deployment
status: planned
started: -
completed: -
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
