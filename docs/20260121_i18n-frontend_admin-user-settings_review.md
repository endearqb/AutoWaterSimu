# i18n Admin/User Settings Review (2026-01-21)

## Scope
- Localize user settings + admin forms and pending tables.
- Replace remaining non-auth email validations with `getEmailPattern()` + localized required messages.
- Expand shared i18n keys for common table headers and sidebar controls.

## Changes
- User settings: translated headings, labels, placeholders, button text, and toast messages.
- Admin dialogs: translated copy, labels, placeholders, options, and success toasts; replaced password validation with shared rules.
- Pending tables: localized headers (ID/title/description/role/status/actions).
- Sidebar: localized aria labels, user menu labels, and fallback user name.

## Files touched
- `frontend/src/i18n/types.ts`
- `frontend/src/i18n/messages/en.ts`
- `frontend/src/i18n/messages/zh.ts`
- `frontend/src/components/UserSettings/ChangePassword.tsx`
- `frontend/src/components/UserSettings/DeleteAccount.tsx`
- `frontend/src/components/UserSettings/DeleteConfirmation.tsx`
- `frontend/src/components/UserSettings/UserInformation.tsx`
- `frontend/src/components/Admin/AddUser.tsx`
- `frontend/src/components/Admin/EditUser.tsx`
- `frontend/src/components/Pending/PendingItems.tsx`
- `frontend/src/components/Pending/PendingUsers.tsx`
- `frontend/src/components/Common/Sidebar.tsx`
- `docs/20260121_i18n-frontend_todo.md`

## Notes
- User type display in profile now maps to localized labels; values still come from backend enums.
- Confirmation dialog body uses a single localized string (no inline emphasis).

## Tests
- `cd frontend; npx tsc --noEmit`
