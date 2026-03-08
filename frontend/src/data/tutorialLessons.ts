/**
 * Tutorial Lessons — 教程章节地图（核心配置）
 *
 * 定义所有教程章节的元信息：难度、步骤配置、关联模板、推荐图表等。
 * 前端路由、教程侧边栏、步骤引导面板均从此处读取配置。
 *
 * 关键字段说明：
 *   - lessonKey: 全局唯一标识，同时用于 URL 路由参数
 *   - seedTemplateKey: 后端 UDM_SEED_TEMPLATES 中的模板 key
 *   - stepConfig: defaultStep 为初始步骤，maxStep 为最大可达步骤
 *   - continuityProfiles: 启用的连续性检查维度（COD / N / ALK）
 *
 * 新增章节步骤：
 *   1. 在后端 udm_seed_templates.py 注册新的 seed template
 *   2. 在此文件新增 TutorialLesson 对象并加入 TUTORIAL_LESSONS 数组
 *   3. 在 tutorialFlowPresets.ts 添加仿真预设
 *   4. 在 tutorialInsights.ts 添加教学解释卡
 *   5. 在 i18n/messages/{zh,en}.ts 补充所有 i18n 键
 *
 * 关联文件：
 *   - tutorialFlowPresets.ts — 仿真预设
 *   - tutorialInsights.ts — 教学解释卡
 *   - i18n/messages/{zh,en}.ts — 步骤标题、正文、过程教学文案
 *   - backend: udm_seed_templates.py — 后端模板定义
 */
export type TutorialDifficulty = "beginner" | "intermediate" | "full"
export type TutorialTemplateType = "exercise" | "answer" | "case" | "guide"
export type TutorialMode = "guided" | "expert"
export type TutorialRecipeCategory = "monod" | "stoich" | "switch"
export type TutorialStep = 1 | 2 | 3 | 4 | 5
export type TutorialCompletionRule = "validation-pass-last-step"

export interface TutorialStepGuide {
  titleKey: string
  bodyKey: string
  focusAreas: Array<
    | "components"
    | "processes"
    | "stoich"
    | "rateExpr"
    | "parameters"
    | "validation"
  >
}

export interface TutorialRecipe {
  key: string
  labelKey: string
  descriptionKey: string
  category: TutorialRecipeCategory
  template: string
}

export interface TutorialProcessTeaching {
  processName: string
  titleKey: string
  storyKey: string
  mistakes: string[]
}

export interface TutorialLesson {
  lessonKey: string
  chapter: string
  difficulty: TutorialDifficulty
  templateType: TutorialTemplateType
  estimatedMinutes: number
  prerequisites: string[]
  seedTemplateKey: string
  stepConfig: {
    defaultStep: TutorialStep
    maxStep: TutorialStep
  }
  recommendedCharts: string[]
  objectives: string[]
  stepGuides: Record<TutorialStep, TutorialStepGuide>
  recipes: TutorialRecipe[]
  processTeaching: TutorialProcessTeaching[]
  completionRule: TutorialCompletionRule
  comingSoon?: boolean
  continuityProfiles?: string[]
}

export const TUTORIAL_STEP_ORDER: TutorialStep[] = [1, 2, 3, 4, 5]

const chapter2Recipes: TutorialRecipe[] = [
  {
    key: "monod-substrate",
    labelKey: "flow.tutorial.recipes.monodSubstrate.label",
    descriptionKey: "flow.tutorial.recipes.monodSubstrate.description",
    category: "monod",
    template: "S_S/(K_S+S_S)",
  },
  {
    key: "oxygen-switch",
    labelKey: "flow.tutorial.recipes.oxygenSwitch.label",
    descriptionKey: "flow.tutorial.recipes.oxygenSwitch.description",
    category: "switch",
    template: "S_O/(K_OH+S_O)",
  },
  {
    key: "yield-consumption",
    labelKey: "flow.tutorial.recipes.yieldConsumption.label",
    descriptionKey: "flow.tutorial.recipes.yieldConsumption.description",
    category: "stoich",
    template: "-1/Y_H",
  },
]

const chapter3Recipes: TutorialRecipe[] = [
  ...chapter2Recipes,
  {
    key: "alk-balance",
    labelKey: "flow.tutorial.recipes.alkBalance.label",
    descriptionKey: "flow.tutorial.recipes.alkBalance.description",
    category: "stoich",
    template: "-1/14",
  },
]

export const TUTORIAL_LESSONS: TutorialLesson[] = [
  {
    lessonKey: "chapter-1",
    chapter: "chapter-1",
    difficulty: "beginner",
    templateType: "guide",
    estimatedMinutes: 15,
    prerequisites: [],
    seedTemplateKey: "petersen-chapter-1",
    stepConfig: { defaultStep: 1, maxStep: 2 },
    recommendedCharts: ["cod", "dissolvedOxygen"],
    objectives: [
      "flow.tutorial.lessonContent.chapter-1.objectives.0",
      "flow.tutorial.lessonContent.chapter-1.objectives.1",
    ],
    stepGuides: {
      1: {
        titleKey: "flow.tutorial.lessonContent.chapter-1.steps.1.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-1.steps.1.body",
        focusAreas: ["components", "processes"],
      },
      2: {
        titleKey: "flow.tutorial.lessonContent.chapter-1.steps.2.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-1.steps.2.body",
        focusAreas: ["stoich"],
      },
      3: {
        titleKey: "flow.tutorial.lessonContent.chapter-1.steps.3.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-1.steps.3.body",
        focusAreas: ["rateExpr"],
      },
      4: {
        titleKey: "flow.tutorial.lessonContent.chapter-1.steps.4.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-1.steps.4.body",
        focusAreas: ["parameters"],
      },
      5: {
        titleKey: "flow.tutorial.lessonContent.chapter-1.steps.5.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-1.steps.5.body",
        focusAreas: ["validation"],
      },
    },
    recipes: chapter2Recipes,
    processTeaching: [
      {
        processName: "aerobic_cod_removal",
        titleKey:
          "flow.tutorial.lessonContent.chapter-1.processes.aerobic_cod_removal.title",
        storyKey:
          "flow.tutorial.lessonContent.chapter-1.processes.aerobic_cod_removal.story",
        mistakes: [
          "flow.tutorial.lessonContent.chapter-1.processes.aerobic_cod_removal.mistakes.0",
        ],
      },
    ],
    completionRule: "validation-pass-last-step",
  },
  {
    lessonKey: "chapter-2",
    chapter: "chapter-2",
    difficulty: "beginner",
    templateType: "exercise",
    estimatedMinutes: 25,
    prerequisites: ["chapter-1"],
    seedTemplateKey: "petersen-chapter-2",
    stepConfig: { defaultStep: 1, maxStep: 5 },
    recommendedCharts: ["cod", "dissolvedOxygen", "ammonia"],
    objectives: [
      "flow.tutorial.lessonContent.chapter-2.objectives.0",
      "flow.tutorial.lessonContent.chapter-2.objectives.1",
      "flow.tutorial.lessonContent.chapter-2.objectives.2",
    ],
    stepGuides: {
      1: {
        titleKey: "flow.tutorial.lessonContent.chapter-2.steps.1.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-2.steps.1.body",
        focusAreas: ["components", "processes"],
      },
      2: {
        titleKey: "flow.tutorial.lessonContent.chapter-2.steps.2.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-2.steps.2.body",
        focusAreas: ["stoich"],
      },
      3: {
        titleKey: "flow.tutorial.lessonContent.chapter-2.steps.3.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-2.steps.3.body",
        focusAreas: ["rateExpr"],
      },
      4: {
        titleKey: "flow.tutorial.lessonContent.chapter-2.steps.4.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-2.steps.4.body",
        focusAreas: ["parameters"],
      },
      5: {
        titleKey: "flow.tutorial.lessonContent.chapter-2.steps.5.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-2.steps.5.body",
        focusAreas: ["validation"],
      },
    },
    recipes: chapter2Recipes,
    processTeaching: [
      {
        processName: "aerobic_cod_removal",
        titleKey:
          "flow.tutorial.lessonContent.chapter-2.processes.aerobic_cod_removal.title",
        storyKey:
          "flow.tutorial.lessonContent.chapter-2.processes.aerobic_cod_removal.story",
        mistakes: [
          "flow.tutorial.lessonContent.chapter-2.processes.aerobic_cod_removal.mistakes.0",
          "flow.tutorial.lessonContent.chapter-2.processes.aerobic_cod_removal.mistakes.1",
        ],
      },
      {
        processName: "nitrification",
        titleKey:
          "flow.tutorial.lessonContent.chapter-2.processes.nitrification.title",
        storyKey:
          "flow.tutorial.lessonContent.chapter-2.processes.nitrification.story",
        mistakes: [
          "flow.tutorial.lessonContent.chapter-2.processes.nitrification.mistakes.0",
        ],
      },
    ],
    completionRule: "validation-pass-last-step",
  },
  {
    lessonKey: "chapter-3",
    chapter: "chapter-3",
    difficulty: "intermediate",
    templateType: "exercise",
    estimatedMinutes: 30,
    prerequisites: ["chapter-2"],
    seedTemplateKey: "petersen-chapter-3",
    stepConfig: { defaultStep: 1, maxStep: 5 },
    recommendedCharts: ["cod", "ammonia", "nitrate"],
    objectives: [
      "flow.tutorial.lessonContent.chapter-3.objectives.0",
      "flow.tutorial.lessonContent.chapter-3.objectives.1",
      "flow.tutorial.lessonContent.chapter-3.objectives.2",
    ],
    stepGuides: {
      1: {
        titleKey: "flow.tutorial.lessonContent.chapter-3.steps.1.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-3.steps.1.body",
        focusAreas: ["components", "processes"],
      },
      2: {
        titleKey: "flow.tutorial.lessonContent.chapter-3.steps.2.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-3.steps.2.body",
        focusAreas: ["stoich"],
      },
      3: {
        titleKey: "flow.tutorial.lessonContent.chapter-3.steps.3.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-3.steps.3.body",
        focusAreas: ["rateExpr"],
      },
      4: {
        titleKey: "flow.tutorial.lessonContent.chapter-3.steps.4.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-3.steps.4.body",
        focusAreas: ["parameters"],
      },
      5: {
        titleKey: "flow.tutorial.lessonContent.chapter-3.steps.5.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-3.steps.5.body",
        focusAreas: ["validation"],
      },
    },
    recipes: chapter3Recipes,
    processTeaching: [
      {
        processName: "anoxic_denitrification",
        titleKey:
          "flow.tutorial.lessonContent.chapter-3.processes.anoxic_denitrification.title",
        storyKey:
          "flow.tutorial.lessonContent.chapter-3.processes.anoxic_denitrification.story",
        mistakes: [
          "flow.tutorial.lessonContent.chapter-3.processes.anoxic_denitrification.mistakes.0",
        ],
      },
      {
        processName: "nitrification",
        titleKey:
          "flow.tutorial.lessonContent.chapter-3.processes.nitrification.title",
        storyKey:
          "flow.tutorial.lessonContent.chapter-3.processes.nitrification.story",
        mistakes: [
          "flow.tutorial.lessonContent.chapter-3.processes.nitrification.mistakes.0",
          "flow.tutorial.lessonContent.chapter-3.processes.nitrification.mistakes.1",
        ],
      },
    ],
    completionRule: "validation-pass-last-step",
    continuityProfiles: ["COD", "N"],
  },
  {
    lessonKey: "chapter-7",
    chapter: "chapter-7",
    difficulty: "intermediate",
    templateType: "case",
    estimatedMinutes: 40,
    prerequisites: ["chapter-3"],
    seedTemplateKey: "petersen-chapter-7",
    stepConfig: { defaultStep: 1, maxStep: 5 },
    recommendedCharts: ["S_S", "X_BH", "S_O", "S_NH", "S_NO"],
    objectives: [
      "flow.tutorial.lessonContent.chapter-7.objectives.0",
      "flow.tutorial.lessonContent.chapter-7.objectives.1",
    ],
    stepGuides: {
      1: {
        titleKey: "flow.tutorial.lessonContent.chapter-7.steps.1.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-7.steps.1.body",
        focusAreas: ["components", "processes"],
      },
      2: {
        titleKey: "flow.tutorial.lessonContent.chapter-7.steps.2.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-7.steps.2.body",
        focusAreas: ["stoich"],
      },
      3: {
        titleKey: "flow.tutorial.lessonContent.chapter-7.steps.3.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-7.steps.3.body",
        focusAreas: ["rateExpr"],
      },
      4: {
        titleKey: "flow.tutorial.lessonContent.chapter-7.steps.4.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-7.steps.4.body",
        focusAreas: ["parameters"],
      },
      5: {
        titleKey: "flow.tutorial.lessonContent.chapter-7.steps.5.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-7.steps.5.body",
        focusAreas: ["validation"],
      },
    },
    recipes: chapter3Recipes,
    processTeaching: [
      {
        processName: "aerobic_growth",
        titleKey:
          "flow.tutorial.lessonContent.chapter-7.processes.aerobic_growth.title",
        storyKey:
          "flow.tutorial.lessonContent.chapter-7.processes.aerobic_growth.story",
        mistakes: [
          "flow.tutorial.lessonContent.chapter-7.processes.aerobic_growth.mistakes.0",
        ],
      },
      {
        processName: "decay",
        titleKey:
          "flow.tutorial.lessonContent.chapter-7.processes.decay.title",
        storyKey:
          "flow.tutorial.lessonContent.chapter-7.processes.decay.story",
        mistakes: [
          "flow.tutorial.lessonContent.chapter-7.processes.decay.mistakes.0",
        ],
      },
      {
        processName: "nitrification",
        titleKey:
          "flow.tutorial.lessonContent.chapter-7.processes.nitrification.title",
        storyKey:
          "flow.tutorial.lessonContent.chapter-7.processes.nitrification.story",
        mistakes: [
          "flow.tutorial.lessonContent.chapter-7.processes.nitrification.mistakes.0",
        ],
      },
    ],
    completionRule: "validation-pass-last-step",
    continuityProfiles: ["COD", "N", "ALK"],
  },
]

export function getTutorialLesson(
  key: string | null | undefined,
): TutorialLesson | undefined {
  if (!key) return undefined
  return TUTORIAL_LESSONS.find((lesson) => lesson.lessonKey === key)
}

export function getAvailableLessons(): TutorialLesson[] {
  return TUTORIAL_LESSONS.filter((lesson) => !lesson.comingSoon)
}

export function getEnabledTutorialSteps(
  lesson: TutorialLesson,
): TutorialStep[] {
  return TUTORIAL_STEP_ORDER.filter((step) => step <= lesson.stepConfig.maxStep)
}
