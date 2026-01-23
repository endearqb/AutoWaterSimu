# i18n Flow UI Review (2026-01-21)

## Scope
- Flow UI batch: menus/dialogs, action plate/palette, legacy analysis panels, and node labels.

## Changes
- Localized Flow menus/dialogs and related success/error messaging.
- Localized simulation action plate controls, palette UI, and analysis dialog labels.
- Localized legacy analysis charts/panels and core node labels.
- Expanded i18n flow message keys and types to support new UI strings.
- Seeded additional message sections for overview/superDashboard/landing (en).

## Files touched
- `frontend/src/components/Flow/inspectorbar/SimulationActionPlate.tsx`
- `frontend/src/components/Flow/inspectorbar/useSimulationController.ts`
- `frontend/src/components/Flow/menu/BaseDialogManager.tsx`
- `frontend/src/components/Flow/menu/BaseLoadCalculationDataDialog.tsx`
- `frontend/src/components/Flow/menu/BaseBubbleMenu.tsx`
- `frontend/src/components/Flow/menu/ConfirmDialog.tsx`
- `frontend/src/components/Flow/inspectorbar/PanelColorSelector.tsx`
- `frontend/src/components/Flow/nodes/CashWalletNode.tsx`
- `frontend/src/components/Flow/nodes/GoalProgressNode.tsx`
- `frontend/src/components/Flow/legacy-analysis/*`
- `frontend/src/i18n/types.ts`
- `frontend/src/i18n/messages/en.ts`

## Notes
- Remaining Flow canvas/layout/inspector/property panels and config labels are still pending.

## Tests
- Not run (UI copy migration only).
