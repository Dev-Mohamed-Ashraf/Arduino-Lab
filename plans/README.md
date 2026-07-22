# فهرس الخطط

كل شغل في المشروع له ملف خطة هنا. القواعد كاملة في [`CLAUDE.md`](../CLAUDE.md) قسم 4.

## مفتاح الحالات

| الرمز | الحالة | المعنى |
|---|---|---|
| ⬜ | `planned` | مكتوبة، لسه ما بدأتش |
| 🔄 | `in-progress` | شغّالة دلوقتي |
| ✅ | `done` | خلصت واتحققت (`pnpm check` عدّى) |
| ⛔ | `blocked` | متوقفة على حاجة برّانية |

## الجدول

| # | الخطة | الحالة | بدأت | خلصت |
|---|---|---|---|---|
| 00 | [Foundation — هيكل الـ monorepo](./00-foundation.md) | ✅ done | 2026-07-22 | 2026-07-22 |
| 01 | [Database Schema](./01-database-schema.md) | ✅ done | 2026-07-22 | 2026-07-22 |
| 02 | [Shared Packages](./02-shared-packages.md) | ✅ done | 2026-07-22 | 2026-07-22 |
| 03 | [API Core + Auth](./03-api-core-auth.md) | ✅ done | 2026-07-22 | 2026-07-22 |
| 04 | [API Components + Slots](./04-api-components-slots.md) | ✅ done | 2026-07-22 | 2026-07-22 |
| 05 | [API Bookings](./05-api-bookings.md) | ✅ done | 2026-07-22 | 2026-07-22 |
| 06 | [API Uploads · Mail · Reports](./06-api-uploads-mail-reports.md) | ⬜ planned | - | - |
| 07 | [Student App](./07-student-app.md) | ⬜ planned | - | - |
| 08 | [Admin App](./08-admin-app.md) | ⬜ planned | - | - |
| 09 | [Print / Export](./09-print-export.md) | ⬜ planned | - | - |
| 10 | [Deployment](./10-deployment.md) | ⬜ planned | - | - |
| 11 | [Hardening + Tests](./11-hardening-tests.md) | ⬜ planned | - | - |

## ترتيب التنفيذ

الترتيب الرقمي = ترتيب الاعتماديات. متبدأش خطة قبل ما اللي قبلها تبقى ✅،
إلا لو الملف نفسه بيقول إنها مستقلة.

```
00 → 01 → 02 → 03 → 04 → 05 → 06 → ┬→ 07 → 09
                                    └→ 08
                                         ↓
                                    10 → 11
```
