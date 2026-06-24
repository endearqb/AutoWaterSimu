# AutoWaterSimu Next 独立开发实施计划

**从现有 Next 分支到“无 FastAPI、无登录、可独立调试”的交付路线**

- 版本：v1.0
- 日期：2026-06-21
- 状态：执行基线
- 架构边界：NewSystem 负责平台与业务上下文；AutoWaterSimu Next 负责 Simulation & Decision Intelligence 域

# 文档控制

| 项目 | 内容 |
| --- | --- |
| 实施目标 | 在现有 codex/autowatersimu-next-rebuild 分支上完成 AutoWaterSimu Next 独立 Web 运行、PostgreSQL 持久化、五类模型闭环、legacy 数据迁移与 FastAPI runtime 退出。 |
| 计划周期 | 建议 8 个双周 Sprint，约 14–18 周；其中 4–6 周形成可用 Standalone Alpha。 |
| 团队基线 | 4–6 FTE：1 名技术负责人/Go、1 名 Go、1–2 名前端、1 名 Python/模型、1 名测试/DevOps（可兼职）。 |
| 认证策略 | 当前 auth disabled；保留 static token 测试模式；NewSystem JWT 接入单列后续阶段。 |
| 数据库策略 | PostgreSQL，AutoWaterSimu 独立 database 或 simulation schema；迁移由 Go CLI 管理。 |
| 发布策略 | 先实现 Web standalone；Desktop 不阻塞主线。FastAPI 仅保留离线对比，最终不进入发布物。 |

# 目录

- 1. 当前状态与差距
- 2. 实施原则
- 3. 目标代码与部署结构
- 4. 工作流分解
- 5. 阶段路线图
- 6. Sprint 计划
- 7. PR 与任务拆分
- 8. PostgreSQL 与历史数据迁移
- 9. 前端切换方案
- 10. 测试与质量门槛
- 11. 本地开发与 CI/CD
- 12. 上线、回滚与 FastAPI 退出
- 13. 团队与 RACI
- 14. 工作量估算
- 15. 风险登记册
- 16. DoR / DoD
- 17. NewSystem 后续集成预留
- 18. 启动后十个工作日执行清单

# 1. 当前状态与差距

## 1.1 已具备能力

| 领域 | 现有能力 | 实施判断 |
| --- | --- | --- |
| Contracts | 版本化 JSON Schema、registry、fixtures、tests、codegen policy | 继续作为 source of truth，不重建。 |
| Go Compute API | job/worker/artifact/model governance/evidence/simulation checks/PostgreSQL migrations | 扩展为独立 Simulation API，但避免变成 NewSystem 平台 API。 |
| Python Worker | 五类 job、API loop、artifact、model_run、自检，已去除 backend/app runtime import | 主链可复用；重点改镜像与 no-auth client。 |
| simulation_core | Material Balance/ASM/UDM 核心与 correctness freeze/golden | 保持纯计算边界。 |
| Frontend | 现有流程图、模型页面、Next compute wrappers 与 browser smokes | 主要改造面：登录守卫、legacy client、CRUD 与 runtime config。 |
| PostgreSQL/MinIO | dev compose 已有 compute Postgres 与 MinIO | 拆出真正 standalone profile，默认 local artifact 可更轻。 |

## 1.2 关键差距

| 差距 | 直接表现 | 优先级 |
| --- | --- | --- |
| 前端依赖 legacy auth | main.tsx 配置 legacy token；_layout 访问时检查 access_token；useAuth 调 UsersService。 | P0 |
| API 默认仍要求 Bearer Token | 所有 handler 经 static Authenticator；worker/前端 compose 注入 dev token。 | P0 |
| Flowchart/UDM CRUD 未全部迁到 Go | 停止 FastAPI 后部分页面无法保存、读取或校验。 | P0 |
| Standalone compose 不够独立 | worker 启动时 pip install；PYTHONPATH/source mount；API 探测 repo root。 | P0 |
| legacy runtime import 未全面清零 | frontend legacy generated client 与 services 仍在运行路径。 | P0 |
| 历史数据迁移工具未完成 | 旧 flowchart/UDM/job 数据无法可验证导入。 | P1 |
| NewSystem 集成边界尚未固化 | 容易直接跨库或把 IAM 再做一遍。 | P1 设计，P2 实现 |

## 1.3 交付里程碑

| 里程碑 | 目标时间 | 完成定义 |
| --- | --- | --- |
| M0 基线冻结 | 第 1 周 | requirements/ADR/gap matrix/CI baseline 完成。 |
| M1 Standalone Alpha | 第 4–6 周 | 无登录进入 Web，Go+worker+Postgres 独立完成 current flow。 |
| M2 Feature Beta | 第 8–12 周 | Scenario/Flowchart/UDM CRUD 与五模型全部脱离 FastAPI。 |
| M3 Standalone RC | 第 12–16 周 | 历史迁移、live browser、golden、backup/restore 全绿。 |
| M4 FastAPI Runtime Retired | 第 14–18 周 | 发布和 CI 不启动 FastAPI，旧库只读。 |
| M5 NewSystem Integration | 后续独立计划 | JWT/context/event/shell 接入。 |

# 2. 实施原则

- 在现有 Next 能力上增量演进，不重写 contracts、job lifecycle、worker 或 simulation_core。
- 先让系统在 auth disabled 模式独立闭环，再接 NewSystem IAM；不在本期建设用户表。
- 先迁移活跃前端行为，不把每个 legacy FastAPI 路由永久兼容。
- Go 拥有 HTTP、元数据和领域 CRUD；Python 只执行计算；frontend 通过 feature wrapper 调 API。
- PostgreSQL 统一技术栈不等于统一表所有权；AutoWaterSimu 使用独立 schema/DB。
- 每个 PR 小步可回滚，必须附 `.ai/changes/` 和可执行验证证据。
- FastAPI 退出以运行时证据为准，不以代码目录是否还存在为准。
# 3. 目标代码与部署结构

## 3.1 建议代码结构

```text
apps/api/
  cmd/compute-api/                 # 现入口，后续可重命名 simulation-api
  cmd/migrate-legacy/              # 遗留数据迁移 CLI
  cmd/migrate/                     # 显式 migration runner
  internal/platform/auth/          # disabled/static/newSystem provider
  internal/platform/config/
  internal/domain/scenarios/       # 新增
  internal/domain/graphs/          # 新增或从 simulation 拆分
  internal/domain/udm/             # 新增
  internal/domain/jobs|models|evidence|workers/
  internal/compute/                # 兼容 wiring，逐步变薄
  migrations/

frontend/src/
  app/runtime/                     # app mode、auth mode、context mode
  features/scenarios/
  features/graphs/
  features/models/
  features/simulation/
  features/jobs/
  features/results/
  shared/api/

services/simulation-worker/
simulation_core/
contracts/
compose/standalone/ or docker-compose.standalone.yml
```

## 3.2 Auth provider 抽象

```go
type PrincipalProvider interface {
    Principal(r *http.Request, requiredScope string) (*Principal, error)
}

implementations:
  DisabledProvider     # local principal, allow all scopes
  StaticTokenProvider  # retain existing regression/security mode
  NewSystemJWTProvider # future: issuer/JWKS/claims/data scope
```

实施时应将 compute.Server.auth 从具体 *Authenticator 改为接口。disabled provider 不要求 Authorization；static provider 保持现有行为；NewSystem provider 仅定义配置和 claims adapter ADR，不在本期拉入真实 IAM。

## 3.3 Standalone 部署拓扑

```text
docker-compose.standalone.yml
  postgres
  compute-api (AUTH_MODE=disabled)
  simulation-worker (token optional)
  frontend (VITE_AUTH_MODE=disabled)

profile: full
  minio

not present:
  backend / FastAPI / mailcatcher / legacy proxy
```

# 4. 工作流分解

| 工作流 | 范围 | 主要负责人 | 核心产物 |
| --- | --- | --- | --- |
| WS-0 架构与治理 | 边界、ADR、route/data/import matrix、release gate | Tech Lead | docs、audits、decision records |
| WS-1 Standalone Runtime | compose、images、config、health、no repo-root dependency | Go/DevOps | 独立启动链 |
| WS-2 No-Auth & Frontend Shell | auth provider、route guard、legacy auth removal | Go + Frontend | 无登录 Web |
| WS-3 Scenario/Graph Persistence | Scenario、CanvasGraph、ProcessGraph、context snapshot | Go + Frontend | 核心 CRUD |
| WS-4 Model/UDM | UDM library/version/template/hybrid/validation | Go + Python + Frontend | 模型编辑闭环 |
| WS-5 Compute/Result Cutover | 五模型 builders、job/result/timeseries/evidence | 全栈 | 完整仿真闭环 |
| WS-6 Legacy Migration | 数据映射、CLI、verify、read-only | Go + DBA + QA | 可审计迁移 |
| WS-7 QA/Release | browser/live/golden/perf/backup/release | QA/DevOps | Standalone RC |
| WS-8 NewSystem Readiness | provider contracts、external refs、events | Architect | 后续集成接口 |

# 5. 阶段路线图

## Phase 0：基线冻结与任务矩阵（1 周）

### 工作内容

- 落地本需求规格说明书与实施计划到 docs/migration 或 docs/rebuild。
- 建立 FastAPI route → frontend caller → legacy table → Go target → test 的迁移矩阵。
- 执行 `rg` 生成 frontend legacy imports、/users/me、VITE_API_URL、backend/app 引用清单。
- 记录当前 branch 的 pr-fast、integration、current-flow-live、golden 证据。
- 新增 ADR：领域边界、无鉴权模式、PostgreSQL schema、artifact profile、NewSystem future adapter。
### 退出条件

- P0 route/caller 全部有 owner 与 target。
- 团队确认不迁移 login/users/items。
- 里程碑、风险与负责人确定。
## Phase 1：Standalone Runtime 与 No-Auth API（1–2 周）

### 工作内容

- 增加 COMPUTE_API_AUTH_MODE 和 PrincipalProvider 接口。
- 实现 DisabledProvider、保留 StaticTokenProvider；worker token 可选。
- 增加 loopback bind 与 remote-no-auth guard。
- 新建 docker-compose.standalone.yml，默认 PostgreSQL + local FS，full profile 启用 MinIO。
- 新增 worker Dockerfile：构建阶段安装 wheels，运行阶段不联网、不写 sys.path。
- API 使用 embedded contracts 或 COMPUTE_API_CONTRACTS_DIR，消除 findRepoRoot 发布依赖。
- 新增 just standalone-up/down/status/reset/smoke。
### 退出条件

- curl 无 Authorization 可完成 job create/read。
- worker 无 token 完成一次 job。
- compose 中无 backend，断网重启成功。
- static token security smoke 仍通过。

### 2026-06-21 实施记录

- 已落地 auth provider interface、disabled/static mode、loopback/remote no-auth guard、显式 contracts/migrations runtime path、worker token optional、standalone compose、standalone Justfile targets、standalone no-auth smoke 和 worker Dockerfile。
- 已验证无 Authorization 的 job create/read、worker 空 token 请求、standalone compose 默认无 backend、static-token security smoke。
- 未纳入本阶段：前端 route tree 去登录、`/users/me` 移除、ContextProvider、migration CLI、release/offline full image gate。
- 剩余验证缺口：本地 worker image build 在 Python wheel 安装阶段超时；后续 release/offline gate 需重新构建并验证完整 worker image。
## Phase 2：前端无登录与最小独立闭环（2 周）

### 工作内容

- 新增 runtime config：app_mode=standalone、auth_mode=disabled、context_mode=standalone。
- 移除 `_layout` 登录 redirect；根路由进入 Standalone 首页或 Scenario 列表。
- 替换 useAuth 为 StandaloneSessionProvider 或彻底从 standalone route tree 移除。
- 删除全局 401/403 → /login 行为；隐藏用户相关菜单。
- 移除 current-flow live smoke 对 legacy /users/me mock。
- 确保 existing compute pages 仅通过 shared/api 与 feature wrappers 调 Go API。
### 退出条件

- 清空 localStorage 仍可访问所有 P0 页面。
- browser network 断言无 legacy auth 请求。
- 真实 Go API+worker current flow 成功。
## Phase 3：Scenario、CanvasGraph、ProcessGraph 与 Context Snapshot（2–3 周）

### 工作内容

- 设计 PostgreSQL migrations 与 Go domain/store/service/HTTP。
- 实现 Scenario CRUD/clone/archive；关联 graph、model、job。
- 实现 CanvasGraph CRUD/version/import/export。
- 实现 publish/validate 到 ProcessGraph；Material Balance resolver 复用现有合同。
- ASM/UDM 使用显式 builders；为每个模型建立 contract fixture。
- 实现 standalone context fixtures、JSON import、context_snapshot。
- 迁移 flowchart stores 与 service calls 到 Go wrappers。
### 退出条件

- 保存/重启/加载流程图成功。
- 发布后的 ProcessGraph 不可变。
- Material Balance 从 Scenario 运行成功。
- 上下文快照可在结果/evidence 中读取。

### 2026-06-21 实施记录

- 已落地 Go Compute API Scenario、CanvasGraph、ContextSnapshot workspace HTTP/service/store/OpenAPI/migration 链路。
- CanvasGraph 保存为 versioned `canvas_graph.v1` metadata，publish 路径派生不可变 `process_graph.v1` 版本，并可注册对应 `simulation_input.v1`。
- Scenario simulation-check 路径使用最新 published ProcessGraph 运行 Material Balance，并把 scenario/context snapshot refs 写入 job context 与 evidence metadata。
- 前端新增 `features/workspace/api.ts` wrapper，standalone runtime 下 `flowStore` 的保存、加载、列表、更新和归档改走 Go workspace API；legacy runtime 继续走原 FastAPI `FlowchartsService`。
- 已验证 `go test ./...`、`cd frontend; npx tsc --noEmit`、dev/standalone compose config、OpenAPI JSON parse 和 Phase 3 diff-check。
- 2026-06-23 补充：ASM1Slim、ASM1、ASM3 和 UDM legacy Flowchart CRUD 在 standalone runtime 下改走 `standaloneFlowchartService.ts`，以 Go Workspace CanvasGraph/Scenario API 保存和读取，legacy runtime 继续动态使用 FastAPI client。
- 未纳入本阶段：Context UI、SQLite/Desktop 本地 store。
## Phase 4：UDM 模型库与 Hybrid 配置（2–3 周）

### 工作内容

- 建立 udm_models、udm_model_versions、udm_hybrid_configs migrations。
- 迁移 legacy UDM model/version/template/validate 行为到 Go API。
- 将 route-only validation 移到 contracts/simulation_core 或 Go schema/service。
- 实现不可变版本、definition hash、template copy、publish 状态。
- 实现 Hybrid 多模型映射、variable bindings、strict validation。
- 前端 UDM editor 与 hybrid config 全部切 Go wrappers。
### 退出条件

- 不启动 FastAPI 可创建模型版本和 Hybrid 配置。
- UDM 与 mixed Hybrid worker tests/live smoke 通过。
- parameter_hash 正确覆盖 snapshot/bindings。

### Phase 4 实施记录（2026-06-21）

- 新增 Go Compute API UDM workspace：`/api/v1/udm-models/templates`、`/validate`、模型 CRUD、`/from-template`、`/api/v1/udm-hybrid-configs` CRUD。
- 新增 `udm_models`、`udm_model_versions`、`udm_hybrid_configs` PostgreSQL metadata migrations；模型版本保存 definition metadata/hash，不保存结果时间序列或 artifact 内容。
- UDM 模型定义验证迁入 Go service，覆盖 component/parameter/process expression、continuity checks、seed templates、immutable version/hash 和 publish 状态。
- Hybrid config 持久化与 strict validation 迁入 Go service，覆盖 `udm_only` mode、selected models、model pair mappings、variable bindings、local exempt 和 parameter_hash。
- 前端新增 `features/udm/api.ts` wrapper；`udmService.ts` 在 standalone runtime 下将 UDM model library 与 hybrid config 方法切到 Go Compute API，legacy runtime 继续使用 FastAPI client。
- 已验证 targeted UDM Go HTTP/service tests、`go test ./internal/compute`、`frontend npx tsc --noEmit` 和 OpenAPI JSON parse / generated compute client。
- 2026-06-23 补充：新增 `POST /api/v1/udm-hybrid-configs/validate`，frontend `validateHybridFlowchart`、hybrid config create/update 和 standalone compute preflight 复用同一 Go strict validation；前端不再用本地 fake pass 覆盖 Hybrid 校验。
- 未纳入本阶段：mixed Hybrid worker live smoke；该项必须由 live worker evidence 覆盖。
## Phase 5：五模型 Compute 与结果读取完全切换（2–3 周）

### 工作内容

- 为 Material Balance、ASM1Slim、ASM1、ASM3、UDM 建立 frontend request builders 与 unit tests。
- 统一 create/status/events/result/artifact/evidence 流程。
- 必要时增加 timeseries 分页/切片 read adapter；避免前端继续调用 legacy result routes。
- 将 legacy delete 语义改为 cancel/archive/hide，避免破坏 evidence。
- 完成 Jobs、Result、Evidence 页面 live backend browser tests。
- 移除 simple WebSocket 依赖；先使用 events polling。
### 退出条件

- 五模型从 UI 到 worker 端到端全绿。
- 前端 legacy compute services runtime imports 为零。
- 结果/时序/artifact 在重启后可读取。

### 2026-06-21 实施记录

- 已新增 standalone five-model compute adapter，Material Balance、ASM1Slim、ASM1、ASM3、UDM 在 standalone runtime 下生成 `compute_job.v1` / `simulation_input.v1` 并通过 Go Compute API 提交。
- standalone calculation submit/status/result/timeseries/final-values/input-data/delete 已切到 Go API wrappers；legacy runtime 继续动态加载 FastAPI generated client。
- 新增 `audit-frontend-standalone-compute-boundary.ps1` 与 `standalone-five-model-compute.spec.ts`，覆盖五类 job type、参数数组、UDM metadata/bindings 和无 legacy endpoint 调用。
- 已验证 `cd frontend; npx tsc --noEmit`、前端 standalone compute boundary audit、`cd apps/api; go test ./...`、五类 worker fixture `--run-job` 和 mock-backed Playwright five-model smoke。
- 2026-06-23 补充：新增 `standalone-five-model-live` gate，通过隔离 Compute API/PostgreSQL/MinIO 栈、本地主机 worker loop 与 Playwright 覆盖五模型 UI submit → worker → artifact/result/evidence → UI job list 回读 live 闭环。
- 2026-06-23 补充：live gate 暴露 worker claim 响应丢失后 job 已进入 running 但 worker 未收到 payload 的可靠性缺口；Go Compute API 已补同一 `worker_id` active running job reclaim，worker client 只对 `/claim` 底层瞬时连接失败做有限重试，避免跳过已领取 job。
- 未纳入本阶段：服务端 time-series 分页 endpoint；该项不阻断当前最小 RC，但需单独评估大结果读取体验。
## Phase 6：遗留数据迁移与 FastAPI 只读（2 周）

### 工作内容

- 实现 `cmd/migrate-legacy` 双 DSN 工具。
- 导入 flowcharts、UDM models/versions/hybrid configs、可转换 jobs。
- 不可转换记录进入 imported_legacy_history。
- 记录 legacy_source 与 checksum，支持 dry-run/resume/verify。
- 旧 FastAPI DB 切 read-only；禁止 dual-write。
- 运行 old-vs-new selected golden scenarios。
### 退出条件

- 迁移可重复执行且无重复数据。
- verify report 无 P0/P1 conflict。
- 旧库无写入。

### 2026-06-21 实施记录

- 新增 `apps/api/cmd/migrate-legacy` 双 DSN CLI，支持 `--dry-run`、`--resume`、`--verify-only`、`--only`、`--batch-size` 和 JSON report。
- 新增 `apps/api/internal/legacyimport` 映射包，legacy DB 通过 read-only transaction 查询，目标对象保存 `legacy_source` table/id/hash，目标已存在且 hash 不同报告 conflict。
- 新增 `imported_legacy_history` migration，用于保存不可安全转换为 canonical standalone object 的 legacy job history。
- 当前迁移覆盖 flowcharts → Scenario/CanvasGraph、UDM models/versions/hybrid configs → standalone UDM metadata、canonical terminal `compute_job.v1` history → `compute_jobs`；非 canonical job history 进入 `imported_legacy_history`。
- 新增 `scripts/ci/standalone-migration-smoke.ps1` 与 `just standalone-migration-smoke`；无 DSN 时执行 Go package/command tests 并跳过 live DB dry-run。
- 2026-06-23 补充：修复 canonical `compute_jobs` legacy hash 查询，改为读取 `input_json.metadata.legacy_source.checksum`；canonical job 导入同时保留 input、summary、result、artifact refs 和 error 到 `imported_legacy_history`，并补充回归测试。
- 2026-06-23 补充：`standalone-migration-smoke.ps1` 会输出 `tmp/ci-evidence/standalone-migration-smoke.json`；缺少 live legacy/target DSN 时状态为 `passed_with_skips`，完整 release gate 必须在 `-FailOnSkip`/full 模式下把该状态视为失败。
- 未纳入本阶段：实际生产 legacy DB 权限切 read-only、全量 old-vs-new golden comparison 和真实 fixture DB 双演练；这些需要外部 DSN/备份窗口，当前必须作为 release 外部前置项记录，不得用本地 fixture gate 冒充完成。
## Phase 7：Hardening、Standalone RC 与 FastAPI Runtime 退出（2 周）

### 工作内容

- 增加 standalone release compose/image build。
- 增加 backup/restore、migration rollback、artifact checksum/retention smoke。
- 完善 metrics、structured logs、version/capabilities。
- 执行 performance baseline 与五模型 golden。
- 删除 standalone route tree 中 login/users/items 与 legacy client。
- 更新 README、development、deployment、runbook。
- CI 发布门槛改为不启动 FastAPI。
### 退出条件

- Standalone RC gate 全绿。
- 发布物不包含 FastAPI。
- FastAPI 仅作为 archived/oracle code 存在。

### 2026-06-21 实施记录

- 新增 `scripts/release/standalone-release-gate.ps1`，聚合 standalone compose service boundary、Go API tests、frontend typecheck、Compute API boundary audit、frontend standalone compute boundary audit、legacy migration smoke、five-model smoke、backup/restore smoke、migration rollback smoke、standalone live API smoke 和 golden summary/refresh evidence。
- 新增 `scripts/ci/standalone-five-model-smoke.ps1`，以五类 `compute_job.v1` worker fixture 覆盖 Material Balance、ASM1Slim、ASM1、ASM3 和 UDM，并运行 standalone five-model Playwright mock smoke。
- 2026-06-23 补充：新增 `scripts/ci/standalone-five-model-live.ps1` 与 `just standalone-five-model-live`，启动隔离 Compute API/PostgreSQL/MinIO 栈和 worker loop，验证五模型浏览器提交、真实 worker 完成和 result/artifact 回读。
- 新增 `scripts/ci/standalone-backup-restore-smoke.ps1`，默认执行本地 artifact checksum backup/restore fixture；`-RunLive` 且提供 `COMPUTE_API_DATABASE_URL` 时执行 PostgreSQL dump/list，额外提供 `AUTOWATERSIMU_RESTORE_DATABASE_URL` 时才向显式临时库 restore。
- 新增 `just standalone-five-model-smoke`、`just standalone-five-model-live`、`just standalone-backup-restore-smoke`、`just standalone-release-image`、`just standalone-release-gate`、`just standalone-release-gate-full`、`just standalone-browser-smoke` 和 `just standalone-golden`。
- `standalone-release-gate.ps1 -SkipLong` 在无 live compose、无临时 DB DSN、未显式构建镜像时记录 `passed_with_skips`，不得解释为完整 RC 全绿；完整 RC 使用 `just standalone-release-gate-full` 或显式补跑 `-RunComposeSmoke -RunBackupRestoreLive -RunPostgresMigrationSmoke -RunReleaseImageSmoke`，且所有 evidence 无 skipped/partial。
- `just standalone-release-gate-full` 不再内置默认 PostgreSQL DSN；调用方必须显式设置 `COMPUTE_API_DATABASE_URL` 与 `AUTOWATERSIMU_RESTORE_DATABASE_URL` 指向临时库，避免 migration rollback 或 restore 误打生产 legacy 库、dev 库或正在运行的 standalone 元数据库。
- `standalone-release-gate.ps1` 会要求 `standalone-five-model-live.json` 是当前 HEAD 的 passed evidence；完整 gate 不再只依赖 mock-backed five-model smoke。
- `standalone-release-gate.ps1` 会要求 migration、backup/restore 和 golden summary evidence 的 `commit_sha` 匹配当前 HEAD；旧 commit 的本地通过记录不能复用为完整 RC 证据。
- `-RunReleaseImageSmoke` 必须解析 worker `--self-check` JSON，并要求 dependency imports、scientific deps、artifact temp dir 与 `minimal_job_status.ok=true`；只看进程退出码不足以满足 release image smoke。
- FastAPI 退出仍以运行路径 evidence 为准：当前发布 gate 默认检查 standalone compose 不包含 backend、frontend standalone compute audit 不允许五模型静态 legacy calculation SDK 回流；legacy `backend/` 源码保留为 archived/oracle，不进入 standalone compose。
- 2026-06-23 补充：完整 RC 退出条件收紧为“当前 HEAD 的 hosted/full gate 无 skip 通过”。在该证据存在前，不删除 FastAPI 源码或 legacy client，不把本分支视为最终 canonical main merge。
- 2026-06-23 补充：新增 `.github/workflows/next-standalone-release-gate.yml` 作为 hosted/full gate 入口；该 workflow 只接受当前 commit 的外部验收 JSON 输入，并从 `AUTOWATERSIMU_LEGACY_DATABASE_URL` secret 读取 legacy dry-run DSN，缺失或 commit 不匹配时 release gate 必须失败。
- 2026-06-23 补充：`standalone-release-gate.ps1` 会校验必需 evidence 的 `schema_version`；five-model live、production legacy rehearsal 和 MinIO/S3 artifact profile live 记录必须分别使用 `autowatersimu_next_standalone_five_model_live_smoke.v1`、`autowatersimu_next_standalone_legacy_production_rehearsal.v1` 和 `autowatersimu_next_standalone_s3_artifact_profile_live.v1`，否则即使 `status=passed` 也按缺口处理。
- 2026-06-23 外部验收记录：生产 legacy PostgreSQL 只读/全量迁移演练、old-vs-new 对比、MinIO/S3 full artifact profile live validation 仍需要外部 DSN、对象存储凭据和执行窗口；这些是 P0 发布验收缺口，不得以本地 fixture 替代。
- 2026-06-23 P1 跟踪：release compose/images 精简、standalone dist legacy chunk scan、worker 独立 venv/deps lock、backup/restore 内容级校验继续单列跟踪，不应阻塞当前 P0 修复提交，但必须在 RC 后续清单中保持可见。
# 6. Sprint 计划

| Sprint | 目标 | 主要交付 | 演示 |
| --- | --- | --- | --- |
| S1 | 边界与 No-Auth API | ADR、auth interface、disabled provider、standalone compose skeleton | curl 无 token 创建 job |
| S2 | 无登录 Web Alpha | runtime config、route guard removal、worker no-token、live browser | 浏览器 current flow |
| S3 | Scenario/CanvasGraph | migrations、CRUD、frontend save/load | 重启后加载场景 |
| S4 | ProcessGraph/Context | publish/validate、context snapshot、MB resolver | 场景到 MB 结果 |
| S5 | UDM 库 | models/versions/templates/validation | 创建并运行 UDM |
| S6 | Hybrid 与五模型切换 | hybrid configs、builders、result adapters | 五模型 live smoke |
| S7 | 数据迁移 | migrate CLI、verify、legacy read-only | 迁移报告与历史查询 |
| S8 | RC/退出 | release images、backup/restore、golden、docs | FastAPI 关闭后的完整验收 |

# 7. PR 与任务拆分

| PR | 范围 | 必须验证 |
| --- | --- | --- |
| PR-00 | Docs/ADR/migration matrix | git diff check、architecture docs review |
| PR-01 | Auth provider interface + disabled mode | Go unit、static security regression、remote guard |
| PR-02 | Standalone compose + packaged worker/API contracts | compose smoke、offline restart、self-check |
| PR-03 | Frontend runtime config + no-login shell | tsc、browser no-auth/no-users-me |
| PR-04 | Scenario + context snapshot schema/API | Go/store/migration tests |
| PR-05 | CanvasGraph/ProcessGraph API + frontend wrappers | contract tests、save/load/publish browser |
| PR-06 | UDM models/versions/templates | Go/API/frontend/editor tests |
| PR-07 | Hybrid config + strict validation | worker/generated hybrid scenarios |
| PR-08 | Five model builders/result/timeseries cutover | five live flows、golden |
| PR-09 | Legacy migration CLI | fixture DB、idempotency、verify report |
| PR-10 | Standalone release gates + FastAPI runtime removal | full RC gate、backup/restore、release image |

> **PR 约束：** 任何单个 PR 不同时大规模改 contracts、Go store、worker 算法和前端页面。跨边界变更应先合同/fixture，再 consumer，再 UI，以降低回滚风险。

# 8. PostgreSQL 与历史数据迁移

## 8.1 Schema 策略

- 推荐独立 database：autowatersimu_next；与 NewSystem 共集群也不共表。
- 若同 database，使用 simulation schema，并由独立 migration user 拥有。
- Go API 运行账号仅有 simulation schema 所需权限；worker 无 DB 凭据。
- 开发 auto-migrate 可开启；发布用显式 migrate job。
## 8.2 迁移工具结构

```text
migrate-legacy
  --legacy-database-url postgres://...
  --target-database-url postgres://...
  --dry-run
  --resume
  --verify-only
  --only flowcharts,udm,jobs
  --batch-size 500
  --report tmp/migration-report.json
```

## 8.3 映射原则

| Legacy 数据 | 目标 | 策略 |
| --- | --- | --- |
| users/password/reset token | 不进入 AutoWaterSimu | 保留 legacy_actor_ref；未来 NewSystem crosswalk。 |
| items/template utilities | 删除或不迁移 | 先确认无 runtime usage。 |
| flowcharts family tables | canvas_graphs/process_graphs/scenarios | 保存原 JSON + normalized projection + source hash。 |
| UDM model/version/template | udm_models/versions | 保持版本和 definition hash。 |
| UDM hybrid configs | udm_hybrid_configs | 重跑 strict validation，记录 warning。 |
| legacy *Job 可转换 | compute_jobs/events/model_runs/artifacts | 保存 legacy metadata，状态映射。 |
| legacy *Job 不可转换 | imported_legacy_history | 只读，不允许 replay。 |

## 8.4 验证与回滚

- 迁移前备份 legacy 和 target；target 在临时库至少演练两次。
- 每批记录 source id/hash；失败可从 checkpoint resume。
- 目标表导入采用 upsert only when source_hash matches policy；冲突进入报告，不静默覆盖。
- 回滚优先删除 migration batch 或恢复 target 备份，不修改 legacy。
- 旧库在 cutover 后只读，避免双写和数据漂移。
# 9. 前端切换方案

## 9.1 切换顺序

1. Runtime config 与 no-login shell。
1. Compute Jobs/current flow 真实 API。
1. Scenario 与 Flowchart save/load。
1. Material Balance submit/result。
1. ASM1Slim、ASM1、ASM3 submit/result。
1. UDM model editor、Hybrid config、UDM submit/result。
1. Model governance/evidence。
1. 删除 legacy client、login/user/items routes。
## 9.2 Runtime import gate

```powershell
rg -n 'from "@/client"|from "../client"|LoginService|UsersService' frontend/src
rg -n '/users/me|/login/access-token' frontend/src frontend/tests
rg -n 'backend/app|from app\.|import app\.' apps/api services/simulation-worker simulation_core

Expected for standalone runtime paths: zero findings
Allowed findings: migration/oracle/archive-only directories documented in allowlist
```

## 9.3 兼容策略

优先在 frontend feature wrappers 中适配新 API。只有当 legacy response shape 迁移成本显著且多个页面共享时，才在 Go API 增加临时 compatibility read；必须标记 deprecated、记录删除条件，并禁止形成永久 FastAPI API 复制。

# 10. 测试与质量门槛

## 10.1 测试矩阵

| 层级 | 覆盖 | 主要命令/证据 |
| --- | --- | --- |
| Contracts | registry、valid/invalid、client drift | check-contracts + pytest contracts/tests |
| simulation_core | 五模型算法、input contract、correctness freeze | pytest simulation_core/tests + audits |
| Worker | self-check、run-job、API loop、strict adapter、packaged no fallback | worker pytest + smoke |
| Go Unit | auth modes、domain services、state machines、scope regression | go test ./... |
| PostgreSQL | store、migration、transaction、indexes、up/down | temporary DB tests |
| Frontend Unit/Type | builders、wrappers、runtime config | npx tsc --noEmit + unit tests |
| Browser Mock | 页面 orchestration 与错误态 | Playwright browser-smoke |
| Browser Live | 真实 API+Postgres+worker，无 /users/me mock | standalone-live-browser-smoke |
| Golden | 旧/新或 core-only baseline tolerance | golden-scenarios |
| Release | image、offline startup、backup/restore、artifact | standalone-release-gate |

## 10.2 新增 CI Gate

- `standalone-runtime-audit`：禁止 FastAPI/legacy client runtime dependency。
- `standalone-compose-smoke`：无 token、无 backend，完成一个最小 job。
- `standalone-current-flow-live`：浏览器提交真实 flow，worker 完成。
- `standalone-five-model-live`：五 job type 最小场景。
- `standalone-migration-smoke`：空库 up/check/down 与 legacy fixture import。
- `standalone-release-image-smoke`：构建镜像后断网启动。
- `standalone-release-gate-full`：完整 RC 入口，必须在当前 HEAD、hosted/full 环境、无 skip/partial evidence 下通过；本地 `-SkipLong` 只能作为快速回归。
- `next-standalone-release-gate.yml`：hosted/manual 完整 RC 入口，上传 `tmp/ci-evidence` 和 `tmp/release-evidence`。
## 10.3 Release Gate 命令目标

```powershell
just check
just standalone-smoke
just standalone-browser-smoke
just standalone-five-model-live
just standalone-migration-smoke
just standalone-golden
just standalone-backup-restore-smoke
just standalone-release-gate
just standalone-release-gate-full
```

# 11. 本地开发与 CI/CD

## 11.1 开发模式

| 场景 | 命令目标 | 说明 |
| --- | --- | --- |
| 一键 | just standalone-up | 启动全部核心组件。 |
| Go 调试 | just standalone-db；just dev-api-noauth | API 在 IDE 运行，DB/worker 可容器化。 |
| Python 调试 | just dev-worker-noauth | 独立 venv，API 已启动。 |
| 前端调试 | just dev-frontend-standalone | 不需要 FastAPI 或 token。 |
| 算法 fixture | just worker-run-fixture MODEL=asm3 | 直接执行 compute_job.v1。 |
| 清库重建 | just standalone-reset | 删除 volumes 前必须提示。 |

## 11.2 镜像构建

- Go API 多阶段构建；复制/嵌入 contracts 和 migrations。
- Worker 先构建 contracts、simulation_core、worker wheels，再安装到 runtime image。
- Frontend dev 使用 Vite；release 生成静态文件。
- 镜像启动不得下载依赖。
- 所有镜像写入 git SHA、contracts registry hash、model package version。
# 12. 上线、回滚与 FastAPI 退出

## 12.1 Standalone 上线 Runbook

1. 备份 PostgreSQL 与 artifact store。
1. 执行 migration check 与 migrate。
1. 启动 API，确认 readyz/runtime/capabilities。
1. 启动 worker，确认 registered/capabilities。
1. 启动 frontend，执行 no-auth browser smoke。
1. 执行 Material Balance + UDM golden sanity。
1. 记录版本、合同 hash、migration version 和 evidence。
## 12.2 回滚

- 应用回滚：切回前一镜像，保持数据库向后兼容。
- 数据库：仅对明确可逆 migration 执行 down；否则恢复备份并停止写入。
- artifact：metadata 与对象 store 同步检查，禁止仅回滚一侧。
- 若计算回归，停止新 job，保留已完成证据，切回上个 worker image。
- FastAPI 在比较窗口可作为只读查询 oracle，不恢复写入。
## 12.3 FastAPI 退出清单

| 检查项 | 完成标准 |
| --- | --- |
| Compose/Deployment | 无 backend service、无 legacy proxy、无 SMTP/auth env。 |
| Frontend | 无 legacy client runtime import；无 login/users routes；无 /users/me。 |
| Go API | 拥有所有 P0 CRUD 与 compute reads。 |
| Worker/Core | 无 backend/app import；packaged no-fallback smoke 通过。 |
| Data | legacy migration verify 通过；旧库 read-only。 |
| Testing | standalone live + five model + golden + backup/restore 全绿。 |
| Documentation | README/development/deployment 只描述 standalone 主路径。 |

2026-06-23 退出约束：在当前 HEAD 的 hosted/full gate 无 skip 通过、production legacy read-only/full rehearsal 完成、MinIO/S3 full artifact profile live validation 完成之前，不删除 FastAPI/legacy client，也不把 standalone RC 标记为最终 canonical main merge。

# 13. 团队与 RACI

| 工作项 | A 负责 | R 执行 | C 咨询 | I 知会 |
| --- | --- | --- | --- | --- |
| 架构边界/ADR | Tech Lead | Tech Lead | 产品、NewSystem 架构 | 全员 |
| Go API/Auth/DB | Go Lead | Go Engineers | QA、Frontend | 产品 |
| Worker/Core | Model Lead | Python/Model | Go、QA | 产品 |
| Frontend Cutover | Frontend Lead | Frontend Engineers | Go、UX、QA | 产品 |
| Legacy Migration | Tech Lead | Go/DBA | 业务、QA | 产品 |
| CI/Release | QA/DevOps Lead | QA/DevOps | 全栈 | 全员 |
| NewSystem Readiness | System Architect | Go/Integration | NewSystem Team | 全员 |

# 14. 工作量估算

| 工作流 | 人周估算 | 说明 |
| --- | --- | --- |
| 架构/矩阵/ADR | 2–3 | 前置且贯穿。 |
| No-auth + runtime packaging | 4–6 | Go、worker image、compose。 |
| Frontend shell/auth removal | 3–5 | 包括 browser tests。 |
| Scenario/Graph/Context | 8–12 | Go+frontend+tests。 |
| UDM/Hybrid | 8–12 | 业务规则复杂。 |
| Five model/result cutover | 6–10 | builders、timeseries、evidence。 |
| Legacy migration | 5–8 | 取决于历史数据质量。 |
| Hardening/release/docs | 5–8 | CI、backup、performance。 |
| 总计 | 41–64 人周 | 4–6 FTE 并行约 14–18 周。 |

> **估算边界：** 估算假设现有 Compute API、worker、simulation_core 和大部分页面可复用。若要求同步完成 Desktop 重构、NewSystem JWT 或完整 Ontology 写回，应另增计划。

# 15. 风险登记册

| 风险 | 概率/影响 | 预防 | 应对 |
| --- | --- | --- | --- |
| 前端隐性 legacy 调用遗漏 | 高/高 | route/caller matrix + network assertion + rg gate | 按页面回退 wrapper，不恢复整体 FastAPI。 |
| UDM 语义迁移偏差 | 中/高 | fixtures、version hash、old-vs-new parity | 阻断发布，保留 read-only oracle。 |
| 无鉴权误暴露 | 中/高 | loopback default + startup guard | 立即停止服务、切 static token。 |
| 历史数据质量差 | 高/中 | dry-run、warnings、imported history | 不强制标准化，不可转换只读。 |
| Worker 镜像过大/启动慢 | 中/中 | wheel cache、多阶段镜像、warm tests | 拆 CPU/GPU image profile。 |
| 跨域直接查 NewSystem 表 | 中/高 | ADR、external refs、context provider | 代码审查阻断，改 API/snapshot。 |
| 范围膨胀到 IAM/报表/工作流 | 高/中 | 需求边界和 out-of-scope | 转 NewSystem backlog。 |
| 同时大改 contracts/algorithm/UI | 中/高 | 小 PR、先 fixture 后 consumer | 回滚到上一 contract version。 |

# 16. DoR / DoD

## 16.1 Definition of Ready

- 需求有 ID、优先级、验收标准和 owner。
- 跨边界变更已判断是否需要 JSON Schema。
- 数据库变更有 migration、索引和 rollback 策略。
- 页面迁移已列出 legacy caller 与 Go target。
- 算法变更有 fixture、容差和 baseline。
## 16.2 Definition of Done

- 代码、测试、OpenAPI/client、docs/.ai/changes 同步更新。
- 单元、类型、contract、boundary audit 通过。
- P0 流程有 live backend/browser 证据。
- 无新增 FastAPI/legacy client runtime dependency。
- 日志/错误包含 trace_id，敏感数据未泄漏。
- migration 在临时 PostgreSQL 上验证。
- 回滚和兼容影响已记录。
# 17. NewSystem 后续集成预留

本计划只做集成就绪，不做真实登录。由于两边均为 PostgreSQL，可共享基础设施，但不应因此跳过 API/事件边界。

| 扩展点 | 本期产物 | 未来实现 |
| --- | --- | --- |
| Auth Provider | disabled/static interface | NewSystem JWT/JWKS/claims/data-scope。 |
| Context Provider | standalone fixtures + context_snapshot | 读取厂站、设备、采样点、水质上下文。 |
| External Refs | source_system/type/id | 映射 NewSystem Ontology object IDs。 |
| Domain Events | job event/outbox-ready envelope | 通知、报表、审批、Agent 消费。 |
| Frontend Shell | feature routes/components 可独立挂载 | 嵌入 NewSystem 菜单、布局、权限。 |
| Artifact | 稳定 artifact_id/checksum API | NewSystem File Center 建 external binding。 |

# 18. 启动后十个工作日执行清单

| 工作日 | 行动 | 输出 |
| --- | --- | --- |
| D1 | 冻结 branch、运行全部现有 gate、保存 evidence | baseline report |
| D2 | 完成 route/caller/data migration matrix | migration matrix v1 |
| D3 | 评审 auth/provider、DB schema、standalone compose ADR | 3–5 个 ADR |
| D4 | 实现 AuthMode config 与接口骨架 | PR-01 draft |
| D5 | DisabledProvider + Go tests + remote guard | PR-01 ready |
| D6 | worker optional token 与 no-auth API loop | worker tests |
| D7 | standalone compose minimal profile | PR-02 draft |
| D8 | frontend runtime config 与 route guard removal | PR-03 draft |
| D9 | live browser 去掉 /users/me mock | standalone alpha smoke |
| D10 | 里程碑评审、修订 backlog、进入 Scenario/Graph 实现 | M1 review package |
