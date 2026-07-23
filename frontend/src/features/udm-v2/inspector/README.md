# 目录说明：frontend/src/features/udm-v2/inspector

> 更新于:2026-07-23 · commit 61e2259
> 类型：contract
> Canonical sources：
> - `../README.md`
> - `../serialize/semanticValidation.ts`

## 1. 目录职责

本目录负责：

- `/udm-v2` property panel UI for selected nodes, selected edges, and graph-level flow constraints.
- Feature-local field editors for node schema/default state and edge-kind-specific fields.
- Rendering semantic diagnostics next to inspector fields.

本目录不负责：

- Legacy Flow property panels.
- Contract serialization, worker execution, or backend validation.

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `NetworkV2PropertyPanel.tsx` | Element / Diagnostics / Graph 分层 Inspector entrypoint |
| `NodeSchemaV2Editor.tsx` | Node label/schema/initial condition/binding editor |
| `SecondaryClarifierV2ConfigPanel.tsx` | SecondaryClarifier10Layer composite config editor |
| `FlowConstraintsV2Editor.tsx` | Graph-level flow constraints JSON editor |
| `*V2Fields.tsx` | Edge-kind-specific fields |

## 3. 维护约定

1. Inspector components must not import `frontend/src/components/Flow/**`.
2. Field names should match `NetworkV2NodeData` / `NetworkV2EdgeData` keys.
3. Diagnostics shown here must come from `../serialize/semanticValidation.ts`.
4. Graph-level constraints and validation belong to the Graph section; do not permanently append them below every element editor.
5. Diagnostics section defaults to the current element plus graph-level diagnostics.

## 4. 测试与验证

```powershell
cd frontend; npm run test
cd frontend; npm run typecheck
cd frontend; npm run check:udm-v2-boundary
```
