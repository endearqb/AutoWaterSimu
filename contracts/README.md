# 目录说明：contracts

## 1. 目录职责

本目录负责 AutoWaterSimu Next 的长期共享合同。

本目录负责：

- JSON Schema 合同。
- valid / invalid examples。
- 合同测试入口。
- model catalog / parameter template / default parameter set wire shape。
- model benchmark case wire shape。
- external simulation request input refs and embedded simulation input shape。
- artifact retention metadata wire shape。
- Agent constraint draft wire shape。
- Draft confirmation gate wire shape。
- Agent result explanation wire shape with required evidence refs。
- compute result risk findings wire shape。
- evidence governance summary wire shape。
- Web、Desktop、Worker、Agent 集成方共享的 wire shape。

本目录不负责：

- 运行时计算实现。
- UI 组件。
- 数据库 migration。

## 2. 核心文件

| 文件/子目录 | 作用 |
|---|---|
| `examples/` | 合同示例，按 valid / invalid 拆分 |
| `python/` | Python 合同转换 helper，当前支持 material balance 最小链路 |
| `tests/` | schema 与 fixture 校验测试 |
| `*.v1.json` | 版本化 JSON Schema 合同 |

## 3. 维护约定

1. `schema_version` 必须与 schema 文件名去掉 `.json` 后一致。
2. P0 合同使用 snake_case，例如 `compute_job.v1`。
3. 合同变更必须同步更新示例、测试和生成类型。
4. 不把 UI-only 字段放入 worker 可执行合同。
5. `model_catalog.v1` 只定义跨边界 catalog/版本/参数模板/默认参数集/benchmark case 形状；Go Compute API 可持久化 schema-valid catalog snapshots 用于治理读取，并可对现有 default parameter set 做最小状态迁移；完整多参数集审批流或 benchmark-backed 状态机仍应由 API/数据库实现补充。
6. `artifact.v1.retention_policy` / `retain_until` 只是生命周期 metadata；实际删除、归档或引用计数必须由 API/存储层另行实现并验证。
7. `constraint_draft.v1` 只表达 Agent/外部系统提出的约束草案；必须经 API 校验和用户确认后，才能参与 simulation request 或生产相关决策。Go API 对 approved constraint confirmation 只能生成只读 application plan，不能直接修改目标对象或发布生产动作。
8. `draft_confirmation.v1` 只表达用户对草案的 approve/reject/changes_requested 决策；Go API 可持久化确认记录用于审计。确认记录本身不得在 `confirm-draft` 阶段创建 job；只有显式 promotion endpoint 可把 approved `agent_scenario_draft.v1` 中完整且 schema-valid 的 `proposed_request` 转为 simulation check job。Approved `constraint_draft.v1` confirmation 只能通过显式只读 endpoint 生成 advisory plan。
9. `result_explanation.v1` 只表达 Agent/外部系统对结果的结构化解释，且 top-level 与 statement 都必须引用 `evidence_refs`；本合同不生成解释、不执行审批。
10. `compute_result.v1.risk_findings` 是面向 NewSystem/milp 审批集成的结构化风险结论；每条 finding 必须带 `evidence_refs`，API 可把它同步到 result summary 便于只读查询，并可在 job 边界内解析支持的证据引用。
11. `evidence_package.v1.governance` 汇总 model version、parameter set status 与 `production_allowed`；该字段只供审批/审计读取，不代表 AutoWaterSimu 发布生产指令。
12. `simulation_request.v1.input_ref` 可表达 `process_graph_id`、`simulation_input_id`、`model_run_id` 或内嵌 `simulation_input`；Go Compute API 当前可把内嵌 `simulation_input.v1`、已登记的 `simulation_input_id`、已登记的 `process_graph_id` / `process_graph_version`，或可回溯到源 job 的已持久化 `model_run_id` 转为可执行 material-balance job。

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
backend\.venv\Scripts\python -m pytest contracts\tests -q
```

## 7. AI 操作提示

1. 先读根 `AGENTS.md`、`README.md` 与本 README。
2. 新增合同前检查 `docs/rebuild/AutoWaterSimu_Next_Technical_Spec_v1.0.md`。
3. 不要为单个实现随意扩展合同；先确认是否属于跨边界长期接口。
