# AutoWaterSimu Next Standalone RC Blocker Fix PRD

- 版本：v1.0
- 日期：2026-06-25
- 状态：RC 阻断项修复需求
- 适用分支：`endearqb/AutoWaterSimu` 的 `codex/autowatersimu-next-rebuild`
- 依据：standalone 静态审查结论、现有 Next PRD/Spec/Standalone v1.0 文档、当前分支代码抽查

## 1. 修复目标

本次修复目标是把 standalone RC 从“接口闭环”提升到“用户可见行为 parity”：

1. standalone 下 ASM1Slim、ASM1、ASM3、UDM 的“分析结果”弹窗必须能加载真实 time-series artifact，并显示节点、变量和曲线点。
2. standalone UDM seed/template 行为必须回到 canonical 模板事实源，7 个模板均可 validate 与 create-from-template。
3. release gate 必须覆盖最终用户路径，不能只证明 job succeeded 或 artifact exists。

## 2. 当前 P0 根因

### 2.1 分析结果无图表

当前 standalone adapter 把 `compute_result.v1` envelope 写入 legacy `result_data` 字段。legacy analyzer 需要的却是顶层：

```text
timestamps
node_data
edge_data
summary
```

当前真实时序在 artifact 中，`compute_result.v1.data` 可为空。把 envelope 传给 analyzer 会得到 truthy 对象，但没有顶层 `timestamps`，图表最终为空。

同源缺陷：

- `sliceSeriesMap()` 把 `label` 等标量 metadata 转成空数组，破坏节点标签。
- 找不到 artifact 时返回空时序，用户无法区分“无数据”和“读取失败”。
- `safeGetResult()` 捕获所有异常并返回 `null`，会把权限、网络、500 和 schema 错误变成空界面。
- `getJobInputData()` 也把 envelope 放入 legacy `result_data`，复用了同一错误 shape。
- 任务成功后 `getFinalValues()` 为取最后值会下载完整 time-series artifact。

### 2.2 Standalone UDM 模板不一致

legacy FastAPI 有完整 ASM1、ASM1Slim、ASM3 和 Petersen tutorial 模板。Go standalone 当前使用 `simpleUDMTemplate()` 生成极简内容：

- ASM1 / ASM3 / tutorial 模板内容与 legacy 不等价。
- ASM1 rate expression 使用 `u_H`，ASM3 使用 `mu_H`，但极简模板只声明 `mu`，按 Go teaching validation 会产生 `UNDEFINED_SYMBOL`。
- tutorial metadata、recommended charts、continuity profiles、prerequisites 和基础模板继承丢失。

## 3. 产品需求

### 3.1 结果分析读取

| ID | 优先级 | 需求 | 验收 |
| --- | --- | --- | --- |
| RC-RES-001 | P0 | 保留 `compute_result.v1` envelope + artifact 架构，不把完整 time-series 重新内联到 result envelope。 | `compute_result.v1.data` 允许为空；大时序仍只在 artifact payload。 |
| RC-RES-002 | P0 | 新增 time-series artifact payload 合同，artifact metadata 继续由 `artifact.v1` 表达。 | schema、registry、valid/invalid fixtures、worker 与 frontend decoder 共用。 |
| RC-RES-003 | P0 | 前端新增专用 `getAnalysisResult(jobId)`，返回 legacy analyzer 可消费的 `timestamps/node_data/edge_data/summary` shape。 | analyzer 不再直接读取 `currentJob.result_data`。 |
| RC-RES-004 | P0 | decoder 只切片数组字段，保留 `label/source/target` 等标量 metadata。 | 至少一个节点 label 是字符串。 |
| RC-RES-005 | P0 | artifact 缺失、job_id 不匹配、schema 版本不匹配、序列长度不匹配必须显示明确错误。 | 不再返回“成功但空数组”伪结果。 |
| RC-RES-006 | P0 | result request 错误必须保留错误分类。 | 401/403/500/network/schema error 不被吞掉。 |
| RC-RES-007 | P0 | 同一 job 的 analysis artifact 懒加载并缓存，重复打开弹窗不重复下载。 | browser test 或 request counter 证明单 job 多次打开只下载一次。 |
| RC-RES-008 | P0 | legacy FastAPI inline result 行为不回归。 | legacy inline fixture 仍可被 analyzer 消费。 |
| RC-RES-009 | P1 | worker 在 `compute_result.v1.data.final_values` 写入小体积最终值。 | job success 后 summary/final values 不下载完整 artifact。 |
| RC-RES-010 | P2 | 大 time-series 实现真正服务端分页或 chunked artifact。 | 不阻塞本次 RC blocker 修复。 |

### 3.2 UDM 模板统一

| ID | 优先级 | 需求 | 验收 |
| --- | --- | --- | --- |
| RC-UDM-001 | P0 | 建立一个版本化 canonical UDM seed catalog，不再由 Python 与 Go 分别手写模板事实。 | catalog 包含 7 个模板 key，Go 与 Python 均从同一事实源读取或校验。 |
| RC-UDM-002 | P0 | canonical catalog 覆盖 ASM1、ASM1Slim、ASM3、petersen-chapter-1/2/3/7。 | key 集合精确匹配 7 个。 |
| RC-UDM-003 | P0 | 保留完整 components、parameters、processes、rate_expr、stoich_expr、数值 stoich、conversion_factors、meta 和 tutorial learning metadata。 | ASM1 为 11/19/8；ASM1Slim 为 5/7/3；ASM3 为 13/22/7。 |
| RC-UDM-004 | P0 | `from-template` 必须逐一通过 teaching validation 与 create model。 | 7 个模板逐个 create-from-template 成功。 |
| RC-UDM-005 | P0 | 删除 `simpleUDMTemplate()` 作为生产 seed 来源。 | Go production template path 不再生成极简模板。 |
| RC-UDM-006 | P0 | 每个模板有 schema version、content hash 和可审计 seed_source。 | model version metadata 写入 template schema/hash/revision。 |
| RC-UDM-007 | P1 | 对已由坏模板创建的历史模型输出审计报告，不原地改写历史版本。 | 未编辑模型可追加修正版，已编辑模型标记待复核。 |

## 4. 非目标

- 不把完整 time-series 写回 `compute_result.v1` 或主表 JSON。
- 不为了修分析弹窗重写 legacy analyzer UI。
- 不在 P0 实现 Arrow、Parquet 或服务端真实分页。
- 不删除 legacy FastAPI 源码或 legacy client；RC 仍需要其作为 oracle。
- 不原地覆盖历史 UDM model version 或旧 run identity。

## 5. 发布门禁

P0 修复完成前，`codex/autowatersimu-next-rebuild` 不得声明 standalone result/UDM parity 完成。

必须新增或升级以下 gate：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-contracts.ps1
backend\.venv\Scripts\python -m pytest contracts\tests -q
cd apps\api; go test ./...
cd frontend; npx tsc --noEmit
```

standalone live browser gate 必须覆盖：

```text
提交五类 job
-> worker completed
-> artifact readable
-> 打开原 Flow 页面分析弹窗
-> 节点 label、变量列表、曲线点均存在
```

## 6. 关键假设

- 静态审查结论中未实际发起 HTTP 请求的 ASM1/ASM3 创建失败判断，以当前 Go validation 调用链作为高可信推导；实现阶段仍要用 HTTP/API 测试确认。
- canonical UDM catalog 的字段应以当前 legacy `backend/app/services/udm_seed_templates.py` 为初始 oracle，再用 schema/hash 固化。
- `material_balance_time_series.v1` 作为新的 canonical payload 合同名；当前已存在的非注册 schema_version 可只作为迁移兼容输入处理，不作为长期名称。

## 7. 剩余不确定性

- 现有 worker 输出的 artifact payload 是否已在所有 job type 中完全同构，需要 PR-1 用 fixture 和 schema 校验确认。
- 历史坏模板模型数量与用户编辑状态需要实现审计脚本后才能定量。
- 真实分页/chunked artifact 的存储形态未定，本次只保留为 P2。
