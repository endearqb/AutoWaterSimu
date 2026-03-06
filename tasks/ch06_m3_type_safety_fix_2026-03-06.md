# Ch06 M-3 Type Safety Fix — 执行记录

**日期**: 2026-03-06
**任务**: 修复 Ch06 Review 报告中 M-3 (C-2 类型安全) 遗留问题

## 目标

消除 UDM 业务链路中的 `any` 类型和不必要的 `Record<string, unknown>` 松散遍历，替换为已有的领域类型。

## 修改清单

### 1. 新建 `frontend/src/types/udmNodeData.ts`
- 定义 `UDMNodeModelSnapshot` 接口 (id, name, version, hash, components, parameters, processes, parameterValues, meta)
- 定义 `UDMNodeData extends Record<string, unknown>` 接口 (label, udmModelId, udmModel, udmModelSnapshot, udmComponents 等)
- 供 UDMNode、UDMBubbleMenu、UDMPropertyPanel 复用

### 2. 修改 `frontend/src/components/Flow/nodes/UDMNode.tsx`
- 删除本地 `UDMNodeData` 接口定义，import 共享类型
- `NodeProps<any>` → `NodeProps<Node<UDMNodeData>>`
- 移除 `data as UDMNodeData` cast（类型自动推断）
- 移除 `(nodeData as Record<string, unknown>).udmModel` 中间 cast，直接用 `nodeData.udmModel?.name`、`nodeData.udmModelId`

### 3. 修改 `frontend/src/components/Flow/menu/UDMBubbleMenu.tsx`
- `(selectedNode.data as any)?.udmModelId` → `(selectedNode.data as UDMNodeData)?.udmModelId`
- `flowStore?: any, modelStore?: any` → 定义精确的局部接口（含方法签名）
- `input_data as any` → 定义 `FlowchartInputData` 结构类型（nodes, edges, customParameters, edgeParameterConfigs）
- `(param: any)` → 移除显式 annotation，由推断获得
- `[string, any]` → `[string, Record<string, EdgeParameterConfig>]` 和 `[string, EdgeParameterConfig]`
- `(summary: any)` → `(summary: MaterialBalanceResultSummary)`

### 4. 修改 `frontend/src/components/UDM/UDMModelEditorDialog.tsx`
- `as Array<Record<string, unknown>>` → `as UDMComponentDefinition[]` / `UDMParameterDefinition[]` / `UDMProcessDefinition[]`
- 移除 camelCase 后备访问 (`param.defaultValue` → 只用 `param.default_value`)

### 5. 修改 `frontend/src/components/UDM/UDMModelEditorForm.tsx`
- 两处 `.map` 数据加载代码（`loadVersion` 和 `buildDefaultFlowData`）
- `(item: Record<string, unknown>)` → 数组级 cast `as UDMComponentDefinition[]` / `UDMProcessDefinition[]` / `UDMParameterDefinition[]`
- 移除 camelCase 后备访问 (`item?.defaultValue`, `item?.isFixed`, `item?.rateExpr`, `item?.stoichExpr`, `item?.minValue`, `item?.maxValue`)

### 6. 修改 `frontend/src/components/Flow/inspectorbar/UDMPropertyPanel.tsx`
- `extractUDMComponentParameters` 参数: `Record<string, unknown>` → `UDMNodeData`
- 移除 `(sourceData.udmModelSnapshot as Record<string, unknown>)?.components` 中间 cast
- `getSelectedNodeModelKey` 参数: `Record<string, unknown>` → `UDMNodeData`
- 移除 `udmModel.modelId` / `udmModel.currentVersion` dead fallbacks
- 调用处 cast 从 `Record<string, unknown>` 改为 `UDMNodeData`

## 验证结果

| 检查项 | 结果 |
|---|---|
| `npx tsc --noEmit` | ✅ 零错误 |
| `pnpm build` | ✅ 构建成功 (20.18s) |
| `pnpm lint` (修改文件) | ✅ 无新增 lint 错误（24 条均为预存） |
| `as any` 残留搜索 | ✅ 所有修改文件中 `as any` / `: any` 已清零 |

## 不在本次范围

- `BaseBubbleMenu.tsx` 的 `flowStore?: () => any` — 跨模型共性问题
- `baseModelStore.ts` 的 `finalValues: any | null` — 跨模型共性
- 后端 `UDMModelVersionPublic` schema 修复 — 需要后端改动 + generate-client
- `UDMPropertyPanel.tsx` 中 `buildNodeModelData` 函数 — 返回值用于泛型 node data 操作
