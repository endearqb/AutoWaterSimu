import type { I18nMessages } from "../../types"

export const flowTutorialMessages: Pick<I18nMessages["flow"], "tutorial"> = {
  tutorial: {
    currentStep: "当前步骤：{step}",
    stepLabel: "Step {step}",
    modeDescription: "教学模式会按照课程顺序逐步开放编辑器。",
    mode: {
      guided: "教学模式",
      expert: "专家模式",
    },
    modeToggle: "切换教程编辑模式",
    guide: {
      chapterLabel: "当前章节",
      objectivesTitle: "学习目标",
      currentStepTitle: "步骤 {step} 重点",
      focusAreas: "关注区域",
      watchTitle: "常见误区",
    },
    focusAreas: {
      components: "组分",
      processes: "过程",
      stoich: "化学计量",
      rateExpr: "速率表达式",
      parameters: "参数",
      validation: "校验",
    },
    processHelp: "解释这个过程",
    continuity: {
      sectionTitle: "连续性检查",
      dimensionLabels: {
        COD: "COD 守恒",
        N: "N 守恒",
        ALK: "ALK 守恒",
      },
      statusLabels: {
        pass: "通过",
        warn: "警告",
        error: "错误",
      },
      emptyHint: "点击「校验」后将显示连续性检查结果",
      jumpToProcess: "跳到该过程",
      balanceLabel: "平衡值",
      explanationLabel: "说明",
      suggestionLabel: "建议",
      teachingHints: {
        whyFailed: "为什么不平衡？",
        howToFix: "怎么修正？",
        reference: "查阅相关章节",
      },
    },
    recipeBar: {
      title: "表达式配方",
    },
    recipes: {
      monodSubstrate: {
        label: "Monod 基质项",
        description: "插入一个受基质限制的 Monod 表达式。",
      },
      oxygenSwitch: {
        label: "溶解氧开关",
        description: "插入好氧条件下的溶解氧限制项。",
      },
      yieldConsumption: {
        label: "产率系数耗分",
        description: "插入异养菌经典的基质耗分因子。",
      },
      alkBalance: {
        label: "碱度平衡",
        description: "插入一个简单的碱度换算因子。",
      },
    },
    sectionTitle: "Petersen 矩阵教程",
    sectionSubtitle: "从直觉理解到在线仿真，逐步掌握活性污泥模型",
    continueLearning: "继续学习",
    startLearning: "开始学习",
    viewAnswer: "查看答案",
    runCase: "运行案例",
    comingSoon: "即将推出",
    prerequisite: "需先完成: {name}",
    completed: "已完成",
    minutes: "{n} 分钟",
    difficulty: {
      beginner: "入门",
      intermediate: "进阶",
      full: "完整",
    },
    templateType: {
      exercise: "练习",
      answer: "答案",
      case: "案例",
      guide: "讲解",
    },
    chapters: {
      "chapter-1": {
        title: "记账本直觉：箭头矩阵",
        subtitle: "理解反应过程中谁增加、谁减少",
      },
      "chapter-2": {
        title: "你的第一张真矩阵",
        subtitle: "理解 Y_H 产率系数与 Monod 动力学",
      },
      "chapter-3": {
        title: "连续性检查：COD/N 对账",
        subtitle: "学会用守恒原理验证矩阵正确性",
      },
      "chapter-7": {
        title: "基础 CSTR 仿真",
        subtitle: "从矩阵到可运行的仿真模型",
      },
    },
    lessonContent: {
      "chapter-1": {
        objectives: {
          0: "先分清\u201C组分\u201D是物种，\u201C过程\u201D是转化。",
          1: "在编写公式之前，先会用符号矩阵阅读谁增加、谁减少。",
        },
        steps: {
          1: {
            title: "先看清参与者",
            body: "先确认组分和过程名称，暂时不要改数字。目标是理解谁参与了反应。",
          },
          2: {
            title: "读矩阵上的符号",
            body: "利用仅显示增减方向的矩阵，判断每个过程中哪些组分被耗分，哪些被生成。",
          },
          3: {
            title: "预览速率表达式",
            body: "本章暂不开放速率公式，但可以先看看这个位置，理解后面动力学会放在哪里。",
          },
          4: {
            title: "预览参数区",
            body: "本章参数区仍然锁定。先熟悉位置，后续再把常量提取成参数。",
          },
          5: {
            title: "预览校验",
            body: "校验区会在后面的章节才真正开放。这一章的关键是养成先读矩阵的习惯。",
          },
        },
        processes: {
          aerobic_cod_removal: {
            title: "好氧 COD 去除",
            story:
              "异养菌消耗可溶性基质和溶解氧，并把其中一部分转化为生物量。",
            mistakes: {
              0: "如果基质和生物量的符号方向一样，你很可能在描述堆积而不是增长。",
            },
          },
        },
      },
      "chapter-2": {
        objectives: {
          0: "完成一条完整的好氧异养生长行。",
          1: "把 Monod 动力学与过程含义对应起来。",
          2: "把常量提升为可复用参数，而不是写死在公式里。",
        },
        steps: {
          1: {
            title: "从模板开始",
            body: "先检查预加载的组分和过程，然后找出代表异养菌生长的那一行。",
          },
          2: {
            title: "平衡化学计量",
            body: "被耗分的写负，被生成的写正。Y_H 通常就体现在\u201C生物量 / 基质\u201D的对应关系里。",
          },
          3: {
            title: "组合速率公式",
            body: "用增长速率、基质可利用性和溶解氧可利用性组成这个过程的动力学表达式。",
          },
          4: {
            title: "把常量提升为参数",
            body: "把 mu_H、K_S、K_OH 和 Y_H 移到参数表中，让模型可复用。",
          },
          5: {
            title: "完成本章校验",
            body: "运行校验，修复命名或表达式问题，并让整个过程行成功通过。",
          },
        },
        processes: {
          aerobic_cod_removal: {
            title: "好氧异养生长",
            story: "这一行代表好氧异养菌生长：基质和溶解氧下降，生物量上升。",
            mistakes: {
              0: "如果基质系数是正的，就表示这个过程在\u201C生成食物\u201D而不是\u201C消耗食物\u201D。",
              1: "如果只把 Y_H 写在速率公式里，就会把矩阵应该教会的质量关系隐藏掉。",
            },
          },
          nitrification: {
            title: "硝化",
            story: "自养菌在好氧条件下将氨氮氧化为硝酸盐。",
            mistakes: {
              0: "如果硝化不消耗氧，这个过程的含义就不完整。",
            },
          },
        },
      },
      "chapter-3": {
        objectives: {
          0: "在多个过程之间检查 COD 和氮的连续性。",
          1: "在比较好氧和缺氧路径时依然保持符号纪律。",
          2: "利用校验反馈直接跳到有问题的单元格。",
        },
        steps: {
          1: {
            title: "理清氮的故事线",
            body: "先看出哪些过程会把氮从氨推向硝酸盐，哪些过程在缺氧条件下会去除硝酸氧。",
          },
          2: {
            title: "完成化学计量",
            body: "在矩阵中同时编码 COD、氧、氨、硝酸氧和碱度的方向关系。",
          },
          3: {
            title: "叠加动力学",
            body: "加入基质、硝酸氧和开关因子，但不要混淆生物学含义。",
          },
          4: {
            title: "为对比调参做准备",
            body: "把共用的常数拉到参数表里，让好氧和缺氧过程可以并排比较。",
          },
          5: {
            title: "用连续性检查收尾",
            body: "运行校验，利用问题跳转功能修复错误的符号、名称或单元格。",
          },
        },
        processes: {
          anoxic_denitrification: {
            title: "缺氧反硝化",
            story:
              "在缺氧条件下，异养菌使用硝酸盐作为电子受体，同时消耗基质。",
            mistakes: {
              0: "如果速率仍然被溶解氧激活，这个过程就不是真正的缺氧过程。",
            },
          },
          nitrification: {
            title: "硝化",
            story: "硝化将氨氮转化为硝酸盐，通常还会使碱度下降。",
            mistakes: {
              0: "氨和硝酸盐符号写反，是最容易打破氮平衡的错误。",
              1: "如果碱度始终不变，这个硝化过程就缺了一个很重要的教学信号。",
            },
          },
        },
      },
      "chapter-7": {
        objectives: {
          0: "在运行仿真之前，先检查适合教学用途的 seed 模型。",
          1: "把矩阵、参数和校验与可运行的 CSTR 案例联系起来。",
        },
        steps: {
          1: {
            title: "先看反应器状态",
            body: "查看教程 seed，确认这个 CSTR 案例将使用的组分和过程。",
          },
          2: {
            title: "回看化学计量",
            body: "在仿真章节正式开放编辑前，先检查每一行的方向是否合理。",
          },
          3: {
            title: "回看动力学",
            body: "查看预置的速率表达式，注意其中的开关项如何对应反应器行为。",
          },
          4: {
            title: "回看参数集",
            body: "确认这个 seed 模型携带的参数集，为第一个仿真情景做准备。",
          },
          5: {
            title: "为仿真做准备",
            body: "先用校验确保 seed 内容一致，等待后续的仿真讲解开放。",
          },
        },
        processes: {
          aerobic_growth: {
            title: "好氧异养生长",
            story:
              "异养菌在好氧条件下消耗可溶性基质（S_S）和溶解氧（S_O），将基质转化为生物量（X_BH）。速率遵循双 Monod 动力学。",
            mistakes: {
              0: "如果 S_O 没有消耗，说明氧的化学计量系数可能缺失。",
            },
          },
          decay: {
            title: "生物量衰减",
            story:
              "在所有条件下，生物量都会经历内源呼吸衰减，将活性生物量转化为惰性颗粒物和缓慢降解基质。",
            mistakes: {
              0: "衰减速率不应依赖基质浓度——它是一阶过程。",
            },
          },
          nitrification: {
            title: "硝化（自养生长）",
            story:
              "自养菌在好氧条件下将氨氮（S_NH）氧化为硝酸盐（S_NO），消耗大量溶解氧。",
            mistakes: {
              0: "硝化不消耗有机基质（S_S），如果你的速率表达式中包含 S_S，需要重新检查。",
            },
          },
        },
      },
    },
    results: {
      panelTitle: "教程引导",
      noResultHint: "运行仿真后，这里将显示推荐曲线和教学解释。",
      unknownLesson: "未知的课程",
      recommendedCharts: "推荐观测变量",
      selectVariableHint: "点击上方标签选择要观测的变量",
      insightsTitle: "结果解读",
    },
    matrix: {
      title: "箭头矩阵",
      description: "先读清每个化学计量项的方向，再去编辑公式。",
      processHeader: "过程",
      noneSymbol: "0",
      consumeSymbol: "被消耗",
      produceSymbol: "被生成",
    },
    aliases: {
      templates: {
        asm1: {
          name: "ASM1 Petersen 种子模板",
          description: "用于 Petersen 矩阵建模的标准 ASM1 种子模板。",
        },
        asm1slim: {
          name: "ASM1 Slim Petersen 种子模板",
          description: "用于入门教学的精简 ASM1Slim Petersen 模板。",
        },
        asm3: {
          name: "ASM3 Petersen 种子模板",
          description: "用于 Petersen 矩阵建模的标准 ASM3 种子模板。",
        },
        "petersen-chapter-1": {
          name: "第 1 章教程种子",
          description: "用于理解增减方向的箭头矩阵起步模板。",
        },
        "petersen-chapter-2": {
          name: "第 2 章教程种子",
          description: "包含第一条完整好氧生长行的 Petersen 矩阵模板。",
        },
        "petersen-chapter-3": {
          name: "第 3 章教程种子",
          description: "用于比较好氧与缺氧路径的连续性检查模板。",
        },
        "petersen-chapter-7": {
          name: "第 7 章教程种子",
          description: "用于基础 CSTR 仿真的 ASM1 教学模板。",
        },
      },
      lessons: {
        "chapter-1": {
          models: {
            default: {
              name: "第 1 章教程种子",
              description: "用于理解增减方向的箭头矩阵起步模板。",
            },
          },
          components: {
            dissolvedOxygen: {
              label: "溶解氧",
              description: "好氧氧化过程中的电子受体。",
            },
            cod: {
              label: "有机基质（COD）",
              description: "用 COD 表示的可降解有机物。",
            },
            nitrate: {
              label: "硝酸盐氮",
              description: "可在反硝化中被还原的氧化态氮。",
            },
            ammonia: {
              label: "氨氮",
              description: "可被硝化的还原态无机氮。",
            },
            totalAlkalinity: {
              label: "碱度",
              description: "受硝化与反硝化共同影响的缓冲能力。",
            },
          },
          processes: {
            aerobic_cod_removal: {
              label: "好氧 COD 去除",
              description: "有机基质在好氧条件下被氧化。",
            },
          },
          parameters: {
            aerobicCODDegradationRate: {
              label: "好氧 COD 速率",
              description: "经验型好氧 COD 降解系数。",
            },
          },
        },
        "chapter-2": {
          models: {
            default: {
              name: "第 2 章教程种子",
              description: "包含第一条完整好氧生长行的 Petersen 矩阵模板。",
            },
          },
          components: {
            dissolvedOxygen: {
              label: "溶解氧",
              description: "好氧氧化过程中的电子受体。",
            },
            cod: {
              label: "有机基质（COD）",
              description: "用 COD 表示的可降解有机物。",
            },
            nitrate: {
              label: "硝酸盐氮",
              description: "可在反硝化中被还原的氧化态氮。",
            },
            ammonia: {
              label: "氨氮",
              description: "可被硝化的还原态无机氮。",
            },
            totalAlkalinity: {
              label: "碱度",
              description: "受硝化与反硝化共同影响的缓冲能力。",
            },
          },
          processes: {
            aerobic_cod_removal: {
              label: "好氧异养生长",
              description: "COD 和氧被消耗，同时形成生物量等价 COD。",
            },
            anoxic_denitrification: {
              label: "缺氧反硝化",
              description: "在低氧条件下消耗 COD 并还原硝酸盐。",
            },
            nitrification: {
              label: "硝化",
              description: "氨氮被氧化为硝酸盐，同时消耗碱度。",
            },
          },
          parameters: {
            empiricalDenitrificationRate: {
              label: "反硝化速率",
              description: "经验型反硝化速率系数。",
            },
            empiricalNitrificationRate: {
              label: "硝化速率",
              description: "经验型硝化速率系数。",
            },
            empiricalCNRatio: {
              label: "COD/N 比",
              description: "单位硝酸盐还原所需的经验 COD 需求。",
            },
            codDenitrificationInfluence: {
              label: "COD 半饱和项",
              description: "反硝化动力学中的 COD 敏感项。",
            },
            nitrateDenitrificationInfluence: {
              label: "硝酸盐半饱和项",
              description: "反硝化动力学中的硝酸盐敏感项。",
            },
            ammoniaNitrificationInfluence: {
              label: "氨氮半饱和项",
              description: "硝化动力学中的氨氮敏感项。",
            },
            aerobicCODDegradationRate: {
              label: "好氧 COD 速率",
              description: "经验型好氧 COD 降解系数。",
            },
          },
        },
        "chapter-3": {
          models: {
            default: {
              name: "第 3 章教程种子",
              description: "用于比较好氧与缺氧路径的连续性检查模板。",
            },
          },
          components: {
            dissolvedOxygen: {
              label: "溶解氧",
              description: "好氧氧化过程中的电子受体。",
            },
            cod: {
              label: "有机基质（COD）",
              description: "用 COD 表示的可降解有机物。",
            },
            nitrate: {
              label: "硝酸盐氮",
              description: "可在反硝化中被还原的氧化态氮。",
            },
            ammonia: {
              label: "氨氮",
              description: "可被硝化的还原态无机氮。",
            },
            totalAlkalinity: {
              label: "碱度",
              description: "受硝化与反硝化共同影响的缓冲能力。",
            },
          },
          processes: {
            aerobic_cod_removal: {
              label: "好氧异养生长",
              description: "用于连续性对比的参考好氧 COD 去除行。",
            },
            anoxic_denitrification: {
              label: "缺氧反硝化",
              description: "消耗 COD、去除硝酸盐并回补部分碱度。",
            },
            nitrification: {
              label: "硝化",
              description: "氨氮变成硝酸盐，同时碱度下降。",
            },
          },
          parameters: {
            empiricalDenitrificationRate: {
              label: "反硝化速率",
              description: "经验型反硝化速率系数。",
            },
            empiricalNitrificationRate: {
              label: "硝化速率",
              description: "经验型硝化速率系数。",
            },
            empiricalCNRatio: {
              label: "COD/N 比",
              description: "单位硝酸盐还原所需的经验 COD 需求。",
            },
            codDenitrificationInfluence: {
              label: "COD 半饱和项",
              description: "反硝化动力学中的 COD 敏感项。",
            },
            nitrateDenitrificationInfluence: {
              label: "硝酸盐半饱和项",
              description: "反硝化动力学中的硝酸盐敏感项。",
            },
            ammoniaNitrificationInfluence: {
              label: "氨氮半饱和项",
              description: "硝化动力学中的氨氮敏感项。",
            },
            aerobicCODDegradationRate: {
              label: "好氧 COD 速率",
              description: "经验型好氧 COD 降解系数。",
            },
          },
        },
        "chapter-7": {
          models: {
            default: {
              name: "第 7 章教程种子",
              description: "用于基础 CSTR 仿真的 ASM1 教学模板。",
            },
          },
          components: {
            X_BH: { label: "异养菌生物量", description: "活性异养菌生物量 COD。" },
            X_BA: { label: "自养菌生物量", description: "活性自养菌生物量 COD。" },
            X_S: { label: "缓慢可降解基质", description: "颗粒态可降解有机基质。" },
            X_i: { label: "惰性颗粒 COD", description: "颗粒态惰性有机物。" },
            X_ND: { label: "颗粒有机氮", description: "颗粒态可降解有机氮。" },
            S_O: { label: "溶解氧", description: "好氧反应电子受体。" },
            S_S: { label: "易降解基质", description: "可溶性可降解有机基质。" },
            S_NO: { label: "硝酸盐氮", description: "氧化态无机氮。" },
            S_NH: { label: "氨氮", description: "还原态无机氮。" },
            S_ND: { label: "可溶性有机氮", description: "可溶性可降解有机氮。" },
            S_ALK: { label: "碱度", description: "受氮转化过程影响的中和能力。" },
          },
          processes: {
            heterotrophic_growth_aerobic: {
              label: "好氧异养生长",
              description: "在有氧条件下消耗易降解基质并生成异养菌生物量。",
            },
            heterotrophic_growth_anoxic: {
              label: "缺氧异养生长",
              description: "在缺氧条件下消耗基质并还原硝酸盐。",
            },
            autotrophic_growth: {
              label: "自养菌生长",
              description: "在好氧条件下把氨氮氧化为硝酸盐。",
            },
            heterotrophic_decay: {
              label: "异养菌衰减",
              description: "活性异养菌衰减为惰性及含氮产物。",
            },
            autotrophic_decay: {
              label: "自养菌衰减",
              description: "活性自养菌衰减为惰性颗粒产物。",
            },
            ammonification: {
              label: "氨化",
              description: "可溶性有机氮转化为氨氮。",
            },
            hydrolysis: {
              label: "水解",
              description: "缓慢可降解颗粒基质转化为可溶性基质。",
            },
            hydrolysis_nitrogen: {
              label: "含氮颗粒水解",
              description: "颗粒有机氮转化为可溶性有机氮。",
            },
          },
          parameters: {
            u_H: { label: "异养菌最大生长速率", description: "异养菌的最大比生长速率。" },
            K_S: { label: "基质半饱和常数", description: "易降解基质的半饱和常数。" },
            K_OH: { label: "异养菌氧半饱和常数", description: "异养菌对溶解氧的限制常数。" },
            K_NO: { label: "硝酸盐半饱和常数", description: "缺氧异养生长中的硝酸盐限制常数。" },
            n_g: { label: "缺氧生长修正系数", description: "缺氧异养生长修正因子。" },
            b_H: { label: "异养菌衰减速率", description: "异养菌的一阶衰减速率。" },
            u_A: { label: "自养菌最大生长速率", description: "自养菌的最大比生长速率。" },
            K_NH: { label: "氨氮半饱和常数", description: "自养菌生长中的氨氮限制常数。" },
            K_OA: { label: "自养菌氧半饱和常数", description: "自养菌对溶解氧的限制常数。" },
            b_A: { label: "自养菌衰减速率", description: "自养菌的一阶衰减速率。" },
            Y_H: { label: "异养菌产率", description: "单位基质消耗对应的异养菌生物量产率。" },
            Y_A: { label: "自养菌产率", description: "单位氨氧化对应的自养菌生物量产率。" },
            i_XB: { label: "生物量含氮系数", description: "活性生物量中的含氮量。" },
            i_XP: { label: "颗粒产物含氮系数", description: "颗粒产物中的含氮量。" },
            f_P: { label: "颗粒产物比例", description: "衰减生物量转化为颗粒产物的比例。" },
            n_h: { label: "缺氧水解修正系数", description: "缺氧条件下水解反应修正因子。" },
            K_a: { label: "氨化速率", description: "可溶性有机氮转化为氨氮的速率系数。" },
            K_h: { label: "水解速率", description: "颗粒基质水解速率系数。" },
            K_x: { label: "水解半饱和常数", description: "颗粒基质水解的半饱和常数。" },
          },
        },
      },
    },
    insights: {
      "chapter-1": {
        codDecline: {
          title: "COD 为什么下降？",
          body: "COD（化学需氧量）代表水中可被微生物降解的有机物浓度。在好氧条件下，微生物将 COD 作为碳源和能源消耗。你会看到 COD 先快速下降（有机物充足时降解最快），然后逐渐减缓——这就是 Monod 动力学的典型表现。",
        },
        doConsumption: {
          title: "DO 消耗说明什么？",
          body: "溶解氧（DO）是好氧降解的必要条件。微生物在氧化 COD 时消耗氧气，因此 DO 下降速度反映了微生物活动的强度。如果 DO 很快降到接近零，说明耗氧速率超过了曝气供给，实际运行中需要增加曝气量。",
        },
      },
      "chapter-2": {
        yieldEffect: {
          title: "Y_H 如何影响化学计量系数？",
          body: "产率系数 Y_H 表示每消耗 1 单位 COD 能转化为多少生物量。Y_H 越大，相同的 COD 消耗产生更多污泥、消耗更少的氧气。在 Petersen 矩阵中，很多化学计量系数都是 Y_H 的函数，例如耗氧量为 -(1-Y_H)/Y_H。改变 Y_H 会同时影响多个组分的变化速率。",
        },
        monodSaturation: {
          title: "降解为什么变慢？",
          body: "Monod 方程 S/(K_S+S) 描述了基质浓度对降解速率的影响。当 S >> K_S 时，速率接近最大值（零级反应）；当 S << K_S 时，速率与 S 成正比（一级反应）。观察 COD 曲线从快速下降到逐渐平缓的转变，就是从零级向一级反应过渡的过程。",
        },
        nitrificationOnset: {
          title: "硝化何时启动？",
          body: "硝化菌（自养菌）将氨氮转化为硝态氮。观察氨氮曲线：如果在仿真初期氨氮就开始下降，说明硝化过程已经启动。硝化速率受溶解氧和氨氮浓度双重控制——DO 不足时硝化会被抑制。",
        },
      },
      "chapter-3": {
        aerobicVsAnoxic: {
          title: "好氧 vs 缺氧路径",
          body: "COD 可以通过两条路径被降解：好氧路径（使用 O\u2082 作为电子受体）和缺氧路径（使用 NO\u2083\u207B 作为电子受体，即反硝化）。当 DO 浓度低时，微生物会转向使用硝酸盐，这就是反硝化脱氮的原理。本章设置低 DO 和高硝酸盐，就是为了观察这一切换。",
        },
        nitrogenBalance: {
          title: "氮去哪了？",
          body: "观察氨氮和硝态氮的变化：氨氮通过硝化转化为硝态氮（NH\u2084\u207A \u2192 NO\u2083\u207B），硝态氮又通过反硝化转化为氮气逸出（NO\u2083\u207B \u2192 N\u2082\u2191）。如果氨氮下降但硝态氮没有等量上升，说明部分氮已经通过反硝化离开了系统。",
        },
        alkalinitySignal: {
          title: "碱度变化告诉我们什么？",
          body: "碱度（Alkalinity）是硝化/反硝化过程的指示剂。硝化消耗碱度（每氧化 1 mg NH\u2084\u207A-N 消耗约 7.14 mg CaCO\u2083），反硝化恢复碱度（每还原 1 mg NO\u2083\u207B-N 恢复约 3.57 mg CaCO\u2083）。碱度的净变化可以帮助判断硝化和反硝化的相对强度。",
        },
      },
      "chapter-7": {
        ssDeclination: {
          title: "S_S 为什么随时间下降？",
          body: "可溶性基质 S_S 被异养菌（X_BH）消耗。根据 Monod 动力学，当 S_S 远大于 K_S 时消耗速率最快；当 S_S 接近 K_S 时速率减缓。这就是为什么 S_S 曲线通常呈现先快后慢的下降趋势。",
        },
        xbhGrowth: {
          title: "X_BH 为什么先快速增长然后趋稳？",
          body: "异养菌的增长受到 S_S 浓度的限制。初始阶段 S_S 充足时，X_BH 快速增长；随着 S_S 被耗尽，增长速率下降。当增长速率与衰减速率接近平衡时，X_BH 趋于稳定。",
        },
        oxygenDemand: {
          title: "S_O 的变化告诉我们什么？",
          body: "溶解氧的消耗反映了生物反应的耗氧需求。好氧异养生长和硝化都消耗氧气。如果 S_O 快速降至零，说明曝气量不足或进水负荷过高。在实际运行中，这意味着需要增加曝气。",
        },
        nitrification: {
          title: "S_NH 和 S_NO 的反向变化",
          body: "硝化过程将氨氮（S_NH）转化为硝酸盐（S_NO），因此 S_NH 下降的同时 S_NO 上升。如果 S_O 不足，硝化会受到抑制，S_NH 可能无法完全被转化。",
        },
      },
    },
    explosionDebug: {
      alertTitle: "检测到数值异常",
      checklistTitle: "排查清单",
      items: {
        checkInitialValues: "检查初值：是否有浓度为 0 的分母项？（如 K_S=0 会导致除零）",
        checkStoichiometry: "检查化学计量系数：符号是否正确？（消耗为负，生成为正）",
        reduceStepSize: "尝试减小步长：增加 steps_per_hour（如从 20 增加到 100）",
        checkVolume: "检查反应器体积：是否相对流量太小？（小体积会导致快速稀释）",
        checkRateExpressions: "验证速率表达式：所有 Monod 项的半饱和常数 K 是否 > 0？",
      },
    },
    completion: {
      congratsTitle: "恭喜完成本章！",
      congratsBody: "你已经成功完成了从矩阵定义到仿真运行的完整闭环。",
      markComplete: "标记完成",
      nextChapter: "下一章",
      alreadyCompleted: "本章已完成",
    },
  },
}
