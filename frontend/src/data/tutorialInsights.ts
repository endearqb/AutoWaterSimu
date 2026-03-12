/**
 * Tutorial Insights — 教学解释卡配置
 *
 * 每个 InsightSet 对应一个教程章节，包含多条 Insight。
 * Insight 在仿真结果页展示，帮助学生理解曲线变化的物理/化学含义。
 *
 * 字段说明：
 *   - id: 唯一标识，用于 React key
 *   - triggerCondition: "always" 始终显示 | "simulation-complete" 仿真完成后显示
 *   - titleKey / bodyKey: i18n 键，对应 i18n/messages/{zh,en}.ts 中的文案
 *   - relatedVariables: 关联的组分名，用于高亮对应曲线
 *
 * 新增章节步骤：
 *   1. 新增 chapterXInsights 对象，定义 lessonKey 和 insights 数组
 *   2. 将其加入 ALL_INSIGHT_SETS 数组
 *   3. 在 i18n/messages/{zh,en}.ts 的 flow.tutorial.insights 下新增对应翻译
 *
 * 关联文件：
 *   - tutorialLessons.ts — 章节地图
 *   - tutorialFlowPresets.ts — 仿真预设（定义推荐变量需与 relatedVariables 对应）
 *   - i18n/messages/{zh,en}.ts — 所有文案
 */
import { localizedText, type LocalizedText } from "./tutorialContent"

export interface TutorialInsight {
  id: string
  triggerCondition: "always" | "simulation-complete"
  titleKey: string
  bodyKey: string
  relatedVariables: string[]
}

export interface TutorialInsightSet {
  lessonKey: string
  takeaways?: LocalizedText[]
  insights: TutorialInsight[]
}

const chapter1Insights: TutorialInsightSet = {
  lessonKey: "chapter-1",
  takeaways: [
    localizedText(
      "如果你还在用“谁增加谁减少”的语言描述矩阵，说明第 1 章学得是对的；这正是后续写 stoich 的基础。",
      "If you can still describe the matrix as who increases and who decreases, Chapter 1 is doing its job. That intuition becomes the basis for later stoichiometric editing.",
    ),
  ],
  insights: [
    {
      id: "ch1-cod-decline",
      triggerCondition: "simulation-complete",
      titleKey: "flow.tutorial.insights.chapter-1.codDecline.title",
      bodyKey: "flow.tutorial.insights.chapter-1.codDecline.body",
      relatedVariables: ["cod"],
    },
    {
      id: "ch1-do-consumption",
      triggerCondition: "simulation-complete",
      titleKey: "flow.tutorial.insights.chapter-1.doConsumption.title",
      bodyKey: "flow.tutorial.insights.chapter-1.doConsumption.body",
      relatedVariables: ["dissolvedOxygen"],
    },
  ],
}

const chapter2Insights: TutorialInsightSet = {
  lessonKey: "chapter-2",
  takeaways: [
    localizedText(
      "这一章最重要的不是公式变长，而是把 `stoich → rate expression → parameters → validate` 这条链真正走通一次。",
      "The most important outcome of this chapter is not a longer formula, but completing the full `stoich → rate expression → parameters → validate` chain once.",
    ),
    localizedText(
      "当你能解释 `Y_H` 为什么同时出现在 stoich 与参数区时，说明已经开始从记公式转向理解质量关系。",
      "Once you can explain why `Y_H` appears in both stoichiometry and the parameter table, you are moving from memorizing formulas to understanding mass relationships.",
    ),
  ],
  insights: [
    {
      id: "ch2-yield-effect",
      triggerCondition: "always",
      titleKey: "flow.tutorial.insights.chapter-2.yieldEffect.title",
      bodyKey: "flow.tutorial.insights.chapter-2.yieldEffect.body",
      relatedVariables: ["cod"],
    },
    {
      id: "ch2-monod-saturation",
      triggerCondition: "simulation-complete",
      titleKey: "flow.tutorial.insights.chapter-2.monodSaturation.title",
      bodyKey: "flow.tutorial.insights.chapter-2.monodSaturation.body",
      relatedVariables: ["cod"],
    },
    {
      id: "ch2-nitrification-onset",
      triggerCondition: "simulation-complete",
      titleKey: "flow.tutorial.insights.chapter-2.nitrificationOnset.title",
      bodyKey: "flow.tutorial.insights.chapter-2.nitrificationOnset.body",
      relatedVariables: ["ammonia"],
    },
  ],
}

const chapter3Insights: TutorialInsightSet = {
  lessonKey: "chapter-3",
  takeaways: [
    localizedText(
      "Chapter 3 的关键技能是：看到 continuity warning 后，能说出是哪个过程、哪个维度、哪类符号关系可能出了问题。",
      "The core skill in Chapter 3 is being able to explain which process, which dimension, and what type of sign relationship likely caused a continuity warning.",
    ),
    localizedText(
      "只看通过/失败还不够；真正有价值的是逐过程逐维度地定位守恒问题。",
      "Top-level pass or fail is not enough; the real value comes from locating conservation issues by process and by dimension.",
    ),
  ],
  insights: [
    {
      id: "ch3-aerobic-vs-anoxic",
      triggerCondition: "always",
      titleKey: "flow.tutorial.insights.chapter-3.aerobicVsAnoxic.title",
      bodyKey: "flow.tutorial.insights.chapter-3.aerobicVsAnoxic.body",
      relatedVariables: ["cod", "nitrate"],
    },
    {
      id: "ch3-nitrogen-balance",
      triggerCondition: "simulation-complete",
      titleKey: "flow.tutorial.insights.chapter-3.nitrogenBalance.title",
      bodyKey: "flow.tutorial.insights.chapter-3.nitrogenBalance.body",
      relatedVariables: ["ammonia", "nitrate"],
    },
    {
      id: "ch3-alkalinity-signal",
      triggerCondition: "simulation-complete",
      titleKey: "flow.tutorial.insights.chapter-3.alkalinitySignal.title",
      bodyKey: "flow.tutorial.insights.chapter-3.alkalinitySignal.body",
      relatedVariables: ["totalAlkalinity"],
    },
  ],
}

const chapter7Insights: TutorialInsightSet = {
  lessonKey: "chapter-7",
  takeaways: [
    localizedText(
      "Chapter 7 把前面章节的矩阵知识真正接到仿真场景上：矩阵不再只是表格，而是反应器里曲线变化的原因。",
      "Chapter 7 connects the earlier matrix lessons to a real simulation: the matrix is no longer just a table, but the reason the reactor curves change the way they do.",
    ),
    localizedText(
      "如果推荐曲线和解释卡的趋势与你预期不同，排查顺序应优先看 continuity、默认场景参数和爆炸曲线提示。",
      "If the recommended charts or interpretation cards disagree with your expectation, check continuity, the preset scenario parameters, and the explosion-debug hints first.",
    ),
  ],
  insights: [
    {
      id: "ch7-ss-decline",
      triggerCondition: "simulation-complete",
      titleKey: "flow.tutorial.insights.chapter-7.ssDeclination.title",
      bodyKey: "flow.tutorial.insights.chapter-7.ssDeclination.body",
      relatedVariables: ["S_S"],
    },
    {
      id: "ch7-xbh-growth",
      triggerCondition: "simulation-complete",
      titleKey: "flow.tutorial.insights.chapter-7.xbhGrowth.title",
      bodyKey: "flow.tutorial.insights.chapter-7.xbhGrowth.body",
      relatedVariables: ["X_BH"],
    },
    {
      id: "ch7-oxygen-demand",
      triggerCondition: "simulation-complete",
      titleKey: "flow.tutorial.insights.chapter-7.oxygenDemand.title",
      bodyKey: "flow.tutorial.insights.chapter-7.oxygenDemand.body",
      relatedVariables: ["S_O"],
    },
    {
      id: "ch7-nitrification",
      triggerCondition: "simulation-complete",
      titleKey: "flow.tutorial.insights.chapter-7.nitrification.title",
      bodyKey: "flow.tutorial.insights.chapter-7.nitrification.body",
      relatedVariables: ["S_NH", "S_NO"],
    },
  ],
}

const ALL_INSIGHT_SETS: TutorialInsightSet[] = [
  chapter1Insights,
  chapter2Insights,
  chapter3Insights,
  chapter7Insights,
]

export function getTutorialInsights(
  lessonKey: string | null | undefined,
): TutorialInsight[] {
  if (!lessonKey) return []
  return ALL_INSIGHT_SETS.find((s) => s.lessonKey === lessonKey)?.insights ?? []
}

export function getTutorialTakeaways(
  lessonKey: string | null | undefined,
): LocalizedText[] {
  if (!lessonKey) return []
  return ALL_INSIGHT_SETS.find((s) => s.lessonKey === lessonKey)?.takeaways ?? []
}
