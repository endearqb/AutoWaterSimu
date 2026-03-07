# UDM Petersen 矩阵教程引导系统 — 开发计划

## Context

当前 AutoWaterSimu 的 UDM 系统已具备完整的工程闭环（模型库 → 矩阵编辑器 → 流程图 → 仿真），但缺乏教学引导能力。目标是在不重写 UDM 引擎的前提下，增加「教学编排层 + 引导交互层 + 学习反馈层」，让初级水处理工程师能按 L0-L9 的学习路径，逐步掌握 Petersen 矩阵建模。

依据文档：`docs/AutoWaterSimu_UDM_Petersen_开发文档.md` 和 `tasks/AutoWaterSimu_Flow_UDM_Tutorial.md`。

---

## 总体架构：三层教学化改造

```
┌─ 模板层 (/udmModels) ─────────────────────────────────────────┐
│  教程模板分组 · 进度卡片 · "继续学习"入口                       │
├─ 引导层 (/udmModelEditor) ────────────────────────────────────┤
│  Guided/Expert 模式 · Stepper · 字段锁定 · 配方按钮 · 讲解面板 │
├─ 反馈层 (/udm) ───────────────────────────────────────────────┤
│  预设仿真 · 结果解释卡 · 爆炸曲线排错 · 基线对比               │
└───────────────────────────────────────────────────────────────┘
```

---

## P0：教程模板入口与进度追踪（MVP）

### 目标
用户在 `/udmModels` 页面看到「教程模板」分组，点击即可开始某个章节的学习。学习进度持久化到 localStorage。

### 新建文件

| 文件 | 说明 |
|------|------|
| `frontend/src/data/tutorialLessons.ts` | 教程课程元数据定义（L0-L9 的 lessonKey、level、objectives、prerequisites、lockedFields、recipes、flowPreset 等） |
| `frontend/src/stores/tutorialProgressStore.ts` | Zustand store，管理学习进度（localStorage 持久化） |
| `frontend/src/components/UDM/TutorialLessonCard.tsx` | 教程课程卡片组件（显示目标、时长、先修、完成度、操作按钮） |
| `frontend/src/components/UDM/TutorialLessonsSection.tsx` | 教程模板分组区域组件（卡片列表 + "继续学习"入口） |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `frontend/src/routes/_layout/udmModels.tsx` | 在现有模板快速创建区域上方，插入 `<TutorialLessonsSection />` |
| `frontend/src/routes/_layout/udmModelEditor.tsx` | 支持 `lessonKey` search param，传入 editor 以激活教程模式 |
| `frontend/src/i18n/messages/zh.ts` | 新增 `flow.tutorial.*` i18n 键 |
| `frontend/src/i18n/messages/en.ts` | 同步英文翻译 |

### 数据结构

```typescript
// frontend/src/data/tutorialLessons.ts
interface TutorialLesson {
  lessonKey: string          // "L0_why_learn" | "L1_arrow_matrix" | ...
  level: number              // 0-9
  title: string              // i18n key
  subtitle: string           // i18n key
  objectives: string[]       // i18n keys
  prerequisites: string[]    // 先修 lessonKey 列表
  estimatedMinutes: number
  // 编辑器控制
  lockedFields?: string[]    // 锁定的字段路径
  initialComponents?: UDMComponentDefinition[]
  initialProcesses?: UDMProcessDefinition[]
  initialParameters?: UDMParameterDefinition[]
  recipes?: Recipe[]         // 预置的公式配方
  // 仿真预设
  flowPreset?: object        // 预设流程图 JSON
  chartPreset?: object       // 预设图表配置
  solverPreset?: object      // 预设求解器参数
  // 教学内容
  notes?: string[]           // 章节讲解内容 i18n keys
  misconceptions?: string[]  // 常见误区 i18n keys
}

// frontend/src/stores/tutorialProgressStore.ts
interface TutorialProgressState {
  completedLessons: string[]           // 已完成的 lessonKey
  currentLesson: string | null         // 当前进行中的课程
  lessonProgress: Record<string, {     // 每课的步骤进度
    currentStep: number
    completedSteps: number[]
    startedAt: string
  }>
  // Actions
  startLesson: (lessonKey: string) => void
  completeStep: (lessonKey: string, stepIndex: number) => void
  completeLesson: (lessonKey: string) => void
  resetLesson: (lessonKey: string) => void
  isLessonUnlocked: (lessonKey: string) => boolean
}
```

### 实现要点

1. **教程模板分组**：在 `/udmModels` 页面顶部新增教程区域，用卡片网格展示。卡片使用 Chakra `Box` + `Badge` + `Progress` 组件组合。
2. **进度持久化**：Zustand + `persist` middleware 写入 localStorage key `"tutorial-progress"`。
3. **课程解锁**：基于 `prerequisites` 检查 `completedLessons` 是否包含所有先修课程。
4. **"继续学习"**：读取 `currentLesson`，直接导航到 `/udmModelEditor?lessonKey=L2_first_matrix`。
5. **MVP 范围**：先实现 L1（箭头矩阵直觉）和 L2（第一张 2×3 矩阵）两个课程的完整数据，其余课程显示为"即将推出"。

---

## P1：Guided Mode 与 Stepper

### 目标
在 `/udmModelEditor` 中提供 Guided / Expert 双模式。Guided 模式下显示 stepper 分步引导，按章节锁定不必要字段，右侧展示讲解面板。

### 新建文件

| 文件 | 说明 |
|------|------|
| `frontend/src/components/UDM/tutorial/TutorialStepper.tsx` | 步骤指示器组件（组分 → 过程 → 系数 → 速率 → 参数 → 检查） |
| `frontend/src/components/UDM/tutorial/TutorialGuidePanel.tsx` | 右侧讲解面板（章节说明、样例思考过程、常见误区） |
| `frontend/src/components/UDM/tutorial/RecipeBar.tsx` | 配方快捷按钮栏（常见 stoich 配方、Monod 公式模板） |
| `frontend/src/components/UDM/tutorial/ArrowMatrixView.tsx` | L1 箭头模式组件（用箭头可视化展示反应过程的物质流向，不显示数字） |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `frontend/src/components/UDM/UDMModelEditorForm.tsx` | 核心改造 — 接收 `lessonKey` prop；增加 `mode` state (guided/expert)；Guided 模式下：(a) 顶部显示 stepper, (b) 按 `lockedFields` 锁定表格单元格, (c) 左右布局（左编辑器 + 右讲解面板）, (d) 显示 RecipeBar |
| `frontend/src/routes/_layout/udmModelEditor.tsx` | 从 search params 读取 `lessonKey`，传递给 `UDMModelEditorForm` |
| `frontend/src/i18n/messages/zh.ts` / `en.ts` | 新增 stepper 标签、讲解内容、配方名称等 i18n 键 |

### 实现要点

1. **Guided/Expert 切换**：在编辑器顶部 Header 区域加 `Switch` 组件。Expert 模式保持现有行为不变。通过 lessonKey 进入时默认 Guided。
2. **Stepper 组件**：使用 Chakra UI `Steps` 或自行用 `HStack` + `Box` + `Badge` 搭建 6 步：
   - Step 1: 定义组分 (Components)
   - Step 2: 定义过程 (Processes)
   - Step 3: 填写计量系数 (Stoichiometry)
   - Step 4: 编写速率方程 (Rate Expressions)
   - Step 5: 补充参数 (Parameters)
   - Step 6: 验证检查 (Validation)
3. **字段锁定**：`lockedFields` 数组包含如 `"components.*.name"`, `"processes.0.rateExpr"` 等路径。Guided 模式下匹配的表格单元格设为 `readOnly` + 灰色背景。
4. **配方按钮**：如 "Monod 开关"（插入 `S/(K+S)`）、"产率消耗"（插入 `-1/Y`）。点击后将模板插入当前编辑的表达式。
5. **右侧讲解面板**：根据当前 stepper 步骤 + lessonKey 显示对应内容。使用 `Box` 固定宽度 320px，滚动内容。
6. **布局调整**：Guided 模式下编辑器使用 `Flex` 水平布局：左侧表格区(flex=1) + 右侧讲解面板(w=320px)。Expert 模式保持全宽。

---

## P2：连续性检查与教学提示

### 目标
在模型编辑器中增加 COD/N/ALK 连续性自动检查，将检查结果以教学友好的方式呈现，帮助用户理解质量守恒。

### 新建文件

| 文件 | 说明 |
|------|------|
| `frontend/src/components/UDM/tutorial/ContinuityCheckPanel.tsx` | 连续性检查结果展示面板（COD/N/ALK 各行对账 + 教学解释） |
| `frontend/src/utils/continuityCheck.ts` | 前端连续性检查逻辑（基于 stoich 系数计算每个过程的 COD/N 守恒） |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `frontend/src/components/UDM/UDMModelEditorForm.tsx` | 在验证区域下方增加连续性检查面板；Stepper 第 6 步触发连续性检查 |
| `backend/app/services/udm_expression.py` | 扩展 validate 响应，增加 `continuityChecks` 字段（可选，P2 后期） |
| `frontend/src/i18n/messages/zh.ts` / `en.ts` | 连续性检查相关 i18n 键 |

### 实现要点

1. **COD 守恒检查**：对每个过程，将所有 COD 类组分（单位含 gCOD）的 stoich 系数求和，理论上应为 0（COD 既不被创造也不被消灭）。非零则提示用户检查。
2. **N 守恒检查**：对 N 类组分（单位含 gN）做同样的检查。
3. **ALK 守恒**：碱度变化应与氨氮/硝酸盐变化匹配。
4. **教学呈现**：
   - 每个过程一行，显示 COD 收支（如：`-1/Y_H (底物消耗) + 1 (菌体生成) + (1-1/Y_H)(氧消耗) = 0 ✓`）
   - 不平衡时用黄色/红色高亮，附带修正建议文字
   - 在 L3 课程中作为核心教学内容
5. **前端优先**：MVP 阶段在前端基于 stoich_expr 做符号级检查（解析表达式中的系数），后期可扩展到后端 validate 接口。

---

## P3：反馈层 — 预设仿真与结果解释

### 目标
在 `/udm` 流程图页面的教程模式下，提供预设的仿真场景、结果解释卡片、爆炸曲线排错清单、基线对比功能。

### 新建文件

| 文件 | 说明 |
|------|------|
| `frontend/src/components/UDM/tutorial/ResultInterpretationCard.tsx` | 仿真结果解释卡（将图表趋势翻译为工程语言） |
| `frontend/src/components/UDM/tutorial/ExplosionDebugChecklist.tsx` | 爆炸曲线排错清单组件（步长 → 边界截断 → 单位 → ...） |
| `frontend/src/components/UDM/tutorial/BaselineComparisonPanel.tsx` | 基线对比面板（当前结果 vs 模板默认结果） |
| `frontend/src/data/tutorialFlowPresets.ts` | 各课程的预设流程图数据（进水+CSTR+出水等场景） |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `frontend/src/routes/_layout/udm.tsx` | 教程模式下在 inspector 中新增"教程引导"tab，包含结果解释和排错清单 |
| `frontend/src/components/Flow/inspectorbar/SimulationPanel` | 教程模式下自动加载预设的 solver 参数 |
| `frontend/src/stores/udmFlowStore.ts` | 增加 `tutorialLessonKey` 状态，用于判断是否处于教程模式 |
| `frontend/src/i18n/messages/zh.ts` / `en.ts` | 结果解释文案、排错清单条目 |

### 实现要点

1. **预设流程图**：L1/L2 课程的流程图为"进水 → CSTR → 出水"最小场景，点击"生成流程图"后自动加载预设参数。
2. **结果解释卡**：运行仿真后弹出可折叠卡片，包含：
   - "你看到了什么"：曲线趋势的自然语言描述
   - "为什么"：背后的工程/生化原理
   - "如果不同"：偏差原因排查建议
3. **爆炸曲线排错**：检测到仿真结果中出现 NaN/Infinity 或极端值时，自动弹出排错清单：
   - Step 1: 检查步长（是否太大？）
   - Step 2: 检查速率方程边界（是否缺少开关函数？）
   - Step 3: 检查单位（时间基准是否统一？）
   - Step 4: 检查计量系数符号
4. **基线对比**：将教程模板的默认仿真结果存为基线数据，用户运行后可切换查看差异。

---

## 分阶段实施路线

```
P0 教程模板入口 ──→ P1 Guided Mode ──→ P2 连续性检查 ──→ P3 反馈层
  (5 files)           (6 files)          (3 files)         (6 files)
  ~3-4 天              ~5-7 天             ~2-3 天           ~4-5 天
```

每个阶段独立可部署，不破坏现有 Expert 模式功能。

---

## 关键设计原则

1. **Expert 模式零影响**：所有教程功能通过 `lessonKey` prop 和 `mode === "guided"` 条件控制，无 lessonKey 时完全不渲染教程 UI。
2. **前端优先**：MVP 不改后端 schema，教程元数据全部存前端 `tutorialLessons.ts`，进度存 localStorage。
3. **i18n 一等公民**：所有教程文案走 i18n，支持中英文切换。
4. **渐进增强**：L1-L2 先做完整闭环验证，L3-L9 后续迭代补充。
5. **复用现有组件**：表格编辑、表达式验证、仿真面板等全部复用现有实现，只在外层包裹教学控制逻辑。

---

## 验证方案

1. **P0 验证**：打开 `/udmModels`，能看到教程卡片区；点击 L2 课程，跳转到编辑器且预加载初始数据；关闭后重新打开，进度保留。
2. **P1 验证**：编辑器中能切换 Guided/Expert；Guided 模式下 stepper 可点击切换步骤；锁定字段不可编辑；右侧面板显示对应讲解。
3. **P2 验证**：在 L3 课程中修改 stoich 系数，连续性检查面板实时更新 COD 守恒结果；不平衡时显示修正建议。
4. **P3 验证**：从 L2 课程生成流程图后进入 `/udm`，预设参数已加载；运行仿真后看到结果解释卡；制造一个"爆炸"场景后看到排错清单。
5. **回归验证**：无 lessonKey 时，所有页面行为与当前完全一致（Expert 模式不受影响）。

---

## 涉及的关键现有文件参考

| 现有文件 | 为什么重要 |
|----------|-----------|
| `frontend/src/routes/_layout/udmModels.tsx` | 教程入口页面，需在模板区上方插入教程区 |
| `frontend/src/routes/_layout/udmModelEditor.tsx` | 需支持 lessonKey 路由参数 |
| `frontend/src/routes/_layout/udm.tsx` | 流程图页面，教程模式下增加引导 tab |
| `frontend/src/components/UDM/UDMModelEditorForm.tsx` | 核心编辑器表单，P1 阶段最大改造目标 |
| `frontend/src/components/UDM/ExpressionCellEditorDialog.tsx` | 表达式编辑器，配方按钮需与之集成 |
| `frontend/src/stores/udmStore.ts` | 参考其 Zustand 模式创建 tutorialProgressStore |
| `frontend/src/stores/udmFlowStore.ts` | 需增加教程模式状态 |
| `frontend/src/i18n/messages/zh.ts` | 所有教程文案的 i18n 入口 |
| `backend/app/services/udm_seed_templates.py` | 参考其 meta 字段结构扩展教程模板 |
| `backend/app/services/udm_expression.py` | P2 阶段可选扩展连续性检查 |
