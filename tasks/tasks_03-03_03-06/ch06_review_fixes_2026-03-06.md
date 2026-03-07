# Ch06 Review Fixes Execution Record

**Date**: 2026-03-06
**Source**: Ch06 Review 修复计划 (M-1, M-2, M-3)

## Fixes Applied

### Fix 1: M-1 — UDMNode handle sync dependency (UDMNode.tsx)
- Moved `boundModelName` / `isBound` declarations before `useHandlePositionSync` call
- Updated dependency array: `[label]` → `[label, isBound, boundModelName]`
- Ensures `updateNodeInternals` fires when bind state changes node height

### Fix 2: M-2 — aria-label i18n integration

**ItemActionsMenu.tsx**:
- Added `useI18n` import and `const { t } = useI18n()`
- `aria-label="Actions menu"` → `aria-label={t("flow.menu.actionsAriaLabel")}` (reused existing key)

**ExpressionCellEditorDialog.tsx** (4 aria-labels):
- `Insert variable ${name}` → `t("flow.udmEditor.expressionEditor.aria.insertVariable", { name })`
- `Insert parameter ${name}` → `t("flow.udmEditor.expressionEditor.aria.insertParameter", { name })`
- `Insert function ${fn.name}` → `t("flow.udmEditor.expressionEditor.aria.insertFunction", { name: fn.name })`
- `Insert constant ${c.name}` → `t("flow.udmEditor.expressionEditor.aria.insertConstant", { name: c.name })`

**i18n keys added** (en.ts, zh.ts, types.ts):
- `flow.udmEditor.expressionEditor.aria.insertVariable`
- `flow.udmEditor.expressionEditor.aria.insertParameter`
- `flow.udmEditor.expressionEditor.aria.insertFunction`
- `flow.udmEditor.expressionEditor.aria.insertConstant`

### Fix 3: M-3 — Execution record accuracy (ch06-cross-module-fixes-2026-03-06.md)
- Updated summary to per-item completion status instead of blanket "all implemented"
- C-2 noted as partially completed (narrowed types, no full domain type system)

## Verification
- `pnpm build` — tsc + vite build passed, no errors

## Files Modified

| # | File | Fix |
|---|------|-----|
| 1 | `frontend/src/components/Flow/nodes/UDMNode.tsx` | M-1 |
| 2 | `frontend/src/components/Common/ItemActionsMenu.tsx` | M-2 |
| 3 | `frontend/src/components/UDM/ExpressionCellEditorDialog.tsx` | M-2 |
| 4 | `frontend/src/i18n/messages/en.ts` | M-2 |
| 5 | `frontend/src/i18n/messages/zh.ts` | M-2 |
| 6 | `frontend/src/i18n/types.ts` | M-2 |
| 7 | `tasks/ch06-cross-module-fixes-2026-03-06.md` | M-3 |
