# 目录说明：contracts/python

## 1. 目录职责

本目录负责 AutoWaterSimu Next 合同的 Python helper。

本目录负责：

- CanvasGraph、ProcessGraph、SimulationInput 的最小转换。
- 合同错误对象构造。
- legacy React Flow export 到 CanvasGraph envelope 的兼容入口。

本目录不负责：

- FastAPI route。
- 数据库写入。
- Worker 进程管理。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `pyproject.toml` | `autowatersimu-contracts` package metadata and editable/wheel build entry |
| `autowatersimu_contracts/` | Python transform package |

## 3. 维护约定

1. 只做纯 dict 转换和校验，不依赖 HTTP、DB、用户或 worker token。
2. 新增合同字段时同步更新 `contracts/*.v1.json`、examples 和 tests。
3. Python 与 `frontend/src/contracts/` prototype 的转换语义需要保持一致。

## 4. 对外接口

本目录对外暴露 `autowatersimu_contracts` package。Package name 为 `autowatersimu-contracts`，import root 为 `autowatersimu_contracts`。

修改这些接口时需同步检查 contract tests、worker 和 frontend transform prototype。

## 5. 依赖边界

可以依赖：

- Python 标准库。
- `contracts/` JSON shape。

不应该依赖：

- FastAPI、SQLModel、Tauri 或 React runtime。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
backend\.venv\Scripts\python -m pytest contracts\tests -q
backend\.venv\Scripts\python -m pip install -e contracts\python --no-deps
```

## 7. AI 操作提示

1. 先读根 `AGENTS.md`、根 `README_First.md`、根 `README.md`、`contracts/README.md` 和本 README。
2. 不要把 legacy-only UI 字段直接推进 worker payload；需要通过合同字段承载。
3. 时间分段、组件顺序和 edge transform 规则改动必须同时更新 Python/TypeScript 两侧。
