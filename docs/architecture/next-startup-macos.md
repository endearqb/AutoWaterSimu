# AutoWaterSimu Next macOS Startup Guide

> 适用环境：macOS（Apple Silicon / Intel）、zsh、Docker Desktop。

本文件说明如何在 macOS 上分终端启动 AutoWaterSimu Next 的 PostgreSQL、Go Compute API、Python simulation worker 和 React/Vite 前端。除特别注明外，所有命令都从仓库根目录执行。

## 1. 启动范围

本流程启动：

- Docker 中的 Compute PostgreSQL，宿主端口 `5434`。
- 本机源码运行的 Go Compute API，地址 `http://127.0.0.1:8088`。
- 本机 `backend/.venv` 运行的 Python simulation worker。
- 本机 Node.js 运行的 standalone 前端，默认地址 `http://localhost:5173`。

本流程使用仅限本机开发的 no-auth 模式，不启动 legacy FastAPI 后端，也不启动 MinIO。需要验证 S3 archive 或完整 Compose 集成行为时，应改用 `docker-compose.dev.yml` 的完整栈。

## 2. 前置条件

从仓库根目录检查工具：

```bash
docker version
docker compose version
go version
node --version
npm --version
backend/.venv/bin/python --version
```

建议使用项目 Compose 镜像所采用的 Node.js 20。首次启动前端时安装依赖：

```bash
cd frontend
npm install
cd ..
```

worker 自检：

```bash
backend/.venv/bin/python \
  services/simulation-worker/simulation_worker/cli.py \
  --self-check
```

## 3. 四终端启动流程

先在每个终端进入仓库根目录：

```bash
cd /path/to/udm-v2
```

### 3.1 终端 1：PostgreSQL

启动开发数据库：

```bash
docker compose \
  -p autowatersimu-dev \
  -f docker-compose.dev.yml \
  up -d compute-postgres
```

确认状态为 `healthy`：

```bash
docker compose \
  -p autowatersimu-dev \
  -f docker-compose.dev.yml \
  ps compute-postgres
```

本地连接信息：

```text
Host: localhost
Port: 5434
Database: autowatersimu_compute
User: autowatersimu
Password: autowatersimu
DSN: postgres://autowatersimu:autowatersimu@localhost:5434/autowatersimu_compute?sslmode=disable
```

数据保存在 Docker named volume 中，停止容器不会删除数据。

### 3.2 终端 2：Go Compute API

```bash
export COMPUTE_API_DATABASE_URL='postgres://autowatersimu:autowatersimu@localhost:5434/autowatersimu_compute?sslmode=disable'
export COMPUTE_API_MIGRATIONS_DIR="$PWD/apps/api/migrations"
export COMPUTE_API_CONTRACTS_DIR="$PWD/contracts"
export COMPUTE_API_AUTH_MODE=disabled
export COMPUTE_API_BIND_ADDR=127.0.0.1

cd apps/api
go run ./cmd/compute-api
```

API 启动时会自动应用 `apps/api/migrations`，不需要手工迁移。另开终端验证：

```bash
curl --fail http://127.0.0.1:8088/healthz
curl --fail http://127.0.0.1:8088/readyz
```

预期 ready 响应：

```json
{"status":"ready"}
```

### 3.3 终端 3：Python worker

确认 API ready 后运行：

```bash
backend/.venv/bin/python \
  services/simulation-worker/simulation_worker/cli.py \
  --run-api-loop \
  --api-base-url http://127.0.0.1:8088 \
  --artifact-dir tmp/worker-api-artifacts \
  --idle-sleep-seconds 2
```

no-auth 模式下不要传 `--api-token`。该命令会持续轮询任务，使用 `Ctrl+C` 停止。

只验证一次 API/worker 连接时运行：

```bash
backend/.venv/bin/python \
  services/simulation-worker/simulation_worker/cli.py \
  --run-api-once \
  --api-base-url http://127.0.0.1:8088 \
  --artifact-dir tmp/worker-api-artifacts
```

队列为空时返回 `idle` 是正常结果。

### 3.4 终端 4：standalone 前端

```bash
cd frontend

VITE_APP_MODE=standalone \
VITE_AUTH_MODE=disabled \
VITE_CONTEXT_MODE=standalone \
VITE_COMPUTE_API_URL=http://127.0.0.1:8088 \
VITE_COMPUTE_API_TOKEN='' \
npm run dev
```

默认访问 `http://localhost:5173`。

如果 `5173` 已被占用，可改用 `5174`：

```bash
VITE_APP_MODE=standalone \
VITE_AUTH_MODE=disabled \
VITE_CONTEXT_MODE=standalone \
VITE_COMPUTE_API_URL=http://127.0.0.1:8088 \
VITE_COMPUTE_API_TOKEN='' \
npm run dev -- --port 5174
```

## 4. 停止服务

API、worker 和前端分别在对应终端按 `Ctrl+C`。

停止数据库但保留数据：

```bash
docker compose \
  -p autowatersimu-dev \
  -f docker-compose.dev.yml \
  stop compute-postgres
```

停止本项目的开发 Compose 服务但保留 named volumes：

```bash
docker compose \
  -p autowatersimu-dev \
  -f docker-compose.dev.yml \
  down
```

不要在仍需保留本地数据库时添加 `-v`；`down -v` 会删除 Compose named volumes。

## 5. 常见问题

### `go`、`uv` 或 Python 找不到

重新加载 zsh 配置：

```bash
source ~/.zshrc
```

项目 Python 必须使用：

```text
backend/.venv/bin/python
```

不要使用 Windows 文档里的 `backend\.venv\Scripts\python`。

### API 无法连接数据库

检查数据库状态与端口：

```bash
docker compose -p autowatersimu-dev -f docker-compose.dev.yml ps compute-postgres
lsof -nP -iTCP:5434 -sTCP:LISTEN
```

确认 `COMPUTE_API_DATABASE_URL` 使用宿主地址 `localhost:5434`，而不是 Compose 内部地址 `compute-postgres:5432`。

### 端口被占用

```bash
lsof -nP -iTCP:8088 -sTCP:LISTEN
lsof -nP -iTCP:5173 -sTCP:LISTEN
lsof -nP -iTCP:5434 -sTCP:LISTEN
```

API 默认需要 `8088`。前端可通过 `npm run dev -- --port 5174` 更换端口。

### 为什么不直接使用 `just`

当前根 `Justfile` 的 shell 配置和部分 recipe 使用 Windows PowerShell 语法。macOS 源码调试应使用本文中的 zsh 等价命令；Docker Compose 命令本身可跨平台运行。

## 6. 完整 Docker 开发栈

如果不需要逐进程源码调试，可启动 PostgreSQL、MinIO、API、worker 和前端完整开发栈：

```bash
docker compose -f docker-compose.dev.yml up -d
```

完整开发栈使用 static-token 配置，与本文的本机 no-auth 源码流程不同。不要把两种模式的 API、worker 配置混用。

## 7. 相关文档

- `docs/architecture/next-startup.md`：Windows PowerShell 启动流程。
- `docs/architecture/local-dev.md`：根任务入口和集成验证说明。
- `apps/api/README.md`：Compute API 配置和 PostgreSQL 边界。
- `services/simulation-worker/README.md`：worker CLI、自检和测试命令。
- `frontend/README.md`：前端运行模式和 Compute API 配置。
