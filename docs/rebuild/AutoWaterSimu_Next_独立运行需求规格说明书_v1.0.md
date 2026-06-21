# AutoWaterSimu Next 独立运行需求规格说明书

**PostgreSQL / Go API / Python Worker / React Web，当前阶段无登录与鉴权**

- 版本：v1.0
- 日期：2026-06-21
- 状态：评审基线
- 架构边界：NewSystem 负责平台与业务上下文；AutoWaterSimu Next 负责 Simulation & Decision Intelligence 域

# 文档控制

| 项目 | 内容 |
| --- | --- |
| 文档目的 | 定义 AutoWaterSimu Next 脱离 FastAPI 后的独立产品范围、功能需求、数据与接口要求、验收标准，以及未来接入 NewSystem 的兼容边界。 |
| 适用对象 | 产品负责人、架构师、Go/Python/前端工程师、测试工程师、算法与水务模型工程师、NewSystem 集成工程师。 |
| 目标分支 | endearqb/AutoWaterSimu：codex/autowatersimu-next-rebuild。 |
| 数据库基线 | PostgreSQL。NewSystem 与 AutoWaterSimu Next 均采用 PostgreSQL，但本阶段保持独立数据库或独立 schema 所有权。 |
| 认证基线 | 当前阶段 AUTH_MODE=disabled：浏览器、API 与 worker 闭环无需登录或 Bearer Token；未来通过 provider/adapter 接入 NewSystem。 |
| 运行基线 | FastAPI 不参与启动、调试、业务请求、数据库写入或计算执行；仅可作为迁移期离线对比 oracle。 |

# 目录

- 1. 引言与目标
- 2. 产品定位与系统边界
- 3. 总体架构与运行模式
- 4. 用户角色与核心用例
- 5. 功能需求
- 6. 数据与 PostgreSQL 要求
- 7. API、合同与事件要求
- 8. 前端需求
- 9. 非功能需求
- 10. 无鉴权阶段的安全约束
- 11. 验收标准与发布门槛
- 12. 优先级与版本范围
- 13. 风险、假设与待决策项
- 附录 A：环境变量
- 附录 B：本地启动与调试
- 附录 C：编制依据

# 1. 引言与目标

## 1.1 背景

AutoWaterSimu 现有仓库同时保留 legacy FastAPI/React 基线与 AutoWaterSimu Next 能力。Next 已形成版本化 Contracts、Go Compute API、Python Simulation Worker、simulation_core、模型治理、artifact 与 evidence 等计算平台能力，但 Web 运行时仍存在 legacy 登录守卫、用户接口、FastAPI client 以及部分 flowchart/UDM CRUD 依赖。

NewSystem 已迁移到 PostgreSQL，并将承担 IAM、组织、厂站、设备、采样点、水质、文件、通知、流程与报表等平台能力和业务上下文。AutoWaterSimu Next 不再建设第二套平台底座，而作为可独立运行、后续可嵌入 NewSystem 的 Simulation & Decision Intelligence 域。

> **本阶段核心目标：** 先完成“无 FastAPI、无登录、无鉴权”的独立开发闭环。认证授权与 NewSystem 业务上下文接入属于后续集成阶段，但本阶段必须预留稳定扩展点。

## 1.2 产品目标

- 一条命令启动 React Web、Go API、PostgreSQL 与 Python Worker；默认不启动 FastAPI。
- 浏览器直接进入仿真工作台，不出现登录、注册、找回密码、用户管理或 /users/me 请求。
- 所有仿真 HTTP、数据库元数据、模型库、流程图、任务、结果和 artifact 由 Go API 统一拥有。
- Python Worker 仅执行 compute_job.v1，使用 simulation_core 与 contracts，不读取或写入业务数据库。
- 完整支持 Material Balance、ASM1Slim、ASM1、ASM3、UDM 及混合 UDM 的创建、校验、运行和结果查看。
- 以 PostgreSQL 保存可查询元数据，以本地文件或 MinIO/S3 保存大结果，保证任务可复现和证据可追踪。
- 通过 auth provider、context provider、external refs、context snapshot 和 domain event 预留 NewSystem 接入能力。
## 1.3 成功定义

| 编号 | 成功条件 | 可验证结果 |
| --- | --- | --- |
| S-01 | FastAPI 零运行依赖 | 停止或删除 backend 容器后，Web 提交 Material Balance、ASM1Slim、ASM1、ASM3、UDM 均可完成。 |
| S-02 | 零登录依赖 | 清空 localStorage 后访问根路由仍能进入工作台；网络请求中不存在 login、users/me 或 legacy API。 |
| S-03 | 独立持久化 | 重启 API、worker、frontend 后，scenario、flowchart、UDM model、job、result、artifact 元数据仍存在。 |
| S-04 | 一键闭环 | 执行 standalone compose 命令后，health/readiness 全绿，并可从浏览器完成创建—运行—结果—证据包流程。 |
| S-05 | 计算等价 | 选定 golden scenarios 与现有可信基线在既定模型容差内一致。 |
| S-06 | 未来可接入 | 切换 auth/context provider 不要求修改 compute contracts、worker 或历史仿真表结构。 |

## 1.4 范围

### 本期范围

- Standalone Web：仿真场景、流程图、模型配置、运行任务、结果分析、artifact/evidence。
- Go API：计算编排、领域 CRUD、PostgreSQL migration、开发期无鉴权模式、OpenAPI。
- Python Worker：五类 job type、artifact 输出、API loop、可诊断执行。
- Contracts 与 simulation_core：作为跨运行时和科学计算 source of truth。
- legacy 数据迁移：flowcharts、UDM models/versions/hybrid configs、可转换 job history。
- FastAPI 只读对比与最终退出。
### 本期不建设

- 用户注册、登录、密码、角色、权限、组织、数据范围。
- NewSystem 厂站、设备、采样点、水质记录的主数据 CRUD。
- 审批、通知、文件中心、企业报表等 NewSystem 平台能力。
- 自动下发 SCADA/PLC 控制指令或生产动作。
- 大规模微服务拆分、Kafka 等强制基础设施。
- 把 Desktop 发布阻塞到 Web 独立运行里程碑；Desktop 保持兼容但单独验收。
## 1.5 术语

| 术语 | 定义 |
| --- | --- |
| Standalone | AutoWaterSimu Next 在无 FastAPI、无 NewSystem、无用户登录的条件下独立启动、调试和完成仿真。 |
| CanvasGraph | 前端画布编辑状态，含布局和 UI 信息，不直接作为 worker 输入。 |
| ProcessGraph | 规范化的工艺拓扑、端口、模型绑定和单位语义。 |
| SimulationInput | 已解析、归一化、快照化并可由 worker 执行的输入。 |
| Scenario | 组织 CanvasGraph、ProcessGraph、SimulationInput、模型绑定与多次运行的业务容器。 |
| Context Snapshot | 仿真启动时对外部厂站、设备、水质等业务上下文的不可变快照。 |
| Artifact | 时序、图表数据、日志或大结果文件；数据库只保存元数据和 checksum。 |
| Evidence Package | 将 job、model_run、artifact、风险和治理信息关联起来的可审计结果包。 |
| Auth Provider | 认证/授权实现抽象；本期为 disabled，未来为 NewSystem JWT。 |

# 2. 产品定位与系统边界

## 2.1 领域所有权

| 能力/数据 | NewSystem 所有权 | AutoWaterSimu Next 所有权 | Standalone 处理 |
| --- | --- | --- | --- |
| IAM / 用户 / 组织 / 权限 | 是 | 否 | 不提供登录；使用固定开发 actor。 |
| 厂站、工艺单元、设备、采样点 | 是 | 仅保存 external ref 与执行快照 | 使用内置 fixture、JSON 导入或手工 metadata。 |
| 水质、运行记录、药剂、能耗原始业务数据 | 是 | 仅消费选定数据并快照 | 用户手工输入或导入测试数据。 |
| Scenario / CanvasGraph / ProcessGraph | 可提供入口与关联 | 是 | 完整 CRUD、版本与导入导出。 |
| SimulationInput / Compute Job / Worker | 调用方 | 是 | 完整运行。 |
| UDM 模型库、版本、模板、Hybrid 配置 | 可查询或展示 | 是 | 完整维护与校验。 |
| ModelRun / Artifact / Evidence / Benchmark | 消费结果 | 是 | 完整维护与查询。 |
| 审批、通知、企业报表、业务动作 | 是 | 只输出可供审批的结果与事件 | 不自动执行生产动作。 |

## 2.2 边界原则

- AutoWaterSimu Next 必须可以在 NewSystem 不可用时运行本地仿真；这要求外部业务上下文全部通过引用与快照进入，而不是实时跨库 JOIN。
- NewSystem 与 AutoWaterSimu Next 即使运行在同一 PostgreSQL 集群，也应使用独立 database 或 schema，并保持迁移与表所有权独立。
- worker 不拥有 HTTP 路由、用户会话或数据库写入；Go API 不实现 ODE、torch、numpy、scipy 科学计算。
- Contracts 只承载跨运行时长期接口；Go-only CRUD DTO 可留在 OpenAPI，避免把 UI 临时字段写入 worker 合同。
- 历史仿真必须绑定模型版本、参数 hash、输入 hash、上下文快照与 artifact checksum，防止外部主数据变化后结果失真。
## 2.3 FastAPI 的最终定位

FastAPI 在迁移期只允许承担两类职责：离线旧结果对比和遗留数据读取。它不得参与 Next Web 的登录、flowchart CRUD、计算创建、状态查询、result/timeseries、UDM 编辑或统计。最终独立发布物不得包含 FastAPI 容器、FastAPI 环境变量或运行时健康检查。

# 3. 总体架构与运行模式

## 3.1 目标架构

```text
Browser / React Web
        | HTTP (no auth in standalone)
        v
Go Simulation API
  |-- Scenario / Graph / UDM CRUD
  |-- Compute job & worker lifecycle
  |-- Model governance / evidence
  |-- PostgreSQL metadata
  |-- Local FS or MinIO/S3 artifacts
        ^
        | worker protocol
Python Simulation Worker
        |
        +-- contracts package
        +-- simulation_core package

FastAPI: not started; optional offline comparison only
```

## 3.2 运行模式

| 模式 | 用途 | 认证 | 上下文 | 存储 |
| --- | --- | --- | --- | --- |
| standalone-minimal | 日常开发、算法调试、CI | disabled | fixture / manual | PostgreSQL + local FS |
| standalone-full | 完整 Web 验收、artifact 生命周期 | disabled | fixture / import | PostgreSQL + MinIO/S3 |
| static-token-test | 保留现有 scope 与安全回归 | static_token | fixture | PostgreSQL + MinIO/S3 |
| newsystem-integrated（未来） | 嵌入 NewSystem | newsystem_jwt | NewSystem context provider | 独立 schema/DB + object storage |

## 3.3 无鉴权模式设计

API 必须通过统一 PrincipalProvider/Authorizer 抽象获得调用方。disabled 模式不得在每个 handler 中散落“跳过鉴权”条件，而应返回一个确定的 standalone principal，并让现有 scope 检查继续通过。未来 NewSystem JWT provider 替换实现时，handler、service、store 和 contracts 不变。

```text
COMPUTE_API_AUTH_MODE=disabled        # disabled | static_token | newsystem_jwt
COMPUTE_API_BIND_ADDR=127.0.0.1
COMPUTE_API_ALLOW_REMOTE_NO_AUTH=false

standalone principal:
  actor_id: standalone:developer
  display_name: Standalone Developer
  authorization: allow all AutoWaterSimu scopes
  tenant/project/site: empty unless supplied by request context
```

> **防误用：** AUTH_MODE=disabled 时默认只监听 loopback。若监听非 loopback 地址，除非显式设置 ALLOW_REMOTE_NO_AUTH=true，否则 API 必须拒绝启动并输出高可见度警告。

## 3.4 独立部署组成

| 组件 | 必须性 | 开发方式 | 发布方式 |
| --- | --- | --- | --- |
| PostgreSQL | 必需 | Docker Compose | 独立数据库或 simulation schema |
| Go API | 必需 | go run / 热重载可选 | 多阶段构建静态/精简镜像 |
| Python Worker | 必需 | 独立 venv / source mode | 预装 wheel 的镜像；禁止启动时 pip install |
| React Web | 必需 | Vite | 静态构建 + Nginx 或由 NewSystem 嵌入 |
| MinIO | 可选 | full profile | S3-compatible object storage |
| FastAPI | 禁止作为运行依赖 | 仅离线 parity | 不进入发布包 |

# 4. 用户角色与核心用例

| 角色 | 本阶段目标 | 主要用例 |
| --- | --- | --- |
| 仿真工程师 | 无需登录直接使用 | 创建场景、绘制流程、配置模型、运行、比较结果。 |
| 模型工程师 | 维护 UDM/参数/benchmark | 创建模型版本、校验方程、配置 Hybrid、运行基准。 |
| 开发工程师 | 独立调试各进程 | 启动 API/worker/frontend、提交 fixture、查看 trace 与 artifact。 |
| 测试工程师 | 执行可重复验收 | 重置数据库、导入 seed、运行 golden/browser/live smoke。 |
| NewSystem 集成工程师（未来） | 接入而不改计算内核 | 配置 JWT/context provider、消费事件与证据。 |

# 5. 功能需求

## 5.1 独立启动与诊断

| 需求编号 | 优先级 | 需求说明 | 验收方式 |
| --- | --- | --- | --- |
| FR-RUN-001 | P0 | 提供不包含 backend/FastAPI service 的 standalone Compose 文件。 | compose config 中不存在 FastAPI；down backend 后 smoke 仍通过。 |
| FR-RUN-002 | P0 | 提供一条命令启动 PostgreSQL、Go API、worker、frontend。 | just standalone-up 或等价命令成功。 |
| FR-RUN-003 | P0 | 提供 healthz、readyz、version、capabilities。 | 浏览器/脚本可获取 API、DB、artifact、worker capability 状态。 |
| FR-RUN-004 | P0 | API 启动时可自动应用 migration；发布模式可关闭自动迁移并使用独立 migrate 命令。 | 空库启动建表；migration check 可检测缺失版本。 |
| FR-RUN-005 | P0 | worker 镜像必须预装 scientific dependencies 与本地 packages。 | 断网启动不执行 pip install；self-check 成功。 |
| FR-RUN-006 | P0 | Go API 不依赖仓库根目录探测才能运行。 | 发布镜像仅携带 contract bundle 仍能启动。 |
| FR-RUN-007 | P0 | 提供 seed、reset、logs、doctor、smoke 命令。 | 新开发机按文档完成重置与首个 job。 |
| FR-RUN-008 | P1 | 支持 minimal 和 full artifact profile。 | local FS 与 MinIO 两种 profile 均可完成 artifact 下载。 |

## 5.2 登录与鉴权关闭

| 需求编号 | 优先级 | 需求说明 | 验收方式 |
| --- | --- | --- | --- |
| FR-AUTH-001 | P0 | 默认 AUTH_MODE=disabled，所有 Web API 不要求 Authorization header。 | curl 无 header 可创建和读取 job。 |
| FR-AUTH-002 | P0 | worker token 在 disabled 模式为可选；客户端不得发送空 Bearer header。 | worker 无 token 完成 register/claim/complete。 |
| FR-AUTH-003 | P0 | 前端移除登录守卫和自动重定向。 | localStorage 为空访问受保护页面不跳转 /login。 |
| FR-AUTH-004 | P0 | standalone build 不调用 LoginService、UsersService、/users/me。 | Playwright network assertion + rg gate。 |
| FR-AUTH-005 | P0 | UI 隐藏登录、注册、找回密码、用户设置与用户管理入口。 | route/menu 快照中不存在相关入口。 |
| FR-AUTH-006 | P1 | 保留 static_token 模式用于现有 scope/security tests。 | security smoke 在 static_token profile 继续通过。 |
| FR-AUTH-007 | P1 | 定义 NewSystem JWT provider 接口与 claims 映射，但本期不实现在线登录。 | 接口、配置和 ADR 落地，无业务 handler 耦合。 |

## 5.3 Scenario 与工作空间

| 需求编号 | 优先级 | 需求说明 |
| --- | --- | --- |
| FR-SCN-001 | P0 | 用户可创建、读取、更新、复制、归档和删除草稿 Scenario。 |
| FR-SCN-002 | P0 | Scenario 可关联 CanvasGraph、已发布 ProcessGraph、SimulationInput、UDM/参数版本及多次 job。 |
| FR-SCN-003 | P0 | Scenario 必须有名称、描述、模型族、状态、版本、created_at/updated_at。 |
| FR-SCN-004 | P0 | Scenario 复制必须生成新 ID，但保留 source_scenario_id 和可选 graph/model 快照。 |
| FR-SCN-005 | P1 | 支持 Scenario JSON package 导入导出和 checksum 校验。 |
| FR-SCN-006 | P1 | 支持两次或多次 run 的参数与结果对比。 |

## 5.4 CanvasGraph 与 ProcessGraph

| 需求编号 | 优先级 | 需求说明 |
| --- | --- | --- |
| FR-GRAPH-001 | P0 | 保存 React Flow 画布状态为 canvas_graph.v1，不把 UI layout 直接提交给 worker。 |
| FR-GRAPH-002 | P0 | 提供 CanvasGraph CRUD、自动保存、手工保存、版本和导入导出。 |
| FR-GRAPH-003 | P0 | 提供 CanvasGraph → ProcessGraph 的显式发布/转换动作和结构化校验结果。 |
| FR-GRAPH-004 | P0 | ProcessGraph 版本不可原地覆盖；修改后生成新 version。 |
| FR-GRAPH-005 | P0 | Material Balance 支持 ProcessGraph → SimulationInput 自动解析。 |
| FR-GRAPH-006 | P0 | ASM/UDM 在自动解析语义未完全稳定前，使用明确的 SimulationInput builder，不伪装为通用 graph resolver。 |
| FR-GRAPH-007 | P1 | ProcessGraph 校验覆盖节点/端口、连通性、流量、单位、component schema、模型绑定和变量映射。 |

## 5.5 模型与 UDM

| 需求编号 | 优先级 | 需求说明 |
| --- | --- | --- |
| FR-MDL-001 | P0 | 内置支持 simulation.material_balance.v1、asm1slim.v1、asm1.v1、asm3.v1、udm.v1。 |
| FR-MDL-002 | P0 | Go API 提供模型目录读取、模型/版本/参数模板与默认参数集的持久化和查询。 |
| FR-MDL-003 | P0 | UDM 模型库支持模型草稿、不可变版本、模板创建、复制、校验、发布状态。 |
| FR-MDL-004 | P0 | UDM 校验包含变量、组分、化学计量、速率方程、参数引用、边界条件和单位一致性。 |
| FR-MDL-005 | P0 | Hybrid UDM 配置支持多个模型映射、节点绑定、变量 binding 和运行前严格校验。 |
| FR-MDL-006 | P0 | model_run.parameter_hash 对 ASM/UDM 必须包含节点参数、UDM snapshot 与 variable bindings。 |
| FR-MDL-007 | P1 | 提供 benchmark case/run、质量指标、容差、evidence refs 与参数晋升计划。 |

## 5.6 业务上下文与快照

| 需求编号 | 优先级 | 需求说明 |
| --- | --- | --- |
| FR-CTX-001 | P0 | Scenario/SimulationRequest 可携带 site_ref、process_unit_refs、equipment_refs、sampling_point_refs 和 source_record_refs。 |
| FR-CTX-002 | P0 | Standalone 模式允许上述引用为空，并支持 fixture、JSON 导入或手工 metadata。 |
| FR-CTX-003 | P0 | 提交仿真时生成不可变 context_snapshot，记录 source_system、captured_at、checksum 和原始关键字段。 |
| FR-CTX-004 | P0 | 外部上下文变化不得修改历史 SimulationInput、ComputeJob 或 ModelRun。 |
| FR-CTX-005 | P1 | 提供 ContextProvider 接口：standalone fixture provider 与 future NewSystem provider 使用同一输出模型。 |
| FR-CTX-006 | P2 | NewSystem 集成后通过 API/事件获取上下文，不要求 worker 查询 NewSystem 数据库。 |

## 5.7 仿真准备与提交

| 需求编号 | 优先级 | 需求说明 |
| --- | --- | --- |
| FR-SIM-001 | P0 | 提交前生成 schema-valid simulation_request.v1 与 simulation_input.v1。 |
| FR-SIM-002 | P0 | 提供 validate-only，不创建 job 即可返回 errors/warnings。 |
| FR-SIM-003 | P0 | 创建 job 支持 idempotency_key；重复相同请求复用，内容冲突返回 IDENTITY/IDEMPOTENCY 冲突。 |
| FR-SIM-004 | P0 | job context 保存 source_system、requested_by、trace_id、scenario_id 与 context_snapshot_ref。 |
| FR-SIM-005 | P0 | 每个模型页面使用独立 builder 和测试，禁止 route/component 直接拼装 generated client payload。 |
| FR-SIM-006 | P1 | 支持从历史 model_run replay，保留原 input/model/parameter identity。 |

## 5.8 Job 与 Worker 生命周期

| 需求编号 | 优先级 | 需求说明 |
| --- | --- | --- |
| FR-JOB-001 | P0 | Job 状态覆盖 queued、running、succeeded、failed、cancel_requested、cancelled、timed_out。 |
| FR-JOB-002 | P0 | API 提供列表、详情、事件、snapshot、cancel、timeout、result、evidence 等读取。 |
| FR-JOB-003 | P0 | worker 支持 register、claim、heartbeat、artifact upload、succeed/fail。 |
| FR-JOB-004 | P0 | worker claim 必须按 capability、contract version 和 lease 判定。 |
| FR-JOB-005 | P0 | worker 失败必须返回结构化 compute_result 或 contract_error，并持久化诊断。 |
| FR-JOB-006 | P0 | 同一 API 可连接一个或多个 worker；单机默认并发 1，可配置。 |
| FR-JOB-007 | P1 | 取消为 best-effort；长计算需定期检查 cancel request，无法中断时明确标记。 |
| FR-JOB-008 | P1 | 前端默认使用事件轮询；SSE/WebSocket 只有明确需要时再增加。 |

## 5.9 结果、Artifact 与证据

| 需求编号 | 优先级 | 需求说明 |
| --- | --- | --- |
| FR-RES-001 | P0 | 结果页显示状态、摘要、质量、warnings、timings、model runs、风险结论。 |
| FR-RES-002 | P0 | 小结果可内联；大结果必须写 artifact 并保存 size/checksum/content_type。 |
| FR-RES-003 | P0 | 提供 time-series 下载和分页/切片读取适配，避免将超大 JSON 全量塞入数据库。 |
| FR-RES-004 | P0 | artifact 下载必须校验 metadata 与实际 checksum。 |
| FR-RES-005 | P0 | evidence package 可解析 job、input、process graph、model run、artifact、risk finding 引用。 |
| FR-RES-006 | P1 | 支持 run-to-run 结果比较与参数差异展示。 |
| FR-RES-007 | P1 | 支持 retention dry-run、archive 和 delete，但被 evidence/model_run 引用的 artifact 不可误删。 |

## 5.10 模型治理与决策智能边界

| 需求编号 | 优先级 | 需求说明 |
| --- | --- | --- |
| FR-GOV-001 | P1 | 模型目录、默认参数集、benchmark run、model run 和 readiness 形成只读治理链。 |
| FR-GOV-002 | P1 | result_explanation 必须引用 evidence_refs，支持 submit/review/publish 审计状态。 |
| FR-GOV-003 | P1 | production_readiness 只判断“可提交外部审批”，不得代表已批准生产执行。 |
| FR-GOV-004 | P2 | Agent draft/constraint draft 仅在显式确认后可晋升为 simulation check，不允许直接写生产对象。 |
| FR-GOV-005 | P2 | 未来 Recommendation/Approval 属于 NewSystem；AutoWaterSimu 输出 evidence 与建议，不直接执行。 |

## 5.11 开发与调试工具

| 需求编号 | 优先级 | 需求说明 |
| --- | --- | --- |
| FR-DEV-001 | P0 | 提供 OpenAPI、contract validation、worker self-check 和 capability 页面/命令。 |
| FR-DEV-002 | P0 | 提供每个 job type 的 valid fixture 与一键提交脚本。 |
| FR-DEV-003 | P0 | 所有进程日志输出 trace_id、job_id、scenario_id；不得输出敏感参数全文。 |
| FR-DEV-004 | P0 | 提供 PostgreSQL migration up/check/down smoke。 |
| FR-DEV-005 | P0 | 提供 standalone runtime dependency audit，禁止 Next runtime 依赖 backend/app、legacy client 或 /users/me。 |
| FR-DEV-006 | P1 | 提供开发数据 seed 与 deterministic golden scenario。 |

## 5.12 遗留数据迁移

| 需求编号 | 优先级 | 需求说明 |
| --- | --- | --- |
| FR-MIG-001 | P1 | 独立 migration CLI 支持 --dry-run、--resume、--verify-only、--only、--batch-size。 |
| FR-MIG-002 | P1 | 迁移 flowcharts、UDM models/versions、hybrid configs 和可转换 job history。 |
| FR-MIG-003 | P1 | users/password/items 不迁入 AutoWaterSimu；owner 保留 legacy_actor_ref。 |
| FR-MIG-004 | P1 | 不可可靠转换的 job 保存为 imported_legacy_history，不伪装为可重跑标准 job。 |
| FR-MIG-005 | P1 | 所有迁移目标保存 legacy_source_table/id/hash/imported_at，并保证幂等。 |
| FR-MIG-006 | P1 | 验证包含行数、引用、hash、样本 API 读取和 selected golden comparison。 |

# 6. 数据与 PostgreSQL 要求

## 6.1 数据库所有权

建议 AutoWaterSimu Next 使用独立数据库 autowatersimu_next；若与 NewSystem 共用 PostgreSQL database，则所有表进入 simulation schema。NewSystem 模块不得直接写 simulation schema，worker 也不得直连数据库。跨域关联使用 UUID/text external refs、context snapshots、API 与事件。

## 6.2 核心表建议

| 表/聚合 | 用途 | 关键要求 |
| --- | --- | --- |
| simulation_scenarios | 场景根对象 | 版本、状态、model_family、context_snapshot_id。 |
| canvas_graphs | UI 画布 JSONB | graph_id/version/checksum/source。 |
| process_graphs | 规范化拓扑 JSONB | immutable version、validation status。 |
| simulation_inputs | 可执行输入 JSONB | job_type、input_hash、source refs。 |
| context_snapshots | 外部上下文快照 | source_system、refs、snapshot、checksum。 |
| compute_jobs / compute_job_events | 任务与事件 | idempotency、lease、status、trace。 |
| workers | worker 注册与心跳 | capabilities、contract versions、lease。 |
| artifacts | 文件元数据 | provider/key/size/checksum/retention。 |
| udm_models / udm_model_versions | UDM 库与不可变版本 | definition_hash、status、snapshot。 |
| udm_hybrid_configs | Hybrid 映射 | model versions、bindings、validation。 |
| model_catalog_snapshots | 治理目录快照 | scope、catalog hash、default parameter sets。 |
| model_runs / benchmark_runs | 运行身份与基准历史 | parameter/input hash、metrics、evidence refs。 |
| draft_confirmations / result_explanations | 决策智能审计 | 状态机、evidence refs、actor ref。 |
| imported_legacy_history | 不可转换历史 | original payload/result、warnings、source hash。 |
| mutation_audit_events | 关键非 job mutation 审计 | actor、before/after summary、trace。 |

## 6.3 PostgreSQL 设计约束

- 主键统一使用 UUID/ULID 或稳定字符串 ID；API 不暴露自增序号作为跨系统标识。
- 时间字段使用 timestamptz，服务端统一存 UTC。
- 核心检索列使用普通字段；合同快照、动态模型与结果摘要使用 JSONB。
- 为 status/created_at、scenario_id、job_id、model_key/version、legacy_source、external refs 建立索引。
- 不可变版本表禁止 UPDATE 内容；修改创建新 version。
- job 创建、事件追加、状态迁移在事务内完成；artifact 文件写入与 metadata 提交采用 checksum + 幂等补偿。
- migration 必须前向兼容，破坏性变更采用 expand-migrate-contract。
- 数据库连接池、statement timeout、lock timeout 和慢 SQL 记录必须可配置。
## 6.4 数据保留与备份

| 对象 | 默认策略 | 备注 |
| --- | --- | --- |
| Scenario/Graph/Model | 长期保留，逻辑归档 | 版本化对象不物理覆盖。 |
| Job/Event/ModelRun | 长期保留或按项目策略 | 是结果可追溯基础。 |
| Artifact | 按 retention_policy | archive/delete 前检查 evidence 引用。 |
| Imported history | 只读长期保留 | 可单独冷存。 |
| 开发 seed | 可重建 | 不得混入正式数据。 |

# 7. API、合同与事件要求

## 7.1 Canonical Compute API

现有 /api/v1/compute/jobs、process-graphs、simulation-inputs、simulation-checks、artifacts、contracts、model-catalog、model-runs、benchmark-runs、workers 继续作为 canonical compute 生命周期接口。新增 CRUD 不应复制 FastAPI BackgroundTasks 或旧 *Job 模型。

## 7.2 新增或补齐的 Platform-free Simulation API

| 资源 | 建议路径 | 说明 |
| --- | --- | --- |
| Runtime | /api/v1/system/runtime、/capabilities、/version | 显示 auth/storage/context/worker capability。 |
| Scenarios | /api/v1/scenarios[/{id}] | 场景 CRUD、clone、archive、runs。 |
| CanvasGraphs | /api/v1/canvas-graphs[/{id}] | 画布 CRUD、version、publish。 |
| UDM Models | /api/v1/udm/models[/{id}] | 模型库、版本、模板。 |
| UDM Validation | /api/v1/udm/validate | 纯校验，不持久化。 |
| Hybrid Configs | /api/v1/udm/hybrid-configs[/{id}] | 配置 CRUD 与 strict validate。 |
| Context Snapshots | /api/v1/context-snapshots[/{id}] | standalone fixture/import 与未来 provider 输出。 |
| Result adapters | /api/v1/compute/jobs/{id}/timeseries | 必要时提供分页/切片 compatibility read。 |

## 7.3 合同要求

- compute_job.v1、simulation_input.v1、simulation_request.v1、compute_result.v1、artifact.v1、model_run.v1 为 worker 跨边界 source of truth。
- canvas_graph.v1 与 process_graph.v1 分离；UI-only 字段不得进入 SimulationInput。
- 合同变更必须更新 registry、valid/invalid fixtures、tests、OpenAPI/client 和所有 consumers。
- 新增 NewSystem context contract 前先判断是否真正跨运行时；简单 Go CRUD DTO 留在 OpenAPI。
- 所有错误映射 contract_error.v1 语义：error_code、message、details、retryable、trace_id。
## 7.4 未来事件

| 事件 | 生产者 | 未来消费者 | 本期要求 |
| --- | --- | --- | --- |
| simulation.requested | Go API | NewSystem | 先形成内部 outbox-ready envelope。 |
| simulation.started | Go API/worker lifecycle | NewSystem/通知 | 记录 job event。 |
| simulation.succeeded/failed/cancelled | Go API | NewSystem/报表 | 记录 job event 与 trace。 |
| simulation.evidence_ready | Go API | NewSystem Ontology/审批 | evidence package 可稳定读取。 |
| simulation.recommendation_created | 未来 Agent | NewSystem Workflow | 不在本期自动触发。 |

# 8. 前端需求

## 8.1 页面范围

| 页面/功能 | 优先级 | 要求 |
| --- | --- | --- |
| Standalone 首页/运行状态 | P0 | 显示 API、DB、worker、artifact store、auth mode，不显示用户信息。 |
| Scenario 列表与详情 | P0 | 创建、复制、归档、打开最近运行。 |
| 流程图编辑器 | P0 | 保存 CanvasGraph、发布 ProcessGraph、显示校验。 |
| Material Balance / ASM / UDM 配置 | P0 | 通过 feature builders 生成 canonical request。 |
| UDM 模型编辑器与 Hybrid 配置 | P0 | 版本化、validate、template、绑定。 |
| Jobs | P0 | 列表、筛选、状态、事件、取消。 |
| Result/Evidence | P0 | 摘要、时序、artifact、model run、证据。 |
| Model Governance | P1 | catalog、parameter set、benchmark、readiness。 |
| Login/User/Admin/Items | 删除/隐藏 | 不进入 standalone route tree 与菜单。 |

## 8.2 前端边界

- generated Compute client 只能由 shared/api 与 features wrappers 使用；route/component 不直接调用 generated service。
- standalone build 中 legacy frontend/src/client 不得有 runtime import。
- 全局 401/403 handler 不得重定向 /login；disabled 模式将鉴权错误视为配置异常。
- VITE_AUTH_MODE、VITE_COMPUTE_API_URL、VITE_CONTEXT_MODE 由 runtime config 统一读取。
- browser smoke 必须明确断言未发生 /api/v1/login、/users、/users/me 请求。
# 9. 非功能需求

| 类别 | 需求 |
| --- | --- |
| 可用性 | 已构建镜像启动后 120 秒内 API ready、worker registered、Web 可访问；单一 worker 退出不得破坏已持久化 job。 |
| 性能 | 非计算 metadata API 本地 p95 < 300ms；job 创建 p95 < 500ms；大时序不全量写入主表。 |
| 可扩展性 | 可增加 worker 实例而不改变 API；默认单 worker 并发 1，可配置队列与 capability。 |
| 正确性 | 五类模型有 schema fixtures、unit tests、core-only golden hash/tolerance 与端到端 scenario。 |
| 可复现性 | 结果可追溯到 input_hash、parameter_hash、model version、context snapshot、artifact checksum。 |
| 可观测性 | 结构化日志、trace_id/job_id、Prometheus metrics、health/readiness、worker self-check。 |
| 可维护性 | Go domain/platform 不反向依赖 compute compatibility；worker 不依赖 backend/app；前端遵守 wrapper 边界。 |
| 兼容性 | static_token/security tests 保留；legacy import 仅在 migration/oracle 工具出现。 |
| 可移植性 | Windows 本地开发与 Linux 容器均支持；发布镜像不要求仓库根或 backend venv。 |
| 数据可靠性 | PostgreSQL 重启后无元数据丢失；migration、backup/restore、artifact checksum 验证可执行。 |

# 10. 无鉴权阶段的安全约束

“无需登录验证”不等于可以默认暴露到公网。Standalone 无鉴权模式仅用于本地开发、内网受控调试和 CI。

- 默认绑定 127.0.0.1；Compose 端口默认使用 127.0.0.1:hostPort:containerPort。
- 非 loopback 无鉴权启动需要显式危险开关，并在日志和 UI 显示红色警告。
- CORS 在 disabled 模式仍只允许配置的本地 origin，不使用任意 * 与 credentials 组合。
- 不提供任意文件路径下载；artifact 只能按 ID 和存储根目录解析。
- 上传和 JSON payload 设置大小限制；表达式/UDM 校验禁止任意代码执行。
- 数据库、MinIO 不对公网暴露；开发密码不得用于正式环境。
- 保留审计 actor=standalone:developer，便于未来迁移和排错。
# 11. 验收标准与发布门槛

## 11.1 P0 独立运行验收

| Gate | 验收内容 | 通过条件 |
| --- | --- | --- |
| G-01 Compose | standalone compose up/down/reset | 无 backend service；health/readiness 全绿。 |
| G-02 No Auth | 浏览器与 API 无 token | 无 login/users 请求，所有核心页面可达。 |
| G-03 Runtime Boundary | 依赖审计 | Go/worker/frontend runtime 无 FastAPI/legacy client 依赖。 |
| G-04 Model Flows | 五类模型端到端 | 提交、worker 完成、result/artifact/evidence 可读。 |
| G-05 Persistence | 重启恢复 | scenario/graph/model/job/result 元数据保持。 |
| G-06 Contracts | schema/client drift | registry、fixtures、Go tests、worker tests、TS typecheck 全绿。 |
| G-07 Browser Live | 真实 API+worker browser smoke | 不 mock /users/me，不 mock compute route。 |
| G-08 Migration | PostgreSQL migration smoke | 空库 up、check、临时库 down/rollback 验证。 |
| G-09 Golden | old/core baseline comparison | 选定模型容差内一致，无 P0/P1 divergence。 |

## 11.2 FastAPI 退出门槛

- standalone release compose、CI、开发文档和浏览器测试均不启动 FastAPI。
- rg 对 frontend runtime 的 @/client、LoginService、UsersService、legacy model services 结果为零。
- Go 已拥有 Scenario/Flowchart/UDM persistence 和所有当前 UI 所需计算读取。
- legacy migration verify 通过；旧库进入只读。
- selected golden scenarios 连续通过约定比较窗口。
- backend/ 可保留历史源码，但不进入构建、发布和运行路径。
# 12. 优先级与版本范围

| 版本 | 目标 | 范围 |
| --- | --- | --- |
| MVP / Standalone Alpha | 无登录独立启动 | Auth disabled、compose、首页、现有 compute flow、no /users/me。 |
| Standalone Beta | 功能独立 | Scenario/Graph/UDM CRUD、五模型、result/artifact、PostgreSQL 持久化。 |
| Standalone RC | FastAPI 可退出 | legacy migration、live browser、golden、backup/restore、文档。 |
| NewSystem Integration | 统一平台接入 | JWT provider、context provider、事件、NewSystem shell；不改 worker/contracts 核心。 |

# 13. 风险、假设与待决策项

| 事项 | 影响 | 建议决策 |
| --- | --- | --- |
| ASM/UDM ProcessGraph 解析语义尚未完全统一 | 错误自动转换会产生科学计算风险 | P0 使用独立 builder；语义稳定后再统一 resolver。 |
| 现有 frontend 同时包含 legacy 与 Next | 删除过早会破坏页面 | 以 runtime import audit 和 route-by-route cutover 控制。 |
| 无鉴权远程暴露 | 高风险 | 默认 loopback，非本地显式阻断。 |
| Worker 容器启动时安装依赖 | 慢且不可复现 | 构建 wheel/镜像，运行时断网。 |
| Go API 依赖 repo root 找合同 | 发布镜像脆弱 | 使用 embed 或 CONTRACTS_DIR bundle。 |
| NewSystem 与 AutoWaterSimu 同为 PostgreSQL | 容易诱发跨域直连 | 保持 schema/DB 所有权，API/event 集成。 |
| 历史 user owner 映射 | 无 IAM 阶段无法解析真实用户 | 保留 legacy_actor_ref，未来由 NewSystem crosswalk。 |
| Desktop 是否同步切换 | 可能拉长主线 | Web standalone 不被 Desktop 阻塞；合同兼容即可。 |

# 附录 A：关键环境变量

| 变量 | 默认/示例 | 说明 |
| --- | --- | --- |
| APP_ENV | development | production 时禁止 disabled auth。 |
| COMPUTE_API_AUTH_MODE | disabled | disabled | static_token | newsystem_jwt。 |
| COMPUTE_API_BIND_ADDR | 127.0.0.1 | 无鉴权默认 loopback。 |
| COMPUTE_API_ALLOW_REMOTE_NO_AUTH | false | 危险开关。 |
| COMPUTE_API_DATABASE_URL | postgres://... | AutoWaterSimu PostgreSQL。 |
| COMPUTE_API_CONTRACTS_DIR | /app/contracts | 发布包 contract bundle；或使用 embed。 |
| COMPUTE_API_ARTIFACT_PROVIDER | local_fs | local_fs | s3。 |
| COMPUTE_API_ARTIFACT_DIR | ./data/artifacts | 本地 artifact 根。 |
| SIMULATION_WORKER_API_BASE_URL | http://compute-api:8088 | worker API。 |
| SIMULATION_WORKER_API_TOKEN | 空 | disabled 模式为空；static_token 模式必填。 |
| VITE_AUTH_MODE | disabled | 前端路由与 session 模式。 |
| VITE_COMPUTE_API_URL | http://localhost:8088 | Go API 地址。 |
| VITE_CONTEXT_MODE | standalone | standalone | newsystem。 |

# 附录 B：本地启动与调试目标命令

```powershell
# 第一次
just standalone-bootstrap
just standalone-up
just standalone-status
just standalone-seed

# 分进程调试
just standalone-db
just dev-api-noauth
just dev-worker-noauth
just dev-frontend-standalone

# 验证
just standalone-smoke
just standalone-browser-smoke
just standalone-golden

# 清理
just standalone-down
just standalone-reset
```

# 附录 C：编制依据

| 来源 | 采用事实 |
| --- | --- |
| AutoWaterSimu Next branch README/current-state | Next 已并行存在 contracts、Go API、worker、simulation_core、frontend/desktop，legacy backend 为迁移基线。 |
| apps/api 与 module-map | Go API 拥有 HTTP 生命周期和 PostgreSQL metadata；worker 不直写 PostgreSQL。 |
| services/simulation-worker README | worker 已不依赖 backend/app，并支持五类 simulation job。 |
| contracts README/Technical Spec | Contracts 是跨运行时 source of truth；ProcessGraph 与 SimulationInput 分离。 |
| NewSystem 厂站核心业务/设备/核心领域模型 | 厂站、水质、设备、采样点属于 NewSystem 业务上下文；仿真只保存引用与快照。 |
| 用户最新决策 | NewSystem 已迁移 PostgreSQL；本阶段 AutoWaterSimu 无需登录和鉴权。 |
