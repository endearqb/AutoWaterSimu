# AutoWaterSimu Next Local Development

> Status: root task entry added, 2026-05-31.

## Root Entry

The root `Justfile` is the current monorepo task graph entry.

Recommended first checks:

```powershell
just doctor
just check-deps
just check-ontology
just check
just pr-fast
just integration-smoke
just check-security
just browser-smoke
just live-backend-browser-smoke
just current-flow-live-smoke
just desktop-package-smoke
just golden-scenarios
just golden-scenarios-refresh
just golden-scenarios-refresh-integration
just golden-scenarios-refresh-live
just golden-scenarios-refresh-current-flow-live
```

If `just` is not installed, run the underlying PowerShell scripts directly:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\doctor.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-compute-api-boundary.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-ontology.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-contracts.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\integration-smoke.ps1 -StartCompose
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\security-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\browser-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\live-backend-browser-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\current-flow-live-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\desktop-package-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunIntegrationSmoke
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunLiveBackendBrowserSmoke
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunCurrentFlowLiveSmoke
backend\.venv\Scripts\python -m pytest contracts\tests -q
cd apps\api; go test ./...
cd frontend; npx tsc --noEmit
```

## Main Recipes

| Recipe | Purpose |
|---|---|
| `just doctor` | Checks required fast-check tools and optional release/local-dev tools |
| `just bootstrap` | Installs Go, frontend, and desktop dependencies |
| `just dev` | Starts the Next dev compose stack in the foreground |
| `just dev-detached` | Starts the Next dev compose stack in the background |
| `just dev-down` | Stops the Next dev compose stack |
| `just dev-api` | Runs the Go Compute API from source |
| `just dev-worker-loop` | Runs a bounded Python worker API loop |
| `just dev-frontend` | Runs the legacy Web/Vite frontend |
| `just check` | Runs dependency boundary check, contract tests, Go tests, and frontend typecheck |
| `just check-full` | Runs the Next merge gate without `-SkipLong` |
| `just pr-fast` | Runs the PR fast lane and writes `tmp/ci-evidence/pr-fast.json` |
| `just integration-smoke` | Starts an isolated Compose API stack, runs local Python worker API once, and writes `tmp/ci-evidence/integration-smoke.json` |
| `just check-security` | Runs token guard, scope denial, revocation, admin-scope, and selected mutation audit checks and writes `tmp/ci-evidence/security-smoke.json` |
| `just browser-smoke` | Runs mock-backed Playwright Compute Jobs/current-flow/result/evidence, contract validation, Model governance, and lifecycle smokes and writes `tmp/ci-evidence/browser-smoke.json` |
| `just live-backend-browser-smoke` | Starts a real integration-backed Compute API job, runs Playwright against the live API without Compute route mocks, and writes `tmp/ci-evidence/live-backend-browser-smoke.json` |
| `just current-flow-live-smoke` | Starts a live Compute stack plus worker loop, submits current flow through the browser, verifies worker completion/evidence/ref, and writes `tmp/ci-evidence/current-flow-live-smoke.json` |
| `just desktop-package-smoke` | Runs Desktop package/support bundle contract fixtures, Rust clean-runtime round-trip, support bundle redaction, Desktop typecheck, and writes `tmp/ci-evidence/desktop-package-smoke.json` |
| `just golden-scenarios` | Summarizes existing CI/release evidence against the 8 golden scenarios and writes `tmp/ci-evidence/golden-scenarios.json` |
| `just golden-scenarios-refresh` | Refreshes non-Docker local evidence lanes, then writes the 8 golden scenario summary |
| `just golden-scenarios-refresh-integration` | Refreshes non-Docker local evidence lanes, runs Docker-backed integration smoke, then writes the 8 golden scenario summary |
| `just golden-scenarios-refresh-live` | Refreshes non-Docker local evidence lanes, runs live backend browser smoke, then writes the 8 golden scenario summary |
| `just golden-scenarios-refresh-current-flow-live` | Refreshes non-Docker local evidence lanes, runs current-flow live smoke, then writes the 8 golden scenario summary |
| `just audit-compute-api` | Runs the Compute API Store/domain boundary audit |
| `just check-ontology` | Validates Water Ontology object/action/link/policy registry consistency |
| `just check-contracts` | Runs the registry-backed contract and Compute TS client drift gate |
| `just gen` | Regenerates the frontend Compute API client |
| `just release-gate` | Runs the release gate; real release mode still requires packaged artifacts |

## Current Limits

- `docker-compose.dev.yml` is a source-mounted local stack candidate for Postgres + MinIO + Compute API + worker + frontend. It intentionally uses dev static tokens and must not be treated as production deployment evidence.
- `scripts/ci/integration-smoke.ps1 -StartCompose` currently starts only the stack required for API smoke (`compute-api` plus Postgres and MinIO dependencies) and runs the Python worker from `backend/.venv` on the host to avoid first-start container dependency installation timing.
- The worker container installs Python scientific dependencies on startup using a pip cache volume; first start can be slow.
- The Go API can run without `COMPUTE_API_DATABASE_URL` using in-memory metadata for local Web smoke, but durable platform use still requires PostgreSQL.
- Worker API loop assumes `backend/.venv` exists and has the project Python dependencies installed.
- The current integration smoke proves job create, worker register/claim/heartbeat/complete, model_run persistence, artifact upload/download checksum, evidence package checksum, retention dry-run, metrics, and compose cleanup. `.github/workflows/next-integration-smoke.yml` can run the same smoke manually or through `workflow_call`; a hosted green run must still be checked in GitHub Actions before claiming hosted evidence. It does not yet prove browser/frontend reads, packaged worker, or release artifact behavior.
- The current security smoke proves production default-token startup guard, static token revocation, scope denial, admin-only artifact retention, and selected mutation audit envelopes for job create plus artifact retention events. It does not yet prove full RBAC, tenant/project/site data scope, all-mutation audit, or real issuer/JWKS integration.
- The current browser smoke proves Web route orchestration with mock-backed Playwright for Compute Jobs/current-flow, contract validation, Model governance, and lifecycle retention. It does not prove a live Postgres/MinIO/worker backend or an authenticated legacy backend session.
- The live backend browser smoke starts the integration-backed Compute API/PostgreSQL/MinIO/worker path, keeps the API up, and runs Playwright against Compute Jobs without Compute API route mocks. `.github/workflows/next-live-backend-browser-smoke.yml` can run the same lane manually or through `workflow_call`. It proves job/result/evidence/ref reads from the live Compute API, while still mocking only legacy `/api/v1/users/me`; it does not prove a full legacy authenticated backend session or UI current-flow submit to live worker in one browser scenario, and a hosted green run must still be checked in GitHub Actions before claiming hosted evidence.
- The current-flow live smoke starts an isolated Compute API/PostgreSQL/MinIO stack plus a bounded host Python worker loop, submits current flow from the browser, waits for the real worker result, and verifies evidence package download plus evidence ref resolution. `.github/workflows/next-current-flow-live-smoke.yml` can run the same lane manually or through `workflow_call`; it still mocks only legacy `/api/v1/users/me`, and a hosted green run must still be checked in GitHub Actions before claiming hosted evidence.
- The current Desktop package smoke proves schema fixtures, source-mode runtime clean export/import, checksum-verified restore, metadata restoration, artifact/model_run refs, support bundle redaction, and Desktop React wrapper typechecking. It does not prove packaged worker exe, NSIS installer, or hosted release artifact behavior.
- The current golden scenario summary reads existing lane evidence and reports scenario-level `partial` / `missing` / `blocked` status. `just golden-scenarios-refresh` first runs the non-Docker local lanes (`pr-fast`, browser, security, Desktop package, release artifact download smoke, and merge release gate with `-SkipLong`) and records refresh step results in `golden-scenarios.json`; it is still an evidence map, not a replacement for live scenario execution. PostgreSQL migration coverage is counted only from current integration smoke evidence or a current release gate that actually ran the `postgres migration up/down smoke` step. Docker integration is explicit through `just golden-scenarios-refresh-integration` or `scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunIntegrationSmoke`.
- Live browser backend coverage is explicit through `just golden-scenarios-refresh-live` or `scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunLiveBackendBrowserSmoke`; this also refreshes integration evidence because the browser lane needs a real succeeded job.
- Current-flow live coverage is explicit through `just golden-scenarios-refresh-current-flow-live` or `scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunCurrentFlowLiveSmoke`.
- CI smoke evidence keeps backward-compatible dirty fields and also records tracked/untracked dirty-state fields: `has_tracked_changes_*`, `tracked_changes_*`, and `untracked_files_*`. Treat `is_dirty_*` as the broad worktree flag; use tracked fields to decide whether local evidence contains uncommitted code/doc edits.
- The current Water Ontology gate proves registry consistency only. It does not prove runtime RBAC/ABAC, tenant/project/site data-scope filtering, approval workflow, or mutation audit enforcement.
- Release mode must not use `-AllowMissingPackageArtifacts` to claim a release passed.

## Next Dev Compose

```powershell
docker compose -f docker-compose.dev.yml config
docker compose -f docker-compose.dev.yml up
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\integration-smoke.ps1 -StartCompose
```

Default local ports:

| Service | URL |
|---|---|
| Compute API | `http://localhost:8088` |
| Web frontend | `http://localhost:5173` |
| MinIO API | `http://localhost:9000` |
| MinIO console | `http://localhost:9001` |
| Compute PostgreSQL | `localhost:5434` |

The compose stack creates a MinIO bucket named `autowatersimu-archive` and configures the Compute API S3 archive backend against it.
