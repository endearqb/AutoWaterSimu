# AutoWaterSimu Next Development Plan v1.0

**版本**: v1.0
**日期**: 2026-05-25
**目标**: 以最小风险把当前 FastAPI + React Flow 仿真资产演进为 Web/Platform 与 Desktop 双线产品。

---

## 1. 执行原则

- 先合同，后实现。
- 先 worker 化 material balance，再迁 ASM/UDM。
- 先 Desktop MVP 与 Web Compute skeleton 并行验证，再迁移旧页面。
- 旧 FastAPI/Chakra 页面保留为 legacy baseline，不在 P0 大规模重写。
- 每个阶段必须有可运行验证，不以“代码写完”作为完成标准。
- 任何后端接口/schema 变化后都必须重新生成前端 client。
- 治理项分层处理: P0 只做会阻断实现或造成数据/安全事故的规则，P1/P2 写入 backlog。

### 1.1 P0 / P1 / P2 Decision Table

| 主题 | P0 交付 | P1/P2 backlog |
|---|---|---|
| 合同命名 | `schema_version` 统一 snake_case，schema tests 覆盖 | 合同大版本废弃策略 |
| API | idempotency、分页、错误码、timeout、retry 语义 | 多租户配额和复杂查询 |
| Worker | heartbeat lease、stale requeue、late-result rejection | Temporal / Kubernetes Job |
| 数值 | material balance tolerance 与双跑 baseline | ASM/UDM 全模型基准矩阵 |
| Artifact | 256KB 阈值、checksum、权限校验 | TTL、冷存储、归档 |
| Desktop | sidecar whitelist、support bundle、backup/restore smoke | signing、auto update、MSI/Store |
| Web | PostgreSQL metadata、OpenAPI client 分目录 | 企业 RBAC、多租户边界 |

---

## 2. Phase 0: Legacy Baseline Stabilization

目标: 先修复当前代码中会阻断后续迁移的 P0 问题，冻结旧接口行为作为对照基线。

### 2.1 任务

- 修复 ASM1 validate 返回字段:
  - `backend/app/api/routes/asm1.py`
  - 改为返回 `estimated_memory_mb` 和 `estimated_time_seconds`。
- 修复 UDM validate 返回字段:
  - `backend/app/api/routes/udm.py`
  - 改为返回 `estimated_memory_mb` 和 `estimated_time_seconds`。
- 清理 ASM1/ASM1Slim/ASM3 flowchart 创建接口 `print`:
  - 改为 `logging.getLogger(__name__)`。
  - 不打印完整 `flow_data`。
- 标记旧计算接口为 legacy:
  - 在相关路由 docstring 或 docs 中说明当前 `/calculate` 和 `/calculate-from-flowchart` 是 legacy baseline。
- 增加最小 API 回归测试:
  - validate response schema。
  - flowchart create 不输出敏感 payload。

### 2.2 验收

- `cd frontend; npx tsc --noEmit` 通过。
- `cd backend; .venv\Scripts\python -m pytest app/tests/time_segment_validation_test.py app/tests/material_balance_segment_overrides_test.py app/tests/hybrid_udm_validation_test.py app/tests/udm_engine_variable_binding_test.py -q` 通过。
- 新增 validate 路由测试通过。
- 不改变现有计算结果数值。

---

## 3. Phase 1: Contracts and Transform Layer

目标: 建立长期共享合同，切断“画布 JSON 直接计算”的耦合。

### 3.1 任务

- 新建合同目录:
  - `contracts/`
  - `contracts/examples/valid/`
  - `contracts/examples/invalid/`
  - `contracts/tests/`
- 创建 v1 schema:
  - `compute_job.v1.json`
  - `compute_result.v1.json`
  - `canvas_graph.v1.json`
  - `process_graph.v1.json`
  - `simulation_input.v1.json`
  - `artifact.v1.json`
  - `model_run.v1.json`
  - `contract_error.v1.json`
- 预留 P1/P2 schema 草案:
  - `simulation_request.v1.json`
  - `agent_scenario_draft.v1.json`
  - `evidence_package.v1.json`
- 创建最小示例:
  - material balance 3-node graph。
  - valid compute job。
  - valid contract error。
  - invalid missing component schema。
  - invalid edge references unknown node。
- 建立 canonical naming test:
  - schema file 去掉 `.json` 后必须等于 `schema_version`。
  - 禁止 `compute-job.v1`、`process-graph.v1` 等 kebab-case。
- 抽象转换规则:
  - `CanvasGraph -> ProcessGraph`
  - `ProcessGraph -> SimulationInput`
- 在前端或共享包中先实现最小 TypeScript transform prototype。
- 在后端补 Python transform validator，对照现有 `DataConversionService`。
- 定义 P0 错误码:
  - `VALIDATION_FAILED`
  - `IDEMPOTENCY_CONFLICT`
  - `WORKER_STALE`
  - `WORKER_CAPABILITY_MISMATCH`
  - `TIMEOUT`

### 3.2 验收

- schema valid / invalid tests 通过。
- canonical schema naming tests 通过。
- 最小 CanvasGraph 能转换为 ProcessGraph。
- ProcessGraph validation 能识别:
  - unknown node。
  - duplicate node id。
  - invalid edge reference。
  - missing component schema。
- SimulationInput 可被现有 `MaterialBalanceCalculator` 适配执行。
- `contract_error.v1` 可被 Web API、Desktop command、worker CLI 映射使用。

---

## 4. Phase 2: Simulation Core and Worker CLI

目标: 把当前 Python 计算资产从 FastAPI 进程内调用拆成可被 worker 调用的纯计算核心。

### 4.1 任务

- 新建或准备目标目录:
  - `simulation_core/`
  - `services/simulation-worker/`
- 从 `backend/app/material_balance/` 提取核心依赖:
  - Material Balance calculator。
  - ASM reactions。
  - UDM runtime payload。
  - time segment logic。
- 保持旧后端 import 兼容:
  - 初期允许 wrapper 从新 core re-export。
- 实现 worker CLI:
  - `--self-check`
  - `--run-job <path>`
  - `--stdio-jsonrpc`
- self-check 输出 worker version、git sha、platform、supported contract versions。
- 支持 job type:
  - `simulation.material_balance.v1`
- 输出:
  - `compute_result.v1`
  - artifact files
  - runtime audit
- stdout 只输出 JSON-RPC frames，stderr 只输出脱敏诊断日志。
- 固化 material balance 数值基准:
  - 单位转换。
  - `rtol=1e-6`。
  - `atol=1e-9`。
  - solver/runtime 参数记录。

### 4.2 验收

- `simulation-worker --self-check` 成功。
- `simulation-worker --run-job examples/material_balance_minimal.compute_job.json` 成功。
- 输出 summary 与旧 calculator baseline 一致。
- 大结果写 artifact，checksum 正确。
- invalid payload 返回 failed result，不崩溃。
- worker version mismatch 返回 capability/version 错误。
- stderr 不污染 stdout JSON-RPC。
- 旧 FastAPI 与新 worker 双跑在定义 tolerance 内。

---

## 5. Phase 3: Desktop MVP

目标: 交付 Windows 本地 material balance 桌面版闭环。

### 5.1 技术选择

- Tauri v2。
- React + Vite + TypeScript。
- Rust local orchestration。
- SQLite local store。
- Python worker sidecar。
- PyInstaller one-folder packaging。
- JSON-RPC stdin/stdout。
- NSIS setup exe 优先。

### 5.2 任务

- 初始化 Desktop app:
  - `apps/desktop/`。
  - `src-tauri/`
  - 复用现有 React Flow 编辑器的最小页面。
- Rust commands:
  - project create/open。
  - project export/import。
  - project backup/restore。
  - canvas graph save/load。
  - process graph validate。
  - compute job create/list/get/cancel。
  - worker self-check/restart。
  - artifact export。
  - support bundle create。
- SQLite migrations:
  - projects。
  - canvas_graphs。
  - process_graphs。
  - compute_jobs。
  - compute_job_events。
  - artifacts。
  - model_runs。
  - support_bundles。
- Worker sidecar:
  - `simulation-worker-x86_64-pc-windows-msvc.exe`
  - 配置 `externalBin`。
  - 参数白名单。
  - stdout/stderr 分离。
- UI:
  - local project shell。
  - process graph editor。
  - simulation jobs list。
  - job detail。
  - result summary。
  - artifact export。
  - support bundle export。
- 安全:
  - Tauri capabilities 只开放必要 shell/fs/dialog 权限。
  - React 不传任意 executable path。
  - import/export 路径禁止 `..` traversal。
  - P0 不做 auto update、code signing、Microsoft Store。

### 5.3 验收

- Windows dev 环境可启动 Tauri app。
- Desktop 无网络情况下可运行 material balance minimal job。
- 任务状态从 queued 到 running 到 succeeded 可见。
- 失败任务显示可读错误。
- result JSON / CSV 可导出。
- sidecar 崩溃后 Rust 能记录 failed event。
- support bundle 可生成且默认脱敏。
- backup/restore smoke 通过。
- path traversal 被拒绝。
- NSIS installer smoke 通过；签名明确为 P0 非目标。

---

## 6. Phase 4: Web Compute API P0A/P0B

目标: 建立平台版服务端任务编排骨架和新任务 UI。

### 6.1 Go Compute API

任务:

- 新建 Go API workspace:
  - `apps/api/`
  - `internal/domain/compute`
  - `internal/domain/artifacts`
  - `internal/domain/processgraph`
  - `internal/domain/modelcatalog`
- 数据表:
  - `compute_jobs`
  - `compute_job_events`
  - `artifacts`
  - `model_runs`
  - `workers`
- 数据库:
  - P0 使用 PostgreSQL metadata DB。
  - migrations 必须支持 up/down smoke。
  - 表预留 `tenant_id`、`project_id`、`created_by`，但 P0 不实现完整多租户。
- API:
  - create job。
  - get/list/cancel job。
  - get result。
  - worker register/claim/heartbeat/succeed/fail。
  - healthz/readyz/metrics。
  - idempotency duplicate/conflict。
  - cursor pagination。
  - 统一 `contract_error.v1`。
- OpenAPI:
  - 生成 TS client。
  - 文档覆盖 public API 与 worker API。
  - 生成目录固定为 `frontend/src/client/compute`，不覆盖旧 FastAPI client。
- Worker lifecycle:
  - claim 原子更新 lease。
  - heartbeat 刷新 lease 并返回 cancel_requested。
  - stale worker late succeed 被拒绝。
  - retry attempt 写 event。

验收:

- 可提交 `simulation.material_balance.v1` demo job。
- worker 可 claim 并写回 result。
- heartbeat 超时能标记 job。
- cancel_requested 能被 worker 看到。
- late succeed 被拒绝。
- 同一 idempotency key 重复提交返回同一 job。
- idempotency key 冲突返回 `IDEMPOTENCY_CONFLICT`。
- list jobs cursor pagination 稳定。
- DB migration rollback smoke 通过。
- service-token scope denial 测试通过。

### 6.2 Web UI P0B

任务:

- 新建 COSS-compatible app shell。
- 新建任务页面:
  - Simulation Jobs list。
  - Job Detail。
  - Result Summary。
  - Worker Health。
  - Artifact Download。
- 使用 Go OpenAPI generated client。
- 旧 Chakra 页面保持 legacy，不在本阶段迁移。
- COSS source manifest 记录来源 commit、license notice 和复制文件范围。

验收:

- 前端可提交 demo job。
- 可查看 job status 和 events。
- 可查看 summary 和 artifact refs。
- failed job 显示 error code/message。
- `cd frontend; npx tsc --noEmit` 通过。
- schema/codegen gate 失败时不得合并。

---

## 7. Phase 5: ProcessGraph Integration and Model Migration

目标: 从图到计算的合同化闭环，并迁移 ASM/UDM。

### 7.1 ProcessGraph Integration

任务:

- 将现有 `exportFlowData()` 输出升级为 `CanvasGraph`。
- 新增 `buildProcessGraph(canvasGraph)`。
- 新增 `buildSimulationInput(processGraph, jobType)`。
- 新增 legacy import adapter:
  - 旧 React Flow JSON -> `canvas_graph.v1`。
  - 旧 job/result JSON -> `compute_result.v1` 对照 fixture。
  - 旧 DB JSON 大结果 -> artifact migration candidate。
- 在 UI 中显示 validation issues。
- 结果 overlay 回写节点/边:
  - final volume。
  - selected concentration。
  - warnings。
  - edge flow。

验收:

- 用户画最小流程图后可生成 ProcessGraph。
- ProcessGraph validation 可读。
- SimulationInput 可提交 worker。
- 结果能 overlay 到图上。
- legacy flow fixture 可导入并生成等价 ProcessGraph。
- old-vs-worker numerical baseline 在模型 tolerance 内。

### 7.2 ASM / UDM Migration

迁移 job types:

- `simulation.asm1.v1`
- `simulation.asm1slim.v1`
- `simulation.asm3.v1`
- `simulation.udm.v1`

任务:

- 逐个 worker handler 迁移。
- 建 baseline fixtures。
- 对比旧 FastAPI 与 worker 结果。
- 加 model run records。
- UDM model snapshot 进入 SimulationInput。

验收:

- 每个模型至少有一个 valid compute job fixture。
- 新旧结果在允许误差内一致。
- UDM Hybrid 校验继续通过。
- Petersen 教程默认流程 runtime 测试继续通过。

---

## 8. Phase 6: Governance and Integrations

目标: 支持 NewSystem、milp、Agent 的安全集成。

### 8.1 Model Governance

任务:

- model catalog。
- model versions。
- parameter templates。
- parameter sets。
- persisted model catalog snapshot history listing。
- read-only Web model governance page for current catalog and persisted snapshot history。
- benchmark cases。
- model run records。
- production allowed status:
  - only `approved` parameter sets can be used for production/evidence scenarios。
  - `archived` / `deprecated` model versions are read-only。
- evidence package:
  - `evidence_package.v1`
  - job timeline。
  - artifact refs。
  - runtime audit。

验收:

- 每次 job 有 model_run。
- 能按 model_key/model_version 查询历史。
- 参数集有状态:
  - draft。
  - candidate。
  - validated。
  - approved。
  - retired。
- evidence package 可导出并校验 checksum。

### 8.2 NewSystem / milp

任务:

- service token auth。
- service token scope:
  - `job:create`
  - `job:read`
  - `artifact:read`
  - `evidence:read`
- token rotate/revoke。
- external reference fields:
  - `site_id`
  - `scenario_id`
  - `plan_id`
  - `source_system`
- simulation check API。
- evidence package export。

验收:

- milp plan 可创建 simulation check job。
- 结果含 risk findings。
- NewSystem 可引用 evidence refs。
- AutoWaterSimu 不发布生产指令。
- revoked token 后续请求被拒绝。

### 8.3 Agent DSL

任务:

- `agent_scenario_draft.v1`
- `simulation_request.v1`
- `constraint_draft.v1`
- draft validation API。
- user confirmation gate。
- result explanation refs。

验收:

- Agent 输出 DSL 草案，不输出 Python。
- DSL 必须校验。
- 未确认草案不能创建生产相关任务。
- 解释必须引用 evidence_refs。

### 8.4 Lifecycle and Operations

任务:

- artifact retention policy and admin dry-run-first sweep。
- job event retention / archive policy（见 `docs/operations/compute_api_job_event_retention_runbook.md`）, including opt-in `local_fs_archive` for archive candidates。
- support bundle format。
- OpenTelemetry adoption trigger（见 `docs/operations/compute_api_tenancy_observability_runbook.md`）。
- multi-tenant deployment boundary document（见 `docs/operations/compute_api_tenancy_observability_runbook.md`）。
- archived artifact count in `/metrics` and monitoring dashboard examples。
- monitoring receiver/on-call/secret policy（见 `docs/operations/monitoring/receiver_policy_runbook.md`）。

验收:

- P0 明确不做完整多租户，但所有 API / 表保留 tenant/project 边界字段。
- artifact 删除前检查 evidence/model_run 引用。
- support bundle 默认脱敏。
- OpenTelemetry 触发条件写入运维文档。

---

## 9. Verification Matrix

| 阶段 | 必跑验证 |
|---|---|
| Phase 0 | frontend type check, backend core pytest, validate route tests |
| Phase 1 | schema valid/invalid tests, canonical naming tests, transform tests, contract error tests |
| Phase 2 | worker self-check, minimal job, artifact checksum, version mismatch, stdout/stderr separation |
| Phase 3 | Tauri dev run, SQLite migration tests, sidecar smoke, desktop job lifecycle, support bundle, backup/restore, path sandbox |
| Phase 4 | Go API lifecycle tests, worker lifecycle tests, idempotency tests, pagination tests, OpenAPI client generation, frontend type check |
| Phase 5 | ProcessGraph validation tests, legacy import fixture, old-vs-worker numerical baseline, Playwright flow smoke |
| Phase 6 | service-token scope/revoke tests, DSL validation tests, evidence package tests, retention tests |

---

## 10. Recommended Work Order

1. Fix Phase 0 correctness issues.
2. Add contracts and schema tests before any new runtime work.
3. Create material balance minimal fixture as shared baseline.
4. Add contract error, idempotency, and numerical tolerance decisions.
5. Build worker CLI and run it outside FastAPI.
6. Build Desktop MVP around worker CLI.
7. Build Go Compute API skeleton with the same job contract.
8. Add new Web task UI against Go API.
9. Contractualize process graph conversion.
10. Migrate ASM/UDM one model at a time.
11. Add governance and integrations.

---

## 11. Deliverable Checklist

Status note (2026-05-31): checked implementation items are completed and verified in the active branch. Human approval, live deployment, final merge, and 30-day read-only comparison remain external governance steps.

### Documentation

- [ ] PRD approved.
- [ ] Technical Spec approved.
- [ ] Development Plan approved.
- [x] Contract README added.
- [x] Worker README added.
- [x] Desktop packaging README added.
- [x] COSS source manifest added.
- [x] Legacy migration guide added.
- [x] Operations/support bundle guide added.

### Code

- [x] Phase 0 bug fixes merged.
- [x] Contract schemas merged.
- [x] Contract error and canonical naming tests merged.
- [x] Worker CLI merged.
- [x] Desktop MVP merged.
- [x] Go Compute API skeleton merged.
- [x] Web jobs UI merged.
- [x] ProcessGraph integration merged.
- [x] ASM/UDM worker migration merged.

### Release

- [x] Desktop installer smoke passed.
- [x] Worker packaging smoke passed.
- [x] DB migration rollback smoke passed.
- [x] Schema/codegen gate passed.
- [x] Workflow artifact download verification scripted.
- [ ] Web deploy smoke passed.
- [ ] Legacy FastAPI compute marked read-only.
- [x] Migration guide published.
- [x] Evidence export documented.
- [x] Installer signing and auto update explicitly marked post-P0.
