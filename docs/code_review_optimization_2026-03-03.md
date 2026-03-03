# AutoWaterSimu 代码审查与优化建议（综合版）

> 基于 `docs/user_update_notes_2026-02-11_to_2026-02-13.md` 所涉及的三大功能模块进行代码审查
> 审查日期：2026-03-03
> 审查范围：UDM 模型库/编辑器、时段计划、Hybrid UDM、流程图页面 Bug 排查、开发进度评审
>
> 本文档合并以下输入源：
> - `docs/code_review_optimization_2026-03-03.md`（原始审查）
> - `docs/20260303_progress_code_review.md`（开发进度评审）
> - `docs/20260303_progress_optimization_execution_plan.md`（优化执行计划）
> - 流程图页面"新建流程图功能失效"Bug 排查结论

---

## 目录

1. [流程图页面 Bug 排查](#1-流程图页面-bug-排查)
2. [开发进度评审发现](#2-开发进度评审发现)
3. [UDM 模型库与编辑器](#3-udm-模型库与编辑器)
4. [时段计划（Time Segment）](#4-时段计划time-segment)
5. [Hybrid UDM（多模型同图）](#5-hybrid-udm多模型同图)
6. [跨模块共性问题](#6-跨模块共性问题)
7. [后端服务层审查](#7-后端服务层审查)
8. [统一优先级总表](#8-统一优先级总表)
9. [统一开发计划](#9-统一开发计划)
10. [测试与回归策略](#10-测试与回归策略)
11. [风险与依赖](#11-风险与依赖)
12. [附录：审查涉及的核心文件清单](#12-附录审查涉及的核心文件清单)

---

## 1. 流程图页面 Bug 排查

> 排查目标：用户反馈"流程图页面新建流程图功能失效"

### BUG-1（P0）：Material Balance 页面 BubbleMenu 完全不渲染

**严重度**: P0 — 核心功能完全不可用

**现象**: Material Balance 流程图页面的右键/工具栏菜单（BubbleMenu）不显示，导致"新建流程图"、"保存"、"加载"、"导入导出"等所有操作入口均不可用。

**根因分析**:

1. `frontend/src/stores/flowStore.ts:147` 中初始化 `showBubbleMenu: false`：
   ```ts
   // flowStore.ts:146-147
   showMiniMap: false,
   showBubbleMenu: false,
   ```

2. `frontend/src/components/Flow/FlowLayout.tsx:321-326` 读取该字段并决定是否渲染 BubbleMenu：
   ```tsx
   const flowSnapshot = flowStore() as { showBubbleMenu?: boolean }
   const showBubbleMenu =
     typeof flowSnapshot.showBubbleMenu === "boolean"
       ? flowSnapshot.showBubbleMenu
       : true
   if (!showBubbleMenu) return null
   ```

3. 由于 `flowStore` 中 `showBubbleMenu` 为 `false`（类型为 boolean），`typeof === "boolean"` 检查通过 → 取到 `false` → `return null` → 整个 BubbleMenu 不渲染。

**ASM1/UDM 页面不受影响的原因**:
- ASM1/UDM 使用 `createModelFlowStore` 工厂函数创建的独立 store
- 这些 store 不包含 `showBubbleMenu` 字段
- `typeof undefined !== "boolean"` → 走 fallback `true` → 菜单正常显示

**影响链路**:
```
materialbalance.tsx 传入 BubbleMenuComponent={MaterialBalanceBubbleMenu}
  → FlowLayout.tsx 读取 flowStore().showBubbleMenu
    → 值为 false → return null
      → BubbleMenu（含新建/保存/加载/导入导出）全部不渲染
```

**修复方案**: 将 `frontend/src/stores/flowStore.ts:147` 的 `showBubbleMenu: false` 改为 `showBubbleMenu: true`。

**验收标准**:
- Material Balance 页面 BubbleMenu 正常渲染
- 新建、保存、加载、导入、导出功能均可操作
- ASM1/UDM 页面行为无回归

---

### BUG-2（P1）：ConfirmDialog "在线保存" 后不执行 pending action

**严重度**: P1 — 数据操作中断，用户需重复操作

**现象**: 用户在有未保存内容时点击"新建流程图" → 弹出确认对话框 → 选择"在线保存" → 保存对话框打开并完成保存 → 但新建流程图的操作丢失，用户需要再次点击新建。

**根因分析**:

1. `frontend/src/components/Flow/menu/BaseBubbleMenu.tsx:170-172` 的 `handleConfirmAction` 中，`case "save"` 分支只调用了 `handleOpenSaveDialog()` 打开保存对话框：
   ```tsx
   case "save":
     handleOpenSaveDialog()
     break
   ```

2. 没有在保存完成后执行 `confirmDialog.pendingAction`（原始的"新建流程图"操作）。

3. `finally` 块中 `setConfirmDialog(null)` 清除了整个 confirmDialog 状态（包括 `pendingAction`），导致保存完成后无法继续执行原始操作。

**影响**: 所有通过 ConfirmDialog → "在线保存" 路径触发的 pending action 均丢失，包括：
- 新建流程图 → 保存 → 新建不执行
- 加载流程图 → 保存 → 加载不执行

**修复方案**:
- 在 `handleOpenSaveDialog()` 调用前，将 `confirmDialog.pendingAction` 保存到一个 ref 或闭包中
- 在 save dialog 的 `onClose` 回调中，判断保存成功后执行该 pendingAction
- 或将 pendingAction 作为参数传入 save dialog 组件

**验收标准**:
- 新建流程图 → 确认保存 → 保存完成后自动执行新建
- 加载流程图 → 确认保存 → 保存完成后自动打开加载对话框
- "跳过保存" 和 "导出保存" 路径行为不受影响

---

## 2. 开发进度评审发现

> 来源：`docs/20260303_progress_code_review.md`
> 基线校验：后端 15 项测试通过，前端 `tsc --noEmit` 通过

### P0-1：流程图导入未恢复 `calculationParameters`，影响复现一致性

**文件**:
- `frontend/src/stores/createModelFlowStore.ts:1071-1079` — 解构导入数据时未取 `calculationParameters`
- `frontend/src/stores/createModelFlowStore.ts:1200-1212` — `set(...)` 时未恢复 `calculationParameters`
- `frontend/src/stores/createModelFlowStore.ts:1208-1209` — 存在注释掉的恢复逻辑

**影响**:
- 同一流程图在导入后可能沿用"当前 store 参数"，导致 `hours/steps_per_hour` 与原任务不一致
- 结果复盘、缺陷复现、跨环境验算存在偏差风险

**建议**:
- 导入时恢复 `calculationParameters`，并提供显式策略：默认"使用文件参数"，可选"保持当前参数"
- 将策略写入导入结果提示与 UI 文案，避免隐式行为

### P0-2：Flow 组件文档页快照回滚字段不完整，存在状态污染风险

**文件**:
- `frontend/src/components/HomePosthog/FlowComponentsDocs.tsx:28-42` — `FlowStoreSnapshot` 仅包含部分字段
- `frontend/src/components/HomePosthog/FlowComponentsDocs.tsx:102-116` — 进入页面时仅快照部分状态
- `frontend/src/components/HomePosthog/FlowComponentsDocs.tsx:149-163` — 离开页面回滚仅限部分状态

**影响**:
- 演示页加载样例后，可能残留 `timeSegments`、`hybridConfig`、`isEdgeTimeSegmentMode` 等状态到真实编辑流程
- 用户回到业务页面后看到"非预期状态"

**建议**:
- 快照与回滚覆盖完整业务关键字段（至少补齐 `timeSegments`、`hybridConfig`、`isEdgeTimeSegmentMode`）
- 或改为进入页面时创建隔离 store（demo 独立 state）

### P1-1：UDM 任务列表总数统计使用 `len(all())`，在大数据量下低效

**文件**: `backend/app/api/routes/udm.py:569-573`

**影响**: 统计总数时将当前用户全部任务记录加载到内存，再 `len`。对任务量较大的用户增加响应延迟与内存压力。

**建议**: 改为数据库计数查询 `select(func.count()).select_from(UDMJob)...`。

### P1-2：权限不足使用 `400`，与语义及全局约定不一致

**文件**:
- `backend/app/api/routes/udm_hybrid_configs.py:90, 137, 168`
- `backend/app/api/routes/flowcharts.py:62, 102, 126`
- `backend/app/api/routes/udm_flowcharts.py:62, 102, 126`

**影响**: 前端难以区分"请求参数错误"和"权限不足"，与 `403 Forbidden` 语义不一致。

**建议**: 统一"权限不足"返回 `403`，保持错误码语义一致。如需兼容旧客户端，增加短期过渡期。

### P2-1：Pydantic v2 迁移技术债（`class Config` / `schema_extra`）

**文件**: `backend/app/material_balance/models.py:215-216`

**影响**: 产生 Pydantic v2 兼容警告，长期影响升级和测试输出整洁度。

**建议**: 迁移至 `model_config = ConfigDict(...)` + `json_schema_extra` 写法。

---

## 3. UDM 模型库与编辑器

### 3.1 功能建议

#### F-1.1 模型列表缺少分页

**文件**: `frontend/src/routes/_layout/udmModels.tsx:38-45`

当前硬编码 `limit: 200`，没有分页控件。当模型数量增长后，一次加载 200 条将导致首屏变慢，并且用户无法浏览第 200 条之后的模型。

**建议**:
- 添加分页组件（页码或无限滚动）
- 使用 `useInfiniteQuery` 或手动管理 `skip/limit` 状态
- 在搜索时重置到第一页

#### F-1.2 表达式编辑器缺少常用函数快捷面板

**文件**: `frontend/src/components/UDM/ExpressionCellEditorDialog.tsx`

右侧面板目前只展示"变量"和"参数"两栏。后端 `udm_expression.py:10-19` 定义了 `ALLOWED_FUNCTIONS = {"exp", "log", "sqrt", "pow", "min", "max", "abs", "clip"}` 和 `RESERVED_CONSTANTS = {"pi", "e"}`，但前端编辑器没有提供这些合法函数的快捷插入入口。

**建议**:
- 在右侧面板新增"函数"栏，列出 `exp`, `log`, `sqrt`, `pow`, `min`, `max`, `abs`, `clip` 及其签名提示
- 新增"常量"栏，列出 `pi`, `e`
- 点击时插入带括号的模板（如 `exp()`），光标定位到括号内

#### F-1.3 模型版本历史缺少对比功能

**文件**: `backend/app/api/routes/udm_models.py:121-134`

后端已支持多版本存储（`UDMModelVersion` 表），`_build_model_detail` 返回完整 `versions` 列表，但前端编辑器没有版本切换或 diff 对比入口。

**建议**:
- 在编辑器页面添加"版本历史"面板，展示版本号、时间、hash
- 支持选定历史版本进行只读预览
- 远期可考虑两版本间的 Petersen 矩阵 diff

#### F-1.4 缺少模型导入/导出能力

目前模型只能在平台内创建和复制，不支持 JSON 文件导入/导出。对于跨环境迁移或备份场景不友好。

**建议**:
- 添加"导出为 JSON"按钮，下载包含 components/processes/parameters 的完整定义
- 添加"从 JSON 导入"入口，解析后填充到编辑表单

### 3.2 UI/UX 建议

#### U-1.1 删除确认使用 `window.confirm`，体验不一致

**文件**: `frontend/src/routes/_layout/udmModels.tsx:322-330`

```tsx
const ok = window.confirm(
  t("flow.udmModels.confirm.deleteModel", { name: model.name })
)
```

浏览器原生 `confirm` 与 Chakra UI 风格不匹配，不支持国际化按钮文本，且在移动端体验差。

**建议**: 使用 Chakra UI `AlertDialog` 组件替代，可自定义按钮文案、添加图标、支持异步 loading 状态。

#### U-1.2 参数表的 `scale` 列使用原生 `<select>`

**文件**: `frontend/src/components/UDM/UDMModelEditorForm.tsx:1463-1484`

```tsx
<select
  value={row.scale}
  style={{
    width: "100%",
    border: "1px solid #CBD5E0",
    borderRadius: "6px",
    padding: "4px 8px",
    height: "32px",
  }}
>
```

内联 style 硬编码颜色值，与 Chakra UI 主题系统（含暗色模式）不兼容。

**建议**: 替换为 Chakra UI 的 `NativeSelect` 组件，自动继承主题样式，与其他部分（如 Hybrid 对话框中的 `NativeSelect`）保持一致。

#### U-1.3 编辑器表单过长，缺少导航锚点

**文件**: `frontend/src/components/UDM/UDMModelEditorForm.tsx`（~1568 行）

编辑器包含"基本信息 → 组分表 → Petersen 矩阵 → 校验 → 参数表 → 操作栏"共 6 个区块，纵向滚动距离过长。

**建议**:
- 添加左侧或顶部区块导航锚点（Tab 或侧边栏锚链接）
- 对 Petersen 矩阵区域添加折叠/展开控制
- 考虑使用 `Stepper` 或 `Accordion` 组织各区块

#### U-1.4 组分/参数/过程表格使用数组索引作为 key

**文件**: `frontend/src/components/UDM/UDMModelEditorForm.tsx:1022, 1201, 1391`

```tsx
<Table.Row key={`component-${index}`}>
<Table.Row key={`process-${rowIndex}`}>
<Table.Row key={`parameter-${rowIndex}`}>
```

使用数组索引作为 key 在删除/插入行时可能导致 React 错误复用 DOM 状态（如 focus、输入内容）。

**建议**: 为每行生成唯一 ID（如 `crypto.randomUUID()` 或简单计数器），用 ID 作为 key。

#### U-1.5 缺少行拖拽排序

组分、过程、参数表目前只能通过"添加/删除"操作管理行顺序，不支持拖拽。

**建议**: 引入 `@dnd-kit/sortable` 实现行拖拽排序，尤其对过程行的排序有实际建模意义。

#### U-1.6 搜索框需按回车或点击按钮才触发

**文件**: `frontend/src/routes/_layout/udmModels.tsx:144-152`

当前搜索分离为 `searchInput` 和 `searchText` 两个状态，用户必须手动点击搜索按钮。

**建议**: 添加 debounce 自动搜索（300ms），同时保留手动搜索按钮；或在 Input 上监听 `onKeyDown` Enter 事件触发搜索。

---

## 4. 时段计划（Time Segment）

### 4.1 功能建议

#### F-2.1 缺少"自动均分时段"功能

用户需要手动逐个添加和配置时段起止时间。对于"24 小时均分为 N 段"这种常见需求，操作繁琐。

**建议**: 添加"快速均分"按钮，弹出输入框让用户填写段数 N，自动生成 `[0, hours/N], [hours/N, 2*hours/N], ...` 的时段序列。

#### F-2.2 缺少时段模板保存/加载

用户无法将时段配置保存为模板以复用于其他流程图。

**建议**: 允许将当前时段计划导出为 JSON 片段，或保存到后端作为"时段模板"供后续调用。

#### F-2.3 时段与仿真小时数不一致时的用户引导不足

**文件**: `frontend/src/utils/timeSegmentValidation.ts:258-265`

校验逻辑会报 `SEGMENT_END_NOT_EQUAL_HOURS` 错误，但用户可能不清楚当前仿真时长是多少。

**建议**: 在时段编辑器顶部显著展示当前仿真时长 `hours`，并在错误信息中包含实际期望值。

### 4.2 UI/UX 建议

#### U-2.1 时段卡片横向排列在手机端不友好

**文件**: `frontend/src/components/Flow/inspectorbar/TimeSegmentPlanEditor.tsx:406`

```tsx
<HStack align="stretch" gap={3} minW="max-content">
```

横向滚动在窄屏（侧面板/手机）需要用户手动左右拖动，发现性差。

**建议**:
- 在窄屏（<768px）时自动切换为纵向排列
- 或使用水平 `Tabs` 切换时段，每次只展示一个时段的详细配置

#### U-2.2 继承值视觉区分度不够

**文件**: `frontend/src/components/Flow/inspectorbar/EdgeTimeSegmentEditor.tsx:404-405`

```tsx
color={flowInherited ? "gray.500" : "gray.900"}
bg={flowInherited ? "gray.100" : "white"}
```

仅靠灰色文本 + 灰色背景区分继承值，对色觉障碍用户不友好。

**建议**:
- 对继承值添加虚线边框或斜条纹背景
- 在输入框右侧添加小图标（如 `↩` 符号）表示"继承自上一时段"
- 添加 tooltip 说明继承来源

#### U-2.3 `parseOptionalNumber` 等工具函数在两个组件中重复

**文件**:
- `frontend/src/components/Flow/inspectorbar/TimeSegmentPlanEditor.tsx:43-68`
- `frontend/src/components/Flow/inspectorbar/EdgeTimeSegmentEditor.tsx:47-68`

`parseOptionalNumber`, `asFiniteNumber`, `toInputValue`, `normalizeOverride` 四个函数在两个文件中完全重复。

**建议**: 提取到 `utils/timeSegmentHelpers.ts` 统一导出，两个编辑器组件共同引用。

#### U-2.4 时段拖拽排序依赖上下箭头按钮

当时段数量多（>5）时，使用上/下箭头逐步调整顺序效率低。

**建议**: 支持拖拽排序（卡片模式下拖拽）或一键"按时间排序"（已有但不够显眼）。考虑将"按时间排序"按钮移到顶部工具栏。

---

## 5. Hybrid UDM（多模型同图）

### 5.1 功能建议

#### F-3.1 Pair Mapping 在模型数量多时呈 O(N²) 增长

**文件**: `frontend/src/components/UDM/HybridUDMSetupDialog.tsx:94-121`

```tsx
selectedDetails.forEach((source) => {
  selectedDetails.forEach((target) => {
    if (source.id === target.id) return
    pairs.push(...)
  })
})
```

当选择 5 个模型时产生 20 个 pair，10 个模型产生 90 个 pair，对话框将变得极难操作。

**建议**:
- 只为实际存在跨模型边连接的 pair 生成映射配置（利用 flowchart 的 edge 信息）
- 添加过滤/搜索功能，允许用户快速定位特定 pair
- 对无关 pair 默认折叠

#### F-3.2 缺少映射完整性可视化

用户在 Hybrid Setup 对话框中配置映射后，难以直观判断"哪些变量已映射、哪些遗漏"。

**建议**:
- 在映射区域添加进度指示器（如 "12/15 变量已映射"）
- 未映射的 focal variable 高亮标红
- 映射完成后显示绿色检查标记

#### F-3.3 前端 focal variable 提取与后端不一致

**文件对比**:
- 前端 `frontend/src/utils/hybridUdm.ts:73` 使用正则 `/[A-Za-z_][A-Za-z0-9_]*/g`
- 后端 `backend/app/services/hybrid_udm_validation.py:57-67` 使用 Python `ast.parse`

正则提取可能将函数名（如 `exp`, `log`）误判为 focal variable，而后端 AST 解析不会。

**建议**: 前端也添加对 `ALLOWED_FUNCTIONS` 和 `RESERVED_CONSTANTS` 的过滤，与后端白名单保持一致。可从后端 API 获取或在前端硬编码同步列表。

#### F-3.4 节点绑定模型后缺少快速"解绑"操作

**文件**: `frontend/src/components/Flow/inspectorbar/UDMPropertyPanel.tsx:459-477`

当前 Hybrid 模型下拉框没有"清除/解绑"选项（`<option value="" disabled>`），一旦绑定就无法恢复到"未绑定"状态。

**建议**: 将 `disabled` 改为允许选择空值，表示"不绑定任何模型"。

### 5.2 UI/UX 建议

#### U-3.1 Hybrid Setup 对话框信息层次不清

对话框同时展示"已保存配置选择器"、"模型选择列表"、"映射配置"三个区域，垂直排列导致用户需要频繁滚动。

**建议**:
- 采用 Stepper 或 Tab 布局：Step 1 选模型 → Step 2 配映射 → Step 3 确认
- 或使用左右分栏：左侧选模型，右侧配映射

#### U-3.2 模型选择区域缺少模型详情预览

**文件**: `frontend/src/components/UDM/HybridUDMSetupDialog.tsx:436-466`

勾选模型时只显示名称和版本号，用户无法在不离开对话框的情况下查看模型包含的组分/过程信息。

**建议**: 添加 tooltip 或 expand 面板，hover/点击时展示模型的组分列表和过程数量，帮助用户判断是否需要选择该模型。

#### U-3.3 映射下拉框中 "local_exempt" 术语对普通用户不友好

**文件**: `frontend/src/components/UDM/HybridUDMSetupDialog.tsx:512`

```tsx
<option value={LOCAL_EXEMPT_TOKEN}>
  {t("flow.hybridSetup.localExempt")}
</option>
```

"本地豁免"对水处理工程师而言可能不够直观。

**建议**: 考虑更友好的措辞，如"使用本模型自有值"或"不从上游模型传入"，并添加 tooltip 解释具体含义。

---

## 6. 跨模块共性问题

### C-1 后端错误消息中英混杂

**文件**:
- `backend/app/services/udm_expression.py:69-70` — 中文: `"不允许的运算符"`
- `backend/app/services/hybrid_udm_validation.py:213` — 中文: `"selected_models 包含缺失 model_id/version 的条目"`
- `backend/app/services/hybrid_udm_validation.py:346` — 英文: `"Unsupported hybrid mode: {mode}"`

**建议**: 统一使用英文 error code + i18n message key 的模式。后端返回结构化 `{code, message}` 对象，前端根据 code 翻译显示。

### C-2 TypeScript 类型安全问题

多处使用 `any` 类型断言：

- `UDMModelEditorForm.tsx:216` — `(item: any) =>`
- `UDMModelEditorDialog.tsx:54-56` — `Array<Record<string, any>>`
- `udmService.ts:89` — `flowchartData: any`
- `UDMPropertyPanel.tsx:19` — `store?: () => ModelFlowState<any, any, any>`

**建议**: 逐步为 `UDMModelVersion` 的 `components`, `parameters`, `processes` 字段定义明确的 TypeScript 接口，替代 `any` / `Record<string, unknown>` 遍历。

### C-3 UDM Node 视觉反馈不区分 Hybrid 绑定状态

**文件**: `frontend/src/components/Flow/nodes/UDMNode.tsx`

所有 UDM 节点在流程图上外观完全一致，无法直观判断该节点是否已绑定 Hybrid 模型、绑定了哪个模型。

**建议**:
- 在 UDM 节点上显示绑定模型名称的小标签
- 未绑定的节点显示警告图标或虚线边框
- 不同模型使用不同色调的 accent bar

### C-4 缺少全局 loading/error 状态处理

多个 mutation 操作（删除模型、发布/取消发布、复制等）缺少统一的 loading overlay，用户可能在操作进行中重复点击。

**建议**: 对危险操作（删除、发布）添加 Button 的 `loading` 状态，或使用全局 toast + spinner 指示。

### C-5 缺少键盘可访问性（A11Y）

- 模型列表的操作按钮缺少 `aria-label`
- 时段卡片拖拽排序仅支持鼠标操作
- 表达式编辑器的变量/参数面板按钮缺少键盘快捷导航

**建议**: 为关键操作添加 `aria-label`，支持 `Tab` 键导航和 `Enter` 激活。

---

## 7. 后端服务层审查

### B-1 `udm_expression.py` 的表达式求值器缺少递归深度限制

**文件**: `backend/app/services/udm_expression.py:391-437`

`_evaluate_ast` 采用递归方式求值，恶意构造的深层嵌套表达式（如 `(((((((...)))))))`）可能导致 Python 栈溢出。

**建议**: 在进入 `_evaluate_ast` 前检查 AST 深度，限制为合理上限（如 50 层）。

### B-2 `hybrid_udm_validation.py` 的 `build_hybrid_runtime_info` 函数过长

**文件**: `backend/app/services/hybrid_udm_validation.py:330-659`（~330 行）

单个函数承担了：解析 config → 加载模型 → 补充快照 → 校验映射 → 构建绑定 → 组装返回值，职责过多。

**建议**: 拆分为多个聚焦函数：
- `_parse_selected_models()`
- `_enrich_models_from_nodes()`
- `_validate_pair_mappings()`
- `_build_node_bindings()`
- `_assemble_runtime_info()`

### B-3 模型删除未级联清理版本数据

**文件**: `backend/app/api/routes/udm_models.py:407-418`

```python
session.delete(model)
```

依赖数据库级联删除 (`UDMModelVersion`)。如果数据库外键约束未正确设置 `ON DELETE CASCADE`，可能产生孤立版本记录。

**建议**: 确认 Alembic migration 中外键设置了 `ondelete="CASCADE"`，或显式删除关联版本。

### B-4 `time_segment_validation.py` 校验错误信息为纯英文

与 `udm_expression.py` 使用中文错误信息不同，时段校验使用纯英文。应统一风格。

---

## 8. 统一优先级总表

> 合并原始审查、开发进度评审、Bug 排查的所有发现

### P0 — 立即修复（阻塞核心功能或数据正确性）

| 编号 | 来源 | 问题 | 影响 | 预估工作量 |
|------|------|------|------|-----------|
| BUG-1 | Bug 排查 | Material Balance BubbleMenu 不渲染 | 核心功能完全不可用 | 0.5h |
| P0-1 | 进度评审 | 导入未恢复 `calculationParameters` | 复现一致性 | 2-4h |
| P0-2 | 进度评审 | Demo 页状态污染风险 | 状态隔离 | 2-4h |
| F-3.3 | 原始审查 | focal variable 提取前后端不一致 | 数据正确性 | 2h |

### P1 — 近期迭代（影响体验或性能）

| 编号 | 来源 | 问题 | 影响 | 预估工作量 |
|------|------|------|------|-----------|
| BUG-2 | Bug 排查 | ConfirmDialog pending action 丢失 | 操作中断 | 2-3h |
| P1-1 | 进度评审 | UDM 任务统计 `len(all())` 低效 | 后端性能 | 1h |
| P1-2 | 进度评审 | 权限错误码 400→403 | 接口语义一致性 | 2-3h |
| U-1.1 | 原始审查 | `window.confirm` 替换 | 体验一致性 | 1-2h |
| U-2.3 | 原始审查 | 重复工具函数提取 | 维护成本 | 1h |
| C-1 | 原始审查 | 后端错误消息中英混杂 | 国际化一致性 | 3-4h |
| F-1.1 | 原始审查 | 模型列表分页 | 大数据量可用性 | 3-4h |
| F-1.2 | 原始审查 | 函数快捷插入面板 | 建模效率 | 2-3h |
| F-2.1 | 原始审查 | 自动均分时段 | 使用效率 | 2h |
| U-1.2 | 原始审查 | 原生 select → NativeSelect | 主题一致性 | 1h |
| U-1.4 | 原始审查 | 数组索引 key → 唯一 ID key | React 渲染正确性 | 1-2h |
| C-3 | 原始审查 | UDM 节点展示绑定模型名称 | Hybrid 可用性 | 2-3h |
| B-1 | 原始审查 | 表达式递归深度限制 | 安全性 | 1h |

### P2 — 中期规划（改善可维护性和扩展性）

| 编号 | 来源 | 问题 | 影响 | 预估工作量 |
|------|------|------|------|-----------|
| P2-1 | 进度评审 | Pydantic v2 配置迁移 | 技术债 | 1-2h |
| F-1.3 | 原始审查 | 版本历史对比 | 模型资产管理 | 8-12h |
| F-1.4 | 原始审查 | 模型导入/导出 | 跨环境复用 | 4-6h |
| F-3.1 | 原始审查 | Pair mapping 只生成有效 pair | Hybrid 可扩展性 | 4-6h |
| U-1.3 | 原始审查 | 编辑器区块导航 | 大模型编辑体验 | 3-4h |
| U-3.1 | 原始审查 | Hybrid 对话框分步布局 | 配置效率 | 4-6h |
| B-2 | 原始审查 | `build_hybrid_runtime_info` 拆分 | 可维护性 | 3-4h |
| C-2 | 原始审查 | TypeScript any 类型治理 | 代码质量 | 4-6h |

### P3 — 远期考虑

| 编号 | 来源 | 问题 | 影响 |
|------|------|------|------|
| U-1.5 | 原始审查 | 行拖拽排序 | 编辑体验 |
| F-2.2 | 原始审查 | 时段模板 | 复用效率 |
| F-3.2 | 原始审查 | 映射完整性可视化 | Hybrid 引导 |
| C-5 | 原始审查 | 键盘可访问性 | A11Y 合规 |

---

## 9. 统一开发计划

> 合并自 `docs/20260303_progress_optimization_execution_plan.md` 并扩展

### 9.1 排期总览

| 批次 | 周期 | 任务ID | 优先级 | 目标 |
|------|------|--------|--------|------|
| A | Week 1（第 1-2 天） | A0 | P0 | 修复 BubbleMenu 不渲染（BUG-1） |
| A | Week 1（第 1-3 天） | A1 | P0 | 修复导入参数恢复一致性（P0-1） |
| A | Week 1（第 1-3 天） | A2 | P0 | 修复 Demo 页状态污染风险（P0-2） |
| A | Week 1（第 2-3 天） | A3 | P0 | 修复 focal variable 前后端不一致（F-3.3） |
| B | Week 1-2 | B0 | P1 | 修复 ConfirmDialog pending action（BUG-2） |
| B | Week 1-2 | B1 | P1 | 优化 UDM 任务统计查询性能（P1-1） |
| B | Week 1-2 | B2 | P1 | 统一权限错误码语义 400→403（P1-2） |
| B | Week 1-2 | B3 | P1 | 前端体验修复合集（U-1.1, U-1.2, U-1.4, U-2.3） |
| B | Week 1-2 | B4 | P1 | 后端一致性修复合集（C-1, B-1） |
| C | Week 2 | C1 | P2 | Pydantic v2 配置迁移（P2-1） |
| D | Week 2-3 | D1 | P1/P2 | 时段计划功能与 UI 收口（F-2.1, U-2.1, U-2.2） |
| D | Week 2-3 | D2 | P1/P2 | Hybrid UDM 体验收口（F-3.1, U-3.1, C-3） |
| D | Week 2-3 | D3 | P1/P2 | UDM 编辑体验收口（F-1.1, F-1.2, U-1.3, U-1.6） |
| D | Week 2-3 | D4 | P1/P2 | 全局交互一致性收口（C-4, B-4） |

### 9.2 任务详述

#### A0：修复 BubbleMenu 不渲染

- **类型**: Bug 修复
- **影响文件**: `frontend/src/stores/flowStore.ts`
- **方案**: 将 `showBubbleMenu: false` 改为 `showBubbleMenu: true`
- **验收标准**:
  - Material Balance 页面 BubbleMenu 正常渲染
  - ASM1/UDM 页面无回归

#### A1：导入恢复 `calculationParameters`

- **类型**: 功能正确性
- **影响文件**:
  - `frontend/src/stores/createModelFlowStore.ts`
  - `frontend/src/components/Flow/*`（如需导入策略 UI）
- **方案**:
  - `importFlowData` 接收并应用导入数据中的 `calculationParameters`
  - 增加策略参数：`useImportedCalculationParameters = true`（默认）；可选保留当前参数模式
- **验收标准**:
  - 导入前后 `hours/steps_per_hour` 与文件一致（默认策略）
  - E2E 场景中，导入同一 JSON 能复现相同计算结果

#### A2：FlowComponentsDocs 完整快照回滚

- **类型**: 状态隔离
- **影响文件**: `frontend/src/components/HomePosthog/FlowComponentsDocs.tsx`
- **方案**:
  - 快照补齐关键字段：`timeSegments`、`hybridConfig`、`isEdgeTimeSegmentMode`
  - 或重构为 demo 独立 store，彻底隔离业务状态
- **验收标准**:
  - 进入/退出 demo 页面后，业务流程图状态与进入前一致
  - 不出现"残留时段/Hybrid 配置"问题

#### A3：focal variable 提取前后端对齐

- **类型**: 数据正确性
- **影响文件**: `frontend/src/utils/hybridUdm.ts`
- **方案**: 前端变量提取正则结果中过滤掉 `ALLOWED_FUNCTIONS` 和 `RESERVED_CONSTANTS`
- **验收标准**: 包含 `exp(X)` 的表达式中 `exp` 不被识别为 focal variable

#### B0：修复 ConfirmDialog pending action 丢失

- **类型**: Bug 修复
- **影响文件**: `frontend/src/components/Flow/menu/BaseBubbleMenu.tsx`
- **方案**: 在 save dialog 关闭回调中链接 pendingAction 执行
- **验收标准**:
  - 新建流程图 → 确认保存 → 保存完成后自动执行新建
  - "跳过" 和 "导出" 路径不受影响

#### B1：UDM 任务总数查询性能优化

- **类型**: 后端性能
- **影响文件**: `backend/app/api/routes/udm.py`
- **方案**: 将 `len(session.exec(select(...)).all())` 替换为数据库 `count(*)` 查询
- **验收标准**: 任务总数统计 SQL 为聚合查询，大数据量下响应时间明显下降

#### B2：权限不足语义统一为 `403`

- **类型**: 接口一致性
- **影响文件**:
  - `backend/app/api/routes/udm_hybrid_configs.py`
  - `backend/app/api/routes/flowcharts.py`
  - `backend/app/api/routes/udm_flowcharts.py`
- **方案**: 权限不足统一返回 `HTTPException(status_code=403, detail="Not enough permissions")`
- **验收标准**: 相关接口权限不足均返回 403，前端不出现权限错误误报为"参数错误"的提示

#### B3：前端体验修复合集

- **范围**: U-1.1（AlertDialog 替换）、U-1.2（NativeSelect）、U-1.4（唯一 key）、U-2.3（工具函数提取）
- **验收标准**: 各子项独立验证通过

#### B4：后端一致性修复合集

- **范围**: C-1（错误消息统一）、B-1（递归深度限制）
- **验收标准**: 后端错误消息统一为英文 error code，表达式深度超限返回明确错误

#### C1：Pydantic v2 配置迁移

- **类型**: 技术债清理
- **影响文件**: `backend/app/material_balance/models.py`
- **方案**: `class Config` + `schema_extra` 迁移到 `model_config` + `json_schema_extra`
- **验收标准**: 测试不再出现相关迁移警告，OpenAPI 示例输出语义一致

#### D1：时段计划功能与 UI 收口

- **功能**: 提供"自动均分时段"快捷入口、时段模板保存/加载
- **UI/UX**: 继承值图形化标记，窄屏自适应布局

#### D2：Hybrid UDM 体验收口

- **功能**: 映射完整率与缺失项前置校验，Pair mapping 优化
- **UI/UX**: 映射区支持筛选与分组，节点显示绑定模型名称

#### D3：UDM 编辑体验收口

- **功能**: 模型列表分页、函数快捷插入面板
- **UI/UX**: 长表单分段导航、搜索框 debounce

#### D4：全局交互一致性收口

- **功能**: 危险操作统一确认流程
- **UI/UX**: 统一 loading / disabled / toast 反馈规范，错误消息风格统一

---

## 10. 测试与回归策略

### 10.1 后端

- **现有测试（继续使用并扩展）**:
  - `backend/tests/test_hybrid_udm_validation.py`
  - `backend/tests/test_time_segment_validation.py`
  - `backend/tests/test_material_balance_segment_overrides.py`
  - `backend/tests/test_udm_engine_variable_binding.py`
- **新增测试**:
  - 权限码回归测试（断言 403）
  - `/udm/jobs` 大数据量场景性能回归（聚合计数）
  - 表达式深度限制回归

### 10.2 前端

- **必跑**: `cd frontend; npx tsc --noEmit`
- **建议补充**:
  - Material Balance 页面 BubbleMenu 渲染验证
  - ConfirmDialog → 保存 → pendingAction 执行链路验证
  - `FlowComponentsDocs` 进出页面状态恢复测试
  - 导入流程图后 `calculationParameters` 应用策略测试

---

## 11. 风险与依赖

1. **权限码变更影响**: 400→403 可能影响既有前端分支或外部调用方，建议前端过渡期兼容两种状态码
2. **导入策略变化**: 可能改变部分用户既有使用习惯，需要明确发布说明
3. **Demo 页重构**: 若改为独立 store，需梳理与现有面板组件的依赖关系
4. **BubbleMenu 修复范围**: 需确认 `showBubbleMenu` 字段是否还有其他消费方，避免改动引入副作用

### 交付物定义（DoD）

1. P0/P1 任务有明确代码改动与测试证明
2. 文档、错误语义、前端提示保持一致
3. 关键路径（新建 → 编辑 → 保存 → 导入 → 校验 → 计算 → 查看结果）回归通过
4. 当日 `updatenote` 记录已同步

---

## 12. 附录：审查涉及的核心文件清单

### 前端

| 文件路径 | 功能 |
|----------|------|
| `frontend/src/stores/flowStore.ts` | Material Balance 流程图状态管理（含 BUG-1） |
| `frontend/src/stores/createModelFlowStore.ts` | 模型流程图 store 工厂（含 P0-1） |
| `frontend/src/components/Flow/FlowLayout.tsx` | 流程图布局组件（BubbleMenu 渲染逻辑） |
| `frontend/src/components/Flow/menu/BaseBubbleMenu.tsx` | BubbleMenu 基础组件（含 BUG-2） |
| `frontend/src/components/HomePosthog/FlowComponentsDocs.tsx` | Demo 页面（含 P0-2） |
| `frontend/src/routes/_layout/udmModels.tsx` | UDM 模型库页面 |
| `frontend/src/routes/_layout/udmModelEditor.tsx` | UDM 模型编辑器路由 |
| `frontend/src/components/UDM/UDMModelEditorForm.tsx` | UDM 模型编辑表单（核心） |
| `frontend/src/components/UDM/UDMModelEditorDialog.tsx` | 流程图内嵌模型编辑弹窗 |
| `frontend/src/components/UDM/ExpressionCellEditorDialog.tsx` | 表达式单元格编辑器 |
| `frontend/src/components/UDM/HybridUDMSetupDialog.tsx` | Hybrid 配置对话框 |
| `frontend/src/components/Flow/inspectorbar/TimeSegmentPlanEditor.tsx` | 全局时段计划编辑器 |
| `frontend/src/components/Flow/inspectorbar/EdgeTimeSegmentEditor.tsx` | 边级时段编辑器 |
| `frontend/src/components/Flow/inspectorbar/UDMPropertyPanel.tsx` | UDM 属性面板 |
| `frontend/src/components/Flow/inspectorbar/UDMCalculationPanel.tsx` | UDM 计算参数面板 |
| `frontend/src/components/Flow/nodes/UDMNode.tsx` | UDM 节点组件 |
| `frontend/src/stores/udmFlowStore.ts` | UDM 流程图状态管理 |
| `frontend/src/services/udmService.ts` | UDM API 服务封装 |
| `frontend/src/utils/timeSegmentValidation.ts` | 时段校验工具 |
| `frontend/src/utils/hybridUdm.ts` | Hybrid 工具函数（含 F-3.3） |
| `frontend/src/types/hybridUdm.ts` | Hybrid 类型定义 |

### 后端

| 文件路径 | 功能 |
|----------|------|
| `backend/app/api/routes/udm.py` | UDM 计算与任务 API（含 P1-1） |
| `backend/app/api/routes/udm_models.py` | UDM 模型 CRUD API |
| `backend/app/api/routes/udm_flowcharts.py` | UDM 流程图 API（含 P1-2） |
| `backend/app/api/routes/udm_hybrid_configs.py` | Hybrid 配置 API（含 P1-2） |
| `backend/app/api/routes/flowcharts.py` | 通用流程图 API（含 P1-2） |
| `backend/app/services/udm_expression.py` | 表达式校验与求值引擎 |
| `backend/app/services/udm_seed_templates.py` | 模板种子数据 |
| `backend/app/services/hybrid_udm_validation.py` | Hybrid 校验服务 |
| `backend/app/services/time_segment_validation.py` | 时段校验服务 |
| `backend/app/material_balance/models.py` | 仿真 Pydantic 模型（含 P2-1） |
| `backend/app/material_balance/udm_ode.py` | UDM ODE 求解器 |
| `backend/app/material_balance/udm_engine.py` | UDM 计算引擎 |
