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
import { localizedText, type LocalizedText } from "./tutorialContent"

export type TutorialDifficulty = "beginner" | "intermediate" | "full"
export type TutorialTemplateType = "exercise" | "answer" | "case" | "guide"
export type TutorialMode = "guided" | "expert"
export type TutorialRecipeCategory = "monod" | "stoich" | "switch"
export type TutorialStep = 1 | 2 | 3 | 4 | 5
export type TutorialCompletionRule = "validation-pass-last-step"

export interface TutorialStepGuide {
  titleKey: string
  bodyKey: string
  extendedGuide?: LocalizedText[]
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
  summary: LocalizedText
  entryHighlights: LocalizedText[]
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
  continuityPanelNotes?: LocalizedText[]
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
    summary: localizedText(
      "第 1 章先建立 Petersen 矩阵的阅读直觉：把组分看成账本列，把过程看成账本行，用箭头矩阵判断谁被消耗、谁被生成。",
      "Chapter 1 builds matrix-reading intuition first: treat components as ledger columns, processes as rows, and use the arrow matrix to see what is consumed or produced.",
    ),
    entryHighlights: [
      localizedText(
        "Step 1 先看 Components/Processes，不要求先写公式。",
        "Step 1 focuses on components and processes before any formulas are edited.",
      ),
      localizedText(
        "本章会优先显示箭头矩阵，帮助区分“增加 / 减少 / 不变”。",
        "This chapter emphasizes the arrow matrix to distinguish increase, decrease, and no-change states.",
      ),
      localizedText(
        "速率表达式、参数表和校验区在这一章主要是建立位置感。",
        "Rate expressions, parameters, and validation are mostly previewed here to establish spatial familiarity.",
      ),
    ],
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
        extendedGuide: [
          localizedText(
            "优先确认每一列到底代表水中哪一类组分，再去看每一行代表什么反应故事。",
            "Confirm what each column represents in the water before deciding what story each process row is telling.",
          ),
          localizedText(
            "如果这一阶段就急着改公式，通常会把“矩阵在描述什么”这件事跳过去。",
            "If you rush into formulas at this stage, you usually skip the more important question of what the matrix is describing.",
          ),
        ],
        focusAreas: ["components", "processes"],
      },
      2: {
        titleKey: "flow.tutorial.lessonContent.chapter-1.steps.2.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-1.steps.2.body",
        extendedGuide: [
          localizedText(
            "红色/绿色方向提示比数字更重要，它决定了你后面填入系数时是否会把符号写反。",
            "The consume/produce direction matters more than the numbers because it prevents sign mistakes later.",
          ),
          localizedText(
            "读箭头矩阵时可以先只问一句话：这个过程结束后，哪些组分应该变少，哪些应该变多？",
            "When reading the arrow matrix, start with one question: after this process happens, which components should go down and which should go up?",
          ),
        ],
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
    summary: localizedText(
      "第 2 章进入第一张完整的真矩阵：先填 stoich，再写 rate expression，再把 `Y_H`、`K_S`、`K_OH` 等常量抽成参数并通过 validate。",
      "Chapter 2 is the first complete working matrix: fill stoichiometry, write the rate expression, extract constants like `Y_H`, `K_S`, and `K_OH`, then pass validate.",
    ),
    entryHighlights: [
      localizedText(
        "Step 2 开始正式编辑 stoich，重点是先守住符号方向。",
        "Step 2 is where real stoichiometric editing starts, with sign discipline as the first goal.",
      ),
      localizedText(
        "Step 3 会开放 recipe bar，帮助拼出 Monod 与开关项。",
        "Step 3 opens the recipe bar to help compose Monod and switching terms.",
      ),
      localizedText(
        "Step 4-5 要把公式里的常量抽到参数区，并完成一次 validate。",
        "Step 4-5 moves constants into the parameter section and closes with a validate pass.",
      ),
    ],
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
        extendedGuide: [
          localizedText(
            "这一章不再只是读矩阵，要先找出那一行真正代表“异养菌好氧生长”。",
            "This chapter is no longer just matrix reading: first identify the row that truly represents aerobic heterotrophic growth.",
          ),
          localizedText(
            "如果过程含义没找对，后面的 stoich、速率和参数都会连锁偏掉。",
            "If the process meaning is wrong, stoichiometry, kinetics, and parameters all drift off together.",
          ),
        ],
        focusAreas: ["components", "processes"],
      },
      2: {
        titleKey: "flow.tutorial.lessonContent.chapter-2.steps.2.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-2.steps.2.body",
        extendedGuide: [
          localizedText(
            "先把“被消耗写负、被生成写正”守住，再去考虑 `-1/Y_H` 这种比例写法。",
            "Lock in the negative-for-consumed and positive-for-produced rule before dealing with ratio terms like `-1/Y_H`.",
          ),
          localizedText(
            "如果 `Y_H` 只出现在速率公式里而不出现在 stoich，你通常还没有把质量关系写完整。",
            "If `Y_H` only appears in the rate law and not in stoichiometry, the mass relationship is usually incomplete.",
          ),
        ],
        focusAreas: ["stoich"],
      },
      3: {
        titleKey: "flow.tutorial.lessonContent.chapter-2.steps.3.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-2.steps.3.body",
        extendedGuide: [
          localizedText(
            "这一步的目标不是一次写出最复杂公式，而是先把增长速率、基质限制、溶解氧限制拼成一条可读公式。",
            "The goal here is not the most complex equation, but a readable growth law built from growth rate, substrate limitation, and oxygen limitation.",
          ),
          localizedText(
            "不会写时先用 recipe bar 插入片段，再根据过程含义把它们连起来。",
            "If you get stuck, insert snippets from the recipe bar first and then assemble them according to the process meaning.",
          ),
        ],
        focusAreas: ["rateExpr"],
      },
      4: {
        titleKey: "flow.tutorial.lessonContent.chapter-2.steps.4.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-2.steps.4.body",
        extendedGuide: [
          localizedText(
            "参数区出现后，要把 `mu_H`、`K_S`、`K_OH`、`Y_H` 这类可复用常量从表达式里抽出来。",
            "Once the parameter section appears, extract reusable constants like `mu_H`, `K_S`, `K_OH`, and `Y_H` from the expressions.",
          ),
          localizedText(
            "参数范围先求合理，不必一步到位；重点是不要把参数继续写死在表达式里。",
            "Parameter ranges only need to be reasonable at first; the main goal is to stop hard-coding constants in the expressions.",
          ),
        ],
        focusAreas: ["parameters"],
      },
      5: {
        titleKey: "flow.tutorial.lessonContent.chapter-2.steps.5.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-2.steps.5.body",
        extendedGuide: [
          localizedText(
            "这一章的通过标准不是“所有内容都很复杂”，而是过程名、参数名和表达式都能被系统正确解析。",
            "Passing this lesson does not require complexity; it requires process names, parameter names, and expressions that the system can parse correctly.",
          ),
          localizedText(
            "有问题时优先点校验项跳回对应区域，而不是靠肉眼在大表里来回找。",
            "When issues appear, jump from the validation item back to the target field instead of scanning the whole table manually.",
          ),
        ],
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
    summary: localizedText(
      "第 3 章把教程重点放到 COD/N 连续性检查：你不仅要写出矩阵，还要学会用 continuity panel 解释 warning、定位错误并回到对应过程修正。",
      "Chapter 3 shifts the focus to COD/N continuity checks: you still build the matrix, but now you must also interpret warnings, locate the issue, and fix the right process row.",
    ),
    entryHighlights: [
      localizedText(
        "本章只关注 `COD` 与 `N` 两个 continuity 维度，不把未启用维度混入判断。",
        "This chapter only focuses on the enabled `COD` and `N` continuity dimensions.",
      ),
      localizedText(
        "Step 5 的重点是用 continuity panel + jump-to-process 完成闭环排错。",
        "Step 5 centers on using the continuity panel and jump-to-process workflow to close the debugging loop.",
      ),
      localizedText(
        "缺氧反硝化和硝化会一起出现，适合对比不同电子受体条件下的符号关系。",
        "Anoxic denitrification and nitrification appear together, making it easier to compare sign logic across electron acceptor conditions.",
      ),
    ],
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
        extendedGuide: [
          localizedText(
            "先把氮的路径讲清楚：谁消耗氨、谁生成硝酸盐、谁在缺氧条件下消耗硝酸盐。",
            "Explain the nitrogen pathway first: who consumes ammonia, who generates nitrate, and who consumes nitrate under anoxic conditions.",
          ),
          localizedText(
            "如果故事线没讲清，后面很容易把氨氮和硝酸盐的符号写反。",
            "If the story line is unclear, ammonia and nitrate signs are easy to reverse later.",
          ),
        ],
        focusAreas: ["components", "processes"],
      },
      2: {
        titleKey: "flow.tutorial.lessonContent.chapter-3.steps.2.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-3.steps.2.body",
        extendedGuide: [
          localizedText(
            "这一章的 stoich 不只是碳，还要一起考虑氧、氨、硝酸盐和碱度的方向。",
            "Stoichiometry in this chapter covers not only carbon, but also oxygen, ammonia, nitrate, and alkalinity directions together.",
          ),
          localizedText(
            "看不准时先保证主反应物和主产物方向正确，再补充辅助组分。",
            "If you are unsure, lock down the main reactant and product directions first, then fill in secondary species.",
          ),
        ],
        focusAreas: ["stoich"],
      },
      3: {
        titleKey: "flow.tutorial.lessonContent.chapter-3.steps.3.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-3.steps.3.body",
        extendedGuide: [
          localizedText(
            "缺氧过程的速率表达式里应体现“氧关闭、硝酸盐开启”的逻辑。",
            "The anoxic rate law should reflect the logic of oxygen off and nitrate on.",
          ),
          localizedText(
            "如果一个过程的动力学和它的过程名不一致，连续性通过也不代表你写对了生物学含义。",
            "Even if continuity passes, mismatched kinetics and process meaning still indicate a biologically wrong row.",
          ),
        ],
        focusAreas: ["rateExpr"],
      },
      4: {
        titleKey: "flow.tutorial.lessonContent.chapter-3.steps.4.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-3.steps.4.body",
        extendedGuide: [
          localizedText(
            "把共用常量抽到参数区后，你会更容易比较好氧/缺氧两条路径到底差在哪个限制项。",
            "Once shared constants move into parameters, it becomes easier to compare which limiting term differs between aerobic and anoxic paths.",
          ),
          localizedText(
            "参数区不是附属表，而是后续校准和对比实验的入口。",
            "The parameter table is not a side table; it is the entry point for later calibration and comparison experiments.",
          ),
        ],
        focusAreas: ["parameters"],
      },
      5: {
        titleKey: "flow.tutorial.lessonContent.chapter-3.steps.5.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-3.steps.5.body",
        extendedGuide: [
          localizedText(
            "Chapter 3 的关键不是把所有 balance value 都背下来，而是知道它们应尽量接近 0，并学会从 panel 跳回矩阵修正。",
            "The key in Chapter 3 is not memorizing balance values, but knowing they should stay close to 0 and using the panel to jump back and fix the matrix.",
          ),
          localizedText(
            "如果只看顶层通过/失败，不看具体过程和维度，就很难学会守恒检查真正的排错价值。",
            "If you only watch the top-level pass/fail state and ignore process-level dimensions, you miss the real debugging value of continuity checks.",
          ),
        ],
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
    continuityPanelNotes: [
      localizedText(
        "本章 continuity panel 只需要关注 `COD` 与 `N` 两个维度；它们来自课程配置而不是所有可用维度的全集。",
        "In this chapter, the continuity panel only needs `COD` and `N`; those dimensions come from the lesson configuration rather than the full available set.",
      ),
      localizedText(
        "`Balance value` 越接近 0 越好；点击过程名会直接跳回矩阵对应行，适合配合 Step 5 修正。",
        "A `Balance value` closer to 0 is better; clicking the process name jumps back to the matching matrix row, which is ideal for Step 5 fixes.",
      ),
    ],
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
    summary: localizedText(
      "第 7 章把前面通过校验的模型转成可运行的基础 CSTR 案例：保存模型、生成默认流程图、加载预设求解器参数，然后在 `/udm` 中查看推荐曲线与解释卡。",
      "Chapter 7 turns the validated model into a runnable basic CSTR case: save the model, generate the default flowchart, load the solver preset, then inspect charts and explanation cards in `/udm`.",
    ),
    entryHighlights: [
      localizedText(
        "本章会沿用教程 flow preset，自动生成 `Input → UDM Reactor → Output`。",
        "This chapter reuses the tutorial flow preset to generate `Input → UDM Reactor → Output` automatically.",
      ),
      localizedText(
        "进入 `/udm` 后会自动带上 lessonKey，并显示教程结果 tab。",
        "After entering `/udm`, the lesson key is preserved and the tutorial result tab becomes available.",
      ),
      localizedText(
        "推荐曲线、结果解释卡和爆炸曲线排错清单会一起形成仿真闭环。",
        "Recommended charts, interpretation cards, and the explosion-debug checklist together complete the simulation loop.",
      ),
    ],
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
        extendedGuide: [
          localizedText(
            "这一章用的是更完整的 ASM1 教学模板，所以组分和过程数量都会明显多于前几章。",
            "This chapter uses a fuller ASM1 teaching template, so the component and process counts are noticeably larger than in earlier lessons.",
          ),
          localizedText(
            "先把 seed 的结构看懂，再进入“保存并生成流程图”的动作会更顺畅。",
            "Understanding the seed structure first makes the later save-and-generate action much easier to follow.",
          ),
        ],
        focusAreas: ["components", "processes"],
      },
      2: {
        titleKey: "flow.tutorial.lessonContent.chapter-7.steps.2.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-7.steps.2.body",
        extendedGuide: [
          localizedText(
            "这一章通常不需要大改矩阵，但仍应回头确认关键过程的方向关系没有问题。",
            "Large matrix edits are usually unnecessary here, but you should still verify the key process directions.",
          ),
          localizedText(
            "好氧生长、衰减、硝化三类过程是后面解释曲线时最常用的参照。",
            "Aerobic growth, decay, and nitrification are the core references for interpreting the final curves.",
          ),
        ],
        focusAreas: ["stoich"],
      },
      3: {
        titleKey: "flow.tutorial.lessonContent.chapter-7.steps.3.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-7.steps.3.body",
        extendedGuide: [
          localizedText(
            "速率表达式里已经内置了教学用的限制项，重点是读懂它们如何决定反应器里的趋势。",
            "The rate expressions already contain the teaching-oriented limitation terms; your goal is to read how they shape reactor behavior.",
          ),
          localizedText(
            "这一章更像“带着解释去看公式”，而不是“从零写公式”。",
            "This chapter is more about reading formulas with interpretation than writing them from scratch.",
          ),
        ],
        focusAreas: ["rateExpr"],
      },
      4: {
        titleKey: "flow.tutorial.lessonContent.chapter-7.steps.4.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-7.steps.4.body",
        extendedGuide: [
          localizedText(
            "在生成流程图前先看参数表，可以帮助你理解预设场景为什么会给出这些默认曲线。",
            "Reviewing the parameter table before flowchart generation helps explain why the preset scenario produces its default curves.",
          ),
          localizedText(
            "如果后面想做灵敏度分析，这一章的参数表就是最直接的切入点。",
            "If you later run sensitivity experiments, this parameter table is the most direct starting point.",
          ),
        ],
        focusAreas: ["parameters"],
      },
      5: {
        titleKey: "flow.tutorial.lessonContent.chapter-7.steps.5.title",
        bodyKey: "flow.tutorial.lessonContent.chapter-7.steps.5.body",
        extendedGuide: [
          localizedText(
            "先校验再生成流程图，可以避免把表达式或名称错误直接带进仿真阶段。",
            "Validating before generating the flowchart prevents expression or naming errors from leaking into simulation.",
          ),
          localizedText(
            "校验通过后，下一步就是点击 `Save & Generate Flowchart` 跳转到 `/udm` 运行教程场景。",
            "After validation passes, the next step is `Save & Generate Flowchart`, which jumps into `/udm` to run the lesson scenario.",
          ),
        ],
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
    continuityPanelNotes: [
      localizedText(
        "Chapter 7 会继续把 continuity 当成 seed 健康检查，用来确认模型进入仿真前没有明显守恒问题。",
        "Chapter 7 keeps continuity as a seed health check so the model enters simulation without obvious conservation issues.",
      ),
      localizedText(
        "如果 continuity 已通过但仿真结果异常，下一步应转向结果页里的爆炸曲线排错清单，而不是只盯着矩阵。",
        "If continuity passes but the simulation still looks wrong, move to the explosion-debug checklist on the result page instead of staring only at the matrix.",
      ),
    ],
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
