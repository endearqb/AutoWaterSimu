# 目录说明：backend/app/utils

## 1. 目录职责

本目录保存 backend 通用小工具。

本目录负责：

- 与业务无关、可被多处复用的 backend helper。
- 当前包含 timezone helper。

本目录不负责：

- 业务服务。
- HTTP dependency。
- 计算 runtime。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `timezone_utils.py` | timezone / datetime helper |

## 3. 维护约定

1. 只放跨模块通用 helper。
2. 不在这里引入 route、DB session 或计算大依赖。
3. 若 helper 只服务单一业务模块，优先放回该模块目录。

## 4. 对外接口

本目录对 backend app modules 暴露通用 helper。

## 5. 依赖边界

优先依赖标准库；避免依赖 FastAPI request、SQLModel session 或 frontend code。

## 6. 测试与验证

```powershell
cd backend; .venv\Scripts\python -m pytest app\tests -q
```

## 7. AI 操作提示

新增工具前先用 `rg` 搜索是否已有同类 helper，避免重复造轮子。
