# AutoWaterSimu Final-State Driven Architecture Plan v1.2

**文档版本**：v1.2
**生成日期**：2026-05-21
**适用项目**：AutoWaterSimu Next
**定位**：从最终产品形态倒推当前重构工作的总控架构文档
**推荐归档路径**：`docs/architecture/AutoWaterSimu_Final_State_Driven_Plan_v1.2.md`

---

## 0. 一句话结论

AutoWaterSimu 的重构不应被定义为“把 FastAPI 换成 Go、把 Chakra UI 换成 COSS UI”。

更准确的最终定义是：

> **AutoWaterSimu Next 是基于 React 19 + Vite + COSS UI、Go Compute API、Python Simulation Worker、纯仿真核心与模型运行证据体系构建的水处理工艺数字孪生与仿真计算平台。**

它最终应服务于三类场景：

1. **工艺工程师独立建模与仿真**：流程图、ASM/UDM、物料平衡、水质过程、参数校核。
2. **NewSystem 业务审批证据链**：为调度建议、工艺变更、方案发布提供可审计的仿真证据。
3. **Agent 驱动的优化与仿真工具调用**：Agent 理解自然语言场景，生成结构化草案，由 Go API 校验并创建 compute job，worker 执行，Agent 解释结果。

---

## 1. 背景与当前决策

### 1.1 当前 AutoWaterSimu 的事实基础

当前 AutoWaterSimu 是一个面向水循环与水处理过程模拟的系统，已有核心能力包括：

- 工艺流程建模：基于 React Flow / XYFlow 的流程图编辑。
- ASM 模型模拟：ASM1、ASM1slim、ASM3 等活性污泥模型。
- 物料平衡与体积平衡：基于张量运算与 ODE 求解的多组分模拟。
- 任务与结果管理：保存计算任务、状态、结果摘要与时间序列。
- 旧后端：FastAPI + SQLModel + PostgreSQL。
- 旧前端：React + Vite + Chakra UI。

这些能力是资产，不应被“重构”抹掉。重构目标是将其改造成可长期融合 NewSystem、milp 和 Agent 的模型运行平台。

### 1.2 已确定的主技术路线

AutoWaterSimu Next 的主技术路线为：

```txt
Frontend: React 19 + Vite + TypeScript + COSS UI + React Flow / XYFlow
Backend:  Go + OpenAPI + compute job orchestration
Worker:   Python simulation worker
Core:     Python pure simulation core
Storage:  MySQL/PostgreSQL for metadata + object storage for artifacts
Contract: OpenAPI + JSON Schema + compute_job.v1 + process_graph.v1
```

### 1.3 v1.2 与 v1.1 的区别

v1.1 解决的是“怎么改造”：

- COSS UI 怎么引入。
- Go API 怎么替代 FastAPI 主入口。
- Worker 怎么承接长耗时计算。
- Material balance 怎么先 worker 化。

v1.2 解决的是“最终要长成什么，以及当前应该如何倒推”：

- 最终产品边界。
- 与 NewSystem、milp、Agent 的长期关系。
- 长期稳定合同。
- 模型治理体系。
- Agent DSL 预留。
- 观测性标准。
- 旧技术栈退出条件。
- Temporal / Kubernetes Job 等成熟架构的升级触发条件。

---

## 2. 最终产品形态

最终的 AutoWaterSimu Next 应由 5 个子产品 / 子系统构成。

```txt
AutoWaterSimu Next
├─ 1. AutoWaterSimu Studio
├─ 2. AutoWaterSimu Compute API
├─ 3. AutoWaterSimu Simulation Worker
├─ 4. AutoWaterSimu Simulation Core
└─ 5. AutoWaterSimu Evidence & Governance
```

### 2.1 AutoWaterSimu Studio

**定位**：工艺建模、仿真任务提交、结果查看、模型证据展示的统一前端工作台。

前端技术：

```txt
React 19
Vite
TypeScript
COSS UI
Tailwind CSS
Base UI primitives through COSS UI
React Flow / XYFlow
TanStack Query
OpenAPI-generated TypeScript client
Vitest / Playwright
```

主要页面：

```txt
/simulation
/simulation/process-graphs
/simulation/process-graphs/:graph_id
/simulation/jobs
/simulation/jobs/:job_id
/simulation/results/:result_id
/simulation/model-runs
/simulation/model-runs/:model_run_id
/simulation/benchmarks
/simulation/calibration
```

Studio 不直接调用 Python，也不直接提交旧 FastAPI 计算接口。Studio 只调用 Go API。

### 2.2 AutoWaterSimu Compute API

**定位**：Go 实现的任务编排、状态管理、合同输出、artifact 索引、worker 安全边界。

核心职责：

```txt
1. 接收仿真任务请求
2. 校验 ProcessGraph / SimulationInput
3. 创建 compute job
4. 管理 job 生命周期
5. 提供 worker claim / heartbeat / succeed / fail 接口
6. 保存 result summary / artifact refs / model runs
7. 提供 OpenAPI
8. 提供 healthz / readyz / metrics
9. 为 NewSystem / Agent / milp 提供标准调用入口
```

非职责：

```txt
1. 不运行 ASM / UDM / ODE / PyTorch 重计算
2. 不生成生产调度方案
3. 不绕过 NewSystem 做生产发布
4. 不直接修改 NewSystem 主数据
5. 不直接执行 Agent 生成的未确认约束
```

### 2.3 AutoWaterSimu Simulation Worker

**定位**：Python 计算执行器。

Worker 做：

```txt
claim job
heartbeat
validate job payload
call simulation core
build compute-result.v1
upload large artifacts
write succeed / fail
record runtime audit
```

Worker 不做：

```txt
用户登录
前端 API
审批流
主数据管理
流程图 UI 编辑
生产发布
```

### 2.4 AutoWaterSimu Simulation Core

**定位**：纯算法核心。

核心原则：

> **Simulation Core 不知道 HTTP、不知道数据库、不知道用户、不知道 worker token。**

它应当可以这样被单元测试：

```python
result = MaterialBalanceCalculator().calculate(input_data)
```

推荐目录：

```txt
simulation_core/
├─ material_balance/
├─ asm/
├─ udm/
├─ calibration/
├─ benchmark/
├─ common/
└─ schemas/
```

### 2.5 AutoWaterSimu Evidence & Governance

**定位**：模型结果可解释、可审计、可追溯的证据体系。

最终每次仿真都应留下：

```txt
job_id
job_type
input_hash
parameter_hash
process_graph_version
model_key
model_version
worker_id
runtime_version
summary
warnings
quality_metrics
artifact_refs
model_runs
evidence_refs
created_by / requested_by / source_system
```

这让结果可以进入 NewSystem 审批流，也让 Agent 可以引用证据解释结果。

---

## 3. 与 NewSystem、milp、Agent 的长期关系

### 3.1 NewSystem 与 AutoWaterSimu

NewSystem 是：

```txt
统一业务入口
唯一事实源
权限与组织边界
审批与发布边界
运营台账与审计边界
```

AutoWaterSimu 是：

```txt
工艺图建模平台
仿真计算平台
模型运行证据提供者
```

长期边界：

| 事项 | NewSystem | AutoWaterSimu |
|---|---|---|
| 用户与权限 | 负责 | 消费 service token / SSO 上下文 |
| 主数据 | 负责 | 消费标准 DTO，不自定义事实源 |
| 水质台账 | 负责 | 可读取或导入作为仿真输入 |
| 工艺图 | 可引用 | 负责建模、版本与校验 |
| 仿真任务 | 可发起 | 负责编排和执行 |
| 审批发布 | 负责 | 只提供证据，不发布生产指令 |
| 结果解释 | 可展示 | 提供结构化 evidence |

### 3.2 milp 与 AutoWaterSimu

milp 是优化建议引擎，AutoWaterSimu 是工艺仿真验证引擎。

典型链路：

```txt
milp 生成调度计划
→ AutoWaterSimu 将计划映射为 SimulationInput
→ 运行物料平衡 / 水质过程 / 工艺风险校核
→ 生成仿真证据
→ NewSystem 审批页引用证据
```

长期边界：

```txt
milp 不直接控制 AutoWaterSimu 内部函数
AutoWaterSimu 不直接生成生产调度方案
二者通过 compute job contract / simulation_request.v1 交互
```

### 3.3 Agent 与 AutoWaterSimu

Agent 是语义理解与决策解释层，不是求解器，也不是生产执行系统。

Agent 做：

```txt
理解自然语言场景
生成 simulation_request_draft
生成 constraint_draft
解释仿真结果
提出风险和替代方案
生成审批证据摘要
```

Agent 不做：

```txt
直接生成 Python 代码
直接调用 worker 内部函数
直接绕过 Go API 创建结果
直接修改生产配置
直接发布控制指令
```

推荐链路：

```txt
自然语言
→ Agent Draft
→ Go API 校验
→ 用户确认
→ Compute Job
→ Worker 执行
→ Evidence
→ Agent 解释
→ NewSystem 审批
```

---

## 4. 最终目标架构图

```txt
┌─────────────────────────────────────────────────────────────┐
│ AutoWaterSimu Studio                                        │
│ React 19 + Vite + COSS UI + React Flow + TS Client          │
│ - Process Graph Editor                                      │
│ - Simulation Jobs                                           │
│ - Results & Evidence                                        │
│ - Model Runs                                                │
└──────────────────────────────┬──────────────────────────────┘
                               │ OpenAPI / HTTP
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ AutoWaterSimu Compute API - Go                              │
│ - Auth Context / Service Token                              │
│ - ProcessGraph validation                                   │
│ - ComputeJob lifecycle                                      │
│ - Worker claim / heartbeat / result                         │
│ - Artifact index                                            │
│ - Model run evidence                                        │
│ - healthz / readyz / metrics                                │
└──────────────────────────────┬──────────────────────────────┘
                               │ Compute Job Contract
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Simulation Workers - Python                                 │
│ - simulation-worker                                         │
│ - calibration-worker                                        │
│ - benchmark-worker                                          │
│ - future coupled optimization/simulation worker             │
└──────────────────────────────┬──────────────────────────────┘
                               │ typed input/output
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Simulation Core - Python                                    │
│ - Material Balance                                          │
│ - ASM1 / ASM1slim / ASM3                                    │
│ - UDM                                                       │
│ - Calibration                                               │
│ - Benchmark                                                 │
└─────────────────────────────────────────────────────────────┘

External Integration:

NewSystem ──主数据/审批/台账──► AutoWaterSimu Compute API
milp      ──计划方案校核──────► AutoWaterSimu Compute API
Agent     ──DSL 草案/解释─────► AutoWaterSimu Compute API
```

---

## 5. 最终业务链路

### 5.1 工艺工程师独立仿真链路

```txt
创建流程图
→ 配置节点、边、模型绑定
→ 选择仿真类型
→ 提交任务
→ Worker 执行
→ 查看 summary、曲线、质量守恒、warnings
→ 导出 artifact
→ 形成模型运行记录
```

验收标准：

```txt
1. 用户能从图形流程创建仿真任务。
2. 任务状态可追踪。
3. 结果可解释且可下载。
4. 大结果不阻塞列表页。
5. 每次结果都可追溯到 graph version 和 parameter hash。
```

### 5.2 milp 调度方案仿真校核链路

```txt
milp 生成计划
→ NewSystem 或 milp 发起 simulation check
→ AutoWaterSimu 生成工艺校核结果
→ 输出风险、曲线和证据
→ NewSystem 审批页引用
```

验收标准：

```txt
1. simulation job 能引用 milp plan id。
2. 结果能明确标识 plan_id、scenario_id、process_graph_id。
3. 输出 risk findings。
4. 不自动批准或发布计划。
```

### 5.3 Agent 驱动仿真链路

```txt
用户自然语言描述
→ Agent 生成 simulation_request_draft
→ Go API 校验草案
→ 用户确认
→ 创建 compute job
→ Worker 执行
→ Agent 解释结果
→ 进入审批证据包
```

验收标准：

```txt
1. Agent 输出必须是 DSL，不是代码。
2. DSL 必须经过 Go API 校验。
3. 未确认草案不能执行生产相关动作。
4. 结果解释必须引用 evidence_refs。
```

### 5.4 模型工程师参数校准链路

```txt
选择历史数据窗口
→ 选择模型与参数范围
→ 提交 calibration job
→ 批量运行 simulation / benchmark
→ 输出候选参数、误差曲线、model run 证据
→ 标记参数集状态
```

验收标准：

```txt
1. 校准任务可批量运行。
2. 参数集可版本化。
3. benchmark case 可复现。
4. 候选参数不会自动成为生产参数。
```

---

## 6. 长期稳定合同体系

### 6.1 合同目录建议

```txt
contracts/
├─ compute_job.v1.json
├─ compute_result.v1.json
├─ process_graph.v1.json
├─ canvas_graph.v1.json
├─ simulation_input.v1.json
├─ simulation_result.v1.json
├─ model_run.v1.json
├─ artifact.v1.json
├─ model_catalog.v1.json
├─ agent_scenario_draft.v1.json
├─ constraint_draft.v1.json
├─ units.v1.json
└─ water_quality_components.v1.json
```

### 6.2 CanvasGraph / ProcessGraph / SimulationInput 分层

必须避免将前端画布 JSON 直接作为计算输入。

#### CanvasGraph

用于前端 UI：

```txt
node position
edge shape
viewport
selected state
layout metadata
UI panel state
```

#### ProcessGraph

用于领域拓扑：

```txt
nodes
edges
ports
process units
flow directions
component schema
model binding
parameter binding
unit metadata
validation status
```

#### SimulationInput

用于 worker 执行：

```txt
validated nodes
validated edges
expanded parameters
normalized units
component vector
time horizon
time segments
solver settings
runtime options
```

转换链路：

```txt
CanvasGraph
→ ProcessGraph
→ SimulationInput
→ SimulationCore
→ SimulationResult
```

### 6.3 ComputeJob 合同

推荐核心字段：

```json
{
  "schema_version": "compute-job.v1",
  "job_id": "job_xxx",
  "job_type": "simulation.material_balance.v1",
  "queue": "simulation",
  "request_id": "req_xxx",
  "idempotency_key": "idem_xxx",
  "payload": {},
  "context": {
    "source_system": "autowatersimu",
    "requested_by": "user_or_service",
    "trace_id": "trace_xxx"
  },
  "execution": {
    "time_limit_sec": 600,
    "priority": "normal",
    "required_capabilities": ["material_balance", "torch", "ode"]
  }
}
```

### 6.4 ComputeResult 合同

推荐核心字段：

```json
{
  "schema_version": "compute-result.v1",
  "job_id": "job_xxx",
  "job_type": "simulation.material_balance.v1",
  "status": "succeeded",
  "summary": {},
  "data": {},
  "quality": {
    "data_quality": "simulated",
    "warnings": []
  },
  "artifacts": [],
  "runtime_audit": {
    "model_runs": [],
    "timings_ms": {},
    "fallback_used": false,
    "fallback_reason": ""
  }
}
```

### 6.5 Agent DSL 合同

Agent 不直接创建生产任务，而是创建 draft。

```json
{
  "schema_version": "agent-scenario-draft.v1",
  "intent": "simulate_plan_risk",
  "natural_language_source": "今晚尽量省电，但清水池不能低于 2.8m",
  "target_assets": [],
  "time_window": {},
  "hard_constraints": [],
  "soft_constraints": [],
  "objective_preferences": [],
  "simulation_checks": [],
  "risk_notes": [],
  "confidence": 0.82,
  "requires_user_confirmation": true,
  "explanation": "..."
}
```

Go API 必须做：

```txt
schema validation
permission validation
asset mapping
unit validation
risk classification
user confirmation gate
```

---

## 7. 领域词汇表与单位体系

### 7.1 必须先统一的核心对象

```txt
site
plant
process_unit
process_node
process_edge
tank
pump
pipe
reactor
clarifier
filter
membrane_unit
sensor_tag
water_quality_metric
component_schema
parameter_set
process_graph
simulation_scenario
simulation_job
model_run
artifact
```

### 7.2 推荐单位标准

| 字段 | 推荐单位 | 说明 |
|---|---|---|
| flow_rate | m3/h | 流量 |
| volume | m3 | 体积 |
| level | m | 液位 |
| concentration | mg/L | 浓度 |
| mass_load | kg/h 或 kg/d | 负荷，必须标明时间单位 |
| time_step | min | 仿真步长 |
| temperature | °C | 温度 |
| area | m2 | 池体面积 |
| hydraulic_retention_time | h | 水力停留时间 |

### 7.3 组分向量标准

必须显式声明 component schema。

示例：

```json
{
  "component_schema_id": "asm1_components.v1",
  "components": ["S_I", "S_S", "X_I", "X_S"],
  "unit": "mg/L"
}
```

禁止仅靠数组顺序隐式传递组分含义。

---

## 8. 模型治理 Model Governance

### 8.1 为什么需要模型治理

最终 AutoWaterSimu 会同时存在：

```txt
material_balance
ASM1
ASM1slim
ASM3
UDM
settling tank
pH model
temperature correction
calibration
benchmark
future coupled optimization/simulation
```

如果没有模型治理，系统将无法回答：

```txt
这次结果用了哪个模型？
用了哪个参数集？
参数从哪里来？
是否经过 benchmark？
结果是否可复现？
是否允许进入审批？
```

### 8.2 推荐数据结构

```txt
model_catalog
model_versions
model_parameter_templates
model_parameter_sets
model_validation_cases
model_benchmark_runs
model_run_records
```

### 8.3 模型状态

```txt
draft
validated
approved_for_internal_use
approved_for_project_use
deprecated
archived
```

### 8.4 参数集状态

```txt
draft
candidate
validated
approved
retired
```

生产或审批场景中只能使用 allowed status 的模型与参数集。

---

## 9. 数据与存储策略

### 9.1 元数据入库

数据库保存：

```txt
job status
summary
input hash
result hash
artifact refs
model run metadata
process graph metadata
model catalog
parameter set metadata
```

### 9.2 大结果 artifact 化

对象存储保存：

```txt
full result JSON
time series matrix
node_data
edge_data
plots
exports
benchmark reports
calibration artifacts
```

建议阈值：

```txt
小于 256KB 可入库
大于 256KB 放 object storage
```

### 9.3 Artifact metadata

```txt
artifact_id
job_id
artifact_type
storage_provider
object_key
content_type
size_bytes
checksum
created_at
```

---

## 10. Go API 设计原则

### 10.1 OpenAPI First

所有对前端、NewSystem、Agent、worker 管理层开放的 HTTP API 均应有 OpenAPI 描述。

原因：

```txt
1. React TS client 可生成
2. NewSystem 可集成
3. Agent 工具描述可引用
4. 测试可基于合同
5. 避免口头接口漂移
```

### 10.2 异步请求-响应

长耗时任务不应使用同步 HTTP 等待。

标准行为：

```txt
POST /api/v1/compute/jobs
→ 202 Accepted
→ { job_id, status_url }

GET /api/v1/compute/jobs/{job_id}
→ status / progress / timestamps

GET /api/v1/compute/jobs/{job_id}/result
→ result summary or artifact refs
```

可提供短等待兼容接口，但等待上限建议不超过 5 秒。

### 10.3 CQRS Level 1 + Level 2

当前阶段采用轻量 CQRS：

```txt
Level 1：同一数据库，command/query service 分离
Level 2：少量 read projection 表，如 job_summary_view、model_run_view
```

暂不使用独立 read store，除非后续查询压力明显增加。

推荐服务拆分：

```txt
ComputeCommandService
ComputeQueryService
ProcessGraphCommandService
ProcessGraphQueryService
ArtifactQueryService
ModelRunQueryService
```

---

## 11. Worker 设计原则

### 11.1 Worker lifecycle

```txt
register capability
claim job
heartbeat
execute
upload artifacts
succeed / fail
```

### 11.2 Worker status

```txt
registered
idle
running
draining
offline
revoked
```

### 11.3 Worker security

推荐：

```txt
Authorization: Bearer <worker_token>
```

兼容：

```txt
X-Worker-Token: <worker_token>
```

长期应支持：

```txt
worker_id
worker_scope
allowed_queues
allowed_job_types
token_hash
last_seen_at
revoked_at
```

### 11.4 Worker cancellation

Cancel 不只是把状态改成 cancelled。

必须实现：

```txt
1. Go API 标记 cancel_requested
2. Worker heartbeat 看到 cancel_requested
3. Worker 尽可能中断当前任务
4. late succeed 不得覆盖 cancelled / timed_out / failed
5. cancellation event 进入 job events
```

---

## 12. 观测性标准

### 12.1 HTTP request fields

```txt
request_id
trace_id
actor_id
route
method
status
duration_ms
```

### 12.2 Job fields

```txt
job_id
job_type
queue
status
created_at
started_at
finished_at
duration_ms
worker_id
input_hash
result_hash
```

### 12.3 Worker fields

```txt
worker_id
queue
capabilities
last_heartbeat_at
current_running
max_concurrency
runtime_version
```

### 12.4 Model run fields

```txt
model_run_id
job_id
model_key
model_version
parameter_hash
input_hash
quality_metrics
fallback_used
fallback_reason
warnings
evidence_refs
```

### 12.5 End-state observability

第一阶段可以先做 structured logs + `/metrics`。后续接入 OpenTelemetry。

---

## 13. COSS UI 策略

### 13.1 COSS UI 采用方式

COSS UI 应按 copy-source / own-code 模式接入，而不是当成传统黑盒 npm 组件库。

推荐目录：

```txt
apps/web/src/components/coss/
apps/web/src/components/primitives/
apps/web/src/components/domain/
apps/web/src/features/
```

### 13.2 分层使用

```txt
COSS primitives
→ AutoWaterSimu design primitives
→ Domain components
→ Feature pages
```

示例：

```txt
COSS Button
→ AppButton
→ SimulationRunButton
→ MaterialBalancePage
```

### 13.3 不要长期混用 Chakra 与 COSS

过渡期允许旧页面保留 Chakra，但新增页面必须使用 COSS / NewSystem-compatible UI。

退出 Chakra 的条件：

```txt
1. P0 新页面全部使用 COSS-compatible components
2. 关键旧页面迁移完成
3. 无 Chakra Provider 依赖
4. package.json 删除 Chakra 依赖
5. Playwright visual smoke 通过
```

### 13.4 License gate

COSS 仓库采用 mixed licensing。复制组件前必须确认具体文件路径是否属于 MIT 范围。

实施要求：

```txt
1. 记录复制来源路径
2. 记录来源 commit hash
3. 保留 license notice
4. 禁止复制 AGPL 范围文件到闭源/不兼容项目，除非确认合规
```

---

## 14. 当前工作倒推：P0A / P0B / P0C

### 14.1 P0A：合同与 Go Compute 骨架

目标：算得起来、状态可追踪。

交付：

```txt
contracts/compute_job.v1.json
contracts/compute_result.v1.json
contracts/process_graph.v1.json
contracts/simulation_input.v1.json
Go API skeleton
compute_jobs table
compute_job_events table
worker claim / heartbeat / succeed / fail
material_balance worker handler
healthz / readyz / metrics
OpenAPI initial spec
```

验收：

```txt
1. 可提交 simulation.material_balance.v1 job。
2. worker 可 claim 并写回结果。
3. job status 可查询。
4. failed / timeout / cancel 有事件。
5. result summary 可查询。
```

### 14.2 P0B：COSS UI 新前端骨架

目标：看得见任务。

交付：

```txt
React 19 + Vite app shell
COSS-compatible component setup
Sidebar / Topbar / PageHeader
Simulation Jobs list
Job Detail
Result Summary
Worker Health
Artifact Download
OpenAPI TS client
```

验收：

```txt
1. 前端可提交 demo job。
2. 可查看 job status。
3. 可查看 result summary。
4. 失败任务有可读错误。
5. UI 不引入新的 Chakra 依赖。
```

### 14.3 P0C：流程图合同化

目标：从图到计算。

交付：

```txt
CanvasGraph save
ProcessGraph transform
ProcessGraph validation
ProcessGraph → SimulationInput
Material balance from ProcessGraph
Result overlay on graph nodes/edges
```

验收：

```txt
1. 用户可画一个最小流程图。
2. 系统可将其转换为 ProcessGraph。
3. ProcessGraph 可校验单位、节点、边、组分。
4. 可生成 SimulationInput。
5. 可提交仿真并查看节点结果。
```

---

## 15. P1 / P2 路线

### 15.1 P1：仿真能力扩展

```txt
ASM1 worker handler
ASM1slim worker handler
ASM3 worker handler
UDM worker handler
model catalog
parameter set versioning
artifact viewer
model run dashboard
```

### 15.2 P2：融合能力

```txt
NewSystem service integration
milp plan simulation check
Agent scenario draft validation
benchmark cases
calibration jobs
parameter sweep
```

### 15.3 P3：高级能力

```txt
MINLP / nonlinear coupling
Temporal workflow for multi-step calibration
Kubernetes Job for large benchmark/sweep
GPU worker scheduling
multi-tenant deployment boundary
```

---

## 16. Temporal / Kubernetes Job 升级触发条件

### 16.1 暂不上 Temporal 的理由

第一阶段任务链路较短：submit → worker → result。MySQL job table + polling worker 足够。

升级到 Temporal 的触发条件：

```txt
1. 单个业务流程超过 3 个以上长任务步骤。
2. 任务跨天运行。
3. 需要人工事件中断后恢复。
4. 需要补偿事务。
5. 参数校准 / benchmark 需要可靠恢复。
6. 任务失败恢复逻辑开始显著复杂化。
```

### 16.2 暂不上 Kubernetes Job 的理由

第一阶段常驻 worker 更简单。

升级到 Kubernetes Job 的触发条件：

```txt
1. batch/sweep 任务数量大。
2. 需要独立 GPU/CPU 资源调度。
3. 常驻 worker 资源浪费明显。
4. benchmark 需要高并行。
5. 每个任务需要隔离依赖或运行环境。
```

---

## 17. 旧技术栈退出计划

### 17.1 FastAPI 主入口退出条件

```txt
1. Go API 覆盖 compute job lifecycle。
2. material balance worker 化通过回归。
3. ASM/UDM 主要任务 worker 化。
4. 旧 FastAPI 只读对照运行不少于 30 天。
5. 前端不再调用旧 FastAPI 计算接口。
6. README 标记旧 backend 为 legacy。
```

### 17.2 Chakra UI 退出条件

```txt
1. 新页面全部使用 COSS-compatible components。
2. 关键旧页面迁移完成。
3. 无 Chakra Provider 依赖。
4. 删除 Chakra 依赖。
5. 视觉 smoke 通过。
```

### 17.3 旧任务模型退出条件

```txt
1. BackgroundTasks 不再承载长耗时仿真。
2. 所有长任务均进入 compute_jobs。
3. 旧 MaterialBalanceJob 只做迁移对照或废弃。
4. calculator 不再内部生成 job_id。
```

---

## 18. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 直接大规模迁移前端 | UI 混乱、周期失控 | P0B 只做新骨架与任务页 |
| COSS UI early development | breaking changes | copy-source、锁 commit、保留测试 |
| Worker 结果太大 | 数据库膨胀 | summary 入库，artifact 存储 |
| Agent 生成不安全约束 | 生产风险 | DSL 草案 + Go 校验 + 用户确认 |
| ProcessGraph schema 设计粗糙 | 后续难接 milp / Agent | P0C 强制合同化 |
| FastAPI 与 Go 长期并存 | 双后端维护负担 | 明确退出条件 |
| 模型无版本治理 | 结果不可复现 | model catalog + parameter hash |
| 缺观测性 | 任务问题难排查 | request_id / job_id / worker_id / metrics |

---

## 19. 不做事项

第一阶段明确不做：

```txt
1. 不一次性迁移所有旧页面。
2. 不一次性重写所有 ASM/UDM。
3. 不直接上 Temporal。
4. 不直接上 Kubernetes Job。
5. 不让 Agent 生成 Python 代码。
6. 不让 AutoWaterSimu 执行生产发布。
7. 不共享 NewSystem 数据库。
8. 不长期保留 Chakra + COSS 双体系。
9. 不把前端 CanvasGraph 直接当仿真输入。
10. 不把大时间序列全部塞入数据库。
```

---

## 20. 最终验收标准

当 AutoWaterSimu Next 达到最终形态时，应满足：

```txt
1. 前端为 React 19 + Vite + COSS-compatible UI。
2. Go API 为唯一生产 API 入口。
3. Python Worker 承载所有长耗时仿真。
4. Simulation Core 可独立单元测试。
5. ProcessGraph / SimulationInput 合同稳定。
6. 任务全生命周期可追踪。
7. 结果 summary / artifact / evidence 分层清晰。
8. 模型与参数可版本化。
9. 结果可进入 NewSystem 审批证据链。
10. Agent 可通过 DSL 草案安全调用仿真能力。
11. FastAPI 主计算入口已退出。
12. Chakra UI 已退出新增核心页面。
```

---

## 21. 建议的下一步行动

### 21.1 立即创建文档目录

```txt
docs/architecture/
docs/contracts/
docs/migration/
docs/worker/
```

### 21.2 立即创建合同草案

```txt
contracts/compute_job.v1.json
contracts/compute_result.v1.json
contracts/process_graph.v1.json
contracts/simulation_input.v1.json
contracts/model_run.v1.json
```

### 21.3 立即创建 Go compute skeleton

```txt
apps/api/internal/domain/compute
apps/api/internal/domain/processgraph
apps/api/internal/domain/modelcatalog
apps/api/internal/domain/artifacts
```

### 21.4 立即创建 worker skeleton

```txt
services/simulation-worker/
├─ worker.py
├─ runtime.py
├─ handlers/
│  └─ material_balance.py
├─ simulation_core/
└─ tests/
```

### 21.5 立即创建前端 skeleton

```txt
apps/web/
├─ src/app
├─ src/components/coss
├─ src/components/domain
├─ src/features/simulation-jobs
├─ src/features/process-graphs
└─ src/lib/api
```

---

## 22. 参考资料

1. COSS UI documentation: `https://coss.com/ui/docs`
2. COSS GitHub repository: `https://github.com/cosscom/coss`
3. Microsoft Azure Architecture Center - Asynchronous Request-Reply pattern: `https://learn.microsoft.com/en-us/azure/architecture/patterns/asynchronous-request-reply`
4. Microsoft Azure Architecture Center - CQRS pattern: `https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs`
5. Temporal documentation - What is Temporal: `https://docs.temporal.io/temporal`
6. Kubernetes documentation - Jobs: `https://kubernetes.io/docs/concepts/workloads/controllers/job/`
7. OpenAPI Specification: `https://spec.openapis.org/oas/latest.html`
8. OpenTelemetry documentation: `https://opentelemetry.io/docs/what-is-opentelemetry/`

---

## 23. 版本决策记录

### v1.2 决策

```txt
1. AutoWaterSimu Next 的最终定位是工艺数字孪生与仿真计算平台。
2. Go API 不只是替代 FastAPI，而是成为 compute orchestration 层。
3. Python Worker 不承载业务 API，只承载模型执行。
4. Simulation Core 必须纯计算化。
5. ProcessGraph / SimulationInput 是长期关键合同。
6. Agent 只能生成 DSL 草案，不能直接生成代码或跳过校验。
7. COSS UI 采用 copy-source / own-code 模式。
8. 第一阶段不上 Temporal / Kubernetes Job，但定义升级触发条件。
9. FastAPI 和 Chakra UI 必须有明确退出计划。
10. P0 拆分为 P0A 合同与 Go compute、P0B COSS 前端骨架、P0C 流程图合同化。
```

---

## 24. 最终总结

AutoWaterSimu 的重构目标不是“换技术栈”，而是建立一个长期可融合、可审计、可被 Agent 安全调用的仿真计算平台。

正确的执行方式是：

```txt
先定最终边界
再定长期合同
再做 compute 骨架
再迁 material balance
再迁流程图
再扩 ASM/UDM
再接 NewSystem / milp / Agent
```

只要坚持以下原则，重构就不会失控：

```txt
Studio owns interaction.
Go owns orchestration.
Worker owns execution.
Core owns computation.
Contracts own integration.
Evidence owns trust.
NewSystem owns approval.
Agent owns understanding and explanation.
```
