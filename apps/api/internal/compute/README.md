# 目录说明：apps/api/internal/compute

## 1. 目录职责

本目录实现 Go Compute API Phase 4A compute lifecycle。

本目录负责：

- Job create/get/list/cancel/result/events。
- Worker register/claim/heartbeat/artifact/succeed/fail。
- Model catalog snapshot registration/read/list endpoints and default parameter set status transitions。
- Model benchmark case metadata for governance smoke。
- Benchmark run execution history persistence/list/read endpoints。
- Model run persistence plus read/list lookup。
- Process graph registry and ProcessGraph-to-SimulationInput resolution for simulation checks。
- Simulation input registry used by reference-based simulation checks。
- Evidence package export from completed job metadata。
- Simulation check creation from `simulation_request.v1` into queued `compute_job.v1`。
- Artifact retention metadata recording。
- Risk findings copied into stored result summary for read-only integrations。
- Evidence reference dereference for model run, artifact, job, process graph, and embedded simulation input refs。
- Evidence governance summary generated from model runs and the latest persisted model catalog, with built-in fallback。
- Contract validation for existing Agent / simulation / constraint draft / draft confirmation / result explanation schema files。
- Draft confirmation audit record persistence and readback。
- Read-only advisory constraint application plan generation for approved constraint draft confirmations。
- Result explanation submit/review/publish audit workflow with job-scoped evidence ref checks。
- Explicit approved Agent draft promotion to simulation-check jobs when the embedded proposed request is schema-valid。
- Admin-scoped artifact retention sweep HTTP endpoint with safe dry-run default。
- Disabled-by-default artifact retention scheduler helper。
- Opt-in local filesystem archive backend metadata and download fallback。
- Prometheus metrics snapshot rendering from the metadata store, including archived artifact metadata count。
- Static bearer token scope auth with config-level revocation。
- Contract validation、canonical payload hash、idempotency/conflict。
- Metadata store abstraction and PostgreSQL implementation。

本目录不负责：

- Python simulation execution。
- Desktop local runtime。
- Frontend UI。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `http.go` | HTTP handlers and routing |
| `service.go` | lifecycle orchestration |
| `store.go`、`postgres.go` | store interface and PostgreSQL implementation, including model catalog / process graph / simulation input / draft confirmation metadata persistence |
| `types.go` | internal DTO/domain types |
| `auth.go` | static bearer token scopes |
| `contracts.go`、`errors.go`、`hash.go`、`artifacts.go` | contract/error/hash/artifact helpers |
| `*_test.go` | lifecycle and store tests |

## 3. 维护约定

1. Create job idempotency and payload conflict behavior must stay deterministic.
2. List APIs use stable cursor pagination.
3. Worker state transitions must be validated server-side.
4. Error responses should map to `contract_error.v1`-style structures where applicable.
5. Local development CORS is intentionally limited to loopback browser origins for Web UI smoke tests; checksum visibility is limited to exposed `X-Artifact-Checksum` / `X-Evidence-Checksum` headers; do not broaden origins or exposed headers without an explicit deployment/auth review.
6. Successful compute results may include `runtime_audit.model_runs`; persist schema-valid `model_run.v1` records without storing large artifact contents in metadata tables, and keep list filters limited to indexed governance fields such as `job_id`、`model_key` and `model_version`.
7. Evidence package export must reference artifacts/model runs by id and include a checksum header that browser clients can read through the local CORS expose list; do not inline artifact bytes.
8. Contract validation endpoints use existing `job:create` scope; `/contracts/validate` validates only schema files compiled by `ContractValidator`, while `/contracts/confirm-draft` additionally validates the embedded draft, persists a draft confirmation audit record, and returns a warning that no compute job was created. `/contracts/confirmations/{confirmation_id}/constraint-application-plan` uses `job:read`, requires an approved `constraint_draft.v1` confirmation, and returns advisory metadata only; it must not create compute jobs, mutate the target, or mark production approval complete. `/contracts/confirmations/{confirmation_id}/promote-simulation-check` is the only promotion path: it requires an approved `agent_scenario_draft.v1` confirmation and a schema-valid embedded `simulation_request.v1`. Unknown future contracts must remain invalid until the schema exists.
9. Static token rotation is represented by overlapping token config and setting old token records to `revoked=true`; revoked tokens must fail authentication even if their scopes match. Explanation review/publish mutations require `explanation:write` in addition to the route-level read boundary.
10. Model catalog GET endpoints use `job:read`; `POST /api/v1/model-catalog` uses `model:write` to register schema-valid `model_catalog.v1` snapshots. Reads prefer the latest persisted `default` catalog and fall back to the built-in material-balance catalog when no snapshot exists. `GET /api/v1/model-catalog/snapshots` lists persisted snapshots only and does not emit the built-in fallback as history. `POST /api/v1/model-catalog/{model_key}/versions/{model_version}/default-parameter-set/status` is the only P0 mutable lifecycle endpoint: it updates the existing default parameter set status through allowed forward transitions or retirement and stores a new catalog snapshot. This is still not a multi-parameter-set management or benchmark-backed production enforcement service.
11. Benchmark run history endpoints record schema-valid `benchmark_run.v1` only after checking the target benchmark case is present/validated, the parameter set matches the current default parameter set, the referenced model_run exists with matching model/version/parameter hash, and evidence refs resolve inside the model_run job. They must not execute benchmark jobs, mutate parameter set status, or mark production approval complete.
12. Artifact upload defaults `retention_policy` to `retain_forever`; when workers provide `ttl` / `archive_candidate` and optional `retain_until`, the API records those fields. `POST /api/v1/admin/artifacts/retention-sweep` requires `artifact:admin`, defaults to `dry_run=true`, can delete expired unreferenced `ttl` artifacts, and writes an audit event; artifacts referenced by model_run evidence refs are protected. When `archiveArtifacts` is configured, expired unreferenced `archive_candidate` artifacts are copied to `local_fs_archive`, checksum-verified, recorded in durable archive metadata, logged as `artifact.archived`, and then removed from hot storage while normal artifact download falls back to the archive copy. Without an archive store, `archive_candidate` remains skipped with `archive_executor_not_configured`. Archive handling must follow `.ai/decisions/0010-artifact-archive-backend-boundary.md`. The scheduler helper reuses this service method and is only started by the command entrypoint when explicitly configured.
13. When a valid `compute_result.v1` includes top-level `risk_findings`, copy those findings into the stored summary so result read APIs expose them without storing the full result payload in metadata tables. Evidence-read integrations can call `GET /api/v1/compute/jobs/{job_id}/evidence-ref?ref=...` to resolve supported refs only within that job boundary; do not dereference refs across unrelated jobs. Supported refs are `model_run:<id>`、`artifact:<id>`、`job:<id>`、`simulation_input:<id>`、`process_graph:<id>` and generated `evidence_package:<id>`.
14. Evidence governance uses the latest persisted model catalog, with built-in fallback, to mark model version and parameter set status; `production_allowed=true` currently requires an active model version and matching approved default parameter set.
15. Process graph registration stores only schema-valid `process_graph.v1` payload metadata and hash in the metadata DB. The API currently resolves `simulation_request.v1.input_ref.process_graph_id` by loading a registered process graph and generating a `simulation_input.v1` payload for material-balance jobs; it does not execute simulation directly.
16. Simulation check creation is a thin adapter from external `simulation_request.v1` to internal `compute_job.v1`; it validates embedded `input_ref.simulation_input`, resolves a previously registered `input_ref.simulation_input_id`, resolves a registered `input_ref.process_graph_id`, or replays a persisted `input_ref.model_run_id` by reusing the source job's original `simulation_input.v1` payload before queueing.
17. Simulation input registration stores only `simulation_input.v1` payload metadata and hash in the metadata DB; it must not store simulation results, time-series artifacts, or approval state.
18. Result explanation workflow stores externally generated `result_explanation.v1` payloads only after schema validation and job-scoped evidence ref resolution. Review/publish changes audit status only; it must not generate explanation text, execute Agent code, mark production approval complete, or mutate jobs/results.
19. `/metrics` renders a read-only snapshot from the metadata store: API up, jobs by status, registered workers, artifact metadata count, archived artifact metadata count, and retention candidates. Metrics rendering must not trigger retention sweep, timeout sweep, or any lifecycle mutation.

## 4. 对外接口

本目录通过 `cmd/compute-api` 暴露 HTTP API，OpenAPI source 位于 `apps/api/openapi`。

## 5. 依赖边界

可以依赖 Go standard library、PostgreSQL driver and contract JSON validation helpers。

不应该依赖 backend FastAPI app or Desktop Tauri runtime。

## 6. 测试与验证

```powershell
cd apps\api; go test ./...
```

PostgreSQL migration rollback smoke 会删除 metadata tables，必须在临时数据库上显式设置：

```powershell
$env:COMPUTE_API_DATABASE_URL="postgres://..."
$env:COMPUTE_API_MIGRATION_DOWN_SMOKE="true"
cd apps\api; go test ./internal/compute -run 'TestPostgresMigrations(Up|Down)Smoke' -count=1
```

## 7. AI 操作提示

API 行为变化需同步 `apps/api/openapi/compute.openapi.json`、generated compute client and `.ai/changes`。
