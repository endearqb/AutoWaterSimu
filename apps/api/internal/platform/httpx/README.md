# 目录说明：httpx

## 1. 目录职责

本目录保存 Go Compute API 可复用 HTTP helper。

本目录负责：

- JSON response 写入。
- 本地 loopback CORS allowlist。

本目录不负责：

- `AppError` / `contract_error.v1` 映射。
- Compute API route 编排。
- 认证、授权或 data scope 决策。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `httpx.go` | HTTP helper 实现 |
| `httpx_test.go` | helper 直接测试 |

## 3. 维护约定

1. 本 package 不 import `internal/compute`。
2. CORS 只允许 loopback browser origins；不得扩大到任意 origin。
3. Metrics snapshot and Prometheus rendering live in `../metrics`。

## 4. 对外接口

本 package 对 `apps/api/internal/*` 暴露：

- `WriteJSON`
- `WithLocalCORS`

## 5. 依赖边界

可以依赖 Go standard library。

不应该依赖 compute domain package、storage、contracts 或 runtime 配置。

## 6. 测试与验证

```powershell
cd apps\api; go test ./internal/platform/httpx
```

## 7. AI 操作提示

修改 CORS 或 header 行为时同步检查 browser smoke 与 `apps/api/internal/compute/README.md` 的 CORS 约定。
