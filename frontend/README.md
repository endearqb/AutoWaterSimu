# AutoWaterSimu Legacy Frontend

> Type: contract
> Canonical sources:
> - `frontend/src/`
> - `frontend/src/client`
> - `frontend/src/client/compute`
> - `frontend/package.json`
> - `frontend/tests/`

## 1. Responsibility

This directory contains the legacy React + TypeScript + Vite + Chakra UI v3 frontend.

It is responsible for:

- Legacy browser routes, shell, stores, services, and Chakra UI surfaces.
- React Flow / XYFlow process-flow editing under `frontend/src/components/Flow`.
- Legacy FastAPI generated client under `frontend/src/client`.
- AutoWaterSimu Next frontend wrappers under `frontend/src/features` and `frontend/src/shared`.
- Go Compute API generated client under `frontend/src/client/compute`.
- Playwright browser smoke tests under `frontend/tests`.

It is not responsible for:

- Go Compute API implementation; that lives under `apps/api/`.
- Python worker execution; that lives under `services/simulation-worker/`.
- Desktop-only Tauri UI; that lives under `apps/desktop/`.
- Backend OpenAPI schema ownership.

## 2. Stable Contract

- Keep legacy pages stable while Next compute-oriented clients and screens are added in parallel.
- React Flow / XYFlow imports must follow the project rule:

```ts
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
```

- `npm run generate-client` updates only the legacy FastAPI client under `frontend/src/client`.
- `npm run generate-compute-client` updates only the Go Compute API client under `frontend/src/client/compute`.
- Standalone runtime uses `VITE_APP_MODE=standalone`, `VITE_AUTH_MODE=disabled`, and `VITE_CONTEXT_MODE=standalone` to avoid legacy login/session UI while Compute auth remains controlled by `VITE_AUTH_MODE`.
- Chakra UI v3 changes must consult local Chakra docs when present: `llms-v3-migration.txt`, `llms-components.txt`, `llms-charts.txt`, `llms-styling.txt`, `llms-theming.txt`, `llms-full.txt`.

## 3. Dependency Boundary

Allowed dependencies:

- React, TypeScript, Vite, TanStack Query/Router, Chakra UI v3
- AJV for frontend contract validation where feature serializers validate JSON Schema payloads
- Generated clients in `frontend/src/client`
- Shared wrappers in `frontend/src/shared` and `frontend/src/features`

Forbidden dependencies:

- Backend Python modules
- Go `apps/api/internal` packages
- Desktop Rust/Tauri internals
- Direct generated Compute client imports from routes/components when a feature wrapper exists

Upstream facts:

- `frontend/package.json`
- `apps/api/openapi/compute.openapi.json`
- Legacy backend OpenAPI at `/api/v1/openapi.json`

Downstream callers:

- Browser users and Playwright tests
- Standalone route tree and legacy route tree
- Desktop may reuse concepts, but not this app's runtime internals

## 4. Change Triggers

- Frontend code change -> run `cd frontend; npx tsc --noEmit`.
- Backend OpenAPI change -> regenerate `frontend/src/client`.
- Go Compute API OpenAPI change -> regenerate `frontend/src/client/compute`.
- Standalone route/runtime change -> run the frontend standalone boundary audit and relevant Playwright smoke.
- Chakra/theme/component change -> check local Chakra v3 docs and visual/a11y impact.

## 5. Validation

Run from the repository root unless noted:

```powershell
cd frontend; npm install
cd frontend; npx tsc --noEmit
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-frontend-standalone-compute-boundary.ps1
cd frontend; npx playwright test --project=chromium --no-deps
```

Generate clients:

```powershell
cd frontend; npm run generate-client
cd frontend; npm run generate-compute-client
```

## 6. AI / Maintainer Notes

Before modifying frontend code, read root `AGENTS.md`, root `README_First.md`, root `README.md`, this file, and the closest README under the target path.

Keep this README as a contract. Put generated-client step-by-step troubleshooting and task history in `.ai/changes/`, `tasks/`, or the relevant subdirectory README.
