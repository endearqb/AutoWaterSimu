# AutoWaterSimu Petersen 教程页面集成执行方案

## 1. 目标

本方案用于说明如何把两份教程文档中的内容转译到当前项目已存在的教程页面中，同时保持以下边界：

- 不改当前路由结构
- 不新增后端 API
- 不把整篇长文档直接渲染到页面
- 只做前端内容层与展示层整合

本方案以当前仓库实现为准，而不是以未来规划中的完整学习门户为准。

---

## 2. 核心决策

### 2.1 长文档保留在 `tasks/`

以下长文档保留在 `tasks/` 中作为外部交付物：

- `AutoWaterSimu_Petersen_教程说明.md`
- `AutoWaterSimu_Petersen_教程文档.md`
- `AutoWaterSimu_Petersen_教程页面集成执行方案.md`

页面内只消费这些长文档提炼出的结构化摘录。

### 2.2 页面不直接渲染 Markdown 大文档

原因如下：

- 当前教程页是产品页面，不是文档站
- 用户在教程页中的核心任务是进入章节，不是滚动阅读长文
- 长文直接塞页面会冲掉现有卡片式入口和学习节奏

### 2.3 优先复用现有前端教程数据层

本轮内容集成优先基于已有数据层：

- `tutorialLessons.ts`
- `tutorialFlowPresets.ts`
- `tutorialInsights.ts`

在此基础上允许新增少量前端内容字段，但不写入后端 `meta.learning`。

---

## 3. 当前真实页面映射

## 3.1 `/petersen-tutorial`

### 页面职责

- 承接教程说明中的总览信息
- 告诉用户当前真实入口是什么
- 告诉用户当前章节有哪些、顺序如何
- 提供继续学习与进入章节的操作入口

### 对应内容来源

- 教程说明中的：
  - 教程目标
  - 适用读者
  - 学习收益
  - 页面入口关系
  - 当前学习闭环
  - 当前边界

### 推荐集成方式

- 不直接渲染整篇说明文档
- 拆成首页总览块：
  - 教程概述
  - 适用读者
  - 学习收益
  - 当前真实页面入口
  - 当前闭环
  - 当前边界
  - 推荐学习顺序

### 当前落点组件

- 页面：`frontend/src/routes/_layout/petersen-tutorial.tsx`
- 新增/承接组件：`frontend/src/components/UDM/tutorial/TutorialOverviewPanel.tsx`

---

## 3.2 `TutorialLessonsSection` / `TutorialLessonCard`

### 页面职责

- 承接章节级别的教程摘要
- 在章节入口之前告诉用户本章学什么
- 保持“开始学习 / 继续学习 / 先修锁定”的操作清晰

### 对应内容来源

- 教程文档中的每章：
  - 学习目标
  - 核心学习重点
  - 当前章在整个闭环中的位置

### 推荐集成方式

- 为每个 lesson 增加：
  - `summary`
  - `entryHighlights`
- 卡片上在现有标题、副标题下方显示：
  - 一段章节摘要
  - 1-2 条关键亮点

### 当前落点组件

- `frontend/src/components/UDM/TutorialLessonsSection.tsx`
- `frontend/src/components/UDM/TutorialLessonCard.tsx`
- 数据源：`frontend/src/data/tutorialLessons.ts`

---

## 3.3 `TutorialGuidePanel`

### 页面职责

- 承接教程文档中的“当前步骤说明”
- 在用户处于编辑器时，按 Step 告诉用户：
  - 现在该关注什么
  - 当前步骤想达成什么
  - 容易错在哪里

### 对应内容来源

- 教程文档中的每章：
  - 学习目标
  - 页面会看到什么
  - 具体操作步骤
  - 常见错误与修正

### 推荐集成方式

- lesson 级保留：
  - objectives
  - summary
  - entryHighlights
- step 级增加：
  - `extendedGuide`

### 页面表现

- `ChapterGuideCard`：承接章节摘要与章节亮点
- 当前步骤卡片：承接 step 的标题、body 与扩写提示
- 常见误区区：继续承接 processTeaching 中的错误条目

### 当前落点组件

- `frontend/src/components/UDM/tutorial/TutorialGuidePanel.tsx`
- `frontend/src/components/UDM/tutorial/ChapterGuideCard.tsx`
- 数据源：`frontend/src/data/tutorialLessons.ts`

---

## 3.4 `ContinuityCheckPanel`

### 页面职责

- 承接 Chapter 3 中关于 continuity 的阅读方式与修正路径
- 告诉用户如何从“结果”回到“过程行”

### 对应内容来源

- 教程文档中 Chapter 3 的：
  - COD/N 对账说明
  - 错误跳转与修正思路
  - 常见 warning 解释

### 推荐集成方式

- 不改后端返回结构
- 继续使用接口返回的：
  - `dimension`
  - `status`
  - `balance_value`
  - `explanation`
  - `suggestion`
- 在前端 lesson 数据中增加：
  - `continuityPanelNotes`

### 页面表现

- 面板顶部显示 1-2 条“如何阅读这块面板”的课程提示
- 下方继续展示真实 continuity 结果

### 当前落点组件

- `frontend/src/components/UDM/tutorial/ContinuityCheckPanel.tsx`
- 编辑器接线处：`frontend/src/components/UDM/UDMModelEditorForm.tsx`
- 数据源：`frontend/src/data/tutorialLessons.ts`

---

## 3.5 `TutorialResultsPanel` / `RecommendedChartsPanel` / `ResultInterpretationCard` / `ExplosionDebugChecklist`

### 页面职责

- 承接 Chapter 7 中的仿真结果阅读与排错说明
- 把“结果”解释回“矩阵和过程”

### 对应内容来源

- 教程文档中 Chapter 7 的：
  - 默认流程图说明
  - 推荐观测变量
  - 预期趋势
  - 结果解释
  - 爆炸曲线排错顺序

### 推荐集成方式

- 继续保留：
  - `tutorialFlowPresets.ts`：默认场景
  - `tutorialInsights.ts`：结果解释卡
- 在 `tutorialInsights.ts` 中新增：
  - `takeaways`

### 页面表现

- `RecommendedChartsPanel`：承接“本章优先看哪些变量”
- `ResultInterpretationCard`：承接“这些曲线说明了什么”
- `ExplosionDebugChecklist`：承接“异常结果时先检查什么”

### 当前落点组件

- `frontend/src/components/UDM/tutorial/TutorialResultsPanel.tsx`
- `frontend/src/components/UDM/tutorial/RecommendedChartsPanel.tsx`
- `frontend/src/components/UDM/tutorial/ResultInterpretationCard.tsx`
- `frontend/src/components/UDM/tutorial/ExplosionDebugChecklist.tsx`
- 数据源：
  - `frontend/src/data/tutorialFlowPresets.ts`
  - `frontend/src/data/tutorialInsights.ts`

---

## 4. 数据层设计

## 4.1 页面总说明

建议新增独立 overview 配置文件，负责教程首页总览内容。

### 设计原因

- 首页总览并不属于某一章
- 也不适合塞进单个 lesson 配置里

### 建议文件

- `frontend/src/data/tutorialOverview.ts`

### 建议字段

- 教程概述
- 适用读者
- 学习收益
- 当前页面入口
- 当前学习闭环
- 当前边界
- 推荐学习顺序

---

## 4.2 章节级摘要

继续放在 `tutorialLessons.ts` 中。

### 建议字段

- `summary`
- `entryHighlights`
- `stepGuides[].extendedGuide`
- `continuityPanelNotes`

### 原则

- 这些字段只服务前端展示
- 不写入后端 `meta.learning`
- 不影响已有 lessonKey / stepConfig / recipes / processTeaching 逻辑

---

## 4.3 结果级补充

继续放在 `tutorialInsights.ts` 中。

### 建议字段

- `takeaways`

### 原则

- 结果解释继续围绕 lessonKey 组织
- 不新增新的后端结果接口
- 页面只消费已有 lesson 上下文和当前仿真结果

---

## 5. 实施边界

本轮实施需要严格遵守以下边界：

### 5.1 路由不变

- 保持 `/petersen-tutorial` 为教程首页
- 保持 `/udmModelEditor?lessonKey=...` 为教程编辑入口
- 保持 `/udm?lessonKey=...&flowchartId=...` 为教程仿真入口

### 5.2 不引入新后端 API

- 不新增文档接口
- 不新增教程内容接口
- 不修改 OpenAPI
- 不新增数据库表

### 5.3 不把 `/udmModels` 作为本轮主承载页

如果后续需要把教程摘要延伸到模型库，可作为第二阶段增强，但不是本轮主任务。

### 5.4 不把长文档直接灌进页面

页面只放摘要、导读、步骤提示和结果说明，不把整篇 `Markdown` 教程直接嵌进产品页面。

---

## 6. 实施步骤建议

### 阶段 1：建立内容层

- 新增教程总览数据
- 扩展 lesson 数据
- 扩展 insights 数据

### 阶段 2：接入首页

- 在 `/petersen-tutorial` 页面顶部加入 overview panel
- 保持现有章节卡片区不变

### 阶段 3：接入编辑器

- 把章节摘要与亮点接入 `ChapterGuideCard`
- 把 step 扩写提示接入 `TutorialGuidePanel`
- 把 continuity 阅读提示接入 `ContinuityCheckPanel`

### 阶段 4：接入结果页

- 把结果摘要接入 `ResultInterpretationCard`
- 继续复用推荐曲线与排错清单

### 阶段 5：文档交付

- 将长文档保留在 `tasks/`
- 把页面中使用到的摘录与长文档保持术语一致

---

## 7. 验收标准

## 7.1 文档验收

- 三份文档统一使用 `Petersen`
- 所有路由、章节 key 和页面行为与现有代码一致
- 未实现能力只出现在“后续规划”或“边界说明”中

## 7.2 页面验收

- `/petersen-tutorial` 顶部出现教程总览区，但不影响原有章节卡片使用
- `TutorialLessonCard` 能展示章节摘要与亮点
- `TutorialGuidePanel` 能展示 step 扩写提示
- Chapter 3 continuity 面板能展示课程阅读提示
- Chapter 7 结果解释卡能展示结果级摘要

## 7.3 工程验收

- `cd frontend; npx tsc --noEmit` 通过
- 手工烟测路径通过：
  - `/petersen-tutorial`
  - 进入 `chapter-7`
  - `Save & Generate Flowchart`
  - `/udm`
  - 运行仿真
  - 查看教程结果 tab

---

## 8. 第二阶段可选扩展

以下内容可以作为后续扩展，但不属于本轮：

- 把教程摘要延伸到 `/udmModels`
- 建立独立 `/petersen` 学习门户
- 接入服务端学习进度
- 将教程内容外部化为 CMS 或 JSON 配置后台
- 为更多章节补齐完整页面内容

---

## 9. 结论

当前最合适的集成方式不是新做一套教程系统，而是在现有页面上增加一层“结构化教程内容”：

- 首页放总览
- 卡片放摘要
- GuidePanel 放步骤提示
- ContinuityPanel 放阅读说明
- Result 卡放结果摘要

这样既保留当前真实产品链路，又能把三份教程文档中的高价值内容落到页面里。
