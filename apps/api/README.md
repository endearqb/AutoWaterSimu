# 目录说明：apps/api

## 1. 目录职责

本目录负责 Go Compute API。

本目录负责：

- compute job lifecycle。
- worker register / claim / heartbeat / succeed / fail。
- artifact metadata, including retention policy fields。
- model catalog snapshot registration/read/list query, default parameter set status transition, and model run persistence/list/search/read query。
- benchmark case metadata for model governance smoke。
- benchmark run execution history metadata。
- process graph registry and ProcessGraph-to-SimulationInput resolution for simulation checks。
- simulation input registry for reference-based simulation checks。
- evidence package export。
- simulation check job creation from `simulation_request.v1`。
- risk findings in result summary for NewSystem/milp read integration。
- evidence reference dereference for approval/read integrations。
- evidence governance summary for model/parameter production-readiness review。
- contract / Agent draft / constraint draft / draft confirmation / result explanation validation for existing schema files。
- persistent draft confirmation audit records, while still preventing confirm-draft from creating jobs or production actions。
- read-only advisory constraint application plans for approved constraint draft confirmations。
- evidence-backed result explanation submit/review/publish audit records。
- explicit approved Agent draft promotion to simulation-check jobs when the embedded proposed request is already schema-valid。
- admin-scoped artifact retention sweep API for manual dry-run/delete operations。
- optional disabled-by-default artifact retention scheduler。
- opt-in local filesystem archive backend for expired unreferenced `archive_candidate` artifacts。
- Prometheus metrics for API up, job status counts, registered workers, artifact metadata count, archived artifact metadata count, and retention candidate count。
- OpenAPI for platform and generated client。

本目录不负责：

- ODE / torch / numpy / scipy 计算。
- Desktop local orchestration。
- legacy FastAPI route。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `README.md` | 本目录上下文契约 |
| `cmd/compute-api/` | Go Compute API 入口 |
| `internal/compute/` | job lifecycle、worker lifecycle、auth、store、artifact、HTTP handlers |
| `migrations/` | PostgreSQL metadata SQL migrations |
| `openapi/compute.openapi.json` | Go Compute API OpenAPI source |

Phase 4A 使用单个 `internal/compute` package 收敛 skeleton，后续领域稳定后再拆分 `internal/domain/*`。

## 3. 维护约定

1. P0 metadata DB 使用 PostgreSQL。
2. list API 必须支持稳定 cursor pagination。
3. create job 必须支持 idempotency。
4. OpenAPI client 生成到 `frontend/src/client/compute`。
5. P0 auth 使用静态 Bearer token + scope，并支持配置级 `revoked` token 拒绝；不实现完整 RBAC 或动态 token 管理 API。Result explanation review/publish 使用 `explanation:write`，避免复用 job 创建权限表达解释发布。
6. Go API 不执行 Python 科学计算，只编排 worker lifecycle。
7. `COMPUTE_API_DATABASE_URL` 未配置时，`cmd/compute-api` 只为本地开发使用非持久 in-memory metadata store；正式 Web/Platform 路径必须配置 PostgreSQL。
8. HTTP routes 允许本地开发 loopback 来源（`localhost`、`127.0.0.1`、`::1`）跨端口 CORS/OPTIONS，用于 Vite Web UI smoke；非本地来源不应被放行；浏览器客户端需要读取 artifact/evidence 校验时只暴露 `X-Artifact-Checksum` 和 `X-Evidence-Checksum`。
9. `compute_result.runtime_audit.model_runs` 中的 `model_run.v1` 会持久化到 metadata store，并通过只读 model run endpoint 按 id 或 `job_id` / `model_key` / `model_version` 查询。
10. Evidence package P0 export 基于 job metadata、events、artifact refs 和 model_run refs 生成 `evidence_package.v1`，不内联大 artifact 内容。
11. `POST /api/v1/contracts/validate` 只校验已有 `contracts/` schema（当前包括 `simulation_request.v1`、`agent_scenario_draft.v1`、`constraint_draft.v1`、`draft_confirmation.v1`、`result_explanation.v1`、`model_catalog.v1` 等）；未知 future schema 必须返回 invalid，不得伪造支持。`POST /api/v1/contracts/confirm-draft` 会校验确认记录和嵌入草案，并持久化确认审计记录；它仍不创建 job、不执行审批或生产动作。`GET /api/v1/contracts/confirmations/{confirmation_id}` 用于只读审计查询。`GET /api/v1/contracts/confirmations/{confirmation_id}/constraint-application-plan` 只对 approved `constraint_draft.v1` 生效，返回 advisory plan，且必须保持 `would_create_job=false` / `would_modify_target=false`。`POST /api/v1/contracts/confirmations/{confirmation_id}/promote-simulation-check` 只对 approved `agent_scenario_draft.v1` 生效，且只在嵌入 `proposed_request` 本身是完整 `simulation_request.v1` 时创建 simulation check job。
12. `POST /api/v1/model-catalog` 可登记 schema-valid `model_catalog.v1` 快照，使用 `catalog_id`（默认 `default`）+ payload hash 幂等；`GET /api/v1/model-catalog` / `GET /api/v1/model-catalog/{model_key}` 优先读取最新持久化 `default` catalog，未登记时回退到 built-in catalog（material_balance 含 approved default parameter set；ASM1Slim/ASM1/ASM3/UDM 只含 worker-smoke-backed model version 与 benchmark case，不含默认参数集）。`POST /api/v1/model-catalog/{model_key}/versions/{model_version}/default-parameter-set/status` 只允许对 latest catalog 中已有 `default_parameter_set.status` 做前向迁移或 retire，并生成新的 catalog snapshot；多参数集管理、benchmark-backed production enforcement 仍是 Phase 6 后续。
13. `POST /api/v1/model-catalog/{model_key}/versions/{model_version}/benchmark-runs` 可记录 schema-valid `benchmark_run.v1`，要求 benchmark case 已存在且为 `validated`、parameter set 匹配当前 default parameter set、model_run 已存在且 parameter hash 匹配，并要求 evidence refs 可在该 job 内解析。该记录是执行历史，不自动执行 benchmark、不改变参数集状态、不代表生产审批完成。
14. Artifact retention P0 记录 `retention_policy` 和可选 `retain_until`；`POST /api/v1/admin/artifacts/retention-sweep` 需要 `artifact:admin` scope，默认 `dry_run=true`，可手动删除过期且未被 model_run evidence refs 引用的 `ttl` artifact，并对被引用 artifact 做保护。`COMPUTE_API_RETENTION_SWEEP_INTERVAL` 可显式启用同一逻辑的后台 scheduler，默认关闭且默认 dry-run；`COMPUTE_API_ARCHIVE_DIR` 显式配置后会启用 `local_fs_archive`，对过期且未引用的 `archive_candidate` artifact 先复制、校验、持久化 archive metadata 和 `artifact.archived` event，再删除 hot object，普通 artifact download 可从 archive store 回退读取；未配置时仍以 `archive_executor_not_configured` 跳过。
15. `compute_result.v1.risk_findings` 如由 worker 返回，会同步进入 stored result summary，便于 `GET /api/v1/compute/jobs/{job_id}/result` 和 NewSystem/milp 只读集成查看；`GET /api/v1/compute/jobs/{job_id}/evidence-ref?ref=...` 可在 job 边界内解析 `model_run:<id>`、`artifact:<id>`、`job:<id>`、`simulation_input:<id>`、`process_graph:<id>` 和 `evidence_package:<id>`；当前不做风险审批或生产发布动作。
16. Evidence package 会基于最新持久化 model catalog（无持久化时回退 built-in catalog）和 persisted model runs 生成 `governance.production_allowed` 与 model version refs；该判断只用于 evidence/read 集成，不阻止 job 创建，也不执行生产审批。
17. `POST /api/v1/process-graphs` 可登记 schema-valid `process_graph.v1`，并按 `(process_graph_id, version)` + payload hash 做幂等；`GET /api/v1/process-graphs/{process_graph_id}?version=1` 返回登记记录和原始 payload。省略 `version` 时默认读取 version 1。
18. `POST /api/v1/simulation-inputs` 可登记 schema-valid `simulation_input.v1`，并按 `simulation_input_id` + payload hash 做幂等；`GET /api/v1/simulation-inputs/{simulation_input_id}` 返回登记记录和原始 payload。
19. `POST /api/v1/simulation-checks` 将 `simulation_request.v1` 转换为 `compute_job.v1` 并入队；当前支持 `input_ref.simulation_input` 内嵌 payload、先登记后通过 `input_ref.simulation_input_id` 引用，先登记 `process_graph.v1` 后通过 `input_ref.process_graph_id` / `process_graph_version` 解析为 `simulation_input.v1`，以及通过已持久化 `input_ref.model_run_id` 找回源 job 的原始 `simulation_input.v1` payload 进行保守 replay。
20. `POST /api/v1/compute/jobs/{job_id}/result-explanations` 接收外部 Agent 生成的 `result_explanation.v1`，要求 job 已有结果、payload `job_id` 与路径一致、所有 `evidence_refs` 可在该 job 边界内解析；`review` 只允许 `approved` / `rejected`，`publish` 只允许发布已 approved 的 explanation。该流程不生成解释内容、不执行生产审批、不发布生产指令。
21. `/metrics` 为公开 Prometheus text endpoint，暴露 API up、job status、registered worker、artifact metadata、archived artifact metadata 和 retention candidate gauges；不得在 metrics handler 中执行 lifecycle mutation。

## 4. 对外接口

对 Web UI、NewSystem、milp、Agent 和 Python worker 暴露 HTTP API。

## 5. 依赖边界

可以依赖：

- `contracts/`
- metadata database。
- object storage abstraction。

不应该依赖：

- Python scientific runtime。
- legacy FastAPI internals。

## 6. 测试与验证

修改本目录后建议运行 Go API lifecycle、worker lifecycle、OpenAPI generation 和 DB migration smoke。

常用命令：

```powershell
cd apps\api; go test ./...
cd frontend; npm run generate-compute-client
cd frontend; npx tsc --noEmit
```

PostgreSQL integration tests 仅在 `COMPUTE_API_DATABASE_URL` 存在时运行；未配置时会 skip。Down migration rollback smoke 会删除 metadata tables，必须额外设置 `COMPUTE_API_MIGRATION_DOWN_SMOKE=true`，且只允许指向临时测试数据库。

## 7. AI 操作提示

实现 API 前先确认 `compute_job.v1` 和 `contract_error.v1` 是否已覆盖本次字段。
