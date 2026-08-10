# 目录说明：frontend/src/components/Flow

> 更新于:2026-08-10 · commit 3ef7936

## 1. 目录职责

本目录负责 legacy React Flow / XYFlow 画布体验。

本目录负责：

- Flow canvas、layout、toolbar、inspector、nodes、edges、bubble menu。
- material balance、ASM1/ASM1Slim/ASM3、UDM flow editor 的共享 UI。
- legacy analysis panels and charts。

本目录不负责：

- 后端计算实现。
- generated API client。
- Desktop Tauri workbench。
- UDM Network v2 独立前端；新 v2 代码必须放在 `frontend/src/features/udm-v2/**`。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `FlowCanvas.tsx`、`Canvas.tsx` | React Flow canvas |
| `FlowLayout.tsx`、`Layout.tsx` | editor shell layout |
| `inspectorbar/` | property/calculation/simulation panels |
| `toolbar/` | node palette and result panels |
| `nodes/` | model/input/output node components |
| `edges/` | legacy editable edge renderer；已有临时 UDM-v2 edge helper 属于 PFC 清理债务，不再扩展 |
| `menu/` | save/load/import/context dialogs |
| `legacy-analysis/` | result analysis dialogs, charts and panels |
| `shared/` | v1/v2 可共同使用、通过 props 驱动的无状态 UI/交互原语 |

## 3. 维护约定

1. XYFlow import 使用项目固定格式：`import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';`
2. 画布数据 shape 改动必须同步 stores、services、backend route/tests。
3. Inspector width、chart container、node handles 等布局变更需要检查窄屏和压缩面板。
4. UDM 教程专用行为不要破坏 material balance/ASM legacy flows。
5. UDM Network v2 不得复用本目录的 canvas、store、业务 edge/inspector 或节点行为；允许复用 boundary allowlist 中通过 props 驱动的无状态 UI/交互原语。

## 4. 对外接口

本目录向 `frontend/src/routes/_layout/*` 和 UDM/tutorial routes 暴露 flow editor UI；白名单内共享原语也可供 UDM-v2 使用。

## 5. 依赖边界

可以依赖 frontend stores、services、utils、types、Chakra UI 和 XYFlow。

不应该依赖 backend Python runtime 或 worker sidecar。
不应该依赖 `frontend/src/features/udm-v2/**`。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

涉及 backend payload 时同时运行对应 backend pytest。

## 7. AI 操作提示

1. 搜索所有 model-specific route/store 调用方后再改共享 Flow components。
2. 图表和 inspector layout 改动建议用浏览器检查实际渲染。
