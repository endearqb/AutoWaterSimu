# AutoWaterSimu 性能优化开发计划文档 v1.4

**版本**:v1.4(统一升级版,吸收 simulation_core 实跑复审结论)
**对应需求**:《AutoWaterSimu 性能优化需求文档 v1.4》
**核心架构决策**:方案 A——simulation_core 唯一实现,backend 薄壳化。
**修订日期**:2026-06-13

> 前置阅读:执行本文 Phase 2/4/5 优化前,先读并完成 `00_AutoWaterSimu_性能优化前置规划计划文档_v1.0.md` 中的 Phase 0 evidence、profiling、golden 与 rollout 前置项。

> 编号:保留 PR-1~PR-19(v1.0)、PR-20~PR-28(v1.1)、PR-29~PR-39(v1.2 专项)。v1.4 不新增 PR 编号,而是把实跑复审新增项并入既有 PR 的 DoD 与验收边界: `_balance_param` 维度回归、ASM mask gather、表达式 fail-late、`extra="allow"` 策略、mojibake 归档与氧清零 compute_mask 约束。

---

## 0. 2026-06-14 执行校准

本节用于把 v1.4 长期开发计划校准到当前仓库状态。v1.4 仍保留完整 PR 拆分与长期依赖图,但当前执行顺序必须先服从 `00_AutoWaterSimu_性能优化前置规划计划文档_v1.0.md`。

截至 2026-06-14,以下事项已经完成或进入维护态,不应在性能优化计划中重复立项:

- `simulation_input.v1` node/edge unknown-field schema closure 与 runtime `NodeData` / `EdgeData extra=forbid` 已由 ADR 0012/0013 接受。
- `_run_hours` 旧互斥 mixed branch baseline 已由 ADR 0015 的 supported mixed dispatch 取代；当前所有 active ASM/UDM reaction model 都走 unified combined RHS，default no-reaction branch 的 no-clamp policy、ASM oxygen active compute mask 范围与 `compute_mask` derivative masking 仍由 correctness-freeze audit 冻结。
- `simulation_core/python` 与 `contracts/python` 已有 packaging metadata;source-mode worker 已改为只使用 installed/editable helper packages, runtime repo-path `sys.path` fallback 已删除。
- `backend/app/material_balance/core.py` 已成为 simulation_core calculator compatibility re-export;calculator thin-shell 与 dependency/source-mode gates 已由 audit 维护。
- `scripts/ci/performance-baseline-phase0.ps1` 已建立 Phase 0 timings baseline;`mixed_asm_udm` fixture 已补齐后当前 12-run baseline 为 `passed`,并已记录硬件指纹、torch 线程配置与绝对阈值 KPI 仅 nightly 固定 runner 判定策略。
- `scripts/ci/performance-profiling-phase0.ps1` 已建立 Phase 0 profiling evidence;当前 small / medium / single UDM / mixed × 3 solver profile matrix 为 `passed`。
- `scripts/ci/performance-golden-phase0.ps1` 已建立 CPU/f64/fixed-seed golden evidence;当前 full-run 12 goldens + 7 个 L1/L2 micro goldens（含 KPI-017 N=100 expression cache build-time evidence）为 `passed`。
- `scripts/ci/performance-hotpath-prereview-phase0.ps1` 已建立 P-08 hot-path prereview evidence;当前第一批候选为 `transport-runtime-tensor-precompute-no-semantics`,并已输出 UDM solver bucket breakdown 作为 KPI-001 / KPI-003 求解器维度证据。
- `scripts/ci/performance-go-api-latency-phase0.ps1` 已建立 P-06 本地内存 Compute API latency smoke;当前 job list/get/worker claim wall-time evidence 为 `passed`,`claim_scanned_rows` 仅预留字段。
- `scripts/ci/worker-adapter-strict-smoke.ps1` 已建立 P-05 worker adapter strict opt-in smoke;当前 8/8 valid compute_job fixtures strict mode 通过,默认仍为 `compat`。
- P-04 backend compatibility cleanup 已完成 `app.material_balance.models` 旧导入路径薄壳化:该模块现在 re-export simulation_core runtime input/result models，`app.material_balance` 包根 model re-export 已移除，生产 runtime 不再可静默 import backend-local `MaterialBalanceInput` / `NodeData` / `EdgeData` / `CalculationParameters` 副本，旧手工脚本已标注为非 pytest/非 runtime 证据。
- legacy backend calculation services 已在 calculator 调用前通过 `material_balance_input_to_core_runtime()` 将 `app.models.MaterialBalanceInput` 重新校验为 simulation_core runtime `MaterialBalanceInput`；未知 runtime 字段由 core `extra="forbid"` 拦截。legacy direct route schema 已补 `customParameters` / `component_schema` metadata，并在 service 入核时桥接到 core `original_flowchart_data`；删除本地 `app.models.MaterialBalanceInput` 仍非本切片目标。
- backend ASM/UDM runtime helper 叶子已薄壳化:`backend/app/material_balance/asm/*`、`udm_engine.py` 与 `udm_ode.py` 现在 re-export `autowatersimu_simulation_core.material_balance` 对应实现,并由 boundary audit 与 backend object-identity tests 保护；这只是 PR-31 的 helper 迁移切片,不代表 backend 仅 re-export 或 PR-30 input models cleanup 已完成。
- `scripts/ci/worker-packaged-no-fallback-smoke.ps1` 已建立 P-07 packaged sidecar no-fallback evidence;当前真实 PyInstaller one-folder sidecar self-check / minimal job 为 `passed`,且 `deprecated_repo_path_fallback_used=false`;worker runtime fallback 删除已完成,该 smoke 继续作为回归证据。
- `transport-runtime-tensor-precompute-no-semantics` 已落地:无 `edge_overrides` 的 segment 复用 `_convert_to_tensors` 预计算 runtime edge tensors;有 override 的 segment 继续 clone/rebuild。
- `udm-expression-cache-and-device-sync-reduction` 已落地:`compile_expression()` 使用 LRU 缓存,UDM runtime 构建期预计算 active node index set、local-to-global Python int 索引、component/index pairs 与 fixed component indices,UDM RHS/evaluate_reaction 热路径不再用逐步 `.item()` 判断 mask 或映射。
- `asm-stable-reaction-runtime-precompute` 已落地:ASM1Slim/ASM1/ASM3 在 `_convert_to_tensors()` 阶段预计算 active compute node indices 与 filtered parameter rows, single-model 与 combined RHS 复用该 runtime,避免每步布尔 mask 参数 gather。
- PR-38 supported mixed-model dispatch 已落地并由 ADR 0015 接受，PR-11 unified reaction RHS 也已完成当前 core dispatch 收口:`_run_hours` 在一个或多个反应模型 active 时走同一个 combined RHS,只计算一次 transport,再按 active `compute_mask` 子集叠加 ASM1Slim/ASM1/ASM3/UDM 反应项；default no-reaction branch 与 default no-clamp baseline 继续由 correctness-freeze audit 保护。
- PR-39 氧清零 compute_mask 约束与 ASM schema-driven component guard 已完成当前 core runtime:ASM1Slim/ASM1/ASM3 氧导数清零仅作用于对应 ASM model 的 active compute 节点,不再依赖全列写入；`_convert_to_tensors()` 在 `customParameters` metadata 存在时按组件名预计算模型局部列索引，ASM 反应核输入 gather 到固定模型列序，反应结果 scatter 回全局组分列，缺失或重复必需组件 fail-fast；metadata 缺失的 legacy 输入至少做组件数量 fail-fast 并保留前缀列行为。UDM runtime 组分错配与 PR-4 index-conflict guard 也已完成当前 UDM 部分:显式 UDM 局部组分必须同名或经 `udm_variable_bindings` 映射到全局组分,同一节点 local→global 映射必须唯一,未知 `stoich` / `stoich_expr` 目标组分在 runtime payload 构建期报错。
- PR-13a 表达式校验器白名单化已落地:`_validate_ast` 现在默认拒绝未知 AST 节点,`NamedExpr`/`JoinedStr`/`Starred`/`Subscript`/`Slice` 与 keyword call arguments 会在校验期失败,不再等到运行时 evaluator 才 fail-late。
- PR-37 parity→golden 第一阶段已落地:`simulation_core/tests/test_material_balance_core.py` 不再导入 `app.*` 或把 `backend/` 加入 `sys.path`,原 6 个 backend parity 用例已迁为 CPU/f64 committed golden hash guard；backend 对照迁移前置由 `backend/app/tests/material_balance_calculator_delegation_preflight_test.py` 维护。

当前下一步执行顺序:

1. P-01 `perf-phase0-mixed-asm-udm-fixture` 已完成,继续保持 Phase 0 baseline 覆盖 small / medium / UDM / mixed 三类以上图并保持 correctness-freeze audit 通过。
2. P-02 `perf-phase0-profiling-artifacts` 已完成,后续若改变 fixture、solver matrix 或 runtime timings,必须重新生成 profiling evidence。
3. P-03 `perf-phase0-golden-generator` 已完成,后续若改变 correctness-freeze 行为、fixture、solver matrix 或文档化 golden/repro 测试,必须重新生成 golden evidence。
4. P-08 `udm-rhs-hotpath-prereview` 已完成,且第一批 `transport-runtime-tensor-precompute-no-semantics`、第二批 `udm-expression-cache-and-device-sync-reduction`、`asm-stable-reaction-runtime-precompute`、UDM solver bucket breakdown、PR-32 dense/sparse parallel-edge unification、PR-33 dense lazy / `_balance_param` shape guard、PR-34 输出网格解耦、PR-35 真实质量守恒指标与 PR-13a 表达式校验器白名单化已落地；后续热路径实现需先复核最新 baseline/profiling/golden/prereview evidence,再进入 solver 默认值/矩阵或完整统一 RHS 等更高风险切片。
5. PR-38 supported mixed-model dispatch、PR-39 当前 ASM 氧清零 active compute mask / schema-driven component mapping 约束、legacy route schema metadata bridge 与 PR-11 unified reaction RHS 已落地；后续 PR-12 输出投影、PR-36 solver 矩阵仍需独立切片。
6. P-04 backend compatibility cleanup、backend app.models runtime validation/route metadata bridge、backend ASM/UDM/model thin-shell、P-05 worker strict rollout opt-in evidence、P-06 Go API latency smoke、P-07 packaged sidecar no-fallback evidence 与 worker runtime fallback 删除已完成;后续高风险性能 PR 不得替代 P-01/P-02/P-03/P-08 的证据链。

与旧 PR 编号的映射:

| 当前前置切片 | 对应旧计划项 | 当前执行含义 |
|---|---|---|
| P-01 mixed fixture | PR-1~3 baseline harness | 已补齐 current-state mixed baseline；后续保持 12-run baseline 通过 |
| P-02 profiling artifacts | PR-21 profiling | 已输出 profiler evidence;P-08 前必须复核热点占比 |
| P-03 golden generator | PR-22 / PR-37 | 已输出 CPU/f64/fixed-seed full-run 与 L1/L2 micro golden evidence，且 6 个历史 backend parity 用例已迁为 core-only committed f64 golden；后续保持 core-only/backend oracle 独立 |
| P-04 backend cleanup | PR-30 / PR-31 收尾 | 已完成 `app.material_balance.models` core re-export、`app.material_balance` package-root model export removal、app.models service-layer runtime revalidation、legacy direct route metadata bridge 与 ASM/UDM helper thin-shell；删除 legacy `app.models` route schema 需另开高风险 PR |
| P-05 worker strict rollout | PR-23 | 已完成 opt-in/统计/迁移策略；默认 strict 切换仍需另开 PR |
| P-06 Go latency smoke | PR-13/14/15/26/27 前置 | 已有 claim/list/claim POST 实测 baseline；后续 keyset、LIMIT、索引需另开 PR 基于该 evidence 判断收益 |
| P-07 no-fallback evidence | PR-29 后续 | 已证明 packaged sidecar 不需要 fallback；worker runtime fallback 删除已完成，该 evidence 继续作回归 gate |
| P-08 hotpath prereview | PR-7/8/24/32/33/34/35/11/12/36/13a 前置 | 已选择并落地 `transport-runtime-tensor-precompute-no-semantics`、`udm-expression-cache-and-device-sync-reduction`、`asm-stable-reaction-runtime-precompute`、UDM solver bucket breakdown、PR-32 dense/sparse parallel-edge unification、PR-33 dense lazy / `_balance_param` shape guard、PR-34 输出网格解耦、PR-35 真实质量守恒指标与 PR-13a 表达式校验器白名单化；继续禁止混入 solver 默认值/schema/fallback 改动 |
| PR-38 mixed dispatch | PR-38 / PR-11 前置 | 已选择支持 mixed reaction model 语义并落地 combined RHS；当前 PR-11 已把单模型 reaction 也统一到 combined RHS，default no-clamp baseline 继续冻结 |
| PR-39 ASM component guard | PR-39 / PR-11 前置 | 当前 ASM 分支氧清零已限定到对应 ASM model 的 active compute 节点，`customParameters` 存在时已按组件名做 schema-driven gather/scatter；legacy direct route schema metadata 已桥接到 core `original_flowchart_data` |

当前禁止并入的工作:

- 不在缺少最新 P-03/P-08 evidence 复核时启动输出网格、solver 默认值或统一 RHS 改造。
- 不把 ADR 0014 中旧冻结的 mixed ASM/UDM 互斥行为写成最终业务语义；当前最终执行语义以 ADR 0015 supported mixed dispatch 为准。
- 不把 worker 默认 adapter validation mode 切到 `strict`。
- 不恢复 deprecated repo-path fallback。
- 不把 Go keyset cursor、claim LIMIT、索引 migration 混入 P-06 latency smoke；这些需在 baseline 可复跑后另开 PR。

---

## 1. 总体策略

三条主线:**(1) 内核优化线**(simulation_core 表达式/RHS/传输/求解器);**(2) Go 编排线**(claim/list/索引/可观测性);**(3) worker 执行链路线**(端到端验证,确保 1 的收益经方案 A 路径到达 worker)。

原则:先正确性后性能、先基线后改动、feature flag + 回滚点、数值验收标注容差层级(L1/L2/L3)、触碰 material_balance 的 PR 受漂移守卫约束。

**方案 A 落地顺序(历史关键路径)**:PR-29(打包) → PR-30(契约统一/死代码) → PR-37(测试改造) → PR-31(薄壳化主 PR)。截至 2026-06-14,打包、runtime extra policy、calculator thin-shell 与 source-mode worker dependency gate 已进入维护态;剩余执行以 §0 的 P-01~P-08 前置切片为准。

---

## 2. 阶段路线图

### Phase 0:基线、保护网、方案 A 前置(4–6 天)
PR-1~3(v1.0 baseline harness)、**PR-20**(单一来源决策+漂移守卫)、**PR-21**(profiling)、**PR-22**(f64 golden 生成器+分层容差)、**PR-29**(simulation_core pyproject + 依赖化,删 sys.path hack)。
完成标准:基线可复现(含 scipy_solver/rk4/adaptive_heun 维度);热点占比表产出;golden 生成器跨机可复现;simulation_core 可 pip 安装;core-only pytest collect/import smoke 不依赖 backend/SQLModel;决策文档+守卫上线。

### Phase 1:正确性与方案 A 落地(7–9 天)
- **正确性**:PR-4(UDM 映射 guard,含写侧/索引冲突)、PR-5~6(hybrid mode/binding/pair key)、**PR-38**(多模型混合调度决策与修复,REQ-P0-014)、**PR-39**(反应组分契约,含氧清零 compute_mask 约束,REQ-P1-005)。
- **方案 A**:PR-30(输入模型契约统一+`extra` 策略+死代码清理)、PR-37(parity→golden 改造+覆盖补齐)、PR-31(backend 薄壳化主 PR,含 mojibake 还原归档与编码清理)。
- **审计**:PR-23(存量兼容性审计,strict 默认开启前置)。
完成标准:混合/组分/映射正确性用例通过;backend 仅含 re-export(KPI-013);审计报告+灰度策略决策。

### Phase 2:UDM 热路径与传输/内存(7–9 天)
PR-24(表达式编译缓存)、PR-7~8(evaluate_reaction 去循环+预计算、去 `.item()`)、**PR-32**(并行边 dense/sparse 语义统一,REQ-P2-003)、**PR-33**(dense lazy 化+段间复用+`_balance_param` 维度回归,REQ-P2-004/006)、**PR-34**(求解输出网格解耦,REQ-P2-005)、**PR-35**(真实守恒指标,REQ-P0-012)。
完成标准:KPI-001/017 达标;UDM RHS/evaluate_reaction 热路径无逐步 `.item()` 设备同步;PR-28 端到端复测 `compute` 分段 ↓≥20%(KPI-016);KPI-005/006/020 达标。

### Phase 3:fast expression(可选,5–7 天)
PR-9~10(bytecode 引擎+批量化)、PR-25(整模型 codegen 原型,默认关闭)。

### Phase 4:统一 RHS 与求解器路径(5–7 天)
PR-11(统一 RHS 抽取——**前置 PR-38**,抽取须同时实现混合叠加而非互斥分支,并处理 ASM mask gather;含 shadow 双跑可选)、PR-12(输出投影一致化,default 分支单独固定 golden)、PR-36(求解器矩阵/白名单/默认值对齐,REQ-P0-013)、PR-13a(表达式校验器白名单化,REQ §6.1,fail-late 而非 RCE)。
完成标准:统一 RHS L3 通过(rk4 主判据);default 纯传输分支 clamp 现状 golden 先通过再决策变更;dopri5(或 adaptive_heun)进入验收矩阵;混合图 L3 通过(KPI-018);表达式校验失败前移。

### Phase 5:Go Compute API(12–18 天)
PR-13(metrics 扩展,含 claim_scanned_rows)、PR-14(索引对账+benchmark+migration)、PR-26(keyset cursor)、PR-27(claim 第一步 LIMIT 有界化 → 对抗 benchmark → 第二步谓词下推可选)、PR-15(claim 并发+对抗场景)、PR-28(worker 端到端基线)、PR-16(release gate 集成,统计判据+nightly 固定 runner)。

### Phase 6:批量化(可选)
PR-17~19。

---

## 3. 新增/关键 PR 详述(v1.2/v1.4 专项)

### PR-7/8:UDM RHS 热路径去循环与去 `.item()`【Phase 2,v1.4 继承并强化】
落点为 `simulation_core/python/autowatersimu_simulation_core/material_balance/udm_ode.py`、`udm_engine.py` 与必要的 `core.py` 张量构建阶段。把 UDM 节点索引、local→global 索引、fixed component mask 是否存在、可执行节点集合等在 `_convert_to_tensors` / runtime payload 构建期预计算;RHS 内不得再用 `bool(tensor.item())` 判断 `udm_mask` 或 `fixed_mask.any()`。`evaluate_reaction` 至少消除 local component 映射 `.item()` 与重复 env 构建的可预计算部分;表达式 AST 递归若无法在本 PR 完全替换,需用 profiler 单独报告剩余占比并留给 PR-9/10/25。验收:L2 RHS 等价;GPU/CPU profiler 证明 UDM RHS 内无逐节点设备同步点;按 `scipy_solver` 与 torch 原生求解器分别报告收益。

**当前实现状态（2026-06-15）**：第一步已落地到 simulation_core：`compile_expression()` 已加 LRU 缓存；`UDMNodeRuntime` 已保存 local-to-global Python int 索引、component/index pairs、fixed component indices 与 `has_fixed_components`；`_convert_to_tensors()` 已保存 `udm_active_node_indices`；`udm_ode_balance()` 使用预计算 active set 与 fixed indices，`evaluate_reaction()` 使用预计算 component/index pairs，热路径不再对 `udm_mask`、`fixed_mask.any()` 或 local-to-global 映射调用 `.item()`。KPI-017 已由 `performance-golden-phase0` 的 N=100 expression cache build-time micro evidence 覆盖，当前本地 evidence 超过 70% 降低阈值；`performance-hotpath-prereview-phase0` 已把 `udm_single` / `mixed_asm_udm` 的 `expression`、`item_device_sync`、`core_compute` 与 `ode_framework` buckets 按 `scipy_solver`、`rk4`、`adaptive_heun` 汇总，当前 UDM 相关 evidence 中 `item_device_sync_ms=0.0`，`expression_plus_item_sync_share_of_compute` 分别为 `adaptive_heun=0.0268`、`rk4=0.0499`、`scipy_solver=0.0454`。剩余工作是决定是否进入 PR-9/10/25 的表达式引擎替换，真实 post-change 端到端收益仍需后续按目标场景复测。

### PR-29:simulation_core 可安装化【Phase 0,薄壳化前置】
落 `pyproject.toml`(hatchling/setuptools,声明 torch/torchdiffeq/pydantic/numpy 区间);worker `runner.py` 删 `_ensure_repo_import_paths`/sys.path hack,改 wheel/editable 依赖;CI 增 `pip install -e` 烟雾。v1.4 继承补充:烟雾必须包含不把 `backend/` 放入 `PYTHONPATH` 的 core-only import 与 pytest collect/run 子集,证明安装后的包和独立测试不依赖 FastAPI/SQLModel/backend。回滚:若必须恢复 repo-path fallback,只能通过显式 revert 并重新通过 dependency/boundary audit,不得新增无审计 `sys.path` 注入。

**当前实现状态（2026-06-15）**：`simulation_core/python` 与 `contracts/python` 已有 packaging metadata,backend Python environment 通过 editable dependency 引用 `autowatersimu-simulation-core` / `autowatersimu-contracts`;worker runtime 已删除 repo-path `sys.path` fallback,`self_check().worker_dependency_imports.deprecated_repo_path_fallback_used` 仅作为兼容 evidence 字段保留并固定为 `false`。source-mode dependency audit、simulation_core boundary audit 与 packaged sidecar no-fallback smoke 继续作为回归门。

### PR-30:输入模型契约统一与死代码清理【Phase 1,薄壳化前置】
删 backend `material_balance/models.py` 死输入模型与 `utils.py`(无调用方);删 simulation_core `utils.py`;`asm1/asm3/udm_service` 的 `MaterialBalanceResult` 导入改指 simulation_core;`calculate()` 入参显式标注 simulation_core `MaterialBalanceInput`(或 Protocol),服务层对 `app.models`(SQLModel)对象做一次显式校验/转换。v1.4 补充:worker 当前通过真实 adapter 入核,风险低于 legacy backend 老路径,但 `NodeData`/`EdgeData extra="allow"` 必须决策为 `forbid` 或 `ignore + structured warning/log + 迁移审计`,防止错拼字段静默吞掉。测试:app.models 对象入核走完整校验的回归;未知/错拼字段按策略报错或可观测。

**当前实现状态（2026-06-15）**：service-layer 入核校验已完成。`backend/app/services/material_balance_runtime_input.py` 将 legacy `app.models.MaterialBalanceInput` / dict 通过 `CoreMaterialBalanceInput.model_validate()` 重新校验为 simulation_core runtime model；material balance、ASM1Slim、ASM1、ASM3、UDM 五个 legacy calculation service 在调用 calculator 前都走该 helper；focused test 覆盖 legacy object 转 core input、未知 node 字段被 core `extra="forbid"` 拒绝和 core input passthrough。legacy direct route schema 已补 `customParameters` / `component_schema` metadata，入核 helper 会把这些字段折叠进 `original_flowchart_data` 供 core component-name contract 使用，且 OpenAPI schema test 与 boundary audit 已覆盖该桥接。`backend/app/material_balance/models.py` 也已改为 simulation_core model re-export，不再保留本地 input/result 副本，且 `app.material_balance` 包根不再导出 runtime models。该状态仍不删除 legacy route schema 或 `app.models.MaterialBalanceInput`。

### PR-31:backend material_balance 薄壳化【Phase 1 末,关键路径终点】
`backend/app/material_balance/__init__.py` 改为从 `autowatersimu_simulation_core.material_balance` re-export(`MaterialBalanceCalculator`/模型/异常);删除 backend 的 core.py/udm_*.py/asm/ 副本;漂移守卫切换为"backend 仅含 re-export"断言。统一去 BOM/行尾。v1.4 补充:mojibake 属 GBK-over-UTF8,开工前先批量无损还原并归档原中文注释(例如 `乱码.encode('gbk').decode('utf-8')`),再决定英文重写,避免丢失 ASM/UDM 物理含义说明。回滚:revert 恢复副本(过渡期保留 tag)。

**当前实现状态（2026-06-15）**：PR-31 helper/model 叶子迁移已完成一段：backend `asm` package、`udm_engine.py`、`udm_ode.py` 与 `app.material_balance.models` 现在是 dependency-backed compatibility re-export，真实实现来自 `autowatersimu_simulation_core.material_balance`；`app.material_balance` 包根 model re-export 已移除，只保留 calculator/error 等非模型兼容入口；legacy FastAPI direct route schema 仍来自 `app.models.MaterialBalanceInput`，但组件 metadata 已可通过 service 入核 helper 进入 core `original_flowchart_data`；`backend/app/tests/material_balance_runtime_helpers_thin_shell_test.py`、`backend/app/tests/material_balance_compat_models_boundary_test.py` 与 `scripts/audit-simulation-core-boundary.ps1` 已守住 object identity、route metadata bridge 与边界。该状态仍不等于完整 PR-31 完成：删除 legacy FastAPI route schema 或 `app.models.MaterialBalanceInput` 需另开高风险切片。

### PR-32:并行边 dense/sparse 语义统一【Phase 2】
决策以 sparse 为准;`_convert_to_tensors`/`_build_runtime_edge_tensors` 检测并行边:dense fallback 报错,或 dense 合并等效 `a_eff=Σq_i a_i/Σq_i`、`b_eff` 加权。新增并行边 golden(L2 dense/sparse 等价)。

**当前实现状态（2026-06-14）**：已选择 dense 加权合并方案并落地。`_convert_to_tensors` 与 segment override 的 `_build_runtime_edge_tensors` 统一走 `_build_dense_transport_tensors`，重复 `(src,dst)` 时 `Q_out` 累加流量，`prop_a` / `prop_b` 使用流量加权 `a_eff` / `b_eff`，docs parallel-edge golden 已从 xfail repro 转为 active L2 target golden。

### PR-33:dense lazy 化、段间复用与 `_balance_param` 维度回归【Phase 2】
`_convert_to_tensors` 不再无条件物化 prop_a/prop_b(仅 dense fallback 时构建);`_build_runtime_edge_tensors` 无 override 段复用上段张量;`_balance_param` `repeat`→`expand`、删 `Q_out.clone()`;`_resolve_parameter_names` 去重复计算;`_generate_segment_timestamps` 直接 CPU 构造免设备同步。v1.4 将 `_balance_param` 聚合维度 bug 升格为 L2 正确性回归:修 `sum_m_out = m_out.sum(dim=1).view(n,r)`→按源维 `view(m,r)`,修 `sum_m_in = m_out.sum(dim=0).view(m,r)`→按目的维 `view(n,r)`,并用命名变量/shape 断言避免方阵 `m==n` 掩盖问题。L2/L3 等价;新增非方/退化图单元测试。

**当前实现状态（2026-06-14）**：已完成 PR-33 主体：sparse runtime path 下 `_convert_to_tensors` 不再物化 `[n,n,r]` 的 `prop_a` / `prop_b`，override segment 只重建 runtime sparse bundle；`_balance_param` 维度回归已完成，`repeat` 改为 `expand`、删除 `Q_out.clone()`、`sum_m_out` / `sum_m_in` 改用源/目的维命名变量与 shape guard，非方 dense 输入显式 `ValueError`，零流量退化图继续有 L2 golden；`_generate_segment_timestamps` 已改为 CPU 直接构造采样时间戳，避免每段输出时间轴 GPU→CPU 同步；`_convert_to_tensors` 已把 `parameter_names` 写入 tensor payload，`_run_calculation` 复用该值，缺失时才 fallback 解析。输出网格解耦已由 PR-34 落地。

### PR-34:求解输出网格解耦【Phase 2/3】
自适应方法 `t0` 直接构造采样网格;rk4 分块积分块间留末状态+采样点。KPI-005 内存峰值 ↓≥30%。L3 等价(采样点比较)。

**当前实现状态（2026-06-14）**：已完成核心实现。`_run_hours()` 在 `sampling_interval_hours` 大于一个 solver step 时,对 `scipy_solver` / `adaptive_heun` / `dopri5` 直接构造输出采样 `t0`,不再先物化完整 solver 输出轨迹；`rk4` 按输出采样区间分块积分,块间只传递末状态并只保留采样点；`euler` 等其他 fixed-step 方法继续 full-grid 求解后采样,避免扩大语义变更。单模型 fallback 顺序、反应分支 output clamp 与 default no-clamp baseline 保持不变。KPI-005 仍需在长仿真 evidence 中复测确认达标幅度。

### PR-35:真实质量守恒指标【Phase 2】
`_calculate_mass_balance_error` 实现 ∫入流−∫出流−Δ累积(逐组分),或改名/移除占位字段;L3 守恒判据接入真实指标。

**当前实现状态（2026-06-14）**：已保留 `summary["final_mass_balance_error"]` 字段名并替换旧占位公式。当前指标以非 inlet/outlet 节点为计算控制体,对每个输出区间按实际生效的 edge flow 与 factor a/b 积分边界通量,计算 `∫入流−∫出流−Δ累积` 的逐组分 signed residual；`final_mass_balance_error` 为这些残差的最大绝对值,`summary["mass_balance_component_errors"]` 暴露逐组分 residual。输出时间轴使用 PR-34 解耦后的结果采样点。

### PR-36:求解器矩阵/白名单/默认值对齐【Phase 4(矩阵部分前移 Phase 0)】
dopri5 入白名单+测(或文档矩阵改 adaptive_heun);benchmark 矩阵加 scipy_solver;评估默认值改 rk4/adaptive_heun(flag+存量影响);统一 tolerance 校验;`max_iterations`/`max_memory_mb` 实现或标 deprecated。

**当前实现状态（2026-06-15）**：矩阵/白名单决策的低风险部分已收口为“文档矩阵使用 adaptive_heun，不放开 dopri5”。P-01/P-02/P-03 evidence 默认覆盖 `scipy_solver`（真实默认）、`rk4` 与 `adaptive_heun`；core boundary test 冻结 `CalculationParameters` 默认 `solver_method="scipy_solver"`、接受 `adaptive_heun`、拒绝 `dopri5`。`max_iterations` / `max_memory_mb` 已标记为 deprecated compatibility fields，因为当前 simulation_core solver 不读取或强制执行它们。默认求解器切换评估已由 ADR 0016 收口：当前不切换，继续保持 `scipy_solver` 默认；依据是 12 个 full-run goldens 均通过但 core-only timings 没有稳定默认切换收益，且不同 solver 输出不是 bit-identical。未来若切默认值，必须作为行为变更单独 PR，包含 flag/rollout、golden/evidence refresh、兼容说明和 ADR 更新。

### PR-37:测试 parity→golden 改造【Phase 0/1,薄壳化前置】
6 个 `test_core_calculator_matches_backend_*` 改为对照 f64 golden;补覆盖:segment 边覆盖、并行边、`_balance_param` 非方/退化聚合、混合 asm+udm、组分错配、ASM 氧清零 compute_mask、default 分支现状、退化图、scipy_solver/adaptive_heun。v1.4 继承补充:把 core-only golden/adapter/boundary 测试与 backend-dependent adapter parity 测试物理拆开;core-only 测试文件模块顶层不得导入 `app.*`,不得把 `backend/` 加入 `sys.path`;依赖 `backend/app/services/simulation_input_adapter.py` 的迁移对照测试移入 backend 侧或单独 backend-dependent lane。Day 0 先提交现状 repro 与目标 golden:default clamp 现状、并行边当前错误 repro、表达式 fail-late repro必须可独立复现。否则 PR-29 的安装烟雾和 PR-37 的独立 golden suite 均视为未完成。

**当前实现状态（2026-06-15）**：PR-37 测试物理拆分与第一阶段 golden 改造已完成。`simulation_core/tests/test_material_balance_core.py` 现在只依赖 `simulation_core/python`,不再导入 legacy backend `app.*` 或插入 `backend/` 路径；`CORE_F64_GOLDEN_CASES` 覆盖 material-balance minimal、ASM1Slim model-bound、独立 ASM1Slim/ASM1/ASM3/UDM 六个历史 parity fixture,逐案断言 job type、runtime node type、参数字段/数量、timestamp count、total steps 与 CPU/f64 稳定结果 hash。backend-dependent adapter/calculator 对照保留在 `backend/app/tests/material_balance_calculator_delegation_preflight_test.py`;`scripts/audit-simulation-core-boundary.ps1` 已切换为识别 core-only committed f64 golden guard 与 backend-side delegation preflight。segment override、并行边、`_balance_param` 非方/退化、mixed ASM/UDM、UDM mapping/stoich mismatch、ASM 氧清零 compute_mask、default no-clamp 与 solver matrix 继续由 docs golden、boundary/correctness tests 和 Phase 0 golden evidence 维护；若这些 fixture 或 correctness-freeze 行为改变,必须刷新 committed hashes 与 P-03 evidence。

### PR-38:多模型混合节点调度修复【Phase 1,Critical】
决策支持/不支持混合反应模型:
- 支持:`_run_hours` 互斥 if/elif 改为单次 RHS 内对各 mask 子集分别叠加反应项(`reaction_change[mask]+=rates`),与 PR-11 统一 RHS 合并实现。
- 不支持:构建期检测多反应模型共存→报错,并入 PR-23 存量审计。
golden:混合 asm+udm(支持)或报错用例(不支持)。KPI-018。

**当前实现状态（2026-06-15）**：已选择支持方案并由 ADR 0015 接受，且 PR-11 当前 core dispatch 收口已完成。`_run_hours` 当一个或多个反应模型 active 时走 `_combined_reaction_ode_balance`,combined RHS 只计算一次 transport,再按 active `compute_mask` 子集叠加 ASM1Slim/ASM1/ASM3/UDM 反应；docs mixed golden 与 core boundary regression 已转为 active。反应分支 output clamp 与 default no-clamp baseline 继续由 correctness-freeze audit 保护，default no-reaction branch 仍单独走 `_ode_balance`。

### PR-39:反应组分契约【Phase 1】
为每个反应模型定义组分契约(数量/必需组分/顺序或具名映射);构建期校验全局组分映射满足契约;硬编码氧索引(0/5/6)与反应输入列序提升为 `component_schema→模型组分` 映射。v1.4 补充:当前氧清零是 `torch.where(mask,...)` 后再全列 `dy[:,k]=0`,抽取后必须改为仅对 `compute_mask` 子集清零,不得依赖前序 mask 投影顺序。KPI-019。

**当前实现状态（2026-06-15）**：已完成氧清零范围的第一步防护:ASM1Slim/ASM1/ASM3 现有分支与 mixed combined RHS 只对对应 ASM model 的 active compute 节点清零氧导数,不再对全列无条件写入。ASM stable mask gather 的低风险部分也已落地:`_convert_to_tensors()` 预计算 ASM1Slim/ASM1/ASM3 active compute node indices 与 filtered parameter rows,single-model 与 combined RHS 复用该 runtime,每步仍只对变化的 `y` 做 index gather。ASM schema-driven component guard 也已落地:`ASM_COMPONENT_CONTRACTS` 集中声明 ASM1Slim/ASM1/ASM3 当前反应核固定列序与氧索引；`_convert_to_tensors()` 在 `customParameters` metadata 存在时按组件名解析模型局部列索引,缺失或重复必需组件抛出 `InvalidInputError`,ASM 反应输入 gather 到模型固定列序,输出 scatter 回全局列且额外全局组件不被反应项污染；legacy direct route schema 已补 `customParameters` / `component_schema` 并在 service 入核时桥接到 core `original_flowchart_data`，因此 direct `/calculate` 也可携带具名 component metadata。metadata 缺失的 legacy 输入仍至少按所需组件数 fail-fast 并保留前缀列行为。UDM runtime 已补组分错配与 PR-4 写侧索引冲突前置 guard:显式声明的局部组分必须能通过同名或 `udm_variable_bindings` 映射到全局组分,同一节点内不能有两个 local 组分解析到同一个 global 组分,`stoich` / `stoich_expr` 不能引用未知局部组分,否则构建 runtime payload 时抛出 `InvalidInputError`;读侧 env、写侧 `index_add_` 与 fixed-mask 共用这份校验索引。PR-11 全统一 RHS 也已完成当前 core dispatch 收口。

### PR-11:统一 RHS 抽取【Phase 4,v1.4 继承并强化】
五个 RHS 分支当前重复状态拆分、clamp、传输 balance、dilution、mask 投影与 volume 导数,抽取收益明确。但 PR-11 不得只做机械去重:必须以 PR-38 的混合调度决策为前置,支持方案下在单次 RHS 内对 ASM1Slim/ASM1/ASM3/UDM 各 mask 子集叠加反应项;不支持方案下则在构建期报错并有存量审计。抽取时必须显式保留或决策各模型特殊行为:ASM 氧列硬编码清零迁移到 PR-39 组分契约且限定 compute_mask,UDM fixed component mask 继续生效,default 纯传输分支的输出 clamp 现状由 PR-12 golden 固定。v1.4 补充:ASM `params[mask]` / `y[mask]` 等稳定布尔 gather 应与 UDM 节点索引一起预解析,否则统一 RHS 只解决可维护性而漏掉热路径成本。

**当前实现状态（2026-06-15）**：当前 core dispatch 的 PR-11 统一 reaction RHS 已完成。`_run_hours` 对一个或多个 active ASM/UDM reaction models 均走 `_combined_reaction_ode_balance`，单模型 ASM1Slim/ASM1/ASM3/UDM 不再分派到各自独立 RHS；default no-reaction branch 仍走 `_ode_balance`，并继续以 `clamp_output=False` 保留 default no-clamp baseline。ASM oxygen index / component gather-scatter 来自 PR-39 runtime，UDM fixed mask 仍由 UDM runtime payload 应用；Phase 0 golden 与 correctness-freeze audit 继续保护行为不变。

### PR-12:输出投影一致化【Phase 4,v1.4 继承并强化】
现状四个反应分支在 `odeint` 后执行 `x = torch.clamp(x, min=0)`,而 default 纯传输分支同一行被注释。PR-12 必须先把 default 分支现状固化为 golden,再决策统一输出投影语义。若开启 `CLAMP_STATE_IN_RHS` 或统一输出 clamp,需区分浓度列与体积列,不得把当前体积 `min=1e-6` 的 RHS 保护和输出端全状态 `min=0` 混为同一规则。任何语义变更需走 flag、L3 golden 与 release note。

### PR-13a:表达式校验器白名单化【Phase 4】
`_validate_ast` 从 denylist-fallthrough 改为白名单(未列节点一律 DISALLOWED),与运行时 `_evaluate_ast` 对齐;补 fuzz/边界用例(Starred/NamedExpr/JoinedStr/Slice 等)。复审性质定性:这是校验通过、仿真时 `NamedExpr`/`JoinedStr` 才 raise 的 fail-late 一致性问题,不是 RCE;PR 文案与安全评审中不要夸大为运行时代码执行漏洞。

**当前实现状态（2026-06-15）**：已完成白名单化主体。`_validate_ast` 对未显式允许的 AST 节点默认返回 `DISALLOWED_SYNTAX`，并显式拒绝 allowlisted function 的 keyword arguments；core-only boundary tests 覆盖 `NamedExpr`、`JoinedStr`、`Starred`、`Subscript`/`Slice`、keyword arguments，以及确定性 allowlisted/disallowed AST corpus。该切片不改变表达式 evaluator 的合法语法集合、不改变 UDM runtime 数值语义；KPI-017 build-time evidence 已由 P-03 golden micro evidence 覆盖。

---

## 4. 依赖图

```text
Phase0: PR-1/2/3 baseline ─┐
        PR-20 单一来源+守卫 ─(闸门)─┐
        PR-21 profiling             │
        PR-22 f64 golden            │
        PR-29 打包化 ───────────────┤(薄壳化前置)
                                    v
Phase1 正确性: PR-4 映射guard / PR-5/6 hybrid / PR-38 混合调度 / PR-39 组分契约
       方案A:  PR-30 契约统一 → PR-37 测试改造 → PR-31 薄壳化主PR
       审计:   PR-23 存量兼容(strict默认前置)
        │
        ├─> Phase2: PR-24 缓存 / PR-7/8 热路径 / PR-32 并行边 / PR-33 dense lazy / PR-34 网格解耦 / PR-35 守恒
        │      └─> PR-28 端到端复测(KPI-016)
        │
        ├─> Phase4: PR-11 统一RHS(前置PR-38) / PR-12 投影 / PR-36 求解器 / PR-13a 校验器白名单
        │      └─> 全仿真L3回归门(rk4主判据)
        │
        └─> Phase3(可选) PR-9/10/25 ─> Phase6(可选) PR-17/18/19

Phase5 Go: PR-13 metrics → PR-14 索引对账 → PR-26 keyset → PR-27第一步LIMIT
           → PR-15 对抗benchmark → PR-27第二步下推(可选) → PR-28 → PR-16 gate
```

关键约束:PR-29→PR-30→PR-37→PR-31 为方案 A 关键路径;PR-29/PR-37 必须先证明 core-only 测试不反向依赖 backend;PR-30 必须决策 `extra` 策略;PR-31 英文重写前先还原归档 mojibake;PR-38 是 PR-11 的前置;PR-39 的氧清零 compute_mask 是 PR-11 抽取的前置保护;PR-12 的 default clamp golden 是 PR-11 抽取前置保护;PR-20 是 Phase1+ 所有 material_balance PR 的合并闸门;PR-23 是 strict 默认前置。

---

## 5. Definition of Done

**单 PR**:触碰 material_balance → 漂移守卫绿(薄壳化后=backend 仅 re-export);数值验收标层级;新增 flag 附退场条件。
**阶段**:
- Phase 0:基线可复现(三求解器维度)、profiling 占比表、f64 golden 可复现、simulation_core 可安装、core-only pytest 不依赖 backend/SQLModel、单一来源决策。
- Phase 1:映射/混合/组分正确性用例过;氧清零限定 compute_mask;输入模型 `extra` 策略可观测;backend 薄壳化(KPI-013);存量审计+灰度策略。
- Phase 2:KPI-001/005/006/017/020 达标;UDM RHS 无逐步 `.item()` 同步点;端到端 `compute` 分段 ↓≥20%(KPI-016)。
- Phase 4:统一 RHS L3 通过;ASM 稳定 mask gather 已预解析或有 profiler 证据;default clamp 现状 golden 通过;混合图 L3(KPI-018);校验器白名单化+fuzz 过;dopri5/adaptive_heun 入矩阵。
- Phase 5:KPI-014/015 达标;worker 端到端基线归档。

---

## 6. 回滚与 flag

| 开关 | 默认 | 说明 |
|---|---|---|
| `UDM_EXPR_CACHE` | true | 表达式编译缓存 |
| `USE_UNIFIED_RHS` | false→true | 统一 RHS(含混合叠加) |
| `UDM_EXPRESSION_ENGINE` | ast→bytecode | 表达式引擎(可选 model_codegen) |
| `CLAMP_STATE_IN_RHS` | 决策值 | RHS clamp 策略 |
| `SOLVER_DEFAULT` | scipy_solver→(评估 rk4) | 默认求解器(REQ-P0-013) |
| `SHADOW_RHS_COMPARE` | false | 新旧 RHS 双跑灰度 |

组合矩阵:默认 / 目标(bytecode+unified_rhs+clamp 决策+solver) / 5 个一阶翻转受测,其余不支持。每 flag 定 sunset。

**当前 flag matrix evidence（2026-06-15）**：`scripts/ci/performance-flag-matrix-phase0.ps1` 已建立 opt-in evidence,输出 `performance-flag-matrix-phase0.json` / `.md`。该 evidence 覆盖 6 个 v1.4 性能 flags 与 supporting rollout flag `AUTOWATERSIMU_WORKER_ADAPTER_VALIDATION_MODE`,验证每个 flag 都有默认值、目标值、runtime 状态、矩阵 case 与退场条件。当前 `UDM_EXPR_CACHE` 是已实现 always-on 但无 runtime toggle；`SOLVER_DEFAULT` 已由 ADR 0016 决定不切换；`USE_UNIFIED_RHS`、`UDM_EXPRESSION_ENGINE`、`CLAMP_STATE_IN_RHS` 与 `SHADOW_RHS_COMPARE` 仍是 planned/blocked flags,尚未声称 runtime 组合已执行。退场条件如下:

| 开关 | 当前/默认 | 目标/候选 | 退场条件 |
|---|---|---|---|
| `UDM_EXPR_CACHE` | true(always-on) | true | KPI-017 Phase 0 golden 持续通过则保持 always-on；除非回归需要 rollback PR,不新增 runtime toggle。 |
| `USE_UNIFIED_RHS` | false(planned) | true | PR-11 L3 goldens、correctness-freeze audit 与 shadow comparison（若启用）通过后,再移除 false path。 |
| `UDM_EXPRESSION_ENGINE` | ast(planned optional) | bytecode / model_codegen | L1/L3 golden 与 expression bucket 收益均通过后保留；收益不足则移除实验引擎。 |
| `CLAMP_STATE_IN_RHS` | decision_pending | PR-12 决策值 | PR-12 固定 default branch golden、记录输出投影决策与兼容说明后退场。 |
| `SOLVER_DEFAULT` | scipy_solver | scipy_solver | 当前无切换；未来必须新 ADR + refreshed goldens + rollout flag 后才能引入。 |
| `SHADOW_RHS_COMPARE` | false(planned optional) | false | unified RHS 默认启用并完成 soak 期无 L3/correctness 回归后移除 shadow。 |

回滚要点:PR-31 revert 恢复副本(过渡 tag);PR-26 过渡期可 revert,过渡后需恢复旧 cursor 编码;PR-27 第一步直接 revert、第二步 migration down;PR-38/39 行为变更走 flag 灰度。

---

## 7. 排期(Sprint)

**Sprint 0(4 天)**:PR-20 决策+守卫、PR-21 profiling、PR-22 golden、PR-29 打包化+core-only smoke。
**Sprint 1(7 天)**:PR-1/2/3 harness;PR-4 映射 guard;PR-5/6 hybrid;PR-38 混合调度;PR-39 组分契约+氧清零 compute_mask;PR-30 契约统一+`extra` 策略。
**Sprint 2(7 天)**:PR-37 测试物理拆分+golden 改造;PR-31 mojibake 还原归档+薄壳化;PR-23 审计;PR-24 缓存;PR-7/8 UDM RHS 去同步点。
**Sprint 3(6 天)**:PR-32 并行边;PR-33 dense lazy+`_balance_param` 维度回归;PR-34 网格解耦;PR-35 守恒;PR-28 端到端复测。
**Sprint 4(6 天)**:PR-11 统一 RHS;PR-12 投影;PR-36 求解器;PR-13a 校验器。
**Sprint 5(13 天)**:PR-13 metrics;PR-14 索引;PR-26 keyset;PR-27 两步;PR-15 对抗;PR-28;PR-16 gate。
**可选**:PR-9/10/25(fast expr)、PR-17/18/19(批量化)按余量插入,不占关键路径。

---

## 8. 开发注意事项
1. 优化只落 simulation_core;backend 通过 re-export 获得,合并前自查守卫。
2. 全仿真轨迹一律 L3(relative+f64 reference+rk4 主判据),勿用绝对 1e-6。
3. 绝对延迟阈值只在 nightly 固定 runner 判;merge 仅烟雾。
4. claim 改造先 LIMIT 止血再评估下推,两步可回滚。
5. 统一 RHS 前先解决混合调度(PR-38),否则把错误的互斥语义固化进新结构。
6. 反应组分硬编码索引(氧 0/5/6、固定列序)迁移为组分契约,勿在抽取时悄改。
7. 薄壳化前确认 app.models 对象走 simulation_core 完整校验,勿留绕过路径。
8. core-only 测试不得在模块顶层导入 `app.*`;backend 适配器 parity 测试必须移到 backend-dependent lane。
9. PR-7/8 只声明"去 `.item()`"不够,必须证明 UDM RHS 每步不再触发设备同步,并按求解器拆分收益。
10. default 纯传输分支当前没有输出 clamp,统一 RHS 或统一投影前必须先固定现状 golden。
11. 五个 RHS 分支去重必须与反应项叠加调度一起完成,不要把当前 if/elif 互斥结构包装成新抽象。
12. `_balance_param` 的 out/in 聚合维度不能只在方阵上验证,PR-33 必须含非方/退化回归。
13. 表达式校验问题按 fail-late 一致性处理,运行时白名单已兜住安全边界;PR-13a 不要扩大成 RCE 修复叙事。
14. mojibake 清理前先无损还原归档,再做英文重写或删除。

---

## 9. 上线检查清单
- [x] 单一来源决策+守卫;backend 仅 re-export(KPI-013；calculator/exceptions/utils/models/ASM/UDM helper leaves 已薄壳化，`app.material_balance` 顶层 model export 已移除，service app.models 入核校验与 legacy route metadata bridge 已完成；删除 legacy route schema 不在本阶段内)。
- [x] simulation_core 可安装,sys.path hack 已删。
- [x] core-only pytest collect/run 在无 backend/SQLModel 环境通过;backend-dependent parity 测试已物理拆分。
- [x] 输入模型契约统一,死代码清理,app.models 入核走校验（service 入核校验、`app.material_balance.models` re-export 与 legacy direct route metadata bridge 已完成；删除 legacy `app.models` route schema 需另开高风险切片）。
- [x] `NodeData`/`EdgeData extra` 策略已收紧或可观测,错拼字段不再静默吞掉。
- [x] 混合 asm+udm 调度按决策正确(KPI-018)。
- [x] 反应组分契约,错配报错非静默(KPI-019；UDM runtime mapping/stoich mismatch guard、core ASM schema-driven gather/scatter 与 legacy route schema metadata bridge 已完成)。
- [x] ASM 氧清零限定在 active compute model 节点内,不改写非计算节点。
- [x] 并行边 dense/sparse 语义统一(KPI-006)。
- [x] `_balance_param` out/in 聚合维度回归通过(KPI-020)。
- [x] dense lazy 化。
- [x] 输出网格解耦(KPI-005)。
- [x] 真实守恒指标接入 L3。
- [x] adaptive_heun 入验收矩阵,并明确 dopri5 当前不进白名单。
- [x] 默认求解器切换评估完成（ADR 0016：当前不切换，保持 `scipy_solver` 默认）。
- [x] `max_iterations` / `max_memory_mb` 实现或标 deprecated（当前选择 deprecated compatibility fields）。
- [x] 表达式缓存(KPI-017) N=100 build-time evidence + 校验器白名单化 + deterministic fuzz-style corpus。
- [x] UDM RHS/evaluate_reaction 热路径无逐步 `.item()` 同步点,收益按 `scipy_solver` 与 torch 原生求解器拆分。
- [x] ASM 稳定 mask gather 已预解析或有 profiler 证据说明剩余成本。
- [x] f64 golden 生成器已有 Phase 0 evidence;历史 backend parity 用例已迁为 core-only committed f64 golden,backend-dependent 对照保留在 backend lane。
- [x] default 纯传输分支 clamp 现状已有 golden;统一投影语义变更仍需单独 flag PR。
- [x] 统一 RHS 抽取已保留 ASM 氧列、UDM fixed mask、default clamp 现状或显式变更记录。
- [x] 索引冲突不污染;映射 guard 写侧修复。
- [x] P-06 Go latency baseline 已有;keyset 深分页(KPI-014)、claim 有界扫描+对抗(KPI-015)、worker 端到端基线仍需后续 PR。
- [x] 火焰图占比表;KPI-003 收益分解(按求解器)。
- [x] P-05 strict opt-in smoke / 灰度策略已有；worker 默认 strict 切换、存量失败归因扩展和前端文案同步仍需后续 PR。
- [x] flag 组合矩阵测试;每 flag 有退场条件。
- [x] 绝对阈值 KPI 仅 nightly 固定 runner,基线含硬件指纹。
