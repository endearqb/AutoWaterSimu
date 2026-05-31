# 目录说明：platform

## 1. 目录职责

本目录保存 Go Compute API 的平台级 internal helper packages。

本目录负责：

- auth、HTTP helper、配置、合同 schema validation、日志、metrics 等不持有 compute domain 状态的横切能力。
- 为 `apps/api/internal/compute` 后续领域拆包提供低耦合基础。

本目录不负责：

- compute job、artifact、model governance、evidence 等领域业务规则。
- PostgreSQL metadata store 或迁移 SQL。
- HTTP route 业务编排。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `auth/` | static bearer token config, principal parsing, and platform auth errors |
| `config/` | command/runtime configuration shape |
| `contracts/` | contract schema loading, schema_version mapping, and JSON Schema validation |
| `httpx/` | JSON response and local CORS HTTP helper |
| `metrics/` | metrics snapshot shape and Prometheus text renderer |

## 3. 维护约定

1. 本目录 package 不应 import `apps/api/internal/compute`，避免平台层反向依赖领域层。
2. 只放可复用、无领域状态的 helper；领域服务继续留在对应 domain package。
3. 新增 helper 时补充直接测试，避免只靠 HTTP handler 间接覆盖。

## 4. 对外接口

本目录只对 `apps/api/internal` 内部 package 暴露 Go API。

## 5. 依赖边界

可以依赖：

- Go standard library。
- `github.com/santhosh-tekuri/jsonschema/v6`，仅限 `contracts/` schema validation helper。

不应该依赖：

- `apps/api/internal/compute`。
- legacy FastAPI、frontend、Desktop runtime。

## 6. 测试与验证

```powershell
cd apps\api; go test ./internal/platform/... ./internal/compute
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1
```

## 7. AI 操作提示

新增平台 helper 前先确认该能力不携带 compute domain 状态；如果需要领域类型，应优先放回领域 package。
