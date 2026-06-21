# 目录说明：apps/api/cmd/migrate-legacy

## 1. 目录职责

本目录保存 legacy FastAPI PostgreSQL 到 AutoWaterSimu Next PostgreSQL 的迁移 CLI。

本目录负责：

- 解析 migration flags。
- 调用 `internal/legacyimport` 执行 dry-run、resume、verify-only 和 report 输出。

本目录不负责：

- 直接实现迁移映射。
- 修改 legacy database。
- 启动 Compute API HTTP server。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `main.go` | CLI flag parsing and runner invocation |

## 3. 维护约定

1. Command package 保持 thin wrapper。
2. 默认 batch size 为 500。
3. 迁移报告应写入 JSON 文件或 stdout，不输出敏感 DSN。

## 4. 对外接口

```powershell
cd apps\api
go run ./cmd/migrate-legacy --legacy-database-url $env:AUTOWATERSIMU_LEGACY_DATABASE_URL --target-database-url $env:COMPUTE_API_DATABASE_URL --dry-run --report ..\..\tmp\legacy-migration-report.json
```

## 5. 依赖边界

可以依赖 `apps/api/internal/legacyimport`。

不应该依赖 `internal/compute` service wiring、frontend 或 Python backend runtime。

## 6. 测试与验证

```powershell
cd apps\api; go test ./cmd/migrate-legacy ./internal/legacyimport
```

## 7. AI 操作提示

新增 flag 时同步更新本 README、根 Justfile 和 `scripts/ci/standalone-migration-smoke.ps1`。
