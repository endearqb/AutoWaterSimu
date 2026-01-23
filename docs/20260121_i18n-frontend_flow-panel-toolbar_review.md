# i18n Flow Property Panel + Toolbar Review (2026-01-21)

## Scope
- Flow property panels, inspector containers, toolbar/data/results panels, and model parameter labels.

## Changes
- Migrated property panel, inspector, and toolbar copy to `t(...)`.
- Localized flow data/results/model parameters panels.
- Synced ASM1/ASM1Slim/ASM3 parameter label/description keys for model configs.
- Expanded flow i18n types/messages for property panel, calculation panels, toolbar, and model parameter keys.

## Files touched
- `frontend/src/components/Flow/inspectorbar/ASM1PropertyPanel.tsx`
- `frontend/src/components/Flow/inspectorbar/ASM1SlimPropertyPanel.tsx`
- `frontend/src/components/Flow/inspectorbar/ASM3PropertyPanel.tsx`
- `frontend/src/components/Flow/inspectorbar/PropertyPanel.tsx`
- `frontend/src/components/Flow/inspectorbar/CalculationPanel.tsx`
- `frontend/src/components/Flow/inspectorbar/ModelCalculationPanel.tsx`
- `frontend/src/components/Flow/inspectorbar/InspectorContainer.tsx`
- `frontend/src/components/Flow/inspectorbar/BaseInspectorContainer.tsx`
- `frontend/src/components/Flow/toolbar/BaseToolbarContainer.tsx`
- `frontend/src/components/Flow/toolbar/DataPanel.tsx`
- `frontend/src/components/Flow/toolbar/ModelParametersPanel.tsx`
- `frontend/src/components/Flow/toolbar/ResultsPanel.tsx`
- `frontend/src/components/Flow/toolbar/NodesPanel.tsx`
- `frontend/src/components/Flow/toolbar/ASM1NodesPanel.tsx`
- `frontend/src/components/Flow/toolbar/ASM1SlimNodesPanel.tsx`
- `frontend/src/components/Flow/toolbar/ASM3NodesPanel.tsx`
- `frontend/src/config/modelConfigs.ts`
- `frontend/src/i18n/messages/en.ts`
- `frontend/src/i18n/messages/zh.ts`
- `frontend/src/i18n/types.ts`

## Tests
- `cd frontend; npx tsc --noEmit`
