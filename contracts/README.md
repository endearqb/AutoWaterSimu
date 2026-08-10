# 目录说明：contracts

## 1. 目录职责

本目录负责 AutoWaterSimu Next 的长期共享合同。

本目录负责：

- JSON Schema 合同。
- valid / invalid examples。
- 合同测试入口。
- model catalog / parameter template / default parameter set wire shape。
- model benchmark case wire shape。
- benchmark run execution history wire shape。
- external simulation request input refs and embedded simulation input shape。
- UDM Network v2 typed-edge design graph and executable network simulation input shape。
- artifact retention metadata wire shape。
- Agent constraint draft wire shape。
- Draft confirmation gate wire shape。
- Agent result explanation wire shape with required evidence refs。
- compute result risk findings wire shape。
- evidence governance summary wire shape。
- read-only production readiness policy report wire shape。
- Desktop project package wire shape。
- Desktop support bundle diagnostics wire shape。
- Web、Desktop、Worker、Agent 集成方共享的 wire shape。

本目录不负责：

- 运行时计算实现。
- UI 组件。
- 数据库 migration。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `catalogs/` | 运行时会读取的 canonical 合同数据，例如 UDM seed catalog |
| `codegen/` | 合同 codegen/validation 策略 manifest，不存放生成产物 |
| `examples/` | 合同示例，按 valid / invalid 拆分 |
| `python/` | Python 合同转换 helper，当前支持 material balance 最小链路 |
| `registry.json` | schema、consumer、valid/invalid examples、兼容说明和 breaking-change policy 注册表 |
| `tests/` | schema 与 fixture 校验测试 |
| `*.v1.json` | 版本化 JSON Schema 合同 |

## 3. 维护约定

1. `schema_version` 必须与 schema 文件名去掉 `.json` 后一致。
2. P0 合同使用 snake_case，例如 `compute_job.v1`。
3. 合同变更必须同步更新示例、测试和生成类型。
4. 不把 UI-only 字段放入 worker 可执行合同。
5. 每个 `*.v1.json` schema 必须登记在 `registry.json`，并列出 consumers、valid examples、invalid examples、compatibility notes 和 breaking-change policy。
6. `codegen/manifest.json` 必须覆盖 `registry.json` 中的所有 schema，并说明 TypeScript/OpenAPI/Go/Python/Rust 当前生成或不生成的策略。
7. `model_catalog.v1` 只定义跨边界 catalog/版本/参数模板/默认参数集/benchmark case 形状；Go Compute API 可持久化 schema-valid catalog snapshots 用于治理读取，并可对现有 default parameter set 做最小状态迁移、只读 promotion plan，或在 promotion plan 已通过时执行 evidence-backed `approved` 晋升；完整多参数集审批流或自动 benchmark-backed 状态机仍应由 API/数据库实现补充。
8. `benchmark_run.v1` 记录某个已完成 `model_run.v1` 对 catalog 中 benchmark case 的执行结果、指标、容差和 evidence refs；它是审计历史，不自动执行 benchmark、不推进参数集状态、不代表生产审批。
9. `artifact.v1.retention_policy` / `retain_until` 只是生命周期 metadata；实际删除、归档或引用计数必须由 API/存储层另行实现并验证。
10. `constraint_draft.v1` 只表达 Agent/外部系统提出的约束草案；必须经 API 校验和用户确认后，才能参与 simulation request 或生产相关决策。Go API 对 approved constraint confirmation 只能生成只读 application plan，不能直接修改目标对象或发布生产动作。
11. `draft_confirmation.v1` 只表达用户对草案的 approve/reject/changes_requested 决策；Go API 可持久化确认记录用于审计。确认记录本身不得在 `confirm-draft` 阶段创建 job；只有显式 promotion endpoint 可把 approved `agent_scenario_draft.v1` 中完整且 schema-valid 的 `proposed_request` 转为 simulation check job。Approved `constraint_draft.v1` confirmation 只能通过显式只读 endpoint 生成 advisory plan。
12. `result_explanation.v1` 只表达 Agent/外部系统对结果的结构化解释，且 top-level 与 statement 都必须引用 `evidence_refs`；本合同不生成解释。Go API 可持久化 evidence-backed explanation review/publish 状态，但发布解释仍只是审计 metadata，不代表生产审批完成。
13. `compute_result.v1.risk_findings` 是面向 NewSystem/milp 审批集成的结构化风险结论；每条 finding 必须带 `evidence_refs`，API 可把它同步到 result summary 便于只读查询，并可在 job 边界内解析支持的证据引用。
14. `evidence_package.v1.governance` 汇总 model version、parameter set status 与 `production_allowed`；该字段只供审批/审计读取，不代表 AutoWaterSimu 发布生产指令。
15. `production_readiness.v1` 汇总 job 成功、evidence package、governance.production_allowed 与 risk_findings 阻断状态，只表达“可提交外部审批”的只读政策判断；`external_approval_required=true` 且 `auto_publish_allowed=false` 是合同约束。
16. `simulation_request.v1.input_ref` 可表达 `process_graph_id`、`simulation_input_id`、`model_run_id` 或内嵌 `simulation_input`；Go Compute API 当前可把内嵌 `simulation_input.v1`、已登记的 `simulation_input_id`，或可回溯到源 job 的已持久化 `model_run_id` 转为对应 job type 的 `compute_job.v1`。`simulation_request.v1.metadata.site_id` 或 `external_refs.site_id` 可进入生成后的 `compute_job.v1.context.site_id`，用于 API read-scope 过滤。`process_graph_id` / `process_graph_version` 自动转换当前只支持 material-balance job，ASM/UDM ProcessGraph-to-SimulationInput 语义需要单独设计。
17. `compute_job.v1`、`simulation_input.v1`、`compute_result.v1` 和 `simulation_request.v1` 当前支持 `simulation.material_balance.v1`、`simulation.asm1slim.v1`、`simulation.asm1.v1`、`simulation.asm3.v1`、`simulation.udm.v1` 与 P0 wire-path `simulation.udm_network.v1`；`simulation.udm_network.v1` 的 `compute_result.v1` 只能用于明确 failed/not-executable 诊断，不能代表 worker 已支持执行。新增 job type 进入 `simulation_request.v1` 时必须同步 Go API、OpenAPI 和 generated compute client。
18. `simulation_input.v1` 的 `nodes[]` / `edges[]` item 字段是 worker 可执行合同的一部分，使用显式 canonical snake_case 字段并关闭 item 级 unknown fields；组件浓度、concentration transform、UDM process 和 model snapshot 等内部 map 仍保持动态结构。adapter 对 camelCase 模型字段的支持只是迁移兼容路径，不应扩展为合同字段。
19. `network_process_graph.v1` 是 UDM Network v2 设计态图，保存 `hydraulic` / `pump` / `settling` / `signal` typed edge、typed `flow_spec`、typed `flow_constraints`、`stream_adapter`、signal bindings、component schemas 和 UI/composite metadata；`network_simulation_input.v1` 是 `simulation.udm_network.v1` 的 worker-executable 输入。二者并行于 `process_graph.v1` / `simulation_input.v1`，不得把 UDM-v2 edge semantics 回填进 `simulation_input.v1`。
20. `desktop_project_package.v1` 是 Desktop 新导出的长期项目包合同，覆盖 project metadata、job snapshots、CanvasGraphs、artifact/support bundle refs 和 checksum-verified hex file records；Desktop 可继续导入 legacy `desktop_project_export.v1` 文件作为兼容路径，但新导出应使用 `desktop_project_package.v1`。
21. `desktop_support_bundle.v1` 是 Desktop 诊断包合同，只包含 job/event/artifact metadata/model_run refs 和版本信息；`redaction.artifact_contents_included=false` 是合同约束，artifact 文件内容应通过 project package 的 checksum file records 或 runtime artifacts 恢复。

## 4. 对外接口

本目录对外暴露 JSON Schema、examples 和测试 fixture。

修改这些接口时需同步检查 Go API、Python worker、Desktop Rust command、frontend generated types。

## 5. 依赖边界

可以依赖：

- JSON Schema 标准。
- 仓库内合同测试工具。

不应该依赖：

- FastAPI、Go API、Tauri、React 或数据库实现。

## 6. 测试与验证

修改本目录后建议运行：

```powershell
rg -n "schema_version" contracts
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-contracts.ps1
backend\.venv\Scripts\python -m pytest contracts\tests -q
```

## 7. AI 操作提示

1. 先读根 `AGENTS.md`、`README_First.md`、`README.md` 与本 README。
2. 新增合同前检查 `docs/rebuild/AutoWaterSimu_Next_Technical_Spec_v1.0.md`。
3. 不要为单个实现随意扩展合同；先确认是否属于跨边界长期接口。
