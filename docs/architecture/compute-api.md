# AutoWaterSimu Next Compute API Architecture

> Snapshot date: 2026-06-14.

This document records the current Go Compute API boundary after the first Store/interface split, the MemoryStore domain file split, the model governance MemoryStore persistence file split, the draft/result explanation MemoryStore persistence file split, the HTTP route-group handler file split, the model governance HTTP handler file split, the PostgreSQL persistence domain file split, the model governance PostgreSQL persistence file split, the draft/result explanation PostgreSQL persistence file split, the Service compatibility delegate file split, the artifact lifecycle, simulation input/process graph, draft, result explanation, and model/evidence governance workflow file splits, the current service-constructor narrowing slices, the first platform helper package movement, and the agent/artifacts/evidence/jobs/models/simulation/workers domain package movement including jobs create idempotency decision, create projection, worker claim/heartbeat mutation plans, and state lifecycle. It is based on `apps/api/README.md`, `apps/api/internal/compute/README.md`, `apps/api/internal/domain/README.md`, `apps/api/internal/platform/README.md`, and the read-only audit script:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1
```

The script writes evidence to `tmp/architecture-evidence/compute-api-boundary.json`.

## Current Shape

The Compute API domain is still mostly wired through the modular-monolith compatibility package under `apps/api/internal/compute`. The first agent/artifacts/evidence/jobs/models/simulation/workers domain packages now live under `apps/api/internal/domain`, and the first non-domain platform packages, including contract schema validation, live under `apps/api/internal/platform`.

The aggregate `Store` is expressed as embedded domain/audit metadata interfaces. `memory_store.go` keeps the `MemoryStore` struct and constructor, while model governance in-memory persistence is split across `memory_model_runs.go`, `memory_benchmark_runs.go`, and `memory_model_catalog.go`, selected non-job-scoped mutation audit persistence lives in `memory_mutation_audit.go`, and draft/result explanation in-memory persistence is split across `memory_draft_confirmations.go` and `memory_result_explanations.go`. `http.go` keeps the server entrypoint and unchanged route registration block while route handlers live in route-group files; model governance HTTP mapping is further split across `http_model_catalog.go`, `http_model_parameters.go`, `http_model_benchmark_cases.go`, `http_benchmark_runs.go`, and `http_model_runs.go`. `postgres.go` keeps the PostgreSQL store entrypoint and migration apply/check helpers while domain persistence methods, select SQL, and scan functions live in `postgres_*.go` files; model governance PostgreSQL persistence is further split across `postgres_model_runs.go`, `postgres_benchmark_runs.go`, and `postgres_model_catalog.go`, selected non-job-scoped mutation audit persistence lives in `postgres_mutation_audit.go`, and draft/result explanation PostgreSQL persistence is split across `postgres_draft_confirmations.go` and `postgres_result_explanations.go`. `service.go` keeps the `Service` struct and constructor wiring, while public compatibility delegates live in same-package `service_*.go` files grouped by jobs, artifacts, models, simulation, contracts, evidence, workers, and metrics. `job_lifecycle.go` keeps `JobLifecycleService` constructor/store/callback wiring, while same-package `job_lifecycle_*.go` files group create/idempotency/audit, list/read/events/snapshot, cancel/timeout adapter, complete/fail, and model-run persistence workflows; queued job create record projection/create-event planning, create idempotency duplicate/conflict decision, worker claim running mutation planning, and heartbeat lease refresh mutation planning live in `domain/jobs`, and cancel/timeout mutation planning plus domain validation live in `domain/jobs.JobStateService`. `artifact_lifecycle.go` keeps `ArtifactLifecycleService` constructor/store/object-store wiring, while same-package `artifact_lifecycle_*.go` files group upload, listing/read/download, retention sweep, and archive execution workflows. `simulation_inputs.go` keeps `SimulationInputService` constructor/store wiring, while same-package `simulation_inputs_*.go` files group simulation input registry/read, process graph registry/projection, input-ref resolution, model-run replay, and compact registry audit workflows. `draft_workflows.go` keeps `DraftWorkflowService` constructor/callback wiring, while same-package `draft_workflows_*.go` files group confirmation validation/persistence/read, advisory constraint planning, and explicit simulation-check promotion workflows. `result_explanations.go` keeps `ResultExplanationService` constructor/callback wiring, while same-package `result_explanations_*.go` files group submit, read, review, publish, and job-scoped evidence-ref validation workflows. `model_governance.go` keeps `ModelGovernanceService` constructor/store/callback wiring, while same-package `model_governance_*.go` files group catalog, parameter promotion, benchmark case queueing, benchmark run history, model run lookup, and compact mutation audit construction. `evidence_governance.go` keeps `EvidenceGovernanceService` constructor/callback wiring, while same-package `evidence_governance_*.go` files group result read, evidence package export, production readiness, and evidence-ref resolution workflows. Job create/list/read/events, complete/fail, and model-run persistence live behind `JobLifecycleService`; create adapts the `domain/jobs` idempotency decision to existing conflict/reused-snapshot behavior, adapts queued job projection/event plans back into compute records, worker claim and heartbeat persistence apply `domain/jobs` mutation plans, and cancel/timeout additionally delegate to `domain/jobs.JobStateService` through a compute store adapter; artifact upload / listing / metadata lookup / download / retention / archive logic now lives behind `ArtifactLifecycleService`; worker register / claim / heartbeat now lives behind `WorkerLifecycleService`; simulation input registration, process graph registration, `simulation_request.input_ref` resolution, and compact simulation registry mutation audit now live behind `SimulationInputService`; draft confirmation / promotion workflows now live behind `DraftWorkflowService`; result explanation submit/review/publish now lives behind `ResultExplanationService`; model catalog, benchmark run, model run lookup, promotion planning, benchmark case queueing, and model governance mutation audit construction now live behind `ModelGovernanceService`; result read, evidence package export, production readiness, and evidence-ref resolution now live behind `EvidenceGovernanceService`; metrics snapshot reads now live behind `MetricsService`. Internal domain service constructors now expose 1-3 store-like parameters and the audit fails if they accept the aggregate `Store`.

The wider `Service` still owns package-level construction and public compatibility method signatures, so this is not yet a full domain package split.

## Package Boundary

`apps/api/internal/platform/audit` owns selected mutation audit envelope field shape, HTTP request audit context projection, and event JSON attachment. Compute keeps selected audit call sites and persistence decisions for job-scoped `compute_job_events` and global `mutation_audit_events`: job create/queue, draft confirmation record, draft promotion / benchmark schedule-run job creation, artifact retention delete/archive, result explanation submit/review/publish, model catalog registration, default parameter set status/promote, benchmark_run registration, process_graph registration, and simulation_input registration. `apps/api/internal/platform/auth` owns static bearer token config parsing, principal parsing, scope/revocation checks, and platform auth errors; `cmd/compute-api` may provide the same JSON shape from inline `COMPUTE_API_TOKENS_JSON` or a mounted `COMPUTE_API_TOKENS_FILE`. Compute maps auth errors back to `contract_error.v1` responses. `apps/api/internal/platform/config` owns the command/runtime `Config` shape used by `cmd/compute-api` for environment-derived wiring. `apps/api/internal/platform/contracts` owns JSON Schema loading, schema_version-to-file mapping, reusable schema validation, and the base contract document validation response; compute keeps DTO decoding, `contract_error.v1` mapping, and draft confirmation response attachment around it. `apps/api/internal/platform/httpx` owns platform HTTP helpers that do not hold compute domain state:

- JSON response writing
- loopback-only local browser CORS

`apps/api/internal/platform/metrics` owns the metrics snapshot shape, read-only metrics collector over a narrow snapshot store, and Prometheus exposition text rendering. Compute still owns the concrete MemoryStore/PostgresStore count queries because they depend on metadata storage.

`apps/api/internal/domain/agent` owns stable `draft_confirmation.v1` envelope cross-field validation, stable draft confirmation record data projection, stable `constraint_application_plan.v1` advisory-only plan assembly, including no-job/no-target-mutation/external-production-approval flags and warnings, and stable `agent_scenario_draft.v1.proposed_request` extraction for explicit simulation-check promotion. `apps/api/internal/compute` uses it from `DraftWorkflowService.ConfirmDraftDocument`, `ConstraintApplicationPlan`, and `PromoteDraftConfirmationToSimulationCheck` while schema file lookup, JSON Schema validation, compute record mapping, confirmation lookup, approved/schema gating, stored payload decoding, JSON marshaling, simulation-check job creation, HTTP behavior, and persistence remain in the compatibility package.

Current draft confirmation delta: `domain/agent` also projects optional `site_id` from confirmation metadata, while compute keeps HTTP data-scope checks and selected audit persistence. `POST /contracts/confirm-draft` constrains scoped tokens to the confirmation payload tenant/project/site before persistence and writes compact `draft_confirmation.recorded` events in `mutation_audit_events` on first insert only; confirmation get, constraint plan, and promotion handlers constrain scoped tokens to stored tenant/project/site metadata.

`apps/api/internal/domain/artifacts` owns stable artifact retention policy constants, metadata parsing for `retention_policy` / `retain_until`, upload/archive metadata record projection, retention candidate policy checks, retention sweep action planning, and compact artifact/archive audit state projection. `apps/api/internal/compute` uses it from artifact upload, MemoryStore retention candidate selection, in-memory metrics candidate counting, retention sweep action selection, archive metadata record assembly, and selected artifact audit before/after state assembly while artifact object storage, archive execution, checksum verification, metadata persistence, audit envelopes/call sites/persistence decisions, hot object deletion, download fallback, and HTTP behavior remain in the compatibility package.

`apps/api/internal/domain/evidence` owns stable evidence package input reference extraction, evidence ref parsing, stored result summary risk projection, result explanation evidence ref extraction, result explanation record data projection, result explanation compact audit state projection, embedded simulation input payload lookup, evidence object-scope matching, `risk_findings` extraction/summary rules, and production-readiness policy evaluation. `apps/api/internal/compute` uses it from job completion stored summary persistence, evidence package export, result explanation submit validation and record assembly, result explanation submit/review/publish audit state assembly, evidence-ref resolution, process graph evidence lookup, and production-readiness response assembly while job completion persistence, store-backed evidence governance, source job / process graph record adapters, job-scoped model catalog selection, result explanation schema/job/evidence checks, compute `ResultExplanationRecord` mapping, persistence/review/publish mutations, selected audit envelope/call sites/persistence decisions, response DTOs, HTTP behavior, and approval boundaries remain in the compatibility package.

`apps/api/internal/domain/jobs` owns stable job status constants, terminal/worker-result status invariants, create idempotency duplicate/conflict decision, queued job create record projection / create-event plan, failed-worker fallback result construction, worker result completion status/error extraction, worker claim capability/contract-version matching, worker claim candidate ordering/running mutation planning, worker heartbeat lease refresh mutation planning, and cancel/timeout state lifecycle mutation planning. `apps/api/internal/compute` keeps compatibility aliases for status constants, projects MemoryStore/PostgresStore claim/heartbeat fields into this package, maps the idempotency decision to conflict/reused-snapshot behavior, maps queued job/event-plan data back into compute records, applies claim and heartbeat mutation plans inside MemoryStore/PostgresStore persistence, and adapts concrete job stores into `JobStateService` while payload hashing, store lookup/writes, queue scanning/locking, worker table updates, concrete state persistence, audit envelope assembly, snapshots, and HTTP behavior remain in the compatibility package.

`apps/api/internal/domain/models` owns stable built-in `model_catalog.v1` document shape, persisted model catalog snapshot record data projection, `benchmark_run.v1` record data projection, default parameter set status transition document mutation projection, compact model governance audit state projection, benchmark case schedule-run `compute_job.v1` document shape, `compute_result.v1.runtime_audit.model_runs` extraction/precheck, `model_run.v1` raw identity extraction, evidence ref extraction, warning extraction, parameter hash extraction, identity/hash comparison against benchmark expectations, `benchmark_run.v1` evidence ref extraction, benchmark case scheduling and benchmark run admission gates, single benchmark case promotion evidence/readiness projection, default parameter set status transition invariants, the pure default-parameter-set promotion gate, and the pure model-run production governance gate. `apps/api/internal/compute` uses it from built-in catalog fallback assembly, model catalog snapshot record projection after schema validation, benchmark run record projection after schema/catalog/model_run/evidence validation, default-parameter-set status transition document mutation after catalog selection/scope gating, model governance selected audit state assembly before envelope/persistence, benchmark case schedule-run job assembly after validation/input resolution, job completion, MemoryStore/PostgresStore persistence, evidence/simulation read paths, evidence governance production-allowed calculation, model catalog status workflow validation, benchmark schedule/record validation, and promotion planning while material-balance default parameter hash generation, typed catalog DTO conversion, model_run schema validation/raw persistence, catalog selection/scope gates, catalog store/audit persistence, selected audit envelope/call site/persistence decisions, persisted model catalog tenant/project/site read-scope filtering, evidence package job-scoped catalog selection, benchmark_run validation/orchestration/persistence/audit, benchmark schedule-run catalog lookup/gate/error mapping/execution profile lookup/simulation input resolution/createJob, benchmark query orchestration, model_run lookup, workflow DTOs, evidence package assembly, and HTTP response types remain in the compatibility package. Scoped tokens can read matching persisted catalog root/model/snapshot records and can call the default-parameter-set promotion plan or promote-approved only with an authorized `job_id`, which filters benchmark/model_run evidence to that job; evidence package / production-readiness governance also passes the source job scope into model catalog read selection.

`apps/api/internal/domain/simulation` owns stable simulation job type to execution profile / worker capability mapping, pure simulation check `compute_job.v1` document assembly, material-balance process graph validation/projection rules, and simulation input/process graph record data projection. `apps/api/internal/compute` uses it from simulation-check job creation, benchmark case scheduling, process graph registration validation, ProcessGraph-to-SimulationInput resolution, and simulation registry record assembly while simulation request schema validation, input_ref resolution, simulation input/process graph metadata persistence, compute record mapping, model catalog governance, and HTTP behavior remain in the compatibility package.

`apps/api/internal/domain/workers` owns worker register / claim / heartbeat request normalization and response assembly behind a minimal worker store interface. `apps/api/internal/compute` adapts the existing `WorkerStore` and job state projection into that package so HTTP routes and storage behavior stay unchanged.

`apps/api/internal/compute` may call these domain/platform packages, and domain packages may call platform helpers when they do not carry domain state. `internal/domain/*` must not import compute compatibility types, and `internal/platform/*` must not import either compute or domain packages. The boundary audit records internal Go package dirs and now fails on those reverse-import violations; it currently expects:

| Package Dir | Role |
|---|---|
| `compute` | Current compute domain package and compatibility wiring |
| `domain/agent` | draft confirmation envelope validation / record data projection, Agent draft proposed request extraction, and constraint draft advisory plan helpers |
| `domain/artifacts` | Artifact retention policy parsing, upload/archive metadata projection, compact audit state projection, candidate checks, and sweep action planning helpers |
| `domain/evidence` | Evidence input/ref/risk parsing, stored result summary risk projection, result explanation ref extraction / record data projection / compact audit state projection, object-scope matching, and readiness policy helpers |
| `domain/jobs` | Job status constants, create idempotency decision, queued job create projection, failed-worker fallback result construction, worker result completion extraction, worker claim matching, worker claim/heartbeat mutation planning, cancel/timeout state lifecycle service, and invariant helpers |
| `domain/models` | Built-in model catalog document helper, model catalog snapshot record data projection, benchmark run record data projection, default parameter set status transition document mutation projection, compact audit state projection, benchmark case run job document helper, compute result model_run extraction/precheck, `model_run.v1` identity/ref/warning parsing and identity-check helpers, `benchmark_run.v1` evidence ref helpers, benchmark workflow gates, benchmark case promotion evidence/readiness helper, parameter-set status invariants, promotion gate policy, and production governance gate |
| `domain/simulation` | Simulation job execution profile, worker capability, simulation-check job document, material-balance process graph projection, and simulation registry record data projection helpers |
| `domain/workers` | Worker register / claim / heartbeat domain package |
| `platform/audit` | Selected mutation audit envelope and event JSON helpers |
| `platform/auth` | Static bearer token authentication and platform auth errors |
| `platform/config` | Runtime configuration shape for command/deployment wiring |
| `platform/contracts` | Contract schema loading, schema_version mapping, JSON Schema validation, and base document validation response |
| `platform/httpx` | Platform HTTP helper package |
| `platform/metrics` | Metrics snapshot shape, read-only collector, and Prometheus renderer |

This is still an early domain package movement step, following the low-coupling platform auth, config, contracts, HTTP, and metrics helper movement. Remaining package movement includes full jobs lifecycle plus full artifact lifecycle, full model governance, full evidence governance, full simulation input/process graph metadata service movement, full agent draft workflow movement, and full result explanation workflow movement.
`scripts/check-deps.ps1` also enforces reverse-dependency rules so `apps/api/internal/domain` cannot import `apps/api/internal/compute`, and `apps/api/internal/platform` cannot import either `apps/api/internal/compute` or `apps/api/internal/domain`. The duplicated guard is intentional: `check-deps` protects the whole repository dependency graph, while the Compute API boundary audit keeps the compute/domain/platform package freeze visible in its own evidence JSON.

Selected files from the latest audit:

| File | Lines | Note |
|---|---:|---|
| `service_helpers.go` | 171 | shared compute helper functions used by compatibility services |
| `service_simulation.go` | 71 | simulation-check and simulation registry public delegates |
| `service.go` | 67 | `Service` struct and constructor wiring |
| `service_models.go` | 50 | model catalog, benchmark run, model run, and benchmark queue public delegates |
| `service_contracts.go` | 43 | contract validation, draft workflow, and result explanation public delegates |
| `service_jobs.go` | 35 | job lifecycle public delegates |
| `service_artifacts.go` | 22 | artifact lifecycle public delegates |
| `service_evidence.go` | 19 | evidence/readiness public delegates |
| `service_workers.go` | 15 | worker lifecycle public delegates |
| `service_metrics.go` | 7 | metrics public delegate |
| `model_governance_parameters.go` | 270 | default parameter set status workflow, promotion planning, and benchmark-backed promotion |
| `model_governance_benchmark_runs.go` | 137 | benchmark run register/read/list workflow and record validation |
| `model_governance_catalog.go` | 167 | model catalog snapshot register/read/list workflow, scoped read selection, and catalog record validation |
| `model_governance_benchmark_cases.go` | 97 | benchmark case schedule-run queueing workflow |
| `model_governance.go` | 37 | `ModelGovernanceService` struct and constructor wiring |
| `model_governance_model_runs.go` | 19 | model run read/list workflow |
| `evidence_governance_package.go` | 171 | evidence package export and store-backed governance view assembly |
| `evidence_governance_references.go` | 167 | evidence-ref resolution for model run, artifact, job, simulation input, process graph, and evidence package refs, including compute record adapters around domain evidence object-scope matching |
| `evidence_governance_readiness.go` | 95 | production readiness report assembly and schema validation |
| `evidence_governance.go` | 42 | `EvidenceGovernanceService` struct and constructor wiring |
| `evidence_governance_result.go` | 35 | result read workflow and snapshot assembly |
| `job_lifecycle_create.go` | 125 | job create adapter, idempotency store/error mapping, and job create/queue audit events |
| `job_lifecycle_completion.go` | 72 | worker complete/fail workflow, compute_result validation, stored summary projection, and model-run persistence |
| `job_lifecycle_read.go` | 48 | job get/list, events, and snapshot assembly |
| `job_lifecycle.go` | 27 | `JobLifecycleService` struct and constructor wiring |
| `job_lifecycle_state.go` | 15 | job cancel and timeout sweep workflow |
| `simulation_inputs_resolution.go` | 115 | input-ref resolution for inline simulation input, registered simulation input, process graph, and model-run replay |
| `simulation_inputs_process_graphs.go` | 90 | process graph registration/read, process graph record mapping, and material-balance ProcessGraph-to-SimulationInput orchestration |
| `simulation_inputs_registry.go` | 72 | simulation input registration/read and compute record mapping |
| `simulation_inputs_audit.go` | 89 | compact process_graph and simulation_input registration mutation audit construction |
| `simulation_inputs.go` | 33 | `SimulationInputService` struct and constructor wiring |
| `draft_workflows_confirmations.go` | 109 | draft confirmation validation, scope check, persistence, readback, and compute record mapping |
| `draft_workflows_audit.go` | 82 | compact draft confirmation mutation audit construction |
| `draft_workflows_constraints.go` | 43 | approved constraint draft advisory application plan workflow |
| `draft_workflows_promotion.go` | 43 | approved Agent draft explicit simulation-check promotion workflow |
| `draft_workflows.go` | 25 | `DraftWorkflowService` struct and constructor wiring |
| `artifact_lifecycle_retention.go` | 141 | retention sweep workflow and artifact retention delete audit event |
| `artifact_lifecycle_archive.go` | 99 | archive copy/checksum/delete flow and archive audit state |
| `artifact_lifecycle_upload.go` | 64 | worker artifact upload workflow, retention metadata parsing, and upload metadata record adapter |
| `artifact_lifecycle_read.go` | 44 | job artifact listing, metadata lookup, and download/archive fallback |
| `artifact_lifecycle.go` | 41 | `ArtifactLifecycleService` struct and constructor wiring |
| `result_explanations_submit.go` | 98 | result explanation submit, idempotent persistence, job/result availability checks, job-scoped evidence ref validation, and compute record mapping |
| `result_explanations.go` | 29 | `ResultExplanationService` struct and constructor wiring |
| `result_explanations_review.go` | 23 | result explanation review and publish workflow |
| `result_explanations_read.go` | 11 | result explanation read workflow |
| `worker_lifecycle.go` | 51 | adapter from compute worker/job records to the workers domain package |
| `metrics.go` | 7 | compatibility aliases for platform metrics collector |
| `contract_validation.go` | 15 | compatibility wrapper over platform contract document validation |
| `postgres_benchmark_runs.go` | 155 | PostgreSQL benchmark run register/read/list persistence, scan helper, select SQL, and list filter |
| `postgres_model_runs.go` | 134 | PostgreSQL model run insert/read/list/job-scoped lookup persistence and list filter |
| `postgres_model_catalog.go` | 133 | PostgreSQL model catalog snapshot upsert/latest/list persistence, scope filter, scan helper, and select SQL |
| `postgres_result_explanations.go` | 182 | PostgreSQL result explanation submit/read/review/publish persistence, scan helper, and select SQL |
| `postgres_draft_confirmations.go` | 88 | PostgreSQL draft confirmation upsert/read persistence, scan helper, and select SQL |
| `postgres_jobs.go` | 245 | PostgreSQL job/event persistence, list filtering, and lifecycle mutations |
| `postgres_artifacts.go` | 239 | PostgreSQL artifact metadata and archive metadata persistence |
| `postgres_simulation.go` | 157 | PostgreSQL process graph and simulation input persistence |
| `postgres_workers.go` | 110 | PostgreSQL worker register/claim/heartbeat persistence |
| `postgres.go` | 85 | PostgreSQL store entrypoint, open/close, and migration apply/check helpers |
| `postgres_metrics.go` | 58 | PostgreSQL metrics snapshot query |
| `postgres_sql_helpers.go` | 12 | shared PostgreSQL row scanner interface and nullable-string helper |
| `http_model_catalog.go` | 177 | model catalog root, scoped snapshot list, model lookup, and model-catalog subroute dispatch with declared-method guard |
| `http_benchmark_runs.go` | 118 | benchmark run register/read/list HTTP handlers/helpers and job-scoped read authorization |
| `http_model_parameters.go` | 74 | default parameter set status, promotion plan, and promote-approved HTTP handlers/helpers |
| `http_model_runs.go` | 95 | model run read/list HTTP handlers/helpers |
| `http_model_benchmark_cases.go` | 42 | benchmark case schedule-run HTTP handler/helper |
| `http_jobs.go` | 291 | compute job HTTP handlers, job subroutes, list filter, and job data-scope helper |
| `http_simulation.go` | 146 | simulation input, process graph, and simulation-check HTTP handlers/helpers |
| `http_workers.go` | 159 | worker register/claim/heartbeat/artifact/completion HTTP handlers/helpers |
| `http_contracts.go` | 148 | contract validation, draft confirmation, constraint plan, and promotion HTTP handlers |
| `http_artifacts.go` | 85 | artifact download and retention sweep HTTP handlers/helpers |
| `http_methods.go` | 13 | shared declared-method guard helper used before auth/service calls |
| `http.go` | 63 | server entrypoint, route registration, health/ready routes, and panic recovery |
| `http_metrics.go` | 20 | Prometheus metrics HTTP handler |
| `memory_model_runs.go` | 101 | in-memory model run insert/read/list/job-scoped lookup metadata store implementation |
| `memory_benchmark_runs.go` | 91 | in-memory benchmark run register/read/list metadata store implementation and clone helper |
| `memory_model_catalog.go` | 94 | in-memory model catalog snapshot upsert/latest/list metadata store implementation, scope filter, and clone helper |
| `memory_jobs.go` | 235 | in-memory job metadata store implementation and shared memory cursor/list helpers |
| `memory_artifacts.go` | 168 | in-memory artifact metadata and archive metadata store implementation |
| `memory_result_explanations.go` | 106 | in-memory result explanation submit/read/review/publish metadata store implementation and clone helper |
| `memory_draft_confirmations.go` | 34 | in-memory draft confirmation upsert/read metadata store implementation |
| `store_interfaces.go` | 125 | aggregate Store, domain metadata interfaces, and list filters |
| `memory_workers.go` | 84 | in-memory worker register/claim/heartbeat store implementation |
| `memory_simulation.go` | 69 | in-memory process graph and simulation input metadata store implementation |
| `memory_metrics.go` | 43 | in-memory metrics snapshot query |
| `memory_store.go` | 40 | MemoryStore struct and constructor |
| `service_contracts_test.go` | 93 | contract validation endpoint coverage |
| `service_contracts_confirmations_test.go` | 76 | draft confirmation persistence/read/idempotency coverage |
| `service_contracts_constraints_test.go` | 58 | constraint draft confirmation and advisory constraint application plan coverage |
| `service_contracts_promotion_test.go` | 59 | approved Agent draft promotion and promotion audit coverage |
| `service_contracts_scope_test.go` | 106 | draft confirmation read, constraint-plan, and promotion tenant/project/site scope coverage |
| `service_contracts_mutation_scope_test.go` | 70 | confirm-draft mutation tenant/project/site data-scope and no-write denial coverage |
| `service_contracts_http_helpers_test.go` | 39 | shared contracts endpoint HTTP and fixture helpers |
| `service_simulation_registry_test.go` | 61 | simulation registry tenant/project/site read-scope coverage |
| `service_simulation_registry_mutation_scope_test.go` | 61 | simulation registry mutation tenant/project/site scope coverage |
| `service_simulation_registry_audit_test.go` | 135 | simulation registry compact mutation audit coverage |
| `service_simulation_registry_http_helpers_test.go` | 37 | shared simulation registry HTTP helpers |
| `service_model_catalog_test.go` | 81 | built-in model catalog service and read endpoint coverage |
| `service_model_catalog_registration_test.go` | 65 | persisted model catalog registration/read/idempotency coverage |
| `service_model_catalog_status_test.go` | 115 | default parameter set status transition, snapshot pagination, and audit coverage |
| `service_model_catalog_http_helpers_test.go` | 39 | shared model catalog HTTP and fixture helpers |
| `service_model_catalog_scope_test.go` | 102 | model catalog persisted root/snapshot/model tenant/project/site read-scope coverage |
| `service_model_catalog_mutation_scope_test.go` | 91 | model catalog registration/status mutation tenant/project/site data-scope coverage |
| `service_model_catalog_promotion_scope_test.go` | 151 | model catalog promotion plan/promote-approved job-scoped tenant/project/site coverage |
| `service_job_scope_test.go` | 84 | job list/get tenant/project/site read-scope coverage |
| `service_job_method_test.go` | 59 | job route declared-method guard coverage for get/events/result/evidence/readiness/ref/cancel/result-explanations |
| `service_http_method_test.go` | 62 | API-wide declared-method guard coverage for non-job/non-worker routes before auth/service calls |
| `service_job_cancel_scope_test.go` | 95 | job cancel mutation tenant/project/site scope, no-write denial, and audit coverage |
| `service_job_create_scope_test.go` | 55 | job create mutation tenant/project/site scope and denied no-write coverage |
| `service_worker_registration_audit_test.go` | 61 | worker registration compact mutation audit coverage |
| `service_worker_method_test.go` | 113 | worker mutation route non-POST no-write method guard coverage |
| `service_worker_claim_filters_test.go` | 56 | worker claim capability and contract-version mismatch filter coverage |
| `service_worker_audit_test.go` | 36 | worker claim and heartbeat job-scoped audit coverage |
| `service_worker_audit_helpers_test.go` | 119 | worker job audit scenario, artifact upload, success result, event collection, and envelope assertion helpers |
| `service_worker_artifact_completion_audit_test.go` | 36 | worker artifact upload and succeed completion job-scoped audit coverage |
| `service_worker_failure_audit_test.go` | 83 | worker fail completion job-scoped audit coverage |
| `service_evidence_test.go` | 84 | production-readiness high-risk finding blocking coverage |
| `service_evidence_governance_scope_test.go` | 81 | evidence package and production-readiness job-scoped model catalog selection coverage |
| `service_evidence_process_graph_test.go` | 92 | process graph evidence-ref registration, completion, and resolution coverage |
| `service_evidence_process_graph_scope_test.go` | 94 | process graph evidence-ref source-job object-scope denial coverage |
| `service_evidence_references_test.go` | 63 | NewSystem result summary, evidence-ref, and production-readiness integration assertions |
| `service_evidence_references_helpers_test.go` | 165 | shared NewSystem process-graph simulation-check completion fixture and evidence-ref helpers |
| `service_evidence_references_explanation_test.go` | 24 | NewSystem result explanation submission with resolved evidence refs |
| `service_artifact_retention_archive_test.go` | 155 | artifact retention archive candidate skip/archive service coverage |
| `service_artifact_retention_http_test.go` | 113 | artifact retention HTTP admin scope, safe dry-run default, deletion report, and audit envelope coverage |
| `service_artifact_retention_http_scope_test.go` | 89 | artifact retention HTTP tenant/project/site data-scope coverage |
| `service_simulation_reference_test.go` | 145 | registered simulation input reference coverage for material-balance and ASM/UDM simulation-check jobs |
| `service_benchmark_runs_test.go` | 120 | benchmark run tenant/project/site read-scope coverage |
| `service_model_runs_helpers_test.go` | 119 | shared completed model-run integration scenario fixture |
| `service_benchmark_runs_mutation_scope_test.go` | 117 | benchmark run mutation tenant/project/site scope and no-write audit coverage |
| `service_model_parameters_promotion_test.go` | 117 | default parameter set promote-approved mutation, persistence, and audit coverage |
| `service_artifact_retention_test.go` | 104 | artifact retention TTL deletion, reference protection, and deletion audit coverage |
| `service_model_runs_evidence_test.go` | 100 | model run evidence package/readiness endpoint coverage |
| `service_model_parameters_helpers_test.go` | 87 | shared default parameter set promotion-plan/promote-approved fixtures |
| `service_result_explanation_scope_test.go` | 145 | result explanation submit/review/publish tenant/project/site mutation-scope coverage |
| `service_result_explanation_audit_helpers_test.go` | 102 | shared result explanation completed model-run audit scenario and envelope assertions |
| `service_result_explanation_audit_test.go` | 94 | result explanation submit idempotency audit and review/publish audit coverage |
| `service_result_explanation_model_run_test.go` | 77 | result explanation workflow coverage with model_run evidence refs |
| `service_model_parameters_test.go` | 45 | default parameter set advisory promotion-plan coverage |
| `service_simulation_process_graph_test.go` | 69 | process graph registration and simulation-check projection coverage |
| `service_simulation_test.go` | 62 | embedded simulation input create/idempotency/auth simulation-check coverage |
| `service_simulation_model_run_test.go` | 59 | model-run replay simulation-check coverage |
| `service_benchmark_runs_model_run_test.go` | 55 | benchmark run registration coverage backed by a completed model_run |
| `service_model_runs_test.go` | 52 | model run persistence, list filters, and result view coverage |
| `service_simulation_helpers_test.go` | 44 | simulation-check HTTP fixture helpers |
| `service_model_runs_http_test.go` | 28 | model run read/list endpoint coverage |
| `service_simulation_missing_refs_test.go` | 26 | missing simulation input/process graph/model run reference coverage |

These numbers are audit signals, not hard failure thresholds. The P0 Compute service-test split is structurally closed for the current large-file/security list: future splits should be driven by mixed responsibility or regression-triage risk, not by line count alone. Acceptable future split triggers are tests that still combine security/data-scope with happy path behavior, combine future performance hot paths such as job list/claim/worker heartbeat, risk dropping security-smoke coverage, or make a failure ambiguous across scope, audit, HTTP method, persistence, and DTO mapping concerns.

## Store Shape

The current aggregate `Store` embeds 13 domain metadata interfaces and resolves to 42 methods. The audit checks the embedded interfaces from `store_interfaces.go`, MemoryStore method coverage across `memory_*.go`, and PostgresStore method coverage across `postgres*.go`.

`ArtifactMetadataStore` is used for artifact metadata because `apps/api/internal/compute/artifacts.go` already defines the byte/object `ArtifactStore` abstraction.

The audit groups the resolved methods into these domains. `Service Calls` counts resolved `Store` method calls made through known aggregate or narrowed repository fields across non-test compute files excluding `store_interfaces.go`, `memory_*.go`, and `postgres*.go`; it records per-method source files in `tmp/architecture-evidence/compute-api-boundary.json`.

| Candidate Domain | Methods | Service Calls |
|---|---:|---:|
| `archive_metadata` | 2 | 2 |
| `artifacts` | 6 | 7 |
| `benchmark_runs` | 3 | 4 |
| `draft_confirmations` | 2 | 5 |
| `jobs` | 8 | 18 |
| `metrics` | 1 | 1 |
| `model_catalog` | 3 | 4 |
| `model_runs` | 4 | 9 |
| `process_graphs` | 2 | 5 |
| `result_explanations` | 4 | 5 |
| `simulation_inputs` | 2 | 7 |
| `workers` | 4 | 4 |

Both `MemoryStore` and `PostgresStore` currently implement all audited Store methods.

## Constructor Boundary

The audit records internal domain service constructor store-like parameters and enforces two guardrails:

- internal domain service constructors must not accept aggregate `Store`
- internal domain service constructors must expose at most 3 store-like constructor parameters

Current constructor counts:

| Constructor | Store-like Params | Notes |
|---|---:|---|
| `NewArtifactLifecycleService` | 2 | `ArtifactLifecycleStores` plus hot/archive object stores |
| `NewSimulationInputService` | 3 | simulation input, process graph, and model-run replay store roles |
| `NewDraftWorkflowService` | 1 | draft confirmation store |
| `NewResultExplanationService` | 2 | result explanation and job store roles |
| `NewModelGovernanceService` | 1 | `ModelGovernanceStores` |
| `NewWorkerLifecycleService` | 1 | worker store |
| `NewEvidenceGovernanceService` | 1 | `EvidenceGovernanceStores` |
| `NewJobLifecycleService` | 2 | job and model-run stores |
| `NewJobStateService` | 1 | domain jobs state store |
| `NewMetricsService` | 1 | metrics store |

`NewService` and `NewServiceWithArchive` remain package-level compatibility wiring while `internal/compute` is still one package.

## Service Boundary Progress

`ArtifactLifecycleService` is the first narrowed service-boundary slice and now covers the remaining artifact upload/listing paths. `artifact_lifecycle.go` keeps only the struct and constructor wiring; same-package workflow methods are grouped into `artifact_lifecycle_upload.go`, `artifact_lifecycle_read.go`, `artifact_lifecycle_retention.go`, and `artifact_lifecycle_archive.go`. Its constructor depends on:

- `ArtifactLifecycleStores` (`JobStore`, `ArtifactMetadataStore`, `ArchiveMetadataStore`)
- `ArtifactObjectStores` (hot artifact object storage and optional archive object storage)
- `ContractValidator`
- a clock

The public `Service.UploadArtifact`, `Service.DownloadArtifact`, and `Service.SweepArtifactRetention` methods remain stable and delegate to this narrower service. `Service` also uses it for job artifact listing and artifact evidence-ref metadata lookup. HTTP handlers, OpenAPI, auth scopes, contracts, database schema, and generated clients are unchanged.

`SimulationInputService` is the second narrowed slice. Its constructor depends on:

- `SimulationInputStore`
- `ProcessGraphStore`
- `ModelRunReplayStore` (`ModelRunStore` + `JobStore`)
- `ContractValidator`
- a clock

The public `Service.RegisterSimulationInput`, `Service.GetSimulationInput`, `Service.RegisterProcessGraph`, and `Service.GetProcessGraph` methods remain stable and delegate to this narrower service. `CreateSimulationCheck` and benchmark case scheduling also use `SimulationInputService.ResolveSimulationInput` for inline input, registered simulation input id, process graph id, and model run replay input references.

`simulation_inputs.go` now keeps only the service struct, replay store interface, and constructor wiring. Same-package workflow methods are grouped into `simulation_inputs_registry.go`, `simulation_inputs_process_graphs.go`, and `simulation_inputs_resolution.go`. Process graph and simulation input registry records now persist optional `site_id` alongside existing tenant/project metadata, expose it through OpenAPI/generated client record types, and enforce tenant/project/site read-scope on GET handlers. Auth scopes, contracts, store interfaces, process graph validation/projection behavior, idempotency, and model-run replay behavior are unchanged.

`DraftWorkflowService` is the third narrowed slice. Draft confirmation records now persist optional `site_id` alongside existing tenant/project metadata, expose it through OpenAPI/generated client record types, enforce tenant/project/site read-scope on confirmation read, constraint application plan, and promotion handlers, and write compact `draft_confirmation.recorded` audit events in `mutation_audit_events` only for first inserts. Its constructor depends on:

- `DraftConfirmationStore`
- `ContractValidator`
- a clock
- a simulation-check creation callback

The public `Service.ConfirmDraftDocument`, scoped `Service.ConfirmDraftDocumentForScope`, `Service.GetDraftConfirmation`, `Service.ConstraintApplicationPlan`, and `Service.PromoteDraftConfirmationToSimulationCheck` methods delegate to this narrower service. Promotion still reuses the existing simulation-check creation path after validating an approved Agent scenario draft.

`draft_workflows.go` now keeps only the service struct, constructor, store dependency, validator, clock, and simulation-check callback wiring. Same-package workflow methods are grouped into `draft_workflows_confirmations.go`, `draft_workflows_audit.go`, `draft_workflows_constraints.go`, and `draft_workflows_promotion.go`. Auth scopes, contracts, confirmation persistence/idempotency, advisory constraint plan behavior, and explicit promotion behavior are unchanged except for the scope checks and compact audit described above.

`apps/api/internal/domain/agent` owns stable draft confirmation / Agent / constraint draft helpers:

- `ValidateDraftConfirmationEnvelope`
- `DraftConfirmationRecordDataFromDocument`
- `ConstraintApplicationPlanFromDraft`
- `ConstraintApplicationPlan`
- `ProposedSimulationRequestFromDraft`

Compute uses this package for draft confirmation envelope cross-field validation before compute applies schema file lookup and embedded draft JSON Schema validation, for draft confirmation record data projection before compute maps into `DraftConfirmationRecord` and persists it, for advisory constraint application plan assembly after it loads an approved `constraint_draft.v1` confirmation and applies schema validation, and for proposed simulation request extraction after it loads an approved `agent_scenario_draft.v1` confirmation. Draft confirmation compute DTO mapping/persistence, schema file lookup, JSON Schema validation, JSON marshaling, simulation-check job creation, HTTP mapping/data-scope checks, selected audit call sites, and store access have not moved yet.

`ResultExplanationService` is the fourth narrowed slice. Its constructor depends on:

- `ResultExplanationStore`
- `JobStore`
- `ContractValidator`
- a clock
- an evidence reference resolver callback

The public `Service.SubmitResultExplanation`, `Service.GetResultExplanation`, `Service.ReviewResultExplanation`, and `Service.PublishResultExplanation` methods remain stable and delegate to this narrower service. Evidence refs are still resolved through the existing job-scoped evidence boundary.

`result_explanations.go` now keeps only the service struct, constructor, store dependency, validator, clock, and evidence resolver callback wiring. Same-package workflow methods are grouped into `result_explanations_submit.go`, `result_explanations_read.go`, and `result_explanations_review.go`. HTTP handlers, OpenAPI, auth scopes, contracts, database schema, generated clients, store interfaces, result explanation persistence/idempotency, review/publish behavior, and job-scoped evidence validation behavior are unchanged.

`ModelGovernanceService` is the fifth narrowed slice. It now also builds compact selected mutation audit records for non-job-scoped model governance writes using `domain/models` compact audit state projection; those records are persisted by the concrete `ModelCatalogStore` / `BenchmarkRunStore` upsert transactions and read through `MutationAuditStore`. Its constructor depends on:

- `ModelGovernanceStores` (`ModelCatalogStore`, `BenchmarkRunStore`, `ModelRunStore`)
- `ContractValidator`
- a clock
- a simulation input resolver callback
- a compute-job creation callback
- an evidence reference resolver callback

The public `Service.RegisterModelCatalog`, `Service.ModelCatalog`, `Service.ModelCatalogModel`, `Service.ListModelCatalogSnapshots`, `Service.UpdateDefaultParameterSetStatus`, `Service.DefaultParameterSetPromotionPlan`, `Service.PromoteDefaultParameterSetToApproved`, `Service.ScheduleBenchmarkCaseRun`, `Service.RegisterBenchmarkRun`, `Service.GetBenchmarkRun`, `Service.ListBenchmarkRuns`, `Service.GetModelRun`, and `Service.ListModelRuns` methods remain stable and delegate to this narrower service. Benchmark case scheduling still resolves simulation inputs through `SimulationInputService`, job creation through the existing compute-job path, and benchmark run evidence refs through the existing job-scoped evidence boundary.

`apps/api/internal/domain/artifacts` owns stable artifact retention plus upload/archive metadata and compact audit state projection helpers:

- `RetentionFromMetadata`
- `IsRetentionCandidate`
- `EvaluateRetentionAction`
- `DefaultArtifactContentType`
- `ArtifactRecordInput`
- `ArtifactRecord`
- `NewArtifactRecord`
- `ArchiveStatusArchived`
- `ArchiveRecordInput`
- `ArchiveRecord`
- `NewArchiveRecord`
- `ArtifactAuditStateInput`
- `ArchiveAuditStateInput`
- `ArtifactAuditState`
- `ArchiveAuditState`
- `PolicyRetainForever`
- `PolicyTTL`
- `PolicyArchiveCandidate`

Compute uses this package through upload metadata parsing, upload/archive metadata record assembly, MemoryStore retention/metrics candidate checks, retention sweep action selection, and worker artifact upload / retention delete / archive audit state assembly; full artifact lifecycle persistence, archive execution, checksum verification, audit envelopes/call sites/persistence decisions, object-store abstractions, hot object deletion, download fallback, and HTTP mapping have not moved yet.

`apps/api/internal/domain/evidence` owns stable evidence input/ref/risk parsing, stored result summary risk projection, result explanation evidence ref extraction, result explanation record data projection, result explanation compact audit state projection, object-scope matching, and readiness policy evaluation:

- `InputRefs`
- `ParseRef`
- `SimulationInputPayload`
- `StoredResultSummary`
- `RiskFindingsFromSummary`
- `RiskFindingEvidenceRefs`
- `ResultExplanationEvidenceRefs`
- `ResultExplanationRecordDataFromDocument`
- `ResultExplanationAuditStateInput`
- `ResultExplanationAuditState`
- `ObjectScope`
- `ObjectScopeFromMetadata`
- `PayloadScopeMatchesSource`
- `ObjectScopeMatchesSource`
- `SummarizeRiskFindings`
- `EvaluateProductionReadiness`

Compute uses this package through job completion stored summary persistence, evidence package export, result explanation submit validation, neutral record data projection, submit/review/publish audit state assembly, evidence-ref resolution, process graph evidence lookup, source job object-scope matching, and production-readiness policy evaluation; job completion persistence, store-backed evidence governance, result explanation schema validation, job/result availability checks, evidence resolution, compute record mapping, persistence/review/publish mutations, selected audit envelopes/call sites/persistence decisions, evidence package response assembly, production-readiness DTO mapping, job-scoped model catalog callbacks, source job / process graph record adapters for evidence-ref dereference, artifact/model-run/process-graph metadata reads, and HTTP mapping have not moved yet.

`apps/api/internal/domain/jobs` owns stable job status constants, create idempotency duplicate/conflict decision, queued job create record projection / create-event plan, failed-worker fallback result construction, worker result completion extraction, status invariant helpers, worker claim matching, worker claim candidate ordering / running mutation planning, worker heartbeat lease refresh mutation planning, and cancel/timeout state lifecycle:

- `IsTerminal`
- `IsWorkerResultStatus`
- `FailedWorkerComputeResult`
- `WorkerResultCompletionFromResult`
- `CreateIdempotencyRecord`
- `CreateIdempotencyDecision`
- `DecideCreateIdempotency`
- `StateMutation`
- `StateRecord`
- `JobStateStore`
- `JobStateService`
- `NewJobStateService`
- `CancelMutation`
- `TimeoutMutation`
- `MatchesWorker`
- `RequiredCapabilities`
- `ContractVersions`
- `TimeoutErrorCode`
- `TimeoutErrorMessage`
- `EventJobCancelled`
- `EventJobTimedOut`

Compute uses this package through compatibility constants, create idempotency decisions adapted by `job_lifecycle_create.go`, queued job create projection/event plans adapted by `job_lifecycle_create.go`, worker-reported failure fallback result construction, worker result completion interpretation in job completion, helper/projection calls from MemoryStore/PostgresStore claim paths, and cancel/timeout state lifecycle delegation through `jobStateStoreAdapter`; full job lifecycle persistence, payload hashing, idempotency store lookup/error mapping, audit envelope assembly, and HTTP mapping have not moved yet.

`apps/api/internal/domain/models` owns stable built-in model catalog document shape, model catalog snapshot record data projection, benchmark run record data projection, default parameter set status transition document mutation projection, compact model governance audit state projection, benchmark case run job document shape, compute result model_run extraction/precheck, `model_run.v1` / `benchmark_run.v1` raw parsing, model-run identity checks, benchmark workflow gates, single benchmark case promotion evidence/readiness, parameter-set status invariants, default-parameter-set promotion gate policy, and model-run production governance gate policy:

- `BuiltInModelCatalogDocument`
- `ModelCatalogSnapshotRecordDataFromDocument`
- `BenchmarkRunRecordDataFromDocument`
- `ApplyDefaultParameterSetStatusTransition`
- `BuildBenchmarkCaseRunJobDocument`
- `BenchmarkCaseRunJobDocument`
- `BenchmarkCaseRunJobDocumentInput`
- `ModelRunDocumentsFromComputeResult`
- `RunIDFromRaw`
- `RunIdentityFromRaw`
- `CheckRunIdentity`
- `RunFieldsFromRaw`
- `RunEvidenceRefsFromRaw`
- `RunWarningsFromRaw`
- `BenchmarkRunEvidenceRefs`
- `BenchmarkRunEvidenceRefsFromRaw`
- `EvaluateBenchmarkCaseRunGate`
- `EvaluateBenchmarkRunAdmission`
- `IsParameterSetStatus`
- `CanTransitionParameterSetStatus`
- `EvaluateParameterSetPromotionGate`
- `EvaluateModelRunProductionGate`

Compute uses this package through built-in model catalog fallback document assembly, benchmark case schedule-run job document assembly after catalog/gate/execution/input validation, job completion model_run extraction before schema validation/persistence, MemoryStore/PostgresStore model-run persistence, evidence/simulation read paths, evidence governance production-allowed calculation, default-parameter-set status transition validation and document mutation projection, benchmark case schedule-run gate checks, benchmark run admission checks, benchmark run evidence-ref validation, benchmark run model-run identity/hash validation, promotion planning per-case evidence/readiness projection, and final promotion gate evaluation; material-balance default parameter hash generation, typed catalog DTO conversion, full job lifecycle persistence, full model catalog governance, catalog selection/scope gates, catalog snapshot persistence/audit, evidence package job-scoped catalog selection, benchmark schedule-run catalog lookup/gate/error mapping/execution profile lookup/simulation input resolution/JSON marshaling/createJob, benchmark run persistence workflow, benchmark query orchestration and job-scoped read authorization, model_run store lookup, promotion workflow orchestration, promotion plan DTO mapping, evidence package assembly, HTTP mapping, and DTOs have not moved yet.

`apps/api/internal/domain/simulation` owns stable simulation execution profile, simulation check document, process graph, and simulation registry record data helpers:

- `ExecutionProfile`
- `RequiredCapabilities`
- `IsSupportedJobType`
- `BuildSimulationCheckJobDocument`
- `ValidateProcessGraphForSimulationInput`
- `ProcessGraphToSimulationInput`
- `ProcessGraphRecordDataFromDocument`
- `SimulationInputRecordDataFromDocument`

Compute uses this package from simulation-check creation, benchmark case scheduling, process graph registration validation, material-balance ProcessGraph-to-SimulationInput resolution, and neutral simulation input/process graph record data projection before mapping into compute metadata records. Simulation request schema validation, input_ref resolution, simulation input/process graph metadata persistence, compute record mapping, job persistence/idempotency execution, store implementation, evidence-ref lookup, and HTTP mapping have not moved yet.

`WorkerLifecycleService` is the sixth narrowed slice and a moved domain package under `apps/api/internal/domain/workers`. Its constructor depends on:

- a minimal workers `WorkerStore` implemented by `compute.workerStoreAdapter`
- a clock

The public `Service.RegisterWorker`, `Service.Claim`, and `Service.Heartbeat` methods remain stable and delegate to this domain service. Artifact upload, job completion, and job failure remain outside this worker boundary because they depend on current job/artifact lifecycle rules.

`EvidenceGovernanceService` is the seventh narrowed slice. Its constructor depends on:

- `EvidenceGovernanceStores` (`JobStore`, `ModelRunStore`, `ProcessGraphStore`)
- `ContractValidator`
- a clock
- a model catalog resolver callback that accepts `ModelCatalogSnapshotFilter` so evidence package / production-readiness can select the source job scope
- an artifact listing callback
- an artifact metadata callback

The public `Service.Result`, `Service.EvidencePackage`, `Service.ProductionReadiness`, and `Service.ResolveEvidenceReference` methods remain stable and delegate to this narrower service. The service is read-only: it builds evidence and readiness views from existing job, model run, process graph, artifact, and catalog metadata without mutating jobs, artifacts, catalog snapshots, or approval state.

`JobLifecycleService` is the eighth narrowed slice. Its constructor depends on:

- `JobStore`
- `ModelRunStore`
- `ContractValidator`
- a clock
- an artifact listing callback

The public `Service.CreateJob`, `Service.GetJob`, `Service.ListJobs`, `Service.Events`, `Service.CancelJob`, `Service.Complete`, `Service.Fail`, and `Service.TimeoutSweep` methods remain stable and delegate to this narrower service. The service owns job mutation, completion summaries, timeout sweeps, and persisted model-run extraction; artifact object writes and evidence package generation stay in their existing boundaries.

`job_lifecycle.go` now keeps only the service struct, constructor, store dependencies, validator, clock, artifact-listing callback wiring, and the `domain/jobs.JobStateService` dependency. Same-package workflow methods are grouped into `job_lifecycle_create.go`, `job_lifecycle_read.go`, `job_lifecycle_state.go`, and `job_lifecycle_completion.go`; `job_lifecycle_create.go` adapts `domain/jobs` create idempotency decision plus queued job projection / create event plans into compute behavior and records, and `job_lifecycle_state.go` is the compute adapter/snapshot layer for domain jobs state lifecycle. HTTP handlers, OpenAPI, auth scopes, contracts, database schema, generated clients, store interfaces, job idempotency/audit envelope shape, worker stale checks, result persistence, model-run persistence, timeout behavior, and snapshot assembly are unchanged.

`MetricsService` is the ninth narrowed slice and now lives in `apps/api/internal/platform/metrics`. Its constructor depends on:

- a `platform/metrics.SnapshotStore` implemented by compute `MetricsStore`
- a clock

The public `Service.Metrics` method remains stable and delegates to this platform service. The service is read-only and must not trigger retention sweep, timeout sweep, job mutation, artifact mutation, or archive mutation. Concrete metadata count queries remain in compute `MemoryStore` / `PostgresStore`.

## Recommended Next Split Order

Recommended order for narrowing service boundaries and later file/package movement:

1. `artifacts` + `archive_metadata`
2. `simulation_inputs` + `process_graphs`
3. `draft_confirmations` + `result_explanations`
4. `model_catalog` + `benchmark_runs` + `model_runs`
5. `workers`
6. `evidence governance`
7. `jobs`
8. `metrics`

This order starts with domains that have clear data ownership and smaller method groups before touching core job lifecycle behavior. All eight listed split groups have begun; they are currently implemented through `ArtifactLifecycleService`, `SimulationInputService`, `DraftWorkflowService`, `ResultExplanationService`, `ModelGovernanceService`, `domain/workers.WorkerLifecycleService`, `EvidenceGovernanceService`, `JobLifecycleService`, and `platform/metrics.MetricsService`. Job lifecycle status/result/model-run helpers and same-package job lifecycle workflow grouping have joined `domain/jobs` / job service boundary work; draft confirmation envelope validation, draft confirmation record data projection, constraint application plan assembly, proposed simulation request extraction, and same-package draft workflow grouping have joined `domain/agent` / draft service boundary work; result explanation ref extraction, record data projection, compact audit state projection, and same-package result explanation workflow grouping have joined `domain/evidence` / result explanation service boundary work; artifact upload/listing, retention workflow file grouping, retention action planning, upload metadata projection, archive metadata projection, and compact audit state projection have joined the artifact boundary; evidence input/ref/risk parsing plus stored result summary risk projection, object-scope matching, and production-readiness policy evaluation has joined `domain/evidence`; create idempotency decision, queued job create projection / create event plans, failed-worker fallback result construction, worker result completion, claim matching, worker claim candidate ordering / running mutation planning, and heartbeat lease refresh mutation planning have joined `domain/jobs`; built-in model catalog document shape, model catalog snapshot record data projection, benchmark run record data projection, default parameter set status transition document mutation projection, compact audit state projection, benchmark case run job document shape, compute result model_run extraction/precheck, model-run parsing plus identity/hash checking, benchmark-run evidence ref parsing, benchmark workflow gates, benchmark case promotion evidence/readiness, parameter-set status transition invariants, promotion gate policy, and model-run production governance gate have joined `domain/models`; and simulation execution, simulation check job document assembly, material-balance process graph projection helpers, simulation registry record data projection, and same-package simulation input/process graph workflow grouping have joined `domain/simulation` / simulation service boundary work. Internal domain/platform service constructors are now audited for aggregate `Store` leaks and over-wide store-like parameter lists. The first platform package movement is underway through `platform/audit`, `platform/auth`, `platform/config`, `platform/contracts`, `platform/httpx`, and `platform/metrics`; domain package movement is underway through `domain/agent`, `domain/artifacts`, `domain/evidence`, `domain/jobs`, `domain/models`, `domain/simulation`, and `domain/workers`. Remaining near-term work is additional domain package movement, handler/package surface reduction, and eventually public `Service` constructor signature narrowing.

## Split Rules

Future service-boundary and package splitting should follow these rules:

- Introduce narrow interfaces at service boundaries before moving implementation files.
- Keep `MemoryStore` and `PostgresStore` behavior covered by existing tests after every step.
- Do not split PostgreSQL migrations away from the implementation until migration smoke coverage remains obvious.
- Do not make HTTP handlers depend on concrete persistence types.
- Do not use package splitting to change endpoint behavior, OpenAPI, auth scopes, or contract semantics.

## Current Non-Goals

- `NewService` / `NewServiceWithArchive` still accept the aggregate `Store` for backward-compatible construction; narrowed internal services receive domain interfaces but are still wired from the aggregate in this package.
- This split has moved platform audit envelope, auth, config, contract validation/document response, HTTP, and metrics helpers/collector into platform packages, draft confirmation envelope validation, draft confirmation record data projection, constraint application advisory plan assembly, and Agent draft proposed request extraction into `domain/agent`, artifact retention policy helpers, sweep action planner, upload/archive metadata projection, and compact audit state projection into `domain/artifacts`, evidence input/ref/risk parsing, stored result summary risk projection, result explanation evidence ref extraction, result explanation record data projection, result explanation compact audit state projection, object-scope matching, and readiness policy evaluation into `domain/evidence`, job status plus create idempotency decision, queued job create projection / create event plans, failed-worker fallback result construction, worker result completion, claim matching invariants, worker claim mutation planning, and heartbeat lease refresh mutation planning into `domain/jobs`, built-in model catalog document shape, model catalog snapshot record data projection, benchmark run record data projection, default parameter set status transition document mutation projection, compact audit state projection, benchmark case run job document shape, compute result model_run extraction/precheck, `model_run.v1` raw parsing, identity/hash checking, `benchmark_run.v1` evidence ref parsing, benchmark workflow gates, benchmark case promotion evidence/readiness, parameter-set status invariants, promotion gate policy, and production governance gate into `domain/models`, simulation execution profile, simulation check job document assembly, and material-balance process graph projection helpers into `domain/simulation`, and worker register/claim/heartbeat into `domain/workers`. Most compute domain files have not moved into domain packages yet.
- This split keeps endpoint paths, OpenAPI, auth scopes, contracts, database schema, PostgreSQL migrations, model/evidence governance public service methods, and public `Service` method signatures stable; evidence governance model catalog resolution is now job-scoped for scoped jobs instead of always using the latest unscoped/global catalog, and process graph evidence-ref dereference now rejects stored objects whose tenant/project/site conflicts with the source job.

## Verification

Before and after any Store split, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1
cd apps\api; go test ./...
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1
```
