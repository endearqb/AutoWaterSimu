# 目录说明：apps/api/cmd/compute-api

## 1. 目录职责

本目录是 Go Compute API server binary entrypoint。

本目录负责：

- Reading runtime configuration.
- Creating compute service dependencies.
- Starting HTTP server.
- Wiring optional artifact retention scheduler configuration.
- Wiring optional local filesystem or S3-compatible artifact archive store configuration.
- Enforcing production startup guardrails for static token configuration, including file-mounted token JSON secrets.

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
6. Artifact archive handling is disabled unless one archive backend is explicitly configured. `COMPUTE_API_ARCHIVE_DIR` enables a separate non-overlapping `local_fs_archive` store; `COMPUTE_API_ARCHIVE_S3_ENDPOINT` plus S3 bucket/access key env vars enables path-style `s3_archive`. Set only one backend. Business behavior remains in `internal/compute`.
7. `APP_ENV=production` or `ENVIRONMENT=production` rejects empty token config and the default development token values (`dev-public-token`、`dev-worker-token`、`dev-admin-token`). Token config may come from `COMPUTE_API_TOKENS_JSON` or `COMPUTE_API_TOKENS_FILE`; setting both is invalid. This is a P0 production guard for static token auth, not full OIDC/RBAC.

Production auth guard env vars:

| Variable | Required | Meaning |
|---|---|---|
| `APP_ENV` | no | Preferred Compute API environment flag; `production` enables production auth startup checks |
| `ENVIRONMENT` | no | Fallback environment flag when `APP_ENV` is empty |
| `COMPUTE_API_TOKENS_JSON` | yes in production unless `COMPUTE_API_TOKENS_FILE` is set | Inline static token config JSON; must not be empty or contain default dev token values in production |
| `COMPUTE_API_TOKENS_FILE` | yes in production unless `COMPUTE_API_TOKENS_JSON` is set | Path to a mounted static token config JSON secret; file must not be empty and must not contain default dev token values in production |

S3-compatible archive env vars:

| Variable | Required | Meaning |
|---|---|---|
| `COMPUTE_API_ARCHIVE_S3_ENDPOINT` | yes | HTTP(S) endpoint for path-style S3-compatible archive storage |
| `COMPUTE_API_ARCHIVE_S3_BUCKET` | yes | Archive bucket name |
| `COMPUTE_API_ARCHIVE_S3_REGION` | no | SigV4 region, default `us-east-1` |
| `COMPUTE_API_ARCHIVE_S3_ACCESS_KEY_ID` | yes | Archive access key id |
| `COMPUTE_API_ARCHIVE_S3_SECRET_ACCESS_KEY` | yes | Archive secret access key |
| `COMPUTE_API_ARCHIVE_S3_PREFIX` | no | Optional object key prefix, for example `compute-api/prod` |

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
