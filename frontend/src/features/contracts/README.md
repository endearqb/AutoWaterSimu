# 目录说明：frontend/src/features/contracts

## 1. 目录职责

本目录保存 contract validation、Agent draft 和 result explanation 相关前端 feature wrapper。

本目录负责：

- Contract document validation wrapper。
- Draft confirmation、constraint application plan 和 explicit simulation-check promotion wrapper。
- Result explanation submit/read/review/publish wrapper。

本目录不负责：

- 本地自动审批。
- 前端自行生成 compute job 或 result explanation 发布状态。
- Contract schema 源码。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `api.ts` | Contract validation、draft confirmation/promotion 和 result explanation workflow wrapper |
| `queries.ts` | Contract validation and draft confirmation mutation options |

## 3. 维护约定

1. 所有 contract/draft/result explanation 行为必须调用后端 generated endpoints。
2. 不在前端把 valid draft 自动转换为 compute job、审批或发布动作。
3. 服务层只透传 document 和 backend response，不固化未确认业务规则。

## 4. 对外接口

对 Compute routes 暴露 contract/draft mutation options；对 `frontend/src/services/computeJobsService.ts` 暴露 `computeContractsApi` 以维持兼容 facade。

## 5. 依赖边界

可以依赖 `frontend/src/client/compute`。

不应该依赖 routes、components、backend 源码或 `contracts/` schema 文件本身。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

改 Agent/draft workflow 前先检查后端 OpenAPI generated method 名称和 route 端错误展示。
