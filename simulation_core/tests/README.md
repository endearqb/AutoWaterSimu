# 目录说明：simulation_core/tests

## 1. 目录职责

本目录负责 simulation core 的 Python 测试。

本目录负责：

- core import boundary 测试。
- core adapter 行为测试。
- `_run_hours` mixed-model dispatch、single-model fallback、clamp policy、ASM oxygen mask scope、`compute_mask` derivative masking、solver matrix policy、deprecated solver limit fields、ASM active reaction runtime precompute、sparse path dense-props lazy behavior、dense/sparse parallel-edge equivalence、`_balance_param` shape guard、segment timestamp CPU construction、precomputed `parameter_names` reuse、UDM component mapping / conflict / stoich mismatch guard 和 UDM expression AST whitelist/corpus 的 correctness-freeze 测试。
- material balance、ASM1Slim model-bound、`simulation.asm1slim.v1`、`simulation.asm1.v1`、`simulation.asm3.v1` 和 `simulation.udm.v1` 的 core-only CPU/f64 committed golden 测试。

本目录不负责：

- legacy backend route 测试。
- legacy backend oracle / parity 测试；backend 对照只保留在 backend-dependent lane。
- worker CLI 测试。
- frontend typecheck。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `test_material_balance_core_boundary.py` | core-only import boundary、adapter 行为、solver matrix policy、deprecated solver limit fields、ASM active reaction runtime precompute、`_run_hours` correctness-freeze、sparse path dense-props lazy behavior、dense/sparse transport、`_balance_param` shape guard、timestamp CPU construction、`parameter_names` reuse、UDM component mapping / conflict / stoich mismatch guard 和 UDM expression AST whitelist/corpus 测试，不导入 legacy backend |
| `test_material_balance_core.py` | core-only CPU/f64 committed golden 测试，并通过 `CORE_F64_GOLDEN_CASES` 显式声明 material balance / ASM / UDM golden 覆盖 |

## 3. 维护约定

1. import boundary 测试不得把 `backend/` 加入 subprocess `PYTHONPATH`。
2. `simulation_core/tests` 不得导入 `app.*` 或把 `backend/` 加入 `sys.path`；backend parity/oracle 测试必须放在 backend-dependent lane。
3. tolerance 默认使用 `rtol=1e-6`、`atol=1e-9`。
4. ASM/UDM 迁移期测试应先覆盖 runtime binding 字段保留和 CPU/f64 golden，再新增独立 job type 测试；当前 `simulation.asm1slim.v1`、`simulation.asm1.v1`、`simulation.asm3.v1` 与 `simulation.udm.v1` 已有独立 job type golden。
5. backend/core 双实现尚未 thin-shell 化前，`CORE_F64_GOLDEN_CASES` 必须覆盖 material balance minimal、ASM1Slim model-bound、独立 ASM1Slim/ASM1/ASM3/UDM job type，并断言状态、步数、时间戳数量、节点字段和稳定结果哈希；backend 对照由 `backend/app/tests/material_balance_calculator_delegation_preflight_test.py` 负责；`scripts/audit-simulation-core-boundary.ps1` 会审计该 guard 是否存在。
6. `_run_hours` mixed-model dispatch、single-model fallback、ASM oxygen mask scope 或 default clamp 行为改变前，必须同步更新 `test_run_hours_*` / mixed golden correctness-freeze tests、`scripts/audit-simulation-core-correctness-freeze.ps1` 和相关 ADR；默认分支是否 clamp 是显式当前状态，不应在性能 PR 中隐式改变。
7. UDM expression 校验器新增语法支持前，必须同时更新 `_validate_ast()` 白名单、`_evaluate_ast()` 运行时支持和 fail-late boundary tests；只新增运行时支持或只放宽校验都会造成校验/执行不一致。

## 4. 对外接口

本目录不暴露运行时接口，只暴露 pytest 测试。

## 5. 依赖边界

可以依赖：

- `simulation_core/python`

不应该依赖：

- legacy backend baseline。
- frontend。
- Desktop runtime。

## 6. 测试与验证

```powershell
backend\.venv\Scripts\python -m pytest simulation_core\tests -q
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-simulation-core-correctness-freeze.ps1
```

## 7. AI 操作提示

1. 新增 core runtime 能力时先补 boundary 和 committed golden 测试。
2. 不要把 worker CLI 行为混进 core tests。
