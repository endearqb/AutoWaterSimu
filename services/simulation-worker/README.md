# 目录说明：services/simulation-worker

## 1. 目录职责

本目录负责 Python Simulation Worker。

本目录负责：

- `simulation-worker --self-check`。
- `simulation-worker --run-job <path>`。
- `simulation-worker --stdio-jsonrpc`。
- `simulation-worker --run-api-once` 本地/CI worker HTTP smoke。
- Desktop sidecar 和 Web worker 的共享执行逻辑。

本目录不负责：

- Go API job persistence。
- Tauri Rust process manager。
- Desktop packaging smoke and installer smoke。
- React UI。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `README.md` | 本目录上下文契约 |
| `simulation_worker/` | Python CLI、job runner、self-check 和 JSON-RPC protocol |
| `tests/` | Worker CLI contract tests |

Phase 2B 后 worker 通过 `simulation_core/python` 调用 material balance runtime，不再直接依赖 `backend/app`。当前 worker 接受 `simulation.material_balance.v1` 与首个独立 ASM job type `simulation.asm1slim.v1`；ASM1Slim 仍通过既有 material balance runtime 的节点模型分支执行。self-check 声明 `material_balance`、`asm1slim`、`asm1`、`asm3`、`udm`、`ode` capabilities。`--run-api-once` 是 Phase 4/5 的本地/CI HTTP worker bridge，用于 register -> claim -> run -> upload artifact -> succeed/fail 的单次闭环；长驻 worker 调度、复杂 heartbeat 和生产部署仍是后续工作。

Packaged sidecar build/smoke 由 `apps/desktop/packaging/build-packaged-sidecar.ps1` 和 `apps/desktop/scripts/smoke-packaged-sidecar.ps1` 负责；本目录只定义 worker CLI 行为和测试。

## 3. 维护约定

1. stdout 只输出 JSON result 或 JSON-RPC frames。
2. stderr 只输出脱敏诊断日志。
3. worker 不执行未知 `schema_version`。
4. 大结果写 artifact，并返回 checksum。
5. HTTP worker bridge 只能通过 Go Compute API HTTP contract 交互，不直接写 PostgreSQL、SQLite 或 legacy backend。
6. 成功运行应在 `compute_result.runtime_audit.model_runs` 写入 `model_run.v1`，并引用已生成/上传 artifact。
7. `simulation.asm1slim.v1` 是当前唯一独立 ASM job type；加入 ASM1、ASM3 或 UDM 前必须先补合同 fixture、worker run-job 测试和 legacy parity。

## 4. 对外接口

对 Desktop 暴露 stdin/stdout JSON-RPC，对 Web 暴露 worker protocol client 行为。

## 5. 依赖边界

可以依赖：

- `simulation_core/`
- `contracts/`

不应该依赖：

- `backend/app`
- FastAPI route。
- React store。
- SQLite 或 PostgreSQL 直接写入。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --self-check
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\material_balance_minimal.compute_job.v1.json --artifact-dir tmp\worker-artifacts
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\asm1slim_minimal.compute_job.v1.json --artifact-dir tmp\worker-asm1slim-artifacts
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\asm1slim_independent.compute_job.v1.json --artifact-dir tmp\worker-asm1slim-independent-artifacts
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-api-once --api-base-url http://localhost:8088 --api-token dev-worker-token --artifact-dir tmp\worker-api-artifacts
backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q
```

## 7. AI 操作提示

实现 worker 前先补合同 fixture；不要把 legacy FastAPI route 逻辑复制进 worker。
