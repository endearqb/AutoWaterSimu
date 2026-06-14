# AutoWaterSimu 性能优化需求文档 v1.4

**版本**:v1.4(统一升级版,取代 v1.0 / v1.1 增量稿 / v1.2)
**适用分支**:`codex/autowatersimu-next-rebuild`
**核心架构决策**:方案 A 已确认——`simulation_core/python/autowatersimu_simulation_core/` 为计算内核**唯一实现**;`backend/app/material_balance/` 薄壳化为 re-export 适配层;所有优化只改 simulation_core。
**修订日期**:2026-06-13

> 编号说明:本版保留 v1.0/v1.1 全部编号与 v1.2 专项条目(REQ-P0-009~014、REQ-P1-005、REQ-P2-004~005)。v1.4 统一吸收 simulation_core 实跑复审结论,新增 REQ-P2-006,并把 ASM 热路径、表达式 fail-late、输入模型 extra 策略、mojibake 归档与氧清零 mask 约束并入既有需求。

---

## 1. 背景与目标

对 Next 重建分支的性能优化,在不破坏数值正确性的前提下,降低单仿真延迟与内存占用、提升 Go Compute API 的吞吐与可观测性。优化对象统一为 simulation_core(经方案 A 确认),收益须在 worker 实际执行路径上可验证。

**核心 KPI**(详见 §4):UDM 表达式求值与 RHS 同步开销显著下降;medium 用例总耗时 ≥ 25%;Go API claim/list 路径满足并发与延迟目标;全程数值正确性按分层容差守护。

---

## 2. 范围

**包含**:simulation_core 计算内核(表达式引擎、RHS、传输、求解器调度、结果转换);backend 薄壳化与契约统一;Go Compute API(claim/list/索引/可观测性);simulation-worker 端到端链路;配套测试与基线体系。

**不包含(非目标)**:重写求解器算法本身;更换 artifact 存储格式(仅量化序列化成本);分布式/跨进程表达式缓存;前端改动(仅在 strict 校验影响存量时同步错误文案)。

---

## 3. 需求条目

### 3.1 P0:正确性、单一来源与基线

#### REQ-P0-001:性能基线 harness
建立可复现 benchmark:覆盖 small / medium / mixed_asm_udm 三类图;**求解器维度必须包含真实默认 `scipy_solver` 及 `rk4` / `adaptive_heun`**(见 REQ-P0-013);并发请求维度 C ∈ {1,4,8}。输出统一 JSON schema,记录 `torch.get_num_threads()` 与硬件指纹。关联 REQ-P0-007 profiling 产物。

#### REQ-P0-002:数值回归 golden 体系
全部 golden 由 float64/CPU/固定 seed 生成器产出(见 REQ-P0-006),fixture 记录 torch 版本、平台、BLAS、commit。

#### REQ-P0-003:Hybrid mode 边界修复
修正 `is_hybrid = mode == "udm_only"` 类边界误判;mode 缺失/非法时 strict 报错。落点:backend services(hybrid 准备属 API 侧,见 REQ-P0-011)。

#### REQ-P0-004:UDM 映射 guard(含写侧)【High】
simulation_core `udm_engine._resolve_local_to_global_indices` 的 positional fallback(`min(local_idx, max(global_count-1,0))`,L177)与 `evaluate_reaction` 写侧 `index_add_`(全量索引)必须修复:
- 构建期校验覆盖**可解析性与唯一性**:同节点两 local 组分解析到同一 global 索引 → strict 报错(含双方 local 名与冲突 global 名),legacy warning。
- 读侧 env 构建与写侧 scatter / fixed-mask 共用同一份经校验索引。
验收用例:显式 binding 冲突、fallback 诱发冲突、错误映射不污染目标组分(数值断言)。

#### REQ-P0-005:计算内核单一事实来源(方案 A 落地)【Critical】
simulation_core 为唯一实现;backend `app/material_balance` 薄壳化 re-export。要求:
1. CI 漂移守卫:规范化 diff(去 BOM/行尾/import 映射)非零且无豁免则 fail(过渡期防回归;薄壳化完成后守卫转为"backend 仅含 re-export"断言)。
2. v1.2 各条目"落点"按方案 A 统一指向 simulation_core(除明确属 API/services 侧者)。
3. 薄壳化是复合任务,前置 REQ-P0-009/010 与测试改造(见 §5)。

#### REQ-P0-006:分层容差方法论【High】
float32 + 自适应步长下统一 1e-6 会系统性误报。分层:
- **L1 表达式级**:同 dtype old/new evaluator max_abs ≤ 1e-6(f32)/1e-12(f64)。
- **L2 单步 RHS**:同状态新旧 RHS max_abs ≤ 1e-6(f32),用于纯重排优化。
- **L3 全仿真轨迹**:relative ≤ 1e-4(f64 reference 分母 + atol 1e-8)+ 守恒量 relative ≤ 1e-6;自适应求解器以 rk4 固定步长为主判据,dopri5/LSODA 参考性。
golden 生成端强制 CPU+f64+固定 seed+`use_deterministic_algorithms`。引用误差处必须标层级。

#### REQ-P0-007:热点画像基线【High】
small/medium/mixed 三 case 出火焰图 + torch profiler;给出热点占比表(表达式/`.item()`/transport dense vs sparse/odeint 框架/其余)。若既列优化理论上限 < KPI-003,进入 Phase 2 前修订 KPI 或扩范围。

#### REQ-P0-008:存量 flowchart 兼容性审计【High】
strict 默认开启前,只读脚本干跑存量 flowchart,按原因码(unresolved/index_conflict/missing_mode/bad_pair_key)统计将失败记录,据此定迁移/过渡/报错策略。错误响应含可操作信息,前端文案同步。

#### REQ-P0-009:simulation_core 可安装化【High,薄壳化前置】
现状:`simulation_core/python/` 无 pyproject.toml,worker 靠 `_ensure_repo_import_paths()` 的 sys.path hack 导入。要求:落 `pyproject.toml`(声明 torch/torchdiffeq/pydantic/numpy 依赖区间),backend 与 worker 改 editable/wheel 依赖,删除 sys.path hack;`__version__`(现 `0.1.0-phase2b`)纳入发布流程。

#### REQ-P0-010:输入模型单一契约与死代码清理【High,薄壳化前置】
现状(代码核对):
- backend `material_balance/models.py` 的 `EdgeData` 用旧字段名(`from_node`),但 `core.py` 消费新字段名(`source_node_id`);生产路径实际由顶层 `app/models.py`(SQLModel,新字段名)构造对象鸭子类型传入 → backend 本包输入模型与 `utils.py`(`create_input_from_flowchart`,无调用方)为**死代码**;唯一仍被引用的是 `MaterialBalanceResult`。
- simulation_core `material_balance/models.py` 是清理后新版;`utils.py`(397 行)无调用方。
- `services/simulation-worker/.../runner.py` 当前通过 `simulation_input_to_material_balance_input` 进入真实 adapter,不是直接鸭子类型入核;绕过校验风险主要集中在 legacy backend 老路径。
- simulation_core `NodeData` / `EdgeData` 当前为 `extra="allow"`,camelCase 拼错、adapter 漏映射或前端传错字段可能被静默吞掉。
要求:删除两侧死模型/死 utils;`asm1/asm3/udm_service` 的 `MaterialBalanceResult` 导入改指 simulation_core;`calculate()` 输入契约从鸭子类型显式化为 simulation_core `MaterialBalanceInput`(或定义 Protocol),确认 `app.models` 对象通过其 pydantic 校验或在服务层显式转换,杜绝"绕过 simulation_core 校验入核"的隐性契约;收紧运行时关键模型的 `extra` 策略(优先 `extra="forbid"`,或 `ignore` + structured warning/log + 迁移审计),避免错拼字段静默变成空反应/空配置。

#### REQ-P0-011:canonical 输入边界契约化【Medium】
现状:adapter 构造 `MaterialBalanceInput` 不传 `hybrid_config`;hybrid 校验与 canonical 组分扩展仅在 backend services,simulation_core 无对应物——worker 路径事实上只支持已 canonical 化输入。要求:显式决策并写入契约——`simulation_input.v1` 组分空间约定为 canonical;hybrid 准备为 API 侧职责;`SUPPORTED_JOB_TYPES` 各 job_type(尤其 `simulation.udm.v1`)的输入字段边界写入 contracts。防止向 worker 直发 hybrid 形态得到静默错误。

#### REQ-P0-012:真实质量守恒指标【High,L3 验收依赖】
现状:`_calculate_mass_balance_error()` 返回 `max|总质量|×1e-8`(代码自注 placeholder),却以 `summary["final_mass_balance_error"]` 对外上报。要求:实现真实守恒检查(∫入流 − ∫出流 − Δ累积,逐组分),或改名/移除并在 release note 声明;L3 守恒判据不得依赖现字段。

#### REQ-P0-013:求解器矩阵与白名单对齐【High】
现状:`CalculationParameters` 白名单 `{scipy_solver, euler, rk4, adaptive_heun}` **不含 dopri5**,而 v1.0 验收矩阵写 rk4/dopri5 → dopri5 输入会被参数校验拒绝,验收无法执行;默认 `scipy_solver` 映射 torchdiffeq SciPy 包装器(LSODA),每次 RHS 做 tensor↔numpy 往返,是最慢路径且 GPU 失效——而全部热路径分析建立在 torch 原生求解器假设上。要求:
1. 决策:dopri5 入白名单+补测,或文档矩阵改 adaptive_heun。
2. benchmark 矩阵必须含 `scipy_solver`(真实默认),优化收益按求解器分别报告。
3. 评估默认值改 rk4/adaptive_heun(行为变更,flag + 存量影响评估)。
4. 统一 simulation_core(`tolerance` ≤1e-3、默认1e-6)与 backend(默认1e-3、无上限)的容差校验,写入契约。
5. 清理"假旋钮":`max_iterations`/`max_memory_mb` 被校验但 core 从不读取 → 实现或标 deprecated。

#### REQ-P0-014:多模型混合节点的 RHS 调度修复【Critical】
现状(代码核对,`_run_hours` L1147~):模型分支为 `if asm1slim.any() / elif asm1.any() / elif asm3.any() / elif udm.any() / else(纯传输)`,**互斥**。一张同时含 ASM1 节点与 UDM 节点(或任意两类反应节点)的流程图,只会执行 if/elif 链中**首个命中**的反应模型,其余节点反应项被**静默丢弃**,结果错误且无报错。
要求:
1. 决策目标语义:支持混合(单次 RHS 内对各 mask 子集分别加各自反应项,类似各分支已有的 `reaction_change[mask] = rates` 叠加模式,合并到统一 RHS),或显式不支持(构建期检测多反应模型共存 → 报错)。
2. 若支持:统一 RHS(REQ-P1-001/PR-10)必须将四类反应 + UDM 在同一函数内按 mask 叠加,而非互斥分支。
3. 若不支持:构建期校验 + 明确错误信息 + 存量审计(并入 REQ-P0-008)。
4. 验收:混合 asm+udm golden 用例(支持方案)或构建期报错用例(不支持方案)。

### 3.2 P1:低风险热路径优化

#### REQ-P1-001:统一 RHS 抽取
将五个 ODE 分支(`_ode_balance`/`_asm1slim_/asm1_/asm3_ode_balance`/`udm_ode_balance`)的公共骨架(状态拆分、clamp、传输 delta、稀释项、mask 投影、体积导数)抽取为单一 `_integrate` + 可插拔反应项。**前置 REQ-P0-014**:抽取必须同时解决混合调度,而非保留互斥语义。注意各分支当前对溶解氧的硬编码清零不一致(`dy_extended[:,0]`@slim、`[:,5]`@asm1、`[:,6]`@asm3),抽取时须显式化为组分索引配置(见 REQ-P1-005)。v1.4 补充:ASM 分支每步 RHS 内的 `asm*_params[mask]`、`y[mask]` 等布尔 gather 也应与 UDM mask 一起在构建期预解析或缓存稳定索引;氧清零必须受 `compute_mask` 约束,不得抽取成全列无条件写入。

#### REQ-P1-002:evaluate_reaction 去循环与预计算
预计算 transpose、消除逐组分 Python 循环、向量化 env 构建。L1/L2 等价。

#### REQ-P1-003:消除热路径 `.item()` 同步
`udm_engine` L33/L194 与 `udm_ode` L47/L59/L64 的逐节点 `.item()`/`bool(...item())`、`evaluate_reaction` 内 `.item()` 改为构建期一次性预解析为 Python int/张量索引。v1.4 补充:ASM 分支虽然没有同类 `.item()` 同步点,但 `asm1_params[asm1_mask]`、`y[asm1_mask]` 等稳定 mask gather 仍在每步 RHS 重复发生;若 mask/索引在仿真段内稳定,需预解析为索引张量或缓存子视图,并在 profiling 中单独报告剩余 gather 成本。L2 等价。

#### REQ-P1-004:表达式编译缓存【Medium】
现状:`build_udm_runtime_payload` 对每节点每表达式独立 `compile_expression`,后者每次 `ast.parse + _validate_ast`,无 memoize;100 同模型节点重复 parse/validate 100×P 次。要求:按表达式文本 LRU 缓存编译结果(maxsize 可配),evaluator 无状态跨节点共享(测试固定)。N=100 build 耗时 ↓≥70%(KPI-017)。

#### REQ-P1-005:反应组分契约与索引耦合显式化【High】
现状:ASM 反应内核按固定列位读组分(`asm1.py` `C[:,0..10]`、`asm3.py` `C[:,0..12]`),ODE 分支按固定列位清零氧;但全局组分空间用户自定义。若组分数/顺序与反应期望不符,会 IndexError 或**静默错位**(把氧清零作用在错误组分上)。要求:
1. 构建期校验:节点选定反应模型时,其全局组分映射必须满足该模型的组分契约(数量、必需组分、顺序或具名映射),否则报错。
2. 把硬编码氧索引(0/5/6)与反应输入列序提升为各模型的具名组分契约(`component_schema` → 模型期望组分的映射表)。
3. 氧清零必须作用在反应模型的 `compute_mask` 子集内。当前全列写入因前序 mask 投影而暂时无副作用,但统一 RHS/顺序调整时不得依赖该偶然顺序。
4. 验收:组分数不足/顺序错配用例报错而非静默;契约满足用例数值正确;inlet/outlet 或非计算节点的氧列不被反应清零逻辑改写。

### 3.3 P2:传输与内存优化

#### REQ-P2-001:safe-div / clamp 策略统一
统一表达式 Div(AST eval `clamp min=1e-12`,对负分母不对称)、`safe_div`(`clamp_min`)、RHS 输出 clamp 的语义并在 contracts/注释声明;特别是输出端 `clamp(x,min=0)` 当前作用于含体积列的全状态,与 RHS `V_liq` 的 1e-6 下限不对称,须区分浓度列(min=0)与体积列。

#### REQ-P2-002:RHS 输出投影一致化
现状:四个反应分支 odeint 后 `x=torch.clamp(x,min=0)`,**default 纯传输分支同一行被注释**(行为已不统一)。要求:先决策统一输出投影语义(与 REQ-P2-001 合并),default 分支单独固定现状 golden,避免 REQ-P1-001 抽取时悄改纯传输结果。

#### REQ-P2-003:sparse 传输路径与并行边语义统一【High】
现状:`_balance_param_sparse` 逐边 `q_i·(C·a_i+b_i)` 聚合(物理正确);dense `_balance_param` 用 `[n,n,r]`,并行边下 `Q_out` index_put accumulate(流量累加)但 `prop_a/b` 赋值(因子被末边覆盖)→ **dense 与 sparse 对同一并行边输入结果不同**,且 dense 是潜在存量正确性 bug。要求:
1. 以 sparse 语义为基准;并行边场景禁止 dense fallback 报错,或 dense 合并为等效 `a_eff=Σq_i a_i/Σq_i`。
2. dense vs sparse 等价验收(L2)须含并行边用例。

#### REQ-P2-004:dense 张量 lazy 化与段间复用【High】
现状:`_convert_to_tensors` 无条件物化 `prop_a/prop_b`(`[n,n,r]`,n=500/r=50/f32 ≈100MB×2),即使全程 sparse;`_build_runtime_edge_tensors` 每个 segment `zeros_like/ones_like` 重建三张 dense 张量(多数段仅改流量或无 override)。要求:dense 张量仅在确定走 dense fallback 时构建;无 override 段复用上段;`_balance_param` 内 `repeat`→`expand`、删除无谓 `Q_out.clone()`。

#### REQ-P2-005:求解输出网格与采样网格解耦【High】
现状:`_run_hours` 先在完整 `linspace(0,hours,hours×steps+1)` 物化全轨迹 `[T,n,r+1]`(hours=1000/steps=60 → T=60001),再降采样。要求:自适应方法(dopri5/adaptive_heun/LSODA)下 `t0` 直接构造为采样网格(求解器内部仍自适应);rk4 固定步长分块积分、块间只留末状态与采样点。内存峰值与速度双收益。

#### REQ-P2-006:`_balance_param` 聚合维度显式化【High】
现状:`_balance_param` 中 `m_out.sum(dim=1)` 是逐源出流聚合,应落在 `m` 维;`m_out.sum(dim=0)` 是逐目的入流聚合,应落在 `n` 维。但当前代码把 `sum_m_out` `view(n,r)`、`sum_m_in` `view(m,r)`,在方阵 `m==n` 下被掩盖,非方/退化形状可能错位或 IndexError。要求:修正为按物理维度显式 reshape/命名,避免仅靠 `view` 尺寸暗含语义;新增非方/退化输入 L2 回归,与 REQ-P2-003 的 dense/sparse 等价一起作为传输正确性门禁。

### 3.4 P3:表达式 fast compiler 与批量化(可选)

#### REQ-P3-001 / P3-002:bytecode 表达式引擎与批量化
AST → 安全 bytecode/编译函数(复用 REQ-P1-004 缓存);节点维度批量化。L1/L3 等价。

#### REQ-P3-003:整模型 codegen 原型【Stretch,Low】
以模型签名缓存,codegen 单函数返回 `[P]` rates;默认关闭,收益不足则记录关闭。

### 3.5 P4:Go Compute API 性能与可观测性

#### REQ-P4-001:可观测性指标
新增 claim/list 延迟、`worker_claim_duration_seconds`、`claim_scanned_rows` histogram;metrics 中间件自身开销可量化(可选 HTTP 层负载测试,p50 增量 ≤1ms)。

#### REQ-P4-002:索引对账先行【Medium】
落新索引前盘点既有约束/索引(`UNIQUE(source_system,requested_by,idempotency_key)`、`idx_compute_jobs_status_created`、`idx_compute_jobs_scope_created` 等),与 UNIQUE 同列的候选索引删除;新索引以 EXPLAIN 缺口为依据,评估写放大。对照表归档。

#### REQ-P4-003:claim 并发正确性 + 对抗场景【High】
100 workers / 10k jobs 无重复/跨 scope claim;**对抗场景**:50% 能力错配交错队列,在 REQ-P4-006 改造前后各测,作为收益证据。

#### REQ-P4-005:keyset cursor pagination【High】
现状:`decodeCursor` 解 `{"offset":N}`,查询 `ORDER BY ... OFFSET` → 深分页 O(offset) 且并发插入页面漂移,不满足"cursor 稳定"。要求:cursor 改排序键元组,`WHERE (created_at,id) < ($1,$2) ORDER BY ... LIMIT`;过渡兼容旧 offset 或声明不可跨版本;memory/postgres 对齐;同毫秒 tiebreaker 翻页无重复/遗漏。

#### REQ-P4-006:ClaimNext 有界扫描与谓词下推【High】
现状:`ClaimNext` `FOR UPDATE SKIP LOCKED` 无 LIMIT 取回全部 queued,capability/contract 匹配在 Go 内存逐行;能力错配队首 worker 扫锁大量行。要求:
1. 下推 contract/capability 为可索引谓词(规范化列+migration 回填 或 JSONB 索引,决策记录)。
2. 有界:claim `LIMIT k`(16~64 可配)分批+最大批数上限,超限返回 nil。
3. 持锁时长与 `claim_scanned_rows` 可观测;跨 scope 泄漏回归。

#### REQ-P4-007:simulation-worker 端到端基线【Medium】
`timings_ms` 分段(claim_wait/schema_validate/adapter_convert/compute/artifact_serialize/artifact_upload/report);Go API+1 worker N=50 medium 端到端 benchmark;大时间序列序列化成本两档量化(不改格式);该基线兼任"优化到达 worker 路径"的验证(Phase 2/4 后各跑,`compute` 分段体现收益)。

---

## 4. 量化验收指标(KPI)

| 编号 | 指标 | 目标 |
|---|---|---|
| KPI-001 | UDM 单节点表达式求值 | medium 模型 ≥ 3x（去循环+预计算+缓存） |
| KPI-002 | RHS 单步 `.item()` 同步次数 | 热路径 = 0 |
| KPI-003 | medium 用例总仿真耗时 | ↓ ≥ 25%（按求解器分别报告） |
| KPI-004 | 数值一致性（分层，REQ-P0-006） | L1 ≤1e-6；L2 ≤1e-6；L3 relative ≤1e-4 且守恒 relative ≤1e-6；自适应以 rk4 为主判据 |
| KPI-005 | 内存峰值（长仿真 hours≥500） | ↓ ≥ 30%（REQ-P2-005） |
| KPI-006 | sparse/dense 等价（含并行边） | L2 通过 |
| KPI-007 | list p95（medium 数据集） | ≤ 既定阈值（nightly 固定 runner 判定） |
| KPI-008 | claim p95（10k 队列） | ≤ 100ms（nightly 固定 runner） |
| KPI-009 | 索引优化后高频查询 | EXPLAIN 走索引范围扫描 |
| KPI-013 | 双副本一致性 | 守卫常绿；薄壳化后 backend 仅含 re-export |
| KPI-014 | keyset 深分页 | 第~100 页 p95 ≤ 第1页×2，不随页深线性增长；并发插入无重复/遗漏 |
| KPI-015 | claim 对抗场景 | 50% 错配交错下 claim p95 ≤150ms；`claim_scanned_rows` p95 ≤4×LIMIT；无重复/跨 scope |
| KPI-016 | worker 端到端 | 分段计时可见；Phase 2 后 `compute` 分段 ↓≥20% |
| KPI-017 | 表达式编译缓存 | N=100 同模型 build ↓≥70%；共享 evaluator L1 等价 |
| KPI-018 | 混合模型正确性（REQ-P0-014） | asm+udm 混合图：支持方案下 L3 通过；不支持方案下构建期报错 |
| KPI-019 | 反应组分契约（REQ-P1-005） | 组分错配报错（非静默）；契约满足数值正确 |
| KPI-020 | `_balance_param` 维度正确性（REQ-P2-006） | 非方/退化输入 L2 通过；dense/sparse 聚合语义一致 |

---

## 5. 测试与验收策略

- **数值回归**:全 golden 由 f64 生成器产出(REQ-P0-006);新增 golden 必含——索引冲突不污染(P0-004)、并行边(P2-003)、`_balance_param` 非方/退化聚合(P2-006)、混合 asm+udm(P0-014)、组分错配报错(P1-005)、ASM 氧清零仅作用于 compute_mask(P1-005)、default 分支现状(P2-002)、time_segment 边覆盖、零边/退化图、scipy_solver/adaptive_heun 路径。
- **薄壳化前置**:现 simulation_core 测试 6 个核心用例是"对照 backend 副本",薄壳化后恒真——必须先改造为独立 golden 测试(REQ-P0-002/006)。
- **Day 0 现状固化**:重构前先提交可复现脚本/fixture,把 default 纯传输 clamp 现状、并行边当前错误 repro 与目标修复 golden 分开记录,避免后续语义修复和无意行为漂移混在同一个 diff。
- **性能回归统计判据**:Go 用 benchstat(count≥10,p<0.05 才 fail);Python microbench CV>15% 不用于门禁;绝对阈值 KPI(007/008/015)仅 nightly 固定/自托管 runner 判定,merge gate 仅烟雾;基线绑硬件指纹。
- **端到端**:REQ-P4-007 纳入 nightly,Phase 2/4 后归档对比。
- **表达式安全/一致性**:补 AST 校验器 fuzz/边界用例(见 §6 风险,denylist 漏网问题),重点覆盖校验通过但运行时拒绝的 fail-late 表达式。

---

## 6. 风险与约束

| 风险 | 说明 | 控制 |
|---|---|---|
| 双副本漂移 | 优化落错副本 | REQ-P0-005 守卫 + KPI-013 |
| 1e-6 误差误报 | f32+自适应重排即超差 | REQ-P0-006 分层 + f64 golden |
| 薄壳化隐性契约 | app.models 对象绕过 simulation_core 校验入核 | REQ-P0-010 显式契约/Protocol |
| 混合模型静默错误 | if/elif 互斥丢反应项 | REQ-P0-014 决策 + KPI-018 |
| 组分索引错位 | 硬编码氧索引/固定列序 | REQ-P1-005 组分契约 + KPI-019 |
| 氧清零顺序依赖 | 全列清零当前依赖前序 mask 投影才无副作用 | REQ-P1-005 要求限定在 compute_mask 内 |
| 并行边结果错误 | dense 因子被覆盖 | REQ-P2-003 语义统一 |
| `_balance_param` 维度错位 | `sum(dim=1/0)` 后 `view(n/m,r)` 逻辑反置 | REQ-P2-006 + KPI-020 |
| 守恒占位假值误导验收 | placeholder 入 summary | REQ-P0-012 |
| dopri5 被白名单拒绝 | 验收矩阵无法执行 | REQ-P0-013 |
| 表达式校验 fail-late | 校验通过但运行时白名单拒绝 | 改白名单语义 + fuzz |
| 输入字段静默吞掉 | `NodeData`/`EdgeData extra="allow"` 容忍拼错字段 | REQ-P0-010 收紧 extra 策略 |
| ASM 热路径 gather 漏优化 | 每 RHS 步重复稳定 mask gather | REQ-P1-001/003 + profiler 证明 |
| mojibake 注释意图丢失 | 直接英文重写可能丢原中文物理含义 | PR-31 前先无损还原归档 |
| strict 破坏存量 | 既有可运行图报错 | REQ-P0-008 审计先行 |
| keyset 破坏在途 cursor | 客户端持旧 offset | 过渡兼容或声明 |
| flag 组合爆炸 | 5+ 开关 | §6.2 组合矩阵 |

### 6.1 表达式校验器 denylist 漏网【新增,Medium】
`udm_expression._validate_ast` 用"显式拦截危险节点 + 其余 fallthrough"的 denylist 模式:遍历中对未在拦截清单的节点类型直接 `continue`,新版 Python AST 节点(如 `ast.Starred`、`ast.NamedExpr`、`ast.JoinedStr`/f-string、`ast.Slice`)可能漏网。运行时 `_evaluate_ast` 反而是白名单(未知节点 raise),即校验通过的表达式运行时仍可能拒绝——两者语义不一致。实测 `mu*(x:=5.0)`、`f'{mu}'` 可校验/编译通过但仿真中途因 `NamedExpr`/`JoinedStr` raise。性质应表述为 **fail-late 一致性问题,不是 RCE**:运行时白名单仍兜住安全边界,但用户在保存/校验阶段会收到错误合法性反馈。要求:`_validate_ast` 改为白名单(仅显式允许 Expression/Load/BinOp(允许 op)/UnaryOp(允许 op)/Call(允许 func)/Name/数值 Constant,其余一律 DISALLOWED),与运行时对齐;补 fuzz 用例。

### 6.2 feature flag 组合矩阵与退场
受测组合:默认;目标(bytecode + unified_rhs + clamp 决策);5 个一阶翻转。其余声明不支持。每 flag 定义 sunset(目标组合默认稳定 ≥2 release 后删 flag 与旧路径)。新增 flag 必随附退场条件。

---

## 7. 交付物
基线 harness 与 profiling;f64 golden 生成器与分层容差套件;Day 0 现状 repro/目标 golden;单一来源决策 + 漂移守卫;simulation_core pyproject 与依赖化;模型契约统一、`extra` 策略收紧与死代码清理;mojibake 中文注释无损还原归档;混合模型调度修复;组分契约与氧清零 compute_mask 约束;并行边语义统一;`_balance_param` 维度回归;dense lazy 化;输出网格解耦;守恒指标;求解器矩阵对齐;表达式缓存与校验器白名单化;存量审计;keyset cursor;claim 有界扫描;worker 端到端基线;Go 可观测性与索引;flag 矩阵与退场记录。
