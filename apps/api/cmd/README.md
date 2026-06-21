# 目录说明：apps/api/cmd

## 1. 目录职责

本目录保存 Go Compute API command entrypoints。

本目录负责：

- Executable main packages for API processes。

本目录不负责：

- Business lifecycle logic。
- Store implementation。
- OpenAPI source。

## 2. 核心文件

| 子目录 | 作用 |
|---|---|
| `compute-api/` | Compute API server entrypoint |
| `migrate-legacy/` | Legacy FastAPI PostgreSQL to standalone metadata migration CLI |

## 3. 维护约定

1. Keep command packages thin; lifecycle logic belongs under `internal/compute`.
2. Environment/config parsing should stay explicit and documented in `apps/api/README.md`.
3. Do not hide migrations or worker execution side effects in command init。

## 4. 对外接口

This directory builds runnable Go binaries.

## 5. 依赖边界

May depend on `apps/api/internal/*`; should not be imported by internal packages.

## 6. 测试与验证

```powershell
cd apps\api; go test ./...
cd apps\api; go run ./cmd/migrate-legacy --help
```

## 7. AI 操作提示

When adding a command, also update `apps/api/README.md` with run/config instructions.
