# 目录说明：material_balance

## 1. 目录职责

本目录负责 material balance 的纯 Python runtime。

本目录负责：

- `MaterialBalanceCalculator`。
- core 内部 Pydantic runtime models。
- ASM/UDM 运行时依赖的临时抽取副本。
- UDM expression 编译的 core 内部依赖。

本目录不负责：

- ASM/UDM 独立 job handler 迁移。
- HTTP route 和数据库模型。
- artifact 写入。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `core.py` | material balance calculator |
| `models.py` | core runtime Pydantic models |
| `exceptions.py` | calculation exceptions |
| `utils.py` | material balance helper functions |
| `asm/` | ASM runtime functions used by calculator |
| `udm_engine.py` | UDM node runtime support |
| `udm_ode.py` | UDM ODE balance support |
| `udm_expression.py` | core-local UDM expression compiler |

## 3. 维护约定

1. runtime models 保持与计算器实际读取字段一致，并拒绝未知字段；payload 兼容性只能放在 adapter 层。
2. 新增 runtime 字段先补 adapter、合同字段/兼容说明和 parity 测试。
3. 不在本目录直接引用 `app.models` 或 `app.services`。

## 4. 对外接口

本目录对外暴露 calculator、runtime input/result model 和 material balance exceptions。

## 5. 依赖边界

可以依赖：

- numpy / torch / torchdiffeq。
- 本包内部 ASM/UDM helper。

不应该依赖：

- FastAPI。
- SQLModel。
- backend service module。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
backend\.venv\Scripts\python -m pytest simulation_core\tests -q
```

## 7. AI 操作提示

1. 若复制 legacy backend 代码，必须检查 `app.*` import 并改为 core-local import。
2. 不要把 backend SQLModel 复制为 runtime model。
3. 数值相关变更必须和 backend baseline 对照。
