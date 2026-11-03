---
title: "أدوات التطوير والنشر المستمر"
description: "منظومة الجودة باستخدام oxfmt و oxlint و ESLint v10 و Husky و Commitlint و publint و Semantic Release وبوابة التوثيق."
---

## كيفية استخدام وتحديث بوابة التوثيق (`apps/docs`)

1. **نظرة عامة (`/<plugin-slug>/`)**: تُزامن تلقائياً من ملفات `README.md` مع لقطات Playwright للوحة التحكم.
2. **كيانات المحتوى وحالات الاستخدام (`/<plugin-slug>/use-cases/`)**: توثيق كيانات كل إضافة ومخططات Pele التفاعلية ولقطات الشاشة.
3. **دليل المطور ولوحة التحكم (`/<plugin-slug>/guide/`)**: توثيق شامل للمخططات والخدمات واللغات الـ 13.
4. **مرجع OpenAPI 3.0.3 التفاعلي (`/<plugin-slug>/api/`)**: يُولّد تلقائياً من مسارات الخادم.
5. **فهرس الذكاء الاصطناعي (`/llms.txt` و `/llms-full.txt`)**: جاهز لمساعدات البرمجة الذكية.

```bash
pnpm --filter @vicacha-devs/docs dev
pnpm --filter @vicacha-devs/docs build
pnpm --filter @vicacha-devs/docs test:judges
pnpm format:check && pnpm lint && pnpm verify
```
