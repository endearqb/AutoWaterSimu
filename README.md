# AutoWaterSimu
[中文说明](./README_zh.md)
---

An automated water cycle simulation system for simulating and analyzing water cycles and water treatment processes.  
Built on a full‑stack FastAPI + React architecture, supporting process flow modeling, ASM kinetic simulation, and material balance analysis.

> This project is deeply customized from the [Full Stack FastAPI Template](https://github.com/fastapi/full-stack-fastapi-template), keeping its engineering capabilities while adding domain‑specific features for water treatment.

---

## Screenshots & Diagrams

### Landing Page
![](frontend/public/assets/images/home.png)

### Flow Theme & Simulation Panel
![](frontend/public/assets/images/newflowtheme.png)

### DeepResearch Knowledge
![](frontend/public/assets/images/knowledge.png)

### Backend Core Logic (AI‑generated handwritten derivation)
This diagram illustrates the core logic used for multi‑tank simulation computations.

![](frontend/public/assets/images/handwriting.jpeg)

---



## Features Overview


- **Process Flow Modeling**
  - Frontend flowchart editor built with React Flow
  - Supports multiple node types such as influent, effluent, and reactors
  - Build wastewater treatment / water cycle process flows via drag‑and‑drop and connection lines

- **ASM Model Simulation**
  - Backend integrates activated sludge models such as ASM1 / ASM1slim / ASM3
  - Supports configuration of model parameters, influent quality, simulation time, and more
  - Returns time‑series simulation results for analyzing concentration and load changes at each node

- **Material and Volume Balance Calculation**
  - Dedicated material balance computation module (`backend/app/material_balance`)
  - Multi‑component material balance simulation based on tensor operations and ODE solving
  - Provides mass conservation checks and volume change tracking

- **Task and Result Management**
  - Stores computation tasks and results in the database
  - Supports result summaries (total steps, computation time, convergence status, etc.)

- **Accounts and Permissions (from template capabilities)**
  - JWT‑based authentication
  - User registration, login, and access control
  - Password reset via email (SMTP configuration required)

---

## Tech Stack

- **Backend**
  - [FastAPI](https://fastapi.tiangolo.com): REST API and backend services
  - [SQLModel](https://sqlmodel.tiangolo.com): database ORM
  - [PostgreSQL](https://www.postgresql.org): relational database
  - [Pytest](https://pytest.org): backend testing

- **Frontend**
  - [React](https://react.dev) + TypeScript + Vite
  - [Chakra UI](https://chakra-ui.com): UI component library
  - [Playwright](https://playwright.dev): end‑to‑end testing
  - React Flow / XYFlow: flowchart editing (under `frontend/src/components/Flow`)

- **Infrastructure**
  - [Docker Compose](https://www.docker.com): one‑command startup for dev/deploy environments
  - [Traefik](https://traefik.io): reverse proxy / load balancing (optional)
  - GitHub Actions: CI / CD workflows (see `.github/workflows`)

---

## Project Structure

The repository root is the AutoWaterSimu project root. The core structure is:

- `backend/`: backend FastAPI application
  - `app/material_balance/`: core material balance computation module
  - `app/api/routes/`: API routes (including ASM1/ASM3 and material balance endpoints)
  - `app/services/`: service layer
  - `app/core/`: configuration, database, logging, security, and other core modules
- `frontend/`: frontend React single‑page app
  - `src/components/Flow/`: flow editor and related UI
  - `src/routes/`: page routes (material balance pages, model config pages, etc.)
  - `content/knowledge/`: knowledge content related to environmental engineering and water treatment
- `docs/`: usage and development documentation
- `scripts/`: helper scripts (build, test, DB initialization, etc.)
- Others:
  - `docker-compose*.yml`: Docker Compose configs for various dev/deploy setups
  - `deployment.md`: deployment guide
  - `development.md`: development guide

---

## Quick Start

Run all commands from the repository root (where this README is located).

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

### 2. One‑Click Start with Docker Compose

```bash
docker compose up -d
```

By default this starts:

- Backend API service (FastAPI)
- Frontend web app (React)
- Database (PostgreSQL)
- Reverse proxy / Traefik (if enabled in the compose file)


After startup you can:

- Open the frontend in your browser (host/port as defined in `docker-compose.yml`)
- Access the interactive API docs at `/docs` or `/redoc`

For Docker details, local domain configuration, and HTTPS setup, see:

- [deployment.md](./deployment.md)
- [development.md](./development.md)

### 3. Local Development (Without Docker)

#### Backend

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

### Backend Tests

```bash
cd backend
pytest
```

### Frontend End‑to‑End Tests (Playwright)

```bash
cd frontend
pnpm test:e2e
```

For more details on test commands and configuration, refer to the README or `package.json` / `pyproject.toml` in each subdirectory.

---

## Roadmap

| Item | Planned Work | Status |
| --- | --- | --- |
| 1 | Full Docker Compose pipeline running end‑to‑end (including DB) | Complete |
| 2 | Clean up sensitive/redundant tables and intermediate files | Almost Complete |
| 3 | One‑click simulation for a minimal example case + smoke test CI, add i18n | Complete |
| 4 | Continuous influent (time‑series input) | In progress, beta version completed |
| 5 | Initial refactor of core module (decouple `core.py` into maintainable structure) | Completed UDM split work |
| 6 | One‑dimensional settling tank model | In progress |
| 7 | pH calculation |  |
| 8 | Temperature correction for parameters |  |
| 9 | Add more open‑source models | Deprecated |
| 10 | Improve the model addition workflow | Deprecated |
| 11 | Support adding custom user‑defined models | In progress, beta version completed |
| 12 | Benchmark cases based on literature datasets, with reproducible curve‑matching outputs |  |
| 13 | Tensorized multi‑node representation + grouped heterogeneous models (different model per node) | In progress |
| 14 | Parameter sweep / scenario comparison (“run all options in one plot”) |  |
| 15 | Performance benchmarks and optional GPU acceleration |  |
| 16 | Calibration/tuning workflow for real‑world project deployment |  |
| 17 | “Vibe Modeling” natural‑language modeling interface (long‑term vision) |  |

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
