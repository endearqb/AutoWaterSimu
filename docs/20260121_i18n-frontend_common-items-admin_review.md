# i18n Common/Items/Admin Review (2026-01-21)

## Scope
- Localize remaining Common UI copy (NotFound).
- Localize admin/users list + items management (routes + dialogs).
- Normalize status/role/user labels and empty states.

## Changes
- Common:
  - `frontend/src/components/Common/NotFound.tsx` now uses `t(...)`.
- Admin/users:
  - `frontend/src/routes/_layout/admin.tsx` table headers, role/status labels, badge text, and page title localized.
  - `frontend/src/components/Admin/DeleteUser.tsx` localized prompts and toast messages.
- Items:
  - `frontend/src/routes/_layout/items.tsx` empty state, headers, and page title localized.
  - `frontend/src/components/Items/AddItem.tsx`, `EditItem.tsx`, `DeleteItem.tsx` localized labels, placeholders, and toast messages.
- Added i18n keys for common status/role labels, admin/users, items, and not-found text.

## Files touched
- `frontend/src/i18n/types.ts`
- `frontend/src/i18n/messages/en.ts`
- `frontend/src/i18n/messages/zh.ts`
- `frontend/src/components/Common/NotFound.tsx`
- `frontend/src/routes/_layout/admin.tsx`
- `frontend/src/components/Admin/DeleteUser.tsx`
- `frontend/src/routes/_layout/items.tsx`
- `frontend/src/components/Items/AddItem.tsx`
- `frontend/src/components/Items/EditItem.tsx`
- `frontend/src/components/Items/DeleteItem.tsx`
- `docs/20260121_i18n-frontend_todo.md`

## Notes
- `/routes/_layout/*` still has flow/overview/super-dashboard strings pending.

## Tests
- Not run in this sub-step.
