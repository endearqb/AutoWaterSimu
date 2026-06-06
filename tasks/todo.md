# 2026-06-06 AutoWaterSimu Next benchmark run read-scope TODO

- [x] Re-read README First context for Certainty/Elegance PRD/Plan, Compute API auth/data-scope, model governance benchmark runs, OpenAPI generated client, security smoke, and recent change records
- [x] Confirm next aligned gap: selected mutation audit progressed, while benchmark_run read/list still lacked tenant/project/site read-scope despite carrying `job_id`
- [x] Add benchmark_run get/list data-scope authorization via associated job
- [x] Add `job_id` filter for benchmark_run list so scoped tokens can list only an authorized job
- [x] Update OpenAPI source and generated Compute client
- [x] Extend focused HTTP coverage and security smoke coverage summary
- [x] Update Compute API/frontend/security/docs context and change records
- [x] Run focused tests, full Go tests, client generation/typecheck, dependency/security validation, commit, and push

## Plan

- Treat this as a narrow static-token object data-scope slice, not full RBAC/ABAC or all-object policy enforcement.
- Reuse existing job tenant/project/site authorization through `BenchmarkRunRecord.JobID`.
- Require scoped tokens to provide an authorized `job_id` for benchmark_run list; global tokens keep unfiltered list behavior.
- Preserve benchmark_run persistence, promotion-plan behavior, contracts, and endpoint semantics except the scoped-token safety tightening.

## Review

- Added `BenchmarkRunFilter.JobID` and Memory/Postgres list filtering on `job_id`.
- `GET /api/v1/benchmark-runs/{benchmark_run_id}` now authorizes the associated job against scoped token tenant/project/site metadata.
- `GET /api/v1/model-catalog/{model_key}/versions/{model_version}/benchmark-runs` now requires scoped tokens to provide an authorized `job_id`; global tokens retain unfiltered list behavior.
- Updated OpenAPI and regenerated the Compute TypeScript client; feature model-governance wrapper now forwards optional `jobId`.
- Added `TestHTTPBenchmarkRunTenantProjectSiteScope` and included it in `scripts/ci/security-smoke.ps1`; coverage summary now names benchmark_run read-scope.
- Updated Compute API/frontend/scripts/architecture/Certainty-Elegance docs and `.ai/changes`.
- Validation passed: focused benchmark_run data-scope test, full `cd apps\api; go test ./...`, `cd frontend; npx tsc --noEmit`, security smoke, dependency check, OpenAPI JSON parse, docs/rebuild P0/P1/P2/schema scan, and diff-check with LF/CRLF warnings only.
- Remaining scope: full object-level data scope for process_graph/simulation_input/draft confirmation/model catalog/global objects, OIDC/JWKS, RBAC/ABAC, all-mutation audit, hosted green evidence, and complete golden scenarios remain future work.

# 2026-06-06 AutoWaterSimu Next model governance mutation audit TODO

- [x] Re-read README First context for Certainty/Elegance PRD/Plan, Compute API, platform audit, model governance, migrations, and recent change records
- [x] Confirm next aligned gap: evidence/workflow wrapper loops and same-package split work have diminishing returns; model governance mutations still lack selected audit events
- [x] Add bounded global mutation audit metadata store for non-job-scoped model governance mutations
- [x] Cover model catalog registration, default parameter set status/promote, and benchmark_run registration audit events
- [x] Add draft promotion regression proving route/principal flows into job.create/job.queue audit events
- [x] Update Compute API/migrations/security/docs context and change records
- [x] Run focused tests, full Go tests, migration/dependency/security validation, commit, and push

## Plan

- Treat this as a selected all-mutation audit slice, not a full audit/RBAC system.
- Keep global audit compact and metadata-only: no large model catalog or benchmark_run payloads in audit events.
- Do not expose new HTTP/OpenAPI read endpoints in this stage; tests verify persistence through the store.
- Preserve existing model governance endpoint behavior, idempotency, contracts, generated clients, and public service signatures.

## Review

- Added compact `MutationAuditRecord` / `MutationAuditStore`, Memory/Postgres mutation audit persistence, and migration `0011_mutation_audit_events`.
- Model catalog registration, default parameter set status transitions, approved parameter promotion, and benchmark_run registration now write selected non-job-scoped mutation audit events with route/principal context.
- Draft promotion and benchmark schedule-run regressions now assert the existing job-scoped `job.created` / `job.queued` audit events carry route, principal, and trace context.
- Updated Compute API, migrations, scripts, security smoke, boundary audit, architecture docs, Certainty/Elegance plan, and `.ai/changes` context.
- Validation passed: focused model governance/draft promotion tests, full `cd apps\api; go test ./...`, security smoke, dependency check, Compute API boundary audit, docs/rebuild P0/P1/P2/schema scan, and diff-check with LF/CRLF warnings only.
- PostgreSQL migration up/down smoke was not run because `COMPUTE_API_DATABASE_URL` is unset; the migration is covered by full Go compilation and will need a temporary Postgres URL for live up/down verification.
- Remaining scope: full all-mutation audit, audit query API if needed, full object-level tenant/project/site data scope, OIDC/JWKS, RBAC/ABAC, hosted green evidence, and complete golden scenarios remain future work.

# 2026-06-06 AutoWaterSimu Next jobs state domain package split TODO

- [x] Re-read README First context for Certainty/Elegance PRD/Plan, Compute API, compute compatibility package, and `domain/jobs`
- [x] Confirm next aligned gap: recent evidence/workflow wrapper and same-package file-split work has diminishing returns unless it produces actual hosted green evidence or package movement
- [x] Select a bounded real package split: move job cancel/timeout state lifecycle rules into `apps/api/internal/domain/jobs`
- [x] Add DTO-neutral jobs state service, mutation plan, and domain tests
- [x] Keep `apps/api/internal/compute` as HTTP/snapshot/store adapter and concrete Memory/Postgres persistence
- [x] Update Compute API boundary audit, README/architecture context, Certainty/Elegance plan, and change records
- [x] Run focused tests, `go test ./...`, boundary audit, dependency check, `pr-fast`, and diff-check
- [x] Commit and push

## Plan

- Treat this as a real `jobs` package movement, not another same-package split.
- Domain package owns cancel/timeout state mutation planning, event payloads, timeout error semantics, and the state lifecycle service interface.
- Compute package keeps HTTP mapping, `JobSnapshot` assembly, compatibility `Service` methods, concrete `MemoryStore` / `PostgresStore` writes, and AppError mapping.
- Preserve endpoint behavior, OpenAPI, contracts, generated clients, migrations, auth scopes, and public `Service` method signatures.
- Do not continue evidence wrapper/workflow-entry work in this slice unless validation needs it.

## Review

- Added `apps/api/internal/domain/jobs/state_lifecycle.go` with DTO-neutral `JobStateService`, `StateMutation`, cancel/timeout mutation plans, event payloads, timeout error semantics, and domain validation error mapping.
- Added direct domain tests for cancel mutation planning, timeout mutation planning, and missing job id validation.
- `JobLifecycleService.CancelJob` / `TimeoutSweep` now delegate through `domain/jobs.JobStateService`; `job_lifecycle_state.go` keeps only the compute adapter, snapshot assembly, and compatibility return types.
- `MemoryStore` and `PostgresStore` now apply domain `StateMutation` for cancel/timeout instead of hardcoding status/event/error details in the compute package.
- Updated Compute API/domain README context, architecture current-state/compute-api docs, and Certainty/Elegance Development Plan to record the strategy pivot away from wrapper/evidence loops and toward real package movement.
- Validation passed: focused jobs state tests and cancel/timeout regression tests, full `cd apps\api; go test ./...`, `scripts\audit-compute-api-boundary.ps1`, `scripts\check-deps.ps1`, `scripts\ci\pr-fast.ps1`, and `git diff --check -- apps/api docs/architecture docs/rebuild tasks .ai` with LF/CRLF warnings only.
- Remaining scope: complete jobs lifecycle package movement, full artifact/model/evidence/simulation/agent workflow package movement, hosted green evidence, all-mutation audit, and all-object data scope remain future work.

# 2026-06-06 AutoWaterSimu Next model run read-scope TODO

- [x] Re-read README First context for Certainty/Elegance PRD/Plan, Compute API auth/data-scope, model run HTTP handlers, security smoke, and architecture docs
- [x] Confirm next aligned gap: model_run HTTP read endpoints checked `job:read` scope but did not constrain tenant/project/site by the associated job
- [x] Add model_run get data-scope authorization via stored `model_run.job_id`
- [x] Require scoped tokens to provide an authorized `job_id` for `/api/v1/model-runs` list to avoid cross-job enumeration
- [x] Extend focused HTTP coverage and security smoke coverage summary
- [x] Update Compute API, scripts/ci, architecture/current-state/local-dev, Certainty/Elegance plan, and change records
- [x] Run full validation
- [x] Commit and push

## Plan

- Treat this as a narrow static-token data-scope slice, not full RBAC/ABAC or all-object policy enforcement.
- Keep service/store list pagination unchanged for global tokens; scoped tokens must use `job_id` so the HTTP layer can authorize against `JobRecord`.
- Preserve OpenAPI, contracts, generated clients, database schema, model_run persistence, and model governance service behavior.

## Review

- Added `principalHasDataScope` and model_run HTTP authorization checks.
- `GET /api/v1/model-runs/{model_run_id}` now parses the stored model_run `job_id` and authorizes the associated job context for scoped tokens.
- `GET /api/v1/model-runs` now requires scoped tokens to include an authorized `job_id`; global tokens retain unfiltered list behavior.
- Added `TestHTTPModelRunTenantProjectSiteScope` covering allowed same-scope get/list, cross-scope denial, scoped unfiltered list denial, and global list behavior.
- Extended `scripts/ci/security-smoke.ps1` coverage and updated README/current-state/Certainty-Elegance plan wording.
- Validation passed: focused model_run scope test, full `cd apps\api; go test ./...`, security smoke with updated data-scope coverage summary, dependency check, docs/rebuild P0/P1/P2/schema scan, and diff-check with LF/CRLF warnings only.
- Remaining scope: full object-level data scope for all resources, model catalog/global object policy, OIDC/JWKS, RBAC/ABAC, all-mutation audit, hosted security workflow green evidence, and complete security golden scenario remain future work.

# 2026-06-06 AutoWaterSimu Next result explanation audit events TODO

- [x] Re-read README First context for Certainty/Elegance PRD/Plan, Compute API result explanation workflow, audit helper, security smoke, and architecture docs
- [x] Confirm next aligned gap: selected mutation audit coverage remained partial, and result explanation submit/review/publish were job-scoped mutations without audit events
- [x] Add compact `compute_job_events.event_json.audit` envelopes for result explanation submit/review/publish
- [x] Preserve result explanation idempotency and avoid duplicate audit events for duplicate submit/publish
- [x] Extend focused HTTP coverage and security smoke coverage summary
- [x] Update Compute API, scripts/ci, architecture/current-state/local-dev/compute-api, Certainty/Elegance plan, and change records
- [x] Run full validation
- [x] Commit and push

## Plan

- Treat this as a conservative job-scoped mutation audit slice, not full all-mutation audit.
- Keep audit payloads compact: explanation id, status, payload hash, resolved ref count, decision, and before/after state only; do not store the full explanation payload in the event JSON.
- Keep result explanation status semantics, HTTP routes, OpenAPI, contracts, generated clients, and database schema unchanged.
- Record that global model catalog mutations, full object-level data scope, OIDC/JWKS, RBAC/ABAC, and all-mutation audit remain future work.

## Review

- Added `result_explanations_audit.go` with submit/review/publish audit event construction.
- Result explanation submit/review/publish now pass selected audit events into Memory/Postgres result explanation store mutations so PostgreSQL writes the record change and audit event in the same transaction.
- HTTP result explanation mutation paths now inject the static-token principal and route into audit context.
- Added `TestHTTPResultExplanationAuditEvents`, covering submit, duplicate submit, review, publish, duplicate publish, compact event payloads, before/after states, route/principal projection, trace id, and no full payload embedding.
- Extended `scripts/ci/security-smoke.ps1` to run the focused result explanation audit test and updated security coverage summaries.
- Updated API/compute README, scripts/ci README, architecture current-state/local-dev/compute-api, and Certainty/Elegance Development Plan.
- Validation passed: focused result explanation audit test, full `cd apps\api; go test ./...`, security smoke with updated coverage summary, dependency check, docs/rebuild P0/P1/P2/schema scan, and diff-check with LF/CRLF warnings only.
- Remaining scope: full all-mutation audit, model catalog/global mutation audit, all-object tenant/project/site data scope, OIDC/JWKS, RBAC/ABAC, hosted security workflow green evidence, and complete security golden scenario remain future work.

# 2026-06-06 AutoWaterSimu Next production token secret file source TODO

- [x] Re-read README First context for Certainty/Elegance PRD/Plan, Compute API command/config/auth, security smoke, and architecture docs
- [x] Confirm next aligned gap: hosted release-evidence workflow entry exists, while production security still lacked a service-token secret file source
- [x] Add `COMPUTE_API_TOKENS_FILE` as a mounted token JSON source for `cmd/compute-api`
- [x] Keep `COMPUTE_API_TOKENS_JSON` compatibility and reject ambiguous inline/file token sources
- [x] Extend production guard tests and security smoke coverage summary
- [x] Update Compute API, platform, scripts, architecture, Certainty/Elegance plan, and change records
- [x] Run validation
- [x] Commit and push

## Plan

- Treat this as a conservative static-token P0 hardening slice, not OIDC/JWKS/RBAC.
- Preserve the existing token JSON shape and `internal/platform/auth` behavior.
- Do file reading only in `cmd/compute-api` wiring; platform auth keeps parsing/principal/scope logic only.
- Record that all-object data scope and all-mutation audit remain future work.

## Review

- Added `COMPUTE_API_TOKENS_FILE` to `cmd/compute-api` runtime config.
- Production auth config now accepts exactly one static-token source: inline `COMPUTE_API_TOKENS_JSON` or file-mounted `COMPUTE_API_TOKENS_FILE`.
- Added tests for token file loading, ambiguous inline/file source rejection, empty token file rejection, and production guard acceptance of file-sourced token JSON.
- Updated `scripts/ci/security-smoke.ps1` so the security lane runs the new token file source tests and records `production_service_token_file_source` coverage.
- Updated Compute API, platform auth/config, scripts/ci, architecture, Certainty/Elegance plan, and `.ai/changes` context.
- Validation passed: focused Go tests for `cmd/compute-api` / platform / compute, full `cd apps\api; go test ./...`, security smoke, dependency check, PowerShell parser for `security-smoke.ps1`, docs/rebuild P0/P1/P2/schema scan, and diff-check with LF/CRLF warnings only.
- Remaining scope: OIDC/JWKS, external secret-manager provider integration, all-object data scope, all-mutation audit, hosted security workflow green run, and complete security golden scenario remain future work.

# 2026-06-06 AutoWaterSimu Next desktop release artifacts TODO

- [x] Re-read README First context for Desktop packaging/scripts, Tauri runtime, release scripts, local-dev/current-state, and Certainty/Elegance plan
- [x] Confirm next aligned gap: Desktop package smoke covered source-mode export/import, but packaged worker, NSIS installer, and release gate with real artifacts lacked a root local evidence lane
- [x] Verify existing sidecar build/smoke, NSIS installer build/smoke, and release gate with real artifact paths can pass locally
- [x] Add `scripts/ci/desktop-release-artifacts-smoke.ps1` to build unsigned sidecar/installer artifacts, run packaged-worker runtime smoke, run release gate `Mode=release`, and verify a local unsigned artifact bundle
- [x] Add root `just desktop-release-artifacts-smoke` and `just golden-scenarios-refresh-desktop-release` entries
- [x] Update root README, scripts READMEs, Desktop packaging/scripts README, release README, architecture current-state/local-dev/desktop-runtime, Certainty/Elegance plan, and change records
- [x] Run validation
- [x] Commit and push

## Plan

- Reuse existing Desktop packaging and smoke scripts; do not duplicate sidecar/installer business logic in the wrapper.
- Keep generated sidecar, installer, release evidence, and local artifact bundle under `tmp/`.
- Record this as local real unsigned artifact evidence only; GitHub hosted artifact upload/download, signing, auto update, and publication remain separate gaps.
- Use `-SkipLong` for the nested release gate by default to keep the smoke bounded; allow `-RunLongReleaseGate` when full release gate build steps are explicitly desired.

## Review

- Added `scripts/ci/desktop-release-artifacts-smoke.ps1`.
- Added `just desktop-release-artifacts-smoke` and `just golden-scenarios-refresh-desktop-release`.
- The new script builds or reuses real unsigned Desktop artifacts, runs packaged sidecar smoke, Rust packaged-worker runtime smoke, NSIS installer smoke, `next-release-gates.ps1 -Mode release`, and local unsigned artifact bundle verification.
- Updated root README, scripts READMEs, Desktop packaging/scripts README, release README, architecture current-state/local-dev/desktop-runtime, Certainty/Elegance plan, and `.ai/changes`.
- Validation passed: PowerShell parse check, first full default script attempt produced passing sidecar and NSIS build/smoke evidence before the external 20-minute tool timeout, `scripts\ci\desktop-release-artifacts-smoke.ps1 -OutputDir tmp\desktop-packaging\local-release-20260606110553 -ReuseExistingArtifacts`, `scripts\ci\golden-scenarios.ps1`, `scripts\check-deps.ps1`, docs/rebuild P0/P1/P2/schema scan, and `git diff --check -- README.md Justfile scripts apps docs tasks .ai` with LF/CRLF warnings only.
- Remaining scope: clean-HEAD rerun after commit, GitHub hosted artifact upload/download round trip, hosted workflow green evidence, signing/auto update/publication, full legacy auth, all-object data scope, all-mutation audit, and complete golden scenarios remain future work.

# 2026-06-06 AutoWaterSimu Next live backend hosted workflow TODO

- [x] Re-read README First context for `.github/workflows`, `scripts/ci`, current-state/local-dev, Certainty/Elegance plan, and the live backend browser smoke script
- [x] Confirm next aligned gap: live backend browser read lane existed locally but had no dedicated hosted/manual workflow entry
- [x] Add a manual/reusable live backend browser smoke workflow that calls the existing repository script
- [x] Add live backend browser smoke to the nightly workflow_call orchestrator and summary
- [x] Update workflow README, `.github` README, `scripts/ci` README, current-state/local-dev, Certainty/Elegance plan, and change records
- [x] Run workflow syntax/local script validation
- [x] Commit and push

## Plan

- Keep the workflow as orchestration only: setup dependencies, call `scripts/ci/live-backend-browser-smoke.ps1`, upload `tmp/ci-evidence`.
- Use Ubuntu for the hosted lane because Docker Compose is available and PowerShell Core can run the repository script.
- Do not claim hosted green evidence until GitHub Actions actually runs the new workflow successfully.
- Keep full legacy authenticated browser session and UI current-flow submit as separate evidence lanes.

## Review

- Added `.github/workflows/next-live-backend-browser-smoke.yml` as a manual/reusable hosted entry for the existing live backend browser smoke script.
- Wired `next-nightly.yml` to call the live backend browser smoke workflow and include its result in the nightly summary.
- Updated `.github` / workflow README, `scripts/ci` README, architecture current-state/local-dev, Certainty/Elegance plan, and `.ai/changes`.
- Validation passed: workflow YAML structure parser checks, `scripts\ci\live-backend-browser-smoke.ps1`, `scripts\check-deps.ps1`, docs/rebuild P0/P1/P2/schema scan, and `git diff --check -- .github docs scripts tasks .ai` with LF/CRLF warnings only.
- Remaining scope: actual hosted integration/browser/live backend/current-flow workflow green evidence, full legacy authenticated backend browser session, release artifact upload/download, signing/installer behavior, all-object data scope, all-mutation audit, and complete golden scenarios remain future work.

# 2026-06-06 AutoWaterSimu Next current-flow hosted workflow TODO

- [x] Re-read README First context, Certainty/Elegance PRD/Plan, `.github` README, workflow README, current-state/local-dev, scripts/ci README, and recent change records
- [x] Confirm next aligned gap: current-flow live local lane existed, but no dedicated hosted/manual workflow could produce GitHub Actions evidence for that lane
- [x] Add a manual/reusable current-flow live smoke workflow that calls the existing repository script
- [x] Add current-flow live smoke to the nightly workflow_call orchestrator and summary
- [x] Update workflow README, `.github` README, current-state/local-dev, Certainty/Elegance plan, and change records
- [x] Run workflow syntax/local script validation
- [x] Commit and push

## Plan

- Keep the workflow as orchestration only: setup dependencies, call `scripts/ci/current-flow-live-smoke.ps1`, upload `tmp/ci-evidence`.
- Use Ubuntu for the hosted lane because Docker Compose is available and PowerShell Core can run the repository script.
- Do not claim hosted green evidence until GitHub Actions actually runs the new workflow successfully.
- Keep full legacy authenticated browser session as a separate remaining gap; the current-flow live smoke still mocks only `/api/v1/users/me`.

## Review

- Added `.github/workflows/next-current-flow-live-smoke.yml` as a manual/reusable hosted entry for the existing current-flow live smoke script.
- Wired `next-nightly.yml` to call the current-flow live smoke workflow and include its result in the nightly summary.
- Updated `.github` / workflow README, `scripts/ci` README, architecture current-state/local-dev, Certainty/Elegance plan, and `.ai/changes`.
- Validation passed: workflow YAML structure parser checks, `scripts\ci\current-flow-live-smoke.ps1`, `scripts\check-deps.ps1`, docs/rebuild P0/P1/P2/schema scan, and `git diff --check -- .github docs scripts tasks .ai` with LF/CRLF warnings only.
- Remaining scope: actual hosted current-flow live workflow green evidence, hosted live backend browser read workflow, full legacy authenticated backend browser session, release artifact upload/download, signing/installer behavior, all-object data scope, all-mutation audit, and complete golden scenarios remain future work.

# 2026-06-06 AutoWaterSimu Next current-flow live smoke TODO

- [x] Re-read README First context, Certainty/Elegance PRD/Plan, current-state, local-dev, scripts/ci README, frontend tests README, worker README, and current Compute Jobs smoke context
- [x] Confirm next aligned gap: live backend browser read evidence existed, but no local browser lane submitted current flow to the live Compute API and waited for a real worker completion
- [x] Add live Compute API current-flow Playwright smoke that mocks only legacy `/api/v1/users/me`
- [x] Add a CI script that starts an isolated Compute API/PostgreSQL/MinIO stack plus bounded host worker loop, runs the browser smoke, writes evidence, and cleans Compose
- [x] Add root task entries and wire current-flow live evidence into golden scenario summary
- [x] Update README/architecture/plan/change records
- [x] Run validation
- [x] Commit and push

## Plan

- Keep API, worker implementation, route UI, generated client, and feature query wrappers unchanged.
- Use a dedicated `current-flow-live-smoke` lane instead of overloading the existing integration-prepared live backend read lane.
- Start only the live Compute stack needed for the smoke, then run a bounded host Python worker loop with `--max-jobs 1`.
- Record that this proves a local UI current-flow submit -> live worker -> evidence/ref path, but still does not prove hosted green runs or full legacy authenticated backend browser session.

## Review

- Added `frontend/tests/compute-jobs-current-flow-live.spec.ts`.
- Added `scripts/ci/current-flow-live-smoke.ps1`, `just current-flow-live-smoke`, and `just golden-scenarios-refresh-current-flow-live`.
- `scripts/ci/golden-scenarios.ps1` now reads `current-flow-live-smoke.json`, supports `-RunCurrentFlowLiveSmoke`, and includes `current_flow_live` as current-flow scenario evidence.
- Updated root README, scripts READMEs, frontend tests README, architecture current-state/local-dev, Certainty/Elegance plan, and `.ai/changes`.
- Validation passed: PowerShell parse checks for edited scripts, `cd frontend; npx tsc --noEmit`, `scripts\ci\current-flow-live-smoke.ps1`, `scripts\ci\golden-scenarios.ps1`, `scripts\ci\golden-scenarios.ps1 -RunCurrentFlowLiveSmoke`, `scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunCurrentFlowLiveSmoke`, `scripts\check-deps.ps1`, and `scripts\ci\pr-fast.ps1`.
- Full current-flow live refresh evidence passed with a succeeded UI-submitted job, model_run, artifact, evidence package download, and evidence ref resolution; golden summary after full refresh reported `partial=7`, `missing=1`, `blocked=0`.
- Remaining scope: hosted workflow green runs, full legacy authenticated backend browser session, Docker-backed integration/live backend read freshness after this commit, full release artifact upload/download, signing/installer behavior, all-object data scope, all-mutation audit, and complete golden scenarios remain future work.

# 2026-06-06 AutoWaterSimu Next live backend browser evidence TODO

- [x] Re-read README First context, Certainty/Elegance PRD/Plan, current-state, local-dev, scripts/ci README, frontend tests README, and Compute Jobs route/feature context
- [x] Confirm next aligned gap: mock-backed browser smoke and integration smoke were both current, but no Playwright lane proved frontend reads from the real PostgreSQL/MinIO/worker-backed Compute API
- [x] Add live backend browser Playwright smoke that mocks only legacy `/api/v1/users/me`
- [x] Add a CI script that prepares a real integration-backed succeeded job, runs the live browser read smoke, writes evidence, and cleans Compose
- [x] Add root task entries and wire live backend browser evidence into golden scenario summary
- [x] Update README/architecture/plan/change records
- [x] Run validation
- [x] Commit and push

## Plan

- Keep API, worker, route UI, generated client, and feature query wrappers unchanged.
- Use `integration-smoke.ps1 -StartCompose -KeepCompose` as the source of a real succeeded job/result/artifact/model_run/evidence chain.
- Run Playwright against the Compute Jobs route without Compute API route mocks, while still mocking only legacy `/api/v1/users/me` to avoid requiring a full legacy backend session.
- Record that this improves frontend live Compute API read evidence, but still does not prove hosted green runs or a single UI current-flow submit -> live worker -> evidence scenario.

## Review

- Added `frontend/tests/compute-jobs-live-backend.spec.ts`.
- Added `scripts/ci/live-backend-browser-smoke.ps1`, `just live-backend-browser-smoke`, and `just golden-scenarios-refresh-live`.
- `scripts/ci/golden-scenarios.ps1` now reads `live-backend-browser-smoke.json`, supports `-RunLiveBackendBrowserSmoke`, and includes `live_backend_browser` as current-flow scenario evidence.
- Updated root README, scripts READMEs, frontend tests README, architecture current-state/local-dev, Certainty/Elegance plan, and `.ai/changes`.
- Validation passed: PowerShell parse checks for edited scripts, `cd frontend; npx tsc --noEmit`, `scripts\ci\live-backend-browser-smoke.ps1`, `scripts\ci\golden-scenarios.ps1`, `scripts\ci\golden-scenarios.ps1 -RunLiveBackendBrowserSmoke`, `scripts\check-deps.ps1`, `scripts\ci\pr-fast.ps1`, docs/rebuild P0/P1/P2/schema search, and `git diff --check -- frontend scripts docs README.md Justfile tasks .ai` with LF/CRLF warnings only.
- Remaining scope: hosted workflow green runs, legacy authenticated backend browser session, a single UI current-flow submit -> live worker -> evidence scenario, full release artifact upload/download, signing/installer behavior, all-object data scope, all-mutation audit, and complete golden scenarios remain future work.

# 2026-06-06 AutoWaterSimu Next integration-backed golden refresh TODO

- [x] Re-read README First context, Certainty/Elegance PRD/Plan, current-state, scripts/ci README, task records, root task entry, and current evidence state
- [x] Confirm next aligned gap: `-RunIntegrationSmoke` existed but had no root recipe, so refreshing current Docker integration evidence still required remembering script flags
- [x] Add a root integration-backed golden scenario refresh entry and update README/architecture/plan/change records
- [x] Run integration-backed refresh and validation
- [x] Commit and push

## Plan

- Add `just golden-scenarios-refresh-integration` as the explicit Docker-backed scenario refresh entry.
- Keep `just golden-scenarios-refresh` as the non-Docker default refresh.
- Document that the integration-backed entry starts Compose through `integration-smoke.ps1 -StartCompose`, and still does not prove live browser reads, hosted workflows, packaged release artifacts, or complete golden scenarios.
- Run the new entry to produce current HEAD integration evidence and confirm the scenario summary moves PostgreSQL migration from `missing` to `partial`.

## Review

- Added `just golden-scenarios-refresh-integration`, which calls `scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunIntegrationSmoke`.
- Updated root README, local-dev/current-state architecture docs, scripts READMEs, Certainty/Elegance plan, and `.ai/changes`.
- Validation passed: `scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunIntegrationSmoke` ran 7 refresh steps successfully, including Docker-backed integration smoke; golden scenario summary moved to `partial=8`, `missing=0`, `blocked=0`.
- Integration evidence passed with 9 steps and 0 failed steps, and no `autowatersimu-next-integration-smoke` Compose containers remained after cleanup.
- `git diff --check -- README.md Justfile docs scripts tasks .ai` passed with LF/CRLF warnings only; docs/rebuild P0/P1/P2/schema search completed.
- Remaining scope: this still does not prove hosted workflow green runs, live backend browser reads, release artifact upload/download, signing/installer behavior, or complete 8 golden scenarios.

# 2026-06-06 AutoWaterSimu Next golden scenario refresh TODO

- [x] Re-read README First context, Certainty/Elegance PRD/Plan, current-state, scripts/ci README, scripts/release README, workflow README, and root task entry
- [x] Confirm next aligned gap: `golden-scenarios.ps1` only summarized existing lane evidence, so developers still had to manually refresh multiple local lanes before scenario interpretation
- [x] Add an explicit local evidence refresh mode to `golden-scenarios.ps1` while keeping default summary-only behavior
- [x] Add root task entry and README/architecture/plan/change records
- [x] Run validation
- [x] Commit and push

## Plan

- Preserve the default `golden-scenarios` summary-only behavior.
- Add `-RefreshLocalEvidence` to run non-Docker local lanes before summarizing: PR fast, browser smoke, security smoke, Desktop package smoke, release artifact download smoke, and merge release gate with `-SkipLong`.
- Keep Docker integration smoke as explicit `-RunIntegrationSmoke`, because it starts Compose and can be slow.
- Record refresh step outcomes inside `golden-scenarios.json` so failed refreshes are visible even before scenario aggregation.
- Do not claim 8 golden scenarios are complete; this stage improves evidence freshness and orchestration only.

## Review

- Added `-RefreshLocalEvidence` plus individual lane switches to `scripts/ci/golden-scenarios.ps1`.
- Default summary-only behavior is unchanged: it writes `refresh_requested=false`, no refresh steps, and reported `status=partial`, `partial=7`, `missing=1` against the current local evidence set.
- `-RefreshLocalEvidence` now refreshes 6 non-Docker local lanes before summarizing: `pr-fast`, browser smoke, security smoke, Desktop package smoke, release artifact download smoke, and merge release gate with `-SkipLong`; all 6 passed in this run.
- Added `just golden-scenarios-refresh` and updated root/local-dev/scripts/current-state/Certainty-Elegance plan docs.
- Validation passed: PowerShell parse check for `golden-scenarios.ps1`, summary-only `scripts\ci\golden-scenarios.ps1`, refresh-mode `scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence`, docs/rebuild P0/P1/P2/schema search, and `git diff --check -- scripts docs README.md Justfile tasks .ai` with LF/CRLF warnings only.
- Remaining scope: Docker integration smoke was intentionally not part of default refresh; PostgreSQL migration remains `missing` until current integration smoke or a release gate with the actual `postgres migration up/down smoke` step runs.

# 2026-06-05 AutoWaterSimu Next release gate traceability TODO

- [x] Re-read README First context, Certainty/Elegance PRD/Plan, current-state, scripts/ci README, and scripts/release README
- [x] Confirm next aligned gap: `next-release-gates.json` lacked commit/dirty metadata, so golden scenario summary could not distinguish current release evidence from unknown-commit evidence
- [x] Add commit/branch/tracked-untracked dirty-state metadata to release gate evidence
- [x] Make golden scenario summary count PostgreSQL migration release evidence only when the `postgres migration up/down smoke` step exists and passed
- [x] Update README/architecture/plan/change records
- [x] Run validation
- [x] Commit and push

## Plan

- Keep release gate steps and workflow behavior unchanged.
- Add metadata to `next-release-gates.json` for traceability.
- Add a derived `postgres_migration_release_gate` source in `golden-scenarios.ps1` so generic release-gate success is not treated as migration proof.

## Review

- Added commit SHA, branch, dirty-state, tracked changes, and untracked files to `next-release-gates.json`.
- Added a derived `postgres_migration_release_gate` source to `golden-scenarios.ps1`; it remains `missing` unless the release gate includes a passed `postgres migration up/down smoke` step.
- Updated release/ci README, architecture current-state/local-dev, Certainty/Elegance plan, and `.ai/changes`.
- Validation passed: `scripts\release\next-release-gates.ps1 -Mode merge -SkipLong`, `scripts\ci\golden-scenarios.ps1`, JSON assertion that `release_gate` is current and `postgres_migration_release_gate` remains missing when the migration step did not run, PowerShell parse checks for both edited scripts, `git diff --check -- scripts docs tasks .ai`, and the docs/rebuild P0/P1/P2/schema search.

# 2026-06-05 AutoWaterSimu Next golden scenario evidence summary TODO

- [x] Re-read README First context, Certainty/Elegance PRD/Plan, current-state, scripts/ci README, workflow README, and root task entry
- [x] Attempt hosted integration workflow dispatch for the pushed branch
- [x] Record that hosted dispatch is not yet usable from this branch because GitHub returned `workflow not found on the default branch`
- [x] Add local golden scenario evidence summary script and root task
- [x] Update README/architecture/plan/change records
- [x] Run validation
- [x] Commit and push

## Plan

- Add a summary-only script that reads existing CI/release evidence and writes `tmp\ci-evidence\golden-scenarios.json`.
- Require lane evidence commit SHA to match the current report commit before counting it as a passed source for a scenario.
- Keep all 8 golden scenarios incomplete unless direct scenario evidence proves completion; this stage creates the map, not the final scenario coverage.

## Review

- Added `scripts/ci/golden-scenarios.ps1` and `just golden-scenarios`.
- The summary reads existing `tmp\ci-evidence` and `tmp\release-evidence` lane JSON files, records commit relation (`current` / `stale` / `unknown` / `missing`), and counts only current-commit passed lanes as scenario evidence sources.
- Fixed the CI dirty-state helper arrays in pr-fast, browser, security, Desktop package, and integration smoke scripts after post-commit validation exposed a single-item `.Count` strict-mode failure.
- Updated root README, scripts READMEs, architecture current-state/local-dev, Certainty/Elegance plan, and `.ai/changes`.
- Hosted integration dispatch was attempted with `gh workflow run next-integration-smoke.yml --ref codex/autowatersimu-next-rebuild`, but GitHub returned `workflow not found on the default branch`; no hosted green evidence was claimed.
- Validation passed: `scripts\ci\pr-fast.ps1`, `scripts\ci\browser-smoke.ps1`, `scripts\ci\security-smoke.ps1`, `scripts\ci\desktop-package-smoke.ps1`, `scripts\release\smoke-release-artifact-download.ps1`, `scripts\ci\golden-scenarios.ps1`, JSON assertion for 8 scenarios and schema version, `git diff --check -- README.md Justfile scripts docs tasks .ai`, and the docs/rebuild P0/P1/P2/schema search.
- Current generated summary reported `status=partial`, `covered=0`, `partial=7`, `missing=1`, `blocked=0`; `integration` remained stale, `release_gate` had unknown commit relation, and `downloaded_release_artifacts` was missing.

# 2026-06-05 AutoWaterSimu Next CI evidence dirty-state taxonomy TODO

- [x] Re-read README First context, Certainty/Elegance PRD/Plan, current-state, local-dev, and scripts/ci README
- [x] Confirm next aligned gap: local smoke evidence had broad dirty flags only, so untracked local docs made evidence hard to interpret even when tracked HEAD intent was clear
- [x] Add tracked/untracked dirty-state fields to PR fast, integration, security, browser, and Desktop package smoke evidence
- [x] Update CI and architecture documentation plus change records
- [x] Run validation
- [x] Commit and push

## Plan

- Preserve existing `is_dirty_*` and `dirty_files_*` fields for backward compatibility.
- Add only evidence metadata fields; do not change smoke steps, workflow files, business code, API shape, generated clients, or UI behavior.
- Treat the new fields as local evidence interpretation help only; hosted green runs and true clean HEAD proof remain separate requirements.

## Review

- Added backward-compatible tracked/untracked dirty-state fields to `pr-fast`, integration, security, browser, and Desktop package smoke evidence.
- Existing `is_dirty_*` and `dirty_files_*` fields remain unchanged for readers that already consume them.
- Updated `scripts/ci/README.md`, `docs/architecture/current-state.md`, `docs/architecture/local-dev.md`, the Certainty/Elegance development plan, and `.ai/changes`.
- Validation passed: `scripts\ci\browser-smoke.ps1`, `scripts\ci\security-smoke.ps1`, `scripts\ci\desktop-package-smoke.ps1`, `scripts\ci\pr-fast.ps1`, PowerShell parse check for `scripts\ci\integration-smoke.ps1`, generated evidence JSON field assertions for browser/security/Desktop/pr-fast, and `git diff --check -- scripts docs tasks .ai` with LF/CRLF warnings only.
- Full `scripts\ci\integration-smoke.ps1 -StartCompose` was not run in this slice because it requires starting the Docker Compose stack; the edited integration script path was syntax-checked and keeps the same execution steps.

# 2026-06-05 AutoWaterSimu Next browser current-flow evidence TODO

- [x] Re-read README First context, Certainty/Elegance PRD/Plan, current-state, scripts/ci README, frontend route/feature READMEs, and existing Playwright smokes
- [x] Confirm next aligned gap: current-flow browser smoke submitted jobs and read result/readiness, but mocked evidence package and evidence-ref endpoints were not exercised by UI interactions
- [x] Extend `compute-jobs-current-flow.spec.ts` to click evidence package download and resolve an evidence ref for the selected job
- [x] Update browser smoke evidence summary and documentation
- [x] Run validation
- [x] Commit and push

## Plan

- Keep route code, feature query wrappers, generated client, backend API, OpenAPI, and UI markup unchanged.
- Strengthen the existing mock-backed current-flow browser smoke instead of creating a parallel test entry.
- Record that this improves browser evidence only; live PostgreSQL/MinIO/worker authenticated browser reads remain a later slice.

## Review

- Extended `compute-jobs-current-flow.spec.ts` to exercise the selected job's evidence package download and evidence ref resolution UI paths.
- `scripts/ci/browser-smoke.ps1` now records `evidence_package_download` and `evidence_ref_resolution` in `coverage_summary`.
- Updated `frontend/tests/README.md`, `scripts/ci/README.md`, architecture current-state, Certainty/Elegance plan, and `.ai/changes`.
- No route code, feature query wrappers, generated client, backend API, OpenAPI, route path, or UI markup changed.
- Validation passed: focused Playwright current-flow spec, full `scripts\ci\browser-smoke.ps1`, `cd frontend; npx tsc --noEmit`, `scripts\check-deps.ps1`, and `scripts\ci\pr-fast.ps1`.
- `tmp\ci-evidence\browser-smoke.json` includes the new coverage fields and correctly records `is_dirty_before=true` / `is_dirty_after=true` because this stage was not committed yet.
- Remaining scope: live PostgreSQL/MinIO/worker browser reads, hosted browser workflow green run, hosted integration/release evidence, deeper route/component decomposition, golden scenarios, full production data scope, and all-mutation audit remain future slices.

# 2026-06-05 AutoWaterSimu Next frontend route query boundary check TODO

- [x] Re-read README First context, Certainty/Elegance PRD/Plan, current-state, frontend route/feature/service READMEs, scripts README, and existing dependency graph
- [x] Confirm next aligned gap: Compute routes now use `features/*/queries.ts`, but `check-deps` did not yet reject route imports that bypassed the feature query boundary through `computeJobsService` or feature private API files
- [x] Add a `frontend-routes-must-use-feature-query-boundaries-for-compute` dependency rule to `scripts/check-deps.ps1`
- [x] Update README/architecture/checklists/change records
- [x] Run validation
- [x] Commit and push

## Plan

- Keep business code, generated clients, OpenAPI, route UI, route paths, and service facade exports unchanged.
- Add only an enforceable dependency rule for the already-migrated route/query boundary.
- Record the rule in `scripts/README.md`, `docs/architecture`, the Certainty/Elegance plan, and `.ai/changes`.
- Treat live backend browser reads, hosted green evidence, and deeper component decomposition as later slices.

## Review

- Added `frontend-routes-must-use-feature-query-boundaries-for-compute` to `scripts/check-deps.ps1`.
- The new rule scans `frontend/src/routes` and rejects route imports of `computeJobsService` or feature private `api` / `builders` / `processGraphApi` files.
- No business code, generated clients, OpenAPI, route paths, route UI, service facade exports, or feature API exports changed.
- Updated `scripts/README.md`, architecture dependency/current-state/module-map docs, Certainty/Elegance plan checklist, and `.ai/changes`.
- Validation passed: `scripts\check-deps.ps1`, direct route boundary `rg` scan with no matches, direct generated Compute client import scan limited to allowed `features` and `shared/api` paths, `cd frontend; npx tsc --noEmit`, `scripts\ci\pr-fast.ps1`, and `git diff --check -- scripts docs tasks .ai` with LF/CRLF warnings only.
- Remaining scope: live backend browser reads, hosted integration/browser/release evidence, deeper route/component decomposition, golden scenarios, full production data scope, and all-mutation audit remain future slices.

# 2026-06-05 AutoWaterSimu Next frontend feature query migration TODO

- [x] Re-read README First context, Certainty/Elegance PRD/Plan, current-state, frontend README hierarchy, feature READMEs, Compute routes, and current feature API wrappers
- [x] Confirm next aligned gap: feature API wrappers existed, but Compute Jobs / Lifecycle / Model Governance routes still encoded query keys, query functions, and mutation functions directly around `computeJobsService`
- [x] Add feature query/mutation option files for compute jobs, lifecycle, model governance, and contract validation/draft confirmation
- [x] Migrate Compute Jobs, Compute Lifecycle, and Model Governance routes to feature query/mutation options while preserving UI state, route markup, query keys, retry/refetch/stale behavior, invalidation behavior, and local onSuccess/onError handlers
- [x] Keep generated client output, OpenAPI, backend API, route paths, UI layout, service facade export, and service return shapes unchanged
- [x] Update README/architecture/checklists/change records
- [x] Run validation
- [x] Commit and push

## Plan

- Add `features/*/queries.ts` files that wrap existing feature APIs as TanStack Query query/mutation options.
- Keep routes responsible for layout, local state, result display, and invalidation side effects.
- Remove Compute route imports of `computeJobsService`; keep `computeJobsService.ts` as a compatibility facade for old/transition call sites.
- Treat live backend browser reads and deeper route/component decomposition as later slices.

## Review

- Added `features/compute-jobs/queries.ts`, `features/lifecycle/queries.ts`, `features/model-governance/queries.ts`, and `features/contracts/queries.ts`.
- Compute Jobs, Compute Lifecycle, and Model Governance routes now import feature query/mutation options instead of `computeJobsService`.
- Existing route UI, route paths, query invalidation, local state updates, retry/refetch/stale behavior, and generated client/API behavior were preserved.
- `computeJobsService.ts` remains as a compatibility facade, but it is no longer used by the three Compute routes.
- Validation passed: `cd frontend; npx tsc --noEmit`, `scripts\check-deps.ps1`, direct `computeJobsService` route/feature scan, direct generated Compute client import scan, `scripts\ci\pr-fast.ps1`, and `git diff --check -- frontend docs tasks .ai` with LF/CRLF warnings only.
- Remaining scope: live backend browser reads, hosted integration/browser/release evidence, deeper route/component decomposition, golden scenarios, full production data scope, and all-mutation audit remain future slices.

# 2026-06-04 AutoWaterSimu Next frontend feature API wrapper migration TODO

- [x] Re-read README First context, Certainty/Elegance PRD/Plan, frontend README hierarchy, current service wrapper groups, caller usage, dependency graph, and `check-deps`
- [x] Confirm next aligned gap: previous same-directory Compute service split still left generated client access inside `frontend/src/services`, while the quality plan calls for `shared/api` and `features/*` wrapper slices
- [x] Move Compute API base URL/token config and shared UI-facing types into `frontend/src/shared/api`
- [x] Move jobs/builders/process graph, artifact lifecycle, model governance, and contract/draft/result explanation wrappers into `frontend/src/features/*`
- [x] Preserve `computeJobsService` as route-compatible facade and keep existing route imports/call sites unchanged
- [x] Tighten `check-deps` so direct generated Compute client imports are allowed only in `frontend/src/shared/api`, `frontend/src/features`, or generated client files
- [x] Update README/architecture/checklists/change records
- [x] Run validation
- [x] Commit and push

## Plan

- Keep `frontend/src/services/computeJobsService.ts` as the compatibility facade for existing routes/components.
- Move generated client configuration and shared wrapper types to `frontend/src/shared/api`.
- Move concrete Compute endpoint wrappers to `frontend/src/features/compute-jobs`, `features/lifecycle`, `features/model-governance`, and `features/contracts`.
- Add directory READMEs for the new long-lived feature/shared boundaries.
- Treat `features/*/queries.ts` and route call site migration as a later slice after the facade-backed API wrapper structure is verified.

## Review

- Added `frontend/src/shared/api/computeApiClient.ts` and `computeTypes.ts` for shared Compute client configuration and UI-facing wrapper types.
- Moved concrete Compute wrappers into `features/compute-jobs`, `features/lifecycle`, `features/model-governance`, and `features/contracts`; added `features/evidence/README.md` as the future evidence-specific boundary while current evidence calls remain in job/lifecycle wrappers.
- `computeJobsService.ts` now only composes feature wrappers and re-exports existing compatibility types/builders; route imports and call sites remain unchanged.
- `scripts/check-deps.ps1` now rejects direct generated Compute client imports outside `frontend/src/shared/api`, `frontend/src/features`, and generated client files.
- Updated frontend README hierarchy, architecture docs, Certainty/Elegance plan, and change records.
- Validation passed: `cd frontend; npx tsc --noEmit`, `scripts\check-deps.ps1`, direct Compute generated client import scan, `scripts\ci\pr-fast.ps1`, and `git diff --check -- frontend scripts docs tasks .ai` with LF/CRLF warnings only.
- Remaining scope: `features/*/queries.ts`, route call site migration, live backend browser reads, hosted integration/browser/release evidence, golden scenarios, full production data scope, and all-mutation audit remain future slices.

# 2026-06-04 AutoWaterSimu Next frontend Compute service facade split TODO

- [x] Re-read README First context, Certainty/Elegance PRD/Plan, frontend README hierarchy, current service wrapper, caller usage, and recent Compute client boundary record
- [x] Confirm next aligned gap: `computeJobsService.ts` still bundled jobs, artifacts/evidence, model governance, contracts/drafts/result explanations, process graph registry, demo job builders, shared types, and facade wiring after generated client boundary tightening
- [x] Split Compute service wrapper into same-directory handwritten service submodules while preserving the existing `computeJobsService` facade and public type exports
- [x] Preserve generated client output, route imports/call sites, method names, environment/token behavior, service return shapes, OpenAPI, backend API, and UI behavior
- [x] Update README/architecture/checklists/change records
- [x] Run validation
- [x] Commit and push

## Plan

- Keep `frontend/src/services/computeJobsService.ts` as the route-compatible facade.
- Move stable helper/build/API groups into `computeJobsTypes.ts`, `computeJobBuilders.ts`, `computeJobApi.ts`, `computeArtifactsApi.ts`, `computeModelGovernanceApi.ts`, `computeContractsApi.ts`, and `computeSimulationRegistryApi.ts`.
- Do not create `features/*` yet; this is a low-risk same-directory service surface split that prepares later feature-sliced migration.

## Review

- `computeJobsService.ts` now composes same-directory service groups instead of holding all Compute API wrapper logic in one large file.
- Added `computeJobsTypes.ts` for UI-facing wrapper interfaces and generated type re-exports.
- Added `computeJobBuilders.ts` for demo/current-flow job document builders.
- Added `computeJobApi.ts`, `computeArtifactsApi.ts`, `computeModelGovernanceApi.ts`, `computeContractsApi.ts`, and `computeSimulationRegistryApi.ts` for route-compatible handwritten API wrapper groups.
- Existing route imports and `computeJobsService.*` call sites remain unchanged.
- Validation passed: `cd frontend; npx tsc --noEmit`, `scripts\check-deps.ps1`, direct Compute generated client import scan, `scripts\ci\pr-fast.ps1`, and `git diff --check -- frontend docs tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full `frontend/src/features/*/api.ts` / `queries.ts` migration, live backend browser reads, hosted integration/browser/release evidence, golden scenarios, full production data scope, and all-mutation audit remain future slices.

# 2026-06-04 AutoWaterSimu Next frontend Compute client boundary TODO

- [x] Re-read README First context, Certainty/Elegance PRD/Plan, frontend README hierarchy, dependency graph, check-deps script, and current Compute client imports
- [x] Confirm next aligned gap: `frontend/src/main.tsx` still imported `frontend/src/client/compute` directly for bootstrap configuration while the quality plan wants generated Compute client access isolated behind service/API wrappers
- [x] Move Compute API base URL/token configuration behind a handwritten frontend service wrapper
- [x] Update `computeJobsService` to reuse the wrapper instead of reading generated `OpenAPI` directly
- [x] Tighten `check-deps` so generated Compute client imports are allowed only from `frontend/src/services` or the generated client directory itself
- [x] Update README/architecture/checklists/change records
- [x] Run validation
- [ ] Commit and push

## Plan

- Add `frontend/src/services/computeApiClient.ts` as the service/API wrapper for Compute generated client configuration and token resolution.
- Keep `frontend/src/client/compute` generated files untouched.
- Preserve `VITE_COMPUTE_API_URL`, `VITE_COMPUTE_API_TOKEN`, `localStorage.compute_access_token`, default `dev-public-token`, service method behavior, routes, OpenAPI, and generated client output.
- Treat this as frontend dependency-boundary tightening only, not a feature-sliced UI migration or API behavior change.

## Review

- Added `frontend/src/services/computeApiClient.ts` as the handwritten service/API wrapper for generated Compute client base URL, token resolution, path construction, and bootstrap configuration.
- `frontend/src/main.tsx` now calls `configureComputeApiClient()` instead of importing `frontend/src/client/compute` directly.
- `computeJobsService.ts` now reuses `computeApiBaseUrl`, `computeApiPath`, and `resolveComputeApiToken`, while still keeping generated Compute endpoint calls behind the service layer.
- `scripts/check-deps.ps1` now scans all `frontend/src` code and only allows direct generated Compute client imports from `frontend/src/services` or `frontend/src/client/compute` itself.
- Updated frontend README context, dependency graph/current-state docs, Certainty/Elegance plan checklist, and `.ai/changes`.
- Validation passed: `scripts\check-deps.ps1`, `cd frontend; npx tsc --noEmit`, `scripts\ci\pr-fast.ps1`, direct import `rg` check, and `git diff --check -- frontend scripts docs tasks .ai` with LF/CRLF warnings only.
- Remaining scope: complete feature-sliced `features/*/api.ts` and `queries.ts` migration, live backend browser evidence, hosted integration/browser/release evidence, and broader golden scenario automation remain future slices.

# 2026-06-04 AutoWaterSimu Next draft/result explanation persistence file split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance PRD/Plan, API/compute READMEs, current-state, compute-api architecture, and draft/result explanation persistence code
- [x] Confirm next aligned gap: `memory_agent.go` and `postgres_agent.go` still bundled `DraftConfirmationStore` and `ResultExplanationStore` persistence after workflow and constructor boundary splits
- [x] Split MemoryStore draft confirmation/result explanation persistence into same-package store-interface files
- [x] Split PostgreSQL draft confirmation/result explanation persistence into same-package store-interface files
- [x] Preserve Store interfaces, service/HTTP/OpenAPI/contracts/generated clients, DTOs, SQL, migrations, scan field order, transaction semantics, idempotency/conflict, review/publish state transitions, clone semantics, and error mapping
- [x] Update README/architecture/checklists/change records
- [x] Run validation
- [x] Commit and push

## Plan

- Delete the old broad `memory_agent.go` and move its functions unchanged into `memory_draft_confirmations.go` and `memory_result_explanations.go`.
- Delete the old broad `postgres_agent.go` and move its functions unchanged into `postgres_draft_confirmations.go` and `postgres_result_explanations.go`.
- Treat this as persistence surface reduction only, not a draft/result explanation domain package migration, schema migration, API behavior change, or constructor signature change.

## Review

- Replaced `memory_agent.go` with `memory_draft_confirmations.go` and `memory_result_explanations.go`.
- Replaced `postgres_agent.go` with `postgres_draft_confirmations.go` and `postgres_result_explanations.go`.
- The split follows the existing `DraftConfirmationStore` and `ResultExplanationStore` boundaries from `store_interfaces.go`.
- `MemoryStore` maps/locking/clone behavior, `PostgresStore` SQL/transactions/select helpers/scan field order, idempotency/conflict behavior, review/publish state transitions, Store interfaces, service/HTTP/OpenAPI/contracts/generated clients, DTOs, migrations, and error mapping were preserved.
- Updated API/compute README, architecture current-state, compute-api audit summary, Certainty/Elegance checklist, and `.ai/changes`.
- Validation passed: focused `go test ./internal/domain/agent ./internal/domain/evidence ./internal/compute -run "Test(ContractValidationEndpoint|NewSystemEvidenceReferenceE2E|ValidateDraftConfirmationEnvelope|DraftConfirmationRecordDataFromDocument|ResultExplanationEvidenceRefs|ResultExplanationRecordDataFromDocument)$" -count=1`, full `go test ./...`, `scripts\audit-compute-api-boundary.ps1`, `scripts\check-deps.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full agent draft workflow domain package migration, full result explanation workflow domain package migration, future persistence adapter extraction, public constructor signature narrowing, hosted integration/browser/release evidence, full object-level data scope, and all-mutation audit remain future slices.

# 2026-06-04 AutoWaterSimu Next model governance MemoryStore persistence file split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance PRD/Plan, API/compute READMEs, current-state, compute-api architecture, and model governance MemoryStore persistence code
- [x] Confirm next aligned gap: `memory_models.go` still bundled model_run, benchmark_run, and model_catalog in-memory persistence after workflow, HTTP, and PostgreSQL splits
- [x] Split model governance MemoryStore persistence into same-package files aligned with existing store interfaces
- [x] Preserve Store interfaces, PostgresStore behavior, service/HTTP/OpenAPI/contracts/generated clients, DTOs, pagination, ordering, idempotency/conflict, clone semantics, and error mapping
- [x] Update README/architecture/checklists/change records
- [x] Run validation
- [x] Commit and push

## Plan

- Delete the old broad `memory_models.go` file and move its functions unchanged into `memory_model_runs.go`, `memory_benchmark_runs.go`, and `memory_model_catalog.go`.
- Keep `MemoryStore`, maps, locking, cursor pagination, sort order, raw JSON clone behavior, list filters, and idempotency semantics unchanged.
- Treat this as MemoryStore persistence surface reduction only, not a model governance domain package migration or store schema/API change.

## Review

- Replaced `memory_models.go` with `memory_model_runs.go`, `memory_benchmark_runs.go`, and `memory_model_catalog.go`.
- The split follows the existing `ModelRunStore`, `BenchmarkRunStore`, and `ModelCatalogStore` boundaries from `store_interfaces.go`.
- `MemoryStore` maps, locking, raw JSON clone behavior, list filters, cursor pagination, sort order, idempotency/conflict behavior, Store interfaces, PostgresStore behavior, service/HTTP/OpenAPI/contracts/generated clients, DTOs, and error mapping were preserved.
- Updated API/compute README, architecture current-state, compute-api audit summary, Certainty/Elegance checklist, and `.ai/changes`.
- Validation passed: focused `go test ./internal/compute -run "Test(ValidatedCompletePersistsModelRun|ModelCatalogEndpoint|DefaultParameterSetPromotionPlanEndpoint|BenchmarkCaseScheduleRunEndpoint)$" -count=1`, full `go test ./...`, `scripts\audit-compute-api-boundary.ps1`, `scripts\check-deps.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full model governance domain package migration, future in-memory adapter extraction, public constructor signature narrowing, hosted integration/browser/release evidence, full object-level data scope, and all-mutation audit remain future slices.

# 2026-06-04 AutoWaterSimu Next model governance PostgreSQL persistence file split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance PRD/Plan, API/compute READMEs, current-state, compute-api architecture, and model governance PostgreSQL persistence code
- [x] Confirm next aligned gap: `postgres_models.go` still bundled model_run, benchmark_run, and model_catalog persistence after workflow and HTTP handler splits
- [x] Split model governance PostgreSQL persistence into same-package files aligned with existing store interfaces
- [x] Preserve SQL, migrations, Store interfaces, MemoryStore behavior, service/HTTP/OpenAPI/contracts/generated clients, DTOs, pagination, ordering, and error mapping
- [x] Update README/architecture/checklists/change records
- [x] Run validation
- [x] Commit and push

## Plan

- Delete the old broad `postgres_models.go` file and move its functions unchanged into `postgres_model_runs.go`, `postgres_benchmark_runs.go`, and `postgres_model_catalog.go`.
- Keep `PostgresStore`, migrations, table schema, select SQL, scan functions, list filters, cursor behavior, and idempotency semantics unchanged.
- Treat this as PostgreSQL persistence surface reduction only, not a model governance domain package migration or schema migration.

## Review

- Replaced `postgres_models.go` with `postgres_model_runs.go`, `postgres_benchmark_runs.go`, and `postgres_model_catalog.go`.
- The split follows the existing `ModelRunStore`, `BenchmarkRunStore`, and `ModelCatalogStore` boundaries from `store_interfaces.go`.
- SQL statements, query ordering, cursor pagination, idempotency/conflict behavior, scan field order, null handling, Store interfaces, MemoryStore behavior, service/HTTP/OpenAPI/contracts/generated clients, DTOs, migrations, and persistence semantics were preserved.
- Updated API/compute README, architecture current-state, compute-api audit summary, Certainty/Elegance checklist, and `.ai/changes`.
- Validation passed: focused `cd apps\api; go test ./internal/compute -run "Test(ValidatedCompletePersistsModelRun|ModelCatalogEndpoint|DefaultParameterSetPromotionPlanEndpoint|BenchmarkCaseScheduleRunEndpoint)$" -count=1`, full `cd apps\api; go test ./...`, `scripts\audit-compute-api-boundary.ps1`, `scripts\check-deps.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full model governance domain package migration, future PostgreSQL adapter extraction, public constructor signature narrowing, hosted integration/browser/release evidence, full object-level data scope, and all-mutation audit remain future slices.

# 2026-06-04 AutoWaterSimu Next model governance HTTP handler file split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance PRD/Plan, API/compute READMEs, current-state, compute-api architecture, and model governance HTTP handler code
- [x] Confirm next aligned gap: `http_models.go` still bundled model catalog, default parameter set, benchmark case, benchmark run, and model run HTTP mappings after workflow-level model governance split
- [x] Split model governance HTTP handlers into same-package files aligned with existing model governance workflow groups
- [x] Preserve route registration, HTTP methods, auth scopes, request parsing, response mapping, OpenAPI/contracts/generated clients, DTOs, service/store behavior, and persistence
- [x] Update README/architecture/checklists/change records
- [x] Run validation
- [x] Commit and push

## Plan

- Delete the old broad `http_models.go` file and keep its handler names reachable from `http.go` route registration through narrower same-package files.
- Group HTTP mapping into catalog, default parameter set, benchmark case schedule-run, benchmark run history, and model run lookup files.
- Treat this as HTTP handler surface reduction only, not a model governance domain package migration or API behavior change.

## Review

- Replaced `http_models.go` with `http_model_catalog.go`, `http_model_parameters.go`, `http_model_benchmark_cases.go`, `http_benchmark_runs.go`, and `http_model_runs.go`.
- `modelCatalog`, `modelCatalogByKey`, `benchmarkRunByID`, `modelRuns`, and `modelRunByID` remain the route registration handlers used by `http.go`; the new helpers only split the original same-package branches.
- HTTP methods, paths, auth scopes, request validation errors, audit principal propagation for benchmark case schedule-run, service calls, response statuses, OpenAPI, contracts, migrations, generated clients, DTOs, and store/service behavior were preserved.
- Updated API/compute README, architecture current-state, compute-api audit summary, Certainty/Elegance checklist, and `.ai/changes`.
- Validation passed: focused `cd apps\api; go test ./internal/compute -run "Test(ValidatedCompletePersistsModelRun|ModelCatalogEndpoint|DefaultParameterSetPromotionPlanEndpoint|BenchmarkCaseScheduleRunEndpoint)$" -count=1`, full `cd apps\api; go test ./...`, `scripts\audit-compute-api-boundary.ps1`, `scripts\check-deps.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full model governance HTTP mapping migration to a future domain/app boundary, future PostgreSQL adapter extraction, full model governance domain package migration, public constructor signature narrowing, hosted integration/browser/release evidence, full object-level data scope, and all-mutation audit remain future slices.

# 2026-06-04 AutoWaterSimu Next job lifecycle workflow file split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance PRD/Plan, API/compute/domain-jobs/domain-models/domain-evidence READMEs, current-state, compute-api architecture, and job lifecycle workflow code
- [x] Confirm next aligned gap: `job_lifecycle.go` remained the core unsplit narrowed compute workflow file after result explanation workflow split
- [x] Split `JobLifecycleService` workflows into same-package create, read, state, and completion files
- [x] Preserve job lifecycle behavior, HTTP/OpenAPI/contracts/migrations/generated clients/auth scopes/store interfaces/public `Service` methods and constructor boundaries
- [x] Update README/architecture/checklists/change records
- [x] Run full validation
- [x] Commit and push

## Plan

- Keep `job_lifecycle.go` as `JobLifecycleService` struct, constructor, store dependencies, validator, clock, and artifact-listing callback wiring.
- Move only same-package workflow methods into `job_lifecycle_create.go`, `job_lifecycle_read.go`, `job_lifecycle_state.go`, and `job_lifecycle_completion.go`.
- Treat this as handler/package surface reduction and large-file cleanup, not a full job lifecycle domain package migration or public constructor signature change.

## Review

- `job_lifecycle.go` now keeps only the `JobLifecycleService` struct, constructor, store dependencies, validator, clock, and artifact-listing callback wiring, reducing it from 228 lines in the previous architecture snapshot to 27 lines.
- Job lifecycle workflows were split into same-package `job_lifecycle_create.go`, `job_lifecycle_read.go`, `job_lifecycle_state.go`, and `job_lifecycle_completion.go`.
- Public `Service` delegates, `JobLifecycleService` method signatures, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, store interfaces, job idempotency/audit events, worker stale checks, result/model-run persistence, timeout sweep behavior, and snapshot assembly were preserved.
- Updated API/compute README, architecture current-state, compute-api audit summary, Certainty/Elegance checklist, and `.ai/changes`.
- Validation passed: focused `cd apps\api; go test ./internal/domain/jobs ./internal/domain/models ./internal/domain/evidence ./internal/compute -run "Test(CreateJobIdempotencyDuplicateAndConflict|WorkerLifecycleArtifactSucceedAndDownload|CancelRejectsLateResult|ValidatedWorkerFailPersistsTerminalResult|ValidatedCompletePersistsModelRun|TimeoutSweepAndPagination|HTTPMutationAuditEventEnvelopeForJobCreate)$" -count=1`, full `cd apps\api; go test ./...`, `scripts\audit-compute-api-boundary.ps1`, `scripts\check-deps.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full job lifecycle domain package migration, job DTO/store adapter extraction, HTTP mapping migration, public `NewService` / `NewServiceWithArchive` signature narrowing, full object-level data scope, all-mutation audit, and hosted integration/release evidence remain future slices.

# 2026-06-04 AutoWaterSimu Next result explanation workflow file split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance PRD/Plan, API/compute/domain-evidence READMEs, current-state, compute-api architecture, and result explanation workflow code
- [x] Confirm next aligned gap: `result_explanations.go` remained an unsplit narrowed compute workflow file after draft workflow split
- [x] Split `ResultExplanationService` workflows into same-package submit, read, and review/publish files
- [x] Preserve result explanation behavior, HTTP/OpenAPI/contracts/migrations/generated clients/auth scopes/store interfaces/public `Service` methods and constructor boundaries
- [x] Update README/architecture/checklists/change records
- [x] Run full validation
- [x] Commit and push

## Plan

- Keep `result_explanations.go` as `ResultExplanationService` struct, constructor, and job-scoped evidence resolver callback wiring.
- Move only same-package workflow methods into `result_explanations_submit.go`, `result_explanations_read.go`, and `result_explanations_review.go`.
- Treat this as handler/package surface reduction and large-file cleanup, not a full result explanation workflow domain package migration or public constructor signature change.

## Review

- `result_explanations.go` now keeps only the `ResultExplanationService` struct, constructor, store dependencies, validator, clock, and evidence resolver callback wiring, reducing it from 150 lines in the previous architecture snapshot to 29 lines.
- Result explanation workflows were split into same-package `result_explanations_submit.go`, `result_explanations_read.go`, and `result_explanations_review.go`.
- Public `Service` delegates, `ResultExplanationService` method signatures, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, store interfaces, result explanation persistence/idempotency, review/publish behavior, and job-scoped evidence ref validation behavior were preserved.
- Updated API/compute README, architecture current-state, compute-api audit summary, Certainty/Elegance checklist, and `.ai/changes`.
- Validation passed: focused `cd apps\api; go test ./internal/domain/evidence ./internal/compute -run "TestValidatedCompletePersistsModelRun|TestNewSystemEvidenceReferenceE2E" -count=1`, full `cd apps\api; go test ./...`, `scripts\audit-compute-api-boundary.ps1`, `scripts\check-deps.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full result explanation workflow domain package migration, schema validation/job availability/evidence resolver orchestration migration, Memory/Postgres implementations, HTTP mapping, public `NewService` / `NewServiceWithArchive` signature narrowing, and broader production-security work remain future slices.

# 2026-06-04 AutoWaterSimu Next draft workflow file split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance PRD/Plan, API/compute/domain-agent READMEs, current-state, compute-api architecture, and draft workflow code
- [x] Confirm next aligned gap: `draft_workflows.go` remained a large narrowed compute workflow file after simulation input workflow split
- [x] Split `DraftWorkflowService` workflows into same-package confirmation, constraint plan, and promotion files
- [x] Preserve draft workflow behavior, HTTP/OpenAPI/contracts/migrations/generated clients/auth scopes/store interfaces/public `Service` methods and constructor boundaries
- [x] Update README/architecture/checklists/change records
- [x] Run full validation
- [x] Commit and push

## Plan

- Keep `draft_workflows.go` as `DraftWorkflowService` struct, constructor, store dependency, validator, clock, and simulation-check callback wiring.
- Move only same-package workflow methods into `draft_workflows_confirmations.go`, `draft_workflows_constraints.go`, and `draft_workflows_promotion.go`.
- Treat this as handler/package surface reduction and large-file cleanup, not a full agent draft workflow domain package migration or public constructor signature change.

## Review

- `draft_workflows.go` now keeps only the `DraftWorkflowService` struct, constructor, store dependency, validator, clock, and simulation-check callback wiring, reducing it from 237 lines in the previous architecture snapshot to 25 lines.
- Draft workflows were split into same-package `draft_workflows_confirmations.go`, `draft_workflows_constraints.go`, and `draft_workflows_promotion.go`.
- Public `Service` delegates, `DraftWorkflowService` method signatures, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, store interfaces, draft confirmation persistence/idempotency, advisory constraint plan behavior, and explicit simulation-check promotion behavior were preserved.
- Updated API/compute README, architecture current-state, compute-api audit summary, Certainty/Elegance checklist, and `.ai/changes`.
- Validation passed: focused `cd apps\api; go test ./internal/domain/agent ./internal/compute -run "TestContractValidationEndpoint|TestSimulationCheckEndpointCreatesComputeJob" -count=1`, full `cd apps\api; go test ./...`, `scripts\audit-compute-api-boundary.ps1`, `scripts\check-deps.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full agent draft workflow domain package migration, schema validation, confirmation persistence/readback, promotion orchestration, Memory/Postgres implementations, HTTP mapping, public `NewService` / `NewServiceWithArchive` signature narrowing, and broader production-security work remain future slices.

# 2026-06-04 AutoWaterSimu Next simulation input workflow file split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance PRD/Plan, API/compute/domain-simulation READMEs, current-state, compute-api architecture, and simulation input workflow code
- [x] Confirm next aligned gap: `simulation_inputs.go` remained the largest unsplit narrowed compute workflow file after artifact/model/evidence governance workflow splits
- [x] Split `SimulationInputService` workflows into same-package simulation input registry, process graph registry/projection, and input-ref resolution files
- [x] Preserve simulation input/process graph behavior, HTTP/OpenAPI/contracts/migrations/generated clients/auth scopes/store interfaces/public `Service` methods and constructor boundaries
- [x] Update README/architecture/checklists/change records
- [x] Run full validation
- [x] Commit and push

## Plan

- Keep `simulation_inputs.go` as `SimulationInputService` struct, constructor, replay store interface, and store wiring.
- Move only same-package workflow methods into `simulation_inputs_registry.go`, `simulation_inputs_process_graphs.go`, and `simulation_inputs_resolution.go`.
- Treat this as handler/package surface reduction and large-file cleanup, not a full simulation input/process graph domain package migration or public constructor signature change.

## Review

- `simulation_inputs.go` now keeps only the `SimulationInputService` struct, replay store interface, constructor, and store wiring, reducing it from 289 lines in the previous architecture snapshot to 33 lines.
- Simulation input workflows were split into same-package `simulation_inputs_registry.go`, `simulation_inputs_process_graphs.go`, and `simulation_inputs_resolution.go`.
- Public `Service` delegates, `SimulationInputService` method signatures, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, store interfaces, process graph validation/projection, record mapping, idempotency, and model-run replay behavior were preserved.
- Updated API/compute README, architecture current-state, compute-api audit summary, Certainty/Elegance checklist, and `.ai/changes`.
- Validation passed: focused `cd apps\api; go test ./internal/compute -run "TestSimulationCheckEndpointCreatesComputeJob|TestProcessGraphEvidenceReference|TestBenchmarkCaseScheduleRunEndpoint" -count=1`, full `cd apps\api; go test ./...`, `scripts\audit-compute-api-boundary.ps1`, `scripts\check-deps.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full simulation input/process graph domain package migration, schema validation/input_ref orchestration, metadata persistence, Memory/Postgres implementations, evidence-ref lookup, HTTP mapping, public `NewService` / `NewServiceWithArchive` signature narrowing, and broader production-security work remain future slices.

# 2026-06-03 AutoWaterSimu Next artifact lifecycle workflow file split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance PRD/Plan, API/compute/domain-artifacts READMEs, current-state, compute-api architecture, archive ADR, and artifact lifecycle code
- [x] Confirm next aligned gap: `artifact_lifecycle.go` remained a large compute workflow file after service/model/evidence governance workflow splits
- [x] Split `ArtifactLifecycleService` workflows into same-package upload, read/download, retention, and archive files
- [x] Preserve artifact lifecycle behavior, HTTP/OpenAPI/contracts/migrations/generated clients/auth scopes/store interfaces/public `Service` methods and constructor boundaries
- [x] Update README/architecture/checklists/change records
- [x] Run full validation
- [x] Commit and push

## Plan

- Keep `artifact_lifecycle.go` as `ArtifactLifecycleService` struct, constructor, store interface, object-store wiring, validator, and clock setup.
- Move only same-package workflow methods into `artifact_lifecycle_upload.go`, `artifact_lifecycle_read.go`, `artifact_lifecycle_retention.go`, and `artifact_lifecycle_archive.go`.
- Treat this as handler/package surface reduction and large-file cleanup, not a full artifact lifecycle domain package migration or public constructor signature change.

## Review

- `artifact_lifecycle.go` now keeps only `ArtifactLifecycleService` struct, constructor, store interface, and object-store wiring, reducing it from 369 lines in the previous architecture snapshot to 41 lines.
- Artifact lifecycle workflows were split into same-package `artifact_lifecycle_upload.go`, `artifact_lifecycle_read.go`, `artifact_lifecycle_retention.go`, and `artifact_lifecycle_archive.go`.
- Public `Service` delegates, artifact lifecycle method signatures, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, store interfaces, persistence semantics, audit event shape, archive fallback behavior, and workflow behavior were preserved.
- Updated API/compute README, architecture current-state, compute-api audit summary, Certainty/Elegance checklist, and `.ai/changes`.
- Validation passed: focused `cd apps\api; go test ./internal/compute -run "TestArtifactRetention|TestHTTPArtifactRetention|TestS3ArtifactStore" -count=1`, full `cd apps\api; go test ./...`, `scripts\audit-compute-api-boundary.ps1`, `scripts\check-deps.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full artifact lifecycle domain package migration, object-store/archive execution adapters, artifact DTO/HTTP mapping migration, public `NewService` / `NewServiceWithArchive` signature narrowing, and broader production-security work remain future slices.

# 2026-06-03 AutoWaterSimu Next evidence governance workflow file split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance PRD/Plan, API/compute/domain-evidence READMEs, current-state, compute-api architecture, and evidence governance code
- [x] Confirm next aligned gap: `evidence_governance.go` remained a large compute workflow file after model governance workflow split
- [x] Split `EvidenceGovernanceService` workflows into same-package result read, evidence package export, production readiness, and evidence-ref resolution files
- [x] Preserve evidence governance behavior, HTTP/OpenAPI/contracts/migrations/generated clients/auth scopes/store interfaces/public `Service` methods and constructor boundaries
- [x] Update README/architecture/checklists/change records
- [x] Run full validation
- [x] Commit and push

## Plan

- Keep `evidence_governance.go` as `EvidenceGovernanceService` struct, constructor, store interface, and callback wiring.
- Move only same-package workflow methods into `evidence_governance_result.go`, `evidence_governance_package.go`, `evidence_governance_readiness.go`, and `evidence_governance_references.go`.
- Treat this as handler/package surface reduction and large-file cleanup, not a full evidence governance domain package migration or public constructor signature change.

## Review

- `evidence_governance.go` now keeps only `EvidenceGovernanceService` struct, constructor, store interface, and callback wiring, reducing it from 474 lines in the previous architecture snapshot to 42 lines in the latest audit.
- Evidence governance workflows were split into same-package `evidence_governance_result.go`, `evidence_governance_package.go`, `evidence_governance_readiness.go`, and `evidence_governance_references.go`.
- Public `Service` delegates, evidence governance method signatures, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, store interfaces, persistence semantics, and workflow behavior were preserved.
- Updated API/compute README, architecture current-state, compute-api audit summary, Certainty/Elegance checklist, and `.ai/changes`.
- Validation passed: focused `cd apps\api; go test ./internal/compute ./cmd/compute-api`, full `cd apps\api; go test ./...`, `scripts\audit-compute-api-boundary.ps1`, `scripts\check-deps.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full evidence governance domain package migration, evidence package/readiness DTO and HTTP mapping migration, public `NewService` / `NewServiceWithArchive` signature narrowing, and broader production-security work remain future slices.

# 2026-06-03 AutoWaterSimu Next model governance workflow file split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance PRD/Plan, API/compute/domain-models READMEs, current-state, compute-api architecture, and model governance code
- [x] Confirm next aligned gap: `model_governance.go` remained the largest non-test compute workflow file after service delegate split
- [x] Split `ModelGovernanceService` workflows into same-package catalog, parameter promotion, benchmark case queueing, benchmark run history, and model run lookup files
- [x] Preserve model governance behavior, HTTP/OpenAPI/contracts/migrations/generated clients/auth scopes/store interfaces/public `Service` methods and constructor boundaries
- [x] Update README/architecture/checklists/change records
- [x] Run full validation
- [x] Commit and push

## Plan

- Keep `model_governance.go` as `ModelGovernanceService` struct, constructor, store interface, and callback wiring.
- Move only same-package workflow methods into `model_governance_catalog.go`, `model_governance_parameters.go`, `model_governance_benchmark_cases.go`, `model_governance_benchmark_runs.go`, and `model_governance_model_runs.go`.
- Treat this as handler/package surface reduction and large-file cleanup, not a full model governance domain package migration or public constructor signature change.

## Review

- `model_governance.go` now keeps only `ModelGovernanceService` struct, constructor, store interface, and callback wiring, reducing it from 679 lines in the previous architecture snapshot to 37 lines in the latest audit.
- Model governance workflows were split into same-package `model_governance_catalog.go`, `model_governance_parameters.go`, `model_governance_benchmark_cases.go`, `model_governance_benchmark_runs.go`, and `model_governance_model_runs.go`.
- Public `Service` delegates, model governance method signatures, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, store interfaces, persistence semantics, and workflow behavior were preserved.
- Updated API/compute README, architecture current-state, compute-api audit summary, Certainty/Elegance checklist, and `.ai/changes`.
- Validation passed: focused `cd apps\api; go test ./internal/compute ./cmd/compute-api`, full `cd apps\api; go test ./...`, `scripts\audit-compute-api-boundary.ps1`, `scripts\check-deps.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full models governance domain package migration, catalog snapshot mutation/DTO/persistence/HTTP migration, public `NewService` / `NewServiceWithArchive` signature narrowing, and broader production-security work remain future slices.

# 2026-06-03 AutoWaterSimu Next Service delegate file split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance PRD/Plan, API/compute/domain READMEs, architecture current-state, and service wiring code
- [x] Confirm next aligned gap: `service.go` still held constructor wiring, public compatibility delegates, and shared helpers in one large file
- [x] Split public `Service` compatibility delegates into same-package `service_*.go` files grouped by jobs, artifacts, models, simulation, contracts, evidence, workers, and metrics
- [x] Move shared compatibility helper functions into `service_helpers.go` while preserving package-private names and call sites
- [x] Preserve HTTP/OpenAPI/contracts/migrations/generated clients/auth scopes/store interfaces/public `Service` method signatures and narrowed internal service constructors
- [x] Update README/architecture/checklists/change records
- [x] Run full validation
- [x] Commit and push

## Plan

- Keep `service.go` as the `Service` struct and `NewService` / `NewServiceWithArchive` wiring entrypoint.
- Move only same-package public delegate methods and helper functions; do not change workflow behavior, DTOs, idempotency, persistence, OpenAPI, auth scopes, or package boundaries.
- Treat this as handler/package surface reduction and large-file cleanup, not a full domain workflow migration or public constructor signature narrowing.

## Review

- `service.go` now keeps only the `Service` struct and `NewService` / `NewServiceWithArchive` wiring, reducing it from 465 lines in the previous architecture snapshot to 67 lines in the latest audit.
- Public `Service` compatibility delegates were split into `service_jobs.go`, `service_artifacts.go`, `service_models.go`, `service_simulation.go`, `service_contracts.go`, `service_evidence.go`, `service_workers.go`, and `service_metrics.go`.
- Original package-private helper functions moved unchanged into `service_helpers.go`, so current compute service files keep the same helper names and call sites.
- Updated API/compute README, architecture current-state, compute-api audit summary, Certainty/Elegance checklist, and `.ai/changes`.
- Validation passed: focused `cd apps\api; go test ./internal/compute ./cmd/compute-api`, full `cd apps\api; go test ./...`, `scripts\audit-compute-api-boundary.ps1`, `scripts\check-deps.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full jobs/artifacts/models/evidence/simulation/agent workflow package migration, public `NewService` / `NewServiceWithArchive` signature narrowing, and broader production-security work remain future slices.

# 2026-06-03 AutoWaterSimu Next platform audit envelope split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance PRD/Plan, API/platform/compute READMEs, current-state, and audit code
- [x] Confirm next aligned gap: selected mutation audit envelope shape still lived in compute compatibility code
- [x] Add `platform/audit` helper package for stable mutation audit envelope, request context, and event JSON helpers, with direct tests
- [x] Route compute audit wrappers through platform helpers while preserving selected audit call sites, principal/route context, event JSON shape, job/artifact event persistence, HTTP/OpenAPI/contracts/migrations/generated clients, and auth scopes
- [x] Update README/architecture/checklists/change records
- [x] Run full validation
- [x] Commit and push

## Plan

- Move only the stable selected mutation audit envelope shape, HTTP request audit context projection, and audit event JSON payload attachment from `apps/api/internal/compute` into `apps/api/internal/platform/audit`.
- Keep selected audit call sites, persistence decisions, event store writes, HTTP mapping, OpenAPI/contracts/migrations/generated clients, auth scopes, OIDC/RBAC, and all-mutation audit coverage unchanged.
- Treat this as a platform helper package split, not the full production security / all mutation audit completion.

## Review

- Added `apps/api/internal/platform/audit` with `MutationEnvelope`, request context, and event JSON helpers plus direct tests for defaults, trimming, request override, and payload copy behavior.
- `apps/api/internal/compute/audit.go` now delegates to platform audit helpers while preserving wrapper names, selected audit call sites, principal/route context behavior, event JSON shape, persistence decisions, HTTP/OpenAPI/contracts/migrations/generated clients, and auth scopes.
- Updated API/platform/compute READMEs, architecture/current-state, compute-api architecture notes, Certainty/Elegance checklist, boundary audit expected package list, and `.ai/changes`.
- Validation passed: `cd apps\api; go test ./internal/platform/audit ./internal/compute ./cmd/compute-api`, `cd apps\api; go test ./...`, `scripts\audit-compute-api-boundary.ps1`, `scripts\check-deps.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only.
- Remaining scope: all-mutation audit coverage, OIDC/RBAC, full object data scope checks, broader security smoke expansion, and audit persistence policy completion remain future production-security slices.

# 2026-06-03 AutoWaterSimu Next simulation registry record data split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance PRD/Plan, API/domain/simulation/compute READMEs, current-state, and simulation registry code
- [x] Confirm next aligned gap: simulation input / process graph record data projection still lived inside compute simulation registry compatibility code
- [x] Add `domain/simulation` helpers for stable simulation input and process graph record data projection, with direct tests
- [x] Route `SimulationInputService` record assembly through the domain helpers while preserving schema validation, process graph structure validation, compute `SimulationInputRecord` / `ProcessGraphRecord` mapping, store persistence/idempotency, input-ref resolution, HTTP/OpenAPI/contracts/migrations/generated clients, and auth scopes
- [x] Update README/architecture/checklists/change records
- [x] Run full validation
- [x] Commit and push

## Plan

- Move only pure `process_graph.v1` and `simulation_input.v1` record data projection: canonical payload JSON/hash, metadata JSON/defaults, identity fields, source/requested defaults, tenant/project projection, process graph version handling, and caller-supplied timestamps.
- Keep JSON Schema validation, material-balance process graph structure validation, compute DTO mapping, metadata store persistence, idempotency/conflict behavior, input-ref resolution, HTTP/OpenAPI/contracts/migrations/generated clients, and auth scopes unchanged.
- Treat this as a continuation of `domain/simulation` package movement, not the full simulation input/process graph metadata service migration.

## Review

- Added `domain/simulation.ProcessGraphRecordDataFromDocument` and `domain/simulation.SimulationInputRecordDataFromDocument` with direct tests for payload hash, metadata projection, default metadata behavior, required identity fields, and invalid process graph version rejection.
- `SimulationInputService.processGraphRecord` and `SimulationInputService.simulationInputRecord` now delegate stable record data projection to `domain/simulation` and only map the neutral data into existing compute metadata records.
- Updated API/domain/simulation/compute READMEs, architecture/current-state, compute-api architecture notes, Certainty/Elegance checklist, and `.ai/changes`.
- Validation passed: `cd apps\api; go test ./internal/domain/simulation ./internal/compute`, `cd apps\api; go test ./...`, `scripts\audit-compute-api-boundary.ps1`, `scripts\check-deps.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full simulation input/process graph metadata service migration is not complete; schema validation, store persistence/idempotency, input-ref resolution, HTTP mapping, and Memory/Postgres implementations remain in compute compatibility package.

# 2026-06-03 AutoWaterSimu Next evidence result explanation record data split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance PRD/Plan, API/domain/evidence/compute READMEs, current-state, and result explanation workflow code
- [x] Confirm next aligned gap: result explanation record data projection still lived inside compute result explanation compatibility code
- [x] Add a `domain/evidence` helper for stable result explanation record data projection, with direct tests
- [x] Route `ResultExplanationService` record assembly through the domain helper while preserving schema validation, job/result availability checks, job-scoped evidence ref resolution, compute `ResultExplanationRecord` mapping, persistence, review/publish, HTTP/OpenAPI/contracts/migrations/generated clients, and auth scopes
- [x] Update README/architecture/checklists/change records
- [x] Run full validation
- [x] Commit and push

## Plan

- Move only pure `result_explanation.v1` record data projection: canonical payload JSON/hash, metadata JSON/defaults, job tenant/project fallback, resolved evidence ref copy, submitted status, and submitted/created/updated timestamps.
- Keep contract schema validation, route `job_id` check, job/result availability gate, job-scoped evidence ref resolution, compute `ResultExplanationRecord` DTO mapping, store persistence, review/publish mutations, HTTP/OpenAPI/contracts/migrations/generated clients, and auth scopes unchanged.
- Treat this as a continuation of `domain/evidence` package movement, not the full result explanation workflow package migration.

## Review

- Added `domain/evidence.ResultExplanationRecordDataFromDocument` with direct tests for metadata projection, payload hash, job tenant/project fallback, default metadata behavior, copy safety for resolved evidence refs, and required identity fields.
- `ResultExplanationService.resultExplanationRecord` now delegates stable record data projection to `domain/evidence` and only maps the neutral data into the existing compute `ResultExplanationRecord`.
- Updated API/domain/evidence/compute READMEs, architecture/current-state, compute-api architecture notes, Certainty/Elegance checklist, and `.ai/changes`.
- Validation passed: `cd apps\api; go test ./internal/domain/evidence ./internal/compute`, `cd apps\api; go test ./...`, `scripts\audit-compute-api-boundary.ps1`, `scripts\check-deps.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full result explanation workflow package migration is not complete; schema validation, job/result availability checks, evidence ref resolution callback, persistence/review/publish, HTTP mapping, and Memory/Postgres implementations remain future slices.

# 2026-06-03 AutoWaterSimu Next agent draft confirmation record data split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance PRD/Plan, API/domain/compute READMEs, current-state, and draft workflow code after the envelope split
- [x] Confirm next aligned gap: draft confirmation record data projection still lived inside compute draft workflow compatibility code
- [x] Add a `domain/agent` helper for stable draft confirmation record data projection, with direct tests
- [x] Route `DraftWorkflowService` record assembly through the domain helper while preserving compute `DraftConfirmationRecord` mapping, idempotent persistence, response attachment, HTTP/OpenAPI/contracts/migrations/generated clients, auth scopes, and promotion behavior
- [x] Update README/architecture/checklists/change records
- [x] Run full validation
- [x] Commit and push

## Plan

- Move only pure record data projection: canonical payload JSON/hash, `confirmed_at` RFC3339 parsing, metadata JSON, source/requested defaults, tenant/project projection, and stable field trimming.
- Keep `draft_confirmation.v1` base schema validation, embedded draft schema lookup/validation, compute `DraftConfirmationRecord` DTO mapping, store persistence, confirmation readback, constraint application plan gating, Agent draft promotion, HTTP/OpenAPI/contracts/migrations/generated clients, and auth scopes unchanged.
- Treat this as a continuation of `domain/agent` package movement, not the full draft workflow package migration.

## Review

- Added `domain/agent.DraftConfirmationRecordDataFromDocument` with direct tests for metadata projection, payload hash, timezone normalization, default metadata behavior, and invalid `confirmed_at` rejection.
- `DraftWorkflowService.draftConfirmationRecord` now delegates stable record data projection to `domain/agent` and only maps the neutral data into the existing compute `DraftConfirmationRecord`.
- Updated API/domain/compute READMEs, architecture/current-state, compute-api architecture notes, Certainty/Elegance checklist, and `.ai/changes`.
- Validation passed: `cd apps\api; go test ./internal/domain/agent ./internal/compute`, `cd apps\api; go test ./...`, `scripts\audit-compute-api-boundary.ps1`, `scripts\check-deps.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full draft workflow package migration is not complete; schema file lookup/JSON Schema validation, confirmation store read/write, response attachment, HTTP mapping, promotion orchestration, and store implementations remain future slices.

# 2026-06-03 AutoWaterSimu Next agent draft confirmation envelope split TODO

- [x] Re-read README First context, Certainty/Elegance PRD/Plan, API/domain/compute READMEs, architecture current-state, and draft workflow code
- [x] Confirm next aligned gap: draft confirmation envelope cross-field validation still lived inside compute draft workflow compatibility code
- [x] Add a `domain/agent` helper for stable draft confirmation envelope validation, with direct tests
- [x] Route `DraftWorkflowService.ConfirmDraftDocument` through the domain helper while preserving base contract validation, schema file lookup, embedded draft JSON Schema validation, confirmation record assembly, persistence, response attachment, HTTP/OpenAPI/contracts/migrations/generated clients, auth scopes, and promotion behavior
- [x] Update README/architecture/checklists/change records
- [x] Run full validation
- [x] Commit and push

## Plan

- Move only pure wrapper / embedded draft cross-field rules: `schema_version=draft_confirmation.v1`, embedded draft presence, draft schema version match, draft id / constraint id match, and explicit `requires_confirmation=true`.
- Keep `draft_confirmation.v1` schema validation, embedded draft schema file lookup and JSON Schema validation, confirmation record assembly, idempotent persistence, confirmation readback, constraint application plan gating, Agent draft promotion, HTTP/OpenAPI/contracts/migrations/generated clients, and auth scopes unchanged.
- Treat this as another small `domain/agent` package movement step, not the full draft workflow package migration.

## Review

- Added `domain/agent.ValidateDraftConfirmationEnvelope` with direct tests for valid Agent draft confirmation, constraint draft `constraint_id` fallback, cross-field issue aggregation, and missing embedded draft diagnostics.
- `DraftWorkflowService.ConfirmDraftDocument` now delegates stable wrapper / embedded draft cross-field validation to `domain/agent` while preserving base contract validation, unsupported non-draft early return semantics, schema file lookup, embedded draft JSON Schema validation, confirmation record assembly, idempotent persistence, response attachment, HTTP/OpenAPI/contracts/migrations/generated clients, auth scopes, and promotion behavior.
- Updated API/domain/compute READMEs, architecture/current-state, compute-api architecture notes, Certainty/Elegance checklist, and `.ai/changes`.
- Validation passed: `cd apps\api; go test ./internal/domain/agent ./internal/compute`, `cd apps\api; go test ./...`, `scripts\audit-compute-api-boundary.ps1`, `scripts\check-deps.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full draft workflow package migration is not complete; draft confirmation record assembly/persistence, schema file lookup/JSON Schema validation, confirmation readback, promotion orchestration, HTTP mapping, store implementations, and broader jobs/artifacts/models/evidence/simulation/agent package movement remain future slices.

# 2026-06-02 Go API Domain Package Split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance PRD/Plan, compute architecture docs, API READMEs, and current compute store/audit files
- [x] Stage 1: split `store.go` into `store_interfaces.go` plus domain-focused `memory_*.go` files inside the same `compute` package
- [x] Stage 1: update Compute API boundary audit to read Store interfaces from `store_interfaces.go` and MemoryStore methods from all `memory_*.go`
- [x] Stage 1: update README/architecture/checklists/change records
- [x] Stage 1: run full stage validation
- [x] Stage 1: commit and push
- [x] Stage 2: split `http.go` route handlers by route group
- [x] Stage 2: update README/architecture/checklists/change records
- [x] Stage 2: run full stage validation
- [x] Stage 2: commit and push
- [x] Stage 3: split `postgres.go` persistence by domain
- [x] Stage 3: update Compute API boundary audit to scan all `postgres*.go` for PostgresStore method coverage
- [x] Stage 3: update README/architecture/checklists/change records
- [x] Stage 3: run full stage validation and configured DB smoke
- [x] Stage 3: commit and push

## Plan

- Keep all Go API split work inside `apps/api/internal/compute` for this pass; do not change package names, HTTP routes, OpenAPI/client output, contracts, migrations, auth scopes, SQL semantics, or `Service` signatures.
- Execute low-risk to high-risk: MemoryStore/interface file split first, HTTP handler file split second, PostgreSQL persistence split last.
- Leave unrelated untracked rebuild-plan document untouched.

## Review

- Stage 1 moved the aggregate Store/domain interfaces and filters to `store_interfaces.go`.
- Stage 1 moved `MemoryStore` into `memory_store.go` and kept existing method bodies grouped by jobs, artifacts/archive, models, simulation, agent workflows, workers, and metrics.
- Stage 1 updated the boundary audit to exclude store implementation files from service-call attribution while scanning all `memory_*.go` files for MemoryStore method coverage.
- Stage 1 validation passed: `cd apps\api; go test ./...`, `scripts\check-deps.ps1`, `scripts\audit-compute-api-boundary.ps1`, `scripts\ci\pr-fast.ps1`, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only.
- Stage 2 kept `http.go` as the server entrypoint with unchanged `Routes` registration and panic recovery, then moved handlers/helpers into route-group files; the original model governance `http_models.go` grouping has since been further split into narrower `http_model_*.go` / `http_benchmark_runs.go` files.
- Stage 2 validation passed: `cd apps\api; go test ./...`, `scripts\check-deps.ps1`, `scripts\audit-compute-api-boundary.ps1`, `scripts\ci\pr-fast.ps1`, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only.
- Stage 3 kept `postgres.go` as the PostgreSQL store entrypoint and migration helper file, then moved persistence methods/select SQL/scan helpers into domain files; the original model governance `postgres_models.go` grouping has since been further split into `postgres_model_runs.go`, `postgres_benchmark_runs.go`, and `postgres_model_catalog.go`.
- Stage 3 validation passed: `cd apps\api; go test ./...`, `scripts\check-deps.ps1`, `scripts\audit-compute-api-boundary.ps1`, `scripts\ci\pr-fast.ps1`, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only. PostgreSQL migration smoke was skipped because `COMPUTE_API_DATABASE_URL` is absent.

# 2026-06-02 AutoWaterSimu Next benchmark case job document split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance plan/current-state, API/domain/models/compute READMEs, and benchmark schedule-run call sites
- [x] Confirm next aligned gap: pure benchmark case schedule-run `compute_job.v1` document assembly still lived in model governance compatibility code
- [x] Add a `domain/models` helper for benchmark case schedule-run job document construction, with direct tests
- [x] Route `ModelGovernanceService.ScheduleBenchmarkCaseRun` through the domain helper while preserving catalog lookup, gate checks, execution profile lookup, simulation input resolution, job type mismatch validation, idempotent job creation, HTTP/OpenAPI/contracts/migrations/generated clients, auth scopes, and store writes
- [x] Update README/architecture/checklists/change records
- [x] Run full validation, then commit and push

## Plan

- Move only the pure benchmark case schedule-run `compute_job.v1` document assembly: default request/job/trace/idempotency ids, benchmark metadata, context propagation, payload/execution placement, queue, and created_at.
- Keep catalog lookup, benchmark case/default parameter set gates, execution profile lookup, simulation input resolution, job type mismatch validation, JSON marshaling, idempotent createJob, store implementations, HTTP routes, OpenAPI, contracts, migrations, generated clients, and auth scopes unchanged.
- Treat this as a small `domain/models` package movement step, not the full model governance package split.

## Review

- Added `domain/models.BuildBenchmarkCaseRunJobDocument` with direct tests for explicit request id behavior, benchmark metadata/context propagation, simulation input/execution placement, metadata copy safety, and sanitized default request/job/trace/idempotency ids.
- `ModelGovernanceService.ScheduleBenchmarkCaseRun` now delegates only pure benchmark case `compute_job.v1` document assembly to `domain/models`; catalog lookup, benchmark/default parameter set gates, execution profile lookup, simulation input resolution, job_type mismatch rejection, JSON marshaling, idempotent createJob, HTTP/OpenAPI/contracts/migrations/generated clients, auth scopes, and store writes remain unchanged.
- Updated API/domain/models/compute READMEs, architecture/current-state, compute-api architecture notes and audited line counts, Certainty/Elegance checklist, boundary audit note, and `.ai/changes`.
- Validation passed: focused models/compute Go tests, `cd apps\api; go test ./...`, `scripts\check-deps.ps1`, `scripts\audit-compute-api-boundary.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full model governance package movement is not complete; catalog snapshot mutation, typed catalog DTOs, schema validation, benchmark query/persistence workflows, promotion orchestration, HTTP mapping, and broader jobs/artifacts/evidence/simulation/agent package movement remain future slices.

# 2026-06-02 AutoWaterSimu Next built-in model catalog document split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance plan/current-state, API/domain/models/compute READMEs, and model catalog call sites
- [x] Confirm next aligned gap: built-in `model_catalog.v1` fallback document assembly still lived in compute compatibility service code
- [x] Add a `domain/models` helper for built-in model catalog document construction, with direct tests
- [x] Route compute `builtInModelCatalog` through the domain helper while preserving typed DTO conversion, parameter hash generation, persisted catalog fallback behavior, HTTP/OpenAPI/contracts/migrations/generated clients, auth scopes, schema validation, and store writes
- [x] Update README/architecture/checklists/change records
- [x] Run full validation, then commit and push

## Plan

- Move only the pure built-in `model_catalog.v1` document shape for material balance and worker smoke models into `apps/api/internal/domain/models`.
- Keep the material-balance default parameter hash generation in compute because it depends on compute result canonicalization.
- Keep typed DTO unmarshaling, schema validation, persisted catalog snapshot mutation, benchmark workflow orchestration, model catalog HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, and store behavior unchanged.
- Treat this as a small `domain/models` package movement step, not the full model governance package split.

## Review

- Added `domain/models.BuiltInModelCatalogDocument` with direct tests for catalog metadata, five built-in model entries, material-balance approved default parameter set/hash, benchmark fixture refs, worker-smoke benchmark cases, and worker models without default parameter sets.
- `compute.builtInModelCatalog` now keeps material-balance default parameter hash generation in compute, delegates only stable built-in `model_catalog.v1` document shape to `domain/models`, and converts back into the existing `ModelCatalogResponse` DTO.
- Updated API/domain/models/compute READMEs, architecture/current-state, compute-api architecture notes and audited line counts, Certainty/Elegance checklist, boundary audit note, and `.ai/changes`.
- Validation passed: focused models/compute Go tests, `cd apps\api; go test ./...`, `scripts\check-deps.ps1`, `scripts\audit-compute-api-boundary.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full model governance package movement is not complete; catalog snapshot mutation, typed catalog DTOs, schema validation, benchmark query/persistence workflows, promotion orchestration, HTTP mapping, and broader jobs/artifacts/evidence/simulation/agent package movement remain future slices.

# 2026-06-02 AutoWaterSimu Next simulation check job document split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance plan/current-state, API/domain/simulation/compute READMEs, and simulation-check call sites
- [x] Confirm next aligned gap: pure `simulation_request.v1` to `compute_job.v1` job document assembly still lived in compute compatibility service code
- [x] Add a `domain/simulation` helper for simulation check job document construction, with direct tests
- [x] Route `Service.CreateSimulationCheck` through the domain helper while preserving request decode, schema validation, `input_ref` resolution, job type/input mismatch validation, idempotent job creation, HTTP/OpenAPI/contracts/migrations/generated clients, auth scopes, and store writes
- [x] Update README/architecture/checklists/change records
- [x] Run full validation, then commit and push

## Plan

- Move only the pure `compute_job.v1` document assembly: default simulation check job id, trace id, idempotency key, context propagation, external refs, metadata, and execution profile.
- Keep JSON decode, `simulation_request.v1` schema validation, required field validation, simulation input/process graph/model-run replay resolution, job type mismatch rejection, JSON marshaling, idempotent `CreateJob`, store implementations, HTTP routes, OpenAPI, contracts, migrations, generated clients, and auth scopes unchanged.
- Treat this as a small `domain/simulation` package movement step, not the full simulation input/process graph service or simulation-check workflow package split.

## Review

- Added `domain/simulation.BuildSimulationCheckJobDocument` with direct tests for default simulation check job id/trace/idempotency, context external_refs/site fallback, metadata input_ref filtering, metadata overrides, and execution profile inclusion.
- `Service.CreateSimulationCheck` now delegates only pure `compute_job.v1` document assembly to `domain/simulation`; request decode, `simulation_request.v1` schema validation, required field validation, `input_ref` resolution, job type mismatch rejection, JSON marshaling, idempotent `CreateJob`, HTTP/OpenAPI/contracts/migrations/generated clients, auth scopes, and store writes remain unchanged.
- Updated API/domain/simulation/compute READMEs, architecture/current-state, compute-api architecture notes, Certainty/Elegance checklist, boundary audit notes, and `.ai/changes`.
- Validation passed: focused simulation/compute Go tests, `cd apps\api; go test ./...`, `scripts\check-deps.ps1`, `scripts\audit-compute-api-boundary.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full simulation-check workflow package movement, simulation request schema validation, input_ref resolution, simulation input/process graph metadata records, job persistence, store implementation, evidence-ref lookup, HTTP mapping, and broader jobs/artifacts/models/evidence/agent package movement remain future slices.

# 2026-06-02 AutoWaterSimu Next jobs failed-worker fallback result split TODO

- [x] Re-read current worktree, README First context, Certainty/Elegance plan/current-state, API/domain/jobs/compute READMEs, and job failure call sites
- [x] Confirm next aligned gap: failed-worker fallback `compute_result.v1` construction still lived in job lifecycle workflow code
- [x] Add a `domain/jobs` helper for failed-worker fallback compute result construction, with direct tests
- [x] Route `JobLifecycleService.Fail` through the domain helper while preserving worker stale checks, compute_result validation, result hash, summary persistence, model_run extraction/persistence, HTTP/OpenAPI/contracts/migrations/generated clients, auth scopes, and job store writes
- [x] Update README/architecture/checklists/change records
- [x] Run full validation, then commit and push

## Plan

- Move only the pure fallback result document construction for worker-reported failures.
- Preserve the existing `compute_result.v1` shape, default `WORKER_FAILED` code, `worker failed` message fallback, raw error text behavior before later completion parsing, `runtime_audit.fallback_reason`, and empty data/artifacts/model_runs fields.
- Keep stale worker detection, schema validation, result hashing, stored summary projection, worker result completion parsing, model_run validation/persistence, store writes, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, and audit boundaries unchanged.

## Review

- Added `domain/jobs.FailedWorkerComputeResult` with direct tests for custom error details, default failure summary, quality warnings, runtime audit shape, and raw nonblank error text preservation before completion parsing.
- `JobLifecycleService.Fail` now delegates only worker-reported failure fallback `compute_result.v1` construction to `domain/jobs`; worker stale checks, schema validation, result hash, stored summary projection, worker result completion parsing, model_run extraction/persistence, store writes, HTTP/OpenAPI/contracts/migrations/generated clients, auth scopes, and audit boundaries remain unchanged.
- Updated API/domain/jobs/compute READMEs, architecture/current-state, compute-api architecture notes, Certainty/Elegance checklist, boundary audit note, and `.ai/changes`.
- Validation passed: focused jobs/compute Go tests, `cd apps\api; go test ./...`, `scripts\check-deps.ps1`, `scripts\audit-compute-api-boundary.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full job lifecycle package movement, job records/events/completion persistence/timeout sweep/HTTP mapping, and broader artifacts/models/evidence/simulation/agent package movement remain future slices.

# 2026-06-01 AutoWaterSimu Next agent proposed request extraction split TODO

- [x] Re-read current worktree, Certainty/Elegance plan/current-state, API/domain/agent/compute READMEs, and draft promotion call sites
- [x] Confirm next aligned gap: `agent_scenario_draft.v1.proposed_request` extraction for explicit simulation-check promotion still lived in draft workflow compatibility code
- [x] Add a `domain/agent` helper for stable proposed simulation request extraction, with direct tests
- [x] Route `DraftWorkflowService.PromoteDraftConfirmationToSimulationCheck` through the domain helper while preserving confirmation lookup, approval/schema gating, simulation request schema validation, marshaling, HTTP/OpenAPI/contracts/migrations/generated clients, auth scopes, and job creation callback
- [x] Update README/architecture/checklists/change records
- [x] Run full validation, then commit and push

## Plan

- Move only the pure `proposed_request` extraction: require a draft object and require object-valued `agent_scenario_draft.proposed_request`.
- Keep draft confirmation lookup, approved decision gate, `agent_scenario_draft.v1` schema gate, stored JSON decoding, `simulation_request.v1` validation, request JSON marshaling, simulation-check creation callback, HTTP route, OpenAPI, contracts, migrations, generated clients, auth scopes, and error mapping unchanged.
- Treat this as a second small `domain/agent` package movement step, not a full draft workflow or Agent runtime package split.

## Review

- Added `domain/agent.ProposedSimulationRequestFromDraft` with direct tests for happy path, missing draft, and non-object/missing `proposed_request`.
- `DraftWorkflowService.PromoteDraftConfirmationToSimulationCheck` now delegates only stable `agent_scenario_draft.v1.proposed_request` extraction to `domain/agent`; confirmation lookup, approval/schema gating, `simulation_request.v1` schema validation, marshaling, simulation-check job creation callback, HTTP/OpenAPI/contracts/migrations/generated clients, and auth scopes remain unchanged.
- Updated API/domain/compute READMEs, architecture/current-state, compute-api architecture notes, Certainty/Elegance checklist, boundary audit notes, and `.ai/changes`.
- Validation passed: focused agent/compute Go tests, `cd apps\api; go test ./...`, `scripts\check-deps.ps1`, `scripts\audit-compute-api-boundary.ps1`, `scripts\ci\pr-fast.ps1`, rebuild docs `rg` scan, and `git diff --check -- apps\api docs scripts tasks .ai` with LF/CRLF warnings only.
- Remaining scope: full Agent draft workflow package movement, store-backed draft confirmation orchestration, HTTP mapping reduction, and broader jobs/artifacts/models/evidence/simulation package movement remain future slices.

# 2026-06-01 AutoWaterSimu Next agent constraint application plan split TODO

- [x] Re-read current worktree, Certainty/Elegance plan/current-state, API/domain/compute READMEs, and draft workflow call sites
- [x] Confirm next aligned gap: advisory `constraint_application_plan.v1` assembly still lived in draft workflow compatibility code and no `domain/agent` package existed
- [x] Add a `domain/agent` helper for stable constraint application plan assembly, with direct tests
- [x] Route `DraftWorkflowService.ConstraintApplicationPlan` through the domain helper while preserving confirmation lookup, approval/schema gating, schema validation, HTTP/OpenAPI/contracts/migrations/generated clients, and auth scopes
- [x] Update README/architecture/checklists/change records
- [x] Run full validation, then commit and push

## Plan

- Move only the pure advisory plan assembly: copy confirmation/draft identifiers, `constraint_id`, `scope`, `target_ref`, `constraints`, and stable flags/warnings for advisory-only/no-job/no-target-mutation/external-production-approval.
- Keep draft confirmation lookup, approved decision gate, `constraint_draft.v1` schema gate, stored JSON decoding, schema validation, HTTP route, OpenAPI, contracts, migrations, generated clients, auth scopes, and error mapping unchanged.
- Treat this as the first small `domain/agent` package movement step, not a full draft workflow or Agent runtime package split.

## Review

- Added `apps/api/internal/domain/agent` with `ConstraintApplicationPlan`, `ConstraintApplicationPlanInput`, and `ConstraintApplicationPlanFromDraft`.
- Added direct domain tests for advisory plan assembly and missing draft / target_ref / constraints rejection.
- Updated `DraftWorkflowService.ConstraintApplicationPlan` to delegate stable advisory plan assembly to the agent domain helper while preserving confirmation lookup, approval/schema gating, stored payload decoding, schema validation, HTTP/OpenAPI/contracts/migrations/generated clients, auth scopes, and simulation-check promotion behavior.
- Updated API/internal/domain/compute READMEs, scripts audit README, architecture/current-state, compute-api architecture, Certainty/Elegance checklist, and `.ai/changes`.
- Verification:
  - `cd apps\api; go test ./internal/domain/agent ./internal/compute -run "Test(ConstraintApplicationPlan|ContractValidationEndpoint)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 13.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, but the worktree is dirty because this task's files and an unrelated untracked rebuild plan file are present.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
  - `rg -n "schema_version|P0|P1|P2" docs\rebuild --glob "AutoWaterSimu_Next_*.md"` completed and returned the expected rebuild document references.
- Remaining scope:
  - Full agent draft workflow package movement is not complete; draft confirmation persistence/readback, approval/schema gating, schema validation, simulation-check promotion, HTTP mapping, and store access remain in compute compatibility wiring.
  - Full jobs/artifacts/models/evidence/simulation package movement, handler/package surface reduction, and public `Service` constructor signature narrowing remain follow-up.

# 2026-06-01 AutoWaterSimu Next jobs worker result completion split TODO

- [x] Re-read current worktree, Certainty/Elegance plan/current-state, API/domain/jobs/compute READMEs, and job completion call sites
- [x] Confirm next aligned gap: worker result status acceptance and failed result error extraction still lived in job lifecycle workflow code
- [x] Add a `domain/jobs` helper for worker result completion status/error extraction, with direct tests
- [x] Route `JobLifecycleService.Complete` and `Fail` defaults through the domain helper/constants while preserving compute_result validation, result hashing, summary persistence, model_run extraction/persistence, HTTP/OpenAPI/contracts/migrations/generated clients, and auth scopes
- [x] Update README/architecture/checklists/change records
- [x] Run full validation, then commit and push

## Plan

- Move only the pure worker-result completion interpretation: trim/extract `status`, accept only `succeeded` / `failed` / `timed_out`, and for non-succeeded results derive `error_code` / `error_message` from the result summary with the existing `WORKER_FAILED` default.
- Keep worker stale checks, schema validation, result hash, stored summary projection, model_run extraction/persistence, job completion persistence, timeout sweep, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, and audit boundaries unchanged.
- Treat this as a small `domain/jobs` invariant movement step, not a full job lifecycle package split.

## Review

- Added `DefaultWorkerFailureCode`, `WorkerResultCompletion`, and `WorkerResultCompletionFromResult` to `apps/api/internal/domain/jobs`.
- Added direct domain tests for succeeded worker results, failed result error extraction, default failure code, and invalid status rejection.
- Updated `JobLifecycleService.Complete` to delegate worker result status/error interpretation to the domain helper, and updated `Fail` to use the jobs domain default failure code.
- Preserved worker stale checks, compute_result validation, result hashing, stored summary projection, model_run extraction/persistence, job completion persistence, timeout sweep, HTTP/OpenAPI/contracts/migrations/generated clients, auth scopes, and audit boundaries.
- Updated API/internal/domain/jobs/compute READMEs, architecture/current-state, Certainty/Elegance checklist, and `.ai/changes`.
- Verification:
  - `cd apps\api; go test ./internal/domain/jobs ./internal/compute -run "Test(WorkerResultCompletion|IsWorkerResultStatus|Complete|Fail|TimeoutSweep|WorkerStale|ValidatedComplete)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 12.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, but the worktree is dirty because this task's files and an unrelated untracked rebuild plan file are present.
  - `git diff --check -- apps\api docs tasks .ai` passed with LF/CRLF warnings only.
  - `rg -n "schema_version|P0|P1|P2" docs\rebuild --glob "AutoWaterSimu_Next_*.md"` completed and returned the expected rebuild document references.
- Remaining scope:
  - Full job lifecycle package movement is not complete; job records, events, completion persistence, timeout sweep, artifact listing callback, schema validation, failed-worker fallback result construction, and HTTP mapping remain in compute compatibility wiring.
  - Full artifacts/models/evidence/simulation/agent domain package movement remains follow-up.

# 2026-06-01 AutoWaterSimu Next evidence stored risk summary split TODO

- [x] Re-read current worktree, Certainty/Elegance plan/current-state, API/domain/evidence/compute READMEs, and job completion call sites
- [x] Confirm next aligned gap: `compute_result.v1.risk_findings` stored summary projection still lived in job lifecycle workflow code
- [x] Add a `domain/evidence` helper for stored result summary risk projection, with direct tests
- [x] Route `JobLifecycleService.Complete` through the domain helper while preserving compute_result validation, result hashing, error extraction, persistence, HTTP/OpenAPI/contracts/migrations/generated clients, and auth scopes
- [x] Update README/architecture/checklists/change records
- [x] Run full validation, then commit and push

## Plan

- Move only the pure stored-summary projection: when a valid compute result has top-level `risk_findings` and an object `summary`, copy the summary map and attach `risk_findings` to the copy before persistence.
- Keep compute_result validation, result hash, model_run extraction/persistence, job completion, error code/message extraction, store implementations, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, and approval boundaries unchanged.
- Treat this as a small `domain/evidence` helper movement step, not a full job lifecycle or evidence governance package split.

## Review

- Added `StoredResultSummary` to `apps/api/internal/domain/evidence`.
- Added direct domain tests covering object summary projection, original summary immutability, missing top-level risk findings, non-object summary preservation, and nil input.
- Updated `JobLifecycleService.Complete` to delegate stored summary risk projection to the domain helper while preserving compute_result validation, result hashing, model_run extraction/persistence, failed-worker error extraction, job completion persistence, HTTP/OpenAPI/contracts/migrations/generated clients, auth scopes, and approval boundaries.
- Updated API/internal/domain/evidence/compute READMEs, architecture/current-state, Certainty/Elegance checklist, and `.ai/changes`.
- Verification:
  - `cd apps\api; go test ./internal/domain/evidence ./internal/compute -run "Test(StoredResultSummary|RiskFindings|ProductionReadiness|Complete|EvidencePackage|NewSystemEvidenceReferenceE2E)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 12.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, but the worktree is dirty because this task's files and an unrelated untracked rebuild plan file are present.
  - `git diff --check -- apps\api docs tasks .ai` passed with LF/CRLF warnings only.
  - `rg -n "schema_version|P0|P1|P2" docs\rebuild --glob "AutoWaterSimu_Next_*.md"` completed and returned the expected rebuild document references.
- Remaining scope:
  - Full job lifecycle package movement is not complete; job records, events, completion persistence, timeout sweep, artifact listing callback, schema validation, and HTTP mapping remain in compute compatibility wiring.
  - Full evidence governance package movement is not complete; store-backed evidence assembly, callbacks, response DTOs, and HTTP mapping remain in compute compatibility wiring.
  - Full artifacts/models/simulation/agent domain package movement remains follow-up.

# 2026-06-01 AutoWaterSimu Next models result model_runs extraction split TODO

- [x] Re-read current worktree, Certainty/Elegance plan/current-state, API/domain/models/compute READMEs, and job lifecycle completion call sites
- [x] Confirm next aligned gap: `compute_result.v1.runtime_audit.model_runs` extraction and job_id consistency check still lived in job lifecycle workflow code
- [x] Add a `domain/models` helper for extracting model_run raw payloads from compute result runtime audit, with direct tests
- [x] Route `JobLifecycleService.Complete` through the domain helper while preserving contract validation, worker stale checks, result hashing, summary/risk handling, persistence, HTTP/OpenAPI/contracts/migrations/generated clients, and auth scopes
- [x] Update README/architecture/checklists/change records
- [x] Run full validation, then commit and push

## Plan

- Move only the pure extraction/precheck: locate `runtime_audit.model_runs`, require each item to be an object, allow missing `job_id`, and reject a present `job_id` that does not match the completed job.
- Keep schema validation through the existing compute `ContractValidator`, worker/job status transitions, `compute_result.v1` validation, result summary/risk handling, model_run persistence, store implementations, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, and approval boundaries unchanged.
- Treat this as another small `domain/models` package movement step, not a job lifecycle or full model governance package split.

## Review

- Added `ModelRunDocumentsFromComputeResult` to `apps/api/internal/domain/models`.
- Added direct domain tests for extraction with matching/missing job_id, missing runtime audit, invalid non-object items, and job_id mismatch.
- Updated `JobLifecycleService.modelRunsFromResult` to delegate pure extraction and job_id precheck to the domain helper while preserving compute-owned schema validation, raw JSON conversion, result hashing, summary/risk handling, model_run persistence, worker stale checks, HTTP/OpenAPI/contracts/migrations/generated clients, auth scopes, and approval boundaries.
- Updated API/internal/domain/models/compute READMEs, architecture/current-state, Certainty/Elegance checklist, and `.ai/changes`.
- Verification:
  - `cd apps\api; go test ./internal/domain/models ./internal/compute -run "Test(ModelRunDocumentsFromComputeResult|Complete|ModelRun|ArtifactRetention|NewSystemEvidenceReferenceE2E|DefaultParameterSetPromotionPlan|ProductionReadiness)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 12.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, but the worktree is dirty because this task's files and an unrelated untracked rebuild plan file are present.
  - `git diff --check -- apps\api docs tasks .ai` passed with LF/CRLF warnings only.
  - `rg -n "schema_version|P0|P1|P2" docs\rebuild --glob "AutoWaterSimu_Next_*.md"` completed and returned the expected rebuild document references.

# 2026-06-01 AutoWaterSimu Next models production governance gate split TODO

- [x] Re-read current worktree, Certainty/Elegance plan/current-state, API/domain/models/compute READMEs, and evidence governance call sites
- [x] Confirm next aligned gap: evidence governance `production_allowed` active+approved predicate still lived in compute workflow code
- [x] Add `ModelRunProductionGateInput`, `ModelRunProductionGate`, and `EvaluateModelRunProductionGate` to `apps/api/internal/domain/models` with direct tests
- [x] Route `EvidenceGovernanceService` model governance allowed check through the domain models helper while preserving catalog lookup and evidence package assembly
- [x] Update README/architecture/checklists/change records
- [x] Run full validation, then commit and push

## Plan

- Move only the pure production governance predicate: active model version and approved matching default parameter set.
- Keep catalog lookup, model_run parsing, status extraction, evidence package assembly, production-readiness DTO mapping, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, and approval boundaries unchanged.
- Treat this as another small `domain/models` package movement step, not the full model governance or evidence governance package split.

## Review

- Added `ModelRunProductionGateInput`, `ModelRunProductionGate`, and `EvaluateModelRunProductionGate` to `apps/api/internal/domain/models`.
- Added direct domain tests for active+approved allow, inactive model version block, non-approved parameter set block, empty status block, and whitespace normalization.
- Updated `EvidenceGovernanceService` model governance assembly to delegate `production_allowed` to the domain models helper while preserving existing catalog lookup, status extraction, evidence package assembly, production-readiness DTO mapping, HTTP/OpenAPI/contracts/migrations/generated clients, auth scopes, and approval boundaries.
- Updated API/internal/domain/models/compute READMEs, architecture/current-state, Certainty/Elegance checklist, and `.ai/changes`.
- Verification:
  - `cd apps\api; go test ./internal/domain/models ./internal/compute -run "Test(EvaluateModelRunProductionGate|ProductionReadiness|EvidencePackage|NewSystemEvidenceReferenceE2E|ModelCatalog|DefaultParameterSetPromotionPlan)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 12.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, but the worktree is dirty because this task's files and an unrelated untracked rebuild plan file are present.
  - `git diff --check -- apps\api docs tasks .ai` passed with LF/CRLF warnings only.
  - `rg -n "schema_version|P0|P1|P2" docs\rebuild --glob "AutoWaterSimu_Next_*.md"` completed and returned the expected rebuild document references.
- Remaining scope:
  - Full model governance package movement is not complete; catalog snapshot mutation, benchmark query orchestration, benchmark run persistence workflow, promotion workflow orchestration, HTTP mapping, and DTOs remain in compute compatibility wiring.
  - Full evidence governance package movement is not complete; store-backed evidence assembly, model catalog/artifact/process graph callbacks, response DTOs, and HTTP mapping remain in compute compatibility wiring.
  - Full jobs lifecycle, full artifact lifecycle, full simulation input/process graph metadata service handling, and agent domain packages remain follow-up.

# 2026-06-01 AutoWaterSimu Next artifacts retention action planner split TODO

- [x] Re-read current worktree, Certainty/Elegance plan/current-state, API/domain/artifacts/compute READMEs, and retention sweep call sites
- [x] Confirm next aligned gap: retention sweep action/reason selection still lived in compute workflow code
- [x] Add `RetentionActionInput`, `RetentionActionPlan`, `EvaluateRetentionAction`, and action/reason constants to `apps/api/internal/domain/artifacts` with direct tests
- [x] Route `ArtifactLifecycleService.SweepArtifactRetention` through the domain artifacts helper while preserving object-store/archive/delete/audit execution in compute
- [x] Update README/architecture/checklists/change records
- [x] Run full validation, then commit and push

## Plan

- Move only pure retention action planning: blocking reference skip, archive executor missing skip, archive dry-run/execution action, ttl dry-run/delete action, and unsupported policy skip.
- Keep artifact object storage, archive copy/checksum/delete, metadata persistence, audit envelopes, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, and scheduler wiring unchanged.
- Treat this as another small `domain/artifacts` package movement step, not the full artifact lifecycle package split.

## Review

- Added retention action/reason constants, `RetentionActionInput`, `RetentionActionPlan`, and `EvaluateRetentionAction` to `apps/api/internal/domain/artifacts`.
- Added direct domain tests for blocking refs, archive candidate without backend, archive dry-run/execution, ttl dry-run/delete, and unsupported policies.
- Updated `ArtifactLifecycleService.SweepArtifactRetention` to delegate action selection to the domain helper while preserving existing compute-owned archive/delete execution, audit envelopes, metadata updates, object-store calls, HTTP/OpenAPI/contracts/migrations/generated clients, auth scopes, and scheduler behavior.
- Updated API/internal/domain/artifacts/compute READMEs, architecture/current-state, Certainty/Elegance checklist, and `.ai/changes`.
- Verification:
  - `cd apps\api; go test ./internal/domain/artifacts ./internal/compute -run "Test(EvaluateRetentionAction|ArtifactRetention|HTTPArtifactRetention|S3ArtifactStore)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 12.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, but the worktree is dirty because this task's files and an unrelated untracked rebuild plan file are present.
- Remaining scope:
  - Full artifact lifecycle package movement is not complete; object-store abstractions, archive execution, metadata persistence, audit envelopes, HTTP mapping, and scheduler wiring remain in compute compatibility wiring.
  - Full jobs lifecycle, full model governance, full evidence governance, full simulation input/process graph metadata service handling, and agent domain packages remain follow-up.

# 2026-06-01 AutoWaterSimu Next models benchmark workflow gate split TODO

- [x] Re-read current worktree, Certainty/Elegance plan/current-state, API/domain/models/compute READMEs, and model governance call sites
- [x] Confirm next aligned gap: benchmark case schedule-run and benchmark_run record admission preconditions still lived in compute workflow code
- [x] Add `BenchmarkCaseRunGate`, `EvaluateBenchmarkCaseRunGate`, `BenchmarkRunAdmission`, and `EvaluateBenchmarkRunAdmission` to `apps/api/internal/domain/models` with direct tests
- [x] Route model governance schedule-run and benchmark-run recording through the domain models helpers while preserving store orchestration and HTTP error mapping
- [x] Update README/architecture/checklists/change records
- [x] Run full validation, then commit and push

## Plan

- Move only stable benchmark workflow preconditions: active model version, benchmark case presence/validated status, default parameter set presence/match, and retired parameter set blocking for schedule-run.
- Keep model catalog lookup, simulation input resolution, compute job creation, benchmark run persistence, evidence reference resolution, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, and approval boundaries unchanged.
- Treat this as another small `domain/models` package movement step, not the full model governance package split.

## Review

- Added benchmark workflow blocker constants, `BenchmarkCaseRunGate`, `EvaluateBenchmarkCaseRunGate`, `BenchmarkRunAdmission`, and `EvaluateBenchmarkRunAdmission` to `apps/api/internal/domain/models`.
- Added direct domain tests for ready schedule-run gates, blocked inactive/unvalidated/retired scheduling, missing case/default parameter set, ready benchmark run admission, unvalidated case, parameter mismatch, and missing default parameter set.
- Updated `ModelGovernanceService.ScheduleBenchmarkCaseRun` and `benchmarkRunRecord` to use the domain models helpers while preserving existing catalog/store orchestration, resolver callbacks, response/error mapping, OpenAPI, contracts, migrations, generated clients, auth scopes, and approval boundaries.
- Updated API/internal/domain/models/compute READMEs, architecture/current-state, Certainty/Elegance checklist, and `.ai/changes`.
- Verification:
  - `cd apps\api; go test ./internal/domain/models ./internal/compute -run "Test(BenchmarkCaseRunGate|BenchmarkRunAdmission|BenchmarkCaseScheduleRunEndpoint|BenchmarkRun|DefaultParameterSetPromotionPlan|Promotion|ModelCatalog)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 12.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, but the worktree is dirty because this task's files and an unrelated untracked rebuild plan file are present.
  - `git diff --check -- apps\api docs tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Full model governance package movement is not complete; catalog snapshot mutation, benchmark query orchestration, benchmark run persistence workflow, promotion workflow orchestration, HTTP mapping, and DTOs remain in compute compatibility wiring.
  - Full jobs lifecycle, full artifact lifecycle, full evidence governance, full simulation input/process graph metadata service handling, and agent domain packages remain follow-up.

# 2026-06-01 AutoWaterSimu Next models benchmark case readiness split TODO

- [x] Re-read current worktree, Certainty/Elegance plan/current-state, API/domain/models/compute READMEs, and promotion planning call sites
- [x] Confirm next aligned gap: single benchmark case promotion readiness still normalized latest benchmark status, model_run blockers, and parameter hash readiness inside compute workflow code
- [x] Add `BenchmarkCasePromotionReadinessInput`, `BenchmarkCasePromotionReadiness`, `EvaluateBenchmarkCasePromotionReadiness`, and case-level blocking reason constants to `apps/api/internal/domain/models` with direct tests
- [x] Route `ModelGovernanceService.benchmarkCasePromotionResult` through the domain models readiness helper while preserving benchmark/model-run lookup and HTTP behavior
- [x] Update README/architecture/checklists/audit note
- [x] Run full validation, then commit and push

## Plan

- Move only pure single-case promotion readiness: latest benchmark run status blocking, parameter hash mismatch blocking, existing blocking-reason normalization, and final `Ready` predicate.
- Keep model catalog lookup, benchmark run query orchestration, model_run lookup/parsing error mapping, catalog snapshot mutation, benchmark run persistence, promotion workflow orchestration, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, and approval boundaries unchanged.
- Treat this as another small `domain/models` package movement step, not the full model governance package split.

## Review

- Added case-level promotion blocker constants and `EvaluateBenchmarkCasePromotionReadiness` to `apps/api/internal/domain/models`.
- Added direct domain tests for ready benchmark cases, status/hash blockers, duplicate/trimmed blockers, and existing blockers.
- Updated promotion case result assembly to use domain readiness while preserving existing missing benchmark, missing model_run, invalid payload, failed benchmark, and parameter hash blocker semantics.
- Updated API/internal/domain/models/compute READMEs, architecture/current-state, Certainty/Elegance checklist, boundary audit note, and `.ai/changes`.
- Verification:
  - `cd apps\api; go test ./internal/domain/models ./internal/compute -run "Test(BenchmarkCasePromotionReadiness|BenchmarkRun|DefaultParameterSetPromotionPlan|Promotion|ModelCatalog)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 12.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed` with dirty worktree because this task's files and an unrelated untracked rebuild plan file were present.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Full model governance package movement is not complete; catalog snapshot mutation, benchmark run persistence workflow, benchmark query orchestration, promotion workflow orchestration, HTTP mapping, and DTOs remain in compute compatibility wiring.
  - Full jobs lifecycle, full artifact lifecycle, full evidence governance, full simulation input/process graph metadata service handling, and agent domain packages remain follow-up.

# 2026-06-01 AutoWaterSimu Next models run identity check split TODO

- [x] Re-read current worktree, Certainty/Elegance plan/current-state, API/domain/models/compute READMEs, and benchmark run identity check call sites
- [x] Confirm next aligned gap: benchmark run validation and promotion result still compared model_run identity/parameter_hash inside compute workflow code
- [x] Add `RunIdentityExpectation`, `RunIdentityCheck`, and `CheckRunIdentity` to `apps/api/internal/domain/models` with direct tests
- [x] Route benchmark run record validation and promotion case result checks through the domain models helper while preserving HTTP errors and blocking reasons
- [x] Update README/architecture/checklists/audit note
- [x] Run full validation, then commit and push

## Plan

- Move only stable `model_run.v1` identity/hash comparison: expected job/model/version/parameter_hash against parsed `RunIdentity`, plus domain blocking reason codes for promotion planning.
- Keep model catalog lookup, benchmark case lookup, benchmark run record assembly, evidence reference resolution, promotion workflow orchestration, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, and approval boundaries unchanged.
- Treat this as another small `domain/models` package movement step, not the full model governance package split.

## Review

- Added `RunIdentityExpectation`, `RunIdentityCheck`, `CheckRunIdentity`, and model-run identity/hash mismatch blocking constants to `apps/api/internal/domain/models`.
- Added direct domain tests for matching identity/hash, identity-only mismatch, hash-only mismatch, and combined mismatch.
- Updated benchmark run record validation and promotion case result calculation to use the shared domain helper while preserving existing `ValidationError`, conflict mapping, promotion blocking reasons, and DTO fields.
- Updated API/internal/domain/models/compute READMEs, architecture/current-state, Certainty/Elegance checklist, boundary audit note, and `.ai/changes`.
- Verification:
  - `cd apps\api; go test ./internal/domain/models ./internal/compute -run "Test(CheckRunIdentity|BenchmarkRun|DefaultParameterSetPromotionPlan|Promotion|ModelCatalog)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 12.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed` with dirty worktree because this task's files and an unrelated untracked rebuild plan file were present.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Full model governance package movement is not complete; catalog snapshot mutation, benchmark run persistence workflow, benchmark query orchestration, promotion workflow orchestration, HTTP mapping, and DTOs remain in compute compatibility wiring.
  - Full jobs lifecycle, full artifact lifecycle, full evidence governance, full simulation input/process graph metadata service handling, and agent domain packages remain follow-up.

# 2026-06-01 AutoWaterSimu Next models promotion gate split TODO

- [x] Re-read current worktree, Certainty/Elegance plan/current-state, API/domain/models/compute READMEs, and promotion planning call sites
- [x] Confirm next aligned gap: default parameter set promotion gate reasons and final approval predicate still lived in compute workflow code
- [x] Add promotion status/blocking constants and `EvaluateParameterSetPromotionGate` to `apps/api/internal/domain/models` with direct tests
- [x] Route `ModelGovernanceService.DefaultParameterSetPromotionPlan` through the domain models gate while preserving benchmark query orchestration and HTTP behavior
- [x] Update README/architecture/checklists/audit note
- [x] Run full validation, then commit and push

## Plan

- Move only the pure default parameter set promotion gate: model version active check, parameter set status check, no-validated-case blocking, blocking-reason normalization, and final `CanPromoteToApproved` predicate.
- Keep catalog persistence, benchmark run query orchestration, case-result assembly, evidence reference resolution, promotion mutation, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, and approval boundaries unchanged.
- Treat this as a small `domain/models` package movement step, not the full model governance package split.

## Review

- Added model governance status constants, promotion blocking reason constants, `ParameterSetPromotionGateInput`, `ParameterSetPromotionGate`, and `EvaluateParameterSetPromotionGate` to `apps/api/internal/domain/models`.
- Added direct models domain tests for ready promotion, model-version/parameter-status/no-case blocking, non-validated parameter sets, duplicate/trimmed blocking reasons, and case-level blocking reasons.
- Updated `ModelGovernanceService.DefaultParameterSetPromotionPlan` to assemble benchmark case results as before, then delegate final blocking-reason normalization and approval readiness to the domain models helper.
- Replaced remaining local string literals for active model versions, validated benchmark cases, passed benchmark runs, approved/retired parameter set statuses in model governance with domain model constants where touched.
- Updated API/internal/domain/models/compute READMEs, architecture/current-state, Certainty/Elegance checklist, boundary audit note, and `.ai/changes`.
- Verification:
  - `cd apps\api; go test ./internal/domain/models ./internal/compute -run "Test(ParameterSetPromotionGate|DefaultParameterSetPromotionPlan|Promotion|BenchmarkRun|ModelCatalog)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 12.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed` with dirty worktree because this task's files and an unrelated untracked rebuild plan file were present.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Full model governance package movement is not complete; catalog snapshot mutation, benchmark run persistence workflow, benchmark query orchestration, promotion workflow orchestration, HTTP mapping, and DTOs remain in compute compatibility wiring.
  - Full jobs lifecycle, full artifact lifecycle, full evidence governance, full simulation input/process graph metadata service handling, and agent domain packages remain follow-up.

# 2026-06-01 AutoWaterSimu Next models benchmark parsing split TODO

- [x] Re-read current worktree, Certainty/Elegance plan/current-state, API/domain/models/compute READMEs, and model governance call sites
- [x] Confirm next aligned gap: benchmark run evidence ref parsing and model_run identity/parameter_hash parsing still lived in model governance helpers
- [x] Add `RunIdentityFromRaw` and benchmark run evidence-ref helpers to `apps/api/internal/domain/models` with direct tests
- [x] Route benchmark run validation and promotion planning through the domain models helpers while preserving store/HTTP behavior
- [x] Update README/architecture/checklists/audit note
- [x] Run full validation, then commit and push

## Plan

- Move only stable raw JSON extraction for `model_run.v1` identity/parameter hash and `benchmark_run.v1.evidence_refs`.
- Keep model catalog persistence, benchmark run record assembly, evidence reference resolution, promotion planning orchestration, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, and approval boundaries unchanged.
- Treat this as another small `domain/models` package movement step, not the full model governance package split.

## Review

- Added `RunIdentity` / `RunIdentityFromRaw` to `apps/api/internal/domain/models` for stable `model_run.v1` identity and `parameter_hash` extraction.
- Added `BenchmarkRunEvidenceRefs` / `BenchmarkRunEvidenceRefsFromRaw` to collect stable `benchmark_run.v1.evidence_refs`.
- Added direct models domain tests for model run identity, parameter hash, benchmark evidence refs, invalid raw JSON, and existing status/ref/warning behavior.
- Updated `ModelGovernanceService` benchmark run validation and promotion result calculation to use the domain models helpers while preserving store calls, resolver callbacks, blocking reasons, HTTP errors, OpenAPI, contracts, migrations, generated clients, auth scopes, and approval boundaries.
- Updated API/internal/domain/models/compute READMEs, architecture/current-state, Certainty/Elegance checklist, boundary audit note, and `.ai/changes`.
- Verification:
  - `cd apps\api; go test ./internal/domain/models ./internal/compute -run "Test(RunIdentity|BenchmarkRunEvidenceRefs|BenchmarkRun|DefaultParameterSet|Promotion|ModelCatalog)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 12.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed` with dirty worktree because this task's files and an unrelated untracked rebuild plan file were present.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Full model governance package movement is not complete; catalog snapshot mutation, benchmark run persistence workflow, promotion workflow orchestration, HTTP mapping, and DTOs remain in compute compatibility wiring.
  - Full jobs lifecycle, full artifact lifecycle, full evidence governance, full simulation input/process graph metadata service handling, and agent domain packages remain follow-up.

# 2026-06-01 AutoWaterSimu Next models parameter-set status split TODO

- [x] Re-read current worktree, Certainty/Elegance plan/current-state, API/domain/models/compute READMEs, and model governance call sites
- [x] Confirm next aligned gap: default parameter set status validation and transition invariants still lived in compute helpers
- [x] Add parameter-set status constants and transition helpers to `apps/api/internal/domain/models` with direct tests
- [x] Route `ModelGovernanceService` status updates through the domain models helper while preserving catalog snapshot mutation and HTTP mapping
- [x] Update README/architecture/checklists/audit note
- [x] Run full validation, then commit and push

## Plan

- Move only stable default parameter set status constants, valid status recognition, forward transition checks, and retirement checks.
- Keep model catalog persistence, snapshot mutation, benchmark run validation, promotion planning, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, and approval boundaries unchanged.
- Treat this as a small `domain/models` package movement step, not the full model governance package split.

## Review

- Added parameter-set status constants, valid status checks, and allowed transition checks to `apps/api/internal/domain/models`.
- Added direct models domain tests for allowed statuses, forward transitions, retirement, blocked backwards/skipped transitions, retired-source transitions, and unknown statuses.
- Updated `ModelGovernanceService.UpdateDefaultParameterSetStatus` to delegate status validation and transition checks to the domain helper while keeping catalog lookup, snapshot mutation, idempotent same-status response, HTTP error mapping, OpenAPI, contracts, migrations, generated clients, auth scopes, and approval boundaries unchanged.
- Removed compute-local parameter set status helper functions from `service.go`.
- Updated API/internal/domain/models/compute READMEs, architecture/current-state, Certainty/Elegance checklist, boundary audit note, and `.ai/changes`.
- Verification:
  - `cd apps\api; go test ./internal/domain/models ./internal/compute -run "Test(ParameterSet|ModelCatalog|DefaultParameterSet|Promotion|BenchmarkRun)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 12.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed` with dirty worktree because this task's files and an unrelated untracked rebuild plan file were present.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Full model governance package movement is not complete; catalog snapshot mutation, benchmark run validation, promotion workflows, HTTP mapping, and DTOs remain in compute compatibility wiring.
  - Full jobs lifecycle, full artifact lifecycle, full evidence governance, full simulation input/process graph metadata service handling, and agent domain packages remain follow-up.

# 2026-06-01 AutoWaterSimu Next evidence result explanation refs split TODO

- [x] Re-read current worktree, Certainty/Elegance plan/current-state, API/domain/evidence/compute READMEs, and result explanation call sites
- [x] Confirm next aligned gap: result explanation evidence ref extraction still lived in compute workflow code
- [x] Add `ResultExplanationEvidenceRefs` to `apps/api/internal/domain/evidence` with direct tests
- [x] Route `ResultExplanationService` evidence-ref validation through the domain helper while preserving job-scoped resolver behavior
- [x] Update README/architecture/checklists/change records
- [x] Run full validation, then commit and push

## Plan

- Move only stable top-level and statement-level `result_explanation.v1.evidence_refs` extraction and deduplication.
- Keep schema validation, job/result availability checks, job-scoped evidence resolution, persistence, review/publish workflow, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, and approval boundaries unchanged.
- Treat this as another small `domain/evidence` package movement step, not the full result explanation or evidence governance package split.

## Review

- Added `ResultExplanationEvidenceRefs` to `apps/api/internal/domain/evidence` to collect top-level and statement-level `result_explanation.v1.evidence_refs` with trimming, deduplication, and stable sorting.
- Updated `ResultExplanationService` to call the domain helper before invoking the existing job-scoped evidence resolver callback.
- Kept schema validation, job result availability checks, persistence, review/publish, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, and approval boundaries unchanged.
- Updated API/domain/evidence/compute READMEs, architecture/current-state, Certainty/Elegance checklist, audit note, and `.ai/changes`.
- Verification:
  - `cd apps\api; go test ./internal/domain/evidence ./internal/compute -run "Test(ResultExplanationEvidenceRefs|ResultExplanation|NewSystemEvidenceReferenceE2E)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 12.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed` with dirty worktree because this task's files and an unrelated untracked rebuild plan file were present.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Full evidence governance and result explanation domain package movement are not complete; resolver orchestration, store-backed workflow, persistence, DTO mapping, and HTTP mapping remain in compute compatibility wiring.
  - Full jobs lifecycle, full artifact lifecycle, full model governance, full simulation input/process graph metadata service handling, and agent domain packages remain follow-up.

# 2026-06-01 AutoWaterSimu Next evidence domain readiness policy split TODO

- [x] Re-read current worktree, Certainty/Elegance plan/current-state, API/domain/evidence/compute READMEs, and production-readiness call sites
- [x] Confirm next aligned gap: production-readiness policy evaluation still lives in compute evidence governance helper
- [x] Add readiness evaluator to `apps/api/internal/domain/evidence` with direct tests
- [x] Route `EvidenceGovernanceService.ProductionReadiness` through the domain evaluator while preserving response DTO shape
- [x] Update audit/docs/checklists/change records
- [x] Run focused/full Go tests, dependency/audit/PR fast, diff-check validation

## Plan

- Move only stable production-readiness policy evaluation: job succeeded, evidence package available, governance `production_allowed`, high/critical risk blocking, and medium risk warning.
- Keep evidence package generation, store-backed model catalog/artifact/model-run/process-graph callbacks, schema validation, `ProductionReadinessReport` DTO mapping, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, and approval boundaries unchanged.
- Treat this as a second `domain/evidence` package movement step, not the full evidence governance package split.

## Review

- Added `ReadinessInput`, `ReadinessEvaluation`, `ReadinessCheck`, and `EvaluateProductionReadiness` to `apps/api/internal/domain/evidence`.
- Added direct tests for ready, blocked, and medium-risk warning-only readiness evaluations.
- Updated `EvidenceGovernanceService.ProductionReadiness` to delegate policy evaluation to `domain/evidence` and map checks/risk summary back to the existing compute DTOs.
- Removed compute-local readiness policy branching from `evidence_governance.go`; evidence package generation, store-backed callbacks, schema validation, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, and approval boundaries stayed unchanged.
- Updated API/internal/domain/evidence/compute READMEs, `docs/architecture/compute-api.md`, current-state, Certainty/Elegance checklist, audit note, and change records.
- Verification:
  - `cd apps\api; go test ./internal/domain/evidence ./internal/compute -run "Test(EvaluateProductionReadiness|ProductionReadiness|EvidencePackage|NewSystemEvidenceReferenceE2E)" -count=1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 12.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed` with dirty worktree because this task's files and an unrelated untracked rebuild plan file were present.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Full evidence governance package movement is not complete; evidence package response assembly, production-readiness DTO assembly, store-backed artifact/model-run/process-graph callbacks, model catalog resolver, and HTTP mapping remain in compute compatibility wiring.
  - Full jobs lifecycle, full artifact lifecycle, full model governance, full simulation input/process graph metadata service handling, and agent domain packages remain follow-up.

# 2026-06-01 AutoWaterSimu Next evidence domain parsing split TODO

- [x] Re-read current worktree, Certainty/Elegance plan/current-state, API/domain/compute READMEs, and evidence governance call sites
- [x] Confirm next low-risk gap: stable evidence input/ref/risk parsing still lives in compute helpers
- [x] Add `apps/api/internal/domain/evidence` with direct tests
- [x] Route `EvidenceGovernanceService` through domain evidence helpers
- [x] Update audit/docs/checklists/change records
- [x] Run focused/full Go tests, dependency/audit/PR fast, diff-check validation, then commit and push

## Plan

- Move only stable JSON parsing helpers for evidence package input refs, evidence ref grammar, embedded `simulation_input.v1` payload lookup, and `risk_findings` summary.
- Keep store-backed evidence package export, production-readiness response assembly, process graph/model run/artifact lookup callbacks, HTTP routes, OpenAPI, contracts, migrations, generated clients, auth scopes, and approval boundaries unchanged.
- Treat this as the first `domain/evidence` package movement step, not the full evidence governance package split.

## Review

- Added `apps/api/internal/domain/evidence` with `InputRefs`, `ParseRef`, `SimulationInputPayload`, `RiskFindingsFromSummary`, `RiskFindingEvidenceRefs`, and `SummarizeRiskFindings`.
- Added direct evidence domain tests for input refs/hash behavior, legacy and typed evidence refs, simulation input payload lookup, and risk finding summary/evidence refs.
- Updated `EvidenceGovernanceService` to use the domain evidence helper for evidence package export, evidence-ref resolution, process graph evidence lookup, and production-readiness risk checks.
- Removed compute-local evidence input/ref/risk parsing helpers from `evidence_governance.go`; store-backed evidence governance, response DTO mapping, artifact/model-run/process-graph callbacks, HTTP routes, OpenAPI, contracts, migrations, generated clients, and auth scopes stayed unchanged.
- Updated API/internal/domain/compute/scripts READMEs, `docs/architecture/compute-api.md`, current-state, Certainty/Elegance checklist, boundary audit note, and change records.
- Verification:
  - `cd apps\api; go test ./internal/domain/evidence ./internal/compute -run "Test(InputRefs|ParseRef|SimulationInputPayload|RiskFindings|EvidencePackage|ProductionReadiness|NewSystemEvidenceReferenceE2E|ProcessGraphEvidenceReference)" -count=1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 12.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed` with dirty worktree because this task's files and an unrelated untracked rebuild plan file were present.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Full evidence governance package movement is not complete; store-backed evidence package generation, production-readiness DTO assembly, process graph/model run/artifact callbacks, and HTTP mapping remain in compute compatibility wiring.
  - Full jobs lifecycle, full artifact lifecycle, full model governance, full simulation input/process graph metadata service handling, and agent domain packages remain follow-up.

# 2026-06-01 AutoWaterSimu Next simulation domain process graph transform split TODO

- [x] Re-read current worktree, Certainty/Elegance plan/current-state, API/domain/compute READMEs, and process graph transform call sites
- [x] Confirm next aligned gap: ProcessGraph-to-SimulationInput validation/transform still lives in compute helpers
- [x] Move stable material-balance process graph validation and transformation helpers into `apps/api/internal/domain/simulation`
- [x] Keep compute `SimulationInputService` responsible for schema validation, metadata records, store operations, and HTTP error mapping
- [x] Update README/architecture/checklists/change records
- [x] Run focused/full Go tests, dependency/audit/PR fast, and diff-check validation

## Plan

- Move only stable `process_graph.v1` structural validation and material-balance `simulation_input.v1` projection rules.
- Keep `POST /api/v1/process-graphs`, `POST /api/v1/simulation-checks`, schema validation, metadata records, idempotency, process graph store interfaces, PostgreSQL implementation, OpenAPI, contracts, migrations, generated clients, and worker execution unchanged.
- Map domain helper errors back to compute `ValidationError` at the compute boundary so HTTP response shape stays stable.
- Treat this as a second simulation domain movement step, not the full simulation input/process graph service package split.

## Review

- Added `process_graph.go` and direct tests under `apps/api/internal/domain/simulation`.
- Moved stable process graph structural validation, material-balance ProcessGraph-to-SimulationInput projection, default runtime parameter merge, node/edge projection, and time segment collection out of compute helpers.
- Updated `SimulationInputService` to keep schema validation, metadata record assembly, store/idempotency, and `ValidationError` mapping while calling `domain/simulation`.
- Removed compute-local process graph validation/projection helpers from `service.go`; `service.go` now drops from 894 to 722 lines.
- Updated API/internal/domain/compute/scripts READMEs, `docs/architecture/compute-api.md`, current-state, Certainty/Elegance checklist, boundary audit note, and change records.
- Kept HTTP routes, OpenAPI, contracts, migrations, generated clients, store interfaces, PostgreSQL implementation, metadata records, evidence-ref lookup, and worker execution unchanged.
- Verification:
  - Initial focused domain test failed because the new test expected `seg_2` for a fallback segment id; the original behavior is per-edge override index, so the expected id was corrected to `seg_1`.
  - `cd apps\api; go test ./internal/domain/simulation ./internal/compute -run "Test(ValidateProcessGraph|ProcessGraphToSimulationInput|SimulationCheckEndpointCreatesComputeJob|ProcessGraphEvidenceReference)" -count=1` passed.
  - `cd apps\api; go test ./internal/domain/simulation ./internal/domain/artifacts ./internal/domain/models ./internal/domain/jobs ./internal/domain/workers ./internal/compute` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 11.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed` with dirty worktree because this task's files and an unrelated untracked rebuild plan file were present.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Full simulation input/process graph service package movement is not complete; metadata persistence, store implementation, evidence-ref lookup, and HTTP mapping remain in compute compatibility wiring.
  - Full jobs lifecycle, full artifact lifecycle, full model governance, evidence, and agent domain packages remain follow-up.

# 2026-06-01 AutoWaterSimu Next simulation domain execution profile split TODO

- [x] Re-read current worktree, Certainty/Elegance plan/current-state, API/domain/compute READMEs, and simulation execution call sites
- [x] Confirm next low-risk gap: simulation job type execution profile helper still lives in compute
- [x] Add `apps/api/internal/domain/simulation` with execution profile helpers and direct tests
- [x] Route simulation-check creation and benchmark case queueing through domain simulation helpers
- [x] Update audit/docs/checklists/change records
- [x] Run focused/full Go tests, dependency/audit/PR fast, and diff-check validation

## Plan

- Move only stable simulation job type to `compute_job.v1.execution` profile mapping.
- Preserve existing execution JSON shape: `time_limit_sec=600`, `priority=normal`, and `required_capabilities` as an array.
- Keep simulation input persistence, process graph transformation, model catalog governance, store interfaces, HTTP routes, OpenAPI, contracts, migrations, generated clients, and worker execution unchanged.
- Treat this as initial simulation domain movement, not the full simulation input/process graph package split.

## Review

- Added `apps/api/internal/domain/simulation` with `ExecutionProfile`, `RequiredCapabilities`, `IsSupportedJobType`, direct tests, and README context.
- Routed `CreateSimulationCheck` and `ModelGovernanceService.ScheduleBenchmarkCaseRun` through the domain simulation helper.
- Removed compute-local `simulationCheckExecution`.
- Updated API/internal/domain/compute/scripts READMEs, `docs/architecture/compute-api.md`, current-state, Certainty/Elegance checklist, boundary audit expected package dirs/notes, and change records.
- Kept simulation input persistence, process graph transformation, model catalog governance, store interfaces, HTTP routes, OpenAPI, contracts, migrations, generated clients, and worker execution unchanged.
- Verification:
  - `cd apps\api; go test ./internal/domain/simulation ./internal/compute -run "Test(RequiredCapabilities|ExecutionProfile|SimulationCheckEndpointCreatesComputeJob|BenchmarkCaseScheduleRunEndpoint)" -count=1` passed.
  - `cd apps\api; go test ./internal/domain/simulation ./internal/domain/artifacts ./internal/domain/models ./internal/domain/jobs ./internal/domain/workers ./internal/compute` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 11.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed` with dirty worktree because this task's files and an unrelated untracked rebuild plan file were present.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Full simulation input/process graph domain package movement is not complete; persistence, transformation, HTTP mapping, and store implementation remain in compute compatibility wiring.
  - Full jobs lifecycle, full artifact lifecycle, full model governance, evidence, and agent domain packages remain follow-up.

# 2026-06-01 AutoWaterSimu Next artifacts domain retention policy split TODO

- [x] Re-read current worktree, Certainty/Elegance plan/current-state, API/domain/compute READMEs, and artifact retention call sites
- [x] Confirm next low-risk gap: artifact retention policy parsing/candidate checks still live in compute helpers
- [x] Add `apps/api/internal/domain/artifacts` with retention policy helpers and direct tests
- [x] Route artifact upload and MemoryStore retention/metrics candidate checks through domain artifacts helpers
- [x] Update audit/docs/checklists/change records
- [x] Run focused/full Go tests, dependency/audit/PR fast, and diff-check validation

## Plan

- Move only stable retention policy constants, `retention_policy` / `retain_until` parsing, and candidate policy checks.
- Keep artifact object storage, archive execution, audit envelopes, metadata store interfaces, PostgreSQL implementation, HTTP routes, OpenAPI, contracts, migrations, and generated clients unchanged.
- Treat this as initial artifacts domain movement, not the full artifact lifecycle package split.

## Review

- Added `apps/api/internal/domain/artifacts` with `PolicyRetainForever`, `PolicyTTL`, `PolicyArchiveCandidate`, `RetentionFromMetadata`, and `IsRetentionCandidate`.
- Added direct artifacts domain tests for default retention, TTL `retain_until` parsing, invalid policy/time rejection, and candidate policy checks.
- Routed artifact upload metadata parsing and MemoryStore retention/metrics candidate checks through `domain/artifacts`.
- Removed compute-local artifact retention parsing and candidate helper functions.
- Updated API/internal/domain/compute/scripts READMEs, `docs/architecture/compute-api.md`, current-state, Certainty/Elegance checklist, boundary audit expected package dirs/notes, and change records.
- Kept artifact object storage, archive execution, selected mutation audit envelopes, store interfaces, PostgreSQL implementation, HTTP routes, OpenAPI, contracts, migrations, and generated clients unchanged.
- Verification:
  - `cd apps\api; go test ./internal/domain/artifacts ./internal/compute -run "Test(ArtifactRetention|HTTPArtifactRetention|IsRetention|Retention|UploadArtifactPersistsRetention)" -count=1` passed.
  - `cd apps\api; go test ./internal/domain/artifacts ./internal/domain/models ./internal/domain/jobs ./internal/domain/workers ./internal/compute` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 10.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed` with dirty worktree because this task's files and an unrelated untracked rebuild plan file were present.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Full artifact lifecycle package movement is not complete; object storage, archive execution, metadata persistence, audit envelopes, HTTP mapping, and PostgreSQL implementation remain in compute compatibility wiring.
  - Full jobs lifecycle, full models governance, evidence, simulation, and agent domain packages remain follow-up.

# 2026-06-01 AutoWaterSimu Next models domain model-run parsing split TODO

- [x] Re-read current worktree, domain README, jobs domain README, and compute model_run raw parsing call sites
- [x] Confirm next low-risk gap: `model_run.v1` raw field/evidence parsing still lives in compute helper functions
- [x] Add `apps/api/internal/domain/models` with model_run raw parsing helpers and direct tests
- [x] Route compute MemoryStore/PostgresStore/evidence/simulation callers through domain models helpers
- [x] Update audit/docs/checklists/change records
- [x] Run focused/full Go tests, dependency/audit/PR fast, and diff-check validation

## Plan

- Move only stable `model_run.v1` raw JSON extraction for id/job/model/version/parameter_set/evidence_refs/warnings.
- Keep model catalog governance, benchmark run validation, persistence, HTTP routes, OpenAPI, contracts, migrations, generated clients, and store interfaces unchanged.
- Treat this as initial models domain movement, not the full model governance package split.

## Review

- Added `apps/api/internal/domain/models` with `RunIDFromRaw`, `RunFieldsFromRaw`, `RunEvidenceRefsFromRaw`, and `RunWarningsFromRaw`.
- Added direct models domain tests for field trimming, evidence refs, warnings, ignored non-string values, and invalid raw JSON behavior.
- Routed MemoryStore, PostgresStore, evidence governance, and simulation input replay callers through `domain/models` helpers.
- Removed compute-local model-run field/ref/warning parsing helpers.
- Updated API/internal/domain/compute/scripts READMEs, `docs/architecture/compute-api.md`, current-state, Certainty/Elegance checklist, boundary audit expected package dirs/notes, and change records.
- Kept model catalog governance, benchmark run validation, promotion planning, store interfaces, HTTP routes, OpenAPI, contracts, migrations, and generated clients unchanged.
- Verification:
  - `cd apps\api; go test ./internal/domain/models ./internal/domain/jobs ./internal/domain/workers ./internal/compute` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 9.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed` with dirty worktree because this task's files were still uncommitted.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Full model governance package movement is not complete; catalog snapshots, benchmark runs, promotion planning, DTOs, HTTP mapping, and PostgreSQL implementation remain in compute compatibility wiring.
  - Full jobs lifecycle, artifacts, evidence, simulation, and agent domain packages remain follow-up.

# 2026-06-01 AutoWaterSimu Next jobs domain worker match split TODO

- [x] Re-read current worktree, jobs domain package, compute store worker claim matching code, and README First task context
- [x] Confirm next low-risk gap: worker claim capability / contract-version matching still lives in compute store helpers
- [x] Move job/worker matching invariants into `apps/api/internal/domain/jobs`
- [x] Keep MemoryStore/PostgresStore claim behavior stable through small compute projection calls
- [x] Update README/architecture/tasks/change records
- [x] Run focused/full Go tests, dependency/audit/PR fast, and diff-check validation

## Plan

- Add domain-level claim candidate and worker capability projection types in `internal/domain/jobs`.
- Move only matching rules for `execution.required_capabilities` and job/payload schema versions.
- Keep queue selection, state mutation, event writes, Store interfaces, PostgreSQL implementation, HTTP behavior, OpenAPI, contracts, migrations, and generated clients unchanged.
- Treat this as a continuation of jobs domain package movement, not full jobs lifecycle migration.

## Review

- Added `domain/jobs.ClaimCandidate`, `WorkerCapabilities`, `MatchesWorker`, `RequiredCapabilities`, and `ContractVersions`.
- Added direct jobs domain tests for required capability extraction, contract version extraction, matching success, missing capability rejection, and missing payload contract rejection.
- Updated MemoryStore and PostgresStore worker claim paths to project compute records into `domain/jobs` matching helpers.
- Removed compute-local worker matching helpers from `store.go`.
- Updated jobs/domain/compute README, compute-api architecture, current-state, Certainty/Elegance checklist, scripts README/audit note, and change records.
- Verification:
  - Initial focused test failed because PostgresStore still referenced the removed compute helper; fixed by routing Postgres claim through `domain/jobs.MatchesWorker`.
  - `cd apps\api; go test ./internal/domain/jobs ./internal/domain/workers ./internal/compute` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 8.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed` with dirty worktree because this task's files were still uncommitted.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Queue selection, state mutation, event writes, job records, store interfaces, HTTP mapping, and audit envelopes still live in compute compatibility wiring.
  - Full jobs lifecycle package movement and artifacts/models/evidence/simulation/agent packages remain follow-up.

# 2026-06-01 AutoWaterSimu Next jobs domain status split TODO

- [x] Re-read README First context, Certainty/Elegance PRD/plan, Compute API architecture/current-state, compute/domain README, and current job lifecycle/status code
- [x] Confirm next low-risk gap: stable job status invariants still live in compute instead of a jobs domain package
- [x] Add `apps/api/internal/domain/jobs` with status constants and terminal/result-state helpers
- [x] Keep compute status constants and helper compatibility stable
- [x] Extend boundary audit/docs/checklists to include the jobs domain package
- [x] Run focused/full Go tests, dependency/audit/PR fast, and diff-check validation

## Plan

- Move only stable job status constants and status invariant helpers into `internal/domain/jobs`.
- Keep job records, store interfaces, lifecycle persistence, HTTP handlers, audit envelopes, OpenAPI, contracts, migrations, and generated clients unchanged.
- Keep compute constants as aliases so existing package tests and callers do not require broad mechanical churn.
- Treat this as a small package-movement step, not the full jobs lifecycle package split.

## Review

- Added `apps/api/internal/domain/jobs` with status constants, `IsTerminal`, `IsWorkerResultStatus`, direct tests, and README context.
- Updated compute status constants to alias `domain/jobs` constants, preserving existing names for callers/tests.
- Switched worker heartbeat terminal projection and worker result status validation to the jobs domain helpers.
- Kept job records, store interfaces, lifecycle persistence, HTTP routes, audit envelopes, OpenAPI, contracts, migrations, and generated clients unchanged.
- Extended `scripts/audit-compute-api-boundary.ps1` expected package dirs to include `domain/jobs`.
- Updated API/internal/domain/compute README, compute-api architecture, current-state, Certainty/Elegance checklist, and scripts README.
- Verification:
  - `cd apps\api; go test ./internal/domain/jobs ./internal/domain/workers ./internal/compute` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, internal Go package dirs: 8.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed` with dirty worktree because this task's files were still uncommitted.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Full jobs lifecycle package movement is not complete; job records, store interfaces, persistence, audit envelopes, and HTTP mapping remain in compute compatibility wiring.
  - artifacts/models/evidence/simulation/agent domain packages have not moved yet.

# 2026-06-01 AutoWaterSimu Next platform contract document validation split TODO

- [x] Re-read README First context, platform/contracts README, compute contract validation helper, response types, and call sites
- [x] Confirm next low-risk gap: schema_version document validation helper still lives in compute even though it is domain-free
- [x] Move base contract document validation response and helper into `internal/platform/contracts`
- [x] Keep compute `ContractValidationResponse` compatibility wrapper because draft confirmation record depends on compute metadata type
- [x] Add direct platform contracts tests for missing, unsupported, invalid, and valid documents
- [x] Update README/architecture/tasks/change records
- [x] Run focused/full Go tests, dependency/audit/PR fast, and diff-check validation

## Plan

- Add `ValidationIssue`, `DocumentValidationResponse`, and `ValidateDocument` to `platform/contracts`.
- Keep `compute.ContractValidationResponse` as the HTTP-facing response that can optionally attach `DraftConfirmationRecord`.
- Replace compute `validateContractDocument` internals with a mapping wrapper over `platform/contracts.ValidateDocument`.
- Do not change routes, JSON response fields, OpenAPI, schema files, migrations, generated clients, or draft confirmation persistence behavior.

## Review

- Added `platform/contracts.ValidationIssue`, `DocumentValidationResponse`, and `ValidateDocument`.
- Added direct platform contracts tests for missing `schema_version`, unsupported `schema_version`, invalid known schema, and valid `contract_error.v1`.
- Replaced compute `validateContractDocument` internals with a mapping wrapper over `platform/contracts.ValidateDocument`.
- Kept `compute.ContractValidationResponse` as the HTTP-facing response that can attach `DraftConfirmationRecord`; `ContractValidationIssue` is now a platform type alias.
- Updated API/platform/contracts/compute README, compute-api architecture, current-state, Certainty/Elegance checklist, and change records.
- Verification:
  - `cd apps\api; go test ./internal/platform/contracts ./internal/platform/metrics ./internal/compute` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, package dirs: 7.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed` with dirty worktree because this task's files were still uncommitted.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Compute still owns draft confirmation persistence and response attachment because it depends on `DraftConfirmationRecord`.
  - Contract schemas, OpenAPI, migrations, and generated clients were intentionally unchanged.

# 2026-06-01 AutoWaterSimu Next platform metrics collector split TODO

- [x] Re-read README First context, Certainty/Elegance PRD/plan, Compute API architecture/current-state, platform/metrics README, compute metrics service, store interface, and HTTP metrics handler
- [x] Confirm next low-risk gap: metrics snapshot/rendering live in `platform/metrics`, but read-only metrics collector still lives in compute
- [x] Move read-only metrics collector into `internal/platform/metrics`
- [x] Keep compute compatibility aliases and store implementations stable
- [x] Extend boundary audit/docs/checklists to record the platform metrics collector
- [x] Run focused/full Go tests, dependency/audit/PR fast, and diff-check validation

## Plan

- Add a `SnapshotStore` and `MetricsService` to `platform/metrics`, with a clock-injected read-only `Metrics` method.
- Replace compute `MetricsService` implementation with aliases to the platform metrics service so public `Service.Metrics` remains stable.
- Extend the architecture audit to scan platform package service constructors and store calls, without adding new dependencies from platform to compute.
- Do not change `/metrics` route, metric names, output text, OpenAPI, contracts, migrations, generated clients, or metadata store SQL.

## Review

- Added `platform/metrics.SnapshotStore` and `platform/metrics.MetricsService` with injected clock and direct unit coverage.
- Replaced compute `MetricsService` implementation with compatibility aliases to `platform/metrics`, preserving `Service.Metrics` and `/metrics` behavior.
- Kept concrete MemoryStore/PostgresStore metrics count queries in compute storage implementations.
- Extended `scripts/audit-compute-api-boundary.ps1` to scan platform Go files for internal service constructors and Store method calls.
- Updated API/platform/compute README, compute-api architecture, current-state, scripts README, and Certainty/Elegance checklist to reflect that the metrics collector moved to platform.
- Verification:
  - `cd apps\api; go test ./internal/platform/metrics ./internal/compute` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; service constructors audited: 10, package dirs: 7.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed` with dirty worktree because this task's files were still uncommitted.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Concrete metrics count queries still live in compute MemoryStore/PostgresStore by design.
  - jobs/artifacts/models/evidence/simulation/agent domain packages have not moved yet.

# 2026-06-01 AutoWaterSimu Next platform contracts package split TODO

- [x] Re-read README First context, current worktree, Certainty/Elegance plan, Compute API architecture, contract validator code, and platform package context
- [x] Confirm next gap: contract schema validator still lived in compute while future domain packages need validation without importing compute
- [x] Move schema file registry, schema_version mapping, JSON Schema compiler, and validation errors into `internal/platform/contracts`
- [x] Keep compute-specific JSON payload-to-DTO decoding in `internal/compute`
- [x] Map platform contracts validation errors through compute `ToAppError`
- [x] Add direct platform contracts tests for schema mapping, unknown schemas, and a minimal valid `contract_error.v1`
- [x] Extend package boundary audit/docs/checklists to include `platform/contracts`
- [x] Run focused/full Go tests, dependency/audit/PR fast, and diff-check validation

## Plan

- Move only domain-free schema validation mechanics into `platform/contracts`.
- Keep `DecodeComputeJob` and `DecodeArtifactMetadata` in compute because they return compute DTOs and compute-specific shape errors.
- Preserve existing HTTP routes, OpenAPI, JSON Schemas, migrations, generated clients, and response mapping.
- Let `check-deps` continue enforcing that platform packages do not import compute.

## Review

- Added `apps/api/internal/platform/contracts` with `Validator`, schema file registry, `SchemaName`, platform validation error, and direct tests.
- Updated compute `contracts.go` to expose compatibility aliases for the platform validator while keeping DTO decode helpers in compute.
- Updated compute `ToAppError` to map `platform/contracts.Error` back to existing `contract_error.v1` response behavior.
- Extended `scripts/audit-compute-api-boundary.ps1` and architecture docs/checklists to include `platform/contracts`.
- Verification:
  - `cd apps\api; go test ./internal/platform/contracts ./internal/domain/workers ./internal/compute` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; package dirs are `compute`, `domain/workers`, `platform/auth`, `platform/config`, `platform/contracts`, `platform/httpx`, and `platform/metrics`, with 0 constructor violations.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Contract schemas and generated clients were intentionally unchanged.
  - jobs/artifacts/models/evidence/simulation/agent domain packages have not moved yet.

# 2026-06-01 AutoWaterSimu Next workers domain package split TODO

- [x] Re-read README First context, current worktree, Certainty/Elegance plan, Compute API architecture, worker lifecycle code, store interfaces, and tests
- [x] Confirm next gap: platform helpers moved, but no true Go domain package movement has landed yet
- [x] Move worker register / claim / heartbeat domain behavior into `internal/domain/workers`
- [x] Keep compute package as compatibility wiring through a worker store/job state adapter
- [x] Add direct workers domain tests and dependency guard for domain-to-compute reverse imports
- [x] Update boundary audit/docs/checklists to include `domain/workers`
- [x] Run focused workers/compute tests, full Go, dependency/audit/PR fast, and diff-check validation

## Plan

- Start true domain package movement with `workers` because register/claim/heartbeat has a narrow service boundary and does not own artifact upload or job completion.
- Keep HTTP routes, auth scopes, OpenAPI, contracts, migrations, generated clients, and storage behavior unchanged.
- Define a minimal workers `Store` using worker records plus job state projections, then adapt existing compute `WorkerStore` / `JobRecord` into that interface.
- Add `check-deps` coverage so `apps/api/internal/domain` cannot import the compute compatibility package.

## Review

- Added `apps/api/internal/domain` and `apps/api/internal/domain/workers` README context.
- Added `apps/api/internal/domain/workers` with `Record`, minimal `WorkerStore`, `WorkerLifecycleService`, projected claim/heartbeat job structs, and domain validation errors.
- Added direct workers domain tests for registration normalization, no-job claim, job claim response, heartbeat response, and missing worker id validation.
- Replaced compute worker lifecycle implementation with `workerStoreAdapter`, preserving existing `Service.RegisterWorker`, `Service.Claim`, and `Service.Heartbeat` behavior.
- Mapped workers domain errors back through compute `ToAppError`, preserving `contract_error.v1` response behavior.
- Extended `scripts/check-deps.ps1` and `scripts/audit-compute-api-boundary.ps1` to guard/record `internal/domain/workers`.
- Verification:
  - `cd apps\api; go test ./internal/domain/workers ./internal/compute` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; package dirs are `compute`, `domain/workers`, `platform/auth`, `platform/config`, `platform/httpx`, and `platform/metrics`, with 0 constructor violations.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - jobs/artifacts/models/evidence/simulation/agent domain packages have not moved yet.
  - Public `NewService` / `NewServiceWithArchive`, HTTP handler surface, `store.go`, and `postgres.go` remain compatibility and large-file split targets.

# 2026-06-01 AutoWaterSimu Next platform metrics package split TODO

- [x] Re-read README First context, current worktree, compute metrics service/store/HTTP rendering code, and platform package context
- [x] Confirm next gap: `platform/metrics` remains planned while metrics snapshot/rendering still live in compute/httpx
- [x] Move metrics snapshot shape and Prometheus renderer into `internal/platform/metrics`
- [x] Keep compute MetricsService/store ownership limited to collecting counts
- [x] Remove Prometheus label escaping from `platform/httpx`
- [x] Extend package boundary audit/docs/checklists to include `platform/metrics`
- [x] Update task review and README First records
- [x] Run focused metrics/httpx/compute tests, full Go, dependency/audit/PR fast, and diff-check validation

## Plan

- Define a domain-free `platform/metrics.Snapshot` and `RenderPrometheus` function.
- Keep compute `MetricsSnapshot` as an alias for compatibility while store/service code migrates gradually.
- Keep `/metrics` text output stable, including metric names and exposed gauges.
- Do not change HTTP routes, auth, OpenAPI, contracts, migrations, generated clients, or metadata store queries.

## Review

- Added `apps/api/internal/platform/metrics` with `Snapshot` and `RenderPrometheus`.
- Added direct renderer tests for sorted job status output and Prometheus label escaping.
- Moved `MetricsSnapshot` to a compute compatibility alias of `platformmetrics.Snapshot`.
- Updated `/metrics` HTTP handler to render through `platformmetrics.RenderPrometheus`; compute `MetricsService` and stores still collect metadata counts.
- Removed Prometheus label escaping from `platform/httpx`, leaving `httpx` focused on JSON response writing and loopback CORS.
- Extended boundary audit and architecture docs/checklists to include `platform/metrics`.
- Verification:
  - `cd apps\api; go test ./internal/platform/metrics ./internal/platform/httpx ./internal/platform/... ./internal/compute` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; package dirs are `compute`, `platform/auth`, `platform/config`, `platform/httpx`, and `platform/metrics`.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Metrics store collection still lives in compute because it depends on metadata store interfaces.

# 2026-06-01 AutoWaterSimu Next platform auth package split TODO

- [x] Re-read README First, current worktree, command entrypoint, compute auth/audit/error/server code, and platform package context
- [x] Confirm next gap: `platform/auth` remains planned but Authenticator / token config / principal still live in compute
- [x] Move Authenticator, TokenConfig, TokenRecord, Principal, and platform auth errors into `internal/platform/auth`
- [x] Keep compute data-scope helpers and `contract_error.v1` mapping behavior stable
- [x] Extend package boundary audit/docs/checklists to include `platform/auth`
- [x] Update task review and README First records
- [x] Run focused auth/compute/command tests, full Go, dependency/audit/PR fast, and diff-check validation

## Plan

- Make `platform/auth` independent from compute; it must import only standard library.
- Let platform auth return a small platform `Error` with status/code/message/details, then map that in compute `ToAppError` to preserve the existing HTTP response shape.
- Keep compute-level data-scope authorization against `JobRecord` in compute because it depends on compute domain metadata.
- Keep compatibility aliases in compute for this slice so existing tests and package-level wiring do not require broad mechanical churn.
- Do not change scopes, token JSON shape, production token guard policy, routes, OpenAPI, contracts, migrations, or generated clients.

## Review

- Added `apps/api/internal/platform/auth` with `Authenticator`, `TokenConfig`, `TokenRecord`, `Principal`, and platform auth `Error`.
- Added direct platform auth tests for default dev token success, missing scope denial, revoked token denial, and duplicate token validation.
- Updated compute to keep compatibility aliases for existing package tests/callers while moving the implementation to `platform/auth`.
- Updated compute `ToAppError` to map platform auth errors back to the existing `contract_error.v1` HTTP shape.
- Updated `cmd/compute-api` production token guard to parse `platformauth.TokenConfig` and instantiate `platformauth.NewAuthenticator`.
- Extended boundary audit docs/checklist to include `platform/auth`; `check-deps` already prevents platform packages from importing compute.
- Verification:
  - `cd apps\api; go test ./internal/platform/auth ./internal/platform/... ./internal/compute ./cmd/compute-api` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; package dirs are `compute`, `platform/auth`, `platform/config`, and `platform/httpx`.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Compute still owns job-specific tenant/project/site data-scope authorization because it depends on `JobRecord`.
  - OIDC/JWKS, RBAC/ABAC, all-mutation audit, and full object-level data scope remain future security work.

# 2026-06-01 AutoWaterSimu Next platform config package split TODO

- [x] Re-read README First, root README, apps/api internal platform context, command entrypoint, compute types, and current package split context
- [x] Confirm next gap: runtime `Config` is still a compute domain type even though it only configures the command/runtime boundary
- [x] Move runtime config shape from `internal/compute` into `internal/platform/config`
- [x] Extend package boundary audit and docs to include `platform/config`
- [x] Update task review and README First records
- [x] Run command/platform/compute Go tests, dependency checks, audit, PR fast, and diff-check validation

## Plan

- Move only the deployment/runtime `Config` struct; do not move auth principal/token types in this slice because they still participate in compute HTTP handler and data-scope logic.
- Keep command behavior, environment variable names, OpenAPI, contracts, migrations, generated clients, routes, and storage behavior unchanged.
- Make `platform/config` a domain-free package that imports only standard library.
- Keep the existing platform-to-compute reverse import guard in `check-deps` as the protection for this package.

## Review

- Added `apps/api/internal/platform/config` with a domain-free runtime `Config` type and README.
- Removed runtime `Config` from `apps/api/internal/compute/types.go`.
- Updated `cmd/compute-api` wiring and command tests to use `platformconfig.Config` while keeping environment variable names and runtime behavior unchanged.
- Extended the boundary audit expected package dirs to include `platform/config`.
- Updated API/internal/platform/compute architecture docs and Certainty/Elegance checklist to distinguish `platform/config` from domain package movement.
- Verification:
  - `cd apps\api; go test ./cmd/compute-api ./internal/platform/... ./internal/compute` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; package dirs are `compute`, `platform/config`, and `platform/httpx`.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Auth principal/token types remain in compute for now because handler/data-scope logic still depends on compute domain records.
  - Domain package movement for jobs/artifacts/models/evidence/simulation remains future work.

# 2026-06-01 AutoWaterSimu Next platform dependency guard TODO

- [x] Re-read README First, root README, scripts, dependency graph, apps/api internal platform, and current package split context
- [x] Confirm next gap: `platform/httpx` is split out, but `check-deps` does not yet enforce that platform helpers stay independent from compute domain
- [x] Add a dependency rule that prevents `apps/api/internal/platform` from importing `apps/api/internal/compute`
- [x] Update dependency graph, scripts/API docs, task review, and README First records
- [x] Run dependency, audit, Go, PR fast, and diff-check validation

## Plan

- Add the rule to `scripts/check-deps.ps1` because this is a cross-directory architecture boundary, not a compute-only audit.
- Scan only non-Markdown source files, consistent with existing dependency rules.
- Keep compute importing platform helpers allowed; only block platform-to-compute reverse dependency.
- Do not change API behavior, OpenAPI, contracts, migrations, generated clients, or package names.

## Review

- Added `apps-api-platform-must-not-import-compute-domain` to `scripts/check-deps.ps1`.
- Updated `docs/architecture/dependency-graph.md` so the new enforced rule is visible from the architecture entry.
- Updated scripts/API/platform/current-state/Certainty-Elegance docs to tie the new rule to the `platform/httpx` package split.
- Verification:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed.
  - `cd apps\api; go test ./internal/platform/... ./internal/compute` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - The guard only prevents platform-to-compute reverse imports; it does not complete domain package movement.
  - Future domain packages still need their own import direction rules once they exist.

# 2026-06-01 AutoWaterSimu Next platform HTTP package split TODO

- [x] Re-read README First, root README, docs/rebuild, docs/architecture, apps/api, internal compute, scripts, tasks, and current Compute API package context
- [x] Confirm next gap: internal service boundaries are narrowed, but no Go package movement has started yet
- [x] Extract low-coupling HTTP platform helpers into an internal platform package without changing API behavior
- [x] Extend Compute API boundary audit to record the first package split guardrail
- [x] Update API/architecture/current-state/Certainty-Elegance docs, task review, and README First records
- [x] Run focused Go tests, boundary audit, PR fast, and diff-check validation

## Plan

- Start package movement with `apps/api/internal/platform/httpx` because CORS and JSON writing are platform HTTP concerns and do not own compute domain state.
- Keep `apps/api/internal/compute` HTTP handlers and `AppError` mapping stable; do not change routes, OpenAPI, auth scopes, contracts, migrations, or generated clients.
- Add README context for the new `internal/platform` and `internal/platform/httpx` directories.
- Add audit evidence that the expected platform package exists before treating this as a real package-split step.
- Keep `Go API domain package split` unchecked until full jobs lifecycle and artifacts/models/evidence packages move out of `internal/compute`.

## Review

- Added `apps/api/internal/platform/README.md` and `apps/api/internal/platform/httpx/README.md` to define the first platform package boundary and prevent platform helpers from importing compute domain types.
- Added `apps/api/internal/platform/httpx` with `WriteJSON` and `WithLocalCORS`, plus direct tests for loopback CORS. Prometheus label escaping later moved to `platform/metrics` in this same work set.
- Updated `compute/http.go` to use `httpx.WithLocalCORS`; `compute/errors.go` delegates JSON writing to `httpx.WriteJSON` while preserving existing `WriteError` / `AppError` behavior.
- Extended `scripts/audit-compute-api-boundary.ps1` to emit `package_boundaries` and fail if expected internal package dirs (`compute`, `platform/httpx`) are missing.
- Updated API/internal/compute/scripts READMEs, `docs/architecture/compute-api.md`, current-state, and Certainty/Elegance Development Plan to distinguish first platform package movement from the still-incomplete domain package split.
- Verification:
  - `cd apps\api; go test ./internal/platform/httpx ./internal/compute` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; package dirs are `compute` and `platform/httpx`.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`.
  - `git diff --check -- apps\api docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - `apps/api/internal/compute` remains the main compute domain package.
  - Domain package movement for jobs/artifacts/models/evidence/simulation/agent/workers, handler/package surface reduction, and public `Service` constructor signature narrowing remain future work.

# 2026-06-01 AutoWaterSimu Next service constructor boundary TODO

- [x] Re-read README First, root README, docs/rebuild, docs/architecture, apps/api, internal compute, scripts, tasks, and current Go API structure context
- [x] Confirm next gap: internal domain services are behaviorally narrowed, but several constructors still expose multiple repository parameters and the boundary audit does not guard constructor regressions
- [x] Group internal domain service constructor repository dependencies into explicit narrow bundles without changing HTTP/API behavior
- [x] Extend `scripts/audit-compute-api-boundary.ps1` to record/fail constructor boundary regressions
- [x] Update API/architecture/current-state/Certainty-Elegance docs, task review, and README First records
- [x] Run focused audit, Go API tests, PR fast, and diff-check validation

## Plan

- Keep public `NewService` / `NewServiceWithArchive` compatible with the aggregate `Store` while `internal/compute` remains one package.
- Narrow internal service constructors by passing named domain repository bundles or callback bundles, then keep service fields typed to the smallest interfaces actually used by methods.
- Treat object artifact stores separately from metadata repositories so archive/hot storage stays explicit.
- Add an audit rule that fails if internal domain service constructors accept aggregate `Store` or exceed three store-like constructor parameters.
- Do not move Go packages, modify endpoint behavior, change contracts/OpenAPI, or add migrations in this slice.

## Review

- Added explicit constructor dependency bundles: `ArtifactLifecycleStores` / `ArtifactObjectStores`, `ModelRunReplayStore`, `ModelGovernanceStores`, and `EvidenceGovernanceStores`.
- Updated `service.go` wiring so internal domain service constructors now expose 1-3 store-like parameters and no internal domain constructor accepts aggregate `Store` directly.
- Extended `scripts/audit-compute-api-boundary.ps1` to emit `service_constructor_boundaries`, audit 10 service constructors, and fail on aggregate `Store` leakage or more than 3 store-like constructor parameters for internal services.
- Updated API/compute README context, scripts README, `docs/architecture/compute-api.md`, current-state, Certainty/Elegance checklist, and README First change log.
- Verification:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed; 41 Store methods, 12 embedded interfaces, 12 domain groups, 10 service constructors audited.
  - `cd apps\api; go test ./internal/compute -run "Test(NewSystemEvidenceReferenceE2E|SimulationCheckEndpointCreatesComputeJob|BenchmarkCaseScheduleRunEndpoint|HTTPArtifactDownloadTenantProjectSiteScope)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`.
  - `git diff --check -- apps\api scripts docs tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Public `NewService` / `NewServiceWithArchive` still accept aggregate `Store` while package-level compatibility wiring remains in `internal/compute`.
  - Go API domain package split, handler/package surface reduction, and large-file split remain future work.

# 2026-06-01 AutoWaterSimu Next site read-scope TODO

- [x] Re-read README First, root README, docs/rebuild, docs/architecture, contracts, apps/api, migrations, internal compute, scripts, tasks, and latest security context
- [x] Confirm next gap: tenant/project read scope is landed, but site scope is still only accepted on token config and not enforced
- [x] Add optional `site_id` to `compute_job.v1` context and API job metadata persistence
- [x] Carry `site_id` from simulation request metadata or external refs into generated compute jobs
- [x] Enforce tenant/project/site scope on job list/get and artifact download HTTP reads
- [x] Add focused Go, contract, OpenAPI/client drift, security smoke, and dependency validation
- [x] Update API/security docs, Certainty/Elegance plan, current-state summary, task review, and README First records

## Plan

- Treat `site_id` as an optional additive v1 contract field, not a new required field.
- Keep enforcement limited to the same read paths already covered by tenant/project: job list/get and artifact download.
- Keep empty token tenant/project/site scope as global access for existing dev/admin tokens.
- Do not claim all-object scope, mutation authorization, OIDC/JWKS, or full RBAC/ABAC completion.

## Review

- Added optional `site_id` to `compute_job.v1.context` and `simulation_request.v1.metadata`, plus a site-scoped valid compute job fixture registered in `contracts/registry.json`.
- Added `0010_job_site_scope` up/down migrations for `compute_jobs.site_id` and a tenant/project/site query index.
- Go API now persists `JobRecord.SiteID`, carries `site_id` from simulation request metadata or `external_refs.site_id`, includes it in evidence/readiness metadata, and applies token tenant/project/site scope to job list/get and artifact download.
- Generated Compute TS client `JobRecord` now exposes `tenant_id`, `project_id`, and `site_id`.
- Extended security smoke to cover tenant/project/site read-scope denial/allowance on job reads and artifact download.
- Updated contracts/API/compute/migrations/scripts READMEs, architecture current-state, Certainty/Elegance plan, and README First change log.
- Verification:
  - `cd apps\api; go test ./internal/compute -run "Test(HTTPJobReadTenantProjectSiteScope|HTTPArtifactDownloadTenantProjectSiteScope|NewSystemEvidenceReferenceE2E|SimulationCheckEndpointCreatesComputeJob|BenchmarkCaseScheduleRunEndpoint)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\security-smoke.ps1` passed.
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed.
  - `cd frontend; npx tsc --noEmit` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-contracts.ps1` passed after commit; registry/schema tests, Compute TS client generation, and OpenAPI/client drift gate passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed.
  - `git diff --check -- contracts apps\api frontend\src\client\compute scripts docs tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - `site_id` is still job metadata for read-scope, not a complete Site/WaterStation domain model.
  - Full object-level authorization, mutation data-scope enforcement, OIDC/JWKS, service-token secret management, ontology-backed runtime policy enforcement, and all-mutation audit remain future work.

# 2026-06-01 AutoWaterSimu Next tenant/project read-scope TODO

- [x] Re-read README First, root README, docs/rebuild, docs/architecture, apps/api, internal compute, scripts/ci, tasks, and latest security context
- [x] Confirm current security gap: selected mutation audit is partial, and tenant/project/site data scope is still not enforced on HTTP reads
- [x] Add optional tenant/project fields to static token principals
- [x] Enforce tenant/project scope on job list/get and artifact download HTTP reads
- [x] Add focused Go coverage and extend security smoke coverage summary
- [x] Update API/security docs, Certainty/Elegance plan, current-state summary, task review, and README First records
- [x] Run focused Go tests, security smoke, Go API tests, PR fast, and diff-check validation

## Plan

- Keep the first data-scope slice on read paths only: job list/get and artifact download.
- Treat an empty token tenant/project scope as global access for existing dev/admin tokens.
- Deny scoped tokens when either the job tenant or project does not match.
- Do not claim site scope, model catalog scope, benchmark scope, all object scope, or full RBAC/ABAC completion.

## Review

- Added optional `tenant_id`, `project_id`, and forward-compatible `site_id` fields to static token records and principals.
- Constrained HTTP job list/get and artifact download reads by token tenant/project scope. Empty token scope remains global for existing dev/admin tokens.
- Added memory/Postgres list filtering for tenant/project scope and route-level authorization against job metadata for single-job and artifact reads.
- Added focused Go coverage for scoped job list/get and artifact download denial/allowance, then extended `scripts/ci/security-smoke.ps1` to include those checks.
- Updated API/compute docs, scripts/ci README, architecture current-state, Certainty/Elegance plan, README First change log, and this task review.
- Verification:
  - `cd apps\api; go test ./internal/compute -run "Test(HTTPJobReadTenantProjectScope|HTTPArtifactDownloadTenantProjectScope)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\security-smoke.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed.
  - `git diff --check -- apps\api scripts docs tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - Site scope is accepted in token config for forward compatibility but not enforced yet.
  - Full object-level data scope, all-mutation audit, OIDC/JWKS, service-token secret management, and ontology-backed runtime policy enforcement remain future work.

# 2026-06-01 AutoWaterSimu Next nightly evidence workflow TODO

- [x] Re-read README First, root README, docs/rebuild, docs/architecture, `.github`, workflow, scripts/ci, tasks, and latest change records
- [x] Confirm checklist gaps: `nightly` is absent, security smoke has no hosted workflow, and existing integration/browser/desktop workflows already expose `workflow_call`
- [x] Add `workflow_call` support to `next-pr-fast.yml`
- [x] Add a reusable/manual `next-security-smoke.yml`
- [x] Add scheduled/manual `next-nightly.yml` to orchestrate pr-fast, integration, browser, security, and Desktop package smoke evidence
- [x] Update workflow/docs/current-state/Certainty-Elegance records without claiming hosted green runs
- [x] Run YAML parser checks, local smoke checks, PR fast, and diff-check validation

## Plan

- Treat nightly as a scheduled evidence orchestrator, not a replacement for release-evidence.
- Reuse existing workflow lanes instead of duplicating integration/browser/desktop smoke logic in one large YAML file.
- Keep all hosted green-run claims explicit: workflow presence and local parser validation do not prove a completed GitHub Actions run.
- Leave real release-evidence with unsigned artifact build/download as a separate manual workflow path.

## Review

- Added `workflow_call` to `.github/workflows/next-pr-fast.yml` so the fast lane can be reused by orchestrator workflows.
- Added `.github/workflows/next-security-smoke.yml` with manual/reusable triggers, Go setup, `scripts/ci/security-smoke.ps1`, and evidence upload.
- Added `.github/workflows/next-nightly.yml` with a daily UTC schedule and manual trigger. It calls pr-fast, integration, browser, security, and Desktop package reusable workflows, then writes `tmp/ci-evidence/nightly-summary.json`.
- Updated `.github` README, workflow README, scripts/ci README, architecture current-state, and the Certainty/Elegance checklist. `nightly` is now marked as a scheduled/manual orchestrator, with hosted green run still pending.
- Verification:
  - Python/PyYAML parser check passed for `next-pr-fast.yml`, `next-security-smoke.yml`, and `next-nightly.yml`; required triggers, reusable workflow references, summary needs, and artifact upload steps were found.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\security-smoke.ps1` passed; evidence status `passed`.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\release\smoke-release-artifact-download.ps1` passed; evidence status `passed`.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`.
- Remaining scope:
  - No hosted nightly GitHub Actions run was triggered from this local session.
  - Nightly does not replace manual release-evidence artifact build/download verification.
  - Integration/browser/Desktop hosted green runs are still evidence only after GitHub Actions executes them.

# 2026-06-01 AutoWaterSimu Next release artifact download smoke TODO

- [x] Re-read README First, root README, scripts, release, GitHub workflow, architecture, and Certainty/Elegance context
- [x] Confirm existing `next-release-gates.yml` already supports real unsigned artifact upload/download verification when `build_release_artifacts=true`
- [x] Add a fixture-backed release artifact download verifier smoke under `scripts/release`
- [x] Wire the smoke into `Justfile` and the release gate workflow evidence
- [x] Update scripts/workflow/architecture/Certainty-Elegance docs and README First records
- [x] Run focused smoke, workflow parser, release gate dry run, PR fast, and diff-check validation

## Plan

- Keep the new smoke in `scripts/release`, not `scripts/ci`, because it validates release artifact evidence rather than PR fast behavior.
- Use generated fixture artifacts under `tmp/`, not committed binaries.
- Cover both a passing artifact bundle and an expected failure for a missing installer executable.
- Do not claim a hosted release-evidence green run or production signed release; those still require real GitHub Actions execution and the existing post-P0 signing policy.

## Review

- Added `scripts/release/smoke-release-artifact-download.ps1`.
- The smoke generates temporary release artifact fixtures under `tmp/`, runs the existing `verify-release-artifact-download.ps1`, and records both:
  - a valid unsigned release artifact bundle passing verification
  - a missing installer executable fixture failing as expected
- Wired the smoke into `just release-artifact-download-smoke` and `.github/workflows/next-release-gates.yml`, so release gate evidence uploads include `release-artifact-download-smoke.json`.
- Updated root README, scripts READMEs, GitHub workflow READMEs, architecture current-state, and the Certainty/Elegance checklist.
- Verification:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\release\smoke-release-artifact-download.ps1` passed; evidence status `passed`, 2 steps passed.
  - Python/PyYAML parser check for `.github/workflows/next-release-gates.yml` passed; required release artifact verifier, release gate, downloaded artifact verification, and evidence upload steps found.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\release\next-release-gates.ps1 -Mode merge -SkipLong` passed; evidence status `passed`, 10 steps passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 7 steps passed, dirty worktree recorded.
  - `git diff --check -- .github Justfile README.md docs scripts tasks .ai` passed with LF/CRLF warnings only.
- Remaining scope:
  - No real hosted GitHub Actions release-evidence run was triggered from this local session.
  - The smoke does not prove a real unsigned workflow artifact upload/download round trip; that is still covered only when `next-release-gates.yml` runs with `build_release_artifacts=true`.
  - Signing, auto update, GitHub Release publication, and production distribution remain post-P0 per ADR `0011`.

# 2026-05-31 AutoWaterSimu Next mutation audit smoke TODO

- [x] Re-read README First, root README, docs/rebuild, docs/architecture, apps/api, internal compute, scripts/ci, tasks, and current security smoke context
- [x] Confirm the current security gap is mutation audit and data scope, while OIDC/JWKS/RBAC remain out of scope for this slice
- [x] Add selected mutation audit event envelopes for job create and artifact retention/archive events
- [x] Add focused Go tests and extend security smoke coverage summary
- [x] Update API/security docs, Certainty/Elegance plan, current-state summary, task review, and README First records
- [x] Run focused Go tests, full Go API tests, security smoke, dependency/PR fast, and diff-check validation

## Plan

- Keep the change inside existing `compute_job_events.event_json`; do not add migrations, OpenAPI fields, or generated clients.
- Capture HTTP principal and route in request context for selected mutation handlers, with service/system fallback for non-HTTP paths.
- Cover job create plus artifact retention delete/archive as a minimal, test-backed audit envelope slice.
- Keep tenant/project/site data-scope and all-mutation audit enforcement explicitly incomplete.

## Review

- Added `apps/api/internal/compute/audit.go` for selected mutation audit context and envelope helpers.
- `job.created` and `job.queued` events now include `event_json.audit` with `who/when/where/target_object/action/before/after/reason/trace_id/approval_ref`.
- Artifact retention delete/archive events now include the same audit envelope, with artifact before state and delete/archive after state.
- HTTP job create, simulation-check, draft promotion, benchmark schedule, and retention sweep paths inject the static-token principal and route into audit context; scheduler/service paths fall back to system/service context.
- Extended Go coverage for HTTP job-create audit and artifact retention audit envelopes.
- Extended `scripts/ci/security-smoke.ps1` evidence to mark `mutation_audit_events=covered_for_job_create_and_artifact_retention_events`, while keeping `tenant_project_site_data_scope=not_covered`.
- Updated API READMEs, scripts/ci README, architecture current-state/local-dev, and Certainty/Elegance Development Plan to distinguish selected mutation audit from all-mutation/data-scope security.
- Verification:
  - `cd apps\api; go test ./internal/compute -run "TestHTTPMutationAuditEventEnvelopeForJobCreate|TestHTTPArtifactRetentionSweepRequiresAdminScope|TestArtifactRetentionSweepArchivesCandidateWithConfiguredBackend" -count=1` passed.
  - `cd apps\api; go test ./internal/compute -run "TestArtifactRetentionSweepDeletesOnlyUnreferencedExpiredTTL" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\security-smoke.ps1` passed; evidence status `passed`, 3 steps passed, 0 failed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 7 steps passed, 0 failed.
  - `git diff --check -- apps\api scripts docs\architecture docs\rebuild\AutoWaterSimu_Next_Certainty_Elegance_Development_Plan_v1.0.md tasks\todo.md .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - Full production OIDC/JWKS or service-token secret manager is still not implemented.
  - Tenant/project/site data-scope filtering remains uncovered.
  - All-mutation audit enforcement is not complete; this slice covers selected job/artifact mutation events only.

# 2026-05-31 AutoWaterSimu Next browser smoke TODO

- [x] Re-read README First, root README, docs/rebuild, docs/architecture, scripts/ci, `.github/workflows`, frontend, frontend/tests, routes, and services README context
- [x] Locate existing mock-backed Playwright smokes for Compute Jobs/current-flow, Model governance, and lifecycle retention
- [x] Add a dedicated contract validation browser smoke
- [x] Add `scripts/ci/browser-smoke.ps1` with machine-readable evidence
- [x] Add `just browser-smoke`
- [x] Add `.github/workflows/next-browser-smoke.yml` as manual/reusable hosted lane
- [x] Update root README, scripts READMEs, GitHub READMEs, frontend tests README, architecture docs, Certainty/Elegance plan, and README First records
- [x] Run browser smoke, frontend typecheck, workflow parser, dependency/PR fast, and diff-check validation

## Plan

- Keep browser smoke opt-in and mock-backed for speed and determinism.
- Cover the current Web orchestration surfaces explicitly: Compute Jobs/current-flow, contract validation, Model governance, and lifecycle retention.
- Do not claim live backend browser evidence until the browser lane is connected to the real Postgres/MinIO/worker integration stack or hosted environment.
- Upload `tmp/ci-evidence/browser-smoke.json` from the manual/reusable workflow.

## Review

- Added `frontend/tests/contract-validation.spec.ts` to cover the Compute Jobs contract validation panel with a mock-backed `POST /api/v1/contracts/validate`.
- Added `scripts/ci/browser-smoke.ps1`, which writes `tmp/ci-evidence/browser-smoke.json` and runs:
  - Compute Jobs current-flow submission and production readiness smoke
  - Contract validation panel smoke
  - Model governance catalog snapshot and promotion readiness smoke
  - Compute lifecycle metrics and retention guard smoke
- Added `just browser-smoke`.
- Added `.github/workflows/next-browser-smoke.yml` with manual/reusable triggers, frontend dependency install, Chromium install, smoke execution, and evidence upload.
- Updated root README, scripts READMEs, GitHub READMEs, frontend tests README, architecture current-state/local-dev, and Certainty/Elegance Development Plan.
- Verification:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\browser-smoke.ps1` passed; evidence status `passed`, 4 steps passed, 0 failed, with live backend and hosted workflow explicitly recorded as `not_covered`.
  - `cd frontend; npx tsc --noEmit` passed.
  - Python/PyYAML parser check for `.github/workflows/next-browser-smoke.yml` passed; required triggers, Node setup, Chromium install, browser smoke execution, and upload-artifact step found, `runs-on=windows-latest`, 6 steps.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 7 steps passed, 0 failed, workflow list includes `next-browser-smoke.yml`.
  - `git diff --check -- .github scripts Justfile README.md docs\architecture docs\rebuild\AutoWaterSimu_Next_Certainty_Elegance_Development_Plan_v1.0.md frontend\tests tasks\todo.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - Browser smoke is still mock-backed; it does not prove live Postgres/MinIO/worker backend reads or a real authenticated legacy backend session.
  - No hosted GitHub Actions browser-smoke run was triggered from this local session.

# 2026-05-31 AutoWaterSimu Next Water Ontology registry TODO

- [x] Re-read README First, root README, docs/rebuild README, architecture README/current-state/local-dev, Certainty/Elegance PRD and Development Plan
- [x] Confirm `ontology/` was not yet landed and locate the plan checklist entries
- [x] Add Water Ontology objects/actions/links/policies registries with local README context
- [x] Add `scripts/check-ontology.ps1`
- [x] Wire `just check-ontology`, `just check`, and `pr-fast`
- [x] Update architecture docs, script READMEs, root README, Certainty/Elegance checklist, and README First records
- [x] Run ontology, dependency, PR fast, and diff-check validation

## Plan

- Keep ontology as a semantic registry layer, not a runtime authorization implementation.
- Validate references across objects, actions, links, and policies before adding generated types or runtime enforcement.
- Record current gaps explicitly: RBAC/ABAC, tenant/project/site data scope, approval workflow, mutation audit, and ontology-backed UI remain future work.
- Add ontology to the fast lane because the registry check is dependency-free and low cost.

## Review

- Added `ontology/` with object, action, link, and policy registries plus local README context.
- Added `docs/architecture/ontology-model.md` to make the semantic layer, validation gate, and runtime-enforcement gap explicit.
- Added `scripts/check-ontology.ps1`; it validates registry schema versions, unique keys, required fields, and object/action/link/policy references.
- Added `just check-ontology`, included ontology validation in `just check`, and wired the same check into `scripts/ci/pr-fast.ps1`.
- Updated root README, scripts READMEs, architecture current-state/local-dev, and Certainty/Elegance Development Plan checklist.
- Verification:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-ontology.ps1` passed, reporting 18 objects, 14 actions, 18 links, and 5 policies.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 7 steps passed, 0 failed, including the new ontology registry check.
  - `git diff --check -- ontology scripts Justfile README.md docs\architecture docs\rebuild\AutoWaterSimu_Next_Certainty_Elegance_Development_Plan_v1.0.md tasks\todo.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - Ontology is registry-backed only; runtime RBAC/ABAC, tenant/project/site data scope, approval workflow, mutation audit, UI graph explorer, and generated domain types remain future work.

# 2026-05-31 AutoWaterSimu Next desktop package smoke TODO

- [x] Re-read README First, scripts/ci README, GitHub workflow README, Desktop READMEs, architecture current-state/local-dev, Certainty/Elegance PRD and Development Plan
- [x] Add `scripts/ci/desktop-package-smoke.ps1` with machine-readable evidence
- [x] Add `just desktop-package-smoke`
- [x] Add `.github/workflows/next-desktop-package-smoke.yml` as manual/reusable hosted lane
- [x] Add `docs/architecture/desktop-runtime.md`
- [x] Update root README, scripts README, scripts/ci README, GitHub READMEs, architecture docs, Certainty/Elegance plan, and README First records
- [x] Run Desktop package smoke, workflow parser check, dependency check, PR fast, and diff-check validation

## Plan

- Keep Desktop package smoke opt-in, not part of default PR fast.
- Reuse existing Rust round-trip and support bundle tests instead of duplicating package logic in PowerShell.
- Pair contract fixture validation with runtime package import/export evidence.
- Record uncovered boundaries explicitly: packaged worker exe, NSIS installer, release artifact download, and hosted green run.

## Review

- Added `scripts/ci/desktop-package-smoke.ps1`.
- The script writes `tmp/ci-evidence/desktop-package-smoke.json` and currently runs:
  - Desktop package/support bundle contract fixture tests
  - Rust clean-runtime project package export/import round-trip test
  - Rust support bundle redaction test
  - Desktop React wrapper typecheck
- Added `just desktop-package-smoke`.
- Added `.github/workflows/next-desktop-package-smoke.yml` with `workflow_dispatch` / `workflow_call`, Windows runner, Python/uv, Rust, Rust cache, Node, Desktop dependency install, smoke execution, and evidence upload.
- Added `docs/architecture/desktop-runtime.md` to summarize Desktop runtime ownership, package/support bundle contracts, evidence entry, release boundary, and current gaps.
- Verification:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\desktop-package-smoke.ps1` passed; evidence status `passed`, 4 steps passed, 0 failed, with packaged worker / NSIS installer / hosted workflow explicitly recorded as `not_covered`.
  - Python/PyYAML parser check for `.github/workflows/next-desktop-package-smoke.yml` passed; required triggers and setup/upload steps found, `runs-on=windows-latest`, 10 steps.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 6 steps passed, 0 failed, workflow list includes `next-desktop-package-smoke.yml`, dirty worktree recorded.
  - `git diff --check -- .github scripts Justfile README.md docs\architecture docs\rebuild\AutoWaterSimu_Next_Certainty_Elegance_Development_Plan_v1.0.md tasks\todo.md .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
  - Trailing-whitespace scan on the new script/workflow/desktop-runtime/doc files found only pre-existing Markdown hard-break spaces in the Certainty/Elegance Development Plan header.
- Remaining scope:
  - No actual hosted GitHub Actions run was triggered from this local session.
  - Packaged worker exe, NSIS installer artifact, release artifact download verification, signing/auto-update policy work, browser smoke, ontology, and full golden scenarios remain future work.

# 2026-05-31 AutoWaterSimu Next desktop package contracts TODO

- [x] Re-read README First, root README, docs/rebuild README, contracts README/tests, Desktop READMEs, Certainty/Elegance PRD and Development Plan
- [x] Locate Desktop project package/support bundle runtime shape and existing smoke tests
- [x] Add `desktop_project_package.v1` and `desktop_support_bundle.v1` schemas with valid/invalid fixtures
- [x] Register schemas in `contracts/registry.json` and `contracts/codegen/manifest.json`
- [x] Switch new Desktop project exports to `desktop_project_package.v1` while keeping legacy `desktop_project_export.v1` import compatibility
- [x] Update contracts/Desktop/architecture docs and Certainty/Elegance checklist
- [x] Run contract, Desktop Rust, PR fast, and diff-check validation

## Plan

- Treat this as a contract/runtime-alignment slice, not the full Desktop offline golden scenario.
- Keep the package format file-backed and checksum-verified, matching the existing Rust import/export implementation.
- Preserve legacy `desktop_project_export.v1` import compatibility so older local package files remain usable.
- Do not introduce generated Rust DTOs until package runtime validation and scenario evidence are stable.

## Review

- Added `contracts/desktop_project_package.v1.json` and `contracts/desktop_support_bundle.v1.json`.
- Added valid fixtures for a Desktop project package and support bundle, plus invalid fixtures for missing project metadata and unsafe support-bundle artifact-content redaction.
- `contracts/registry.json` now covers 19 schemas; `contracts/codegen/manifest.json` includes the two Desktop contracts while keeping Rust generation deferred.
- Desktop runtime now emits `desktop_project_package.v1` for new project package exports and accepts both `desktop_project_package.v1` and legacy `desktop_project_export.v1` on import.
- Updated `contracts/README.md`, contract examples READMEs, Desktop READMEs, `docs/architecture/contracts.md`, `docs/architecture/current-state.md`, and the Certainty/Elegance Development Plan checklist.
- Verification:
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed, `99 passed`.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-contracts.ps1` passed; registry coverage reported 19 schemas, 38 valid examples, 14 invalid examples, and generated client drift passed.
  - `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed, `22 passed`.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 6 steps passed, 0 failed, dirty worktree recorded.
  - `git diff --check -- contracts apps\desktop docs\architecture docs\rebuild\AutoWaterSimu_Next_Certainty_Elegance_Development_Plan_v1.0.md tasks\todo.md .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
  - Trailing-whitespace scan on the new contract/runtime/doc files found only pre-existing Markdown hard-break spaces in the Certainty/Elegance Development Plan header.
- Remaining scope:
  - No generated Rust contract DTOs yet.
  - No hosted Desktop package export/import CI artifact evidence yet.
  - The Desktop offline golden scenario is not complete until clean-runtime/package evidence is wired into a CI or scheduled lane.

# 2026-05-31 AutoWaterSimu Next security smoke TODO

- [x] Re-read README First, scripts README, scripts/ci README, Justfile, architecture local-dev/current-state, Certainty/Elegance PRD and Development Plan
- [x] Locate existing Go auth/scope/revocation and production guard tests
- [x] Add `scripts/ci/security-smoke.ps1` with machine-readable evidence
- [x] Add `just check-security`
- [x] Update root README, scripts READMEs, architecture docs, Certainty/Elegance plan, and README First records
- [x] Run security smoke, dependency, PR fast, and diff-check validation

## Plan

- Keep security smoke opt-in and fast; do not add it to default PR fast until the team wants that lane.
- Reuse existing Go tests instead of duplicating HTTP scenarios in PowerShell.
- Record coverage boundaries directly in `tmp/ci-evidence/security-smoke.json`.
- Do not claim full security scenario completion until tenant/project/site data-scope and mutation audit are implemented and covered.

## Review

- Added `scripts/ci/security-smoke.ps1`.
- The script currently runs:
  - production auth config guard tests in `./cmd/compute-api`
  - static token revocation, auth scope, and artifact admin-scope tests in `./internal/compute`
  - governance route scope-denial tests in `./internal/compute`
- `security-smoke.json` explicitly records `mutation_audit_events` and `tenant_project_site_data_scope` as `not_covered`.
- Verification:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\security-smoke.ps1` passed; evidence status `passed`, 3 steps passed, 0 failed, with mutation audit and data scope explicitly recorded as `not_covered`.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 6 steps passed, 0 failed, dirty worktree recorded.
  - `git diff --check -- README.md Justfile scripts docs\architecture docs\rebuild\AutoWaterSimu_Next_Certainty_Elegance_Development_Plan_v1.0.md tasks\todo.md .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - No hosted security workflow yet.
  - No OIDC/JWKS or service-token secret manager integration yet.
  - No tenant/project/site data-scope filtering or mutation audit event smoke yet.

# 2026-05-31 AutoWaterSimu Next production dev-token guard TODO

- [x] Re-read README First, root README, apps/api README, cmd/compute-api README, internal compute README, Certainty/Elegance PRD and Development Plan
- [x] Locate current Compute API static token wiring and production-security gap
- [x] Add `cmd/compute-api` startup guard for production token config
- [x] Add focused Go tests for production empty/default-token rejection and non-production/default behavior
- [x] Update `.env.example`, API/cmd README, architecture current-state, Certainty/Elegance plan, and README First records
- [x] Run focused cmd tests, full Go API tests, dependency/PR fast, and diff-check validation

## Plan

- Keep P0 static token auth behavior unchanged for local/development runs.
- Treat `APP_ENV=production` and `ENVIRONMENT=production` as production startup.
- In production, reject missing `COMPUTE_API_TOKENS_JSON`, empty token lists, and default development token values.
- Do not pretend this is full OIDC/RBAC/data-scope security; keep those as follow-up hardening work.

## Review

- `compute.Config` now carries `Environment`.
- `cmd/compute-api` reads `APP_ENV` first and falls back to root `ENVIRONMENT`.
- `validateProductionAuthConfig` rejects empty production token config, invalid token JSON, empty token lists, and default development token values (`dev-public-token`, `dev-worker-token`, `dev-admin-token`).
- Non-production still allows the existing default development authenticator behavior used by local smoke tests.
- Verification:
  - `cd apps\api; go test ./cmd/compute-api -run "TestValidateProductionAuthConfig|TestOpenArchiveStore|TestOpenStore" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 6 steps passed, 0 failed, dirty worktree recorded.
  - `git diff --check -- .env.example apps\api docs\architecture docs\rebuild\AutoWaterSimu_Next_Certainty_Elegance_Development_Plan_v1.0.md tasks\todo.md .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - Real OIDC/JWKS or service-token secret manager integration is not implemented.
  - Tenant/project/site data-scope filtering, mutation audit event coverage, and a dedicated security smoke lane remain future work.

# 2026-05-31 AutoWaterSimu Next hosted integration workflow TODO

- [x] Re-read README First, `.github/workflows/README.md`, scripts/ci README, local-dev/current-state, Certainty/Elegance PRD and Development Plan
- [x] Make `scripts/ci/integration-smoke.ps1` path handling cross-platform for Ubuntu `pwsh` runners
- [x] Add `.github/workflows/next-integration-smoke.yml` as a manual/reusable integration smoke workflow
- [x] Upload `tmp/ci-evidence/integration-smoke.json` as `next-integration-smoke-evidence`
- [x] Update workflow README, scripts README, architecture current-state/local-dev, and Certainty/Elegance plan without claiming hosted green evidence
- [x] Run local integration smoke regression, workflow YAML parser check, dependency check, PR fast, and diff-check validation
- [ ] Trigger real GitHub Actions hosted run and record the green run URL/evidence after it completes

## Plan

- Keep the integration workflow opt-in through `workflow_dispatch` / `workflow_call`, not a default PR gate.
- Use `ubuntu-latest` because Docker Compose integration is a Linux-container path.
- Install backend dependencies with `uv sync` so `backend/.venv/bin/python` can run the host worker CLI.
- Let the existing PowerShell smoke script own all business validation and evidence JSON generation.
- Do not mark the `integration` lane checklist complete until there is an actual hosted green run.

## Review

- Added `.github/workflows/next-integration-smoke.yml`.
- `integration-smoke.ps1` now uses path segment joining for repo root, Python resolution, fixture lookup, smoke dirs, and worker CLI invocation instead of hard-coded Windows separators.
- Workflow syntax is intentionally small: checkout, setup Python/uv, install backend deps, verify Docker Compose, run smoke, upload evidence.
- Documentation now distinguishes "workflow exists" from "hosted evidence is green".
- Verification:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\integration-smoke.ps1 -StartCompose` passed after the cross-platform path changes; latest evidence status `passed`, 9 steps passed, 0 failed, main job `job_integration_20260531131955`.
  - Python/PyYAML parser check for `.github/workflows/next-integration-smoke.yml` passed; required keys found, `runs-on=ubuntu-latest`, 7 steps, upload-artifact step present.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 6 steps passed, 0 failed, and workflow file list includes `next-integration-smoke.yml`.
  - `docker compose -p autowatersimu-next-integration-smoke -f docker-compose.dev.yml ps` showed no running services after smoke cleanup.
  - `git diff --check -- .github\workflows scripts docs\architecture docs\rebuild\AutoWaterSimu_Next_Certainty_Elegance_Development_Plan_v1.0.md tasks\todo.md .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - No actual GitHub Actions hosted run was triggered from this local session.
  - Frontend/browser reads, packaged worker, release artifact, security scope/audit, Desktop package schema, ontology, and golden scenario lanes remain future work.

# 2026-05-31 AutoWaterSimu Next integration smoke TODO

- [x] Re-read README First, root README, scripts/ci README, architecture local-dev/current-state, simulation-worker README, compose config, worker API client/runner, and Certainty/Elegance Phase 1 smoke requirements
- [x] Add `scripts/ci/integration-smoke.ps1` for real Postgres + MinIO + Compute API + worker HTTP bridge smoke
- [x] Add `just integration-smoke` root task entry
- [x] Fix the dev Compose Compute API command so the `golang:1.26` image keeps `go` on PATH
- [x] Verify job/result/model_run/artifact/evidence/retention dry-run/metrics and compose cleanup
- [x] Update architecture docs, script READMEs, Certainty/Elegance development plan, and README First records
- [x] Run integration smoke, dependency, PR fast, and diff-check validation

## Plan

- Use an isolated Docker Compose project for PostgreSQL, MinIO, MinIO bucket init, and source-mounted Go Compute API.
- Run the Python worker through `backend/.venv` in API once mode so the smoke validates the HTTP worker bridge without depending on first-start worker container dependency installation.
- Exercise a unique material-balance job from the contracts fixture, then verify persisted result, model_run lookup, artifact download checksum, evidence package checksum, archive-candidate retention dry-run, and metrics.
- Keep this as opt-in integration evidence; do not claim browser/frontend reads, hosted CI integration workflow, packaged worker, release artifact, security, or Desktop package coverage.

## Review

- Added `scripts/ci/integration-smoke.ps1`.
- Added `just integration-smoke`.
- `docker-compose.dev.yml` now starts `compute-api` with `sh -c` because `sh -lc` in `golang:1.26` reset PATH and failed to find `go`.
- The integration smoke writes `tmp/ci-evidence/integration-smoke.json`, records dirty worktree state, runs compose diagnostics on failure, and tears down containers/volumes by default.
- Early smoke runs exposed two implementation issues: Compute API container PATH with login shell, and PowerShell multipart upload behavior for archive-candidate artifacts. The final script uses direct .NET multipart upload and the final smoke passed.
- Verification:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\integration-smoke.ps1 -StartCompose` passed; evidence status `passed`, 9 steps passed, 0 failed, compose project cleaned down; latest main job `job_integration_20260531131136`.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 6 steps passed, 0 failed, dirty worktree recorded.
  - `git diff --check -- README.md Justfile docker-compose.dev.yml scripts docs\architecture docs\rebuild\AutoWaterSimu_Next_Certainty_Elegance_Development_Plan_v1.0.md tasks\todo.md .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - Hosted `integration` workflow is not yet added.
  - Frontend/browser reads of job/result/evidence are not covered by this smoke.
  - Packaged worker, release artifact, security scope/audit, Desktop package schema, ontology, and 8 golden scenarios remain future lanes.

# 2026-05-31 AutoWaterSimu Next metrics service boundary TODO

- [x] Re-read README First, apps/api README, internal compute README, architecture compute/current-state, and Certainty/Elegance Phase 1 context
- [x] Introduce `MetricsService` with narrow metrics-store and clock dependencies
- [x] Delegate public `Service.Metrics` to the narrow service
- [x] Update the Compute API boundary audit to count the `metrics` narrow repository field
- [x] Update Compute API README, architecture current-state, and Certainty/Elegance checklist
- [x] Run full Go API tests, audit, dependency, PR fast, and diff-check validation

## Plan

- Keep `/metrics` behavior and Prometheus rendering unchanged.
- Keep metrics read-only: no retention sweep, timeout sweep, job mutation, artifact mutation, or archive mutation.
- Keep `Service.Metrics` as the compatibility delegate.
- Do not change public constructor signatures, OpenAPI, auth scopes, generated clients, migrations, or metric names.

## Review

- Added `metrics.go`.
- `MetricsService` now owns metrics snapshot reads through `MetricsStore` and a clock.
- `Service.Metrics` keeps the existing public method and delegates to the metrics boundary.
- The Compute API boundary audit now counts metrics Store calls through the `metrics` narrow repository field; metrics Store calls are sourced from `metrics.go`.
- Focused verification:
  - `cd apps\api; go test ./internal/compute -run "TestHTTPAuthScopeAndMetrics" -count=1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed.
- Verification:
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 6 steps passed, 0 failed, dirty worktree recorded.
  - `git diff --check -- apps\api docs scripts tasks\todo.md .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - `NewService` / `NewServiceWithArchive` still wire narrowed services from the aggregate `Store`.
  - Go package split, handler/package surface reduction, and public constructor signature narrowing remain future work.


# 2026-05-31 AutoWaterSimu Next job lifecycle service boundary TODO

- [x] Re-read README First, apps/api README, internal compute README, architecture compute/current-state, and Certainty/Elegance Phase 1 context
- [x] Introduce `JobLifecycleService` with narrow job-store, model-run-store, validator, clock, and artifact-listing dependencies
- [x] Delegate public `Service.CreateJob`, `Service.GetJob`, `Service.ListJobs`, `Service.Events`, `Service.CancelJob`, `Service.Complete`, `Service.Fail`, and `Service.TimeoutSweep` methods to the narrow service
- [x] Preserve public HTTP/API behavior, OpenAPI, contracts, generated clients, migrations, auth scopes, artifact object writes, model catalog mutation, and evidence semantics
- [x] Update Compute API README, architecture current-state, and Certainty/Elegance checklist
- [x] Run full Go API tests, audit, dependency, PR fast, and diff-check validation

## Plan

- Keep job lifecycle responsible for job creation, listing/read snapshots, events, cancellation, completion/failure, timeout sweep, and model-run persistence from worker results.
- Keep artifact object writes in `ArtifactLifecycleService` and evidence package generation in `EvidenceGovernanceService`.
- Keep `Service` public methods as compatibility delegates.
- Do not change idempotency semantics, list pagination, event records, stale worker handling, compute_result validation, model_run persistence rules, or timeout behavior.

## Review

- Added `job_lifecycle.go`.
- `JobLifecycleService` now owns job create/list/read/events, cancel, complete/fail, timeout sweep, snapshot assembly, and model-run extraction from valid worker results.
- `Service` keeps existing job public methods as compatibility delegates.
- The job boundary uses `JobStore`, `ModelRunStore`, validator, clock, and artifact listing callback; it does not perform artifact object writes, model catalog mutation, or evidence package generation.
- Focused verification:
  - `cd apps\api; go test ./internal/compute -run "Test(CreateJob|CancelRejectsLateResult|ValidatedWorkerFailPersistsTerminalResult|TimeoutSweep|WorkerLifecycleArtifactSucceedAndDownload|ValidatedCompletePersistsModelRun|NewSystemEvidenceReferenceE2E)" -count=1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed.
- Verification:
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 6 steps passed, 0 failed, dirty worktree recorded.
  - `git diff --check -- apps\api docs scripts tasks\todo.md .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - Metrics remains the last obvious service-constructor narrowing candidate in `Service`.
  - `NewService` / `NewServiceWithArchive` still wire narrowed services from the aggregate `Store`.
  - Go package split remains future work.


# 2026-05-31 AutoWaterSimu Next evidence governance service boundary TODO

- [x] Re-read README First, apps/api README, internal compute README, architecture compute/current-state, and Certainty/Elegance Phase 1 context
- [x] Introduce `EvidenceGovernanceService` with narrow job, model-run, process-graph, validator, clock, model catalog resolver, and artifact resolver dependencies
- [x] Delegate public `Service.Result`, `Service.EvidencePackage`, `Service.ProductionReadiness`, and `Service.ResolveEvidenceReference` methods to the narrow service
- [x] Preserve public HTTP/API behavior, OpenAPI, contracts, generated clients, migrations, auth scopes, model catalog mutation, artifact mutation, and approval semantics
- [x] Update Compute API README, architecture current-state, and Certainty/Elegance checklist
- [x] Run full Go API tests, audit, dependency, PR fast, and diff-check validation

## Plan

- Keep evidence governance read-only: it may assemble result views, evidence packages, readiness reports, and evidence-ref payloads, but must not mutate jobs, model catalog snapshots, artifacts, or approval state.
- Use callbacks for model catalog and artifact metadata/listing so this service keeps only three repository interfaces: `JobStore`, `ModelRunStore`, and `ProcessGraphStore`.
- Keep `Service` public methods as compatibility delegates.
- Do not change evidence package schema, production readiness policy text, supported evidence-ref formats, checksum generation, or route/auth behavior.

## Review

- Added `evidence_governance.go`.
- `EvidenceGovernanceService` now owns result read, evidence package export, production readiness report generation, evidence-ref resolution, evidence governance summary, and related risk/readiness helpers.
- `Service.Result`, `Service.EvidencePackage`, `Service.ProductionReadiness`, and `Service.ResolveEvidenceReference` now delegate to the evidence boundary.
- The evidence boundary uses `JobStore`, `ModelRunStore`, `ProcessGraphStore`, model catalog resolver callback, artifact listing callback, and artifact metadata callback. It does not write to metadata stores.
- Focused verification:
  - `cd apps\api; go test ./internal/compute -run "Test(NewSystemEvidenceReferenceE2E|ProductionReadiness|ValidatedCompletePersistsModelRun|RiskFindings|HTTPAuthScopeAndMetrics)" -count=1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed.
- Verification:
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 6 steps passed, 0 failed, dirty worktree recorded.
  - `git diff --check -- apps\api docs scripts tasks\todo.md .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - Job lifecycle and metrics remain future service-constructor narrowing candidates.
  - `NewService` / `NewServiceWithArchive` still wire narrowed services from the aggregate `Store`.


# 2026-05-31 AutoWaterSimu Next worker lifecycle service boundary TODO

- [x] Re-read README First, apps/api README, internal compute README, architecture compute/current-state, and Certainty/Elegance Phase 1 context
- [x] Introduce `WorkerLifecycleService` with narrow worker-store and clock dependencies
- [x] Delegate public `Service.RegisterWorker`, `Service.Claim`, and `Service.Heartbeat` methods to the narrow service
- [x] Update Compute API boundary audit to count the `workers` narrow repository field
- [x] Preserve public HTTP/API behavior, OpenAPI, contracts, generated clients, migrations, auth scopes, job completion, and artifact behavior
- [x] Run full Go API tests, audit, dependency, PR fast, and diff-check validation

## Plan

- Move only worker registration, claim, and heartbeat logic into the narrow service.
- Keep artifact upload and job succeed/fail on their existing artifact/job lifecycle paths.
- Keep `Service` public methods as compatibility delegates.
- Do not change worker wire payloads, capability matching, lease duration, job terminal semantics, or cancellation response shape.

## Review

- Added `worker_lifecycle.go`.
- `WorkerLifecycleService` now owns worker registration, worker lookup for claim, queue claim, and heartbeat lease extension.
- `Service` keeps `RegisterWorker`, `Claim`, and `Heartbeat` as public compatibility delegates.
- The Compute API boundary audit now counts worker Store calls through the `workers` narrow repository field; all worker Store calls are sourced from `worker_lifecycle.go`.
- Focused verification:
  - `cd apps\api; go test ./internal/compute -run "Test(WorkerLifecycleArtifactSucceedAndDownload|WorkerClaim|ValidatedWorkerFailPersistsTerminalResult|HTTPArtifactUploadMultipart|NewSystemEvidenceReferenceE2E)" -count=1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed.
- Verification:
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 6 steps passed, 0 failed, dirty worktree recorded.
  - `git diff --check -- apps\api docs scripts tasks\todo.md .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - Job lifecycle, evidence governance, and metrics remain future service-constructor narrowing candidates.
  - `NewService` / `NewServiceWithArchive` still wire narrowed services from the aggregate `Store`.


# 2026-05-31 AutoWaterSimu Next artifact upload/listing service boundary TODO

- [x] Re-read README First, apps/api README, internal compute README, architecture compute/current-state, Certainty/Elegance Phase 1 context, artifact implementation, HTTP handler, and artifact tests
- [x] Move artifact upload, job artifact listing, and artifact metadata lookup into `ArtifactLifecycleService`
- [x] Delegate public `Service.UploadArtifact` and existing artifact list/evidence-ref lookups to the artifact boundary
- [x] Preserve public HTTP/API behavior, OpenAPI, contracts, generated clients, migrations, auth scopes, and object-store behavior
- [x] Update Compute API README, architecture current-state, and Certainty/Elegance checklist
- [x] Run full Go API tests, audit, dependency, PR fast, and diff-check validation

## Plan

- Keep the existing `ArtifactLifecycleService` as the artifact boundary instead of creating a parallel artifact service.
- Extend its constructor only as far as upload requires: `JobStore`, `ArtifactMetadataStore`, `ArchiveMetadataStore`, hot/archive object stores, validator, and clock.
- Keep the public `Service` methods as compatibility delegates.
- Do not change multipart upload behavior, artifact retention/archive behavior, or artifact download fallback semantics.

## Review

- `ArtifactLifecycleService` now owns artifact upload validation/write/metadata insertion, job artifact listing, artifact metadata lookup, download, retention sweep, and archive copy/checksum/delete.
- `Service.UploadArtifact`, job snapshot assembly, job list artifact assembly, and artifact evidence-ref resolution now delegate to the artifact boundary.
- The Compute API boundary audit now reports artifact metadata Store calls from `artifact_lifecycle.go`; `service.go` no longer directly calls artifact metadata Store methods for upload/listing/evidence lookup.
- Earlier remaining-scope notes that artifact upload/listing sat outside `ArtifactLifecycleService` are superseded by this slice.
- Verification:
  - `cd apps\api; go test ./internal/compute -run "Test(WorkerLifecycleArtifactSucceedAndDownload|ArtifactRetention|HTTPArtifactUploadMultipart|NewSystemEvidenceReferenceE2E)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 6 steps passed, 0 failed, dirty worktree recorded.
  - `git diff --check -- apps\api docs scripts tasks\todo.md .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - Worker lifecycle remains the next likely constructor-narrowing candidate before jobs + metrics.
  - `NewService` / `NewServiceWithArchive` still wire narrowed services from the aggregate `Store`.

# 2026-05-31 AutoWaterSimu Next model governance service boundary TODO

- [x] Re-read README First, apps/api README, internal compute README, architecture compute/current-state, and Certainty/Elegance Phase 1 context
- [x] Introduce `ModelGovernanceService` with narrow model catalog, benchmark run, model run, validator, clock, simulation input resolver, job creation, and evidence resolver dependencies
- [x] Delegate public model catalog / parameter set promotion / benchmark run / model run / benchmark case scheduling Service methods to the narrow service
- [x] Update Compute API boundary audit to count `catalogs` and `benchmarkRuns` narrowed repository fields
- [x] Update Compute API README, architecture current-state, and Certainty/Elegance checklist
- [x] Run full Go API tests, audit, dependency, PR fast, and diff-check validation

## Plan

- Keep public HTTP/API behavior stable.
- Do not modify OpenAPI, contracts, generated clients, migrations, auth scopes, or database implementations.
- Treat this as one service-constructor narrowing slice, not a package split.
- Preserve existing benchmark case queueing, default parameter set promotion, benchmark run evidence ref validation, and model_run lookup semantics.

## Review

- Added `model_governance.go`.
- `ModelGovernanceService` now owns model catalog registration/read/list, default parameter set status transitions, promotion planning/approval gating, benchmark case job queueing, benchmark run history, and model run read/list lookup.
- `Service` keeps the existing public methods as compatibility delegates; HTTP handlers, OpenAPI, contracts, migrations, and auth scopes are unchanged.
- Benchmark case scheduling still resolves simulation input references through `SimulationInputService`, creates jobs through the existing compute-job path, and validates benchmark run evidence refs through the existing job-scoped evidence resolver callback.
- The Compute API boundary audit now counts Store calls through `catalogs` and `benchmarkRuns` narrow repository fields.
- Verification:
  - `cd apps\api; go test ./internal/compute -run "Test(ModelCatalog|DefaultParameterSetPromotionPlanEndpoint|BenchmarkCaseScheduleRunEndpoint|ValidatedCompletePersistsModelRun|NewSystemEvidenceReferenceE2E)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 6 steps passed, 0 failed, dirty worktree recorded.
  - `git diff --check -- apps\api docs scripts tasks\todo.md .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - Artifact upload/listing still sits outside `ArtifactLifecycleService` and should be revisited before package movement.
  - Worker lifecycle and jobs + metrics remain future service-constructor narrowing candidates.

# 2026-05-31 AutoWaterSimu Next draft and explanation service boundary TODO

- [x] Re-read README First, apps/api README, internal compute README, architecture compute/current-state, and Certainty/Elegance Phase 1 context
- [x] Introduce `DraftWorkflowService` with narrow draft confirmation, validator, clock, and simulation-check creation dependencies
- [x] Introduce `ResultExplanationService` with narrow result explanation, job, validator, clock, and evidence resolver dependencies
- [x] Delegate public draft confirmation / constraint plan / promotion / result explanation Service methods to the narrow services
- [x] Move reusable contract validation response construction into `contract_validation.go`
- [x] Tighten Compute API boundary audit so public service delegates are not counted as Store calls
- [x] Update Compute API README, architecture current-state, and Certainty/Elegance checklist
- [x] Run focused Go tests, full Go API tests, audit, dependency, PR fast, and diff-check validation

## Plan

- Keep public HTTP/API behavior stable.
- Do not modify OpenAPI, contracts, generated clients, migrations, auth scopes, or database implementations.
- Treat this as one service-constructor narrowing slice, not a package split.
- Preserve existing Agent draft promotion semantics and job-scoped result explanation evidence ref validation.

## Review

- Added `draft_workflows.go`, `result_explanations.go`, and `contract_validation.go`.
- `DraftWorkflowService` now owns draft confirmation persistence/readback, advisory constraint application plans, and explicit approved Agent draft promotion to simulation-check jobs through the existing creation callback.
- `ResultExplanationService` now owns result explanation submit/read/review/publish and validates job-scoped evidence refs through the existing evidence resolver callback.
- `Service` keeps the existing public methods as compatibility delegates; HTTP handlers, OpenAPI, contracts, migrations, and auth scopes are unchanged.
- The Compute API boundary audit now counts Store calls only through known aggregate/narrow repository fields, avoiding false positives from public service delegates.
- Verification:
  - `cd apps\api; go test ./internal/compute -run "Test(Contract|Draft|Constraint|ResultExplanation|NewSystemEvidenceReferenceE2E)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 6 steps passed, 0 failed, dirty worktree recorded.
  - `git diff --check -- apps\api docs scripts tasks\todo.md .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - Model catalog / benchmark run / model run paths remain the next likely service-constructor narrowing slice.
  - Artifact upload/listing still sits outside `ArtifactLifecycleService` and should be revisited before package movement.

# 2026-05-31 AutoWaterSimu Next simulation input service boundary TODO

- [x] Re-read README First, apps/api README, internal compute README, architecture compute/current-state, and Certainty/Elegance Phase 1 context
- [x] Introduce `SimulationInputService` with narrow simulation input, process graph, model run, job, validator, and clock dependencies
- [x] Delegate public simulation input/process graph Service methods to the narrow service
- [x] Move `simulation_request.input_ref` resolution to the narrow service for inline input, registered input id, process graph id, and model run replay
- [x] Update Compute API boundary audit to count resolved Store method calls across narrowed service files
- [x] Update Compute API README, architecture current-state, and Certainty/Elegance checklist
- [x] Run focused Go tests, full Go API tests, audit, dependency, PR fast, and diff-check validation

## Plan

- Keep public HTTP/API behavior stable.
- Do not modify OpenAPI, contracts, generated clients, migrations, auth scopes, or database implementations.
- Treat this as one service-constructor narrowing slice, not a package split.
- Preserve existing material-balance-only ProcessGraph transformation and conservative model_run replay semantics.

## Review

- Added `simulation_inputs.go`.
- `SimulationInputService` now owns simulation input registration/read, process graph registration/read, ProcessGraph-to-SimulationInput transformation, and model_run replay input lookup.
- `Service` keeps the existing public methods as compatibility delegates, while `CreateSimulationCheck` and benchmark case scheduling call `SimulationInputService.ResolveSimulationInput`.
- The Compute API boundary audit now filters calls by resolved Store method names across service-layer files, so calls made through narrowed fields such as `inputs`, `processGraphs`, `modelRuns`, and `jobs` are counted without hard-coding field names.
- Latest audit reports 41 resolved Store methods, 12 embedded interfaces, and source-aware calls including `simulation_inputs.go`.
- Verification:
  - `cd apps\api; go test ./internal/compute -run "Test(ProcessGraph|SimulationInput|ModelRunReplay|NewSystemEvidenceReferenceE2E|DefaultParameterSetPromotionPlanEndpoint)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 6 steps passed, 0 failed, dirty worktree recorded.
  - `git diff --check -- apps\api docs scripts tasks\todo.md .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - Draft confirmation/result explanation constructor narrowing remains the next likely small service-boundary slice.
  - HTTP handler direct Store calls are now visible in audit source evidence and should be reduced in a later boundary cleanup.

# 2026-05-31 AutoWaterSimu Next Compute API boundary audit TODO

- [x] Re-read README First, root README, apps/api README, internal compute README, current-state, and Certainty/Elegance Phase 1 context
- [x] Add `scripts/audit-compute-api-boundary.ps1`
- [x] Add `just audit-compute-api`
- [x] Generate Compute API Store/domain boundary evidence under `tmp/architecture-evidence/compute-api-boundary.json`
- [x] Add `docs/architecture/compute-api.md`
- [x] Update apps/api, internal compute, architecture, scripts, current-state, and Certainty/Elegance checklist
- [x] Run audit, Go tests, dependency, PR fast, and diff validation

## Plan

- Treat this as the Store/interface split baseline, not the split itself.
- Keep the audit read-only and machine-readable.
- Use the current Store interface and service call distribution to decide the first safe split domain.
- Avoid touching endpoint behavior, OpenAPI, database migrations, auth scopes, contracts, or generated clients in this slice.

## Review

- Added a Compute API boundary audit script that reports file sizes, Store method count, domain grouping, service call counts, MemoryStore/PostgresStore implementation coverage, and recommended split order.
- Latest audit reports 41 Store methods across 12 candidate domains, with both MemoryStore and PostgresStore covering all methods.
- Added `docs/architecture/compute-api.md`; it records large-file signals, domain grouping, recommended split order, split rules, and verification commands.
- Recommended first Store split is `artifacts` + `archive_metadata`, then `simulation_inputs` + `process_graphs`.
- Verification:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed.
  - `cd apps\api; go test ./...` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 6 steps passed, 0 failed, dirty worktree recorded.

# 2026-05-31 AutoWaterSimu Next contracts codegen policy TODO

- [x] Re-read README First, docs/architecture, contracts, scripts, current-state, and Certainty/Elegance plan context
- [x] Add `contracts/codegen/README.md`
- [x] Add `contracts/codegen/manifest.json` covering every registered schema and TypeScript/OpenAPI/Go/Python/Rust target decision
- [x] Add `docs/architecture/contracts.md`
- [x] Extend `scripts/check-contracts.ps1` to validate codegen manifest coverage
- [x] Update contracts/architecture/scripts/current-state README and Certainty/Elegance checklist
- [x] Run contract, dependency, PR fast, and diff validation

## Plan

- Treat `contracts/codegen/` as the current codegen/validation policy home, not a generated output directory.
- Keep TypeScript generation tied to the existing OpenAPI Compute client.
- Explicitly record that Go/Python/Rust generated contract types are deferred and current safety comes from runtime schema validation, hand-written boundary DTOs, and tests.
- Gate the manifest so new schemas cannot be added without a codegen/validation decision.

## Review

- Added `contracts/codegen/manifest.json`; it covers all 17 registered schemas and records 5 target decisions: TypeScript, OpenAPI, Go, Python, Rust.
- Added `docs/architecture/contracts.md` summarizing source of truth, drift gates, change rules, current gaps, and next decisions.
- `scripts/check-contracts.ps1` now validates `contracts/codegen/README.md`, manifest schema version, source of truth, schema coverage, and required target decision fields.
- `scripts/check-deps.ps1` excludes `contracts/codegen/manifest.json` from runtime dependency scanning because it records target ownership paths rather than importing runtime code.
- Verification:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-contracts.ps1` passed; codegen manifest covered 17 schemas and 5 target decisions; contract tests `91 passed`.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 6 steps passed, 0 failed, dirty worktree recorded.
  - `frontend/src/client/compute` had no generated content diff after validation.

# 2026-05-31 AutoWaterSimu Next contracts registry gate TODO

- [x] Re-read README First, contracts README/tests/examples, scripts README, Justfile, architecture current-state, and Certainty/Elegance plan context
- [x] Add `contracts/registry.json` covering every current `*.v1.json` schema, consumer list, examples, compatibility notes, and breaking-change policy
- [x] Add `scripts/check-contracts.ps1` for registry consistency, schema tests, Compute TS client generation, whitespace normalization, and drift gate
- [x] Route `just check-contracts` and `pr-fast` through the registry-backed gate
- [x] Update contracts/scripts/architecture/root README context and Certainty/Elegance checklist
- [x] Run contract, dependency, and PR fast validation

## Plan

- Keep this as a registry and drift gate slice, not a new generated-type pipeline.
- Make every schema and every valid/invalid example explicitly listed in `contracts/registry.json`.
- Keep the current drift proof scoped to registry consistency, Python contract tests, OpenAPI, and frontend Compute TS client output.
- Leave Go/Python/Rust generated type decisions to a later `contracts/codegen/` design.

## Review

- Added `contracts/registry.json` with 17 schemas, 36 valid examples, and 12 invalid examples.
- Added `scripts/check-contracts.ps1`; it verifies registry coverage, runs `contracts/tests`, regenerates the Compute TS client, normalizes generated whitespace, and checks OpenAPI/client drift.
- Updated `Justfile` so `check-contracts` calls the script; updated `pr-fast` so default PR evidence includes the registry-backed contract gate.
- `scripts/check-deps.ps1` now excludes `contracts/registry.json` from runtime dependency scans because it records consumers and drift paths rather than importing runtime code.
- Verification:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-contracts.ps1` passed; `91 passed`; registry covered 17 schemas, 36 valid examples, and 12 invalid examples.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed`, 6 steps passed, 0 failed, dirty worktree recorded.

# 2026-05-31 AutoWaterSimu Next PR fast evidence lane TODO

- [x] Re-read README First, root README, scripts README, GitHub workflow README, Certainty/Elegance plan, and architecture current-state context
- [x] Add `scripts/ci/pr-fast.ps1` and `scripts/ci/README.md`
- [x] Add `just pr-fast` and `.github/workflows/next-pr-fast.yml`
- [x] Record dirty worktree, workflow catalog, step results, and generated client drift in `tmp/ci-evidence/pr-fast.json`
- [x] Update root/architecture/workflow/script documentation and Certainty/Elegance next-step guidance
- [x] Run `scripts\ci\pr-fast.ps1` and inspect evidence

## Plan

- Keep the fast lane as a PR feedback/evidence gate, not a release artifact or production approval gate.
- Put validation logic in `scripts/ci/pr-fast.ps1`; keep GitHub Actions focused on dependency setup, script invocation, and evidence upload.
- Run all fast checks even if an earlier step fails so the evidence file can show the full failure surface.
- Treat local dirty worktree evidence as useful local equivalence only; clean HEAD proof still requires running after the current changes are committed.

## Review

- Added a PR fast lane script that records commit SHA, branch, dirty worktree state, workflow files, GitHub Actions metadata when present, and every step result under `tmp/ci-evidence/pr-fast.json`.
- Added `.github/workflows/next-pr-fast.yml` as the default PR fast lane and kept validation logic in `scripts/ci/pr-fast.ps1`.
- Added `just pr-fast` and documented the entry in root, scripts, CI, and architecture context.
- Initial `scripts\ci\pr-fast.ps1` passed locally with 9 passed steps and 0 failed steps before the later registry-backed contract gate consolidation.
- Evidence was generated from a dirty worktree, so it is local equivalence evidence rather than clean HEAD proof.
- PyYAML parsing verified `.github/workflows/next-pr-fast.yml` core run/upload steps; `scripts\doctor.ps1` and `git diff --check` passed with only LF/CRLF warnings.

# 2026-05-31 AutoWaterSimu Next dev compose TODO

- [x] Re-read README First, Certainty/Elegance PRD/Plan, root README, Compute API command README, worker CLI, and architecture local-dev context
- [x] Add Next Compute API / worker / MinIO / frontend defaults to root `.env.example`
- [x] Add source-mounted `docker-compose.dev.yml` for PostgreSQL, MinIO, Go Compute API, Python worker loop, and Vite frontend
- [x] Update root `Justfile` `dev` entry to use the Next dev compose stack
- [x] Update `docs/architecture/local-dev.md`, current-state, root README, and Certainty/Elegance checklist
- [x] Run compose config and focused validation

## Plan

- Keep this as a local development candidate stack, not production deployment evidence.
- Use official Docker images and source mounts instead of introducing new Dockerfiles in this slice.
- Configure PostgreSQL persistence, MinIO archive bucket initialization, Compute API S3 archive env, worker API loop, and Vite frontend against the local Compute API.
- Do not claim integration smoke completion until the stack is actually started and a job lifecycle is exercised.

## Review

- Added Next Compute API, MinIO archive, frontend, and worker dev defaults to root `.env.example`.
- Added `docker-compose.dev.yml` with source-mounted services for `compute-postgres`, `minio`, `minio-init`, `compute-api`, `simulation-worker`, and `frontend`.
- Updated `Justfile` so `just dev` uses the Next dev stack, with `dev-detached` and `dev-down` helpers.
- Updated `docs/architecture/local-dev.md`, `docs/architecture/current-state.md`, root README, and the Certainty/Elegance checklist.
- Verification:
  - `docker compose -f docker-compose.dev.yml config --quiet` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\doctor.ps1` passed for required tools; `just` remains optional-missing on this machine.
  - `git diff --check -- .env.example docker-compose.dev.yml Justfile README.md docs\architecture docs\rebuild\AutoWaterSimu_Next_Certainty_Elegance_Development_Plan_v1.0.md tasks\todo.md .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
  - Full stack startup and job lifecycle smoke were not run in this slice because first-run image pulls and Python scientific dependency installation can be slow; this remains the next evidence item.

# 2026-05-31 AutoWaterSimu Next Phase 0 task graph and dependency boundary TODO

- [x] Re-read README First, root README, docs/rebuild quality PRD/Plan, docs/scripts/frontend/tasks/.ai README context
- [x] Add root `Justfile` task graph entry for doctor, bootstrap, dev helpers, checks, generation, and release gate
- [x] Add repository `doctor` and `check-deps` PowerShell scripts
- [x] Move frontend route generated Compute client usage behind `computeJobsService`
- [x] Add `docs/architecture` module map, dependency graph, local-dev, and current-state entry docs
- [x] Update related README/context records and the Certainty/Elegance checklist
- [x] Run dependency, frontend type, doctor, Biome, and diff validation

## Plan

- Treat the broad "完善和优化" request as the first low-risk Phase 0 slice from the Certainty/Elegance plan.
- Implement a root task graph and minimal dependency boundary check before attempting higher-risk Go API package splitting, Store interface refactors, production auth, or full Docker dev stack work.
- Make the first `check-deps` rule set pass on current code by removing route/component direct imports of `frontend/src/client/compute`.
- Document current state and remaining gaps in `docs/architecture` instead of encoding unverified future work as completed.

## Review

- Added root `Justfile` recipes for `doctor`, `bootstrap`, `dev`, `dev-api`, `dev-worker-loop`, `dev-frontend`, `check`, `check-full`, `check-deps`, `check-contracts`, `gen`, `lint`, and `release-gate`.
- Added `scripts/doctor.ps1` and PowerShell-native `scripts/check-deps.ps1`.
- Added `docs/architecture/README.md`, `module-map.md`, `dependency-graph.md`, `local-dev.md`, and `current-state.md`.
- Removed route-level direct imports from `@/client/compute` by re-exporting UI-facing Compute types and API base URL through `computeJobsService`.
- Updated root/docs/scripts/frontend README context and marked the landed Phase 0 checklist items in the Certainty/Elegance Development Plan.
- Verification:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\doctor.ps1` passed for required tools; `just` is optional-missing on this machine.
  - `cd frontend; npx biome check src\services\computeJobsService.ts src\routes\_layout\compute-jobs.tsx src\routes\_layout\compute-lifecycle.tsx src\routes\_layout\model-governance.tsx` passed.
  - `cd frontend; npx tsc --noEmit` passed.
  - `git diff --check -- ...` passed with LF/CRLF warnings only.

# 2026-05-31 AutoWaterSimu Next certainty and elegance documentation TODO

- [x] Re-read README First, root README, docs/rebuild README, tasks README, .ai README, and .ai/changes README
- [x] Create certainty/elegance PRD as a supplemental quality-target document
- [x] Create certainty/elegance development plan as a staged implementation and acceptance document
- [x] Update docs/rebuild README to register the supplemental documents
- [x] Update `.ai/changes/2026-05-31.md` with scope, assumptions, uncertainty, and verification
- [x] Run documentation drift/format checks

## Plan

- Treat the pasted text as a quality-improvement input, not as an instruction to implement runtime refactors.
- Add supplemental PRD/Plan files instead of modifying the existing Next PRD/Technical Spec/Development Plan authority set.
- Keep the scope limited to AutoWaterSimu Next certainty and elegance improvements: monorepo entry, dependency boundaries, contracts, modular Go API, Store split, frontend feature architecture, Desktop package schema, Water Ontology, production security, CI/release evidence, and scenario-level acceptance.
- Do not include Hteinfo/IMS expansion beyond the pasted text, do not change runtime code, and do not overwrite the existing untracked `docs/rebuild/AutoWaterSimu_95分优雅度完整计划.md`.

## Review

- Added `docs/rebuild/AutoWaterSimu_Next_Certainty_Elegance_PRD_v1.0.md` as a supplemental quality-target PRD.
- Added `docs/rebuild/AutoWaterSimu_Next_Certainty_Elegance_Development_Plan_v1.0.md` as the staged quality-improvement plan.
- Updated `docs/rebuild/README.md` to register both documents and clarify that they do not alter the current Next PRD/Spec/Plan P0/P1/P2 commitments.
- Updated `.ai/changes/2026-05-31.md` with the documentation-only scope, assumptions, remaining uncertainty, and validation.
- Left the existing untracked `docs/rebuild/AutoWaterSimu_95分优雅度完整计划.md` untouched.
- Verification:
  - `git diff --check -- docs/rebuild tasks/todo.md .ai/changes/2026-05-31.md` passed with LF/CRLF warnings only.
  - `rg -n "P0|P1|P2|95|ontology|release evidence|single source of truth" docs\rebuild` returned expected matches in the new supplemental docs and existing rebuild context.

# 2026-05-31 AutoWaterSimu Next legacy compute read-only guard TODO

- [x] Re-read README First, backend app/api/routes/core/test README, Development Plan checklist, completion audit, and legacy migration guide
- [x] Add opt-in `LEGACY_COMPUTE_READ_ONLY` backend setting
- [x] Add centralized `ensure_legacy_compute_writable` guard for legacy compute write paths
- [x] Wire the guard to material balance / ASM1Slim / ASM1 / ASM3 / UDM `/calculate`, `/calculate-from-flowchart`, and `DELETE /jobs/{job_id}`
- [x] Keep validate/status/result/input-data read paths available for read-only comparison mode
- [x] Update `.env.example`, backend route/core README, legacy migration guide, Development Plan, completion audit, and change record
- [x] Run targeted backend validation

## Plan

- Default `LEGACY_COMPUTE_READ_ONLY=false` so legacy FastAPI remains usable as the current migration baseline.
- When explicitly enabled by deployment, reject mutating legacy compute routes with `LEGACY_COMPUTE_READ_ONLY` and direct callers to the Next simulation-check API.
- Do not claim the actual 30-day read-only comparison period or live deployment smoke is complete.

## Review

- Added `backend/app/api/routes/legacy_compute.py` and `Settings.LEGACY_COMPUTE_READ_ONLY`.
- The legacy compute write surface is now guarded consistently across Material Balance, ASM1Slim, ASM1, ASM3, and UDM route modules.
- `legacy_compute_read_only_test.py` verifies default writable mode, read-only rejection payload, and route dependency coverage for all guarded endpoints.
- Verification:
  - `cd backend; .venv\Scripts\python -m pytest app\tests\api\routes\legacy_compute_read_only_test.py -q` passed, `7 passed`, existing `python_multipart` warning only.
  - `cd backend; .venv\Scripts\python -m pytest app\tests\api\routes\legacy_compute_read_only_test.py app\tests\api\routes\test_asm_udm_validate_response.py app\tests\api\routes\test_flowchart_routes_no_print.py -q` passed, `29 passed`, existing `python_multipart` warning only.
  - `cd backend; .venv\Scripts\python -m pytest app\tests\time_segment_validation_test.py app\tests\material_balance_segment_overrides_test.py app\tests\hybrid_udm_validation_test.py app\tests\udm_engine_variable_binding_test.py -q` passed, `17 passed`, existing `python_multipart` warning only.

# 2026-05-31 AutoWaterSimu Next NewSystem production readiness E2E TODO

- [x] Re-read README First, PRD/Spec/Development Plan, completion audit, Compute API README, and NewSystem E2E test context
- [x] Extend `TestNewSystemEvidenceReferenceE2E` to read production readiness in the same NewSystem-style job-scoped workflow
- [x] Assert `ready_for_external_approval`, external approval required, auto-publish forbidden, evidence package link, risk summary, and source metadata
- [x] Run focused Go validation
- [x] Update completion audit and change record

## Plan

- Keep this as service-level regression coverage only.
- Reuse the existing NewSystem-style simulation check E2E after worker completion and evidence ref dereference.
- Do not add endpoints, mutate production state, create approval records, or claim external NewSystem acceptance is complete.

## Review

- `TestNewSystemEvidenceReferenceE2E` now covers `/api/v1/compute/jobs/{job_id}/production-readiness` after process graph registration, simulation check creation, worker completion, result risk summary, and evidence ref dereference.
- The assertion verifies the report is `ready_for_external_approval`, still requires external approval, keeps `auto_publish_allowed=false`, carries the generated evidence package id, preserves NewSystem/project metadata, and summarizes the info-level risk finding.
- Verification:
  - `cd apps\api; go test ./internal/compute -run TestNewSystemEvidenceReferenceE2E -count=1` passed.

# 2026-05-31 AutoWaterSimu Next production readiness UI TODO

- [x] Re-read README First, frontend route/test/service README, Compute Jobs route, current-flow Playwright smoke, and service wrapper context
- [x] Add production readiness read query to Compute Jobs detail
- [x] Display readiness status, external approval requirement, auto-publish boundary, blockers/warnings, risk severity counts, and policy checks
- [x] Extend mock-backed Compute Jobs current-flow smoke for production readiness endpoint and visible readiness status
- [x] Run frontend typecheck and focused Playwright validation
- [x] Update README/context records
- [x] Commit checkpoint

## Plan

- Reuse `computeJobsService.getProductionReadiness()` in the existing Compute Jobs detail page.
- Keep route logic display-only: no local production approval, no local evidence synthesis, no publish mutation.
- Extend the existing mock-backed current-flow smoke instead of adding a detached test route.

## Review

- Added a `Production readiness` detail panel to `/compute-jobs`.
- The panel renders backend readiness status, approval/publish flags, evidence package id, blocking reasons, warnings, risk severity counts, and readiness checks.
- `frontend/tests/compute-jobs-current-flow.spec.ts` now mocks `/production-readiness` and asserts `ready_for_external_approval` is visible after current-flow submission.
- Verification:
  - `cd frontend; npx tsc --noEmit` passed.
  - `cd frontend; npx playwright test tests/compute-jobs-current-flow.spec.ts --project=chromium --no-deps --reporter=line` passed, `1 passed`.
  - In-app Browser opened `http://localhost:5173/compute-jobs`; without a live legacy auth backend/session it displayed the login screen, so the authenticated readiness panel was verified by the mock-backed Playwright smoke.

# 2026-05-31 AutoWaterSimu Next production readiness TODO

- [x] Re-read README First, PRD/Spec/Development Plan, completion audit, contracts, Compute API, OpenAPI, and frontend service context
- [x] Add `production_readiness.v1` schema plus valid/invalid fixtures
- [x] Add read-only Compute API production readiness endpoint behind `evidence:read`
- [x] Evaluate readiness from job status, evidence package availability, governance production allowance, and stored risk findings
- [x] Preserve external approval boundary with `external_approval_required=true` and `auto_publish_allowed=false`
- [x] Sync OpenAPI and generated Compute client
- [x] Add frontend service wrapper
- [x] Update README/context records
- [x] Run full Go/OpenAPI/frontend validation
- [x] Commit checkpoint

## Plan

- Add `GET /api/v1/compute/jobs/{job_id}/production-readiness` as read-only evidence integration.
- Return schema-valid `production_readiness.v1` with checks for job succeeded, evidence package available, governance production allowed, and no high/critical risk findings.
- Treat medium risk findings as warnings and high/critical findings as blockers.
- Do not create production approvals, mutate jobs/catalogs/results, or publish production commands.

## Review

- Added `production_readiness.v1` with ready and auto-publish-forbidden fixtures.
- Added `GET /api/v1/compute/jobs/{job_id}/production-readiness` behind `evidence:read`.
- The report is read-only and derives readiness from job status, evidence package availability, `governance.production_allowed`, and stored `risk_findings`.
- High/critical risk findings block readiness; medium findings produce warnings; all reports keep `external_approval_required=true` and `auto_publish_allowed=false`.
- Synced OpenAPI, generated Compute client, and `computeJobsService.getProductionReadiness()`.
- Verification:
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed, `91 passed`.
  - `cd apps\api; go test ./internal/compute -run "Test(ValidatedCompletePersistsModelRun|ProductionReadinessBlocksHighRiskFindings)" -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `cd frontend; npm run generate-compute-client` passed.
  - `cd frontend; npx tsc --noEmit` passed.
  - `git diff --check -- contracts apps\api frontend\src\client\compute frontend\src\services docs\rebuild tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.

# 2026-05-31 AutoWaterSimu Next S3 archive backend TODO

- [x] Re-read README First, PRD/Spec/Development Plan, completion audit, Compute API, command entrypoint, artifact retention, and operations context
- [x] Add path-style S3-compatible archive store for `archive_candidate` artifacts
- [x] Keep archive copy/checksum/metadata/event/download fallback safety boundary
- [x] Wire explicit env config and ambiguous backend rejection in `cmd/compute-api`
- [x] Add focused Go coverage for S3 store signing/path behavior and archive config wiring
- [x] Update README/runbook/ADR/audit records
- [x] Run focused and full Go validation
- [x] Commit checkpoint

## Plan

- Add an `ArtifactArchiveStore` metadata interface so archive providers can record provider name and archive object key without hardcoding `local_fs_archive`.
- Implement a path-style S3-compatible archive store using SigV4 signing, required endpoint/bucket/access key env vars, default region `us-east-1`, and optional object key prefix.
- Keep `COMPUTE_API_ARCHIVE_DIR` behavior unchanged and make local archive and S3 archive mutually exclusive.
- Do not change OpenAPI or retention report shape; existing `archive_provider` / `archive_object_key` fields already cover the new backend.

## Review

- Added `S3ArtifactStore` with PUT/GET/DELETE, SigV4 request signing, object key/prefix validation, provider metadata, and focused httptest coverage.
- `archiveArtifact` now records provider/object key through `ArtifactArchiveStore`, so S3 archives store `s3_archive` and prefixed archive object keys while local archives keep `local_fs_archive`.
- `cmd/compute-api` now accepts `COMPUTE_API_ARCHIVE_S3_*` env vars and rejects ambiguous local+S3 archive configuration.
- Updated API/internal/cmd README, operations runbooks, archive ADR, Development Plan, completion audit, and `.ai/changes`.
- Remaining operations work: live monitoring deployment evidence and deployment-specific object-store backup/versioning proof are still external/deployment tasks.

# 2026-05-31 AutoWaterSimu Next benchmark-backed parameter promotion TODO

- [x] Re-read README First, PRD/Spec/Development Plan, completion audit, Compute API, OpenAPI, and frontend service context
- [x] Add benchmark-backed default parameter set promote-approved endpoint
- [x] Gate promotion on the existing promotion plan and preserve production approval boundary
- [x] Sync OpenAPI and generated Compute client
- [x] Add frontend service wrapper
- [x] Update README/context records
- [x] Run Go/OpenAPI/frontend validation
- [x] Commit checkpoint

## Plan

- Add `POST /api/v1/model-catalog/{model_key}/versions/{model_version}/default-parameter-set/promote-approved` behind `model:write`.
- Reuse the existing promotion plan as the gate: require active model version, current `validated` default parameter set, and passed latest benchmark_run/model_run evidence for every validated benchmark case.
- Store a new catalog snapshot by changing only the current default parameter set status to `approved` and adding transition metadata.
- Preserve separation of concerns: the endpoint does not execute Python, does not record `benchmark_run.v1`, does not manage multiple parameter sets, and does not complete production approval.

## Review

- Added `ParameterSetPromotionRequest`, HTTP route, service method, OpenAPI path/schema, generated Compute client method, and `computeJobsService.promoteDefaultParameterSetToApproved()`.
- Extended focused Go coverage for missing benchmark blockers, worker-token denial, successful evidence-backed promotion, transition metadata, and persisted `approved` status.
- Updated API/OpenAPI/frontend service README, Development Plan, completion audit, and `.ai/changes`.
- Remaining governance work: multi-parameter-set management, automated/scheduled benchmark execution, automatic result-to-benchmark_run-to-promotion orchestration, and production approval workflow semantics remain separate Phase 6 work.

# 2026-05-31 AutoWaterSimu Next benchmark case schedule-run TODO

- [x] Re-read README First, PRD/Spec/Development Plan, completion audit, Compute API, OpenAPI, and frontend service context
- [x] Add model catalog benchmark case schedule-run endpoint
- [x] Keep schedule-run as compute job queueing only, without benchmark_run recording or catalog mutation
- [x] Sync OpenAPI and generated Compute client
- [x] Add frontend service wrapper
- [x] Update README/context records
- [x] Run Go/OpenAPI/frontend validation
- [x] Commit checkpoint

## Plan

- Add `POST /api/v1/model-catalog/{model_key}/versions/{model_version}/benchmark-cases/{benchmark_case_id}/schedule-run` behind `job:create`.
- Resolve the catalog benchmark case input through the existing simulation input lookup path and queue a standard `compute_job.v1` for the case job type.
- Require an active model version, validated benchmark case, and non-retired current default parameter set.
- Preserve separation of concerns: the endpoint does not execute Python, does not auto-record `benchmark_run.v1`, does not mutate model catalog snapshots, and does not approve or promote parameter sets.

## Review

- Added `POST /api/v1/model-catalog/{model_key}/versions/{model_version}/benchmark-cases/{benchmark_case_id}/schedule-run` behind `job:create`.
- The endpoint resolves an existing benchmark case input through the simulation input registry and queues a standard `compute_job.v1` with model/catalog/parameter metadata and worker capabilities.
- It requires active model version, validated benchmark case, and current default parameter set that is not `retired`; ASM/UDM built-ins without default parameter sets remain unschedulable in this path.
- It does not execute Python, auto-record `benchmark_run.v1`, mutate catalog snapshots, or approve/promote parameter sets.
- OpenAPI, generated Compute client, and `computeJobsService.scheduleBenchmarkCaseRun()` now expose the API.
- Verification:
  - `cd apps\api; go test ./internal/compute -run TestBenchmarkCaseScheduleRunEndpoint -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `cd frontend; npm run generate-compute-client` passed.
  - OpenAPI/generated client assertion passed.
  - `cd frontend; npx tsc --noEmit` passed.
  - `git diff --check -- apps\api frontend\src\client\compute frontend\src\services docs\rebuild tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.

# 2026-05-31 AutoWaterSimu Next parameter promotion plan TODO

- [x] Re-read README First, contracts, Compute API, OpenAPI, frontend service, route, and model governance audit context
- [x] Add read-only default parameter set promotion plan endpoint
- [x] Check promotion readiness against latest benchmark_run and model_run evidence
- [x] Sync OpenAPI and generated Compute client
- [x] Surface promotion readiness on the read-only model governance page
- [x] Update README/context records
- [x] Run focused Go, frontend type, Playwright, and diff validation
- [x] Commit checkpoint

## Plan

- Add `GET /api/v1/model-catalog/{model_key}/versions/{model_version}/default-parameter-set/promotion-plan` behind `job:read`.
- Keep the endpoint advisory-only: no benchmark execution, no catalog mutation, no production approval completion.
- Require a `validated` current default parameter set, active model version, at least one validated benchmark case, and a latest passed benchmark run per case whose model_run parameter hash matches the current default parameter set.
- Reuse existing benchmark_run/model_run records; do not introduce multi-parameter-set storage or a new approval workflow in this slice.

## Review

- Added `parameter_set_promotion_plan.v1` response DTO in the Go API and OpenAPI surface.
- Added optional `parameter_set_id` benchmark run list filtering used by the promotion plan.
- Added focused Go endpoint coverage for missing benchmark blockers, benchmark-backed readiness, advisory no-mutation semantics, and worker-token denial.
- Generated the Compute TypeScript client and added a `computeJobsService.getDefaultParameterSetPromotionPlan()` wrapper.
- Updated `/model-governance` to show read-only promotion readiness for catalog versions with a default parameter set.
- Remaining governance work: multi-parameter-set management, scheduled benchmark execution, explicit approval workflow semantics, and automated benchmark execution remain separate Phase 6 work.

# 2026-05-31 AutoWaterSimu Next Worker API Loop TODO

- [x] Re-read README First, worker, worker tests, Go API heartbeat, and active audit context
- [x] Add bounded `--run-api-loop` worker HTTP mode
- [x] Add per-claimed-job heartbeat preflight before execution
- [x] Extend worker HTTP bridge tests
- [x] Update worker README/context and completion audit
- [x] Run worker tests and focused CLI validation
- [x] Commit checkpoint

## Plan

- Keep `--run-api-once` behavior compatible, but route it through shared register/claim/heartbeat/run/upload/complete helpers.
- Add `--run-api-loop` for dev/CI and simple long-running worker use: one registration, repeated claim attempts, configurable `--max-jobs`, `--max-idle-polls`, and `--idle-sleep-seconds`.
- After a job is claimed, call worker heartbeat with `job_id` before executing; if heartbeat reports terminal/cancelled, skip execution and return a conservative status.
- Do not implement asynchronous solver interruption or production scheduler semantics in this slice.

## Review

- Added `run_api_loop()` in the worker HTTP client and `--run-api-loop` CLI mode.
- `--run-api-once` and loop mode now share register/claim/heartbeat/run/upload/complete helpers; each claimed job heartbeats before execution.
- Loop mode registers once, repeats claim attempts, supports `--max-jobs`, `--max-idle-polls`, and `--idle-sleep-seconds`, and returns a compact JSON summary instead of full compute results for every job.
- Extended fake Compute API tests to assert one-shot heartbeat order and a two-job bounded loop.
- Remaining production work: asynchronous solver cancellation, deployment supervisor policy, and real deployed worker process monitoring.
- Verification:
  - `backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --self-check` passed.
  - `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed, `22 passed`.

# 2026-05-31 AutoWaterSimu Next Simulation Request ASM/UDM Entry TODO

- [x] Re-read README First, contracts, Go API, OpenAPI, and generated client context
- [x] Expand `simulation_request.v1` job types for tested independent ASM/UDM inputs
- [x] Add valid reference-only simulation request fixtures
- [x] Update Go simulation-check capability routing and endpoint coverage
- [x] Sync OpenAPI and generated Compute client
- [x] Update README/context records
- [x] Run contract, Go API, frontend type, and diff validation
- [x] Commit checkpoint

## Plan

- Allow `simulation_request.v1` to accept `simulation.asm1slim.v1`, `simulation.asm1.v1`, `simulation.asm3.v1`, and `simulation.udm.v1` in addition to `simulation.material_balance.v1`.
- Cover only embedded or registered `simulation_input.v1` and model-run replay paths for ASM/UDM, because those job types already have contract, worker, and built-in catalog evidence.
- Keep `input_ref.process_graph_id` conversion material-balance-only until ProcessGraph-to-ASM/UDM transform semantics are explicitly designed.
- Preserve worker execution outside the Go API; Go API only queues derived `compute_job.v1` with the right required capabilities.

## Review

- `simulation_request.v1` now accepts material_balance plus independent ASM1Slim/ASM1/ASM3/UDM job types.
- Added reference-only simulation request fixtures for the four independent ASM/UDM job types.
- Go simulation-check creation now maps those job types to model-specific worker capabilities while keeping `process_graph_id` conversion material-balance-only.
- OpenAPI and generated Compute TypeScript client now expose the expanded `SimulationRequest.job_type` union.
- Updated contracts/API README context, Development Plan checklist, and completion audit.
- Verification:
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed, `87 passed`.
  - `cd apps\api; go test ./internal/compute -run TestSimulationCheckEndpointCreatesComputeJob -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `cd frontend; npx tsc --noEmit` passed.
  - OpenAPI/schema enum assertion passed and `git diff --check -- contracts apps\api frontend\src\client\compute docs\rebuild tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with only LF/CRLF warnings.

# 2026-05-31 AutoWaterSimu Next Built-in Model Catalog Coverage TODO

- [x] Re-read Compute API model catalog, contracts, worker fixture, and worker README context
- [x] Expand built-in catalog beyond material_balance for tested worker model job types
- [x] Keep ASM/UDM entries read-only without default parameter sets
- [x] Update model catalog endpoint tests
- [x] Update README/context records
- [x] Run focused Go validation and diff check
- [x] Commit checkpoint

## Plan

- Add ASM1Slim, ASM1, ASM3, and UDM to the built-in fallback catalog because their independent worker job types already have contract fixtures and worker smoke evidence.
- For these entries, include active model versions, runtime parameter templates, and validated worker-smoke benchmark cases.
- Do not invent default parameter sets, parameter promotion, production approval, or benchmark scheduling for ASM/UDM in this slice.
- Preserve persisted catalog precedence: a registered `default` catalog still overrides the built-in fallback.

## Review

- Added built-in ASM1Slim/ASM1/ASM3/UDM catalog entries backed by existing `contracts/examples/valid/*_independent.simulation_input.v1.json` fixtures and worker model_run evidence refs.
- Kept only `material_balance` with an approved default parameter set; ASM/UDM entries carry benchmark cases but no default parameter set.
- Extended `TestModelCatalogEndpoint` to expect five fallback models and to read the built-in `asm1` model by key before persisted catalog registration.
- Fixed memory-store catalog snapshot listing to keep later inserts first when snapshots share the same `created_at`, matching PostgreSQL's `snapshot_id DESC` tie-breaker intent.
- Remaining governance work still includes multi-parameter-set lifecycle design, scheduled benchmark execution, benchmark-backed promotion, and approval workflow semantics.
- Verification:
  - Initial `cd apps\api; go test ./internal/compute -count=1` exposed the same-timestamp memory snapshot ordering bug.
  - `cd apps\api; go test ./internal/compute -count=1` passed after fixing the memory tie-breaker.

# 2026-05-31 AutoWaterSimu Next Web Model Governance UI TODO

- [x] Re-read frontend route/sidebar/i18n/service/test README context
- [x] Add a dedicated read-only model governance route
- [x] Wire sidebar navigation and route tree
- [x] Add mock-backed Playwright smoke for catalog and snapshot pagination
- [x] Update route/test README and completion records
- [x] Run frontend typecheck, route generation/build, and focused Playwright validation
- [x] Commit checkpoint

## Plan

- Add `/model-governance` under the authenticated layout as a read-only page.
- Show current model catalog versions, default parameter set status/hash, benchmark case counts, and persisted snapshot history from the generated Compute client service wrapper.
- Keep route behavior display-only: no parameter set state transition, benchmark scheduling, benchmark-backed promotion, or approval workflow.
- Keep built-in fallback catalogs separate from persisted snapshot history.

## Review

- Added `frontend/src/routes/_layout/model-governance.tsx`.
- Added a sidebar item, `nav.modelGovernance` translations, and regenerated `frontend/src/routeTree.gen.ts` through the TanStack Router Vite plugin.
- Added `frontend/tests/model-governance.spec.ts` to mock `/api/v1/model-catalog` and `/api/v1/model-catalog/snapshots`, including next-page snapshot pagination.
- Updated `frontend/src/routes/README.md` and `frontend/tests/README.md`.
- Remaining governance work still includes multi-parameter-set lifecycle design, scheduled benchmark execution, benchmark-backed promotion, and approval workflow semantics.
- Verification:
  - `cd frontend; npx vite build --mode development` passed and regenerated routes; output kept existing `gray-matter` eval / toaster chunking / bundle-size warnings.
  - `cd frontend; npx tsc --noEmit` passed after tightening snapshot status type narrowing.
  - `cd frontend; npx playwright test tests/model-governance.spec.ts --project=chromium --no-deps --reporter=line` passed.

# 2026-05-31 AutoWaterSimu Next model catalog snapshot listing TODO

- [x] Re-read Compute API model governance, OpenAPI, generated client, and frontend service context
- [x] Add persisted model catalog snapshot listing in memory/PostgreSQL stores
- [x] Add HTTP endpoint, OpenAPI source, generated Compute client, and frontend service wrapper
- [x] Add snapshot pagination coverage to model catalog endpoint test
- [x] Update README/context records
- [x] Run Go/OpenAPI/client/typecheck validation
- [x] Commit checkpoint

## Plan

- Keep `GET /api/v1/model-catalog` unchanged: latest persisted `default` catalog or built-in fallback.
- Add `GET /api/v1/model-catalog/snapshots` as a read-only persisted-history list; do not include built-in fallback as a stored snapshot.
- Reuse existing cursor/limit style and `job:read` scope.
- Do not add multi-parameter-set management, scheduled benchmarks, or governance approval enforcement in this slice.

## Review

- Added `GET /api/v1/model-catalog/snapshots` as a read-only persisted snapshot history endpoint using `job:read`.
- Added memory/PostgreSQL store pagination, service and HTTP wiring, OpenAPI source, generated Compute client output, and `computeJobsService` wrapper.
- Kept `GET /api/v1/model-catalog` semantics unchanged: latest persisted `default` catalog or built-in fallback; fallback is not reported as persisted history.
- Remaining governance work still includes multi-parameter-set lifecycle design, benchmark-backed promotion, scheduled benchmark execution, and UI/approval workflow.
- Verification:
  - `cd apps\api; go test ./internal/compute -run TestModelCatalogEndpoint -count=1` passed after resetting the pagination response struct before the second JSON unmarshal.
  - `cd apps\api; go test ./internal/compute -count=1` passed.
  - `cd frontend; npm run generate-compute-client` passed and regenerated only `frontend/src/client/compute/sdk.gen.ts` and `frontend/src/client/compute/types.gen.ts`.
  - OpenAPI assertion confirmed `/api/v1/model-catalog/snapshots` path, `listModelCatalogSnapshots` operation, and `ListModelCatalogSnapshotsResponse` schema.
  - `cd frontend; npx tsc --noEmit` passed.
  - `git diff --check -- apps\api frontend docs\rebuild tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.

# 2026-05-31 AutoWaterSimu Next monitoring receiver policy TODO

- [x] Re-read monitoring README/runbook context
- [x] Add receiver/on-call/secret policy runbook without real receivers
- [x] Link policy from monitoring and operations docs
- [x] Update Development Plan and completion audit
- [x] Validate docs and secret-safety scan
- [x] Commit checkpoint

## Plan

- Keep all real receiver URLs, tokens, personal contacts, and private channel names out of the repository.
- Document deployment-owned severity routing, receiver approval, secret handling, and synthetic test-alert expectations.
- Keep live monitoring deployment evidence separate because it requires a real environment.

## Review

- Added `docs/operations/monitoring/receiver_policy_runbook.md`.
- Linked the policy from monitoring README, monitoring deployment runbook, operations README, Development Plan, and completion audit.
- Remaining live deployment evidence still requires real Prometheus/Alertmanager/Grafana environment proof.
- Verification:
  - `git diff --check -- docs\operations docs\rebuild tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
  - `backend\.venv\Scripts\python` parsed monitoring YAML/JSON and scanned receiver policy for common real receiver secret markers / URLs.
  - `rg -n "https?://|Bearer |xoxb-|webhook|token|secret|phone|email|@" ...` found only placeholder/policy language, not real receiver values.

# 2026-05-31 AutoWaterSimu Next archive directory guard TODO

- [x] Re-read Compute API entrypoint, archive wiring, and operations context
- [x] Add non-overlap validation for hot artifact and local archive directories
- [x] Add command entrypoint tests
- [x] Update command README and lifecycle runbook
- [x] Run focused command tests and diff check
- [x] Commit checkpoint

## Plan

- Keep archive safety in the command wiring layer because this only validates environment paths before creating stores.
- Reject `COMPUTE_API_ARCHIVE_DIR` when it is the same as, contains, or is contained by `COMPUTE_API_ARTIFACT_DIR`.
- Do not change retention sweep, archive copy, checksum verification, archive metadata, or download fallback behavior.

## Review

- Added `openArchiveStore` wiring and non-overlap validation in `apps/api/cmd/compute-api/main.go`.
- Added tests for same directory, archive-inside-hot, hot-inside-archive, and valid sibling archive directory.
- Updated command README and lifecycle runbook to state `COMPUTE_API_ARCHIVE_DIR` must be separate and non-overlapping.
- Verification:
  - `cd apps\api; go test ./cmd/compute-api -run "TestOpenArchiveStore|TestOpenStoreUsesMemoryStoreWhenDatabaseURLMissing" -count=1` passed.
  - `git diff --check -- apps\api docs\operations tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.

# 2026-05-31 AutoWaterSimu Next archive metrics TODO

- [x] Re-read Compute API, internal compute, and monitoring README context
- [x] Add archived artifact count to Compute API metrics snapshot
- [x] Render `autowatersimu_compute_artifact_archives_total`
- [x] Add service/HTTP test coverage
- [x] Update monitoring docs/dashboard and completion records
- [x] Run focused Go and monitoring validation
- [x] Commit checkpoint

## Plan

- Keep metrics read-only and store-backed; do not trigger retention/archive mutation from `/metrics`.
- Count only archive records with `status=archived`.
- Update monitoring examples to consume the new metric without inventing provider-specific latency/error metrics.
- Leave production object-store archive backend and live monitoring receiver deployment as separate external/deployment work.

## Review

- Added `ArtifactArchives` to the Compute API metrics snapshot.
- Memory and PostgreSQL stores count `status=archived` archive metadata records.
- `/metrics` now renders `autowatersimu_compute_artifact_archives_total`.
- Focused service/HTTP tests cover the archived artifact count after archive sweep and the public metric text.
- Updated Compute API README files plus lifecycle/monitoring runbooks and Grafana dashboard example.
- Verification:
  - `cd apps\api; go test ./internal/compute -run "TestArtifactRetentionSweepArchivesCandidateWithConfiguredBackend|TestHTTPAuthScopeAndMetrics" -count=1` passed.
  - `cd apps\api; go test ./internal/compute -count=1` passed.
  - `backend\.venv\Scripts\python` parsed monitoring YAML/JSON and asserted the Grafana dashboard references `autowatersimu_compute_artifact_archives_total`.
  - `git diff --check -- apps\api docs\operations docs\rebuild tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
  - PostgreSQL live query execution remains covered only when `COMPUTE_API_DATABASE_URL` points at a test database; it was not run in this slice.

# 2026-05-31 AutoWaterSimu Next release artifact download verification TODO

- [x] Re-read `.github`, `.github/workflows`, `scripts/release`, and completion audit context
- [x] Add reusable release artifact download verification script
- [x] Wire workflow upload -> download -> verify -> evidence upload order
- [x] Update workflow/script README and completion records
- [x] Validate workflow syntax, script behavior, and release gate dry run
- [x] Commit checkpoint

## Plan

- Keep artifact download verification inside `scripts/release` so workflow YAML only orchestrates Actions upload/download and script calls.
- Verify the downloaded unsigned artifact contains packaged sidecar evidence, NSIS installer evidence, a sidecar executable, and a setup executable.
- Write `tmp/release-evidence/downloaded-release-artifacts.json` so the evidence upload includes the artifact download check.
- Preserve post-P0 boundaries: no signing, auto-update, GitHub Release publication, signing keys, updater keys, or release tokens.

## Review

- Added `scripts/release/verify-release-artifact-download.ps1`.
- The verifier checks required build/smoke JSON files, `sidecar_executable` / `installer_path` manifest fields, downloaded sidecar executable, downloaded NSIS setup executable, and writes pass/fail evidence.
- Reordered `next-release-gates.yml` so manual artifact flow is upload -> download -> verify -> evidence upload.
- Updated `.github`, workflow, and release script READMEs plus Development Plan and completion audit records.
- Verification:
  - `backend\.venv\Scripts\python` + PyYAML parsed `.github/workflows/next-release-gates.yml` and asserted upload/download/verify/evidence step order and artifact names.
  - Valid and invalid fixture runs of `scripts/release/verify-release-artifact-download.ps1` produced `passed` and `failed` `downloaded-release-artifacts.json` evidence respectively.
  - `git diff --check -- .github scripts\release docs\rebuild tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
  - `.\scripts\release\next-release-gates.ps1 -Mode merge -SkipLong -EvidenceDir tmp\release-evidence\artifact-download-workflow-gate` passed with evidence status `passed` and `10` steps.
  - Remaining live evidence still requires a real GitHub `workflow_dispatch build_release_artifacts=true` run.

# 2026-05-31 AutoWaterSimu Next job event retention policy TODO

- [x] Re-read Compute API lifecycle/store and operations context
- [x] Add job event retention/archive policy runbook
- [x] Link runbook from operations README and Development Plan Phase 6.4
- [x] Update completion audit and README First records
- [x] Run docs and targeted Compute API event/evidence validation
- [x] Commit checkpoint

## Plan

- Document current `compute_job_events` behavior as durable audit metadata.
- Avoid claiming an automated pruning endpoint or worker exists.
- Make future event pruning dry-run-first and evidence/support-aware.

## Review

- Added `docs/operations/compute_api_job_event_retention_runbook.md`.
- Recorded current storage boundary, retention principles, future candidate lifecycle, and validation commands.
- Linked the policy from operations README and the Development Plan lifecycle/operations section.
- Verification:
  - `git diff --check -- docs\operations docs\rebuild tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
  - `rg -n "job event retention|compute_job_events|dry-run|automated event|evidence package|artifact.archived|artifact.retention_deleted" ...` confirmed the intended policy language is present.
  - `cd apps\api; go test ./internal/compute -run "TestEvidencePackage|TestArtifactRetention|TestWorkerLifecycle|TestNewSystemEvidenceEndToEnd" -count=1` passed.

# 2026-05-31 AutoWaterSimu Next tenancy observability runbook TODO

- [x] Re-read operations, Compute API, and Technical Spec context
- [x] Add Compute API tenancy/observability runbook
- [x] Link runbook from operations README and Development Plan Phase 6.4
- [x] Update completion audit and README First records
- [x] Run docs and targeted Compute API validation
- [x] Commit checkpoint

## Plan

- Document the current P0 metadata boundary without claiming full tenant isolation.
- Keep OpenTelemetry as a trigger-based adoption path, not an implemented dependency.
- Avoid changing Go API behavior in this documentation-only slice.

## Review

- Added `docs/operations/compute_api_tenancy_observability_runbook.md`.
- Documented `tenant_id` / `project_id` / `created_by` as metadata fields, not P0 security boundaries.
- Recorded OpenTelemetry triggers for cross-process triage, production SLO attribution, external integration validation, and object-store archive operations.
- Verification:
  - `git diff --check -- docs\operations docs\rebuild tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
  - `rg -n "OpenTelemetry|tenant_id|project_id|full RBAC|metadata boundary|trace_id" ...` confirmed the runbook and linked docs expose the intended boundary language.
  - `cd apps\api; go test ./internal/compute -run "TestHTTPAuthScopeAndMetrics|TestStaticTokenRevocation|TestNewSystemEvidenceEndToEnd" -count=1` passed.

# 2026-05-31 AutoWaterSimu Next deliverable docs closeout TODO

- [x] Re-read docs/rebuild and docs/operations README context
- [x] Add COSS source manifest for current local-owned COSS-compatible UI status
- [x] Add legacy migration guide with read-only exit criteria and client regeneration rules
- [x] Add support bundle runbook for Desktop bundles, backup relation, and Compute evidence package boundary
- [x] Update rebuild/operations README and Development Plan checklist
- [x] Run document checks and targeted support bundle tests
- [x] Commit checkpoint

## Plan

- Keep human approval and live deployment smoke unchecked because they require external governance/environment evidence.
- Do not claim legacy FastAPI compute is read-only; document the exit criteria instead.
- Treat current COSS-compatible UI as local-owned unless an upstream COSS source copy is explicitly recorded.

## Review

- Added `docs/rebuild/AutoWaterSimu_Next_COSS_Source_Manifest_2026-05-31.md`.
- Added `docs/rebuild/AutoWaterSimu_Next_Legacy_Migration_Guide_2026-05-31.md`.
- Added `docs/operations/support_bundle_runbook.md`.
- Updated Development Plan checklist to distinguish active-branch implementation evidence from external approval/deployment/read-only comparison gates.
- Verification:
  - `git diff --check -- docs\rebuild docs\operations tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
  - `rg -n "schema_version|P0|P1|P2" docs\rebuild --glob "AutoWaterSimu_Next_*.md"` completed and confirmed the new docs participate in the rebuild doc scan.
  - `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml support_bundle` passed (`1 passed`).
  - `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml project_package` passed (`1 passed`).

# 2026-05-31 AutoWaterSimu Next legacy FastAPI client refresh TODO

- [x] Re-read frontend generated client README context and legacy Phase 0 drift audit
- [x] Regenerate local `frontend/openapi.json` from current FastAPI app
- [x] Run `npm run generate-client` for the legacy FastAPI client only
- [x] Fix README/audit wording for ignored local OpenAPI input versus tracked generated client output
- [x] Run frontend typecheck and diff checks
- [x] Commit checkpoint

## Plan

- Keep `frontend/openapi.json` ignored as the local generator input.
- Commit only generated legacy client output under `frontend/src/client` plus README/audit records.
- Do not touch `frontend/src/client/compute`.

## Review

- Regenerated legacy client from the current FastAPI OpenAPI document.
- Corrected `frontend/README.md` and the legacy drift audit to state that `frontend/openapi.json` is ignored local input, while `frontend/src/client` is the tracked output.
- The tracked generated client now includes `UDMComponentDefinition.note` and current legacy endpoint comments from OpenAPI descriptions.
- Verification:
  - OpenAPI compare from `backend/` reported `current_paths=88`, `local_paths=88`, no missing/extra paths, and `matches=True`.
  - `cd frontend; npx tsc --noEmit` passed.
  - `git diff --check -- frontend\README.md frontend\src\client docs\rebuild tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
  - `git diff --name-only -- frontend\src\client\compute` returned no changes.

# 2026-05-31 AutoWaterSimu Next FastAPI lifespan cleanup TODO

- [x] Re-read backend app lifecycle README/context and current Phase 0 drift audit
- [x] Replace deprecated FastAPI `on_event` startup/shutdown hooks with a lifespan context manager
- [x] Verify import warning capture, targeted backend tests, and OpenAPI path drift
- [x] Update PRD status, legacy drift audit, completion audit, and README First records
- [x] Commit checkpoint

## Plan

- Preserve the existing SimpleWebSocket background task startup/shutdown behavior.
- Do not change routes, response models, OpenAPI-visible schemas, or generated legacy client files.
- Keep `python_multipart` third-party import warning and legacy OpenAPI metadata refresh as separate follow-up items.

## Review

- `backend/app/main.py` now wires `simple_websocket_manager.start_background_tasks()` / `stop_background_tasks()` through FastAPI `lifespan` instead of deprecated `@app.on_event` hooks.
- Verification:
  - Warning capture around `import app.main` reported `lifespan_warnings=0`.
  - `cd backend; .venv\Scripts\python -m pytest app\tests\pydantic_warning_test.py app\tests\api\routes\test_asm_udm_validate_response.py app\tests\api\routes\test_flowchart_routes_no_print.py app\tests\services -q` passed (`48 passed`, remaining warning is `python_multipart` import deprecation).
  - OpenAPI compare from `backend/` still showed 88 current/tracked paths with no missing/extra paths and metadata/description-only drift.
  - `git diff --check -- backend\app\main.py docs\rebuild tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - Legacy OpenAPI metadata refresh, third-party `python_multipart` warning, debug/test-only print noise, and broader mojibake readability cleanup remain separate work.

# 2026-05-31 AutoWaterSimu Next Pydantic validator migration TODO

- [x] Re-read backend model/test context and validator usage
- [x] Migrate legacy `@validator` methods in `backend/app/models.py` to Pydantic v2 `@field_validator`
- [x] Extend warning regression test to cover v1 validator warnings
- [x] Run targeted model/adapter/service tests and OpenAPI path compare
- [x] Update PRD status, legacy drift audit, completion audit, and README First records
- [x] Commit checkpoint

## Plan

- Preserve the existing validation rules and error messages.
- Use `ValidationInfo.data` where validators need previously parsed fields.
- Do not migrate FastAPI lifespan hooks in this slice.

## Review

- Replaced all remaining legacy `@validator` usages in `backend/app/models.py` with `@field_validator`.
- Kept `TimeSegment.end_hour` and `MaterialBalanceInput.edges` cross-field checks by reading `ValidationInfo.data`.
- Extended `backend/app/tests/pydantic_warning_test.py` to fail on either protected namespace or Pydantic v1 validator warnings from `app.models` import.
- Updated PRD current-state notes and the legacy drift audit to mark v1 validator warnings closed.
- Verification:
  - Warnings capture around `import app.models` reported `v1_validator_warnings=0` and `protected_namespace_warnings=0`.
  - `cd backend; .venv\Scripts\python -m pytest app\tests\pydantic_warning_test.py app\tests\time_segment_validation_test.py app\tests\material_balance_segment_overrides_test.py app\tests\hybrid_udm_validation_test.py app\tests\udm_engine_variable_binding_test.py app\tests\api\routes\test_asm_udm_validate_response.py app\tests\services -q` passed (`46 passed`, remaining warnings are FastAPI lifespan/python_multipart).
  - OpenAPI compare from `backend/` still showed 88 current/tracked paths with no missing/extra paths and metadata/description-only drift.
  - `git diff --check -- backend\app\models.py backend\app\tests docs\rebuild tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - FastAPI lifespan deprecation cleanup and legacy OpenAPI metadata refresh remain separate work.

# 2026-05-31 AutoWaterSimu Next Pydantic protected namespace cleanup TODO

- [x] Re-read backend app/models/test README context and legacy drift audit
- [x] Add explicit Pydantic config to legacy models with `model_` field names
- [x] Add regression guard for protected namespace warnings
- [x] Validate targeted backend tests and OpenAPI path drift
- [x] Update PRD status, legacy drift audit, completion audit, and README First records
- [x] Commit checkpoint

## Plan

- Preserve public field names and database columns.
- Use `ConfigDict(protected_namespaces=())` only on affected models.
- Verify OpenAPI path count and missing/extra paths remain unchanged before deciding whether legacy client regeneration is needed.

## Review

- Added `ConfigDict(protected_namespaces=())` to `HybridUDMSelectedModel`, `HybridUDMConfig`, `UDMModelVersion`, and `UDMModelVersionPublic`.
- Added `backend/app/tests/pydantic_warning_test.py` to guard `app.models` import against protected namespace warning regressions.
- Updated PRD current-state notes and the legacy drift audit to mark protected namespace warnings closed.
- Verification:
  - Warnings capture around `import app.models` reported `protected_namespace_warnings=0`.
  - `cd backend; .venv\Scripts\python -m pytest app\tests\pydantic_warning_test.py app\tests\api\routes\test_asm_udm_validate_response.py app\tests\hybrid_udm_validation_test.py app\tests\udm_engine_variable_binding_test.py app\tests\services -q` passed (`36 passed`, existing validator/lifespan warnings remain).
  - OpenAPI compare from `backend/` still showed 88 current/tracked paths with no missing/extra paths and metadata/description-only drift.
  - `git diff --check -- backend\app\models.py backend\app\tests docs\rebuild tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - FastAPI lifespan cleanup and legacy OpenAPI metadata refresh remain separate work.

# 2026-05-31 AutoWaterSimu Next legacy cleanup TODO

- [x] Re-read legacy route/service README context and Phase 0 drift audit
- [x] Remove UTF-8 BOM from `backend/app/api/routes/material_balance.py`
- [x] Remove commented mojibake debug `print` remnants from `backend/app/services/data_conversion_service.py`
- [x] Update legacy drift audit, completion audit, and README First records
- [x] Run targeted route/service validation and diff checks
- [x] Commit checkpoint

## Plan

- Keep this cleanup behavior-neutral.
- Do not change Pydantic model config in this slice because that can affect OpenAPI schema output.
- Leave ad hoc debug/test active prints alone unless those scripts become maintained tooling.

## Review

- Removed the UTF-8 BOM from `backend/app/api/routes/material_balance.py`.
- Removed commented mojibake debug `print` lines and their dead commented exception-debug block from `backend/app/services/data_conversion_service.py`.
- Updated the Phase 0 drift audit to mark those two items closed while keeping Pydantic protected namespace warnings as separate cleanup debt.
- Verification:
  - BOM check confirmed `material_balance.py` no longer starts with `EF BB BF`.
  - `cd backend; .venv\Scripts\python -m pytest app\tests\api\routes\test_flowchart_routes_no_print.py app\tests\api\routes\test_asm_udm_validate_response.py app\tests\services -q` passed.
  - OpenAPI compare first failed from the repository root because backend settings did not load required `.env` values; rerunning from `backend/` showed 88 current/tracked paths with no missing/extra paths and metadata/description-only drift.
  - `git diff --check -- backend\app\api\routes\material_balance.py backend\app\services\data_conversion_service.py docs\rebuild tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - FastAPI lifespan cleanup and ad hoc debug/test print cleanup remain separate legacy maintenance work.

# 2026-05-31 AutoWaterSimu Next browser gate expansion TODO

- [x] Re-read frontend/tests and release gate README context
- [x] Add Compute lifecycle Playwright smoke to the opt-in browser release gate
- [x] Update workflow/release/frontend test README records
- [x] Validate focused Playwright smokes and release gate wiring
- [x] Commit checkpoint

## Plan

- Keep browser smoke opt-in through `-RunBrowserSmoke` / `workflow_dispatch.run_browser_smoke=true`.
- Reuse the existing mock-backed Compute Jobs current-flow and Compute lifecycle specs.
- Do not add live backend or deployed Go API dependencies to this browser gate slice.

## Review

- `scripts/release/next-release-gates.ps1` now runs both `compute-jobs-current-flow.spec.ts` and `compute-lifecycle.spec.ts` when `-RunBrowserSmoke` is set.
- Workflow and README text now describe browser smokes as covering Compute Jobs/current-flow and Compute lifecycle.
- `frontend/tests/README.md` now lists the lifecycle smoke and focused validation command.
- Verification:
  - `cd frontend; npx playwright test tests/compute-jobs-current-flow.spec.ts tests/compute-lifecycle.spec.ts --project=chromium --no-deps --reporter=line` passed.
  - `.\scripts\release\next-release-gates.ps1 -Mode merge -SkipLong -RunBrowserSmoke -EvidenceDir tmp\release-evidence\browser-gate-expanded` passed.
  - `git diff --check -- .github scripts frontend\tests tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - Live deployed API/browser E2E remains blocked on deployment wiring and deployed token/secret policy.

# 2026-05-31 AutoWaterSimu Next CI PostgreSQL migration smoke TODO

- [x] Re-read GitHub workflow and release script README context
- [x] Confirm migration up/down smoke already exists behind temporary database guards
- [x] Add manual opt-in GitHub Actions job with a temporary PostgreSQL service database
- [x] Update workflow/release README, completion audit, and README First records
- [x] Validate workflow wiring and local release gate dry run
- [x] Commit checkpoint

## Plan

- Keep PostgreSQL migration rollback smoke opt-in because down migrations drop metadata tables.
- Use a dedicated `ubuntu-latest` job with `postgres:16-alpine` service instead of mixing a service database into the Windows Desktop gate.
- Do not point CI at any external shared or production database.

## Review

- Added `run_postgres_migration_smoke` manual dispatch input to `.github/workflows/next-release-gates.yml`.
- Added an opt-in `postgres-migration-smoke` job that runs `go test ./internal/compute -run 'TestPostgresMigrations(Up|Down)Smoke' -count=1` against a temporary `postgres:16-alpine` service with `COMPUTE_API_MIGRATION_DOWN_SMOKE=true`.
- Expanded release gate Compute client whitespace normalization from `sdk.gen.ts` to all generated `frontend/src/client/compute/**/*.ts` files after local validation exposed `types.gen.ts` missing-final-newline drift.
- Committed the resulting generated Compute client final-newline normalization for seven `core/` / `index.ts` files so the release gate diff check has a stable baseline.
- Updated GitHub/workflow/release README files and the completion audit to record the CI entry.
- Verification:
  - YAML parser assertions passed for the new input, service image, migration test command, and down-smoke env wiring.
  - First local release gate dry run failed at `compute client diff gate` because codegen removed the final newline in `types.gen.ts`; the follow-up run exposed older no-final-newline drift in seven generated `core/` / `index.ts` files, now normalized as mechanical generated output.
  - `git diff --check -- .github scripts frontend\src\client tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - The new GitHub job still needs a real `workflow_dispatch` run to produce live runner evidence.

# 2026-05-31 AutoWaterSimu Next monitoring deployment examples TODO

- [x] Re-read monitoring and operations README context
- [x] Add Alertmanager routing example without production receivers or secrets
- [x] Add Grafana dashboard JSON using only current Compute API metrics
- [x] Add monitoring deployment runbook and validation checklist
- [x] Update operations README, completion audit, and README First records
- [x] Validate YAML/JSON parsing and diff checks
- [x] Commit checkpoint

## Plan

- Treat this as deployment-ready examples and a runbook, not live production monitoring.
- Only reference metrics currently rendered by `apps/api/internal/compute/http.go`.
- Use placeholder receiver URLs and keep real notification channels out of the repository.

## Review

- Added `docs/operations/monitoring/alertmanager_route_example.yml` with service/severity routes and placeholder receivers.
- Added `docs/operations/monitoring/compute_api_grafana_dashboard.json` with panels for API up, workers, job status, artifact count, and retention candidates.
- Added `docs/operations/monitoring/monitoring_deployment_runbook.md` covering Prometheus scrape/rule load, Alertmanager receiver replacement, Grafana import, and retention alert triage.
- Updated monitoring/operations README files and the completion audit to separate reusable examples from live deployment.
- Verification:
  - YAML/JSON parse validation passed for alert rules, Alertmanager example, and Grafana dashboard.
  - `git diff --check -- docs\operations tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - Production monitoring deployment, real receiver/on-call policy, and live dashboard verification remain deployment-owned work.

# 2026-05-31 AutoWaterSimu Next legacy Phase 0 drift audit TODO

- [x] Re-read legacy backend/frontend README First context and Phase 0 audit gap
- [x] Identify remaining active `print` calls and route guard coverage
- [x] Compare current FastAPI OpenAPI with tracked `frontend/openapi.json`
- [x] Document exact remaining legacy print/schema/client drift issues
- [x] Broaden route no-print regression guard
- [x] Update completion audit and README First records
- [x] Run targeted backend validation and diff checks
- [x] Commit checkpoint

## Plan

- Keep this as a documentation/baseline slice; do not refactor legacy calculation behavior.
- Treat route/runtime `print` separately from ad hoc debug scripts and tests.
- Treat legacy OpenAPI drift by semantic category: path/schema contract drift versus non-behavioral title/description drift.

## Review

- Added `docs/rebuild/AutoWaterSimu_Next_Legacy_Phase0_Drift_Audit_2026-05-31.md`.
- Documented that route modules have no active `print(...)`, while remaining active prints are ad hoc/debug/test-only.
- Documented that current FastAPI OpenAPI and tracked `frontend/openapi.json` both have 88 paths with no missing/extra paths; remaining drift is title and legacy endpoint descriptions only.
- Broadened `test_flowchart_routes_no_print.py` to scan all `backend/app/api/routes/*.py` and read with `utf-8-sig`; the later legacy cleanup removed the `material_balance.py` BOM.
- Verification:
  - First targeted pytest run failed on `material_balance.py` BOM during AST parse; the test now reads `utf-8-sig`.
  - `cd backend; .venv\Scripts\python -m pytest app\tests\api\routes\test_flowchart_routes_no_print.py app\tests\api\routes\test_asm_udm_validate_response.py -q` passed (`21 passed`, existing warnings).
  - FastAPI OpenAPI compare confirmed `current_paths=88`, `tracked_paths=88`, `missing_paths=[]`, `extra_paths=[]`, and `matches=False` due to metadata/description drift.
  - `git diff --check -- backend\app\tests docs\rebuild tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - Legacy OpenAPI/client metadata refresh, debug/test print cleanup, broader mojibake cleanup, and Pydantic protected namespace cleanup remain separate legacy maintenance work.

# 2026-05-31 AutoWaterSimu Next artifact archive backend TODO

- [x] Re-read archive ADR, Compute API retention implementation, migrations, OpenAPI, and operations context
- [x] Add durable artifact archive metadata for PostgreSQL and memory store
- [x] Add opt-in local filesystem archive store wiring through `COMPUTE_API_ARCHIVE_DIR`
- [x] Archive expired unreferenced `archive_candidate` artifacts with copy/checksum verification before hot deletion
- [x] Keep normal artifact download working from archive storage after hot file deletion
- [x] Update OpenAPI, generated compute client, README/runbook/audit records
- [x] Run focused Go/frontend validation
- [x] Commit checkpoint

## Plan

- Keep the existing behavior unchanged when no archive store is configured: `archive_candidate` remains skipped with `archive_executor_not_configured`.
- When `COMPUTE_API_ARCHIVE_DIR` is configured, copy archive candidates into a separate local artifact store, verify checksum, persist archive metadata plus `artifact.archived` event, then remove the hot object file while retaining artifact metadata.
- Exclude already archived artifacts from retention candidates and let normal download fall back to archive storage if the hot object is gone.
- Treat this as the first local backend only; external object storage, restore UI, and production storage policy remain future deployment work.

## Review

- Added `artifact_archives` migration and store methods for durable archive metadata.
- Added `COMPUTE_API_ARCHIVE_DIR` wiring; archive handling remains disabled when the variable is unset.
- Retention sweep now reports `would_archive` in dry-run and `archived` after copy/checksum/metadata/event/hot-delete for eligible unreferenced archive candidates.
- Normal artifact download falls back to archive storage when hot storage no longer has the object.
- Updated OpenAPI/generated Compute types and Compute Jobs / Compute lifecycle UI to show archive counts/actions and enable apply only after dry-run.
- Updated ADR 0010, Compute API README files, operations runbooks, rebuild docs, audit, and change records.
- Verification:
  - `gofmt -w ...; cd apps\api; go test ./...` passed.
  - `cd frontend; npm run generate-compute-client` passed; generated trailing whitespace was stripped without reformatting the whole client.
  - `cd frontend; npx tsc --noEmit` passed.
  - `cd frontend; npx playwright test tests/compute-lifecycle.spec.ts --project=chromium --no-deps --reporter=line` passed (`1 passed`).
  - `git diff --check -- apps\api frontend docs\operations docs\rebuild .ai\decisions tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - Production object-store archive backend, archive-specific metrics/dashboard, deployed archive restore/read smoke, and storage policy remain future deployment work.

# 2026-05-31 AutoWaterSimu Next Compute API token secret runbook TODO

- [x] Re-read Compute API auth, operations README, lifecycle runbook, and completion audit context
- [x] Document static bearer token scope boundaries and production secret handling
- [x] Document overlap rotation, revocation, validation, and incident response steps
- [x] Update operations README, lifecycle runbook, completion audit, and README First records
- [x] Run focused validation
- [x] Commit checkpoint

## Plan

- Add an operations runbook for `COMPUTE_API_TOKENS_JSON` without adding real secrets or new runtime behavior.
- Keep the P0 boundary explicit: static bearer tokens with scopes and config-level `revoked:true`, no full RBAC or dynamic token management API.
- Link the runbook from lifecycle/operations docs so artifact retention admin steps point to rotation and incident response guidance.

## Review

- Added `docs/operations/compute_api_token_secret_runbook.md`.
- Documented dev-token non-production boundary, production secret storage expectations, scope separation, overlap rotation, config-level revocation, validation commands, and incident response.
- Updated operations README, lifecycle runbook, completion audit, and README First records.
- Verification:
  - `git diff --check -- docs\operations tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
  - `cd apps\api; go test ./internal/compute -run "TestHTTPAuthScopeAndMetrics|TestStaticTokenRevocation|TestHTTPArtifactRetentionSweepRequiresAdminScope" -count=1` passed.
- Remaining scope:
  - Deployment-specific secret manager wiring, token approval ownership, restart windows, and live deployed API validation remain external deployment decisions.

# 2026-05-31 AutoWaterSimu Next release runner timing TODO

- [x] Re-read `.github/workflows`, release script, and completion audit context
- [x] Add workflow cache/concurrency/timing controls without changing default PR gate behavior
- [x] Update workflow README and audit records
- [x] Validate workflow syntax and release gate script
- [x] Commit checkpoint

## Plan

- Add GitHub Actions concurrency so superseded PR runs do not consume runner time.
- Use setup-node npm cache for both frontend and Desktop lockfiles, and make setup-go cache path explicit.
- Add Rust target cache for Desktop Tauri tests/builds.
- Expose manual `skip_long` dispatch input while keeping default full gate behavior unchanged.

## Review

- Added workflow concurrency cancellation scoped to workflow/ref.
- Added npm cache for `frontend/package-lock.json` and `apps/desktop/package-lock.json`.
- Made Go cache dependency path explicit with `apps/api/go.sum`.
- Added Rust build output cache for `apps/desktop/src-tauri`.
- Added manual `skip_long` dispatch input and passed it to `next-release-gates.ps1`; default PR behavior remains unchanged.
- Verification:
  - `backend\.venv\Scripts\python` + PyYAML parsed `.github/workflows/next-release-gates.yml` and asserted concurrency/cache steps.
  - `git diff --check -- .github tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
  - `.\scripts\release\next-release-gates.ps1 -Mode merge -SkipLong -EvidenceDir tmp\release-evidence\workflow-timing-gate` passed with evidence status `passed` and `10` steps.
- Remaining scope:
  - Live GitHub Windows runner timing, artifact upload/download retention, and cache hit behavior still require an actual `workflow_dispatch` run.

# 2026-05-31 AutoWaterSimu Next Desktop file-backed project restore TODO

- [x] Re-read Desktop runtime/store/tests and project package README context
- [x] Confirm current project import restores only project metadata and CanvasGraphs
- [x] Include job input/events plus artifact/support bundle file contents in project packages
- [x] Restore file-backed jobs/artifacts/model runs/support bundles only after checksum verification
- [x] Update Desktop UI/types and README First records
- [x] Run Desktop Rust/React validation
- [x] Commit checkpoint

## Plan

- Preserve `desktop_project_export.v1` compatibility with old project-only and metadata-only packages.
- Export current P0 artifact/support bundle files as hex-encoded package records with checksums, avoiding new dependencies.
- Restore DB records only when the referenced files are present and checksum-verified; otherwise keep older package records metadata-only.
- Reject path traversal through existing `safe_relative_path` before reading or writing package file contents.

## Review

- Project packages now include job `input`, job `events`, and hex-encoded `artifact_files` / `support_bundle_files` with checksum and size metadata.
- Import writes package files only after checksum/size verification; if an existing file has a different checksum, import rejects instead of overwriting it.
- Import restores compute jobs, artifacts, model runs, job events, and support bundle rows only when the package carries verified file records; older metadata-only packages remain importable without creating dangling rows.
- Desktop UI/types now expose restored counts plus file counts.
- Verification:
  - `cargo fmt --manifest-path apps\desktop\src-tauri\Cargo.toml` passed.
  - First Rust test run failed because the test still expected artifact JSON text to appear directly in the package; package files are hex-encoded, so the test was updated to verify package file records and restored artifact file content.
  - `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`22 passed`).
  - `cd apps\desktop; npm run typecheck` passed.
  - `cd apps\desktop; npm run build` passed.
  - Browser preview against `http://127.0.0.1:1420/` confirmed `Desktop Runtime`, `Project Export`, `Project Import`, `No project export yet.`, `No project import yet.`, `No recent project files yet.`, and browser-only runtime notice render; the first navigation timed out but the page loaded and a follow-up snapshot passed, then the temporary Vite dev server was stopped.
  - `git diff --check -- apps\desktop tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - Directory/zip package format, compression, persisted ProcessGraph restore, and package migration policy remain future design work.

# 2026-05-31 AutoWaterSimu Next Desktop release policy boundary TODO

- [x] Re-read Desktop packaging, GitHub workflow, release script, and rebuild plan context
- [x] Confirm PRD/Spec/Development Plan already mark signing/auto-update/Store as post-P0
- [x] Add ADR for unsigned P0 artifacts and post-P0 signing/auto-update/GitHub Release publication boundary
- [x] Update Desktop, packaging, GitHub workflow, release script, and Development Plan records
- [x] Update completion audit and README First records
- [x] Run docs diff validation
- [x] Commit checkpoint

## Plan

- Treat unsigned sidecar/NSIS installer artifacts plus smoke evidence as the current P0 release artifact boundary.
- Do not add signing, updater, Store/MSI, GitHub Release publication, or secret handling without a separate policy decision.
- Keep `workflow_dispatch build_release_artifacts=true` as workflow artifact upload, not automatic release publication.

## Review

- Added `.ai/decisions/0011-desktop-release-signing-auto-update-boundary.md`.
- The ADR treats unsigned sidecar/NSIS installer artifacts plus smoke evidence as the current P0 release boundary.
- GitHub workflow artifact upload remains manual and unsigned; signing, auto update, Store/MSI, and GitHub Release publication require separate policy/secrets/update-channel decisions before implementation.
- Updated Desktop, packaging, src-tauri, GitHub, workflow, release, Development Plan, completion audit, and README First records.
- Verification:
  - `git diff --check -- .ai\decisions apps\desktop .github scripts\release docs\rebuild tasks .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
  - `rg -n "schema_version|P0|P1|P2" docs\rebuild --glob "AutoWaterSimu_Next_*.md"` completed and confirmed the updated checklist remains aligned with PRD/Spec P0 non-goals.
- Remaining scope:
  - Live GitHub Windows runner release-build timing/download verification and release runner cache/timing hardening remain follow-up work.
  - Future signing, auto update, Store/MSI, and GitHub Release publication remain policy-driven post-P0 work.

# 2026-05-31 AutoWaterSimu Next Desktop File Dialog Recent Files TODO

- [x] Re-read Desktop README First context and Tauri dialog/recent_files requirements
- [x] Confirm Tauri v2 dialog plugin current package/crate version and permission model from official docs
- [x] Add minimal dialog dependency/capability and React file picker helpers
- [x] Add Rust external project package export/import commands with path validation and recent_files tracking
- [x] Expose recent files in Desktop wrappers/UI
- [x] Add Rust regression coverage and update README First records
- [x] Run Desktop Rust/React/browser validation
- [x] Commit checkpoint

## Plan

- Use `@tauri-apps/plugin-dialog` / `tauri-plugin-dialog` only for open/save dialogs; React may choose paths but Rust remains the only writer/reader of project package files.
- Keep accepted external project package paths strict: absolute paths ending with `.autowatersimu-project.json`.
- Record successful external project package import/export in SQLite `recent_files` as `project_package`.
- Do not add broad filesystem plugin permissions or arbitrary React filesystem access.

## Review

- Added `@tauri-apps/plugin-dialog` and `tauri-plugin-dialog` v2.7.1 with only `dialog:allow-open` / `dialog:allow-save` capability permissions.
- Added `project_export_file`, `project_import_file`, and `recent_file_list` commands. Rust validates absolute `.autowatersimu-project.json` paths, performs all file IO, and records successful external project package paths in SQLite `recent_files` as `project_package`.
- Added `projectDialogs.ts` open/save helpers plus Desktop controls for `Export Project File`, `Import Project File`, `Import Recent Project`, and `Recent Project File`.
- Added Rust regression coverage for external project package export/import, recent file tracking, suffix validation, and relative path rejection.
- Verification:
  - `cargo fmt --manifest-path apps\desktop\src-tauri\Cargo.toml` passed.
  - First Rust test run failed because Windows canonical paths added a `\\?\` display prefix to recent file records; runtime now uses canonicalization for validation only and preserves the user-selected absolute path for records/UI.
  - `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`22 passed`).
  - `cd apps\desktop; npm run typecheck` passed.
  - `cd apps\desktop; npm run build` passed.
  - `cd apps\desktop; npm run tauri -- build` passed and produced `apps\desktop\src-tauri\target\release\autowatersimu-desktop.exe`.
  - Browser preview against `http://127.0.0.1:1420/` confirmed `Export Project File`, `Import Project File`, `Import Recent Project`, `Recent Project File`, and `No recent project files yet.` render in browser-only mode; temporary Vite dev server was stopped.
- Remaining scope:
  - File-backed restore of job/artifact/support bundle contents remains out of scope until project packages carry and verify those files.

# 2026-05-31 AutoWaterSimu Next Desktop Project Package Contents TODO

- [x] Re-read Desktop README First context for runtime, store, commands, React wrappers, and existing project export/import scope
- [x] Confirm current export contains only project metadata and remaining audit calls out richer project package content
- [x] Add project package snapshot content for project-scoped jobs, CanvasGraphs, artifact refs, and support bundle refs
- [x] Keep import conservative: restore project metadata and CanvasGraphs, but do not recreate job/artifact/support-bundle rows without file contents
- [x] Update Desktop UI/types and README First records
- [x] Run Desktop Rust/React validation
- [x] Commit checkpoint

## Plan

- Preserve `desktop_project_export.v1` and keep backward compatibility with project-only exports.
- Add export content under a new `contents` object while keeping artifact/support bundle payloads metadata-only.
- Reuse existing project_id wiring for jobs and CanvasGraphs; do not introduce external file dialogs in this slice.
- Import CanvasGraphs only after the project row is upserted, and reject graphs that claim a different project_id.

## Review

- `desktop_project_export.v1` now includes `contents.compute_jobs`, `contents.canvas_graphs`, `contents.artifact_refs`, `contents.support_bundle_refs`, `contents.redaction`, and returned `content_counts`.
- Project import remains backward compatible with old project-only exports; for rich packages it restores the project row and CanvasGraphs, while job/artifact/support bundle refs remain metadata-only because the package does not carry artifact/support bundle file contents.
- Desktop UI/types now show package counts for project export/import.
- Updated Desktop README contracts for the project package metadata-only boundary.
- Verification:
  - `cargo fmt --manifest-path apps\desktop\src-tauri\Cargo.toml` passed.
  - First `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` failed because the updated test shadowed the `runtime()` helper with a local `runtime` binding; fixed by calling `self::runtime()`.
  - `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`21 passed`).
  - `cd apps\desktop; npm run typecheck` passed.
  - `cd apps\desktop; npm run build` passed.
  - Browser preview against `http://127.0.0.1:1420/` confirmed `Desktop Runtime`, `Project Export`, `Project Import`, and `No project export yet.` render in browser-only mode; the first navigation timed out but a retry loaded successfully. The temporary Vite dev server was stopped.
  - `git diff --check -- apps\desktop tasks\todo.md .ai\plans .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
  - External file dialogs, recent-file allowlist, and file-backed job/artifact/support bundle restore remain Desktop follow-up work.

# 2026-05-31 AutoWaterSimu Next Compute Lifecycle Admin UI TODO

- [x] Re-read frontend, routes, services, i18n, Chakra v3, and Compute lifecycle context
- [x] Add dedicated `/compute-lifecycle` route
- [x] Surface Compute API health/metrics and retention summary
- [x] Reuse admin retention sweep with dry-run-before-delete guard
- [x] Add sidebar/i18n route entry and regenerate route tree
- [x] Add mock-backed Playwright lifecycle smoke
- [x] Run frontend validation and update README First records
- [x] Commit checkpoint

## Plan

- Keep backend API unchanged and reuse `computeJobsService`.
- Parse current Prometheus text metrics in the route for display only.
- Keep deletion disabled until the latest dry-run report contains `would_delete`.
- Display `archive_executor_not_configured` as a blocker instead of treating archive candidates as deletable.

## Review

- Added `frontend/src/routes/_layout/compute-lifecycle.tsx`.
- Added `computeJobsService.getMetrics()`.
- Added the sidebar entry, English/Chinese nav labels, and generated `routeTree.gen.ts` update.
- Added `frontend/tests/compute-lifecycle.spec.ts`.
- Verification:
  - `cd frontend; npx vite build` passed and regenerated route tree, with existing Vite warnings about `gray-matter` eval, toaster chunking, and bundle size.
  - `cd frontend; npx tsc --noEmit` passed.
  - First Playwright run used a Windows backslash path and found no tests.
  - Second Playwright run with the default HTML reporter left a report server open after a strict locator failure; stale Playwright node/Chrome processes were stopped, the test locators were tightened, and rerun with `--reporter=line`.
  - `cd frontend; npx playwright test tests/compute-lifecycle.spec.ts --project=chromium --no-deps --reporter=line` passed (`1 passed`).
  - `git diff --check -- frontend tasks .ai\plans .ai\changes` passed with LF/CRLF warnings only.
- Remaining scope:
  - This is a focused lifecycle admin page, not full Alertmanager/dashboard deployment or archive backend implementation.

# 2026-05-31 AutoWaterSimu Next Artifact Archive Backend Decision TODO

- [x] Re-read `.ai/decisions`, Compute API retention, operations, and migration context
- [x] Add ADR for archive backend boundary and current non-implementation status
- [x] Update Compute API/operations documentation to point at the decision
- [x] Update completion audit and README First records
- [x] Run docs diff validation
- [x] Commit checkpoint

## Plan

- Keep current runtime behavior unchanged: `archive_candidate` remains skipped by retention sweep.
- Record the future archive backend requirements before changing metadata or deletion behavior.
- Require archive copy verification and auditable metadata before any archived artifact can be deleted from hot storage.

## Review

- Added `.ai/decisions/0010-artifact-archive-backend-boundary.md`.
- The ADR keeps current runtime behavior unchanged: retention sweep continues to skip `archive_candidate` with `archive_executor_not_configured`.
- Future archive implementation must copy, verify checksum, and durably record archive metadata before deleting hot-storage artifacts.
- Updated Compute API README, internal compute README, and lifecycle runbook to point at the ADR.
- Verification:
  - `git diff --check -- .ai\decisions apps\api\README.md apps\api\internal\compute\README.md docs\operations tasks .ai\plans .ai\changes` passed with LF/CRLF warnings only.
- Remaining scope:
  - No archive store, metadata migration, OpenAPI field, or scheduler behavior change is implemented in this slice.

# 2026-05-31 AutoWaterSimu Next Compute API Backup Restore Policy TODO

- [x] Re-read docs, operations, Compute API, and migration README context
- [x] Confirm current runtime facts for PostgreSQL metadata and local artifact storage
- [x] Add Compute API backup/restore runbook with PowerShell examples
- [x] Link backup policy from lifecycle runbook and operations README
- [x] Run docs diff validation and update README First records
- [x] Commit checkpoint

## Plan

- Document PostgreSQL `pg_dump` / `pg_restore` and artifact directory snapshot as an operator procedure, not as an in-process API feature.
- Make the destructive restore boundary explicit: stop API and workers, restore metadata and artifact directory as a matched pair, then verify checksums/health.
- Keep archive backend and object-store versioning as unresolved follow-up; do not claim they exist.

## Review

- Added `docs/operations/compute_api_backup_restore_runbook.md`.
- The runbook treats PostgreSQL metadata and `COMPUTE_API_ARTIFACT_DIR` as one consistency unit, includes pre-backup, backup, restore, and post-restore verification steps, and warns that restore is destructive.
- Updated `docs/operations/README.md` and linked the runbook from `compute_api_lifecycle_runbook.md`.
- Verification:
  - `git diff --check -- docs tasks .ai\plans .ai\changes` passed with LF/CRLF warnings only.
- Remaining scope:
  - No archive backend or object-store versioning is implemented in this slice.
  - No automated backup scheduler or restore API is added.

# 2026-05-31 AutoWaterSimu Next GitHub Release Artifact Build TODO

- [x] Re-read `.github`, workflow, Desktop packaging, and release gate README context
- [x] Inspect packaging scripts and confirm manifest output fields
- [x] Add explicit `workflow_dispatch` release artifact build switch
- [x] Pass built sidecar/installer manifest paths into release gate
- [x] Upload unsigned Desktop artifacts as GitHub workflow artifacts
- [x] Run workflow syntax/diff validation and update README First records
- [x] Commit checkpoint

## Plan

- Keep PR/merge gate behavior unchanged.
- Make release artifact build opt-in through `build_release_artifacts=true`.
- Read `sidecar_executable` and `installer_path` from packaging manifests instead of guessing generated paths.
- Upload only unsigned sidecar/installer artifacts and evidence; do not add signing, auto-update, or GitHub Release publication in this slice.

## Review

- `.github/workflows/next-release-gates.yml` now exposes `build_release_artifacts`.
- When enabled through `workflow_dispatch`, the workflow builds the packaged sidecar, builds the NSIS installer, reads `sidecar_executable` / `installer_path` from packaging manifests, passes those paths into `next-release-gates.ps1`, and uploads unsigned Desktop artifacts plus build/smoke evidence.
- Default pull request and merge gate behavior remains unchanged.
- Verification:
  - `backend\.venv\Scripts\python` parsed `.github/workflows/next-release-gates.yml` with PyYAML successfully.
  - `.\scripts\release\next-release-gates.ps1 -Mode merge -SkipLong -EvidenceDir tmp\release-evidence\workflow-artifact-build-gate` passed with `10` passed steps.
  - `git diff --check -- .github apps\desktop\packaging scripts\release tasks .ai\plans .ai\changes` passed with LF/CRLF warnings only.
  - `actionlint` was not installed locally.
- Remaining scope:
  - A real GitHub `workflow_dispatch` run with `build_release_artifacts=true` is still needed to verify Windows runner timing and uploaded artifact retention/download behavior.
  - Signing, auto-update, and GitHub Release publication remain policy-dependent follow-up work.

# 2026-05-31 AutoWaterSimu Next Compute API Alert Rules TODO

- [x] Re-read operations README/runbook and current Compute API metrics contract
- [x] Add Prometheus alert rules for Compute API lifecycle metrics
- [x] Document monitoring directory scope and deployment boundary
- [x] Link alert rules from the lifecycle runbook
- [x] Validate docs diff and YAML structure

## Plan

- Store alert rules under `docs/operations/monitoring/` because there is no existing deployment monitoring directory.
- Reference only metrics currently emitted by `/metrics`.
- Do not claim Alertmanager or Prometheus deployment is complete.

## Review

- Added `docs/operations/monitoring/compute_api_alerts.yml`.
- Rules cover API down, queued jobs without workers, failed/timed-out jobs, and persistent artifact retention backlog.
- Added `docs/operations/monitoring/README.md` and linked the rules from the lifecycle runbook.
- Verification:
  - `git diff --check -- docs\operations` passed with LF/CRLF warnings only.
  - `promtool` was not installed locally.
  - `backend\.venv\Scripts\python` + PyYAML parsed the alert file and asserted group/rule/alert/expr structure.
- Remaining scope:
  - Actual Prometheus/Alertmanager deployment, notification routing, dashboard provisioning, and environment-specific thresholds remain follow-up operations work.

# 2026-05-30 AutoWaterSimu Next Retention Scheduler TODO

- [x] Re-read compute-api command, internal compute lifecycle, and operations runbook context
- [x] Add disabled-by-default artifact retention scheduler helper
- [x] Wire explicit env configuration in `cmd/compute-api`
- [x] Keep scheduler dry-run by default
- [x] Add regression proving enabled scheduler deletes expired unreferenced TTL artifacts
- [x] Run Go validation and update README First records

## Plan

- Enable scheduler only when `COMPUTE_API_RETENTION_SWEEP_INTERVAL` is set.
- Default `COMPUTE_API_RETENTION_SWEEP_DRY_RUN=true`.
- Reuse `SweepArtifactRetention` so model_run reference protection and archive-candidate skip behavior stay identical to the manual admin endpoint.

## Review

- Added `StartArtifactRetentionScheduler`.
- `cmd/compute-api` now reads `COMPUTE_API_RETENTION_SWEEP_INTERVAL`, `COMPUTE_API_RETENTION_SWEEP_DRY_RUN`, and `COMPUTE_API_RETENTION_SWEEP_LIMIT`.
- The scheduler logs report counts and performs no work unless explicitly enabled.
- Verification:
  - `cd apps\api; go test ./...` passed.
- Remaining scope:
  - Archive backend, alert manager/dashboard wiring, and backup/restore policy remain follow-up work before enabling scheduled deletion in production.

# 2026-05-30 AutoWaterSimu Next Artifact Retention UI TODO

- [x] Re-read Compute Jobs route, services, generated client, and routes README context
- [x] Add artifact retention dry-run/delete panel to Compute Jobs page
- [x] Disable delete until a dry-run report has `would_delete` items
- [x] Surface backend errors through existing Compute Jobs error panel
- [x] Run frontend typecheck and current-flow Playwright smoke
- [x] Update README First records and completion audit

## Plan

- Reuse `computeJobsService.sweepArtifactRetention`.
- Keep deletion backend-protected by `artifact:admin`; the UI only adds a guarded entry point.
- Do not add scheduler, archive controls, or a separate admin route in this slice.

## Review

- Added an Artifact retention panel to `/compute-jobs`.
- Dry run calls `dry_run=true`; delete calls `dry_run=false` and is disabled until a dry-run report indicates eligible TTL artifacts.
- The panel shows checked/deleted/skipped/would-delete counts and the backend report JSON.
- Verification:
  - `cd frontend; npx tsc --noEmit` passed.
  - `cd frontend; npx playwright test tests/compute-jobs-current-flow.spec.ts --project=chromium --no-deps` passed (`1 passed`).
- Remaining scope:
  - Scheduler, archive backend, alert/dashboard wiring, and a dedicated lifecycle admin page remain follow-up work.

# 2026-05-30 AutoWaterSimu Next Lifecycle Operations Runbook TODO

- [x] Re-read docs README and current Compute API lifecycle/metrics context
- [x] Add `docs/operations/README.md`
- [x] Add Compute API lifecycle runbook for health, metrics, admin retention sweep, scope boundaries, and triage
- [x] Keep scheduler/archive/UI documented as not implemented
- [x] Run docs diff validation and update README First records

## Plan

- Document only current code facts: metrics gauges, `artifact:admin` retention endpoint, dry-run default, and recovery limits.
- Use PowerShell examples.
- Avoid claiming built-in scheduler, archive backend, alert manager, or UI.

## Review

- Added `docs/operations/compute_api_lifecycle_runbook.md`.
- Added operations directory README and registered it in `docs/README.md`.
- The runbook covers health/readiness, metrics, manual dry-run and deletion sweep, recovery limits, scheduler status, and triage checklist.
- Verification:
  - `git diff --check -- docs` passed.
- Remaining scope:
  - Built-in scheduler, archive backend, alert manager integration, dashboards, and lifecycle UI remain follow-up implementation work.

# 2026-05-30 AutoWaterSimu Next Compute API Metrics Hardening TODO

- [x] Re-read Go API/internal compute metrics and lifecycle context
- [x] Add store-backed metrics snapshot for memory and PostgreSQL stores
- [x] Render Prometheus gauges for API up, jobs by status, workers, artifacts, and retention candidates
- [x] Keep `/metrics` public and read-only
- [x] Add HTTP metrics regression coverage
- [x] Run Go validation and update README First records

## Plan

- Do not introduce Prometheus dependencies; keep text rendering in the existing HTTP package.
- Count metadata records only, not large artifact bytes or time-series payloads.
- Do not run timeout sweep, retention sweep, or any other mutation from metrics collection.

## Review

- Added `MetricsSnapshot` and `Store.Metrics`.
- Memory and PostgreSQL stores now report job status counts, registered workers, artifact metadata total, and retention candidates.
- `/metrics` now renders Prometheus text for those gauges while retaining `autowatersimu_compute_api_up`.
- Verification:
  - `cd apps\api; go test ./...` passed.
- Remaining scope:
  - SLO thresholds, alerting rules, scheduler metrics, archive metrics, and production dashboards/runbooks still need follow-up operations work.

# 2026-05-30 AutoWaterSimu Next Admin Artifact Retention Sweep TODO

- [x] Re-read Go API, internal compute, OpenAPI, generated client, frontend service, and retention context
- [x] Add admin-scoped HTTP endpoint for manual artifact retention sweep
- [x] Keep dry-run as the safe default and require explicit `dry_run=false` for deletion
- [x] Add HTTP scope/default-dry-run/deletion regression coverage
- [x] Update OpenAPI, generated Compute client, and frontend service wrapper
- [x] Run Go, frontend, and diff validation
- [x] Update README First records and completion audit

## Plan

- Add `POST /api/v1/admin/artifacts/retention-sweep`.
- Require a new `artifact:admin` scope rather than reusing worker `artifact:write`.
- Accept an optional body with `dry_run` and `limit`; empty body means `dry_run=true`.
- Do not add scheduler, archive backend, metrics, or UI in this slice.

## Review

- Added `ArtifactRetentionSweepRequest` and a new admin route.
- The route calls the existing service-level sweep and returns `artifact_retention_sweep.v1`; it refuses non-admin tokens and defaults to `would_delete` dry-run behavior.
- OpenAPI and generated Compute TypeScript client now expose `sweepArtifactRetention`; `computeJobsService` wraps it with a dry-run default.
- Verification:
  - `cd apps\api; go test ./internal/compute -run TestHTTPArtifactRetentionSweepRequiresAdminScope -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `cd frontend; npm run generate-compute-client` completed.
  - `cd frontend; npx tsc --noEmit` passed.
  - `git diff --check` passed after generated SDK whitespace normalization.
- Remaining scope:
  - Retention scheduling, archive storage, retention metrics/SLOs, runbooks, and UI are still follow-up lifecycle/operations work.

# 2026-05-30 AutoWaterSimu Next Opt-in Heavy Release Gates TODO

- [x] Re-read release script, workflow, and README First automation context
- [x] Add explicit `-RunWorkerMatrix` and `-RunBrowserSmoke` release gate switches
- [x] Add matching `workflow_dispatch` inputs and browser install step for manual smoke runs
- [x] Keep default PR/merge gate behavior unchanged
- [x] Run opt-in merge gate with worker matrix and current-flow browser smoke
- [x] Update README First records and completion audit

## Plan

- Treat worker pytest matrix and current-flow Playwright smoke as opt-in heavy/focused gates.
- Keep default PR gates predictable: worker self-check and minimal job stay default, full worker pytest matrix and Playwright smoke require explicit switches.
- Record selected switches in evidence JSON so dry-run/pass claims are auditable.

## Review

- `scripts/release/next-release-gates.ps1` now supports `-RunWorkerMatrix` and `-RunBrowserSmoke`.
- Evidence JSON now records `skip_long`, `run_worker_matrix`, and `run_browser_smoke`.
- `.github/workflows/next-release-gates.yml` exposes matching manual inputs; when browser smoke is requested, the workflow installs Playwright Chromium before invoking the script.
- Updated release/workflow README files to document default vs opt-in placement.
- Verification:
  - PowerShell parser check for `scripts/release/next-release-gates.ps1` passed.
  - `.\scripts\release\next-release-gates.ps1 -Mode merge -SkipLong -RunWorkerMatrix -RunBrowserSmoke -EvidenceDir tmp\release-evidence\current-flow-worker-gate` passed with 12 passed steps.
  - `git diff --check` passed with LF/CRLF warnings only.
- Remaining scope:
  - Default PR gate still does not install browser dependencies or run the heavy worker matrix; moving either to default CI remains a future runtime/cost policy decision.

# 2026-05-30 AutoWaterSimu Next Current Flow Playwright Smoke TODO

- [x] Re-read frontend route/service/store/contracts and Playwright test context
- [x] Add mock-backed Compute Jobs current-flow submission smoke
- [x] Validate exported job metadata, simulation input nodes/edges/time segments, and UI job visibility
- [x] Run frontend typecheck and focused Playwright test
- [x] Update README First records and completion audit

## Plan

- Keep this slice test-only; do not change production Compute Jobs UI or current material-balance submit semantics.
- Seed the Zustand flow store through Vite module import, then submit the existing `Current flow` action.
- Mock legacy auth and Compute API endpoints so the smoke is deterministic and independent from live backend/Go API services.

## Review

- Added `frontend/tests/compute-jobs-current-flow.spec.ts`.
- The smoke injects a three-node current flow with COD edge transforms and one time segment, clicks `Current flow`, and verifies the submitted `compute_job.v1` keeps `metadata.source=legacy_flow_export`, `process_graph_id=pg_graph_current_flow_smoke`, three simulation nodes, two edges, and one time segment.
- The mocked Compute API returns queued job detail/result/events so the test also verifies the submitted job appears in the Compute Jobs table and process graph evidence is visible in the UI.
- Verification:
  - `cd frontend; npx tsc --noEmit` passed.
  - `cd frontend; npx playwright test tests/compute-jobs-current-flow.spec.ts --project=chromium --no-deps` passed (`1 passed`).
- Remaining scope:
  - Full Playwright suite still depends on existing auth setup/backend environment; production CI placement for heavier worker baseline matrix remains a separate decision.

# 2026-05-30 AutoWaterSimu Next Artifact Retention Sweep TODO

- [x] Re-read Go API, internal compute, migration, artifact, evidence, and model_run context
- [x] Add service-level retention sweep options/report types
- [x] Add store queries for expired artifact candidates, model_run evidence references, and artifact metadata deletion
- [x] Add local artifact object delete support
- [x] Protect model_run-referenced artifacts and delete only expired unreferenced TTL artifacts
- [x] Add focused Go service regression test
- [x] Update README First records and completion audit

## Plan

- Keep this slice internal to Go API service code; do not add public admin HTTP routes or OpenAPI surface yet.
- Treat `retain_forever` as never eligible, `ttl` as deletable only after `retain_until`, and `archive_candidate` as skipped until archive storage is designed.
- Before deleting, scan persisted `model_run.v1.evidence_refs` for both raw artifact ids and `artifact:<id>` refs.

## Review

- Added `SweepArtifactRetention` with dry-run support, bounded candidate limits, per-artifact action reporting, and audit event creation for actual deletion.
- Added `ArtifactStore.Delete` for local artifact files; missing files are treated idempotently so stale metadata can still be removed.
- Added memory/PostgreSQL store methods for expired retention candidates, model_run evidence reference lookup, and artifact metadata deletion.
- Added a Go service test proving dry-run safety, model_run reference protection, expired unreferenced TTL deletion, download behavior, and audit event recording.
- Verification:
  - `cd apps\api; go test ./...` passed.
- Remaining scope:
  - No public admin API, scheduler/daemon, archive backend, metrics, or UI exists yet.

# 2026-05-30 AutoWaterSimu Next Worker Numerical Baseline Matrix TODO

- [x] Re-read worker, contracts examples, backend legacy baseline, simulation core, and task audit context
- [x] Add old-vs-worker fixture matrix for material balance, ASM1Slim, ASM1, ASM3, and single-reactor UDM jobs
- [x] Add generated UDM Hybrid multi-model worker baseline
- [x] Add generated Petersen tutorial worker baselines
- [x] Keep worker runtime code unchanged and preserve the no-backend-import implementation boundary
- [x] Run worker test suite and update README First records

## Plan

- Treat existing `compute_job.v1` fixtures as the static matrix for material balance and independent model job types.
- Use test-generated simulation inputs for UDM Hybrid and Petersen tutorial flows to avoid bloating `contracts/examples/` with large tutorial fixtures.
- Compare worker-produced artifact final series and timestamps against legacy `MaterialBalanceCalculator` output through the backend `simulation_input.v1` adapter.

## Review

- `services/simulation-worker/tests/test_worker_cli.py` now includes an old-vs-backend numerical baseline matrix.
- Static fixture coverage includes `material_balance_minimal`, `asm1slim_minimal`, `asm1slim_independent`, `asm1_independent`, `asm3_independent`, and `udm_independent`.
- Generated baseline coverage includes a two-model UDM Hybrid flow with explicit local-to-canonical variable bindings.
- Generated Petersen tutorial coverage includes `petersen-chapter-2` and `petersen-chapter-7` default UDM flows, matching the legacy backend tutorial runtime baseline shape.
- Worker runtime code still does not import `backend/app`; the legacy backend dependency is test-only for baseline comparison.
- Verification:
  - `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed (`21 passed`, existing warnings only).
- Remaining scope:
  - This closes current local old-vs-worker baseline evidence for worker/core/backend parity; production CI runtime cost and release-gate placement remain separate decisions.

# 2026-05-30 AutoWaterSimu Next UDM Independent Worker Job Type TODO

- [x] Re-read UDM runtime, contracts, worker, simulation core, backend adapter, and tests context
- [x] Add `simulation.udm.v1` to executable compute/simulation/result contracts
- [x] Add independent UDM fixture with model snapshot, process definitions, parameter values, and variable bindings
- [x] Add core/backend parity and worker model_run coverage
- [x] Keep Go SimulationRequest, Desktop creation, and frontend submission out of this slice
- [x] Run contract, core, worker, backend adapter, direct worker, and diff validation
- [x] Record findings and commit checkpoint

## Plan

- Introduce `simulation.udm.v1` after ASM1Slim, ASM1, and ASM3 independent job types are already proven.
- Use a single UDM reactor fixture with local variables bound to canonical component names to cover `udm_model_snapshot`, `udm_processes`, `udm_parameter_values`, and `udm_variable_bindings`.
- Do not implement Hybrid multi-UDM model mapping or Petersen tutorial worker baselines in this slice.
- Keep API/UI submission surfaces unchanged until independent model job routing is explicitly designed.

## Review

- `compute_job.v1`, `simulation_input.v1`, and `compute_result.v1` now allow `simulation.udm.v1` in addition to material balance and ASM job types.
- Added independent UDM compute/simulation fixtures with a single reactor, local-to-canonical variable bindings, UDM process definitions, parameter values, and model snapshot.
- Core and legacy backend adapters accept `simulation.udm.v1` while still converting through the existing MaterialBalanceInput runtime model.
- Worker self-check now lists `simulation.udm.v1`; `run_job` preserves that job type in result/artifact payloads and emits `model_run.model_key=udm`.
- Worker `model_run.parameter_hash` now keeps pure material balance hashing unchanged but includes node model fields for ASM/UDM model job types, including UDM snapshot and variable bindings.
- Verification:
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`83 passed`).
  - `backend\.venv\Scripts\python -m pytest simulation_core\tests -q` passed (`10 passed`, existing warnings only).
  - `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed (`12 passed`).
  - `cd backend; .venv\Scripts\python -m pytest app\tests\services -q` passed (`26 passed`, existing warnings only).
  - Direct worker run for `udm_independent.compute_job.v1.json` passed with `job_type=simulation.udm.v1`, `status=succeeded`, `model_key=udm`, and `total_steps=11`.
- Remaining scope:
  - `simulation_request.v1`, Go API promotion, Desktop job creation, and Web submit UI still accept only the material-balance submission path.
  - UDM Hybrid multi-model mapping, Petersen tutorial worker baselines, and the full old-vs-worker numerical baseline matrix remain follow-up work.

# 2026-05-30 AutoWaterSimu Next ASM3 Independent Worker Job Type TODO

- [x] Re-read ASM3 runtime, contracts, worker, simulation core, backend adapter, and tasks context
- [x] Add `simulation.asm3.v1` to executable compute/simulation/result contracts
- [x] Add independent ASM3 fixtures and adapter/worker tests
- [x] Keep Go SimulationRequest, Desktop creation, and frontend submission out of this slice
- [x] Run contract, core, worker, backend adapter, direct worker, and diff validation
- [x] Record findings and commit checkpoint

## Plan

- Introduce `simulation.asm3.v1` after the completed ASM1Slim and ASM1 independent job type pattern.
- Use the existing ASM3 node model branch in the material balance runtime, with 13 state variables and 37 parameters from the runtime model validators and ASM3 reaction implementation.
- Keep API/UI submission surfaces unchanged until independent model job routing is explicitly designed.
- Do not claim UDM independent job type in this slice; UDM needs model snapshot and variable binding semantics beyond a simple ASM parameter vector.

## Review

- `compute_job.v1`, `simulation_input.v1`, and `compute_result.v1` now allow `simulation.asm3.v1` in addition to material balance, ASM1Slim, and ASM1 job types.
- Added independent ASM3 compute/simulation fixtures with 13 ASM3 state variables and 37 ASM3 runtime parameters.
- Core and legacy backend adapters accept `simulation.asm3.v1` while still converting through the existing MaterialBalanceInput runtime model.
- Worker self-check now lists `simulation.asm3.v1`; `run_job` preserves that job type in result/artifact payloads and emits `model_run.model_key=asm3`.
- Updated `tasks/README.md` after finding it conflicted with the existing newest-first `tasks/todo.md` convention.
- Verification:
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`81 passed`).
  - `backend\.venv\Scripts\python -m pytest simulation_core\tests -q` passed (`9 passed`, existing warnings only).
  - `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed (`11 passed`).
  - `cd backend; .venv\Scripts\python -m pytest app\tests\services -q` passed (`26 passed`, existing warnings only).
  - Direct worker run for `asm3_independent.compute_job.v1.json` passed with `job_type=simulation.asm3.v1`, `status=succeeded`, `model_key=asm3`, and `total_steps=11`.
- Remaining scope:
  - `simulation_request.v1`, Go API promotion, Desktop job creation, and Web submit UI still accept only the material-balance submission path.
  - Independent UDM job type remains follow-up work and needs model snapshot / binding fixtures plus parity evidence.

# 2026-05-30 AutoWaterSimu Next ASM1 Independent Worker Job Type TODO

- [x] Re-read ASM1 runtime, contracts, worker, simulation core, and backend adapter context
- [x] Add `simulation.asm1.v1` to executable compute/simulation/result contracts
- [x] Add independent ASM1 fixtures and adapter/worker tests
- [x] Keep Go SimulationRequest, Desktop creation, and frontend submission out of this slice
- [x] Run contract, core, worker, backend adapter, and direct worker validation
- [x] Record findings and commit checkpoint

## Plan

- Introduce `simulation.asm1.v1` only after the completed ASM1Slim pattern.
- Use the existing ASM1 node model branch in the material balance runtime, with 11 state variables and 19 parameters from the runtime model validators.
- Do not claim ASM3 or UDM independent job types in this slice.
- Keep API/UI submission surfaces unchanged until independent model job routing is explicitly designed.

## Review

- `compute_job.v1`, `simulation_input.v1`, and `compute_result.v1` now allow `simulation.asm1.v1` in addition to `simulation.material_balance.v1` and `simulation.asm1slim.v1`.
- Added independent ASM1 compute/simulation fixtures with 11 ASM1 state variables and 19 ASM1 runtime parameters.
- Core and legacy backend adapters accept `simulation.asm1.v1` while still converting through the existing MaterialBalanceInput runtime model.
- Worker self-check now lists `simulation.asm1.v1`; `run_job` preserves that job type in result/artifact payloads and emits `model_run.model_key=asm1`.
- Verification:
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`79 passed`).
  - `backend\.venv\Scripts\python -m pytest simulation_core\tests -q` passed (`8 passed`, existing warnings only).
  - `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed (`10 passed`).
  - `cd backend; .venv\Scripts\python -m pytest app\tests\services -q` passed (`26 passed`, existing warnings only).
  - Direct worker run for `asm1_independent.compute_job.v1.json` passed with `job_type=simulation.asm1.v1`, `status=succeeded`, and `model_key=asm1`.
- Remaining scope:
  - `simulation_request.v1`, Go API promotion, Desktop job creation, and Web submit UI still accept only the material-balance submission path.
  - Independent ASM3 and UDM job types remain follow-up work and need their own fixtures/parity evidence.

# 2026-05-30 AutoWaterSimu Next ASM1Slim Independent Worker Job Type TODO

- [x] Re-read contracts, worker, simulation core, backend adapter, and Phase 5 migration context
- [x] Add `simulation.asm1slim.v1` to executable compute/simulation/result contracts
- [x] Add independent ASM1Slim fixtures and adapter/worker tests
- [x] Keep Go SimulationRequest, Desktop creation, and frontend submission out of this slice
- [x] Run contract, core, worker, backend adapter, and diff validation
- [x] Record findings and commit checkpoint

## Plan

- Introduce only the first independent ASM job type, `simulation.asm1slim.v1`.
- Continue routing execution through the existing material balance runtime because ASM1Slim is already represented as a node model branch there.
- Do not claim ASM1, ASM3, or UDM independent job types until each has fixtures and old-vs-worker parity.
- Do not change `simulation_request.v1`, Go API promotion, Desktop job creation, or Web submit UI in this slice.

## Review

- `compute_job.v1`, `simulation_input.v1`, and `compute_result.v1` now allow `simulation.asm1slim.v1` in addition to `simulation.material_balance.v1`.
- Added independent ASM1Slim compute/simulation fixtures while keeping the previous ASM1Slim model-bound material-balance fixtures.
- Core and legacy backend adapters accept `simulation.asm1slim.v1` and still convert to the existing MaterialBalanceInput runtime model.
- Worker self-check now lists both supported job types; `run_job` executes `simulation.asm1slim.v1`, preserves that job type in result/artifact payloads, and emits `model_run.model_key=asm1slim`.
- `--run-api-once` registration now reports the shared worker capability list instead of the old hardcoded material-balance-only list.
- Verification:
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`77 passed`).
  - `backend\.venv\Scripts\python -m pytest simulation_core\tests -q` passed (`7 passed`, existing warnings only).
  - `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed (`9 passed`).
  - `cd backend; .venv\Scripts\python -m pytest app\tests\services -q` passed (`26 passed`, existing warnings only).
  - Direct worker runs passed for both `asm1slim_minimal.compute_job.v1.json` and `asm1slim_independent.compute_job.v1.json`.
- Remaining scope:
  - `simulation_request.v1`, Go API promotion, Desktop job creation, and Web submit UI still accept only the material-balance submission path.
  - Independent ASM1, ASM3, and UDM job types remain follow-up work and need their own fixtures/parity evidence.

# 2026-05-30 AutoWaterSimu Next ASM/UDM Runtime Binding Adapter TODO

- [x] Re-read PRD/Spec/Development Plan, simulation core, worker, and legacy adapter context
- [x] Preserve ASM/UDM node runtime binding fields through `simulation_input.v1` adapters
- [x] Add ASM1Slim contract fixture and core/worker parity coverage
- [x] Run contract, core, worker, and legacy backend validation
- [x] Record findings and commit checkpoint

## Plan

- Keep `job_type` as `simulation.material_balance.v1` in this slice because contracts currently allow only that job type.
- Treat ASM/UDM node execution as model-bound nodes inside the existing material-balance simulation input.
- Do not invent separate `simulation.asm*.v1` or `simulation.udm.v1` job types until schema semantics and API routing are explicitly designed.

## Review

- Core and legacy backend `simulation_input.v1` adapters now preserve ASM1Slim / ASM1 / ASM3 / UDM node runtime binding fields while keeping the current `simulation.material_balance.v1` job contract.
- Optional model binding fields now distinguish missing fields from explicit empty arrays/objects, so invalid empty parameter arrays are not silently dropped.
- Added ASM1Slim minimal `simulation_input.v1` and `compute_job.v1` fixtures under `contracts/examples/valid/`.
- Worker self-check now advertises model capabilities while supported job type remains `simulation.material_balance.v1`; ASM1Slim runs are audited with `model_key=asm1slim`.
- Added/updated core and worker tests for ASM1Slim fixture execution, backend parity, artifact output, and `model_run.v1` binding.
- Verification:
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`75 passed`).
  - `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed (`8 passed`).
  - `backend\.venv\Scripts\python -m pytest simulation_core\tests -q` passed (`6 passed`, existing warnings only).
  - `cd backend; .venv\Scripts\python -m pytest app\tests\services -q` passed (`26 passed`, existing warnings only).
  - `backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --self-check` passed and reported `asm1slim`, `asm1`, `asm3`, `udm`, and `ode` capabilities.
- Remaining scope:
  - Independent `simulation.asm1.v1`, `simulation.asm1slim.v1`, `simulation.asm3.v1`, and `simulation.udm.v1` job type contracts/handlers remain Phase 5 follow-up work.
  - Full old-vs-worker numerical baseline matrix for ASM1, ASM3, UDM, and Petersen tutorial flows remains follow-up work.

# 2026-05-30 AutoWaterSimu Next Desktop NSIS Installer Runtime TODO

- [x] Re-read README First, Desktop, src-tauri, packaging, scripts, release gate, and Tauri schema context
- [x] Choose Tauri resource bundling for the PyInstaller one-folder sidecar
- [x] Add release overlay config and NSIS installer build script
- [x] Auto-discover packaged worker exe from Tauri resources at app startup
- [x] Strengthen installer smoke to verify installed packaged sidecar and run sidecar smoke
- [x] Run installer build, installed-sidecar smoke, release gate, and diff validation
- [x] Commit checkpoint

## Plan

- Preserve source-mode Desktop worker as the default development path.
- Use `bundle.resources` instead of `externalBin` for the current PyInstaller one-folder sidecar so `_internal` stays adjacent to the exe.
- Keep signing, auto-update, Microsoft Store distribution, and one-file sidecar decisions out of this slice.

## Review

- Added `apps/desktop/src-tauri/tauri.release.conf.json`, which enables NSIS bundling and maps staged `target/release-sidecar/simulation-worker` into installer resources as `simulation-worker`.
- Added `apps/desktop/packaging/build-nsis-installer.ps1`, which stages the generated sidecar directory, runs `npm run tauri -- build --bundles nsis --config src-tauri/tauri.release.conf.json --ci --no-sign`, writes build evidence, and runs installer smoke by default.
- Desktop startup now discovers `simulation-worker/simulation-worker-x86_64-pc-windows-msvc.exe` from Tauri resources and sets `AUTOWATERSIMU_DESKTOP_WORKER_EXE` only when the packaged resource exists and the env var was not already set.
- `smoke-nsis-installer.ps1` now verifies the installed Desktop exe, installed packaged sidecar exe, installed sidecar self-check/minimal job, and best-effort silent uninstall.
- `scripts/release/next-release-gates.ps1` now quotes subprocess arguments so installer paths with spaces are passed intact.
- Added ADR `.ai/decisions/0009-desktop-onedir-sidecar-resource-bundling.md`.
- Verification:
  - `cargo fmt --manifest-path apps\desktop\src-tauri\Cargo.toml` passed.
  - PowerShell parser checks passed for `build-nsis-installer.ps1`, `smoke-nsis-installer.ps1`, and `next-release-gates.ps1`.
  - `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`21 passed`).
  - `cd apps\desktop; npm run build` passed.
  - Packaged-worker Rust smoke with `AUTOWATERSIMU_TEST_PACKAGED_WORKER_EXE` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File apps\desktop\packaging\build-nsis-installer.ps1 -SidecarPath tmp\desktop-packaging\sidecar-20260531010636\dist\simulation-worker\simulation-worker-x86_64-pc-windows-msvc.exe -EvidenceDir tmp\desktop-packaging\nsis-runtime` passed and produced `apps\desktop\src-tauri\target\release\bundle\nsis\AutoWaterSimu Next Desktop_0.1.0_x64-setup.exe`.
  - `tmp\desktop-packaging\nsis-runtime\nsis-installer-smoke.json` status is `passed`; installed packaged sidecar smoke also passed with `packaging_mode=frozen`.
  - `scripts\release\next-release-gates.ps1 -Mode release -SidecarPath tmp\desktop-packaging\sidecar-20260531010636\dist\simulation-worker\simulation-worker-x86_64-pc-windows-msvc.exe -InstallerPath "apps\desktop\src-tauri\target\release\bundle\nsis\AutoWaterSimu Next Desktop_0.1.0_x64-setup.exe" -SkipLong -EvidenceDir tmp\release-evidence\installer-release` passed with status `passed` and `allow_missing_package_artifacts=false`.
- Remaining scope:
  - Signing, auto-update, one-file sidecar vs onedir tradeoff, and wider Windows runner/release artifact publishing remain follow-up work.

# 2026-05-30 AutoWaterSimu Next Desktop Packaged Worker Runtime TODO

- [x] Re-read Desktop, src-tauri, worker, packaging, release gate, and README First context
- [x] Add explicit Desktop runtime launch mode for a packaged worker executable
- [x] Add optional packaged-worker smoke test that uses the generated PyInstaller sidecar
- [x] Update Desktop runtime README context
- [x] Run packaged-worker, Desktop, release gate, and diff validation
- [x] Commit checkpoint

## Plan

- Keep this slice scoped to Desktop Rust/runtime invocation of an already-built worker executable.
- Preserve source-mode worker execution as the default for development and tests.
- Do not enable Tauri `externalBin`, resource bundling, installer generation, signing, or auto-update in this slice.

## Review

- `DesktopRuntime` can now be constructed with an explicit packaged worker executable path, and `default_runtime()` honors `AUTOWATERSIMU_DESKTOP_WORKER_EXE` when set.
- `SourceWorker` now models source and packaged launch modes separately, while keeping source mode as the default `python cli.py` execution path.
- Added an optional Rust smoke test controlled by `AUTOWATERSIMU_TEST_PACKAGED_WORKER_EXE`; with the generated PyInstaller one-folder sidecar it verifies `worker_self_check()` and `packaging_mode=frozen`.
- Updated Desktop README context to document the env vars, validation command, and remaining Tauri/installer work.
- Verification:
  - `cargo fmt --manifest-path apps\desktop\src-tauri\Cargo.toml` passed.
  - `$env:AUTOWATERSIMU_TEST_PACKAGED_WORKER_EXE=(Resolve-Path 'tmp\desktop-packaging\sidecar-20260531010636\dist\simulation-worker\simulation-worker-x86_64-pc-windows-msvc.exe').Path; cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml packaged_worker_exe_smoke_when_env_is_available -- --nocapture; Remove-Item Env:\AUTOWATERSIMU_TEST_PACKAGED_WORKER_EXE` passed.
  - `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`21 passed`).
  - `cd apps\desktop; npm run build` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\release\next-release-gates.ps1 -Mode release -SidecarPath tmp\desktop-packaging\sidecar-20260531010636\dist\simulation-worker\simulation-worker-x86_64-pc-windows-msvc.exe -AllowMissingPackageArtifacts -SkipLong -EvidenceDir tmp\release-evidence\runtime-release` passed as `dry_run_skipped_artifacts`: sidecar passed, installer skipped.
- Remaining scope:
  - Tauri `externalBin`/resource wiring, NSIS artifact generation, installer smoke without allow-missing, signing, and auto-update remain follow-up work.

# 2026-05-30 AutoWaterSimu Next Packaged Sidecar Build TODO

- [x] Re-read worker, simulation core, contracts, Desktop packaging, and release gate context
- [x] Add packaged-mode worker resource root resolution
- [x] Add PyInstaller package-mode entrypoint
- [x] Add Desktop packaged sidecar build script
- [x] Generate a real PyInstaller one-folder sidecar artifact
- [x] Run packaged sidecar self-check and minimal job smoke
- [x] Run source worker, release gate, desktop, and diff validation
- [x] Commit checkpoint

## Plan

- Keep this slice scoped to the Python worker packaged sidecar.
- Do not wire Tauri `externalBin` until the Desktop runtime has an explicit packaged-worker mode.
- Do not build or claim NSIS installer smoke in this slice.

## Review

- `services/simulation-worker/simulation_worker/runner.py` now resolves bundled `contracts/` from PyInstaller `sys._MEIPASS` when frozen, while preserving `AUTOWATERSIMU_WORKER_REPO_ROOT` and source-mode repo root behavior.
- Added `apps/desktop/packaging/build-packaged-sidecar.ps1`, which uses `uv run --project backend --with pyinstaller pyinstaller` to create a PyInstaller one-folder sidecar and rename the executable to `simulation-worker-x86_64-pc-windows-msvc.exe`.
- Added `apps/desktop/packaging/pyinstaller_entrypoint.py` so PyInstaller imports `simulation_worker.cli` as a package instead of executing `cli.py` as a parentless script.
- Updated sidecar smoke script to accept the worker CLI's self-check payload shape and to write compact string evidence for stdout/stderr.
- Verification so far:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File apps\desktop\packaging\build-packaged-sidecar.ps1` passed.
  - Generated artifact: `tmp\desktop-packaging\sidecar-20260531010636\dist\simulation-worker\simulation-worker-x86_64-pc-windows-msvc.exe`.
  - Packaged smoke evidence: `tmp\desktop-packaging\sidecar-20260531010636\packaged-sidecar-smoke.json`, status passed.
  - `backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --self-check` passed in source mode.
  - `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed (`7 passed`).
  - `cd apps\desktop; npm run build` passed.
  - `scripts\release\next-release-gates.ps1 -Mode merge -SkipLong -EvidenceDir tmp\release-evidence\merge` passed.
  - `scripts\release\next-release-gates.ps1 -Mode release -SidecarPath tmp\desktop-packaging\sidecar-20260531010636\dist\simulation-worker\simulation-worker-x86_64-pc-windows-msvc.exe -AllowMissingPackageArtifacts -SkipLong -EvidenceDir tmp\release-evidence\release` passed as `dry_run_skipped_artifacts`: sidecar passed, installer skipped.
  - PowerShell parser check for `apps\desktop\packaging\build-packaged-sidecar.ps1` passed.
  - `git diff --check` passed with LF-to-CRLF warnings only.
- Remaining scope:
  - Tauri `externalBin` wiring, explicit Rust packaged-worker mode, NSIS artifact generation, installer smoke, and signing remain follow-up work.

# 2026-05-30 AutoWaterSimu Next Release Gate Automation TODO

- [x] Re-read release, Desktop, worker, GitHub Actions, and README First context
- [x] Add Desktop packaging contract for packaged sidecar and NSIS installer smoke
- [x] Add packaged sidecar and NSIS installer smoke scripts with machine-readable evidence
- [x] Add repository-level Next merge/release gate orchestration
- [x] Add GitHub Actions workflow entry for Next gates
- [x] Run script, frontend, desktop, and diff validation
- [x] Commit checkpoint

## Plan

- Keep merge gates limited to source-verifiable checks.
- Keep release gates explicit: sidecar/installer artifact paths are required unless a caller knowingly asks for allow-missing dry run.
- Do not enable Tauri `externalBin`, installer bundling, signing, or auto-update without real packaged artifacts.

## Review

- Added repository-level release automation in `scripts/release/next-release-gates.ps1`.
- Added Desktop artifact smoke scripts:
  - `apps/desktop/scripts/smoke-packaged-sidecar.ps1`
  - `apps/desktop/scripts/smoke-nsis-installer.ps1`
- Added Desktop packaging contract docs under `apps/desktop/packaging/README.md`.
- Added `.github/workflows/next-release-gates.yml` for pull request merge gates and manual release/dry-run gates.
- Added ADR `.ai/decisions/0008-release-gate-artifact-boundary.md`.
- Verification:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File apps\desktop\scripts\smoke-packaged-sidecar.ps1 -AllowMissing` passed and wrote skipped evidence.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File apps\desktop\scripts\smoke-nsis-installer.ps1 -AllowMissing` passed and wrote skipped evidence.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\release\next-release-gates.ps1 -Mode merge -SkipLong` passed.
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\release\next-release-gates.ps1 -Mode release -AllowMissingPackageArtifacts -SkipLong` passed as `dry_run_skipped_artifacts`, not as release pass evidence.
  - `cd apps\desktop; npm run build` passed.
- Remaining scope:
  - Build the real packaged sidecar, wire Tauri `externalBin`, produce NSIS installer artifact, and run release mode without `-AllowMissingPackageArtifacts`.

# 2026-05-30 AutoWaterSimu Next Benchmark Run History TODO

- [x] Re-read model governance README, PRD/Spec/Plan, catalog and model_run implementation
- [x] Add `benchmark_run.v1` schema and valid/invalid fixtures
- [x] Add benchmark run PostgreSQL migration, store/service/API, and OpenAPI surface
- [x] Regenerate Compute API frontend client and add service wrapper methods
- [x] Update README/ADR/planning records
- [x] Run Go, contract, frontend, migration, and diff validation
- [x] Commit checkpoint

## Review

- Added `benchmark_run.v1` as an audit contract for completed benchmark executions tied to a catalog benchmark case, default parameter set, model_run, job, metrics, tolerance, and evidence refs.
- Added persistent benchmark run history with record/list/get API endpoints under model governance; recording validates benchmark case status, model_run model/version/parameter hash, and job-scoped evidence refs.
- Added migration `0008_benchmark_runs.*.sql`, OpenAPI updates, generated compute client updates, and `computeJobsService` wrappers.
- Added ADR `.ai/decisions/0007-benchmark-run-history-scope.md` to preserve the no-side-effect boundary: records do not execute benchmarks, change parameter set status, or approve production.
- Verification:
  - `cd apps\api; go test ./...` passed.
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`73 passed`).
  - `cd frontend; npm run generate-compute-client` completed.
  - `cd frontend; npx tsc --noEmit` passed.
  - `cd frontend; npx biome check src\services\computeJobsService.ts` passed.
  - `cd frontend; npm run build` passed with existing Vite warnings only.
  - Temporary Docker PostgreSQL migration up/down smoke passed through `0008`.
  - `git diff --check` passed with LF/CRLF warnings only after stripping generated SDK trailing whitespace.

# 2026-05-30 AutoWaterSimu Next NewSystem Evidence E2E TODO

- [x] Re-read NewSystem/milp evidence README, contracts, PRD/Spec/Plan context
- [x] Add service-level E2E for process_graph simulation check and evidence refs
- [x] Cover simulation_input/process_graph/model_run/evidence_package dereference in one workflow
- [x] Cover result explanation submission using the resolved refs
- [x] Run targeted and full Go API verification
- [x] Run diff validation
- [x] Commit checkpoint

## Review

- Added `TestNewSystemEvidenceReferenceE2E` to exercise a NewSystem-style `simulation_request.v1` through process graph registration, simulation-check job creation, worker completion, risk finding summary exposure, evidence ref dereference, and result explanation submission.
- The test covers `simulation_input:<id>`、`process_graph:<id>`、`model_run:<id>` and generated `evidence_package:<id>` refs in one job-scoped workflow.
- This is regression coverage only; it does not add endpoints, mutate production semantics, or introduce new NewSystem business rules.
- Verification:
  - `cd apps\api; go test ./internal/compute -run TestNewSystemEvidenceReferenceE2E -count=1` passed.
  - `cd apps\api; go test ./...` passed.
  - `git diff --check` passed with LF/CRLF warnings only.

# 2026-05-30 AutoWaterSimu Next Web Evidence Ref Lookup TODO

- [x] Re-read Compute Jobs route README/service boundary and existing evidence UI
- [x] Add job-scoped evidence ref lookup control to Compute Jobs detail
- [x] Keep dereference inside `computeJobsService.resolveEvidenceReference()`
- [x] Update route README context
- [x] Run frontend build and diff validation
- [x] Commit checkpoint

## Review

- Compute Jobs detail now has a read-only `Evidence ref lookup` panel for refs such as `model_run:<id>`、`artifact:<id>`、`job:<id>`、`simulation_input:<id>`、`process_graph:<id>` and `evidence_package:<id>`.
- The route calls the generated-backed service wrapper only; it does not compose evidence payloads or cross-job references in frontend code.
- Lookup state is reset when the selected job changes, and results are displayed only when the response belongs to the selected job.
- Verification so far:
  - `cd frontend; npx tsc --noEmit` passed.
  - `cd frontend; npm run build` passed with existing Vite warnings only.
  - `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx` passed.
  - `git diff --check` passed with LF/CRLF warnings only.

# 2026-05-30 AutoWaterSimu Next ProcessGraph Evidence Ref TODO

- [x] Re-read evidence/risk/NewSystem approval-read context
- [x] Add job-scoped `process_graph:<id>` evidence ref dereference
- [x] Cover registered ProcessGraph simulation-check job evidence ref success/missing cases
- [x] Update API README context
- [x] Run Go verification and diff validation
- [x] Commit checkpoint

## Review

- `GET /api/v1/compute/jobs/{job_id}/evidence-ref?ref=process_graph:<id>` now resolves only when the job payload references that process graph and the registered ProcessGraph record exists.
- The resolver returns the persisted `ProcessGraphRecord`; missing or cross-job refs still return 404.
- This is read-only approval/evidence plumbing only; it does not mutate process graphs, jobs, evidence packages, or production state.
- Verification:
  - `cd apps\api; go test ./...` passed.
  - `git diff --check` passed with LF/CRLF warnings only.

# 2026-05-30 AutoWaterSimu Next Result Explanation Workflow TODO

- [x] Re-read PRD/Spec/Development Plan and existing Agent/result explanation context
- [x] Define minimal no-LLM result explanation workflow boundary
- [x] Add persisted submit/review/publish API and PostgreSQL migration
- [x] Add job-scoped evidence ref resolution for generated evidence package refs
- [x] Update OpenAPI, generated compute client, frontend service wrapper, README, and ADR records
- [x] Run final frontend build, migration smoke, and diff validation
- [x] Commit checkpoint

## Review

- Added ADR `.ai/decisions/0006-result-explanation-workflow-scope.md`, fixing result explanations as externally generated, evidence-backed audit metadata.
- Added `result_explanations` metadata table migration and Go store/service/http support for submit, review, read, and publish.
- Submit validates `result_explanation.v1`, requires the target job to have a result, enforces path `job_id`, and checks all top-level/statement `evidence_refs` resolve inside the same job.
- `publish` requires prior `approved` review; neither review nor publish generates explanation text, executes Agent code, or marks production approval complete.
- Updated OpenAPI and regenerated `frontend/src/client/compute`; `computeJobsService` now exposes submit/get/review/publish wrappers.
- Verification:
  - `cd apps\api; go test ./...` passed.
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`69 passed`).
  - `cd frontend; npm run generate-compute-client` completed.
  - `cd frontend; npx tsc --noEmit` passed.
  - `cd frontend; npm run build` passed with existing Vite warnings only.
  - Temporary Docker PostgreSQL migration smoke passed for `0001`-`0007` up/down with `COMPUTE_API_MIGRATION_DOWN_SMOKE=true`.
  - `git diff --check` passed with LF/CRLF warnings only.

# 2026-05-30 AutoWaterSimu Next Constraint Application Plan TODO

- [x] Re-read README First context for contracts, Go Compute API, OpenAPI, and frontend service wrappers
- [x] Define safe constraint draft application policy and record ADR
- [x] Add approved constraint confirmation fixture and read-only application plan endpoint
- [x] Update OpenAPI, generated compute client, frontend service wrapper, and README contracts
- [x] Run Go, contract, frontend type/build, and diff validation
- [x] Record review notes and create a checkpoint commit

## Review

- Added ADR `.ai/decisions/0005-constraint-draft-application-policy.md`, fixing constraint draft application as advisory-only metadata.
- `GET /api/v1/contracts/confirmations/{confirmation_id}/constraint-application-plan` now requires `job:read`, only accepts approved `constraint_draft.v1` confirmations, and returns `would_create_job=false` / `would_modify_target=false`.
- Added a valid constraint draft confirmation fixture and Go regression coverage for success, wrong draft type, and worker-token rejection.
- Updated OpenAPI, regenerated `frontend/src/client/compute`, and added `computeJobsService.getConstraintApplicationPlan()`.
- Verification:
  - `cd apps\api; go test ./...` passed.
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`69 passed`).
  - `cd frontend; npm run generate-compute-client` completed.
  - `cd frontend; npx tsc --noEmit` passed.
  - `cd frontend; npm run build` passed with existing Vite warnings only.

# 2026-04-03 SUMO Petersen Matrix Pipeline TODO

- [x] Inspect current SUMO matrix conversion assets and preserve existing behavior where practical
- [x] Add a reusable normalization/tagging/export module for SUMO Petersen matrices
- [x] Add default component alias registry and decomposition profile configs
- [x] Upgrade `docs/peterson_matrix/sumo_matrix_to_platform_xlsx.py` to support pipeline export mode
- [x] Add targeted tests for expression expansion, tagging, slicing, and workbook export
- [x] Run the new pipeline on `docs/peterson_matrix/sumo4n.xlsx` and validate generated outputs
- [x] Run targeted verification and record review notes

## Review

- Added `docs/peterson_matrix/sumo_matrix_pipeline.py` as the new reusable core module. It now owns SUMO function expansion, identifier normalization, process catalog building, multi-tag inference, focal-variable extraction, slice matching, workbook export, catalog/manifest emission, and markdown reporting.
- Added default configs `docs/peterson_matrix/component_alias_registry.json` and `docs/peterson_matrix/decomposition_profile.json`. The alias registry normalizes SUMO comma-style names to platform-safe canonical names, while the profile emits six default slices including heterotroph carbon, autotroph nitrogen, phosphorus, two-step nitrification, two-step digestion, and four-step nitrogen conversion.
- Replaced `docs/peterson_matrix/sumo_matrix_to_platform_xlsx.py` with a compatibility wrapper that now supports both legacy single-workbook export via `--output` and pipeline mode via `--output-dir`, plus `--emit-catalog`, `--emit-markdown`, `--component-alias-map`, and `--decomposition-profile`.
- Added `docs/peterson_matrix/tests/test_sumo_matrix_pipeline.py` covering SUMO token expansion, multi-axis tagging, slice matching, and a real-file pipeline integration run against `sumo4n.xlsx`.
- Verified the real pipeline command:
  - `python docs\peterson_matrix\sumo_matrix_to_platform_xlsx.py --source docs\peterson_matrix\sumo4n.xlsx --source-sheet Sheet1 --output-dir tmp\sumo_pipeline --emit-catalog --emit-markdown`
  - `python docs\peterson_matrix\sumo_matrix_to_platform_xlsx.py --source docs\peterson_matrix\sumo4n.xlsx --source-sheet Sheet1 --output tmp\sumo_single.xlsx`
- Verification:
  - `python -m compileall docs\peterson_matrix\sumo_matrix_pipeline.py docs\peterson_matrix\sumo_matrix_to_platform_xlsx.py docs\peterson_matrix\tests\test_sumo_matrix_pipeline.py` passed.
  - `python -m pytest docs\peterson_matrix\tests\test_sumo_matrix_pipeline.py -q` passed (`4 passed`).
- Residual boundary:
  - The new pipeline makes `rate_expr` platform-safe and includes rate focal vars in slice columns, but some exported SUMO stoichiometric expressions still reference component state variables such as `XCASTO` or `XPHA_PAO`. Current backend UDM validation flags those as `STOICH_COMPONENT_REF`, so the slice manifest currently serves as a split/export asset for downstream hybrid work rather than a fully UDM-valid end state.

# 2026-03-13 UDM Label / Tutorial Simulation Consistency TODO

- [x] Inspect relevant UDM schema, editor, runtime display, tutorial preset, and analysis panels
- [x] Add backend `UDMParameterDefinition.label` support and update targeted backend tests
- [x] Regenerate frontend OpenAPI client for the new parameter label field
- [x] Extend UDM editor parameter rows with `label` input plus identifier validation/help text for `name`
- [x] Add a shared UDM runtime label resolver and switch UDM runtime/analysis displays from `name` to `label`
- [x] Add tutorial guide tab, widen tutorial inspector layout, and refine UDM calculation panel layout
- [x] Fix tutorial default-flow input concentration precedence and align chapter-7 `S_NO` with the seed template
- [x] Harden spatial profile / time-series layout so the line chart renders reliably in the inspector
- [x] Run frontend TypeScript/build checks and targeted backend pytest
- [x] Record review notes

## Review

- Backend `UDMParameterDefinition` now supports optional `label`, and targeted API/runtime tests were updated to assert label round-trip plus chapter-7 `S_NO=10.0`.
- Regenerated the frontend OpenAPI client and patched the generated `UDMParameterDefinition` type so the editor/runtime can consume `parameters[].label`.
- `UDMModelEditorForm` now exposes a parameter `label` column, persists it in the draft payload, highlights invalid identifier inputs, blocks save on duplicate/conflicting component/parameter names, and requires process-referenced parameters to be defined in the parameter table.
- Added `frontend/src/utils/udmRuntimeDisplay.ts` and threaded its label maps through UDM property/calculation/results/analysis surfaces so display uses `label` first and falls back to canonical `name`.
- `/udm` tutorial mode now has separate `tutorialGuide` and `tutorialResults` tabs, and `FlowLayout` accepts a route-level base inspector width so tutorial inspectors render about 30% wider while still preserving edge time-segment expansion.
- Tutorial default-flow generation now only applies explicit input overrides, and `frontend/src/data/tutorialFlowPresets.ts` aligns chapter-7 `S_NO` with the backend seed template at `10`.
- Spatial/edge analysis panels and charts now add `minW={0}` and safer width plumbing so the line chart can re-measure and render in compressed inspector layouts.
- Verification:
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npx vite build` passed. Build emitted existing chunk-size / dynamic-import warnings only.
- `cd backend; .venv\Scripts\python -m pytest app/tests/api/routes/udm_models_validate_test.py app/tests/udm_tutorial_default_flow_runtime_test.py` passed (`6 passed`).

# 2026-03-12 UDM Tutorial Canvas Consistency Fix TODO

- [x] Inspect relevant UDM tutorial canvas files and preserve unrelated in-flight changes
- [x] Add a shared UDM node-binding helper for generated/default bound node data
- [x] Fix generated UDM default-flow edge handles and normalize legacy imported UDM edges
- [x] Auto-bind newly dragged UDM nodes when the current UDM canvas has exactly one bound model
- [x] Clarify UDM results-table boundary semantics for input/output nodes
- [x] Add backend regression tests proving tutorial default-flow input/output nodes stay fixed
- [x] Run frontend TypeScript check and targeted backend pytest
- [x] Record review notes

## Review

- Added `frontend/src/utils/udmNodeBinding.ts` to centralize UDM-bound node construction and bound-model extraction; default generated reactor nodes and toolbar-created UDM nodes now use the same binding payload shape.
- `UDMModelEditorForm` now persists explicit left/right edge handles in the generated default flowchart, so `Input -> UDM -> Output` renders from right to left handles instead of top handles.
- `/udm` now auto-binds a newly dragged UDM node only when the current canvas has exactly one unique bound UDM model; empty or multi-model canvases still create an unbound node.
- `createModelFlowStore.importFlowData()` now backfills missing left/right handles for legacy UDM `input -> udm` and `udm -> output` edges without overwriting already-saved handles.
- `ResultsPanel` now labels UDM input/output rows as fixed boundaries and adds an explanatory note that only reactor nodes participate in dynamic solving.
- Added `backend/app/tests/udm_tutorial_default_flow_runtime_test.py` to verify chapter-2 and chapter-7 style default UDM flows keep input/output node series unchanged while the reactor node changes, with `timeSegments=[]` explicitly asserted.
- Verification:
  - `cd frontend; npx tsc --noEmit` passed.
  - `cd backend; .venv\Scripts\python -m pytest app/tests/udm_tutorial_default_flow_runtime_test.py` passed (`2 passed`).
  - Manual browser interaction for drag-drop and legacy-flow visual confirmation was not run in this environment.

# 2026-03-08 PDF Summary TODO

- [x] Gather repo evidence for summary content
- [x] Generate one-page Chinese PDF in `output/pdf/`
- [x] Render-check the PDF and confirm single-page layout
- [x] Record review notes and deliverable path

### Review

- Evidence used: README, README_zh, frontend routes/services/stores, backend app entrypoints, API router, service layer.
- Output: `output/pdf/app-summary-zh.pdf`
- Verification: generated PDF successfully, confirmed 1 page with `pypdf`, rendered page 1 to `tmp/pdfs/app-summary-zh-page1.png` and visually checked no overflow.

# Epic 4 Implementation TODO

- [x] Phase 0: 创建 `udmTutorialFlowStore`、`tutorialFlowPresets`、`tutorialInsights` 数据层
- [x] Phase 0: `/udm` 路由添加 `lessonKey` search param，mount 时同步到 store
- [x] Phase 0: 编辑器导航时传递 `lessonKey`（udmModelEditor.tsx 1 行改动）
- [x] Phase 1: `buildDefaultFlowData` 添加教学预设覆盖（进水浓度、reactor 体积、solver 参数）
- [x] Phase 1: SimulationPanel 自动加载预设 solver 参数 + 仿真完成时记录教学进度
- [x] Phase 2: 新建 `RecommendedChartsPanel`（推荐观测变量 + TimeSeriesChart）
- [x] Phase 2: 新建 `TutorialResultsPanel` 容器（编排推荐曲线、解释卡、爆炸检测、完成卡片）
- [x] Phase 2: 在 `/udm` inspector config 中条件注入第 4 个教程 tab
- [x] Phase 3: 新建 `ResultInterpretationCard`（可折叠的教学解释卡列表）
- [x] Phase 4: 新建 `ExplosionDebugChecklist`（NaN/Inf/极端值检测 + 排错清单）
- [x] Phase 5: `TutorialResultsPanel` 添加完成检测 + 祝贺卡片 + 下一章导航
- [x] Phase 6: chapter-7 移除 `comingSoon`，补充 processTeaching（aerobic_growth/decay/nitrification）
- [x] Phase 7: zh.ts + en.ts 添加所有教学结果页 i18n keys
- [x] Phase 8: TypeScript 编译通过、Biome lint 通过、Vite 打包通过

## Review

- `cd frontend; npx tsc -p tsconfig.build.json --noEmit` 通过
- `cd frontend; npx vite build` 成功，TutorialResultsPanel 正确 code-split（7.58 kB）
- Biome lint：新增/修改文件全部通过；udm.tsx 存在 pre-existing 的 exhaustive-deps 警告（已有代码风格）

## Archived

# Epic 2 Implementation TODO

- [x] 初始化本轮 Epic 2 实施计划
- [x] 补齐后端教程 seed templates 与 `meta.learning`
- [x] 扩展 UDM validation issue `location` 并补后端测试
- [x] 扩展前端 tutorial lesson data 与 progress store
- [x] 修复 `/udmModels` 教程入口的真实模型创建/恢复流程
- [x] 实现 guided editor 基础框架（mode、stepper、guide panel、step visibility）
- [x] 集成 recipe bar、arrow matrix、process teaching popover
- [x] 将 validation 跳转与 tutorial progress 完成判定联动
- [x] 新增 `/ai-deep-research` 占位路由并更新前端路由树
- [x] 重新生成 OpenAPI client
- [x] 运行验证（后端测试、前端类型检查）
- [x] 更新本轮工作记录

## Notes

- 目标：从教程卡片进入真实章节模型，进入可恢复的 guided editor；Expert 模式保持不变。
- 本轮顺手修复当前阻塞 `npx tsc --noEmit` 的 `/ai-deep-research` 路由缺失问题。
- 额外处理：`openapi-ts` 未生成 hybrid config SDK 和 validation `location` 字段，已在前端服务层与生成类型层做兼容补齐，保证当前仓库可编译可运行。

## Review

- 前端：`cd frontend; npx tsc --noEmit` 通过。
- 后端：`$env:DEBUG='false'; cd backend; .venv\Scripts\python -m pytest app/tests/udm_tutorial_validation_test.py` 通过，3 个测试全部成功。
- 剩余注意：pytest 仍会打印既有的 Pydantic/FastAPI deprecation warning，本轮未处理。

## Archived

### ch07 Review TODO

- [x] 初始化本轮 ch07 review 计划
- [x] 阅读 ch07 原始审查建议与执行报告
- [x] 核对相关后端代码改动与行为差异
- [x] 运行针对性验证并确认是否存在回归
- [x] 输出 ch07 review 报告
- [x] 更新本轮工作记录

### Review

- 代码层面未发现阻断性功能回归。
- 执行报告对 B-4 的描述与真实 diff 不一致：实际存在错误消息英文化改动，不应写成 `NO ACTION`。
- `build_hybrid_runtime_info` 的定向行为用例 6/6 通过。
- `compile_expression` 的深度限制已生效，但当前仅有手工验证，建议补边界自动化测试。

### Epic 03 Review TODO

- [x] 初始化 Epic 03 review 计划
- [x] 阅读 Epic 03 开发计划与 Implementation Complete 文档
- [x] 核对后端连续性检查服务、validate 接口与模板元数据
- [x] 核对前端编辑器集成、ContinuityCheckPanel、i18n 与生成客户端
- [x] 运行针对性验证（pytest、TypeScript、最小复现脚本）
- [x] 输出并保存 Epic 03 review 报告

### Review

- 已保存报告：`tasks/Epic_03_Petersen_连续性检查_review_report_2026-03-08.md`
- 主要发现 3 项：
- 真实编辑器 payload 中的符号 `stoich_expr` 会因前端写入 `stoich=0` 而被后端连续性检查误判为 0，产生假阳性 `pass`
- `continuityProfiles` 已写入模板与 lesson，但 validate 与前端展示均未消费，chapter-3 实际返回 `ALK/COD/N`
- `validation_mode='strict'` 时 continuity item 虽为 `error`，但顶层 `ok/errors` 不会失败
- 验证结果：
- `cd backend; .venv\Scripts\python -m pytest app/tests/services/test_petersen_continuity.py` 通过，`14 passed`
- `cd frontend; npx tsc --noEmit` 通过
- 额外最小复现脚本已确认上述 3 个问题均可稳定复现

### Epic 03 Fix TODO

- [x] 修复后端 continuity 对 `stoich_expr` 的优先求值逻辑
- [x] 让 `continuityProfiles` 在 validate 与前端展示中生效
- [x] 补齐 `validation_mode='strict'` 的顶层失败语义
- [x] 修复前端 `buildDraft()` 对非数字 stoich 的错误写入
- [x] 补充 continuity 服务测试与 validate 路由测试
- [x] 运行后端 pytest 与前端 TypeScript 类型检查
- [x] 更新本轮工作记录

### Review

- continuity 服务现在会优先求值 `stoich_expr`，不再把前端占位 `stoich=0` 当成真实系数使用。
- `meta.learning.continuityProfiles` 已接入后端 validate 和前端面板过滤，chapter-3 只会展示 `COD/N`。
- `validation_mode='strict'` 时，continuity `error` 会提升为顶层 `CONTINUITY_IMBALANCE`，并使 `ok=false`。
- 前端 `jumpToIssue()` 已对 `section='stoich'` 且无 `componentName` 的错误做专门跳转，strict continuity 错误会落到 stoich 区域。
- 验证结果：
- `cd backend; .venv\Scripts\python -m pytest app/tests/services/test_petersen_continuity.py app/tests/api/routes/test_udm_models_validate.py app/tests/udm_tutorial_validation_test.py` 通过，`23 passed`
- `cd frontend; npx tsc --noEmit` 通过

### Epic 04 Review TODO

- [x] 初始化 Epic 04 review 计划
- [x] 阅读 Epic 04 开发计划与 Implementation Complete 文档
- [x] 核对编辑器生成流程图、/udm 路由、教程结果页与进度 store
- [x] 运行前端类型检查与生产构建验证
- [x] 输出并保存 Epic 04 review 报告

### Review

- 已保存报告：`tasks/Epic_04_一键仿真闭环与教学型结果页_review_report_2026-03-08.md`
- 主要发现 3 项：
- `/udm` 路由没有携带 `flowchartId`，刷新后无法回载刚生成的流程图，闭环不可恢复
- 结果页完成卡片会被 Epic 02 提前写入的 `completedLessons` 吞掉，标准成功路径下通常只会显示”已完成”
- `simulationRanAt` 在”仅生成流程图”时就被写入，和”真实仿真成功”混用了同一进度字段
- 验证结果：
- `cd frontend; npx tsc --noEmit` 通过
- `cd frontend; npx vite build` 通过

# Epic 05 Implementation TODO

- [x] Phase 1: 补齐 Chapter 1-3 Flow Presets（tutorialFlowPresets.ts 新增 3 个 preset）
- [x] Phase 1: 补齐 Chapter 1-3 Insights（tutorialInsights.ts 新增 3 个 insight set，共 8 条 insight）
- [x] Phase 1: 补齐 i18n 键（zh.ts + en.ts 各新增 8 个 insight 的 title+body 翻译）
- [x] Phase 2: 模板端到端验证测试（4 个 petersen-chapter 模板 validate_udm_definition → ok=True）
- [x] Phase 2: 模板连续性回归测试（chapter-3 COD/N，chapter-7 COD/N/ALK 关键过程 pass）
- [x] Phase 2: ASM1Slim 连续性专项测试（5 个用例覆盖各过程 × 各维度）
- [x] Phase 3: 3 个数据文件顶部添加文档注释（用途、扩展步骤、关联关系）

## Review

- 前端：`cd frontend; npx tsc -p tsconfig.build.json --noEmit` 通过
- 前端：`cd frontend; npx vite build` 通过（TutorialResultsPanel code-split 正常）
- 后端：`cd backend; uv run pytest app/tests/udm_tutorial_validation_test.py app/tests/services/test_petersen_continuity.py -v` — 32 passed
- 注意：ASM1slim 是简化经验模型，aerobic_cod_removal/denitrification 的 COD 维度设计上不完全守恒；测试已正确反映这一特性
- chapter-7 (ASM1) 的 heterotrophic/autotrophic growth/decay 在 ALK 和部分 N 维度存在已知不平衡；测试仅断言已知平衡的关键过程

# 2026-03-10 Docker Database Setup TODO

- [x] Inspect current Docker and database configuration
- [x] Update local database config to use `autowatersimu`
- [x] Start PostgreSQL in Docker Desktop on Windows
- [x] Verify the `autowatersimu` database exists
- [x] Record review notes

## Review

- Updated local Docker database name from the previous value to `autowatersimu` in `.env`, `docker-compose.local.yml`, and `backend/scripts/init-db.sql`.
- Started PostgreSQL with `docker compose -f docker-compose.local.yml up -d postgres`.
- Verified the container `autowatersimu_postgres_local` is healthy and confirmed the database exists with `psql`.

# 2026-03-10 UDM Tutorial Panel Stability Fix TODO

- [x] Inspect `/_layout/udm` tutorial panel, inspector layout, and chart container implementation
- [x] Remove lazy tutorial panel loading that can suspend during synchronous input
- [x] Harden inspector and tutorial chart containers against zero-width layout states
- [x] Run frontend type check and production build
- [x] Record review notes

## Review

- Replaced the lazy tutorial results panel import in `/_layout/udm` with a direct import to avoid synchronous-input suspense failures.
- Added `minW={0}` and stable tab content sizing in the flow inspector so tutorial chart content can shrink safely inside the inspector panel.
- Added explicit width/height guards around the tutorial chart container and delayed `ResponsiveContainer` rendering until the measured size is positive.
- Verification: `cd frontend; npx tsc --noEmit` passed, and `cd frontend; npx vite build` passed.

# 2026-03-10 UDM/Hybrid/Tutorial i18n Fix TODO

- [ ] Audit current UDM/Hybrid/tutorial i18n surfaces and preserve unrelated user changes
- [ ] Add tutorial localization resolver for lesson/model/component/process/parameter display aliases
- [ ] Patch `en.ts` and `zh.ts` for UDM/Hybrid/tutorial keys and targeted mojibake in affected surfaces
- [ ] Wire localized aliases into UDM editor tables, arrow matrix, tutorial charts, model library, hybrid setup, and UDM property display
- [ ] Clean backend tutorial/seed template names and descriptions that leak mojibake or non-localized placeholders
- [ ] Run frontend type check and targeted backend tutorial/UDM tests
- [ ] Record review notes

## Review

- Pending.

# 2026-03-30 WaterTAP Calculator HTML Preview TODO

- [x] Inspect current frontend static asset structure and confirm preview-page landing path
- [x] Record the task context in planning/progress files without disturbing unrelated repo work
- [x] Create a single-file Chinese HTML preview page under `frontend/public/previews/`
- [x] Implement 5 WaterTAP-inspired quick calculators with standalone JS functions
- [x] Add common-case and edge-case presets for each calculator
- [x] Add Chinese docs sections for usage, assumptions, limits, and WaterTAP model mapping
- [x] Run frontend validation (`npx tsc --noEmit`, `npm run build`) and record results
- [x] Update review notes and delivery path

## Review

- Delivered preview page: `frontend/public/previews/watertap-calculators-preview.html`
- Access path after running frontend: `/previews/watertap-calculators-preview.html`
- Included calculators: RO, NF, Ion Exchange, GAC, UV/AOP
- Each calculator now includes Chinese inputs/results/intermediates, preset buttons, docs guidance, warnings, and WaterTAP model mapping
- Verification:
- `cd frontend; npx tsc --noEmit` passed
- `cd frontend; npm run build` passed
- Built output contains `frontend/dist/previews/watertap-calculators-preview.html`

# 2026-03-30 WaterTAP RO/NF Module Report TODO

- [x] Inspect WaterTAP RO/NF official docs and source files
- [x] Summarize RO module family (`base + 0D + 1D`) in Chinese
- [x] Summarize NF module family (`0D + DSPM-DE 0D`) in Chinese
- [x] Write a detailed report covering principles, calculation flow, and algorithm details
- [x] Save the report under `tasks/`

## Review

- Delivered report: `tasks/WaterTAP_RO_NF_计算模块原理与算法细节报告_2026-03-30.md`
- Scope:
- RO shared architecture and 0D/1D relationship
- NF simplified 0D model
- NF DSPM-DE mechanistic model
- Focus:
- Physical principles
- Calculation workflow
- Initialization and solver behavior
- Algorithm details and frontend suitability boundaries

# 2026-03-12 Petersen Tutorial i18n/UI Refinement TODO

- [x] Inspect current UDM tutorial editor WIP and preserve unrelated in-flight changes
- [x] Add localized/manual source tracking for tutorial process names and component descriptions
- [x] Keep canonical process names for save/validation/jump logic while rendering localized process labels in the UI
- [x] Finalize arrow matrix single-line localized process labels with red/green arrow indicators
- [x] Remove per-row process info icon rendering from the process table
- [x] Run frontend TypeScript type check
- [x] Record review notes

## Review

- Tutorial process rows now keep canonical names for save/jump logic while rendering language-aware labels from i18n; user-typed display overrides are kept local to the current session.
- Tutorial component description cells now distinguish localized prefill from manual edits; saved tutorial notes stay language-aware because existing zh/en alias text is recognized on reload.
- Arrow matrix process names now render in a single line and stoich directions use direct red/green arrow text instead of textual badges.
- Verification: `cd frontend; npx tsc --noEmit` passed.

# 2026-03-12 Petersen Tutorial Docs + Page Content TODO

- [x] Inspect current tutorial page/content surfaces and preserve unrelated changes
- [x] Add tutorial overview/content data structures for homepage and lesson summaries
- [x] Integrate overview and lesson summary content into `/petersen-tutorial` and lesson cards
- [x] Extend tutorial guide/results surfaces to consume richer documentation excerpts
- [x] Write the 3 Petersen tutorial documents under `tasks/`
- [x] Run frontend TypeScript type check
- [x] Update review notes with delivered files and verification

## Review

- Added `frontend/src/data/tutorialOverview.ts` and `frontend/src/data/tutorialContent.ts` as the new content-layer source for homepage overview blocks and localized tutorial excerpts.
- Extended `tutorialLessons.ts` with chapter summaries, entry highlights, step-level extended guide notes, and continuity panel reading notes; extended `tutorialInsights.ts` with lesson takeaways for result interpretation.
- Integrated the new content into the real tutorial surfaces:
  - `/petersen-tutorial` now renders a structured overview panel above the lesson cards.
  - `TutorialLessonCard` now shows per-chapter summary and highlights.
  - `ChapterGuideCard` and `TutorialGuidePanel` now surface richer lesson/step excerpts.
  - `ContinuityCheckPanel` now supports tutorial reading notes from the lesson config.
  - `ResultInterpretationCard` now shows lesson takeaways before the insight cards.
- Delivered the 3 requested documents:
  - `tasks/AutoWaterSimu_Petersen_教程说明.md`
  - `tasks/AutoWaterSimu_Petersen_教程文档.md`
  - `tasks/AutoWaterSimu_Petersen_教程页面集成执行方案.md`
- Verification:
  - `cd frontend; npx tsc --noEmit` passed.
  - `cd frontend; npx vite build` passed.
  - Manual browser smoke test was not run in this environment.

# 2026-05-25 AutoWaterSimu Next Governance Docs TODO

- [x] Review the three AutoWaterSimu Next docs and preserve their existing product/architecture intent
- [x] Add P0/P1/P2 scope control and decision table to the PRD
- [x] Add implementation-grade governance rules to the Technical Spec
- [x] Add phase tasks, gates, and acceptance checks to the Development Plan
- [x] Verify cross-document naming and scope consistency
- [x] Record review notes

## Review

- Updated the PRD with P0/P1/P2 scope control, reserved contracts, API behavior requirements, Desktop support/sandbox expectations, and release risk controls.
- Updated the Technical Spec with canonical schema naming, `contract_error.v1`, reserved governance contracts, idempotency/pagination semantics, worker lease rules, artifact lifecycle, numerical reproducibility, security, testing, and release gates.
- Updated the Development Plan with concrete phase tasks and acceptance checks for governance, support bundles, packaging smoke, client generation, migrations, and legacy adapter work.
- Verification:
- `rg` consistency checks found no active `schema_version` examples using kebab-case names.
- `git diff --check` passed for the touched docs; PowerShell reported only the existing LF/CRLF normalization warning for `tasks/todo.md`.

# 2026-05-25 README First Branch Initialization TODO

- [x] Create branch `codex/autowatersimu-next-rebuild` while preserving current working tree changes
- [x] Add `README_First.md` from the provided attachment
- [x] Make attached `AGENTS.md` the main protocol and merge AutoWaterSimu-specific rules
- [x] Create recommended Next directories with README First context files
- [x] Add `.ai/changes/` and `.ai/decisions/` records
- [x] Update root, backend, frontend, docs, rebuild, and tasks README files
- [x] Run structure and markdown consistency checks

## Review

- Created branch `codex/autowatersimu-next-rebuild`.
- Added README First protocol files and the new AutoWaterSimu Next monorepo skeleton.
- Added README files for new and existing key directories so future work can follow AGENTS.md -> README_First.md -> root README -> directory README.
- Recorded this initialization in `.ai/changes/2026-05-25.md` and `.ai/decisions/0001-readme-first-and-next-monorepo.md`.
- Verification:
- Structure check and README First keyword search were run.
- `git diff --check` was run; no whitespace errors were reported beyond the existing LF/CRLF warning for `tasks/todo.md`.

# 2026-05-25 AutoWaterSimu Next Phase 0+1 TODO

- [x] Fix ASM1 and UDM validate response fields
- [x] Replace ASM1/ASM1Slim/ASM3 flowchart route `print` debugging with structured logging
- [x] Mark existing long-running calculate endpoints as legacy baseline
- [x] Add P0 and reserved contract schemas under `contracts/`
- [x] Add valid / invalid contract examples
- [x] Add contract schema tests
- [x] Add backend validate response and no-print regression tests
- [x] Add backend `jsonschema` dev dependency and update lockfile
- [x] Run backend route/static tests
- [x] Run contract tests
- [x] Run backend core regression tests
- [x] Run frontend TypeScript check
- [x] Run `git diff --check`
- [x] Update `.ai/changes/2026-05-25.md` and record review notes

## Review

- Fixed ASM1 and UDM validate responses to return `estimated_memory_mb` and `estimated_time_seconds`, matching `MaterialBalanceValidationResponse`.
- Replaced ASM1/ASM1Slim/ASM3 flowchart route `print(...)` debugging with module loggers that do not emit complete `flow_data`.
- Marked existing material balance, ASM1, and UDM calculate entrypoints as legacy baseline paths while preserving URLs, payloads, and response models.
- Added versioned JSON Schema contracts, valid examples, invalid fixtures, and schema tests under `contracts/`.
- Added `jsonschema>=4,<5` as a backend dev dependency and updated `backend/uv.lock`.
- Verification so far:
  - `cd backend; .venv\Scripts\python -m pytest app/tests/api/routes/test_asm_udm_validate_response.py app/tests/api/routes/test_flowchart_routes_no_print.py -q` passed (`5 passed`).
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`35 passed`).
  - `cd backend; .venv\Scripts\python -m pytest app/tests/time_segment_validation_test.py app/tests/material_balance_segment_overrides_test.py app/tests/hybrid_udm_validation_test.py app/tests/udm_engine_variable_binding_test.py -q` passed (`17 passed`).
  - `cd frontend; npx tsc --noEmit` passed.
  - `git diff --check` passed; Git reported only LF-to-CRLF normalization warnings for touched text files.
- Notes:
  - The route field test avoids database/auth coupling by calling the validate route functions directly with a minimal user object.
  - At that time, Pydantic/FastAPI deprecation and protected namespace warnings were outside Phase 0+1 scope; protected namespace and v1 validator warnings were later cleaned in the 2026-05-31 cleanup entries above.

# 2026-05-26 AutoWaterSimu Next Phase 1B TODO

- [x] Add pure Python contract transform package under `contracts/python/`
- [x] Implement `canvas_graph_to_process_graph`, `validate_process_graph`, `process_graph_to_simulation_input`, and `build_contract_error`
- [x] Add backend `simulation_input.v1` to `MaterialBalanceInput` adapter
- [x] Update minimal compute job fixture to embed full `simulation_input.v1`
- [x] Add transform valid and invalid fixtures/tests
- [x] Add backend adapter execution baseline tests against `MaterialBalanceCalculator`
- [x] Add frontend TypeScript transform prototype under `frontend/src/contracts/`
- [x] Run contract tests
- [x] Run backend core regression tests
- [x] Run frontend TypeScript check
- [x] Run `git diff --check`
- [x] Update `.ai/changes/2026-05-26.md` and record review notes

## Review

- Added `contracts/python/autowatersimu_contracts` as a pure dict transform package with CanvasGraph, ProcessGraph, SimulationInput, and contract error helpers.
- Updated the minimal compute job fixture so `payload` embeds a complete `simulation_input.v1` rather than a partial reference-like object.
- Added transform invalid fixtures for duplicate node IDs, unknown edge nodes, missing reactor volume, and missing component schema.
- Added `backend/app/services/simulation_input_adapter.py` to adapt `simulation_input.v1` into the existing legacy `MaterialBalanceInput` model.
- Added backend adapter tests proving component order, default `{a,b}` behavior, missing reactor volume failure, and `MaterialBalanceCalculator` execution parity against a direct baseline.
- Added `frontend/src/contracts` TypeScript prototype with the same transform concepts, without wiring it into UI or legacy stores.
- Verification:
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`42 passed`).
  - `cd backend; .venv\Scripts\python -m pytest app/tests/services/test_simulation_input_adapter.py -q` passed (`3 passed`).
  - `cd backend; .venv\Scripts\python -m pytest app/tests/time_segment_validation_test.py app/tests/material_balance_segment_overrides_test.py app/tests/hybrid_udm_validation_test.py app/tests/udm_engine_variable_binding_test.py -q` passed (`17 passed`).
  - `cd frontend; npx tsc --noEmit` passed.
  - `git diff --check` passed with only LF-to-CRLF normalization warnings.
- Notes:
  - Phase 1B still only supports `simulation.material_balance.v1`.
  - No legacy FastAPI routes, OpenAPI client, worker, Go API, or Tauri files were changed.

# 2026-05-26 AutoWaterSimu Next Phase 1B Review Fix + Phase 2A/3A TODO

- [x] Patch Phase 1B transform review findings for legacy top-level fields, edge transform parity, time segments, and adapter validation wrapping
- [x] Add contract and adapter regression tests for the review findings
- [x] Add Phase 2A Python simulation worker CLI with self-check, run-job, artifact output, and stdio JSON-RPC smoke protocol
- [x] Add worker CLI tests for self-check, success, invalid job, artifact checksum, and stdout JSON parsing
- [x] Add Phase 3A Desktop scaffold with Rust command placeholders and SQLite migration draft
- [x] Add Rust tests for migration/schema and command placeholders
- [x] Run contract, adapter, worker, Rust, backend regression, frontend TypeScript, and whitespace checks
- [x] Update `.ai/changes/2026-05-26.md`, relevant README files, and review notes

## Review

- Patched contract transforms so Python and TypeScript support real legacy top-level `customParameters`, `calculationParameters`, and `timeSegments`, while still accepting `metadata.component_schema`.
- Aligned edge transform behavior across Python and TypeScript: nested `data.concentration_transform[component]` is preferred, then `${component}_a/_b` fallback is used.
- Extended `simulation_input.v1` with optional `time_segments`; transform and backend adapter now preserve segment edge overrides.
- Wrapped backend adapter Pydantic validation failures as `SimulationInputAdapterError` with contract-style details.
- Added Phase 2A worker CLI under `services/simulation-worker/simulation_worker` with `--self-check`, `--run-job`, `--artifact-dir`, and `--stdio-jsonrpc`.
- Worker now validates `compute_job.v1` and embedded `simulation_input.v1`, executes material balance through the migration adapter, writes time-series artifact JSON, and returns `compute_result.v1`.
- Added Phase 3A desktop Rust scaffold under `apps/desktop/src-tauri` with command placeholders and SQLite migration draft for `projects`, `compute_jobs`, `compute_job_events`, and `artifacts`.
- Updated README First context for new/changed key directories.
- Verification:
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`44 passed`).
  - `cd backend; .venv\Scripts\python -m pytest app\tests\services\test_simulation_input_adapter.py app\tests\time_segment_validation_test.py app\tests\material_balance_segment_overrides_test.py app\tests\hybrid_udm_validation_test.py app\tests\udm_engine_variable_binding_test.py -q` passed (`22 passed`, existing warnings only).
  - `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed (`4 passed`).
  - `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`3 passed`).
  - `cd frontend; npx tsc --noEmit` passed.
  - `git diff --check` passed with LF/CRLF normalization warnings only.
- Remaining scope:
  - Full `simulation_core/` extraction stays in Phase 2B.
  - Desktop real sidecar spawn, SQLite runtime wiring, React UI, installer, signing, and packaging stay in Phase 3B+.
  - Web Go Compute API remains outside this round.

# 2026-05-26 AutoWaterSimu Next Phase 2B TODO

- [x] Checkpoint Phase 1B review fix + Phase 2A + Phase 3A changes before new core extraction
- [x] Create `simulation_core/python/autowatersimu_simulation_core` package and README context
- [x] Extract material balance runtime into simulation core without importing `backend/app`
- [x] Add core-side `simulation_input.v1` adapter with contract-style errors
- [x] Update worker runner to import only `simulation_core/python` and `contracts/python`
- [x] Expand worker self-check for scientific imports, git/build metadata, writable artifact temp, and minimal job smoke
- [x] Align JSON-RPC `run_job` with `params.job` and `result.compute_result`, while preserving `params.job_path`
- [x] Add core import boundary, worker boundary, adapter, numerical parity, self-check, and JSON-RPC tests
- [x] Run contract, core, worker, backend regression, desktop Rust, frontend TypeScript, and whitespace checks
- [x] Update README First records and review notes

## Review

- Checkpointed completed Phase 1B review fix + Phase 2A + Phase 3A work before Phase 2B in commit `eb0f2f1 feat: add contracts worker and desktop scaffold`.
- Added pure Python core package under `simulation_core/python/autowatersimu_simulation_core`.
- Extracted material balance runtime files, ASM runtime helpers, UDM ODE/runtime helpers, and UDM expression compilation into core-local modules.
- Added core runtime Pydantic models that match the fields the calculator actually reads, without importing SQLModel or `backend/app`.
- Added core-side `simulation_input.v1 -> MaterialBalanceInput` adapter with `SimulationCoreAdapterError` and `contract_error.v1`-style error mapping.
- Updated worker runner so runtime import paths are only `simulation_core/python` and `contracts/python`; static checks confirm worker/core no longer import `app.*`.
- Expanded `--self-check` with dependency import checks, git SHA, packaging mode, temp artifact write check, and minimal material balance smoke.
- Updated JSON-RPC `run_job` to accept `params.job` object and return `result.compute_result`; `params.job_path` remains for local dev/test compatibility.
- Added `simulation_core/tests` for import boundary, adapter behavior, validation wrapping, and numerical parity against legacy backend baseline.
- Updated README First context for `simulation_core`, new core package subdirectories, and worker behavior.
- Verification:
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`44 passed`).
  - `backend\.venv\Scripts\python -m pytest simulation_core\tests -q` passed (`4 passed`, existing backend warning only in parity test).
  - `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed (`6 passed`).
  - `cd backend; .venv\Scripts\python -m pytest app\tests\services\test_simulation_input_adapter.py app\tests\time_segment_validation_test.py app\tests\material_balance_segment_overrides_test.py app\tests\hybrid_udm_validation_test.py app\tests\udm_engine_variable_binding_test.py -q` passed (`22 passed`, existing warnings).
  - `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`3 passed`).
  - `cd frontend; npx tsc --noEmit` passed.
  - `rg -n "from app\.|import app\." services\simulation-worker\simulation_worker simulation_core\python\autowatersimu_simulation_core` returned no matches.
  - `git diff --check` passed with LF/CRLF normalization warnings only.
- Remaining scope:
  - Legacy backend still owns its existing material balance copy; converting backend to wrap core is a later migration.
  - Worker still supports only `simulation.material_balance.v1`; ASM/UDM job handlers remain Phase 5.
  - Desktop real sidecar spawn, packaging, installer, SQLite runtime wiring, and React UI remain Phase 3B+.
  - Web Go Compute API remains outside this round.

# 2026-05-26 AutoWaterSimu Next Phase 3B TODO

- [x] Re-read Desktop and worker README First context before changing runtime files
- [x] Add Desktop SQLite migration runner and `schema_migrations`
- [x] Add 0002 migration for `canvas_graphs`, `process_graphs`, `model_runs`, `support_bundles`, `settings`, and `recent_files`
- [x] Extend `compute_jobs` tracking fields for input/result hash, worker version, error, and stderr tail
- [x] Replace Phase 3A command stubs with runtime-backed command wrappers
- [x] Add SQLite store for job create/get/list, events, artifacts, and support bundles
- [x] Add source-mode Python worker bridge for `--self-check` and JSON-RPC `run_job`
- [x] Add synchronous `compute_job_run` smoke lifecycle from queued to terminal status
- [x] Add artifact persistence/export sandbox and support bundle generation
- [x] Add Rust tests for migrations, store, lifecycle, failure, timeout, sandbox, and support bundle
- [x] Run Desktop, contract, worker/core, frontend, and whitespace checks
- [x] Update README First records and review notes

## Review

- Upgraded `apps/desktop/src-tauri` from Phase 3A deterministic stubs to a Phase 3B runtime foundation.
- Added Rust modules for migrations, SQLite store, source-mode worker process bridge, runtime orchestration, and path sandbox validation.
- Added 0002 migration and migration runner with `schema_migrations`.
- `compute_job_create` now validates minimal `compute_job.v1`, writes SQLite rows, computes input hash, and writes `job.created` / `job.queued` events.
- `compute_job_run` now marks jobs running, invokes the Python worker over JSON-RPC `params.job`, records terminal status, summary, result hash, worker version, stderr tail, and artifact rows.
- Artifact export is limited to runtime-local `exports/` with relative path validation.
- Support bundle generation writes redacted JSON with job metadata, events, artifact metadata/checksum, and runtime/migration versions, excluding artifact contents.
- Verification:
  - `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`9 passed`).
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`44 passed`).
  - `backend\.venv\Scripts\python -m pytest simulation_core\tests services\simulation-worker\tests -q` passed (`10 passed`, existing warnings only).
  - `cd backend; .venv\Scripts\python -m pytest app\tests\services\test_simulation_input_adapter.py app\tests\time_segment_validation_test.py app\tests\material_balance_segment_overrides_test.py app\tests\hybrid_udm_validation_test.py app\tests\udm_engine_variable_binding_test.py -q` passed (`22 passed`, existing warnings only).
  - `cd frontend; npx tsc --noEmit` passed.
  - `git diff --check` passed with LF/CRLF normalization warnings only.
- Remaining scope:
  - React Desktop UI, packaged sidecar/`externalBin`, installer, signing, auto update, long-lived worker, cancel/restart/progress streaming, CSV export, and Web Go API remain outside Phase 3B.

# 2026-05-26 AutoWaterSimu Next Phase 3B Review Fix TODO

- [x] Harden worker spawn/stdout parse/missing result errors so running jobs always reach terminal status
- [x] Restrict job state transitions to `queued -> running -> succeeded|failed|timed_out`
- [x] Reject rerunning terminal jobs without appending extra running events
- [x] Persist timeout as `status=timed_out` and `error_code=TIMEOUT`
- [x] Return readable duplicate job conflict errors
- [x] Wrap each migration application in a SQLite transaction
- [x] Include `support_bundle.created` in support bundle event timeline
- [x] Add Rust tests for event sequence, rerun rejection, worker spawn failure, timeout code, duplicate conflict, and support bundle timeline
- [x] Run Desktop Rust tests and full regression matrix
- [x] Update README First records

## Review

- Patched Phase 3B runtime hardening issues before moving to UI or packaged sidecar work.
- `compute_job_run` now persists worker spawn/parse/missing-result failures as terminal failed jobs.
- `mark_running` only transitions queued jobs; terminal jobs cannot be rerun.
- Timeout jobs now persist `error_code=TIMEOUT`.
- Duplicate job IDs return a stable conflict message instead of raw SQLite constraint text.
- Migration application now runs each migration in a transaction.
- Support bundle export includes its own `support_bundle.created` timeline event.
- Verification:
  - `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`11 passed`).
  - `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`44 passed`).
  - `backend\.venv\Scripts\python -m pytest simulation_core\tests services\simulation-worker\tests -q` passed (`10 passed`, existing warnings only).
  - `cd backend; .venv\Scripts\python -m pytest app\tests\services\test_simulation_input_adapter.py app\tests\time_segment_validation_test.py app\tests\material_balance_segment_overrides_test.py app\tests\hybrid_udm_validation_test.py app\tests\udm_engine_variable_binding_test.py -q` passed (`22 passed`, existing warnings only).
  - `cd frontend; npx tsc --noEmit` passed.
  - `git diff --check` passed with LF/CRLF normalization warnings only.

# 2026-05-27 AutoWaterSimu Next Phase 3C TODO

- [x] Re-read Desktop README First context before changing Tauri/frontend files
- [x] Add independent `apps/desktop` Vite + React + TypeScript app
- [x] Use port `1420` with `strictPort=true` to avoid legacy frontend port `5173`
- [x] Add typed Tauri command wrappers and browser-only unavailable fallback
- [x] Add Desktop workbench for worker self-check, demo job create/run, job list/detail, artifact export, and support bundle
- [x] Add Tauri v2 Rust dependency, build script, app entrypoint, and command registration
- [x] Keep capabilities minimal and avoid shell/fs/dialog plugin permissions
- [x] Add fake worker invalid stdout test for terminal failed persistence
- [x] Run Desktop frontend, Rust, Tauri build, contract, core/worker, backend, frontend legacy, and whitespace checks
- [x] Update README First records and review notes

## Review

- Added a standalone Desktop frontend under `apps/desktop` with npm-managed dependencies and Vite dev port `1420`.
- Wired existing Rust runtime commands into Tauri v2 using `#[tauri::command]` and a single `invoke_handler`.
- Added a minimal Desktop workbench that runs through the Phase 3B local runtime via Tauri commands.
- Browser-only Vite usage now shows a Tauri runtime unavailable state instead of attempting local commands.
- Added a generated local `icon.ico` so Tauri Windows resource generation succeeds.
- Added invalid stdout coverage for the worker JSON-RPC parse failure path.
- Verification results are recorded in `.ai/changes/2026-05-27.md`.

# 2026-05-28 AutoWaterSimu Next Phase 4A TODO

- [x] Checkpoint Phase 3C Desktop dev MVP and push current branch
- [x] Initialize Go Compute API module under `apps/api`
- [x] Add PostgreSQL metadata migration and migration runner
- [x] Add static bearer token scope auth
- [x] Add contract validation, canonical payload hash, idempotency duplicate/conflict behavior
- [x] Add job create/get/list/cancel/result/events API handlers
- [x] Add worker register/claim/heartbeat/artifact/succeed/fail lifecycle
- [x] Add local artifact store with checksum verification and server-generated object keys
- [x] Add timeout sweep function without background daemon
- [x] Add OpenAPI spec and generated TypeScript client under `frontend/src/client/compute`
- [x] Add Go lifecycle tests and README First records
- [x] Run full Phase 4A validation matrix

## Review

- Phase 4A implements the first Web / Platform compute skeleton while preserving legacy FastAPI and Desktop boundaries.
- PostgreSQL remains the target metadata database; core lifecycle unit tests use an in-memory store so most validation does not require local Postgres.
- OpenAPI generation is isolated with `frontend/openapi-compute-ts.config.ts` and does not overwrite the legacy generated client.
- Verification results are recorded in `.ai/changes/2026-05-27.md`.

# 2026-05-30 README First Protocol Refinement TODO

- [x] Re-read README First protocol context and existing AI records
- [x] Align protocol file naming and reading order across `AGENTS.md`, `README_First.md`, and root `README.md`
- [x] Add guidance for prompt-to-target discovery when a task has no explicit target file
- [x] Record the documentation-only change in `.ai/changes/2026-05-30.md`
- [x] Run markdown whitespace checks

## Review

- Updated `AGENTS.md` so the executable reading order includes `README_First.md` before the root README.
- Clarified `README_First.md` as the principle/document-role layer and fixed stale references to the non-existent spaced filename.
- Added target discovery guidance for prompts without explicit files or directories.
- Verification: `rg` consistency checks and `git diff --check -- AGENTS.md README.md README_First.md tasks/todo.md .ai/changes/2026-05-30.md` completed; Git only reported existing LF-to-CRLF normalization warnings.

# 2026-05-30 Directory README Coverage Audit TODO

- [x] Audit tracked project directories for missing README coverage, excluding dependency/cache/build output folders
- [x] Add P0 backend README context for `backend/app`, API, core, material balance, tests, scripts, and utils
- [x] Add P0 frontend README context for `frontend/src`, core feature directories, and frontend tests
- [x] Add P1 README context for Go Compute API internals, Desktop runtime internals, contract package internals, and key docs folders
- [x] Record scope, assumptions, and verification in `.ai/changes/2026-05-30.md`
- [x] Run README reference and whitespace checks

## Review

- Added directory README coverage for the highest-risk tracked source and documentation areas: legacy backend app/API/core/material balance/tests/scripts, legacy frontend source/components/Flow/UDM/routes/services/stores/utils/hooks/i18n/data/config/types/theme/tests, Go Compute API command/internal/migrations/openapi, Desktop Rust/React helper subdirectories, contracts Python/fixtures, and key docs folders.
- Updated root README and README_zh to point to `backend/scripts/` instead of the non-existent root `scripts/` directory.
- Clarified that the root `scripts/generate-client.sh` helper is not present in the tracked workspace, so frontend client generation should use the documented manual command unless that helper is added later.
- Verification: all targeted README paths exist; `git diff --check -- '**/README.md' tasks/todo.md .ai/changes/2026-05-30.md AGENTS.md README.md README_First.md` passed with only existing LF-to-CRLF normalization warnings.

# 2026-05-30 AutoWaterSimu Next Goal Review and Phase 4A Hardening TODO

- [x] Read `AGENTS.md`, `README_First.md`, root README, PRD, Technical Spec, Development Plan, relevant directory README files, `.ai/changes/`, and `.ai/decisions/`
- [x] Review current implementation status against Phase 0 through Phase 6
- [x] Identify the next smallest implementation gap before Web UI P0B
- [x] Harden Go Compute API worker compatibility and failed-result persistence
- [x] Add Go regression tests for compatible claim, incompatible claim skip, and validated worker fail
- [x] Run targeted Go API tests and relevant regression checks
- [x] Record this implementation in `.ai/changes/2026-05-30.md`

## Current Completion Review

- Phase 0 legacy stabilization: implemented. ASM1/UDM validate fields, no-print flowchart checks, legacy baseline markings, and route tests exist.
- Phase 1 contracts and transforms: implemented for material balance P0. JSON Schema, valid/invalid fixtures, Python transforms, TypeScript prototype, and backend adapter tests exist.
- Phase 2 simulation core and worker CLI: implemented for `simulation.material_balance.v1`. Worker self-check, run-job, JSON-RPC, artifact writing, core import boundary, and parity tests exist.
- Phase 3 Desktop MVP: implemented as a dev MVP through Phase 3C. Rust SQLite runtime, source-mode worker bridge, support bundle, sandbox tests, and a Tauri React workbench exist. Packaged sidecar, NSIS smoke, signing, auto update, long-lived worker, full project/graph UI, and installer remain open.
- Phase 4 Web Compute API P0A: implemented as a skeleton. Job lifecycle, worker lifecycle, artifact upload/download, idempotency, pagination, auth scopes, OpenAPI, and generated compute client exist. PostgreSQL integration smoke is conditional on `COMPUTE_API_DATABASE_URL`.
- Phase 4 Web UI P0B: not started. No frontend jobs list/detail/worker health/artifact download UI is wired to the compute client.
- Phase 5 ProcessGraph integration and ASM/UDM worker migration: not started beyond transform prototype and extracted helper code. Legacy UI still does not emit `canvas_graph.v1` / `process_graph.v1` for runtime submission.
- Phase 6 governance/integrations: not started beyond schema placeholders and static token scope foundation.

## Execution Plan From Here

1. Finish Phase 4A hardening before building UI: worker claim must respect capabilities/contract versions, and failed worker completions must persist as valid `compute_result.v1` under schema validation.
2. Implement Phase 4B Web jobs UI against `frontend/src/client/compute`: jobs list, job detail, events, result summary, artifact link, failed status display, and worker health placeholder.
3. Implement ProcessGraph integration in frontend: legacy flow export -> `canvas_graph.v1`, `buildProcessGraph`, `buildSimulationInput`, validation issue display, and demo job submission path.
4. Upgrade Desktop from dev MVP to MVP deliverable: packaged sidecar, externalBin config, backup/restore commands, project import/export, artifact CSV/JSON export, and Windows installer smoke.
5. Migrate worker job types one by one: ASM1, ASM1Slim, ASM3, then UDM, each with old-vs-worker numerical baselines and model run records.
6. Add governance/integration layer: model catalog, parameter set lifecycle, evidence package export, service token rotate/revoke, NewSystem/milp read-only evidence paths, and Agent draft validation gate.

## Review Notes

- This plan treats the PRD/Spec/Development Plan as approved working input because the user asked to proceed from already written documents.
- Existing uncommitted README First protocol changes are preserved and not reverted.
- The pending Directory README coverage audit remains a separate documentation task; this round prioritizes executable P0 hardening.

## Implementation Review

- Go Compute API claim now reads the registered worker record before claiming work.
- Memory and PostgreSQL stores now only claim queued jobs whose `execution.required_capabilities` and embedded contract versions are supported by the worker.
- Worker fail now builds a schema-valid `compute_result.v1` and persists `error_code` / `error_message` from `summary`, so production schema validation does not block terminal failure recording.
- The Go contract validator now compiles schemas from local `file:///` URLs, covering the path used by the production Compute API bootstrap.
- Verification:
- `cd apps\api; go test ./...` passed.
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`44 passed`).
- `cd frontend; npx tsc --noEmit` passed.
- `git diff --check -- apps\api tasks\todo.md` passed with LF-to-CRLF normalization warnings only.

# 2026-05-30 AutoWaterSimu Next Phase 4B Web Jobs UI TODO

- [x] Re-read frontend README First context, Chakra v3 local docs, route context, generated compute client, and i18n context
- [x] Confirm Compute API client is isolated under `frontend/src/client/compute`
- [x] Configure the legacy frontend to use Compute API base URL/token without overwriting the FastAPI client
- [x] Add authenticated Compute Jobs route, sidebar entry, and route tree registration
- [x] Add jobs list, job detail, result summary, event timeline, worker health, demo job submission, cancel, and artifact download controls
- [x] Run frontend typecheck/build and targeted whitespace checks
- [x] Record Phase 4B implementation in `.ai/changes/2026-05-30.md`

## Review

- Added a service wrapper around the isolated generated Compute API client.
- Configured `VITE_COMPUTE_API_URL` and `VITE_COMPUTE_API_TOKEN` / `localStorage.compute_access_token` separately from the legacy FastAPI client.
- Added authenticated `/compute-jobs` route with health status, status filter, jobs table, detail panel, result summary, events, artifact download, cancel, and demo material-balance job submission.
- Added sidebar navigation and bilingual nav keys for Compute Jobs.
- Updated frontend/service/route README context for the new Compute client runtime configuration and service wrapper.
- Verification:
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings for gray-matter eval, toaster chunking, and large bundle size.
- `cd frontend; npx biome check src/routes/_layout/compute-jobs.tsx src/services/computeJobsService.ts src/main.tsx src/components/Common/SidebarItems.tsx src/i18n/messages/en/common.ts src/i18n/messages/zh/common.ts` passed.
- `git diff --check -- frontend tasks .ai\changes\2026-05-30.md` passed with LF-to-CRLF normalization warnings only.
- Headless Playwright verified `http://127.0.0.1:5173/compute-jobs` renders the `Compute Jobs` heading plus `Demo job`, `Refresh`, and status filter controls after seeding local auth tokens.
- In-app browser navigation to localhost/127.0.0.1 was blocked in this environment, so browser verification used headless Playwright.
- Remaining scope:
- End-to-end demo job creation requires a running Go Compute API with PostgreSQL configured via `COMPUTE_API_DATABASE_URL`.
- Phase 5 ProcessGraph integration and ASM/UDM worker migration are still pending.

# 2026-05-30 AutoWaterSimu Next Phase 5A ProcessGraph UI Bridge TODO

- [x] Re-read Phase 5 Development Plan / Technical Spec sections and frontend contracts/store/service README context
- [x] Confirm TypeScript CanvasGraph -> ProcessGraph -> SimulationInput prototype already exists under `frontend/src/contracts`
- [x] Upgrade material balance `exportFlowData()` output with CanvasGraph-compatible metadata while preserving legacy fields
- [x] Add Compute API service helper for current-flow `compute_job.v1` creation from legacy flow export
- [x] Add Compute Jobs UI action for submitting the current material balance flow and displaying transform validation issues
- [x] Update frontend contracts README now that the prototype is opt-in UI-connected
- [x] Run frontend typecheck/build, targeted Biome, and route render verification
- [x] Record Phase 5A implementation in `.ai/changes/2026-05-30.md`

## Review

- Kept legacy flow export compatibility while adding `canvas_graph.v1` metadata (`schema_version`, `graph_id`, `name`, `component_schema`, `timeSegments`, `exported_at`, `metadata`).
- Added `buildComputeJobFromFlowExport()` and `createJobFromFlowExport()` in `computeJobsService` to build `CanvasGraph -> ProcessGraph -> SimulationInput -> compute_job.v1` for material balance.
- Added a `Current flow` action to `/compute-jobs`; it uses the current `flowStore.exportFlowData()` snapshot, submits through the Go Compute API client, and shows `ContractTransformError.details` as readable validation issues.
- The `Current flow` button is disabled when the material balance store has no nodes.
- Updated README context for frontend contracts, services, and stores.
- Verification:
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings for gray-matter eval, toaster chunking, and large bundle size.
- `cd frontend; npx biome check src/routes/_layout/compute-jobs.tsx src/services/computeJobsService.ts` passed.
- `git diff --check -- frontend tasks .ai\changes\2026-05-30.md` passed with LF-to-CRLF normalization warnings only.
- Headless Playwright verified `/compute-jobs` renders `Demo job` and `Current flow`; `Current flow` is disabled for an empty flow store.
- Broader Biome on `flowStore.ts` and `materialBalanceTransforms.ts` still reports existing `forEach`/format debt, so this round kept validation scoped to changed route/service files plus type/build.
- Remaining scope:
- Full Phase 5 still needs in-canvas validation issue surfacing, result overlay back to nodes/edges, legacy flow fixture UI smoke, real Go API/PostgreSQL E2E submission, and ASM/UDM worker migration.

# 2026-05-30 AutoWaterSimu Next Local Compute API Smoke TODO

- [x] Re-read Go Compute API command/internal README context
- [x] Add local-development memory metadata store fallback when `COMPUTE_API_DATABASE_URL` is unset
- [x] Keep PostgreSQL migration path unchanged when `COMPUTE_API_DATABASE_URL` is set
- [x] Add Go test for memory fallback wiring
- [x] Add local loopback CORS preflight support for Vite Web UI smoke
- [x] Normalize empty job artifact lists to arrays instead of JSON `null`
- [x] Run Go API tests
- [x] Run frontend typecheck/build and targeted Biome
- [x] Start local Compute API and verify Web UI create/list smoke
- [x] Update README First records

## Review

- `cmd/compute-api` now starts with an in-memory metadata store when `COMPUTE_API_DATABASE_URL` is unset, preserving the PostgreSQL migration path whenever the database URL is configured.
- `internal/compute/http.go` now handles loopback-only CORS/OPTIONS for `localhost`, `127.0.0.1`, and `::1`, which lets the Vite frontend call the Go API during local smoke tests without broadening nonlocal origins.
- `Service` now normalizes empty artifact/event collections that are exposed through HTTP-facing structures, keeping `JobSnapshot.artifacts` aligned with the OpenAPI array contract.
- The Compute Jobs page defensively handles older/partial API responses where `artifacts` may be `null`.
- Verification:
- `cd apps\api; go test ./...` passed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with the existing Vite warnings for `gray-matter` eval, toaster chunking, and large bundle size.
- `cd frontend; npx biome check src/routes/_layout/compute-jobs.tsx src/services/computeJobsService.ts` passed.
- PowerShell OPTIONS smoke against `http://localhost:8088/api/v1/compute/jobs` returned `204` with `Access-Control-Allow-Origin: http://127.0.0.1:5173`.
- Headless Playwright verified `http://127.0.0.1:5173/compute-jobs` can create a `Demo job`, list it as `queued`, and render `No artifacts recorded.` without the earlier detail-panel crash.
- The only request failure during browser smoke was `http://localhost:8000/api/v1/users/me` because the legacy FastAPI backend was not running; it is unrelated to the Go Compute API smoke.

# 2026-05-30 AutoWaterSimu Next Worker HTTP E2E TODO

- [x] Re-read worker, contract, simulation core, and Go Compute API README context
- [x] Add a one-shot HTTP worker mode that registers, claims one job, runs material balance, uploads artifacts, and writes succeed/fail
- [x] Add worker tests with a fake Compute API server
- [x] Run worker tests and relevant Go/frontend regression checks
- [x] Smoke against the local Go Compute API memory store
- [x] Update README First records

## Plan

- Keep this as a one-shot dev/CI bridge, not a long-lived production scheduler.
- Use stdlib HTTP only, avoiding a new dependency.
- Preserve stdout JSON-only behavior and write only sanitized diagnostics to stderr.
- Keep worker execution dependent on `simulation_core/` and `contracts/`; do not import legacy FastAPI internals or Go API persistence code.

## Review

- Added `simulation_worker/api_client.py` with a stdlib-only one-shot Compute API client.
- Added `--run-api-once`, `--api-base-url`, `--api-token`, and `--worker-id` CLI flags.
- The one-shot worker registers capabilities, claims one job, runs the existing material balance runner, uploads generated artifacts through the Go API multipart endpoint, and writes `succeed` or `fail`.
- Added a fake Compute API server test covering register -> claim -> artifact upload -> succeed without touching PostgreSQL.
- Updated worker README context to state that this is a local/CI bridge, not a long-lived production scheduler.
- Verification:
- `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed (`7 passed`).
- Local smoke command processed `job_web_demo_8bac722d08c5` from the running Go API memory store and returned `status: succeeded` with one uploaded time-series artifact.
- PowerShell API check showed `job_web_demo_8bac722d08c5` as `succeeded`, `event_count=5`, `artifact_count=1`.
- Headless Playwright verified `/compute-jobs` shows the succeeded job and artifact id; the only request failure remained the unrelated legacy `/api/v1/users/me` because FastAPI was not running.

# 2026-05-30 AutoWaterSimu Next Worker ModelRun Audit TODO

- [x] Re-read contract and worker context for `compute_result.v1.runtime_audit.model_runs`
- [x] Emit `model_run.v1` from successful material balance worker runs
- [x] Validate emitted model run in worker tests
- [x] Run worker tests and local API worker smoke
- [x] Update README First records

## Plan

- Keep the model run inside `compute_result.runtime_audit.model_runs`; do not add Go persistence in this step.
- Hash canonicalized `payload.parameters` and the executable `simulation_input.v1` payload to populate `parameter_hash` and `input_hash`.
- Reference the generated time-series artifact as initial evidence.

## Review

- Successful material balance worker runs now emit one `model_run.v1` inside `compute_result.runtime_audit.model_runs`.
- `parameter_hash` is based on canonical `payload.parameters`; `input_hash` is based on the executable `simulation_input.v1` payload.
- The model run records core quality metrics and references the generated time-series artifact.
- When the HTTP worker bridge uploads artifacts to Go API, it rewrites model run `evidence_refs` to the server-returned artifact ids before submitting `succeed`.
- Verification:
- `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed (`7 passed`).
- Local `--run-api-once` smoke processed `job_web_demo_fc29eff86a39` to `succeeded` and returned a valid `model_run.v1` with hashes, quality metrics, and artifact evidence refs.
- Remaining scope:
- Go API still stores job summary/result hash/artifacts, not first-class `model_runs` rows; durable model run query/export remains Phase 6 work.

# 2026-05-30 AutoWaterSimu Next Go API ModelRun Persistence TODO

- [x] Re-read Go API internal, migration, OpenAPI, and model_run contract context
- [x] Persist `compute_result.runtime_audit.model_runs` in Go memory/PostgreSQL stores
- [x] Add read-only model run lookup endpoint and OpenAPI entry
- [x] Regenerate isolated compute client
- [x] Add Go regression tests
- [x] Run Go/frontend/worker validation and local smoke
- [x] Update README First records

## Plan

- Reuse the existing `model_runs` PostgreSQL table; do not change migrations unless current columns are insufficient.
- Store the complete `model_run.v1` JSON in `runtime_audit` for now, while indexing id/job/model key/version in existing columns.
- Use `job:read` for the P0 read endpoint until the later `evidence:read` scope model is implemented.

## Review

- Go service now validates `model_run.v1` records inside `compute_result.runtime_audit.model_runs` when the contract validator is enabled.
- Memory and PostgreSQL stores persist model run JSON, indexed by model run id, job id, model key/version, and optional parameter set id.
- Added read-only `GET /api/v1/model-runs/{model_run_id}` using existing P0 `job:read` scope.
- Job result responses now include `model_runs`, and the Compute Jobs detail panel renders a `Model runs` JSON section.
- Updated OpenAPI and regenerated the isolated compute client under `frontend/src/client/compute`.
- Verification:
- `cd apps\api; go test ./...` passed.
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed (`7 passed`).
- Local memory-store smoke created `job_material_balance_minimal`, ran `--run-api-once`, fetched `mr_job_material_balance_minimal_material_balance` through `/api/v1/model-runs/{model_run_id}`, and confirmed `/api/v1/compute/jobs/{job_id}/result` returns one model run.
- Headless Playwright verified the Compute Jobs detail panel displays `Model runs` and the model run id.
- `git diff --check -- apps/api frontend/src/client/compute services/simulation-worker tasks/todo.md .ai/changes/2026-05-30.md` passed with LF-to-CRLF warnings only.
- Remaining scope:
- Model run list/search, evidence package export, `evidence:read` scope, retention policy, and richer model governance UI are still Phase 6 work.

# 2026-05-30 AutoWaterSimu Next Evidence Package Export TODO

- [x] Re-read Phase 6 evidence context, evidence schema, Go API README, and current model_run implementation
- [x] Generate `evidence_package.v1` from completed job metadata, events, artifacts, and model runs
- [x] Add `evidence:read` default dev scope and endpoint authorization
- [x] Add OpenAPI endpoint and regenerate isolated compute client
- [x] Add Go regression coverage for schema validation, checksum header, and scope denial
- [x] Run Go/frontend/worker validation and local smoke
- [x] Update README First records

## Plan

- Export evidence by job id first: `GET /api/v1/compute/jobs/{job_id}/evidence`.
- Include refs and audit metadata only; do not inline artifact bytes.
- Return `X-Evidence-Checksum` so clients can verify exported package integrity.
- Use `evidence:read` for the new endpoint, while dev public token gets that scope for local smoke.

## Review

- Added evidence package generation in the Go service using existing job, event, artifact, and model run metadata.
- Evidence export returns schema-valid `evidence_package.v1` plus an `X-Evidence-Checksum` header.
- Added endpoint `GET /api/v1/compute/jobs/{job_id}/evidence`; worker token is denied because it lacks `evidence:read`.
- Updated OpenAPI and regenerated `frontend/src/client/compute`.
- Verification:
- `cd apps\api; go test ./...` passed.
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q` passed (`7 passed`).
- Local memory-store smoke created and completed `job_material_balance_minimal`, exported `evidence_job_material_balance_minimal`, returned model run/artifact refs, returned an evidence checksum, and denied `dev-worker-token` with HTTP 403.
- Remaining scope:
- Evidence package list/search, storage/retention, project/tenant/model_run filters, NewSystem/milp-specific evidence APIs, token rotation/revocation, and Agent DSL validation remain open Phase 6 work.

# 2026-05-30 AutoWaterSimu Next Desktop ModelRun Persistence TODO

- [x] Re-read Desktop README First context, runtime/store/UI implementation, and Phase 3 Desktop MVP requirements
- [x] Identify the smallest Desktop-side gap after worker/API model_run support
- [x] Persist successful worker `runtime_audit.model_runs` into the Desktop SQLite `model_runs` table
- [x] Include model runs in Desktop job snapshots and support bundles
- [x] Surface model runs in the Desktop React workbench
- [x] Run Desktop Rust tests, React typecheck/build, browser render check, and diff hygiene
- [x] Update README First records

## Plan

- Reuse the existing `model_runs` migration table; do not add a new migration.
- Keep persistence local to successful worker results and validate the minimal `model_run.v1` invariants before insert.
- Keep support bundles redacted: include model run JSON and artifact refs, not artifact contents.

## Review

- Desktop runtime now persists each successful worker `runtime_audit.model_runs[]` item into SQLite.
- Job snapshots now include `model_runs`, and support bundles include those records alongside job/events/artifact metadata.
- The Desktop React shell and typed command wrapper now expose and render a `Model Runs` section.
- Updated Desktop README context for model_run audit behavior.
- Verification:
- `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`12 passed`).
- `cd apps\desktop; npm run typecheck` passed.
- `cd apps\desktop; npm run build` passed.
- Browser check against `http://127.0.0.1:1420/` confirmed `Desktop Runtime`, `Model Runs`, and the browser-mode Tauri unavailable notice render.
- `git diff --check -- apps\desktop tasks\todo.md .ai\changes\2026-05-30.md` passed with LF-to-CRLF warnings only.
- Remaining scope:
- Full Desktop MVP still needs project create/open/export/import, backup/restore smoke, canvas graph save/load, process graph validation commands, result CSV export, packaged sidecar/NSIS installer smoke, and richer Desktop project UI wiring.

# 2026-05-30 AutoWaterSimu Next Desktop CSV Export TODO

- [x] Re-read artifact schema, worker time-series artifact structure, and Desktop export context
- [x] Add runtime CSV export for supported material balance time-series artifacts
- [x] Keep CSV output inside the existing runtime-local export sandbox
- [x] Register a dedicated Tauri command and typed React wrapper
- [x] Add Desktop UI button and export result display
- [x] Add Rust regression coverage for CSV columns and path traversal rejection
- [x] Run Desktop verification and browser render check
- [x] Update README First records

## Plan

- Preserve existing `artifact_export` JSON copy semantics.
- Add a separate `artifact_export_csv` command so callers choose the output format explicitly.
- Flatten `material_balance_time_series_artifact.v1` into stable columns: `time`, `node.<node_id>.<metric>`, and `edge.<edge_id>.<metric>`.

## Review

- Added `DesktopRuntime::artifact_export_csv()` for `material_balance.time_series` artifacts.
- CSV export reads the stored artifact JSON, validates the time-series artifact schema version, flattens node/edge numeric series, and writes `<artifact_stem>.csv` under `exports/<target_dir>`.
- Registered the new Tauri command and added `exportArtifactCsv()` in the Desktop command wrapper.
- Desktop workbench now includes an `Export CSV` action plus a CSV export path/row-count display.
- Updated Desktop README context for JSON/CSV artifact export behavior.
- Verification:
- `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`13 passed`).
- `cd apps\desktop; npm run typecheck` passed.
- `cd apps\desktop; npm run build` passed.
- Browser check against `http://127.0.0.1:1420/` confirmed `Export CSV`, `No CSV export yet.`, and `Model Runs` render.
- `git diff --check -- apps\desktop tasks\todo.md .ai\changes\2026-05-30.md` passed with LF-to-CRLF warnings only.
- Remaining scope:
- Desktop still needs project lifecycle commands, backup/restore smoke, canvas/process graph commands, packaged sidecar/installer smoke, and production file dialog allowlist expansion.

# 2026-05-30 AutoWaterSimu Next Desktop Job Cancel TODO

- [x] Re-read Desktop job state constraints and source-mode worker limitations
- [x] Add queued-job cancellation to the Rust store/runtime
- [x] Register `compute_job_cancel` Tauri command
- [x] Add typed React wrapper and Desktop UI control
- [x] Add Rust regression coverage for cancelled jobs
- [x] Run Desktop verification and browser render check
- [x] Update README First records

## Plan

- Implement conservative cancellation only for queued jobs.
- Do not claim running source-mode worker jobs can be interrupted; return a clear error instead.
- Preserve terminal-job immutability.

## Review

- Added `DesktopStore::cancel_job()` and `DesktopRuntime::compute_job_cancel()`.
- Queued jobs now transition to `cancelled`, set `cancel_requested=true`, write `finished_at`, and append `job.cancelled`.
- Running jobs return a source-mode limitation error; terminal jobs remain immutable.
- Registered the command and added `cancelComputeJob()` plus a `Cancel Queued Job` control in the Desktop shell.
- Updated Desktop README context for the cancellation boundary.
- Verification:
- `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`14 passed`).
- `cd apps\desktop; npm run typecheck` passed.
- `cd apps\desktop; npm run build` passed.
- Browser check against `http://127.0.0.1:1420/` confirmed `Cancel Queued Job`, `Export CSV`, and `Model Runs` render.
- `git diff --check -- apps\desktop tasks\todo.md .ai\changes\2026-05-30.md` passed with LF-to-CRLF warnings only.
- Remaining scope:
- Running-job cooperative cancellation remains future work tied to long-lived worker management/heartbeat.

# 2026-05-30 AutoWaterSimu Next Web Evidence Download TODO

- [x] Re-read frontend README First context for services/routes
- [x] Add Compute Jobs service helper for evidence package JSON download
- [x] Add Evidence action to the Compute Jobs detail panel
- [x] Preserve generated Compute API client and use it through the service wrapper
- [x] Run frontend typecheck/build, targeted Biome, and render smoke
- [x] Update README First records

## Plan

- Treat evidence package as downloadable JSON from the Go API endpoint.
- Keep the route thin; file creation and naming stays in `computeJobsService`.
- Do not fabricate checksum metadata in the frontend because the generated client does not currently expose response headers.

## Review

- Added `downloadEvidencePackage(jobId)` using `DefaultService.getComputeJobEvidence()`.
- Shared blob download helper with artifact download.
- Added an `Evidence` button in job detail; it is disabled until a job has a `result_hash`.
- Updated routes/services README context for evidence download boundaries.
- Verification:
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings for `gray-matter` eval, toaster chunking, and large bundle size.
- `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx src\services\computeJobsService.ts` passed.
- Browser plugin could reach the login page but could not seed `localStorage` in its read-only evaluation scope; fallback headless Playwright seeded local auth tokens, created a demo job against the local Compute API, and confirmed `Compute Jobs`, `Demo job`, and `Evidence` render.
- `git diff --check -- frontend\src\services\computeJobsService.ts frontend\src\routes\_layout\compute-jobs.tsx frontend\src\routes\README.md frontend\src\services\README.md tasks\todo.md .ai\changes\2026-05-30.md` passed with LF-to-CRLF warnings only.
- Remaining scope:
- Frontend cannot show `X-Evidence-Checksum` until the generated client exposes response headers or a custom fetch path is added.

# 2026-05-30 AutoWaterSimu Next Desktop Backup Restore TODO

- [x] Re-read Desktop backup/restore requirements and current runtime/store/UI context
- [x] Add runtime-local backup creation with manifest and checksums
- [x] Add restore from sandboxed backup manifest with checksum verification
- [x] Register Tauri commands for backup/restore
- [x] Add typed React wrappers and Desktop UI controls
- [x] Add Rust round-trip regression test for SQLite/artifact restore and path traversal rejection
- [x] Run Desktop verification and browser render check
- [x] Update README First records

## Plan

- Keep P0 backup/restore inside `base_dir/backups/`.
- Back up SQLite plus `artifacts/` and `support_bundles/`; treat `exports/` as derived output.
- Verify every manifest file checksum before replacing runtime files.
- Source-mode worker is one-shot, so no long-lived worker shutdown is needed in this phase.

## Review

- `DesktopRuntime::project_backup()` now creates `desktop_backup.v1` manifests under `backups/<backup_id>/manifest.json`.
- The backup includes SQLite, artifacts, support bundles, migration version, runtime version, file sizes, and checksums.
- `DesktopRuntime::project_restore()` only accepts a runtime-local manifest object key, verifies checksums, restores artifacts/support bundles, copies SQLite, and reapplies migrations.
- Added `project_backup` / `project_restore` Tauri commands and typed React wrappers.
- Desktop workbench now shows `Backup` / `Restore` controls and backup/restore status fields.
- Verification:
- `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`15 passed`).
- `cd apps\desktop; npm run typecheck` passed.
- `cd apps\desktop; npm run build` passed.
- Browser check against `http://127.0.0.1:1420/` confirmed `Backup`, `Restore`, `No backup yet.`, and `No restore yet.` render.
- `git diff --check -- apps\desktop tasks\todo.md .ai\changes\2026-05-30.md` passed with LF-to-CRLF warnings only.
- Remaining scope:
- Backup/restore still uses runtime-local sandbox rather than production file dialogs/recent project allowlists.

# 2026-05-30 AutoWaterSimu Next Web Evidence Checksum TODO

- [x] Re-read Compute API, internal compute, frontend services, and frontend routes README context
- [x] Expose evidence checksum headers through loopback-only local CORS
- [x] Return evidence download filename/checksum from the Web service helper
- [x] Show evidence filename/checksum in the Compute Jobs detail panel after download
- [x] Update README First context for the CORS/header and service/route boundary
- [x] Run Go/frontend verification and browser smoke
- [x] Update README First records

## Plan

- Keep evidence JSON generation on the Go API; the frontend only downloads backend-returned JSON.
- Use a service-local fetch only because the generated client does not expose response headers.
- Keep CORS origin scope loopback-only and expose only checksum headers needed by local browser smoke.

## Review

- Go Compute API local CORS now exposes `X-Artifact-Checksum` and `X-Evidence-Checksum` for loopback browser origins.
- `computeJobsService.downloadEvidencePackage()` now uses the generated Compute API base URL/token resolver, reads `X-Evidence-Checksum`, downloads the returned evidence JSON, and returns `{ jobId, filename, checksum }`.
- The Compute Jobs detail panel now shows `Evidence file` and `Evidence checksum` after a successful Evidence download, scoped to the currently selected job.
- Updated API/internal compute/services/routes README files for the checksum header and service/route ownership boundary.
- Verification:
- `cd apps\api; go test ./...` passed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx src\services\computeJobsService.ts` passed.
- `cd frontend; npm run build` passed with the existing Vite warnings for `gray-matter` eval, toaster chunking, and large bundle size.
- PowerShell OPTIONS smoke against `http://localhost:8088/api/v1/compute/jobs/job_material_balance_minimal/evidence` returned `204` with `Access-Control-Expose-Headers: X-Artifact-Checksum, X-Evidence-Checksum`.
- Browser plugin reached the login page but could not seed auth state in its read-only evaluation scope; fallback headless Playwright seeded local auth tokens, downloaded `evidence_job_material_balance_minimal.json`, and confirmed the page shows an evidence checksum beginning with `sha256:`.
- After restarting the local Compute API, a first worker smoke hit a transient connection reset during the restart window; a second one-shot worker smoke completed `job_worker_retry_123434` successfully with artifact upload, `model_run.v1`, and `status: succeeded`.
- Remaining scope:
- Generated Compute API client still does not expose response headers directly; custom fetch remains a service-local workaround until client generation supports header access.

# 2026-05-30 AutoWaterSimu Next Desktop Graph Commands TODO

- [x] Re-read Desktop runtime/store/UI README context and ProcessGraph contract context
- [x] Add Desktop SQLite CanvasGraph save/load runtime and Tauri commands
- [x] Add read-only ProcessGraph validation runtime and Tauri command
- [x] Add typed React wrappers and Desktop workbench controls/status fields
- [x] Add Rust regression coverage for canvas persistence and process graph validation errors
- [x] Run Desktop Rust/React verification and browser render smoke
- [x] Update README First records

## Plan

- Use the existing `canvas_graphs` SQLite table for local save/load.
- Validate CanvasGraph structure and edge/node references before persistence.
- Keep ProcessGraph validation read-only: return structured validation errors but do not enqueue jobs or persist process graphs.
- Mirror small contract examples into Desktop fixtures only for command smoke; `contracts/examples` remains the source of truth.

## Review

- Added `canvas_graph_save` / `canvas_graph_load` Tauri commands backed by `DesktopRuntime` and `DesktopStore`.
- CanvasGraph persistence validates `schema_version=canvas_graph.v1`, graph id/name/export timestamp, node ids, node position/data, edge ids, and edge source/target references before SQLite upsert.
- Added `process_graph_validate` command returning `process_graph_validation.v1` with `valid` / `invalid`, structured errors, and warnings.
- Added Desktop React wrappers plus `Save Canvas Graph`, `Load Canvas Graph`, and `Validate ProcessGraph` controls in the workbench.
- Added deterministic Desktop graph fixtures mirrored from contract examples and README updates for Desktop graph command boundaries.
- Verification:
- `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`17 passed`).
- `cd apps\desktop; npm run typecheck` passed.
- `cd apps\desktop; npm run build` passed.
- Browser check against `http://127.0.0.1:1420/` confirmed `Save Canvas Graph`, `Load Canvas Graph`, `Validate ProcessGraph`, `Canvas Graph`, and `ProcessGraph` render in browser mode.
- Remaining scope:
- Full Desktop project create/open/export/import, external project file allowlists, ProcessGraph persistence UI, packaged sidecar, and NSIS installer smoke remain open.

# 2026-05-30 AutoWaterSimu Next ModelRun List Search TODO

- [x] Re-read Go Compute API store/service/http/OpenAPI context
- [x] Add model_run list/search filter across memory and PostgreSQL stores
- [x] Add `GET /api/v1/model-runs` handler with `job_id` / `model_key` / `model_version` filters
- [x] Update OpenAPI source and regenerate isolated compute client
- [x] Add Go regression coverage for service and HTTP list endpoint
- [x] Run Go/frontend verification and local worker/API smoke
- [x] Update README First records

## Plan

- Keep the endpoint read-only under existing `job:read` scope.
- Support stable pagination with the existing cursor format.
- Limit filters to current indexed governance fields instead of introducing parameter-set state or advanced query DSL.

## Review

- Added `ModelRunFilter` and `ListModelRunsResponse`.
- Memory and PostgreSQL stores now implement `ListModelRuns()` with `job_id`, `model_key`, `model_version`, `limit`, and `cursor`.
- Added `GET /api/v1/model-runs` before the existing `GET /api/v1/model-runs/{model_run_id}` route.
- Updated OpenAPI and regenerated `frontend/src/client/compute`; generated client now includes `listModelRuns`.
- Verification:
- `cd apps\api; go test ./...` passed.
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with the existing Vite warnings for `gray-matter` eval, toaster chunking, and large bundle size.
- Local API smoke restarted the Go API, completed `job_model_run_list_125322` through `--run-api-once`, and `GET /api/v1/model-runs?model_key=material_balance&model_version=material_balance.v1&limit=5` returned one model run.
- Remaining scope:
- Parameter set status lifecycle, model catalog/version endpoints, model_run UI search, retention policy, and production governance approval rules remain Phase 6 work.

# 2026-05-30 AutoWaterSimu Next Web ModelRun History TODO

- [x] Re-read frontend README First context for services/routes and generated Compute API signatures
- [x] Add service wrapper for `listModelRuns`
- [x] Add Compute Jobs model_run history filters and read-only table
- [x] Update frontend README First context
- [x] Run frontend verification and browser render smoke
- [x] Update README First change record

## Plan

- Keep the new UI on the existing Compute Jobs route instead of creating a separate navigation surface.
- Use generated Compute API `listModelRuns` through `computeJobsService`.
- Support only current read filters: `job_id`, `model_key`, and `model_version`.
- Do not introduce model catalog, parameter set lifecycle, or production governance UI in this step.

## Review

- Added `computeJobsService.listModelRuns()` as a thin wrapper over the generated Compute API client.
- Compute Jobs now includes a `Model run history` panel with `job_id`, `model_key`, and `model_version` filters.
- The panel lists model run id, job id, model key/version, and parameter hash without adding model catalog or parameter-set governance rules.
- Updated frontend services/routes README context for model_run history boundaries.
- Verification:
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx src\services\computeJobsService.ts` passed.
- `cd frontend; npm run build` passed with existing Vite warnings for `gray-matter` eval, toaster chunking, and large bundle size.
- Browser plugin reached `/login` because the route is auth-guarded; fallback headless Playwright seeded local auth tokens, opened `/compute-jobs`, filled model filters, and confirmed `Model run history`, the three filter inputs, `Parameter hash`, and result/empty-state rendering.
- Remaining scope:
- Model catalog/version endpoints, parameter set lifecycle, production governance UI, retention policy, and NewSystem/milp-specific model_run/evidence search remain Phase 6 work.

# 2026-05-30 AutoWaterSimu Next Contract Validation API TODO

- [x] Re-read API/internal compute/OpenAPI README context and Agent DSL plan scope
- [x] Confirm existing contracts include `agent_scenario_draft.v1` and `simulation_request.v1`
- [x] Add read-only contract validation endpoint
- [x] Add regression coverage for valid, invalid, unsupported-schema, and scope-denied cases
- [x] Update OpenAPI and regenerate isolated compute client
- [x] Run Go/frontend verification and local API smoke
- [x] Update README First records

## Plan

- Add a generic `POST /api/v1/contracts/validate` endpoint rather than creating a job-producing Agent route.
- Reuse the existing JSON Schema validator and existing `job:create` scope.
- Compile only schema files that actually exist under `contracts/`.
- Return `valid=false` for future/unknown schemas such as `constraint_draft.v1` until their schema exists.

## Review

- `ContractValidator` now compiles `simulation_request.v1`, `agent_scenario_draft.v1`, `process_graph.v1`, and `simulation_input.v1` in addition to existing compute/evidence schemas.
- Added `ContractValidationResponse` with structured errors/warnings and `Service.ValidateContractDocument()`.
- Added `POST /api/v1/contracts/validate`, guarded by `job:create`, returning validation results without writing metadata or creating jobs.
- Updated OpenAPI and regenerated `frontend/src/client/compute`; generated client now includes `validateContract`.
- Verification:
- `cd apps\api; go test ./...` passed.
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings for `gray-matter` eval, toaster chunking, and large bundle size.
- Temporary local API smoke on port `8090` returned `valid=true` for `simulation_request.v1` and `valid=false` with `unsupported schema_version: constraint_draft.v1` for the not-yet-defined future contract.
- Remaining scope:
- `constraint_draft.v1` schema, user confirmation gate, result explanation refs, Agent UI, and production-related draft-to-job promotion remain Phase 6 work.

# 2026-05-30 AutoWaterSimu Next Static Token Revocation TODO

- [x] Re-read API auth/internal compute README context
- [x] Add static token `revoked` config field
- [x] Reject revoked tokens before scope checks
- [x] Add regression coverage for active, revoked, and duplicate token config
- [x] Run Go verification
- [x] Update README First records

## Plan

- Keep P0 auth static and config-driven.
- Treat rotation as overlapping active tokens plus `revoked=true` on old token records.
- Do not add dynamic token CRUD endpoints, database tables, or long-lived token management UI in this step.

## Review

- `TokenRecord` now accepts `revoked`.
- `Authenticator` rejects duplicate token values during startup and rejects revoked bearer tokens with unauthorized responses.
- Existing default dev tokens remain active and unchanged.
- Verification:
- `cd apps\api; gofmt -w internal\compute\auth.go internal\compute\service_test.go internal\compute\types.go; go test ./...` passed.
- Remaining scope:
- Dynamic token rotate/revoke API, audit log entries for token changes, token expiry/not-before windows, and production secret storage remain Phase 6/security hardening work.

# 2026-05-30 AutoWaterSimu Next Desktop Project Registry TODO

- [x] Re-read Desktop README First context for runtime/store/UI wrappers
- [x] Add local SQLite project create/list/get store methods
- [x] Register Tauri project commands and typed React wrappers
- [x] Add Desktop UI controls and Projects panel
- [x] Add Rust regression coverage
- [x] Run Desktop Rust/React verification and browser render smoke
- [x] Update README First records

## Plan

- Use the existing `projects` migration table.
- Keep jobs and canvas graphs with their current `project_id=NULL` behavior.
- Do not implement external project file import/export or recent-file allowlists in this step.

## Review

- Added `project_create`, `project_get`, and `project_list` backed by SQLite `projects`.
- Registered Tauri commands and added typed React wrappers.
- Desktop workbench now has `Create Project`, `Load Project`, and a `Projects` panel.
- Verification:
- `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`18 passed`).
- `cd apps\desktop; npm run typecheck` passed.
- `cd apps\desktop; npm run build` passed.
- Browser check against `http://127.0.0.1:1420/` confirmed `Create Project`, `Load Project`, `Projects`, and `No local projects yet.` render.
- Remaining scope:
- Project file open/save dialogs, export/import format, recent_files allowlist, project_id wiring for jobs/graphs, and packaged installer smoke remain open Desktop MVP work.

# 2026-05-30 AutoWaterSimu Next Desktop Project Export Import TODO

- [x] Re-read Desktop project registry/runtime sandbox context
- [x] Add runtime-local project export/import commands
- [x] Add typed React wrappers and UI controls/status blocks
- [x] Add Rust regression coverage for export/import and path traversal rejection
- [x] Run Desktop Rust/React verification and browser render smoke
- [x] Update README First records

## Plan

- Export project metadata as `desktop_project_export.v1` under the existing `exports/` sandbox.
- Import only from a sandbox-relative export object key.
- Keep this step limited to project metadata, not jobs/graphs migration or external file dialogs.

## Review

- Added `project_export` and `project_import` runtime/Tauri commands.
- Export writes `<project_id>.autowatersimu-project.json` under `exports/<target_dir>`.
- Import validates `desktop_project_export.v1` and upserts the local project row.
- Desktop workbench now shows `Export Project`, `Import Project`, `Project Export`, and `Project Import`.
- Verification:
- `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`19 passed`).
- `cd apps\desktop; npm run typecheck` passed.
- `cd apps\desktop; npm run build` passed.
- Browser check against `http://127.0.0.1:1420/` confirmed project export/import controls and status blocks render.
- Remaining scope:
- External file dialog allowlists, recent_files tracking, jobs/graphs project_id wiring, richer project export contents, and installer smoke remain open Desktop MVP work.

# 2026-05-30 AutoWaterSimu Next Desktop Project Wiring TODO

- [x] Re-read Desktop README First context for project registry, store/runtime commands, and React wrappers
- [x] Add optional `project_id` support for Desktop compute job creation
- [x] Add optional `project_id` support for Desktop CanvasGraph save
- [x] Reject unknown project ids before writing jobs or graphs
- [x] Pass the selected project from Desktop React controls into job/canvas graph commands
- [x] Add Rust regression coverage for project-associated jobs and canvas graphs
- [x] Run Desktop Rust/React verification and browser render smoke
- [x] Update README First records

## Plan

- Preserve existing NULL `project_id` behavior when no project is selected.
- Treat project association as an optional local metadata link, not as a new external project package format.
- Validate project existence in Rust store/runtime, not in React.

## Review

- `compute_job_create` now accepts an optional `project_id`, validates it against SQLite `projects`, and persists it to `compute_jobs.project_id`.
- `canvas_graph_save` now accepts an optional `project_id`, validates it against SQLite `projects`, and persists it to `canvas_graphs.project_id`.
- Desktop React passes `selectedProject?.project_id` when creating the demo job or saving the demo CanvasGraph, and job detail displays the associated project id.
- Verification:
- `cargo test --manifest-path apps\desktop\src-tauri\Cargo.toml` passed (`20 passed`).
- `cd apps\desktop; npm run typecheck` passed.
- `cd apps\desktop; npm run build` passed.
- Browser check against `http://127.0.0.1:1420/` confirmed `Project`, `Create Project`, `Create Demo Job`, and `Save Canvas Graph` render.
- Remaining scope:
- External file dialog allowlists, `recent_files`, richer project package contents, ProcessGraph persistence UI, packaged sidecar, and installer smoke remain open Desktop MVP work.

# 2026-05-30 AutoWaterSimu Next Model Catalog API TODO

- [x] Re-read PRD/Technical Spec/Development Plan governance requirements and API/contract README context
- [x] Add `model_catalog.v1` JSON Schema with valid/invalid examples
- [x] Include `model_catalog.v1` in the Go contract validator and validation endpoint
- [x] Add built-in read-only material balance model catalog service
- [x] Add `GET /api/v1/model-catalog` and `GET /api/v1/model-catalog/{model_key}` endpoints
- [x] Update OpenAPI and regenerate isolated compute client
- [x] Run contract, Go, frontend, and local API smoke verification
- [x] Update README First records

## Plan

- Treat the model catalog as a Phase 6 governance wire shape first.
- Return a built-in P0 catalog for `material_balance`; do not add persistence tables or a parameter-set workflow in this step.
- Expose read-only API under existing `job:read` scope and keep production approval rules limited to the default parameter set status metadata.

## Review

- Added `contracts/model_catalog.v1.json` plus valid/invalid examples for material balance.
- `ContractValidator` now compiles `model_catalog.v1`, so `POST /api/v1/contracts/validate` can validate catalog documents.
- Go Compute API now returns a built-in `model_catalog.v1` document with `material_balance`, `material_balance.v1`, parameter templates, and an approved default parameter set.
- Added read-only endpoints `/api/v1/model-catalog` and `/api/v1/model-catalog/{model_key}` with `job:read` scope and regression coverage.
- Updated OpenAPI and regenerated `frontend/src/client/compute`; generated client now includes `listModelCatalog()` and `getModelCatalogModel()`.
- Verification:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`48 passed`).
- `cd apps\api; go test ./...` passed.
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Temporary local Compute API on port `8092` returned `model_catalog.v1`, one `material_balance` entry, and an approved default parameter set.
- Remaining scope:
- Persistent model catalog tables, benchmark cases, full parameter set lifecycle transitions, production evidence enforcement, and Web governance UI remain Phase 6 follow-up work.

# 2026-05-30 AutoWaterSimu Next Artifact Retention Metadata TODO

- [x] Re-read artifact contract, Go API store/upload path, and migration context
- [x] Extend `artifact.v1` with optional `retention_policy` and `retain_until`
- [x] Add valid/invalid retention contract fixture coverage
- [x] Add PostgreSQL migration for artifact retention metadata
- [x] Persist and return retention metadata from Go artifact upload/list/download metadata
- [x] Update OpenAPI and regenerate isolated compute client
- [x] Run contract, Go, frontend, and local HTTP smoke verification
- [x] Update README First records

## Plan

- Keep lifecycle behavior metadata-only in this step.
- Default missing worker metadata to `retain_forever`.
- Accept optional `retain_until` for future TTL/archive workers, but do not implement deletion or archive jobs.

## Review

- `artifact.v1` now supports optional `retention_policy` (`retain_forever`, `ttl`, `archive_candidate`) and `retain_until`.
- Added invalid fixture coverage for unsupported retention policy values.
- Added `0002_artifact_retention` PostgreSQL migration with rollback.
- Go `ArtifactRecord` persists/returns retention fields; upload defaults missing policy to `retain_forever` and parses optional RFC3339 `retain_until`.
- OpenAPI and generated compute client now expose retention fields on `ArtifactRecord`.
- Verification:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`49 passed`).
- `cd apps\api; go test ./...` passed.
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Temporary local Compute API on port `8093` accepted an artifact upload with `retention_policy=ttl` and returned `retain_until=2026-06-30T00:00:00Z`.
- Remaining scope:
- Actual artifact deletion/archive workers, evidence/model_run reference protection, retention admin UI, and long-term object-store lifecycle policy remain Phase 6 follow-up work.

# 2026-05-30 AutoWaterSimu Next Web Model Catalog Panel TODO

- [x] Re-read frontend services/routes README context and Compute Jobs route
- [x] Add service wrapper for generated `listModelCatalog`
- [x] Add read-only Model catalog panel to Compute Jobs
- [x] Keep parameter set lifecycle/editing out of the route layer
- [x] Run frontend typecheck/build and targeted Biome
- [x] Run browser/headless render smoke against temporary current API/dev server
- [x] Update README First records

## Plan

- Reuse the existing Compute Jobs route rather than adding a new navigation entry.
- Display model key/version/status/default parameter set status only.
- Treat the panel as read-only governance context, not an approval workflow.

## Review

- `computeJobsService.listModelCatalog()` wraps the generated Compute API `listModelCatalog`.
- Compute Jobs now renders a `Model catalog` panel with model name/key, version, status, default parameter set, parameter set status, template count, and parameter hash.
- Route error handling now includes model catalog query errors.
- Updated frontend services/routes README boundaries for read-only model catalog display.
- Verification:
- `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx src\services\computeJobsService.ts` passed after formatting fixes.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Browser plugin against `http://127.0.0.1:5174/compute-jobs` was redirected to `/login` by the legacy auth guard.
- Fallback headless Playwright with local storage auth against temporary 5174 Web + 8094 Compute API confirmed `Compute Jobs`, `Model catalog`, `Material Balance`, `approved`, and `Parameter hash` render.
- Remaining scope:
- Separate governance route, editable parameter set lifecycle, approval workflow, and model catalog persistence remain Phase 6 follow-up work.

# 2026-05-30 AutoWaterSimu Next Web Contract Validation Panel TODO

- [x] Re-read frontend services/routes context and generated `validateContract` client
- [x] Add service wrapper for `POST /api/v1/contracts/validate`
- [x] Add read-only Contract validation panel to Compute Jobs
- [x] Include Agent draft and Simulation request sample payload buttons
- [x] Keep valid drafts from auto-creating jobs
- [x] Run frontend typecheck/build, targeted Biome, and render/API smoke
- [x] Update README First records

## Plan

- Keep this as a validation workbench, not an Agent submission workflow.
- Call the generated Compute API client through `computeJobsService`.
- Display schema, valid state, and validation errors returned by the backend.

## Review

- `computeJobsService.validateContractDocument()` wraps generated `validateContract`.
- Compute Jobs now includes a `Contract validation` panel with editable JSON, `Agent draft` and `Simulation request` sample buttons, and a `Validate` action.
- Validation results show valid/invalid state, document schema, contract schema, and backend validation errors.
- The panel does not create compute jobs or implement user confirmation gate.
- Verification:
- `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx src\services\computeJobsService.ts` passed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Browser plugin against `http://127.0.0.1:5175/compute-jobs` was redirected to `/login` by the legacy auth guard.
- Fallback headless Playwright with local storage auth clicked `Validate` against temporary 5175 Web + 8095 Compute API and confirmed `Contract validation`, `valid`, `agent_scenario_draft.v1`, `agent_scenario_draft.v1.json`, and `No validation errors.` render.
- Remaining scope:
- User confirmation gate, draft-to-simulation-request promotion, production-related job creation rules, and result explanation refs remain Phase 6 follow-up work.

# 2026-05-30 AutoWaterSimu Next Constraint Draft Contract TODO

- [x] Re-read contracts, API, and frontend README context
- [x] Add `constraint_draft.v1` schema and valid/invalid examples
- [x] Register `constraint_draft.v1` with the Go contract validator
- [x] Add a Web Contract validation sample button for constraint drafts
- [x] Run contract, Go API, frontend, and render smoke validation
- [x] Update README First change records

## Plan

- Keep `constraint_draft.v1` as a draft-only contract with explicit `requires_confirmation`.
- Validate it through the existing read-only contract validation endpoint.
- Do not implement draft promotion, production constraint enforcement, or job creation in this step.

## Review

- Added `constraint_draft.v1` JSON Schema with draft id, creator, target ref, constraints array, severity/operator enums, and explicit `requires_confirmation`.
- Added valid and invalid material-balance-oriented examples under `contracts/examples`.
- Go `ContractValidator` now supports `constraint_draft.v1`, while unknown future schema versions still return `valid=false`.
- Compute Jobs Contract validation panel now includes a `Constraint draft` sample button.
- Updated contracts/API/frontend README boundaries so valid constraint drafts remain read-only until a user confirmation gate exists.
- Verification:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`53 passed`).
- `cd apps\api; go test ./...` passed.
- `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx src\services\computeJobsService.ts` passed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Browser plugin against `http://127.0.0.1:5176/compute-jobs` was redirected to `/login` by the legacy auth guard.
- Fallback headless Playwright with local storage auth clicked `Constraint draft` and `Validate` against temporary 5176 Web + 8096 Compute API, confirming `constraint_draft.v1`, `constraint_draft.v1.json`, and `No validation errors.` render.
- Remaining scope:
- User confirmation gate, draft-to-simulation-request promotion, production constraint enforcement, and result explanation refs remain Phase 6 follow-up work.

# 2026-05-30 AutoWaterSimu Next Result Explanation Contract TODO

- [x] Re-read Agent DSL/evidence refs PRD, Spec, Development Plan, and existing contracts
- [x] Add `result_explanation.v1` schema and valid/invalid examples
- [x] Register `result_explanation.v1` with the Go contract validator
- [x] Add a Web Contract validation sample button for result explanations
- [x] Run contract, Go API, frontend, and render smoke validation
- [x] Update README First change records

## Plan

- Require top-level `evidence_refs` and per-statement `evidence_refs`.
- Validate result explanations through the existing read-only contract validation endpoint.
- Do not generate Agent explanations, publish approvals, or mutate compute jobs in this step.

## Review

- Added `result_explanation.v1` JSON Schema requiring top-level `evidence_refs` and per-statement `evidence_refs`.
- Added valid and invalid material-balance-oriented result explanation examples.
- Go `ContractValidator` now supports `result_explanation.v1`, while unknown future schema versions still return `valid=false`.
- Compute Jobs Contract validation panel now includes a `Result explanation` sample button.
- Updated contracts/API/frontend README boundaries so valid result explanations remain read-only validation outputs, not approvals or published Agent explanations.
- Verification:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`57 passed`).
- `cd apps\api; go test ./...` passed.
- `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx src\services\computeJobsService.ts` passed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Browser plugin against `http://127.0.0.1:5177/compute-jobs` was redirected to `/login` by the legacy auth guard.
- Fallback headless Playwright with local storage auth clicked `Result explanation` and `Validate` against temporary 5177 Web + 8097 Compute API, confirming `result_explanation.v1`, `result_explanation.v1.json`, and `No validation errors.` render.
- Remaining scope:
- Agent explanation generation, review/publish workflow, production approval integration, and evidence ref dereference UI remain Phase 6 follow-up work.

# 2026-05-30 AutoWaterSimu Next Draft Confirmation Gate TODO

- [x] Re-read Agent DSL confirmation gate PRD, Spec, Development Plan, contracts, and API route context
- [x] Add `draft_confirmation.v1` schema and valid/invalid examples
- [x] Add validation-only `POST /api/v1/contracts/confirm-draft`
- [x] Validate embedded Agent/constraint draft without creating compute jobs
- [x] Update OpenAPI and generated compute client
- [x] Add Web `Draft confirmation` sample and `Confirm draft` dry-run action
- [x] Run contract, Go API, frontend, and render smoke validation
- [x] Update README First change records

## Plan

- Treat confirmation as a gate record, not a job submission mechanism.
- Require the confirmation wrapper and embedded draft to validate independently.
- Return a warning that the confirmation endpoint created no compute job.

## Review

- Added `draft_confirmation.v1` JSON Schema and valid/invalid examples.
- Added validation-only `POST /api/v1/contracts/confirm-draft`.
- Confirm-draft validates the wrapper, checks embedded draft schema/id consistency, validates the embedded draft, requires `requires_confirmation=true`, and returns a warning that no compute job was created.
- OpenAPI and generated compute client now expose `confirmDraft`.
- Compute Jobs Contract validation panel now includes `Draft confirmation`, `Confirm draft`, and warning display.
- Verification:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`61 passed`).
- `cd apps\api; go test ./...` passed.
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx src\services\computeJobsService.ts` passed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Browser plugin against `http://127.0.0.1:5178/compute-jobs` was redirected to `/login` by the legacy auth guard.
- Fallback headless Playwright with local storage auth clicked `Draft confirmation` and `Confirm draft` against temporary 5178 Web + 8098 Compute API, confirming `draft_confirmation.v1`, `draft_confirmation.v1.json`, `No validation errors.`, and `draft confirmation validated; no compute job was created`.
- Remaining scope:
- Confirmation persistence, audit trail, draft-to-job promotion, production-related job policy, and approval workflow integration remain Phase 6 follow-up work.

# 2026-05-30 AutoWaterSimu Next Risk Findings TODO

- [x] Re-read NewSystem/milp risk findings PRD, Development Plan, result, and evidence contracts
- [x] Add `compute_result.v1.risk_findings` schema and valid/invalid examples
- [x] Preserve top-level `risk_findings` in stored result summary
- [x] Run contract and Go API validation
- [x] Update README First change records

## Plan

- Keep risk findings in `compute_result.v1` instead of introducing a separate endpoint.
- Require each finding to carry `evidence_refs`.
- Copy findings into the stored summary so existing result read APIs expose them without storing the full result payload.

## Review

- `compute_result.v1` now supports optional top-level `risk_findings`.
- Each risk finding requires `risk_code`, `severity`, `title`, `description`, and at least one `evidence_ref`.
- Updated the material balance success fixture and added an invalid missing-risk-code fixture.
- Go API `Complete` copies top-level `risk_findings` into stored summary, so result read APIs expose them without storing the full result payload.
- Verification:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`62 passed`).
- `cd apps\api; go test ./...` passed.
- Remaining scope:
- Risk classification rules, NewSystem approval UI, evidence ref dereference, and production release policy remain Phase 6 follow-up work.

# 2026-05-30 AutoWaterSimu Next Evidence Governance TODO

- [x] Re-read PRD evidence governance requirement and existing evidence/model catalog/model_run code
- [x] Add `evidence_package.v1.governance` schema and examples
- [x] Generate governance summary from persisted model runs and built-in model catalog
- [x] Run contract and Go API validation
- [x] Update README First change records

## Plan

- Keep governance as read-only evidence metadata.
- Derive `production_allowed` from active model version plus matching approved default parameter set.
- Do not block job creation or execute production approval actions in this step.

## Review

- `evidence_package.v1` now supports optional `governance`.
- Governance includes `production_allowed` and per-model-run model/version/parameter status refs.
- Go evidence export derives governance from persisted model runs and the built-in model catalog.
- `production_allowed=true` currently requires an active model version and a matching approved default parameter set.
- Verification:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`63 passed`).
- `cd apps\api; go test ./...` passed.
- Remaining scope:
- Persistent model catalog, non-default parameter set lifecycle, benchmark cases, approval UI, and production enforcement remain Phase 6 follow-up work.

# 2026-05-30 AutoWaterSimu Next Benchmark Cases TODO

- [x] Re-read PRD/Development Plan model governance requirement and contracts/API/Web context
- [x] Add `model_catalog.v1` benchmark case schema and valid/invalid examples
- [x] Add built-in material balance validated benchmark case metadata
- [x] Update OpenAPI and generated compute client
- [x] Display benchmark case counts in Web Model catalog panel
- [x] Run contract, Go API, frontend, and render smoke validation
- [x] Update README First change records

## Plan

- Keep benchmark cases as read-only model catalog metadata.
- Do not implement benchmark execution, run history, or approval workflows in this step.
- Use the existing minimal material balance fixture as the first validated P0 benchmark reference.

## Review

- `model_catalog.v1` model versions now include required `benchmark_cases` metadata.
- Added a validated built-in material balance minimal benchmark case referencing the existing simulation input fixture.
- Added invalid fixture coverage for malformed benchmark cases.
- Go built-in model catalog returns the benchmark case and validates against `model_catalog.v1`.
- OpenAPI and generated Compute client now include `ModelBenchmarkCase`.
- Web Model catalog panel now shows benchmark case counts.
- Verification:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`64 passed`).
- `cd apps\api; go test ./...` passed.
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx src\services\computeJobsService.ts` passed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Browser plugin against `http://127.0.0.1:5179/compute-jobs` was redirected to `/login` by the legacy auth guard.
- Fallback headless Playwright with local storage auth confirmed `Model catalog`, `Benchmarks`, and benchmark count `1` render against temporary 5179 Web + 8099 Compute API.
- Remaining scope:
- Benchmark execution, benchmark run history, persistent model catalog, parameter set lifecycle, and approval workflow integration remain Phase 6 follow-up work.

# 2026-05-30 AutoWaterSimu Next Completion Audit TODO

- [x] Re-read `.ai/`, `tasks/`, and `docs/rebuild` README context
- [x] Review current worktree against PRD / Technical Spec / Development Plan phase areas
- [x] Create cross-session completion audit and remaining roadmap under `.ai/plans`
- [x] Re-run full verification matrix listed in the audit
- [x] Update README First change records

## Plan

- Treat the audit as a planning artifact, not proof of full completion.
- Separate current-turn evidence from previously recorded evidence.
- Keep remaining work explicit so the active goal is not accidentally narrowed.

## Review

- Added `.ai/plans/autowatersimu_next_completion_audit_2026-05-30.md`.
- The audit summarizes phase-level completion, direct evidence, remaining work, non-goals, and next implementation candidates.
- Verification refresh later on 2026-05-30 reran the core matrix:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`65 passed`).
- `cd apps\api; go test ./...` passed.
- Worker `--self-check`, worker pytest, minimal `--run-job`, and temporary API `--run-api-once` smoke passed.
- `backend\.venv\Scripts\python -m pytest simulation_core\tests -q` passed (`4 passed`).
- Legacy backend targeted regression command from `AGENTS.md` passed (`17 passed`, existing warnings only).
- Desktop `cargo test`, `npm run typecheck`, and `npm run build` passed.
- Frontend `npx tsc --noEmit` and `npm run build` passed, with existing Vite warnings only.
- Temporary Docker PostgreSQL migration up smoke and manual down rollback smoke passed.
- Remaining release-level verification gaps: browser render refresh, packaged sidecar smoke, NSIS installer smoke, CI gate wiring, and full release checklist execution.

# 2026-05-30 AutoWaterSimu Next Simulation Check API TODO

- [x] Re-read README First context for contracts, Go API, OpenAPI, and Phase 6 integration requirements
- [x] Add simulation check API path from `simulation_request.v1` to queued `compute_job.v1`
- [x] Add embedded milp simulation request fixture
- [x] Document current embedded-input requirement and unresolved lookup boundary
- [x] Regenerate compute client
- [x] Run contract, Go API, frontend, and smoke validation

## Plan

- Implement `POST /api/v1/simulation-checks` as the external NewSystem/milp entry point.
- Validate `simulation_request.v1` and embedded `simulation_input.v1`.
- Preserve `external_refs` such as `site_id`、`scenario_id` and `plan_id` in job context.
- Use deterministic job/idempotency defaults based on `request_id`.
- Do not claim support for persistent `simulation_input_id` lookup until that storage path exists.

## Review

- Added `POST /api/v1/simulation-checks`, guarded by `job:create`, to validate `simulation_request.v1` and queue a derived `compute_job.v1`.
- Added the `milp_material_balance.simulation_request.v1.json` fixture with embedded `simulation_input.v1` and `external_refs.plan_id`.
- `simulation_request.v1` now documents supported `input_ref` keys and external ref fields without requiring persisted lookup support.
- OpenAPI and generated Compute client now expose `createSimulationCheck` and `SimulationRequest`.
- Verification:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`65 passed`).
- `cd apps\api; go test ./...` passed.
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- `git diff --check -- ...` passed for the modified files after trimming generated `sdk.gen.ts` trailing whitespace.
- Remaining scope:
- Persistent `simulation_input_id` / `process_graph_id` lookup, NewSystem service integration tests, approval UI, and production release workflow remain follow-up work.

# 2026-05-30 AutoWaterSimu Next Simulation Input Registry TODO

- [x] Re-read README First context for contracts, Go API, migrations, OpenAPI, and Phase 6 integration requirements
- [x] Add metadata-store backed `simulation_input.v1` registry
- [x] Resolve `simulation_request.v1.input_ref.simulation_input_id` in simulation check creation
- [x] Add PostgreSQL migration and rollback script
- [x] Update OpenAPI and generated compute client
- [x] Run contract, Go API, frontend, and diff-check validation

## Plan

- Keep the registry scoped to validated simulation input payloads, hashes, and source metadata.
- Use `simulation_input_id` plus payload hash for idempotent registration.
- Let embedded simulation check payloads seed the registry, and let reference-only simulation checks resolve previously registered inputs.
- Do not implement `process_graph_id` or `model_run_id` lookup in this pass.

## Review

- Added `POST /api/v1/simulation-inputs` and `GET /api/v1/simulation-inputs/{simulation_input_id}`.
- Added `simulation_inputs` to memory store and PostgreSQL migrations.
- `POST /api/v1/simulation-checks` now supports both embedded `input_ref.simulation_input` and reference-only `input_ref.simulation_input_id` after registration.
- Verification:
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`65 passed`).
- `cd apps\api; go test ./...` passed.
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- `git diff --check -- ...` passed after trimming generated `sdk.gen.ts` trailing whitespace.
- Remaining scope:
- `process_graph_id` lookup, `model_run_id` replay/derivation, persistent model catalog, NewSystem service integration tests, approval UI, and production release workflow remain follow-up work.

# 2026-05-30 AutoWaterSimu Next Draft Confirmation Persistence TODO

- [x] Re-read README First context for contracts, Go API, migrations, OpenAPI, frontend services/routes, and Agent DSL requirements
- [x] Persist valid `draft_confirmation.v1` records without creating compute jobs
- [x] Add read-only confirmation record lookup endpoint
- [x] Add PostgreSQL migration and rollback script
- [x] Update OpenAPI and generated compute client
- [x] Show persisted confirmation metadata in the Web contract validation panel
- [x] Run Go, contract, frontend, API smoke, and PostgreSQL migration validation
- [x] Update README First records

## Plan

- Keep `confirm-draft` as a confirmation/audit gate, not a job creation or production approval endpoint.
- Store the full validated confirmation payload plus payload hash and audit metadata.
- Treat duplicate `confirmation_id` with the same hash as idempotent; reject hash conflicts.

## Review

- Added `draft_confirmations` metadata persistence with migration `0004_draft_confirmations`.
- `POST /api/v1/contracts/confirm-draft` now validates the wrapper and embedded draft, persists an audit record, and still returns a warning that no compute job was created.
- Added `GET /api/v1/contracts/confirmations/{confirmation_id}` for readback.
- OpenAPI and the isolated Compute TypeScript client now expose `DraftConfirmationRecord` and `getDraftConfirmation`.
- Compute Jobs contract validation panel now displays persisted confirmation id, decision, confirmer, and payload hash.
- Verification:
- `cd apps\api; go test ./...` passed.
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`65 passed`).
- `cd frontend; npx biome check src\routes\_layout\compute-jobs.tsx src\services\computeJobsService.ts` passed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Temporary in-memory Compute API smoke confirmed `confirm-draft` persisted and read back the confirmation record.
- Temporary Docker PostgreSQL migration smoke confirmed `0001`-`0004` up and reverse down scripts pass.
- Added and verified opt-in Go rollback smoke (`COMPUTE_API_MIGRATION_DOWN_SMOKE=true`) against a temporary Docker PostgreSQL database.
- Remaining scope:
- Draft promotion to `simulation_request.v1` / `compute_job.v1`, production-related job policy, approval UI, and Agent explanation publish workflow remain follow-up work.

# 2026-05-30 AutoWaterSimu Next ProcessGraph Registry TODO

- [x] Re-read README First context for contracts, Go API, migrations, OpenAPI, frontend services, and completion audit
- [x] Add metadata-store backed `process_graph.v1` registry
- [x] Resolve `simulation_request.v1.input_ref.process_graph_id` into generated `simulation_input.v1`
- [x] Add PostgreSQL migration and rollback script
- [x] Update OpenAPI, generated compute client, and frontend service wrappers
- [x] Run Go, contract, frontend type, and diff-check validation

## Plan

- Keep ProcessGraph registration scoped to validated process graph payloads, hashes, and source metadata.
- Use `(process_graph_id, version)` plus payload hash for idempotent registration.
- Generate material-balance `simulation_input.v1` from a registered ProcessGraph at simulation-check submission time.
- Do not implement `model_run_id` replay, persistent model catalog, or draft promotion in this pass.

## Review

- Added `POST /api/v1/process-graphs` and `GET /api/v1/process-graphs/{process_graph_id}?version=1`.
- Added `process_graphs` to memory store and PostgreSQL migrations.
- `POST /api/v1/simulation-checks` now supports registered `input_ref.process_graph_id` / `process_graph_version`, generates a schema-valid `simulation_input.v1`, stores it through the existing simulation input registry, and queues a normal `compute_job.v1`.
- Added a reference-only ProcessGraph simulation request fixture.
- OpenAPI and the isolated Compute TypeScript client now expose `ProcessGraphRecord`, `registerProcessGraph`, and `getProcessGraph`; `computeJobsService` has matching wrappers.
- Verification:
- `cd apps\api; go test ./...` passed.
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`66 passed`).
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Temporary Docker PostgreSQL migration up/down smoke covered `0001`-`0005` and passed.
- `git diff --check` passed after trimming generated `sdk.gen.ts` trailing whitespace.
- Remaining scope:
- `model_run_id` replay/derivation, persistent model catalog, draft promotion, NewSystem service integration tests, approval UI, and production release workflow remain follow-up work.

# 2026-05-30 AutoWaterSimu Next ModelRun Replay TODO

- [x] Re-read README First context for `model_run.v1`, simulation request, Go API store/service, and completion audit
- [x] Implement conservative `simulation_request.v1.input_ref.model_run_id` replay
- [x] Add a valid model-run replay simulation request fixture
- [x] Add Go regression coverage for missing and persisted model_run replay
- [x] Run Go API and contract validation
- [x] Update README First records

## Plan

- Treat replay as exact reuse of the source job's original `simulation_input.v1` payload.
- Require persisted `model_run.v1.job_id` and a source job whose stored `compute_job.v1.payload` is `simulation_input.v1`.
- Do not infer payloads from `input_hash`, quality metrics, evidence refs, or model catalog metadata.

## Review

- `POST /api/v1/simulation-checks` now resolves `input_ref.model_run_id` by loading the persisted model run, finding its source job, validating that source job payload is `simulation_input.v1`, and queuing a new simulation check job with that payload.
- Missing model runs return `MODEL_RUN_NOT_FOUND`; model runs without a replayable source job/payload are rejected instead of fabricating inputs.
- Added `material_balance_model_run.simulation_request.v1.json` as a valid replay request fixture.
- Verification:
- `cd apps\api; go test ./...` passed.
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`67 passed`).
- `git diff --check` passed with LF/CRLF warnings only.
- Remaining scope:
- Evidence/risk dereference UI/API, NewSystem service-level E2E, persistent model catalog, draft promotion, approval UI, and production release workflow remain follow-up work.

# 2026-05-30 AutoWaterSimu Next Draft Promotion TODO

- [x] Re-read README First context for Agent draft, draft confirmation, simulation request, Go API, OpenAPI, and frontend service wrappers
- [x] Define a conservative promotion boundary for approved Agent drafts
- [x] Add explicit promotion endpoint behind persisted draft confirmation
- [x] Add promotable confirmation fixture with complete `simulation_request.v1`
- [x] Update OpenAPI, generated compute client, and frontend service wrapper
- [x] Run Go, contract, frontend type, and diff-check validation

## Plan

- Keep `confirm-draft` as audit persistence only; it still creates no job.
- Add a separate explicit promotion endpoint for approved `agent_scenario_draft.v1` confirmations.
- Require `draft.proposed_request` to already be a complete schema-valid `simulation_request.v1`.
- Do not infer missing fields from the draft, confirmation metadata, constraints, evidence, or user profile.

## Review

- Added `POST /api/v1/contracts/confirmations/{confirmation_id}/promote-simulation-check`.
- Promotion loads the persisted confirmation, requires `decision=approved`, requires `draft_schema_version=agent_scenario_draft.v1`, validates embedded `proposed_request` as `simulation_request.v1`, then reuses the existing simulation-check job creation path.
- Duplicate promotion is idempotent through the existing simulation request idempotency defaults.
- Added `material_balance_promotable.draft_confirmation.v1.json`.
- Verification:
- `cd apps\api; go test ./...` passed.
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`68 passed`).
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- `git diff --check` passed with LF/CRLF warnings only.
- Remaining scope:
- Constraint draft application semantics, production approval policy, Agent explanation generation/review/publish, evidence/risk dereference UI/API, persistent model catalog, and release workflow remain follow-up work.

# 2026-05-30 AutoWaterSimu Next Persistent Model Catalog TODO

- [x] Re-read README First context for PRD/Spec/Development Plan, completion audit, model catalog contracts, Go API, migrations, OpenAPI, and frontend services
- [x] Record persistent model catalog scope as an ADR
- [x] Add metadata-store backed `model_catalog.v1` snapshot persistence
- [x] Make model catalog GET and evidence governance prefer the latest persisted `default` catalog with built-in fallback
- [x] Update OpenAPI, generated compute client, and frontend service wrapper
- [x] Run Go, contract, frontend, migration, and diff-check validation
- [x] Commit this completed slice

## Plan

- Persist full schema-valid catalog snapshots first.
- Use `metadata.catalog_id` as catalog id, defaulting to `default`.
- Treat duplicate `(catalog_id, payload_hash)` as idempotent.
- Do not implement parameter set lifecycle transitions or benchmark run history until their semantics are defined.

## Review

- Added ADR `0003-persistent-model-catalog-scope.md`.
- Added `model_catalogs` in memory/PostgreSQL store plus migration `0006_model_catalogs`.
- `POST /api/v1/model-catalog` now registers schema-valid snapshots under `model:write`.
- `GET /api/v1/model-catalog` / `{model_key}` now read latest persisted `default` catalog, falling back to built-in material balance catalog when none exists.
- Evidence governance now evaluates model/version/parameter status against the latest persisted catalog when available.
- OpenAPI and isolated Compute TypeScript client now expose `ModelCatalogRecord` and `registerModelCatalog`; `computeJobsService` has a matching wrapper.
- Verification:
- `cd apps\api; go test ./...` passed.
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`68 passed`).
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- Temporary Docker PostgreSQL migration smoke covered `0001`-`0006` up/down and passed.
- `git diff --check` passed with LF/CRLF warnings only.
- Remaining scope:
- Parameter set lifecycle endpoints, benchmark run contract/history, standalone governance UI, production approval policy, evidence/risk dereference UI/API, and ASM/UDM catalog expansion remain follow-up work.

# 2026-05-30 AutoWaterSimu Next Parameter Set Lifecycle TODO

- [x] Re-read README First context, persistent catalog ADR, completion audit, Go API, OpenAPI, and frontend service wrappers
- [x] Record minimal parameter set lifecycle semantics as an ADR
- [x] Add default parameter set status transition endpoint
- [x] Generate a new validated catalog snapshot after successful transitions
- [x] Update OpenAPI, generated compute client, frontend service wrapper, and README boundaries
- [x] Run Go, contract, frontend type/build, and diff-check validation

## Plan

- Scope lifecycle mutation to `default_parameter_set.status` only.
- Allow forward transitions `draft -> candidate -> validated -> approved`.
- Allow `retired` from any non-retired status.
- Reject backward transitions, transitions out of `retired`, optional `from_status` mismatch, and missing model/version/parameter set.
- Do not create production approvals, benchmark runs, or multi-parameter-set management in this step.

## Review

- Added ADR `0004-parameter-set-lifecycle-minimal-scope.md`.
- Added `POST /api/v1/model-catalog/{model_key}/versions/{model_version}/default-parameter-set/status`.
- The endpoint uses `model:write`, validates `to_status` / optional `from_status`, checks the allowed state machine, updates the latest catalog's existing default parameter set, and stores a new catalog snapshot.
- Repeated requests for the already-current status return a no-op response without creating a new snapshot.
- OpenAPI and isolated Compute TypeScript client expose `ParameterSetStatusUpdateRequest` and `ModelParameterSetTransitionResponse`; `computeJobsService` has a matching wrapper.
- Verification:
- `cd apps\api; go test ./...` passed.
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`68 passed`).
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- `git diff --check` passed with LF/CRLF warnings only.
- Remaining scope:
- Multi-parameter-set lifecycle, benchmark-backed approval, benchmark run history, standalone governance UI, production approval policy, and evidence/risk dereference remain follow-up work.

# 2026-05-30 AutoWaterSimu Next Evidence Ref Dereference TODO

- [x] Re-read README First context for contracts, Go API evidence/result code, OpenAPI, and frontend service wrapper
- [x] Define minimal job-scoped evidence ref dereference boundary
- [x] Add evidence-ref read endpoint for supported ref types
- [x] Update OpenAPI, generated compute client, frontend service wrapper, and README boundaries
- [x] Run Go, contract, frontend type/build, and diff-check validation

## Plan

- Add a job-scoped read endpoint under `GET /api/v1/compute/jobs/{job_id}/evidence-ref?ref=...`.
- Require `evidence:read`.
- Resolve only supported refs that belong to the requested job.
- Start with `model_run:<id>`, `artifact:<id>`, `job:<id>`, and embedded `simulation_input:<id>`.
- Do not dereference across unrelated jobs, inline artifact bytes, or implement approval actions.

## Review

- Added `EvidenceReferenceResolution` and `ResolveEvidenceReference`.
- `model_run:<id>` checks the persisted model run's `job_id`.
- `artifact:<id>` checks the artifact's `job_id` and returns metadata only.
- `job:<id>` returns the job metadata only when it matches the route job id.
- `simulation_input:<id>` resolves the embedded `simulation_input.v1` payload from the job input when it matches the ref.
- Added HTTP and Go regression coverage for `model_run` evidence ref success, not found, and worker-token denial.
- OpenAPI and isolated Compute TypeScript client expose `resolveEvidenceReference`; `computeJobsService` has a matching wrapper.
- Verification:
- `cd apps\api; go test ./...` passed.
- `backend\.venv\Scripts\python -m pytest contracts\tests -q` passed (`68 passed`).
- `cd frontend; npm run generate-compute-client` completed.
- `cd frontend; npx tsc --noEmit` passed.
- `cd frontend; npm run build` passed with existing Vite warnings.
- `git diff --check` passed with LF/CRLF warnings only.
- Remaining scope:
- UI integration for approval pages, richer evidence ref grammar, process graph registry dereference, full result explanation review/publish, and NewSystem service-level E2E remain follow-up work.

# 2026-05-31 AutoWaterSimu Next Store Interface Split TODO

- [x] Re-read README First context for Compute API, scripts, architecture docs, and Certainty/Elegance plan
- [x] Split the aggregate Compute API metadata `Store` into embedded domain store interfaces
- [x] Update the Compute API boundary audit script to resolve embedded interfaces
- [x] Update architecture and directory README context for the first Store split
- [x] Run Go API, dependency, PR fast, and diff-check validation

## Plan

- Keep `apps/api/internal/compute` as one package in this pass.
- Do not move PostgreSQL or MemoryStore implementations.
- Do not change HTTP behavior, OpenAPI, contracts, migrations, generated clients, or auth scopes.
- Treat this as the first Store split slice: aggregate interface first, service constructor narrowing later.

## Review

- `Store` now embeds 12 domain metadata store interfaces: jobs, workers, artifact metadata, archive metadata, model runs, benchmark runs, model catalog, process graphs, simulation inputs, draft confirmations, result explanations, and metrics.
- The existing byte/object `ArtifactStore` name in `artifacts.go` is preserved; metadata persistence uses `ArtifactMetadataStore`.
- `scripts/audit-compute-api-boundary.ps1` now resolves embedded interfaces, records embedded interface evidence, and fails if expected domain interfaces are missing.
- Documentation now distinguishes this first aggregate-interface split from the remaining service-constructor narrowing and package split work.
- Verification:
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed, reporting 41 resolved Store methods, 12 embedded interfaces, and 12 domain groups.
- `cd apps\api; go test ./...` passed.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed` with 6 passed steps.
- `git diff --check -- apps\api docs scripts tasks\todo.md .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
- Service constructors still depend on the aggregate `Store`; next split should narrow artifact retention/archive paths first.
- `apps/api/internal/compute` remains a large single package; Go domain package movement remains follow-up work.

# 2026-05-31 AutoWaterSimu Next Artifact Lifecycle Service Boundary TODO

- [x] Re-read README First context for Compute API, internal compute, architecture, and Certainty/Elegance plan
- [x] Introduce `ArtifactLifecycleService` with narrow artifact metadata, archive metadata, and object-store dependencies
- [x] Delegate public `Service.DownloadArtifact` and `Service.SweepArtifactRetention` to the narrow service
- [x] Update Compute API README, architecture current-state, and Certainty/Elegance checklist
- [x] Run focused retention tests, Go API, audit, dependency, PR fast, and diff-check validation

## Plan

- Keep public HTTP/API behavior stable.
- Do not modify OpenAPI, contracts, generated clients, migrations, auth scopes, or object-store implementations.
- Treat this as one service-constructor narrowing slice, not the full Go API package split.
- Preserve existing hot artifact and archive object-store behavior by moving logic rather than rewriting it.

## Review

- Added `artifact_lifecycle.go`.
- `ArtifactLifecycleService` constructor now depends on `ArtifactMetadataStore`, `ArchiveMetadataStore`, hot artifact storage, optional archive storage, and a clock.
- `Service.DownloadArtifact` and `Service.SweepArtifactRetention` remain as compatibility methods and delegate to the narrow service.
- Verification:
- `cd apps\api; go test ./internal/compute -run "TestArtifactRetention|TestHTTPArtifactRetention|TestS3ArtifactStore" -count=1` passed.
- `cd apps\api; go test ./...` passed.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1` passed, reporting 41 resolved Store methods, 12 embedded interfaces, and 12 domain groups.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1` passed.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1` passed; evidence status `passed` with 6 passed steps.
- `git diff --check -- apps\api docs scripts tasks\todo.md .ai\changes\2026-05-31.md` passed with LF/CRLF warnings only.
- Remaining scope:
- Most `Service` behavior still depends on the aggregate `Store`; continue with simulation input/process graph or draft confirmation/result explanation constructor narrowing.
- Go package movement remains follow-up work.
