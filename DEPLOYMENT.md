# دليل النشر

النظام 3 خدمات: **API** على Render · **موقع الطلبة** و**لوحة الأدمن** على Vercel ·
قاعدة البيانات على **Neon** · الصور على **Cloudinary** · الإيميل على **Resend**.

ملفات الإعداد جاهزة في الريبو: [`render.yaml`](./render.yaml) ·
[`apps/student/vercel.json`](./apps/student/vercel.json) ·
[`apps/admin/vercel.json`](./apps/admin/vercel.json).

---

## الترتيب

Neon → GitHub → Render (API) → Vercel (موقعين) → ربط الروابط ببعضها → UptimeRobot.

السبب: الـ API محتاج رابط قاعدة البيانات، والفرونت محتاج رابط الـ API، والـ API محتاج
روابط الفرونت للـ CORS — فبنعمل جولة تانية نكمّل فيها الروابط المتبادلة.

---

## 1. Neon (قاعدة البيانات) — ✅ معمولة

المشروع متعمل والـ migrations متطبّقة. محتاجين الرابطين لـ Render:
- **DATABASE_URL** — الرابط اللي فيه `-pooler`
- **DIRECT_URL** — نفس الرابط من غير `-pooler`

للإنتاج: يُفضّل عمل فرع `production` منفصل في Neon (زر Branches) وأخذ رابطيه، عشان
بيانات التطوير ما تختلطش بالإنتاج.

## 2. Cloudinary

1. [cloudinary.com](https://cloudinary.com) → حساب مجاني.
2. من الـ Dashboard انسخ: **Cloud name** · **API Key** · **API Secret**.

## 3. Resend

1. [resend.com](https://resend.com) → حساب.
2. API Keys → أنشئ مفتاح → انسخه (`re_...`).
3. للبداية استخدم دومين الاختبار: `MAIL_FROM="Arduino Lab <onboarding@resend.dev>"`.
   (لاحقًا: وثّق دومينك الخاص عشان الإيميلات ما تروحش سبام.)

## 4. GitHub — ✅ معمولة

الكود مرفوع على: https://github.com/Dev-Mohamed-Ashraf/Arduino-Lab (فرع `main`).

## 5. Render (API)

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
2. اربط ريبو GitHub → Render يقرا `render.yaml` تلقائيًا.
3. الأسرار المعلّمة `sync: false` تتحط في لوحة Render:

| المتغير | القيمة |
|---|---|
| `DATABASE_URL` | رابط Neon المجمّع (`-pooler`) |
| `DIRECT_URL` | رابط Neon المباشر |
| `API_URL` | `https://arduino-lab-api.onrender.com` (بيظهر بعد أول نشر) |
| `ALLOWED_EMAIL_DOMAINS` | نطاقات إيميل الطلبة، مفصولة بفاصلة |
| `STUDENT_APP_URL` | رابط Vercel للطلبة (من خطوة 6) |
| `ADMIN_APP_URL` | رابط Vercel للأدمن (من خطوة 6) |
| `CLOUDINARY_CLOUD_NAME` · `CLOUDINARY_API_KEY` · `CLOUDINARY_API_SECRET` | من Cloudinary |
| `RESEND_API_KEY` | من Resend |
| `MAIL_FROM` | `Arduino Lab <onboarding@resend.dev>` |

`JWT_ACCESS_SECRET` و `JWT_REFRESH_SECRET` بيتولّدوا تلقائيًا (`generateValue`).

4. أول نشر بيطبّق الـ migrations تلقائيًا (`db:deploy` في الـ build).
5. بعد النشر: افتح `https://<api>.onrender.com/api/v1/health` — لازم يرجّع 200.
6. **تعبئة البيانات المبدئية** (مرة واحدة): من Render Shell شغّل
   `pnpm --filter @arduino-lab/api db:seed` — بيعمل الأدمن والفترات والمكونات.
   > عدّل `SEED_ADMIN_PASSWORD` في متغيرات البيئة قبل التشغيل، وغيّره بعد أول دخول.

## 6. Vercel (موقعين من نفس الريبو)

استورد الريبو **مرتين**، بـ Root Directory مختلف:

| | موقع الطلبة | لوحة الأدمن |
|---|---|---|
| Root Directory | `apps/student` | `apps/admin` |
| Framework | Next.js (تلقائي) | Next.js (تلقائي) |
| Build & Install | من `vercel.json` تلقائيًا | من `vercel.json` تلقائيًا |

**متغيرات البيئة لكل مشروع:**

موقع الطلبة:
- `NEXT_PUBLIC_API_URL` = `https://<api>.onrender.com/api/v1`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` = اسم Cloudinary

لوحة الأدمن:
- `NEXT_PUBLIC_API_URL` = `https://<api>.onrender.com/api/v1`
- `NEXT_PUBLIC_STUDENT_APP_URL` = رابط موقع الطلبة على Vercel (لزر صفحة الطباعة)

## 7. إغلاق الحلقة (CORS)

بعد ما ياخد الموقعان روابطهما على Vercel، ارجع لـ Render وحدّث:
`STUDENT_APP_URL` و `ADMIN_APP_URL` بالروابط الفعلية → أعِد النشر.
من غير ده المتصفح هيرفض طلبات الفرونت بخطأ CORS.

## 8. UptimeRobot

1. [uptimerobot.com](https://uptimerobot.com) → New Monitor.
2. النوع: HTTP(s) · الرابط: `https://<api>.onrender.com/api/v1/health` · الفترة: **5 دقائق**.
3. ده بيمنع Render المجاني من النوم (بينام بعد 15 دقيقة خمول).

---

## قائمة التحقق بعد النشر

- [ ] `GET https://<api>.onrender.com/api/v1/health` → 200
- [ ] الموقعان يحمّلان بيانات المعمل بدون أخطاء CORS في كونسول المتصفح
- [ ] `prisma migrate deploy` ظاهرة ناجحة في build log بتاع Render
- [ ] تسجيل حساب بإيميل جامعي → إيميل التأكيد يوصل
- [ ] رفع صورة بطاقة من الإنتاج → توصل Cloudinary
- [ ] لوجين الأدمن → لوحة التحكم تفتح
- [ ] UptimeRobot أخضر، وبعد 30 دقيقة خمول أول طلب لسه يرد

---

## ملاحظات على الطبقة المجانية

- **Render**: بينام بعد 15 دقيقة خمول، والصحيان ~50 ثانية. UptimeRobot بيحلها.
- **Neon**: بينام بعد خمول، أول طلب ~500ms. مقبول.
- **Vercel**: بلا مشاكل نوم للمواقع الثابتة.
