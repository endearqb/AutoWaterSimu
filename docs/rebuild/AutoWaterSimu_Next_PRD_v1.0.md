# AutoWaterSimu Next PRD v1.0

**版本**: v1.0
**日期**: 2026-05-25
**范围**: AutoWaterSimu Web/Platform 与 AutoWaterSimu Desktop 双线重构
**输入依据**:

- `docs/rebuild/AutoWaterSimu_Final_State_Driven_Plan_v1.2.md`
- `docs/rebuild/windows app.md`
- 当前代码审阅结果: React 18 + Chakra UI v3 + FastAPI/SQLModel/PostgreSQL + React Flow + Python 仿真核心

---

## 1. 产品定位

AutoWaterSimu Next 是面向水处理工艺建模、仿真计算、模型证据管理与外部系统集成的双形态产品:

1. **AutoWaterSimu Web / Platform**
   - 面向 NewSystem、milp、Agent 与多人协作场景。
   - 技术形态为 React + Go Compute API + Python Simulation Worker。
   - 重点能力是服务端任务编排、权限、审计、模型证据与外部系统集成。

2. **AutoWaterSimu Desktop**
   - 面向离线建模、本地仿真、现场演示、客户交付和模型验证。
   - 技术形态为 Tauri/Rust + React + Python Simulation Worker + SQLite。
   - 重点能力是本地项目管理、本地任务编排、本地 artifact 存储和离线可运行。

两条产品线不共享后端语言实现，但共享:

- ProcessGraph / SimulationInput / ComputeJob / ComputeResult 合同。
- Python simulation core。
- 仿真模型与参数治理语义。
- 前端交互模型和 COSS-compatible UI 风格。
- Evidence 与 artifact 分层规范。

---

## 2. 当前状态与主要问题

### 2.1 当前资产

现有仓库已经具备以下可复用能力:

- React Flow / XYFlow 流程图编辑器。
- Material Balance 计算、时段覆盖、采样间隔、结果摘要与时间序列。
- ASM1、ASM1Slim、ASM3、UDM 计算路径。
- UDM 模型编辑、模板、Petersen 教程、Hybrid UDM 校验。
- FastAPI 生成 OpenAPI client，前端已有服务与 zustand store。
- 核心 Material Balance / Hybrid UDM / UDM runtime 已有后端测试覆盖。

### 2.2 当前阻塞

- `backend/app/api/routes/asm1.py` 与 `backend/app/api/routes/udm.py` 的 validate 返回字段与 `MaterialBalanceValidationResponse` 不一致，运行时会失败。
- 长耗时仿真仍由 FastAPI `BackgroundTasks` 和线程池承载，没有 worker claim、heartbeat、job events、cancel acknowledgement 和 late-result 防护。
- `result_data` 与 `summary_data` 直接入库 JSON，时间序列增长会导致数据库膨胀。
- 前端导出 React Flow 画布 JSON 后直接提交计算，缺 CanvasGraph -> ProcessGraph -> SimulationInput 合同分层。
- ASM1/ASM1Slim/ASM3 flowchart 创建接口残留 `print` 调试输出，有日志污染与数据泄露风险。
- 前端核心页面仍依赖 Chakra UI，目标 COSS-compatible UI 尚未开始。

### 2.3 基线验证

本轮审阅时确认:

- `frontend; npx tsc --noEmit` 通过。
- 后端核心测试通过:
  - `time_segment_validation_test.py`
  - `material_balance_segment_overrides_test.py`
  - `hybrid_udm_validation_test.py`
  - `udm_engine_variable_binding_test.py`
- Pydantic protected namespace、v1 validator warning 与 FastAPI lifespan deprecation warning 已在 Phase 0 cleanup 中清理；仍存在第三方 `python_multipart` import warning 与 legacy OpenAPI metadata drift，属于后续治理项。

---

## 3. 用户与场景

### 3.1 工艺工程师

目标:

- 创建水处理流程图。
- 配置节点、边、组分、流量、模型绑定和仿真参数。
- 一键提交仿真。
- 查看 summary、最终值、曲线、质量守恒与 warnings。
- 导出结果与证据。

关键成功标准:

- 从最小流程图到仿真结果的链路可闭环。
- 结果可追溯到流程图版本、参数集、模型版本和输入 hash。
- 大结果不拖慢任务列表和详情页。

### 3.2 模型工程师

目标:

- 管理 ASM / UDM / Material Balance / Calibration / Benchmark 模型能力。
- 维护模型版本、参数模板、参数集、benchmark case。
- 验证模型质量并沉淀 model run records。

关键成功标准:

- 能知道每次结果使用了哪个模型、哪个参数集、哪个 worker runtime。
- 参数集状态清晰，不会把候选参数误认为生产参数。

### 3.3 NewSystem 审批用户

目标:

- 在审批页面引用 AutoWaterSimu 仿真证据。
- 判断调度建议、工艺变更或方案发布是否有风险。

关键成功标准:

- 仿真结果可以形成 evidence package。
- AutoWaterSimu 只提供证据，不直接发布生产指令。

### 3.4 milp / Agent 集成方

目标:

- milp 把调度方案交给 AutoWaterSimu 做仿真校核。
- Agent 把自然语言转换为 simulation_request_draft，由 API 校验后提交 job。
- Agent 解释结果时引用 evidence_refs。

关键成功标准:

- 集成只依赖稳定合同，不直接调用 Python 内部函数。
- Agent 只能生成 DSL 草案，不能直接生成 Python 代码或绕过用户确认。

### 3.5 现场离线用户

目标:

- 在没有服务器或网络的环境运行桌面版。
- 导入/保存本地流程图、CSV/JSON/Excel 数据包。
- 本地执行 material balance、ASM、UDM 仿真。
- 导出结果 JSON/CSV/证据包，后续可导入平台版。

关键成功标准:

- Windows 桌面版可安装、可启动、可离线运行最小 material balance job。
- Python worker 被打包为 sidecar，用户不需要手动安装 Python。

---

## 4. 产品目标

### 4.1 P0 目标

- 修复现有 validate 与日志泄露问题。
- 建立共享合同目录和 schema 测试。
- 拆出纯 Python simulation core 的边界。
- 建立 Desktop MVP 的本地 job lifecycle。
- 建立 Web / Platform 的 Go Compute API skeleton。

### 4.2 P1 目标

- Material Balance 从旧 FastAPI BackgroundTasks 迁移到 worker。
- Desktop 与 Web 都能提交同一类 `simulation.material_balance.v1` job。
- 结果 summary 入库，大结果进入 artifact。
- ProcessGraph 合同成为计算输入前的唯一领域拓扑。

### 4.3 P2 目标

- ASM1、ASM1Slim、ASM3、UDM worker 化。
- 引入 model catalog、parameter set、model run records。
- 支持 NewSystem/milp/Agent 的只读证据集成。

### 4.4 P0 / P1 / P2 决策表

| 主题 | P0 必须决策 | P1/P2 延后事项 |
|---|---|---|
| 合同命名 | 统一使用 snake_case `schema_version`，如 `compute_job.v1` | 合同废弃策略和跨大版本迁移 |
| API 行为 | idempotency、错误码、分页、timeout、retry 语义 | 多租户配额、复杂过滤 DSL |
| Worker 状态 | heartbeat timeout、stale worker requeue、late result 防护 | Temporal / Kubernetes Job 升级 |
| 数值可复现 | material balance tolerance、单位转换、runtime audit | ASM/UDM 全模型基准矩阵 |
| Artifact | 256KB 阈值、checksum、下载权限 | 长期归档、冷存储、跨项目共享 |
| 安全 | worker token hash、service-token scope、Desktop 路径 sandbox | 企业 RBAC、多租户隔离 |
| 发布 | schema/codegen/测试门禁、Windows installer smoke | 签名、自动更新、Microsoft Store |

---

## 5. 功能需求

### 5.1 共享合同

系统必须提供并长期维护以下合同:

- `canvas_graph.v1`: 前端画布状态。
- `process_graph.v1`: 领域拓扑和模型绑定。
- `simulation_input.v1`: worker 可执行输入。
- `compute_job.v1`: 任务编排合同。
- `compute_result.v1`: 任务结果合同。
- `model_run.v1`: 模型运行证据。
- `artifact.v1`: 大结果与导出文件索引。

P1/P2 预留合同:

- `simulation_request.v1`: NewSystem/milp/Agent 进入仿真链路的结构化请求。
- `agent_scenario_draft.v1`: Agent 生成的待确认场景草案，不直接创建生产任务。
- `evidence_package.v1`: 审批、导出和解释使用的证据包。
- `contract_error.v1`: 跨 Web、Desktop、Worker 的统一错误返回结构。

合同必须满足:

- JSON Schema 可校验。
- schema version 显式存在，且与 schema 文件名保持一致。
- TypeScript 与 Python / Go / Rust 都能生成或复用类型。
- 兼容 Desktop 和 Web 两条线。
- 每个合同都有 valid / invalid fixture、错误码和最小可运行示例。

### 5.2 Web / Platform

Web / Platform 必须提供:

- Compute job 创建、查询、取消。
- Worker claim、heartbeat、succeed、fail。
- Result summary 查询。
- Artifact metadata 与下载入口。
- Model run / evidence 查询。
- OpenAPI 文档与生成客户端。
- healthz / readyz / metrics。
- `idempotency_key` 去重，重复提交同一 key 返回同一 job 或明确冲突错误。
- list API 支持稳定分页、排序和最小 filter。
- 统一错误码、retry-after、timeout 与取消语义。
- service-token scope，用于 NewSystem、milp、Agent 的受限调用。

Web / Platform 不做:

- 不在 Go API 中执行 ODE / torch / numpy / scipy 计算。
- 不直接修改 NewSystem 主数据。
- 不自动批准或发布生产指令。
- P0 不做完整多租户平台化权限，只保留 tenant / subject 字段边界。

### 5.3 Desktop

Desktop 必须提供:

- 本地项目与流程图文件管理。
- 本地 SQLite job store。
- Python worker sidecar 启动、停止、重启、健康检查。
- stdin/stdout JSON-RPC 通信。
- 本地 artifact 存储和导出。
- 离线 material balance MVP。
- sidecar 参数白名单、路径规范化和本地文件 sandbox。
- worker stderr、crash dump、job events 可打包为 support bundle。
- 本地项目 export/import、SQLite 备份/恢复的基础路径。

Desktop 不做:

- 第一阶段不内置 Go sidecar。
- 不让 React 直接启动 worker 或执行 shell。
- 不直接暴露 Python 本地 HTTP 服务作为默认路径。
- 第一阶段不打包 CUDA。
- 第一阶段不做自动更新、代码签名和复杂企业安装器。

### 5.4 Simulation Core

Simulation Core 必须:

- 不依赖 HTTP。
- 不依赖数据库。
- 不依赖用户或权限上下文。
- 不知道 worker token。
- 可通过纯函数或类调用进行单元测试。
- 显式记录 solver/runtime 参数、单位体系、数值 tolerance 和输入 hash。
- 与旧 FastAPI 计算结果对照时必须给出模型级数值容差。

示例目标调用:

```python
result = MaterialBalanceCalculator().calculate(input_data)
```

### 5.5 Evidence & Governance

每次仿真必须最终可以追溯:

- job_id、job_type、source_system、requested_by。
- input_hash、parameter_hash、result_hash。
- process_graph_id、process_graph_version。
- model_key、model_version、parameter_set_id。
- worker_id、runtime_version。
- warnings、quality_metrics、artifact_refs、model_runs。

Evidence package 必须支持:

- 导出 job event timeline。
- 引用 process graph、simulation input、artifact checksum 和 runtime audit。
- 说明模型版本、参数集状态、是否允许进入生产/审批场景。
- 脱敏后用于 support bundle 或外部审计。

---

## 6. 非目标

第一阶段明确不做:

- 不一次性迁移所有旧页面。
- 不一次性替换 FastAPI 主系统。
- 不用 Rust 或 Go 重写科学计算算法。
- 不让 Agent 生成或执行 Python 代码。
- 不让 AutoWaterSimu 发布生产控制指令。
- 不把前端 CanvasGraph 直接作为 worker 输入。
- 不把大时间序列完整写入 job 主表 JSON。
- 不长期保留 Chakra UI 与 COSS-compatible UI 双主体系。
- 不直接上 Temporal 或 Kubernetes Job。
- 不在 Desktop MVP 中实现自动更新、复杂安装器和 GPU 调度。
- P0 不实现完整 RBAC、多租户计费、配额和限流体系。
- P0 不实现 artifact 冷存储、自动归档和跨项目共享。
- P0 不实现 installer signing、auto update、Microsoft Store 分发。

---

## 7. 成功指标

### 7.1 MVP 成功指标

- 合同 schema 有 valid / invalid 自动化测试。
- Desktop 能在 Windows 上离线运行最小 material balance job。
- Web Compute API 能创建 job、worker claim、heartbeat、succeed、fail。
- Material Balance result summary 可查询，大结果进入 artifact。
- 前端可展示任务状态、错误原因、summary 和 artifact refs。
- 同一 `idempotency_key` 重复提交行为稳定可测。
- worker heartbeat timeout、取消和 late result 都有事件记录。

### 7.2 质量指标

- `frontend; npx tsc --noEmit` 必须通过。
- 后端现有核心测试必须继续通过。
- Worker CLI `--self-check` 必须通过。
- 每个新合同都有版本号与 schema 测试。
- 每次 job 状态变化都有 event。
- late succeed 不得覆盖 `cancelled`、`timed_out`、`failed`。
- schema/codegen gate 失败时不得合并。
- Windows installer smoke 和 worker packaging smoke 纳入 release gate。
- material balance 新旧实现双跑结果在定义 tolerance 内。

### 7.3 业务指标

- 工艺工程师可完成“画图 -> 仿真 -> 看结果 -> 导出”闭环。
- Desktop 可用于现场演示，不依赖云服务。
- Web 可被 NewSystem、milp、Agent 通过合同安全接入。
- 结果可作为审批证据引用。

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 直接大规模重写前端 | 周期失控 | 新建核心任务页，旧页面 legacy 保留 |
| Worker 与旧 FastAPI 结果不一致 | 用户不信任迁移 | 建立 baseline fixtures 和双跑对比 |
| PyInstaller 打包 torch/scipy 失败 | Desktop MVP 不可交付 | 先 one-folder，CPU-only，增加 packaging smoke |
| 合同设计过度复杂 | P0 无法落地 | P0 只覆盖 material balance 所需最小字段 |
| 大结果仍进入数据库 | 性能退化 | 256KB 阈值和 artifact 强制策略 |
| Agent 绕过校验 | 生产风险 | DSL 草案、API 校验、用户确认、evidence 引用 |
| FastAPI 与 Go 长期并存 | 维护成本高 | 设定明确退出条件和只读对照期 |
| API 行为不一致 | 前端、Agent、worker 难以可靠重试 | P0 固定 idempotency、错误码、timeout、分页规则 |
| Worker 失联后状态不清 | job 卡死或重复写结果 | heartbeat timeout、stale requeue、late-result guard |
| Artifact 无生命周期 | 本地或对象存储无限增长 | retention、export/import、support bundle 与清理策略 |
| 权限边界过早复杂化 | P0 延误 | P0 保留 scope 字段和 token hash，RBAC/tenant 后置 |
| 发布缺门禁 | 打包和 schema 漂移阻断交付 | CI gate、codegen gate、installer smoke、migration rollback 验收 |

---

## 9. 退出条件

### 9.1 FastAPI 计算入口退出

- Go Compute API 覆盖 job lifecycle。
- Material Balance / ASM / UDM 长任务均迁移到 worker。
- 旧 FastAPI 计算接口只读对照不少于 30 天。
- 前端新核心页面不再调用旧计算接口。
- README 标记旧后端计算入口为 legacy。

### 9.2 Chakra UI 退出

- 新核心页面全部使用 COSS-compatible components。
- 关键旧页面迁移完成。
- 无 Chakra Provider 依赖。
- 删除 Chakra 依赖。
- Playwright visual smoke 通过。

### 9.3 旧 Job 模型退出

- `BackgroundTasks` 不再承载长耗时仿真。
- 所有长任务均进入 compute_jobs。
- 旧 MaterialBalanceJob/ASMJob/UDMJob 只作为迁移对照或历史查询。
- calculator 不再内部生成最终 job_id，job_id 由编排层提供。
