# 目录说明：apps/api

## 1. 目录职责

本目录负责 Go Compute API。

本目录负责：

- compute job lifecycle。
- worker register / claim / heartbeat / succeed / fail。
- artifact metadata。
- model run and evidence query。
- OpenAPI for platform and generated client。

本目录不负责：

- ODE / torch / numpy / scipy 计算。
- Desktop local orchestration。
- legacy FastAPI route。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `README.md` | 本目录上下文契约 |
| `cmd/compute-api/` | Go Compute API 入口 |
| `internal/compute/` | job lifecycle、worker lifecycle、auth、store、artifact、HTTP handlers |
| `migrations/` | PostgreSQL metadata SQL migrations |
| `openapi/compute.openapi.json` | Go Compute API OpenAPI source |

Phase 4A 使用单个 `internal/compute` package 收敛 skeleton，后续领域稳定后再拆分 `internal/domain/*`。

## 3. 维护约定

1. P0 metadata DB 使用 PostgreSQL。
2. list API 必须支持稳定 cursor pagination。
3. create job 必须支持 idempotency。
4. OpenAPI client 生成到 `frontend/src/client/compute`。
5. P0 auth 使用静态 Bearer token + scope，不实现完整 RBAC。
6. Go API 不执行 Python 科学计算，只编排 worker lifecycle。

## 4. 对外接口

对 Web UI、NewSystem、milp、Agent 和 Python worker 暴露 HTTP API。

## 5. 依赖边界

可以依赖：

- `contracts/`
- metadata database。
- object storage abstraction。

不应该依赖：

- Python scientific runtime。
- legacy FastAPI internals。

## 6. 测试与验证

修改本目录后建议运行 Go API lifecycle、worker lifecycle、OpenAPI generation 和 DB migration smoke。

常用命令：

```powershell
cd apps\api; go test ./...
cd frontend; npm run generate-compute-client
cd frontend; npx tsc --noEmit
```

PostgreSQL integration tests 仅在 `COMPUTE_API_DATABASE_URL` 存在时运行；未配置时会 skip。

## 7. AI 操作提示

实现 API 前先确认 `compute_job.v1` 和 `contract_error.v1` 是否已覆盖本次字段。
