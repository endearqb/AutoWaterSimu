# **QSDsan：用于环境卫生和资源回收系统量化可持续设计的集成平台深度解析**

## **1\. QSDsan 简介：推进量化可持续设计**

### **1.1. QSDsan 的定义及其在环境卫生和资源回收领域的核心使命**

QSDsan 是一个开源的 Python 工具平台，专为环境卫生和资源回收系统的量化可持续设计（Quantitative Sustainable Design, QSD）而开发 。该平台旨在解决早期环境卫生技术研发、部署（RD\&D）过程中缺乏有效支持工具的问题 。其核心目标是整合系统设计、模拟和可持续性表征（包括技术经济分析 TEA 和生命周期评价 LCA），从而识别关键障碍、优先确定研究机会，并在多维度的可持续性权衡中进行导航 。这一平台的出现，不仅仅是提供了一个软件包，更是为应对全球性的可持续环境卫生挑战提供了关键的分析手段。特别地，其对“早期技术” 的关注，凸显了其在充满不确定性的创新和开发阶段的实用价值。如相关研究中所述，开发稳健且灵活的工具对于支持环境卫生和资源回收技术的 RD\&D 至关重要，而 QSDsan 正是为此目标而生 。

### **1.2. 开源、社区主导的模式**

QSDsan 强调其为一个“开源、社区主导的平台” 。它致力于通过清晰的贡献指南、在线文档和教程（包括视频演示）实现透明化管理 。这种开源的特性极大地促进了工具的可及性、协作和透明度，这些对于科学进步和建立用户对工具的信任至关重要。社区主导的模式则鼓励持续改进和根据用户需求进行调整。这种开放合作的理念，旨在汇聚全球的智慧，共同推动环境卫生技术的进步。

### **1.3. 与 BioSTEAM 和 Thermosteam 的关系：基于成熟基础的构建**

QSDsan 借鉴了现有的成熟平台，特别是 BioSTEAM，并在其基础上进行了增强，增加了针对环境卫生和资源回收领域的特定功能 。它继承了 BioSTEAM 中与 SanUnit（环境卫生单元）、System（系统）、TEA（技术经济分析）和 Model（模型）相关的类，以及 Thermosteam 中与 Component（组分）和 WasteStream（废物流）相关的类 。BioSTEAM 本身是一个用于生物精炼厂设计、模拟和技术经济分析的平台 。这种继承关系是 QSDsan 发展策略中的一个关键点。通过构建于 BioSTEAM 之上，QSDsan 得以利用一个经过验证的、成熟的流程模拟和 TEA 框架，使其开发者能够集中精力于环境卫生系统的独特方面，例如废水特性、特定的单元操作以及 LCA 的整合。这不仅加速了 QSDsan 的开发进程，也保证了其核心功能的稳健性，同时为 BioSTEAM 和 QSDsan 社区之间的思想交流和用户基础共享创造了可能。例如，QSDsan 中的一些换热器单元与 BioSTEAM 中的单元相似，但为适应 SanStream 和 WasteStream 进行了调整 。

### **1.4. 集成能力概述：系统设计、过程建模、TEA 和 LCA**

QSDsan 将系统设计、过程建模与模拟、技术经济分析（TEA）和生命周期评价（LCA）整合到一个统一的平台中 。其主要特性包括废物流的宏观属性计算、平衡态和动态过程建模、用户自定义的单元操作设计、自动化系统模拟、集成的 TEA/LCA、不确定性和敏感性分析，以及内置的可视化功能 。这种高度集成是 QSDsan 的核心优势。它允许对环境卫生技术进行全面的评估，同时考虑经济可行性和环境影响，并且能够在不确定性条件下进行分析。这与传统方法中常常需要使用多个独立工具分别进行不同方面分析的做法形成了对比，后者往往导致执行困难和透明度不足的问题 。QSDsan 的集成方法使得系统设计上的任何变动都能自动传递到经济成本和环境影响的计算中，从而促进了对设计方案和不确定性进行动态且一致的评估，这对于在可持续设计中驾驭复杂的权衡关系至关重要。  
QSDsan 将自身定位为一个全面的决策支持系统，服务于环境卫生这一关键且资源相对匮乏的领域的可持续技术发展。其对“量化可持续设计”、“早期技术”、“优先研究机会”以及驾驭“多维度可持续性权衡”的强调 ，表明其战略重点已超越简单的过程建模，旨在有效地指导 RD\&D 工作。

## **2\. QSDsan 生态系统导航：文档与核心结构**

### **2.1. QSDsan 文档结构概述**

QSDsan 的主要文档页面 提供了一个侧边栏，包含了关键的导航部分：教程（Tutorials）、应用程序接口（API）、系统案例（Systems）、常见问题解答（FAQ）、贡献者与指南（Contributors and Guidelines）、行为准则（Code of Conduct）、活动日历（Calendar）和更新日志（Change Log）。理解文档结构是任何新用户入门的第一步。教程、API 参考和贡献者指南的存在表明这是一个得到良好支持且不断发展的平台。相关资料亦提及，文档托管于 https://qsdsan.readthedocs.io，教程则采用 Jupyter Notebook 形式编写 。  
尽管如此，需要注意的是，根据现有信息，许多教程子页面（例如 ）和部分 API 子页面（例如 ）被报告为无法访问。因此，本报告将主要依据可访问页面和研究论文中的信息来描述这些组成部分。  
下表概述了 QSDsan 文档的主要部分，为用户深入研究该平台提供了清晰的路径指引。  
**表 1：QSDsan 文档部分概述**  | 栏目 | URL 存根 | 简要描述 (推断/说明) | | :--------------------------- | :--------------------------------------- | :-------------------------------------------------------------------------------------------------- | | 教程 (Tutorials) | tutorials/\_index.html | 用于学习 QSDsan 功能的指导性示例 (安装、基础知识、核心对象、TEA、LCA)。 | | API | api/\_index.html | QSDsan 类、模块和函数的详细技术参考。 | | 系统案例 (Systems) | Systems.html | 可能展示在 QSDsan 中实现的环境卫生系统模型示例。 | | 常见问题 (FAQ) | FAQ.html | 关于 QSDsan 的常见问题解答。 | | 贡献者与指南 (Contributors and Guidelines) | CONTRIBUTING.html | 为希望参与 QSDsan 开发的个人提供的信息。 | | 贡献者行为准则 (Contributor Code of Conduct) | CODE\_OF\_CONDUCT.html | 社区互动的道德准则。 | | QSDsan 日历 (QSDsan Calendar) | calendar.html | QSDsan 相关活动 (研讨会、答疑时间) 的日程安排。 | | 更新日志 (Change Log) | CHANGELOG.html | 不同 QSDsan 版本中的更新、新功能和错误修复记录。 |  
该文档结构，通过教程、API 文档和系统案例等不同部分，为用户提供了一条结构化的学习路径，从引导式学习到深入的技术参考，满足了不同专业水平和学习偏好的用户的需求。“贡献者与指南”和“行为准则”部分 也标志着一个有组织且受欢迎的开发社区。

### **2.2. 关键架构组件及其层次结构**

QSDsan 采用面向对象编程（Object-Oriented Programming, OOP）范式 。其核心类包括 Component（组分）、WasteStream（废物流）、Process（过程）、SanUnit（环境卫生单元）、System（系统）、TEA（技术经济分析）、LCA（生命周期评价）、ImpactIndicator（影响指标）和 ImpactItem（影响条目） 。这些类以分层的方式相互作用，从最基础的物质定义（Component）到复杂的系统评估（TEA, LCA）。OOP 方法提供了灵活性和模块化特性，允许用户定义自定义的组分、单元操作和整个系统。理解这种层次结构是有效使用 QSDsan 的关键。一篇重要的研究论文 通过图示（图1，在文本中描述）和解释阐明了这一点：“Component 和 WasteStream 类……继承自 Thermosteam……Process 类……支持动态模拟……SanUnit、System、TEA 和 Model 类……继承自 BioSTEAM……包括 ImpactIndicator、ImpactItem 和 LCA 在内的绿色框图代表 QSDsan 中为实现 LCA 功能而实施的部分。” 另一篇文献 也描述了从 Component 到 WasteStream、SanUnit、System，再到 TEA 和 LCA 的流程。  
这种 OOP 范式和分层类结构是 QSDsan 灵活性的基石，使用户能够对多样化和新颖的环境卫生技术进行建模。OOP 允许为特定技术创建新的 SanUnit 子类，这些子类在继承基础功能的同时添加了独特的逻辑。Component 对象可以针对特定的废水特性进行定制。这种模块化意味着该平台不局限于预定义的技术，而是可以由用户社区进行扩展，以应对环境卫生领域的新兴挑战和创新。这对于一个旨在支持“早期技术” RD\&D 的工具来说至关重要 。

## **3\. QSDsan 中的基本构建模块**

QSDsan 的核心功能由一系列精心设计的类来实现，这些类构成了模拟和评估环境卫生系统的基础。这些构建模块从物质的基本定义开始，逐步构建到复杂的工艺流程和可持续性评估框架。

### **3.1. Component 类：定义物质及其属性**

在 QSDsan 中，用户首先通过创建 Component 对象来定义系统中的各种物质 。这些对象用于存储与废水处理相关的关键属性，例如氮含量、总悬浮固体、化学需氧量（COD）与质量的比率等 。Component 对象可以链接到数据库中的纯化学品以获取热力学性质，也可以根据需要手动创建 。准确的组分定义是任何过程模拟的基石。对于环境卫生系统而言，这不仅意味着定义标准化学品，还包括定义具有特定性质的复杂废水组分，这些性质与处理过程和环境影响评估密切相关。Component 类继承自 Thermosteam 的 Chemical 类，并增加了与废水相关的特性 。API 文档列表 中包含了 Component (api/Component.html)。

### **3.2. WasteStream 类：表征物质和能量流动**

基于已定义的 Component 对象，可以创建 WasteStream 对象来管理系统中的物质和能量流动 。WasteStream 对象负责追踪各个组分的数量、相态、温度和压力，并且能够计算流体的宏观属性，如挥发性悬浮固体的浓度 。在系统中，WasteStream 对象连接不同的 SanUnit 对象，构成了物质和能量在系统中流动的通道 。其准确的表征对于单元操作设计和整个系统的物料/能量平衡至关重要。计算宏观属性的能力对于废水应用尤其有用。WasteStream 类继承自 Thermosteam 的 Stream 类 。API 文档列表 中的 streams (api/streams.html) 部分应涵盖了 WasteStream 的相关内容。

### **3.3. SanUnit 类：模拟环境卫生系统中的单元操作**

SanUnit 类用于设计和模拟环境卫生系统中的各个单元操作，例如生物反应器、沉淀池、厕所等 。每个 SanUnit 的进料和出料均由 WasteStream 对象表示。单元内部的组分转化可以采用平衡模式或动态模式进行模拟。SanUnit 对象还存储了设计参数、成本信息和公用工程消耗等属性，这些属性可以是固定值，也可以根据进料流的特性或过程模拟的结果进行计算 。SanUnit 作为一种“总括性”的基类，可以派生出针对特定技术的子类 。值得注意的是，SanUnit.construction 属性用于存储与该单元建造相关的 Construction 对象，这些信息将用于生命周期评价（LCA） 。SanUnit 是 QSDsan 中核心的处理元件。定义自定义单元以及模拟平衡和动态行为的灵活性，使得平台能够表征广泛的环境卫生技术。将成本和建造数据直接整合到单元定义中，有效地将过程设计与 TEA 和 LCA 联系起来。SanUnit 类继承自 BioSTEAM，并增加了动态模拟和处理建造清单的功能 。API 文档 的 api/sanunits/\_index.html 下展示了大量预定义的 SanUnit，从 ActivatedSludgeProcess（活性污泥法）到 Toilet（厕所）和 Trucking（卡车运输）等，体现了其对环境卫生领域的专注。

### **3.4. System 类：将单元操作集成为完整过程**

多个 SanUnit 对象通过 WasteStream 对象连接起来，并聚合成一个 System 对象 。System 类负责管理整个系统的模拟过程。在平衡模式下，它负责收敛系统的物料和能量平衡；在动态模式下，它负责编译和积分系统中每个 SanUnit 内组分累积的常微分方程组（ODEs）。模拟收敛后，用户提供的设计算法会更新单元成本和系统清单（化学品/材料用量、排放/废物产生量），这些数据随后将用于 TEA 和 LCA 。System 类使得构建和模拟完整的环境卫生价值链或处理厂成为可能。它协调各个 SanUnit 之间的相互作用，并为可持续性评估提供总体结果。System 类继承自 BioSTEAM 。教程列表 中包含了一个关于 System 的教程 (tutorials/6\_System.html)。

### **3.5. Process 类：定义动力学和平衡转化**

Process 对象用于描述组分之间的动力学相互作用，存储了化学计量关系和反应速率方程等数据。该类还包含了基于物料守恒自动计算未知化学计量系数的算法。多个 Process 对象可以被编译成动力学模型（例如 ASM1），用于反应器的模拟 。Process 类对于模拟反应系统至关重要，而反应系统是许多环境卫生技术（如生物废水处理）的核心。定义自定义动力学和化学计量关系的能力提供了强大的建模功能。一篇文献 指出：“红色的 Process 类能够实现组分对象在动力学过程（例如底物降解）中转化的动态模拟。” API 文档列表 中包含了 Process (api/Process.html) 以及一个名为 processes (api/processes/\_index.html) 的子类别，其中包含了如 ADM1、ASM1、ASM2d 等模型。  
QSDsan 的这种从 Component 到 WasteStream，再到 SanUnit 和 System 的类结构，创建了一个清晰的数据流，自然地支持了集成的 TEA 和 LCA。Component 的属性定义了基本的构建模块，WasteStream 量化了它们的流动，而 SanUnit 则对这些流进行转化，并内在地拥有设计、成本和建造属性 。当这些单元被聚合成一个 System 后，总体的物料/能量平衡、成本和环境清单便可供 TEA 和 LCA 类进行处理。这种相互关联性是平台集成评估能力的关键。  
尽管 QSDsan 继承自通用的过程模拟工具（BioSTEAM, Thermosteam），但其核心类（Component, WasteStream, SanUnit）都经过了特别调整，以适应环境卫生和资源回收的需求。例如，文献 提到了 Component 和 WasteStream 的“废水相关属性”，以及 SanUnit 的“动态模拟和处理建造清单的附加能力”。大量专门的 SanUnit （如 Excretion（排泄）、Toilet（厕所）、SepticTank（化粪池）、SludgePasteurization（污泥巴氏消毒）以及各种生物反应器）清晰地表明了其对环境卫生系统中特有单元操作的关注，这些单元操作可能并非通用化工过程模拟器的标准配置。  
SanUnit 作为一个包含多个专业化子类的“总括性”基类 ，是一种强大的抽象机制，使得 QSDsan 能够模拟广泛且不断发展的环境卫生技术。通过这种方式，新技术可以作为新的 SanUnit 子类被添加进来，每个子类封装其特定的设计逻辑、成本函数和环境清单。这使得平台具有高度的可扩展性和适应性，能够应对该领域未来的创新，与其支持“早期技术” RD\&D 的目标相一致。  
下表总结了 QSDsan 的核心类及其主要功能，为理解该平台的架构提供了基础。  
**表 2：QSDsan 核心类及其主要功能** | 类名称 | 继承自 (若已知) | 主要功能 | 描述功能的关键信息来源 | | :---------------- | :----------------------- | :-------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------- | | Component | Thermosteam Chemical | 定义物质及其物理化学性质，特别是与废水相关的属性。 | | | WasteStream | Thermosteam Stream | 代表物质和能量流动，追踪组分数量、相态、温度、压力；计算宏观属性。 | | | SanUnit | BioSTEAM | 模拟单个单元操作；处理组分转化 (平衡/动态)；存储设计/成本/LCI 数据。 | (大量列表), S\_B16, 9, S\_S4 | | System | BioSTEAM | 聚合 SanUnit 和 WasteStream；管理总体模拟和用于 TEA/LCA 的数据。 | | | Process | QSDsan 特有 | 定义 SanUnit 内转化的动力学/平衡反应、化学计量和速率方程。 | (过程模型列表) | | TEA | BioSTEAM | 执行技术经济分析，基于 System 数据计算成本、盈利能力等。 | (教程提及) | | LCA | QSDsan 特有 | 执行生命周期评价，基于 System 清单和 ImpactItem 计算环境影响。 | (教程提及), S\_B16, 9, S\_S4 | | ImpactIndicator | QSDsan 特有 | 定义 LCA 的环境影响类别 (例如，全球变暖潜能值 GWP、富营养化)。 | | | ImpactItem | QSDsan 特有 | 通过特征化因子将清单条目 (材料、能源、排放) 与 ImpactIndicator 联系起来。 | | | Construction | QSDsan 特有 | 核算与 SanUnit 建造相关的环境影响，与 ImpactItem 相关联。 | |

## **4\. QSDsan 的技术经济分析 (TEA)**

技术经济分析（TEA）是 QSDsan 平台不可或缺的一部分，用于评估环境卫生系统的经济可行性。尽管具体的 TEA API 页面 在现有资料中被标记为无法访问，但通过其他文档和研究论文，仍可以勾勒出其核心功能和应用。

### **4.1. TEA 在 QSDsan 中的目的与整合**

TEA 的主要目的是评估环境卫生系统的经济性 。在 QSDsan 中，成本分析通过 TEA 类执行。每个 SanUnit 的资本成本和运营成本由其特定的成本算法确定，而整个系统的总成本是这些单元成本的总和 。对于可持续的环境卫生解决方案而言，经济可行性与技术性能或环境影响同等重要。集成的 TEA 功能使得用户能够快速评估设计选择或操作参数如何影响成本。TEA 类继承自 BioSTEAM ，这表明它可能利用了 BioSTEAM 中成熟的 TEA 框架。文档 中也提及了相关的 TEA 教程 (tutorials/7\_TEA.html)。

### **4.2. 成本分析与盈利能力评估的关键要素和方法**

TEA 类内置了计算成本和盈利能力指标（如净收益、投资回收期、净现值）的算法 。用户可以提供诸如所得税率和折现率等输入参数 。各个 SanUnit 自身带有的设计、成本和公用工程消耗属性，为 TEA 提供了基础数据 。这些元素共同构成了一个标准化的框架，用于评估不同环境卫生系统设计和技术的经济表现。QSDsan 的 TEA 模块在继承自 BioSTEAM 的基础上，可能提供了一个标准化的 TEA 框架（如 中提到的 NPV、回收期等通用指标），同时允许用户通过在 SanUnit 内部定义成本算法以及修改 TEA 类本身来进行定制 。这种标准化与定制化的平衡，使得 QSDsan 既稳健又灵活，能够适应多样化的 TEA 应用场景。标准化对于跨研究和系统比较至关重要，而定制化则是因为环境卫生技术，特别是新兴技术，可能具有通用模型未涵盖的独特成本构成。

### **4.3. QSDsan 项目中 TEA 的应用实例**

QSDsan 已被应用于多个实际项目中，以评估其经济性。例如，它被用于表征基于热解的 Omni Processors 处理粪便污泥的财务可行性 ，以及 NEWgenerator 非下水道环境卫生系统的财务可行性 。在对标模拟模型1（BSM1）的案例研究中，TEA 被用来比较三种替代性环境卫生系统，结果表明 B 系统由于其廉价的设施和沼气销售收入而最为经济实惠 。这些实例展示了 QSDsan 中的 TEA 如何帮助进行实际决策，比较不同方案，并识别成本驱动因素。  
TEA 与系统设计的紧密集成，即 SanUnit 成本根据设计和 System 模拟结果进行更新 ，使得经济考量成为设计过程中一个积极的驱动因素，而不仅仅是事后的分析。如果 SanUnit 设计（如尺寸、材料）或 System 配置的变化能够立即反映在整体 TEA 结果中，工程师和研究人员就可以在性能和环境影响之外，迭代优化设计的成本效益。这种迭代反馈循环对于实现“量化可持续设计”至关重要。此外，能够纳入所得税率和折现率等参数 ，并在不确定性条件下分析系统 ，使得经济评估更具针对性和现实性。经济可行性高度依赖于当地的财务条件和参数的内在不确定性（如市场价格、运营效率）。通过允许整合这些因素，QSDsan 的 TEA 超越了通用的成本估算，为特定部署场景和风险评估提供了更相关的见解。

## **5\. 用于环境可持续性的生命周期评价 (LCA)**

生命周期评价（LCA）是 QSDsan 中用于评估环境卫生系统环境可持续性的核心工具。尽管具体的 LCA API 页面 在现有资料中无法访问，但通过教程、研究论文和高层级描述，可以清晰地了解其框架、核心类和方法学。

### **5.1. QSDsan 中的 LCA 框架**

在 QSDsan 中，LCA 通过 LCA 类执行，该类利用从 SanUnit 对象自动生成的清单数据 。为了实现 LCA 功能，QSDsan 引入了多个新的类，包括 ImpactIndicator（影响指标）、ImpactItem（影响条目）、StreamImpactItem（流影响条目）和 Construction（建造）。LCA 提供了一种系统化的方法，用于评估产品或系统在其整个生命周期中潜在的环境影响。将其整合到 QSDsan 中，使得平台能够进行超越单纯经济性的综合可持续性评估。文献 将 ImpactIndicator、ImpactItem 和 LCA 标记为 QSDsan 特有的实现（绿色框图），用以支持 LCA 功能。详细的教程 对这些 LCA 类进行了阐述。

### **5.2. 核心 LCA 类：ImpactIndicator、ImpactItem、StreamImpactItem 和 Construction**

这些类是构建详细的生命周期清单（LCI）并在 QSDsan 内执行生命周期影响评价（LCIA）的基础。

* **ImpactIndicator**：此类用于定义特定的环境影响类别及其单位，例如“全球变暖潜能值”（GlobalWarming）及其单位“kg CO2 当量”（kg CO2-eq）。其关键初始化属性包括 ID（标识符）、unit（单位）和可选的 alias（别名）。可以通过 ID 或 alias 检索已定义的指标。例如，GWP \= qs.ImpactIndicator(ID='GlobalWarming', unit='kg CO2-eq')。  
* **ImpactItem**：此类用于指定与某个条目（例如“电力”）的每个功能单元（例如“kWh”）相关的环境影响。特征化因子（Characterization Factors, CFs）将 ImpactItem 与一个或多个 ImpactIndicator 联系起来。ImpactItem 拥有一个 price 属性，但主要用于建造条目，并计入单元的资本支出（CAPEX）。可以通过 item.add\_indicator() 方法添加特征化因子。  
* **StreamImpactItem**：这是 ImpactItem 的一个子类，专门用于处理物质输入（如化学品）和产生的废物/排放物。它可以链接到一个特定的 WasteStream，从而在该流的流量发生变化时自动更新其数量。其 price 属性也与关联流的 price 相链接 。  
* **Construction**：此类用于核算与特定 SanUnit 建造相关的环境影响。这些 Construction 对象存储在相应 SanUnit 的 SanUnit.construction 属性中。每个 Construction 活动（如水泥、沙子、挖掘等）都链接到一个 ImpactItem。总的环境影响根据该活动的数量及其关联 ImpactItem 的特征化因子计算得出 。例如，文献 中展示了 bw.A2.construction 包含的多个建造活动。

QSDsan 的 LCA 框架，特别是通过与 WasteStream 链接的 StreamImpactItem 和与 SanUnit 链接的 Construction 条目 ，实现了生命周期清单（LCI）的精细化和高度自动化汇编。当系统模拟运行并且 WasteStream 流量或 SanUnit 设计确定后，相关 StreamImpactItem 和 Construction 活动的数量会自动更新。这种过程模型输出与 LCI 输入之间的直接联系，最大限度地减少了手动数据传输，增强了一致性，并允许在系统参数更改时快速重新计算 LCA。这相对于手动创建 LCI 是一个显著的优势。

### **5.3. 环境影响量化方法**

系统清单数据，包括化学品/材料用量、排放物和废物产生量，均由 SanUnit 对象在模拟过程中自动生成 。ImpactItem 对象通过特征化因子将这些清单条目与预定义的 ImpactIndicator 联系起来 。总的环境影响是通过将清单条目的数量乘以其各自的特征化因子来计算的。例如，水泥的环境影响计算公式为 Cement.impacts\['GlobalWarming'\] \== Cement.item.CFs\['GlobalWarming'\] \* Cement.quantity 。这种自动化方法确保了系统模拟与 LCA 之间的一致性，减少了 LCI 汇编过程中的手动工作量和潜在错误。

### **5.4. 与清单数据和特征化因子的整合**

用户可以从外部来源检索 LCI 数据和特征化因子，也可以通过诸如 Brightway2 和 BW2QSD 等外部软件包，直接从支持的数据库（例如 ecoinvent）中获取这些数据 。获取已建立的 LCI 数据库对于进行稳健的 LCA 至关重要。与 Brightway2 等工具的集成能力显著增强了 QSDsan 的 LCA 功能。ImpactIndicator 和 ImpactItem 结构 为用户提供了极大的灵活性，可以定义其 LCA 的范围（包括哪些影响）和详细程度（哪些条目贡献影响）。用户可以根据其研究的相关性选择或定义任意数量的 ImpactIndicator（例如 GWP、富营养化、水资源短缺）。然后，他们可以为各种材料、能源、运输过程或排放物创建 ImpactItem，并分配特定的特征化因子。这既允许进行专注于关键影响的简化 LCA，也支持覆盖广泛环境问题的详细 LCA。  
通过整合 SanUnit.construction 以及将 StreamImpactItem 链接到过程流，LCA 的考量（特别是基础设施和运营输入/输出的隐含影响）成为单元操作定义和系统模拟的内在组成部分，而非独立的事后分析。当定义一个 SanUnit 时，其建造材料和相关影响是其属性的一部分。同样，定义为 StreamImpactItem 的排放或资源消耗也直接与过程流相关联。这种深度集成确保了在设计和模拟系统的同时，LCA 清单也同步构建，从而促进了一个从一开始就考虑环境影响的设计过程。

## **6\. 先进建模能力**

QSDsan 不仅提供稳态模拟和基本的 TEA/LCA 功能，还具备一系列先进的建模能力，使其能够处理更复杂的系统行为和不确定性。

### **6.1. 动态模拟：捕捉时变系统行为**

QSDsan 支持动态过程建模 。Process 类使得对组分转化的动态模拟成为可能 。在动态模式下，系统中每个 SanUnit 内组分累积的常微分方程组（ODEs）会被编译并进行全系统积分 。这一功能已通过对标模拟模型1（BSM1）这一废水处理厂标准模型进行了验证 。许多环境卫生过程本质上是动态的（例如，间歇操作、对波动进水的响应）。动态模拟能够更真实地表征此类系统，并评估其瞬态行为、控制策略以及出水水质随时间的变化。BSM1 的验证案例 是一个关键的演示：“QSDsan 的过程建模和动态模拟算法通过对 BSM1 系统建模得到验证……QSDsan 在4到6秒内完成了为期50天的 BSM1 模拟。” QSDsan 同时支持平衡态（由 中的收敛所暗示）和动态模拟（在 中明确说明）的能力，使其能够模拟比仅限于一种模式的工具更广泛的环境卫生系统和操作场景。虽然稳态分析对于初步设计和长期平均性能评估很有用，但动态模拟对于理解瞬态行为、过程控制、启动/关闭以及对可变输入（在废水系统中很常见）的响应至关重要。

### **6.2. 不确定性量化与敏感性分析：应对变异性并识别关键参数**

QSDsan 允许将不确定性整合到系统设计、模拟、TEA 和 LCA 中，这主要通过 Model 对象和蒙特卡洛方法实现 。用户可以定义带有不确定性的输入 Parameter（参数）和用于评估的输出 Metric（指标）。QSDsan 内置了一个 stats 模块，提供了全局敏感性分析方法（如 Spearman 等级相关、Morris 一次变动法、Sobol 法）以及可视化功能 。环境卫生系统，特别是在资源有限的环境中或涉及新技术时，往往面临显著的不确定性。不确定性量化（UQ）和敏感性分析（SA）有助于理解潜在结果的范围，并识别最具影响力的参数，从而指导研究和设计工作。文献 指出：“在不确定性下：它允许将不确定性轻松地整合到其每个界面中……” 文献 描述了 Model 对象：“Model 对象与 System 对象相关联，以使用蒙特卡洛方法整合不确定性……QSDsan 包含一个带有全局敏感性分析方法的 stats 模块……” BSM1 案例 展示了对出水水质的 UQ 和识别关键操作驱动因素的 SA。  
将不确定性量化（UQ）和敏感性分析（SA）整合到设计、TEA 和 LCA 的全过程中 ，将 QSDsan 从一个确定性建模工具提升为一个概率性决策支持框架。现实世界中的参数很少能被精确知晓。通过允许用户为输入定义概率分布（Parameter 对象）并评估输出的分布（Metric 对象），QSDsan 提供了对潜在系统性能、成本和环境影响更真实的描绘 。随后，SA 有助于精确找出哪些不确定参数具有最显著的影响，从而指导减少不确定性或管理风险的努力。这对于数据往往稀缺的“早期技术”尤为关键 。动态 BSM1 模拟所报告的速度（“为期50天的 BSM1 模拟耗时4至6秒” \- ）表明其拥有一个计算效率较高的后端，这对于执行 UQ 和 SA 所需的大量蒙特卡洛模拟至关重要。UQ 和 SA 通常涉及数百甚至数千次模型评估。如果每次模拟都很慢，这些分析将变得不切实际。QSDsan 所展现的效率，可能得益于 Python 的科学计算库和 BioSTEAM 的优化核心，使得这些计算密集型的先进分析变得可行，从而能够进行更稳健和全面的可持续设计。

## **7\. QSDsan 的实践应用：案例与研究**

QSDsan 作为一个强大的集成平台，已经在多个研究项目中得到应用，展示了其在分析复杂环境卫生系统和新兴技术方面的能力。

### **7.1. 完整环境卫生价值链评估**

QSDsan 被用于评估一个完整的环境卫生价值链，通过在不确定性条件下模拟三个替代系统（系统 A、B、C），并利用 TEA 和 LCA 对其可持续性进行表征 。该评估涉及养分回收、COD 回收、成本和全球变暖潜能值（GWP），并进行了敏感性分析。这项研究清晰地展示了 QSDsan 模拟和比较从用户界面到处理和处置/再利用的整个系统的能力，从而提供了对可持续性的整体视角。文献 详细总结了此案例研究，包括关于养分回收（C 系统对 N 回收最佳，B 系统对 P 回收最佳）、成本（B 系统最经济）和 GWP（C 系统最低）的发现，以及关键敏感性因素（如家庭规模和热量摄入）。这些案例研究表明，QSDsan 具有可扩展性，既能分析单个新技术（如 中的 OPs、NEWgenerator、HTL），也能分析包含多个相互连接的单元操作和最终用途的整个复杂环境卫生价值链（如 中的系统 A、B、C 比较）。这种可扩展性至关重要，因为创新通常发生在单元过程层面，但其真正的可持续性影响只有在整合到完整的价值链中才能得到评估。

### **7.2. 特定技术与过程建模**

QSDsan 的应用实例还包括对特定技术和过程的深入分析。例如，研究人员使用 QSDsan 来表征基于热解的 Omni Processors (OPs) 处理粪便污泥的特性 ，分析 NEWgenerator 非下水道环境卫生系统（包括厌氧膜生物反应器 AnMBR、离子交换营养物回收和电氯化），以及评估利用水热液化（HTL）技术从各种有机废物中回收资源的潜力 。这些案例研究突显了 QSDsan 在模拟多样化和创新性环境卫生及资源回收技术方面的多功能性。许多重点应用集中在非下水道环境卫生（如 中的 OPs、NEWgenerator）和资源回收（如 中的 HTL、养分回收），表明 QSDsan 与可持续环境卫生领域的新兴范式特别相关。全球环境卫生挑战日益需要超越传统集中式废水处理的解决方案，尤其是在资源有限的地区。QSDsan 的特性（如灵活定义 SanUnit、用于资源回收信贷的 LCA、用于分散式系统的 TEA）似乎非常适合模拟和评估这些创新方法，从而支持下一代环境卫生技术的 RD\&D。

### **7.3. 动态过程建模与验证 (BSM1)**

QSDsan 的动态建模能力通过国际公认的废水处理厂对标模拟模型1（Benchmark Simulation Model No. 1, BSM1）进行了验证 。结果表明，QSDsan 能够实现快速且准确的动态模拟，其结果与 MATLAB/Simulink 的吻合度很高（状态变量的最大相对误差小于1%）。该平台还被用于对 BSM1 模型的出水水质进行不确定性量化和敏感性分析。通过与 BSM1 等既定基准进行验证，增强了人们对 QSDsan 在模拟复杂生物过程方面的能力和准确性的信心。这些应用展示了 QSDsan 在阐明复杂权衡（例如 中 C 系统的用户成本最高但 GWP 最低）和识别性能与可持续性关键驱动因素（例如 中家庭规模对成本的影响，热量摄入对 GWP 的影响）方面的强大能力。可持续设计很少是优化单一指标，而是涉及平衡经济、环境和技术因素。QSDsan 集成的 TEA/LCA 和 SA 功能，如案例研究所示，为理解这些权衡提供了定量数据，并指出了干预或进一步研究最具影响力的领域。

## **8\. 支持生态系统、社区、贡献与未来方向**

QSDsan 的发展和应用得益于一个不断壮大的支持生态系统，包括相关的软件包、丰富的用户资源以及活跃的社区参与。

### **8.1. EXPOsan 和 DMsan 的角色**

QSDsan 并非孤立存在，而是与其它工具协同工作。EXPOsan 是一个软件包，收录了所有使用 QSDsan 开发的系统案例，其名称意为“环境卫生和资源回收系统博览” 。它作为模型和案例的存储库，促进了知识共享。另一个重要的相关软件包是 DMsan，这是一个用于多标准决策分析（Multi-Criteria Decision Analysis, MCDA）的 Python 包。DMsan 能够与 QSDsan 集成，综合考量技术、资源回收、经济、环境和社会等多个标准，对不同方案进行比较，同时兼顾特定地区的背景参数和不确定性 。QSDsan 为系统模拟、TEA 和 LCA 提供核心引擎。EXPOsan 则充当这些模型的共享库，促进了可重用性和学习。DMsan 进一步利用 QSDsan 的定量输出，并将其整合到更广泛的 MCDA 框架中，该框架可以包含定性因素和利益相关者的偏好 。这种分层方法承认，纯粹的技术/环境/经济产出往往不足以支持现实世界的决策，后者还涉及社会和背景因素。

### **8.2. 用户资源：教程、支持与社区参与**

为了方便用户学习和使用，QSDsan 提供了全面的在线文档和专题教程，其中包括在 YouTube 上发布的视频演示 。此外，还有一个 QSDsan 日历，用于发布相关的活动信息，如答疑时间和研讨会 。用户还可以订阅电子邮件更新以获取最新消息 。这些资源对于促进用户采纳、学习和围绕平台培养支持性社区至关重要。对教程、视频演示、研讨会和活动日历的重点关注 ，表明 QSDsan 开发团队在积极努力传播知识并建设潜在用户的能力。开发一个强大的工具是一回事，确保它被有效地采用和使用是另一回事。这些教育努力对于降低复杂软件的使用门槛至关重要，尤其是在环境卫生这样一个专业知识可能多样化的领域。提及的“入门研讨会” 表明了一种吸引新用户的推广策略。

### **8.3. 为 QSDsan 平台做贡献的指南**

QSDsan 鼓励社区参与其开发和改进，并为此制定了清晰的贡献指南和透明的管理流程 。其官方文档中包含了“贡献者与指南”（Contributors and Guidelines）部分以及“贡献者行为准则”（Contributor Covenant Code of Conduct）。这些举措符合其开源理念，旨在汇集更广泛的智慧来共同推动平台发展。清晰的贡献指南、行为准则和开源性质 ，是为建立一个可持续且活跃的用户/开发者社区而采取的积极措施。一个强大的社区对于开源项目的长期可行性、改进和相关性至关重要。通过为贡献建立明确的规则和途径，QSDsan 团队鼓励外部参与，这可以带来新功能、错误修复、多样化的案例研究（通过 EXPOsan）和更广泛的采用。这种协作模式非常适合应对可持续环境卫生领域复杂且不断变化的挑战。

### **8.4. 局限性与未来发展方向 (推断)**

尽管 QSDsan 功能强大，但在更广泛的领域内，可持续性评估工具仍面临一些挑战。例如，如何稳健地整合社会维度（虽然 主要关注 DMsan，但也指出了可持续性工具普遍面临的这一挑战），如何处理早期技术的高度不确定性 ，以及如何确保工具的易用性和可及性。认识到这些局限性和潜在的未来发展方向，有助于对 QSDsan 及其生态系统形成平衡的看法，并指出其未来可能演进的领域。文献 讨论了现有 MCDA 工具的局限性（DMsan 旨在解决其中一些问题），例如指标的固定输入以及处理社会维度的问题。文献 强调了“缺乏透明和灵活的方法来导航……技术发展路径”以及“早期技术固有的更高不确定性水平”所带来的挑战，QSDsan 旨在缓解这些问题，但这些仍是持续的研究领域。

## **9\. 结论**

QSDsan 作为一个开源、社区主导的 Python 平台，在定量可持续设计（QSD）领域，特别是在环境卫生和资源回收系统方面，展现了其强大的集成能力和广泛的应用前景。通过整合系统设计、过程建模（包括动态模拟）、技术经济分析（TEA）和生命周期评价（LCA），QSDsan 为研究人员和实践者提供了一个全面的工具，用以评估和优化新兴及现有技术的经济可行性和环境可持续性。  
该平台的核心优势在于其模块化的、基于面向对象编程的架构，这不仅得益于对 BioSTEAM 和 Thermosteam 等成熟平台的继承与扩展，也体现在其专门为环境卫生领域开发的 SanUnit、ImpactIndicator、ImpactItem 等特定类。这种设计使得 QSDsan 能够灵活地模拟从单个处理单元到完整处理价值链的复杂系统，并能够方便地进行不确定性量化和敏感性分析，从而在早期技术研发阶段为决策提供有力支持。  
通过诸如 BSM1 验证、完整环境卫生价值链比较以及对 Omni Processors、NEWgenerator 和 HTL 等特定技术的分析等案例研究，QSDsan 证明了其在实际应用中的有效性和可靠性。它不仅能够准确模拟复杂的生化过程，还能揭示不同技术方案在成本、环境影响和资源回收效率等方面的权衡关系，并识别出影响系统性能的关键参数。  
QSDsan 的发展还得益于其活跃的社区和不断完善的生态系统，包括 EXPOsan 模型库和 DMsan 多标准决策分析工具的协同。丰富的教程、文档和社区支持活动降低了用户的使用门槛，并鼓励更广泛的参与和贡献。  
尽管 QSDsan 已经取得了显著成就，但与所有复杂的建模工具一样，它也面临着持续发展的需求，例如进一步增强用户友好性、扩展模型库、深化与社会可持续性维度的整合，以及更好地应对早期技术数据高度不确定的挑战。  
综上所述，QSDsan 是推动环境卫生和资源回收领域向更可持续方向发展的重要工具。它通过提供一个集成、灵活且透明的分析平台，赋能研究人员和决策者以数据驱动的方式应对全球环境卫生挑战，加速创新技术的研发和部署，最终为实现全球可持续发展目标做出贡献。

#### **引用的文献**

1\. QSDsan: an integrated platform for quantitative sustainable design ..., https://pubs.rsc.org/en/content/articlehtml/2022/ew/d2ew00455k 
2\. (PDF) QSDsan: an integrated platform for quantitative sustainable design of sanitation and resource recovery systems \- ResearchGate, https://www.researchgate.net/publication/362961822\_QSDsan\_an\_integrated\_platform\_for\_quantitative\_sustainable\_design\_of\_sanitation\_and\_resource\_recovery\_systems 
3\. Research | QSDsan, https://qsdsan.com/research/ 
4\. QSDsan, https://qsdsan.com/ 
5\. QSDsan 1.4.2, https://qsdsan.readthedocs.io/en/latest/index.html 
6\. (PDF) QSDsan: An Integrated Platform for Quantitative Sustainable Design of Sanitation and Resource Recovery Systems \- ResearchGate, https://www.researchgate.net/publication/359228257\_QSDsan\_An\_Integrated\_Platform\_for\_Quantitative\_Sustainable\_Design\_of\_Sanitation\_and\_Resource\_Recovery\_Systems 
7\. The Biorefinery Simulation and TEA Modules — BioSTEAM documentation, https://biosteam.readthedocs.io/ 
8\. Heat Exchanging \- QSDsan 1.4.2, https://qsdsan.readthedocs.io/en/latest/api/sanunits/heat\_exchanging.html 
9\. QSDsan: An Integrated Platform for Quantitative Sustainable Design of Sanitation and Resource Recovery Systems \- arXiv, https://arxiv.org/pdf/2203.06243 
10\. QSD-Group/QSDsan: Quantitative Sustainable Design (QSD) of sanitation and resource recovery systems. \- GitHub, https://github.com/QSD-Group/QSDsan 
11\. qsdsan.readthedocs.io, https://qsdsan.readthedocs.io/en/latest/tutorials/0\_Quick\_Overview.html 
12\. Life Cycle Assessment (LCA) \- QSDsan 1.4.2, https://qsdsan.readthedocs.io/en/latest/tutorials/8\_LCA.html 
13\. Quantitative sustainable design (QSD) for the prioritization of research, development, and deployment of technologies: a tutorial and review \- RSC Publishing, https://pubs.rsc.org/en/content/articlehtml/2022/ew/d2ew00431c 
14\. DMsan: A Multi-Criteria Decision Analysis Framework and Package to Characterize Contextualized Sustainability of Sanitation and Resource Recovery Technologies \- PubMed Central, https://pmc.ncbi.nlm.nih.gov/articles/PMC10197171/