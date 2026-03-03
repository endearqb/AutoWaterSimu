# 基于开发进度文档的代码评审结论（2026-03-03）

关联输入：`docs/development_progress_2026-03-03.md`

## 1. 评审范围

- UDM 建模与计算主链路
- ASM 多时段（Time Segment）相关前后端逻辑
- Hybrid UDM 配置与校验链路
- Posthog Demo/Flow 组件文档页（状态隔离与演示稳定性）

## 2. 基线校验（评审时）

- 后端相关测试通过（15 passed）：
  - `backend/tests/test_hybrid_udm_validation.py`
  - `backend/tests/test_time_segment_validation.py`
  - `backend/tests/test_material_balance_segment_overrides.py`
  - `backend/tests/test_udm_engine_variable_binding.py`
- 前端类型检查通过：
  - `cd frontend; npx tsc --noEmit`

## 3. 关键发现（按严重度）

### P0-1：流程图导入未恢复 `calculationParameters`，影响复现一致性

- 证据：
  - `frontend/src/stores/createModelFlowStore.ts:1071-1079` 解构导入数据时未取 `calculationParameters`
  - `frontend/src/stores/createModelFlowStore.ts:1200-1212` `set(...)` 时未恢复 `calculationParameters`
  - `frontend/src/stores/createModelFlowStore.ts:1208-1209` 存在注释掉的恢复逻辑
- 影响：
  - 同一流程图在导入后可能沿用“当前 store 参数”，导致 `hours/steps_per_hour` 与原任务不一致。
  - 结果复盘、缺陷复现、跨环境验算存在偏差风险。
- 建议：
  - 导入时恢复 `calculationParameters`，并提供显式策略：
    - 默认“使用文件参数”；
    - 可选“保持当前参数”。
  - 将策略写入导入结果提示与 UI 文案，避免隐式行为。

### P0-2：Flow 组件文档页快照回滚字段不完整，存在状态污染风险

- 证据：
  - `frontend/src/components/HomePosthog/FlowComponentsDocs.tsx:28-42` `FlowStoreSnapshot` 仅包含部分字段
  - `frontend/src/components/HomePosthog/FlowComponentsDocs.tsx:102-116` 进入页面时仅快照部分状态
  - `frontend/src/components/HomePosthog/FlowComponentsDocs.tsx:149-163` 离开页面回滚同样仅限部分状态
  - 对比 `frontend/src/stores/createModelFlowStore.ts:49-55`，store 还包含 `timeSegments/hybridConfig/isEdgeTimeSegmentMode`
- 影响：
  - 演示页加载样例后，可能残留时段计划/Hybrid 配置等状态到真实编辑流程。
  - 用户回到业务页面后看到“非预期状态”，降低可解释性。
- 建议：
  - 快照与回滚覆盖完整业务关键字段（至少补齐上述三项）。
  - 或改为进入页面时创建隔离 store（demo 独立 state）。

### P1-1：UDM 任务列表总数统计使用 `len(all())`，在大数据量下低效

- 证据：
  - `backend/app/api/routes/udm.py:569-573`
- 影响：
  - 统计总数时会把当前用户全部任务记录加载到内存，再 `len`。
  - 对任务量较大的用户会增加响应延迟与数据库/应用内存压力。
- 建议：
  - 改为数据库计数查询：`select(func.count()).select_from(UDMJob)...`。

### P1-2：权限不足使用 `400`，与语义及全局约定不一致

- 证据：
  - `backend/app/api/routes/udm_hybrid_configs.py:90`
  - `backend/app/api/routes/udm_hybrid_configs.py:137`
  - `backend/app/api/routes/udm_hybrid_configs.py:168`
  - 同类历史路由也存在相同模式，如：
    - `backend/app/api/routes/flowcharts.py:62/102/126`
    - `backend/app/api/routes/udm_flowcharts.py:62/102/126`
- 影响：
  - 前端难以区分“请求参数错误”和“权限不足”。
  - 与 `403 Forbidden` 语义不一致，影响 SDK/监控分类与错误处理策略。
- 建议：
  - 统一“权限不足”返回 `403`，保持错误码语义一致。
  - 如需兼容旧客户端，增加短期过渡说明与前端兜底映射。

### P2-1：Pydantic v2 迁移技术债（`class Config` / `schema_extra`）

- 证据：
  - `backend/app/material_balance/models.py:215-216`
- 影响：
  - 会产生 Pydantic v2 兼容警告，长期将影响升级和测试输出整洁度。
- 建议：
  - 迁移至 `model_config = ConfigDict(...)` + `json_schema_extra` 写法。
  - 清理相关 warning，纳入“测试无 warning”基线。

## 4. 功能优化建议（不进入实现）

1. 导入一致性策略标准化
   - 目标：导入行为可预期、可复现。
   - 方案：导入弹窗增加“参数恢复策略”选项，并在导入后 toast 展示策略结果。
2. Hybrid 校验前置化
   - 目标：减少“提交后失败”。
   - 方案：前端在提交计算前显示“映射完整率 + 缺失项列表”，后端返回结构化 `code/errors/warnings`。
3. 时段配置复用能力
   - 目标：降低多图重复配置成本。
   - 方案：支持“保存为时段模板/从模板加载”，并校验与 `hours` 自动对齐。
4. 任务列表检索能力
   - 目标：在任务增多后仍可快速定位。
   - 方案：按状态、时间范围、名称关键字过滤，并提供默认排序策略。

## 5. UI/UX 优化建议（不进入实现）

1. 时段编辑效率与可读性
   - 增加“自动均分 N 段”快捷入口。
   - 对“继承值”使用图标/标签强化视觉语义，不仅依赖灰色背景。
2. Hybrid 映射可见性
   - 增加“已映射/总数”进度条，缺失项高亮。
   - 在映射编辑区支持筛选（按模型对、按变量名）。
3. UDM 编辑长表单导航
   - 对超长表单加入分段锚点（基础信息/组分/矩阵/参数/校验）。
   - 关键操作按钮吸顶，减少长滚动场景下的操作成本。
4. 风险操作反馈一致性
   - 删除/发布等危险操作统一使用组件化确认弹窗。
   - mutation 按钮统一 loading/disabled 反馈，避免重复点击。

## 6. 结论

- 当前主干功能链路可用，但“可复现性”“状态隔离”“错误语义一致性”存在可预期风险。
- 建议优先处理 P0/P1 项，再推进功能与 UI/UX 体验优化。
