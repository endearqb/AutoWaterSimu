# 目录说明：apps/api/migrations

## 1. 目录职责

本目录保存 Go Compute API PostgreSQL metadata migrations。

本目录负责：

- Versioned SQL up/down migrations for compute metadata。
- Job、worker、artifact、event、model run 等平台 metadata 表结构。
- Model catalog、process graph、simulation input、draft confirmation、result explanation 等合同 payload metadata 表结构。

本目录不负责：

- Legacy FastAPI Alembic migrations。
- SQLite Desktop migrations。
- Runtime object artifact contents。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `0001_compute_api.up.sql` | Phase 4A metadata schema |
| `0001_compute_api.down.sql` | rollback script |
| `0002_artifact_retention.*.sql` | artifact lifecycle metadata columns (`retention_policy`, `retain_until`) |
| `0003_simulation_inputs.*.sql` | registered `simulation_input.v1` payload metadata for reference-based simulation checks |
| `0004_draft_confirmations.*.sql` | persisted `draft_confirmation.v1` audit records for Agent/user confirmation gates |
| `0005_process_graphs.*.sql` | registered `process_graph.v1` payload metadata for ProcessGraph-based simulation checks |
| `0006_model_catalogs.*.sql` | persisted `model_catalog.v1` snapshot metadata for model governance reads |
| `0007_result_explanations.*.sql` | persisted `result_explanation.v1` review/publish audit records |
| `0008_benchmark_runs.*.sql` | persisted `benchmark_run.v1` execution history for model governance reads |

## 3. 维护约定

1. 每个 migration 必须有对应 down script，除非明确记录不可逆原因。
2. 表结构变化需同步 Go store、tests、OpenAPI response fields if exposed。
3. 不把大 time series 或 artifact content 放入 metadata 主表。
4. Retention columns drive the Go API internal retention sweep; deletion is limited to expired unreferenced `ttl` artifacts, while archive workers/storage remain a separate reviewed lifecycle implementation.
5. Model catalog, process graph and simulation input registries store validated payload metadata for governance or job creation references; do not store result artifacts or time-series outputs in these tables.
6. Draft confirmation records are audit metadata only; they must not create jobs, approvals, or production actions by themselves.
7. Result explanation records are audit metadata only; publish status must not be treated as production approval or control publication.
8. Benchmark run records are execution history only; they must not automatically change parameter set lifecycle state or production approval.

## 4. 对外接口

本目录对 Go API deployment/migration runner 暴露 SQL migrations。

## 5. 依赖边界

只面向 PostgreSQL；不复用 Desktop SQLite migration。

## 6. 测试与验证

```powershell
cd apps\api; go test ./...
```

PostgreSQL integration tests 需要 `COMPUTE_API_DATABASE_URL`。Rollback smoke 会执行 down scripts 并删除 metadata tables，必须额外设置 `COMPUTE_API_MIGRATION_DOWN_SMOKE=true`，且只允许指向临时测试数据库。

## 7. AI 操作提示

Schema 改动属于中高风险；先检查 store tests 和 rollback 语义。
