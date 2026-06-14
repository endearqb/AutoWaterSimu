# 目录说明：simulation_core/python

## 1. 目录职责

本目录负责 Python 形式发布的纯仿真核心包。

本目录负责：

- `autowatersimu_simulation_core` import 根。
- 无 HTTP、DB、用户或 worker token 的 material balance 运行时，以及该运行时内的 ASM/UDM 节点模型绑定数据。
- `simulation.asm1slim.v1`、`simulation.asm1.v1`、`simulation.asm3.v1` 与 `simulation.udm.v1` 到现有 ASM/UDM 节点模型分支的纯 Python adapter 支持。
- 供 Python worker、未来 backend wrapper 和数值测试复用的计算 API。

本目录不负责：

- CLI 参数解析。
- Desktop sidecar 进程管理。
- Web Compute API。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `pyproject.toml` | `autowatersimu-simulation-core` package metadata and editable/wheel build entry |
| `autowatersimu_simulation_core/` | Phase 2B core package |

## 3. 维护约定

1. 不导入 `backend/app`、FastAPI、SQLModel、数据库会话或用户上下文。
2. 新模型运行时先在本包建立纯 Python adapter，再由 worker 调用；迁移期 ASM/UDM 节点绑定字段必须和 backend adapter 保持一致。
3. 数值行为变更必须补 parity 测试或说明 tolerance。
4. 收紧 `simulation_input.v1` / runtime model 输入字段策略前，先运行 `scripts/audit-simulation-core-input-contract.ps1`，并先补未知字段 warn/strict 语义测试。

## 4. 对外接口

本目录对外暴露 Python package import surface，当前由 `services/simulation-worker` 使用。Package name 为 `autowatersimu-simulation-core`，import root 为 `autowatersimu_simulation_core`，版本来自 `autowatersimu_simulation_core.__version__`。

## 5. 依赖边界

可以依赖：

- `contracts/python`
- numpy / scipy / torch / torchdiffeq

不应该依赖：

- `backend/app`
- FastAPI / SQLModel
- React / Tauri / Go API

## 6. 测试与验证

修改本目录后建议运行：

```powershell
backend\.venv\Scripts\python -m pytest simulation_core\tests -q
backend\.venv\Scripts\python -m pytest services\simulation-worker\tests -q
backend\.venv\Scripts\python -m pip install -e simulation_core\python --no-deps
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-simulation-core-input-contract.ps1
```

## 7. AI 操作提示

1. 先读根 `AGENTS.md`、根 `README.md`、`simulation_core/README.md` 和本 README。
2. 新增核心依赖前确认 worker 打包和 Desktop sidecar 影响。
3. 不要为了让 core 独立而改 legacy backend 行为。
