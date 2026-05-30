# 目录说明：backend/app/api

## 1. 目录职责

本目录负责 legacy FastAPI API 聚合。

本目录负责：

- 在 `main.py` 中聚合各 route module 到 `api_router`。
- 维护 API dependency helper 和 v1 WebSocket route。
- 保持 legacy URL、tag 和 generated client 行为稳定。

本目录不负责：

- 业务计算实现。
- SQLModel 表定义。
- 前端 client 手写封装。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `main.py` | 统一注册 route modules |
| `routes/` | 业务 HTTP routes |
| `deps/` | FastAPI dependency helpers |
| `v1/` | legacy v1 WebSocket route |

## 3. 维护约定

1. 新 route 注册到 `api/main.py` 时确认 prefix、tags 和 OpenAPI operation id 稳定。
2. route 不应输出大 payload；需要观测时使用 structured logging。
3. route schema 变化后更新 frontend generated client。

## 4. 对外接口

本目录对 `backend/app/main.py` 暴露 `api_router`，并通过 OpenAPI 暴露给 legacy frontend client。

## 5. 依赖边界

可以依赖：

- `app.api.routes`
- `app.core.config`

不应该依赖：

- React store。
- Desktop Rust runtime。
- Go Compute API internals。

## 6. 测试与验证

```powershell
cd backend; .venv\Scripts\python -m pytest app\tests\api -q
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

新增或修改 route 前先读 `backend/app/api/routes/README.md` 和相关 service README。
