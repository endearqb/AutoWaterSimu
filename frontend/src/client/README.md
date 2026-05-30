# 目录说明：frontend/src/client

## 1. 目录职责

本目录保存 generated API clients。

本目录负责：

- legacy FastAPI generated client。
- AutoWaterSimu Next Go Compute API generated client。

本目录不负责：

- 手写业务请求封装。
- UI 组件。
- Go API 或 FastAPI 源码。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `core/`、`sdk.gen.ts`、`types.gen.ts` | legacy FastAPI client |
| `compute/` | Go Compute API client |

## 3. 维护约定

1. `npm run generate-client` 只更新 legacy FastAPI client。
2. `npm run generate-compute-client` 只更新 `compute/`。
3. 不要手改 generated files；更新 OpenAPI source 后重新生成。
4. Release gate 可对 `compute/` generated files 做机械尾随空格和末尾换行归一化；不得借此改写 generated client 逻辑。

## 4. 对外接口

对 frontend routes、hooks 和 future COSS-compatible jobs UI 暴露 typed API client。

## 5. 依赖边界

可以依赖：

- `frontend/openapi-ts.config.ts`
- `frontend/openapi-compute-ts.config.ts`
- `apps/api/openapi/compute.openapi.json`

不应该依赖：

- backend runtime internals。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

生成 compute client 前确认输出目录是 `frontend/src/client/compute`，避免覆盖 legacy client。
