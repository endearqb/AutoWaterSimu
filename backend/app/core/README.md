# 目录说明：backend/app/core

## 1. 目录职责

本目录保存 legacy backend 的基础设施代码。

本目录负责：

- 环境配置、数据库 engine/session、日志配置、安全工具。
- 全局错误处理和异常 handler。
- 文件校验与简化 WebSocket manager。

本目录不负责：

- 业务 route。
- 仿真计算。
- 前端状态或 UI。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `config.py` | settings 和环境变量解析 |
| `db.py` | SQLModel engine/session 初始化 |
| `security.py` | token/password 安全 helper |
| `logging_config.py` | backend logging 配置 |
| `exception_handlers.py`、`error_handler.py` | API 错误处理 |
| `simple_websocket_manager.py` | legacy WebSocket background manager |

## 3. 维护约定

1. 配置项变化要同步 `.env.example`、部署文档和相关 tests。
2. 安全、认证、数据库连接属于高风险改动，修改前扩大影响分析。
3. logging 配置不得默认输出敏感 payload 或 token。

## 4. 对外接口

本目录对 `app/main.py`、routes、services 和 tests 暴露 settings、DB session、安全和错误处理能力。

## 5. 依赖边界

可以依赖 FastAPI、SQLModel、Pydantic settings 和标准库。

不应该依赖业务 route、React、Desktop 或 Go API internals。

## 6. 测试与验证

```powershell
cd backend; .venv\Scripts\python -m pytest app\tests -q
```

## 7. AI 操作提示

涉及 auth、DB、CORS、error handler 的修改不要只跑单个计算测试；至少覆盖相关 API route tests。
