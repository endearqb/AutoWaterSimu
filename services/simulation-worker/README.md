# 目录说明：services/simulation-worker

## 1. 目录职责

本目录负责 Python Simulation Worker。

本目录负责：

- `simulation-worker --self-check`。
- `simulation-worker --run-job <path>`。
- `simulation-worker --stdio-jsonrpc`。
- `simulation-worker --run-api-once` 本地/CI worker HTTP smoke。
- `simulation-worker --run-api-loop` bounded worker HTTP loop。
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
| `tests/` | Worker CLI/API/runtime boundary tests plus isolated old-vs-backend oracle tests |

Phase 2B 后 worker 通过 installable `autowatersimu-simulation-core` / `autowatersimu-contracts` Python packages 调用 material balance runtime，不再直接依赖 `backend/app`。`simulation_core/python` 与 `contracts/python` repo path fallback 仅作为 source-mode / packaged sidecar compatibility fallback 保留，并且只能在 installed package import 失败后触发。当前默认 source-mode gate 由 `scripts/audit-worker-dependency-installation.ps1` 和 `pr-fast` 执行，要求 self-check 中 `deprecated_repo_path_fallback_used=false`；P-07 packaged gate 由 `scripts/ci/worker-packaged-no-fallback-smoke.ps1` 执行，要求 PyInstaller one-folder sidecar self-check 同样报告 `deprecated_repo_path_fallback_used=false`。需要验证 deprecated fallback 时必须显式允许，不得把 fallback 成功当作默认安装路径成功。当前 worker 接受 `simulation.material_balance.v1`、`simulation.asm1slim.v1`、`simulation.asm1.v1`、`simulation.asm3.v1` 与 `simulation.udm.v1`；ASM1Slim/ASM1/ASM3/UDM 仍通过既有 material balance runtime 的节点模型分支执行。self-check 声明 `material_balance`、`asm1slim`、`asm1`、`asm3`、`udm`、`ode` capabilities，并报告 worker dependency required modules、module locations、missing-before/after-fallback、deprecated fallback 使用状态和当前 adapter validation mode。worker 默认 adapter validation mode 仍为 `compat`；`--adapter-validation-mode strict` 或 `AUTOWATERSIMU_WORKER_ADAPTER_VALIDATION_MODE=strict` 仅作为 opt-in rollout/smoke 入口，当前 strict 默认切换前置证据由 `scripts/ci/worker-adapter-strict-smoke.ps1` 维护。成功 `compute_result.v1.runtime_audit.timings_ms` 当前记录 `schema_validate`、`dependency_import`、`adapter_convert`、`compute`、`artifact_serialize`、`result_envelope` 与 `total`，供 `scripts/ci/performance-baseline-phase0.ps1` 建立 baseline；这些字段是观测分段，不是热路径优化。`--run-api-once` 是 Phase 4/5 的本地/CI HTTP worker bridge，用于 register -> claim -> heartbeat -> run -> upload artifact -> succeed/fail 的单次闭环；`--run-api-loop` 在同一 HTTP contract 上复用一次注册并重复 claim，支持 `--max-jobs` / `--max-idle-polls` / `--idle-sleep-seconds` 做 bounded loop。生产部署编排、异步求解中断和复杂 cancel acknowledgement 仍是后续工作。

Packaged sidecar build/smoke 由 `apps/desktop/packaging/build-packaged-sidecar.ps1` 和 `apps/desktop/scripts/smoke-packaged-sidecar.ps1` 负责；本目录只定义 worker CLI 行为和测试。

## 3. 维护约定

1. stdout 只输出 JSON result 或 JSON-RPC frames。
2. stderr 只输出脱敏诊断日志。
3. worker 不执行未知 `schema_version`。
4. 大结果写 artifact，并返回 checksum。
5. HTTP worker bridge 只能通过 Go Compute API HTTP contract 交互，不直接写 PostgreSQL、SQLite 或 legacy backend。
6. 成功运行应在 `compute_result.runtime_audit.model_runs` 写入 `model_run.v1`，并引用已生成/上传 artifact。
7. `simulation.asm1slim.v1`、`simulation.asm1.v1`、`simulation.asm3.v1` 与 `simulation.udm.v1` 是当前独立 model job type；静态合同 fixture 覆盖单 reactor UDM，worker tests 另以生成式用例覆盖 UDM Hybrid 多模型映射和 Petersen 教程 baseline。
8. `model_run.parameter_hash` 对纯 material balance 继续哈希 `payload.parameters`；对 ASM/UDM model job type 必须同时纳入节点模型参数、UDM snapshot 和 variable bindings。

## 4. 对外接口

对 Desktop 暴露 stdin/stdout JSON-RPC，对 Web 暴露 worker protocol client 行为。

## 5. 依赖边界

可以依赖：

- Installed `autowatersimu-simulation-core` / `autowatersimu-contracts` packages。
- `simulation_core/` / `contracts/` 作为 deprecated compatibility fallback resource roots。

不应该依赖：

- `backend/app`
- FastAPI route。
- React store。
- SQLite 或 PostgreSQL 直接写入。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --self-check
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-worker-dependency-installation.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\worker-adapter-strict-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\worker-packaged-no-fallback-smoke.ps1
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\material_balance_minimal.compute_job.v1.json --artifact-dir tmp\worker-artifacts
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\material_balance_minimal.compute_job.v1.json --artifact-dir tmp\worker-strict-artifacts --adapter-validation-mode strict
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\asm1slim_minimal.compute_job.v1.json --artifact-dir tmp\worker-asm1slim-artifacts
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\asm1slim_independent.compute_job.v1.json --artifact-dir tmp\worker-asm1slim-independent-artifacts
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\asm1_independent.compute_job.v1.json --artifact-dir tmp\worker-asm1-artifacts
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\asm3_independent.compute_job.v1.json --artifact-dir tmp\worker-asm3-artifacts
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\udm_independent.compute_job.v1.json --artifact-dir tmp\worker-udm-artifacts
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-api-once --api-base-url http://localhost:8088 --api-token dev-worker-token --artifact-dir tmp\worker-api-artifacts
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-api-loop --api-base-url http://localhost:8088 --api-token dev-worker-token --artifact-dir tmp\worker-api-artifacts --max-jobs 1 --max-idle-polls 1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-baseline-phase0.ps1
backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q
```

## 7. AI 操作提示

实现 worker 前先补合同 fixture；不要把 legacy FastAPI route 逻辑复制进 worker。
