# 目录说明：domain

## 1. 目录职责

本目录保存 Go Compute API 的领域 package。

本目录负责：

- jobs、workers、artifacts、models、evidence、simulation、agent 等业务领域边界。
- 已稳定的 draft confirmation envelope 跨字段校验和确认记录 data projection 规则。
- 已稳定的 constraint application advisory plan 组装与 Agent draft proposed request 提取规则。
- 已稳定的 artifact retention policy 解析、upload/archive metadata projection、候选判断和 retention sweep action planning 规则。
- 已稳定的 evidence input/ref/risk parsing、stored result summary risk projection、result explanation evidence ref 提取、result explanation record data projection、object-scope matching 与 production-readiness policy 规则。
- 已稳定的 compute job status、failed-worker fallback result construction、worker result completion 解释、worker claim matching 不变量，以及 cancel/timeout state lifecycle mutation plan。
- 已稳定的 built-in `model_catalog.v1` document shape、persisted model catalog snapshot record data projection、`benchmark_run.v1` record data projection、default parameter set status transition document mutation projection、benchmark case schedule-run `compute_job.v1` document shape、`compute_result.v1.runtime_audit.model_runs` 提取预检、`model_run.v1` identity、evidence refs、warnings、parameter_hash 解析与 identity/hash 比对规则，`benchmark_run.v1` evidence refs 解析规则，benchmark workflow gate，default parameter set status 常量/迁移不变量、单个 benchmark case promotion readiness 判定、default parameter set promotion gate 判定，以及 model_run production governance gate 判定。
- 已稳定的 simulation job type execution profile / required capability 映射规则、simulation check `compute_job.v1` document assembly 规则、material-balance ProcessGraph-to-SimulationInput projection 规则，以及 simulation input / process graph record data projection 规则。
- 不依赖 `apps/api/internal/compute` 的领域服务、领域类型和最小 store 接口。
- 为 `internal/compute` 的兼容 wiring 与 HTTP handler 逐步减负。

本目录不负责：

- 平台级 auth/config/http/metrics helper。
- HTTP route 注册与 response/error mapping。
- PostgreSQL migration SQL。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `agent/` | draft confirmation envelope validation / record data projection, Agent draft proposed request extraction, and constraint draft advisory plan helpers |
| `artifacts/` | artifact retention policy parsing, upload/archive metadata projection, candidate checks, and sweep action planning helpers |
| `evidence/` | evidence input/ref/risk parsing, stored result summary risk projection, result explanation ref extraction / record data projection, object-scope matching, and readiness policy helpers |
| `jobs/` | compute job status constants, failed-worker fallback result construction, worker result completion extraction, worker claim matching, cancel/timeout state lifecycle service, and invariant helpers |
| `models/` | built-in model catalog document helper, model catalog snapshot record data projection, benchmark run record data projection, default parameter set status transition document mutation projection, benchmark case run job document helper, compute result model_run extraction, model_run identity/ref/warning/check helpers, benchmark_run evidence ref helpers, benchmark workflow gates, benchmark case readiness helper, parameter-set status invariants, promotion gate policy, and production governance gate |
| `simulation/` | simulation job type execution profile, simulation check job document assembly, required capability, material-balance process graph projection, and simulation registry record data projection helpers |
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
