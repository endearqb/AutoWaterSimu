# 目录说明：docs/rebuild/simulation_core

## 1. 目录职责

本目录保存 simulation_core 性能优化、方案 A 前置、correctness/golden 证据相关的需求、计划、审查和文档化测试。

本目录负责：

- 记录 simulation_core 性能优化需求与开发计划。
- 记录进入热路径优化前必须完成的前置证据链。
- 保存与 mixed model、parallel edge 等关键正确性问题相关的 core-only golden/repro 文档化测试。

本目录不负责：

- runtime 源码实现。
- 单次任务流水账。
- 替代 `simulation_core/`、`services/simulation-worker/`、`backend/` 或 `apps/api/` 的目录 README。

## 2. 核心文件

| 文件 | 作用 |
|---|---|
| `00_AutoWaterSimu_性能优化前置规划计划文档_v1.0.md` | 进入性能开发计划前必须先完成的 Phase 0 evidence / rollout 前置计划 |
| `AutoWaterSimu_性能优化需求文档_v1.4.md` | simulation_core 性能优化需求、KPI、验收与风险 |
| `AutoWaterSimu_性能优化开发计划文档_v1.4.md` | 性能优化分阶段开发计划、PR 依赖与 2026-06-14 当前执行校准 |
| `AutoWaterSimu_simulation_core_专项审查报告.md` | 方案 A、正确性缺口和性能机会专项审查 |
| `__init__.py` | 让本目录作为 pytest package 被收集，支持测试文件使用相对导入共享 fixtures |
| `conftest.py` | 文档化 golden/repro 测试的 shared fixtures、分层容差和输入构造器 |
| `test_mixed_model_golden.py` | mixed ASM/UDM 支持语义的 active golden / regression tests，并保留 unsupported-error 历史备选骨架 |
| `test_parallel_edge_golden.py` | parallel edge sparse 物理语义与 dense 加权合并目标语义的 active golden |

## 3. 维护约定

1. 先读 `00_AutoWaterSimu_性能优化前置规划计划文档_v1.0.md`，再读 v1.4 需求与开发计划；开发计划中的 `2026-06-14 执行校准` 优先于旧阶段排期文本。
2. 不把旧 correctness freeze 中的互斥 mixed branch 当作最终语义；ADR 0015 已选择支持 mixed reaction model dispatch，单模型 fallback 与 default clamp 仍是需保护的 baseline。
3. 新增性能优化计划前，先确认是否已有 baseline、profiling、golden、hot-path prereview、Go API latency smoke、worker strict smoke、packaged no-fallback smoke 和 audit 证据；截至 2026-06-14，P-01 mixed baseline fixture、P-02 profiling artifacts、P-03 CPU/f64 golden generator、P-04 backend compatibility models boundary、P-05 worker adapter strict opt-in smoke、P-06 Go API latency smoke、P-07 worker packaged no-fallback evidence、P-08 hot-path prereview、第一批 `transport-runtime-tensor-precompute-no-semantics`、第二批 `udm-expression-cache-and-device-sync-reduction`、PR-38 supported mixed-model dispatch、PR-32 dense/sparse parallel-edge unification、PR-33 `_balance_param` shape guard 与 segment timestamp CPU construction 已完成。
4. 文档化测试可以记录现状 repro、xfail 或目标 golden，但必须说明它们属于当前行为还是目标行为。
5. 若实现状态已经超过 v1.4 文档，优先用 `.ai/changes/`、ADR、audit evidence 和 `docs/architecture/current-state.md` 校准当前状态。

## 4. 对外接口

本目录对后续 `simulation_core/`、`services/simulation-worker/`、`backend/app/material_balance/` 和 `apps/api/` 性能/正确性工作提供计划输入。

修改这些文档时需同步检查：

- `docs/rebuild/README.md`
- `docs/architecture/current-state.md`
- `.ai/changes/YYYY-MM-DD.md`
- 相关 ADR，尤其是 `0012`、`0013`、`0014`、`0015`

## 5. 依赖边界

可以依赖：

- 当前仓库代码事实、audit evidence、pytest 结果和 `.ai/changes/` 记录。
- `AutoWaterSimu_性能优化需求文档_v1.4.md` 与 `AutoWaterSimu_性能优化开发计划文档_v1.4.md` 的长期需求和 PR 拆分。

不应该依赖：

- 未验证的外部聊天结论。
- 未跟踪、未复跑的本地性能数字。
- legacy backend oracle 作为唯一正确性来源。

## 6. 测试与验证

修改本目录文档后建议运行：

```powershell
git diff --check -- docs\rebuild\simulation_core docs\rebuild\README.md
```

修改或启用本目录文档化测试后建议运行：

```powershell
backend\.venv\Scripts\python -m pytest docs\rebuild\simulation_core -q
```

涉及 Phase 0 baseline 时建议运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-baseline-phase0.ps1
```

涉及 Phase 0 profiling 时建议运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-profiling-phase0.ps1
```

涉及 Phase 0 golden 时建议运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-golden-phase0.ps1
```

涉及 Phase 0 hot-path prereview 时建议运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-hotpath-prereview-phase0.ps1
```

涉及 worker adapter strict rollout 时建议运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\worker-adapter-strict-smoke.ps1
```

涉及 Phase 0 Go API latency baseline 时建议运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\performance-go-api-latency-phase0.ps1
```

## 7. AI 操作提示

1. 按 README First 顺序读取本 README 与上级 README。
2. 先区分“当前冻结行为”“目标正确行为”和“性能优化行为”，再修改计划。
3. 热路径实现必须贴合 P-08 evidence 的候选顺序与禁止混入项；baseline、profiling 或 golden evidence 更新后也必须重新审视 P-08，而不是直接扩大改动。
4. 修改 mixed-model dispatch 时必须同步更新 ADR 0015、`simulation_core/tests` correctness-freeze tests、`scripts/audit-simulation-core-correctness-freeze.ps1` 和 P-03 golden evidence 分类。
5. 完成后按 `AGENTS.md` 记录 `.ai/changes/`。
