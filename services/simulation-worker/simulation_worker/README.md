# 目录说明：services/simulation-worker/simulation_worker

## 1. 目录职责

本目录负责 Python simulation worker 的可执行代码。

本目录负责：

- CLI 参数解析。
- `--self-check`。
- `--run-job` material balance 最小执行链路和 ASM1Slim model-bound fixture 执行链路。
- stdio JSON-RPC protocol。
- `--run-api-once` one-shot Go Compute API worker bridge。
- time-series artifact 写入。
- packaged mode resource root resolution。

本目录不负责：

- 打包 sidecar。
- 长驻 Web worker 调度、复杂 heartbeat 和生产部署编排。
- simulation core 运行时实现。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `cli.py` | CLI 与 JSON-RPC 入口 |
| `api_client.py` | one-shot Go Compute API register/claim/run/upload/succeed/fail client |
| `runner.py` | compute job 执行、schema 校验、core adapter 调用、artifact 输出 |
| `__main__.py` | `python -m simulation_worker` 入口 |

## 3. 维护约定

1. stdout 只能输出 JSON result 或 JSON-RPC frame。
2. stderr 只能输出脱敏诊断，不输出 traceback、token 或完整大 payload。
3. 大时间序列必须写 artifact，summary inline 返回。
4. `api_client.py` 只通过 Go Compute API HTTP contract 交互，不直接写 metadata store。
5. 成功运行需输出 `model_run.v1` 到 `compute_result.runtime_audit.model_runs`，并用 artifact id 填写 `evidence_refs`。
6. `model_run.model_key` 优先来自 `payload.runtime_options.model_family`，其次来自 ASM/UDM 节点类型；默认回落到 `material_balance`。

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
```

该模式执行一次 register -> claim -> run -> artifact upload -> succeed/fail 后退出，用于本地 smoke 和 CI，不替代后续长驻 worker 调度。

## 5. 依赖边界

可以依赖：

- `contracts/`
- `contracts/python`
- `simulation_core/python`

不应该依赖：

- `backend/app`
- FastAPI route。
- React store。
- SQLite / PostgreSQL 直接写入。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q
backend\.venv\Scripts\python services\simulation-worker\simulation_worker\cli.py --run-job contracts\examples\valid\asm1slim_minimal.compute_job.v1.json --artifact-dir tmp\worker-asm1slim-artifacts
```

## 7. AI 操作提示

1. 先读根 `AGENTS.md`、根 `README.md`、`services/simulation-worker/README.md` 和本 README。
2. 任何 stdout 改动都要验证 JSON parser 可以直接解析。
3. worker 只编排 job、schema、artifact 和 JSON-RPC，不实现核心算法。
4. packaged mode 必须能从 PyInstaller bundle resource root 读取 `contracts/` schema 和 fixture。
