# 目录说明：frontend/src/features/compute-jobs

## 1. 目录职责

本目录保存 Compute job 相关前端 feature wrapper。

本目录负责：

- Compute health、metrics、job create/list/read/result/events/cancel endpoint wrapper。
- Generic schema-valid `compute_job.v1` create wrapper and job-type list filters for service adapters。
- Current-flow 和 demo `compute_job.v1` document builder。
- ProcessGraph registry wrapper。

本目录不负责：

- Artifact retention/download。
- Model governance。
- Contract validation 或 Agent draft workflow。
- Route layout 和 React state 编排。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `api.ts` | Job lifecycle、health、metrics、evidence ref 和 production readiness wrapper |
| `builders.ts` | Demo/current-flow Compute job document builders |
| `processGraphApi.ts` | ProcessGraph registry wrapper |
| `queries.ts` | Compute Jobs route query/mutation options |

## 3. 维护约定

1. Job document builders 必须输出 schema-valid `compute_job.v1` payload。
2. Wrapper 只调用 backend generated endpoints，不在前端伪造 job/result/evidence 状态。
3. API shape 变更时保持 `queries.ts` 和 `services/computeJobsService.ts` facade 兼容，除非明确迁移对应调用方。
4. `createJob()` is the generic handoff point for adapters that already built a schema-valid `compute_job.v1`; keep model-specific payload construction outside this feature unless it is a reusable UI builder.

## 4. 对外接口

对 Compute routes 暴露 query/mutation options；对 `frontend/src/services/computeJobsService.ts` 和 standalone service adapters 暴露 `computeJobApi`、`computeSimulationRegistryApi` 和 builder exports。

## 5. 依赖边界

可以依赖 `frontend/src/client/compute`、`frontend/src/contracts` 和 `frontend/src/shared/api`。

不应该依赖 routes、components 或 legacy backend 源码。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

新增 job endpoint 时先检查 `frontend/src/routes/_layout/compute-jobs.tsx` 的 query/mutation option 调用和 generated client 类型。
