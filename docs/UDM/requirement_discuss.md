## 用户自定义模型（UDM）功能需求文档（Petersen 矩阵驱动）

> 版本：v0.1（需求+技术落地一体）
> 目标：让用户用“表格维护 Petersen（Gujer–Petersen）矩阵 + 速率表达式”，平台自动抽取变量/参数、引导参数范围填写，并一键生成可计算的 ReactFlow 画布与仿真任务。

---

## 1. 背景与动机

当前平台已具备：

* ReactFlow 流程画布（节点/边/属性面板/工具栏/保存加载）
* ASM1 等内置模型的计算任务生命周期（创建任务、轮询状态、读取结果摘要/时间序列/末态）
* “模型可插拔”工程结构（modelConfigs / simulationConfig / FlowStore 工厂 / ModelStore / Service / 路由集）

痛点：

* 新增模型（ASM1 变体、ASM2d、ASM3、工业废水特化模型）需要你写代码、写参数面板、写转换逻辑，迭代成本高。
* 工程师（目标用户）更习惯在论文/规范里看到 **Petersen 矩阵**，并希望“把矩阵搬进来就能跑”。

UDM 的价值：

* 把“模型扩展”从研发行为变成“用户配置行为”
* 形成平台壁垒：模型资产沉淀、复用与分享、后续可叠加参数校准/优化

---

## 2. 范围定义

### 2.1 本期（MVP）必须实现

1. **模型编辑器（表格）**：用户维护 Petersen 计量矩阵 + 每个过程的速率表达式
2. **自动抽取**：从组件/表达式中抽取“状态变量 components”与“参数 parameters”
3. **参数范围向导**：提示用户填写 default/min/max/scale/unit
4. **一键生成画布**：根据模型定义生成一个可计算的 ReactFlow flow_data（含 UDMReactor 节点）
5. **可计算闭环**：/udm 页面可直接发起计算任务并展示结果（复用 SimulationPanel 体验）

### 2.2 明确不做（本期不包含）

* 多反应器串并联的自动工艺拓扑推断（先给“默认三节点模板”）
* 完整物理量/当量守恒校核（可做基础 lint，严谨守恒留到后续）
* 用户自定义任意 Python 代码（出于安全与可复现性，本期只支持“受限表达式语言”）

---

## 3. 术语与核心概念

* **Components（状态变量）**：模型状态向量 (C) 的各组分，例如 (S_{O2}, X_{BH}) 等
* **Processes（过程）**：速率向量 (\rho) 的各过程，例如好氧生长、硝化等
* **Stoichiometric Matrix（计量矩阵）**：(S)，维度 `P x M`（过程数 x 组分数），单元格为化学计量系数
* **Rate Expression（速率表达式）**：每个过程一个表达式，(\rho_i = f(C,\theta))
* **ModelDefinition（模型定义）**：用户模型的结构化存储（components/processes/parameters/版本/元信息）
* **UDMReactor Node（自定义反应器节点）**：画布中代表“此节点内部用用户模型求解反应动力学”的节点类型

> 重要：仅有 Petersen 计量矩阵不足以计算，必须同时提供每个过程的 rate expression。

---

## 4. 目标用户与典型场景

### Persona A：工艺工程师/研究人员

* 从论文/规范中获得 Petersen 矩阵与动力学式
* 想快速验证模型行为、跑稳态/动态响应、对比不同假设

### Persona B：工业废水工艺工程师

* 想基于 ASM 框架做“行业特化过程”（抑制、毒性、特殊底物）
* 需要能快速迭代模型结构与参数范围

---

## 5. 用户旅程（端到端流程）

1. 进入「UDM 模型库」→ 新建模型
2. 在「模型编辑器」中：

   * 定义 components（列）
   * 定义 processes（行）
   * 填写 stoich 系数
   * 填写每行 rate expression
3. 点击「解析/校验」：

   * 自动抽取参数清单
   * 报告未定义符号/非法函数/空行等问题
4. 进入「参数范围向导」：

   * 填 default/min/max/scale/unit
5. 点击「确认并生成画布」：

   * 系统创建 modelDefinition（版本化）
   * 自动生成 flowchart（默认：Influent → UDMReactor → Effluent）
6. 进入 /udm 画布页：

   * 调整进水/水力参数/初值/仿真时长
   * 一键计算 → 轮询 → 查看 summary / timeseries / final-values

---

## 6. 功能需求（FR）清单

### FR-1 UDM 模型库（列表/版本/复制）

* 展示：名称、版本、更新时间、标签、是否可用（校验通过）
* 操作：新建、编辑、复制、删除、发布（可选：仅自己可见）

### FR-2 模型编辑器（Petersen 表格）

* 表格结构：

  * 行：Processes
  * 列：Components
  * 单元格：Stoichiometric coefficient（数值）
  * 行附加字段：`rateExpr`（必填）
* 支持：

  * 增删行列、重命名、批量填充（置 0 / 清空）
  * Copy/Paste（Excel 友好）
  * 导入/导出 CSV（模板化）

### FR-3 自动抽取变量与参数

* components 直接来自列名（组件名）
* parameters 从 rateExpr 中解析抽取：

  * `tokens(rateExpr) - components - allowedFunctions - reservedWords`
* 输出：

  * 参数清单（去重、排序）
  * 每个参数出现在哪些过程表达式中（用于定位）

### FR-4 校验与 lint（编辑期 + 保存前）

必须校验：

* rateExpr 语法合法（括号/运算符/标识符）
* 表达式只使用白名单函数（如 exp/log/min/max/pow 等）
* 所有符号都能归类为 component 或 parameter（否则提示“未定义符号”）
* 每个过程至少对某些组分有非零计量（否则提示“过程对所有组分系数为 0”）
  建议 lint：
* 单元格非数字/NaN
* 过程/组分重名
* 模型规模上限提示（例如 M>80 或 P>80 时提示性能风险）

### FR-5 参数范围向导

对每个 parameter 维护字段：

* name（只读）、unit、default、min、max、scale(lin/log)、note
  交互要求：
* 可一键“全部沿用默认范围”（给保守范围启发式）
* min < default < max 强校验
* 支持 log scale 时 min>0

### FR-6 一键生成可计算 ReactFlow 画布

* 自动生成 flow_data（符合现有 exportFlowData/importFlowData 结构）
* 默认拓扑（MVP）：

  * Influent（进水）→ UDMReactor（反应池）→ Effluent（出水）
* Reactor 节点 data 至少包含：

  * `modelId + modelVersion`（或 modelHash）
  * `initialState`（按 components 给初值）
  * `modelParams`（按 parameters 给 default）
  * `solverConfig`（可沿用 simulationConfig 默认）

### FR-7 计算任务闭环（/api/v1/udm/*）

与 ASM1 保持一致的任务体验：

* create：calculate / calculate-from-flowchart
* status：轮询
* result：summary
* timeseries：曲线数据
* final-values：末态值
* validate：提交前校验（服务端二次校验）

---

## 7. 数据结构（建议的可落地 Schema）

### 7.1 ModelDefinition（后端存储对象）

```ts
type ModelDefinition = {
  id: string;
  ownerId: string;
  name: string;
  version: number;          // 递增
  hash: string;             // (components+processes+params) 内容哈希，便于可复现
  components: Array<{
    name: string;           // 稳定标识符：建议限制为 [A-Za-z_][A-Za-z0-9_]*
    label?: string;         // 展示名（可中文）
    unit?: string;
    defaultValue?: number;  // 初始值默认（可选）
  }>;
  parameters: Array<{
    name: string;
    unit?: string;
    defaultValue?: number;
    min?: number;
    max?: number;
    scale?: "lin" | "log";
    note?: string;
  }>;
  processes: Array<{
    name: string;
    rateExpr: string;              // 受限表达式语言
    stoich: Record<string, number>;// key=component.name
    note?: string;
  }>;
  meta?: {
    description?: string;
    tags?: string[];
    source?: "manual" | "import";
  };
  createdAt: string;
  updatedAt: string;
};
```

### 7.2 Flowchart（沿用现有 flow_data）

* `flow_data` 保持 ReactFlow 标准结构（nodes/edges/viewport/customParameters/calculationParameters）
* UDM 特有：节点 data 中引用 `modelId/modelVersion/hash`

### 7.3 Job（沿用 ASM1Job 的字段模式）

* `input_data`：建议写入 **modelDefinition 快照或 hash+version**（强烈推荐快照，保证历史可复现）
* `result_data/summary_data`：输出结构与现有 SimulationPanel 兼容（timestamps/node_data/edge_data/summary）

---

## 8. API 设计（与现有 ASM1 对齐）

### 8.1 UDM 模型定义（新增一组 CRUD）

> 建议新增 `/api/v1/udm-models/*`，把“模型定义”与“流程图/任务”解耦。

* `POST   /api/v1/udm-models`        创建模型（返回 id/version/hash）
* `GET    /api/v1/udm-models`        列表（分页/搜索）
* `GET    /api/v1/udm-models/{id}`   详情（含版本）
* `PUT    /api/v1/udm-models/{id}`   更新（生成新 version）
* `DELETE /api/v1/udm-models/{id}`   删除（仅 owner）

### 8.2 UDM 流程图（仿照 asm1-flowcharts）

* `GET/POST /api/v1/udm-flowcharts/`
* `GET/PUT/DELETE /api/v1/udm-flowcharts/{id}`

### 8.3 UDM 计算任务（仿照 asm1）

* `POST /api/v1/udm/calculate`
* `POST /api/v1/udm/calculate-from-flowchart`
* `GET  /api/v1/udm/status/{job_id}`
* `GET  /api/v1/udm/result/{job_id}`
* `GET  /api/v1/udm/timeseries/{job_id}`
* `GET  /api/v1/udm/result/{job_id}/final-values`
* `POST /api/v1/udm/validate`
* `GET  /api/v1/udm/jobs`
* `DELETE /api/v1/udm/jobs/{job_id}`

---

## 9. 前端页面与组件改造点（对齐你现有工程结构）

### 9.1 需要新增的页面

1. `frontend/src/routes/_layout/udmModels.tsx`（模型库/新建入口）
2. `frontend/src/routes/_layout/udmModelEditor.tsx`（矩阵表格编辑器 + 向导）
3. `frontend/src/routes/_layout/udm.tsx`（UDM 画布仿真页，复用 ASM1 页面布局）

### 9.2 需要新增/复用的 Store

* `useUDMStore`：对齐 `asm1Store.ts` 的 job 生命周期
* `useUDMFlowStore`：用 `createModelFlowStore(UDM_CONFIG, udmFlowChartService, useUDMStore)` 快速生成
* `UDM_CONFIG`：加入 `modelConfigs.ts` 和 `simulationConfig.ts`（参数展示、求解器默认、结果展示维度）

### 9.3 需要新增的 Service（OpenAPI client 生成）

* 后端路由完成后，按你现有 OpenAPI 生成流程更新 `frontend/src/client`
* 新增：

  * `UdmModelsService`
  * `UdmService`
  * `UdmFlowchartsService`

### 9.4 UDM 模型编辑器 UI 组件（建议拆分）

* `PetersenMatrixTable`

  * 虚拟滚动（行列多时）
  * Excel 风格粘贴
  * 行/列操作（增删改名）
* `RateExpressionEditor`

  * 每行一个表达式输入框
  * 实时 token 高亮（可选）
* `SymbolExtractionPanel`

  * components / parameters / 未定义符号
  * 点击定位到对应过程
* `ParameterRangeWizard`

  * 表单 + 批量操作（全部设默认范围）
* `GenerateFlowchartDialog`

  * 显示将创建：model version、默认画布拓扑预览
  * 确认后跳转 /udm

---

## 10. 后端计算核与安全策略（关键）

### 10.1 计算核：Generic Petersen Engine（建议）

对于每个 UDMReactor 节点：

1. 构造 (S)（P x M）
2. 解析并执行 (\rho(C,\theta))（P x 1）
3. 反应项：(\text{reaction} = S^T \rho)（M x 1）
4. 融合水力项（流入/流出、体积、混合），得到 dC/dt
5. 交给你现有 ODE 求解框架（torch/CPU/GPU 由平台配置）

### 10.2 表达式执行：必须是“受限表达式语言”

严禁：让用户上传 Python 代码或任意 eval。
建议实现路线（安全优先）：

* **自研解析器**：表达式 → AST → 映射到 torch 运算（最可控）
* 只允许：

  * 运算符：`+ - * / ** ( )`
  * 数字字面量
  * 标识符（component/parameter）
  * 白名单函数：`exp, log, min, max, pow, sqrt` 等
* 禁止：

  * 属性访问、索引、任意函数调用、import、字符串拼接

### 10.3 服务端 validate（双重校验）

* 前端校验只能提升体验，服务端必须重复校验（防绕过）
* validate 返回结构建议：

```json
{
  "ok": false,
  "errors": [
    {"code":"UNDEFINED_SYMBOL","message":"未定义符号 Ki", "process":"nitrification"},
    {"code":"DISALLOWED_FUNC","message":"函数 tan 不被允许", "process":"growth"},
    {"code":"PARAM_RANGE_INVALID","message":"K_O2: min>=max"}
  ],
  "warnings":[...]
}
```

---

## 11. 结果展示与可视化（复用现有能力）

UDM 的结果展示应“自动适配”：

* timeseries 曲线：按 components 动态生成指标列表
* summary：支持显示关键输出（末态值、收敛/失败原因、求解步数/耗时）
* final-values：按 components 表格展示

> 要求：UDM 不新增一套结果 UI，而是让现有 SimulationPanel 能基于 modelType 配置动态渲染。

---

## 12. 权限、版本与可复现性

### 12.1 权限

* owner 隔离：模型/流程图/任务都按 owner_id
  -（后续可扩展）共享：只读分享 / 团队空间

### 12.2 版本策略（强烈建议）

* 每次保存模型定义 → version +1
* Flowchart 绑定 `modelId + modelVersion`（或 hash）
* Job 写入 modelDefinition 快照（推荐），确保“历史任务永远可复现”

---

## 13. 验收标准（Definition of Done）

1. 用户能在模型编辑器里完成：

   * components/processes/stoich/rateExpr 输入
   * 点击解析后得到正确的参数列表
   * 完成参数范围填写并通过校验
2. 点击“确认并生成画布”后：

   * 自动生成并保存 flowchart
   * 跳转到 /udm 画布页可见默认三节点拓扑
3. 在 /udm 画布页点击计算：

   * 任务创建成功
   * 状态轮询正常
   * summary/timeseries/final-values 可展示（至少一条曲线）
4. 表达式安全：

   * 不允许非白名单函数/危险语法
   * 服务端 validate 能拦截绕过
5. 工程一致性：

   * UDM 接入 modelType 插拔结构（configs/stores/services/routes）
   * OpenAPI client 可生成并编译通过（tsc --noEmit）

---

## 14. 里程碑拆分（按交付切片）

* 切片 A：UDMModels CRUD + 列表页 + 详情页（无计算）
* 切片 B：模型编辑器（矩阵表+表达式+抽取+向导）+ 服务端 validate
* 切片 C：一键生成 flowchart + /udm 画布页接入（先跑通任务链路）
* 切片 D：Generic Petersen Engine + 结果适配 + 稳定性/性能优化（虚拟表格、缓存、错误提示完善）

---

## 15. 附录：CSV 导入导出模板（建议）

### 模板 1：矩阵+表达式（推荐）

* 第一行：`Process, rateExpr, S_O2, S_S, X_BH, ...`
* 后续行：`aerobic_growth, mu_H*(S_S/(K_S+S_S))*(S_O2/(K_O2+S_O2))*X_BH, -1.0, -0.5, +1.0, ...`

### 模板 2：参数范围

* `name, default, min, max, scale, unit, note`

---