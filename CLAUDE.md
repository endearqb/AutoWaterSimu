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

---

## 4. 工作流编排

### 4.1. 计划节点默认行为
- 对于任何非简单任务（3步以上或涉及架构决策），默认进入计划模式
- 如果出现问题，立即停止并重新规划，不要一头扎进去硬撑
- 在验证步骤中也使用计划模式，而不仅仅是构建阶段
- 提前编写详细规格说明，减少歧义

### 4.2. 子代理策略
- 大量使用子代理，保持主上下文窗口整洁
- 将研究、探索和并行分析任务分配给子代理
- 面对复杂问题，通过子代理投入更多算力
- 每个子代理专注单一任务，确保执行聚焦

### 4.3. 自我改进循环
- 每次被用户纠正后：将经验规律更新到 `tasks/lessons.md`
- 为自己制定规则，防止重犯同类错误
- 持续迭代这些经验，直到错误率下降
- 每次会话开始时回顾与当前项目相关的经验

### 4.4. 完成前验证
- 未经证明可正常运行，绝不将任务标记为完成
- 必要时对比主版本与修改后的行为差异
- 问自己："高级工程师会认可这个方案吗？"
- 运行测试、检查日志、演示正确性

### 4.5. 追求优雅（适度平衡）
- 对于非简单改动：停下来问"有没有更优雅的实现方式？"
- 如果修复方案感觉像是临时补丁，就说："基于我现在掌握的全部信息，实现一个优雅的解决方案"
- 对于简单明显的修复，跳过此步骤，不要过度设计
- 在提交方案前先审视自己的工作

### 4.6. 自主修复 Bug
- 收到 Bug 报告后：直接修复，无需寻求引导
- 定位日志、错误信息、失败的测试，然后解决它们
- 不需要用户切换上下文
- 无需被告知如何操作，主动去修复失败的 CI 测试

### 4.7. 任务管理

1. **先写计划**：将计划写入 `tasks/todo.md`，包含可勾选的条目
2. **确认计划**：开始实施前进行检查确认
3. **追踪进度**：完成后逐项标记
4. **说明变更**：每步提供高层级摘要
5. **记录结果**：在 `tasks/todo.md` 中添加回顾章节
6. **沉淀经验**：被纠正后更新 `tasks/lessons.md`


### 4.8. 核心原则

- **简洁优先**：每次改动尽可能简单，影响尽量少的代码
- **杜绝懒惰**：找到根本原因，不打临时补丁，保持高级开发者标准
- **最小影响**：变更只触及必要之处，避免引入新 Bug