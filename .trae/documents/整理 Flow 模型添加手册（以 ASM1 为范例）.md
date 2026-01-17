## 文档目标

* 以 `ASM1` 为完整示例，整理项目中“在流程图中添加模型并完成端到端模拟”的前后端全流程手册。

* 面向研发：覆盖页面集成、组件位置、参数配置、数据导出/转换、API 契约、后端计算、数据库设计与作业管理。

* 输出为一份中文 Markdown 手册，含代码位置与行号引用、操作步骤与注意事项，可作为新增模型（如 ASM2d/ASM3）的模板。

## 文档结构

1. 概览与数据流

* 页面入口：`frontend/src/routes/_layout/asm1.tsx` 将 FlowCanvas/Inspector/Toolbar/SimulationPanel 与 `useASM1FlowStore`、`useASM1Store` 集成。

* 前端导出 → 后端转换 → 计算核心 → 结果入库 → 结果查询的完整链路图与说明。

1. 前端页面与组件地图

* 路由与骨架：`frontend/src/routes/_layout/asm1.tsx`

* 画布/布局/检查器：`components/Flow/FlowLayout`、`components/Flow/FlowCanvas`、`components/Flow/FlowInspector`

* 工具栏与节点面板：`components/Flow/ToolbarWrapper.tsx`、`components/Flow/toolbar/ASM1NodesPanel.tsx`

* 节点组件：`components/Flow/nodes/ASM1Node.tsx`

* 参数面板：`components/Flow/inspectorbar/ASM1PropertyPanel.tsx`、`ASM1CalculationPanel.tsx`

* 模拟面板：`components/Flow/inspectorbar/SimulationPanel.tsx`

* 状态管理：`src/stores/asm1FlowStore.ts`、`src/stores/createModelFlowStore.ts`、`src/stores/asm1Store.ts`

* 前端服务与 SDK：`src/services/asm1Service.ts`、`src/client/sdk.gen.ts`、`src/client/types.gen.ts`

1. 模型参数配置

* 位置：`frontend/src/config/modelConfigs.ts`

* ASM1 固定参数（11 组分）与增强计算参数（19 动力学），`ASM1_CONFIG` 定义与可用变量。

* 模拟参数默认与校验：`frontend/src/config/simulationConfig.ts`。

1. 流程图节点/边添加与参数同步

* 通用 Store 工厂：`frontend/src/stores/createModelFlowStore.ts`

  * `onConnect` 初始化新边与默认 a/b 因子：`createModelFlowStore.ts:148`

  * `addNode` 添加节点后的参数补齐：`createModelFlowStore.ts:198`

  * `syncAllParametersToElements` 为所有节点/边补齐 `fixed + enhanced + custom` 参数与边的 a/b：`createModelFlowStore.ts:967`

  * `exportFlowData` 将画布数据与计算参数、`customParameters` 统一导出：`createModelFlowStore.ts:489`

* ASM1 页面默认节点数据由 Store 自动注入：`frontend/src/routes/_layout/asm1.tsx`。

1. 前端模拟工作流

* 触发与轮询：`SimulationPanel.tsx` 使用 `exportFlowData()` → `asm1Store.createCalculationJobFromFlowchart` → `asm1Store.pollJobStatus`（动态间隔）

  * `createCalculationJobFromFlowchart`：`frontend/src/stores/asm1Store.ts:69`

  * `pollJobStatus`：`frontend/src/stores/asm1Store.ts:206`

* 结果获取：摘要、末值、时序的拉取与展示：`asm1Store.ts:102/136/115`。

1. API 契约与前端服务

* 服务封装：`frontend/src/services/asm1Service.ts`，对应 SDK 方法：

  * `createCalculationJobFromFlowchart`：`asm1Service.ts:53`

  * `getCalculationStatus`：`asm1Service.ts:64`

  * `getCalculationResultSummary`：`asm1Service.ts:78`

  * `getCalculationFinalValues`：`asm1Service.ts:120`

  * `getCalculationTimeseries`：`asm1Service.ts:92`

  * 作业列表/删除/输入快照：`asm1Service.ts:148/166/180`

* 前端 SDK：`src/client/sdk.gen.ts`/`types.gen.ts` 从 OpenAPI 生成。

1. 后端路由与数据转换

* 计算与查询端点：`backend/app/api/routes/asm1.py`

  * 从流程图创建作业：`asm1.py:92`（调用数据转换服务）

  * 状态/摘要/末值/时序：`asm1.py:392/154/210/283`

  * 作业列表/删除/输入快照：`asm1.py:479/527/555`

* 流程图 CRUD：`backend/app/api/routes/asm1_flowcharts.py`

* 数据转换服务：`backend/app/services/data_conversion_service.py`

  * `convert_flowchart_to_material_balance_input`：`data_conversion_service.py:21`

  * 节点/边转换：`data_conversion_service.py:128/293`

  * 计算结果转换为响应结构：`data_conversion_service.py:536`

1. 计算核心

* 计算器：`backend/app/material_balance/core.py`

  * `MaterialBalanceCalculator.calculate` 主入口：`core.py:55`

  * 节点/边张量化、稀疏流量/因子、ODE 平衡与各模型反应项（ASM1/ASM1Slim/ASM3）。

* 服务执行与超时估算：`backend/app/services/asm1_service.py`

  * `ASM1Service.run_calculation`：`asm1_service.py:28`

  * 线程池执行 `_run_calculation_sync`：`asm1_service.py:129`

1. 数据库设计

* 流程图表与模型：`backend/app/models.py`

  * `ASM1FlowChart` 及其公开模型：`models.py:596/653/662`

* 计算作业表与模型：`backend/app/models.py`

  * `ASM1Job`、`ASM1JobPublic/JobsPublic/JobInputDataResponse`：`models.py:611/669/682/703`

* 通用计算输入/输出/摘要模型：`MaterialBalanceInput/Result/ResultSummary`：`models.py:281/328/343`

1. 新模型接入步骤（模板）

* 前端：

  * 在 `modelConfigs.ts` 定义固定/增强参数与 `availableVariables`，新增 `MODEL_CONFIG`。

  * 创建节点组件与工具栏面板；在 `_layout/<model>.tsx` 挂载 `FlowCanvas/FlowInspector/SimulationPanel` 与 `<model>FlowStore/<model>Store`。

  * 使用 `createModelFlowStore` 保持 `addNode/onConnect/sync/export` 的一致逻辑。

  * 更新 `BubbleMenu/Toolbar` 以支持新节点类型。

* 后端：

  * 新增路由 `<model>.py`（参考 `asm1.py`），注册到 `api/main.py`。

  * 在 `data_conversion_service.py` 增加 `<model>` 的节点/边映射规则。

  * 在 `material_balance/core.py` 增加 `<model>` 的反应项函数与 ODE 集成。

  * 在 `models.py` 增加 `<model>FlowChart/<model>Job` 表及公开模型。

* SDK：后端 OpenAPI 更新后，按照项目规则生成前端客户端。

1. 校验与运行

* 前端类型检查：`cd frontend; npx tsc --noEmit`

* 开发预览：`cd frontend; npm install; npm run dev`

* 后端虚拟环境与运行：`cd backend; .venv\Scripts\activate; fastapi run app/main.py`

* OpenAPI 客户端生成：按照仓库规则 2.1/2.2 执行。

## 产出形式

* 新建 `docs/model-addition-guide-asm1.md`（或按你习惯的文档路径命名），写入完整手册。

* 提供端到端流程图（文本版）与主要函数的代码引用标注。

* 附带一份“新增模型 Checklist”，保证前后端一致与 SDK 更新。

## 后续执行

* 获得确认后：我将落地该文档，补全必要的示意图与表格（保持简洁），并在关键处增加代码引用（`file_path:line_number`）。

