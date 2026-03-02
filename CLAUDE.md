# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AutoWaterSimu — an automated water cycle simulation system for modeling wastewater treatment processes. Built on FastAPI + React, supporting process flow modeling, ASM (Activated Sludge Model) kinetic simulation, User-Defined Models (UDM), and material balance analysis. Deeply customized from the [Full Stack FastAPI Template](https://github.com/fastapi/full-stack-fastapi-template).

## Development Commands

### Frontend (from `frontend/`)
```bash
pnpm install          # install dependencies
pnpm dev              # start Vite dev server
pnpm build            # typecheck + build (tsc -p tsconfig.build.json && vite build)
pnpm lint             # Biome check with auto-fix
pnpm generate-client  # regenerate OpenAPI TypeScript client
```

### Backend (from `backend/`)
```bash
uv sync                                    # install dependencies
uv run uvicorn app.main:app --reload       # start dev server
uv run pytest                              # run all tests
uv run pytest app/tests/api/routes/test_users.py       # run a single test file
uv run pytest app/tests/api/routes/test_users.py -k "test_name"  # run a single test
```

### API Client Regeneration (from repo root)
```bash
bash scripts/generate-client.sh   # exports openapi.json from backend, regenerates frontend/src/client/
```

### Docker (from repo root)
```bash
docker compose up -d    # start all services (db, backend, frontend, adminer)
```

### Database Migrations (from `backend/`)
```bash
uv run alembic revision --autogenerate -m "description"   # create migration
uv run alembic upgrade head                                # apply migrations
```

### Pre-commit
The repo uses pre-commit with ruff (format + lint) for Python and standard hooks for file hygiene. Run `pre-commit run --all-files` from root.

## Architecture

### Backend (`backend/app/`)
- **Framework**: FastAPI with SQLModel ORM, PostgreSQL (psycopg driver)
- **API prefix**: `/api/v1` — all routes mounted in `app/api/main.py`
- **Config**: `app/core/config.py` — Pydantic Settings, reads from root `.env`
- **Key route groups**:
  - `routes/login.py`, `routes/users.py` — auth (JWT) and user management
  - `routes/flowcharts.py`, `routes/asm1_flowcharts.py`, etc. — CRUD for flowchart diagrams per model type
  - `routes/asm1.py`, `routes/asm1slim.py`, `routes/asm3.py`, `routes/udm.py` — simulation endpoints
  - `routes/material_balance.py` — material balance computation endpoints
  - `routes/udm_models.py`, `routes/udm_flowcharts.py` — UDM model definition and flowchart management
- **Simulation core** (`app/material_balance/`):
  - `core.py` — main simulation engine
  - `asm/asm1.py`, `asm/asm1slim.py`, `asm/asm3.py` — activated sludge model implementations
  - `udm_engine.py`, `udm_ode.py` — user-defined model engine using tensor operations + ODE solving (PyTorch + torchdiffeq)
  - `models.py` — Pydantic models for simulation I/O
- **Service layer** (`app/services/`): business logic (e.g., `asm1_service.py`, `udm_service.py`, `material_balance_service.py`)
- **Tests**: `app/tests/` — pytest-based, with `conftest.py` for fixtures
- **WebSocket**: `app/api/v1/simple_websocket.py` with `app/core/simple_websocket_manager.py`

### Frontend (`frontend/src/`)
- **Framework**: React 18 + TypeScript + Vite (SWC plugin)
- **Routing**: TanStack Router (file-based routes in `src/routes/`, auto-generated `routeTree.gen.ts`)
- **UI Library**: Chakra UI v3 + Framer Motion
- **State Management**:
  - Zustand stores in `src/stores/` — one per model type (e.g., `asm1FlowStore.ts`, `udmFlowStore.ts`, `materialBalanceStore.ts`)
  - `createModelFlowStore.ts` — factory for model-specific flow stores
  - React Query (`@tanstack/react-query`) for server state
- **API Client**: Auto-generated from OpenAPI spec in `src/client/` (via `@hey-api/openapi-ts` with Axios). Do not manually edit files in `src/client/`.
- **Flow Editor** (`src/components/Flow/`): Built with `@xyflow/react` (React Flow). Major sub-structures:
  - `nodes/` — custom node types (InputNode, OutputNode, ASM1Node, ASM3Node, UDMNode, etc.)
  - `edges/` — custom edge types (EditableEdge)
  - `toolbar/` — node palette and model parameter panels
  - `inspectorbar/` — property panels, calculation panels, time-segment editors
  - `menu/` — bubble menus, save/load dialogs per model type
  - `legacy-analysis/` — analysis buttons, charts, result panels
- **i18n**: Custom implementation in `src/i18n/` (zh/en). Uses React context + `t()` function with dot-notation keys. Messages in `src/i18n/messages/zh.ts` and `en.ts`.
- **Knowledge/Docs**: MDX content in `src/knowledge/` for water treatment knowledge base, rendered via `@mdx-js/rollup`.

### Path Alias
Frontend uses `@/` alias mapping to `frontend/src/` (configured in `vite.config.ts`).

## Code Style

### Frontend
- **Linter/Formatter**: Biome (not ESLint/Prettier)
- Indent: spaces; quotes: double; semicolons: as needed (omitted when possible)
- `noExplicitAny` and `noNonNullAssertion` are turned off

### Backend
- **Linter/Formatter**: Ruff (configured in `pyproject.toml`)
- Target: Python 3.10+
- Rules: pycodestyle, pyflakes, isort, flake8-bugbear, flake8-comprehensions, pyupgrade
- Type checking: mypy (strict mode, excludes alembic and venv)

## Key Conventions

- The `frontend/src/client/` directory is auto-generated — always regenerate via `scripts/generate-client.sh` after backend API changes rather than editing manually.
- Each simulation model type (ASM1, ASM1slim, ASM3, UDM) has its own parallel set of: backend route, service, flowchart route, frontend store, Flow nodes/panels, and bubble menu.
- The backend reads `.env` from the project root (one level above `backend/`).
- Scientific computation uses PyTorch tensors and `torchdiffeq` for ODE solving — numpy is also used but the simulation core is tensor-based.
