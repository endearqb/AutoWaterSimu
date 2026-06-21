# 目录说明：apps/api/internal/legacyimport

## 1. 目录职责

本目录负责 legacy FastAPI 数据到 AutoWaterSimu Next PostgreSQL metadata 表的迁移映射。

本目录负责：

- 读取 legacy flowchart、UDM model/version/hybrid config 和 job history。
- 生成 schema-valid 或保守可追溯的目标 metadata payload。
- 计算 legacy source hash，保证 dry-run、resume 和 verify 行为幂等。
- 将不可转换 job 写入 `imported_legacy_history`，而不是伪装为可重跑标准 job。

本目录不负责：

- 修改 legacy FastAPI database。
- 执行仿真或重放历史 job。
- 提供 HTTP API。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `legacyimport.go` | migration runner、mapping、report 和 PostgreSQL SQL helpers |
| `legacyimport_test.go` | 无数据库映射与 report 单元测试 |

## 3. 维护约定

1. Legacy connection 必须通过 read-only transaction 查询。
2. 目标写入必须保存 `legacy_source_table`、`legacy_source_id` 和 `legacy_source_hash`。
3. 目标已存在且 hash 不同必须报告 conflict，不得覆盖。
4. 只有 canonical `compute_job.v1` legacy input 且 terminal status 可转换为 `compute_jobs`；其他 job history 只能进入 `imported_legacy_history`。

## 4. 对外接口

本目录由 `apps/api/cmd/migrate-legacy` 调用。

## 5. 依赖边界

可以依赖 Go standard library 和 `pgx`。

不应该依赖 frontend、legacy FastAPI Python runtime 或 worker。

## 6. 测试与验证

```powershell
cd apps\api; go test ./internal/legacyimport
cd apps\api; go test ./...
```

真实数据库迁移 smoke 需要显式提供 legacy 和 target DSN：

```powershell
go run ./cmd/migrate-legacy --legacy-database-url $env:AUTOWATERSIMU_LEGACY_DATABASE_URL --target-database-url $env:COMPUTE_API_DATABASE_URL --dry-run
```

## 7. AI 操作提示

新增 legacy 表映射时先补 report/test，再添加写入逻辑；不可确认转换语义时写 imported history。
