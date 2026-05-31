# 目录说明：domain

## 1. 目录职责

本目录保存 Go Compute API 的领域 package。

本目录负责：

- jobs、workers、artifacts、models、evidence、simulation、agent 等业务领域边界。
- 已稳定的 artifact retention policy 解析和候选判断规则。
- 已稳定的 evidence input/ref/risk parsing 规则。
- 已稳定的 compute job status 与 worker claim matching 不变量。
- 已稳定的 `model_run.v1` 字段、evidence refs 和 warnings 解析规则。
- 已稳定的 simulation job type execution profile / required capability 映射规则，以及 material-balance ProcessGraph-to-SimulationInput projection 规则。
- 不依赖 `apps/api/internal/compute` 的领域服务、领域类型和最小 store 接口。
- 为 `internal/compute` 的兼容 wiring 与 HTTP handler 逐步减负。

本目录不负责：

- 平台级 auth/config/http/metrics helper。
- HTTP route 注册与 response/error mapping。
- PostgreSQL migration SQL。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `artifacts/` | artifact retention policy parsing and candidate helpers |
| `evidence/` | evidence input/ref/risk parsing helpers |
| `jobs/` | compute job status constants, worker claim matching, and invariant helpers |
| `models/` | model_run raw JSON field/ref/warning helpers |
| `simulation/` | simulation job type execution profile, required capability, and material-balance process graph projection helpers |
| `workers/` | worker register / claim / heartbeat 领域服务 |

## 3. 维护约定

1. 本目录 package 不应 import `apps/api/internal/compute`，避免领域层反向依赖兼容 wiring 包。
2. 领域 package 暴露的 store interface 应只包含该领域真正需要的方法。
3. 领域 package 可以返回领域错误，由 `compute` 映射为 `contract_error.v1` HTTP response。

## 4. 对外接口

本目录只对 `apps/api/internal` 内部 package 暴露 Go API。

## 5. 依赖边界

可以依赖：

- Go standard library。
- `apps/api/internal/platform/*` 中不携带领域状态的 helper（确有需要时）。

不应该依赖：

- `apps/api/internal/compute`。
- legacy FastAPI、frontend、Desktop runtime。

## 6. 测试与验证

```powershell
cd apps\api; go test ./internal/domain/... ./internal/compute
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-deps.ps1
```

## 7. AI 操作提示

新增领域 package 前先确认该能力已经有稳定 service/store 边界；若仍依赖大型 `Service` wiring，应先补适配器再移动。
