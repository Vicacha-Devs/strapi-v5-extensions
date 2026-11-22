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

## مُنشئ الإضافات ومركز التحكم في الجودة (QA)

أنشئ إضافات Strapi v5 جديدة تلقائياً بتكافؤ ترجمة لـ 5 لغات (`en/es/ar/tr/fr`) واختبارات محلية وربط اختياري مع `apps/dashboard`:

```bash
pnpm plugin:new -- announcements --display-name "Announcements" --with-content-type --wire-dashboard
pnpm qa:doctor && pnpm qa:judges && pnpm qa:verify && pnpm qa:report
pnpm qa:docker:up && pnpm qa:smoke && pnpm qa:e2e && pnpm qa:docker:down
```

تعمل حاويات الجودة المعزولة (`docker-compose.qa.yml`) حصرياً على `127.0.0.1` (`5434/6381/8110/1027`)، ويُشغّل مسار `.github/workflows/qa-e2e.yml` اختبارات Playwright للوحة التحكم تلقائياً.
