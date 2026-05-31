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

当前已落地的 `scripts/ci/integration-smoke.ps1 -StartCompose` 覆盖前 7 项（到 artifact archive dry-run），并额外验证 metrics；frontend reads 仍需 browser/frontend smoke 补齐。

当前已落地 `scripts/ci/browser-smoke.ps1` 和 `.github/workflows/next-browser-smoke.yml`，用 mock-backed Playwright 覆盖 Compute Jobs/current-flow、contract validation、Model governance 和 lifecycle retention 的 Web 编排。它补齐 browser lane 入口，但仍不等同于 live Postgres/MinIO/worker backend 上的 authenticated browser read。

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

当前已落地 selected mutation audit event envelope：`job.created` / `job.queued` 以及 artifact retention delete/archive events 会在 `compute_job_events.event_json.audit` 中记录 `who/when/where/target_object/action/before/after/reason/trace_id/approval_ref`。HTTP job create、simulation-check、draft promotion、benchmark schedule 和 retention sweep 可把静态 token principal 与 route 写入 audit context；scheduler/service path 回退为 system/service context。静态 token config 也可携带 `tenant_id` / `project_id` / `site_id`，并已对 job list/get 与 artifact download 的 HTTP read path 做 tenant/project/site 跨 scope 拒绝。完整 all-mutation audit、OIDC/RBAC、全对象 tenant/project/site data scope 和 ontology-backed policy enforcement 仍需后续实现。

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

当前已落地 `contracts/desktop_project_package.v1.json` 与 `contracts/desktop_support_bundle.v1.json`，并登记 registry/codegen manifest。Desktop 新导出使用 `desktop_project_package.v1`，导入保留 legacy `desktop_project_export.v1` 兼容；`scripts/ci/desktop-package-smoke.ps1` 已提供本地 opt-in package evidence。完整 hosted package evidence、packaged worker/installer 证据和 Desktop offline golden scenario 仍需后续补齐。

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
10. Production dev token 禁用（`cmd/compute-api` 启动 guard 已落地，`scripts/ci/security-smoke.ps1` 已覆盖 token guard / scope denial / revocation / selected mutation audit / job-artifact tenant/project/site read-scope；后续继续做 issuer/JWKS/service-token secret、全对象 data scope、all-mutation audit）。
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
- [x] `browser`（mock-backed opt-in；live backend/authenticated browser evidence 尚未完成）
- [ ] `release-evidence`
- [x] `nightly`（scheduled/manual orchestrator 已接入 pr-fast、integration、browser、security、Desktop package smoke；真实 hosted nightly green 尚未完成）
- [x] Postgres + MinIO + Worker integration smoke
- [x] Release artifact download verification（fixture-backed verifier smoke 已落地并接入 `next-release-gates.yml`；真实 hosted unsigned artifact round trip 尚未完成）
- [ ] Security scope/audit scenario（token guard / scope denial / revocation / selected mutation audit smoke / job-artifact tenant/project/site read-scope 与 hosted/manual workflow 已落地；全对象 data scope 与 all-mutation audit 尚未完成）
- [x] Desktop package export/import smoke（local opt-in；packaged worker / NSIS installer / hosted evidence 尚未完成）
- [ ] 8 golden scenarios

### Go API Structure

- [x] Store aggregate embeds domain store interfaces
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
- [x] Static bearer auth package split (`apps/api/internal/platform/auth`)
- [x] First platform HTTP helper package split (`apps/api/internal/platform/httpx`)
- [x] Runtime config package split (`apps/api/internal/platform/config`)
- [x] Contract schema validator package split (`apps/api/internal/platform/contracts`)
- [x] Contract document validation response helper split (`apps/api/internal/platform/contracts`)
- [x] Metrics snapshot / Prometheus renderer package split (`apps/api/internal/platform/metrics`)
- [x] Metrics read-only collector package split (`apps/api/internal/platform/metrics`)
- [x] Platform package reverse-dependency guard in `check-deps`
- [x] Artifacts retention policy helper package split (`apps/api/internal/domain/artifacts`)
- [x] Jobs status / worker claim matching invariant package split (`apps/api/internal/domain/jobs`)
- [x] Models model_run raw parsing package split (`apps/api/internal/domain/models`)
- [x] Simulation execution profile helper package split (`apps/api/internal/domain/simulation`)
- [x] First worker domain package split (`apps/api/internal/domain/workers`)
- [x] Domain package reverse-dependency guard in `check-deps`
- [ ] Go API domain package split

---

## 8. Assumptions

- 粘贴文本被视为质量提升路线输入，不是要求立即实施代码重构。
- 本计划是补充计划，不替代现有 Next PRD/Technical Spec/Development Plan。
- 当前未跟踪的 `docs/rebuild/AutoWaterSimu_95分优雅度完整计划.md` 不是本计划的目标文件。
- 本计划不需要立即新增 ADR；具体实施模块拆分、ontology、安全模型、release evidence 时再分别新增 ADR。
- P0 static token 可以继续服务开发路径，但 production 启动必须逐步增加硬性保护。

---

## 9. Immediate Next Step

下一次实际执行建议继续收敛 Phase 0 evidence，并进入 Phase 1 前置工作：

1. 在 clean HEAD 上运行 `just pr-fast` 或 `scripts\ci\pr-fast.ps1`，保留 `tmp/ci-evidence/pr-fast.json`。
2. 触发或接入 `.github/workflows/next-integration-smoke.yml` 的真实 GitHub Actions run，并把 hosted green run 作为 integration evidence 记录。
3. 在 integration smoke 之上补 frontend/browser reads job/result/evidence 的验证。
4. 继续 production security：补 issuer/JWKS 或 service-token secret manager、全对象 data scope、all-mutation audit，并把 security smoke 扩展到这些场景。
5. 基于已完成的 artifact lifecycle（含 upload/listing）、simulation input/process graph、draft workflow、result explanation、model governance、worker lifecycle、evidence governance、job lifecycle、metrics 构造函数收窄、constructor boundary audit、`platform/auth`、`platform/config`、`platform/contracts`（含 validator 与 base document validation response）、`platform/httpx`、`platform/metrics` package movement（含 read-only collector），以及 `domain/artifacts` retention policy helper、`domain/jobs` status/claim matching invariant、`domain/models` model_run raw parsing、`domain/simulation` execution profile helper、`domain/workers` package movement，继续推进完整 jobs/artifacts/models/evidence/simulation 等 Go domain package movement、handler/package surface reduction 和后续公共 `Service` 构造签名收窄。

这些步骤风险仍低于直接拆分 Go API 巨型 package，且能继续提高后续结构性重构的确定性。
