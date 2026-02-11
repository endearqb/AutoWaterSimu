# UDM 实施说明（Phase1-10）

日期：2026-02-11  
范围：基于 `docs/UDM/requirement_discuss.md` 的 UDM 落地实现，初始模型使用 ASM1 / ASM1Slim / ASM3 的 Petersen 矩阵模板。

---

## 1. 实施结论（先看结果）

- UDM 后端主链路已接通：模型定义、模板、校验、流程图、计算任务、结果查询。
- UDM 前端主链路已接通：路由、菜单入口、画布、节点、属性面板、计算面板、服务调用。
- 已接入 ASM1 / ASM1Slim / ASM3 三套 seed template（含 `processes + stoich + rate_expr`）。
- 已完成一次关键修复：`createModelFlowStore.ts` 导出对象字段拼接错误修复（`customParameters` 与 `calculationParameters` 分行）。
- 校验通过：
  - `cd frontend; npx tsc --noEmit`
  - `cd backend; .venv\Scripts\python.exe -m py_compile ...（UDM相关文件）`

---

## 2. Phase1-10 实施详情

## Phase 1：数据库与数据模型

目标：提供 UDM 模型、版本、流程图、任务的持久化结构。  
状态：已完成。

主要变更：

- 新增迁移：`backend/app/alembic/versions/1ce6aa42e2f7_add_udm_tables.py`
  - `udmmodel`
  - `udmmodelversion`
  - `udmflowchart`
  - `udmjob`
- 更新实体与 schema：`backend/app/models.py`
  - 用户关系增加 `udm_models / udm_model_versions / udm_flowcharts / udm_jobs`
  - `NodeData` 增加 UDM 字段：`udm_model_id / udm_model_version / udm_model_hash / udm_component_names / udm_processes / udm_parameter_values / udm_model_snapshot`

## Phase 2：UDM Seed 模板（ASM1/ASM1Slim/ASM3）

目标：提供可直接创建 UDM 的初始模板。  
状态：已完成。

主要变更：

- 新增：`backend/app/services/udm_seed_templates.py`
  - 模板键：`asm1`、`asm1slim`、`asm3`
  - 每个模板包含：`components`、`parameters`、`processes(rate_expr + stoich)`、`meta`
  - 提供：
    - `list_udm_seed_templates()`
    - `get_udm_seed_template(template_key)`

## Phase 3：表达式解析与校验

目标：支持 UDM rate expression 的安全解析、变量抽取、定义校验。  
状态：已完成。

主要变更：

- 新增：`backend/app/services/udm_expression.py`
  - 负责表达式编译/校验能力（供模型校验与求解复用）。

## Phase 4：UDM 模型管理 API

目标：模型 CRUD、模板建模、定义校验、版本化。  
状态：已完成。

主要变更：

- 新增：`backend/app/api/routes/udm_models.py`
  - `GET /udm-models/templates`
  - `POST /udm-models/validate`
  - `POST /udm-models/`
  - `POST /udm-models/from-template`
  - 读写列表、详情、更新、删除等 API
  - 创建/更新流程里带 definition hash 与 validation 结果

## Phase 5：UDM 流程图 API

目标：UDM 流程图 CRUD。  
状态：已完成。

主要变更：

- 新增：`backend/app/api/routes/udm_flowcharts.py`
  - `GET /udm-flowcharts`
  - `POST /udm-flowcharts`
  - `GET /udm-flowcharts/{id}`
  - `PUT /udm-flowcharts/{id}`
  - `DELETE /udm-flowcharts/{id}`

## Phase 6：UDM 计算引擎与任务服务

目标：让 UDM 可从 flowchart 发起仿真，得到 summary/timeseries/final-values。  
状态：已完成。

主要变更：

- 新增：`backend/app/material_balance/udm_engine.py`
  - 根据节点 `udm_processes + udm_parameter_values + udm_component_names` 构建 runtime payload
  - 执行 `stoich_matrix` 与 rate evaluator 的反应项计算
- 新增：`backend/app/services/udm_service.py`
  - 任务执行与结果写回
- 新增：`backend/app/api/routes/udm.py`
  - `POST /udm/calculate`
  - `POST /udm/calculate-from-flowchart`
  - `GET /udm/result/{job_id}`
  - `GET /udm/result/{job_id}/timeseries`
  - `GET /udm/result/{job_id}/final-values`
  - `GET /udm/jobs` / `GET /udm/jobs/{job_id}` / `DELETE /udm/jobs/{job_id}`

## Phase 7：后端路由总入口接入

目标：将 UDM API 纳入主路由。  
状态：已完成。

主要变更：

- 更新：`backend/app/api/main.py`
  - 挂载 `udm`、`udm_flowcharts`、`udm_models` 路由。

## Phase 8：前端客户端与服务层

目标：前端可调用 UDM 后端接口。  
状态：已完成。

主要变更：

- 更新 OpenAPI 生成客户端：`frontend/src/client/*`（`core`、`sdk.gen.ts`、`types.gen.ts`、`index.ts`）
- 新增：`frontend/src/services/udmService.ts`
  - 包装 UDM 模型、流程图、计算任务相关调用

## Phase 9：前端 UDM 画布与状态管理

目标：有独立 UDM 页面、节点、面板、store，并支持仿真工作流。  
状态：已完成。

主要变更：

- 新增页面与路由：
  - `frontend/src/routes/_layout/udm.tsx`
  - `frontend/src/stores/udmFlowStore.ts`
  - `frontend/src/stores/udmStore.ts`
- 工具栏与菜单：
  - `frontend/src/components/Flow/ToolbarWrapper.tsx`（`UDMToolbarWrapper`）
  - `frontend/src/components/Common/SidebarItems.tsx`（新增 `/udm`）
- UDM 节点与面板：
  - `frontend/src/components/Flow/nodes/UDMNode.tsx`
  - `frontend/src/components/Flow/toolbar/UDMNodesPanel.tsx`
  - `frontend/src/components/Flow/inspectorbar/UDMPropertyPanel.tsx`
  - `frontend/src/components/Flow/inspectorbar/UDMCalculationPanel.tsx`
  - `frontend/src/components/Flow/menu/UDMBubbleMenu.tsx`
- UDM 配置与仿真参数：
  - `frontend/src/config/modelConfigs.ts`（新增 `UDM_CONFIG`，`seedTemplateKeys: ["asm1","asm1slim","asm3"]`）
  - `frontend/src/config/simulationConfig.ts`（新增 `udm` 仿真参数）
- 主题与视觉：
  - `frontend/src/components/Flow/nodes/utils/glass.ts`
  - `frontend/src/stores/themePaletteStore.ts`

## Phase 10：集成收口与修复

目标：让 UDM 与既有 ASM store/flow 导入导出机制兼容。  
状态：已完成（含一次关键修复）。

主要变更：

- 更新：`frontend/src/stores/createModelFlowStore.ts`
  - UDM 导出逻辑：
    - 保留 `udmModel / udmModelSnapshot / udmComponents / udmProcesses / udmParameterValues...`
    - UDM 的边参数导出使用 `state.customParameters`
    - `customParameters` 导出对 UDM 使用当前状态参数，不再强制退化为 `fixedParameters`
  - UDM 导入逻辑：
    - `mergedCustomParameters` 对 UDM 优先采用导入参数
  - 关键修复：
    - 修复 `exportFlowData` 返回对象中 `customParameters` 与 `calculationParameters` 同行拼接问题
- 路由树修正：
  - `frontend/src/routeTree.gen.ts`（加入 `/_layout/udm`，移除无效 `showcase` 引用）
  - `frontend/src/components/HomePosthog/PosthogLanding.tsx`（`/showcase` -> `/openflow`）

---

## 3. 接口/类型层面的新增与变化

后端新增主接口：

- `POST /api/v1/udm/calculate`
- `POST /api/v1/udm/calculate-from-flowchart`
- `GET /api/v1/udm/result/{job_id}`
- `GET /api/v1/udm/result/{job_id}/timeseries`
- `GET /api/v1/udm/result/{job_id}/final-values`
- `GET /api/v1/udm/jobs`
- `GET /api/v1/udm/jobs/{job_id}`
- `DELETE /api/v1/udm/jobs/{job_id}`
- `GET /api/v1/udm-models/templates`
- `POST /api/v1/udm-models/validate`
- `POST /api/v1/udm-models/from-template`
- `GET/POST/PUT/DELETE /api/v1/udm-models...`
- `GET/POST/PUT/DELETE /api/v1/udm-flowcharts...`

前端模型配置新增：

- `UDM_CONFIG`（模型名 `udm`）
- `modelSpecific.seedTemplateKeys = ["asm1", "asm1slim", "asm3"]`

---

## 4. 验证记录

已执行并通过：

```powershell
cd frontend; npx tsc --noEmit
```

```powershell
cd backend; .venv\Scripts\python.exe -m py_compile `
  app/api/routes/udm.py `
  app/api/routes/udm_flowcharts.py `
  app/api/routes/udm_models.py `
  app/material_balance/core.py `
  app/material_balance/udm_engine.py `
  app/services/data_conversion_service.py `
  app/services/udm_expression.py `
  app/services/udm_service.py `
  app/services/udm_seed_templates.py `
  app/models.py `
  app/api/main.py
```

---

## 5. 已知问题与风险

1. `frontend/src/stores/createModelFlowStore.ts` 当前存在部分中文注释乱码（历史编码问题），不影响 TS 编译与运行逻辑，但建议后续做一次纯文本清理。
2. `frontend/src/routeTree.gen.ts` 为手工修正版本（由于 `router-cli` 在当前路由结构存在冲突），后续建议在清理 `routes/index.tsx` 与 `routes/_layout/index.tsx` 冲突后重新自动生成。
3. 本文档覆盖的是“当前工作区实现状态”；若后续还有未提交改动，应在合并前做一次端到端烟测与回归。

---

## 6. 我在本轮额外做的收口工作

本轮额外执行的动作（相较于已有半成品）：

1. 定位并修复 `createModelFlowStore.ts` 的返回对象字段拼接 bug（`calculationParameters` 被吞并到注释行）。
2. 再次执行前后端编译级校验，确认修复后整体不报错。
3. 对 ASM1/ASM1Slim/ASM3 seed template 的可用性做了代码级确认。

