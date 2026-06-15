# 目录说明：backend/app/tests

## 1. 目录职责

本目录保存 legacy backend pytest。

本目录负责：

- API route tests。
- service、adapter、conversion 和 numerical regression tests。
- FastAPI template 基础用户/items/auth tests。

本目录不负责：

- frontend Playwright tests。
- Go API tests。
- Desktop Rust tests。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `conftest.py` | pytest fixtures |
| `api/routes/` | route-level tests |
| `services/` | service and adapter tests |
| `*_test.py` | material balance、UDM、time segment targeted tests |
| `material_balance_exceptions_thin_shell_test.py` | backend/core material balance exception class identity guard |
| `material_balance_result_thin_shell_test.py` | backend calculator result model class identity guard |
| `material_balance_utils_thin_shell_test.py` | backend/core material balance utility helper object identity guard |
| `material_balance_runtime_helpers_thin_shell_test.py` | backend/core ASM and UDM runtime helper object identity guard |
| `material_balance_calculator_thin_shell_test.py` | backend/core material balance calculator class identity guard |
| `material_balance_compat_models_boundary_test.py` | backend-local material_balance input models compatibility-only marker and production import boundary guard |
| `material_balance_calculator_delegation_preflight_test.py` | backend-side legacy-input compatibility/parity guard across material_balance, ASM1Slim, ASM1, ASM3, and UDM fixtures |
| `services/simulation_input_adapter_boundary_test.py` | explicit backend-to-simulation_core runtime input boundary guard for `simulation_input.v1` |
| `services/material_balance_runtime_input_boundary_test.py` | service-layer legacy `app.models.MaterialBalanceInput` to simulation_core runtime input validation guard |
| `utils/` | test helper |

## 3. 维护约定

1. 新 bugfix 优先补最小 targeted regression test。
2. 计算迁移要保留 legacy baseline 对照。
3. 需要数据库或 auth 的测试应复用现有 fixtures，不复制 setup。
4. backend material_balance thin-shell migration 应优先补 class identity、object identity 或 parity guard，避免仅靠 import 成功判断迁移完成；calculator、exception、result model、utils、ASM/UDM helper leaf 均需由 focused tests 固定。
5. backend material_balance input/adapter boundary 变更必须证明 `simulation_input.v1` 既能保留 legacy `app.models.MaterialBalanceInput` compatibility path，也能显式构造 simulation_core runtime `MaterialBalanceInput`；legacy service 入口必须在计算前重新校验为 simulation_core runtime model。
6. backend calculator thin-shell 迁移后仍必须保持 delegation preflight 通过；该 preflight 必须覆盖 material_balance minimal、ASM1Slim model-bound、独立 ASM1Slim/ASM1/ASM3/UDM fixtures，并显式记录 allowed migration differences。
7. backend-local `app.material_balance.models` 输入模型只允许作为 compatibility-only 旧导入路径留在 `backend/app/material_balance/__init__.py` 与 `models.py`；生产代码不得把它们当作新 runtime input contract。

## 4. 对外接口

本目录对 CI 和本地验证暴露 pytest suite。

## 5. 依赖边界

可以依赖 backend app modules、pytest fixtures 和 test utilities。

不应该依赖 frontend implementation details 或 Desktop runtime。

## 6. 测试与验证

```powershell
cd backend; .venv\Scripts\python -m pytest app\tests -q
```

## 7. AI 操作提示

根据变更范围选择 targeted tests；最终报告必须说明哪些测试运行、哪些没运行以及原因。
