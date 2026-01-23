# i18n Flow Stores Review (2026-01-21)

## Scope
- Flow stores: flowchart CRUD/import messages + model store fallback errors/status labels.

## Changes
- Added `flow.store` message groups for flowchart operations and model errors.
- Localized flowchart CRUD/import/load messages in Flow store logic.
- Localized ASM1/ASM1 Slim/ASM3/Material Balance store fallback errors.
- Mapped job status labels to `flow.jobStatus` translations.

## Files touched
- `frontend/src/stores/flowStore.ts`
- `frontend/src/stores/createModelFlowStore.ts`
- `frontend/src/stores/asm1Store.ts`
- `frontend/src/stores/asm1slimStore.ts`
- `frontend/src/stores/asm3Store.ts`
- `frontend/src/stores/materialBalanceStore.ts`
- `frontend/src/i18n/types.ts`
- `frontend/src/i18n/messages/zh.ts`
- `frontend/src/i18n/messages/en.ts`

## Tests
- `cd frontend; npx tsc --noEmit`
