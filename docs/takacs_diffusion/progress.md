# 进度日志 (Progress Log)：Takacs 一维沉降 × React Flow“扩散/沉降边”

## 会话日期 (Session): 2026-01-30

### 阶段 1：需求分析与现状勘察
- **状态:** complete
- **开始时间:** 2026-01-30
- 已采取的操作：
  - 阅读 `backend/app/material_balance/core.py`，确认 ODE 结构为 `delta_m`/`delta_Q`，适合叠加额外质量迁移项。
  - 阅读 `docs/Takacs_model1D.py`，提取 Takacs 双指数模型的计算模式（先求整体颗粒浓度，再求速度/通量）。
  - 阅读前端 `frontend/src/stores/flowStore.ts` 的 `exportFlowData()`，确认边参数以 `${param}_a/_b` 形式展开到 `edge.data`。
  - 阅读后端 `backend/app/services/data_conversion_service.py::_convert_edges()`，确认其读取 `data.flow` 与 `${param}_a/_b` 并生成 `EdgeData.concentration_factor_a/b`。
  - 对照前端生成的 `frontend/src/client/types.gen.ts`，确认 OpenAPI `EdgeData` 字段与 `core.py` 使用一致（`source_node_id` 等）。
- 创建/修改的文件：
  - `docs/takacs_diffusion/task_plan.md`（创建）
  - `docs/takacs_diffusion/findings.md`（创建）
  - `docs/takacs_diffusion/progress.md`（创建）

### 阶段 2：方案设计（数据结构 + 计算逻辑 + UX）
- **状态:** complete
- 已采取的操作：
  - 明确“扩散/沉降边”应为**质量传递边**：仅影响 `delta_m`，不影响 `delta_Q`。
  - 提出 `edge_kind` 分流方案：`flow` 与 `diffusion` 两类边并存。
  - 决定尽量复用现有边的 a/b 参数配置来表达“组分权重向量”，降低 UI 改造成本。
- 创建/修改的文件：
  - `docs/takacs_diffusion/task_plan.md`（更新）
  - `docs/takacs_diffusion/findings.md`（更新）

### 阶段 3：执行文档输出
- **状态:** complete
- 已采取的操作：
  - 输出端到端字段映射、后端/前端改造步骤、测试与验收清单（见 `docs/takacs_diffusion/design_and_execution.md`）。
- 创建/修改的文件：
  - `docs/takacs_diffusion/design_and_execution.md`（创建）

### 阶段 4：交付
- **状态:** complete
- 已采取的操作：
  - 规划与执行文档全部落盘到 `docs/takacs_diffusion/`，便于后续按文档实施代码改造。
- 创建/修改的文件：
  - `docs/takacs_diffusion/*`（如上）

### 追加：根据用户反馈修订文档
- **状态:** complete
- 已采取的操作：
  - 明确 diffusion 边首版仅做 **Takacs 单向沉降**，并在文档中预留 **线性 Fick 扩散**（方向由梯度/通量符号决定，前端需双箭头/无向形态）。
  - 将 Takacs 参数设计调整为：**放在边上**，且支持**按组分配置**（溶解态可通过 `w=0` 或 `v0/Vzs=0` 禁用）。
  - 明确 `C_solid` 权重向量 `w` 在前端边设置中配置（每条边可自定义）。
  - 确认 `solid_w` 使用独立字段 `number[]` 存储（不复用 `${param}_a/_b`），避免与 flow 边 a/b 语义混淆。
- 创建/修改的文件：
  - `docs/takacs_diffusion/task_plan.md`（更新）
  - `docs/takacs_diffusion/findings.md`（更新）
  - `docs/takacs_diffusion/design_and_execution.md`（更新）
  - `docs/takacs_diffusion/progress.md`（更新）

## 测试结果 (Test Results)
| 测试 | 输入 | 预期结果 | 实际结果 | 状态 |
|------|------|----------|----------|------|
| 文档落盘 | 查看 `docs/takacs_diffusion/` | 4 个文档文件存在 | 已创建 | ✓ |

## 错误日志 (Error Log)
| 时间戳 | 错误 | 尝试次数 | 解决方法 |
|--------|------|----------|----------|
| 2026-01-30 | 无 | 1 | - |

## “5 问重启”自测 (5-Question Reboot Check)
| 问题 | 答案 |
|------|------|
| 我在哪？ | 文档交付完成 |
| 我要去哪？ | 若继续实施：按 `design_and_execution.md` 开始改后端 Schema/转换/ODE，再改前端 edge UI/export |
| 目标是什么？ | 用通用“扩散/沉降边”机制实现可拖拽的 Takacs 1D 沉降建模 |
| 我学到了什么？ | 见 `docs/takacs_diffusion/findings.md` |
| 我做了什么？ | 见本文件日志与输出文档 |
