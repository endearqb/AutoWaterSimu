# 目录说明：simulation_core/tests

## 1. 目录职责

本目录负责 simulation core 的 Python 测试。

本目录负责：

- core import boundary 测试。
- core adapter 行为测试。
- 与 legacy backend 的 material balance、ASM1Slim model-bound、`simulation.asm1slim.v1`、`simulation.asm1.v1` 和 `simulation.asm3.v1` 数值 parity 测试。

本目录不负责：

- legacy backend route 测试。
- worker CLI 测试。
- frontend typecheck。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `test_material_balance_core.py` | Phase 2B core boundary、adapter 和 parity 测试 |

## 3. 维护约定

1. import boundary 测试不得把 `backend/` 加入 subprocess `PYTHONPATH`。
2. parity 测试可以导入 backend baseline，但必须和 boundary 测试分开。
3. tolerance 默认使用 `rtol=1e-6`、`atol=1e-9`。
4. ASM/UDM 迁移期测试应先覆盖 runtime binding 字段保留和 legacy backend parity，再新增独立 job type 测试；当前 `simulation.asm1slim.v1`、`simulation.asm1.v1` 与 `simulation.asm3.v1` 已有独立 job type parity。

## 4. 对外接口

本目录不暴露运行时接口，只暴露 pytest 测试。

## 5. 依赖边界

可以依赖：

- `simulation_core/python`
- legacy backend baseline，仅用于对照测试。

不应该依赖：

- frontend。
- Desktop runtime。

## 6. 测试与验证

```powershell
backend\.venv\Scripts\python -m pytest simulation_core\tests -q
```

## 7. AI 操作提示

1. 新增 core runtime 能力时先补 boundary 和 parity 测试。
2. 不要把 worker CLI 行为混进 core tests。
