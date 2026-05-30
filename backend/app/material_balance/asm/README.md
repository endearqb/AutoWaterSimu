# 目录说明：backend/app/material_balance/asm

## 1. 目录职责

本目录保存 legacy ASM runtime helper。

本目录负责：

- ASM1、ASM1Slim、ASM2d、ASM3 计算函数与公共 helper。
- 为 legacy material balance calculator 和 route/service 提供 ASM 节点动态。

本目录不负责：

- UDM 用户自定义模型。
- HTTP route。
- worker job dispatch。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `asm1.py` | ASM1 runtime |
| `asm1slim.py` | ASM1Slim runtime |
| `asm2d.py` | ASM2d runtime draft |
| `asm3.py` | ASM3 runtime |
| `common.py` | ASM shared helpers |

## 3. 维护约定

1. 公式、状态变量和参数名改动必须有文献/模型依据或测试基线。
2. 不要在本目录处理 HTTP payload 或数据库字段。
3. 与 `simulation_core` 抽取副本差异必须显式记录。

## 4. 对外接口

本目录对 `backend/app/material_balance` runtime 和 ASM services 暴露模型函数。

## 5. 依赖边界

可以依赖 Python 科学计算库和本目录公共 helper。

不应该依赖 FastAPI、SQLModel、React 或 Tauri。

## 6. 测试与验证

```powershell
cd backend; .venv\Scripts\python -m pytest app\tests -q
```

## 7. AI 操作提示

改模型公式前先确认对应前端配置、教程 preset 和 backend tests 是否需要同步。
