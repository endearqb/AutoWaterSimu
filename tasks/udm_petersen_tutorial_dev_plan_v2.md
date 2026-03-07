# UDM Petersen 矩阵教程引导系统 — 综合开发计划 v2

> 本文档合并了《执行文档 v2》（任务拆解 + 页面原型 + API 改动）与《dev_plan》（代码级实现路径 + 文件映射），
> 形成"可排期、可设计、可开发、可联调"的一体化执行方案。

---

## 0. Context 与 MVP 目标

### 0.1 背景

当前 AutoWaterSimu 的 UDM 系统已具备完整工程闭环（模型库 → 矩阵编辑器 → 流程图 → 仿真），但缺乏教学引导能力。目标：在不重写 UDM 引擎的前提下，增加「教学编排层 + 引导交互层 + 学习反馈层」，将现有 UDM 改造为"能教、能练、能跑、能排错的 Petersen 学习系统"。

依据文档：
- `docs/AutoWaterSimu_UDM_Petersen_开发文档.md`
- `tasks/AutoWaterSimu_Flow_UDM_Tutorial.md`
- `tasks/AutoWaterSimu_UDM_Petersen_执行文档_v2.md`

### 0.2 产品边界

- 不新做独立的 Petersen 建模系统；
- 继续复用现有 UDM Models / UDM Model Editor / UDM Flow & Simulation 主链路；
- 所有教学功能作为 UDM 的增强层实现，Expert 模式零影响。

### 0.3 MVP 目标

让新用户在一次 30-60 分钟的学习中完成：
- 打开第 1-3 章模板；
- 在教学模式下理解矩阵行列含义；
- 修改一个 Y 或 Monod 相关参数；
- 执行一次连续性检查；
- 一键生成流程图并完成一次仿真；
- 看懂至少 3 条核心结果曲线。

---

## 1. 总体架构

```
┌─ 入口层 (/petersen) ──────────────────────────────────────────┐
│  学习路径地图 · 章节导航 · 最近学习 · 推荐路径                  │
├─ 模板层 (/udmModels) ─────────────────────────────────────────┤
│  教程模板筛选 · 卡片增强(章节/难度/类型) · 详情侧栏             │
├─ 引导层 (/udmModelEditor) ────────────────────────────────────┤
│  教学模式开关 · Step 1-5 · 字段可见性 · 配方插入 · 讲解面板     │
├─ 校验层 (validate API) ───────────────────────────────────────┤
│  连续性检查(COD/N/ALK) · 教学warning · 定位到行/列/单元格       │
├─ 反馈层 (/udm) ───────────────────────────────────────────────┤
│  预设仿真场景 · 推荐观测变量 · 教学解释卡 · 基线对比            │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. 版本与里程碑

### 2.1 版本切分

| 版本 | 目标 | 输出 |
|------|------|------|
| MVP | 打通"模板 → 编辑 → 校验 → 仿真"学习闭环 | 4 个模板、教学模式、连续性检查、教学型结果面板 |
| V1 | 覆盖教程主章节与常见场景 | 章节模板扩展到 8-10 个、分馏/硝化反硝化/校准模板、对比实验 |
| V2 | 教学管理与学习追踪 | 服务端学习进度、完成状态、内容配置后台、更多案例 |

### 2.2 Sprint 里程碑

| 里程碑 | 周期 | 对应 Epic | 验收重点 |
|--------|------|-----------|----------|
| M1 模板库与入口 | Sprint 1 | Epic 01 + Epic 05(部分) | 用户能找到并打开章节模板 |
| M2 教学模式编辑器 | Sprint 2 | Epic 02 | 用户能按步骤完成编辑与保存 |
| M3 连续性检查 | Sprint 3 | Epic 03 | 用户能看到可解释的守恒检查结果 |
| M4 仿真闭环 | Sprint 4 | Epic 04 | 用户能从模板一键跑到结果图 |
| M5 进阶模板 | Sprint 5 | Epic 05(剩余) | 支持分馏、硝化反硝化、校准实验 |

---

## 3. Epic 级任务拆解

---

### Epic 01：学习入口与模板体系

**目标**：建立章节模板库、学习入口页、从教程直接进入模型的入口。

#### 任务清单

| ID | 优先级 | 任务 | 角色 | 依赖 | 输出/验收 |
|----|--------|------|------|------|-----------|
| E01-T01 | P0 | 扩展 `meta.learning` 数据结构 | 后端 | 无 | 模型可携带 chapter/difficulty/templateType 等元数据 |
| E01-T02 | P0 | 补齐 4 个 MVP 种子模板 | 后端/内容 | T01 | chapter-1 / chapter-2 / chapter-3 / chapter-7 |
| E01-T03 | P0 | 前端教程课程元数据定义 | 前端 | T01 | `tutorialLessons.ts` 中定义 L0-L9 的元数据 |
| E01-T04 | P0 | 学习进度 Zustand store | 前端 | 无 | localStorage 持久化进度管理 |
| E01-T05 | P0 | `/udmModels` 页面增加教程模板分组区域 | 前端 | T02,T03 | 可按章节浏览教程模板 |
| E01-T06 | P0 | 模板卡片增强（章节/难度/时长/类型/CTA 按钮） | 前端 | T01 | 用户一眼区分模板用途 |
| E01-T07 | P1 | 新增学习入口页 `/petersen` | 前端 | T02,T04 | 展示章节地图、推荐路径、最近学习 |
| E01-T08 | P1 | 模板详情侧栏/弹窗 | 前端 | T01 | 展示学习目标、常见错误、推荐下一章 |
| E01-T09 | P1 | 教程内容资源配置落地成 JSON/TS | 内容 | T01 | 教学文案不硬编码在页面中 |
| E01-T10 | P1 | 权限与发布策略（系统模板只读/个人模型可克隆） | 后端 | T01 | 系统模板可只读，个人模型可克隆编辑 |

#### 新建文件

| 文件路径 | 说明 |
|----------|------|
| `frontend/src/data/tutorialLessons.ts` | 教程课程元数据（L0-L9 的 lessonKey、level、objectives、prerequisites 等） |
| `frontend/src/data/tutorialChapters.ts` | 章节地图配置（章节关系、推荐路径、难度梯度） |
| `frontend/src/stores/tutorialProgressStore.ts` | Zustand store + persist middleware，管理学习进度 |
| `frontend/src/components/UDM/TutorialLessonCard.tsx` | 教程课程卡片组件 |
| `frontend/src/components/UDM/TutorialLessonsSection.tsx` | 教程模板分组区域（卡片列表 + "继续学习"入口） |
| `frontend/src/routes/_layout/petersen.tsx` | 学习入口页路由（P1） |
| `frontend/src/components/UDM/tutorial/LearningPathMap.tsx` | 知识地图组件（P1） |
| `frontend/src/components/UDM/tutorial/RecentLearningPanel.tsx` | 最近学习面板（P1） |
| `frontend/src/components/UDM/tutorial/TemplateLearningDrawer.tsx` | 模板详情侧栏（P1） |

#### 修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `frontend/src/routes/_layout/udmModels.tsx` | 在模板快速创建区域上方插入 `<TutorialLessonsSection />`；增加 Petersen 筛选条件 |
| `frontend/src/routes/_layout/udmModelEditor.tsx` | 支持 `lessonKey` / `chapter` search param |
| `frontend/src/i18n/messages/zh.ts` | 新增 `flow.tutorial.*` / `flow.petersen.*` i18n 键 |
| `frontend/src/i18n/messages/en.ts` | 同步英文翻译 |
| `backend/app/services/udm_seed_templates.py` | 新增 4 个 MVP 教程种子模板（含 `meta.learning`） |
| `backend/app/models.py` | `meta.learning` 结构在文档/注释中明确（JSON 字段，无 schema 变更） |

#### 交付标准
- UDM Models 中可以筛出 Petersen 教程模板；
- 模板卡片能分辨练习版、答案版、案例版；
- 用户能从模板一键进入编辑器；
- 学习进度在 localStorage 持久化。

---

### Epic 02：教学模式编辑器

**目标**：把现有 `UDMModelEditorForm` 变成"分步骤教学版矩阵编辑器"。

#### 任务清单

| ID | 优先级 | 任务 | 角色 | 依赖 | 输出/验收 |
|----|--------|------|------|------|-----------|
| E02-T01 | P0 | 设计 `LearningModeConfig` 前端状态结构 | 前端 | E01-T01 | 支持 chapter、step、可见区块、锁定字段 |
| E02-T02 | P0 | 编辑器顶部增加"教学模式开关 + Step 导航" | 前端 | T01 | 可切换 Step 1-5，Expert 模式保持原样 |
| E02-T03 | P0 | Step 1 仅显示 Components / Processes | 前端 | T01 | 初学者不先看到全部公式/参数 |
| E02-T04 | P0 | Step 2 显示 stoich 表格与箭头提示 | 前端 | T01 | 支持符号/箭头占位和数字输入 |
| E02-T05 | P0 | Step 3 显示 rate expression 区与公式片段插入 | 前端 | T01 | 用户可插入 Monod / 开关函数模板 |
| E02-T06 | P0 | Step 4 显示参数表与自动抽取参数 | 前端/后端 | T01 | 从公式提取参数并合并参数区 |
| E02-T07 | P1 | Step 5 开放高级字段与自由编辑 | 前端 | T01 | 教学模式可平滑过渡到工程模式 |
| E02-T08 | P0 | 增加章节引导卡片/讲解面板 | 前端/内容 | E01-T09 | 每章显示目标、概念、常见错误 |
| E02-T09 | P1 | 行级"故事解释 / 常见错误 / 参考写法" | 前端/内容 | E01-T09 | 每个过程行可获得教学辅助 |
| E02-T10 | P0 | Validation issue 映射到具体 process/component/cell | 前端 | API 改动 | 点选错误能跳到具体单元格 |
| E02-T11 | P1 | 自动保存教学进度（localStorage） | 前端 | T01 | 返回时能恢复上次 step |

#### Step 可见性矩阵

| 区块 | Step 1 | Step 2 | Step 3 | Step 4 | Step 5 |
|------|--------|--------|--------|--------|--------|
| Components | 显示 | 显示 | 显示 | 显示 | 显示 |
| Processes | 显示 | 显示 | 显示 | 显示 | 显示 |
| Stoich | 隐藏/箭头提示 | **显示** | 显示 | 显示 | 显示 |
| Rate Expressions | 隐藏 | 隐藏/只读 | **显示** | 显示 | 显示 |
| Parameters | 隐藏 | 隐藏 | 隐藏/自动抽取 | **显示** | 显示 |
| Advanced Fields | 隐藏 | 隐藏 | 隐藏 | 隐藏 | **显示** |

#### 新建文件

| 文件路径 | 说明 |
|----------|------|
| `frontend/src/components/UDM/tutorial/TutorialStepper.tsx` | Step 导航组件（Step 1-5 指示器） |
| `frontend/src/components/UDM/tutorial/TutorialGuidePanel.tsx` | 右侧/左侧讲解面板（章节说明 + 当前 Step 要点 + 常见误区） |
| `frontend/src/components/UDM/tutorial/RecipeBar.tsx` | 配方快捷按钮栏（Monod 开关、产率消耗、开关函数等） |
| `frontend/src/components/UDM/tutorial/ArrowMatrixView.tsx` | L1 箭头模式（用箭头可视化物质流向，不显示数字） |
| `frontend/src/components/UDM/tutorial/ProcessTeachingPopover.tsx` | 行级教学弹出（故事解释 + 常见错误） |
| `frontend/src/components/UDM/tutorial/ChapterGuideCard.tsx` | 章节引导卡片 |

#### 修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `frontend/src/components/UDM/UDMModelEditorForm.tsx` | **核心改造**：接收 `lessonKey` prop → 增加 `mode` state (guided/expert) → Guided 模式下按 Step 控制区块可见性 → 显示 stepper + 讲解面板 + 配方栏 → 字段锁定逻辑 |
| `frontend/src/components/UDM/ExpressionCellEditorDialog.tsx` | 集成配方插入功能（从 RecipeBar 选择后填入表达式） |
| `frontend/src/routes/_layout/udmModelEditor.tsx` | 从 search params 读取 `lessonKey`/`chapter`，传递给 editor |
| `frontend/src/i18n/messages/zh.ts` / `en.ts` | stepper 标签、讲解内容、配方名称、行级教学文案 |

#### 布局设计

```
教学模式 ON:
+---------------------------+-----------------------------+--------------------+
| 左侧教学区 (w=280px)      | 中间编辑区 (flex=1)          | 右侧校验区 (w=300px)|
| - 学习目标                | [Step 导航条]                | Validation issues  |
| - 当前 Step 说明          | Components 表格              | Continuity checks  |
| - 常见错误                | Processes 表格               | Why / How to fix   |
| - 教程链接                | Stoich Matrix                | [Jump to cell]     |
|                           | Rate Expressions             |                    |
|                           | Parameters                   |                    |
|                           | [配方快捷栏]                 |                    |
+---------------------------+-----------------------------+--------------------+

Expert 模式（现有布局不变）:
+----------------------------------------------------------------+
| Components / Processes / Stoich / Rate / Parameters 全宽显示     |
+----------------------------------------------------------------+
```

#### 交付标准
- Step 1-5 能正常切换；
- 用户在不同 Step 只看到当前应学内容；
- 错误提示能定位到行/列/单元格；
- 教程提示区与矩阵编辑区联动；
- Expert 模式行为完全不受影响。

---

### Epic 03：Petersen 连续性检查

**目标**：把 COD/N/ALK 守恒做成教学反馈核心能力，而非纯技术报错。

#### 任务清单

| ID | 优先级 | 任务 | 角色 | 依赖 | 输出/验收 |
|----|--------|------|------|------|-----------|
| E03-T01 | P0 | 扩展 component 的 `conversion_factors` 结构 | 后端 | E01-T01 | 每个组分可声明对 COD/N/ALK 的换算系数 |
| E03-T02 | P0 | 设计 `ContinuityCheckItem` 返回结构 | 后端 | T01 | processName、dimension、balanceValue、status、explanation |
| E03-T03 | P0 | 新增 `PetersenContinuityService` | 后端 | T01-T02 | 支持 COD / N / ALK 检查 |
| E03-T04 | P0 | 支持 `strict / teaching / off` 三种模式 | 后端 | T03 | 教学简化模型返回 warning 而非 error |
| E03-T05 | P0 | 将 continuity 结果挂入 validate 响应 | 后端 | T03 | 编辑器可直接消费 `continuity_checks` |
| E03-T06 | P0 | 前端新增 Continuity 面板 | 前端 | T05 | 按维度查看逐过程检查结果 |
| E03-T07 | P0 | 每条 continuity item 支持"跳到该过程" | 前端 | T05 | 点击后高亮对应过程行 |
| E03-T08 | P1 | 增加"为什么错 / 怎么改 / 去看哪章"教学文案 | 内容/前端 | E01-T09 | 错误提示具有教学闭环 |
| E03-T09 | P1 | 容差配置与简化矩阵白名单 | 后端 | T03 | 避免教学模型误报 |
| E03-T10 | P1 | 守恒检查单元测试 + 示例模板回归测试 | QA/后端 | T03-T09 | 典型模板在 strict/teaching 模式下结果稳定 |

#### 新建文件

| 文件路径 | 说明 |
|----------|------|
| `frontend/src/components/UDM/tutorial/ContinuityCheckPanel.tsx` | 连续性检查结果展示面板（逐过程 COD/N/ALK 对账 + 教学解释） |
| `frontend/src/utils/continuityCheck.ts` | 前端辅助：解析 stoich_expr 做符号级预检查（轻量版） |
| `backend/app/services/petersen_continuity.py` | 后端连续性检查服务（核心逻辑） |

#### 修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `backend/app/services/udm_expression.py` | 扩展 `validate_definition()` 调用连续性检查；响应增加 `continuity_checks` 字段 |
| `backend/app/models.py` | `UDMValidationResponse` 增加 `continuity_checks` 可选字段 |
| `frontend/src/components/UDM/UDMModelEditorForm.tsx` | 验证区域下方渲染 `ContinuityCheckPanel`；Stepper 第 5 步(验证)触发 |
| `frontend/src/i18n/messages/zh.ts` / `en.ts` | 连续性检查相关 i18n 键 |

#### 教学呈现设计

每个过程一行，展示守恒对账：
```
好氧生长 | COD: -1/Y_H(底物) + 1(菌体) + (1-1/Y_H)(氧) = 0 ✓
衰 减    | COD: -1(菌体) + f_P(惰性) + (1-f_P)(氧) = 0 ✓
硝 化    | N:   -i_XB(固定) - 1/Y_A(氨氮) + 1/Y_A(硝酸) = -0.02 ⚠️
         |      [教学简化：省略了 X_ND 列，严格模式下需补齐]
```

#### 交付标准
- `validate` 响应中包含 `continuity_checks`；
- 至少支持 COD 与 N 的逐过程检查；
- 教学模式能识别"简化模型缺列"并返回 warning 而非 error；
- 前端可查看、定位、理解错误。

---

### Epic 04：一键仿真闭环与教学型结果页

**目标**：让学习者从矩阵编辑顺滑进入仿真，并看懂结果。

#### 任务清单

| ID | 优先级 | 任务 | 角色 | 依赖 | 输出/验收 |
|----|--------|------|------|------|-----------|
| E04-T01 | P0 | `saveAndGenerateFlowchart` 补齐默认场景映射 | 前端/后端 | E01-T02 | 模板可生成 Input → Reactor → Output 默认流图 |
| E04-T02 | P0 | 流程图默认参数/初值/运行时长配置 | 后端/内容 | T01 | 不需要用户手工补全即可跑通 |
| E04-T03 | P0 | 结果页增加"推荐观测变量"区 | 前端 | T02 | 默认展示 S/X/DO/NH4/NO3/OUR |
| E04-T04 | P0 | 结果页增加"教学解释卡" | 前端/内容 | T03 | 例如"Y 降低为什么 OUR 增加" |
| E04-T05 | P0 | 爆炸曲线排错清单 | 前端/内容 | 无 | 检测 NaN/极端值时自动弹出排错引导 |
| E04-T06 | P1 | baseline vs modified 对比模式 | 前端/后端 | T03 | 可对比两次参数设置结果 |
| E04-T07 | P1 | 参数滑条实验（Y、DO、进水分馏） | 前端 | T03 | 用户可做敏感性试验 |
| E04-T08 | P1 | 预设 scenario 切换（基础 CSTR / 硝化 / 反硝化） | 后端/前端 | E01-T09 | 模板可快速切换实验场景 |
| E04-T09 | P1 | 章节完成提示与下一步推荐 | 前端 | E02-T11 | 完成仿真后引导进入下一章 |

#### 新建文件

| 文件路径 | 说明 |
|----------|------|
| `frontend/src/components/UDM/tutorial/ResultInterpretationCard.tsx` | 仿真结果解释卡（曲线趋势 → 工程语言） |
| `frontend/src/components/UDM/tutorial/ExplosionDebugChecklist.tsx` | 爆炸曲线排错清单（步长→边界截断→单位→系数符号） |
| `frontend/src/components/UDM/tutorial/BaselineComparisonPanel.tsx` | 基线对比面板 |
| `frontend/src/components/UDM/tutorial/RecommendedChartsPanel.tsx` | 推荐观测变量与图表面板 |
| `frontend/src/components/UDM/tutorial/ScenarioQuickActions.tsx` | 场景快捷切换（P1） |
| `frontend/src/data/tutorialFlowPresets.ts` | 各课程的预设流程图数据 |
| `frontend/src/data/tutorialInsights.ts` | 各课程的教学解释文案配置 |

#### 修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `frontend/src/routes/_layout/udm.tsx` | 教程模式下 inspector 新增"教程引导" tab |
| `frontend/src/components/Flow/inspectorbar/SimulationPanel.tsx` | 教程模式下自动加载预设 solver 参数 |
| `frontend/src/stores/udmFlowStore.ts` | 增加 `tutorialLessonKey` / `tutorialChapter` 状态 |
| `frontend/src/i18n/messages/zh.ts` / `en.ts` | 结果解释文案、排错清单条目 |

#### 交付标准
- 模板可一键转成默认流程图；
- 至少有 1 个基础 CSTR 场景可直接运行；
- 结果页默认展示关键曲线和解释卡；
- 检测到爆炸曲线时自动显示排错清单；
- 用户不需要额外配置即可看到第一次仿真结果。

---

### Epic 05：内容配置、测试与运营准备

**目标**：保证教学内容可维护，系统可测试，后续可扩展。

#### 任务清单

| ID | 优先级 | 任务 | 角色 | 依赖 | 输出/验收 |
|----|--------|------|------|------|-----------|
| E05-T01 | P0 | 建立 chapters / hints / scenarios 配置目录规范 | 内容 | E01-T09 | 内容配置可复用可维护 |
| E05-T02 | P0 | 首批章节提示文案编写 | 内容 | T01 | 覆盖第 1-3、7 章 |
| E05-T03 | P0 | 首批模板验算与答案校核 | 内容/后端 | E01-T02 | 模板数值逻辑可用 |
| E05-T04 | P1 | 教程深链（chapter/section）映射 | 前端/内容 | T01 | 错误提示可跳到教程章节 |
| E05-T05 | P1 | 埋点方案（开始学习、首次通过校验、首次仿真） | 前端 | 基础功能完成 | 可评估学习闭环转化 |
| E05-T06 | P1 | V1 模板扩展：分馏、硝化/反硝化、校准 | 内容/后端 | MVP 完成 | 模板体系从 4 个扩展到 8-10 个 |

#### MVP 首批 4 个模板

| 模板标识 | 章节 | 类型 | 核心教学点 |
|----------|------|------|-----------|
| `chapter-1_arrow_matrix_exercise` | 第 1 章 | 练习 | 箭头直觉：谁增加谁减少 |
| `chapter-2_basic_growth_exercise` | 第 2 章 | 练习 | Y + Monod + 2×3 矩阵闭环 |
| `chapter-3_continuity_check_exercise` | 第 3 章 | 练习 | COD/N 连续性对账 |
| `chapter-7_basic_cstr_case` | 第 7 章 | 案例 | 基础 CSTR 仿真闭环 |

---

## 4. 页面原型说明

### 4.1 页面 A：学习入口页 `/petersen`（P1）

```
+-----------------------------------------------------------+
| Hero: Petersen 矩阵学习路径            [从第1章开始]       |
| 从直觉理解到在线仿真                    [继续上次学习]     |
+-----------------------------------------------------------+
| 知识地图： 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 |
|           ★    ★    ★                   ★   (MVP可用)      |
+-----------------------------------------------------------+
| [第1章卡片] [第2章卡片] [第3章卡片] [第7章卡片] ...        |
| 章节名 / 难度 / 时间 / 前置 / 模板数 / CTA                |
+-----------------------------------------------------------+
| 最近学习                  | 推荐路径                       |
| 最近模板 / 校验 / 仿真    | 新手路径 | 工艺路径             |
+-----------------------------------------------------------+
```

关键交互：
- 点击章节卡片进入该章模板列表；
- 前置未完成的章节仍可进入，但给出提示不强制阻塞；
- "继续上次学习"恢复到最近模板和 step。

### 4.2 页面 B：模板库页 `/udmModels`（增强，P0）

```
+----------------------------------------------------------------+
| 筛选栏: [Petersen/All] [Chapter▼] [Difficulty▼] [Type▼]        |
+----------------------------------------------------------------+
| 教程模板区（新增）                                              |
| [第1章:箭头矩阵] [第2章:基础生长] [第3章:守恒检查] [第7章:CSTR] |
|  练习 · 20min      练习 · 25min     练习 · 20min    案例 · 30min|
|  [开始学习]        [开始学习]        [开始学习]      [运行案例]  |
+----------------------------------------------------------------+
| 模板快速创建（现有）                                            |
| ASM1 / ASM1Slim / ASM3                                         |
+----------------------------------------------------------------+
| 我的模型（现有）                                                |
+----------------------------------------------------------------+
```

### 4.3 页面 C：教学模式编辑器 `/udmModelEditor`（P0-P1）

```
+--------------------------------------------------------------------------------+
| 模板名 [Chapter-2] [教学模式 ON/OFF] [Step1][Step2][Step3][Step4][Step5]        |
| [Validate] [Save] [Save & Generate Flowchart] [← 返回模板库]                   |
+--------------------------+--------------------------------+--------------------+
| 左侧教学区 (280px)       | 中间编辑区 (flex=1)            | 右侧校验区 (300px)  |
| ┌──────────────┐         | ┌────────────────────────┐    | Validation issues  |
| │ 学习目标     │         | │ Components 表格        │    | ├─ error: Y_H未定义│
| │ • 理解 Y_H   │         | │ Processes 表格         │    | │  [跳到参数区]    │
| │ • 写出 Monod │         | │ Stoich Matrix          │    | ├─ warn: COD不守恒 │
| ├──────────────┤         | │ Rate Expressions       │    | │  [跳到好氧生长行] │
| │ 当前Step说明  │         | │ Parameters             │    | │  为什么错？      │
| │ Step2:填系数  │         | ├────────────────────────┤    | │  怎么改？        │
| ├──────────────┤         | │ [配方栏] Monod | -1/Y  │    | │  去看哪章？      │
| │ 常见错误     │         | └────────────────────────┘    | └─────────────────│
| │ • 把S_O写正  │         |                                |                    |
| └──────────────┘         |                                |                    |
+--------------------------+--------------------------------+--------------------+
```

### 4.4 页面 D：仿真页 `/udm`（增强，P0-P1）

```
+----------------------------------------------------------------------------+
| 模板: Chapter-7 基础 CSTR   场景: basic_cstr   [Run] [对比实验] [改Y值]    |
+-----------------------------------+----------------------------------------+
| 流程图画布                        | Inspector                              |
| [Input] → [Reactor] → [Output]   | 参数 / 计算 / 仿真 / [教程引导]       |
+-----------------------------------+----------------------------------------+
| 结果区                                                                     |
| [S vs time] [X vs time] [DO/OUR] [NH4/NO3]  ← 推荐观测变量                 |
| ┌──────────────────────────────────────────────────────┐                   |
| │ 教学解释卡                                           │                   |
| │ 你看到了什么：S 浓度从 200 下降到 ~5 mg/L 后稳定      │                   |
| │ 为什么：好氧生长过程持续消耗基质，直到 Monod 限速      │                   |
| │ 如果你的不同：检查进水浓度和 Y_H 设置                  │                   |
| └──────────────────────────────────────────────────────┘                   |
+----------------------------------------------------------------------------+
```

---

## 5. 数据结构

### 5.1 前端：教程课程元数据

```typescript
// frontend/src/data/tutorialLessons.ts

interface TutorialLesson {
  lessonKey: string          // "chapter-1" | "chapter-2" | ...
  level: number              // 0-9
  title: string              // i18n key
  subtitle: string           // i18n key
  difficulty: "beginner" | "intermediate" | "full"
  templateType: "guide" | "exercise" | "answer" | "case"
  objectives: string[]       // i18n keys
  prerequisites: string[]    // 先修 lessonKey 列表
  estimatedMinutes: number

  // 编辑器控制
  stepConfig: {
    defaultStep: number      // 默认起始 step
    maxStep: number          // 最大可用 step
  }
  lockedFields?: string[]    // 锁定字段路径
  initialComponents?: UDMComponentDefinition[]
  initialProcesses?: UDMProcessDefinition[]
  initialParameters?: UDMParameterDefinition[]
  recipes?: Recipe[]         // 预置公式配方

  // 仿真预设
  defaultScenario?: string   // "cstr_basic" | "nitrification" | ...
  flowPreset?: object        // 预设流程图 JSON
  solverPreset?: object      // 预设求解器参数
  recommendedCharts?: string[] // 推荐观测变量

  // 教学内容
  hintRefs?: string[]        // 提示资源引用
  notes?: string[]           // 章节讲解 i18n keys
  misconceptions?: string[]  // 常见误区 i18n keys
  continuityProfiles?: string[] // 需检查的守恒维度

  // 教学解释
  teachingInsights?: Array<{
    title: string            // i18n key
    body: string             // i18n key
  }>
}

interface Recipe {
  name: string               // i18n key
  category: "monod" | "stoich" | "switch"
  template: string           // 表达式模板，如 "S/(K+S)"
  description: string        // i18n key
}
```

### 5.2 前端：学习进度 Store

```typescript
// frontend/src/stores/tutorialProgressStore.ts

interface TutorialProgressState {
  completedLessons: string[]
  currentLesson: string | null
  lessonProgress: Record<string, {
    currentStep: number
    completedSteps: number[]
    startedAt: string
    lastOpenedAt: string
    validatePassed: boolean
    simulationRanAt: string | null
  }>

  // Actions
  startLesson: (lessonKey: string) => void
  completeStep: (lessonKey: string, stepIndex: number) => void
  completeLesson: (lessonKey: string) => void
  resetLesson: (lessonKey: string) => void
  isLessonUnlocked: (lessonKey: string) => boolean
  getRecentLessons: () => string[]
}
// 使用 Zustand persist middleware → localStorage key: "tutorial-progress"
```

### 5.3 后端：`meta.learning` 扩展

```json
{
  "meta": {
    "source": "seed-template",
    "learning": {
      "track": "petersen",
      "chapter": "chapter-2",
      "chapterTitle": "你的第一张真矩阵",
      "difficulty": "beginner",
      "templateType": "exercise",
      "estimatedMinutes": 25,
      "prerequisites": ["chapter-1"],
      "stepConfig": { "defaultStep": 2, "maxStep": 4 },
      "hintRefs": ["petersen/ch2/yield", "petersen/ch2/monod"],
      "continuityProfiles": ["COD"],
      "defaultScenario": "cstr_basic",
      "recommendedCharts": ["S", "X", "OUR"],
      "readonlyMode": false
    }
  }
}
```

### 5.4 后端：component `conversion_factors` 扩展

```json
{
  "name": "S_O",
  "label": "Dissolved Oxygen",
  "unit": "gO2/m3",
  "default_value": 2.0,
  "conversion_factors": { "COD": -1.0, "N": 0.0, "ALK": 0.0 },
  "teaching_note": "溶解氧在 COD 守恒中用等价换算处理"
}
```

### 5.5 后端：process `teaching` 扩展

```json
{
  "name": "Aerobic growth",
  "rate_expr": "u_H * S_S/(K_S+S_S) * S_O/(K_OH+S_O) * X_BH",
  "stoich_expr": { "S_S": "-1/Y_H", "X_BH": "1", "S_O": "-(1-Y_H)/Y_H" },
  "teaching": {
    "story": "食物减少、菌体增加、氧气减少",
    "commonMistakes": ["把 S_O 写成增加", "把 -1/Y_H 写成 -Y_H"],
    "tutorialRef": "chapter-2",
    "hintRefs": ["petersen/ch2/yield"]
  }
}
```

### 5.6 后端：validate 响应扩展

```json
{
  "ok": false,
  "errors": [
    {
      "code": "UNDEFINED_PARAMETER",
      "message": "Y_H 未定义",
      "process": "Aerobic growth",
      "location": {
        "section": "parameters",
        "parameterName": "Y_H"
      }
    }
  ],
  "warnings": [],
  "extracted_parameters": ["u_H", "K_S", "Y_H"],
  "continuity_checks": [
    {
      "processName": "Aerobic growth",
      "dimension": "COD",
      "balanceValue": 0.0,
      "status": "pass",
      "explanation": "该过程在 COD 维度守恒"
    },
    {
      "processName": "Decay",
      "dimension": "COD",
      "balanceValue": -0.2,
      "status": "warn",
      "explanation": "教学简化模型省略了 XS/XP 列",
      "suggestion": "若要严格守恒，请补充 decay products 相关组分"
    }
  ]
}
```

---

## 6. API 改动清单

### 6.1 现有接口扩展（MVP 推荐）

| 接口 | 改动 |
|------|------|
| `GET /udm-models` | 新增 query 参数：`track`, `chapter`, `difficulty`, `template_type`, `include_learning` |
| `GET /udm-models/{id}` | 响应中包含完整 `meta.learning` + component `conversion_factors` + process/parameter `teaching` |
| `POST /udm-models` | 请求体支持 `meta.learning` 字段 |
| `PUT /udm-models/{id}` | 支持更新 `meta.learning`（merge patch） |
| `POST /udm-models/validate` | 请求体新增 `validation_mode` + `context`；响应新增 `continuity_checks` + issue `location` |
| `POST /udm-flowcharts` | 请求体新增 `scenario` + `include_default_runtime`；响应新增 `recommended_outputs` |

### 6.2 新增接口（V1/V2 可选）

| 接口 | 用途 |
|------|------|
| `GET /petersen/chapters` | 获取章节目录、前置关系、推荐路径 |
| `GET /petersen/chapters/{id}` | 单章详情、常见错误、推荐模板 |
| `GET /petersen/hints/{id}` | 按需加载提示文案，避免首次加载过重 |
| `POST /petersen/progress` | 记录学习进度（服务端持久化） |

### 6.3 错误码与 location 规范

| 级别 | 用途 | 页面表现 |
|------|------|----------|
| error | 必须修改 | 红色，阻断保存/生成 |
| warn | 建议修正（教学简化） | 橙色，不阻断 |
| info | 说明性提示 | 蓝色，不阻断 |

location 结构：
```json
{
  "location": {
    "section": "stoich",
    "processName": "Aerobic growth",
    "componentName": "S_O",
    "cellKey": "Aerobic growth:S_O"
  }
}
```

### 6.4 兼容策略

- 所有新增字段做成可选，不影响旧前端；
- 非教学模板的 `meta.learning` 为 null/空；
- 未传 `validation_mode` 时沿用旧逻辑；
- 未配置 `conversion_factors` 的组分不强制 continuity 检查。

---

## 7. 页面间跳转关系

```
/petersen (P1)
  → /udmModels?track=petersen&chapter=chapter-1
  → /udmModelEditor?modelId=xxx&learningMode=1&chapter=chapter-1
  → /udm?flowchartId=xxx&sourceTemplate=chapter-1
  → /petersen (完成后回到入口，显示下一章推荐)
```

---

## 8. 设计原则

1. **Expert 模式零影响**：所有教程功能通过 `lessonKey`/`chapter` prop 和 `mode === "guided"` 条件控制，无教学参数时完全不渲染教程 UI。
2. **后端可选**：MVP 阶段教程元数据可全存前端 `tutorialLessons.ts`，后端仅需在种子模板的 `meta` JSON 中填充 `learning` 字段。连续性检查为后端必做项。
3. **i18n 一等公民**：所有教程文案走 i18n（`flow.tutorial.*` / `flow.petersen.*`），支持中英文。
4. **渐进增强**：chapter-1/2/3/7 先做完整闭环验证，其余章节后续迭代。
5. **复用优先**：表格编辑、表达式验证、仿真面板等全部复用现有实现，只在外层包裹教学控制逻辑。
6. **内容与代码分离**：教学文案、提示资源、常见错误等存配置文件/JSON，不硬编码在组件中。

---

## 9. 验证方案

### MVP 验收清单

**产品与内容**
- [ ] 至少有 4 个模板：第 1 / 2 / 3 / 7 章
- [ ] 每个模板都有学习目标、前置知识、预计时间、常见错误
- [ ] 至少 1 个练习版 + 1 个答案版模板配对

**前端**
- [ ] `/udmModels` 支持教程模板分组与筛选
- [ ] `/udmModelEditor` 支持教学模式与 Step 切换
- [ ] Validate 结果可跳到具体行/列/单元格
- [ ] `/udm` 结果页有推荐观测变量和教学解释卡
- [ ] 爆炸曲线排错清单可触发

**后端**
- [ ] 模型 meta 支持 `meta.learning`
- [ ] validate 响应支持 `continuity_checks`
- [ ] 默认流程图可按模板生成
- [ ] 模板种子可初始化

**体验**
- [ ] 新用户 10 分钟内能完成首次保存和验证
- [ ] 15 分钟内能生成默认流程图
- [ ] 20 分钟内能看到仿真结果
- [ ] 教学 warning 与 strict error 的区别可验证

**回归**
- [ ] 无 lessonKey/chapter 时，所有页面行为与当前完全一致

---

## 10. 关键现有文件参考

| 现有文件 | 为什么重要 |
|----------|-----------|
| `frontend/src/routes/_layout/udmModels.tsx` | 教程入口，需在模板区上方插入教程分组 |
| `frontend/src/routes/_layout/udmModelEditor.tsx` | 需支持 lessonKey/chapter 路由参数 |
| `frontend/src/routes/_layout/udm.tsx` | 流程图页面，教程模式下增加引导 tab |
| `frontend/src/components/UDM/UDMModelEditorForm.tsx` | 核心编辑器（~1600行），Epic 02 最大改造目标 |
| `frontend/src/components/UDM/ExpressionCellEditorDialog.tsx` | 表达式编辑器，配方按钮需与之集成 |
| `frontend/src/components/UDM/HybridUDMSetupDialog.tsx` | 参考其 Tabs + 多步骤 UI 模式 |
| `frontend/src/stores/udmStore.ts` | 参考 Zustand `create()` + `devtools()` 模式 |
| `frontend/src/stores/udmFlowStore.ts` | 需增加教程模式状态 |
| `frontend/src/i18n/messages/zh.ts` | `flow.udmEditor` (L1069) / `flow.udmModels` (L1234) 附近插入 |
| `frontend/src/components/UDM/expressionEditorUtils.ts` | 表达式 tokenizer/analyzer，连续性前端预检查可复用 |
| `backend/app/services/udm_seed_templates.py` | `UDM_SEED_TEMPLATES` dict + `meta` 字段结构 |
| `backend/app/services/udm_expression.py` | `validate_definition()` + `DefinitionValidationResult` |
| `backend/app/models.py` | `UDMModelVersion.meta` JSON 字段 (L~1100) |
| `frontend/src/config/simulationConfig.ts` | `getDefaultCalculationParams()` 仿真预设参考 |

---

## 11. 角色分工

| 角色 | 核心职责 |
|------|----------|
| 前端 | 页面增强、教学模式状态管理、Step 可见性、结果面板、交互跳转 |
| 后端 | meta.learning 扩展、种子模板、连续性检查服务、接口兼容 |
| 内容/工艺 | 模板数值、章节提示、常见错误、场景配置、教学解释文案 |
| QA | 模板回归、守恒检查、端到端链路测试 |
