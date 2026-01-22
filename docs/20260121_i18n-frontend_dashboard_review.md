# i18n Dashboard Review (2026-01-21)

## Scope
- Localize dashboard route copy.
- Remove placeholder glyphs and align with shared i18n keys.

## Changes
- `/_layout/dashboard` now uses localized greeting + welcome text.
- `/dashboard` placeholder text uses i18n.

## Files touched
- `frontend/src/i18n/types.ts`
- `frontend/src/i18n/messages/en.ts`
- `frontend/src/i18n/messages/zh.ts`
- `frontend/src/routes/_layout/dashboard.tsx`
- `frontend/src/routes/dashboard.tsx`

## Tests
- `cd frontend; npx tsc --noEmit`
