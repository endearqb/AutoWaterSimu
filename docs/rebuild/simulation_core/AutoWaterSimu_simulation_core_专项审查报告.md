# autowatersimu_simulation_core 专项代码审查报告

**审查对象**:`simulation_core/python/autowatersimu_simulation_core/`(分支 `codex/autowatersimu-next-rebuild`)
**审查背景**:已确定方案 A——simulation_core 为唯一实现,backend `app/material_balance` 薄壳化 re-export
**审查日期**:2026-06-11
**定位**:本报告全部为 v1.0 两份文档与 v1.1 增量修订稿**之外**的新发现,或对既有条目的进一步具体化。文末附与 v1.1 编号体系衔接的候选 REQ/PR 映射表。

---

## 一、方案 A 落地的前置结构性问题(不解决则薄壳化无法干净落地)

### A1.(High)simulation_core 没有打包元数据,worker 靠 sys.path hack 导入

`simulation_core/python/` 下**没有 pyproject.toml / setup.py**。`services/simulation-worker/simulation_worker/runner.py` 通过 `_ensure_repo_import_paths()`(runner.py L300~)手工 `sys.path.insert` 仓库路径来导入 `autowatersimu_simulation_core`。

方案 A 要求 backend 也 re-export 它——如果不先打包化,backend 只能复制同一个 sys.path hack,部署(Docker 镜像、依赖锁定、版本号)全部失控。`__init__.py` 里已有 `__version__ = "0.1.0-phase2b"`,但没有任何安装机制承载它。

**建议**:薄壳化之前先落 `pyproject.toml`(setuptools/hatchling 均可,声明 torch/torchdiffeq/pydantic/numpy 依赖区间),backend 与 worker 改为 editable install / wheel 依赖,删除 `_ensure_repo_import_paths`。版本号与 PR-20 决策文档中的发布流程挂钩。

### A2.(High)backend 内部实际存在"三套输入模型",薄壳化不是一句 re-export

代码核对结论:

1. `backend/app/material_balance/models.py` 曾定义旧字段名 `EdgeData`(`from_node`/`to_node`/`concentration_factors_a`)，当前已改为 re-export `simulation_core` runtime models;
2. 但 `backend/app/material_balance/core.py` 实际消费的是**新字段名**(`edge.source_node_id`、`concentration_factor_a`,L127/264/278);
3. 它能运行是因为生产路径上计算器吃的根本不是本包的模型——`data_conversion_service.py` 与 `simulation_input_adapter.py` 都从顶层 `app/models.py`(SQLModel,新字段名)构造 `EdgeData`/`MaterialBalanceInput` 传入,`core.calculate()` 是鸭子类型;
4. 因此 `backend/app/material_balance/models.py` 的旧输入模型副本已清理为 core re-export；`utils.py` 也已薄壳化为 core helper re-export。legacy route schema 仍来自 `app.models.MaterialBalanceInput`，service 层在调用 calculator 前重新校验为 core runtime input。
5. `simulation_core/material_balance/models.py` 是清理后的新版(字段名与 app.models 对齐,校验更完整)。

**含义**:薄壳化 PR 必须同时完成——删除 backend 死模型与死 utils;`asm1_service`/`asm3_service`/`udm_service` 的 `MaterialBalanceResult` 导入改指 simulation_core;把 `calculate()` 的输入契约从鸭子类型显式化为 simulation_core 的 `MaterialBalanceInput`(或定义 Protocol),并确认 `app.models`(SQLModel)对象能通过其 pydantic 校验或在服务层做一次显式转换。否则薄壳化后会出现"app.models 对象绕过 simulation_core 校验直接进核心"的隐性契约。

附带:`simulation_core/material_balance/utils.py`(397 行)同样无调用方,迁移时删除或移出包。

### A3.(High)测试体系建立在"与 backend 副本对照"之上,方案 A 落地后退化为恒真

`simulation_core/tests/test_material_balance_core.py` 共 10 个测试,其中 6 个核心数值测试的策略是 simulation_core 结果对照 backend 副本结果(`test_core_calculator_matches_backend_*`)。薄壳化后两者同一实现,parity 断言恒真,数值保护网清零。

**建议**:在薄壳化 PR 之前,把 parity 测试改造为基于 PR-22 golden 生成器的独立 golden 测试;同时补齐明显缺口:time_segment 边覆盖数值用例(backend 有 `material_balance_segment_overrides_test.py`,simulation_core 完全没有)、并行边用例(见 B1)、`scipy_solver`/`adaptive_heun` 路径用例、采样逻辑用例、零边/退化图用例(代码有专门分支但无测试)。

**2026-06-15 状态校准**:A3 的第一阶段已完成。`simulation_core/tests/test_material_balance_core.py` 已从 backend parity/oracle 测试改为 core-only CPU/f64 committed golden guard,不再导入 `app.*` 或把 `backend/` 加入 `sys.path`;六个历史 parity fixture 继续覆盖 material-balance minimal、ASM1Slim model-bound、独立 ASM1Slim/ASM1/ASM3/UDM。backend 对照保留在 `backend/app/tests/material_balance_calculator_delegation_preflight_test.py`。并行边、`_balance_param` 非方/退化、mixed ASM/UDM、UDM mapping/stoich mismatch、ASM 氧清零 compute_mask、core ASM named component guard、default no-clamp 与 solver matrix 已由 docs golden、boundary/correctness tests 和 Phase 0 golden evidence 接续维护。

### A4.(Medium)hybrid/canonical 职责边界未声明,adapter 不传 hybrid_config

`adapters/material_balance.py` 构造 `MaterialBalanceInput` 时**不传 `hybrid_config`**(模型有该字段);hybrid 校验与 canonical 组分空间扩展逻辑(`hybrid_udm_validation`、`data_conversion_service`)只存在于 backend services,simulation_core 没有对应物。即:worker 路径目前事实上只支持"上游已 canonical 化"的输入,Phase 1 的 hybrid 修复天然只作用于 backend API 路径。

这未必是错误的架构(校验/转换属产品侧、核只吃 canonical 输入是合理分层),但必须**显式决策并写入契约**:`simulation_input.v1` 的组分空间约定为 canonical;hybrid 准备是 API 侧职责;`SUPPORTED_JOB_TYPES` 中 `simulation.udm.v1` 的输入边界(哪些 udm 字段组合合法)写入 contracts 文档。否则未来有人往 worker 直发 hybrid 形态输入,会得到静默错误结果而非报错。

---

## 二、新发现的正确性/语义问题(两份修订稿均未覆盖)

### B1.(High)并行边在 dense 与 sparse 路径下语义不一致

`_convert_to_tensors` / `_build_runtime_edge_tensors` 中,同一 (src,dst) 存在多条边时:

- `Q_out.index_put_((src,dst), q_vals, accumulate=True)` —— 流量**累加**;
- `prop_a[src,dst,:] = a_edge`、`prop_b[...] = b_edge` —— 浓度因子**最后一条边覆盖**。

dense 路径因此计算 `(q1+q2)·(C·a_last + b_last)`;而 `_balance_param_sparse` 逐边计算 `q_i·(C·a_i + b_i)` 再聚合(物理正确)。**两路径对同一输入给出不同结果**。v1.0 REQ-P2-003 的验收"sparse 与 dense 误差 ≤ 1e-6"在并行边场景必然失败,且这是潜在的存量正确性 bug(走 dense fallback 的并行边流程图结果是错的)。

**建议**:决策以 sparse 语义为准;dense 路径要么修复(无法在 [n,n,r] 表示下精确表达并行边,只能合并为等效 a/b:`a_eff=Σq_i·a_i/Σq_i`),要么在存在并行边时禁止 dense fallback 并报错。新增并行边 golden 用例。

### B2.(High)`final_mass_balance_error` 是占位假值,但对外出现在 summary 中

`_calculate_mass_balance_error()`(core.py L1510~)返回 `max|total_mass| × 1e-8`,代码注释自认 "placeholder"。该值与质量守恒毫无关系,却以 `summary["final_mass_balance_error"]` 名义进入结果 payload(并随 worker 上报)。v1.1 的 L3 验收恰恰要用"守恒量相对误差"做判据——如果有人复用这个字段做验收,会被系统性误导。

**建议**:实现真实守恒检查(∫入流质量 − ∫出流质量 − Δ累积质量,各组分),或将字段改名为占位语义/从 summary 移除并在 release note 声明。L3 验收实现不得依赖现字段。

### B3.(Medium)五个 RHS 分支的输出投影行为本就不一致,PR-10"行为不变"前提不成立

`_run_hours` 中 ASM1slim/ASM1/ASM3/UDM 四个分支在 `odeint` 后执行 `x = torch.clamp(x, min=0)`(连体积列一起),而 **default(纯传输)分支的同一行被注释掉了**(core.py L1280)。v1.0 PR-10 的目标是"行为完全不变地抽取 `_integrate()`"——但五分支行为现在就不统一,"不变"无从定义。

**建议**:PR-10 改为"先决策统一输出投影语义(浓度列 clamp 0 / 体积列单独策略,与 PR-12 的 RHS clamp 决策合并),再抽取";golden 需为 default 分支单独固定现状行为,避免抽取时悄悄改变纯传输仿真结果。

### B4.(Medium)solver 白名单与优化计划的求解器矩阵冲突;默认求解器是最慢路径

两侧 `CalculationParameters` 白名单均为 `{scipy_solver, euler, rk4, adaptive_heun}` —— **dopri5 不在白名单内**,而 v1.0 需求文档的 benchmark 矩阵与回归门全部写的是 "rk4 / dopri5"。按现代码,dopri5 输入会在参数校验阶段被拒绝,整套 dopri5 验收无法执行。

同时默认值 `solver_method="scipy_solver"` 映射到 torchdiffeq 的 SciPy 包装器(默认 LSODA),**每次 RHS 调用都做 tensor→numpy→tensor 往返**:GPU 上彻底失效,CPU 上也是显著开销——也就是说当前产品默认走的是最慢的求解器路径,而 v1.0 的全部热路径分析都建立在 torch 原生求解器假设上。

**建议**:① 决策:把 dopri5 加入白名单并补测试,或把文档矩阵改为 adaptive_heun;② benchmark 矩阵必须加入 scipy_solver(它是真实默认),`.item()` 等优化收益按求解器分别报告;③ 评估把默认值改为 rk4 或 adaptive_heun(行为变更,走 feature flag + 存量影响评估);④ simulation_core 的 `tolerance` 校验(`le=1e-3`,默认 1e-6)与 backend(默认 1e-3、无上限)不一致,统一并写入契约。

### B5.(Low)`max_iterations` / `max_memory_mb` 是"假旋钮"

`CalculationParameters` 校验了这两个字段,core 从不读取。契约上承诺了不存在的能力。建议实现(内存预估 + 超限报错)或在模型/contracts 标注 deprecated 并计划移除。

### B6.(Low)中文 docstring 为编码损坏(mojibake),且不可无损还原

core.py(两副本一致)的中文注释是 UTF-8→GBK 双重错码产物,GBK 反向还原会丢字符("初始化"→"初化")。建议薄壳化迁移时直接重写为英文 docstring(与 Next 仓库方向一致),同时统一去 BOM、行尾——这正好与 PR-20 漂移守卫的"规范化 diff"规则呼应:迁移后守卫的规范化层可以简化。

---

## 三、新发现/具体化的性能机会

### C1.(High)dense `prop_a`/`prop_b` 无条件构建,且每个 segment 重建一次

`_convert_to_tensors` 总是物化两个 `[n,n,r]` 张量(n=500、r=50、float32 时约 100MB×2),即使运行时全程走 sparse 路径;`_build_runtime_edge_tensors` 又在**每个 time segment** `zeros_like/ones_like` 重建全部三个 dense 张量——多数段只改流量甚至无 override。

**建议**(把 v1.0 REQ-P2-003 的"评估"升级为明确任务):dense 张量改 lazy(仅当确定走 dense fallback 时构建);无 override 段直接复用上一段张量;`_balance_param` 内 `C.unsqueeze(1).repeat(1,n,1)` 改 `expand`(免拷贝)、`Q_out.clone()` 删除(unsqueeze 不修改原张量)。配合 B1 的语义决策一起做。

### C2.(High)求解器输出网格与采样网格耦合,长仿真内存峰值大

`_run_hours` 先在完整 `t0 = linspace(0, hours, hours×steps+1)` 上让 `odeint` 物化全轨迹 `[T, n, r+1]`,之后才按 `sampling_interval_hours` 降采样。hours=1000、steps=60 时 T=60001——全轨迹先占满内存再扔掉绝大部分。

**建议**:自适应方法(dopri5/adaptive_heun/LSODA)下,`t0` 直接构造为采样网格即可(求解器内部仍自适应细步进,输出只在请求点);rk4 固定步长则分块积分、块间只保留末状态与采样点。这是 KPI-003 之外的内存+速度双收益项,对 worker 大任务尤其重要。

### C3.(Medium)结果转换为 O(n×r) 次 numpy 切片 + 全量 Python list 物化

`_convert_results` 逐节点逐组分执行 `concentrations_np[:, i, j].tolist()`,随后整个结果变成巨型嵌套 dict(worker 侧再 `json.dumps` 一次)。大结果时转换与序列化成本显著,且全程双份驻留内存。

**建议**:与 v1.1 REQ-P4-007(序列化量化)衔接——短期向量化(`concentrations_np.transpose(...).tolist()` 一次性);中期评估在 worker artifact 边界改流式/列式写出,核内不物化嵌套 dict。

### C4.(Low)小项

`_resolve_parameter_names` 在 `_convert_to_tensors` 与 `_run_calculation` 重复计算;`_generate_segment_timestamps` 每段在 GPU 上 linspace 再 `.cpu()`(每段一次设备同步,直接在 CPU 构造即可);`_balance_param` 中 `sum_m_out` 的 `view(n, r)` 应为 `view(m, r)`(m==n 时无害,语义易误导)。

---

## 四、与 v1.1 编号体系衔接的候选条目映射

| 发现 | 候选需求条目 | 候选 PR | 阶段 | 优先级 |
|---|---|---|---|---|
| A1 打包化 | REQ-P0-009 simulation_core 可安装化 | PR-29 pyproject + worker/backend 依赖化,删 sys.path hack | Phase 0/1,**PR-31 前置** | High |
| A2 模型契约统一 | REQ-P0-010 输入模型单一契约与死代码清理 | PR-30 删 backend 死模型/死 utils、service 导入改向、calculate 输入契约显式化 | Phase 1,**PR-31 前置** | High |
| A3 测试改造 | (并入 REQ-P0-006 验收) | PR-37 parity→golden 改造 + 覆盖补齐(segments/并行边/求解器/采样/退化图) | Phase 0/1,**PR-31 前置** | High |
| 方案 A 主体 | (REQ-P0-005 已覆盖) | PR-31 backend material_balance 薄壳化(含 B6 编码清理) | Phase 1 末 | High |
| A4 hybrid 边界 | REQ-P0-011 canonical 输入边界契约化 | 决策文档 + contracts 注记(无独立代码 PR) | Phase 1 | Medium |
| B1 并行边语义 | REQ-P1-005 并行边 dense/sparse 语义统一 | PR-32 语义决策 + 修复/禁用 + golden | Phase 2(早于 REQ-P2-003 验收) | High |
| B2 守恒占位值 | REQ-P0-012 真实质量守恒指标或移除占位 | PR-35 | Phase 0/1(L3 验收依赖) | High |
| B3 RHS 投影不一致 | (修订 PR-10/PR-12 前提) | PR-10/12 描述修订:先统一投影语义再抽取 | Phase 4 | Medium |
| B4 solver 白名单/默认 | REQ-P0-013 求解器矩阵与白名单对齐 | PR-36 白名单决策 + scipy_solver 入 benchmark 矩阵 + 默认值评估(flag) | Phase 0(矩阵)/Phase 2(默认值) | High |
| B5 假旋钮 | (并入 REQ-P0-013 或契约清理) | 并入 PR-36 | — | Low |
| C1 dense lazy/段复用 | REQ-P2-004(REQ-P2-003 升级) | PR-33 | Phase 2 | High |
| C2 输出网格解耦 | REQ-P2-005 求解输出与采样网格解耦 | PR-34 | Phase 2/3 | High |
| C3 结果转换/序列化 | (并入 REQ-P4-007) | 短期向量化并入 PR-33;边界改造另立 | Phase 2 / 后续 | Medium |
| C4 小项 | — | 顺手并入 PR-33 | — | Low |

**依赖关系**:PR-29 → PR-30 → PR-37 → PR-31(薄壳化主 PR 最后做);PR-32/35/36 不依赖薄壳化,可并行;PR-33/34 在 PR-31 之后只改 simulation_core 单处。

**排期影响**:方案 A 的真实成本不是"一个 re-export PR",而是 打包化 + 契约统一 + 测试改造 三件前置事 ≈ 3–5 天,建议计入 Sprint 0/1;B1/B2/B4 三项正确性问题建议与 Phase 1 同窗口处理。

---

## 五、结论

simulation_core 的计算逻辑与 backend 副本同源,v1.0/v1.1 已识别的热点与正确性问题在此副本全部成立,方向不需要改。本次专项新增的关键信息是三类:**方案 A 有三个未列入计划的前置工程(打包、契约统一、测试改造)**;**存在三个计划外的正确性问题(并行边语义分歧、守恒指标占位假值、求解器白名单与验收矩阵冲突)**,其中 B1/B2 直接影响 v1.1 已定的验收方法;以及**两个计划外的高价值性能项(dense lazy 化、输出网格解耦)**,可作为 KPI-003 的补充弹药。建议按第四节映射表并入 v1.2 增量,或直接在 PR-20 决策文档中引用本报告作为方案 A 的实施前提清单。
