# UDM 专项问题规划（Process + Stoich + RateExpr + 画布参数配置 + UI/UX）

日期：2026-02-11  
状态：仅规划，不执行编码  
范围：先不讨论 `phrase6`（保存与版本策略细节），优先解决以下问题：

1. UDM 模型编辑器入口放在 UDM 流程图页面左下角，点击后弹窗编辑。  
2. UDM 模型编辑器矩阵中，`stoich` 需支持 `Y_A` / `Y_X` 这类公式表达式，而非仅数值输入。  
3. 计算参数与模型参数 Panel 需映射自定义模型参数（而非仅静态模型配置）。

---

## 架构原则（已确认）

1. UDM 采用独立业务链路：模型定义、校验、求解、参数映射不依赖 ASM 硬编码模型实现。  
2. 允许复用基础设施：画布容器、通用 Dialog、通用布局与基础工具函数可复用。  
3. 严禁复用硬编码模型参数源：UDM 参数以 `udmModelSnapshot + udmParameterValues` 为唯一真源。  
4. ASM1 / ASM1Slim / ASM3 作为 UDM 模板与兼容入口，能力最终收敛到 UDM 主链路。

---

## 1. 当前现状与问题定位

### 1.1 入口与交互（问题1）

现状：
- UDM 流程图页已使用 `FlowLayout + UDMBubbleMenu`，且左下角已存在气泡菜单容器（`position=absolute; left=60px; bottom=20px`）。
- UDM 模型编辑器当前是独立路由页：`/_layout/udmModelEditor`。

定位：
- 缺少“在 `/udm` 页面左下角直接打开编辑弹窗”的链路。
- 用户在仿真页与模型编辑页之间跳转成本高。

关键代码位置：
- `frontend/src/components/Flow/FlowLayout.tsx`
- `frontend/src/components/Flow/menu/UDMBubbleMenu.tsx`
- `frontend/src/components/Flow/menu/BaseBubbleMenu.tsx`
- `frontend/src/routes/_layout/udmModelEditor.tsx`

### 1.2 Stoich 仅支持数字（问题2）

现状：
- 前端编辑器 `stoich` 单元格是 `Input type="number"`。
- 前端构建 draft 时将 `stoich` 强制 `parseFloat` 成数值。
- 后端 `UDMProcessDefinition.stoich` 类型为 `Dict[str, float]`，校验与引擎均按 float 处理。

定位：
- 无法输入 `Y_A`、`1/Y_H`、`-(1-Y_X)/Y_X` 等产率系数公式。
- 前后端数据结构均限制为数值，导致表达式信息丢失。

关键代码位置：
- `frontend/src/routes/_layout/udmModelEditor.tsx`
- `backend/app/models.py`（`UDMProcessDefinition.stoich`）
- `backend/app/services/udm_expression.py`
- `backend/app/material_balance/udm_engine.py`

### 1.3 参数面板未映射 UDM 自定义参数（问题3）

现状：
- `UDMCalculationPanel` 复用 `ModelCalculationPanel`，后者依赖 `getModelConfig(modelType).enhancedCalculationParameters`。
- `UDM_CONFIG.enhancedCalculationParameters` 目前为空，且固定参数沿用 ASM1，导致动态 UDM 参数无法展示。
- `ModelParametersPanel` 同样按静态 `modelConfig` 聚合参数，而非按 UDM 节点快照参数聚合。

定位：
- 自定义模型参数（`udmModelSnapshot.parameters / udmParameterValues`）没有被当成一等数据源。
- `customParameters`（组分）与“模型参数（动力学/产率系数）”未做明确分层展示。

关键代码位置：
- `frontend/src/components/Flow/inspectorbar/UDMCalculationPanel.tsx`
- `frontend/src/components/Flow/inspectorbar/ModelCalculationPanel.tsx`
- `frontend/src/components/Flow/toolbar/ModelParametersPanel.tsx`
- `frontend/src/config/modelConfigs.ts`（`UDM_CONFIG`）
- `frontend/src/components/Flow/inspectorbar/UDMPropertyPanel.tsx`

---

## 2. 目标状态（完成后应达到）

1. 在 `/udm` 页面左下角可一键打开 UDM 模型编辑弹窗，不离开当前画布上下文。  
2. `Process + Stoich + RateExpr` 编辑器支持 Stoich 公式（含参数符号），并可校验、预览、落库。  
3. 节点计算参数 Panel 与模型参数总览 Panel 可实时映射当前 UDM 模型自定义参数。  
4. UI/UX 上提升矩阵编辑效率（粘贴、错误定位、参数联动、状态反馈）。

---

## 3. 详细解决方案

## 3.1 问题1：UDM 编辑器入口放到左下角并弹窗编辑

### 方案设计

- 在 `UDMBubbleMenu` 增加 `“UDM模型编辑器”` 入口按钮（保持左下角操作聚合）。
- 点击后打开 `UDMModelEditorDialog`（建议全屏/超大尺寸 `Dialog`，保留画布上下文）。
- 弹窗内复用编辑器核心表单（将当前路由页逻辑拆分为可复用组件）。

### 组件与状态拆分

- 新增：`frontend/src/components/UDM/UDMModelEditorForm.tsx`
  - 承载现有 `udmModelEditor` 的核心编辑逻辑（components/processes/stoich/rateexpr/validate/参数向导）。
- 新增：`frontend/src/components/UDM/UDMModelEditorDialog.tsx`
  - 管理弹窗开关、模型选择、保存后回写画布。
- 现有页面 `/_layout/udmModelEditor` 改为仅包裹 `UDMModelEditorForm`，保证“路由页 + 弹窗”共享同一实现。

### 交互流程

1. `/udm` 左下角点击 `UDM模型编辑器`。  
2. 弹窗显示：
   - 最近模型（我的模型）
   - 从模板创建（ASM1 / ASM1Slim / ASM3）
   - 编辑当前绑定模型
3. 保存后支持两种动作：
   - 仅保存模型
   - 保存并应用到当前 UDM 节点/全体 UDM 节点（可选）
4. 关闭弹窗后画布节点参数与面板即时刷新。

### 验收标准

- 不离开 `/udm` 即可完成模型编辑。  
- 弹窗编辑后，UDM 节点 `udmModelSnapshot / udmParameterValues / customParameters` 同步更新。  
- 入口位置固定在左下角操作区，不与现有保存/加载功能冲突。

---

## 3.2 问题2：Stoich 支持公式表达式（Y_A/Y_X 等）

### 方案核心

将 Stoich 从“仅数值”升级为“表达式优先，数值兼容”。

### 数据结构升级（前后端）

- `UDMProcessDefinition` 新增字段：
  - `stoich_expr: Dict[str, str]`（源表达式）
- 保留兼容字段：
  - `stoich: Dict[str, float]`（可选，兼容旧数据）

推荐规则：
- 前端编辑始终写 `stoich_expr`。
- 后端在校验/执行阶段按 `stoich_expr` 计算系数矩阵；若缺失再回退 `stoich`。

### 编辑器行为升级

- Stoich 单元格输入框由 `type=number` 改为 `type=text`。
- 每个单元格允许输入：
  - 数值：`-1`, `0.25`
  - 表达式：`Y_A`, `1/Y_H`, `-(1-Y_X)/Y_X`
- 提供单元格状态：
  - 正常（可解析）
  - 警告（引用未声明参数）
  - 错误（语法非法）

### 校验与参数抽取升级

- 现有 `validate_udm_definition` 扩展为同时处理：
  - `rate_expr`
  - `stoich_expr`
- 参数抽取源改为并集：
  - `extract(rate_expr) ∪ extract(stoich_expr)`
- 新增校验约束：
  - Stoich 表达式只允许“参数 + 常量 + 白名单函数 + 算术运算”。
  - 默认不允许引用组件浓度（避免把 Stoich 变成状态依赖矩阵）。

### 求解引擎改造（设计）

- `udm_engine` 在构建 runtime payload 时：
  - 对每个 `stoich_expr[component]` 编译并在参数环境中求值，得到最终 `float`。
  - 组装 `stoich_matrix` 后进入现有反应计算流程。
- 兼容路径：
  - `stoich_expr` 缺失时使用 `stoich`（旧模型不受影响）。

### 验收标准

- 编辑器中可输入 `Y_A/Y_X` 等公式且保存不丢失。  
- `validate` 可返回 Stoich 公式相关错误定位。  
- 仿真前能得到稳定数值矩阵并正常计算。  
- 旧模型（仅 `stoich` 数值）可继续运行。

---

## 3.3 问题3：计算参数/模型参数 Panel 映射自定义参数

### 方案核心

UDM 参数面板改为“以节点模型快照为主数据源”，不再依赖 `UDM_CONFIG.enhancedCalculationParameters` 静态配置。

### 数据源优先级（统一）

UDM 模型参数（动力学/产率参数）优先级：
1. `selectedNode.data.udmModelSnapshot.parameters`
2. `selectedNode.data.udmModel.parameters`
3. 首个 UDM 节点快照参数（回退）

UDM 参数值优先级：
1. `selectedNode.data.udmParameterValues[paramName]`
2. `selectedNode.data[paramName]`
3. 参数定义中的 `default_value`

### Panel 改造

- `UDMCalculationPanel` 不再简单透传 `ModelCalculationPanel`。
- 新建 UDM 专属动态面板：
  - 按参数定义渲染 Slider/Input（支持 min/max/scale/unit）
  - 支持“同步到所有 UDM 节点”开关
  - 写回 `node.data[paramName]` + `udmParameterValues`

- `ModelParametersPanel` 增加 UDM 分支：
  - 统计全图 UDM 节点参数并表格展示
  - 区分两组：
    - 组分（component states）
    - 模型参数（kinetic/stoich params）

### Store 与配置调整

- `UDM_CONFIG` 改为最小静态配置：
  - `fixedParameters` 不再沿用 ASM1 固定参数（避免误导）
  - 计算参数由节点快照动态决定
- `createModelFlowStore` 在 UDM 场景下：
  - `customParameters` 明确仅用于“组分/状态变量”
  - 模型参数单独通过 `udmParameterValues` 管理

### 验收标准

- 选中 UDM 节点后，参数面板显示该模型真实参数集合。  
- 修改参数可即时反映到节点数据，并可选择同步到全部 UDM 节点。  
- 模型参数总览表正确显示各 UDM 节点参数值，不再空白。

---

## 4. UI/UX 优化专项（与上述问题并行）

1. 矩阵可用性：
- 冻结表头与首列，保障大矩阵可读性。  
- 支持多单元格粘贴（TSV/CSV）和批量清零。  
- 行/列 hover 高亮，降低错填概率。

2. 错误可视化：
- 校验结果支持“点击错误跳转到具体 process/stoich 单元格”。  
- 单元格内联错误提示（不只在底部聚合列表）。

3. 参数联动：
- 从 `validate` 抽取参数后一键补齐参数表。  
- 对新参数给出默认 `min/default/max` 推荐值。

4. 弹窗体验：
- 弹窗顶部固定操作区（保存、校验、应用到画布）。  
- 关闭前未保存变更提示。  
- 支持 Esc 关闭与快捷键（Ctrl/Cmd+S 保存）。

---

## 5. Phrase1-10 执行计划（`phrase6` 暂缓）

## Phrase1：基线重构（编辑器可复用化）

目标：把 `udmModelEditor` 页面拆成可复用 Form 组件。  
产出：`UDMModelEditorForm` 可被路由页和弹窗共同复用。  
讨论重点：状态提升边界（页面控制 vs 表单内部控制）。

## Phrase2：左下角入口 + 弹窗壳

目标：在 `/udm` 左下角增加“UDM模型编辑器”入口并打开弹窗。  
产出：`UDMBubbleMenu` 新入口 + `UDMModelEditorDialog`。  
讨论重点：入口放在 `BaseBubbleMenu` 还是 `SimulationActionPlate`（推荐前者）。

## Phrase3：Process/Stoich/RateExpr 编辑器升级（前端）

目标：Stoich 单元格支持文本表达式与校验状态。  
产出：编辑器输入控件与数据结构升级（`stoich_expr`）。  
讨论重点：表达式语法提示与粘贴策略。

## Phrase4：后端 Schema/validate 升级

目标：后端支持 `stoich_expr` 并参与参数抽取和校验。  
产出：`models.py`、`udm_models.py`、`udm_expression.py` 升级与兼容。  
讨论重点：是否允许 Stoich 引用组件变量（默认不允许）。

## Phrase5：求解引擎支持 Stoich 表达式编译

目标：运行时将 `stoich_expr` 编译为数值矩阵。  
产出：`udm_engine` 支持 `stoich_expr` + 旧 `stoich` 双通道。  
讨论重点：运行时性能与缓存策略。

## Phrase6：暂缓（本轮不讨论）

按你的要求，本轮不讨论 `phrase6`。

## Phrase7：UDM 计算参数面板动态化

目标：`UDMCalculationPanel` 显示自定义模型参数并可编辑同步。  
产出：UDM 专属动态参数面板组件。  
讨论重点：参数写回字段（`node.data` 与 `udmParameterValues` 的一致性）。

## Phrase8：模型参数总览面板动态化

目标：`ModelParametersPanel` 正确展示全图 UDM 节点参数。  
产出：UDM 分支聚合逻辑 + 组分/模型参数分组展示。  
讨论重点：跨节点参数并集排序规则。

## Phrase9：UI/UX 收口优化

目标：提升矩阵编辑效率与错误定位效率。  
产出：冻结列、批量粘贴、错误跳转、变更提示。  
讨论重点：首批必须项与可延后项。

## Phrase10：联调与验收

目标：完成从“弹窗编辑 -> 校验 -> 应用画布 -> 参数面板可见 -> 可仿真”的闭环。  
产出：联调清单、回归清单、已知限制清单。  
讨论重点：验收脚本与演示路径。

---

## 6. 联调验收清单（本轮完成定义，后续逐项实现）

1. 在 `/udm` 左下角可打开 UDM 编辑弹窗。  
2. Stoich 可输入 `Y_A/Y_X` 等公式并通过校验。  
3. 校验返回能覆盖 `rate_expr + stoich_expr` 的错误与参数抽取。  
4. UDM 节点“计算参数面板”显示自定义模型参数，修改后可同步多节点。  
5. 模型参数总览可正确显示全图 UDM 节点参数值。  
6. 旧模型（只有 `stoich` 数值）导入与计算不回归。

---

## 7. 风险与默认决策

风险1：UDM 业务链路仍夹杂硬编码模型参数依赖，后续扩展会反复牵连 ASM 代码。  
默认决策：坚持“业务独立 + 基础设施复用”，逐步清除 UDM 对静态 `modelConfigs` 参数定义的依赖。

风险2：UDM 参数来源多路径，容易出现显示值与计算值不一致。  
默认决策：统一“读快照定义、写 `udmParameterValues`、同步 `node.data`”三步策略。

风险3：弹窗编辑器逻辑复用不彻底，可能出现路由页与弹窗行为分叉。  
默认决策：先抽离共享 Form，再保留两个壳层。

---

## 8. 本文档后续讨论方式

- 你每次确认一个 `phrase` 后，我只推进该 `phrase` 的实现与回归。  
- 每个 `phrase` 开始前，我先给你“变更文件清单 + 接口变更点 + 验收项”再动手编码。  
- `phrase6` 在你明确恢复讨论前保持冻结。
