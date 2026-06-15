# 目录说明：backend/app/material_balance/asm

## 1. 目录职责

本目录保存 legacy ASM runtime helper 兼容导入路径。

本目录负责：

- ASM1、ASM1Slim、ASM2d、ASM3 计算函数与公共 helper 的 compatibility import paths。
- 实际实现 re-export `autowatersimu_simulation_core.material_balance.asm`。

本目录不负责：

- UDM 用户自定义模型。
- HTTP route。
- worker job dispatch。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `asm1.py` | compatibility re-export of `autowatersimu_simulation_core.material_balance.asm.asm1.reaction` |
| `asm1slim.py` | compatibility re-export of `autowatersimu_simulation_core.material_balance.asm.asm1slim.reaction` |
| `asm2d.py` | compatibility re-export of `autowatersimu_simulation_core.material_balance.asm.asm2d` helpers |
| `asm3.py` | compatibility re-export of `autowatersimu_simulation_core.material_balance.asm.asm3.reaction` |
| `common.py` | compatibility re-export of ASM shared helpers |

## 3. 维护约定

1. 公式、状态变量和参数名改动必须在 `simulation_core/python/autowatersimu_simulation_core/material_balance/asm/` 中完成，并有文献/模型依据或测试基线。
2. 不要在本目录处理 HTTP payload 或数据库字段。
3. 本目录只保留 compatibility re-export；不得重新复制 ASM 公式实现。

## 4. 对外接口

本目录对 legacy backend import path 暴露 ASM 模型函数。

## 5. 依赖边界

可以依赖 `autowatersimu_simulation_core.material_balance.asm` 的稳定 helper surface。

不应该依赖 FastAPI、SQLModel、React 或 Tauri。

## 6. 测试与验证

```powershell
cd backend; .venv\Scripts\python -m pytest app\tests\material_balance_runtime_helpers_thin_shell_test.py -q
```

## 7. AI 操作提示

改模型公式前先确认对应前端配置、教程 preset 和 backend tests 是否需要同步。
