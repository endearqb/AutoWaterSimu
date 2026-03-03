# 开发进度优化执行计划（2026-03-03）

关联输入：

- `docs/development_progress_2026-03-03.md`
- `docs/20260303_progress_code_review.md`

说明：本计划仅落地方案与任务拆解，不在本轮直接进入代码实现。

## 1. 目标与边界

### 1.1 目标

- 消除评审中的高优先级风险（P0/P1）。
- 为 UDM / ASM 多时段 / Hybrid UDM 制定功能与 UI/UX 的可执行优化路径。
- 将后续开发改造为“可验收、可回归、可追踪”的任务清单。

### 1.2 边界

- 本文档阶段不改动业务代码。
- 输出为任务分解、接口影响、测试策略和验收标准。

## 2. 优先级排期（建议）

| 批次 | 周期 | 任务ID | 优先级 | 目标 |
|---|---|---|---|---|
| A | Week 1 | A1 | P0 | 修复导入参数恢复一致性 |
| A | Week 1 | A2 | P0 | 修复 Demo 页状态污染风险 |
| B | Week 1-2 | B1 | P1 | 优化 UDM 任务统计查询性能 |
| B | Week 1-2 | B2 | P1 | 统一权限错误码语义（400 -> 403） |
| C | Week 2 | C1 | P2 | 完成 Pydantic v2 配置迁移 |
| D | Week 2-3 | D1-D4 | P1/P2 | 功能体验与 UI/UX 收口 |

## 3. 实施任务清单

### A1：导入恢复 `calculationParameters`

- 类型：功能正确性
- 影响文件：
  - `frontend/src/stores/createModelFlowStore.ts`
  - `frontend/src/components/Flow/*`（如需导入策略 UI）
- 方案：
  - `importFlowData` 接收并应用导入数据中的 `calculationParameters`。
  - 增加策略参数：
    - `useImportedCalculationParameters = true`（默认）
    - 可选保留当前参数模式。
- 验收标准：
  - 导入前后 `hours/steps_per_hour` 与文件一致（默认策略）。
  - E2E 场景中，导入同一 JSON 能复现相同计算结果。

### A2：FlowComponentsDocs 完整快照回滚

- 类型：状态隔离
- 影响文件：
  - `frontend/src/components/HomePosthog/FlowComponentsDocs.tsx`
- 方案：
  - 快照补齐关键字段：`timeSegments`、`hybridConfig`、`isEdgeTimeSegmentMode`。
  - 或重构为 demo 独立 store，彻底隔离业务状态。
- 验收标准：
  - 进入/退出 demo 页面后，业务流程图状态与进入前一致。
  - 不出现“残留时段/Hybrid 配置”问题。

### B1：UDM 任务总数查询性能优化

- 类型：后端性能
- 影响文件：
  - `backend/app/api/routes/udm.py`
- 方案：
  - 将 `len(session.exec(select(...)).all())` 替换为数据库 `count(*)` 查询。
- 验收标准：
  - 任务总数统计 SQL 为聚合查询。
  - 大数据量用户下接口响应时间明显下降（以现网/压测基线对比）。

### B2：权限不足语义统一为 `403`

- 类型：接口一致性
- 影响文件：
  - `backend/app/api/routes/udm_hybrid_configs.py`
  - `backend/app/api/routes/flowcharts.py`
  - `backend/app/api/routes/udm_flowcharts.py`
- 方案：
  - 权限不足统一返回 `HTTPException(status_code=403, detail="Not enough permissions")`。
  - 前端错误处理兼容 `400/403` 过渡一个迭代周期。
- 验收标准：
  - 相关接口权限不足均返回 `403`。
  - 前端不出现权限错误误报为“参数错误”的提示。

### C1：Pydantic v2 配置迁移

- 类型：技术债清理
- 影响文件：
  - `backend/app/material_balance/models.py`
- 方案：
  - `class Config` + `schema_extra` 迁移到 `model_config` + `json_schema_extra`。
- 验收标准：
  - 测试不再出现相关迁移警告。
  - OpenAPI 示例输出与迁移前语义一致。

### D1-D4：功能与 UI/UX 收口（按模块）

#### D1 时段计划（ASM）

- 功能：提供“自动均分时段”“模板保存/加载”。
- UI/UX：继承值图形化标记，提升可读性与可访问性。

#### D2 Hybrid UDM

- 功能：映射完整率与缺失项前置校验。
- UI/UX：映射区支持筛选与分组，减少大配置滚动负担。

#### D3 UDM 编辑体验

- 功能：导入/导出与版本操作提示闭环。
- UI/UX：长表单分段导航、关键操作吸顶、错误定位更直接。

#### D4 全局交互一致性

- 功能：危险操作统一确认流程。
- UI/UX：统一 loading / disabled / toast 反馈规范。

## 4. 测试与回归策略

### 4.1 后端

- 继续使用并扩展现有测试：
  - `backend/tests/test_hybrid_udm_validation.py`
  - `backend/tests/test_time_segment_validation.py`
  - `backend/tests/test_material_balance_segment_overrides.py`
  - `backend/tests/test_udm_engine_variable_binding.py`
- 新增：
  - 权限码回归测试（断言 403）。
  - `/udm/jobs` 大数据量场景性能回归（聚合计数）。

### 4.2 前端

- 必跑：
  - `cd frontend; npx tsc --noEmit`
- 建议补充：
  - `FlowComponentsDocs` 进出页面状态恢复测试。
  - 导入流程图后 `calculationParameters` 应用策略测试。

## 5. 风险与依赖

1. 权限码从 400 调整到 403 可能影响既有前端分支或外部调用方。
2. 导入策略变化可能改变部分用户既有使用习惯，需要明确发布说明。
3. Demo 页若改为独立 store，需要梳理与现有面板组件的依赖关系。

## 6. 交付物定义（DoD）

1. P0/P1 任务有明确代码改动与测试证明。
2. 文档、错误语义、前端提示保持一致。
3. 关键路径（导入 -> 校验 -> 计算 -> 查看结果）回归通过。
4. 当日 `updatenote` 记录已同步。
