# AutoWaterSimu Next Certainty and Elegance PRD v1.0

> 版本：v1.0
> 日期：2026-05-31
> 状态：补充 PRD，服务于 AutoWaterSimu Next 质量提升路线
> 关系：不替代 `AutoWaterSimu_Next_PRD_v1.0.md`、`AutoWaterSimu_Next_Technical_Spec_v1.0.md` 或 `AutoWaterSimu_Next_Development_Plan_v1.0.md`

---

## 1. 产品目标

本 PRD 将“95 分优雅度”收敛为 AutoWaterSimu Next 的工程质量目标，而不是新增功能承诺、生产 SLA 或一次性交付范围。

目标是把当前 Next 分支从“能力已经很强的工程分支”提升为：

```text
一个命令可验证
一个图能看懂依赖
一个合同层统管跨端接口
一个 domain / ontology 层统管水务语义
一个平台 API 层统管任务、证据、模型治理
一个 release gate 证明每次变更安全
一个生产边界明确的部署与权限模型
```

核心判断：

- 当前最需要提升的不是继续横向加 endpoint、页面或 Agent 能力。
- 更高优先级是降低后续每次改动的认知成本、集成风险和验证成本。
- “95 分”应被定义为结构、边界、合同、验证、证据和安全都足够稳定的状态。

---

## 2. 当前状态与问题

### 2.1 已有基础

当前仓库已经具备 AutoWaterSimu Next 的平台化雏形：

- `contracts/` 承担跨 Web、Desktop、Worker、Agent 的 JSON Schema、examples 和 tests。
- `apps/api/` 提供 Go Compute API、job lifecycle、worker API、artifact、model governance、evidence 和 release governance 能力。
- `services/simulation-worker/` 提供 Python worker CLI 和 Compute API bridge。
- `apps/desktop/` 提供 Tauri Desktop、SQLite runtime、packaged worker sidecar 和 project package 能力。
- legacy `frontend/` 和 `backend/` 仍作为迁移基线存在。
- `.ai/changes/`、`.ai/decisions/`、`.ai/plans/` 已经形成 README First 工程记忆。

### 2.2 主要质量缺口

当前影响确定性和优雅性的主要问题是：

| 领域 | 当前缺口 | 风险 |
|---|---|---|
| Monorepo 入口 | 根级命令和 task graph 不够统一 | 新开发者和 Agent 难以一键启动、生成、检查和发布 |
| 依赖边界 | 目录职责有 README，但缺自动化依赖规则 | 跨层 import 或临时旁路不容易被发现 |
| Go API | `internal/compute` 包和 Store interface 过大 | 新能力容易继续堆进巨型 package |
| Contracts | schema 已存在，但多语言类型和 OpenAPI drift 仍需更强闭环 | 跨端 wire shape 可能出现手工同步误差 |
| Frontend | compute service 偏集中，generated client 仍可能上浮到 UI 层 | 页面型集成越来越难维护 |
| Desktop | runtime 边界已建立，但 project package/support bundle 合同仍可标准化 | 离线项目互操作和恢复语义不够稳定 |
| Security | P0 static bearer token 适合开发，不适合作为生产边界 | dev token、权限范围和审计边界需要收紧 |
| CI / Release | workflow 和脚本存在，但当前 HEAD evidence 需要成为可追溯事实 | “能跑”与“已证明安全”之间仍有差距 |
| Engineering memory | `.ai/changes` 很丰富，但长期事实需要汇总成架构文档 | 后续 Agent 需要翻阅大量流水记录 |
| Scenario acceptance | 多数能力已有单点验证，场景级验收仍需体系化 | endpoint 存在不等于业务闭环可靠 |

---

## 3. 用户与使用场景

### 3.1 开发者

开发者需要用少量命令理解、启动、验证和发布 AutoWaterSimu Next：

- 能从根目录完成 bootstrap、dev、check、gen 和 release gate。
- 能通过 dependency graph 知道 `contracts`、`apps/api`、`frontend`、`worker`、`desktop` 的关系。
- 能知道新增能力应落在哪个 domain，而不是继续扩大 `internal/compute`。

### 3.2 AI Agent

AI Agent 需要稳定上下文来降低误改概率：

- 能按 README First 快速定位权威 PRD、Spec、Plan 和质量补充文档。
- 能通过目录 README、依赖规则和 current-state 摘要理解边界。
- 能在修改合同、API、frontend、worker 或 desktop 时找到对应验证命令。

### 3.3 平台维护者

平台维护者需要 release evidence 和 production boundary：

- 能看到当前 commit 的 fast check、integration、browser 和 release evidence。
- 能确认生产环境不会使用默认 dev token。
- 能追踪 artifact、evidence、model governance 和 approval 边界。

### 3.4 工艺 / 模型工程用户

工艺和模型工程用户需要稳定的业务对象语义：

- 不只看到 compute job，还能理解 ProcessGraph、ModelRun、ParameterSet、EvidencePackage 和 RiskFinding。
- 未来水务对象应通过 ontology/domain 层表达，而不是散落在页面、接口和 worker payload 中。

---

## 4. 功能需求

### 4.1 根级 monorepo 入口

目标：

- 新增统一任务入口，推荐 `Justfile` 或 `Taskfile.yml`。
- 根命令应覆盖环境检查、依赖同步、本地开发、快速检查、全量检查、合同生成和 release gate。
- 失败信息必须指向具体子系统。

候选命令：

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

验收：

```text
clone repo
cp .env.example .env
just bootstrap
just dev
just check
```

在文档定义的默认本地环境下可以跑通，或明确指出缺失依赖。

### 4.2 依赖图与边界检查

目标：

- 增加 architecture/module map 和 dependency graph 文档。
- 增加自动化 dependency check，防止明显跨层依赖。

边界示例：

```text
contracts 不依赖 app/runtime
apps/api 不 import legacy backend
apps/desktop 不依赖 legacy frontend
frontend UI 不直接 import generated compute client
worker 通过 contracts/API 与平台通信
legacy frontend/backend 作为 baseline，不反向依赖 Next
```

### 4.3 Go API 模块化单体

目标：

- 保持单 deployable Go API binary。
- 拆分当前过大的 `internal/compute` 领域职责。
- 按 domain 形成 HTTP / service / domain / store 边界。

候选 domain：

```text
jobs
workers
artifacts
models
evidence
simulation
agent
platform
```

默认策略：

- 不在本阶段拆微服务。
- 先拆模块和接口，让每个服务只依赖自己需要的 repository。
- PostgreSQL implementation 可以集中，但 interface 必须按领域分离。

### 4.4 Store / Repository 拆分

目标：

- 将大 Store interface 拆成按领域聚合的小接口。
- 服务构造函数只依赖 1 到 3 个必要 repository interface。
- artifact retention 不应看见 result explanation 写接口，model governance 不应依赖 worker heartbeat 写接口。

候选接口：

```text
JobStore
WorkerStore
ArtifactStore
ArchiveMetadataStore
ModelCatalogStore
BenchmarkRunStore
EvidenceStore
AgentStore
MetricsStore
```

### 4.5 Contracts single source of truth

目标：

- `contracts/` 不只是 schema 文件夹，而是跨端 wire shape 发布单位。
- JSON Schema 变更必须驱动 Go、TypeScript、Python、Rust 和 OpenAPI 生成或校验。
- generated drift 必须可检查。

目标链路：

```text
contracts/*.v1.json
  -> Go typed DTOs
  -> TypeScript types/client
  -> Python dataclasses / pydantic models
  -> Rust serde structs
  -> OpenAPI schema fragments
  -> fixture compatibility tests
```

验收：

```text
just gen-contracts
just check-contracts
```

能够证明无 schema drift、generated client drift、OpenAPI drift 和 fixture 覆盖缺口。

### 4.6 Water Ontology / Domain Model

目标：

- 在 `contracts/` 的 wire shape 之外，建立面向现实水务业务对象的 domain / ontology 层。
- 先作为设计和 schema 候选，不直接宣称替代现有合同。

首批候选对象：

```text
WaterStation
ProcessGraph
ProcessUnit
EquipmentAsset
MonitoringPoint
WaterQualitySample
ChemicalMaterial
InventoryBalance
WorkOrder
MaintenanceEvent
BenchmarkCase
ModelVersion
ParameterSet
EvidencePackage
RiskFinding
AgentDraft
```

每个对象最终应能回答：

```text
这个对象是什么？
有哪些属性？
和哪些对象有关？
谁能看？
谁能改？
能执行哪些动作？
动作会产生什么 evidence？
动作是否需要 approval？
动作是否可回滚？
```

### 4.7 生产安全边界

目标：

- P0 static bearer token 可以保留为开发路径。
- 生产环境必须禁止默认 dev token。
- 逐步升级到 OIDC/JWT、RBAC/ABAC、tenant/project/site data scope 和 mutation audit。

最小生产启动校验：

```text
APP_ENV=production 时：
- 禁止空 COMPUTE_API_TOKENS_JSON
- 禁止 dev-public-token
- 禁止 dev-worker-token
- 必须配置 token issuer / audience / JWKS 或 service-token secret manager
```

后续目标：

```text
User / Service Account
-> Role
-> Scope
-> Tenant / Project / Site data scope
-> Object-level policy
-> Audit event
```

### 4.8 CI / Release Evidence

目标：

- CI 不只是有脚本，而是有可追溯 evidence。
- 每个 release artifact 必须能下载、校验并关联 commit SHA。

候选 lanes：

| Lane | 触发 | 覆盖 |
|---|---|---|
| `pr-fast` | PR 默认 | contracts、Go tests、frontend typecheck、desktop typecheck、generated drift、README path check |
| `integration` | main / opt-in | PostgreSQL migration、MinIO archive、Go API + worker loop、artifact smoke |
| `browser` | nightly / opt-in | Compute Jobs、Lifecycle、Model Governance、Contract validation smoke |
| `release-evidence` | manual release | sidecar build、installer build、silent install、installed smoke、artifact download verify |

### 4.9 Frontend feature architecture

目标：

- 将页面型集成逐步拆成 feature-sliced structure。
- generated client 只在 feature service/API wrapper 层出现。
- routes 只做布局和状态编排。

候选结构：

```text
frontend/src/
  shared/
    api/
    ui/
    config/
  features/
    compute-jobs/
    model-governance/
    lifecycle/
    evidence/
    contracts/
```

规则：

```text
routes 不直接 import generated client
components 不直接 import generated client
features/*/api.ts 调用 generated client
features/*/queries.ts 封装查询和 mutation
```

### 4.10 Desktop package schema

目标：

- 将 Desktop project package 和 support bundle 的长期 wire shape 纳入 `contracts/` 候选。
- Rust runtime 继续负责 SQLite、worker lifecycle、path sandbox 和 package import/export。

候选合同：

```text
desktop_project_package.v1
desktop_support_bundle.v1
```

验收方向：

```text
export project package
import into clean runtime
verify checksum
restore metadata
preserve artifact/model_run references
```

### 4.11 工程记忆治理

目标：

- `.ai/changes` 继续记录单次变更事实。
- 长期架构知识进入 ADR 或 `docs/architecture`。
- 自动或半自动生成 current-state 摘要，降低后续 Agent 翻阅大量变更记录的成本。

候选输出：

```text
docs/architecture/module-map.md
docs/architecture/dependency-graph.md
docs/architecture/current-state.md
docs/architecture/contracts.md
docs/architecture/compute-api.md
docs/architecture/desktop-runtime.md
```

### 4.12 场景级验收

目标：

- 用端到端场景替代只检查 endpoint 是否存在。
- 至少 6 个金标场景进入 CI 或 scheduled gate，其余具备 manual evidence。

首批 8 个金标场景：

| 场景 | 验收链路 |
|---|---|
| 当前流程图到 evidence | Web current flow -> ProcessGraph -> SimulationInput -> ComputeJob -> Worker -> Artifact -> ModelRun -> EvidencePackage |
| 模型参数治理 | catalog -> benchmark case -> worker run -> benchmark_run -> promotion plan -> approved parameter set |
| Agent 草案确认 | Agent draft -> contract validation -> user confirmation -> promote simulation-check -> compute job -> explanation publish boundary |
| Artifact lifecycle | upload archive_candidate -> retention dry-run -> archive -> hot delete -> fallback download |
| Desktop 离线项目 | create project -> run packaged worker -> export -> import clean runtime -> checksum verified |
| PostgreSQL migration | fresh DB -> migrations up -> seed/smoke -> down smoke on temp DB |
| 安全权限 | worker token cannot model:write, web token cannot artifact:admin, cross-scope read/write denied for covered slices, mutation audit exists |
| Release evidence | sidecar build -> installer build -> install smoke -> upload -> download -> verify evidence |

---

## 5. 非目标

本 PRD 明确不要求：

- 立即拆微服务。
- 继续横向堆 endpoint 或页面。
- 一次性重写 legacy `frontend/` 和 `backend/`。
- 一次性把 OIDC/RBAC/ontology 全部压入 P0。
- 一次性引入完整多租户 SaaS、SCADA 写回或生产自动控制。
- 用 README 或计划文档替代源码、测试和 release evidence。
- 把粘贴文本中的打分、文件行数阈值当作硬性规范。
- 纳入粘贴文本之外的 Hteinfo/IMS 业务扩展。

---

## 6. 成功指标

### 6.1 确定性指标

- 根目录存在统一任务入口，并覆盖 doctor、bootstrap、dev、check、gen 和 release gate。
- `contracts/` 变更有 generated drift 和 fixture coverage 检查。
- `docs/architecture` 或等效文档能说明模块图、依赖图和 current state。
- CI evidence 可追溯 commit SHA、workflow run、artifact 下载和验证结果。
- `.ai/changes` 不再承担唯一架构事实来源。

### 6.2 优雅性指标

- Go API 形成模块化单体，核心 domain 不再继续扩大巨型 `internal/compute`。
- Store interface 按领域拆分，service 只依赖必要 repository。
- Frontend route/component 不直接依赖 generated compute client。
- Desktop package/support bundle 的长期 wire shape 有 contracts 候选。
- Water Ontology 首批对象、关系、动作、权限和 evidence 边界可被文档解释。

### 6.3 验收指标

- `just check` 或等效根级命令能执行默认快速验证。
- 至少一个 integration smoke 覆盖 PostgreSQL + worker + artifact。
- 至少一个 release-evidence workflow 产出可下载、可校验 evidence。
- 8 个金标场景至少 6 个自动或半自动验证，剩余 2 个有 manual evidence。

---

## 7. 风险与缓解

| 风险 | 说明 | 缓解 |
|---|---|---|
| 文档膨胀 | 新增质量文档可能和原 PRD/Spec/Plan 重叠 | 明确本文件是补充质量目标，不替代既有权威文档 |
| 过早抽象 | ontology、module split、codegen 可能超前于真实需求 | 先作为候选结构和验证目标，逐步落地 |
| 重构破坏功能 | 拆 Go API 或 Store 可能引入行为回归 | 先加场景级测试和 dependency check，再分 PR 拆分 |
| 生产安全范围过大 | OIDC/RBAC/data scope 可能拖慢 P0 | P0 只要求禁止 dev token 进入 production，完整权限模型分阶段做 |
| CI 过慢 | 全量 gate 都进 PR 会拖慢开发 | 区分 pr-fast、integration、browser、release-evidence 和 nightly |
| 工程入口依赖工具 | Just/Taskfile 可能增加新工具要求 | `just doctor` 明确依赖，README 保留手动 fallback |

---

## 8. 退出条件

当以下条件满足时，可以认为本质量提升 PRD 的目标基本达成：

1. 根级任务入口和本地真实栈启动路径稳定。
2. 依赖图、模块图、current-state 文档可读且与代码不冲突。
3. Go API modular monolith 拆分完成主要 domain 和 Store interface。
4. Contracts 具备生成、漂移检查和跨端 fixture 验证闭环。
5. Frontend generated client 隔离到 service/API wrapper 层。
6. Desktop project package/support bundle schema 标准化。
7. Production dev-token 禁用和最小权限边界完成。
8. CI/release evidence 可追溯当前 HEAD。
9. Water Ontology 首批对象、动作、关系、权限和 evidence 边界清晰。
10. 8 个金标场景至少 6 个有自动或半自动 evidence。
