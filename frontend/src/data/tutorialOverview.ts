import { localizedText, type LocalizedText } from "./tutorialContent"

interface TutorialOverviewRoute {
  route: string
  title: LocalizedText
  description: LocalizedText
}

interface TutorialOverviewSection {
  title: LocalizedText
  items: LocalizedText[]
}

interface TutorialOverviewData {
  heroTitle: LocalizedText
  heroSummary: LocalizedText
  audience: TutorialOverviewSection
  benefits: TutorialOverviewSection
  routeMapTitle: LocalizedText
  routeMap: TutorialOverviewRoute[]
  learningLoopTitle: LocalizedText
  learningLoop: LocalizedText[]
  currentCapabilities: TutorialOverviewSection
  currentBoundaries: TutorialOverviewSection
  recommendedOrderTitle: LocalizedText
  recommendedLessonOrder: string[]
}

export const TUTORIAL_OVERVIEW: TutorialOverviewData = {
  heroTitle: localizedText(
    "AutoWaterSimu Petersen 教程总览",
    "AutoWaterSimu Petersen Tutorial Overview",
  ),
  heroSummary: localizedText(
    "当前教程基于项目中已经落地的 `/petersen-tutorial`、`/udmModelEditor`、`/udm` 三段链路构建，目标不是单独讲公式，而是让学习者在真实页面里完成“看懂矩阵、通过校验、生成流程图、跑出仿真结果”的闭环。",
    "The current tutorial is built on the shipped `/petersen-tutorial`, `/udmModelEditor`, and `/udm` flow. It teaches Petersen matrices inside the real product flow instead of separating formulas from execution.",
  ),
  audience: {
    title: localizedText("适用读者", "Audience"),
    items: [
      localizedText(
        "第一次接触 UDM/Petersen 矩阵，希望先建立直觉再进入公式的工艺或研发人员。",
        "Process or R&D users new to UDM and Petersen matrices who need intuition before formulas.",
      ),
      localizedText(
        "已经会使用流程图页面，但还不熟悉 stoich、rate expression、连续性检查的用户。",
        "Users already familiar with the flow page but not yet comfortable with stoichiometry, rate expressions, or continuity checks.",
      ),
      localizedText(
        "需要做培训、产品说明或交接文档的产品、实施和技术支持人员。",
        "Product, enablement, and support teammates who need material for training and handoff.",
      ),
    ],
  },
  benefits: {
    title: localizedText("学习收益", "Benefits"),
    items: [
      localizedText(
        "按章节理解组件、过程、化学计量、速率表达式和参数抽取之间的关系。",
        "Understand how components, processes, stoichiometry, rate expressions, and parameter extraction fit together.",
      ),
      localizedText(
        "在 guided mode 下逐步完成 validate，并用连续性检查定位问题。",
        "Progress through validate in guided mode and use continuity checks to locate issues.",
      ),
      localizedText(
        "把校验通过的模型直接转成默认 CSTR 流程图并在 `/udm` 中运行仿真。",
        "Turn a validated model into a default CSTR flowchart and run the simulation in `/udm`.",
      ),
    ],
  },
  routeMapTitle: localizedText("当前真实页面入口", "Current Entry Points"),
  routeMap: [
    {
      route: "/petersen-tutorial",
      title: localizedText("教程首页", "Tutorial Home"),
      description: localizedText(
        "展示课程总览、章节顺序、继续学习入口和每个章节的简介。",
        "Shows the overview, chapter order, continue-learning entry, and chapter summaries.",
      ),
    },
    {
      route: "/udmModelEditor?lessonKey=chapter-x",
      title: localizedText("教程编辑器", "Guided Editor"),
      description: localizedText(
        "进入 guided/expert 双模式编辑器，按 Step 1-5 学习矩阵、公式、参数和校验。",
        "Opens the guided/expert editor where Step 1-5 reveals matrix, formulas, parameters, and validation in order.",
      ),
    },
    {
      route: "/udm?lessonKey=chapter-7&flowchartId=...",
      title: localizedText("教程仿真页", "Tutorial Simulation"),
      description: localizedText(
        "承接默认流程图与求解器预设，展示推荐曲线、解释卡和爆炸曲线排错提示。",
        "Consumes the default flowchart and solver presets, then shows recommended charts, interpretation cards, and explosion debugging hints.",
      ),
    },
  ],
  learningLoopTitle: localizedText("当前学习闭环", "Current Learning Loop"),
  learningLoop: [
    localizedText("1. 在 `/petersen-tutorial` 选择章节并进入课程模型。", "1. Choose a lesson from `/petersen-tutorial` and open the lesson model."),
    localizedText("2. 在 `/udmModelEditor` 里按 Step 1-5 完成阅读、编辑与校验。", "2. Work through Step 1-5 in `/udmModelEditor` for reading, editing, and validation."),
    localizedText("3. 使用 `Save & Generate Flowchart` 生成默认的 `Input → UDM Reactor → Output` 流程图。", "3. Use `Save & Generate Flowchart` to create the default `Input → UDM Reactor → Output` flowchart."),
    localizedText("4. 跳转到 `/udm` 运行仿真，查看推荐曲线、结果解释和排错提示。", "4. Run the simulation in `/udm` and review the recommended charts, interpretations, and debugging hints."),
  ],
  currentCapabilities: {
    title: localizedText("当前已实现能力", "Implemented Today"),
    items: [
      localizedText(
        "章节卡片支持先修锁定、继续学习、课程模型创建与恢复。",
        "Chapter cards support prerequisite locking, continue-learning, model creation, and resume.",
      ),
      localizedText(
        "编辑器支持 guided/expert 切换、stepper、箭头矩阵、配方栏、参数抽取和 validation 跳转。",
        "The editor supports guided/expert switching, stepper, arrow matrix, recipe bar, parameter extraction, and validation jumps.",
      ),
      localizedText(
        "Chapter 3/7 已接入连续性检查；Chapter 7 已接入默认流程图、求解器预设和结果页教程面板。",
        "Chapters 3 and 7 already use continuity checks; Chapter 7 also includes default flowchart generation, solver presets, and the tutorial result panel.",
      ),
    ],
  },
  currentBoundaries: {
    title: localizedText("当前边界", "Current Boundaries"),
    items: [
      localizedText(
        "当前入口仍是 `/petersen-tutorial`，并没有独立的 `/petersen` 学习门户。",
        "The current entry remains `/petersen-tutorial`; there is no separate `/petersen` learning portal yet.",
      ),
      localizedText(
        "`/udmModels` 仍以模型库为主，而不是这轮教程内容的主承载页面。",
        "`/udmModels` is still primarily the model library, not the main surface for this tutorial content round.",
      ),
      localizedText(
        "学习进度目前保存在前端本地存储，没有接入服务端学习记录。",
        "Learning progress is currently stored locally on the frontend and not synced to a server-side progress service.",
      ),
    ],
  },
  recommendedOrderTitle: localizedText("推荐学习顺序", "Recommended Order"),
  recommendedLessonOrder: ["chapter-1", "chapter-2", "chapter-3", "chapter-7"],
}
