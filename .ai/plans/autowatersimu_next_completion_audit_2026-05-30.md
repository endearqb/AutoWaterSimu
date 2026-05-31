# AutoWaterSimu Next Completion Audit - 2026-05-30

## Scope

This audit tracks the active objective: review the current implementation against the written PRD, Technical Spec, and Development Plan, then drive the project to the requested AutoWaterSimu Next end state under README First.

Authoritative inputs:

- `docs/rebuild/AutoWaterSimu_Next_PRD_v1.0.md`
- `docs/rebuild/AutoWaterSimu_Next_Technical_Spec_v1.0.md`
- `docs/rebuild/AutoWaterSimu_Next_Development_Plan_v1.0.md`
- Current worktree source, tests, README files, `tasks/todo.md`, and `.ai/changes/2026-05-30.md`

This is not a completion claim. The goal remains active until every requirement below has current, direct evidence.

## Current Verification Snapshot

Latest current-turn verification:

- `cd backend; .venv\Scripts\python -m pytest app\tests\api\routes\legacy_compute_read_only_test.py -q`: passed, `7 passed`, existing `python_multipart` warning only
- `cd backend; .venv\Scripts\python -m pytest app\tests\api\routes\legacy_compute_read_only_test.py app\tests\api\routes\test_asm_udm_validate_response.py app\tests\api\routes\test_flowchart_routes_no_print.py -q`: passed, `29 passed`, existing `python_multipart` warning only
- `cd backend; .venv\Scripts\python -m pytest app\tests\time_segment_validation_test.py app\tests\material_balance_segment_overrides_test.py app\tests\hybrid_udm_validation_test.py app\tests\udm_engine_variable_binding_test.py -q`: passed, `17 passed`, existing `python_multipart` warning only
- `cd apps\api; go test ./internal/compute -run TestNewSystemEvidenceReferenceE2E -count=1`: passed
- `backend\.venv\Scripts\python -m pytest contracts\tests -q`: passed, `83 passed`
- `cd apps\api; go test ./...`: passed
- Go API service-level artifact retention sweep now deletes expired unreferenced `ttl` artifacts, protects artifacts referenced by persisted `model_run.v1.evidence_refs`, and records an audit event; a manual admin endpoint exists and the optional scheduler reuses the same path
- Go API now exposes `POST /api/v1/admin/artifacts/retention-sweep` behind `artifact:admin`, with safe `dry_run=true` default and explicit `dry_run=false` deletion path wired through OpenAPI and generated Compute TypeScript client
- `/metrics` now reports store-backed API up, job status, registered worker, artifact metadata, and retention candidate gauges without mutating lifecycle state
- `docs/operations/compute_api_lifecycle_runbook.md` documents current health/metrics checks, manual admin retention sweep, scope boundaries, recovery limits, scheduler status, and triage checklist
- Web Compute Jobs now includes an artifact retention panel for dry-run and guarded `dry_run=false` sweep calls through the generated Compute client
- Web now includes a dedicated `/compute-lifecycle` page that shows Compute API health/metrics, dry-run/delete retention controls, archive blocker counts, and a mock-backed Playwright lifecycle smoke
- Compute API can start a disabled-by-default artifact retention scheduler via `COMPUTE_API_RETENTION_SWEEP_INTERVAL`; scheduled sweeps reuse the same model_run-protected service path and default to dry-run
- `docs/operations/monitoring/compute_api_alerts.yml` now provides Prometheus alert rules for API down, queued jobs without workers, failed/timed-out jobs, and persistent retention backlog
- `docs/operations/compute_api_backup_restore_runbook.md` now documents the PostgreSQL metadata plus local artifact directory backup/restore boundary required before destructive retention deletion
- `docs/operations/compute_api_token_secret_runbook.md` now documents static bearer token scope boundaries, deployment secret handling, overlap rotation, config-level revocation, validation commands, and incident response without introducing dynamic RBAC
- `docs/operations/monitoring/` now includes Alertmanager routing and Grafana dashboard examples plus a monitoring deployment runbook, all limited to currently emitted Compute API metrics and placeholder receivers
- `.ai/decisions/0010-artifact-archive-backend-boundary.md` records the archive backend safety model; `COMPUTE_API_ARCHIVE_DIR` now enables a first `local_fs_archive` backend that copy/checksum-verifies archive candidates, records durable archive metadata and `artifact.archived`, removes the hot object, and keeps normal artifact download working through archive fallback
- `benchmark_run.v1` contract, PostgreSQL history table, record/list/get API, generated client, and frontend service wrappers exist; recording benchmark runs validates catalog benchmark case status, default parameter set hash, matching model_run, and job-scoped evidence refs
- Approved `constraint_draft.v1` confirmation can produce a read-only `constraint_application_plan.v1` through Go API tests; the plan is advisory-only and keeps `would_create_job=false` / `would_modify_target=false`
- Externally generated `result_explanation.v1` can be submitted, reviewed, read, and published through Go API tests after job-scoped evidence ref checks; publish is audit metadata only
- `process_graph:<id>` evidence refs resolve to registered `ProcessGraphRecord` only when the completed job payload references that graph
- Web Compute Jobs detail can resolve job-scoped evidence refs through `computeJobsService.resolveEvidenceReference()` and display the backend resolution payload without composing evidence in the route layer
- NewSystem-style service-level E2E covers process graph simulation check creation, risk finding summary exposure, `simulation_input` / `process_graph` / `model_run` / `evidence_package` ref dereference, production readiness read, and result explanation submission in one job-scoped workflow
- `backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --self-check`: passed
- `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q`: passed, `21 passed`
- `backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\material_balance_minimal.compute_job.v1.json --artifact-dir tmp\worker-artifacts`: passed with `status=succeeded`
- `backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\asm1slim_minimal.compute_job.v1.json --artifact-dir tmp\worker-asm1slim-artifacts`: passed with `status=succeeded`, `model_key=asm1slim`, and `model_version=asm1slim.v1`
- `asm1slim_minimal.*` fixtures remain model-bound material balance fixtures, and `asm1slim_independent.*` fixtures now cover the first independent ASM job type, `simulation.asm1slim.v1`
- Core and legacy backend `simulation_input.v1` adapters now preserve ASM1Slim / ASM1 / ASM3 / UDM node runtime binding fields and distinguish missing optional fields from explicit empty arrays/objects
- `backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\asm1slim_independent.compute_job.v1.json --artifact-dir tmp\worker-asm1slim-independent-artifacts`: passed with `job_type=simulation.asm1slim.v1`, `status=succeeded`, and `model_key=asm1slim`
- `asm1_independent.*` fixtures now cover the second independent ASM job type, `simulation.asm1.v1`
- `backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\asm1_independent.compute_job.v1.json --artifact-dir tmp\worker-asm1-artifacts`: passed with `job_type=simulation.asm1.v1`, `status=succeeded`, `model_key=asm1`, and `total_steps=11`
- `asm3_independent.*` fixtures now cover the third independent ASM job type, `simulation.asm3.v1`
- `backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\asm3_independent.compute_job.v1.json --artifact-dir tmp\worker-asm3-artifacts`: passed with `job_type=simulation.asm3.v1`, `status=succeeded`, `model_key=asm3`, and `total_steps=11`
- `udm_independent.*` fixtures now cover a single-reactor independent UDM job type, `simulation.udm.v1`, including model snapshot, process definitions, parameter values, and variable bindings
- `backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\udm_independent.compute_job.v1.json --artifact-dir tmp\worker-udm-artifacts`: passed with `job_type=simulation.udm.v1`, `status=succeeded`, `model_key=udm`, and `total_steps=11`
- Worker `model_run.parameter_hash` now includes node model parameters/snapshots/bindings for ASM/UDM model job types while preserving material-balance-only hash behavior for pure material balance jobs
- Worker old-vs-backend numerical matrix now compares worker artifacts with legacy `MaterialBalanceCalculator` output for material balance, ASM1Slim model-bound, independent ASM1Slim/ASM1/ASM3/UDM fixtures, generated UDM Hybrid multi-model flow, and generated Petersen chapter 2 / chapter 7 tutorial flows
- Temporary Go Compute API + worker `--run-api-once` smoke on port `8118`: passed, queued job reached `succeeded` with `1` artifact and `1` model run
- Temporary Docker PostgreSQL `postgres:16-alpine` migration smoke: `0001`-`0007` up passed through Go test, down scripts passed in reverse order
- Opt-in Go migration rollback test with `COMPUTE_API_MIGRATION_DOWN_SMOKE=true`: passed against temporary Docker PostgreSQL
- Temporary Go Compute API confirmation smoke on port `8119`: `POST /api/v1/contracts/confirm-draft` persisted and `GET /api/v1/contracts/confirmations/{confirmation_id}` read back the confirmation record
- `backend\.venv\Scripts\python -m pytest simulation_core\tests -q`: passed, `10 passed`
- `cd backend; .venv\Scripts\python -m pytest app\tests\services -q`: passed, `26 passed`, existing warnings only
- `cd backend; .venv\Scripts\python -m pytest app\tests\time_segment_validation_test.py app\tests\material_balance_segment_overrides_test.py app\tests\hybrid_udm_validation_test.py app\tests\udm_engine_variable_binding_test.py -q`: passed, `17 passed`, existing warnings only
- `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml`: passed, `21 passed`
- `cd apps\desktop; npm run typecheck`: passed
- `cd apps\desktop; npm run build`: passed
- `cd frontend; npx tsc --noEmit`: passed
- `cd frontend; npx playwright test tests/compute-jobs-current-flow.spec.ts --project=chromium --no-deps`: passed, `1 passed`
- `cd frontend; npm run build`: passed with existing Vite warnings about `gray-matter` eval, toaster chunking, and bundle size
- Release gate automation now exists under `scripts/release/next-release-gates.ps1`; merge mode runs source-verifiable schema/worker/Go/codegen/frontend/Desktop checks and release mode requires explicit packaged sidecar and NSIS installer artifact paths
- Desktop packaged sidecar and NSIS installer smoke scripts now write machine-readable evidence under `tmp/release-evidence/`
- `scripts/release/next-release-gates.ps1 -Mode release -AllowMissingPackageArtifacts -SkipLong` produces `dry_run_skipped_artifacts`; this validates orchestration only and is not release-pass evidence
- A real PyInstaller one-folder worker sidecar build path exists at `apps/desktop/packaging/build-packaged-sidecar.ps1`; latest local artifact `tmp\desktop-packaging\sidecar-20260531010636\dist\simulation-worker\simulation-worker-x86_64-pc-windows-msvc.exe` passed packaged sidecar self-check and minimal job smoke with `packaging_mode=frozen`
- Desktop runtime can now invoke that packaged worker executable explicitly through `AUTOWATERSIMU_DESKTOP_WORKER_EXE` or `DesktopRuntime::new_with_packaged_worker(...)`; the optional Rust packaged-worker smoke passed against the generated sidecar
- Tauri release overlay and NSIS installer build path exist; latest local installer artifact `apps\desktop\src-tauri\target\release\bundle\nsis\AutoWaterSimu Next Desktop_0.1.0_x64-setup.exe` passed silent install, installed sidecar existence, installed sidecar smoke, and silent uninstall
- Release gate release mode passed with the real sidecar path and real installer path, `allow_missing_package_artifacts=false`, and evidence status `passed`
- Opt-in browser merge gate now runs both Compute Jobs current-flow and Compute lifecycle Playwright smokes under `-RunBrowserSmoke`; the focused two-spec Playwright command and expanded release gate pass locally
- GitHub `workflow_dispatch` now has an explicit `build_release_artifacts=true` path that builds the packaged sidecar and NSIS installer on a Windows runner, reads artifact paths from packaging manifests, passes those paths into the release gate, and uploads unsigned Desktop artifacts as workflow artifacts
- Desktop project package export/import now includes job input snapshots, job events, artifact/support bundle file contents encoded in the package with checksum verification, and import restores project metadata, CanvasGraphs, compute jobs, artifacts, model runs, job events, support bundles, and files when the package carries verified file records
- Next release workflow now cancels superseded runs per ref, uses npm/Go/Rust cache configuration, and exposes manual `skip_long=true` while leaving default PR gate behavior unchanged
- Next release workflow now has a manual opt-in `run_postgres_migration_smoke=true` job that runs migration up/down smoke against a temporary `postgres:16-alpine` service database with `COMPUTE_API_MIGRATION_DOWN_SMOKE=true`
- OpenAPI and generated Compute TypeScript client now expose retention `archived` count plus `would_archive` / `archived` actions; Compute Jobs and Compute lifecycle UI enable retention apply only after dry-run reports `would_delete` or `would_archive`
- `docs/rebuild/AutoWaterSimu_Next_Legacy_Phase0_Drift_Audit_2026-05-31.md` now records the exact remaining legacy `print` / OpenAPI / client drift: route modules have no active `print`, tracked legacy OpenAPI paths match current paths, and remaining OpenAPI differences are title/description metadata only
- Legacy Phase 0 cleanup removed the UTF-8 BOM from `backend/app/api/routes/material_balance.py` and removed commented mojibake debug `# print(...)` lines from `backend/app/services/data_conversion_service.py` without changing runtime logic
- Legacy Pydantic protected namespace warnings for `model_id` / `model_pair_mappings` are cleaned with explicit `ConfigDict(protected_namespaces=())` on the affected models and a regression test covering `app.models` import
- Legacy model validators in `backend/app/models.py` now use Pydantic v2 `field_validator`; `app.models` import is guarded against protected namespace and v1 validator warning regressions
- Legacy FastAPI startup/shutdown hooks now use the application lifespan context manager; `app.main` import no longer emits `@app.on_event` deprecation warnings
- Legacy FastAPI generated client has been refreshed from the current local `frontend/openapi.json` input; the tracked client now includes `UDMComponentDefinition.note` and current legacy calculation endpoint comments
- Legacy FastAPI compute now has an opt-in `LEGACY_COMPUTE_READ_ONLY` deployment guard. When enabled, material balance / ASM1Slim / ASM1 / ASM3 / UDM `/calculate`, `/calculate-from-flowchart`, and `DELETE /jobs/{job_id}` reject writes with `LEGACY_COMPUTE_READ_ONLY` while validation/status/result/input-data reads remain available for comparison mode.
- Development Plan deliverable docs now include a COSS source manifest, legacy migration guide, and support bundle runbook; checklist items requiring human approval, live deployment, or 30-day read-only evidence remain open
- `docs/operations/compute_api_tenancy_observability_runbook.md` now documents P0 tenant/project metadata boundaries, trace/logging expectations, and OpenTelemetry adoption triggers without claiming full RBAC or tracing is implemented
- `docs/operations/compute_api_job_event_retention_runbook.md` now documents current job event retention/archive policy boundaries and makes clear that automated event pruning is not implemented
- Next release workflow now downloads the uploaded unsigned Desktop artifact in the same `workflow_dispatch` run, verifies the downloaded sidecar/installer/evidence contents through `scripts/release/verify-release-artifact-download.ps1`, and uploads `downloaded-release-artifacts.json` with release evidence
- `/metrics` now includes `autowatersimu_compute_artifact_archives_total`, counting archived artifact metadata records without running lifecycle mutation, and the checked-in Grafana dashboard includes that archived artifact series
- Compute API entrypoint now rejects overlapping `COMPUTE_API_ARTIFACT_DIR` / `COMPUTE_API_ARCHIVE_DIR` local paths before enabling `local_fs_archive`, preserving separate-store archive semantics
- Compute API now supports a path-style S3-compatible `s3_archive` backend for expired unreferenced `archive_candidate` artifacts, using SigV4 signing, optional object key prefix, checksum verification, durable archive metadata, hot object deletion after metadata/event write, and normal artifact download fallback
- `docs/operations/monitoring/receiver_policy_runbook.md` now records receiver ownership, secret handling, approval, and test-alert policy without storing real webhook URLs, tokens, or on-call rotations
- Go Compute API now exposes read-only persisted model catalog snapshot listing at `GET /api/v1/model-catalog/snapshots`, with OpenAPI/generated Compute client and frontend service wrapper support; built-in fallback catalogs are not emitted as persisted history
- Web now includes a dedicated read-only `/model-governance` page that shows current catalog versions, default parameter set status/hash, benchmark case counts, and persisted catalog snapshot history with mock-backed pagination smoke coverage
- Built-in Go model catalog now covers material_balance plus worker-smoke-backed ASM1Slim/ASM1/ASM3/UDM model versions and benchmark cases; only material_balance currently has an approved default parameter set
- `simulation_request.v1` and Go simulation-check creation now accept material_balance plus independent ASM1Slim/ASM1/ASM3/UDM job types for embedded or registered `simulation_input.v1` and model-run replay paths; `process_graph_id` conversion remains material-balance-only
- Python simulation worker now has a bounded `--run-api-loop` mode that registers once, repeatedly claims jobs, heartbeats before execution, uploads artifacts, and completes jobs through the Go Compute API HTTP contract
- Go Compute API now exposes read-only default parameter set promotion plans at `GET /api/v1/model-catalog/{model_key}/versions/{model_version}/default-parameter-set/promotion-plan`; the plan checks latest benchmark_run/model_run evidence for a `validated` default parameter set, never executes benchmarks, never mutates catalog snapshots, and is surfaced on `/model-governance`
- Go Compute API now exposes `POST /api/v1/model-catalog/{model_key}/versions/{model_version}/benchmark-cases/{benchmark_case_id}/schedule-run`; it queues a standard `compute_job.v1` for a validated benchmark case with a non-retired current default parameter set, without executing Python, recording `benchmark_run.v1`, mutating catalog snapshots, or approving/promoting parameters
- Go Compute API now exposes `POST /api/v1/model-catalog/{model_key}/versions/{model_version}/default-parameter-set/promote-approved`; it reuses the promotion plan gate and only then promotes the current default parameter set from `validated` to `approved` in a new catalog snapshot, without executing benchmarks, recording benchmark history, or completing production approval
- Go Compute API now exposes read-only `GET /api/v1/compute/jobs/{job_id}/production-readiness`; it returns schema-valid `production_readiness.v1` from job status, evidence package availability, `governance.production_allowed`, and stored risk findings. The report blocks high/critical findings, warns on medium findings, requires external approval, and keeps `auto_publish_allowed=false`
- Web Compute Jobs detail now reads the generated production readiness endpoint through `computeJobsService.getProductionReadiness()` and displays readiness status, approval/publish boundaries, risk counts, blocking reasons, warnings, and policy checks; the mock-backed current-flow Playwright smoke covers the endpoint and visible readiness state

Latest recorded but not re-run in this verification refresh:

- Browser render smokes against `/compute-jobs` are recorded earlier in `tasks/todo.md` and `.ai/changes/2026-05-30.md`; the focused mock-backed current-flow Playwright smoke is now current-turn evidence.
- Signing, auto-update, and GitHub Release publication are now explicitly post-P0 policy-driven work in `.ai/decisions/0011-desktop-release-signing-auto-update-boundary.md`; live GitHub Windows runner release-build timing/cache behavior is not yet verified.

## Phase Status

| Phase | Requirement Area | Current Status | Evidence | Remaining Work |
|---|---|---|---|---|
| Phase 0 | Legacy baseline stabilization | Strong partial | Targeted legacy backend tests and frontend type/build pass with existing warnings only; exact legacy `print`/schema/client drift audit exists; route no-print guard scans all route modules; material balance route BOM, commented conversion-service debug prints, Pydantic protected namespace warnings, v1 validator warnings, FastAPI lifespan deprecation warnings, legacy generated client drift were cleaned, and an opt-in `LEGACY_COMPUTE_READ_ONLY` guard exists for legacy compute write paths | Keep legacy tests as migration baseline; remove debug-script/test print noise only when those files become maintained tooling; third-party `python_multipart` warning remains separate; live read-only comparison deployment and 30-day evidence remain external |
| Phase 1 | Contracts and transform layer | Strong partial | Contract tests pass; P0/P1/P2 schemas and valid/invalid fixtures exist; Python transform tests are included in `contracts\tests` | Keep schema registry current; broaden old-vs-new numerical fixtures beyond material balance |
| Phase 2 | Simulation core and worker CLI | Strong partial | Worker self-check, worker tests, minimal run-job, ASM1Slim model-bound run-job, independent `simulation.asm1slim.v1` / `simulation.asm1.v1` / `simulation.asm3.v1` / `simulation.udm.v1` run-job, simulation core tests, API-once worker smoke, and bounded API loop heartbeat coverage pass | Production deployment orchestration and asynchronous solver cancellation remain future work |
| Phase 3 | Desktop MVP | Strong partial | Desktop Rust tests, Desktop typecheck, and Desktop build pass; project registry/project package export-import/project_id/recent files/support bundle commands are present; project package exports include project-scoped jobs, job events, CanvasGraphs, artifact refs/files and support bundle refs/files; import restores checksum-verified file-backed jobs/artifacts/model runs/support bundles while keeping older metadata-only packages compatible; Tauri dialog open/save path selection and recent file tracking exist for external `.autowatersimu-project.json` packages; PyInstaller one-folder packaged worker sidecar build, explicit Desktop runtime smoke, Tauri resource-bundled NSIS installer build, installer smoke pass locally, and signing/auto-update/GitHub Release publication are explicitly post-P0 in ADR 0011 | No current local-code P0 gap identified; live release runner evidence remains under release governance |
| Phase 4 | Web Compute API P0A/P0B | Strong partial | Go API tests pass; API/worker smoke passes; PostgreSQL migration up/down smoke passes locally and has a manual opt-in CI job; generated client and Web build pass; static bearer token scope/revocation runbook exists; opt-in browser gate covers Compute Jobs current-flow and Compute lifecycle smokes | Deployment-specific secret-manager wiring; live CI migration smoke evidence; live deployed API/browser E2E |
| Phase 5 | ProcessGraph integration and model migration | Strong partial | Contract transforms, current-flow job submission, mock-backed Playwright current-flow submit smoke, ProcessGraph registry, ProcessGraph-to-SimulationInput API resolution, ASM1Slim model-bound parity, independent `simulation.asm1slim.v1` / `simulation.asm1.v1` / `simulation.asm3.v1` / `simulation.udm.v1` worker/core/backend parity, simulation_request entry for registered/embedded ASM/UDM inputs, old-vs-backend worker matrix for ASM/UDM/Hybrid/Petersen paths, and opt-in release gate switches for worker matrix/browser smokes exist | Keep adding real API/browser E2E as deployment wiring stabilizes |
| Phase 6.1 | Model governance | Strong partial | Persistent model catalog snapshots with built-in fallback and persisted snapshot listing, built-in material_balance/ASM1Slim/ASM1/ASM3/UDM model coverage, dedicated read-only Web governance page with promotion readiness, default parameter set status transition, advisory benchmark-backed default parameter set promotion plan, explicit benchmark-backed default parameter set promotion to approved, benchmark case metadata, manual benchmark case job schedule-run API, benchmark_run history, model_run records, evidence governance summary | Multi-parameter-set management, automated/scheduled benchmark runner orchestration, automated result-to-benchmark_run-to-promotion workflow, approval workflow semantics |
| Phase 6.2 | NewSystem / milp integration | Strong partial | `simulation_request.v1`, simulation check API, simulation input registry, ProcessGraph registry/lookup, independent ASM/UDM simulation request job types for registered/embedded inputs, process graph evidence dereference, model_run replay, evidence refs, risk findings, evidence governance, read-only production readiness report, evidence ref dereference API, Web evidence ref lookup/readiness UI, NewSystem service-level E2E includes production readiness read, service-token scopes/revocation exist | External NewSystem/milp acceptance smoke and deployment-specific external approval workflow integration remain out of scope until an integration target is available |
| Phase 6.3 | Agent DSL | Strong partial | Agent draft, constraint draft, result explanation, draft confirmation, validation endpoint, persisted confirm-draft audit record, readback endpoint, advisory constraint application plan endpoint, result explanation submit/review/publish workflow, explicit approved Agent draft promotion, and Web validation panel exist | Internal LLM generation, reviewer assignment UI, and any future constraint enforcement still need separate contracts/endpoints |
| Phase 6.4 | Lifecycle and operations | Strong partial | Artifact retention metadata, admin-scoped manual retention sweep API with safe dry-run default, disabled-by-default scheduler, guarded Compute Jobs retention UI, dedicated Compute lifecycle admin page, store-backed `/metrics` gauges including archived artifact count, operations runbook, job event retention policy runbook, backup/restore/token runbooks, tenant/observability runbook with OpenTelemetry triggers, Prometheus alert rule examples, Alertmanager route example, Grafana dashboard example, monitoring deployment runbook, receiver policy runbook, archive backend boundary ADR, opt-in `local_fs_archive` and path-style `s3_archive` backends with durable metadata/download fallback, internal service-level retention sweep with model_run reference protection, generated client wrapper, and static token revoke exist | Live monitoring deployment evidence and deployment-specific object-store backup/versioning proof |
| Release governance | Merge/release gates | Strong partial | Local verification matrix is stronger; opt-in migration rollback smoke passed; release gate scripts and GitHub Actions entry exist; worker matrix and current-flow browser smoke have explicit opt-in switches; real PyInstaller sidecar artifact, NSIS installer artifact, installed-sidecar smoke, and release gate pass evidence exist locally; manual workflow_dispatch can now build, upload, download, and verify unsigned Desktop workflow artifacts; workflow concurrency/cache/manual `skip_long` controls exist; signing/auto-update/GitHub Release publication are explicitly post-P0 policy-driven work in ADR 0011 | Live runner timing/cache evidence from an actual workflow_dispatch run |

## Remaining Roadmap

1. Web/API persistence hardening

- Run the opt-in PostgreSQL up/down migration smoke through `workflow_dispatch` and keep the evidence attached to the release gate audit.
- Use persisted catalog snapshot listing for governance audit workflows that need more than the latest `default` catalog.

2. Model governance completion

- Broaden parameter set lifecycle beyond the current default-parameter-set status transition only after multi-parameter-set semantics are defined.
- Extend benchmark execution from the current manual schedule-run API into an automated/scheduled runner only after runner cadence, retry, result-to-benchmark_run recording, and approval workflow semantics are reviewed.
- Keep promotion mutations limited to the explicit `promote-approved` endpoint until multi-parameter-set mutation and production approval semantics are designed; current governance UI remains display-only.

3. Agent DSL completion

- Keep production-related job creation blocked unless the confirmation and governance gates pass.
- Keep approved constraint draft application advisory-only unless a separate enforcement contract and approval endpoint are designed.
- Keep result explanation publish as audit metadata; add internal LLM generation or reviewer assignment only if separately scoped.

4. Desktop completion

- Keep project package restore checksum-first; future package format changes should preserve old metadata-only import compatibility.
- Keep GitHub Release publication, signing, and auto-update as post-P0 policy-driven work until certificate/update/release publication policy is defined.

5. Worker/model migration completion

- Keep ASM1Slim/ASM/ASM3/UDM model-bound nodes passing through the current material balance worker path where existing UI/API submission paths still use material balance.
- Independent ASM/UDM long-running workloads now have executable compute_job/worker slices and simulation_request entry through registered or embedded simulation_input payloads; keep ProcessGraph-to-ASM/UDM automatic conversion out of scope until transform semantics are designed.
- Keep the old-vs-worker numerical baseline matrix current as new model paths are added; it is available through the opt-in `-RunWorkerMatrix` release gate switch and can move to default CI only after runtime/cost policy is agreed.
- Keep built-in ASM/UDM catalog entries read-only and without default parameter sets until parameter lifecycle and promotion semantics are designed for those model families.

6. Lifecycle/operations completion

- Keep lifecycle operation surface conservative: current admin-scoped manual retention sweep defaults to dry-run, protects model_run evidence refs, deletes only expired unreferenced `ttl` artifacts, and archives `archive_candidate` artifacts only when `COMPUTE_API_ARCHIVE_DIR` or the S3 archive env vars configure an explicit archive backend.
- Keep monitoring examples aligned with the actual `/metrics` surface; add scheduler/archive-specific metrics only after those lifecycle components expose real metric names.
- Keep production token/secret handling aligned with the static bearer token runbook until a separate dynamic auth design exists.

## Non-Goals Preserved

- No production control command publication from AutoWaterSimu.
- No full RBAC, tenant billing, quota, or rate-limit platform in P0.
- No large time-series result payloads in metadata tables.
- No wholesale legacy Chakra rewrite while the legacy UI remains a baseline.
- No direct dependency on NewSystem internal database or Python worker internals from Go API.

## Next Best Implementation Candidates

1. Add production object-store archive backend and attach live monitoring deployment evidence for artifact/model-run lifecycle management.
2. Run the live release workflow_dispatch artifact build/download gate and attach timing/cache evidence; add GitHub Release publication, signing, and auto-update only after policy/secrets/update-channel decisions are defined.
3. Add real deployed Go API/browser E2E once deployment wiring and deployment-specific secret-manager policy are available.
