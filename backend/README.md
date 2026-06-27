# AutoWaterSimu Legacy Backend

> Type: contract
> Canonical sources:
> - `backend/app/`
> - `backend/app/alembic/`
> - `backend/pyproject.toml`
> - `backend/app/tests/`
> - `frontend/src/client`

## 1. Responsibility

This directory contains the legacy FastAPI / SQLModel / PostgreSQL backend.

It is responsible for:

- Legacy REST API routes, auth, users, flowchart persistence, and template-derived app services.
- Legacy material balance / ASM / UDM HTTP compatibility during the AutoWaterSimu Next migration.
- Database models and Alembic migrations for the legacy backend schema.
- Backend tests and helper scripts under `backend/scripts/`.

It is not responsible for:

- New Go Compute API behavior; that lives under `apps/api/`.
- Pure simulation core implementation; that lives under `simulation_core/`.
- Worker execution loops; those live under `services/simulation-worker/`.
- Frontend generated Compute API client output.

## 2. Stable Contract

- Keep legacy behavior available as migration baseline until standalone RC gates prove replacement coverage.
- Long-running simulation execution should move through `simulation_core/` and `services/simulation-worker/`; do not move behavior without old-vs-new baseline tests.
- Use structured `logging`; do not `print` full flowcharts, water-quality payloads, tokens, credentials, or large results.
- API/schema changes require regenerating the legacy frontend OpenAPI client under `frontend/src/client`.
- Material-balance thin-shell re-exports may depend on editable `autowatersimu-contracts` and `autowatersimu-simulation-core`; keep `backend/pyproject.toml` and `backend/uv.lock` aligned.

## 3. Dependency Boundary

Allowed dependencies:

- `contracts/python`
- `simulation_core/python`
- FastAPI, SQLModel, PostgreSQL, Alembic, Pytest
- Legacy frontend client generation input/output

Forbidden dependencies:

- `apps/api/internal` implementation details
- Frontend routes/stores/components
- Worker runtime internals except through documented contracts

Upstream facts:

- Root `AGENTS.md`, `README_First.md`, and `README.md`
- `backend/app/README.md` and nearer backend README files
- `contracts/README.md` and `simulation_core/README.md` when touching simulation contracts

Downstream callers:

- Legacy frontend FastAPI client in `frontend/src/client`
- Legacy browser routes and stores
- Migration tooling in `apps/api/cmd/migrate-legacy`

## 4. Change Triggers

- API route or schema change -> update OpenAPI JSON and regenerate `frontend/src/client`.
- DB model change -> add Alembic migration and backend tests.
- Material balance / ASM / UDM behavior change -> run focused backend tests and simulation-core boundary checks.
- Auth/security change -> check route permissions, token handling, and frontend session assumptions.
- Logging or error handling change -> verify no sensitive payloads are emitted.

## 5. Validation

Run from the repository root unless noted:

```powershell
cd backend; .venv\Scripts\python -m pytest app/tests -q
cd backend; .venv\Scripts\python -m pytest app/tests/time_segment_validation_test.py app/tests/material_balance_segment_overrides_test.py app/tests/hybrid_udm_validation_test.py app/tests/udm_engine_variable_binding_test.py -q
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-simulation-core-boundary.ps1
```

For API/schema changes, regenerate the legacy client:

```powershell
Invoke-WebRequest http://localhost/api/v1/openapi.json -OutFile frontend/openapi.json; cd frontend; npm run generate-client
```

## 6. AI / Maintainer Notes

Before modifying backend code, read root `AGENTS.md`, root `README_First.md`, root `README.md`, this file, and the nearest README under the target path.

Keep this README as a contract. Put task history in `tasks/todo.md` or `.ai/changes/`, not here.
