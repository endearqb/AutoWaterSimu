# 目录说明：frontend/src/components/Flow/edges

> 类型：contract
> Canonical sources：
> - `frontend/src/features/udm-v2/edges/edgeModel.ts`
> - `contracts/network_process_graph.v1.json`
> - `contracts/network_simulation_input.v1.json`

## 1. 目录职责

本目录负责：

- Legacy React Flow edge rendering and inline edge labels.
- Temporary UDM Network v2 edge helper files from the pre-isolation slice until PFC cleanup removes them.
- Preserving legacy `flow` behavior while the dedicated `/udm-v2` feature takes over typed edge modeling.

本目录不负责：

- New UDM Network v2 edge modeling; add new v2 edge code under `frontend/src/features/udm-v2/edges/`.
- Network runtime compilation or solver execution.
- Generated OpenAPI clients.
- Node palette or layout shell state.

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `EditableEdge.tsx` | Legacy shared edge renderer |
| `EdgeModeSelector.tsx` | Deprecated temporary v2 selector awaiting PFC cleanup |
| `NetworkEdgeInspectorFields.tsx` | Deprecated temporary v2 inspector fields awaiting PFC cleanup |

## 3. 维护约定

1. Do not add new UDM-v2 behavior in this directory.
2. Existing legacy `flow` must remain present for current save/load and calculation paths until v2 retirement gates pass.
3. Temporary `edge_kind` support here is migration debt and should only be removed or frozen during PFC-A/PFC-B.

## 4. 对外接口

本目录向 `Canvas.tsx`、`FlowCanvas.tsx` and inspector panels 暴露 edge UI components。

## 5. 依赖边界

可以依赖 Chakra UI, XYFlow, icons, and frontend shared types。

不应该依赖 backend runtime, generated clients, or worker code。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

1. 修改 edge data shape 时同步 `frontend/src/stores/flowStore.ts` and `frontend/src/stores/createModelFlowStore.ts`。
2. 修改 contract-facing field names 时同步 `contracts/` schema and examples。
