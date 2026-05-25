# 目录说明：services/simulation-worker

## 1. 目录职责

本目录负责 Python Simulation Worker。

本目录负责：

- `simulation-worker --self-check`。
- `simulation-worker --run-job <path>`。
- `simulation-worker --stdio-jsonrpc`。
- Desktop sidecar 和 Web worker 的共享执行逻辑。

本目录不负责：

- Go API job persistence。
- Tauri Rust process manager。
- React UI。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `README.md` | 本目录上下文契约 |

后续添加 worker CLI、protocol、packaging 和 tests。

## 3. 维护约定

1. stdout 只输出 JSON-RPC frames。
2. stderr 只输出脱敏诊断日志。
3. worker 不执行未知 `schema_version`。
4. 大结果写 artifact，并返回 checksum。

## 4. 对外接口

对 Desktop 暴露 stdin/stdout JSON-RPC，对 Web 暴露 worker protocol client 行为。

## 5. 依赖边界

可以依赖：

- `simulation_core/`
- `contracts/`

不应该依赖：

- FastAPI route。
- React store。
- SQLite 或 PostgreSQL 直接写入。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
simulation-worker --self-check
simulation-worker --run-job contracts/examples/valid/material_balance_minimal.compute_job.json
```

## 7. AI 操作提示

实现 worker 前先补合同 fixture；不要把 legacy FastAPI route 逻辑复制进 worker。
