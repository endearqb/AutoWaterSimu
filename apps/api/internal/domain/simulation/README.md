# 目录说明：simulation

## 1. 目录职责

本目录保存 simulation 领域中已经稳定、可脱离 compute wiring 的规则。

本目录负责：

- simulation job type 的 execution profile / worker capability 映射。
- UDM Network v2 `simulation.udm_network.v1` 的 P0 job profile 映射。
- material-balance ProcessGraph-to-SimulationInput 的结构校验与 payload projection 规则。
- `simulation_request.v1` 已解析输入到 `compute_job.v1` simulation check job document 的纯组装规则。
- `process_graph.v1` 与 `simulation_input.v1` 到中立 metadata record data 的纯投影规则，包括 payload hash、metadata JSON、source/requested defaults、tenant/project/site 元数据与 created_at 透传。

本目录不负责：

- simulation input/process graph metadata persistence、store idempotency 或 compute DTO 映射。
- `simulation_request.v1` schema validation、`input_ref` resolution、job persistence or HTTP mapping。
- HTTP route、OpenAPI、database migration or worker execution。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `execution.go` | simulation job type execution profile and required capability helpers |
| `execution_test.go` | direct tests for execution profile behavior |
| `process_graph.go` | process graph structural validation and material-balance simulation input projection helpers |
| `process_graph_test.go` | direct tests for process graph validation and projection behavior |
| `record_data.go` | process graph and simulation input record data projection helpers |
| `record_data_test.go` | direct tests for simulation registry record data projection behavior |
| `simulation_check.go` | simulation check compute job document assembly helper |
| `simulation_check_test.go` | direct tests for simulation check job document defaults, metadata, and execution profile behavior |

## 3. 维护约定

1. 本 package 不应 import `apps/api/internal/compute`。
2. Execution profile helper must preserve the existing `compute_job.v1.execution` JSON shape.
3. Unsupported job types return an execution profile with an empty `required_capabilities` list; callers decide whether that is an error.
4. Process graph projection remains material-balance-only until ASM/UDM process graph semantics are explicitly defined and tested.
5. `simulation.udm_network.v1` currently has an execution profile requiring `udm_network` + `ode`; worker execution and process-graph conversion remain later UDM-v2 phases.
5. Simulation check job document assembly preserves the existing `compute_job.v1` JSON shape, default `job_simcheck_*` / `trace_simcheck_*` ids, `simcheck:<request_id>` idempotency fallback, and external/input ref metadata rules; callers still own schema validation and input resolution.
6. Simulation registry record data projection must preserve existing payload JSON/hash, metadata JSON/defaults, required identity fields, tenant/project/site metadata projection, and caller-supplied timestamps; callers still own schema validation, idempotent persistence, read-scope enforcement, and compute record mapping.

## 4. 对外接口

本目录对 `apps/api/internal/compute` 暴露：

- `ExecutionProfile(jobType string) map[string]any`
- `RequiredCapabilities(jobType string) []string`
- `IsSupportedJobType(jobType string) bool`
- `BuildSimulationCheckJobDocument(input SimulationCheckJobInput) SimulationCheckJobDocument`
- `ValidateProcessGraphForSimulationInput(processGraph map[string]any) error`
- `ProcessGraphToSimulationInput(processGraph map[string]any, parameters map[string]any, simulationInputID string, jobType string) (map[string]any, error)`
- `ProcessGraphRecordDataFromDocument(input ProcessGraphRecordDataInput) (ProcessGraphRecordData, error)`
- `SimulationInputRecordDataFromDocument(input SimulationInputRecordDataInput) (SimulationInputRecordData, error)`

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

扩展 simulation job type 或 simulation check job document shape 时，应同步检查 worker capability matching、model catalog benchmark cases、contracts examples and compute tests。
