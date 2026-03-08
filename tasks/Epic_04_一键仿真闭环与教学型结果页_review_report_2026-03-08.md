# Epic 04 一键仿真闭环与教学型结果页 Review 报告

**日期：** 2026-03-08  
**评审依据：**
- `tasks/udm_petersen_tutorial_dev_plan_v2.md`
- `tasks/Epic_04_一键仿真闭环与教学型结果页_Implementation_Complete.md`

## Findings

### 1. 高风险：结果页路由没有携带 `flowchartId`，刷新后会丢失刚生成的流程图，闭环不可恢复

**位置：**
- `frontend/src/routes/_layout/udmModelEditor.tsx:32-34`
- `frontend/src/routes/_layout/udm.tsx:31-38`
- `frontend/src/stores/createModelFlowStore.ts:201-223`
- `frontend/src/stores/createModelFlowStore.ts:1435-1462`

**问题：**
- Epic 04 规划文档中的页面跳转关系是 `→ /udm?flowchartId=xxx&sourceTemplate=chapter-1`
- 实际实现中，编辑器生成流程图后只导航到 `"/udm"` 并附带 `lessonKey`
- `/udm` 路由 schema 也只接收 `lessonKey`，没有 `flowchartId`
- `useUDMFlowStore` 来自内存态 `createModelFlowStore()`，没有持久化恢复逻辑

**影响：**
- 用户从编辑器生成流程图后，当前标签页内可以继续跑仿真
- 但只要刷新 `/udm?lessonKey=chapter-7`，刚刚已经创建并保存到后端的流程图不会自动回载
- “一键生成流程图 → 仿真 → 结果页”的闭环只能在单次前端内存会话中成立，不能恢复、不能深链分享

### 2. 中风险：结果页“完成卡片”在标准成功路径下基本不会出现，常态会被“已完成”分支提前吞掉

**位置：**
- `frontend/src/components/UDM/UDMModelEditorForm.tsx:757-765`
- `frontend/src/components/UDM/tutorial/TutorialResultsPanel.tsx:42-48`
- `frontend/src/components/UDM/tutorial/TutorialResultsPanel.tsx:125-161`

**问题：**
- 编辑器在最后一步校验成功时就会执行 `completeLesson(lessonKey)`
- 结果页的完成卡片条件是 `isComplete && !isAlreadyCompleted`
- 同时 `isAlreadyCompleted` 直接来自 `completedLessons.includes(lessonKey)`

**影响：**
- 标准用户路径通常是：最后一步校验通过 → 生成流程图 → 进入 `/udm` → 运行仿真
- 在这条路径里，lesson 早已在编辑器阶段被标记为 completed
- 所以结果页不会出现文档描述的“validatePassed + simulationRanAt 后显示”的祝贺卡片，而是直接落入“already completed”分支

**结论：**
- 当前实现和 `Implementation Complete` 中对完成卡片的描述不一致
- 如果产品希望“结果页完成态”是 Epic 04 的教学反馈节点，完成判定需要和 Epic 02 的解锁逻辑解耦

### 3. 中风险：`simulationRanAt` 在“仅生成流程图”时就被写入，教程进度把“已生成”误记成“已仿真”

**位置：**
- `frontend/src/components/UDM/UDMModelEditorForm.tsx:1044-1047`
- `frontend/src/components/Flow/inspectorbar/SimulationPanel.tsx:339-344`
- `frontend/src/stores/tutorialProgressStore.ts:168-179`
- `frontend/src/components/UDM/tutorial/TutorialResultsPanel.tsx:43-46`

**问题：**
- `saveAndGenerateFlowchart()` 成功后立即调用 `recordSimulationRun(tutorialLesson.lessonKey)`
- `SimulationPanel` 在任务真正成功完成时也会再次调用同一个方法
- 于是 `simulationRanAt` 实际上混合了两种语义：
  - 已生成默认流程图
  - 已完成一次成功仿真

**影响：**
- `simulationRanAt` 不能再准确代表“用户已跑过仿真”
- 与文档中的“完成判定：需同时满足 validatePassed=true 和 simulationRanAt≠null”语义不一致
- 后续如果继续使用该字段做“继续学习”“最近仿真”或埋点统计，会得到偏早、失真的时间戳

## Testing Gaps

- 当前仓库中未发现 Epic 04 对应的自动化测试，未覆盖：
  - 生成流程图后跳转到 `/udm` 时是否应带 `flowchartId`
  - 结果页完成卡片与 `completedLessons` 的状态机关系
  - `simulationRanAt` 只能在真实仿真成功后写入的语义约束
- `TutorialResultsPanel`、`RecommendedChartsPanel`、`ExplosionDebugChecklist` 均未见组件级回归测试

## 已执行验证

- 前端：`cd frontend; npx tsc --noEmit`
  - 结果：通过
- 前端：`cd frontend; npx vite build`
  - 结果：成功，`TutorialResultsPanel` 仍被独立切分为 `7.58 kB` chunk

## 结论

Epic 04 的核心界面已经接上：教程结果页 tab、推荐曲线、解释卡、爆炸排错提示和 chapter-7 的默认预设都已落地，类型检查和生产构建也通过；但当前实现与“闭环”和“完成态”这两个关键目标之间仍有 3 个明显偏差。建议优先修复 `flowchartId` 缺失导致的不可恢复链路，再统一 `completeLesson` / `simulationRanAt` 的状态语义，否则结果页会继续呈现“功能看起来有、状态却不可信”的问题。
