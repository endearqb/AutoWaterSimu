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

## 3. 维护约定

1. 外部 HTTP contract 由 `openapi/compute.openapi.json` 描述。
2. internal package 重构不应改变 API 行为，除非同步 OpenAPI、client 和 tests。
3. P0 阶段保持 package 简洁，领域稳定后再拆分。

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
