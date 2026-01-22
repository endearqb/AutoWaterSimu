# i18n Flow Layout Review (2026-01-21)

## Scope
- Flow canvas/layout/inspector/edge input copy + supporting message keys.
- Sync zh/en message catalogs for new flow sections.

## Changes
- Localized Flow inspector default title/empty state and edge panel heading.
- Localized flowchart import/export toasts in Flow layouts.
- Localized new node labels and edge flow input placeholder.
- Added shared empty-state localization for legacy analysis bar chart.
- Expanded flow i18n keys (canvas/inspector/edge + simulation labels + menu errors) and aligned zh/en messages.

## Files touched
- `frontend/src/components/Flow/FlowInspector.tsx`
- `frontend/src/components/Flow/FlowLayout.tsx`
- `frontend/src/components/Flow/Layout.tsx`
- `frontend/src/components/Flow/Canvas.tsx`
- `frontend/src/components/Flow/edges/EditableEdge.tsx`
- `frontend/src/components/Flow/legacy-analysis/ExternalLegendBarChart.tsx`
- `frontend/src/i18n/messages/en.ts`
- `frontend/src/i18n/messages/zh.ts`
- `frontend/src/i18n/types.ts`

## Notes
- Flow property panels, toolbar, and model config labels are still pending.

## Tests
- `cd frontend; npx tsc --noEmit`
