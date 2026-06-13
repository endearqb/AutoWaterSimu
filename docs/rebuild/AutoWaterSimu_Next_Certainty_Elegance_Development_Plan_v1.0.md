# AutoWaterSimu Next Certainty and Elegance Development Plan v1.0

> 版本：v1.0
> 日期：2026-05-31
> 状态：补充开发计划，服务于 AutoWaterSimu Next 确定性与优雅性提升
> 对应 PRD：`AutoWaterSimu_Next_Certainty_Elegance_PRD_v1.0.md`

---

## 1. 执行原则

本计划只定义质量提升路线，不改变当前 P0/P1/P2 产品范围。

执行原则：

1. 先补验证和边界，再做拆分。
2. 先模块化单体，再考虑微服务。
3. 先让 contracts 成为 single source of truth，再扩展更多跨端对象。
4. 先把 release evidence 做成事实，再扩大 release scope。
5. 先把 `.ai/changes` 中的长期知识沉淀成架构文档，再减少后续 Agent 翻阅成本。
6. 每个阶段都必须有可运行检查，不能只停留在文档目标。

默认非目标：

- 不立即拆微服务。
- 不一次性重写 legacy `frontend/` / `backend/`。
- 不把 OIDC/RBAC/ontology 全部压入 P0。
- 不引入粘贴文本之外的 Hteinfo/IMS 扩展。
- 不把行数阈值当作硬性规则，只作为发现复杂度的提示。

---

## 2. Phase 0: 0-2 周，统一入口与文档确定性

### 2.1 目标

用最小风险建立“一个入口、一个图、一组默认检查、一组 release evidence”的基础。

完成后，当前分支的优雅度应从“能力强但入口分散”提升到“可理解、可启动、可验证”。

### 2.2 任务

#### 根级任务编排

- 新增 `Justfile` 或 `Taskfile.yml`，默认推荐 `Justfile`。
- 新增或补齐根 `.env.example`。
- 新增 `docker-compose.dev.yml`，覆盖 Postgres、MinIO、Compute API、simulation worker、frontend 的真实本地栈候选。
- 提供以下命令：

```text
just doctor
just bootstrap
just dev
just check
just check-full
just gen
just lint
just release-gate
```

#### 文档与架构入口

- 新增 `docs/architecture/module-map.md`。
- 新增 `docs/architecture/dependency-graph.md`。
- 新增 `docs/architecture/local-dev.md`。
- 新增 `docs/architecture/current-state.md`，汇总 README、ADR、OpenAPI、release evidence 和 CI 状态。

#### 依赖边界检查

- 新增 `just check-deps`。
- 初始规则至少覆盖：

```text
contracts 不依赖 app/runtime
apps/api 不 import backend
apps/desktop 不依赖 frontend
frontend routes/components 不直接 import generated compute client
legacy frontend/backend 不反向依赖 Next
```

#### CI evidence 补齐

- 让当前 HEAD 至少产出一次可追溯 fast check evidence。
- 将 release gate 的下载验证结果保存为 evidence JSON。
- 对 workflow status 为空的情况建立明确记录，不把“有 workflow 文件”当作“已验证”。

### 2.3 验收

```powershell
just doctor
just bootstrap
just check
just check-deps
git diff --check -- docs Justfile .env.example docker-compose.dev.yml
```

验收标准：

- 新开发者可以从根目录找到所有主要命令。
- 失败时能定位到 Go、Python、Node、Rust、Docker、contracts 或 release 子系统。
- 依赖边界检查至少能发现最明显的跨层 import。
- `docs/architecture` 不替代 README First，只汇总长期事实。

---

## 3. Phase 1: 2-6 周，结构性重构

### 3.1 目标

拆掉最大复杂度来源，让新增能力自然落到 domain 边界里。

本阶段仍保持一个 Go API deployable binary，不拆微服务。

### 3.2 任务

#### Go API modular monolith

从 `apps/api/internal/compute` 逐步拆出：

```text
platform/auth
platform/audit
platform/httpx
platform/config
platform/contracts
platform/metrics
jobs
workers
artifacts
models
evidence
simulation
agent
app
```

拆分规则：

- HTTP handler 只处理请求、响应和错误映射。
- service 层持有业务规则。
- domain 层定义状态、类型和不变量。
- store 层只暴露领域所需接口。
- migration 和 PostgreSQL implementation 可以集中，但不让 service 依赖巨型 Store。

#### Store interface 拆分

拆分为：

```go
type JobStore interface {}
type WorkerStore interface {}
type ArtifactStore interface {}
type ArchiveMetadataStore interface {}
type ModelCatalogStore interface {}
type BenchmarkRunStore interface {}
type EvidenceStore interface {}
type AgentStore interface {}
type MetricsStore interface {}
```

再按 app 需要组合：

```go
type Store interface {
    JobStore
    WorkerStore
    ArtifactStore
    ModelCatalogStore
    EvidenceStore
}
```

服务构造函数只接收必要接口。

#### Contracts generation pipeline

- 新增 `contracts/registry.json`。
- 新增或整理 `contracts/codegen/`。
- 明确每个 schema 的 consumer list、valid examples、invalid examples、compatibility notes 和 breaking-change policy。
- 把 Go / TS / Python / Rust / OpenAPI 的 drift 检查纳入 `just check-contracts`。

#### Frontend service 分层

将集中式 compute service 逐步拆分为：

```text
frontend/src/shared/api/
frontend/src/features/compute-jobs/
frontend/src/features/model-governance/
frontend/src/features/lifecycle/
frontend/src/features/evidence/
frontend/src/features/contracts/
```

规则：

- `routes` 只做布局和状态编排。
- `features/*/api.ts` 调用 generated client。
- `features/*/queries.ts` 封装 query/mutation。
- UI components 不直接 import generated client。

当前已落地 feature-sliced API/query wrapper：`frontend/src/client/compute` 只允许从 `frontend/src/shared/api/`、`frontend/src/features/` 和 generated client 目录自身直接 import；`frontend/src/shared/api/computeApiClient.ts` 负责 Web bootstrap 所需的 base URL/token 配置，`shared/api/computeTypes.ts` 负责 shared UI-facing wrapper 类型与 generated type re-export，`features/compute-jobs`、`features/lifecycle`、`features/model-governance` 和 `features/contracts` 按 feature group 承担 API 调用与 `features/*/queries.ts` query/mutation options，Compute Jobs / Lifecycle / Model Governance routes 已经通过 feature queries 使用这些能力；`computeJobsService.ts` 保留为 typed compatibility facade；`scripts/check-deps.ps1` 会扫描 `frontend/src` 并拒绝其他位置直接 import generated Compute client，同时扫描 `frontend/src/routes` 并拒绝 route 通过 `computeJobsService` 或 feature private API/builder/process-graph 文件绕过 query/mutation boundary。后续重点转向 live backend browser reads、hosted evidence 和更细的 route/component decomposition。

#### 本地真实栈 smoke

基于 Postgres + MinIO + Worker 建立 smoke：

```text
create compute job
worker register/claim/heartbeat
worker complete
artifact upload
evidence package export
model_run persistence
artifact archive dry-run
frontend reads job/result/evidence
```

当前已落地的 `scripts/ci/integration-smoke.ps1 -StartCompose` 覆盖前 7 项（到 artifact archive dry-run），并额外验证 metrics；`scripts/ci/live-backend-browser-smoke.ps1` 会在该真实栈上准备 succeeded job，并用 Playwright 证明 Compute Jobs route 可在不 mock Compute API 的情况下读取 job/result/evidence package/evidence ref；`scripts/ci/current-flow-live-smoke.ps1` 会启动隔离 Compute API/PostgreSQL/MinIO 栈和本地主机 worker loop，用 Playwright 从 UI 提交 current flow，等待真实 worker 完成，并验证 evidence package 下载与 evidence ref 解析。`.github/workflows/next-live-backend-browser-smoke.yml` 和 `.github/workflows/next-current-flow-live-smoke.yml` 已分别提供 live backend browser 与 current-flow live 的 manual/reusable hosted 入口并接入 nightly。两条 live browser lane 仍只 mock legacy `/api/v1/users/me`，不等同于完整 legacy authenticated session。当前 local CI smoke evidence 已把 dirty worktree 拆成兼容的 `is_dirty_*` / `dirty_files_*` 与新增的 tracked/untracked 字段，便于区分未提交 tracked 修改和本地未跟踪文档，但 hosted green evidence 仍需实际 GitHub Actions 运行确认。

当前已落地 `scripts/ci/browser-smoke.ps1` 和 `.github/workflows/next-browser-smoke.yml`，用 mock-backed Playwright 覆盖 Compute Jobs/current-flow submission、job result/readiness read、evidence package download、evidence ref lookup、contract validation、Model governance 和 lifecycle retention 的 Web 编排。它补齐 browser lane 入口与 feature-query backed route evidence，但仍不等同于 live Postgres/MinIO/worker backend 上的 authenticated browser read。

### 3.3 验收

```powershell
just check
just check-contracts
just check-deps
just integration-smoke
cd apps\api; go test ./...
cd frontend; npx tsc --noEmit
backend\.venv\Scripts\python -m pytest contracts\tests -q
git diff --check -- apps\api contracts frontend docs .ai tasks
```

验收标准：

- 新增 API endpoint 不再需要修改一个巨型 service 文件。
- Store interface 已按领域分离。
- generated client 不出现在 route/component UI 层。
- 合同变更能自动暴露 generated drift。
- 本地真实栈不依赖 in-memory store 也能跑通关键链路。

---

## 4. Phase 2: 6-12 周，95 分冲刺

### 4.1 目标

把工程质量从“结构清晰”推进到“生产边界、安全、证据和场景级验收可证明”。

### 4.2 任务

#### Production security

- `APP_ENV=production` 时禁止默认 dev token。
- 引入 OIDC/JWT 或 service token issuer/JWKS 配置。
- 引入最小 RBAC + data scope：

```text
tenant_id
project_id
site_id
role
scope
purpose
```

- 所有 mutation 写 audit event：

```text
who
when
where
target_object
action
before
after
reason
trace_id
approval_ref
```

当前已落地 selected mutation audit event envelope：`job.created` / `job.queued`（含 draft promotion 与 benchmark schedule-run job creation）、job cancel/timeout events、worker claim / heartbeat lease refresh / artifact upload / result completion events、artifact retention delete/archive events、result explanation submit/review/publish events 会在 `compute_job_events.event_json.audit` 中记录 `who/when/where/target_object/action/before/after/reason/trace_id/approval_ref`；worker registration、draft confirmation record、model governance mutation（model catalog registration、default parameter set status/promote、benchmark_run registration）和 simulation registry mutation（process_graph registration、simulation_input registration，包括 simulation-check 自动落库的新 simulation_input record）会在 compact `mutation_audit_events.event_json.audit` 中记录同一 envelope shape，但不存完整 worker registration、confirmation、catalog、benchmark、process graph 或 simulation input payload。其稳定 envelope shape 与 event JSON helper 位于 `apps/api/internal/platform/audit`。HTTP job create/cancel、worker registration/claim/heartbeat/artifact upload/result completion、confirm-draft、simulation-check、draft promotion、benchmark schedule、retention sweep、result explanation mutation、model governance mutation 和 registry registration paths 可把静态 token principal 与 route 写入 audit context；scheduler/service path 回退为 system/service context。静态 token config 也可携带 `tenant_id` / `project_id` / `site_id`，并已对 job list/get、process_graph get、simulation_input get、draft confirmation get / constraint plan / promotion、persisted model catalog root/model/snapshot reads、model_run get / job-filtered list、benchmark_run get / job-filtered list 与 artifact download 的 HTTP read path 做 tenant/project/site 跨 scope 拒绝或过滤；evidence package / production-readiness governance 会按 source job tenant/project/site 选择匹配 persisted model catalog 后再回退，process_graph evidence-ref 解析也会按 source job tenant/project/site 拒绝跨 scope 存储对象；direct job create 会按 `compute_job.context` tenant/project/site 限制写入；direct job cancel 会按 stored job tenant/project/site 限制取消状态和事件写入；artifact retention sweep 会按 scoped admin token tenant/project/site 过滤候选，避免跨 scope artifact 出现在 report 或被删除/归档；worker claim 会把 scoped token 限制为只领取匹配 tenant/project/site 的 queued job，worker heartbeat/artifact upload/result completion 会按 stored job tenant/project/site 在 mutation 前拒绝跨 scope token；confirm-draft record persistence 会按 payload metadata tenant/project/site 在写入前拒绝跨 scope token；result explanation submit/review/publish 会按 stored job tenant/project/site 在 mutation 前拒绝跨 scope token；direct simulation-check create 会先按 `simulation_request.metadata` 与 `external_refs.site_id` 限制写入并在 embedded simulation_input 缺少 scope metadata 时继承已授权 request scope；draft promotion job create 会同时约束 stored confirmation scope、proposed simulation_request scope、input-ref resolution 和最终 job context；benchmark schedule-run job create 会约束 referenced input-ref object scope 与 request metadata 生成的 job context；model catalog registration/status/promote-approved mutation 会按 token tenant/project/site 限制写入，scoped status/promote-approved mutation 没有匹配 persisted catalog 时不会回退 built-in/global catalog，scoped promotion plan/promote-approved 还必须提供授权 `job_id` 并只使用该 job 的 benchmark/model_run evidence；benchmark_run registration 也会按 payload `job_id` 关联 job 的 tenant/project/site 限制写入，跨 scope 请求不会写入 benchmark run 或 mutation audit；显式 process_graph/simulation_input registry POST 也会按 payload metadata tenant/project/site 限制写入，跨 scope 请求不会写入 registry record 或 mutation audit。`cmd/compute-api` 在 production 下支持通过挂载 secret 文件 `COMPUTE_API_TOKENS_FILE` 提供同一 token JSON shape，并拒绝同时设置 inline JSON 与 file source。完整 all-mutation audit、OIDC/RBAC、剩余 mutation data-scope、全对象 tenant/project/site data scope 和 ontology-backed policy enforcement 仍需后续实现。

#### Water Ontology 首批对象

新增 `ontology/` 或先在 `docs/architecture/ontology-model.md` 记录候选，再逐步落 schema：

```text
ontology/
  objects/
  actions/
  links/
  policies/
```

当前已落地首版 `ontology/` registry 和 `docs/architecture/ontology-model.md`。`scripts/check-ontology.ps1`、`just check-ontology`、`just check` 与 `pr-fast` 已能验证对象、动作、关系和策略引用一致性；运行时 RBAC/ABAC、tenant/project/site data scope、approval workflow 和 all-mutation audit enforcement 仍需后续实现。

首批对象：

```text
WaterStation
ProcessUnit
EquipmentAsset
MonitoringPoint
WaterQualitySample
ChemicalMaterial
InventoryBalance
WorkOrder
ModelVersion
ParameterSet
EvidencePackage
RiskFinding
AgentDraft
```

#### Desktop package schema

将以下合同纳入 `contracts/`：

```text
desktop_project_package.v1
desktop_support_bundle.v1
```

当前已落地 `contracts/desktop_project_package.v1.json` 与 `contracts/desktop_support_bundle.v1.json`，并登记 registry/codegen manifest。Desktop 新导出使用 `desktop_project_package.v1`，导入保留 legacy `desktop_project_export.v1` 兼容；`scripts/ci/desktop-package-smoke.ps1` 已提供本地 opt-in package evidence；`scripts/ci/desktop-release-artifacts-smoke.ps1` 已提供本地真实 unsigned sidecar / NSIS installer / packaged worker runtime / release gate `Mode=release` / 本地 artifact bundle verifier evidence。完整 hosted package evidence、GitHub artifact upload/download round trip 和 Desktop offline golden scenario 仍需后续补齐。

验证：

```text
export project package
import into clean runtime
checksum verified
metadata restored
artifact/model_run references preserved
```

#### CI lanes 产品化

建立并记录：

```text
pr-fast
integration
browser
release-evidence
nightly
```

最小 evidence：

```text
current HEAD green pr-fast
integration green
workflow_dispatch release-evidence green
postgres migration smoke green
release artifact download verified
```

#### 8 条金标场景

优先进入 CI 或 scheduled gate 的场景：

1. 当前流程图到 evidence。
2. 模型参数治理。
3. Agent 草案确认。
4. Artifact lifecycle。
5. Desktop 离线项目。
6. PostgreSQL migration。
7. 安全权限。
8. Release evidence。

至少 6 个自动或半自动验证，其余 2 个保留 manual evidence。

### 4.3 验收

```powershell
just check-full
just integration-smoke
just browser-smoke
just release-gate
just check-security
git diff --check -- docs contracts apps frontend services .ai tasks
```

验收标准：

- production 环境不能使用默认 dev token 启动。
- list/get 有 tenant/project/site scope 过滤策略或明确临时豁免记录。
- mutation 有 audit event。
- Release evidence 可关联 commit SHA 和 artifact verification。
- Water Ontology 首批对象能说明属性、关系、动作、权限和 evidence。
- 8 条金标场景至少 6 条具备自动或半自动 evidence。

---

## 5. Verification Matrix

| 领域 | 快速验证 | 全量验证 | Evidence |
|---|---|---|---|
| Monorepo 入口 | `just doctor` | `just check-full` | local-dev log |
| Contracts | `just check-contracts` | generated drift + fixtures | contract test report |
| Go API | `go test ./...` | integration smoke | API test report |
| Worker | worker unit tests | API loop smoke | job lifecycle evidence |
| Frontend | `npx tsc --noEmit` | browser smoke | Playwright report |
| Desktop | typecheck / cargo test | `just desktop-package-smoke` / package export-import smoke | package evidence |
| Security | token config tests | scope/audit scenario | security smoke report |
| Ontology | `just check-ontology` | policy enforcement smoke（future） | ontology registry check |
| Release | release gate dry-run | workflow_dispatch release | release evidence JSON |
| Docs | `git diff --check` | README/path/link checks | current-state summary |

---

## 6. Recommended Work Order

推荐拆 PR 顺序：

1. 根级 task graph 和 `.env.example`。
2. `docs/architecture` module map、dependency graph、local dev。
3. `check-deps` 最小规则。
4. current HEAD CI evidence 补齐。
5. Contracts registry 和 drift check。
6. Store interface 拆分。
7. Go API domain package 拆分。
8. Frontend feature service/API wrapper 分层。
9. Postgres + MinIO + Worker integration smoke（初始本地 API + worker smoke 已落地，manual/reusable hosted workflow 已定义，后续补 hosted green run 与 frontend/browser reads）。
10. Production dev token 禁用（`cmd/compute-api` 启动 guard 已落地，`COMPUTE_API_TOKENS_FILE` file-mounted token config source 已落地，`scripts/ci/security-smoke.ps1` 已覆盖 token guard / file source / scope denial / revocation / selected mutation audit（job create/cancel/timeout、worker registration/claim/heartbeat/artifact/result completion、draft confirmation、draft promotion、benchmark schedule-run、artifact retention、result explanation、model governance、simulation registry）/ job-process_graph-simulation_input-draft_confirmation-model_catalog-model_run-benchmark_run-artifact tenant/project/site read-scope / evidence package 与 production-readiness job-scoped model catalog selection / process_graph evidence-ref source-job object scope / direct job create、direct job cancel、artifact retention sweep candidate filtering、worker claim/heartbeat/artifact/completion、confirm-draft record persistence、result explanation submit/review/publish、direct simulation-check create、draft promotion job create、benchmark schedule-run job create、model catalog registration-status-promote、promotion plan/promote-approved job-scoped evidence filtering、benchmark_run registration 与显式 process_graph/simulation_input registry POST mutation data-scope；后续继续做 issuer/JWKS、更深的 service-token secret 管理、全对象 data scope、剩余 mutation data-scope、all-mutation audit）。
11. Release evidence lane。
12. Water Ontology 首批对象（首版 registry/check 已落地；后续接 runtime policy enforcement）。
13. Desktop package/support bundle schema。
14. 8 条金标场景自动化。

每个 PR 都应更新：

- 相关目录 README。
- `.ai/changes/YYYY-MM-DD.md`。
- 必要时新增 `.ai/decisions/` ADR。
- 对应 verification command。

---

## 7. Deliverable Checklist

### 文档

- [x] `docs/architecture/module-map.md`
- [x] `docs/architecture/dependency-graph.md`
- [x] `docs/architecture/local-dev.md`
- [x] `docs/architecture/current-state.md`
- [x] `docs/architecture/contracts.md`
- [x] `docs/architecture/compute-api.md`
- [x] `docs/architecture/desktop-runtime.md`
- [x] `docs/architecture/ontology-model.md`

### 工程入口

- [x] `Justfile` or `Taskfile.yml`
- [x] `.env.example`
- [x] `docker-compose.dev.yml`
- [x] `just doctor`
- [x] `just bootstrap`
- [x] `just dev`
- [x] `just check`
- [x] `just check-full`
- [x] `just gen`
- [x] `just release-gate`

### Contracts / Ontology

- [x] `contracts/registry.json`
- [x] `contracts/codegen/`
- [x] `just check-contracts`
- [x] `desktop_project_package.v1`
- [x] `desktop_support_bundle.v1`
- [x] `ontology/objects`
- [x] `ontology/actions`
- [x] `ontology/links`
- [x] `ontology/policies`

### Testing / CI

- [x] `pr-fast`
- [ ] `integration`
- [x] `browser`（mock-backed opt-in、live Compute backend read opt-in、current-flow live opt-in 以及三者 hosted/manual workflow entry 已落地；完整 legacy authenticated browser session 与 hosted green evidence 尚未完成）
- [ ] `release-evidence`
- [x] `nightly`（scheduled/manual orchestrator 已接入 pr-fast、integration、browser、live backend browser、current-flow live、security、Desktop package smoke；真实 hosted nightly green 尚未完成）
- [x] Postgres + MinIO + Worker integration smoke
- [x] Release artifact download verification（fixture-backed verifier smoke 和本地真实 unsigned artifact bundle verifier 已落地并接入 release evidence；真实 hosted unsigned artifact round trip 尚未完成）
- [ ] Security scope/audit scenario（token guard / file-mounted token config source / scope denial / revocation / selected mutation audit smoke（job create/cancel/timeout、worker registration/claim/heartbeat/artifact/result completion、draft confirmation、draft promotion、benchmark schedule-run、artifact retention、result explanation、model governance、simulation registry）/ job-process_graph-simulation_input-draft_confirmation-model_catalog-model_run-benchmark_run-artifact tenant/project/site read-scope / evidence package 与 production-readiness job-scoped model catalog selection / process_graph evidence-ref source-job object scope / direct job create、direct job cancel、artifact retention sweep candidate filtering、worker claim/heartbeat/artifact/completion、confirm-draft record persistence、result explanation submit/review/publish、direct simulation-check create、draft promotion job create、benchmark schedule-run job create、model catalog registration-status-promote、promotion plan/promote-approved job-scoped evidence filtering、benchmark_run registration 与显式 process_graph/simulation_input registry POST mutation data-scope 与 hosted/manual workflow 已落地；全对象 data scope、剩余 mutation data-scope 与 all-mutation audit 尚未完成）
- [x] Desktop package export/import smoke（local opt-in；packaged worker / NSIS installer / release gate with real artifacts 已有本地 evidence；hosted evidence 尚未完成）
- [ ] 8 golden scenarios（已有 `scripts/ci/golden-scenarios.ps1` 本地 evidence 汇总、`-RefreshLocalEvidence` 非 Docker 本地 lane 刷新入口、`just golden-scenarios-refresh-integration` Docker integration 刷新入口、`just golden-scenarios-refresh-live` live backend browser read 刷新入口、`just golden-scenarios-refresh-current-flow-live` current-flow live submit 刷新入口，以及 `just golden-scenarios-refresh-desktop-release` 本地真实 unsigned Desktop release artifact 刷新入口；仍未完成 hosted/legacy auth 等自动或半自动完整场景证明）

### Go API Structure

- [x] Store aggregate embeds domain store interfaces
- [x] MemoryStore implementation split into same-package domain files
- [x] Model governance MemoryStore persistence split into same-package store-interface files
- [x] Draft/result explanation MemoryStore persistence split into same-package store-interface files
- [x] HTTP handlers split into same-package route-group files
- [x] Model governance HTTP handlers split into same-package workflow-aligned files
- [x] PostgreSQL persistence split into same-package domain files
- [x] Model governance PostgreSQL persistence split into same-package store-interface files
- [x] Draft/result explanation PostgreSQL persistence split into same-package store-interface files
- [x] Public `Service` compatibility delegates split into same-package domain files
- [x] Job lifecycle workflow split into same-package workflow files
- [x] Artifact lifecycle workflow split into same-package workflow files
- [x] Simulation input / process graph workflow split into same-package workflow files
- [x] Draft workflow split into same-package workflow files
- [x] Result explanation workflow split into same-package workflow files
- [x] Model governance workflow split into same-package workflow files
- [x] Evidence governance workflow split into same-package workflow files
- [x] Artifact lifecycle service constructor narrowed
- [x] Artifact upload / listing joined artifact lifecycle service boundary
- [x] Simulation input / process graph service constructor narrowed
- [x] Draft confirmation / result explanation service constructors narrowed
- [x] Model governance service constructor narrowed
- [x] Worker lifecycle service constructor narrowed
- [x] Evidence governance service constructor narrowed
- [x] Job lifecycle service constructor narrowed
- [x] Metrics service constructor narrowed
- [x] Service constructors narrowed to 1-3 necessary store interfaces
- [x] Frontend Compute generated client direct imports limited to service/API wrapper layer
- [x] Frontend Compute service facade split into same-directory wrapper groups
- [x] Frontend Compute route data calls guarded by feature query boundary in `check-deps`
- [x] Static bearer auth package split (`apps/api/internal/platform/auth`)
- [x] Selected mutation audit envelope helper package split (`apps/api/internal/platform/audit`)
- [x] First platform HTTP helper package split (`apps/api/internal/platform/httpx`)
- [x] Runtime config package split (`apps/api/internal/platform/config`)
- [x] Contract schema validator package split (`apps/api/internal/platform/contracts`)
- [x] Contract document validation response helper split (`apps/api/internal/platform/contracts`)
- [x] Metrics snapshot / Prometheus renderer package split (`apps/api/internal/platform/metrics`)
- [x] Metrics read-only collector package split (`apps/api/internal/platform/metrics`)
- [x] Platform package reverse-dependency guard in `check-deps`
- [x] Agent constraint application plan helper package split (`apps/api/internal/domain/agent`)
- [x] Agent proposed simulation request extraction helper package split (`apps/api/internal/domain/agent`)
- [x] Agent draft confirmation envelope validation helper package split (`apps/api/internal/domain/agent`)
- [x] Agent draft confirmation record data projection helper package split (`apps/api/internal/domain/agent`)
- [x] Artifacts retention policy helper package split (`apps/api/internal/domain/artifacts`)
- [x] Artifacts retention action planner package split (`apps/api/internal/domain/artifacts`)
- [x] Artifacts upload metadata projection helper package split (`apps/api/internal/domain/artifacts`)
- [x] Artifacts archive metadata projection helper package split (`apps/api/internal/domain/artifacts`)
- [x] Evidence input/ref/risk parsing helper package split (`apps/api/internal/domain/evidence`)
- [x] Evidence stored result summary risk projection helper package split (`apps/api/internal/domain/evidence`)
- [x] Evidence production-readiness policy helper package split (`apps/api/internal/domain/evidence`)
- [x] Evidence result explanation ref extraction helper package split (`apps/api/internal/domain/evidence`)
- [x] Evidence result explanation record data projection helper package split (`apps/api/internal/domain/evidence`)
- [x] Evidence object-scope matching helper package split (`apps/api/internal/domain/evidence`)
- [x] Jobs status / worker claim matching invariant package split (`apps/api/internal/domain/jobs`)
- [x] Jobs worker result completion helper package split (`apps/api/internal/domain/jobs`)
- [x] Jobs failed-worker fallback result helper package split (`apps/api/internal/domain/jobs`)
- [x] Jobs cancel/timeout state lifecycle service package split (`apps/api/internal/domain/jobs`)
- [x] Jobs create queued record / event plan package split (`apps/api/internal/domain/jobs`)
- [x] Jobs create idempotency decision package split (`apps/api/internal/domain/jobs`)
- [x] Jobs worker claim mutation plan package split (`apps/api/internal/domain/jobs`)
- [x] Jobs worker heartbeat mutation plan package split (`apps/api/internal/domain/jobs`)
- [x] Models model_run raw parsing package split (`apps/api/internal/domain/models`)
- [x] Models compute result model_runs extraction helper package split (`apps/api/internal/domain/models`)
- [x] Models default parameter set status invariant package split (`apps/api/internal/domain/models`)
- [x] Models benchmark run evidence refs / model run identity helper package split (`apps/api/internal/domain/models`)
- [x] Models default parameter set promotion gate package split (`apps/api/internal/domain/models`)
- [x] Models benchmark run model_run identity/hash check helper package split (`apps/api/internal/domain/models`)
- [x] Models benchmark case promotion readiness helper package split (`apps/api/internal/domain/models`)
- [x] Models benchmark workflow gate helper package split (`apps/api/internal/domain/models`)
- [x] Models production governance gate package split (`apps/api/internal/domain/models`)
- [x] Models built-in model catalog document helper package split (`apps/api/internal/domain/models`)
- [x] Models benchmark case run job document helper package split (`apps/api/internal/domain/models`)
- [x] Simulation execution profile helper package split (`apps/api/internal/domain/simulation`)
- [x] Simulation process graph validation/projection helper package split (`apps/api/internal/domain/simulation`)
- [x] Simulation check job document helper package split (`apps/api/internal/domain/simulation`)
- [x] Simulation input / process graph record data projection helper package split (`apps/api/internal/domain/simulation`)
- [x] First worker domain package split (`apps/api/internal/domain/workers`)
- [x] Domain package reverse-dependency guard in `check-deps`
- [x] Go API domain package split（file-level Store/MemoryStore、HTTP route group、PostgreSQL persistence split、public Service delegate split、job lifecycle / artifact lifecycle / simulation input-process graph / draft / result explanation / model governance / evidence governance workflow split complete；后续随 domain workflow 迁出继续瘦身）

---

## 8. Assumptions

- 粘贴文本被视为质量提升路线输入，不是要求立即实施代码重构。
- 本计划是补充计划，不替代现有 Next PRD/Technical Spec/Development Plan。
- 当前未跟踪的 `docs/rebuild/AutoWaterSimu_95分优雅度完整计划.md` 不是本计划的目标文件。
- 本计划不需要立即新增 ADR；具体实施模块拆分、ontology、安全模型、release evidence 时再分别新增 ADR。
- P0 static token 可以继续服务开发路径，但 production 启动必须逐步增加硬性保护；当前已支持 inline token JSON 与 file-mounted token JSON secret 二选一。

---

## 9. Immediate Next Step

近期 `.ai/changes` 已显示 evidence wrapper / hosted workflow entry 与同 package 文件拆分存在边际收益下降风险。除非下一步能实际触发 GitHub Actions 并拿到绿色 run，否则下一次实际执行应优先推进真实 package movement 或明确的 all-mutation audit / object data-scope 切片，而不是继续新增 evidence summary、workflow wrapper 或同 package 文件整理。

下一次实际执行建议继续收敛 Phase 1 结构性重构，并只在可产出真实 evidence 时补 Phase 0/2 evidence：

1. 在 clean HEAD 上运行 `just pr-fast` 或 `scripts\ci\pr-fast.ps1`，保留 `tmp/ci-evidence/pr-fast.json`。
2. 触发或接入 `.github/workflows/next-integration-smoke.yml` 的真实 GitHub Actions run，并把 hosted green run 作为 integration evidence 记录。
3. 触发 browser / live backend browser / current-flow live hosted/manual workflow evidence，并继续补完整 legacy authenticated backend browser session。
4. 继续 production security：`COMPUTE_API_TOKENS_FILE` 已补齐 file-mounted service-token config source，job create/cancel/timeout、worker registration、worker claim/heartbeat lease refresh/artifact upload/result completion、result explanation submit/review/publish、draft confirmation record、draft promotion / benchmark schedule-run job create、model catalog registration、default parameter set status/promote、benchmark_run registration、process_graph registration 与 simulation_input registration 已纳入 selected mutation audit，process_graph get、simulation_input get、draft confirmation get / constraint plan / promotion、persisted model catalog root/model/snapshot reads、model_run get / job-filtered list 与 benchmark_run get / job-filtered list 已纳入 tenant/project/site read-scope，evidence package / production-readiness 已按 source job tenant/project/site 做 model catalog selection，process_graph evidence-ref 已按 source job tenant/project/site 拒绝跨 scope 存储对象，direct job create、direct job cancel、artifact retention sweep candidate filtering、worker claim/heartbeat/artifact/completion、confirm-draft record persistence、result explanation submit/review/publish、direct simulation-check create、draft promotion job create、benchmark schedule-run job create、model catalog registration/status/promote mutation、promotion plan/promote-approved job-scoped evidence filtering、benchmark_run registration 与显式 process_graph/simulation_input registry POST 已纳入 tenant/project/site data-scope；后续继续补 issuer/JWKS 或更深的 service-token secret manager、全对象 data scope、剩余 mutation data-scope、remaining all-mutation audit，并把 security smoke 扩展到这些场景。
5. 持续运行 `scripts\ci\golden-scenarios.ps1`，或用 `scripts\ci\golden-scenarios.ps1 -RefreshLocalEvidence` / `just golden-scenarios-refresh` 先刷新非 Docker 本地 evidence lanes，再用 `tmp\ci-evidence\golden-scenarios.json` 追踪 8 条金标场景从 `missing` 到 `partial` 再到可证明完成的过程；不要把 generic release gate pass 误作 PostgreSQL migration evidence，migration 只由 current integration smoke 或 release gate 中实际通过的 `postgres migration up/down smoke` step 证明。需要刷新 Docker/PostgreSQL/MinIO/worker integration evidence 时使用 `just golden-scenarios-refresh-integration` 或显式追加 `-RunIntegrationSmoke`；需要刷新 live Compute backend browser reads 时使用 `just golden-scenarios-refresh-live` 或显式追加 `-RunLiveBackendBrowserSmoke`；需要刷新 UI current-flow submit 到 live worker/evidence 时使用 `just golden-scenarios-refresh-current-flow-live` 或显式追加 `-RunCurrentFlowLiveSmoke`。
6. 基于已完成的 artifact lifecycle（含 upload/listing）、simulation input/process graph、draft workflow、result explanation、model governance、worker lifecycle、evidence governance、job lifecycle、metrics 构造函数收窄、constructor boundary audit、`service_*.go` public delegate split、model governance HTTP handler split、model governance PostgreSQL persistence split、model governance MemoryStore persistence split、draft/result explanation PostgreSQL persistence split、draft/result explanation MemoryStore persistence split、`job_lifecycle_*.go` workflow split、`artifact_lifecycle_*.go` workflow split、`simulation_inputs_*.go` workflow split、`draft_workflows_*.go` workflow split、`result_explanations_*.go` workflow split、`model_governance_*.go` workflow split、`evidence_governance_*.go` workflow split、`platform/audit`、`platform/auth`、`platform/config`、`platform/contracts`（含 validator 与 base document validation response）、`platform/httpx`、`platform/metrics` package movement（含 read-only collector），以及 `domain/agent` draft confirmation envelope validation、record data projection、constraint application plan helper 与 proposed simulation request extraction helper、`domain/artifacts` retention policy helper、retention action planner、upload metadata projection helper 与 archive metadata projection helper、`domain/evidence` input/ref/risk parsing、stored summary risk projection、result explanation ref extraction、result explanation record data projection、object-scope matching 与 production-readiness policy helper、`domain/jobs` status/claim matching invariant、create idempotency decision、queued job create projection / create-event plan、worker claim mutation plan、worker heartbeat mutation plan、failed-worker fallback result helper、worker result completion helper 与 cancel/timeout state lifecycle service、`domain/models` built-in model catalog document helper、benchmark case run job document helper、compute result model_runs extraction、model_run raw parsing、model run identity/hash check、benchmark run evidence refs、benchmark workflow gate、benchmark case readiness、default parameter set status invariant、promotion gate policy 与 model-run production governance gate、`domain/simulation` execution profile、simulation check job document、process graph validation/projection helper 与 simulation input/process graph record data projection helper、`domain/workers` package movement，继续推进完整 jobs/artifacts/models/evidence/simulation/agent 等 Go domain package movement、handler/package surface reduction 和后续公共 `Service` 构造签名收窄。

这些步骤风险仍低于直接拆分 Go API 巨型 package，且能继续提高后续结构性重构的确定性。
