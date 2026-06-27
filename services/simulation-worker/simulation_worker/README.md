# 目录说明：services/simulation-worker/simulation_worker

## 1. 目录职责

本目录负责 Python simulation worker 的可执行代码。

本目录负责：

- CLI 参数解析。
- `--self-check`。
- `--run-job` material balance、ASM1Slim model-bound fixture、`simulation.asm1slim.v1`、`simulation.asm1.v1`、`simulation.asm3.v1` 和 `simulation.udm.v1` 独立 job type 执行链路。
- `--adapter-validation-mode` opt-in adapter validation mode override（默认仍由 env/default 解析为 `compat`）。
- stdio JSON-RPC protocol。
- `--run-api-once` one-shot Go Compute API worker bridge。
- `--run-api-loop` bounded Go Compute API worker loop。
- time-series artifact 写入。
- packaged mode resource root resolution。

本目录不负责：

- 打包 sidecar。
- 生产部署编排、异步求解中断和复杂 cancel acknowledgement。
- simulation core 运行时实现。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `cli.py` | CLI 与 JSON-RPC 入口 |
| `api_client.py` | Go Compute API register/claim/heartbeat/run/upload/succeed/fail client and bounded loop |
| `runner.py` | compute job 执行、schema 校验、core adapter 调用、artifact 输出 |
| `__main__.py` | `python -m simulation_worker` 入口 |

## 3. 维护约定

1. stdout 只能输出 JSON result 或 JSON-RPC frame。
2. stderr 只能输出脱敏诊断，不输出 traceback、token 或完整大 payload。
3. 大时间序列必须写 artifact，summary inline 返回。
4. `api_client.py` 只通过 Go Compute API HTTP contract 交互，不直接写 metadata store。
5. 成功运行需输出 `model_run.v1` 到 `compute_result.runtime_audit.model_runs`，并用 artifact id 填写 `evidence_refs`。
6. `model_run.model_key` 对独立模型 job type 优先来自 `payload.job_type`；对 `simulation.material_balance.v1` 包装下的模型节点，优先来自 `payload.runtime_options.model_family`，再其次来自 ASM/UDM 节点类型；默认回落到 `material_balance`。
7. `model_run.parameter_hash` 对纯 material balance 保持求解参数 hash；对 ASM/UDM model job type 必须纳入节点模型参数、UDM snapshot 和 variable bindings，避免不同模型输入共享同一个 hash。
8. `self_check()` 应报告 `worker_dependency_imports.required_modules`、`module_locations`、`missing_before_fallback`、`missing_after_fallback`、`deprecated_repo_path_fallback_used` 和 `torch_runtime`，用于证明 installed package import 是否成功、runtime 未触发 repo-path fallback，以及性能 baseline 绑定的 torch 线程配置；默认 source-mode gate 与 P-07 packaged sidecar gate 都必须要求 `deprecated_repo_path_fallback_used=false`。
9. 成功 job 的 `compute_result.runtime_audit.timings_ms` 应保留 `schema_validate`、`dependency_import`、`adapter_convert`、`compute`、`artifact_serialize`、`result_envelope` 与 `total` 分段，供 Phase 0 baseline 读取；新增或删除分段时必须同步 worker tests 和 baseline 脚本。
10. Worker adapter validation mode 默认是 `compat`；只能通过 CLI `--adapter-validation-mode`、JSON-RPC `params.adapter_validation_mode` 或 env `AUTOWATERSIMU_WORKER_ADAPTER_VALIDATION_MODE` 显式 opt in 到 `warn` / `strict`。默认切到 `strict` 前必须保持 `worker-adapter-strict-smoke` 通过，并另行更新迁移统计和前端文案。

## 4. 对外接口

本目录对 Desktop sidecar 和 Web worker 过渡期测试暴露 CLI 行为。

修改这些接口时需同步检查 worker tests、contracts 和 Desktop Rust sidecar plan。

JSON-RPC `run_job` 目标形态：

```json
{"jsonrpc":"2.0","id":"rpc_1","method":"run_job","params":{"job":{}}}
```

响应中返回：

```json
{"jsonrpc":"2.0","id":"rpc_1","result":{"compute_result":{}}}
```

`params.job_path` 仅作为本地开发和测试兼容入口保留。

HTTP worker bridge 目标形态：

```powershell
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-api-once --api-base-url http://localhost:8088 --api-token dev-worker-token --artifact-dir tmp\worker-api-artifacts
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-api-loop --api-base-url http://localhost:8088 --api-token dev-worker-token --artifact-dir tmp\worker-api-artifacts --max-jobs 1 --max-idle-polls 1
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\material_balance_minimal.compute_job.v1.json --artifact-dir tmp\worker-strict-artifacts --adapter-validation-mode strict
```

`--run-api-once` 执行一次 register -> claim -> heartbeat -> run -> artifact upload -> succeed/fail 后退出，用于本地 smoke 和 CI。`--run-api-loop` 执行一次 register 后重复 claim；每个已 claim job 执行前都会 heartbeat 以刷新 lease 并读取 `cancel_requested` / terminal 状态，适合 dev/CI 和简单长运行 worker。该 loop 不实现异步求解中断或生产部署编排。

## 5. 依赖边界

可以依赖：

- `contracts/`
- Installed `autowatersimu-contracts` package。
- Installed `autowatersimu-simulation-core` package。
- Installed `autowatersimu-contracts` / `autowatersimu-simulation-core` packages；`contracts/python` / `simulation_core/python` 只作为 editable dependency source roots，不再由 worker runtime 注入 `sys.path`。

不应该依赖：

- `backend/app`
- FastAPI route。
- React store。
- SQLite / PostgreSQL 直接写入。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-worker-dependency-installation.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\worker-adapter-strict-smoke.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\worker-packaged-no-fallback-smoke.ps1
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\asm1slim_minimal.compute_job.v1.json --artifact-dir tmp\worker-asm1slim-artifacts
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\asm1slim_independent.compute_job.v1.json --artifact-dir tmp\worker-asm1slim-independent-artifacts
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\asm1_independent.compute_job.v1.json --artifact-dir tmp\worker-asm1-artifacts
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\asm3_independent.compute_job.v1.json --artifact-dir tmp\worker-asm3-artifacts
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\udm_independent.compute_job.v1.json --artifact-dir tmp\worker-udm-artifacts
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-baseline-phase0.ps1
```

## 7. AI 操作提示

1. 先读根 `AGENTS.md`、根 `README_First.md`、根 `README.md`、`services/simulation-worker/README.md` 和本 README。
2. 任何 stdout 改动都要验证 JSON parser 可以直接解析。
3. worker 只编排 job、schema、artifact 和 JSON-RPC，不实现核心算法。
4. packaged mode 必须能从 PyInstaller bundle resource root 读取 `contracts/` schema 和 fixture。
5. worker runtime 只应 import 已安装 Python helper packages；不得在 job 执行入口修改 `sys.path` 或恢复 repo-path fallback。
