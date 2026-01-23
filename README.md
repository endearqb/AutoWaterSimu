# AutoWaterSimu

一个自动化水循环模拟系统，用于模拟和分析水循环和水处理过程。  
基于 FastAPI + React 的全栈架构，支持工艺流程建模、ASM 动力学模拟和物料平衡分析。

An automated water cycle simulation system for simulating and analyzing water cycles and water treatment processes.  
Built on a full‑stack FastAPI + React architecture, supporting process flow modeling, ASM kinetic simulation, and material balance analysis.

> 本项目在 [Full Stack FastAPI Template](https://github.com/fastapi/full-stack-fastapi-template) 的基础上深度定制而来，保留了原有的工程化能力，并加入了水处理领域的专用功能。
>
> This project is deeply customized from the [Full Stack FastAPI Template](https://github.com/fastapi/full-stack-fastapi-template), keeping its engineering capabilities while adding domain‑specific features for water treatment.

---

## 功能简介

## Features Overview

- **工艺流程建模**
  - 前端基于 React Flow 的流程图编辑器
  - 支持进水、出水、反应池等多种节点类型
  - 通过拖拽、连线的方式搭建废水处理/水循环工艺流程

- **Process Flow Modeling**
  - Frontend flowchart editor built with React Flow
  - Supports multiple node types such as influent, effluent, and reactors
  - Build wastewater treatment / water cycle process flows via drag‑and‑drop and connection lines

- **ASM 模型模拟**
  - 后端集成 ASM1 / ASM1slim / ASM3 等活性污泥模型
  - 支持设置模型参数、进水水质、运行时间等
  - 返回时间序列仿真结果，用于分析各节点浓度、负荷变化

- **ASM Model Simulation**
  - Backend integrates activated sludge models such as ASM1 / ASM1slim / ASM3
  - Supports configuration of model parameters, influent quality, simulation time, and more
  - Returns time‑series simulation results for analyzing concentration and load changes at each node

- **物料平衡与体积平衡计算**
  - 独立的物料平衡计算模块（`backend/app/material_balance`）
  - 基于张量运算与 ODE 求解进行多组分物料平衡模拟
  - 提供质量守恒检查与体积变化跟踪

- **Material and Volume Balance Calculation**
  - Dedicated material balance computation module (`backend/app/material_balance`)
  - Multi‑component material balance simulation based on tensor operations and ODE solving
  - Provides mass conservation checks and volume change tracking

- **任务与结果管理**
  - 采用数据库记录计算任务与结果
  - 支持结果摘要（总步数、计算耗时、收敛状态等）

- **Task and Result Management**
  - Stores computation tasks and results in the database
  - Supports result summaries (total steps, computation time, convergence status, etc.)

- **账号与权限（来自模板能力）**
  - 基于 JWT 的身份认证
  - 用户注册、登录、权限控制
  - 邮件找回密码（需配置 SMTP）

- **Accounts and Permissions (from template capabilities)**
  - JWT‑based authentication
  - User registration, login, and access control
  - Password reset via email (SMTP configuration required)

---

## 技术栈

## Tech Stack

- **后端**
  - [FastAPI](https://fastapi.tiangolo.com)：提供 REST API 与后台服务
  - [SQLModel](https://sqlmodel.tiangolo.com)：数据库 ORM
  - [PostgreSQL](https://www.postgresql.org)：关系型数据库
  - [Pytest](https://pytest.org)：后端测试

- **Backend**
  - [FastAPI](https://fastapi.tiangolo.com): REST API and backend services
  - [SQLModel](https://sqlmodel.tiangolo.com): database ORM
  - [PostgreSQL](https://www.postgresql.org): relational database
  - [Pytest](https://pytest.org): backend testing

- **前端**
  - [React](https://react.dev) + TypeScript + Vite
  - [Chakra UI](https://chakra-ui.com)：UI 组件库
  - [Playwright](https://playwright.dev)：端到端测试
  - React Flow / XYFlow：流程图编辑能力（位于 `frontend/src/components/Flow`）

- **Frontend**
  - [React](https://react.dev) + TypeScript + Vite
  - [Chakra UI](https://chakra-ui.com): UI component library
  - [Playwright](https://playwright.dev): end‑to‑end testing
  - React Flow / XYFlow: flowchart editing (under `frontend/src/components/Flow`)

- **基础设施**
  - [Docker Compose](https://www.docker.com)：一键启动开发/部署环境
  - [Traefik](https://traefik.io)：反向代理 / 负载均衡（可选）
  - GitHub Actions：CI / CD 工作流（见 `.github/workflows`）

- **Infrastructure**
  - [Docker Compose](https://www.docker.com): one‑command startup for dev/deploy environments
  - [Traefik](https://traefik.io): reverse proxy / load balancing (optional)
  - GitHub Actions: CI / CD workflows (see `.github/workflows`)

---

## 项目结构

## Project Structure

仓库根目录即 AutoWaterSimu 工程根目录，核心目录结构如下：

The repository root is the AutoWaterSimu project root. The core structure is:

- `backend/`：后端 FastAPI 应用
  - `app/material_balance/`：物料平衡计算核心模块
  - `app/api/routes/`：API 路由（包含 ASM1/ASM3、物料平衡等接口）
  - `app/services/`：业务服务层
  - `app/core/`：配置、数据库、日志、安全等核心模块
- `frontend/`：前端 React 单页应用
  - `src/components/Flow/`：流程图编辑器与相关 UI
  - `src/routes/`：页面路由（含物料平衡页面、模型配置页面等）
  - `content/knowledge/`：与环境工程、水处理相关的知识库内容
- `docs/`：项目使用与开发文档
- `scripts/`：辅助脚本（构建、测试、数据库初始化等）
- 其他：
  - `docker-compose*.yml`：各种部署/开发用 Docker Compose 配置
  - `deployment.md`：部署说明
  - `development.md`：开发说明

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

## 快速开始

## Quick Start

以下命令均在仓库根目录（即本 README 所在目录）执行。

Run all commands from the repository root (where this README is located).

### 1. 准备环境

### 1. Environment Setup

- 安装依赖工具：
  - Docker / Docker Desktop
  - Docker Compose（v2 以上推荐使用 `docker compose` 命令）
- 拷贝并编辑环境变量文件：

- Install required tools:
  - Docker / Docker Desktop
  - Docker Compose (v2+, recommended to use the `docker compose` command)
- Copy and edit the environment file:

```bash
cp .env.example .env
```

至少需要根据实际环境修改：

At minimum, update the following according to your environment:

- `SECRET_KEY`
- `FIRST_SUPERUSER_PASSWORD`
- `POSTGRES_PASSWORD`

这些敏感信息建议通过环境变量或密钥管理服务注入。

These sensitive values are best injected via environment variables or a secret management service.

### 2. 使用 Docker Compose 一键启动

### 2. One‑Click Start with Docker Compose

```bash
docker compose up -d
```

默认会启动：

By default this starts:

- 后端 API 服务（FastAPI）
- 前端 Web 应用（React）
- 数据库（PostgreSQL）
- 反向代理 / Traefik（如在 Compose 中启用）

- Backend API service (FastAPI)
- Frontend web app (React)
- Database (PostgreSQL)
- Reverse proxy / Traefik (if enabled in the compose file)

启动完成后，你可以：

After startup you can:

- 在浏览器中访问前端界面（域名或端口以 `docker-compose.yml` 中为准）
- 访问后端交互式 API 文档：`/docs` 或 `/redoc`

- Open the frontend in your browser (host/port as defined in `docker-compose.yml`)
- Access the interactive API docs at `/docs` or `/redoc`

更详细的 Docker、本地域名和 HTTPS 设置，请参考：

For Docker details, local domain configuration, and HTTPS setup, see:

- [deployment.md](./deployment.md)
- [development.md](./development.md)

### 3. 本地开发（不使用 Docker）

### 3. Local Development (Without Docker)

#### 后端

#### Backend

```bash
cd backend
# 安装依赖（可按你本机的 Python/包管理工具习惯执行）
uv sync  # 或使用 pip / poetry 等
uv run uvicorn app.main:app --reload
```

更多后端开发说明见：

For more backend development details, see:

- [backend/README.md](./backend/README.md)

#### 前端

#### Frontend

```bash
cd frontend
pnpm install  # 或 npm / yarn，按你的环境选择
pnpm dev
```

更多前端开发说明见：

For more frontend development details, see:

- [frontend/README.md](./frontend/README.md)

---

## 配置与环境变量

## Configuration and Environment Variables

项目使用多个 `.env` 文件来管理配置（数据库连接、邮件服务、JWT 密钥等）。  
你可以在以下文件中查看和修改默认配置：

The project uses multiple `.env` files to manage configuration (database connections, email service, JWT keys, etc.).  
You can view and modify the default configuration in:

- 根目录的 `.env`：整体栈配置（数据库、域名等）
- `backend/.env`（如存在）：后端服务相关配置
- 其他环境文件：详见 [development.md](./development.md)

- Root `.env`: global stack configuration (database, domains, etc.)
- `backend/.env` (if present): backend‑specific settings
- Other environment files: see [development.md](./development.md)

生成安全随机密钥的一个简单方式：

A simple way to generate a secure random key:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 测试

## Testing

### 后端测试

### Backend Tests

```bash
cd backend
pytest
```

### 前端端到端测试（Playwright）

### Frontend End‑to‑End Tests (Playwright)

```bash
cd frontend
pnpm test:e2e
```

具体测试命令和配置可参考各自目录下的 README 或 `package.json` / `pyproject.toml`。

For more details on test commands and configuration, refer to the README or `package.json` / `pyproject.toml` in each subdirectory.

---

## Roadmap

| 项目 | 规划事项 | 进度 |
| --- | --- | --- |
| 1 | Docker Compose 全链路跑通（含 DB） | 进行中 |
| 2 | 清理敏感/多余数据表与中间文件 | 进行中 |
| 3 | 最小示例 Case 一键仿真 + 冒烟测试 CI，增加国际化 | 进行中 |
| 4 | 连续进水（时间序列输入） |  |
| 5 | 核心模块初步拆分（core.py 解耦到可维护结构） |  |
| 6 | 一维沉淀池模型 |  |
| 7 | pH 计算 |  |
| 8 | 参数的温度校正 |  |
| 9 | 增加更多开源模型 |  |
| 10 | 优化模型添加流程 |  |
| 11 | 增加添加自定义模型功能 |  |
| 12 | 文献数据集 Benchmark Case，与文献曲线对标输出（可复现） |  |
| 13 | 多节点张量化表示 + 分组异构模型（每节点可跑不同模型） |  |
| 14 | 参数扫掠/方案对比（“一张图跑所有选项”） |  |
| 15 | 性能基准与可选 GPU 加速落地 |  |
| 16 | 校准/调参工作流（真实项目落地包） |  |
| 17 | “Vibe Modeling”自然语言建模入口（远期愿景） |  |

| Item | Planned Work | Status |
| --- | --- | --- |
| 1 | Full Docker Compose pipeline running end‑to‑end (including DB) | In progress |
| 2 | Clean up sensitive/redundant tables and intermediate files | In progress |
| 3 | One‑click simulation for a minimal example case + smoke test CI, add i18n | In progress |
| 4 | Continuous influent (time‑series input) |  |
| 5 | Initial refactor of core module (decouple `core.py` into maintainable structure) |  |
| 6 | One‑dimensional settling tank model |  |
| 7 | pH calculation |  |
| 8 | Temperature correction for parameters |  |
| 9 | Add more open‑source models |  |
| 10 | Improve the model addition workflow |  |
| 11 | Support adding custom user‑defined models |  |
| 12 | Benchmark cases based on literature datasets, with reproducible curve‑matching outputs |  |
| 13 | Tensorized multi‑node representation + grouped heterogeneous models (different model per node) |  |
| 14 | Parameter sweep / scenario comparison (“run all options in one plot”) |  |
| 15 | Performance benchmarks and optional GPU acceleration |  |
| 16 | Calibration/tuning workflow for real‑world project deployment |  |
| 17 | “Vibe Modeling” natural‑language modeling interface (long‑term vision) |  |

---

## 发行说明与变更记录

## Release Notes and Changelog

项目的更新记录见：

See the project’s update history at:

- [release-notes.md](./release-notes.md)

---

## 许可证

## License

本项目基于 **Apache License 2.0** 并附加商业使用相关条件进行发布，  
完整条款请查看：

This project is released under **Apache License 2.0** with additional terms for commercial use.  
For full details, see:

- [LICENSE](./LICENSE)

简要说明：

- 允许个人学习、研究使用
- 允许企业内部单租户部署和为单一客户提供定制化部署
- 禁止在未获得作者书面授权的前提下，将本项目用于多租户 SaaS 平台运营
- 禁止直接转售源码（无论是否修改）
- 使用本项目时需保留版权声明、作者署名和项目来源等信息

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
