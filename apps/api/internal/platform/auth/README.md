# 目录说明：auth

## 1. 目录职责

本目录保存 Go Compute API 的静态 bearer token 平台认证 helper。

本目录负责：

- Static token config JSON 解析；`cmd/compute-api` 可先从 `COMPUTE_API_TOKENS_JSON` 或 `COMPUTE_API_TOKENS_FILE` 取得同一 JSON shape。
- 静态 bearer token principal 解析。
- scope、revoked token、tenant/project/site principal metadata。
- 返回不依赖 compute domain 的平台 auth error。

本目录不负责：

- tenant/project/site data-scope 对具体 compute job 的授权判断。
- `contract_error.v1` HTTP response 序列化。
- OIDC/JWKS、RBAC/ABAC 或 token 管理 API。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `auth.go` | Authenticator、TokenConfig、Principal 和 auth error |
| `auth_test.go` | 静态 token、scope、revocation 和 validation 测试 |

## 3. 维护约定

1. 本 package 不 import `internal/compute`。
2. token JSON shape 必须保持与 `COMPUTE_API_TOKENS_JSON` / `COMPUTE_API_TOKENS_FILE` 兼容。
3. 新增生产认证能力前先确认是否属于 static-token P0，还是 OIDC/JWKS/RBAC 后续范围。

## 4. 对外接口

本 package 对 `apps/api/internal/*` 和 `cmd/compute-api` 暴露：

- `Authenticator`
- `NewAuthenticator`
- `TokenConfig`
- `TokenRecord`
- `Principal`
- `Error`

## 5. 依赖边界

可以依赖 Go standard library。

不应该依赖 compute domain package、contracts、storage、HTTP handlers 或 Desktop runtime。

## 6. 测试与验证

```powershell
cd apps\api; go test ./internal/platform/auth ./internal/compute ./cmd/compute-api
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1
```

## 7. AI 操作提示

修改 auth error code/status 时同步检查 compute `ToAppError` 映射和 security smoke。
