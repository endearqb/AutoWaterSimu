# AutoWaterSimu Next Standalone Migration Matrix

- Version: v1.0
- Date: 2026-06-21
- Status: Phase 0 baseline
- Scope: FastAPI runtime exit, no-login Web shell, Go API ownership, PostgreSQL metadata, Python worker execution

## 1. Baseline Scan

Commands run for this matrix:

```powershell
rg -n "LoginService|UsersService|/users/me|/login/access-token|access_token" frontend\src frontend\tests -g "!frontend/src/client/**"
rg -n "MaterialBalanceService|FlowchartsService|Asm1SlimService|Asm1Service|Asm3Service|UDM|client/sdk.gen|client/types.gen" frontend\src\components frontend\src\stores frontend\src\services frontend\src\routes -g "!frontend/src/client/**"
rg -n "Authorization.*Bearer|Bearer.*Authorization|api-token|DEFAULT_API_TOKEN|VITE_COMPUTE_API_TOKEN|compute_access_token" services\simulation-worker frontend\src scripts\ci -g "!frontend/src/client/**"
rg -n "findRepoRoot|COMPUTE_API_CONTRACTS_DIR|contracts" apps\api\cmd\compute-api apps\api\internal -g "!**/*_test.go"
Get-ChildItem -Name docker-compose*.yml
rg -n "^standalone|standalone-" Justfile scripts -g "!**/node_modules/**"
```

Observed counts on 2026-06-21:

| Area | Finding |
|---|---:|
| Frontend login/user references outside generated client | 52 |
| Frontend legacy model/client references in active code areas | 576 |
| Bearer-token / compute token assumptions in worker, frontend, CI | 27 |
| Compute API repo-root / contracts-dir related references | 49 |
| Standalone compose files | 0 |
| `standalone-*` just/script targets | 0 |

## 2. P0 Route / Caller Matrix

| P0 slice | Current caller / file | Legacy dependency | Go / standalone target | Owner | Target phase | Required gate |
|---|---|---|---|---|---:|---|
| App bootstrap auth token | `frontend/src/main.tsx` | `OpenAPI.TOKEN` reads `access_token`; global 401/403 redirects `/login` | Runtime config honors `VITE_AUTH_MODE=disabled`; no redirect in standalone | Frontend | 2 | No-auth browser network assertion |
| Layout route guard | `frontend/src/routes/_layout.tsx` | `isLoggedIn()` redirects to `/login` | Standalone route tree enters workbench/scenario list with empty localStorage | Frontend | 2 | Clear-localStorage browser smoke |
| Session hook | `frontend/src/hooks/useAuth.ts` | `LoginService`, `UsersService.readUserMe`, register/logout token lifecycle | Removed from standalone shell or replaced by standalone principal/session facade | Frontend | 2 | Runtime import audit |
| Login/user/admin/settings routes | `frontend/src/routes/login.tsx`, `signup.tsx`, `recover-password.tsx`, `reset-password.tsx`, `_layout/admin.tsx`, user settings components | FastAPI login/users endpoints | Hidden or excluded from standalone navigation and route tree | Frontend | 2 / 7 | Route/menu snapshot plus `rg` gate |
| Compute API auth | `apps/api/cmd/compute-api/main.go`, `apps/api/internal/platform/auth/auth.go` | Static Bearer token required by default | `COMPUTE_API_AUTH_MODE=disabled` PrincipalProvider plus preserved `static_token` mode | Go | 1 | No-header curl create/read; static security smoke |
| Worker API loop | `services/simulation-worker/simulation_worker/api_client.py` | Always sends `Authorization: Bearer <token>` with default `dev-worker-token` | Empty token sends no Authorization header; disabled API accepts worker lifecycle | Python worker | 1 | Worker no-token API loop smoke |
| Compute client token | `frontend/src/shared/api/computeApiClient.ts` | Defaults `dev-public-token` and reads `compute_access_token` | Disabled mode sends no token unless configured | Frontend | 2 | Browser network assertion |
| Current-flow live test | `frontend/tests/compute-jobs-current-flow-live.spec.ts` and script wrapper | Sets `access_token`; mocks `/api/v1/users/me` | No `access_token`; no `/users/me` mock; real Go API + worker remains | QA / Frontend | 2 | Current-flow live smoke |
| Flowchart persistence | `frontend/src/stores/flowStore.ts`, `materialBalanceStore.ts`, model flow stores | FastAPI `FlowchartsService` / model-specific flowchart services | Go Scenario + CanvasGraph + ProcessGraph APIs | Go + Frontend | 3 | Save/restart/load smoke |
| Material Balance submit/result | `frontend/src/components/Flow/menu/MaterialBalanceBubbleMenu.tsx`, `SimulationActionPlate.tsx`, stores | FastAPI `MaterialBalanceService` and legacy result routes | Feature builder -> `simulation_request.v1` -> Go job/result/artifact/evidence | Full stack | 3 / 5 | Material Balance live scenario |
| ASM1Slim/ASM1/ASM3 submit/result | `frontend/src/services/asm1slimService.ts`, `asm1Service.ts`, `asm3Service.ts`, model stores/routes | FastAPI model and flowchart services | Dedicated builders; no generic graph resolver until semantics stable | Full stack | 5 | Five-model live smoke |
| UDM model editor | `frontend/src/services/udmService.ts`, UDM components/stores/routes | FastAPI UDM model/version/template/validation endpoints | Go UDM model/version/template/validation APIs | Go + Python + Frontend | 4 | UDM create/version/validate smoke |
| Hybrid UDM | `frontend/src/components/UDM/HybridUDMSetupDialog.tsx`, UDM flow/model stores | Legacy hybrid config persistence/validation | Go hybrid config CRUD + strict validation; worker parameter hash includes snapshot/bindings | Go + Python + Frontend | 4 | Hybrid worker/live smoke |
| Result/evidence pages | `frontend/src/features/compute-jobs/*`, evidence/model-governance wrappers | Mostly Go Compute client already, but auth/user mock remains | Go-only reads; no legacy auth or generated FastAPI runtime import | Frontend | 5 | Jobs/result/evidence live browser |
| Legacy migration | `backend/` database tables and FastAPI route data | Flowcharts, UDM, hybrid configs, convertible jobs | `apps/api/cmd/migrate-legacy` dry-run/resume/verify; imported history for non-convertible jobs | Go / DBA | 6 | Migration smoke |
| Standalone runtime | `docker-compose.dev.yml`, `Justfile` | dev stack still token/FastAPI-era oriented; no standalone compose | `docker-compose.standalone.yml`; `just standalone-*`; no backend service | DevOps / Go | 1 / 7 | Standalone compose smoke |
| Release boundary | `scripts/ci/*`, `Justfile` | Gates still named live-backend/current-flow with `/users/me` mocks in browser lanes | Standalone runtime audit, no-auth browser/live gates, release image smoke | QA / DevOps | 7 | Standalone RC gate |

## 3. Data Ownership Matrix

| Legacy data / API | Standalone target | Migration rule |
|---|---|---|
| Users, passwords, password reset, items | Not migrated | Preserve only `legacy_actor_ref` when needed for provenance. |
| Flowcharts | Scenario + CanvasGraph + ProcessGraph | Store original JSON, normalized projection, source hash, and immutable published ProcessGraph version. |
| Material Balance / ASM job history | ComputeJob + ModelRun + Artifact when convertible | Convert only schema-valid, replayable jobs. |
| UDM models / versions / templates | UDM model/version tables | Preserve immutable version identity and definition hash. |
| Hybrid UDM configs | Hybrid config table | Re-run strict validation and record warnings. |
| Non-convertible jobs | `imported_legacy_history` | Read-only archive; never pretend to be replayable standard jobs. |

## 4. Phase Owners And Exit Evidence

| Phase | Exit evidence expected before commit |
|---:|---|
| 0 | This matrix, standalone boundary ADR, baseline gate attempts, `.ai/changes` record. |
| 1 | No-header API create/read, worker no-token run, standalone compose skeleton, static-token smoke. |
| 2 | Empty localStorage browser smoke, no `/users/me` network request, frontend typecheck. |
| 3 | Scenario/graph persistence migration tests and save/restart/load smoke. |
| 4 | UDM/Hybrid Go API and worker smoke. |
| 5 | Five-model UI-to-worker live smoke and result/artifact restart read. |
| 6 | Idempotent legacy migration dry-run/verify report. |
| 7 | Standalone RC gate, backup/restore, release image smoke, docs updated. |

## 5. Open Gaps

- `apps/api/README.md` and `apps/api/cmd/compute-api/README.md` still describe static token as the P0 auth baseline. That is now superseded for standalone mode by the standalone requirements document; Phase 1 must update code and README together.
- Current browser/live smokes still mock `/api/v1/users/me`; Phase 2 must remove that mock before claiming no-auth standalone browser coverage.
- There is no standalone compose or just target yet; Phase 1 must add the first runnable skeleton before any runtime claim.
- Frontend legacy client references are broad because current legacy pages remain in the app. Phase 2 should first carve out a standalone route tree instead of deleting all legacy code.
