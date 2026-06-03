# 目录说明：audit

## 1. 目录职责

本目录保存 Go Compute API 的平台级 audit helper。

本目录负责：

- selected mutation audit envelope 的稳定字段形状。
- HTTP principal/route request context 到 audit envelope 的横切投影。
- 带 audit envelope 的 event JSON payload 组装。

本目录不负责：

- 决定哪些 mutation 必须写 audit。
- compute job、artifact、model governance、evidence 等领域状态。
- event 持久化、HTTP response mapping、OIDC/RBAC 或 all-mutation audit coverage。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `audit.go` | request audit context、mutation envelope 和 event JSON helper |
| `audit_test.go` | audit envelope defaults、request override 和 payload copy 测试 |

## 3. 维护约定

1. 本 package 不 import `apps/api/internal/compute`。
2. Audit envelope 字段名应保持兼容：`who`、`when`、`where`、`target_object`、`target_id`、`action`、`before`、`after`、`reason`、`trace_id`、`approval_ref`。
3. 本 package 只定义 envelope shape；新增 audit 覆盖范围应在调用方和安全 smoke 中验证。

## 4. 对外接口

本 package 对 `apps/api/internal/*` 暴露：

- `WithRequestContext`
- `MutationEnvelope`
- `MutationEnvelopeInput`
- `EventJSON`

## 5. 依赖边界

可以依赖 Go standard library。

不应该依赖 compute domain package、contracts、storage、HTTP handlers 或 Desktop runtime。

## 6. 测试与验证

```powershell
cd apps\api; go test ./internal/platform/audit ./internal/compute
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1
```

## 7. AI 操作提示

扩展 audit 字段或覆盖范围时，先确认是否影响 `compute_job_events.event_json.audit` 的兼容读取和 security smoke。
