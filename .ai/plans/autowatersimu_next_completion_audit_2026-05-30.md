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

- `backend\.venv\Scripts\python -m pytest contracts\tests -q`: passed, `69 passed`
- `cd apps\api; go test ./...`: passed
- Approved `constraint_draft.v1` confirmation can produce a read-only `constraint_application_plan.v1` through Go API tests; the plan is advisory-only and keeps `would_create_job=false` / `would_modify_target=false`
- Externally generated `result_explanation.v1` can be submitted, reviewed, read, and published through Go API tests after job-scoped evidence ref checks; publish is audit metadata only
- `process_graph:<id>` evidence refs resolve to registered `ProcessGraphRecord` only when the completed job payload references that graph
- Web Compute Jobs detail can resolve job-scoped evidence refs through `computeJobsService.resolveEvidenceReference()` and display the backend resolution payload without composing evidence in the route layer
- NewSystem-style service-level E2E covers process graph simulation check creation, risk finding summary exposure, `simulation_input` / `process_graph` / `model_run` / `evidence_package` ref dereference, and result explanation submission in one job-scoped workflow
- `backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --self-check`: passed
- `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q`: passed, `7 passed`
- `backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\material_balance_minimal.compute_job.v1.json --artifact-dir tmp\worker-artifacts`: passed with `status=succeeded`
- Temporary Go Compute API + worker `--run-api-once` smoke on port `8118`: passed, queued job reached `succeeded` with `1` artifact and `1` model run
- Temporary Docker PostgreSQL `postgres:16-alpine` migration smoke: `0001`-`0007` up passed through Go test, down scripts passed in reverse order
- Opt-in Go migration rollback test with `COMPUTE_API_MIGRATION_DOWN_SMOKE=true`: passed against temporary Docker PostgreSQL
- Temporary Go Compute API confirmation smoke on port `8119`: `POST /api/v1/contracts/confirm-draft` persisted and `GET /api/v1/contracts/confirmations/{confirmation_id}` read back the confirmation record
- `backend\.venv\Scripts\python -m pytest simulation_core\tests -q`: passed, `4 passed`
- `cd backend; .venv\Scripts\python -m pytest app\tests\time_segment_validation_test.py app\tests\material_balance_segment_overrides_test.py app\tests\hybrid_udm_validation_test.py app\tests\udm_engine_variable_binding_test.py -q`: passed, `17 passed`, existing warnings only
- `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml`: passed, `20 passed`
- `cd apps\desktop; npm run typecheck`: passed
- `cd apps\desktop; npm run build`: passed
- `cd frontend; npx tsc --noEmit`: passed
- `cd frontend; npm run build`: passed with existing Vite warnings about `gray-matter` eval, toaster chunking, and bundle size

Latest recorded but not re-run in this verification refresh:

- Browser render smokes against `/compute-jobs` are recorded earlier in `tasks/todo.md` and `.ai/changes/2026-05-30.md`.
- NSIS installer smoke, packaged sidecar smoke, and full CI/release gate execution have not been run.

## Phase Status

| Phase | Requirement Area | Current Status | Evidence | Remaining Work |
|---|---|---|---|---|
| Phase 0 | Legacy baseline stabilization | Strong partial | Targeted legacy backend tests and frontend type/build pass with existing warnings only | Document exact remaining legacy `print`/schema/client drift issues; keep legacy tests as migration baseline |
| Phase 1 | Contracts and transform layer | Strong partial | Contract tests pass; P0/P1/P2 schemas and valid/invalid fixtures exist; Python transform tests are included in `contracts\tests` | Keep schema registry current; broaden old-vs-new numerical fixtures beyond material balance |
| Phase 2 | Simulation core and worker CLI | Strong partial | Worker self-check, worker tests, minimal run-job, simulation core tests, and API-once worker smoke pass | Expand worker support beyond material balance; add long-running worker daemon/heartbeat coverage when that mode exists |
| Phase 3 | Desktop MVP | Strong partial | Desktop Rust tests, Desktop typecheck, and Desktop build pass; project registry/export/import/project_id/support bundle commands are present | Complete installer/package smoke, external file dialog allowlist, recent files, full project package content |
| Phase 4 | Web Compute API P0A/P0B | Strong partial | Go API tests pass; API/worker smoke passes; PostgreSQL migration up/down smoke passes; generated client and Web build pass | Production deployment auth/secrets review; broader browser coverage; CI gate wiring |
| Phase 5 | ProcessGraph integration and model migration | Strong partial | Contract transforms, current-flow job submission, ProcessGraph registry, and ProcessGraph-to-SimulationInput API resolution exist for material balance | ASM/UDM worker migration, old-vs-worker numerical baseline matrix, Playwright flow smoke beyond current minimal path |
| Phase 6.1 | Model governance | Strong partial | Persistent model catalog snapshots with built-in fallback, default parameter set status transition, benchmark case metadata, model_run records, evidence governance summary | Multi-parameter-set management, benchmark execution/run history, governance UI beyond Compute Jobs read-only panel |
| Phase 6.2 | NewSystem / milp integration | Strong partial | `simulation_request.v1`, simulation check API, simulation input registry, ProcessGraph registry/lookup, process graph evidence dereference, model_run replay, evidence refs, risk findings, evidence governance, evidence ref dereference API, Web evidence ref lookup UI, NewSystem service-level E2E, service-token scopes/revocation exist | External NewSystem/milp acceptance smoke and production approval policy remain out of scope until an integration target is available |
| Phase 6.3 | Agent DSL | Strong partial | Agent draft, constraint draft, result explanation, draft confirmation, validation endpoint, persisted confirm-draft audit record, readback endpoint, advisory constraint application plan endpoint, result explanation submit/review/publish workflow, explicit approved Agent draft promotion, and Web validation panel exist | Internal LLM generation, reviewer assignment UI, and any future constraint enforcement still need separate contracts/endpoints |
| Phase 6.4 | Lifecycle and operations | Partial | Artifact retention metadata and migration exist; static token revoke exists | Actual retention/delete/archive workers, admin UI, metrics/SLO hardening, operation runbooks |
| Release governance | Merge/release gates | Partial | Local verification matrix is stronger and opt-in migration rollback smoke passed | CI gate wiring, installer smoke evidence, packaged sidecar smoke, release checklist execution |

## Remaining Roadmap

1. Web/API persistence hardening

- Wire opt-in PostgreSQL up/down migration smoke into CI rather than relying on manual Docker execution.
- Add catalog snapshot history/listing only if governance UI or audit workflows need more than latest `default` catalog.

2. Model governance completion

- Broaden parameter set lifecycle beyond the current default-parameter-set status transition only after multi-parameter-set semantics are defined.
- Add benchmark run contract and execution history after model catalog persistence is available.
- Add read-only governance UI separate from Compute Jobs if the route grows too dense.

3. Agent DSL completion

- Keep production-related job creation blocked unless the confirmation and governance gates pass.
- Keep approved constraint draft application advisory-only unless a separate enforcement contract and approval endpoint are designed.
- Keep result explanation publish as audit metadata; add internal LLM generation or reviewer assignment only if separately scoped.

4. Desktop completion

- Implement full project package content, including jobs, graphs, artifacts, and support bundle references.
- Add file dialog/recent files allowlist.
- Run packaging/NSIS smoke and document signing as post-P0 unless requirements change.

5. Worker/model migration completion

- Migrate ASM/UDM long-running workloads to the worker path.
- Add old-vs-worker numerical baseline matrix.
- Expand `model_catalog.v1` beyond material_balance only after the corresponding worker path is tested.

6. Lifecycle/operations completion

- Implement retention executor or archive/delete worker with evidence/model_run reference protection.
- Add operational metrics beyond the current `/metrics` stub.
- Document production token/secret handling and rotation process.

## Non-Goals Preserved

- No production control command publication from AutoWaterSimu.
- No full RBAC, tenant billing, quota, or rate-limit platform in P0.
- No large time-series result payloads in metadata tables.
- No wholesale legacy Chakra rewrite while the legacy UI remains a baseline.
- No direct dependency on NewSystem internal database or Python worker internals from Go API.

## Next Best Implementation Candidates

1. Add benchmark run contract after benchmark case metadata and catalog persistence have stabilized.
2. Add release checklist automation, packaged sidecar smoke, and installer smoke evidence.
3. Add internal Agent explanation generation only after an LLM provider and review assignment policy are specified.
