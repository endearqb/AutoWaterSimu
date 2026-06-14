# 目录说明：services/simulation-worker/tests

## 1. 目录职责

本目录负责 Python simulation worker 的 pytest 覆盖。

本目录负责：

- Worker CLI self-check 测试。
- `--run-job` 合同 fixture 执行、artifact checksum、独立 `simulation.asm1slim.v1` / `simulation.asm1.v1` / `simulation.asm3.v1` / `simulation.udm.v1` job type、model_run 审计和模型参数 hash 测试。
- worker artifact 与 legacy backend 的 old-vs-worker 数值基线矩阵，包括 material balance、ASM1Slim/ASM1/ASM3、单 reactor UDM、UDM Hybrid 多模型映射和 Petersen 教程默认流程；该类测试必须隔离在 dedicated backend-oracle 文件中。
- stdio JSON-RPC、one-shot Go Compute API bridge 和 bounded API loop 回归测试。

本目录不负责：

- simulation core 数值实现测试。
- Desktop Rust worker process manager 测试。
- Go Compute API store / HTTP handler 测试。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `test_worker_cli.py` | worker CLI、JSON-RPC、HTTP bridge、artifact、model_run 和 runtime boundary 回归；不得静态导入 legacy `backend/app` |
| `test_worker_backend_oracle.py` | old-vs-worker backend oracle 数值基线矩阵；这是本目录唯一允许静态加入 `backend/app` 的测试文件 |

## 3. 维护约定

1. stdout 断言必须保持 JSON 可解析。
2. 新增 worker fixture 时同步检查 `contracts/examples/valid/` 与 schema tests。
3. 新增模型能力时先验证 self-check capabilities，再验证 `model_run.v1`。
4. 当前根 `.gitignore` 会忽略未跟踪的 `test_*.py`，新增本目录测试文件时需确认文件已被 Git 跟踪。

## 4. 对外接口

本目录不暴露运行时接口，只暴露 pytest 测试。

## 5. 依赖边界

可以依赖：

- `services/simulation-worker/simulation_worker`
- `contracts/`
- `simulation_core/python`
- `backend/app` 仅限 `test_worker_backend_oracle.py` old-vs-worker 数值基线测试，worker runtime 代码和 worker CLI/API bridge tests 不得依赖 legacy backend

不应该依赖：

- Desktop Tauri runtime。
- React frontend。

## 6. 测试与验证

```powershell
backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q
```

## 7. AI 操作提示

1. 先读根 `AGENTS.md`、根 `README.md`、`services/simulation-worker/README.md` 和本 README。
2. 修改 worker stdout/stderr 或 artifact shape 后必须运行本目录测试。
