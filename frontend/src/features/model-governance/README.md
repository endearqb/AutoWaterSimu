# 目录说明：frontend/src/features/model-governance

## 1. 目录职责

本目录保存 model governance 相关前端 feature wrapper。

本目录负责：

- Model catalog 和 catalog snapshot wrapper。
- Model run 和 benchmark run query wrapper。
- Default parameter set promotion/status wrapper。
- Benchmark case schedule-run wrapper。

本目录不负责：

- Compute job generic lifecycle。
- Artifact lifecycle。
- Contract validation 或 Agent workflow。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `api.ts` | Model catalog、model run、benchmark run、parameter set 和 benchmark case wrapper |
| `queries.ts` | Model governance route query options |

## 3. 维护约定

1. Promotion plan 读取保持 advisory，不在前端本地批准或突变 catalog；promotion plan / promote-approved wrapper 支持可选 `jobId`，供 scoped Compute token 调用后端 job-scoped evidence filter。
2. Benchmark run list wrapper 支持可选 `jobId`，供 scoped Compute token 调用后端 job-scoped read filter。
3. Benchmark case schedule-run 只排队后端 job，不合成 benchmark_run 记录。
4. `model_catalog.v1` 和 `benchmark_run.v1` 文档必须交给后端校验。

## 4. 对外接口

对 Compute routes 暴露 model governance query options；对 `frontend/src/services/computeJobsService.ts` 暴露 `computeModelGovernanceApi` 以维持兼容 facade。

## 5. 依赖边界

可以依赖 `frontend/src/client/compute` 和 `frontend/src/shared/api`。

不应该依赖 routes、components 或 legacy backend 源码。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

改 model governance wrapper 前先检查 `frontend/src/routes/_layout/model-governance.tsx` 和 `compute-jobs.tsx` 的 query option 调用。
