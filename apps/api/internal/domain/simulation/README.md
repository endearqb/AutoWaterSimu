# 目录说明：simulation

## 1. 目录职责

本目录保存 simulation 领域中已经稳定、可脱离 compute wiring 的规则。

本目录负责：

- simulation job type 的 execution profile / worker capability 映射。

本目录不负责：

- simulation input metadata persistence。
- process graph registry or ProcessGraph-to-SimulationInput transformation。
- HTTP route、OpenAPI、database migration or worker execution。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `execution.go` | simulation job type execution profile and required capability helpers |
| `execution_test.go` | direct tests for execution profile behavior |

## 3. 维护约定

1. 本 package 不应 import `apps/api/internal/compute`。
2. Execution profile helper must preserve the existing `compute_job.v1.execution` JSON shape.
3. Unsupported job types return an execution profile with an empty `required_capabilities` list; callers decide whether that is an error.

## 4. 对外接口

本目录对 `apps/api/internal/compute` 暴露：

- `ExecutionProfile(jobType string) map[string]any`
- `RequiredCapabilities(jobType string) []string`
- `IsSupportedJobType(jobType string) bool`

## 5. 依赖边界

可以依赖：

- Go standard library。

不应该依赖：

- `apps/api/internal/compute`。
- legacy FastAPI、frontend、Desktop runtime。

## 6. 测试与验证

```powershell
cd apps\api; go test ./internal/domain/simulation ./internal/compute
```

## 7. AI 操作提示

扩展 simulation job type 时，应同步检查 worker capability matching、model catalog benchmark cases、contracts examples and compute tests。
