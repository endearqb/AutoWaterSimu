interface StoryContent {
  type: "heading" | "question" | "paragraph"
  content: string
}

export interface Story {
  id: number
  title: string
  description?: string
  name: string
  company: string
  country?: string
  src: string
  video?: string
  content: StoryContent[]
}

export const stories: Story[] = [
  {
    id: 1,
    title: "Material Balance - 基于张量计算的物料平衡模拟器",
    description:
      "Material Balance采用PyTorch张量计算和ODE求解器，实现高性能的物料平衡动态模拟，支持复杂流程网络的实时计算和可视化分析。",
    name: "耳边风",
    company: "ENVDAMA",
    country: "中国",
    src: "/assets/avatars/E-logo.png",
    content: [
      {
        type: "heading",
        content: "Material Balance 是进入污水处理模拟世界的第一扇门。",
      },
      {
        type: "question",
        content: "什么是物料平衡模拟？",
      },
      {
        type: "paragraph",
        content:
          "在污水处理建模中，物料平衡是最基础也最关键的一步。它不涉及复杂的生物反应，而是关注系统中每一组分的“进、出、累积”过程，是否满足质量守恒定律。Material Balance模块通过张量化的流程图建模界面，让用户可以自由拖拽构建进水、出水、反应池、连接管道等单元，并通过系统自动生成的常微分方程（ODE）进行动态模拟。无论是学生初学者还是工程人员，都可以快速理解水质如何随时间变化。",
      },
      {
        type: "question",
        content: "核心技术优势是什么？",
      },
      {
        type: "paragraph",
        content:
          "该模块基于PyTorch构建，利用GPU加速的张量运算和向量化数据结构，可处理多组分、多节点的流体网络，支持自动拓扑分析和流程自验证。ODE求解器支持多种高阶方法（如RK45、Radau、BDF等），适用于刚性和非刚性系统。用户在可视化界面中拖拽创建流程图后，只需点击“开始模拟”，系统便可实时输出浓度变化、体积平衡、时间序列等关键结果。",
      },
      {
        type: "question",
        content: "如何与后续模型学习衔接？",
      },
      {
        type: "paragraph",
        content:
          "Material Balance不仅是学习曲线的起点，更是通向ASM1模型理解的桥梁。它让用户在不考虑复杂生物反应的前提下掌握建模流程、流程图绘制、物质流概念和计算逻辑。通过这个模块，用户将建立起对“池体体积”“流量连接”“边界条件”“张量求解”等核心概念的直觉认知，为后续ASM1-Slim和ASM1模型的学习打下坚实基础。",
      },
    ],
  },

  {
    id: 2,
    title: "ASM1Slim - 简化的活性污泥模型入门模拟器",
    description:
      "ASM1Slim通过简化的生化反应路径与五个核心状态变量，为用户提供了一个高效、直观的活性污泥模型学习与实验平台，兼具教学性与工程实用性。",
    name: "耳边风",
    company: "ENVDAMA",
    country: "中国",
    src: "/assets/avatars/E-logo.png",
    content: [
      {
        type: "heading",
        content: "ASM1Slim 是用户从物料平衡进入活性污泥模型世界的最佳起点。",
      },
      {
        type: "question",
        content: "ASM1Slim模型的设计理念是什么？",
      },
      {
        type: "paragraph",
        content:
          "ASM1Slim是对经典ASM1模型的精简重构，保留了溶解氧、可生化有机物、硝态氮、氨氮和碱度五个关键变量，重点模拟硝化、反硝化和碳降解等核心过程。通过逻辑清晰的Monod函数与条件判断逻辑（好氧/缺氧切换），该模型在不牺牲基本生化机制准确性的前提下，大幅降低了模型复杂度与学习门槛，特别适合教学、快速原型测试和初学者入门。",
      },
      {
        type: "question",
        content: "界面操作体验如何？",
      },
      {
        type: "paragraph",
        content:
          "ASM1Slim模块延续了Material Balance的拖拽建模理念，用户可通过可视化流程图界面快速构建反应池网络，配置节点属性，设置仿真参数，并一键启动模拟计算。流程图画布支持反应器、输入/输出节点的自由连接与布局，右侧检查器提供属性设置、计算控制与仿真结果预览三大标签页。无论是模型搭建、参数配置还是结果分析，都可在同一页面中完成，操作便捷直观。",
      },
      {
        type: "question",
        content: "它与完整ASM1模型的关系如何？",
      },
      {
        type: "paragraph",
        content:
          "ASM1Slim是连接“无反应物料平衡”与“全状态ASM1模型”的中间桥梁。通过使用简化的反应机制（如经验速率、碳氮比、抑制条件等），用户可以初步理解“反硝化-好氧降解-硝化”三段反应的动态耦合方式，为后续全面掌握ASM1完整模型中更多微生物种群与代谢路径打下坚实基础。它是学习者逐步构建生化直觉、形成状态变量动态理解的关键一环。",
      },
    ],
  },
  {
    id: 3,
    title: "ASM1 - 标准活性污泥模型模拟器",
    description:
      "ASM1模块完整实现IWA标准活性污泥模型（Activated Sludge Model No.1），支持多状态变量、多过程反应、复杂网络的构建与动态仿真，适用于工艺设计、教学研究与运行优化。",
    name: "耳边风",
    company: "ENVDAMA",
    country: "中国",
    src: "/assets/avatars/E-logo.png",
    content: [
      {
        type: "heading",
        content:
          "ASM1 是污水处理建模中的黄金标准，也是SaaS平台模拟能力的核心体现。",
      },
      {
        type: "question",
        content: "ASM1模块支持哪些核心功能？",
      },
      {
        type: "paragraph",
        content:
          "ASM1模块基于IWA官方发布的ASM1模型标准，支持11个状态变量、8类生化过程，并通过张量计算实现复杂动态系统的高效仿真。用户可以通过拖拽方式创建多单元网络，包括输入、输出、混合、反应节点，并针对每个节点设置详细参数（如X_BH、S_S、S_NO等）。右侧属性检查器支持快速切换参数设置、仿真控制与计算任务面板，模拟结果以时间序列、质量平衡、最终状态等多维形式展示。",
      },
      {
        type: "question",
        content: "ASM1相较ASM1Slim有哪些提升？",
      },
      {
        type: "paragraph",
        content:
          "相比ASM1Slim的5状态变量和经验速率逻辑，ASM1模块引入了完整的颗粒与溶解态有机物、氮、碱度变量，并显式建模微生物生长、衰亡、水解、硝化等过程，计算精度和可解释性大幅提升。该模块支持自定义模型参数（如μ_H, Y_H, K_S等），并可模拟多池级联、不同运行模式（如A/O、UCT）下的动态行为，是实际工程分析与研究的标准工具。",
      },
      {
        type: "question",
        content: "ASM1模块适合哪些使用者？",
      },
      {
        type: "paragraph",
        content:
          "ASM1模块适合已有基础的环境工程学生、污水处理厂工程师和科研人员使用。对于希望深入理解微生物过程机制、进行参数敏感性分析、模拟不同控制策略下系统行为的用户而言，它是进入污水处理建模专业世界的重要一环。通过本模块，用户可实现从学习建模逻辑，到验证运行策略，再到撰写科研报告的完整闭环。",
      },
    ],
  },
  {
    id: 4,
    title: "模型扩展 - 生物与化学反应的自由组合引擎",
    description:
      "模型扩展模块支持在同一流程图中混合使用多个生物模型（如ASM1、ASM2d、ASM3）以及用户自定义的化学反应（如氧化还原、沉淀、气液传质等），为高阶用户提供强大的建模自由度和研究能力。",
    name: "耳边风",
    company: "ENVDAMA",
    country: "中国",
    src: "/assets/avatars/E-logo.png",
    content: [
      {
        type: "heading",
        content:
          "模型扩展功能是从教学走向研究、从标准模型走向真实系统的关键一步。",
      },
      {
        type: "question",
        content: "如何在同一流程图中混用多种生物模型？",
      },
      {
        type: "paragraph",
        content:
          "该模块支持将多个生物模型节点（如ASM1、ASM2d、ASM3等）放入同一流程图中使用。每个生物反应器节点都可独立指定其模型类型与参数库，系统在运行时会自动识别每个节点的计算逻辑与状态变量维度，自动完成张量对齐与边界数据映射。这使得用户可以模拟如A²/O、MBR+Anammox、多阶段生物脱氮等真实流程中混合模型协同工作的复杂网络，是教学与研究从“单模型演练”走向“真实工艺还原”的桥梁。",
      },
      {
        type: "question",
        content: "是否可以自定义化学反应过程，例如氧化还原反应？",
      },
      {
        type: "paragraph",
        content:
          "平台支持用户通过配置文件或图形界面定义新的反应路径与速率表达式，特别适合构建氧化还原反应、金属离子沉淀、pH缓冲体系等化学子模型。用户可指定反应物、产物、反应级数、速率常数以及是否受温度/pH/离子强度控制，系统会自动集成到流程节点的ODE求解框架中。这一能力特别适用于高级科研任务，如构建S_2O_8²⁻氧化法、铁-磷共沉淀、次氯酸氧化还原等模块，实现“生化-化学”协同反应的精准模拟。",
      },
      {
        type: "question",
        content: "模型扩展适合哪些使用者？",
      },
      {
        type: "paragraph",
        content:
          "该功能适合具有一定建模基础、希望突破标准模型边界的科研人员与高阶工程师使用。它支持从教学走向研究，从仿真走向定制，使用户能够在平台内重现文献中的先进工艺或构建全新反应链路，是打造“可编程水处理模型引擎”的关键能力。",
      },
    ],
  },
]
