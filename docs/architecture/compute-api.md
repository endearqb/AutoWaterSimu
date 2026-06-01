# AutoWaterSimu Next Compute API Architecture

> Snapshot date: 2026-06-01.

This document records the current Go Compute API boundary after the first Store/interface split, the current service-constructor narrowing slices, the first platform helper package movement, and the first artifacts/evidence/jobs/models/simulation/workers domain package movement. It is based on `apps/api/README.md`, `apps/api/internal/compute/README.md`, `apps/api/internal/domain/README.md`, `apps/api/internal/platform/README.md`, and the read-only audit script:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1
```

The script writes evidence to `tmp/architecture-evidence/compute-api-boundary.json`.

## Current Shape

The Compute API domain is still mostly wired through the modular-monolith compatibility package under `apps/api/internal/compute`. The first artifacts/evidence/jobs/models/simulation/workers domain packages now live under `apps/api/internal/domain`, and the first non-domain platform packages, including contract schema validation, live under `apps/api/internal/platform`.

The aggregate `Store` is expressed as embedded domain metadata interfaces. Job create/list/read/events, cancel, complete/fail, and timeout logic now lives behind `JobLifecycleService`; artifact upload / listing / metadata lookup / download / retention / archive logic now lives behind `ArtifactLifecycleService`; worker register / claim / heartbeat now lives behind `WorkerLifecycleService`; simulation input registration, process graph registration, and `simulation_request.input_ref` resolution now live behind `SimulationInputService`; draft confirmation / promotion workflows now live behind `DraftWorkflowService`; result explanation submit/review/publish now lives behind `ResultExplanationService`; model catalog, benchmark run, model run lookup, promotion planning, and benchmark case queueing now live behind `ModelGovernanceService`; result read, evidence package export, production readiness, and evidence-ref resolution now live behind `EvidenceGovernanceService`; metrics snapshot reads now live behind `MetricsService`. Internal domain service constructors now expose 1-3 store-like parameters and the audit fails if they accept the aggregate `Store`.

The wider `Service` still owns package-level construction and compatibility delegates, so this is not yet a full domain package split.

## Package Boundary

`apps/api/internal/platform/auth` owns static bearer token config parsing, principal parsing, scope/revocation checks, and platform auth errors. Compute maps those errors back to `contract_error.v1` responses. `apps/api/internal/platform/config` owns the command/runtime `Config` shape used by `cmd/compute-api` for environment-derived wiring. `apps/api/internal/platform/contracts` owns JSON Schema loading, schema_version-to-file mapping, reusable schema validation, and the base contract document validation response; compute keeps DTO decoding, `contract_error.v1` mapping, and draft confirmation response attachment around it. `apps/api/internal/platform/httpx` owns platform HTTP helpers that do not hold compute domain state:

- JSON response writing
- loopback-only local browser CORS

`apps/api/internal/platform/metrics` owns the metrics snapshot shape, read-only metrics collector over a narrow snapshot store, and Prometheus exposition text rendering. Compute still owns the concrete MemoryStore/PostgresStore count queries because they depend on metadata storage.

`apps/api/internal/domain/artifacts` owns stable artifact retention policy constants, metadata parsing for `retention_policy` / `retain_until`, retention candidate policy checks, and retention sweep action planning. `apps/api/internal/compute` uses it from artifact upload, MemoryStore retention candidate selection, in-memory metrics candidate counting, and retention sweep action selection while artifact object storage, archive execution, metadata persistence, audit envelopes, and HTTP behavior remain in the compatibility package.

`apps/api/internal/domain/evidence` owns stable evidence package input reference extraction, evidence ref parsing, stored result summary risk projection, result explanation evidence ref extraction, embedded simulation input payload lookup, `risk_findings` extraction/summary rules, and production-readiness policy evaluation. `apps/api/internal/compute` uses it from job completion stored summary persistence, evidence package export, result explanation submit validation, evidence-ref resolution, process graph evidence lookup, and production-readiness response assembly while job completion persistence, store-backed evidence governance, response DTOs, HTTP behavior, and approval boundaries remain in the compatibility package.

`apps/api/internal/domain/jobs` owns stable job status constants, terminal/worker-result status invariants, and worker claim capability/contract-version matching. `apps/api/internal/compute` keeps compatibility aliases for status constants and projects MemoryStore/PostgresStore claim fields into this package while job records, store interfaces, lifecycle persistence, audit envelopes, and HTTP behavior remain in the compatibility package.

`apps/api/internal/domain/models` owns stable `compute_result.v1.runtime_audit.model_runs` extraction/precheck, `model_run.v1` raw identity extraction, evidence ref extraction, warning extraction, parameter hash extraction, identity/hash comparison against benchmark expectations, `benchmark_run.v1` evidence ref extraction, benchmark case scheduling and benchmark run admission gates, single benchmark case promotion readiness, default parameter set status transition invariants, the pure default-parameter-set promotion gate, and the pure model-run production governance gate. `apps/api/internal/compute` uses it from job completion, MemoryStore/PostgresStore persistence, evidence/simulation read paths, evidence governance production-allowed calculation, model catalog status workflow validation, benchmark schedule/record validation, and promotion planning while model_run schema validation/raw persistence, catalog snapshot mutation, benchmark query orchestration, workflow DTOs, evidence package assembly, and HTTP response types remain in the compatibility package.

`apps/api/internal/domain/simulation` owns stable simulation job type to execution profile / worker capability mapping plus material-balance process graph validation/projection rules. `apps/api/internal/compute` uses it from simulation-check job creation, benchmark case scheduling, process graph registration validation, and ProcessGraph-to-SimulationInput resolution while simulation input/process graph metadata persistence, model catalog governance, and HTTP behavior remain in the compatibility package.

`apps/api/internal/domain/workers` owns worker register / claim / heartbeat request normalization and response assembly behind a minimal worker store interface. `apps/api/internal/compute` adapts the existing `WorkerStore` and job state projection into that package so HTTP routes and storage behavior stay unchanged.

`apps/api/internal/compute` may call these domain/platform packages, but `internal/domain/*` and `internal/platform/*` must not import compute compatibility types. The boundary audit records internal Go package dirs and currently expects:

| Package Dir | Role |
|---|---|
| `compute` | Current compute domain package and compatibility wiring |
| `domain/artifacts` | Artifact retention policy parsing, candidate checks, and sweep action planning helpers |
| `domain/evidence` | Evidence input/ref/risk parsing, stored result summary risk projection, result explanation ref extraction, and readiness policy helpers |
| `domain/jobs` | Job status constants, worker claim matching, and invariant helpers |
| `domain/models` | Compute result model_run extraction/precheck, `model_run.v1` identity/ref/warning parsing and identity-check helpers, `benchmark_run.v1` evidence ref helpers, benchmark workflow gates, benchmark case readiness helper, parameter-set status invariants, promotion gate policy, and production governance gate |
| `domain/simulation` | Simulation job execution profile, worker capability, and material-balance process graph projection helpers |
| `domain/workers` | Worker register / claim / heartbeat domain package |
| `platform/auth` | Static bearer token authentication and platform auth errors |
| `platform/config` | Runtime configuration shape for command/deployment wiring |
| `platform/contracts` | Contract schema loading, schema_version mapping, JSON Schema validation, and base document validation response |
| `platform/httpx` | Platform HTTP helper package |
| `platform/metrics` | Metrics snapshot shape, read-only collector, and Prometheus renderer |

This is still an early domain package movement step, following the low-coupling platform auth, config, contracts, HTTP, and metrics helper movement. Remaining package movement includes full jobs lifecycle plus full artifact lifecycle, full model governance, full evidence governance, full simulation input/process graph metadata service movement, and agent.
`scripts/check-deps.ps1` enforces reverse-dependency rules so `apps/api/internal/platform` and `apps/api/internal/domain` cannot import `apps/api/internal/compute`.

Selected files from the latest audit:

| File | Lines | Note |
|---|---:|---|
| `service.go` | 695 | orchestration and compatibility delegates |
| `model_governance.go` | 659 | model catalog, benchmark run, model run lookup, promotion planning, and benchmark case queueing |
| `evidence_governance.go` | 474 | result read, evidence package export, production readiness, and evidence-ref resolution |
| `job_lifecycle.go` | 251 | job create/list/read/events, cancel, complete/fail, timeout sweep, and model-run persistence |
| `simulation_inputs.go` | 289 | simulation input registry, process graph registry, and input-ref resolution |
| `draft_workflows.go` | 254 | draft confirmation validation, advisory constraint plans, and explicit simulation-check promotion |
| `artifact_lifecycle.go` | 369 | artifact upload, listing, metadata lookup, download, retention sweep, archive copy/checksum/delete flow |
| `result_explanations.go` | 175 | result explanation submit/review/publish and job-scoped evidence ref validation |
| `worker_lifecycle.go` | 51 | adapter from compute worker/job records to the workers domain package |
| `metrics.go` | 7 | compatibility aliases for platform metrics collector |
| `contract_validation.go` | 15 | compatibility wrapper over platform contract document validation |
| `postgres.go` | 1489 | PostgreSQL store implementation and migrations smoke helpers |
| `http.go` | 1088 | route handlers and HTTP mapping |
| `store.go` | 1088 | aggregate Store, domain metadata interfaces, and MemoryStore implementation |
| `service_test.go` | 3134 | broad lifecycle and governance tests |

These numbers are audit signals, not hard failure thresholds.

## Store Shape

The current aggregate `Store` embeds 12 domain metadata interfaces and resolves to 41 methods. The audit checks both the embedded interfaces and MemoryStore/PostgresStore implementation coverage.

`ArtifactMetadataStore` is used for artifact metadata because `apps/api/internal/compute/artifacts.go` already defines the byte/object `ArtifactStore` abstraction.

The audit groups the resolved methods into these domains. `Service Calls` counts resolved `Store` method calls made through known aggregate or narrowed repository fields across non-test compute files excluding `store.go` and `postgres.go`; it records per-method source files in `tmp/architecture-evidence/compute-api-boundary.json`.

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
| `NewMetricsService` | 1 | metrics store |

`NewService` and `NewServiceWithArchive` remain package-level compatibility wiring while `internal/compute` is still one package.

## Service Boundary Progress

`ArtifactLifecycleService` is the first narrowed service-boundary slice and now covers the remaining artifact upload/listing paths. Its constructor depends on:

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

`DraftWorkflowService` is the third narrowed slice. Its constructor depends on:

- `DraftConfirmationStore`
- `ContractValidator`
- a clock
- a simulation-check creation callback

The public `Service.ConfirmDraftDocument`, `Service.GetDraftConfirmation`, `Service.ConstraintApplicationPlan`, and `Service.PromoteDraftConfirmationToSimulationCheck` methods remain stable and delegate to this narrower service. Promotion still reuses the existing simulation-check creation path after validating an approved Agent scenario draft.

`ResultExplanationService` is the fourth narrowed slice. Its constructor depends on:

- `ResultExplanationStore`
- `JobStore`
- `ContractValidator`
- a clock
- an evidence reference resolver callback

The public `Service.SubmitResultExplanation`, `Service.GetResultExplanation`, `Service.ReviewResultExplanation`, and `Service.PublishResultExplanation` methods remain stable and delegate to this narrower service. Evidence refs are still resolved through the existing job-scoped evidence boundary.

`ModelGovernanceService` is the fifth narrowed slice. Its constructor depends on:

- `ModelGovernanceStores` (`ModelCatalogStore`, `BenchmarkRunStore`, `ModelRunStore`)
- `ContractValidator`
- a clock
- a simulation input resolver callback
- a compute-job creation callback
- an evidence reference resolver callback

The public `Service.RegisterModelCatalog`, `Service.ModelCatalog`, `Service.ModelCatalogModel`, `Service.ListModelCatalogSnapshots`, `Service.UpdateDefaultParameterSetStatus`, `Service.DefaultParameterSetPromotionPlan`, `Service.PromoteDefaultParameterSetToApproved`, `Service.ScheduleBenchmarkCaseRun`, `Service.RegisterBenchmarkRun`, `Service.GetBenchmarkRun`, `Service.ListBenchmarkRuns`, `Service.GetModelRun`, and `Service.ListModelRuns` methods remain stable and delegate to this narrower service. Benchmark case scheduling still resolves simulation inputs through `SimulationInputService`, job creation through the existing compute-job path, and benchmark run evidence refs through the existing job-scoped evidence boundary.

`apps/api/internal/domain/artifacts` owns stable artifact retention helpers:

- `RetentionFromMetadata`
- `IsRetentionCandidate`
- `EvaluateRetentionAction`
- `PolicyRetainForever`
- `PolicyTTL`
- `PolicyArchiveCandidate`

Compute uses this package through upload metadata parsing, MemoryStore retention/metrics candidate checks, and retention sweep action selection; full artifact lifecycle persistence, archive execution, audit envelopes, object-store abstractions, and HTTP mapping have not moved yet.

`apps/api/internal/domain/evidence` owns stable evidence input/ref/risk parsing, stored result summary risk projection, result explanation evidence ref extraction, and readiness policy evaluation:

- `InputRefs`
- `ParseRef`
- `SimulationInputPayload`
- `StoredResultSummary`
- `RiskFindingsFromSummary`
- `RiskFindingEvidenceRefs`
- `ResultExplanationEvidenceRefs`
- `SummarizeRiskFindings`
- `EvaluateProductionReadiness`

Compute uses this package through job completion stored summary persistence, evidence package export, result explanation submit validation, evidence-ref resolution, process graph evidence lookup, and production-readiness policy evaluation; job completion persistence, store-backed evidence governance, evidence package response assembly, production-readiness DTO mapping, model catalog callbacks, artifact/model-run/process-graph metadata reads, and HTTP mapping have not moved yet.

`apps/api/internal/domain/jobs` owns stable job status constants, status invariant helpers, and worker claim matching:

- `IsTerminal`
- `IsWorkerResultStatus`
- `MatchesWorker`
- `RequiredCapabilities`
- `ContractVersions`

Compute uses this package through compatibility constants and helper/projection calls from MemoryStore/PostgresStore claim paths; full job lifecycle persistence and HTTP mapping have not moved yet.

`apps/api/internal/domain/models` owns stable compute result model_run extraction/precheck, `model_run.v1` / `benchmark_run.v1` raw parsing, model-run identity checks, benchmark workflow gates, single benchmark case readiness, parameter-set status invariants, default-parameter-set promotion gate policy, and model-run production governance gate policy:

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

Compute uses this package through job completion model_run extraction before schema validation/persistence, MemoryStore/PostgresStore model-run persistence, evidence/simulation read paths, evidence governance production-allowed calculation, default-parameter-set status transition validation, benchmark case schedule-run gate checks, benchmark run admission checks, benchmark run evidence-ref validation, benchmark run model-run identity/hash validation, promotion planning per-case readiness checks, and final promotion gate evaluation; full job lifecycle persistence, full model catalog governance, catalog snapshot mutation, benchmark run persistence workflow, benchmark query orchestration, promotion workflow orchestration, evidence package assembly, HTTP mapping, and DTOs have not moved yet.

`apps/api/internal/domain/simulation` owns stable simulation execution profile helpers:

- `ExecutionProfile`
- `RequiredCapabilities`
- `IsSupportedJobType`
- `ValidateProcessGraphForSimulationInput`
- `ProcessGraphToSimulationInput`

Compute uses this package from simulation-check creation, benchmark case scheduling, process graph registration validation, and material-balance ProcessGraph-to-SimulationInput resolution. Simulation input/process graph metadata records, idempotency, schema validation, store implementation, evidence-ref lookup, and HTTP mapping have not moved yet.

`WorkerLifecycleService` is the sixth narrowed slice and a moved domain package under `apps/api/internal/domain/workers`. Its constructor depends on:

- a minimal workers `WorkerStore` implemented by `compute.workerStoreAdapter`
- a clock

The public `Service.RegisterWorker`, `Service.Claim`, and `Service.Heartbeat` methods remain stable and delegate to this domain service. Artifact upload, job completion, and job failure remain outside this worker boundary because they depend on current job/artifact lifecycle rules.

`EvidenceGovernanceService` is the seventh narrowed slice. Its constructor depends on:

- `EvidenceGovernanceStores` (`JobStore`, `ModelRunStore`, `ProcessGraphStore`)
- `ContractValidator`
- a clock
- a model catalog resolver callback
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

This order starts with domains that have clear data ownership and smaller method groups before touching core job lifecycle behavior. All eight listed split groups have begun; they are currently implemented through `ArtifactLifecycleService`, `SimulationInputService`, `DraftWorkflowService`, `ResultExplanationService`, `ModelGovernanceService`, `domain/workers.WorkerLifecycleService`, `EvidenceGovernanceService`, `JobLifecycleService`, and `platform/metrics.MetricsService`. Artifact upload/listing and retention action planning have also joined the artifact boundary, evidence input/ref/risk parsing plus stored result summary risk projection, result explanation evidence ref extraction, and production-readiness policy evaluation has joined `domain/evidence`, compute result model_run extraction/precheck, model-run parsing plus identity/hash checking, benchmark-run evidence ref parsing, benchmark workflow gates, benchmark case readiness, parameter-set status transition invariants, promotion gate policy, and model-run production governance gate have joined `domain/models`, and simulation execution plus material-balance process graph projection helpers have joined `domain/simulation`. Internal domain/platform service constructors are now audited for aggregate `Store` leaks and over-wide store-like parameter lists. The first platform package movement is underway through `platform/auth`, `platform/config`, `platform/contracts`, `platform/httpx`, and `platform/metrics`; domain package movement is underway through `domain/artifacts`, `domain/evidence`, `domain/jobs`, `domain/models`, `domain/simulation`, and `domain/workers`. Remaining near-term work is additional domain package movement, handler/package surface reduction, and eventually public `Service` constructor signature narrowing.

## Split Rules

Future service-boundary and package splitting should follow these rules:

- Introduce narrow interfaces at service boundaries before moving implementation files.
- Keep `MemoryStore` and `PostgresStore` behavior covered by existing tests after every step.
- Do not split PostgreSQL migrations away from the implementation until migration smoke coverage remains obvious.
- Do not make HTTP handlers depend on concrete persistence types.
- Do not use package splitting to change endpoint behavior, OpenAPI, auth scopes, or contract semantics.

## Current Non-Goals

- `NewService` / `NewServiceWithArchive` still accept the aggregate `Store` for backward-compatible construction; narrowed internal services receive domain interfaces but are still wired from the aggregate in this package.
- This split has moved platform auth, config, contract validation/document response, HTTP, and metrics helpers/collector into platform packages, artifact retention policy helpers and sweep action planner into `domain/artifacts`, evidence input/ref/risk parsing, stored result summary risk projection, result explanation evidence ref extraction, and readiness policy evaluation into `domain/evidence`, job status plus claim matching invariants into `domain/jobs`, compute result model_run extraction/precheck, `model_run.v1` raw parsing, identity/hash checking, `benchmark_run.v1` evidence ref parsing, benchmark workflow gates, benchmark case readiness, parameter-set status invariants, promotion gate policy, and production governance gate into `domain/models`, simulation execution profile plus material-balance process graph projection helpers into `domain/simulation`, and worker register/claim/heartbeat into `domain/workers`. Most compute domain files have not moved into domain packages yet.
- This split does not change endpoint behavior, OpenAPI, auth scopes, contracts, database schema, or PostgreSQL migrations.

## Verification

Before and after any Store split, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1
cd apps\api; go test ./...
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1
```
