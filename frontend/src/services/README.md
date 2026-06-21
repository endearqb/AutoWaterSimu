# 目录说明：frontend/src/services

## 1. 目录职责

本目录保存 frontend 手写服务封装。

本目录负责：

- legacy ASM/UDM/base model service calls。
- WebSocket service。
- 对 generated client 或 backend response 的轻量适配。
- 保留 Compute compatibility service facade，供旧调用面或过渡期集成使用。

本目录不负责：

- React component state。
- Generated client 源码。
- AutoWaterSimu Next feature 私有 API wrapper。
- 后端业务实现。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `baseModelService.ts` | shared model service behavior |
| `asm1Service.ts`、`asm1slimService.ts`、`asm3Service.ts` | ASM service wrappers |
| `udmService.ts` | UDM service wrapper |
| `websocketService.ts` | WebSocket helper |
| `computeJobsService.ts` | Compatibility facade that composes `features/*` Compute API wrappers |

## 3. 维护约定

1. OpenAPI 生成类型变化时优先更新 generated client，再调整服务封装。
2. 服务层可做 compatibility mapping，但不要伪造未确认业务规则。
3. 错误处理应保留后端结构化错误信息，便于 UI 定位。
4. Go Compute API generated client 的直接调用边界在 `frontend/src/shared/api/` 和 `frontend/src/features/`；`computeJobsService.ts` 只组合这些 wrapper，不直接 import `frontend/src/client/compute`。
5. Evidence package 下载优先沿用 generated Compute API 配置；当前由 `features/lifecycle/api.ts` 读取 `X-Evidence-Checksum` 响应头并下载后端返回 JSON，不要从前端伪造 evidence 内容。Production readiness 与 evidence ref dereference 必须调用后端 generated endpoint，不要在前端跨 job 拼装证据或自行判断生产审批。
6. Model catalog, catalog snapshot listing, default parameter set promotion plan, explicit benchmark-backed approved promotion, benchmark case schedule-run, benchmark run and model run queries use generated Compute API endpoints through `features/model-governance/api.ts`; catalog snapshot registration must pass a schema-valid `model_catalog.v1` document to the backend, default parameter set status updates and explicit approved promotion must call generated backend lifecycle endpoints instead of mutating catalog objects locally, promotion-plan reads must remain advisory, benchmark case schedule-run must only queue backend jobs and must not synthesize benchmark_run records in the frontend, and benchmark run records must pass schema-valid `benchmark_run.v1` documents. Route 层只展示 catalog/version/default parameter set/benchmark case/catalog snapshot/benchmark run/promotion plan metadata 或传递 `job_id` / `model_key` / `model_version` 等只读过滤条件。
7. Contract validation and Agent workflow wrappers live in `features/contracts/api.ts` and only call `POST /api/v1/contracts/validate`、`POST /api/v1/contracts/confirm-draft`、只读 confirmation record 查询、只读 `constraint-application-plan` endpoint、后端 result explanation submit/review/publish endpoints，或显式 `promote-simulation-check` endpoint；不得在前端自行把 valid Agent / simulation / constraint draft / draft confirmation / result explanation 自动转换为 compute job、审批或解释发布动作。
8. `computeJobsService.ts` 只保留兼容 facade，不继续堆新 endpoint 逻辑；新增 Compute API wrapper 应先放入对应 `features/*/api.ts`，route 数据调用应通过 `features/*/queries.ts`。
9. Scenario、CanvasGraph 和 ContextSnapshot workspace calls live in `features/workspace/api.ts`; stores or legacy compatibility callers may import that wrapper, but should not call the generated Compute client directly。
10. UDM model library and hybrid config standalone calls live in `features/udm/api.ts`; `udmService.ts` may runtime-switch those library/config methods to Go Compute API while legacy runtime keeps the FastAPI client. UDM calculation job methods remain legacy until the standalone simulation engine phase provides equivalent endpoints.

## 4. 对外接口

本目录向 stores、routes、components 暴露 legacy typed service functions；Compute compatibility facade 保留给旧调用面和过渡期集成，新 Compute route 数据调用应走 `features/*/queries.ts`。

## 5. 依赖边界

可以依赖 `frontend/src/client` legacy client、`frontend/src/features`、`frontend/src/shared/api`、types、utils。

不应该依赖 React component internals、backend source files，或直接 import `frontend/src/client/compute`。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

改服务返回 shape 前先搜 stores/components 调用方，避免只修编译不修行为。
