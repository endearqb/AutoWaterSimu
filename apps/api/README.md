# 目录说明：apps/api

## 1. 目录职责

本目录负责 Go Compute API。

本目录负责：

- compute job lifecycle。
- worker register / claim / heartbeat / succeed / fail。
- artifact metadata, including retention policy fields。
- model catalog snapshot registration/read/list query, default parameter set status transition, default parameter set promotion planning, evidence-backed default parameter set approval promotion, benchmark case job scheduling, and model run persistence/list/search/read query。
- benchmark case metadata and queueing for model governance smoke。
- benchmark run execution history metadata。
- process graph registry and ProcessGraph-to-SimulationInput resolution for simulation checks。
- simulation input registry for reference-based simulation checks。
- evidence package export。
- simulation check job creation from `simulation_request.v1`。
- risk findings in result summary for NewSystem/milp read integration。
- evidence reference dereference for approval/read integrations。
- evidence governance summary for model/parameter production-readiness review。
- read-only production readiness report from evidence governance and risk findings。
- contract / Agent draft / constraint draft / draft confirmation / result explanation validation for existing schema files。
- persistent draft confirmation audit records, while still preventing confirm-draft from creating jobs or production actions。
- read-only advisory constraint application plans for approved constraint draft confirmations。
- evidence-backed result explanation submit/review/publish audit records。
- explicit approved Agent draft promotion to simulation-check jobs when the embedded proposed request is already schema-valid。
- admin-scoped artifact retention sweep API for manual dry-run/delete operations。
- optional disabled-by-default artifact retention scheduler。
- opt-in local filesystem or S3-compatible archive backend for expired unreferenced `archive_candidate` artifacts。
- Prometheus metrics for API up, job status counts, registered workers, artifact metadata count, archived artifact metadata count, and retention candidate count。
- selected mutation audit event envelopes for job create/queue, draft promotion and benchmark schedule-run job creation, artifact retention delete/archive, result explanation submit/review/publish, and non-job-scoped model governance mutations。
- token-scoped tenant/project/site read filtering for job list/get, model_run get / job-filtered list, and artifact download。
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
| `internal/compute/` | job lifecycle、worker lifecycle、auth、store、artifact、HTTP handlers、selected mutation audit persistence |
| `internal/domain/` | Go API 领域 package，目前包含 agent draft confirmation envelope validation / record data projection / constraint application plan / proposed request helpers、artifacts retention policy/action planner、evidence input/ref/risk parsing/stored summary risk projection/result explanation refs/record data projection/readiness policy、jobs status/failed-worker fallback result/worker result completion/claim invariants/cancel-timeout state lifecycle、models built-in catalog document、benchmark case run job document、compute_result model_run extraction、model_run parsing/check、benchmark_run parsing、benchmark workflow gates、benchmark case readiness、parameter-set status rules、promotion gate 与 production governance gate policy、simulation execution/profile/simulation-check job document/process-graph helpers/record data projection 和 workers domain package |
| `internal/platform/` | Go API 平台级 helper，目前包含 audit、auth、config、contracts、HTTP 和 metrics helper package |
| `migrations/` | PostgreSQL metadata SQL migrations |
| `openapi/compute.openapi.json` | Go Compute API OpenAPI source |

Phase 4A 仍以 `internal/compute` 作为主要 compute compatibility wiring package，但已开始 domain package movement：draft confirmation envelope 跨字段校验、确认记录 data projection、constraint application advisory plan 组装与 Agent draft proposed request 提取位于 `internal/domain/agent`；artifact retention policy 解析、候选判断和 sweep action planning 位于 `internal/domain/artifacts`；evidence input/ref/risk parsing、stored result summary risk projection、result explanation evidence ref extraction、result explanation record data projection 与 production-readiness policy evaluation 位于 `internal/domain/evidence`；job status 常量、终态/worker-result 状态不变量、failed-worker fallback result construction、worker result completion status/error 提取规则、worker claim capability/contract-version 匹配规则，以及 cancel/timeout state lifecycle service 与状态 mutation plan 位于 `internal/domain/jobs`；built-in `model_catalog.v1` document shape、benchmark case schedule-run `compute_job.v1` document shape、`compute_result.v1.runtime_audit.model_runs` 提取预检、`model_run.v1` 原始 identity/evidence refs/warnings/parameter_hash 解析、model run identity/hash 比对、`benchmark_run.v1` evidence refs 解析、benchmark case scheduling / benchmark run admission gate、单个 benchmark case promotion readiness、default parameter set status 常量/迁移不变量、promotion gate 判定与 model_run production governance gate 判定位于 `internal/domain/models`；simulation job type execution profile / worker capability 映射、simulation check `compute_job.v1` document assembly、material-balance ProcessGraph-to-SimulationInput projection 与 simulation input / process graph record data projection 位于 `internal/domain/simulation`；worker register / claim / heartbeat 领域服务位于 `internal/domain/workers`，由 `internal/compute` 的 adapter 连接现有 `WorkerStore` 和 job state 投影。platform package movement 也已开始：selected mutation audit envelope helper 位于 `internal/platform/audit`，static bearer token Authenticator 位于 `internal/platform/auth`，runtime `Config` 位于 `internal/platform/config`，contract schema validator 与 base document validation response 位于 `internal/platform/contracts`，平台 HTTP helper 位于 `internal/platform/httpx`，metrics snapshot / read-only collector / Prometheus renderer 位于 `internal/platform/metrics`。`internal/domain/*` 与 `internal/platform/*` packages 不应反向依赖 compute package。当前 metadata `Store` 已先由 13 个领域/审计子接口组合，新增 `MutationAuditStore` 用于非 job-scoped selected mutation audit 查询；job create/list/cancel/complete/fail/timeout 已委派到 `JobLifecycleService`，其中 cancel/timeout 再经 compute adapter 委派到 `domain/jobs.JobStateService`，MemoryStore/PostgresStore 只应用 domain mutation plan 并保留具体持久化；artifact upload / listing / metadata lookup / download / retention / archive 逻辑已委派到 `ArtifactLifecycleService`；worker register / claim / heartbeat 已委派到 `domain/workers.WorkerLifecycleService`；simulation input / process graph 注册与 `simulation_request.input_ref` 解析已委派到只依赖 simulation input、process graph、model run replay 读取接口的 `SimulationInputService`；draft confirmation / promotion 已委派到 `DraftWorkflowService`；result explanation submit/review/publish 已委派到 `ResultExplanationService`；model catalog / benchmark run / model run governance 查询与 benchmark case queueing 已委派到 `ModelGovernanceService`；result read / evidence package / production readiness / evidence-ref resolution 已委派到 `EvidenceGovernanceService`；metrics snapshot collection 已委派到 platform `MetricsService`，具体 Memory/Postgres count 查询仍由 compute store 实现。主 `Service` 的 struct 与构造 wiring 保留在 `service.go`，public compatibility delegates 已按 jobs/artifacts/models/simulation/contracts/evidence/workers/metrics 分组拆到 `service_*.go`，共享 helper 位于 `service_helpers.go`。使用 `scripts/audit-compute-api-boundary.ps1` 验证 Store/domain 子接口、内部 service constructor 边界、package boundary、调用来源与实现覆盖。

`JobLifecycleService` 仍留在 `internal/compute` compatibility package；`job_lifecycle.go` 仅保留 struct/constructor/callback wiring，job create、read/events/snapshot 和 complete/fail/model-run persistence workflow 分组位于同 package 的 `job_lifecycle_*.go` 文件；cancel/timeout state lifecycle 已委派到 `internal/domain/jobs.JobStateService`，`job_lifecycle_state.go` 保留 compute adapter、snapshot assembly 和兼容返回类型。

`ArtifactLifecycleService` 仍留在 `internal/compute` compatibility package；`artifact_lifecycle.go` 仅保留 struct、constructor、store/object-store wiring，upload、listing/read、download fallback、retention sweep 和 archive copy/checksum/delete workflow 分组位于同 package 的 `artifact_lifecycle_*.go` 文件。完整 artifact lifecycle 迁入 `internal/domain/artifacts` 之前，compute 继续拥有 object/archive execution、metadata persistence、audit event call sites、HTTP mapping 和 download fallback。

`ModelGovernanceService` 仍留在 `internal/compute` compatibility package；`model_governance.go` 仅保留 struct/constructor/store/callback wiring，catalog、parameter promotion、benchmark case queueing、benchmark run history 和 model run lookup workflow 分组位于同 package 的 `model_governance_*.go` 文件。

Model governance HTTP mapping 仍由 `internal/compute` 暴露；原宽泛 `http_models.go` 已按同 package 文件拆分为 `http_model_catalog.go`、`http_model_parameters.go`、`http_model_benchmark_cases.go`、`http_benchmark_runs.go` 和 `http_model_runs.go`，`http.go` 的 route registration 与 HTTP 行为保持不变。

Model governance PostgreSQL metadata persistence 仍由 `internal/compute` 的 `PostgresStore` 实现；原宽泛 `postgres_models.go` 已按 `ModelRunStore`、`BenchmarkRunStore` 和 `ModelCatalogStore` 责任拆分为 `postgres_model_runs.go`、`postgres_benchmark_runs.go` 和 `postgres_model_catalog.go`，非 job-scoped selected mutation audit metadata 位于 `postgres_mutation_audit.go`。

Model governance in-memory metadata persistence 仍由 `internal/compute` 的 `MemoryStore` 实现；原宽泛 `memory_models.go` 已按 `ModelRunStore`、`BenchmarkRunStore` 和 `ModelCatalogStore` 责任拆分为 `memory_model_runs.go`、`memory_benchmark_runs.go` 和 `memory_model_catalog.go`，非 job-scoped selected mutation audit metadata 位于 `memory_mutation_audit.go`，locking、cursor pagination、排序与 clone 语义保持不变。

Draft confirmation / result explanation metadata persistence 仍由 `internal/compute` 的 `MemoryStore` 与 `PostgresStore` 实现；原宽泛 `memory_agent.go` 与 `postgres_agent.go` 已按 `DraftConfirmationStore` 和 `ResultExplanationStore` 责任拆分为 `memory_draft_confirmations.go`、`memory_result_explanations.go`、`postgres_draft_confirmations.go` 和 `postgres_result_explanations.go`，SQL、transaction、review/publish 状态流与 clone 语义保持不变。

`EvidenceGovernanceService` 仍留在 `internal/compute` compatibility package；`evidence_governance.go` 仅保留 struct/constructor/store/callback wiring，result read、evidence package export、production readiness 和 evidence-ref resolution workflow 分组位于同 package 的 `evidence_governance_*.go` 文件。

`SimulationInputService` 仍留在 `internal/compute` compatibility package；`simulation_inputs.go` 仅保留 struct/constructor/store wiring，simulation input registration/read、process graph registration/projection 和 `simulation_request.input_ref` resolution / model-run replay workflow 分组位于同 package 的 `simulation_inputs_*.go` 文件。

`DraftWorkflowService` 仍留在 `internal/compute` compatibility package；`draft_workflows.go` 仅保留 struct/constructor/callback wiring，draft confirmation validation/persistence/read、constraint application plan 和 explicit simulation-check promotion workflow 分组位于同 package 的 `draft_workflows_*.go` 文件。

`ResultExplanationService` 仍留在 `internal/compute` compatibility package；`result_explanations.go` 仅保留 struct/constructor/callback wiring，result explanation submit/read/review-publish workflow 分组位于同 package 的 `result_explanations_*.go` 文件。

## 3. 维护约定

1. P0 metadata DB 使用 PostgreSQL。
2. list API 必须支持稳定 cursor pagination。
3. create job 必须支持 idempotency。
4. OpenAPI client 生成到 `frontend/src/client/compute`。
5. P0 auth 使用静态 Bearer token + scope，并支持配置级 `revoked` token 拒绝；token config 可选 `tenant_id` / `project_id` / `site_id`，用于 job list/get、model_run get / job-filtered list 和 artifact download 的 HTTP read-scope 过滤；scoped token 访问 `GET /api/v1/model-runs` 必须提供已授权的 `job_id`，避免跨 job 枚举。空 tenant/project/site 表示全局读。当前不实现完整 RBAC 或动态 token 管理 API。`cmd/compute-api` 在 `APP_ENV=production` 或 `ENVIRONMENT=production` 时必须拒绝空 token config 和默认 dev token（`dev-public-token`、`dev-worker-token`、`dev-admin-token`）；生产 token config 可通过 `COMPUTE_API_TOKENS_JSON` 或挂载 secret 文件 `COMPUTE_API_TOKENS_FILE` 提供，二者不得同时设置。Result explanation submit/review/publish 使用 `explanation:write`，避免复用 job 创建权限表达解释发布。当前 job create/queue、draft promotion / benchmark schedule-run job create/queue、artifact retention delete/archive 与 result explanation submit/review/publish events 写入 `compute_job_events.event_json.audit`；model catalog registration、default parameter set status/promote 和 benchmark_run registration 写入 compact `mutation_audit_events`。完整 all-mutation audit、OIDC/RBAC 和全对象 tenant/project/site data scope 仍是后续安全工作。
6. Go API 不执行 Python 科学计算，只编排 worker lifecycle。
7. `COMPUTE_API_DATABASE_URL` 未配置时，`cmd/compute-api` 只为本地开发使用非持久 in-memory metadata store；正式 Web/Platform 路径必须配置 PostgreSQL。
8. HTTP routes 允许本地开发 loopback 来源（`localhost`、`127.0.0.1`、`::1`）跨端口 CORS/OPTIONS，用于 Vite Web UI smoke；非本地来源不应被放行；浏览器客户端需要读取 artifact/evidence 校验时只暴露 `X-Artifact-Checksum` 和 `X-Evidence-Checksum`。
9. `compute_result.runtime_audit.model_runs` 中的 `model_run.v1` 会持久化到 metadata store，并通过只读 model run endpoint 按 id 或 `job_id` / `model_key` / `model_version` 查询；稳定 extraction / present `job_id` precheck 位于 `internal/domain/models`，schema validation 和 store persistence 仍由 job lifecycle 负责。
10. Evidence package P0 export 基于 job metadata、events、artifact refs 和 model_run refs 生成 `evidence_package.v1`，不内联大 artifact 内容。
11. `POST /api/v1/contracts/validate` 只校验已有 `contracts/` schema（当前包括 `simulation_request.v1`、`agent_scenario_draft.v1`、`constraint_draft.v1`、`draft_confirmation.v1`、`result_explanation.v1`、`model_catalog.v1` 等）；未知 future schema 必须返回 invalid，不得伪造支持。`POST /api/v1/contracts/confirm-draft` 会校验确认记录和嵌入草案，并持久化确认审计记录；它仍不创建 job、不执行审批或生产动作。`GET /api/v1/contracts/confirmations/{confirmation_id}` 用于只读审计查询。`GET /api/v1/contracts/confirmations/{confirmation_id}/constraint-application-plan` 只对 approved `constraint_draft.v1` 生效，返回 advisory plan，且必须保持 `would_create_job=false` / `would_modify_target=false`；稳定 plan shape 与 warnings 位于 `internal/domain/agent`。`POST /api/v1/contracts/confirmations/{confirmation_id}/promote-simulation-check` 只对 approved `agent_scenario_draft.v1` 生效，且只在嵌入 `proposed_request` 本身是完整 `simulation_request.v1` 时创建 simulation check job；stable proposed request extraction 位于 `internal/domain/agent`，schema validation 和 job 创建仍留在 compute。
12. `POST /api/v1/model-catalog` 可登记 schema-valid `model_catalog.v1` 快照，使用 `catalog_id`（默认 `default`）+ payload hash 幂等；`GET /api/v1/model-catalog` / `GET /api/v1/model-catalog/{model_key}` 优先读取最新持久化 `default` catalog，未登记时回退到 built-in catalog（material_balance 含 approved default parameter set；ASM1Slim/ASM1/ASM3/UDM 只含 worker-smoke-backed model version 与 benchmark case，不含默认参数集）。Built-in catalog 的稳定 document shape 位于 `internal/domain/models`；material-balance default parameter hash、typed DTO conversion、schema validation、持久化 catalog fallback/read behavior 仍由 compute 负责。`GET /api/v1/model-catalog/{model_key}/versions/{model_version}/default-parameter-set/promotion-plan` 只读评估当前 default parameter set 的 latest benchmark_run / model_run 证据是否足以建议从 `validated` 提升到 `approved`，不执行 benchmark、不修改 catalog、不完成生产审批。`POST /api/v1/model-catalog/{model_key}/versions/{model_version}/default-parameter-set/promote-approved` 需要 `model:write`，只在同一 promotion plan 通过时把当前 default parameter set 从 `validated` 晋升到 `approved` 并生成新的 catalog snapshot；该 endpoint 仍不执行 benchmark、不记录 benchmark_run、不代表生产审批完成。`POST /api/v1/model-catalog/{model_key}/versions/{model_version}/benchmark-cases/{benchmark_case_id}/schedule-run` 只把 active model version 的 validated benchmark case 排队为标准 `compute_job.v1`，要求当前 default parameter set 存在且未 retired；该 job document 的稳定 shape 位于 `internal/domain/models`，catalog lookup、gate/error mapping、execution profile lookup、simulation input resolution、JSON marshaling、createJob 和 HTTP mapping 仍由 compute 负责；该 endpoint 不执行 Python、不记录 benchmark_run、不修改 catalog、不完成参数集审批。`POST /api/v1/model-catalog/{model_key}/versions/{model_version}/default-parameter-set/status` 只允许对 latest catalog 中已有 `default_parameter_set.status` 做前向迁移或 retire，并生成新的 catalog snapshot；多参数集管理和自动化 approval workflow 仍是 Phase 6 后续。
13. `POST /api/v1/model-catalog/{model_key}/versions/{model_version}/benchmark-runs` 可记录 schema-valid `benchmark_run.v1`，要求 benchmark case 已存在且为 `validated`、parameter set 匹配当前 default parameter set、model_run 已存在且 parameter hash 匹配，并要求 evidence refs 可在该 job 内解析。该记录是执行历史，不创建或执行 benchmark job、不改变参数集状态、不代表生产审批完成。`GET` 列表支持按 `benchmark_case_id` 与 `parameter_set_id` 过滤，promotion plan 使用同一历史记录面。
14. Artifact retention P0 记录 `retention_policy` 和可选 `retain_until`；`POST /api/v1/admin/artifacts/retention-sweep` 需要 `artifact:admin` scope，默认 `dry_run=true`，可手动删除过期且未被 model_run evidence refs 引用的 `ttl` artifact，并对被引用 artifact 做保护。`COMPUTE_API_RETENTION_SWEEP_INTERVAL` 可显式启用同一逻辑的后台 scheduler，默认关闭且默认 dry-run；`COMPUTE_API_ARCHIVE_DIR` 显式配置后会启用 `local_fs_archive`；`COMPUTE_API_ARCHIVE_S3_ENDPOINT` / `COMPUTE_API_ARCHIVE_S3_BUCKET` / `COMPUTE_API_ARCHIVE_S3_ACCESS_KEY_ID` / `COMPUTE_API_ARCHIVE_S3_SECRET_ACCESS_KEY` 显式配置后会启用 path-style `s3_archive`。两类 archive backend 都对过期且未引用的 `archive_candidate` artifact 先复制、校验、持久化 archive metadata 和带 audit envelope 的 `artifact.archived` event，再删除 hot object，普通 artifact download 可从 archive store 回退读取；未配置时仍以 `archive_executor_not_configured` 跳过。
15. `compute_result.v1.risk_findings` 如由 worker 返回，会通过 `internal/domain/evidence` 的 stored summary helper 同步进入 stored result summary，便于 `GET /api/v1/compute/jobs/{job_id}/result` 和 NewSystem/milp 只读集成查看；job lifecycle 仍负责 schema validation、summary persistence 和 result hash。`GET /api/v1/compute/jobs/{job_id}/evidence-ref?ref=...` 可在 job 边界内解析 `model_run:<id>`、`artifact:<id>`、`job:<id>`、`simulation_input:<id>`、`process_graph:<id>` 和 `evidence_package:<id>`；当前不做风险审批或生产发布动作。
16. Evidence package 会基于最新持久化 model catalog（无持久化时回退 built-in catalog）和 persisted model runs 生成 `governance.production_allowed` 与 model version refs；该判断只用于 evidence/read 集成，不阻止 job 创建，也不执行生产审批。`governance.production_allowed` 的稳定 active+approved predicate 委派给 `internal/domain/models`，catalog lookup、evidence package assembly 和 response mapping 仍留在 compute。`GET /api/v1/compute/jobs/{job_id}/production-readiness` 在 evidence/read 边界内返回 `production_readiness.v1`，只汇总 job 成功、evidence 可用、governance 允许和 high/critical risk finding 阻断状态；它仍要求外部审批且禁止 AutoWaterSimu 自动发布生产动作。
17. `POST /api/v1/process-graphs` 可登记 schema-valid `process_graph.v1`，并按 `(process_graph_id, version)` + payload hash 做幂等；`GET /api/v1/process-graphs/{process_graph_id}?version=1` 返回登记记录和原始 payload。省略 `version` 时默认读取 version 1。稳定 process graph record data projection 位于 `internal/domain/simulation`；schema validation、compute DTO 映射、store persistence、idempotency 和 HTTP mapping 仍留在 compute。
18. `POST /api/v1/simulation-inputs` 可登记 schema-valid `simulation_input.v1`，并按 `simulation_input_id` + payload hash 做幂等；`GET /api/v1/simulation-inputs/{simulation_input_id}` 返回登记记录和原始 payload。稳定 simulation input record data projection 位于 `internal/domain/simulation`；schema validation、compute DTO 映射、store persistence、idempotency 和 HTTP mapping 仍留在 compute。
19. `POST /api/v1/simulation-checks` 将 `simulation_request.v1` 转换为 `compute_job.v1` 并入队；当前支持 material_balance、ASM1Slim、ASM1、ASM3、UDM job types 的 `input_ref.simulation_input` 内嵌 payload、先登记后通过 `input_ref.simulation_input_id` 引用，以及通过已持久化 `input_ref.model_run_id` 找回源 job 的原始 `simulation_input.v1` payload 进行保守 replay。`input_ref.process_graph_id` / `process_graph_version` 自动解析仍只生成 material-balance `simulation_input.v1`，不得静默扩展到 ASM/UDM。
20. `POST /api/v1/compute/jobs/{job_id}/result-explanations` 接收外部 Agent 生成的 `result_explanation.v1`，要求 job 已有结果、payload `job_id` 与路径一致、所有 `evidence_refs` 可在该 job 边界内解析；稳定 evidence ref extraction 与 record data projection 位于 `internal/domain/evidence`，schema/job/evidence checks、compute record mapping、持久化和 review/publish 状态流仍留在 compute；`review` 只允许 `approved` / `rejected`，`publish` 只允许发布已 approved 的 explanation。该流程不生成解释内容、不执行生产审批、不发布生产指令。
21. `/metrics` 为公开 Prometheus text endpoint，通过 `MetricsService` 只读暴露 API up、job status、registered worker、artifact metadata、archived artifact metadata 和 retention candidate gauges；不得在 metrics handler 或 metrics service 中执行 lifecycle mutation。

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
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1
```

PostgreSQL integration tests 仅在 `COMPUTE_API_DATABASE_URL` 存在时运行；未配置时会 skip。Down migration rollback smoke 会删除 metadata tables，必须额外设置 `COMPUTE_API_MIGRATION_DOWN_SMOKE=true`，且只允许指向临时测试数据库。

## 7. AI 操作提示

实现 API 前先确认 `compute_job.v1` 和 `contract_error.v1` 是否已覆盖本次字段。
