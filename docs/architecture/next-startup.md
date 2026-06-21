# AutoWaterSimu Next Startup Guide

本文件说明本地启动 AutoWaterSimu Next 的 Go Compute API、Web 前端和 Python simulation worker。所有命令默认在仓库根目录执行，默认终端为 Windows PowerShell。

## 1. 适用范围

本说明覆盖：

- Go 后端：`apps/api` 下的 Compute API，默认端口 `8088`。
- 前端：legacy React/Vite Web app `frontend`，默认端口 `5173`。
- Python worker：`services/simulation-worker`，通过 Compute API worker HTTP protocol 领取并执行 job。

本说明不覆盖 legacy FastAPI `backend` 的完整 Docker 启动，也不覆盖 Desktop 打包发布。

## 2. 前置条件

建议先运行基础检查：

```powershell
just doctor
```

如果没有安装 `just`，可直接运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\doctor.ps1
```

本地源码模式需要：

- Go toolchain，可在 `apps/api` 下运行 `go test ./...`。
- Node.js / npm，可在 `frontend` 下运行 `npm install`。
- Python 虚拟环境 `backend\.venv`，worker 默认从该环境运行。
- Docker Desktop，仅当使用 compose 一键栈或 PostgreSQL/MinIO 集成栈时需要。

首次安装依赖可运行：

```powershell
just bootstrap
```

等价手动命令：

```powershell
cd apps\api; go mod download
cd ..\..\frontend; npm install
```

## 3. 一键启动本地 Next 栈

推荐需要同时启动 Go API、worker、前端、PostgreSQL 和 MinIO 时使用：

```powershell
just dev-detached
```

前台启动：

```powershell
just dev
```

停止：

```powershell
just dev-down
```

等价 Docker Compose 命令：

```powershell
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml down
```

默认本地地址：

| 服务 | 地址 |
|---|---|
| Go Compute API | `http://localhost:8088` |
| Web 前端 | `http://localhost:5173` |
| MinIO API | `http://localhost:9000` |
| MinIO Console | `http://localhost:9001` |
| Compute PostgreSQL | `localhost:5434` |

Compose 栈会使用开发 token：

| 用途 | Token |
|---|---|
| 前端 / public API | `dev-public-token` |
| worker | `dev-worker-token` |
| admin smoke | `dev-admin-token` |

这些 token 只用于本地开发；`APP_ENV=production` 或 `ENVIRONMENT=production` 时 Compute API 会拒绝默认开发 token。

## 4. 分终端源码启动

当你需要调试某个进程时，可分别启动三个进程。

### 4.1 启动 Go Compute API

```powershell
just dev-api
```

等价命令：

```powershell
cd apps\api; go run ./cmd/compute-api
```

未设置 `COMPUTE_API_DATABASE_URL` 时，Compute API 使用非持久 in-memory metadata store，仅适合本地 Web smoke。需要持久化 metadata 时，先启动 `docker-compose.dev.yml` 中的 PostgreSQL，或自行设置 `COMPUTE_API_DATABASE_URL`。

健康检查：

```powershell
Invoke-RestMethod http://localhost:8088/healthz
Invoke-RestMethod http://localhost:8088/readyz
```

### 4.2 启动 Python worker

先确保 Go Compute API 已启动并能访问 `http://localhost:8088/readyz`。

```powershell
just dev-worker-loop
```

等价命令：

```powershell
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-api-loop --api-base-url http://localhost:8088 --api-token dev-worker-token --artifact-dir tmp\worker-api-artifacts --max-jobs 5 --max-idle-polls 20
```

单次 API worker smoke：

```powershell
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-api-once --api-base-url http://localhost:8088 --api-token dev-worker-token --artifact-dir tmp\worker-api-artifacts
```

worker 自检：

```powershell
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --self-check
```

### 4.3 启动前端

```powershell
just dev-frontend
```

等价命令：

```powershell
cd frontend; npm run dev
```

默认访问：

```txt
http://localhost:5173
```

前端 Compute API 默认读取 `http://localhost:8088`。如需覆盖，可在 `frontend/.env` 中设置：

```env
VITE_COMPUTE_API_URL=http://localhost:8088
VITE_COMPUTE_API_TOKEN=dev-public-token
```

## 5. 常用验证

启动后建议至少检查：

```powershell
Invoke-RestMethod http://localhost:8088/healthz
Invoke-RestMethod http://localhost:8088/readyz
cd frontend; npx tsc --noEmit
```

需要验证 Go API、worker、artifact、evidence 的闭环时运行：

```powershell
just integration-smoke
```

需要验证浏览器当前流程到 live worker 的闭环时运行：

```powershell
just current-flow-live-smoke
```

## 6. 常见问题

### 端口被占用

默认端口为 `8088`、`5173`、`5434`、`9000`、`9001`。如果已有进程占用，优先停止旧进程或修改 `docker-compose.dev.yml` / 对应环境变量后再启动。

### worker 领取不到任务

先确认：

```powershell
Invoke-RestMethod http://localhost:8088/readyz
```

再确认 worker 使用的是 `dev-worker-token`，前端或手工提交 job 使用的是 `dev-public-token` 或具备 `job:create` scope 的 token。

### 前端无法访问 Compute API

检查前端环境变量：

```powershell
cd frontend; npm run dev
```

如果 Compute API 不在默认地址，设置 `VITE_COMPUTE_API_URL`。本地 loopback 来源的跨端口 CORS 已由 Go API 支持。

### 需要完整 PostgreSQL / MinIO 行为

使用 compose 栈：

```powershell
docker compose -f docker-compose.dev.yml up -d compute-api
```

该命令会带起 Compute API 依赖的 PostgreSQL 和 MinIO。worker 和 frontend 可继续用源码模式单独启动。

## 7. 相关文档

- `docs/architecture/local-dev.md`：根级任务入口和现有 `just` recipe 列表。
- `apps/api/README.md`：Go Compute API 目录职责、配置和验证边界。
- `frontend/README.md`：前端开发、OpenAPI client 生成和环境变量。
- `services/simulation-worker/README.md`：worker CLI、API loop、自检和测试命令。
