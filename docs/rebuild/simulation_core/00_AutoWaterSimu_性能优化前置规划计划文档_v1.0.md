# AutoWaterSimu simulation_core 性能优化前置规划计划文档 v1.0

**版本**：v1.0
**适用范围**：`docs/rebuild/simulation_core/` 与后续 simulation_core 性能优化切片
**生效位置**：进入《AutoWaterSimu 性能优化开发计划文档 v1.4》前必须先读本文
**编制日期**：2026-06-14

本文不是新的性能优化主计划，而是主计划启动前的前置收敛计划。它根据 `AutoWaterSimu_性能优化需求文档_v1.4.md`、`AutoWaterSimu_性能优化开发计划文档_v1.4.md`、`AutoWaterSimu_simulation_core_专项审查报告.md`、ADR 0012/0013/0014、最新 Phase 0 变更记录，以及本轮粘贴的重新评估结论，重新定义当前应该先完成的证据链。

核心判断：

> 优雅度重构主线已经从 Compute API / service test / boundary freeze 转入 simulation_core 方案 A 与性能 Phase 0。当前最高优先级不是直接优化热路径，而是先把 Phase 0 baseline / profiling / golden 证据补完整。

---

## 1. 当前事实基线

截至 2026-06-14，以下事项按仓库记录视为已完成或进入维护态：

| 领域 | 当前状态 | 证据来源 |
|---|---|---|
| Compute API boundary freeze | 已进入默认 gate 维护 | `scripts/ci/pr-fast.ps1`、architecture current-state |
| service-test split | 当前 P0 已完成，后续只按具体风险维护 | `tasks/todo.md`、`.ai/changes/2026-06-14.md` |
| simulation_core packaging | 已有 `autowatersimu-simulation-core` packaging metadata | `.ai/changes/2026-06-14.md` |
| input contract closure | `simulation_input.v1` node/edge unknown fields 已关闭；runtime `NodeData`/`EdgeData` 为 `extra=forbid` | ADR 0012、ADR 0013 |
| correctness freeze | `_run_hours` mixed combined dispatcher、single-model fallback、clamp policy、ASM 氧清零 active compute mask 范围与 `compute_mask` derivative masking 已冻结为当前基线 | ADR 0014/0015、`scripts/audit-simulation-core-correctness-freeze.ps1` |
| backend calculator thin-shell | `backend/app/material_balance/core.py` 已成为 simulation_core calculator compatibility re-export | `.ai/changes/2026-06-14.md` |
| worker source-mode dependency gate | source-mode worker 已证明使用 installed/editable helper packages；runtime repo-path fallback 已删除 | `.ai/changes/2026-06-14.md`、`.ai/changes/2026-06-15.md` |
| Phase 0 timings baseline | P-01 mixed fixture 已补齐；baseline 当前为 `passed` | `scripts/ci/performance-baseline-phase0.ps1` |
| Phase 0 profiling artifacts | P-02 profiling evidence 已生成；当前为 `passed` | `scripts/ci/performance-profiling-phase0.ps1` |
| Phase 0 f64 golden generator | P-03 CPU/f64/fixed-seed golden evidence 已生成；当前为 `passed` | `scripts/ci/performance-golden-phase0.ps1` |
| Phase 0 hot-path prereview | P-08 已汇总 P-01/P-02/P-03 并选择第一批候选；当前为 `passed` | `scripts/ci/performance-hotpath-prereview-phase0.ps1` |
| Phase 0 Go API latency smoke | P-06 本地内存 Compute API claim/list/get latency smoke 已生成；当前为 `passed` | `scripts/ci/performance-go-api-latency-phase0.ps1` |
| Worker adapter strict rollout | P-05 opt-in CLI/env/JSON-RPC 接入口与 strict smoke 已生成；当前为 `passed`，默认仍为 `compat` | `scripts/ci/worker-adapter-strict-smoke.ps1` |
| Backend compatibility models cleanup | P-04 已把 backend-local material_balance input models 固定为 compatibility-only import path，并由 focused pytest 与 boundary audit 防止生产 runtime 误用 | `backend/app/tests/material_balance_compat_models_boundary_test.py`、`scripts/audit-simulation-core-boundary.ps1` |
| Backend ASM/UDM helper thin-shell | backend ASM/UDM runtime helper import paths 已改为 simulation_core compatibility re-export，并由 focused pytest 与 boundary audit 防止重新复制 | `backend/app/tests/material_balance_runtime_helpers_thin_shell_test.py`、`scripts/audit-simulation-core-boundary.ps1` |
| Worker packaged sidecar no-fallback evidence | P-07 PyInstaller one-folder sidecar smoke 已生成；当前为 `passed`，`deprecated_repo_path_fallback_used=false`；runtime fallback 删除后继续作为回归 gate | `scripts/ci/worker-packaged-no-fallback-smoke.ps1` |
| 第一批 transport precompute | P-08 第一候选已落地；default/no-override segment 复用预计算 runtime edge tensors | `simulation_core/python/autowatersimu_simulation_core/material_balance/core.py` |
| 第二批 UDM cache/device-sync | P-08 第二候选已落地；表达式编译 LRU 缓存，UDM RHS/evaluate_reaction 使用构建期预计算索引与 fixed metadata | `udm_expression.py`、`udm_engine.py`、`udm_ode.py` |

当前主要缺口：

1. 第一批 transport tensor precompute、第二批 UDM cache/device-sync、PR-38 mixed-model dispatch、PR-32 dense/sparse parallel-edge unification、PR-33 dense lazy / `_balance_param` shape guard、segment timestamp CPU construction、`parameter_names` reuse 与 PR-34 输出网格解耦已落地；后续需继续用 P-03/P-08 evidence 防止把 solver 默认值/矩阵或 mixed-model 语义继续混入无关性能 PR。
2. backend-local material_balance input models 已被标注并审计为 compatibility-only；backend ASM/UDM runtime helper 叶子已薄壳化；packaged sidecar no-fallback evidence 已通过且 worker runtime fallback 删除已完成；worker strict default 仍未切换，但已有 opt-in strict smoke 与切换条件。legacy input model cleanup、route schema 迁移和完整 backend-only re-export 仍是后续 PR-30/PR-31 收尾项。
3. Go claim/list latency 已有本地内存 API smoke baseline；`claim_scanned_rows` 仍只是预留字段，后续 metrics/index/keyset/claim LIMIT 需另开 PR 基于该 evidence 判断收益。

---

## 2. 前置目标

本文定义的前置目标是：

1. 把 Phase 0 baseline 从 `partial` 推进到可用于后续对比的完成态。
2. 在任何 UDM RHS、求解器默认值/矩阵或 Go keyset/claim 优化前，先建立 profiling 与 golden 保护网。
3. 将 backend compatibility cleanup、worker strict rollout、worker no-fallback gate 和 Go API latency baseline 从“混在主线里的不确定项”拆成独立切片。
4. 明确哪些工作现在不应继续做，防止又回到低收益 wrapper、普通 service-test split 或无证据的热路径改动。

非目标：

- 不修改 runtime 代码。
- 不改变 `simulation_input.v1` schema、OpenAPI、generated client、数据库 schema 或 worker 默认 adapter validation mode。
- 不恢复 deprecated repo-path fallback。
- 不决定 mixed ASM/UDM 的最终业务语义。
- 不把 ADR 0014 中旧 `_run_hours` 互斥分支行为表述为最终设计；当前 mixed-model 执行语义以 ADR 0015 supported dispatch 为准。

---

## 3. 进入主性能计划前必须完成的切片

### P-01：`perf-phase0-mixed-asm-udm-fixture`

**目的**：补齐当前 Phase 0 baseline 的唯一硬缺口，让 baseline matrix 覆盖 small / medium / mixed 三类图。

**当前状态（2026-06-14）**：已实现。`contracts/examples/valid/mixed_asm_udm.compute_job.v1.json` 已纳入 registry 与 contract tests；Phase 0 baseline 当前 12 runs、0 hard violations、0 open gaps；correctness-freeze audit 保持 passed。该 fixture 仍只记录 current-state baseline，不代表 PR-38 最终混合模型语义。

范围：

- 新增 tracked `contracts/examples/valid/mixed_asm_udm.compute_job.v1.json`。
- 覆盖至少一个 ASM + UDM mixed 图。
- 进入 `scripts/ci/performance-baseline-phase0.ps1` matrix。
- 不修改 `_run_hours` 分支逻辑，不修 mixed-model 语义，不新增最终业务承诺。

DoD：

- `performance-baseline-phase0.ps1` 不再因为 `mixed_asm_udm-baseline-fixture-missing` 返回 `partial`。
- baseline evidence 明确写出哪些是 current-state baseline；mixed-model 最终语义以 ADR 0015 supported dispatch 为准。
- `scripts/audit-simulation-core-correctness-freeze.ps1` 仍为 passed。

建议验证：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-baseline-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-simulation-core-correctness-freeze.ps1
```

### P-02：`perf-phase0-profiling-artifacts`

**目的**：在热路径优化前先知道时间花在哪里，避免凭直觉改 UDM/RHS/dense-sparse。

**当前状态（2026-06-14）**：已实现。`scripts/ci/performance-profiling-phase0.ps1` 默认覆盖 small material balance、medium ASM1、single UDM 与 mixed ASM/UDM，在 `scipy_solver` / `rk4` / `adaptive_heun` 下生成 12-run profiling evidence；输出 `tmp/ci-evidence/performance-profiling-phase0.json`、`tmp/ci-evidence/performance-profiling-phase0.md` 与 raw `.prof` 文件。当前 evidence status 为 `passed`，0 hard violations、0 open gaps。

范围：

- 对 small / medium / mixed_asm_udm 输出 worker compute path 的热点占比表。
- 额外包含 single UDM fixture，用于暴露 expression 与 `.item()` / device sync 相关 bucket。
- 至少区分 expression、`.item()` / device sync、transport dense vs sparse、ODE framework、artifact serialization、adapter conversion。
- 输出可复查 JSON 或 Markdown evidence。
- 不修改 `udm_ode.py`、`udm_engine.py`、`core.py` 热路径。

DoD：

- 每个 case 有可复跑命令、硬件/线程/求解器信息和 profiler 输出位置。
- 若热点占比不足以支撑 KPI-003 或 KPI-016，必须回到需求/计划修订目标，不得直接扩大优化范围。

### P-03：`perf-phase0-golden-generator`

**目的**：为 Phase 2/4 的正确性变更建立独立 golden 保护网。

**当前状态（2026-06-15）**：已实现。`scripts/ci/performance-golden-phase0.ps1` 直接调用 `autowatersimu_simulation_core`，启动时移除 legacy backend 项目路径，不使用 legacy backend oracle；默认生成 12 个 CPU/f64/fixed-seed L3 full-run goldens（small material balance、medium ASM1、single UDM、mixed ASM/UDM × `scipy_solver` / `rk4` / `adaptive_heun`）和 7 个 L1/L2 micro goldens（UDM expression、KPI-017 N=100 expression cache build-time、parallel edge sparse、parallel edge dense/sparse target equivalence、single-edge dense/sparse、`_balance_param` zero-flow degenerate、`_balance_param` non-square explicit rejection）。当前 evidence status 为 `passed`，0 hard violations、0 open gaps；`docs/rebuild/simulation_core/test_*.py` 已归档为 current-state positive/golden/repro、active mixed-model target golden、parallel-edge target golden 或 historical unsupported-error alternative。

范围：

- CPU + float64 + fixed seed。
- 记录 torch 版本、平台、BLAS、commit、solver method、tolerance、sampling grid。
- 支持 L1 / L2 / L3 分层容差。
- 优先覆盖 mixed ASM/UDM、parallel edge、default branch clamp current-state、`_balance_param` 非方/退化、solver matrix。

DoD：

- 生成器产物不依赖 legacy backend oracle。
- core-only golden 测试不在模块顶层 import `app.*`，不把 `backend/` 加入 `sys.path`。
- 当前 `docs/rebuild/simulation_core/test_*.py` 中的 xfail/skip 能被明确归档为“现状 repro”或“目标 golden”。

建议验证：

```powershell
backend\.venv\Scripts\python -m pytest simulation_core\tests -q
backend\.venv\Scripts\python -m pytest docs\rebuild\simulation_core -q
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-golden-phase0.ps1
```

### P-04：`backend-material-balance-compat-model-cleanup`

**目的**：收尾 PR-31 后留下的 legacy backend compatibility models / helpers，防止未来继续误用 backend-local runtime contract。

范围：

- 明确 `backend/app/material_balance/models.py` 哪些类仍只是 import compatibility。
- 删除或标注确定无调用方的 dead helper。
- 增加 audit，禁止新 runtime path 引入 backend-local `MaterialBalanceInput`。
- 不改 legacy FastAPI route schema，不改 `app.models.MaterialBalanceInput`，不改 OpenAPI/generated client。

DoD：

- 旧模型不会被新的 runtime 入口当作 canonical contract 使用。
- backend targeted material_balance tests 与 simulation_core boundary audit 通过。

**当前状态（2026-06-15）**：已实现旧本地 input models compatibility boundary。`backend/app/material_balance/models.py` 与 `__init__.py` 明确标注为 compatibility-only / not active runtime input contract；`simple_test.py` 与 `test_module.py` 标为 legacy manual scripts，不作为 pytest、生产 runtime 或性能前置证据；新增 `backend/app/tests/material_balance_compat_models_boundary_test.py` 用 AST 扫描生产代码，禁止除 `backend/app/material_balance/__init__.py` 与 `models.py` 之外的 runtime 文件 import backend-local `MaterialBalanceInput` / `NodeData` / `EdgeData` / `CalculationParameters`；backend ASM/UDM helper 叶子已改为 simulation_core compatibility re-export，并由 `backend/app/tests/material_balance_runtime_helpers_thin_shell_test.py` 与 boundary audit 保护；`scripts/audit-simulation-core-boundary.ps1` 当前为 `passed`，0 hard violations、0 open gaps。本状态仍不表示整包 re-export、legacy route schema 变更或 input model cleanup 完成。

### P-05：`worker-adapter-strict-mode-rollout-plan`

**目的**：把 worker strict mode 从“未来项”变成可灰度计划，但不直接切默认。

**当前状态（2026-06-14）**：已实现。worker CLI / JSON-RPC / API loop 均可通过 `--adapter-validation-mode` 或 `AUTOWATERSIMU_WORKER_ADAPTER_VALIDATION_MODE` 显式选择 `compat` / `warn` / `strict`；默认仍为 `compat`。`scripts/ci/worker-adapter-strict-smoke.ps1` 使用 strict mode 跑 valid compute_job fixtures，当前 evidence status 为 `passed`，8/8 fixtures 通过，0 hard violations、0 open gaps；evidence 中记录 warn→strict 默认切换条件。

范围：

- 设计 opt-in env / CLI flag，例如 `AUTOWATERSIMU_WORKER_ADAPTER_VALIDATION_MODE=strict`。
- 默认仍为 `compat`。
- 增加 strict smoke lane 或 audit lane，先统计 fixtures 通过率。
- 明确 warn → strict 的切换条件。

DoD：

- 默认 worker 行为不变。
- strict 的通过率、失败原因码和迁移策略可见。
- 不把 strict 默认切换与性能 Phase 0 混在同一个 PR。

建议验证：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\worker-adapter-strict-smoke.ps1
```

### P-06：`perf-phase0-go-api-latency-smoke`

**目的**：让 Go claim/list 性能优化先有实测基线。

**当前状态（2026-06-14）**：已实现。`scripts/ci/performance-go-api-latency-phase0.ps1` 启动本地 `go run ./cmd/compute-api` 内存元数据实例，使用 `material_balance_minimal.compute_job.v1.json` 批量创建 jobs，测 `GET /api/v1/compute/jobs`、`GET /api/v1/compute/jobs/{id}` 与 `POST /api/v1/workers/{worker_id}/claim` wall time，输出 p50 / p95 / p99 到 `tmp/ci-evidence/performance-go-api-latency-phase0.json` / `.md`。当前 evidence status 为 `passed`，0 hard violations、0 open gaps；`claim_scanned_rows` 字段已预留但标记为 unavailable，因为当前 Compute API 尚未暴露 scanned-row 计数。

范围：

- 启动本地 Compute API。
- 创建 N 个 jobs。
- 测 `GET /jobs`、`GET /jobs/{id}`、worker claim POST wall time。
- 输出 p50 / p95 / p99，并预留 `claim_scanned_rows`。
- 不改 keyset cursor、不改 claim LIMIT、不新增索引或 migration。

DoD：

- Go API latency baseline 可复跑。
- 后续 PR-13/14/26/27 只能基于该 baseline 判断收益。

建议验证：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-go-api-latency-phase0.ps1
```

### P-07：`worker-packaged-sidecar-no-fallback-evidence`

**目的**：删除 deprecated repo-path fallback 前，先证明 packaged sidecar 不需要 fallback；删除完成后，该 lane 继续作为 no-fallback 回归 gate。

范围：

- 使用 packaged / sidecar-like 资源布局运行 worker self-check 与最小 job。
- 证明 `deprecated_repo_path_fallback_used=false`。
- 不改 Desktop release 行为，不构建 NSIS installer。

DoD：

- source-mode gate 与 packaged-sidecar gate 分开记录。
- fallback 删除后必须继续保持该 evidence 通过。

**当前状态（2026-06-15）**：已实现并进入回归维护。新增 `scripts/ci/worker-packaged-no-fallback-smoke.ps1`，默认构建真实 PyInstaller one-folder sidecar，也可复用 `-SidecarPath` / `AUTOWATERSIMU_PACKAGED_SIDECAR`；脚本复用 `apps/desktop/scripts/smoke-packaged-sidecar.ps1` 跑 `--self-check` 和 minimal material balance job，并要求 packaged self-check 中 `worker_dependency_imports.deprecated_repo_path_fallback_used=false`。当前本地 evidence 为 `passed`，0 hard violations，`deprecated_repo_path_fallback_used=false`。worker runtime repo-path fallback 已在后续切片删除；该 lane 继续证明 packaged sidecar 不需要 fallback，不构建 NSIS installer，不改变 Desktop release 行为。

### P-08：`udm-rhs-hotpath-prereview`

**目的**：在真正改 UDM RHS / `.item()` / dense-sparse / solver grid 前做最后一次证据审查。

**当前状态（2026-06-15）**：已实现。`scripts/ci/performance-hotpath-prereview-phase0.ps1` 汇总 `performance-baseline-phase0.json`、`performance-profiling-phase0.json` 与 `performance-golden-phase0.json`，当前 evidence status 为 `passed`，0 hard violations、0 open gaps。第一批候选 `transport-runtime-tensor-precompute-no-semantics` 已落地：default/no-override segment 复用 `_convert_to_tensors` 已构建的 `Q_out` 与 `sparse_bundle`；有 `edge_overrides` 时仍 clone edge sparse tensors 并构建 runtime sparse bundle。第二批候选 `udm-expression-cache-and-device-sync-reduction` 已落地：`compile_expression()` 使用 LRU 缓存，UDM runtime 构建期预计算 active node index set、local-to-global Python int 索引、component/index pairs、fixed component indices 与 `has_fixed_components`，`udm_ode_balance()` / `evaluate_reaction()` 不再在每步热路径用 `.item()` 判断 UDM mask、fixed mask 或 local-to-global 映射；KPI-017 N=100 expression cache build-time evidence 已进入 P-03 golden priority coverage。PR-32 已选择 dense 加权合并并行边并与 sparse 物理语义对齐，PR-33 已完成 sparse path dense props lazy、`_balance_param` 非方显式拒绝、`expand`/no-clone shape guard、segment timestamp CPU construction 与 `parameter_names` reuse；PR-34 已完成输出网格解耦，自适应求解器直接使用采样 `t0`，`rk4` 走分块输出。solver 默认值/schema/OpenAPI/generated client、worker strict-mode 或 fallback 仍未改变。

范围：

- 汇总 P-01/P-02/P-03 的 baseline、profiling、golden。
- 明确第一批热路径优化只改哪里、用哪个容差层级验收、预期收益来自哪个 profiler segment。
- 列出禁止同 PR 混入的行为变更。

DoD：

- 可以回答“为什么先改这里、怎么证明没改错、收益如何回到 worker compute segment”。
- 如果不能回答，则不得进入 Phase 2/4 热路径实现。

---

## 4. 阻塞关系

| 后续动作 | 必须先完成 |
|---|---|
| 进入 UDM RHS / expression / dense-sparse / output grid 热路径优化 | P-01、P-02、P-03、P-08 |
| 修 mixed ASM/UDM 最终语义 | ADR 0014 更新计划、P-03 中 mixed target golden 或 unsupported-error golden |
| 切 worker default strict | P-05 已有 opt-in evidence；默认切换仍需另开 PR，并满足 evidence 中 warn→strict 条件 |
| 删除 deprecated repo-path fallback | P-07 packaged no-fallback evidence 已通过；删除仍需后续独立 PR |
| 做 Go keyset cursor / claim LIMIT / index migration | P-06 通过，并另开 PR 基于 P-06 evidence 设定收益判断 |
| 做 backend material_balance 旧模型删除 | P-04 的 compatibility boundary 已证明旧输入模型未被生产 runtime 依赖；真正删除仍需另开 PR 证明 legacy import path 兼容策略 |

P-04、backend ASM/UDM helper thin-shell、P-05、P-06、P-07 与 fallback 删除已作为独立前置切片完成；后续 backend input model cleanup、route schema 迁移或更高风险性能工作仍不得借前置证据扩大成大规模重构。

---

## 5. 当前不要做

1. 不继续按行数拆 service tests。
2. 不继续泛化 Compute API wrapper 或 domain helper migration。
3. 不直接删除 worker deprecated fallback。
4. 不把 worker 默认改为 strict。
5. 不在缺少 P-03/P-08 evidence 复核时继续扩大 UDM RHS、dense-sparse、output grid 或 solver 默认值优化。
6. 不把 Go keyset cursor、claim LIMIT、索引 migration 混入 P-06 evidence；这些只能在 P-06 baseline 之后另开 PR。
7. 不启动 full JWKS / RBAC / OIDC。
8. 不把 hosted green evidence 或 release artifact hosted round trip 当作当前性能 Phase 0 阻塞项。

---

## 6. 验证入口

文档和计划切片建议至少运行：

```powershell
git diff --check -- docs\rebuild\simulation_core docs\rebuild\README.md tasks\todo.md .ai\changes
rg -n "mixed_asm_udm|Phase 0|strict|fallback|hot-path|热路径" docs\rebuild\simulation_core docs\architecture\current-state.md .ai\changes\2026-06-14.md
```

涉及性能 baseline 的切片再运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-baseline-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-profiling-phase0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-simulation-core-boundary.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-simulation-core-input-contract.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-simulation-core-correctness-freeze.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\audit-worker-dependency-installation.ps1
```

涉及 golden 或 core-only 测试的切片再运行：

```powershell
backend\.venv\Scripts\python -m pytest simulation_core\tests -q
backend\.venv\Scripts\python -m pytest docs\rebuild\simulation_core -q
```

---

## 7. 维护规则

1. 本文只记录进入性能主计划前的前置证据链，不记录每个 PR 的流水账。
2. ADR 0015 已将 mixed branch 最终业务语义定为 supported combined dispatch；single-model fallback 与 default clamp 仍是当前 freeze baseline。
3. 若本文与 `AutoWaterSimu_性能优化开发计划文档_v1.4.md` 冲突，以“当前已完成事实 + ADR + audit evidence”为准，并同步更新两份文档或记录冲突。
4. 后续若 P-03 已完成，应在本文顶部追加完成状态或新建 v1.1，而不是把已完成前置项伪装成仍未开始。
