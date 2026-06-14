# 目录说明：backend/app/services

## 1. 目录职责

本目录负责 legacy FastAPI 后端的服务层和迁移期 adapter。

本目录负责：

- API route 之外的业务服务。
- legacy flowchart 数据转换。
- AutoWaterSimu Next 合同到 legacy 计算模型的 adapter，包括迁移期 ASM/UDM runtime binding 字段保留。

本目录不负责：

- HTTP route 定义。
- 数据模型 schema 的集中定义。
- Worker 进程生命周期管理。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `simulation_input_adapter.py` | `simulation_input.v1` 到 legacy `MaterialBalanceInput` 的迁移期 adapter，支持 `simulation.material_balance.v1`、`simulation.asm1slim.v1`、`simulation.asm1.v1`、`simulation.asm3.v1` 与 `simulation.udm.v1` |
| `time_segment_validation.py` | legacy flowchart time segment normalize / validate / convert helpers |
| `data_conversion_service.py` | legacy flowchart 到后端计算输入的转换服务 |

## 3. 维护约定

1. 服务层可以依赖 `app.models`，但不应直接依赖 HTTP 请求对象。
2. 密集计算或大 payload 处理不得用 `print` 输出完整数据。
3. Next adapter 失败应返回可映射为 `contract_error.v1` 的结构化错误。
4. `simulation_input_adapter.py` 与 `simulation_core/python/.../adapters/material_balance.py` 的字段保留和 job type 语义必须保持一致，尤其是 ASM/UDM 可选字段。
5. ASM/UDM calculation service 返回类型注解应使用 `autowatersimu_simulation_core.material_balance.models.MaterialBalanceResult`，与 backend calculator result leaf thin-shell 保持一致；legacy `app.models.MaterialBalanceInput` 输入契约暂不在本目录迁移。

## 4. 对外接口

本目录对 FastAPI routes、worker 过渡期代码和测试暴露服务函数。

修改这些接口时需同步检查 route 调用方、worker 调用方和 backend tests。

## 5. 依赖边界

可以依赖：

- `app.models`
- `app.material_balance`
- `autowatersimu_simulation_core.material_balance.models` 的 result model public surface
- `contracts/python` 的稳定转换输出 shape

不应该依赖：

- React store。
- Tauri / Desktop runtime。
- Go Compute API。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
cd backend; .venv\Scripts\python -m pytest app\tests\services -q
```

## 7. AI 操作提示

1. 先读根 `AGENTS.md`、根 `README.md`、`backend/README.md` 和本 README。
2. 修改公共 adapter 时同步检查 contract fixtures 和 worker tests。
3. 保持 legacy route 行为稳定，迁移期通过 adapter 和测试对齐。
