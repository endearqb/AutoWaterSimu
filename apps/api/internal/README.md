# 目录说明：apps/api/internal

## 1. 目录职责

本目录保存 Go Compute API 的 internal packages。

本目录负责：

- API service 内部 domain/service/store/http 实现。
- 不对 Go module 外部暴露公共 package API。

本目录不负责：

- CLI entrypoint。
- OpenAPI source。
- PostgreSQL migration SQL。

## 2. 核心文件

| 子目录 | 作用 |
|---|---|
| `compute/` | Phase 4A compute job lifecycle skeleton |
| `domain/` | 领域 package，目前包含 artifacts retention policy/action planner、evidence input/ref/risk parsing/result explanation refs/readiness policy、jobs status/claim invariants、models model_run parsing/check、benchmark_run parsing、benchmark workflow gates、benchmark case readiness、parameter-set status rules 与 promotion gate policy、simulation execution/process-graph helpers 和 workers lifecycle domain service，不能反向依赖 compute compatibility package |
| `platform/` | 平台级 auth、config、contracts、HTTP、metrics/security 等横切 helper，不能反向依赖 compute domain |

## 3. 维护约定

1. 外部 HTTP contract 由 `openapi/compute.openapi.json` 描述。
2. internal package 重构不应改变 API 行为，除非同步 OpenAPI、client 和 tests。
3. P0 阶段保持 package 简洁，领域稳定后再拆分；已经拆出的 domain package 和 platform helper 不应重新依赖 compute。

## 4. 对外接口

本目录仅对 `apps/api/cmd/compute-api` 暴露 internal Go package。

## 5. 依赖边界

可以依赖 `contracts/`、PostgreSQL driver 和标准 Go HTTP libs。

不应该依赖 Python scientific runtime、legacy FastAPI 或 Desktop Rust internals。

## 6. 测试与验证

```powershell
cd apps\api; go test ./...
```

## 7. AI 操作提示

修改 internal 行为时同时检查 `apps/api/openapi` 和 `frontend/src/client/compute` 是否需要更新。
