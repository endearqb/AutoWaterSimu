# 目录说明：backend/app/api/routes

## 1. 目录职责

本目录保存 legacy FastAPI HTTP route modules。

本目录负责：

- 用户、登录、items、stats 等模板基础 API。
- flowchart、material balance、ASM1/ASM1Slim/ASM3、UDM 和 hybrid UDM routes。
- 将 request/response model、鉴权 dependency 和 service/runtime 调用连接起来。

本目录不负责：

- 长耗时计算架构迁移。
- 复杂数据转换的长期维护逻辑。
- 前端 UI 状态。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `material_balance.py` | material balance validate/calculate route |
| `asm1*.py`、`asm3*.py` | ASM route 和 flowchart route |
| `udm*.py` | UDM model、flowchart、hybrid config 和 calculation routes |
| `flowcharts.py` | legacy material balance flowchart persistence |
| `login.py`、`users.py`、`items.py` | template 基础业务 routes |

## 3. 维护约定

1. Route handler 保持薄；可复用逻辑放入 `app/services`。
2. 后端返回字段变更必须补 route 或 service 测试，并同步 frontend OpenAPI client。
3. validate route 的 response shape 应保持各模型一致，避免前端分支膨胀。
4. 不要在 route 中 `print` 完整 flow data、token、水质数据或 time series。

## 4. 对外接口

本目录通过 `backend/app/api/main.py` 暴露 HTTP endpoints 给 legacy frontend 和外部 API 用户。

## 5. 依赖边界

可以依赖：

- `app.models`
- `app.services`
- `app.material_balance`
- `app.api.deps`

不应该依赖：

- `frontend/` 源码。
- `apps/api/internal`。
- Tauri command/runtime。

## 6. 测试与验证

```powershell
cd backend; .venv\Scripts\python -m pytest app\tests\api\routes -q
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

1. 改公开 response model 时先搜 frontend generated type 是否会变化。
2. 涉及计算 entrypoint 时检查是否属于 legacy baseline，迁移到 worker 需另有计划和测试。
