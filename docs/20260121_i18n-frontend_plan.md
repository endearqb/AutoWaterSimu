# Frontend i18n plan (zh + en)

## Goal
- Add English support across the frontend UI with a locale toggle and persistence.
- Exclusions: knowledge docs under `frontend/content/knowledge/` and AI deep research HTML under `frontend/public/assets/html/`.

## Review highlights
- Existing custom i18n lives in `frontend/src/utils/i18n.ts` and is only used by `frontend/src/hooks/useCustomToast.ts` and `frontend/src/utils/fileValidation.ts`.
- No provider/context means language changes do not trigger a React re-render.
- Many user-facing strings are hard-coded across routes, components, configs, and services.
- Date/time formatting is fixed to `zh-CN` in `frontend/src/utils/timeUtils.ts` and updates rendering.
- E2E tests assert English copy in `frontend/tests/*.spec.ts`.

## Approach
- Keep a lightweight in-house i18n system (no new deps), expanding messages into `frontend/src/i18n/`.
- Add `I18nProvider` + `useI18n` hook, persist locale in `localStorage`, and sync `document.documentElement.lang`.
- Use `Intl` for date/number formatting based on the active locale.
- Default locale: zh for CN deployments, en for non-CN deployments (detected by timezone/locale fallback).

## Plan
### 1) i18n foundation
Files:
- Add `frontend/src/i18n/messages/en.ts`, `frontend/src/i18n/messages/zh.ts`
- Add `frontend/src/i18n/index.ts` (provider, hook, `t`, `setLanguage`, `useLocale`)
- Update `frontend/src/utils/i18n.ts` (either move or wrap; fix missing keys like `common.info`)
- Update `frontend/src/main.tsx` to wrap `I18nProvider`
- Update `frontend/src/components/ui/provider.tsx` if provider placement is preferred there

Tasks:
- Define translation key structure (common, nav, auth, flow, landing, updates, errors, forms).
- Implement default locale detection: use saved preference first; otherwise detect CN via `Intl.DateTimeFormat().resolvedOptions().timeZone` or `navigator.language` (e.g., `zh-CN` or `Asia/Shanghai` -> zh), else en.

### 2) Core utilities and formatting
Files:
- `frontend/src/utils/timeUtils.ts` (locale-aware formats + relative time strings)
- `frontend/src/utils/utils.ts` (validation messages)
- `frontend/src/utils/fileValidation.ts`
- `frontend/src/hooks/useCustomToast.ts`
- `frontend/src/services/*.ts` (replace hard-coded error strings with translation keys)
- `frontend/src/config/*.ts` (labels/validation messages to translation keys)
- `frontend/index.html` (base title/lang; update via runtime on locale change)

Tasks:
- Replace in-code strings with translation keys.
- Add formatting helpers: `formatDate`, `formatRelativeTime`, `formatNumber` using locale.

### 3) UI string migration by feature
Files (groups):
- Auth: `frontend/src/routes/login.tsx`, `signup.tsx`, `recover-password.tsx`, `reset-password.tsx`
- Layout/nav: `frontend/src/components/Common/*`, `frontend/src/routes/_layout/*`, `frontend/src/routes/dashboard.tsx`
- Settings/admin/pending: `frontend/src/components/UserSettings/*`, `frontend/src/components/Admin/*`, `frontend/src/components/Pending/*`
- Flow + model UI: `frontend/src/components/Flow/**/*`, `frontend/src/stores/*`, `frontend/src/config/*`
- Calculators: `frontend/src/components/calculators/*`, `frontend/src/routes/calculators/index.tsx`
- Landing/marketing: `frontend/src/components/Landing/*`, `frontend/src/routes/index.tsx`, `frontend/src/routes/midday-style.tsx`
- Knowledge UI (exclude doc content): `frontend/src/components/Knowledge/*`, `frontend/src/routes/_layout/knowledge/*`
- AI deep research UI (exclude HTML): `frontend/src/routes/ai-deep-research/*`, `frontend/src/hooks/useArticleData.ts`, `frontend/src/data/articles/articleData.ts`
- Updates: `frontend/src/routes/updates/*`, `frontend/src/components/Updates/Article.tsx`, `frontend/src/utils/blog.ts`, `frontend/src/data/updates/*.mdx`

Tasks:
- Replace visible labels, placeholders, aria-labels, empty states, and tooltips with `t(...)`.
- Keep knowledge MD/MDX content and AI HTML files untouched.

### 4) Localized content strategy
Options for long-form content:
- Updates MDX: split by locale (`frontend/src/data/updates/zh/*.mdx`, `.../en/*.mdx`) and filter in `getBlogPosts` by locale.
- Stories/marketing data: split `frontend/src/data/stories.ts` into `stories.zh.ts` / `stories.en.ts` (or export `getStories(locale)`).
- AI deep research metadata: either keep titles/descriptions in zh only, or create `articleData.zh.ts` + `articleData.en.ts` and select by locale while linking to the same HTML.

Implementation targets:
- `frontend/src/utils/blog.ts`
- `frontend/src/data/stories.ts`
- `frontend/src/data/articles/articleData.ts`
- `frontend/src/hooks/useArticleData.ts`

### 5) Language switch UX
Files:
- `frontend/src/components/Common/UserMenu.tsx` or `frontend/src/components/Landing/Header.tsx` (add locale toggle)
- `frontend/src/routes/_layout/settings.tsx` and `frontend/src/components/UserSettings/Appearance.tsx` (optional settings toggle)
- `frontend/src/components/ui/*` if a shared control is needed

Tasks:
- Add locale toggle (zh/en).
- Persist selection; update `document.title` and `html[lang]`.

### 6) Tests and QA
Files:
- `frontend/tests/*.spec.ts`
- `frontend/tests/utils/*` if helpers are added

Tasks:
- Update tests to avoid hard-coded copy (prefer test ids) OR set locale to en for tests.
- Run `cd frontend; npx tsc --noEmit`.

## Decisions
- Default locale: zh for CN, en elsewhere; user preference overrides detection.
- AI deep research metadata: translate to en (HTML remains zh and excluded).
- i18n: use in-house implementation.
- Tests: default locale is en.
