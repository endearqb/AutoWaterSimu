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

const ALL_INSIGHT_SETS: TutorialInsightSet[] = [chapter7Insights]

export function getTutorialInsights(
  lessonKey: string | null | undefined,
): TutorialInsight[] {
  if (!lessonKey) return []
  return ALL_INSIGHT_SETS.find((s) => s.lessonKey === lessonKey)?.insights ?? []
}
