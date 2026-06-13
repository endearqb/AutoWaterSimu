# 目录说明：models

## 1. 目录职责

本目录实现模型治理相关的稳定领域 helper。

本目录负责：

- `model_run.v1` 原始 JSON 的字段提取。
- `compute_result.v1.runtime_audit.model_runs` 中 model_run 文档提取和 job_id 一致性预检。
- model run evidence refs / warnings 提取。
- model run identity / parameter_hash 提取与预期值比对，供 benchmark history 和 promotion planning 验证使用。
- `benchmark_run.v1` evidence refs 提取。
- built-in `model_catalog.v1` document shape 组装，用于 compute fallback catalog。
- persisted model catalog snapshot 的中立 record data projection，包括 catalog_id / payload hash / metadata scope / source/requested_by 默认值。
- `benchmark_run.v1` 的中立 record data projection，包括 payload hash、metadata scope、source/requested_by 默认值与 executed_at 解析。
- benchmark case schedule-run `compute_job.v1` document shape 组装，用于已校验 benchmark case 入队。
- benchmark case scheduling gate 与 benchmark run admission 的稳定前置判定。
- default parameter set status 常量、合法性判断和允许迁移不变量。
- model version / benchmark case / benchmark run status 常量、单个 benchmark case promotion readiness 判定、default parameter set promotion gate 判定，以及 model_run production governance gate 判定。

本目录不负责：

- model catalog 持久化、snapshot mutation workflow orchestration、typed DTO conversion 或 status update workflow。
- benchmark run 创建、审批、simulation input resolution、compute job persistence 或完整 promotion workflow orchestration。
- HTTP route、OpenAPI、PostgreSQL implementation。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `models.go` | built-in model catalog document helper, benchmark case run job document helper, model_run identity/ref/warning helpers, compute result model_run extraction helper, model_run identity check helpers, benchmark_run evidence ref helpers, benchmark workflow gates, benchmark case readiness helper, parameter-set status invariants, promotion gate policy, and production governance gate |
| `catalog_record_data.go` | DTO-neutral persisted model catalog snapshot record data projection |
| `benchmark_run_record_data.go` | DTO-neutral benchmark run record data projection |
| `models_test.go` | Direct models domain tests |

## 3. 维护约定

1. 本 package 不得 import `apps/api/internal/compute`。
2. 只放稳定 model/model_run 领域解析/比对规则、built-in model catalog document shape、model catalog snapshot record data projection、benchmark run record data projection、benchmark case run job document shape、compute result model_run extraction/precheck、benchmark workflow gate、参数集状态不变量、单个 benchmark case readiness 判定、纯 promotion gate 判定和 production governance gate 判定；治理 workflow、catalog mutation orchestration、benchmark validation、simulation input resolution、compute job persistence、typed DTO conversion 暂留 compute compatibility package，直到边界可安全迁移。
3. 新增 `model_run.v1` 或 `benchmark_run.v1` 字段解析时需同步检查 contracts fixtures、evidence package、model governance 和 storage callers。
4. 新增或改变参数集状态时需同步检查 model catalog schema、status endpoint、promotion plan、benchmark queueing 和 evidence governance。

## 4. 对外接口

本目录对 `apps/api/internal/compute` 暴露：

- `RunIDFromRaw`
- `RunIdentity`
- `RunIdentityFromRaw`
- `RunIdentityExpectation`
- `RunIdentityCheck`
- `CheckRunIdentity`
- `RunFieldsFromRaw`
- `RunEvidenceRefsFromRaw`
- `RunWarningsFromRaw`
- `ModelRunDocumentsFromComputeResult`
- `BenchmarkRunEvidenceRefs`
- `BenchmarkRunEvidenceRefsFromRaw`
- `ModelVersionStatusActive` / `BenchmarkCaseStatusValidated` / `BenchmarkRunStatusPassed`
- `ParameterSetStatusDraft` / `ParameterSetStatusCandidate` / `ParameterSetStatusValidated` / `ParameterSetStatusApproved` / `ParameterSetStatusRetired`
- `PromotionBlockModelVersionNotActive` / `PromotionBlockBenchmarkRunMissingForParameterSet` / `PromotionBlockLatestBenchmarkRunNotPassed` / `PromotionBlockModelRunNotFound` / `PromotionBlockModelRunIdentityMismatch` / `PromotionBlockModelRunParameterHashMismatch` / `PromotionBlockModelRunPayloadInvalid` / `PromotionBlockNoValidatedBenchmarkCases` / `PromotionBlockParameterSetAlreadyApproved` / `PromotionBlockParameterSetStatusMustBeValidated`
- `BenchmarkWorkflowBlockModelVersionNotActive` / `BenchmarkWorkflowBlockBenchmarkCaseNotFound` / `BenchmarkWorkflowBlockBenchmarkCaseNotValid` / `BenchmarkWorkflowBlockDefaultParameterSetMiss` / `BenchmarkWorkflowBlockParameterSetMismatch` / `BenchmarkWorkflowBlockParameterSetRetired`
- `IsParameterSetStatus`
- `CanTransitionParameterSetStatus`
- `BenchmarkCaseRunGateInput`
- `BenchmarkCaseRunGate`
- `EvaluateBenchmarkCaseRunGate`
- `BenchmarkRunAdmissionInput`
- `BenchmarkRunAdmission`
- `EvaluateBenchmarkRunAdmission`
- `BenchmarkCasePromotionReadinessInput`
- `BenchmarkCasePromotionReadiness`
- `EvaluateBenchmarkCasePromotionReadiness`
- `ParameterSetPromotionGateInput`
- `ParameterSetPromotionGate`
- `EvaluateParameterSetPromotionGate`
- `ModelRunProductionGateInput`
- `ModelRunProductionGate`
- `EvaluateModelRunProductionGate`
- `BenchmarkCaseRunJobDocumentInput`
- `BenchmarkCaseRunJobDocument`
- `BuildBenchmarkCaseRunJobDocument`
- `BuiltInModelCatalogDocument`
- `BuiltInModelCatalogSource`
- `ModelCatalogSnapshotRecordDataInput`
- `ModelCatalogSnapshotRecordData`
- `ModelCatalogSnapshotRecordDataFromDocument`
- `BenchmarkRunRecordDataInput`
- `BenchmarkRunRecordData`
- `BenchmarkRunRecordDataFromDocument`

## 5. 依赖边界

可以依赖 Go standard library。

不应该依赖 `apps/api/internal/compute`、PostgreSQL implementation、HTTP handler、frontend 或 desktop runtime。

## 6. 测试与验证

```powershell
cd apps\api; go test ./internal/domain/models ./internal/compute
```

## 7. AI 操作提示

如果要迁移完整 model governance，请先补 store/DTO adapter，避免把 compute `ModelCatalogResponse`、benchmark DTO 或 HTTP response 类型直接搬入本 package。Built-in catalog helper 只返回通用文档 shape；material-balance default parameter hash、typed DTO conversion、schema validation、catalog snapshot fallback/store behavior 仍由 compute 负责。Catalog snapshot record data helper 只投影 payload hash、metadata scope、source/requested_by 默认值和 record 字段；catalog registration/status/promote mutation workflow、store writes、audit envelope 和 HTTP mapping 仍由 compute 负责。Benchmark run record data helper 只投影 schema version、payload hash、metadata scope、source/requested_by 默认值、executed_at 和 record 字段；benchmark run schema validation、catalog lookup、model_run/evidence validation、store writes、audit envelope 和 HTTP mapping 仍由 compute 负责。Benchmark case run job document helper 只组装已校验 benchmark case 入队所需的 `compute_job.v1` map 与 idempotency key；catalog lookup、gate/error mapping、execution profile lookup、simulation input resolution、JSON marshaling、createJob 和 store writes 仍由 compute 负责。Compute result model_run extraction helper 只做稳定 JSON 定位和 job_id 预检，schema validation、raw persistence adapter 和 job lifecycle error mapping 仍由 compute 负责。Benchmark workflow gate、参数集状态、benchmark case readiness、promotion gate 与 production governance gate helper 只能表达稳定不变量，catalog snapshot 写入、benchmark 查询编排、evidence package assembly 和 HTTP 错误映射仍由 compute compatibility package 负责。
