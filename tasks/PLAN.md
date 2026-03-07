# Epic 2 实施计划：先补齐 Epic 1 阻塞，再落地教学模式编辑器

## Summary
- 本轮范围包含两部分：`Epic 1` 的前置阻塞修复，以及 `Epic 2` 的 guided editor 正式实现。
- 目标结果：用户从 `/udmModels` 点击教程卡片后，会创建或恢复真实的章节模型，进入带 `Step 1-5` 的教学模式；进度可恢复、章节可解锁、校验问题可精准跳转；非教程模型的 Expert 模式保持现状。
- 同一分支顺手修掉当前 `/ai-deep-research` 的基线 TS 错误，保证最终能通过 `cd frontend; npx tsc --noEmit`。

## Key Changes
- 基线与教程入口：
  - 新增一个轻量的 `/ai-deep-research` 占位路由，清掉当前 3 个路由类型错误；同步更新生成的路由树文件。
  - 扩展 `TutorialLesson` 数据契约，补齐 `chapter`、`objectives`、`stepGuides`、`recipes`、`processTeaching`、`completionRule`，并把 `stepConfig` 统一约束到 `1-5`。
  - 扩展教程进度 store：新增 `modelId`、`mode`、`completedSteps`、`validatePassed`、`simulationRanAt`，用它作为“继续学习”和章节解锁的唯一前端状态。
  - 在后端补齐 `chapter-1/2/3/7` 的教程 seed templates，并写入 `meta.learning`；教程 seed 加独立标签，`/udmModels` 的通用模板区过滤掉这些教程模板。
  - `/udmModels` 的教程卡片改为“创建/恢复教程模型再导航”：首次点击调用 `createModelFromTemplate(seedTemplateKey)`，之后优先用 store 中的 `modelId` 恢复；导航时同时带 `modelId + lessonKey`。

- Guided editor：
  - `UDMModelEditorForm` 先用 `lessonKey` 建 tutorial context；若 URL 没有 `lessonKey`，再从 `latest_version.meta.learning.lessonKey` 回填，避免首次保存或从模型列表重开后丢失教程模式。
  - Guided mode 只对教程模型默认开启，非教程模型继续走现有 Expert 布局；顶部新增教学模式开关和固定 `Step 1-5` stepper。
  - 可见性按文档固定：
    - Step 1: `Components + Processes`，`Stoich` 仅箭头/方向提示，不开放公式和参数。
    - Step 2: 开放 `Stoich` 编辑，使用 `ArrowMatrixView`/提示文案引导增减关系。
    - Step 3: 开放 `Rate Expressions`，在表达式编辑器内接入 `RecipeBar` 做 Monod/开关函数片段插入。
    - Step 4: 开放 `Parameters`，保留“抽取参数并合并”的现有逻辑，并把它纳入 guided 流程。
    - Step 5: 回到完整编辑能力与验证区，允许自由调整并完成收尾。
  - 新建 `frontend/src/components/UDM/tutorial/` 下的 `TutorialStepper`、`TutorialGuidePanel`、`ChapterGuideCard`、`ProcessTeachingPopover`、`ArrowMatrixView`、`RecipeBar`；所有教学文案都来自 tutorial data，不直接写死在 JSX 中。
  - `ExpressionCellEditorDialog` 接收 tutorial recipes，仅在 guided 的 `rateExpr` 编辑中渲染 recipe 插入区；现有函数/常量插入保留。

- Validation 与进度联动：
  - 后端 `UDMValidationIssue` 增加可选 `location`：`section | processName | componentName | parameterName | cellKey`。
  - `udm_expression.py` 为 rate expression、stoich、参数、过程名相关 issue 填充 `location`；前端 `jumpToIssue` 改成优先用 `location`，旧的 message-regex 逻辑保留作兼容回退。
  - 由于 OpenAPI schema 变更，更新后端后重新生成前端 client，并提交生成物。
  - Editor 内的 step 切换会回写 `currentStep/completedSteps`；当用户在 lesson 最后一个 enabled step 上得到 `validation.ok === true` 时，标记该 lesson 完成并解锁下一章；`saveAndGenerateFlowchart` 时写入 `simulationRanAt` 但不把“跑仿真”作为 Epic 2 的完成门槛。

## Public API / Type Changes
- 前端：
  - `TutorialLesson` 扩展为可承载 objectives、step guides、recipes、process teaching 的完整教学配置。
  - `tutorialProgressStore` 扩展为带 `modelId` 和进度里程碑的持久化状态。
- 后端：
  - 教程 seed 的 `meta.learning` 成为教程模型的标准来源字段。
  - `UDMValidationIssue` 新增 `location`，`UDMValidationResponse` 结构随之更新；变更后必须重新生成前端 OpenAPI client。

## Test Plan
- 前端基础：
  - 运行 `cd frontend; npx tsc --noEmit`，确认包含教程改动后的代码能通过类型检查。
  - 验证 `/ai-deep-research` 相关路由错误已经消失。
- 教程主链路：
  - 从 `/udmModels` 启动 `chapter-1`，应创建真实教程模型并进入 guided Step 1，而不是空白编辑器。
  - 首次保存后刷新页面，guided mode、lessonKey 和当前 step 必须保留。
  - Step 1-5 的区块可见性必须与计划矩阵一致，Expert mode 打开同一模型时不能出现教程 UI 污染。
  - Step 3 的 recipe 插入必须能写入表达式编辑器并保留光标行为。
  - 制造一个 rate/stoich/parameter 错误后点击 validation issue，必须跳到正确输入位而不是靠消息猜测。
  - 章节完成后返回 `/udmModels`，下一章应解锁，“继续学习”应恢复到最近 lesson 的 `modelId + currentStep`。
- 后端与回归：
  - 为 `udm_expression.py` 增加 issue location 的单元测试。
  - 为教程 seed 增加最小回归：模板可创建、`meta.learning.lessonKey` 正确、旧的非教程 seed 不受影响。

## Assumptions
- `chapter-1/2/3` 本轮为可启动章节；`chapter-7` 仍显示 `coming soon`，但 seed/meta 可先补齐以统一数据结构。
- Epic 2 的“lesson completed”定义为“在该 lesson 最后一个启用 step 上验证通过”；仿真闭环仍属于后续 Epic。
- 不引入新的教程专用接口，优先复用现有 `getUdmTemplates / createUdmModelFromTemplate / readUdmModel / validateUdmModelDefinition`，只对 validation issue schema 做最小扩展。
