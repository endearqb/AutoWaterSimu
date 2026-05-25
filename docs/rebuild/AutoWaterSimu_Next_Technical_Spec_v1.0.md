# AutoWaterSimu Next Technical Spec v1.0

**版本**: v1.0
**日期**: 2026-05-25
**范围**: 双线架构、共享合同、worker、storage、API、Desktop 本地编排

---

## 1. 总体架构

AutoWaterSimu Next 采用共享合同、共享 simulation core、双编排实现的架构。

```txt
Shared
├─ contracts/
├─ simulation_core/
└─ process_graph transforms

Web / Platform
├─ React + COSS-compatible UI
├─ Go Compute API
├─ Python Simulation Worker
├─ metadata DB
└─ object storage

Desktop
├─ Tauri v2 + Rust
├─ React + COSS-compatible UI
├─ Python Simulation Worker sidecar
├─ SQLite
└─ local artifacts
```

核心边界:

- React owns interaction.
- Go owns platform orchestration.
- Rust owns local desktop orchestration.
- Python worker owns execution.
- Simulation core owns computation.
- Contracts own integration.
- Evidence owns trust.

---

## 2. 当前代码映射

### 2.1 现有可复用模块

- `backend/app/material_balance/core.py`: Material Balance / ASM / UDM ODE 计算核心的当前实现。
- `backend/app/services/data_conversion_service.py`: 现有 React Flow JSON 到 `MaterialBalanceInput` 的转换逻辑。
- `backend/app/services/hybrid_udm_validation.py`: Hybrid UDM 运行时校验。
- `frontend/src/components/Flow`: 现有流程图编辑、节点、边、inspector、结果展示。
- `frontend/src/stores/*FlowStore.ts`: 现有画布状态和导入导出逻辑。
- `frontend/src/services/*Service.ts`: 现有 FastAPI client 封装。

### 2.2 需拆分或替换的模块

- `backend/app/api/routes/*calculate*`: 由同步 API + BackgroundTasks 改为 compute job API。
- `backend/app/models.py` 中多张 `*Job` 表: 迁移为统一 `compute_jobs` / `compute_job_events` / `artifacts` / `model_runs`。
- `frontend/src/stores/flowStore.ts` 导出的画布 JSON: 拆成 CanvasGraph 和 ProcessGraph。
- `result_data` 主表 JSON: 拆成 summary 入库 + artifact refs。

---

## 3. 合同体系

合同目录:

```txt
contracts/
├─ compute_job.v1.json
├─ compute_result.v1.json
├─ canvas_graph.v1.json
├─ process_graph.v1.json
├─ simulation_input.v1.json
├─ model_run.v1.json
├─ artifact.v1.json
├─ model_catalog.v1.json
├─ simulation_request.v1.json
├─ agent_scenario_draft.v1.json
├─ evidence_package.v1.json
├─ contract_error.v1.json
├─ units.v1.json
└─ water_quality_components.v1.json
```

Canonical naming:

| Schema file | `schema_version` | P0/P1/P2 |
|---|---|---|
| `canvas_graph.v1.json` | `canvas_graph.v1` | P0 |
| `process_graph.v1.json` | `process_graph.v1` | P0 |
| `simulation_input.v1.json` | `simulation_input.v1` | P0 |
| `compute_job.v1.json` | `compute_job.v1` | P0 |
| `compute_result.v1.json` | `compute_result.v1` | P0 |
| `artifact.v1.json` | `artifact.v1` | P0 |
| `model_run.v1.json` | `model_run.v1` | P1 |
| `simulation_request.v1.json` | `simulation_request.v1` | P1/P2 |
| `agent_scenario_draft.v1.json` | `agent_scenario_draft.v1` | P2 |
| `evidence_package.v1.json` | `evidence_package.v1` | P2 |
| `contract_error.v1.json` | `contract_error.v1` | P0 |

`schema_version` 必须与 schema 文件名去掉 `.json` 后完全一致。禁止在合同值中混用 `compute-job.v1`、`process-graph.v1` 等 kebab-case 名称。

所有合同必须包含:

- `schema_version`
- `created_at` 或上下文时间戳字段
- 对核心 enum 的封闭定义
- `metadata` 扩展字段，但扩展字段不得替代核心字段
- schema tests
- valid / invalid fixtures
- 统一错误返回: `contract_error.v1`

### 3.1 CanvasGraph v1

用途: 前端画布状态，不作为计算输入。

核心字段:

```json
{
  "schema_version": "canvas_graph.v1",
  "graph_id": "graph_xxx",
  "name": "Untitled",
  "nodes": [],
  "edges": [],
  "viewport": {},
  "ui_state": {},
  "exported_at": "2026-05-25T00:00:00Z"
}
```

允许包含:

- React Flow node position。
- handle id、edge shape、selection、layout metadata。
- panel state、theme state、viewport。

禁止作为 worker 输入直接执行。

### 3.2 ProcessGraph v1

用途: 领域拓扑、模型绑定和单位语义。

核心字段:

```json
{
  "schema_version": "process_graph.v1",
  "process_graph_id": "pg_xxx",
  "version": 1,
  "source_canvas_graph_id": "graph_xxx",
  "component_schema": {
    "component_schema_id": "asm1_components.v1",
    "components": ["S_I", "S_S"],
    "unit": "mg/L"
  },
  "nodes": [],
  "edges": [],
  "validation": {
    "status": "valid",
    "errors": [],
    "warnings": []
  }
}
```

节点必须表达:

- `node_id`
- `node_type`
- `process_unit_type`
- `ports`
- `volume`
- `initial_conditions`
- `model_binding`
- `parameter_binding`
- `unit_metadata`

边必须表达:

- `edge_id`
- `source_node_id`
- `target_node_id`
- `source_port`
- `target_port`
- `flow_rate`
- `concentration_transform`
- `time_segment_overrides`

### 3.3 SimulationInput v1

用途: worker 可执行输入。

核心字段:

```json
{
  "schema_version": "simulation_input.v1",
  "simulation_input_id": "si_xxx",
  "process_graph_id": "pg_xxx",
  "process_graph_version": 1,
  "job_type": "simulation.material_balance.v1",
  "component_schema": {},
  "nodes": [],
  "edges": [],
  "parameters": {
    "hours": 4.0,
    "steps_per_hour": 60,
    "solver_method": "scipy_solver",
    "tolerance": 0.000001
  },
  "runtime_options": {}
}
```

SimulationInput 必须是:

- 单位归一化后的。
- 参数展开后的。
- 模型绑定快照化后的。
- 不含 UI layout。

### 3.4 ComputeJob v1

用途: Web Go API、Desktop Rust、Python worker 之间的统一任务合同。

核心字段:

```json
{
  "schema_version": "compute_job.v1",
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
    "required_capabilities": ["material_balance", "ode"]
  }
}
```

`payload` 对 `simulation.material_balance.v1` 必须是 `simulation_input.v1`。

### 3.5 ComputeResult v1

用途: worker 返回结果。

核心字段:

```json
{
  "schema_version": "compute_result.v1",
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

规则:

- `summary` 可入库。
- `data` 小于 256KB 时可内联。
- 大于 256KB 时必须写 artifact，`data` 只保留必要摘要或空对象。

### 3.6 Artifact v1

核心字段:

```json
{
  "schema_version": "artifact.v1",
  "artifact_id": "art_xxx",
  "job_id": "job_xxx",
  "artifact_type": "time_series_json",
  "storage_provider": "local_fs",
  "object_key": "jobs/job_xxx/result.json",
  "content_type": "application/json",
  "size_bytes": 1024,
  "checksum": "sha256:...",
  "created_at": "2026-05-25T00:00:00Z"
}
```

Desktop storage provider:

- `local_fs`

Web storage provider:

- `s3`
- `minio`
- `local_fs_dev`

### 3.7 ModelRun v1

核心字段:

```json
{
  "schema_version": "model_run.v1",
  "model_run_id": "mr_xxx",
  "job_id": "job_xxx",
  "model_key": "material_balance",
  "model_version": "v1",
  "parameter_hash": "sha256:...",
  "input_hash": "sha256:...",
  "quality_metrics": {},
  "warnings": [],
  "evidence_refs": []
}
```

### 3.8 ContractError v1

所有 Web API、Desktop command 和 worker protocol 的错误必须能映射到统一错误结构:

```json
{
  "schema_version": "contract_error.v1",
  "error_code": "JOB_NOT_FOUND",
  "message": "Job not found",
  "details": {},
  "retryable": false,
  "trace_id": "trace_xxx"
}
```

P0 错误码:

- `VALIDATION_FAILED`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `JOB_NOT_FOUND`
- `JOB_ALREADY_TERMINAL`
- `IDEMPOTENCY_CONFLICT`
- `WORKER_STALE`
- `WORKER_CAPABILITY_MISMATCH`
- `ARTIFACT_NOT_FOUND`
- `TIMEOUT`
- `INTERNAL_ERROR`

### 3.9 P1/P2 预留合同

`simulation_request.v1` 是外部系统进入仿真链路的请求合同。它可以引用 `process_graph.v1`、`simulation_input.v1` 或已登记的 `model_run.v1`，但不能携带 Python 代码。

`agent_scenario_draft.v1` 是 Agent 生成的草案合同。它必须经过 API 校验和用户确认后，才能转换为 `simulation_request.v1` 或 `compute_job.v1`。

`evidence_package.v1` 是审计与审批证据包，至少包含:

- `job_id`
- `input_hash`
- `result_hash`
- `process_graph_ref`
- `simulation_input_ref`
- `model_run_refs`
- `artifact_refs`
- `runtime_audit`
- `warnings`
- `generated_at`

---

## 4. 状态机

统一 job 状态:

```txt
created
queued
running
succeeded
failed
cancelled
timed_out
```

状态规则:

- `created -> queued`: job 已持久化并进入队列。
- `queued -> running`: worker claim 成功。
- `running -> succeeded`: worker succeed 且 job 未被取消/超时/失败。
- `running -> failed`: worker fail 或运行异常。
- `queued|running -> cancelled`: 用户取消或系统取消。
- `running -> timed_out`: 编排层判定超时。

Late result 防护:

- 如果 job 已是 `cancelled`、`timed_out`、`failed`，worker 后续 `succeed` 不得覆盖终态。
- 终态转换必须写 event。
- worker heartbeat 必须能读取 `cancel_requested`。

Worker 可靠性规则:

- worker claim 必须原子更新 `job.status=running`、`worker_id`、`claimed_at`、`lease_expires_at`。
- worker heartbeat 必须刷新 `lease_expires_at`，并返回 `cancel_requested`、`job_terminal`、`server_time`。
- heartbeat 超过 `worker_lease_timeout_sec` 后，编排层将 job 标记为 `queued` 或 `timed_out`，选择取决于 `retry_policy.max_attempts`。
- stale worker 后续 `succeed/fail/artifact` 必须被拒绝并写 `late_result_rejected` event。
- 每次 retry 必须递增 `attempt`，并保留上一次失败的 `worker_id`、`error_code`、`finished_at`。
- `succeed` 必须校验 `job_id`、`worker_id`、`attempt`、`lease_expires_at` 和当前状态。
- `cancel_requested=true` 后，worker 可以返回 `cancelled` acknowledgement；如果 worker 失联，编排层仍可在 lease timeout 后终止 job。

P0 默认值:

| 字段 | 默认值 |
|---|---|
| `worker_lease_timeout_sec` | 90 |
| `heartbeat_interval_sec` | 15 |
| `retry_policy.max_attempts` | 1 |
| `job_default_timeout_sec` | 600 |
| `artifact_inline_threshold_bytes` | 262144 |

---

## 5. Web / Platform API

Go Compute API 提供 OpenAPI。

### 5.1 Public API

```txt
POST   /api/v1/compute/jobs
GET    /api/v1/compute/jobs
GET    /api/v1/compute/jobs/{job_id}
POST   /api/v1/compute/jobs/{job_id}/cancel
GET    /api/v1/compute/jobs/{job_id}/result
GET    /api/v1/compute/jobs/{job_id}/events
GET    /api/v1/artifacts/{artifact_id}
GET    /api/v1/model-runs/{model_run_id}
GET    /healthz
GET    /readyz
GET    /metrics
```

`POST /compute/jobs`:

- 输入: `compute_job_create_request.v1`
- 输出: `202 Accepted`
- 返回: `{ job_id, status_url }`
- 必须接受 `Idempotency-Key` header 或 body `idempotency_key`。
- 同一 requester、source_system、idempotency_key、payload_hash 重复提交时返回同一 job。
- 同一 requester、source_system、idempotency_key 但 payload_hash 不同，返回 `409 IDEMPOTENCY_CONFLICT`。

List API:

- `GET /compute/jobs` 必须支持 `limit`、`cursor`、`status`、`job_type`、`created_after`、`created_before`。
- 默认 `limit=50`，最大 `limit=200`。
- 默认排序为 `created_at desc, job_id desc`。
- 响应包含 `items`、`next_cursor`、`total_estimate`。

Timeout / retry:

- API request timeout 与 job execution timeout 分开。
- 创建 job 只保证持久化和排队，不同步等待计算完成。
- 可重试错误必须返回 `retryable=true` 和 `retry_after_ms`。
- 非可重试合同错误必须返回 `contract_error.v1`。

OpenAPI client:

- Go Compute API 生成的 TypeScript client 必须与现有 FastAPI client 分目录存放。
- P0 推荐目录: `frontend/src/client/compute`。
- 旧 FastAPI generated client 继续作为 legacy client，直到旧计算入口退出。

### 5.2 Worker API

```txt
POST /api/v1/workers/register
POST /api/v1/workers/{worker_id}/claim
POST /api/v1/workers/{worker_id}/heartbeat
POST /api/v1/workers/{worker_id}/jobs/{job_id}/succeed
POST /api/v1/workers/{worker_id}/jobs/{job_id}/fail
POST /api/v1/workers/{worker_id}/jobs/{job_id}/artifact
```

认证:

```txt
Authorization: Bearer <worker_token>
```

兼容:

```txt
X-Worker-Token: <worker_token>
```

Worker token 必须存 hash，不存明文。

Worker API 行为:

- `register` 返回 `worker_id`、`server_time`、`heartbeat_interval_sec`、`supported_contract_versions`。
- `claim` 只返回 worker capability 匹配、未取消、未超时、未被其他 worker lease 的 job。
- `heartbeat` 返回当前 job 是否被取消以及 lease 是否仍有效。
- `artifact` 上传必须先写 artifact metadata，再由 `succeed` 引用 artifact refs。
- `succeed` 必须在事务内写 summary、artifact refs、model runs、result hash 和 terminal event。
- `fail` 必须写 `error_code`、`error_message`、`retryable`、`attempt`。
- worker runtime 与 `compute_job.v1.execution.required_capabilities` 不匹配时，返回 `WORKER_CAPABILITY_MISMATCH`。

---

## 6. Desktop Rust API

React 通过 Tauri command 调用 Rust，React 不直接操作 worker 进程和 SQLite。

### 6.1 Commands

```txt
project_create
project_open
project_list_recent
project_export
project_import
project_backup
project_restore
canvas_graph_save
canvas_graph_load
process_graph_validate
simulation_input_build
compute_job_create
compute_job_get
compute_job_cancel
compute_job_list
compute_result_get
artifact_open
artifact_export
support_bundle_create
worker_self_check
worker_restart
```

### 6.2 Events

```txt
job:created
job:queued
job:running
job:progress
job:succeeded
job:failed
job:cancelled
worker:started
worker:stopped
worker:stderr
worker:crashed
support_bundle:created
```

### 6.3 SQLite Tables

```txt
projects
canvas_graphs
process_graphs
compute_jobs
compute_job_events
artifacts
model_runs
support_bundles
settings
recent_files
```

Rust owns all writes to SQLite. 前端不得通过 SQL 插件直接改变 job 状态。

Desktop 数据和日志:

- App data 默认位于系统 AppData 下的应用私有目录。
- 项目目录和导出目录必须由用户选择或来自 recent project allowlist。
- support bundle 包含脱敏后的 job events、worker stderr tail、app logs、contract versions、SQLite migration version。
- support bundle 默认不包含 artifact 大文件，只包含 artifact metadata 和 checksum；用户显式选择时才打包 artifact。
- backup/restore 必须先关闭当前 worker，避免 SQLite 与 artifact 文件不一致。

---

## 7. Python Worker

### 7.1 Shared CLI

Worker CLI:

```txt
simulation-worker --self-check
simulation-worker --run-job path/to/compute_job.json
simulation-worker --stdio-jsonrpc
```

自检必须验证:

- Python runtime。
- numpy/scipy/torch/torchdiffeq import。
- material balance minimal example。
- writable temp/artifact directory。
- supported contract versions。
- worker build metadata: version、git sha、platform、packaging mode。

### 7.2 Desktop JSON-RPC

stdin request:

```json
{
  "jsonrpc": "2.0",
  "id": "rpc_1",
  "method": "run_job",
  "params": {
    "job": {}
  }
}
```

stdout response:

```json
{
  "jsonrpc": "2.0",
  "id": "rpc_1",
  "result": {
    "compute_result": {}
  }
}
```

progress event:

```json
{
  "jsonrpc": "2.0",
  "method": "job_progress",
  "params": {
    "job_id": "job_xxx",
    "progress": 0.5,
    "message": "running solver"
  }
}
```

stderr:

- stderr 只输出结构化日志或可诊断文本，不得输出完整输入水质、完整流程图或 token。
- Rust 必须按 job_id / worker_id 关联 stderr tail，供 support bundle 使用。
- stdout 只承载 JSON-RPC frames，避免日志污染协议。

### 7.3 Web Worker Mode

Web worker 通过 Go Worker API 轮询或长轮询:

```txt
register -> claim -> heartbeat -> execute -> upload artifacts -> succeed/fail
```

第一阶段使用 polling，不引入 Temporal。

Worker compatibility:

- worker 启动时声明 `supported_contract_versions` 和 `capabilities`。
- Go API / Rust 编排层不得把高版本合同派发给不支持该版本的 worker。
- worker 遇到未知 `schema_version` 必须返回 `VALIDATION_FAILED` 或 `WORKER_CAPABILITY_MISMATCH`，不得尝试 best-effort 执行。
- 每个 compute result 必须写入 `runtime_audit.worker_version`、`runtime_audit.python_version`、`runtime_audit.package_versions`。

---

## 8. Storage

### 8.1 Summary 入库

入库字段:

- job id/status/timestamps。
- summary。
- input_hash/result_hash。
- artifact refs。
- model run metadata。
- error code/message。

### 8.2 Artifact 阈值

规则:

- serialized result <= 256KB: 允许内联进入 `compute_results.data`。
- serialized result > 256KB: 必须写 artifact。
- 时间序列默认写 artifact。
- 列表页不得读取大 artifact。

### 8.3 Hash

Hash 使用:

- canonical JSON。
- SHA-256。
- 字段格式: `sha256:<hex>`。

### 8.4 Retention and Export

P0 lifecycle:

- job metadata、summary、events 默认永久保留，直到用户删除项目或管理员清理。
- artifact 默认保留，删除前必须确认没有 evidence package 或 model run 引用。
- Desktop project export 必须包含 project metadata、canvas graphs、process graphs、compute jobs、events、artifact metadata 和选中的 artifact files。
- Desktop backup/restore 必须校验 SQLite migration version、artifact checksum 和 contract versions。
- Web object storage lifecycle 第一阶段不自动删除 artifact，只记录 `retention_policy` 和 `retain_until` 字段。

P1/P2 lifecycle:

- 支持 artifact TTL、归档、冷存储和引用计数。
- 支持按 project / tenant / model_run 导出 evidence package。
- 支持 job events 压缩归档，但不得破坏 audit chain。

---

## 9. ProcessGraph 转换

转换链路:

```txt
CanvasGraph
-> ProcessGraph
-> SimulationInput
-> ComputeJob.payload
-> SimulationCore
-> ComputeResult
```

### 9.1 CanvasGraph -> ProcessGraph

必须做:

- 清除 UI-only 字段。
- 解析 node type、ports、edge direction。
- 解析 flow rate 和 concentration transform。
- 解析 customParameters 为 component_schema。
- 解析 ASM/UDM model binding。
- 校验未知节点、重复边、孤立模型节点。

### 9.2 ProcessGraph -> SimulationInput

必须做:

- 单位归一化。
- 参数默认值展开。
- time segments 规范化。
- UDM model snapshot 固化。
- component vector 顺序显式化。
- solver settings 固化。

---

## 10. Numerical Reproducibility

每个 job type 必须定义数值可复现策略。

P0 material balance 默认:

- `flow_rate` 单位统一为 `m3/h`。
- concentration 单位统一为 `mg/L`。
- 时间单位统一为 `h`。
- 默认浮点为 IEEE-754 double。
- 默认相对容差 `rtol=1e-6`，绝对容差 `atol=1e-9`。
- legacy FastAPI 双跑比较使用模型级 tolerance，不做逐字节结果比较。

Runtime audit 必须记录:

- solver method。
- tolerance。
- steps/time grid。
- package versions。
- worker version。
- input hash。
- parameter hash。

如果模型使用随机性，必须记录 seed；P0 material balance 不允许隐式随机性。

---

## 11. Observability

### 11.1 Structured logs

HTTP:

```txt
request_id
trace_id
actor_id
method
route
status
duration_ms
```

Job:

```txt
job_id
job_type
queue
status
worker_id
duration_ms
input_hash
result_hash
```

Worker:

```txt
worker_id
capabilities
current_job_id
runtime_version
heartbeat_at
```

### 11.2 Metrics

P0 metrics:

- job_created_total
- job_succeeded_total
- job_failed_total
- job_cancelled_total
- job_duration_seconds
- worker_heartbeat_age_seconds
- artifact_bytes_total

后续接 OpenTelemetry。

OpenTelemetry 接入触发条件:

- 需要跨 Go API、worker、object storage 排查链路时。
- job 失败率或超时率需要生产级 SLO 追踪时。
- NewSystem/milp/Agent 集成进入生产验证时。

---

## 12. Security

### 12.1 Web

- Worker token hash 存储。
- allowed queues / job types。
- service token 用于 NewSystem/milp/Agent。
- 用户上下文必须进入 `context.requested_by`。
- Artifact 下载必须校验权限。
- service token 必须带 scope: `job:create`、`job:read`、`artifact:read`、`evidence:read`。
- token rotate/revoke 后，新请求必须失败；已运行 job 不因 token revoke 被直接杀死，但后续 artifact/download 受权限控制。
- P0 不实现完整 RBAC 和多租户计费，但所有表预留 `tenant_id` / `project_id` / `created_by`。
- 日志不得输出 token、完整 payload、完整 artifact 内容或敏感水质数据。

### 12.2 Desktop

- React 不直接执行 shell。
- Rust command 白名单。
- Sidecar 参数白名单。
- 默认只访问 AppData、用户选择的项目目录和导出目录。
- 本地 artifact 路径不得接受未规范化的相对路径。
- Tauri capabilities 只开放必须的 shell/fs/dialog 权限。
- sidecar 只能通过 Rust 启动，禁止前端传任意 executable path。
- export/import 必须校验路径规范化，禁止 `..` path traversal。
- support bundle 必须默认脱敏。

---

## 13. Testing Spec

### 13.1 Contract Tests

必须覆盖:

- valid / invalid `compute_job.v1`
- valid / invalid `compute_result.v1`
- valid / invalid `canvas_graph.v1`
- valid / invalid `process_graph.v1`
- valid / invalid `simulation_input.v1`
- valid / invalid `contract_error.v1`
- canonical schema naming consistency

### 13.2 Worker Tests

- `--self-check`
- minimal material balance job
- invalid payload fail
- timeout fail
- cancelled job acknowledgement
- artifact written and checksum verified
- worker version mismatch rejected
- stale worker late succeed rejected
- stderr does not corrupt stdout JSON-RPC

### 13.3 Desktop Tests

- SQLite migrations。
- Rust command unit tests。
- sidecar spawn smoke。
- job lifecycle integration。
- NSIS installer smoke。
- support bundle smoke。
- backup/restore smoke。
- path traversal rejection。

### 13.4 Web Tests

- Go API job lifecycle。
- worker claim / heartbeat / succeed / fail。
- late result rejected。
- artifact threshold。
- OpenAPI client generation。
- frontend `npx tsc --noEmit`。
- idempotency duplicate and conflict cases。
- pagination cursor stability。
- service-token scope denial。
- DB migration rollback smoke。

### 13.5 Regression Tests

现有测试必须继续通过:

- `backend/app/tests/time_segment_validation_test.py`
- `backend/app/tests/material_balance_segment_overrides_test.py`
- `backend/app/tests/hybrid_udm_validation_test.py`
- `backend/app/tests/udm_engine_variable_binding_test.py`
- UDM tutorial runtime and validation tests。

---

## 14. External Technical Notes

Desktop 技术依据:

- Tauri sidecar external binary 使用 target triple 命名，参考 Tauri v2 sidecar 文档: https://v2.tauri.app/fr/develop/sidecar/
- Windows 开发需要 Microsoft C++ Build Tools 与 WebView2，参考 Tauri prerequisites: https://v2.tauri.app/start/prerequisites/
- Windows installer 支持 NSIS setup exe 与 MSI，参考 Tauri Windows installer: https://v2.tauri.app/distribute/windows-installer/
- SQLite 可通过 Tauri SQL 插件或 Rust sqlx/rusqlite 管理，参考 Tauri SQL: https://v2.tauri.app/plugin/sql/
- Python worker 打包优先 PyInstaller one-folder，参考 PyInstaller usage: https://www.pyinstaller.org/en/stable/usage.html

---

## 15. Release Governance

P0 merge gates:

- JSON Schema tests pass.
- generated TypeScript clients are up to date.
- Go API lifecycle tests pass.
- Python worker `--self-check` and minimal job pass.
- existing backend regression tests pass.
- frontend `npx tsc --noEmit` passes.

P0 release gates:

- Desktop sidecar smoke passes on Windows.
- NSIS installer smoke passes.
- DB migration up/down smoke passes.
- artifact checksum verification passes.
- late result, cancel, timeout tests pass.

Explicit P0 non-goals:

- installer code signing.
- auto updater.
- Microsoft Store distribution.
- full multi-tenant billing / quota / rate-limit system.
