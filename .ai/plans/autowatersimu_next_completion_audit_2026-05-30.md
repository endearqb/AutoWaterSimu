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

- `backend\.venv\Scripts\python -m pytest contracts\tests -q`: passed, `83 passed`
- `cd apps\api; go test ./...`: passed
- Go API service-level artifact retention sweep now deletes expired unreferenced `ttl` artifacts, protects artifacts referenced by persisted `model_run.v1.evidence_refs`, and records an audit event; no public admin API/scheduler/archive backend is exposed yet
- `benchmark_run.v1` contract, PostgreSQL history table, record/list/get API, generated client, and frontend service wrappers exist; recording benchmark runs validates catalog benchmark case status, default parameter set hash, matching model_run, and job-scoped evidence refs
- Approved `constraint_draft.v1` confirmation can produce a read-only `constraint_application_plan.v1` through Go API tests; the plan is advisory-only and keeps `would_create_job=false` / `would_modify_target=false`
- Externally generated `result_explanation.v1` can be submitted, reviewed, read, and published through Go API tests after job-scoped evidence ref checks; publish is audit metadata only
- `process_graph:<id>` evidence refs resolve to registered `ProcessGraphRecord` only when the completed job payload references that graph
- Web Compute Jobs detail can resolve job-scoped evidence refs through `computeJobsService.resolveEvidenceReference()` and display the backend resolution payload without composing evidence in the route layer
- NewSystem-style service-level E2E covers process graph simulation check creation, risk finding summary exposure, `simulation_input` / `process_graph` / `model_run` / `evidence_package` ref dereference, and result explanation submission in one job-scoped workflow
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
- `cd frontend; npm run build`: passed with existing Vite warnings about `gray-matter` eval, toaster chunking, and bundle size
- Release gate automation now exists under `scripts/release/next-release-gates.ps1`; merge mode runs source-verifiable schema/worker/Go/codegen/frontend/Desktop checks and release mode requires explicit packaged sidecar and NSIS installer artifact paths
- Desktop packaged sidecar and NSIS installer smoke scripts now write machine-readable evidence under `tmp/release-evidence/`
- `scripts/release/next-release-gates.ps1 -Mode release -AllowMissingPackageArtifacts -SkipLong` produces `dry_run_skipped_artifacts`; this validates orchestration only and is not release-pass evidence
- A real PyInstaller one-folder worker sidecar build path exists at `apps/desktop/packaging/build-packaged-sidecar.ps1`; latest local artifact `tmp\desktop-packaging\sidecar-20260531010636\dist\simulation-worker\simulation-worker-x86_64-pc-windows-msvc.exe` passed packaged sidecar self-check and minimal job smoke with `packaging_mode=frozen`
- Desktop runtime can now invoke that packaged worker executable explicitly through `AUTOWATERSIMU_DESKTOP_WORKER_EXE` or `DesktopRuntime::new_with_packaged_worker(...)`; the optional Rust packaged-worker smoke passed against the generated sidecar
- Tauri release overlay and NSIS installer build path exist; latest local installer artifact `apps\desktop\src-tauri\target\release\bundle\nsis\AutoWaterSimu Next Desktop_0.1.0_x64-setup.exe` passed silent install, installed sidecar existence, installed sidecar smoke, and silent uninstall
- Release gate release mode passed with the real sidecar path and real installer path, `allow_missing_package_artifacts=false`, and evidence status `passed`

Latest recorded but not re-run in this verification refresh:

- Browser render smokes against `/compute-jobs` are recorded earlier in `tasks/todo.md` and `.ai/changes/2026-05-30.md`.
- Signing, auto-update, artifact publishing, and GitHub Windows runner release-build timing are not yet verified.

## Phase Status

| Phase | Requirement Area | Current Status | Evidence | Remaining Work |
|---|---|---|---|---|
| Phase 0 | Legacy baseline stabilization | Strong partial | Targeted legacy backend tests and frontend type/build pass with existing warnings only | Document exact remaining legacy `print`/schema/client drift issues; keep legacy tests as migration baseline |
| Phase 1 | Contracts and transform layer | Strong partial | Contract tests pass; P0/P1/P2 schemas and valid/invalid fixtures exist; Python transform tests are included in `contracts\tests` | Keep schema registry current; broaden old-vs-new numerical fixtures beyond material balance |
| Phase 2 | Simulation core and worker CLI | Strong partial | Worker self-check, worker tests, minimal run-job, ASM1Slim model-bound run-job, independent `simulation.asm1slim.v1` / `simulation.asm1.v1` / `simulation.asm3.v1` / `simulation.udm.v1` run-job, simulation core tests, and API-once worker smoke pass | Add long-running worker daemon/heartbeat coverage when that mode exists |
| Phase 3 | Desktop MVP | Strong partial | Desktop Rust tests, Desktop typecheck, and Desktop build pass; project registry/export/import/project_id/support bundle commands are present; PyInstaller one-folder packaged worker sidecar build, explicit Desktop runtime smoke, Tauri resource-bundled NSIS installer build, and installer smoke pass locally | External file dialog allowlist, recent files, full project package content, signing/auto-update decisions |
| Phase 4 | Web Compute API P0A/P0B | Strong partial | Go API tests pass; API/worker smoke passes; PostgreSQL migration up/down smoke passes; generated client and Web build pass | Production deployment auth/secrets review; broader browser coverage; CI gate wiring |
| Phase 5 | ProcessGraph integration and model migration | Strong partial | Contract transforms, current-flow job submission, ProcessGraph registry, ProcessGraph-to-SimulationInput API resolution, ASM1Slim model-bound parity, independent `simulation.asm1slim.v1` / `simulation.asm1.v1` / `simulation.asm3.v1` / `simulation.udm.v1` worker/core/backend parity, and old-vs-backend worker matrix for ASM/UDM/Hybrid/Petersen paths exist | Playwright flow smoke beyond current minimal path; decide whether the full worker matrix belongs in every CI/release gate run given runtime cost |
| Phase 6.1 | Model governance | Strong partial | Persistent model catalog snapshots with built-in fallback, default parameter set status transition, benchmark case metadata, benchmark_run history, model_run records, evidence governance summary | Multi-parameter-set management, scheduled benchmark execution, benchmark-backed parameter promotion, governance UI beyond Compute Jobs read-only panel |
| Phase 6.2 | NewSystem / milp integration | Strong partial | `simulation_request.v1`, simulation check API, simulation input registry, ProcessGraph registry/lookup, process graph evidence dereference, model_run replay, evidence refs, risk findings, evidence governance, evidence ref dereference API, Web evidence ref lookup UI, NewSystem service-level E2E, service-token scopes/revocation exist | External NewSystem/milp acceptance smoke and production approval policy remain out of scope until an integration target is available |
| Phase 6.3 | Agent DSL | Strong partial | Agent draft, constraint draft, result explanation, draft confirmation, validation endpoint, persisted confirm-draft audit record, readback endpoint, advisory constraint application plan endpoint, result explanation submit/review/publish workflow, explicit approved Agent draft promotion, and Web validation panel exist | Internal LLM generation, reviewer assignment UI, and any future constraint enforcement still need separate contracts/endpoints |
| Phase 6.4 | Lifecycle and operations | Partial | Artifact retention metadata, internal service-level retention sweep with model_run reference protection, and static token revoke exist | Public admin API/scheduler, archive backend, metrics/SLO hardening, operation runbooks, and lifecycle UI |
| Release governance | Merge/release gates | Strong partial | Local verification matrix is stronger; opt-in migration rollback smoke passed; release gate scripts and GitHub Actions entry exist; real PyInstaller sidecar artifact, NSIS installer artifact, installed-sidecar smoke, and release gate pass evidence exist locally | CI artifact build/publish, signing, auto-update, and release runner cache/timing hardening |

## Remaining Roadmap

1. Web/API persistence hardening

- Wire opt-in PostgreSQL up/down migration smoke into CI rather than relying on manual Docker execution.
- Add catalog snapshot history/listing only if governance UI or audit workflows need more than latest `default` catalog.

2. Model governance completion

- Broaden parameter set lifecycle beyond the current default-parameter-set status transition only after multi-parameter-set semantics are defined.
- Add scheduled benchmark execution and benchmark-backed parameter promotion only after benchmark history semantics are reviewed.
- Add read-only governance UI separate from Compute Jobs if the route grows too dense.

3. Agent DSL completion

- Keep production-related job creation blocked unless the confirmation and governance gates pass.
- Keep approved constraint draft application advisory-only unless a separate enforcement contract and approval endpoint are designed.
- Keep result explanation publish as audit metadata; add internal LLM generation or reviewer assignment only if separately scoped.

4. Desktop completion

- Implement full project package content, including jobs, graphs, artifacts, and support bundle references.
- Add file dialog/recent files allowlist.
- Harden release artifact publishing, signing, and auto-update only after certificate/update policy is defined.

5. Worker/model migration completion

- Keep ASM1Slim/ASM/ASM3/UDM model-bound nodes passing through the current material balance worker path where existing UI/API submission paths still use material balance.
- Continue migrating independent ASM/UDM long-running workloads to the worker path one job type at a time; `simulation.asm1slim.v1`, `simulation.asm1.v1`, `simulation.asm3.v1`, and `simulation.udm.v1` are completed executable contract/worker slices.
- Keep the old-vs-worker numerical baseline matrix current as new model paths are added, and decide whether it should run in every CI/release gate or a heavier scheduled lane.
- Expand `model_catalog.v1` beyond material_balance only after the corresponding worker path is tested.

6. Lifecycle/operations completion

- Add public lifecycle operation surface only after admin/auth policy is defined; current internal retention sweep already protects model_run evidence refs and deletes only expired unreferenced `ttl` artifacts.
- Add operational metrics beyond the current `/metrics` stub.
- Document production token/secret handling and rotation process.

## Non-Goals Preserved

- No production control command publication from AutoWaterSimu.
- No full RBAC, tenant billing, quota, or rate-limit platform in P0.
- No large time-series result payloads in metadata tables.
- No wholesale legacy Chakra rewrite while the legacy UI remains a baseline.
- No direct dependency on NewSystem internal database or Python worker internals from Go API.

## Next Best Implementation Candidates

1. Add Playwright ProcessGraph/current-flow smoke beyond the current minimal browser evidence, and decide CI placement for the heavier worker baseline matrix.
2. Add admin/scheduler surface, metrics, and operational runbooks for artifact/model-run lifecycle management.
3. Harden release artifact publishing, signing, and auto-update after certificate/update policy is defined.
