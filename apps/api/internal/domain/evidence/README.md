# 目录说明：evidence

## 1. 目录职责

本目录实现 evidence / production-readiness 相关的稳定领域 helper。

本目录负责：

- 从 compute job input JSON 提取 evidence package 所需的 input ref、input hash、process graph ref 和 simulation input ref。
- 解析 job-scoped evidence ref 语法。
- 从 job input 中定位内嵌 `simulation_input.v1` payload。
- 从 result summary 中提取 `risk_findings`、risk evidence refs 和 production-readiness risk summary。
- 评估 production-readiness 的稳定策略：job succeeded、evidence package available、governance production_allowed 和 risk severity checks。

本目录不负责：

- evidence package 生成编排。
- artifact / model run / process graph store lookup。
- HTTP route、OpenAPI、PostgreSQL implementation。
- 生产审批、授权策略或 mutation audit。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `evidence.go` | evidence input/ref/risk parsing and readiness policy helpers |
| `evidence_test.go` | Direct evidence domain tests |

## 3. 维护约定

1. 本 package 不得 import `apps/api/internal/compute`。
2. 只放稳定 JSON 解析、引用语法、risk summary 和 production-readiness policy 规则；store-backed evidence governance workflow 暂留 compute compatibility package。
3. 新增 evidence ref 类型或 risk severity 规则时需同步检查 evidence package、production-readiness、result explanation、model governance 和相关 contracts fixtures。

## 4. 对外接口

本目录对 `apps/api/internal/compute` 暴露：

- `InputRefs`
- `ParseRef`
- `SimulationInputPayload`
- `RiskFindingsFromSummary`
- `RiskFindingEvidenceRefs`
- `SummarizeRiskFindings`
- `EvaluateProductionReadiness`

## 5. 依赖边界

可以依赖 Go standard library。

不应该依赖 `apps/api/internal/compute`、PostgreSQL implementation、HTTP handler、frontend 或 desktop runtime。

## 6. 测试与验证

```powershell
cd apps\api; go test ./internal/domain/evidence ./internal/compute
```

## 7. AI 操作提示

如果要迁移完整 evidence governance，请先补 store/DTO adapter，避免把 compute `JobRecord`、`ArtifactRecord`、`ModelCatalogResponse` 或 HTTP response 类型直接搬入本 package。
