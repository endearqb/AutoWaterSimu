# 目录说明：frontend/src/features/lifecycle

## 1. 目录职责

本目录保存 Compute artifact lifecycle 相关前端 feature wrapper。

本目录负责：

- Artifact retention sweep wrapper。
- Artifact download wrapper。
- Artifact JSON read wrapper for result/time-series adapter reads。
- Evidence package download wrapper。

本目录不负责：

- Job create/read/cancel。
- Model governance。
- Contract validation。
- Evidence 内容合成。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `api.ts` | Artifact retention/download 和 evidence package download wrapper |
| `queries.ts` | Lifecycle route query/mutation options |

## 3. 维护约定

1. Evidence package 下载必须调用后端 endpoint 并读取后端 checksum header。
2. 不在前端自行拼装 evidence package 内容。
3. 下载路径沿用 `shared/api/computeApiClient.ts` 的 base URL/token 行为。
4. `readArtifactJson()` 只负责按 artifact id 读取后端返回的 JSON body；时间序列分页、legacy shape 适配和业务解释应留在调用方 service。

## 4. 对外接口

对 Compute routes 暴露 lifecycle query/mutation options；对 `frontend/src/services/computeJobsService.ts` 和 standalone result adapters 暴露 `computeArtifactsApi` 以及必要的 artifact type re-export 以维持兼容 facade。

## 5. 依赖边界

可以依赖 `frontend/src/client/compute` 和 `frontend/src/shared/api`。

不应该依赖 routes、components 或 legacy backend 源码。

## 6. 测试与验证

```powershell
cd frontend; npx tsc --noEmit
```

## 7. AI 操作提示

修改下载行为时检查浏览器 Blob 下载、错误 body 透传和 token header 行为。
