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
| `services/simulation_input_adapter_boundary_test.py` | explicit backend-to-simulation_core runtime input boundary guard for `simulation_input.v1` |
| `utils/` | test helper |

## 3. 维护约定

1. 新 bugfix 优先补最小 targeted regression test。
2. 计算迁移要保留 legacy baseline 对照。
3. 需要数据库或 auth 的测试应复用现有 fixtures，不复制 setup。
4. backend material_balance thin-shell leaf migration 应优先补 class identity、object identity 或 parity guard，避免仅靠 import 成功判断迁移完成；exception、result model 与 utils leaf 均需由 focused tests 固定。
5. backend material_balance input/adapter boundary 变更必须证明 `simulation_input.v1` 既能保留 legacy `app.models.MaterialBalanceInput` compatibility path，也能显式构造 simulation_core runtime `MaterialBalanceInput`。

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
