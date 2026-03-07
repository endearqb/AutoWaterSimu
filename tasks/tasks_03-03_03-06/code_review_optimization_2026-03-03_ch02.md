# 代码审查与优化建议（章节拆分）

- 来源: docs/code_review_optimization_2026-03-03.md
- 章节: 2. 开发进度评审发现

---

## 2. 开发进度评审发现

> 来源：`docs/20260303_progress_code_review.md`
> 基线校验：后端 15 项测试通过，前端 `tsc --noEmit` 通过

### P0-1：流程图导入未恢复 `calculationParameters`，影响复现一致性

**文件**:
- `frontend/src/stores/createModelFlowStore.ts:1071-1079` — 解构导入数据时未取 `calculationParameters`
- `frontend/src/stores/createModelFlowStore.ts:1200-1212` — `set(...)` 时未恢复 `calculationParameters`
- `frontend/src/stores/createModelFlowStore.ts:1208-1209` — 存在注释掉的恢复逻辑

**影响**:
- 同一流程图在导入后可能沿用"当前 store 参数"，导致 `hours/steps_per_hour` 与原任务不一致
- 结果复盘、缺陷复现、跨环境验算存在偏差风险

**建议**:
- 导入时恢复 `calculationParameters`，并提供显式策略：默认"使用文件参数"，可选"保持当前参数"
- 将策略写入导入结果提示与 UI 文案，避免隐式行为

### P0-2：Flow 组件文档页快照回滚字段不完整，存在状态污染风险

**文件**:
- `frontend/src/components/HomePosthog/FlowComponentsDocs.tsx:28-42` — `FlowStoreSnapshot` 仅包含部分字段
- `frontend/src/components/HomePosthog/FlowComponentsDocs.tsx:102-116` — 进入页面时仅快照部分状态
- `frontend/src/components/HomePosthog/FlowComponentsDocs.tsx:149-163` — 离开页面回滚仅限部分状态

**影响**:
- 演示页加载样例后，可能残留 `timeSegments`、`hybridConfig`、`isEdgeTimeSegmentMode` 等状态到真实编辑流程
- 用户回到业务页面后看到"非预期状态"

**建议**:
- 快照与回滚覆盖完整业务关键字段（至少补齐 `timeSegments`、`hybridConfig`、`isEdgeTimeSegmentMode`）
- 或改为进入页面时创建隔离 store（demo 独立 state）

### P1-1：UDM 任务列表总数统计使用 `len(all())`，在大数据量下低效

**文件**: `backend/app/api/routes/udm.py:569-573`

**影响**: 统计总数时将当前用户全部任务记录加载到内存，再 `len`。对任务量较大的用户增加响应延迟与内存压力。

**建议**: 改为数据库计数查询 `select(func.count()).select_from(UDMJob)...`。

### P1-2：权限不足使用 `400`，与语义及全局约定不一致

**文件**:
- `backend/app/api/routes/udm_hybrid_configs.py:90, 137, 168`
- `backend/app/api/routes/flowcharts.py:62, 102, 126`
- `backend/app/api/routes/udm_flowcharts.py:62, 102, 126`

**影响**: 前端难以区分"请求参数错误"和"权限不足"，与 `403 Forbidden` 语义不一致。

**建议**: 统一"权限不足"返回 `403`，保持错误码语义一致。如需兼容旧客户端，增加短期过渡期。

### P2-1：Pydantic v2 迁移技术债（`class Config` / `schema_extra`）

**文件**: `backend/app/material_balance/models.py:215-216`

**影响**: 产生 Pydantic v2 兼容警告，长期影响升级和测试输出整洁度。

**建议**: 迁移至 `model_config = ConfigDict(...)` + `json_schema_extra` 写法。



---

## 关联章节（8-12）

- [8. 统一优先级总表](./code_review_optimization_2026-03-03_ch08.md)
- [9. 统一开发计划](./code_review_optimization_2026-03-03_ch09.md)
- [10. 测试与回归策略](./code_review_optimization_2026-03-03_ch10.md)
- [11. 风险与依赖](./code_review_optimization_2026-03-03_ch11.md)
- [12. 附录：审查涉及的核心文件清单](./code_review_optimization_2026-03-03_ch12.md)

