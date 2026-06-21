# 目录说明：frontend/src/features

## 1. 目录职责

本目录保存 AutoWaterSimu Next 前端功能切片。

本目录负责：

- 按业务能力组织 hand-written API wrappers、后续 queries/mutations 和 feature-local helpers。
- 隔离 generated Compute client 的直接 endpoint 调用。

本目录不负责：

- App bootstrap。
- 全局 service compatibility facade。
- Generated client 源码。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `compute-jobs/` | Compute job lifecycle、health、metrics、job document builders 和 process graph registry wrapper |
| `lifecycle/` | Artifact retention/download 和 evidence package download wrapper |
| `model-governance/` | Model catalog、model run、benchmark run 和 parameter set governance wrapper |
| `contracts/` | Contract validation、draft confirmation 和 result explanation workflow wrapper |
| `workspace/` | Scenario、CanvasGraph 和 ContextSnapshot workspace wrapper |
| `evidence/` | 预留 evidence-specific feature 边界；当前 evidence ref/download 仍随 job/lifecycle wrapper 暴露 |

## 3. 维护约定

1. `features/*/api.ts` 可以调用 `frontend/src/client/compute` generated client。
2. `features/*/queries.ts` 封装 route 使用的 TanStack Query query/mutation options。
3. UI components 不直接 import generated client。
4. 新增 endpoint wrapper 时优先放入对应 feature，避免继续扩大 compatibility facade。

## 4. 对外接口

本目录对 Compute routes 暴露 query/mutation options，并对 `frontend/src/services/computeJobsService.ts` 保留 feature API wrapper exports 以维持兼容 facade。

## 5. 依赖边界

可以依赖：

- `frontend/src/client/compute` generated client。
- `frontend/src/shared/api`。
- `frontend/src/contracts` 类型。

不应该依赖：

- `frontend/src/routes`。
- `frontend/src/services` compatibility facade。
- backend 或 apps/api 源码。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1
```

## 7. AI 操作提示

新增 route 数据调用时优先通过 feature query/mutation options；不要让 routes 直接 import generated Compute client 或 compatibility facade。
