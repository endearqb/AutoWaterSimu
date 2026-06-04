# 目录说明：frontend/src/features/evidence

## 1. 目录职责

本目录是 evidence-specific 前端 feature 边界。

本目录负责：

- 后续独立 evidence package、evidence reference 或 production readiness query/mutation wrapper。

本目录不负责：

- 当前已经随 job/lifecycle wrapper 暴露的兼容 API。
- 前端合成 evidence package。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| 暂无 | 当前 evidence ref resolution 位于 `features/compute-jobs/api.ts`，evidence package download 位于 `features/lifecycle/api.ts` |

## 3. 维护约定

1. 只有当 evidence 行为需要独立 route/query 或跨多个 feature 复用时，才新增本目录代码。
2. Evidence 内容必须来自后端 endpoint 或 contract fixture，不在前端自行拼装生产证据。

## 4. 对外接口

暂无稳定代码接口。

## 5. 依赖边界

未来可以依赖 `frontend/src/client/compute` 和 `frontend/src/shared/api`。

不应该依赖 routes、components 或 legacy backend 源码。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

如果把 evidence wrapper 从 job/lifecycle 迁入本目录，必须保持 `computeJobsService` facade 兼容并更新 README/check-deps 说明。
