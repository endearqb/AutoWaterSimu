# 目录说明：frontend/src/shared/api

## 1. 目录职责

本目录保存跨 feature 的手写 API 共享边界。

本目录负责：

- Go Compute API generated client 的 Web bootstrap 配置。
- Compute API base URL、token resolution 和 path helper。
- UI-facing Compute wrapper 共享类型和 generated type re-export。

本目录不负责：

- 单一业务功能的 endpoint wrapper。
- TanStack Query 封装。
- Generated client 源码。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `computeApiClient.ts` | Compute generated client base URL/token/path 配置边界 |
| `computeTypes.ts` | Compute wrapper 共享接口与 generated type re-export |

## 3. 维护约定

1. `computeApiClient.ts` 是 app bootstrap 配置 Compute generated client 的唯一手写入口。
2. `computeTypes.ts` 只放跨 feature 共享类型或 UI-facing generated re-export；feature 私有类型留在 feature 内。
3. 不在本目录拼装业务 workflow；endpoint wrapper 放入对应 `frontend/src/features/*/api.ts`。

## 4. 对外接口

本目录对 `features/*`、`services/computeJobsService.ts` 和 `main.tsx` 暴露 Compute API 共享配置与类型。

## 5. 依赖边界

可以依赖：

- `frontend/src/client/compute` generated client。
- `frontend/src/contracts` 类型。

不应该依赖：

- `frontend/src/routes`。
- `frontend/src/components`。
- Feature 私有模块。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1
```

## 7. AI 操作提示

修改 token/base URL 行为时同步检查 `frontend/README.md` 的 Compute API Client 说明和所有下载路径 helper 调用方。
