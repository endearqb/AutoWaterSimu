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
export interface TutorialInsight {
  id: string
  triggerCondition: "always" | "simulation-complete"
  titleKey: string
  bodyKey: string
  relatedVariables: string[]
}

export interface TutorialInsightSet {
  lessonKey: string
  insights: TutorialInsight[]
}

const chapter1Insights: TutorialInsightSet = {
  lessonKey: "chapter-1",
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
