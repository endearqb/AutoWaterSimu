# AutoWaterSimu BSM1 实现总需求、仓库审计、通用架构与实施路线 v3.1

## —— 以 UDM + Hybrid 为主线：Capability/Profile/Conformance 分层、局部状态单元、Typed Ports/Edges、事件运行时与可审计 BSM1 模型包

| 项目 | 内容 |
|---|---|
| 文档版本 | v3.1（双版本融合修订版） |
| 编制日期 | 2026-06-20 |
| 文档状态 | 基于目标分支审计与两份 v3.0 的融合定稿 |
| 融合来源 | `AutoWaterSimu_BSM1实现总需求_仓库现状_开发路线与研究议题_v3.0.md`、`AutoWaterSimu_BSM1实现总需求_v3_0.md`；共同替代 v2.0 |
| 目标仓库 | `endearqb/AutoWaterSimu` |
| 目标分支 | `codex/autowatersimu-next-rebuild` |
| 审计锚点 | `d870d82ed84de5c71ec57f35608e349923b1f778`（`Bridge legacy route component metadata`） |
| 产品北极星 | UDM 定义局部模型，Hybrid 编译器组合单元、端口、边、事件与评价；BSM1 是通用运行时上的模型包与 benchmark suite，而不是第二套专用内核 |
| 推荐落库路径 | `docs/benchmarks/bsm1/AutoWaterSimu_BSM1_UDM_Hybrid_需求与路线_v3.1.md` |
| 审计类型 | 静态代码、合同、架构文档和测试证据审计；本次未在本地重跑目标分支测试 |


---

# v3.1 融合说明：两份 v3.0 的比较结论与裁决

本版以“仓库审计、局部状态与通用 Hybrid IR 版”为主体，吸收另一份 v3.0 在 Capability/Conformance 分层、仓库近期地基归纳、单沉降核双参数化、合同八面联动、hour→day 迁移和反模式守卫方面的优点；对两份文档中互相冲突的决策做显式裁决，而不是简单拼接。

## A. 两份文档各自最强的部分

| 维度 | 融合主体版优势 | 另一份 v3.0 优势 | v3.1 处理 |
|---|---|---|---|
| 通用抽象 | 局部 StateSpec、ComponentSchema v2、Typed Ports、三种物理 Edge Domain、编译计划完整 | Capability/Profile/Conformance 三层表达更直观 | 两者合并，C/P/G 成为顶层治理结构，局部状态/端口成为 Layer C 核心 |
| BSM1 身份 | 明确 BSM1 是 model package，不是专用 runtime | 明确 BSM1 是通用能力的首个硬约束实例 | 保留 `simulation.hybrid.v1` 主入口，BSM1 仅为 package/profile/gate |
| 边与 Pump | 内部 IR 物理语义纯净，Pump lower 为 actuator + material flow | 用户侧四类边的交互和验收更直观 | 外部四种 preset，内部三种 domain；Pump 只在 UI/ProcessGraph preset 层是一条“泵边” |
| Takács | MassFluxLaw、局部状态映射、diagnostics、clean-room 更完整 | “单一 kernel + research/reference 双参数化”原则更鲜明 | 强制同一 kernel；reference 是对 research 能力的收紧参数化，不得 fork |
| 合同与治理 | `process_graph.v2 + simulation_input.v2 + simulation.hybrid.v1` 更通用，artifact 不按 BSM1 过度分叉 | 合同变更八面协调矩阵更可执行 | 保留通用 v2 合同，并把八面矩阵设为每个 schema PR 的强制清单 |
| 时间与数值 | plan-wide canonical time、显式 execution profile、solver registry 更通用 | hour→day 三步迁移和 clamp CI 守卫更具体 | BSM1 canonical time=day；旧 job=hour；只在 compiler/adapter 边界转换，新增静态守卫 |
| 路线与 DoD | phase/PR/test/evidence 粒度更完整 | 非 BSM1 通用能力 DoD 和工期表达更清楚 | 补入脱离 BSM1 的四类 capability 回归和参考工期 |

## B. 冲突裁决

| 冲突点 | 采用结论 | 理由 |
|---|---|---|
| `simulation.bsm1.v1` vs `simulation.hybrid.v1` | **采用 `simulation.hybrid.v1`** | 避免把 BSM1 变成第二套专用执行内核；可选 BSM1 alias 只能 lower 到同一 plan |
| `typed_simulation_input.v1` vs `process_graph.v2 + simulation_input.v2` | **采用 v2 通用合同** | 新语义改变节点、端口、状态和边，明确 major schema version 比平行命名更可维护 |
| 四类基础边 vs 三种基础 domain | **用户可见四 preset、内部三 domain** | Hydraulic/Pump/Settling/Signal 适合建模交互；transport 物理上归一为 material_flow/mass_flux/signal |
| Pump 是否基础物理边 | **不是** | Pump 有离散状态、命令、限幅、速率和能耗，必须 lower 为 actuator + controlled flow |
| typed runtime 是否进入 legacy backend validator | **不进入主实现** | legacy `hybrid_udm_validation.py` 只保留兼容 adapter；新 compiler/runtime 唯一落在 `simulation_core` |
| typed runtime 是否统一 day | **plan 显式 canonical unit；BSM1=day** | 通用模型不应被 BSM1 时间单位绑死；旧 hour job 继续兼容 |
| BSM1 专有结果是否全部公共合同化 | **否** | 稳定跨组件交换的报告合同化；大时序/clarifier/controller 细节优先作为通用 artifact payload |
| reference/research 是否两套 settling 实现 | **禁止** | 必须同一 MassFluxLaw kernel、不同 profile/parameter resolver |

## C. v3.1 新增强制项

1. 建立 Layer C（Capability）→ Layer P（Profile/Constraint）→ Layer G（Conformance Gate）三层治理；
2. 对外保留 `hydraulic/pump/settling/signal` 四种建模 preset，对内只保留 `material_flow/mass_flux/signal` 三种物理 domain；
3. Takács 只允许一个 kernel，支持 research 与 reference 两种受治理参数化；
4. 每个新合同必须同步 Go、Worker、Frontend、Desktop、OpenAPI、examples、tests、README/registry 八个面；
5. typed runtime 的 hour/day 转换只能发生在 compiler/adapter 边界；
6. CI 增加 RHS 原地 clamp、散落 `/24`、typed runtime 双实现三类反模式守卫；
7. 通用 capability 必须用非 BSM1 图独立验收，不能只靠 BSM1 全厂用例证明；
8. 仓库内外 Takács 原型均进入许可、来源和 clean-room 决策记录。

---

# 0. 执行摘要与强制架构决策

## 0.1 一句话结论

> **AutoWaterSimu 不应新增一套 `simulation.bsm1.v1` 专用物理运行时；应新增通用 `simulation.hybrid.v1` 执行能力，由 UDM 模型、局部状态单元、Typed Ports/Edges、代数水力约束、事件调度器和评价 profile 共同编译成统一执行计划。BSM1 仅作为首个完整、可验证、可治理的行业模型包。**

这一决策既保留 v2.0 的科学目标，也纠正其可能形成“UDM/Hybrid 一套、BSM1 专用 runtime 又一套”的架构分叉。

## 0.2 v3.1 的十二项强制决策

| ID | 决策 | v3.1 结论 |
|---|---|---|
| A-01 | BSM1 的产品身份 | BSM1 是 `model package + composite templates + forcing/control/evaluation profiles + benchmark cases`，不是核心代码中的特殊分支 |
| A-02 | 新执行入口 | 新增通用 `simulation.hybrid.v1`；现有五类 job type 保持兼容，不以 `simulation.bsm1.v1` 作为主路径 |
| A-03 | 状态组织 | 从“全图共享一个全局组分向量”升级为“每个单元拥有局部状态 schema，通过端口映射交换流股与信号” |
| A-04 | 边的双层分类 | 用户可见 `hydraulic/pump/settling/signal` 四种 preset；核心只保留 `material_flow`、`mass_flux`、`signal` 三种物理域；Pump 编译为 `flow_actuator unit + controlled material_flow edge` |
| A-05 | UDM 定位 | UDM 继续承担 Petersen 反应和用户自定义动力学；曝气、沉降、流量执行器和控制器不硬塞进化学计量矩阵 |
| A-06 | Hybrid 定位 | Hybrid 是图编译、局部状态注册、端口映射、水力代数、事件、离散控制和评价的统一运行时，不再等同于 `udm_only` 模型对映射 |
| A-07 | 二沉池建模 | 仍采用 10 个真实层节点；Canvas 可折叠，但 compute graph 中 child nodes 和界面 flux 全部真实存在 |
| A-08 | 水力求解 | 固定体积网络使用事件驱动的代数约束求解与缓存；不得在每次 RHS 无条件重解，也不得以前端逐节点补差替代全图求解 |
| A-09 | 基准与研究隔离 | `bsm1_reference`、`component_resolved_nonreactive`、`reactive_asm1` 三个 profile 使用不同状态 schema、证据资格和 UI 标签 |
| A-10 | 可审计性 | 模型、参数、图、forcing、控制器、评价器、求解配置、编译计划和参考资产均需 hash/provenance，并纳入既有 model_run、benchmark_run、artifact 和 evidence 闭环 |
| A-11 | Capability/Conformance 分层 | 通用能力、模型 profile 和官方 conformance gate 分层；BSM1 只能收紧通用能力，不能重写其语义 |
| A-12 | 单实现与反模式守卫 | typed runtime 唯一落在 `simulation_core`；CI 禁止 RHS 原地 clamp、散落时间换算和 backend/core 双实现 |

## 0.2.1 Capability、Profile 与 Conformance Gate

```text
Layer C  Capability（长期通用资产）
  local-state units / typed ports / material-flow / mass-flux / signal
  hybrid compiler / algebraic hydraulics / event runtime / forcing / control
  conservation / checkpoint / diagnostics
            ↓ 由 profile 收紧
Layer P  Profile / Constraint（模型包约束）
  BSM1 13-state ASM1、8-state reference clarifier、feed layer、geometry
  solver/dtype/time basis、controller/evaluation settings、reference locks
            ↓ 由证据验证
Layer G  Conformance Gate（资格与证据）
  official reference assets / tolerances / mandatory cases / benchmark_run
  artifact hashes / provenance / approval and promotion readiness
```

规则：

- Layer C 必须有脱离 BSM1 的独立测试；
- Layer P 可以固定值、关闭功能或收紧策略，但不得 fork Layer C 的 kernel；
- Layer G 只判断资格和证据，不参与物理计算；
- BSM1 package 不得向 `simulation_core` 注入 `if profile == "bsm1"` 特判。

## 0.3 v2.0 保留、修正与删除的核心内容

### 保留

- 标准 13 状态、8 过程 ASM1 作为新的 UDM 模型，不静默修改 legacy ASM1；
- 10 个真实层节点的二沉池组合模板；
- 沉降通量只迁移质量、不改变水体积；
- 全图循环水力平衡、rank/DOF 和不可行诊断；
- forcing、传感器、PI、执行器、评价器和事件对齐；
- reference 与 research profile 严格隔离；
- float64 reference、checkpoint、守恒和 conformance evidence。

### 修正

- “Mixed ASM/UDM dispatcher 仅有 ADR”修正为：**可执行 mixed dispatcher、组件映射 guard、守恒指标和 correctness-freeze 已落地**；
- Takács 实现落点由 legacy `backend/app/material_balance/core.py` 修正为 `simulation_core` 通用 mass-flux runtime；
- `Pump Edge` 从基础物理边修正为 UI 预设/组合语义，编译后拆为执行器与受控物料流边；
- “所有单元共享 13 组分全局向量”修正为局部状态与端口映射；
- `typed_simulation_input.v1` 修正为长期版本化的 `process_graph.v2 + simulation_input.v2`；
- BSM1 专用 job type 修正为通用 Hybrid job type；
- 100 天初始化由单纯放宽 `hours` 修正为 stabilization campaign、稳态判据、checkpoint 和 continuation；
- 每条沉降边复制 Takács 数组参数修正为共享 `flux_law_ref + parameter_set_ref`，边只保存界面和 override。

### 删除或后置

- 不在通用运行时中写 `if profile == "bsm1"` 的物理分支；
- 不把 BSM1 evaluator、pump energy、clarifier profile 直接固化在 `MaterialBalanceCalculator`；
- 不在第一阶段引入未被当前合同支持的 `dopri5` 作为默认求解器；
- 不为每个结果文件立即新增独立 JSON Schema，优先复用 artifact/time-series/evidence 合同，只有跨组件稳定交换的数据才合同化；
- 不在 BSM1 reference 通过前推进 GPU 优化、参数标定 UI、BSM2/ADM1 或多沉降类别。

## 0.4 三个二沉池 profile

| Profile | 每层局部动态状态 | 反应 | 官方 BSM1 资格 | 主要用途 |
|---|---:|---:|---:|---|
| `bsm1_reference` | 8 | 关闭 | 是 | 官方基准与回归门 |
| `component_resolved_nonreactive` | 13 | 关闭 | 否，除非另有等价性证据 | 颗粒组成滞留、流股重构研究 |
| `reactive_asm1` | 13 | 开启 | 否 | 实际厂站与反应型二沉池研究 |

`bsm1_reference` 的局部状态为：

```text
X_TSS, S_I, S_S, S_O, S_NO, S_NH, S_ND, S_ALK
```

ASM1 CSTR 的局部状态为：

```text
S_I, S_S, X_I, X_S, X_BH, X_BA, X_P,
S_O, S_NO, S_NH, S_ND, X_ND, S_ALK
```

两者通过显式端口映射交换流股，不能靠补零把 8 状态二沉池伪装成 13 状态反应单元。

## 0.5 “通过 BSM1”的定义

“任务成功”“曲线看起来合理”或“守恒误差较小”均不等于通过 BSM1。正式通过至少要求：

1. 模型包、参数、厂站结构、时间基准、forcing、控制器和评价口径均有冻结版本与来源 hash；
2. 标准 ASM1 rate、stoichiometry 和 derivative 级测试通过；
3. 十层 reference 二沉池稳态和动态层剖面通过；
4. 100 天 stabilization 达到明确稳态判据并可 checkpoint/restart；
5. 首日 15 分钟序列与 dry/rain/storm 场景通过；
6. 默认 DO 与硝酸盐控制回路通过；
7. EQI、污泥、曝气/泵送能耗、控制误差和违规统计通过；
8. 水量、COD、N、TSS 守恒和投影/限流诊断通过；
9. reference、research 结果标签和 promotion gate 隔离；
10. Worker、Compute API、Model Catalog、model_run、benchmark_run、artifact、evidence package 形成闭环。

---

# 1. 审计范围、方法与证据等级

## 1.1 审计对象

本次重新审计覆盖：

- 附件 v2.0 的全部需求、现状判断、阶段计划和研究议题；
- 目标分支的根 README、README First、AGENTS、architecture current-state；
- `simulation_core` 的 runtime model、adapter、MaterialBalanceCalculator、UDM engine/ODE；
- `contracts` 的 compute job、simulation input、process graph、model catalog、benchmark run 和 registry；
- `services/simulation-worker` 的执行边界和 capability；
- Go Compute API 的 simulation job type/capability 映射；
- `backend/app/services/hybrid_udm_validation.py`；
- UDM React Flow 页面、FlowCanvas、EditableEdge、store factory 和 Hybrid 类型；
- `docs/takacs_diffusion/` 的既有设计资产；
- 目标分支最新提交中 legacy route component metadata bridge。

## 1.2 证据优先级

```text
可执行源码/合同/测试
    > 目录 README 与 architecture current-state
    > ADR / .ai change record
    > 设计草案
    > v2.0 中的推断
```

README 与代码冲突时，以源码和测试为事实源，同时将文档漂移列入整改项。

## 1.3 状态分类

| 状态 | 含义 |
|---|---|
| `LANDED` | 已有可执行实现与至少一类测试/审计证据 |
| `PARTIAL` | 主体可用，但语义、合同、调用链或发布证据不完整 |
| `DESIGN_ONLY` | 只有文档、原型或建议，无可执行合同/runtime |
| `ABSENT` | 目标分支未发现实现 |
| `STALE` | 文档或 fixture 描述已落后于实际代码 |
| `COMPAT_ONLY` | 仅为 legacy 兼容，不应作为新架构扩展点 |

## 1.4 审计限制

本次通过仓库连接器读取目标分支文件并核对当前 head，没有在本地拉取仓库或重新执行测试。本文对“测试已通过”的描述仅引用分支内维护的审计记录和 current-state；实施任何 PR 时仍必须在目标环境重跑相应 gate。最新提交记录还显示完整 backend test suite 存在数据库 fixture/连接相关失败，因此不能把 focused tests 通过扩大解释为全仓库全绿。

---

# 2. 目标分支现状重新判定

## 2.1 能力审计矩阵

| 能力 | v2.0 判断 | v3.1 融合判定 | 结论与影响 |
|---|---|---|---|
| 纯 Python simulation core | 已有 | `LANDED` | 新科学内核必须落在 `simulation_core`，禁止回写 legacy calculator |
| backend/core thin shell | 未充分反映 | `LANDED` | calculator、models、ASM/UDM helpers 已大幅收口；Takács 旧文档落点已过时 |
| Worker 安装包边界 | 已有 | `LANDED` | Worker 不再依赖 `backend/app` 或 repo-path fallback，可直接承载 Hybrid runtime |
| Mixed ASM/UDM dispatcher | “已有 ADR” | `LANDED` | unified combined RHS 已执行 transport 一次并叠加 active reactions，受 correctness-freeze 保护 |
| ASM schema guard | 缺口 | `PARTIAL/LANDED` | 具名 schema 时已按名字 gather/scatter；无 metadata legacy 仍保留前缀行为 |
| UDM local→global guard | 未充分反映 | `LANDED` | 未知组件、重复写目标和 stoich target 错配已 fail early |
| UDM Hybrid 模型对映射 | 已有 | `PARTIAL` | backend validator 功能较完整，但 mode 仍严格为 `udm_only`，不是通用单元编排 |
| 独立 UDM job | 已有 | `LANDED` | Worker 与合同已闭环；mixed fixture 仍借用 `simulation.udm.v1` 路由 |
| 守恒指标 | 需求项 | `LANDED/PARTIAL` | `final_mass_balance_error` 已是真实控制体残差，但尚无 COD/N/TSS 语义守恒层 |
| dense/sparse transport | 未涉及 | `LANDED` | 并行 flow edge 的加权 `a/b` 语义已统一，稀疏路径已优化 |
| 输出网格与 solver 网格 | 未涉及 | `LANDED` | 部分 solver 已按采样点降采样积分输出，适合长时序基础 |
| 输入 unknown-field 管理 | 未充分反映 | `LANDED` | adapter 有 compat/warn/strict，runtime model `extra=forbid` |
| ProcessGraph | 已有 | `PARTIAL` | 结构可表达 ports/model binding，但到 SimulationInput 的正式转换当前只覆盖 material balance |
| SimulationInput | 已有 | `COMPAT_ONLY` | v1 字段集合关闭、单全局 component schema、仅五类 job type，不适合直接塞入 typed hybrid |
| Typed edge runtime | 不存在 | `ABSENT` | EdgeData 仍只有 flow 与 concentration a/b |
| 动态 UDM RuntimeContext | 不存在 | `ABSENT` | UDM reaction evaluator 只有静态参数和浓度，`udm_ode_balance` 明确丢弃 `t` |
| 局部状态/端口 schema | 未提出为核心 | `ABSENT` | 当前 runtime 仍把节点状态投影到单个全局组分空间 |
| 显式 precision/device profile | 缺口 | `ABSENT` | calculator 构造时自动选 CUDA/CPU并固定 float32，不满足 reference 可重复性 |
| 长周期 stabilization | 缺口 | `ABSENT` | `hours <= 1000`，且无稳态 campaign/continuation 协议 |
| 全图水力约束 | 不存在 | `ABSENT` | 当前 edge flow 都是输入值，无 rank/DOF/循环求解 |
| Pump actuator | 不存在 | `ABSENT` | 无 command、limit、rate limit、能耗与审计语义 |
| Takács mass flux | 设计已有 | `DESIGN_ONLY` | 文档正确区分 mass/volume，但引用 legacy 实现路径且参数组织需重构 |
| Composite template | 不存在 | `ABSENT` | 前端 palette 和 store 无原子组合插入机制 |
| Forcing/event scheduler | 不存在 | `ABSENT` | time segment 只能覆盖 edge，不能承担完整多变量 forcing/离散控制 |
| Sensor/PI/Actuator | 不存在 | `ABSENT` | Signal domain 与离散状态机均缺失 |
| BSM1 evaluator | 不存在 | `ABSENT` | Model governance 已有，但无科学评价实现 |
| Model Catalog/benchmark_run | 已有 | `LANDED` | 应复用，不另建 BSM1 专用治理数据库 |
| Frontend edge extensibility | 需求项 | `ABSENT/PARTIAL` | FlowCanvas 只注册 `editable`，store 新边固定 `{flow:0}`，重复判定阻断平行语义边 |

## 2.2 需要立即修正的文档漂移

### 漂移 1：Mixed dispatcher 状态

`docs/architecture/current-state.md` 已确认 mixed reaction dispatcher 和相关 correctness-freeze 落地；v2.0 将其证据仅写为 ADR 0015，低估了当前基础。

### 漂移 2：Takács 设计落点

`docs/takacs_diffusion/design_and_execution.md` 仍建议修改：

```text
backend/app/models.py
backend/app/material_balance/core.py
```

但当前 Next 边界已经要求 runtime contract 和 calculator 进入 `simulation_core`，legacy route 只做 metadata bridge。该设计文档应标记 superseded，不能按原步骤实施。

### 漂移 3：Hybrid 能力描述

`simulation_core/README.md` 仍写“Hybrid 多模型映射后续 Phase”，而 Worker README 已声明测试覆盖生成式 UDM Hybrid 多模型映射；两者需统一为：

```text
现有能力：UDM 节点/模型映射与 mixed ASM/UDM reaction dispatch
缺失能力：通用 typed-unit Hybrid compiler、局部状态、信号、事件与代数约束
```

### 漂移 4：mixed fixture metadata

`mixed_asm_udm.compute_job.v1.json` 仍包含“PR-38 前互斥分支 baseline”的说明，而 current-state 已确认 PR-38 语义落地。应决定该 fixture 是历史 freeze 资产还是当前行为 fixture：

- 历史资产：重命名并明确不可作为当前 semantic example；
- 当前资产：刷新 metadata 与期望证据。

### 漂移 5：current-state 日期

architecture current-state 的快照日期为 2026-06-15，而目标 head 已包含后续 route metadata bridge。v3.1 落库时应同步更新 current-state，避免下一轮审计继续依赖旧快照。

## 2.3 当前实现最重要的结构性约束

1. `simulation_input.v1` 的 component schema 只有组件名数组和单一 unit，无法表达每个组件不同单位、相态、守恒标签和局部状态角色；
2. `MaterialBalanceInput` 只有一组全局浓度列，不能原生表示 13 状态反应池与 8 状态 reference clarifier；
3. `UDMNodeRuntime.evaluate_reaction()` 的环境只有静态参数与当前浓度，不能读取 time、forcing、signal 或 actuator；
4. `EdgeData` 不具备 edge domain、ports、flux law、flow specification 或 signal type；
5. `HybridUDMConfig.mode` 在前端和后端都固定为 `udm_only`；
6. `createModelFlowStore.onConnect` 只按 source/target 去重，并固定创建 `editable + flow=0`；
7. 现有 built-in ASM1 component contract 是 11 组件，不是官方 13 状态 BSM1；
8. calculator 自动选择 GPU 且固定 float32，不可作为 reference profile 的隐式执行策略；
9. solver 字段目前不接受 `dopri5`，v2.0 不应把它写成已可用生产选项；
10. `max_iterations` 和 `max_memory_mb` 目前是未执行的兼容字段，不能作为运行保护承诺。

---

# 3. v3.1 目标架构

## 3.1 分层结构

```text
CanvasGraph v1（UI 编辑图，兼容现有 React Flow）
        │
        ▼
ProcessGraph v2（局部状态、Typed Ports/Edges、Composite refs）
        │  Hybrid Compiler
        ▼
SimulationInput v2（已解析、不可变、可 hash 的执行请求）
        │
        ▼
CompiledExecutionPlan（内部计划或可选 artifact）
├── State Registry
├── Port Mapping Plan
├── Hydraulic Algebraic Plan
├── Material Transport Plan
├── Mass Flux Plan
├── Reaction/Transfer Plan
├── Signal/Event Plan
├── Checkpoint Plan
└── Evaluation Plan
        │
        ▼
Simulation Worker / Desktop Sidecar
        │
        ▼
ComputeResult + Artifacts + ModelRun + BenchmarkRun + Evidence
```

BSM1 位于架构上方，以模型包注入：

```text
IWA BSM1 Model Package
├── ASM1 UDM model
├── five-reactor composite
├── ten-layer clarifier composites/profiles
├── flow constraints and actuator presets
├── forcing datasets
├── PI controller profiles
├── evaluation profile
├── benchmark cases
└── reference provenance manifest
```

## 3.2 通用职责边界

| 层 | 负责 | 不负责 |
|---|---|---|
| UDM | 局部状态、参数、Petersen 过程、速率表达式、派生输出 | 全图流量、边拓扑、控制调度、benchmark 特判 |
| Unit Runtime | 单元局部 derivative/output、transfer terms、离散状态接口 | 解析 UI 图、持久化 job |
| Typed Edge Runtime | 物料对流、质量通量、信号传递 | 化学反应、平台治理 |
| Hybrid Compiler | Composite 展开、类型检查、模型解析、状态注册、映射、水力、事件和评价计划 | 数值积分本身、HTTP |
| Event Runtime | forcing、采样、离散控制、执行器更新、checkpoint 边界 | 模型目录治理 |
| Simulation Core | 纯计算、确定性执行、诊断 | HTTP、数据库、用户权限 |
| Worker | 合同校验、调用 core、artifact、runtime audit | 直接写 DB、科学公式特判 |
| Compute API | job/worker/artifact/model/benchmark/evidence 治理 | 计算 RHS |
| Frontend | 可视化建模、preview、结果解释 | 自行补流量或产生隐藏物理语义 |

## 3.3 BSM1 不是黑盒，但也不是内核特判

Canvas 可以显示一个折叠的 `Secondary Clarifier (10-layer)` 组合单元，但其 manifest 必须生成：

- 10 个真实 layer units；
- 上下行 material-flow paths；
- 9 个或按 profile 定义的 mass-flux interfaces；
- feed、overflow、underflow ports；
- shared parameter-set refs；
- profile-specific port mappings；
- composite group metadata。

compute graph 中不存在“一个二沉池节点代替全部层状态”的捷径；同时 `simulation_core` 也不存在 `if node_type == bsm1_clarifier` 的专用大黑盒。

---
# 4. 通用语义模型：Unit、State、Port、Edge 与 Composite

## 4.1 Unit 是运行时最小状态拥有者

建议首批 `unit_type`：

```text
boundary.forcing_source
boundary.sink
storage.cstr
reactor.udm_cstr
separator.layer
sensor.sampled
controller.pi
actuator.flow
actuator.transfer
```

BSM1 所需实例映射：

| BSM1 对象 | 通用 unit 类型 | 绑定 |
|---|---|---|
| 动态进水 | `boundary.forcing_source` | forcing artifact/profile |
| 五段生化池 | `reactor.udm_cstr` | 标准 ASM1 UDM + aeration transfer config |
| 二沉池各层 | `separator.layer` | profile-specific local state schema |
| 出水/污泥出口 | `boundary.sink` | stream schema |
| DO/NO3 测量 | `sensor.sampled` | source unit/port/property |
| PI | `controller.pi` | discrete controller profile |
| 内回流/RAS/WAS 泵 | `actuator.flow` | controlled flow variable |

## 4.2 StateSpec 必须区分四类量

```python
class StateSpec:
    differential: list[VariableSpec]
    algebraic: list[VariableSpec]
    discrete: list[VariableSpec]
    derived: list[VariableSpec]
```

- `differential`：进入 ODE/DAE 状态向量；
- `algebraic`：由约束即时求得，例如 resolved flow；
- `discrete`：只在事件更新，例如 PI integral、forcing cursor、actuator held command；
- `derived`：TSS、TN、COD、传感器读数、流股投影等，不重复积分。

禁止把 derived quantity 复制成独立动态状态，除非模型明确给出其独立守恒方程。

## 4.3 ComponentSchema v2

当前 `component_schema.components: string[]` 不足以支持局部模型、单位和守恒。新 schema 至少应包含：

```json
{
  "component_schema_id": "iwa.asm1.13.v1",
  "time_basis": "day",
  "components": [
    {
      "key": "S_I",
      "display_name": "Soluble inert organic matter",
      "unit": "g/m3",
      "phase": "soluble",
      "state_role": "differential",
      "conservation_tags": {
        "cod_factor": 1.0,
        "nitrogen_factor": 0.0,
        "tss_factor": 0.0
      }
    }
  ]
}
```

要求：

- 每个变量独立声明 unit，不能用一个全局 unit 覆盖碱度等不同维度；
- phase/transport class 用于端口和 mass-flux type checking；
- conservation tags 由模型包冻结，用于 COD/N/TSS continuity；
- key、alias、显示名称分离；
- schema 版本和 hash 进入 model_run；
- 允许局部 schema，不要求所有 unit 完全相同。

## 4.4 PortSpec

```json
{
  "port_id": "effluent",
  "domain": "material",
  "direction": "out",
  "stream_schema_ref": "iwa.asm1.stream.13.v1",
  "cardinality": "many",
  "required": true
}
```

Signal port 示例：

```json
{
  "port_id": "kla_command",
  "domain": "signal",
  "direction": "in",
  "value_schema": { "type": "number", "unit": "1/day" },
  "sampling": "zero_order_hold"
}
```

编译器必须检查：

- material 端口不能直接连接 signal；
- 输入/输出方向；
- schema 兼容或存在显式 mapping；
- 单位可转换；
- 必需端口是否连接；
- 端口 cardinality；
- 同一 semantic slot 的重复连接。

## 4.5 四种用户可见 Edge Preset 与三种基础 Domain

用户建模层保持直观的四种语义：

| UI/ProcessGraph preset | 内部 domain/lowering | 说明 |
|---|---|---|
| `hydraulic` | `material_flow` | 被动或约束驱动的水力物料流 |
| `pump` | `actuator.flow` + `material_flow` | 命令、限幅、速率和能耗由 actuator 负责 |
| `settling` | `mass_flux` + `flux_law_ref` | 只迁移质量，不迁移体积 |
| `signal` | `signal` | 传感、控制、事件和参数命令 |

这一双层分类同时满足前端可理解性和内核物理职责单一性。

### 4.5.1 `material_flow`

- 传输体积和质量；
- 由 `flow_spec` 决定流量变量或约束；
- 支持 component transform/mapping；
- 可由 actuator 控制；
- 支持边界流、split、ratio、fixed、residual 和 measured flow。

### 4.5.2 `mass_flux`

- 只贡献组分质量迁移；
- `delta_Q = 0`；
- 由 `flux_law_ref` 读取源/目标局部状态；
- 支持 directed settling、gradient diffusion、membrane transfer 等通用扩展；
- 可声明 `shared_capacity_group`，使多个颗粒组分共享一个界面总通量上限。

### 4.5.3 `signal`

- 不参与水量、质量和状态 transport；
- 传递 scalar/vector/event；
- 明确单位、采样、延迟、噪声和 hold 语义；
- 可连接 sensor→controller、controller→actuator、forcing→parameter input。

## 4.6 Pump 的规范化

v2.0 将 Pump 视为第四类基础边。v3.1 推荐保留前端视觉上的 `PumpEdge`，但在 ProcessGraph/CompiledPlan 中规范化：

```text
[controller signal]
        ↓
actuator.flow unit
        ↓ command/bounds/rate-limit
material_flow edge with algebraic flow variable q_i
```

理由：

1. 泵有 command、held state、rate limit、availability、效率和能耗，是执行器而非纯连接；
2. 一条基础 edge 不应同时承担 transport、控制状态、设备模型和能耗评价；
3. 未来阀门、闸门、风机、加药泵可复用 actuator protocol；
4. flow solver 只接收等式、上下界和 actuator-resolved specification，职责更清晰；
5. UI 仍可“一次拖入泵连接”，由 composite/edge factory 原子生成 actuator + flow edge。

需要保存三层值：

```text
requested_value  用户或控制器请求
bounded_value    限幅/速率限制后的执行器输出
resolved_flow    全图水力约束最终采用值
```

任何修正都必须产生事件和诊断，不能覆盖原请求。

## 4.7 CompositeTemplate

Composite 只负责可复用图结构，不拥有重复运行时状态。

```json
{
  "template_id": "iwa.bsm1.secondary_clarifier.10layer.v1",
  "template_version": 1,
  "parameters": {},
  "children": [],
  "internal_edges": [],
  "external_ports": [],
  "invariants": [],
  "migration_rules": []
}
```

原子插入要求：

- 一次事务创建全部 child nodes/edges；
- 稳定、可重现的 child ID；
- 失败时全量回滚；
- undo/redo 为单个动作；
- collapse/expand 不改变 ProcessGraph；
- group 删除必须显式提示外部连接；
- profile 切换执行 migration preview，不能静默丢状态或参数；
- topology lock 防止 reference 模板被随意破坏；
- 可复制为 research variant，但自动移除 official qualification。

## 4.8 平行边唯一性

重复判定应采用：

```text
source_node_id
+ source_port
+ target_node_id
+ target_port
+ edge_domain
+ semantic_slot
```

因此以下连接合法：

- 同一层间的 `material_flow` 与 `mass_flux`；
- 同一设备间的 material 与 signal；
- 同一 source/target 上不同物理流股；
- 多个 signal channel。

仅 source/target 相同不能作为重复依据。

---

# 5. UDM v2：保持 Petersen 核心，补齐通用动态上下文

## 5.1 不覆盖现有 UDM v1

现有 UDM 节点 snapshot、component binding、process expression 和 `simulation.udm.v1` 应继续工作。新增能力采用版本化模型定义或扩展 snapshot schema，通过 adapter 编译为新 runtime，不改变 legacy expression 的默认行为。

建议命名：

```text
udm_model.v1  现有兼容模型
udm_model.v2  局部状态、typed inputs/outputs、单位和 runtime context
```

## 5.2 UDM v2 最小结构

```json
{
  "schema_version": "udm_model.v2",
  "model_id": "iwa.asm1",
  "version": "1.0.0",
  "time_basis": "day",
  "state_schema_ref": "iwa.asm1.13.v1",
  "parameters": [],
  "processes": [],
  "inputs": [],
  "derived_outputs": [],
  "constraints": [],
  "metadata": {}
}
```

## 5.3 RuntimeContext

当前 UDM evaluator 丢弃 `t`，无法完成动态 forcing、曝气和控制。新接口建议：

```python
@dataclass(frozen=True)
class RuntimeContext:
    t: float
    time_unit: str
    local_state: Tensor
    local_volume: Tensor
    parameters: Mapping[str, Tensor | float]
    material_inputs: Mapping[str, StreamValue]
    signal_inputs: Mapping[str, SignalValue]
    forcing_values: Mapping[str, Tensor | float]
    discrete_state: Mapping[str, Any]
    execution_profile: ExecutionProfile
```

UDM expression 只允许显式注册的 namespaced symbols，例如：

```text
state.S_O
param.mu_H
signal.KLa
forcing.temperature
ctx.t
```

不得把任意 Python 对象或全局变量注入 expression 环境。

## 5.4 反应与 transfer term 分离

标准 ASM1 Petersen processes 负责生物化学反应；曝气采用 unit-level transfer term：

```text
r_transfer,S_O = KLa × (S_O_sat - S_O)
```

理由：

- KLa 可由 controller/actuator 改变；
- transfer 不是 Petersen 生物过程；
- 同一 ASM1 模型可用于缺氧池、好氧池和 reactive settler；
- transfer term 可独立输出、守恒和能耗证据。

建议协议：

```python
class TransferRuntime(Protocol):
    def derivative(self, ctx, state) -> Tensor: ...
    def diagnostics(self) -> dict: ...
```

## 5.5 标准 ASM1 UDM 模型

必须新建完整 13 状态、8 过程 UDM 模型，不能复用当前 11 组件 built-in ASM1 作为 BSM1 reference。

要求：

- 组件顺序不作为语义；所有内部索引由 schema key 编译；
- 参数有 unit、范围、来源和 default set；
- stoich 支持参数表达式并在构建期编译；
- process rate 和 stoich target 全部 fail-fast；
- 每个 process 可输出 rate trace；
- COD、N continuity 由 conservation matrix 自动检查；
- 单池和五池使用同一 model hash，不复制 model snapshot；
- reactor 级参数 override 必须生成 resolved parameter hash；
- 缺氧池仅关闭 aeration transfer，不删除氧相关状态或过程。

## 5.6 UDM v1 → v2 兼容编译

```text
现有 UDM snapshot
→ infer local state schema
→ bind static parameters
→ no typed signal inputs
→ legacy time basis
→ compile as reactor.udm_cstr
```

兼容路径必须产生：

- `compatibility_mode=true`；
- inferred schema 和 assumptions；
- warning 列表；
- model_run 中的 adapter version；
- strict mode 下可配置拒绝缺失 unit/schema 的模型。

## 5.7 UDM 安全和确定性

保留并扩展当前 AST 白名单：

- 未知 AST 节点 fail early；
- 禁止 keyword args、attribute traversal、subscript 和动态 import；
- 函数库按版本注册；
- expression、compiled AST、function registry 均进入 hash；
- 允许的数学函数必须在 CPU/GPU 和 float64/float32 上有差异测试；
- expression evaluation 错误不得静默回退为 0；
- stoich expression 当前捕获异常并写 0 的兼容行为，应在 UDM v2 strict compiler 中改为结构化错误。

---

# 6. Hybrid Compiler v1

## 6.1 输入与输出

输入：

```text
ProcessGraph v2
Model/Unit Catalog snapshots
Parameter sets
Composite manifests
Forcing artifacts
Evaluation profile
Execution profile
```

输出：

```text
CompiledExecutionPlan
CompileReport
ResolvedHashes
Warnings/Errors
```

## 6.2 编译 Pass

### Pass 0：版本和兼容 adapter

- 识别 CanvasGraph、ProcessGraph、SimulationInput 版本；
- 旧 UDM 图经 compatibility adapter 转为内部 IR；
- 禁止未知 schema/version 静默执行。

### Pass 1：Composite 展开

- 原子展开模板；
- 解析 parameter bindings；
- 验证 child ID、外部端口和 topology invariants；
- 保存 source composite lineage。

### Pass 2：图和类型验证

- node/edge/port type；
- 方向、cardinality、domain；
- parallel edge identity；
- orphan/missing port；
- profile compatibility；
- reference topology lock。

### Pass 3：模型与资产解析

- UDM model/version/hash；
- component/state schema；
- parameter set；
- forcing/control/evaluation profile；
- flux law plugin；
- 所有引用解析为不可变 snapshot。

### Pass 4：局部状态注册

- 为每个 unit 建立 differential/algebraic/discrete/derived registry；
- 分配全局连续状态 slice，但保留 local schema；
- 建立 checkpoint layout；
- 检查重复积分和 derived-state 冲突。

### Pass 5：端口映射编译

- unit conversion；
- rename/identity；
- linear projection；
- aggregate/derive；
- feed particulate ratio adapter；
- zero-denominator policy；
- 生成稀疏 mapping operator 和 provenance。

### Pass 6：Hydraulic Algebraic Plan

- 构造 incidence/equality/bounds；
- 区分 fixed-volume 与 dynamic-volume nodes；
- rank/DOF/connected-component 分析；
- actuator constraints；
- 编译事件时重解策略和 factorization cache。

### Pass 7：Transport 与 Flux Plan

- material-flow sparse bundle；
- mass-flux interfaces；
- shared capacity groups；
- boundary source/sink；
- 确保同一物理项只编译一次。

### Pass 8：Reaction 与 Transfer Plan

- UDM runtime payload；
- transfer runtime；
- per-unit active masks；
- reaction/transport/transfer derivative decomposition。

### Pass 9：Signal/Event Plan

- forcing timestamps；
- controller samples；
- actuator updates；
- time segments；
- output samples；
- checkpoint boundaries；
- deterministic event ordering。

### Pass 10：Evaluation 与 Evidence Plan

- metric definitions；
- evaluation windows；
- integration rule；
- artifact projections；
- mandatory benchmark cases；
- hash manifest。

## 6.3 编译报告

```json
{
  "status": "valid",
  "errors": [],
  "warnings": [],
  "expanded_node_count": 0,
  "expanded_edge_count": 0,
  "continuous_state_count": 0,
  "discrete_state_count": 0,
  "hydraulic_degrees_of_freedom": 0,
  "event_count": 0,
  "resolved_hashes": {},
  "compatibility_adapters": []
}
```

任何 benchmark run 都必须引用 compile report；compile warning 是否阻断由 evaluation profile 决定。

## 6.4 统一执行循环

```text
initialize local continuous/discrete states
resolve initial forcing/signals
solve algebraic hydraulics
for each event interval [t_i, t_{i+1}]:
    integrate continuous state with held algebraic/discrete inputs
    project/check event-boundary constraints according to policy
    update forcing cursor
    sample sensors
    update controllers
    update actuators
    re-solve hydraulics if invalidated
    emit requested output/checkpoint/evaluation samples
finalize diagnostics and evidence
```

## 6.5 Global RHS

```text
dy/dt = material_flow_transport
      + mass_flux_transport
      + unit_reaction_terms
      + unit_transfer_terms
      + continuous_controller_states（仅明确使用连续控制器时）
```

要求：

- transport 只计算一次；
- 每个局部 derivative scatter 到其 state slice；
- signal 不进入质量方程；
- mass flux 不进入体积方程；
- fixed-volume unit 的体积不是 ODE state；
- dynamic-volume unit 才有 `dV/dt`；
- discrete controller 默认不放入 continuous RHS。

---
# 7. 代数水力、Flow Actuator 与循环网络

## 7.1 FlowSpec

```json
{
  "mode": "fixed | ratio | split | residual | actuated | measured",
  "requested_value": 0.0,
  "unit": "m3/day",
  "reference_flow_ref": null,
  "ratio": null,
  "min_value": 0.0,
  "max_value": null,
  "priority": null
}
```

语义：

- `fixed`：用户或模型包冻结；
- `ratio`：相对于另一个 flow variable；
- `split`：一组出口 share 约束；
- `residual`：由节点守恒唯一确定；
- `actuated`：由 actuator 的 bounded command 提供；
- `measured`：从 forcing/telemetry 输入，是否可调整必须显式声明。

`auto` 不应作为模糊语义长期保留；应解析成 `residual`、`split` 或具备 objective 的优化变量。

## 7.2 约束形式

对于固定体积内部节点：

```text
B_fixed q + b_boundary = 0
```

额外等式：

```text
q_i = q_fixed
q_i - r q_j = 0
Σ q_split,k - q_parent = 0
q_i = q_actuator
```

边界：

```text
lower_i <= q_i <= upper_i
```

动态体积节点不进入固定体积等式，其体积变化为：

```text
dV/dt = B_dynamic q + b_boundary
```

## 7.3 求解策略

1. 按 hydraulic connected component 分区；
2. 建立变量和约束来源索引；
3. 进行 symbolic/rank 分析；
4. 检查欠定、超定和冲突；
5. 若等式唯一，直接求解并检查 bounds；
6. bound 激活后以确定性 active-set 重新求解；
7. 若系统仍有自由度，必须有显式 objective/priority profile，否则 strict mode 失败；
8. 计算残差、condition estimate 和 sensitivity；
9. 缓存矩阵结构和 factorization；
10. 只在 invalidating event 后重解。

禁止：

- 欠定时静默使用最小范数解；
- 先求解再简单 clip 泵流量而不重平衡；
- 允许负流量却不声明 reversible edge；
- 在前端写回“补差流量”作为用户数据；
- 每次 RHS 无条件重建矩阵和求解。

## 7.4 Invalidating events

- forcing 中的 measured/fixed flow 改变；
- controller sample 产生新 command；
- actuator rate/bound 状态改变；
- time segment 边界；
- valve/pump availability 变化；
- topology/config 变更；
- dynamic-volume policy 变化；
- restart 恢复后首次重建。

浓度状态变化本身不应使纯固定流量 BSM1 网络每个 RHS 重解。

## 7.5 Flow actuator

```python
class FlowActuatorRuntime:
    requested: float
    bounded: float
    previous_applied: float
    min_value: float
    max_value: float
    rate_limit: float | None
    availability: bool
```

更新顺序：

```text
controller/user request
→ unit conversion
→ availability
→ saturation
→ rate limit
→ bounded command
→ hydraulic re-solve
→ resolved flow
```

能耗不是 flow solver 的输入，除非运行优化明确将其作为 objective。普通 simulation 中能耗作为 evaluator/derived output 计算。

## 7.6 BSM1 默认水力约束

模型包应显式定义：

- influent flow；
- internal recycle command；
- RAS flow；
- WAS flow；
- clarifier overflow/underflow balance；
- 五池串联系统的 residual flows；
- 无动态液位时所有 CSTR/layer 固定体积。

不得依赖节点遍历顺序推导这些关系。

## 7.7 FlowBalanceReport

```json
{
  "schema_version": "flow_balance_report.v1",
  "status": "solved",
  "components": [],
  "rank": 0,
  "constraint_count": 0,
  "variable_count": 0,
  "degrees_of_freedom": 0,
  "max_abs_residual": 0.0,
  "condition_estimate": null,
  "flows": [],
  "active_bounds": [],
  "conflicts": [],
  "unresolved_variables": [],
  "negative_flow_edges": [],
  "actuator_events": []
}
```

报告必须保存 constraint source，便于定位是模板、用户、controller 还是 forcing 造成冲突。

---

# 8. 十层 Takács 二沉池：通用 mass-flux 实现

## 8.1 组合模板结构

`iwa.bsm1.secondary_clarifier.10layer.v1` 默认生成：

```text
Layer 10  top clarification / overflow
Layer 9
Layer 8
Layer 7
Layer 6   feed layer（自底向上编号）
Layer 5
Layer 4
Layer 3
Layer 2
Layer 1   bottom thickening / underflow
```

每层是独立 `separator.layer` unit；层体积、截面积、高度和编号来自共享 geometry parameter set。

## 8.2 MassFluxLaw protocol

```python
class MassFluxLaw(Protocol):
    def required_variables(self) -> VariableRequirements: ...
    def evaluate_interface(self, ctx, upper, lower, params) -> FluxVector: ...
    def diagnostics(self) -> dict: ...
```

Takács 是首个实现：

```text
flux_law_key = takacs.double_exponential.v1
```

未来 Fick diffusion、membrane transfer、gas exchange 可实现同一 protocol，但不能共享错误的参数语义。

## 8.3 参数组织

同一 `MassFluxLaw` kernel 必须支持两种受治理参数化，不能复制实现：

| 参数化 | 参数来源 | 通量容量 | 适用资格 |
|---|---|---|---|
| `research.edge_parameterized` | 边或 settling-class profile，可按组分/类别扩展 | 可配置，但必须守恒并显式标 research | 通用沉降、扩散和多类别研究 |
| `bsm1_reference.shared_interface` | 共享 parameter-set ref + hash | 单一 `v_s(X_TSS)`，界面共享官方 limiter | BSM1 official candidate |

`bsm1_reference` 是对通用 kernel 的收紧调用：禁止 per-component 独占完整 flux capacity，禁止每条边复制参数，禁止只看 source layer 的简化 limiter。

v2.0 的旧 Takács 设计建议每条边保存 `solid_w` 和每组分 `v0/vzs/rh/rp` 数组。v3.1 调整为：

```text
clarifier profile
  └── shared flux_law parameter_set_ref
       ├── v0
       ├── v0_max / Vzs（按最终公式命名）
       ├── r_h
       ├── r_p
       ├── X_t / threshold
       ├── non-settleable fraction / X_min policy
       ├── geometry refs
       └── particulate projection ref

interface edge
  ├── upper_layer_ref
  ├── lower_layer_ref
  ├── interface_index
  ├── direction
  ├── shared_capacity_group
  └── optional reviewed override
```

优点：

- 一套二沉池只维护一份参数；
- parameter hash 可治理；
- 避免 9 条边漂移；
- reference profile 不允许任意 per-component speed；
- research profile 才可扩展 settling classes。

## 8.4 固体通量约束

必须满足：

- 溶解态不进入 settling flux；
- 所有 reference particulate mass 共享同一界面 TSS capacity；
- limiter 读取官方规则所需的上下层/进料层状态，而非只看 source layer；
- top、bottom、feed-zone boundary 明确编码；
- mass flux 在 source 减少、target 增加，内部总质量守恒；
- mass flux 不改变 layer volume；
- vectorized bundle 与逐界面 reference implementation 有 parity test；
- flux limiter 激活次数和幅度进入 diagnostics。

## 8.5 `bsm1_reference` 局部状态与端口适配

### Reactor → clarifier feed

显式 adapter 计算：

- soluble states 直接映射；
- particulate states 按冻结的 TSS conversion 计算 `X_TSS`；
- feed particulate composition ratios 作为 algebraic derived values；
- zero/near-zero TSS 使用 profile 定义的安全策略；
- 所有 mapping 公式和系数进入 hash。

### Clarifier internal layers

积分 8 个局部状态；颗粒 ASM1 组成不在每层重复积分。

### Clarifier → effluent/underflow stream

- soluble states来自对应 top/bottom layer；
- particulate ASM1 states由 `X_TSS × composition ratios / conversion factors` 重构；
- ratio 的时间语义必须冻结：推荐由当前 feed stream 在 RHS/event evaluation 时计算并在同一 interval 内一致使用；
- 避免 `X_ND` 或其他颗粒 N 被重复计入 TSS/氮质量；
- 重构 stream 必须通过 COD/N/TSS mapping continuity test。

## 8.6 `component_resolved_nonreactive`

- 每层保存完整 13 个 ASM1 stream states；
- UDM reaction plan 为空；
- particulate components 共用一个由总 TSS 决定的 settling velocity/capacity；
- soluble components只随 material flow 输运；
- 不得以“状态更完整”为由宣称官方等价；
- 用于检查 reference projection 误差和颗粒组成演化。

## 8.7 `reactive_asm1`

- 每层局部状态为完整 13 ASM1；
- 同一标准 ASM1 UDM model 可绑定到每层；
- 默认无曝气 transfer，除非 research config 明确开启；
- transport、mass flux、reaction 三类 derivative 分解输出；
- 允许每层 signal/forcing inputs，但必须显式；
- result、UI、model_run、benchmark case 均标记 `research_only=true`；
- 不进入 official mandatory benchmark cases。

## 8.8 二沉池诊断

至少输出：

```text
layer state profiles
TSS profile
settling velocity profile
raw/limited interface flux
limiter active flags
sludge blanket indicators（如 profile 定义）
overflow/underflow stream reconstruction
solids inventory
internal mass-flux conservation residual
water residual
reaction/transport/flux derivative decomposition
```

## 8.9 许可与 clean-room

算法与代码参考至少包括两类资产：

1. 外部 `endearqb/breecho@master/takacs.py`；
2. 仓库内 `docs/takacs_diffusion/Takacs_model1D.py` 及配套设计文档。

要求：

- 分别冻结来源、作者/权利人、仓库许可和可复用范围；
- 即使仓库内原型由同一作者提供，也不能跳过目标仓库许可证与贡献授权核对；
- 无法确认兼容时，只把代码作为行为参考，按公开公式 clean-room 实现；
- 公式来源、实现者、对照资产、归一化过程和差异说明进入 provenance manifest；
- 原型中的 hour 单位或原地 clamp 不能直接继承到 reference kernel；
- 不复制代码后再通过改名规避许可证。

---

# 9. Dynamic Forcing、事件、控制与执行器

## 9.1 ForcingSeries v1

```json
{
  "schema_version": "forcing_series.v1",
  "forcing_id": "iwa.bsm1.dry.v1",
  "time_basis": "day",
  "interpolation": "zero_order_hold",
  "columns": [
    { "key": "Q", "unit": "m3/day" },
    { "key": "S_I", "unit": "g/m3" }
  ],
  "data_ref": {},
  "data_hash": "sha256:...",
  "provenance": {}
}
```

要求：

- explicit time basis；
- duplicate/unsorted timestamp 检查；
- missing/NaN policy；
- interpolation/ZOH 语义；
- timezone 对科学时间轴通常禁止或固定 UTC；
- chunked/streaming 读取；
- cursor 可 checkpoint；
- data bytes 和 parsing version 均进入 hash；
- 进水流量和组分值在同一 timestamp 原子更新。

## 9.2 全局事件调度器

事件来源：

```text
forcing change
controller sample
sensor sample
actuator update
time-segment boundary
output sample
checkpoint boundary
user-defined discrete event
```

同一时刻的确定性顺序建议：

```text
1. integrate to event time
2. apply forcing changes
3. recompute derived material inputs
4. sample sensors
5. update controllers
6. update actuators
7. re-solve hydraulics
8. emit outputs/evaluation/checkpoint
```

若官方参考要求不同顺序，BSM1 profile 可覆盖，但必须在 manifest 中冻结并测试。

## 9.3 SensorRuntime

```text
source unit/port/property
sample period
sample phase/offset
unit conversion
noise model + seed
delay/buffer
validation range
missing-value policy
```

Reference profile 默认使用冻结的无噪声/指定采样语义；research profile 可开启噪声和延迟。

## 9.4 PIControllerRuntime

状态：

```text
integral_state
previous_error（若离散形式需要）
last_output
last_update_time
saturation_state
```

参数：

```text
setpoint
Kp/Ki 或官方等价参数
sample_period
output_min/max
anti_windup policy
initial integral/output
```

要求：

- 明确连续式或离散式；
- 默认 BSM1 profile 的公式、采样和 anti-windup 由 reference manifest 冻结；
- zero-order hold；
- checkpoint/restart 后首个 sample 不重复积分；
- controller trace 输出 P/I/error/raw/bounded/applied。

## 9.5 ActuatorRuntime

首批：

```text
flow actuator  → internal recycle/RAS/WAS
transfer actuator → KLa
```

KLa actuator 控制 reactor transfer term，不应伪装成 material-flow edge。

## 9.6 默认 BSM1 回路

```text
Tank 5 S_O sensor → DO PI → KLa actuator → Tank 5 aeration transfer
Tank 2 S_NO sensor → nitrate PI → internal recycle flow actuator → Qint edge
```

setpoint、controller parameters、limits、sample phase 和初始状态全部属于 controller profile，不散落在前端节点默认值。

---

# 10. 初始化、评价与 BSM1 Conformance

## 10.1 StabilizationCampaign

100 天初始化不应只是 `hours=2400`。建议：

```json
{
  "mode": "stabilize",
  "max_duration": { "value": 100, "unit": "day" },
  "chunk_duration": { "value": 1, "unit": "day" },
  "forcing_profile_ref": "iwa.bsm1.average.v1",
  "convergence": {
    "norm": "weighted_inf",
    "state_abs_tol": {},
    "state_rel_tol": {},
    "required_consecutive_checks": 3
  },
  "checkpoint_each_chunk": true
}
```

输出：

- 实际 stabilization duration；
- convergence trace；
- 未收敛原因；
- final checkpoint；
- model/parameter/forcing/solver hashes。

官方流程即使要求固定 100 天，也仍应记录 100 天末的 steady residual，而不是假定已稳态。

## 10.2 EvaluationProfile v1

```json
{
  "schema_version": "evaluation_profile.v1",
  "profile_id": "iwa.bsm1.closed_loop.v1",
  "window": { "start": 7, "end": 14, "unit": "day" },
  "sampling": { "period": 0.0104166667, "unit": "day" },
  "integration_rule": "rectangle_zoh",
  "metrics": [],
  "thresholds": [],
  "required_artifacts": []
}
```

评价器应是纯后处理/在线 accumulator 的通用 plugin；BSM1 只提供 metric definitions 和参数。

## 10.3 指标组

### 出水质量

- 规定的出水组分与复合指标；
- threshold/violation duration/count；
- 每项来源与公式版本。

### 控制性能

- DO error；
- nitrate error；
- IAE/ISE 或 reference 指定指标；
- saturation duration；
- actuator movement/rate-limit events。

### 厂站性能

- EQI；
- sludge production；
- aeration energy；
- benchmark pumping energy；
- physical pump energy（如启用）；
- mixing/other energy（如 profile 定义）。

`bsm1_benchmark_pumping_energy` 和基于 `ρgQH/η` 的物理能耗必须分开命名，不能混为同一指标。

## 10.4 ConservationEvaluator

基于 ComponentSchema conservation tags 计算：

```text
water residual
COD residual
nitrogen residual
TSS residual
```

对 reactive profile 分解：

```text
boundary transport
internal transport
mass flux
reaction source/sink
accumulation
numerical projection
residual
```

当前 `final_mass_balance_error` 可作为低层数值证据，但不能替代带业务语义的 COD/N/TSS continuity。

## 10.5 ConformanceReport v1

```json
{
  "schema_version": "conformance_report.v1",
  "suite_id": "iwa.bsm1.reference.v1",
  "subject": {
    "job_id": "...",
    "model_run_id": "...",
    "compiled_plan_hash": "sha256:..."
  },
  "reference_manifest": {},
  "cases": [],
  "mandatory_status": "passed",
  "warnings": [],
  "nonconformities": [],
  "generated_at": "..."
}
```

每个 case 包含：

- reference asset/hash；
- actual artifact/hash；
- time alignment；
- compared variables；
- abs/rel/weighted error；
- tolerance source；
- pass/fail/error；
- solver/projection/limiter diagnostics；
- exclusions 及理由。

## 10.6 容差治理

不得在失败后自动放宽。容差必须：

- 在 benchmark case 注册时冻结；
- 按 state/metric 分类；
- 同时支持 absolute 与 relative tolerance；
- 对接近零状态使用明确 absolute floor；
- 区分公式一致性、时序一致性和综合指标一致性；
- 记录参考平台/求解器/采样差异；
- 修改时产生新 benchmark case version 和审批证据。

## 10.7 Mandatory benchmark cases

建议至少：

```text
asm1.rates.reference
asm1.derivatives.reference
hybrid.compiler.bsm1.snapshot
hydraulics.bsm1.default
clarifier.reference.steady
clarifier.reference.dynamic
plant.open_loop.steady_100d
plant.open_loop.first_day
plant.closed_loop.dry
plant.closed_loop.rain
plant.closed_loop.storm
plant.checkpoint_restart
plant.mass_balance
plant.repeatability
```

`reactive_asm1` 只能注册为 research benchmark，不参与 BSM1 reference promotion gate。

---
# 11. 合同版本、Worker、Compute API 与模型治理

## 11.1 合同演进原则

目标分支的 contracts registry 对 v1 采用 additive-only 策略。Typed Hybrid 会改变节点、边、状态和执行语义，因此：

- 不把新字段直接塞进 `simulation_input.v1` 并依赖 consumers 忽略；
- 不把 `process_graph.v1` 的 `additionalProperties` 当作已经支持新语义；
- 新设计使用明确的新 schema version；
- 旧合同通过 adapter 继续运行；
- 所有新 schema 同步 registry、valid/invalid fixtures、Python tests、Go/OpenAPI、TS client、Worker 和 README。

## 11.1.1 合同变更八面协调矩阵

每个新 schema/version PR 必须同时检查下列八个消费面；未同步不得合并：

| # | 协调面 | 最小证据 |
|---:|---|---|
| 1 | Go Compute API | job/schema 注册、domain profile、OpenAPI handler tests |
| 2 | Python Worker | validation、adapter/compiler、capability/self-check、fixtures |
| 3 | Frontend client | generated Compute client 与 feature wrapper/typecheck |
| 4 | Desktop | package/import/export、sidecar schema 与 packaged smoke |
| 5 | OpenAPI | `apps/api/openapi/compute.openapi.json` 无 drift |
| 6 | Examples | valid + invalid fixtures，覆盖版本/边/端口/错误路径 |
| 7 | Tests/gates | contracts tests、codegen drift、integration/worker smoke |
| 8 | README/registry | consumers、compatibility、breaking policy、验证命令 |

至少持续执行：

```text
pytest contracts/tests -q
frontend generate-compute-client / typecheck
OpenAPI + generated client diff gate
```

## 11.2 推荐合同集合

| 合同 | 级别 | 用途 | 是否首批必须 |
|---|---|---|---:|
| `component_schema.v2` | 公共 | 局部变量、单位、相态、角色、守恒标签 | 是 |
| `process_graph.v2` | 公共 | Typed Units/Ports/Edges、composite refs、profile refs | 是 |
| `simulation_input.v2` | 公共 | 已解析但未编译的通用 Hybrid worker payload | 是 |
| `composite_template.v1` | 公共/资产 | 可复用图模板及 invariants | 是 |
| `forcing_series.v1` | 公共 | 动态进水、测量值、外部时序 | 是 |
| `evaluation_profile.v1` | 公共/资产 | 评价窗口、规则和指标定义 | 是 |
| `controller_profile.v1` | 公共/资产 | sensor/controller/actuator 参数与采样语义 | 是 |
| `flow_balance_report.v1` | Artifact payload | 水力可解性与执行诊断 | 是 |
| `conformance_report.v1` | Artifact payload | BSM1 等 benchmark suite 结果 | 是 |
| `compiled_execution_plan.v1` | 内部或 artifact | 重放/调试时保存编译计划 | 可后置 |
| `benchmark_campaign.v1` | API orchestration | 批量 schedule mandatory cases | 可后置 |

不建议首批新增：

```text
bsm1_input.v1
bsm1_result.v1
bsm1_controller_trace.v1
bsm1_clarifier_diagnostics.v1
```

原因是它们会把通用 artifact 和 time-series 体系重新按 benchmark 分叉。BSM1 专有差异应放在 package/profile/metadata 中。

## 11.3 `simulation.hybrid.v1`

推荐在 `compute_job.v1.job_type` 和 Go/Worker routing 中协调新增：

```text
simulation.hybrid.v1
```

payload：

```text
simulation_input.v2
```

不推荐把 BSM1 主入口设为：

```text
simulation.bsm1.v1
```

可选兼容 alias 只能在通用 runtime 完成后增加，且必须编译成同一 `simulation.hybrid.v1` execution plan，不能拥有独立 RHS。

## 11.4 现有 job type 兼容策略

```text
simulation.material_balance.v1 ─┐
simulation.asm1slim.v1          │
simulation.asm1.v1              ├─ 保持原合同和原行为
simulation.asm3.v1              │
simulation.udm.v1             ──┘

simulation.hybrid.v1 ── 新合同、新 compiler、新 runtime
```

后续可让 legacy job 内部委托 Hybrid，但必须先建立 old-vs-new golden parity；不能为了统一代码而提前改变其 clamp、dtype、solver 或 component-prefix 行为。

## 11.5 Worker capability

建议新增最小、可路由的 capability：

```text
hybrid_runtime_v1
typed_ports_v1
algebraic_hydraulics_v1
event_runtime_v1
mass_flux_takacs_v1
float64_cpu
checkpoint_v2
```

Worker self-check 还应报告：

- runtime/package version；
- plugin registry keys；
- solver registry；
- supported schema versions；
- dtype/device combinations；
- deterministic mode support；
- adapter validation mode；
- package manifest resolver version。

Capability 是调度约束，不应无限细化为每个模型参数的功能标记。

## 11.6 Worker artifact

推荐：

```text
compile_report.json
state_registry.json
result_summary.json
timeseries.parquet
unit_timeseries.parquet（可分片）
flow_balance_report.json
controller_trace.parquet
clarifier_profile.parquet
conservation_report.json
solver_diagnostics.json
conformance_report.json（benchmark run 时）
checkpoint/*
resolved_manifest.json
```

所有 artifact 通过现有 artifact lifecycle 上传并返回 checksum；大时序不得嵌入 `compute_result.v1`。

## 11.7 Go Compute API

新增工作：

1. `domain/simulation` 注册 `simulation.hybrid.v1` 与 required capabilities；
2. 接受/注册 `simulation_input.v2` 和 `process_graph.v2`；
3. 提供 compile/validate preview，不创建执行 job 也可返回 CompileReport；
4. benchmark case schedule 使用现有 Model Catalog 与 input_ref；
5. 读取 conformance/flow/conservation artifacts；
6. model_run 保存 package、graph、plan、parameter、forcing、controller、evaluation、solver hashes；
7. benchmark_run 继续作为已完成 model_run 的审计历史，不承担实际执行；
8. promotion plan 只在 mandatory cases 全绿、证据引用有效、scope 匹配时 ready；
9. 所有新增 mutation 同步 mutation scope matrix、security smoke 和 audit envelope；
10. tenant/project/site scope 必须传播到 graph、input、artifact、model_run 和 benchmark_run。

## 11.8 Model Catalog 中的 BSM1

现有 `model_catalog.v1` 已可承载 runtime、parameter set 和 benchmark cases。首版建议：

```text
model_key       = iwa.bsm1
model_version   = 1.0.0-reference
runtime         = autowatersimu.hybrid.v1
supported_jobs  = [simulation.hybrid.v1]
```

`metadata` 保存：

```text
package_manifest_ref
package_manifest_hash
component_schema_refs
composite_template_refs
forcing_profile_refs
controller_profile_refs
evaluation_profile_ref
reference_provenance_ref
qualification = official_reference_candidate
```

若未来大量模型均由多资源 package 组成，再设计 `model_package_catalog.v1/v2`；本期不必先改写现有治理域。

## 11.9 Parameter hash

BSM1 的 resolved parameter hash 必须覆盖：

- ASM1 UDM parameters；
- reactor volume/aeration settings；
- clarifier geometry/Takács/profile parameters；
- flow specs/actuator bounds；
- controller parameters；
- forcing parser/options；
- evaluation parameters；
- mapping/conservation coefficients；
- execution profile 中会改变数值结果的选项。

只哈希 `payload.parameters` 不足以证明同一模型运行。

## 11.10 Reference provenance manifest

至少包含：

```text
source title/version
source URL or archival location
retrieval date
license/use notes
raw file hash
normalization/conversion script hash
column/time/unit mapping
known deviations
approver
```

未经 provenance 冻结的 reference asset 只能用于开发 sanity check，不能作为 promotion gate。

---

# 12. 数值、精度、时间与可重复性策略

## 12.1 ExecutionProfile

不得继续由 calculator 隐式选择 CUDA 和 float32。新 runtime 必须显式传入：

```json
{
  "profile_id": "reference.cpu.f64.v1",
  "device": "cpu",
  "dtype": "float64",
  "solver": {},
  "deterministic": true,
  "negative_state_policy": "strict_audited",
  "adapter_validation_mode": "strict"
}
```

建议 profile：

| Profile | 目的 | 默认行为 |
|---|---|---|
| `legacy.compat.v1` | 旧 job 回归 | 保持现有 dtype/clamp/solver 行为 |
| `reference.cpu.f64.v1` | BSM1 conformance | CPU、float64、strict、确定性 |
| `production.explicit.v1` | 常规 Hybrid | 显式 CPU/GPU、dtype、solver |
| `research.diff.v1` | 参数研究/可微分 | 独立证据，不具 official qualification |

## 12.2 Solver registry

当前 `CalculationParameters` 接受：

```text
scipy_solver, euler, rk4, adaptive_heun
```

并拒绝 `dopri5`。因此 v3.1 规定：

- legacy 默认 `scipy_solver` 不变；
- Hybrid contract 不使用未经实现验证的 solver 名称；
- 若需要 LSODA/BDF/Radau，建立明确的 SciPy adapter、事件边界、dense output 和 error mapping；
- reference solver 通过 parity matrix 冻结，而不是凭经验指定；
- solver 名、版本、rtol/atol、max step、Jacobian policy 进入 model_run；
- solver fallback 默认关闭；若允许 fallback，必须记录原失败和实际 solver；
- `max_iterations`、`max_memory_mb` 在真正实现前不得宣传为资源保护。

## 12.3 时间基准

v2.0 建议内核统一 day，但这会对非 BSM1 模型形成隐式限制。v3.1 改为：

- 每个模型和 forcing 显式声明 time basis；
- ProcessGraph 声明 plan-wide canonical time unit；
- compiler 做量纲转换并输出 conversion report；
- BSM1 package 使用 `day`；
- legacy adapter 保持 `hour` 语义；
- 禁止分散 `/24`、`×24`；
- event/sample/checkpoint 时间都使用同一 canonical axis。

迁移分三步：

1. **边界隔离**：legacy `simulation_input.v1` 继续 hour；Hybrid compiler 根据每个模型/forcing unit 转换到 plan canonical unit；
2. **长周期字段**：`simulation_input.v2` 使用通用 `duration + time_unit`（BSM1 profile 解析为 day），不复用 legacy `hours <= 1000` 上限；
3. **静态守卫**：reaction/transfer/controller 代码禁止散落 `/24`、`*24`；转换必须经 quantity/time-base service，并进入 CompileReport。

这样既解决 100 天 stabilization，又不把所有通用模型强制为 day。

## 12.4 非负性政策

当前 legacy reaction branches 有 clamp，default branch 无 clamp。该语义受 correctness-freeze 保护，不应在 BSM1 PR 中顺手改变。

新 Hybrid 支持显式 policy：

```text
none
strict_negative_error
event_boundary_projection
model_specific_flux_limiter
legacy_solver_output_clamp
```

Reference 推荐：

- RHS 不原地 clamp state；
- 轻微负值按 variable tolerance 记录；
- 超过 hard negative tolerance 失败；
- 必需投影只在明确边界执行；
- 输出 projection count、变量、最大幅度和质量影响；
- Takács flux 使用物理限流防止转移超过可用质量，不靠事后全局截断。

新增硬性静态门：

- `*_ode.py`、RHS 和 settling kernel 中禁止 `y[y < 0] = 0`、in-place clamp 或无审计 `torch.clamp`；
- 允许的 legacy clamp 必须被限定在 legacy compatibility path，并由 correctness-freeze 明确保护；
- 新 Hybrid path 的 projection 只能在 event/solver boundary 发生并写 diagnostics；
- CI 使用 AST + targeted tests，而非仅 grep，防止同义写法绕过。

## 12.5 Checkpoint v2

保存：

```text
continuous state + state registry hash
discrete controller/sensor/actuator state
current time/event sequence
forcing cursors
resolved hydraulic values/cache version
solver continuation data（可移植部分）
random generator states
compiled plan/model/parameter hashes
projection/limiter counters
```

恢复时：

- hash 不匹配默认拒绝；
- 允许迁移必须有显式 migration adapter；
- 事件恰好落在 checkpoint 时不能重复执行；
- restart parity 纳入 mandatory test。

## 12.6 守恒与数值误差分层

```text
Level 1：transport graph residual
Level 2：unit local continuity
Level 3：COD/N/TSS semantic continuity
Level 4：whole-plant balance
Level 5：reference time-series/metric error
```

每层误差单独报告，不能用最终一个 scalar 掩盖来源。

## 12.7 性能策略

先保持现有 correctness/performance gates，再优化：

- 编译期预计算 local state indices、mapping matrices 和 active runtime；
- sparse material-flow bundle；
- vectorized clarifier interface bundle；
- hydraulic matrix/factorization 缓存；
- forcing cursor 而非每次全表搜索；
- event interval 内零阶保持；
- output sampling 与 solver internal steps 分离；
- artifact 分片/列式输出；
- 不在 RHS 中做 JSON、name lookup、Python AST 编译、数据库或日志大对象序列化。

Reference correctness 通过前不以 GPU 结果替代 CPU/f64 oracle。

## 12.8 随机性

Noise/research profile 必须：

- 显式 seed 和 generator algorithm；
- per-unit stream isolation；
- checkpoint RNG state；
- model_run 记录；
- reference 默认无随机或使用冻结 noise artifact。

---

# 13. 前端通用化改造

## 13.1 FlowCanvas 不再硬编码单一边

当前 `FlowCanvas` 内部只注册 `editable`。建议接口：

```typescript
interface FlowCanvasProps {
  nodeTypes: NodeTypes
  edgeTypes: EdgeTypes
  nodeFactory: NodeFactory
  edgeFactory: EdgeFactory
  connectionMode: ConnectionMode
  store: ModelFlowStore
}
```

共享画布只管理交互，不决定物理语义。

## 13.2 EdgeFactory

```typescript
type EdgeDomain = "material_flow" | "mass_flux" | "signal"
type EdgePreset = "passive_flow" | "pump_flow" | "takacs_settling" | "signal"
```

`pump_flow` preset 原子创建 actuator + controlled flow edge，或创建可在编译时规范化的 UI composite record。

## 13.3 Store 唯一性和事务

`createModelFlowStore` 需要：

- duplicate key 使用 ports/domain/semantic_slot；
- `addComposite()` 事务；
- `removeComposite()`；
- `applyGraphMigration()`；
- `previewCompile()`；
- undo/redo transaction；
- connection mode/preset；
- edge/node registry metadata；
- 不把 flow solver 结果写成用户输入字段。

Resolved preview 建议保存在独立 transient state：

```text
compilePreview
flowPreview
validationIssues
resolvedMappings
```

## 13.4 Registry-driven palette

UDM 页面不应手写越来越长的 nodeTypes 数组。建议由 registry 生成：

```text
Basic: Input, Output, UDM CSTR, Storage
Transport: Passive Flow, Pump Flow, Settling Flux, Signal
Control: Sensor, PI Controller, Flow Actuator, Transfer Actuator
Templates: Five-stage BSM1, Ten-layer Clarifier, Full BSM1
Advanced: Layer Unit, Mapping Adapter
```

权限/profile 决定可见项。

## 13.5 Schema-driven Inspector

Inspector 根据 unit/edge spec schema 渲染：

- 基础字段；
- parameter set ref 和 override；
- unit/quantity editor；
- validation issue 定位；
- requested/bounded/resolved read-only values；
- compile lineage；
- reference lock；
- research qualification warning。

Takács reference composite 默认编辑共享 profile，不让用户逐边修改 9 份参数。

## 13.6 Composite UX

- 拖入模板时先显示 parameter dialog；
- 原子创建并自动布局；
- collapse/expand；
- external ports 固定；
- child node advanced edit；
- reference topology lock；
- “另存为 research variant”；
- restore template diff preview；
- group badge 显示 template/version/profile/hash。

## 13.7 Compile/Flow Preview

前端调用同一 compiler 的 validate endpoint，显示：

```text
schema/type errors
component mapping
expanded graph
state count
rank/DOF
known/unknown/resolved flows
active bounds/conflicts
next event count
qualification status
```

禁止在 TypeScript 中实现另一套简化水力求解器作为真实执行依据。

## 13.8 Result UI

- unit/local-state selector；
- 五池状态；
- layer-depth heatmap/profile；
- flux/limiter profile；
- controller requested/bounded/applied traces；
- flow balance events；
- conservation waterfall；
- reference overlay；
- conformance cases；
- provenance/hashes；
- reference/research 显著、不可隐藏的标签。

## 13.9 旧图迁移

旧 edge 无 domain 时：

```text
edge.type=editable + data.flow
→ material_flow / passive_flow
```

迁移规则：

- 保留原始 graph version；
- 首次加载只做内存 preview；
- 用户显式保存时写新版本；
- migration report 列出默认假设；
- 原始 JSON 可下载；
- 不把 legacy `a/b` 自动解释为 settling 参数；
- UDM tutorial 和既有 flow import/export 有 E2E 回归。

---

# 14. 兼容边界与迁移路线

## 14.1 必须持续通过

```text
simulation.material_balance.v1
simulation.asm1slim.v1
simulation.asm1.v1
simulation.asm3.v1
simulation.udm.v1
udm_only Hybrid validation
mixed ASM/UDM current fixtures（明确历史/当前身份后）
legacy backend route compatibility
worker source/package no-fallback
Desktop sidecar
current-flow live smoke
frontend existing flow import/export/tutorial
```

## 14.2 `udm_only` 的去向

`udm_only` 不删除，作为 compatibility compiler：

```text
HybridUDMConfig
→ normalize selected models and pair mappings
→ create local unit/port mappings
→ emit Hybrid IR
→ run through common compiler/runtime
```

迁移完成前：

- old validator 继续作为前置 validation；
- common runtime 与 legacy runtime 进行 golden parity；
- 新功能不得只加在 backend validator 而不进入 simulation_core；
- 最终是否 deprecated 由使用量和迁移证据决定。

## 14.3 Legacy route schema

最新分支已通过 service boundary 将 `customParameters/component_schema` bridge 到 core runtime metadata。v3.1 要求：

- 保留该兼容桥；
- 不把新 typed-hybrid 字段继续堆进 `app.models.MaterialBalanceInput`；
- 新 Hybrid route/Compute API 使用 contracts source-of-truth；
- OpenAPI/client drift gate 同步；
- legacy route 删除是单独高风险迁移，不与 BSM1 合并。

## 14.4 文档迁移

- 本文落库后将 v2.0 标记 superseded；
- `docs/takacs_diffusion/design_and_execution.md` 添加 superseded banner，并链接 Hybrid mass-flux 设计；
- 更新 `docs/architecture/current-state.md`；
- 新增 ADR：local-state/typed-port Hybrid；
- 新增 ADR：pump normalization；
- 新增 ADR：contract v2/job type；
- 新增 ADR：reference/research qualification；
- `.ai/changes/` 记录审计依据、未重跑测试和后续 gate。

---
# 15. 实施路线与阶段退出条件

## 15.1 总原则

实施顺序必须先建立通用语义和编译闭环，再加入 BSM1 物理资产：

```text
事实与合同冻结
→ 局部状态/端口 IR
→ Hybrid compiler skeleton
→ 水力/事件/UDM v2 primitives
→ Takács mass flux 与 composite
→ BSM1 open-loop package
→ 控制/评价/conformance
→ Worker/API/UI/发布门完整闭环
→ research profiles
```

不能先在旧 calculator 中写完整 BSM1，再回头“抽象成通用框架”；这会把专用假设固化进核心。

两条工作流可并行，但必须在 open-loop whole-plant 处汇合：

```text
Scientific：reference → ASM1 UDM → settling oracle → plant → control/evaluation
Platform：contracts/IR → compiler → hydraulics/events → Worker/API/UI/governance
```

参考资源配置为 2 名科学计算/水处理工程师 + 1 名前端/平台工程师时，official-reference critical path 可按 **14–18 周**估算，reactive-settler research 另需 **2–4 周**。该数值仅用于排期量级，不替代 Phase exit evidence，也不能因已有地基而压缩科学复核。

## 15.2 Phase 0：事实、文档与 ADR 冻结

交付：

- pin target head 和 audit manifest；
- 修正 current-state、mixed fixture 和 Takács 文档漂移；
- reference/source/license manifest 草案；
- ADR：local state + typed ports；
- ADR：三 edge domains + pump normalization；
- ADR：`simulation.hybrid.v1`、ProcessGraph v2、SimulationInput v2；
- ADR：reference/research qualification；
- 当前五类 job/golden/gates 证据快照。

退出条件：

- 不再有“应该改 legacy 还是 simulation_core”的歧义；
- 不再有 BSM1 专用 runtime 与通用 runtime 的双路线；
- 所有会影响 schema/state layout 的决策已记录。

## 15.3 Phase 1：合同与内部 IR

交付：

- component_schema.v2；
- process_graph.v2；
- simulation_input.v2；
- unit/port/edge/composite schema；
- valid/invalid fixtures；
- contract registry 和 codegen；
- CanvasGraph v1 → ProcessGraph v2 adapter skeleton；
- `simulation.hybrid.v1` routing skeleton，暂不执行未支持 physics。

退出条件：

- 合同能表达 13 状态 reactor 与 8 状态 layer；
- 三种 edge domain 可类型检查；
- BSM1 结构可完整序列化但明确标记 non-executable；
- 旧合同和 client drift gate 全绿。

## 15.4 Phase 2：Hybrid Compiler Skeleton

交付：

- composite expansion；
- model/asset resolution；
- local state registry；
- typed port mapping；
- compile report/hash；
- minimal storage + passive material-flow units；
- deterministic plan snapshot tests。

退出条件：

- 多局部 schema 图可编译；
- 一条 13→8→13 映射链有 round-trip/continuity 测试；
- 编译计划不依赖 HTTP/DB；
- 同一输入重复编译 hash 一致。

## 15.5 Phase 3：UDM v2、RuntimeContext 与事件

交付：

- UDM v2 schema/compiler；
- `t`、signal、forcing、local volume 的 typed context；
- reaction/transfer 分离；
- forcing series；
- event scheduler；
- discrete state/checkpoint skeleton；
- UDM v1 compatibility adapter；
- 标准 ASM1 UDM model 与 rate/derivative tests。

退出条件：

- 单池标准 ASM1 reference 通过；
- forcing 和 signal 可驱动 transfer term；
- event ordering/restart parity 通过；
- legacy UDM fixture 无回退。

## 15.6 Phase 4：代数水力与 Flow Actuator

交付：

- flow variable/spec compiler；
- rank/DOF/conflict diagnostics；
- fixed/ratio/split/residual/actuated；
- bounds active-set/re-solve；
- event invalidation/cache；
- flow actuator requested/bounded/resolved；
- flow balance preview API/artifact。

退出条件：

- BSM1 回流拓扑唯一求解；
- 欠定、冲突、负流量、bound infeasible 均阻断 strict run；
- 五池/回流水量残差通过；
- 前端 preview 与 Worker 使用同一 compiler。

## 15.7 Phase 5：MassFlux、Takács 与十层 Composite

交付：

- generic mass-flux runtime；
- Takács plugin clean-room implementation；
- shared capacity limiter；
- vectorized interface bundle；
- ten-layer template；
- reference/component-resolved profiles；
- clarifier diagnostics；
- profile mapping tests。

退出条件：

- internal solids conservation、zero volume effect 通过；
- layer steady/dynamic oracle 通过；
- 10 层可原子插入、保存、展开和恢复；
- reference profile 不含 reaction runtime。

## 15.8 Phase 6：Open-loop BSM1 Model Package

交付：

- full plant composite；
- average/dry/rain/storm forcing assets；
- fixed Qint/KLa/RAS/WAS profiles；
- stabilization campaign；
- first-day artifact；
- whole-plant conservation；
- package manifest 和 model catalog case definitions。

退出条件：

- open-loop steady、first-day 对照达到冻结容差；
- checkpoint/restart、repeatability 通过；
- 所有结果可追溯到 package/plan/asset hashes。

## 15.9 Phase 7：控制、评价与 Conformance

交付：

- sensor/controller/actuator runtimes；
- DO/NO3 profiles；
- evaluator plugin；
- EQI/污泥/能耗/违规；
- conformance report；
- mandatory benchmark suite。

退出条件：

- closed-loop dry/rain/storm 通过；
- 控制时序和评价窗口一致；
- failed case 不自动更新 golden/tolerance；
- research profile 不影响 official status。

## 15.10 Phase 8：平台、UI 与发布门

交付：

- Worker capabilities/artifacts；
- Compute API registration/preview/scheduling；
- Model Catalog/benchmark_run/evidence；
- frontend registry、edge factory、composite、preview、result UI；
- integration/browser/current-flow/security/Desktop smokes；
- nightly full conformance lane。

退出条件：

```text
UI/template or API input
→ compile preview
→ schedule job
→ worker execute
→ artifacts/model_run
→ conformance
→ benchmark_run
→ evidence/readiness
```

全链路可重放，且 mandatory cases 全绿才允许 promotion plan ready。

## 15.11 Phase 9：Research Profiles

交付：

- component-resolved nonreactive 对照；
- reactive ASM1 layer binding；
- derivative decomposition；
- research benchmark cases；
- 文献/现场数据验证计划；
- 可选扩散、混合或多 settling class plugin。

退出条件：

- 与 reference qualification 完全隔离；
- 关闭 reaction 时与 nonreactive profile parity；
- 守恒、稳定性和参数可辨识性报告完成。

---

# 16. 推荐 PR 拆分

```text
PR-01  audit manifest + current-state/doc drift fixes
PR-02  ADR local-state/typed-port hybrid architecture
PR-03  ADR edge domains + pump normalization + qualification
PR-04  component_schema.v2 contracts + fixtures
PR-05  process_graph.v2 contracts + fixtures
PR-06  simulation_input.v2 + simulation.hybrid.v1 routing skeleton
PR-07  internal Hybrid IR + deterministic compile report
PR-08  composite expansion + lineage/invariant validation
PR-09  local state registry + checkpoint layout
PR-10  typed port mapping + unit conversion + continuity tests
PR-11  UDM v2 schema/context/compiler
PR-12  UDM v1 compatibility adapter + parity
PR-13  event scheduler + forcing series + checkpoint discrete state
PR-14  generic transfer runtime + aeration actuator
PR-15  standard 13-state ASM1 UDM package + rate/derivative tests
PR-16  hydraulic constraint compiler + rank/DOF report
PR-17  deterministic bounded flow solver + cache/events
PR-18  flow actuator + requested/bounded/resolved + energy hooks
PR-19  generic mass-flux runtime + conservation tests
PR-20  Takács plugin + official limiter oracle tests
PR-21  composite template registry + frontend atomic insertion
PR-22  ten-layer clarifier profiles + mappings/diagnostics
PR-23  full open-loop BSM1 model package + stabilization
PR-24  sensor/PI/actuator event runtime + default loops
PR-25  evaluation profile + BSM1 metrics + conformance report
PR-26  Worker artifacts/capabilities + API/model catalog integration
PR-27  frontend registry/typed edges/preview/result UI
PR-28  hosted conformance/security/release evidence gates
PR-29  component-resolved and reactive research profiles
```

拆分规则：

- 每个 PR 可独立回滚；
- schema 与 consumer 同步；
- 科学公式 PR 不同时做大规模 UI 重构；
- compatibility behavior 变更单独 ADR/PR；
- golden refresh 与实现 PR 分离审批；
- 新 mutation route 与 scope/audit/security-smoke 同 PR；
- 任何性能优化先证明不改变 correctness-freeze。

---

# 17. 测试与验证矩阵

## 17.1 现有 gate 必须持续运行

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-contracts.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/audit-simulation-core-boundary.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/audit-simulation-core-input-contract.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/audit-simulation-core-correctness-freeze.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/audit-worker-dependency-installation.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ci/performance-golden-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ci/pr-fast.ps1
```

在对应阶段还需运行现有 integration、browser、current-flow-live、security、Desktop 和 release/golden lanes。

## 17.2 新增 gate 建议

```text
scripts/audit-hybrid-runtime-boundary.ps1
scripts/audit-hybrid-contracts.ps1
scripts/ci/hybrid-compiler-smoke.ps1
scripts/ci/hybrid-worker-smoke.ps1
scripts/ci/bsm1-open-loop-smoke.ps1
scripts/ci/bsm1-conformance-nightly.ps1
scripts/audit-hybrid-antipatterns.ps1
```

`audit-hybrid-antipatterns` 至少检查：

- typed runtime 只存在于 `simulation_core`；
- RHS/ODE/mass-flux kernel 无原地非负 clamp；
- reaction/transfer/controller 中无散落 `/24`、`*24`；
- BSM1 package 无独立 RHS/calculator；
- reference/research settling profile 解析到同一 kernel key。

职责：

- boundary：Hybrid core 不导入 HTTP/DB/frontend；
- contracts：v2 schema、registry、examples、codegen drift；
- compiler：固定输入的 plan hash、state registry 和 diagnostics；
- worker：`simulation.hybrid.v1` 最小 job；
- open-loop：短时 BSM1 结构/守恒 smoke；
- nightly：完整 stabilization 和 mandatory cases。

## 17.3 Contract tests

- unknown schema/version；
- local component units/roles；
- duplicate variable/port/edge identity；
- invalid material↔signal connection；
- missing mapping；
- unit conversion；
- composite broken invariant；
- reference topology mutation；
- unsupported plugin/profile；
- old graph migration；
- job type/capability/client drift。

## 17.4 Compiler tests

- deterministic plan hash；
- composite expansion lineage；
- per-unit state slices；
- local 13→8→13 mapping；
- derived state not duplicated；
- sparse operator parity；
- unsupported cycle/type error；
- compatibility adapter report；
- compile warning qualification policy。

## 17.5 UDM tests

- 8 process rates；
- stoich expressions；
- 13-state derivative；
- parameter/unit validation；
- time/signal/forcing symbols；
- invalid AST/function/symbol；
- evaluator exception fail-fast；
- local→global mapping uniqueness；
- COD/N continuity；
- float32/float64 comparison；
- UDM v1 parity；
- mixed multiple UDM model mappings。

## 17.6 Event/control tests

- forcing ZOH/interpolation；
- coincident event ordering；
- controller sample offset；
- anti-windup/saturation；
- actuator rate limit；
- hydraulic invalidation；
- sensor delay/noise seed；
- checkpoint at event boundary；
- restart no double update；
- output sample alignment。

## 17.7 Hydraulic tests

- simple chain；
- splitter/mixer；
- ratio；
- residual outlet；
- one/multiple recycles；
- BSM1 Qint+RAS+WAS；
- connected components；
- rank deficient；
- conflicting fixed flows；
- bound activation/re-solve；
- infeasible bounds；
- reversible/negative flow policy；
- dynamic-volume exclusion；
- event cache invalidation；
- preview/execution parity。

## 17.8 Mass-flux/Takács tests

- zero solids；
- uniform profile；
- batch settling；
- source available-mass limiter；
- shared interface capacity；
- feed layer；
- top/bottom boundaries；
- threshold/non-settleable policy；
- high-concentration limit；
- no soluble settling；
- no volume effect；
- internal mass conservation；
- vectorized vs scalar oracle；
- profile parameter hash；
- reference vs component-resolved mapping continuity。

## 17.9 Property/metamorphic tests

- 重命名非语义 node ID 不改变数值结果；
- component 顺序变化、schema key 不变时结果等价；
- internal edge 顺序变化结果等价；
- 将一个 passive flow 拆成两个相同并行 flow，流量与 transform 合理分配后结果等价；
- mass-flux source/target 同时加减保持内部总质量；
- checkpoint 分段运行与连续运行等价；
- 无 signal/controller 时事件拆分不改变结果；
- composite 折叠/展开不改变 ProcessGraph hash。

## 17.10 BSM1 suite

```text
bsm1.asm1.rates
bsm1.asm1.derivatives
bsm1.compiler.plan
bsm1.hydraulics.default
bsm1.clarifier.steady
bsm1.clarifier.dynamic
bsm1.open_loop.steady_100d
bsm1.open_loop.first_day
bsm1.closed_loop.dry
bsm1.closed_loop.rain
bsm1.closed_loop.storm
bsm1.checkpoint_restart
bsm1.conservation
bsm1.repeatability
bsm1.evidence_integrity
```

每个 case 必须区分：

```text
contract validity
execution success
scientific pass
qualification pass
```

## 17.11 Frontend/E2E

- registry palette；
- 三 edge domain 与 Pump preset；
- parallel semantic edges；
- composite atomic create/delete/undo；
- collapse/expand；
- reference lock/research clone；
- save/load/migrate；
- compile preview；
- flow conflict定位；
- run/result/evidence；
- UDM tutorial regression；
- live Worker current-flow path；
- Desktop package import/export。

---

# 18. Definition of Done

## 18.1 通用 UDM + Hybrid

- [ ] UDM v2 具有 typed local state、inputs、outputs、units 和 RuntimeContext；
- [ ] UDM v1/`simulation.udm.v1` 保持回归；
- [ ] ProcessGraph v2/SimulationInput v2 合同与 fixtures 完整；
- [ ] Hybrid compiler 可展开 composite、注册局部状态并编译端口映射；
- [ ] 三种 edge domain 有合同、runtime、UI 和测试；
- [ ] Pump preset 编译为 flow actuator + material flow；
- [ ] event scheduler、forcing、discrete state 和 checkpoint 可用；
- [ ] 水力 solver 支持循环、bounds、rank/DOF 和严格不可行诊断；
- [ ] `simulation.hybrid.v1` Worker/API/Client 闭环；
- [ ] 现有五类 job 和 legacy route 全绿。

脱离 BSM1 的强制能力证明：

- [ ] 三层自定义沉降图使用 research 参数化运行并守恒；
- [ ] 非 BSM1 循环水力图完成唯一解、欠定和冲突诊断；
- [ ] 非 ASM1 UDM 接收 forcing source 的 zero-order-hold 输入；
- [ ] 单池 DO sensor + PI + actuator 回路可重复运行并 checkpoint/restart；
- [ ] 上述用例与 BSM1 reference 共享 compiler、event runtime 和 kernel registry。

## 18.2 科学模型

- [ ] 标准 13 状态、8 过程 ASM1 UDM；
- [ ] rate/derivative/COD/N continuity 通过；
- [ ] aeration transfer 与 Petersen reaction 分离；
- [ ] 十层 reference 二沉池为 8×10 局部状态、非反应；
- [ ] Takács 公式、limiter、边界和 mass conservation 逐项验证；
- [ ] 13→8→13 stream mapping 可审计；
- [ ] whole-plant water/COD/N/TSS conservation；
- [ ] reference CPU/f64、solver 和 negative policy 冻结。

## 18.3 BSM1 Conformance

- [ ] reference provenance/license/hash manifest；
- [ ] 100-day stabilization case；
- [ ] first-day 15-min case；
- [ ] dry/rain/storm；
- [ ] DO/NO3 closed loops；
- [ ] EQI/污泥/曝气/泵送/违规指标；
- [ ] checkpoint restart parity；
- [ ] deterministic repeatability；
- [ ] conformance report schema-valid；
- [ ] model_run/benchmark_run/artifact/evidence refs 完整；
- [ ] mandatory cases 全绿才允许 promotion ready；
- [ ] golden/tolerance 更新需独立审批。

## 18.4 Research profiles

- [ ] 与 official reference 使用不同 qualification；
- [ ] component-resolved nonreactive 通过守恒；
- [ ] reactive ASM1 关闭反应时 parity；
- [ ] transport/flux/reaction derivative decomposition；
- [ ] X_ND/TSS/N 无重复计量；
- [ ] UI/artifact/model_run 持久标记 research-only；
- [ ] 不进入 official mandatory cases。

---
# 19. BSM1 模型包候选冻结要求

> 本节继承 v2.0 的 BSM1 目标语义，作为 package 构建基线；具体数值、时间顺序和公式必须在 Phase 0 通过官方 reference manifest、许可证和 hash 再确认。未完成 provenance 冻结前，这些值是“候选要求”，不是已认证事实。

## 19.1 厂站结构

```text
Dynamic Influent
  ↓
Anoxic Tank 1   1000 m³
  ↓
Anoxic Tank 2   1000 m³
  ↓
Aerobic Tank 3  1333 m³
  ↓
Aerobic Tank 4  1333 m³
  ↓
Aerobic Tank 5  1333 m³
  ↓
10-layer Secondary Clarifier 6000 m³
  ├─ Effluent Qe
  └─ Underflow Qu = Qr + Qw
       ├─ Return Sludge Qr → Tank 1
       └─ Waste Sludge Qw → Sludge sink

Tank 5 ── Internal Recycle Qint ──→ Tank 1
```

## 19.2 标准 ASM1

必须实现完整 13 状态：

```text
S_I, S_S, X_I, X_S, X_BH, X_BA, X_P,
S_O, S_NO, S_NH, S_ND, X_ND, S_ALK
```

以及 8 个基本过程：

1. 异养菌好氧生长；
2. 异养菌缺氧生长；
3. 自养菌好氧生长；
4. 异养菌衰减；
5. 自养菌衰减；
6. 溶解有机氮氨化；
7. 截留有机物水解；
8. 截留有机氮水解。

## 19.3 Reference clarifier 候选几何

```text
layers           10
feed layer       bottom-up layer 6
area             1500 m²
layer height     0.4 m
total height     4 m
total volume     6000 m³
reaction         off
settling law     Takács double exponential + official flux limits
```

要求：

- top layer 对应 overflow；
- bottom layer 对应 underflow；
- soluble states 随 material flow；
- particulate stream 通过 TSS/profile mapping；
- layer numbering 在 schema、UI、代码和报告中统一使用 bottom-up，并在显示层提供 top-down label 但不改变 ID。

## 19.4 初始化与 open-loop 候选配置

```text
stabilization       100 day average influent
Qint                55,338 m³/day
KLa5                84 day⁻¹
first-day sampling  15 min
forcing time unit   day
flow unit           m³/day
```

这些值属于 BSM1 profile parameter set，不写进通用 runtime 默认值。

## 19.5 默认 closed-loop 候选配置

```text
Tank 5 DO setpoint       2 mg/L
Tank 2 nitrate setpoint  1 mg/L
DO manipulated value     KLa5
NO3 manipulated value    Qint
```

controller 公式、采样、初始化、限幅和 anti-windup 必须从 reference profile 解析，不能仅保存 setpoint。

## 19.6 评价候选语义

- 动态评价窗口候选为第 7–14 天；
- 指标积分候选采用 15 分钟零阶保持/矩形法；
- dry/rain/storm 分别注册 benchmark case；
- 输出水质、控制性能、EQI、污泥、曝气/泵送能耗和违规统计；
- 全部时间点先完成统一 event/sample alignment，再计算指标。

---

# 20. 必须讨论和研究的细节

## 20.1 P0：编码前必须形成 ADR/manifest 的决策

| ID | 议题 | 推荐默认 | 失败风险 |
|---|---|---|---|
| D-01 | 官方 reference 版本和资产 | 单一版本、原始文件 hash、转换脚本 hash | 混用版本导致伪差异 |
| D-02 | Takács 原型许可 | 外部 `breecho/takacs.py` 与仓库内 `docs/takacs_diffusion/Takacs_model1D.py` 分别核对授权；否则 clean-room | 许可证污染 |
| D-03 | 主 job type | `simulation.hybrid.v1` | BSM1 专用 runtime 分叉 |
| D-04 | 图/输入合同 | `process_graph.v2 + simulation_input.v2` | 破坏 v1 consumers |
| D-05 | 状态模型 | local StateSpec + typed ports | 8/13 状态被迫补零、错误守恒 |
| D-06 | Pump 语义 | actuator + material flow | transport/control/device 耦合 |
| D-07 | 时间基准 | 显式 time basis，BSM1=day | 隐式 `/24` 漂移 |
| D-08 | reference dtype/device | CPU float64 | 自动 GPU/float32 不可重复 |
| D-09 | reference solver | parity matrix 后冻结 | 求解器差异被误认为模型差异 |
| D-10 | 欠定水力 | strict fail，除非 objective 明确 | 任意最小范数流量 |
| D-11 | actuator bound | active-set re-solve 或 fail | clip 后水量失衡 |
| D-12 | negative state | variable tolerance + audited fail/projection | clamp 掩盖公式/步长问题 |
| D-13 | reference layer state | 8-state local schema | 130 状态结果冒充官方 |
| D-14 | feed layer numbering | bottom-up=6，ID/报告一致 | 上下层反转 |
| D-15 | controller event order | reference manifest 冻结 | 相位和指标偏差 |
| D-16 | benchmark energy | benchmark 与 physical 指标分离 | 指标口径混乱 |
| D-17 | tolerance owner | benchmark case versioned governance | 失败后放宽容差 |
| D-18 | mixed fixture 身份 | 历史 freeze 或当前 example 二选一 | 文档/测试语义冲突 |

## 20.2 P1：核心实现研究

### R-01 Takács 公式和 limiter 的逐式映射

输出必须包括：

- 公式编号/来源；
- 变量和单位；
- threshold/non-settleable term；
- clarification/thickening zone；
- feed interface；
- top/bottom boundary；
- scalar oracle；
- vectorized implementation；
- 极限案例；
- 与原型差异。

### R-02 13→8→13 particulate mapping

必须明确：

- TSS conversion coefficients；
- particulate composition ratio 的更新时间；
- zero-TSS policy；
- X_ND 的氮与 TSS 双重标签；
- effluent 与 underflow reconstruction；
- mapping continuity；
- reference 与 component-resolved 的差异量化。

### R-03 Hydraulic solver 数值方法

比较：

- exact linear solve + rank-revealing factorization；
- bounded active-set；
- linear programming feasibility；
- 明确 objective 下的 QP。

首版优先满足“可解释、确定性、严格失败”，不以最强通用优化器为目标。

### R-04 ODE/DAE 边界

- 固定体积 BSM1：ODE + event-held algebraic flows；
- 动态体积：volume state + algebraic controls；
- 状态依赖 flow：明确 index-1 DAE 或 nonlinear solve，不在普通 RHS 偷算；
- compiler 需拒绝未支持的 algebraic loop。

### R-05 Controller exact semantics

逐项研究：

- continuous/discrete PI；
- sample phase；
- initial integral；
- saturation/anti-windup；
- noise/delay；
- output hold；
- 与 forcing/output sample 同时发生的顺序。

### R-06 Stabilization 判据

- 固定 100 天与提前收敛仅用于诊断的关系；
- weighted norm；
- state-specific scales；
- controller 是否关闭；
- checkpoint chunk；
- 非收敛是否仍允许生成开发 artifact；
- benchmark qualification 必须如何处理。

### R-07 Reference solver

建立统一矩阵：

```text
solver × tolerance × max step × event segmentation × dtype
```

对 rate/derivative、单池、clarifier、whole plant 分层比较，避免直接用全厂一个误差判断 solver。

## 20.3 P2：Research settler

- 是否启用全部 ASM1 processes；
- 是否允许 hydrodynamic dispersion；
- 是否引入多 settling classes；
- 颗粒组分是否共享速度；
- feed-zone mixing；
- compression term；
- sludge blanket observations；
- 现场/中试 layer profile 数据；
- 参数可辨识性和不确定性。

所有 P2 研究项均通过 plugin/profile 扩展，不修改 `bsm1_reference`。

---

# 21. 风险登记与控制

| 风险 | 后果 | 控制 |
|---|---|---|
| 在 legacy backend 实现新物理 | core 再次分叉 | boundary audit；新 runtime 只在 simulation_core |
| BSM1 专用 job/kernel | 偏离 UDM+Hybrid | `simulation.hybrid.v1` + package/profile |
| 单一全局 component vector | 8/13 状态污染 | local state + typed port mapping |
| Pump 作为万能边 | 控制/设备/transport 耦合 | actuator normalization |
| `additionalProperties` 被当作已支持 | 合同与执行不一致 | new schema version + compiler tests |
| UDM evaluator 静默把 expression 错误变 0 | 科学错误难发现 | v2 strict compiler fail-fast |
| 自动 CUDA/float32 reference | 不可重复/漂移 | explicit CPU/f64 execution profile |
| `dopri5` 被文档宣称可用 | job validation 失败 | solver registry 以代码/测试为准 |
| 100 天只放宽 hours | 无稳态证据/失败难恢复 | stabilization campaign + checkpoint |
| 前端实现第二套 flow solve | preview/execution 不一致 | shared compiler API |
| 欠定系统最小范数继续 | 回流任意 | strict rank/DOF gate |
| bound 后 clip | 水量失衡 | active-set re-solve/fail |
| settling 影响 volume | 水量错误 | mass_flux domain，`delta_Q=0` test |
| per-component 独立 flux capacity | 总固体通量放大 | shared capacity group |
| Takács 参数复制到每条边 | 漂移/hash 不一致 | shared parameter-set ref |
| 13×10 默认 reactive | 失去官方资格 | profile qualification hard gate |
| broad clamp | 掩盖负状态与守恒问题 | explicit audited policy |
| forcing/controller event 不对齐 | 曲线和指标相位偏差 | deterministic scheduler |
| BSM1 指标固化在 core | 无法复用/升级 | evaluation profile/plugin |
| golden 自动刷新 | 错误被固化 | 独立审批和 reference hash |
| 文档漂移 | 后续错误实现 | current-state/ADR/fixture 同 PR 更新 |
| complete backend tests 未绿被忽略 | 虚假发布信心 | 分清 focused evidence 与 full-suite status |
| 许可证不清晰 | 法律风险 | provenance + clean-room |
| model hash 不含嵌套资产 | 不可重放 | resolved manifest/plan hash |
| research 结果误发布 | 合规/科学误导 | persistent qualification metadata |

---

# 22. 推荐目录结构

## 22.1 Simulation Core

```text
simulation_core/python/autowatersimu_simulation_core/
├── hybrid_runtime/
│   ├── compiler/
│   │   ├── compiler.py
│   │   ├── ir.py
│   │   ├── composite_expansion.py
│   │   ├── state_registry.py
│   │   ├── port_mapping.py
│   │   ├── hash_manifest.py
│   │   └── diagnostics.py
│   ├── runtime/
│   │   ├── execution_plan.py
│   │   ├── integrator.py
│   │   ├── event_loop.py
│   │   ├── checkpoint.py
│   │   └── execution_profile.py
│   ├── units/
│   │   ├── storage.py
│   │   ├── udm_cstr.py
│   │   ├── separator_layer.py
│   │   ├── forcing_source.py
│   │   ├── sensor.py
│   │   ├── pi_controller.py
│   │   └── actuators.py
│   ├── transport/
│   │   ├── material_flow.py
│   │   ├── mass_flux.py
│   │   ├── signal.py
│   │   └── mappings.py
│   ├── hydraulics/
│   │   ├── constraints.py
│   │   ├── rank.py
│   │   ├── solver.py
│   │   └── report.py
│   ├── plugins/
│   │   ├── flux_laws/
│   │   │   └── takacs.py
│   │   ├── transfers/
│   │   │   └── oxygen_transfer.py
│   │   └── evaluators/
│   └── udm_v2/
│       ├── schema.py
│       ├── compiler.py
│       ├── context.py
│       └── compatibility.py
└── material_balance/      # 现有兼容 runtime，按既定边界维护
```

## 22.2 Model Packages

```text
model_packages/
└── iwa/
    └── bsm1/
        └── 1.0.0-reference/
            ├── manifest.json
            ├── schemas/
            │   ├── asm1_13.component_schema.v2.json
            │   └── clarifier_reference_8.component_schema.v2.json
            ├── models/
            │   └── asm1.udm_model.v2.json
            ├── composites/
            │   ├── five_reactor.composite_template.v1.json
            │   ├── clarifier_10layer.composite_template.v1.json
            │   └── full_plant.composite_template.v1.json
            ├── parameters/
            │   ├── asm1_reference.json
            │   ├── clarifier_reference.json
            │   └── plant_open_loop.json
            ├── forcing/
            ├── control/
            ├── evaluation/
            ├── benchmarks/
            ├── references/
            └── LICENSES_AND_PROVENANCE.md
```

模型资产不应散落在 Python source 中；engine plugin 与模型 package 分离。

## 22.3 Contracts

```text
contracts/
├── component_schema.v2.json
├── process_graph.v2.json
├── simulation_input.v2.json
├── composite_template.v1.json
├── forcing_series.v1.json
├── controller_profile.v1.json
├── evaluation_profile.v1.json
├── flow_balance_report.v1.json
├── conformance_report.v1.json
└── examples/
    ├── valid/
    └── invalid/
```

## 22.4 Frontend

```text
frontend/src/features/hybrid-modeling/
├── registry/
├── canvas/
├── edge-factories/
├── node-renderers/
├── edge-renderers/
├── inspectors/
├── composites/
├── compile-preview/
├── migrations/
└── results/
```

共享 `FlowCanvas` 保持轻量，通过 props/registry 注入，不复制出一套 BSM1Canvas。

## 22.5 文档

```text
docs/architecture/
├── hybrid-runtime.md
├── local-state-and-ports.md
├── hydraulic-algebraic-plan.md
└── model-package.md

docs/benchmarks/bsm1/
├── README.md
├── reference-manifest.md
├── model-mapping.md
├── controller-semantics.md
├── evaluation-semantics.md
└── AutoWaterSimu_BSM1_UDM_Hybrid_需求与路线_v3.1.md
```

---

# 23. 优先级化优化建议

## 23.1 P0：先修正方向和事实

1. 将本 v3.1 落库并标记两份 v3.0 与 v2.0 superseded；
2. 更新 current-state、Takács 设计 banner、mixed fixture metadata；
3. 冻结四个 ADR：local state/ports、edge/pump、contract/job、qualification；
4. 明确 `simulation.hybrid.v1`，取消 BSM1 专用 runtime 主路线；
5. 设计 component_schema.v2、process_graph.v2、simulation_input.v2；
6. 把 reference execution profile 改为显式 CPU/f64，而非修改 legacy 默认；
7. 建立 package/provenance 目录和 manifest skeleton；
8. 保存当前五类 job 的 golden/CI evidence 基线。

## 23.2 P1：建立最小通用闭环

1. Hybrid IR 与 compile report；
2. local StateSpec/PortSpec；
3. passive material-flow 与 storage unit；
4. UDM v1 adapter；
5. event loop/forcing skeleton；
6. hydraulic rank/DOF preview；
7. frontend registry/edge factory/parallel edge identity；
8. `simulation.hybrid.v1` 最小 Worker job。

## 23.3 P1：完成 BSM1 critical path

1. 标准 ASM1 UDM v2；
2. aeration transfer；
3. flow actuator 和循环 hydraulics；
4. mass-flux/Takács；
5. ten-layer reference composite；
6. open-loop model package；
7. controller/evaluator/conformance；
8. model catalog/benchmark/evidence/UI。

## 23.4 P2：扩展研究能力

- component-resolved profile；
- reactive settler；
- noise/delay；
- physical pump model；
- multi settling class；
- calibration/optimization；
- GPU batching；
- ASM2d/ADM1/BSM2 package。

---

# 24. 最近两个实施迭代的可执行清单

## Iteration A：架构和合同基线

1. pin head、生成 audit manifest；
2. 修正文档漂移；
3. 提交四个 ADR；
4. 创建 `component_schema.v2`；
5. 创建 `process_graph.v2`；
6. 创建 `simulation_input.v2`；
7. 创建最小 valid/invalid Hybrid fixtures；
8. 在 Go/Worker 中注册但暂不开放 `simulation.hybrid.v1` 执行；
9. 实现 deterministic Hybrid IR/CompileReport skeleton；
10. 加入 contracts/compile hash gate；
11. 保存 legacy golden evidence；
12. 前端仅增加 registry/edge factory 接口，不先写 BSM1 专用组件。

迭代退出：

- 能表达且编译检查一个“13 状态 CSTR → 8 状态 layer → sink”的非执行图；
- old contracts/job types/client 无 drift；
- 方向性 ADR 均已批准。

## Iteration B：最小可执行 Hybrid

1. local state registry；
2. typed material ports 与 mapping operator；
3. passive material-flow runtime；
4. storage/CSTR unit；
5. UDM v1 compatibility adapter；
6. forcing/event skeleton；
7. hydraulic rank/DOF compiler；
8. `simulation.hybrid.v1` Worker minimal job；
9. Compile/Flow preview endpoint；
10. 前端三 edge domain 的 renderer/factory 骨架；
11. parallel semantic edge 回归；
12. Worker/API/artifact/model_run 最小闭环。

迭代退出：

- 一个非 BSM1 的两单元 UDM Hybrid 图可通过新合同运行；
- compile preview 与 Worker compiled plan hash 相同；
- `simulation.udm.v1` golden 不变；
- 为后续 ASM1/Takács 提供稳定扩展点。

---

# 25. 明确禁止的实现方式

- 在 `backend/app/material_balance/core.py` 直接添加 Takács、PI 或 BSM1 evaluator；
- 创建与 Hybrid 无关的 BSM1 专用大 calculator；
- 把 `simulation.bsm1.v1` 作为拥有独立 compiler/RHS 的主执行路径；
- 在 legacy `backend/app/services/hybrid_udm_validation.py` 中实现第二份 typed runtime；
- 把 8 状态二沉池补成 13 列并依赖 clamp/fixed flags 假装等价；
- 把 Pump 的 controller、能耗、flow 和 limits 全塞进 EdgeData；
- 把沉降速度乘面积作为真实 `flow_rate` 写入 volume balance；
- 每个颗粒组分独享完整界面 flux capacity；
- 每条 settling edge 复制完整共享参数；
- 在每次 RHS 解析 JSON、expression、component names 或重解固定水力；
- 欠定系统静默最小范数；
- pump limit 后简单 clip；
- 前端本地补差并写回 graph；
- BSM1 失败后自动放宽 tolerance 或刷新 golden；
- 用 focused tests 通过宣称 full repository/release green；
- 未确认许可直接复制原型；
- 将 research profile 标记为官方 BSM1 passed；
- 为了减少文件数量把 contracts、compiler、runtime、evaluator 再次集中到单个巨型模块。

---

# 26. 仓库证据索引

本次审计重点依据：

```text
README.md
README_First.md
AGENTS.md
docs/architecture/README.md
docs/architecture/current-state.md
simulation_core/README.md
simulation_core/python/autowatersimu_simulation_core/material_balance/README.md
simulation_core/python/autowatersimu_simulation_core/material_balance/models.py
simulation_core/python/autowatersimu_simulation_core/material_balance/core.py
simulation_core/python/autowatersimu_simulation_core/material_balance/udm_engine.py
simulation_core/python/autowatersimu_simulation_core/material_balance/udm_ode.py
simulation_core/python/autowatersimu_simulation_core/adapters/material_balance.py
contracts/registry.json
contracts/compute_job.v1.json
contracts/simulation_input.v1.json
contracts/process_graph.v1.json
contracts/model_catalog.v1.json
contracts/benchmark_run.v1.json
contracts/examples/valid/mixed_asm_udm.compute_job.v1.json
services/simulation-worker/README.md
apps/api/internal/domain/simulation/execution.go
backend/app/services/hybrid_udm_validation.py
frontend/src/routes/_layout/udm.tsx
frontend/src/components/Flow/FlowCanvas.tsx
frontend/src/components/Flow/edges/EditableEdge.tsx
frontend/src/components/Flow/toolbar/UDMNodesPanel.tsx
frontend/src/stores/createModelFlowStore.ts
frontend/src/types/hybridUdm.ts
docs/takacs_diffusion/design_and_execution.md
docs/takacs_diffusion/findings.md
```

审计锚点提交：

```text
d870d82ed84de5c71ec57f35608e349923b1f778
Bridge legacy route component metadata
```

---

# 27. 最终建议

v2.0 的科学目标基本正确，但产品架构仍把 BSM1 看成“需要增加一组专用节点、边、job type 和 runtime”的大型功能。目标分支经过 simulation_core 收口、mixed dispatcher、UDM mapping guard、守恒指标、Worker 包边界和 model governance 建设后，已经具备转向更高层通用抽象的条件。

v3.1 的正确关键路径是：

```text
局部状态与 Typed Ports
→ 通用 Hybrid Compiler
→ material_flow / mass_flux / signal
→ 事件驱动的代数水力与执行器
→ UDM v2 RuntimeContext
→ Takács plugin 与十层 Composite
→ BSM1 Model Package
→ Controller/Evaluator/Conformance
→ 现有 Worker/API/Catalog/Evidence 闭环
```

这样实现后：

- BSM1 能作为严格 benchmark 验证平台；
- reactive settler 只是 profile/model binding 变化；
- ASM2d、ADM1、BSM2 或厂站自定义模型可以复用同一 compiler/runtime；
- 前端不再依赖 BSM1 特判；
- 旧 Material Balance、ASM1Slim、ASM1、ASM3、UDM 和 `udm_only` 链路仍受兼容 gate 保护；
- AutoWaterSimu 的长期产品目标仍然是 **UDM + Hybrid 通用水处理建模平台**，而不是一个 BSM1 单用途模拟器。
