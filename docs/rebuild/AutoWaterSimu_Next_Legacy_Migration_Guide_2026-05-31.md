# AutoWaterSimu Next Legacy Migration Guide - 2026-05-31

## Purpose

This guide explains how the legacy FastAPI/React system is kept as the migration baseline while AutoWaterSimu Next moves long-running simulation work to shared contracts, the Python worker, the Go Compute API, and Desktop runtime.

It does not mark legacy calculation endpoints read-only yet. The PRD exit condition requires the new worker-backed path to cover Material Balance, ASM, and UDM workloads, the new frontend to stop depending on legacy compute endpoints, and the old FastAPI compute API to run as read-only comparison for at least 30 days.

## Current Baseline

- Legacy FastAPI remains under `backend/app/`.
- Legacy React/Vite/Chakra UI remains under `frontend/`.
- New shared contracts are under `contracts/`.
- Pure simulation code and worker entrypoints are under `simulation_core/` and `services/simulation-worker/`.
- Web orchestration lives under `apps/api/`.
- Desktop offline orchestration lives under `apps/desktop/`.

## Migration Rules

1. Preserve legacy calculation behavior until an old-vs-worker fixture proves the replacement path.
2. Keep route-level legacy compute endpoints documented as baseline paths while they still use FastAPI `BackgroundTasks`.
3. Store large Next results as artifacts and persist only summary metadata in the Go API.
4. Do not wire new long-running work into legacy FastAPI.
5. Do not disable or delete legacy endpoints until the PRD exit criteria are satisfied.
6. Regenerate the legacy FastAPI TypeScript client after OpenAPI-visible schema changes:

```powershell
cd backend
@'
import json
from pathlib import Path
from app.main import app
Path("../frontend/openapi.json").write_text(json.dumps(app.openapi(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
'@ | .venv\Scripts\python -
cd ..\frontend
npm run generate-client
```

`frontend/openapi.json` is an ignored local generator input. Commit generated client output under `frontend/src/client`.

## Worker Migration Status

The current branch has executable worker coverage for:

- `simulation.material_balance.v1`
- `simulation.asm1slim.v1`
- `simulation.asm1.v1`
- `simulation.asm3.v1`
- `simulation.udm.v1`

The old-vs-worker numerical matrix should remain the guardrail whenever a legacy model path is moved or broadened.

## Read-Only Exit Checklist

Do not mark legacy FastAPI compute read-only until all items are true:

- Go Compute API covers job lifecycle for the relevant workload.
- Worker path covers Material Balance, ASM1Slim, ASM1, ASM3, and UDM with accepted tolerances.
- Frontend core compute pages submit to the Go Compute API.
- Legacy FastAPI compute endpoints have been used only as comparison paths for at least 30 days.
- README files and route descriptions explicitly state the legacy compute status.
- Release gates include schema/codegen, worker matrix, and browser smoke evidence for the replacement path.

## Verification Commands

```powershell
cd backend; .venv\Scripts\python -m pytest app\tests\api\routes\test_asm_udm_validate_response.py app\tests\api\routes\test_flowchart_routes_no_print.py app\tests\services -q
backend\.venv\Scripts\python -m pytest contracts\tests -q
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --self-check
cd frontend; npx tsc --noEmit
```
