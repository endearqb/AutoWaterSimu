# 目录说明：frontend/src/features/udm

## 1. 目录职责

本目录负责：

- Standalone UDM model library、hybrid config CRUD and hybrid config validation API wrapper。
- 隔离 generated Compute client 的 UDM endpoint 调用，供 legacy `udmService` 在 standalone runtime 下复用。

本目录不负责：

- UDM 计算任务兼容 facade。
- React component 状态管理。
- generated client 源码。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `api.ts` | Go Compute API 的 UDM model / hybrid config / hybrid validation wrapper |

## 3. 维护约定

1. Wrapper 只做 endpoint 参数适配，不实现业务校验；Hybrid strict validation 必须调用 Go API `/api/v1/udm-hybrid-configs/validate`，不得在前端伪造通过。
2. 需要兼容 legacy facade 时，在 `frontend/src/services/udmService.ts` 做 runtime 分流。
3. 新增 UDM Compute endpoint 后先更新 `apps/api/openapi/compute.openapi.json` 并重新生成 client。

## 4. 对外接口

本目录对外暴露 `computeUdmApi`。

## 5. 依赖边界

可以依赖：

- `frontend/src/client/compute` generated client。

不应该依赖：

- `frontend/src/services` compatibility facade。
- React components/routes。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

修改 UDM API wrapper 后同步检查 `frontend/src/services/udmService.ts` 的 standalone runtime 分流。
