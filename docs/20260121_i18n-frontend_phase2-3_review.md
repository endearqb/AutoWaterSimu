# i18n Phase 2-3 Review (2026-01-21)

## Scope
- Phase 2: document.title localization + language switch UI.
- Phase 3/4 (start): migrate core UI copy to `t(...)` for common navigation and login.

## Changes
- Added localized app title + logo alt text keys and injected `document.title` updates on locale change.
- Added language switch controls in user menu (zh/en).
- Began UI copy migration for:
  - `frontend/src/routes/login.tsx`
  - `frontend/src/components/Common/UserMenu.tsx`
  - `frontend/src/components/Common/SidebarItems.tsx`
  - `frontend/src/components/Common/Navbar.tsx`

## Files touched
- `frontend/src/i18n/types.ts`
- `frontend/src/i18n/messages/en.ts`
- `frontend/src/i18n/messages/zh.ts`
- `frontend/src/i18n/index.ts`
- `frontend/index.html`
- `frontend/src/components/Common/UserMenu.tsx`
- `frontend/src/components/Common/SidebarItems.tsx`
- `frontend/src/components/Common/Navbar.tsx`
- `frontend/src/routes/login.tsx`
- `docs/20260121_i18n-frontend_todo.md`

## Notes
- Password validation messages still come from `passwordRules()` (not localized yet); planned in Phase 3.
- Not all layout/common strings are migrated; only selected core entries updated.

## Tests
- Not run (UI copy + i18n infra updates only).
