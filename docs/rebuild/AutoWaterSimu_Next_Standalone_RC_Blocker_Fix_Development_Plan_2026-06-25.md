# AutoWaterSimu Next Standalone RC Blocker Fix Development Plan

- 版本：v1.0
- 日期：2026-06-25
- 状态：执行计划
- 配套需求：`AutoWaterSimu_Next_Standalone_RC_Blocker_Fix_PRD_2026-06-25.md`

## 1. 执行原则

1. 先合同和 fixture，后 adapter，最后 UI gate。
2. 保留 envelope + artifact 架构；不要回退到 inline time-series。
3. UDM 模板只允许一个 canonical catalog；不要在 Go/Python 两边继续补丁式同步。
4. P0 只修阻断项：分析弹窗真实有图、7 个模板可创建、gate 覆盖最终用户路径。
5. P1/P2 另列，不阻塞本轮 P0 合并。

## 2. PR 拆分

| PR | 优先级 | 范围 | 依赖 | 完成标准 |
| --- | --- | --- | --- | --- |
| PR-1 | P0 | Time-series artifact payload contract、registry、fixtures、worker payload 校验 | 无 | worker 输出和 frontend decoder 共享同一 schema。 |
| PR-2 | P0 | Frontend `getAnalysisResult()`、analysis store 状态、弹窗 loading/error/cache、legacy inline fallback | PR-1 | 四类 analyzer 在 standalone 下有真实曲线。 |
| PR-3 | P0 | Canonical UDM seed catalog、Go/Python parity、删除生产 `simpleUDMTemplate()` | 无 | 7 模板均 validate/create；ASM1/ASM1Slim/ASM3 数量匹配。 |
| PR-4 | P1 | `compute_result.v1.data.final_values`、final-values 读取回退、错误分类细化 | PR-1/2 | job 成功后默认不下载完整 time-series。 |
| PR-5 | P1 | 坏模板历史数据审计、release evidence 扩展、文档收口 | PR-3 | 历史版本不被覆盖，审计报告可复现。 |

PR-1 与 PR-3 可并行。PR-2 依赖 PR-1。PR-4/PR-5 不阻塞 P0，但 release backlog 必须可见。

## 3. PR-1：Time-Series Artifact 合同

### 3.1 修改范围

- `contracts/`
- `contracts/registry.json`
- `contracts/examples/valid/`
- `contracts/examples/invalid/`
- `contracts/tests/`
- `services/simulation-worker/`
- 需要时同步 `apps/api` artifact type 常量或 fixture

### 3.2 实施任务

1. 新增 `material_balance_time_series.v1` schema，表达 artifact JSON payload，不替代 `artifact.v1` metadata。
2. schema 至少覆盖：
   - `schema_version`
   - `job_id`
   - `job_type`
   - `timestamps`
   - `node_data`，其中 `label` 为字符串，动态变量为 number array
   - `edge_data`，其中 `source/target` 为字符串，动态变量为 number array
   - `segment_markers`
   - `parameter_change_events`
3. 新增 valid fixture：包含至少 2 个 timestamp、1 个带 label 的 node、1 个变量数组、1 条 edge。
4. 新增 invalid fixtures：
   - 缺 `job_id`
   - `label` 为数组
   - 序列长度与 timestamps 不一致
   - schema_version 错误
5. worker 写 artifact 前做 schema/shape 校验，失败时 job failed，不上传坏 artifact。
6. contract registry 和 tests 纳入 gate。

### 3.3 验证

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\check-contracts.ps1
backend\.venv\Scripts\python -m pytest contracts\tests -q
```

## 4. PR-2：Analysis Result Adapter 与 UI 状态

### 4.1 修改范围

- `frontend/src/features/results/`
- `frontend/src/services/standaloneComputeService.ts`
- `frontend/src/stores/*Store.ts` 或共享 model store
- `frontend/src/components/Flow/inspectorbar/SimulationActionPlate.tsx`
- `frontend/src/components/Flow/inspectorbar/SimulationPanel.tsx`
- `frontend/src/components/Flow/legacy-analysis/`
- `frontend/tests/`

### 4.2 实施任务

1. 新建 `getAnalysisResult(jobId)`，职责固定为：
   - 读取 job snapshot。
   - 确认 job terminal success。
   - 读取 result envelope。
   - 精确选择 time-series artifact。
   - 下载并校验 payload。
   - 确认 payload `job_id === jobId`。
   - 校验每个数组长度与 `timestamps.length` 一致。
   - 保留 `label/source/target` 标量 metadata。
   - 合并 envelope summary 到 analyzer 所需 shape。
2. store 新增明确状态：
   - `analysisResultJobId`
   - `analysisResultStatus: "idle" | "loading" | "ready" | "error"`
   - `analysisResultData`
   - `analysisResultError`
3. 分析按钮启用条件改为 job success，而不是 `currentJob.result_data` truthy。
4. 打开弹窗时懒加载 artifact，显示 loading/error/retry。
5. 同一 job 缓存 Promise/result；切换 job 清理旧状态，旧响应不得覆盖新 job。
6. legacy inline result fallback 只用于非-standalone 或历史 inline shape，不再把 envelope 当 payload。
7. `safeGetResult()` 不再吞掉所有异常；错误分类进入 UI。
8. `getJobInputData()` 不再返回 envelope-as-legacy-result；需要 result 时返回 analysis-compatible shape 或明确空/错误。

### 4.3 验收测试

- ASM1Slim、ASM1、ASM3、UDM 各完成一个 standalone job。
- 打开“分析结果”弹窗后：
  - `timestamps.length > 1`
  - 至少一个节点 `label` 是字符串
  - 至少一个变量可选
  - 至少一条曲线有数据点
- 缺 artifact 显示错误，不显示空图。
- artifact `job_id` 不匹配时拒绝展示。
- 序列长度不匹配时拒绝展示。
- 同一 job 多次开关弹窗不重复下载。
- legacy FastAPI inline result fixture 仍可展示。

### 4.4 验证命令

```powershell
cd frontend; npx tsc --noEmit
cd frontend; npx playwright test tests/standalone-five-model-compute.spec.ts --project=chromium --no-deps --reporter=line
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ci\standalone-five-model-live.ps1
```

## 5. PR-3：Canonical UDM Seed Catalog

### 5.1 修改范围

- `contracts/`
- `backend/app/services/udm_seed_templates.py`
- `apps/api/internal/compute/udm_workspace.go`
- `apps/api/internal/compute/*udm*_test.go`
- `frontend/src/features/udm/` 或相关 template consumer

### 5.2 实施任务

1. 新增 `udm_seed_catalog.v1` schema。
2. 新增 canonical catalog 文件，包含：
   - `asm1`
   - `asm1slim`
   - `asm3`
   - `petersen-chapter-1`
   - `petersen-chapter-2`
   - `petersen-chapter-3`
   - `petersen-chapter-7`
3. 从 legacy template 数据提取初始 catalog，保留完整字段和 tutorial metadata。
4. Go 端用 `go:embed` 或生成文件读取 canonical catalog。
5. Python 端直接读取同一 catalog，或测试中与 canonical catalog 标准化 hash 比较。
6. 删除 `simpleUDMTemplate()` 作为生产 seed 来源；如保留，只能用于测试 helper。
7. `from-template` 写入：
   - `template_schema_version`
   - `template_content_hash`
   - `template_revision`（如存在）
   - `seed_source`
8. 新增 parity/hash drift gate。

### 5.3 验收测试

- 模板 key 精确为 7 个。
- ASM1 为 11 components / 19 parameters / 8 processes。
- ASM1Slim 为 5 / 7 / 3。
- ASM3 为 13 / 22 / 7。
- 7 个模板逐一 validate OK。
- 7 个模板逐一 create-from-template OK。
- 所有表达式中的参数符号均有定义。
- tutorial 继承正确基础模板。
- learning metadata 与 canonical fixture 一致。
- Go 与 canonical JSON 标准化 hash 一致。
- Python oracle 与 canonical JSON 无 drift。

### 5.4 验证命令

```powershell
cd apps\api; go test ./internal/compute -run UDM -count=1
cd apps\api; go test ./...
backend\.venv\Scripts\python -m pytest contracts\tests -q
```

## 6. PR-4：Final Values 轻量化

### 6.1 实施任务

1. worker 在 `compute_result.v1.data.final_values` 写小体积节点/边最终值。
2. frontend `getCalculationFinalValues()` 优先读 envelope final values。
3. 旧 job 或缺字段时才 fallback 到 artifact。
4. fallback 必须显式记录或暴露给测试，避免误以为已轻量化。

### 6.2 验收

- job success 后 summary/final values 页面不下载完整 time-series。
- 历史 artifact-only job 仍能读取 final values。

## 7. PR-5：历史坏模板审计

### 7.1 实施任务

1. 按 `seed_source`、template hash、definition hash 识别已知坏模板模型。
2. 输出 JSON 审计报告：
   - 模型 ID
   - 当前 version
   - 是否疑似未编辑
   - 建议动作
3. 未被用户编辑的模型可追加修正版 version。
4. 已被用户编辑的模型只标记待复核。
5. 不原地改写旧 version、旧 hash 或历史 model_run。

### 7.2 验收

- 审计可 dry-run。
- 修复动作幂等。
- 历史 model_run identity 不变。

## 8. Release Gate 升级

完整 RC gate 必须新增最终 UI 证据：

```text
提交任务
-> worker 完成
-> artifact 可读取
-> 进入原 Flow 页面
-> 打开分析弹窗
-> 图表有节点、变量、曲线点
```

不得用以下证据替代：

- mock smoke
- `job.status=succeeded`
- artifact metadata exists
- `passed_with_skips`
- 非当前 HEAD 的旧 evidence

## 9. DoD

- PRD/计划/ADR 已更新。
- `.ai/changes/YYYY-MM-DD.md` 已记录。
- 新合同已进 registry、fixtures、tests。
- 前端 typecheck 通过。
- Go tests 通过。
- standalone five-model live gate 覆盖分析弹窗真实曲线。
- UDM 7 模板 validate/create-from-template 全绿。
- 未修改公共架构非目标项：不 inline 大时序、不覆盖历史版本、不删除 legacy oracle。
