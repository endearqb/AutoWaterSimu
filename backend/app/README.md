# 目录说明：backend/app

## 1. 目录职责

本目录是 legacy FastAPI 应用主体。

本目录负责：

- FastAPI app entrypoint、router 注册和异常处理接入。
- SQLModel 数据模型、CRUD、数据库初始化和 Alembic migration。
- legacy 计算 API、服务层、物料衡算兼容入口和后端测试。

本目录不负责：

- AutoWaterSimu Next worker 进程生命周期。
- Go Compute API metadata lifecycle。
- React/Tauri UI。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `main.py` | FastAPI app 创建、CORS、exception handlers、router 注册 |
| `api/` | HTTP route 聚合与各业务 route |
| `core/` | 配置、数据库、安全、日志、错误处理、WebSocket manager |
| `models.py` | legacy SQLModel 数据表和 API model |
| `material_balance/` | legacy material balance compatibility import paths；calculator、errors、ASM/UDM helpers、exceptions 和 utils 由 simulation_core re-export，runtime models 仅通过 `app.material_balance.models` 显式兼容路径暴露 |
| `services/` | route 之外的业务服务与迁移 adapter |
| `tests/` | backend pytest |

## 3. 维护约定

1. route 层保持薄，业务转换和计算入口优先放到 `services/` 或 runtime 模块。
2. 后端接口或 schema 变化后必须同步更新前端 generated client。
3. 密集计算、payload 转换和 route 调试使用 `logging`，不要 `print` 完整流程图、水质 payload、token 或大结果。
4. legacy 行为是 Next 迁移基线，迁移前先补 old-vs-new 或 targeted regression tests。

## 4. 对外接口

本目录对 Docker backend service、frontend legacy client、backend tests 和迁移期 adapter 暴露 FastAPI app、SQLModel models、service functions 和 runtime classes。

## 5. 依赖边界

可以依赖：

- FastAPI、SQLModel、Pydantic、PostgreSQL 相关库。
- `contracts/python` 的稳定合同 helper。
- `simulation_core/python` 的稳定 public import surface，用于 material_balance 薄壳化迁移叶子；新增这类依赖时必须同步 `backend/pyproject.toml` 与 `backend/uv.lock`。

不应该依赖：

- `frontend/`、`apps/desktop/` 或 `apps/api/` 的 runtime internals。

## 6. 测试与验证

修改本目录后按影响范围运行：

```powershell
cd backend; .venv\Scripts\python -m pytest app\tests -q
cd backend; .venv\Scripts\python -m pytest app\tests\time_segment_validation_test.py app\tests\material_balance_segment_overrides_test.py app\tests\hybrid_udm_validation_test.py app\tests\udm_engine_variable_binding_test.py -q
```

## 7. AI 操作提示

1. 先读根 `AGENTS.md`、`README_First.md`、根 `README.md`、`backend/README.md` 和本 README。
2. 修改 `models.py`、route response model 或 OpenAPI-visible schema 时，同步检查 `frontend/src/client` 生成规则。
3. 涉及计算数值时优先补 targeted pytest，不只依赖手工运行。
