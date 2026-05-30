# 目录说明：apps/api/cmd/compute-api

## 1. 目录职责

本目录是 Go Compute API server binary entrypoint。

本目录负责：

- Reading runtime configuration.
- Creating compute service dependencies.
- Starting HTTP server.
- Wiring optional artifact retention scheduler configuration.
- Wiring optional local filesystem artifact archive store configuration.

本目录不负责：

- Job lifecycle business rules.
- PostgreSQL schema definitions.
- OpenAPI document generation.

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `main.go` | Compute API main function |

## 3. 维护约定

1. Keep `main.go` as wiring code.
2. Business behavior changes belong in `internal/compute`.
3. Config changes must be documented and tested where practical。
4. Missing `COMPUTE_API_DATABASE_URL` intentionally starts a non-persistent memory store for local Web UI smoke tests only; PostgreSQL remains required for durable platform runs。
5. Artifact retention scheduler is disabled unless `COMPUTE_API_RETENTION_SWEEP_INTERVAL` is set; `COMPUTE_API_RETENTION_SWEEP_DRY_RUN` defaults to `true` and must be explicitly set to `false` to delete.
6. Artifact archive handling is disabled unless `COMPUTE_API_ARCHIVE_DIR` is set; when enabled, this command wires a separate non-overlapping `local_fs_archive` store and business behavior remains in `internal/compute`. `COMPUTE_API_ARCHIVE_DIR` must not equal, contain, or be contained by `COMPUTE_API_ARTIFACT_DIR`.

## 4. 对外接口

This command exposes the Compute API HTTP process.

## 5. 依赖边界

Can import `apps/api/internal/compute`; should not import legacy backend or Desktop code.

## 6. 测试与验证

```powershell
cd apps\api; go test ./...
```

## 7. AI 操作提示

Avoid adding hidden background behavior here; lifecycle policy should remain testable in `internal/compute`.
