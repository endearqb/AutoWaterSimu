# 目录说明：frontend/src/services

## 1. 目录职责

本目录保存 frontend 手写服务封装。

本目录负责：

- legacy ASM/UDM/base model service calls。
- WebSocket service。
- 对 generated client 或 backend response 的轻量适配。

本目录不负责：

- React component state。
- Generated client 源码。
- 后端业务实现。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `baseModelService.ts` | shared model service behavior |
| `asm1Service.ts`、`asm1slimService.ts`、`asm3Service.ts` | ASM service wrappers |
| `udmService.ts` | UDM service wrapper |
| `websocketService.ts` | WebSocket helper |
| `computeJobsService.ts` | Go Compute API jobs/health/metrics/artifact/evidence/model_catalog/model_catalog_snapshot/model_run/benchmark_run/process_graph/contract validation/admin retention service wrapper and current-flow contract bridge |

## 3. 维护约定

1. OpenAPI 生成类型变化时优先更新 generated client，再调整服务封装。
2. 服务层可做 compatibility mapping，但不要伪造未确认业务规则。
3. 错误处理应保留后端结构化错误信息，便于 UI 定位。
4. Evidence package 下载优先沿用 generated Compute API 配置；当前用 service-local `fetch` 读取 `X-Evidence-Checksum` 响应头并下载后端返回 JSON，不要从前端伪造 evidence 内容。Evidence ref dereference 必须调用后端 generated endpoint，不要在前端跨 job 拼装证据。
5. Model catalog, catalog snapshot listing, benchmark run and model run queries use generated Compute API endpoints; catalog snapshot registration must pass a schema-valid `model_catalog.v1` document to the backend, default parameter set status updates must call the generated backend lifecycle endpoint instead of mutating catalog objects locally, and benchmark run records must pass schema-valid `benchmark_run.v1` documents. Route 层只展示 catalog/version/default parameter set/benchmark case/catalog snapshot/benchmark run metadata 或传递 `job_id` / `model_key` / `model_version` 等只读过滤条件。
6. Contract validation and Agent workflow wrappers 只调用 `POST /api/v1/contracts/validate`、`POST /api/v1/contracts/confirm-draft`、只读 confirmation record 查询、只读 `constraint-application-plan` endpoint、后端 result explanation submit/review/publish endpoints，或显式 `promote-simulation-check` endpoint；不得在服务层自行把 valid Agent / simulation / constraint draft / draft confirmation / result explanation 自动转换为 compute job、审批或解释发布动作。

## 4. 对外接口

本目录向 stores、routes、components 暴露 typed service functions。

## 5. 依赖边界

可以依赖 `frontend/src/client`、types、utils。

不应该依赖 React component internals 或 backend source files。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

改服务返回 shape 前先搜 stores/components 调用方，避免只修编译不修行为。
