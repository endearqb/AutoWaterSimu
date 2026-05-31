# 目录说明：models

## 1. 目录职责

本目录实现模型治理相关的稳定领域 helper。

本目录负责：

- `model_run.v1` 原始 JSON 的字段提取。
- model run evidence refs / warnings 提取。
- model run identity / parameter_hash 提取，供 benchmark history 和 promotion planning 验证使用。
- `benchmark_run.v1` evidence refs 提取。
- default parameter set status 常量、合法性判断和允许迁移不变量。

本目录不负责：

- model catalog 持久化、snapshot mutation 或 status update workflow。
- benchmark run 创建、审批或 promotion planning。
- HTTP route、OpenAPI、PostgreSQL implementation。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `models.go` | model_run identity/ref/warning helpers, benchmark_run evidence ref helpers, and parameter-set status invariants |
| `models_test.go` | Direct models domain tests |

## 3. 维护约定

1. 本 package 不得 import `apps/api/internal/compute`。
2. 只放稳定 model/model_run 领域解析规则和参数集状态不变量；治理 workflow、catalog mutation、benchmark validation 暂留 compute compatibility package，直到边界可安全迁移。
3. 新增 `model_run.v1` 或 `benchmark_run.v1` 字段解析时需同步检查 contracts fixtures、evidence package、model governance 和 storage callers。
4. 新增或改变参数集状态时需同步检查 model catalog schema、status endpoint、promotion plan、benchmark queueing 和 evidence governance。

## 4. 对外接口

本目录对 `apps/api/internal/compute` 暴露：

- `RunIDFromRaw`
- `RunIdentity`
- `RunIdentityFromRaw`
- `RunFieldsFromRaw`
- `RunEvidenceRefsFromRaw`
- `RunWarningsFromRaw`
- `BenchmarkRunEvidenceRefs`
- `BenchmarkRunEvidenceRefsFromRaw`
- `ParameterSetStatusDraft` / `ParameterSetStatusCandidate` / `ParameterSetStatusValidated` / `ParameterSetStatusApproved` / `ParameterSetStatusRetired`
- `IsParameterSetStatus`
- `CanTransitionParameterSetStatus`

## 5. 依赖边界

可以依赖 Go standard library。

不应该依赖 `apps/api/internal/compute`、PostgreSQL implementation、HTTP handler、frontend 或 desktop runtime。

## 6. 测试与验证

```powershell
cd apps\api; go test ./internal/domain/models ./internal/compute
```

## 7. AI 操作提示

如果要迁移完整 model governance，请先补 store/DTO adapter，避免把 compute `ModelCatalogResponse`、benchmark DTO 或 HTTP response 类型直接搬入本 package。参数集状态 helper 只能表达稳定不变量，catalog snapshot 写入和 HTTP 错误映射仍由 compute compatibility package 负责。
