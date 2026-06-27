# AutoWaterSimu
[中文说明](./README_zh.md)
---

An automated water cycle simulation system for simulating and analyzing water cycles and water treatment processes.  
AutoWaterSimu Next is the canonical mainline: a contract-first monorepo for Go Compute API, Python simulation worker, desktop/runtime packaging, UDM network simulation, ASM/BSM workflows, and legacy parity evidence.

> The original FastAPI + React system remains in `backend/` and `frontend/` as legacy comparison/oracle material. The frozen legacy branch is `legacy/fastapi-frozen`.

---

## README First / AI Context Protocol

This repository uses a README First workflow for human and AI collaboration.
`AGENTS.md` is the executable rulebook; `README_First.md` explains the principles and document roles behind those rules.

Recommended reading order before changing files:

1. `AGENTS.md`
2. `README_First.md`
3. This root `README.md`
4. The nearest `README.md` files from parent directory to target directory
5. The target files, direct dependencies, callers, and relevant tests

Long-term AI collaboration records live under `.ai/`:

- `.ai/changes/`: why a change was made, what was verified, and what remains uncertain
- `.ai/decisions/`: durable architecture decisions
- `.ai/plans/`: optional complex task plans
- `.ai/reviews/`: optional review records

AutoWaterSimu Next is developed in this repository as a monorepo-style evolution:

- legacy `frontend/` and `backend/` remain as migration/oracle material
- contracts, worker, API, and desktop surfaces are the active Next mainline
- migration happens through tested adapters, fixtures, and old-vs-new baselines

---

## Sponsors

We sincerely thank the following sponsor for supporting the development and maintenance of this project:

[![pipellm.ai](docs/logo-DWhD8xlx.svg)](https://pipellm.ai)

**[pipellm.ai](https://pipellm.ai)**  
Thank you for providing API resource support.

[![waterdataai.com](docs/waterdataai.png)](https://waterdataai.com)

**[waterdataai.com](https://waterdataai.com)**

---

## Screenshots & Diagrams

### Landing Page
![](frontend/public/assets/images/home.png)

### Flow Theme & Simulation Panel
![](frontend/public/assets/images/newflowtheme.png)

### Backend Core Logic (AI‑generated handwritten derivation)
This diagram illustrates the core logic used for multi‑tank simulation computations.

![](frontend/public/assets/images/handwriting.jpeg)

---



## Features Overview

- **Contract-first simulation pipeline**
  - Separates UI canvas state, process topology, executable simulation input, compute jobs, results, and artifacts.
  - Uses JSON Schema contracts and fixtures so Web, Desktop, worker, and API surfaces share the same integration boundary.

- **Standalone compute runtime**
  - Runs a Go Compute API, Python simulation worker, standalone React frontend, and Compute PostgreSQL through `docker-compose.standalone.yml`.
  - Keeps no-login standalone operation separate from legacy FastAPI authentication paths.

- **Water and wastewater model execution**
  - Supports material balance, ASM1, ASM1Slim, ASM3, UDM catalog/templates, hybrid UDM validation, and the UDM Network v2 path.
  - Preserves legacy FastAPI behavior as a migration oracle until parity and retirement gates pass.

- **Evidence, artifacts, and release gates**
  - Stores summaries in metadata records while keeping large time-series payloads in artifact files.
  - Uses golden scenarios, standalone smoke checks, live evidence, and release gates to keep simulation claims reproducible.

- **Desktop and field-delivery path**
  - Tracks a Tauri/Rust + React desktop shell with packaged Python worker sidecar, local project state, local artifacts, and support bundles.

---

## Tech Stack

- **Compute and orchestration**
  - [Go](https://go.dev): Compute API, job lifecycle, workspace/model persistence, and OpenAPI surface
  - [Python](https://www.python.org): simulation core and simulation-worker runtime
  - [PostgreSQL](https://www.postgresql.org): Compute API metadata store
  - JSON Schema contracts under `contracts/`

- **Frontend**
  - [React](https://react.dev) + TypeScript + Vite
  - [Chakra UI](https://chakra-ui.com): UI component library
  - [Playwright](https://playwright.dev): end‑to‑end testing
  - React Flow / XYFlow: flowchart editing (under `frontend/src/components/Flow`)

- **Desktop**
  - [Tauri](https://tauri.app) / Rust desktop shell
  - Packaged Python worker sidecar and local artifact/project storage

- **Legacy oracle**
  - [FastAPI](https://fastapi.tiangolo.com) + SQLModel legacy backend under `backend/`
  - Kept for migration, parity checks, and urgent legacy maintenance

- **Infrastructure**
  - [Docker Compose](https://www.docker.com): standalone and development stacks
  - [Traefik](https://traefik.io): legacy reverse proxy / load balancing where enabled
  - GitHub Actions: CI / CD workflows (see `.github/workflows`)

---

## Project Structure

The repository root is the AutoWaterSimu project root. The core structure is:

- `backend/`: legacy FastAPI application and migration/oracle reference
  - `app/material_balance/`: core material balance computation module
  - `app/api/routes/`: API routes (including ASM1/ASM3 and material balance endpoints)
  - `app/services/`: service layer
  - `app/core/`: configuration, database, logging, security, and other core modules
- `frontend/`: React single-page app shared by legacy and standalone/Next runtime modes
  - `src/components/Flow/`: flow editor and related UI
  - `src/routes/`: page routes (material balance pages, model config pages, etc.)
- `docs/`: usage and development documentation
  - `docs/architecture/`: AutoWaterSimu Next module map, dependency graph, ontology model, local-dev entry, and current-state summary
- `contracts/`: AutoWaterSimu Next JSON Schema contracts and examples
- `ontology/`: Water Ontology object/action/link/policy registries and README context
- `simulation_core/`: pure Python simulation runtime core
- `services/simulation-worker/`: Python worker CLI / sidecar runtime
- `apps/api/`: Go Compute API backend
- `apps/desktop/`: Tauri/Rust + React desktop shell
- `Justfile`: monorepo task entry for doctor, check, dependency checks, generation, dev helpers, and release gates
- `scripts/`: repository-level automation such as AutoWaterSimu Next release gates
- `.ai/`: README First change, decision, plan, and review records
- `.github/`: GitHub Actions and repository automation
- `tasks/`: project task notes, work logs, and implementation plans
- `backend/scripts/`: backend helper scripts (test, lint, format, DB initialization, prestart, etc.)
- Others:
  - `docker-compose*.yml`: Docker Compose configs for various dev/deploy setups
  - `deployment.md`: deployment guide
  - `development.md`: development guide

---

## Quick Start

Run all commands from the repository root (where this README is located).

### AutoWaterSimu Next Task Entry

For Next monorepo work, the root `Justfile` is the preferred task entry:

```powershell
just doctor
just dev-detached
just standalone-up
just standalone-smoke
just standalone-five-model-smoke
just standalone-five-model-live
just standalone-backup-restore-smoke
just standalone-release-gate
just standalone-release-gate-full
just check-deps
just readme-check
just check-ontology
just check
just pr-fast
just integration-smoke
just check-security
just audit-simulation-core-input-contract
just audit-simulation-core-correctness-freeze
just audit-worker-dependency-installation
just worker-adapter-strict-smoke
just worker-packaged-no-fallback-smoke
just browser-smoke
just live-backend-browser-smoke
just current-flow-live-smoke
just performance-baseline-phase0
just performance-profiling-phase0
just performance-golden-phase0
just performance-hotpath-prereview-phase0
just performance-go-api-latency-phase0
just desktop-package-smoke
just desktop-release-artifacts-smoke
just golden-scenarios
just golden-scenarios-refresh
just golden-scenarios-refresh-integration
just golden-scenarios-refresh-live
just golden-scenarios-refresh-current-flow-live
just golden-scenarios-refresh-desktop-release
just release-artifact-download-smoke
```

If `just` is not installed, run the underlying scripts and checks directly:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\doctor.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\readme-contract-check.ps1 -FailOnWarnings
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-ontology.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-contracts.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-simulation-core-input-contract.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-simulation-core-correctness-freeze.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-worker-dependency-installation.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\worker-adapter-strict-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\standalone-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\standalone-five-model-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\standalone-five-model-live.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\standalone-backup-restore-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\pr-fast.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\integration-smoke.ps1 -StartCompose
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\security-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\browser-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\live-backend-browser-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\current-flow-live-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-baseline-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-profiling-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-golden-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-hotpath-prereview-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-go-api-latency-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\desktop-package-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\desktop-release-artifacts-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunIntegrationSmoke
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunLiveBackendBrowserSmoke
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence -RunCurrentFlowLiveSmoke
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\release\smoke-release-artifact-download.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\release\standalone-release-gate.ps1 -SkipLong
backend\.venv\Scripts\python -m pytest contracts\tests -q
Push-Location apps\api; go test ./...; Pop-Location
Push-Location frontend; npx tsc --noEmit; Pop-Location
```

Standalone RC is only complete when the current HEAD full gate runs without skips, including live legacy migration DSNs, backup/restore live checks, release image self-check, and five-model live evidence:

```powershell
$env:COMPUTE_API_DATABASE_URL="postgres://autowatersimu:autowatersimu@localhost:55432/compute_rc?sslmode=disable"
$env:AUTOWATERSIMU_RESTORE_DATABASE_URL="postgres://autowatersimu:autowatersimu@localhost:55432/restore_rc?sslmode=disable"
just standalone-release-gate-full
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\release\standalone-release-gate.ps1 -RunComposeSmoke -RunBackupRestoreLive -RunPostgresMigrationSmoke -RunReleaseImageSmoke
```

Hosted evidence entry: `.github/workflows/next-standalone-release-gate.yml`. It requires current-commit external acceptance JSON for production legacy rehearsal (`schema_version=autowatersimu_next_standalone_legacy_production_rehearsal.v1`) and MinIO/S3 artifact profile validation (`schema_version=autowatersimu_next_standalone_s3_artifact_profile_live.v1`), plus the `AUTOWATERSIMU_LEGACY_DATABASE_URL` GitHub Secret for live migration dry-run; missing records fail the gate.

Until that no-skip evidence exists, keep FastAPI/legacy client code as comparison/oracle material and do not retire the legacy oracle or declare standalone RC complete.

The long-term architecture entry for Next lives under [docs/architecture](./docs/architecture/README.md).
The source-mounted Next local stack candidate is [docker-compose.dev.yml](./docker-compose.dev.yml).
The standalone no-login stack entry is [docker-compose.standalone.yml](./docker-compose.standalone.yml), exposed through `just standalone-up`, `just standalone-status`, `just standalone-smoke`, and `just standalone-reset`.

### 1. Environment Setup

- Install required tools:
  - Docker / Docker Desktop
  - Docker Compose (v2+, recommended to use the `docker compose` command)
- Copy and edit the environment file:

```bash
cp .env.example .env
```

At minimum, update the following according to your environment:

- `SECRET_KEY`
- `FIRST_SUPERUSER_PASSWORD`
- `POSTGRES_PASSWORD`

These sensitive values are best injected via environment variables or a secret management service.

### 2. AutoWaterSimu Next Standalone Stack

```powershell
just standalone-up
```

If `just` is unavailable:

```powershell
docker compose -p autowatersimu-standalone -f docker-compose.standalone.yml up -d
```

The standalone stack starts:

- Go Compute API
- Python simulation worker
- Standalone frontend
- Compute PostgreSQL

Use `just standalone-status`, `just standalone-smoke`, and `just standalone-reset` for status, smoke verification, and cleanup.

For Docker details, local domain configuration, and HTTPS setup, see:

- [deployment.md](./deployment.md)
- [development.md](./development.md)

### 3. Legacy FastAPI / React Stack

Use the legacy stack only for migration/oracle comparison or old FastAPI maintenance:

```powershell
docker compose up -d
```

#### Legacy Backend

```bash
cd backend
# 安装依赖（可按你本机的 Python/包管理工具习惯执行）
uv sync  # 或使用 pip / poetry 等
uv run uvicorn app.main:app --reload
```

For more backend development details, see:

- [backend/README.md](./backend/README.md)

#### Frontend

```bash
cd frontend
pnpm install  # 或 npm / yarn，按你的环境选择
pnpm dev
```

For more frontend development details, see:

- [frontend/README.md](./frontend/README.md)

---

## Configuration and Environment Variables

The project uses multiple `.env` files to manage configuration (database connections, email service, JWT keys, etc.).  
You can view and modify the default configuration in:

- Root `.env`: global stack configuration (database, domains, etc.)
- `backend/.env` (if present): backend‑specific settings
- Other environment files: see [development.md](./development.md)

A simple way to generate a secure random key:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Testing

For mainline Next changes, prefer the root gates:

```powershell
just readme-check
just pr-fast
just standalone-smoke
```

Use focused checks when changing a specific surface:

```powershell
Push-Location apps\api; go test ./...; Pop-Location
Push-Location frontend; npx tsc --noEmit; Pop-Location
backend\.venv\Scripts\python -m pytest contracts\tests -q
```

Legacy FastAPI checks are for `backend/` oracle or maintenance work:

```bash
cd backend
pytest
```

Frontend E2E checks remain available when UI behavior changes:

```bash
cd frontend
pnpm test:e2e
```

For more details on test commands and configuration, refer to the README or `package.json` / `pyproject.toml` in each subdirectory.

---

## Roadmap

| Item | Planned Work | Status |
| --- | --- | --- |
| 1 | Promote AutoWaterSimu Next to `main` and freeze FastAPI legacy line | Complete |
| 2 | Keep shared contracts, artifact boundaries, and README First governance stable | Active |
| 3 | Complete no-skip standalone RC evidence, including live migration and object-store checks | Pending external evidence |
| 4 | Freeze UDM-v2 ADRs and add `network_process_graph.v1` / `network_simulation_input.v1` contracts for `simulation.udm_network.v1` | Next |
| 5 | Add typed edge modeling and runtime validation for `hydraulic` / `pump` / `settling` / `signal`, with strict flow-balance diagnostics | Planned |
| 6 | Build the UDM Network compiler/solver with passive UDM, reaction UDM, transport models, and v1 five-model parity gates | Planned |
| 7 | Add `SecondaryClarifier10Layer`, Takacs settling, BSM1 reference profile, and benchmark-backed golden evidence | Planned |
| 8 | Wire UDM Network v2 through worker/API/catalog/artifacts before switching standalone defaults | Planned |
| 9 | Retire legacy FastAPI/v1 compute paths only after parity, migration, BSM1, and release gates pass | Gated |
| 10 | Harden Desktop packaging, support bundles, backup/restore, and release artifacts | In progress |

---

## Release Notes and Changelog

See the project’s update history at:

- [release-notes.md](./release-notes.md)

---

## License

This project is released under **Apache License 2.0** with additional terms for commercial use.  
For full details, see:

- [LICENSE](./LICENSE)

Summary:

- Allowed for personal learning and research
- Allowed for internal single‑tenant deployments and custom deployments for a single client
- Not allowed to operate a multi‑tenant SaaS platform based on this project without written permission from the author
- Not allowed to resell the source code directly (with or without modifications)
- Must keep copyright notices, author attribution, and project origin information

如需进行多租户 SaaS 等商业化使用，请根据 LICENSE 中说明联系作者获取商业授权。

For multi‑tenant SaaS or other commercial use cases, please contact the author for a commercial license as described in the LICENSE.

本项目起始于 FastAPI 官方的 Full Stack FastAPI Template，并在此基础上针对水处理与自动化水循环模拟场景进行了大量扩展与改造。

This project originates from FastAPI’s official Full Stack FastAPI Template and has been extensively extended and adapted for water treatment and automated water cycle simulation scenarios.
