# 目录说明：adapters

## 1. 目录职责

本目录负责把合同 payload 转为 simulation core runtime model。

本目录负责：

- `simulation_input.v1 -> MaterialBalanceInput`。
- core adapter validation error 归一化。
- 保持组件顺序、默认值和 time segments 语义。

本目录不负责：

- JSON Schema 文件校验。
- worker artifact 输出。
- legacy FastAPI route adapter。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `__init__.py` | adapter public exports |
| `material_balance.py` | material balance simulation input adapter |

## 3. 维护约定

1. 组件顺序以 `component_schema.components` 为唯一来源。
2. 空字符串、`null`、缺失浓度按 legacy 行为转 `0.0`。
3. input/output 缺失 volume 默认 `1.0`；普通 reactor 缺失 volume 返回 validation error。

## 4. 对外接口

本目录对外暴露：

- `simulation_input_to_material_balance_input`
- `SimulationCoreAdapterError`

## 5. 依赖边界

可以依赖：

- `autowatersimu_simulation_core.material_balance.models`
- `pydantic`

不应该依赖：

- `app.models`
- FastAPI / SQLModel。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
backend\.venv\Scripts\python -m pytest simulation_core\tests -q
```

## 7. AI 操作提示

1. 对齐 backend adapter 行为时先补测试再改实现。
2. 不要在 adapter 中执行仿真计算。
3. adapter 错误需要能映射到 `contract_error.v1` 风格。
