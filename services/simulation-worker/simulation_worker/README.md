# 目录说明：services/simulation-worker/simulation_worker

## 1. 目录职责

本目录负责 Python simulation worker 的可执行代码。

本目录负责：

- CLI 参数解析。
- `--self-check`。
- `--run-job` material balance 最小执行链路。
- stdio JSON-RPC smoke protocol。
- time-series artifact 写入。

本目录不负责：

- 打包 sidecar。
- Web worker claim / heartbeat HTTP protocol。
- 完整 simulation core 抽离。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `cli.py` | CLI 与 JSON-RPC 入口 |
| `runner.py` | compute job 执行、schema 校验、artifact 输出 |
| `__main__.py` | `python -m simulation_worker` 入口 |

## 3. 维护约定

1. stdout 只能输出 JSON result 或 JSON-RPC frame。
2. stderr 只能输出脱敏诊断，不输出 traceback、token 或完整大 payload。
3. 大时间序列必须写 artifact，summary inline 返回。

## 4. 对外接口

本目录对 Desktop sidecar 和 Web worker 过渡期测试暴露 CLI 行为。

修改这些接口时需同步检查 worker tests、contracts 和 Desktop Rust sidecar plan。

## 5. 依赖边界

可以依赖：

- `contracts/`
- `contracts/python`
- 迁移期 `backend/app/services/simulation_input_adapter.py`
- 迁移期 `backend/app/material_balance`

不应该依赖：

- FastAPI route。
- React store。
- SQLite / PostgreSQL 直接写入。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q
```

## 7. AI 操作提示

1. 先读根 `AGENTS.md`、根 `README.md`、`services/simulation-worker/README.md` 和本 README。
2. 任何 stdout 改动都要验证 JSON parser 可以直接解析。
3. Phase 2B 前不要把完整核心搬迁混进本目录。
