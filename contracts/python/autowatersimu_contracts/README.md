# 目录说明：contracts/python/autowatersimu_contracts

## 1. 目录职责

本目录是 AutoWaterSimu contract helper 的 Python package。

本目录负责：

- CanvasGraph -> ProcessGraph -> SimulationInput pure dict transforms。
- Contract-style error construction。
- Legacy flow export compatibility helpers。

本目录不负责：

- JSON Schema file ownership。
- Backend route execution。
- Worker process orchestration。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `transforms.py` | contract transform functions |
| `errors.py` | contract error helper |
| `__init__.py` | package exports |

## 3. 维护约定

1. Keep functions pure and dependency-light.
2. Transform behavior must stay aligned with `frontend/src/contracts` prototype.
3. Schema field additions require examples and tests under `contracts/tests`。

## 4. 对外接口

本目录通过 `autowatersimu_contracts` package 暴露 transform and error helpers。

## 5. 依赖边界

可以依赖 Python standard library。

不应该依赖 FastAPI、SQLModel、React、Tauri or Go runtime。

## 6. 测试与验证

```powershell
backend\.venv\Scripts\python -m pytest contracts\tests -q
```

## 7. AI 操作提示

改 transform 语义时同步 Python tests、TypeScript prototype and examples。
