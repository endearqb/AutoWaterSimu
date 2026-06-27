# 目录说明：frontend/src/components/Flow/edges

> 类型：contract
> Canonical sources：
> - `frontend/src/types/networkEdges.ts`
> - `contracts/network_process_graph.v1.json`
> - `contracts/network_simulation_input.v1.json`

## 1. 目录职责

本目录负责：

- React Flow edge rendering and inline edge labels.
- UDM Network v2 edge mode controls and inspector field groups.
- Preserving legacy `flow` behavior while carrying typed `edge_kind` data.

本目录不负责：

- Network runtime compilation or solver execution.
- Generated OpenAPI clients.
- Node palette or layout shell state.

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `EditableEdge.tsx` | Shared edge renderer; styles and labels by `edge_kind` |
| `EdgeModeSelector.tsx` | Canvas overlay for selecting the next edge kind |
| `NetworkEdgeInspectorFields.tsx` | Shared inspector fields for hydraulic/pump/settling/signal edges |

## 3. 维护约定

1. Supported edge kinds are exactly `hydraulic`, `pump`, `settling`, and `signal`.
2. Edge UI fields should use contract names: `edge_kind`, `flow_spec`, `component_policy`, `pump`, `transport_model`, and `signal_spec`.
3. Existing legacy `flow` must remain present for current save/load and calculation paths until v2 runtime replaces them.

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

