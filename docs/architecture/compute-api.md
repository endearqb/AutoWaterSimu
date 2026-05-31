# AutoWaterSimu Next Compute API Architecture

> Snapshot date: 2026-06-01.

This document records the current Go Compute API boundary after the first Store/interface split, the current service-constructor narrowing slices, and the first platform helper package movement. It is based on `apps/api/README.md`, `apps/api/internal/compute/README.md`, `apps/api/internal/platform/README.md`, and the read-only audit script:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1
```

The script writes evidence to `tmp/architecture-evidence/compute-api-boundary.json`.

## Current Shape

The Compute API domain is still mostly a single modular-monolith package under `apps/api/internal/compute`. The first non-domain platform packages now live under `apps/api/internal/platform`.

The aggregate `Store` is expressed as embedded domain metadata interfaces. Job create/list/read/events, cancel, complete/fail, and timeout logic now lives behind `JobLifecycleService`; artifact upload / listing / metadata lookup / download / retention / archive logic now lives behind `ArtifactLifecycleService`; worker register / claim / heartbeat now lives behind `WorkerLifecycleService`; simulation input registration, process graph registration, and `simulation_request.input_ref` resolution now live behind `SimulationInputService`; draft confirmation / promotion workflows now live behind `DraftWorkflowService`; result explanation submit/review/publish now lives behind `ResultExplanationService`; model catalog, benchmark run, model run lookup, promotion planning, and benchmark case queueing now live behind `ModelGovernanceService`; result read, evidence package export, production readiness, and evidence-ref resolution now live behind `EvidenceGovernanceService`; metrics snapshot reads now live behind `MetricsService`. Internal domain service constructors now expose 1-3 store-like parameters and the audit fails if they accept the aggregate `Store`.

The wider `Service` still owns package-level construction and compatibility delegates, so this is not yet a full domain package split.

## Package Boundary

`apps/api/internal/platform/auth` owns static bearer token config parsing, principal parsing, scope/revocation checks, and platform auth errors. Compute maps those errors back to `contract_error.v1` responses. `apps/api/internal/platform/config` owns the command/runtime `Config` shape used by `cmd/compute-api` for environment-derived wiring. `apps/api/internal/platform/httpx` owns platform HTTP helpers that do not hold compute domain state:

- JSON response writing
- loopback-only local browser CORS

`apps/api/internal/platform/metrics` owns the metrics snapshot shape and Prometheus exposition text rendering. Compute still owns metadata-store count collection through `MetricsService`.

`apps/api/internal/compute` may call this helper package, but `platform/httpx` must not import compute domain types. The boundary audit records internal Go package dirs and currently expects:

| Package Dir | Role |
|---|---|
| `compute` | Current compute domain package and compatibility wiring |
| `platform/auth` | Static bearer token authentication and platform auth errors |
| `platform/config` | Runtime configuration shape for command/deployment wiring |
| `platform/httpx` | Platform HTTP helper package |
| `platform/metrics` | Metrics snapshot shape and Prometheus renderer |

This is the first package movement step. It intentionally starts with low-coupling platform auth, config, HTTP, and metrics helpers before moving domain packages such as jobs, artifacts, models, evidence, simulation, agent, and workers.
`scripts/check-deps.ps1` enforces the reverse-dependency rule so `apps/api/internal/platform` cannot import `apps/api/internal/compute`.

Selected files from the latest audit:

| File | Lines | Note |
|---|---:|---|
| `service.go` | 930 | orchestration and compatibility delegates |
| `model_governance.go` | 666 | model catalog, benchmark run, model run lookup, promotion planning, and benchmark case queueing |
| `evidence_governance.go` | 645 | result read, evidence package export, production readiness, and evidence-ref resolution |
| `job_lifecycle.go` | 269 | job create/list/read/events, cancel, complete/fail, timeout sweep, and model-run persistence |
| `simulation_inputs.go` | 325 | simulation input registry, process graph registry, and input-ref resolution |
| `draft_workflows.go` | 254 | draft confirmation validation, advisory constraint plans, and explicit simulation-check promotion |
| `artifact_lifecycle.go` | 367 | artifact upload, listing, metadata lookup, download, retention sweep, archive copy/checksum/delete flow |
| `result_explanations.go` | 175 | result explanation submit/review/publish and job-scoped evidence ref validation |
| `worker_lifecycle.go` | 84 | worker register, claim, and heartbeat flow |
| `metrics.go` | 25 | read-only metrics snapshot service |
| `contract_validation.go` | 45 | reusable contract validation response helper |
| `postgres.go` | 1477 | PostgreSQL store implementation and migrations smoke helpers |
| `http.go` | 1124 | route handlers and HTTP mapping |
| `store.go` | 1166 | aggregate Store, domain metadata interfaces, and MemoryStore implementation |
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

`WorkerLifecycleService` is the sixth narrowed slice. Its constructor depends on:

- `WorkerStore`
- a clock

The public `Service.RegisterWorker`, `Service.Claim`, and `Service.Heartbeat` methods remain stable and delegate to this narrower service. Artifact upload, job completion, and job failure remain outside this worker boundary because they depend on current job/artifact lifecycle rules.

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

`MetricsService` is the ninth narrowed slice. Its constructor depends on:

- `MetricsStore`
- a clock

The public `Service.Metrics` method remains stable and delegates to this narrower service. The service is read-only and must not trigger retention sweep, timeout sweep, job mutation, artifact mutation, or archive mutation.

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

This order starts with domains that have clear data ownership and smaller method groups before touching core job lifecycle behavior. All eight listed split groups have begun; they are currently implemented through `ArtifactLifecycleService`, `SimulationInputService`, `DraftWorkflowService`, `ResultExplanationService`, `ModelGovernanceService`, `WorkerLifecycleService`, `EvidenceGovernanceService`, `JobLifecycleService`, and `MetricsService`. Artifact upload/listing has also joined the artifact boundary. Internal domain service constructors are now audited for aggregate `Store` leaks and over-wide store-like parameter lists. The first platform package movement is underway through `platform/auth`, `platform/config`, `platform/httpx`, and `platform/metrics`; remaining near-term work is domain package movement, handler/package surface reduction, and eventually public `Service` constructor signature narrowing.

## Split Rules

Future service-boundary and package splitting should follow these rules:

- Introduce narrow interfaces at service boundaries before moving implementation files.
- Keep `MemoryStore` and `PostgresStore` behavior covered by existing tests after every step.
- Do not split PostgreSQL migrations away from the implementation until migration smoke coverage remains obvious.
- Do not make HTTP handlers depend on concrete persistence types.
- Do not use package splitting to change endpoint behavior, OpenAPI, auth scopes, or contract semantics.

## Current Non-Goals

- `NewService` / `NewServiceWithArchive` still accept the aggregate `Store` for backward-compatible construction; narrowed internal services receive domain interfaces but are still wired from the aggregate in this package.
- This split has only moved platform auth, config, HTTP, and metrics helpers into new Go packages; it has not moved compute domain files into domain packages yet.
- This split does not change endpoint behavior, OpenAPI, auth scopes, contracts, database schema, or PostgreSQL migrations.

## Verification

Before and after any Store split, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1
cd apps\api; go test ./...
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1
```
