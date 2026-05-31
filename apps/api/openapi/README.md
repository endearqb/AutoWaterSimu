# 目录说明：apps/api/openapi

## 1. 目录职责

本目录保存 Go Compute API OpenAPI source。

本目录负责：

- `compute.openapi.json` 作为 compute client generation source。
- 描述 Web/Platform compute API 的 request/response/error surface，包括 job、model catalog snapshot registry/listing、default parameter set status transition、read-only default parameter set promotion plan、evidence-backed default parameter set promotion、benchmark case schedule-run、benchmark run history、process graph registry、simulation input registry、simulation check、artifact retention metadata and admin retention sweep、model catalog/benchmark cases、model_run、evidence package、production readiness、evidence reference dereference、contract validation、draft confirmation audit、constraint application plan、result explanation workflow and explicit promotion endpoints。

本目录不负责：

- Legacy FastAPI OpenAPI。
- Generated TypeScript client output。
- Go handler implementation。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `compute.openapi.json` | Go Compute API OpenAPI specification |

## 3. 维护约定

1. Go handler 行为变化后同步更新 spec。
2. 更新后运行 compute client generation，输出只能写到 `frontend/src/client/compute`。
3. 不覆盖 legacy FastAPI `frontend/src/client`。

## 4. 对外接口

本目录对 `frontend/openapi-compute-ts.config.ts` 暴露 OpenAPI input。

## 5. 依赖边界

可以引用 `contracts/` wire shape；不应描述 backend FastAPI-only endpoints。

## 6. 测试与验证

```powershell
cd frontend; npm run generate-compute-client
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

Spec 改动必须说明是否需要同步 generated client；不要手改 generated output 代替更新 spec。
