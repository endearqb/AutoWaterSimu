

# **污水生物处理ASM系列模型的演进及其与人工智能的融合（2005年至今）**

## **摘要**

本报告系统回顾了自2005年以来，国际水协会（IWA）活性污泥模型（Activated Sludge Model, ASM）系列的发展历程，重点剖析了ASM1、ASM2d和ASM3等核心模型的理论演进与应用局限。报告深入探讨了这些机理模型在厌氧-缺氧-好氧（A2/O）和膜生物反应器（MBR）等关键污水处理工艺中的具体应用与挑战。核心内容聚焦于近二十年机理模型与机器学习（Machine Learning, ML）、人工智能（Artificial Intelligence, AI）及大语言模型（Large Language Models, LLM）的深度融合，涵盖了混合建模、智能控制、参数校准和模型可及性提升等前沿领域。通过对代表性研究、项目和团队的梳理，本报告旨在为相关领域的科研人员与工程技术专家提供一份全面、深入且具有前瞻性的技术发展蓝图。

## **引言**

**背景：** 随着全球对水资源可持续性要求的不断提高，污水处理厂（Wastewater Treatment Plants, WWTPs）正经历着从单纯的污染物去除设施向水、能源和营养物回收中心（Water Resource Recovery Facilities, WRRFs）的深刻转型 1。这一转型对污水处理过程的精细化理解、预测和控制提出了前所未有的要求。在此背景下，基于生化反应机理的数学模型，特别是国际水协会（IWA）推出的活性污泥模型（ASM）系列，已成为现代污水处理工艺设计、运营优化和先进控制策略开发不可或缺的科学工具 1。

**核心问题：** 过去二十年的发展历程揭示了一个核心的技术矛盾。一方面，以ASM系列为代表的机理模型（或称“白箱”模型）提供了对复杂生化过程深刻的洞察力，能够解释现象背后的根本原因。然而，这些模型结构复杂，包含大量待定参数，其校准过程异常繁琐、成本高昂，且存在参数可识别性差等问题，极大地限制了它们在实际工程中的广泛应用 1。另一方面，随着数据科学的兴起，人工智能（AI）和机器学习（ML）模型（或称“黑箱”模型）在处理高维、非线性数据方面展现出强大能力，能够以较高精度预测系统行为并实现有效控制，但其决策过程往往不透明，缺乏明确的物化和生化机理解释，使得运营人员难以完全信任其结果，且模型的泛化能力和外推能力也受到数据质量和范围的限制 6。因此，如何有效融合机理模型的深刻洞察力与数据驱动模型的预测能力，取长补短，成为推动智慧水务发展的核心科学问题与技术挑战。

**报告结构概述：** 本报告将遵循一条清晰的技术演进脉络，即从“机理模型的深化发展”，到“机理模型与预测式AI的融合创新”，最终展望“机理模型与生成式AI的未来图景”。报告将系统梳理这一过程中的关键理论突破、技术应用和核心挑战，旨在揭示其内在的驱动逻辑，并为未来研究与实践指明方向。

---

## **第一部分：活性污泥模型（ASM）的深化发展与应用挑战**

### **1.1 ASM系列模型的演进之路：从ASM1到ASM3的理论深化**

ASM系列的演进并非简单的线性升级，而是一个在工程应用需求和基础科学认知之间不断反馈、修正的螺旋式上升过程。每一个新模型的诞生都反映了当时对污水生物处理过程理解的深化以及对更复杂处理工艺模拟需求的响应。

ASM1的奠基作用：  
1987年，由国际水污染研究与控制协会（IAWPRC，IWA的前身）任务组发布的活性污泥模型1号（ASM1），是该领域的开创性工作 2。其最初目标是为仅包含碳去除、硝化和反硝化过程的单污泥系统建立一个复杂性最低的通用模型平台 2。ASM1的深远影响不仅在于其模型本身，更在于它建立了一套标准化的框架。它引入的矩阵表示法（即Petersen矩阵）和统一的组分、过程命名法，为全球的建模研究者和实践者提供了“共同语言”，极大地促进了复杂模型的交流、讨论和后续开发，使其成为无数后续模型的核心 8。在理论层面，ASM1基于“死亡-再生”（Death-Regeneration）假说来描述微生物的衰减过程，即死亡的微生物细胞会裂解，一部分转化为惰性物质，另一部分则水解为可被其他微生物利用的慢速可降解底物。这一概念虽然是一种简化，但为后续模型描述生物质的循环与转化提供了基础框架 9。  
ASM2 & ASM2d的扩展：  
随着强化生物除磷（Enhanced Biological Phosphorus Removal, EBPR）工艺在工程实践中的应用，ASM1无法模拟磷代谢的局限性日益凸显 8。为满足这一迫切的工程需求，IWA任务组于1995年发布了ASM2，该模型在ASM1的基础上，引入了聚磷菌（Phosphorus-Accumulating Organisms, PAOs）的代谢过程，包括其在厌氧条件下吸收发酵产物（如挥发性脂肪酸）并合成内碳源聚羟基脂肪酸酯（PHA），同时释放磷酸盐；以及在好氧条件下利用储存的PHA进行生长并超量吸收磷酸盐，以聚磷酸盐（Poly-P）形式储存起来的完整循环 10。  
然而，科学研究的快速发展很快揭示了ASM2的不足。研究发现，相当一部分PAOs能够在缺氧条件下，利用硝酸盐作为电子受体进行反硝化，同时完成好氧条件下类似的磷吸收过程，这类微生物被称为反硝化聚磷菌（Denitrifying PAOs, DPAOs）。这一发现在同步脱氮除磷工艺中至关重要。为了更准确地模拟这类系统的性能，ASM2在1999年被迅速扩展为ASM2d，明确地将DPAOs作为一个独立的微生物种群及其相关的生化过程纳入模型框架 8。

ASM3的理念革新：  
与ASM2d是对ASM1的“功能扩展”不同，1999/2000年推出的ASM3代表了一次深刻的“理念革新” 2。ASM3的开发旨在修正ASM1的一些理论缺陷，并建立一个更符合微生物生理学的新一代建模平台。其核心变化体现在以下两个方面：

1. **从“死亡-再生”到“内源呼吸”：** ASM3摒弃了ASM1的“死亡-再生”假说，转而采用“内源呼吸”（Endogenous Respiration）理论来描述微生物的衰减。该理论认为，在没有外部底物的情况下，微生物会通过消耗自身储存的物质和细胞活性组分来维持生命活动，这个过程伴随着氧气的消耗 9。  
2. **引入储存物作为核心变量：** ASM3最关键的创新在于，它将微生物的代谢过程清晰地分为“储存”和“生长”两个独立的步骤。模型假设，在底物充足（盛宴，feast）的条件下，快速可降解底物首先被微生物迅速吸收并转化为内部储存物（如PHA）。随后，在底物缺乏（饥荒，famine）的条件下，微生物再利用这些储存物进行生长和维持生命 8。这一“两步法”的描述更贴近微生物在污水处理厂典型的底物浓度波动环境下的真实生理反应，使得ASM3在描述某些短时程动态过程时，比ASM1具有更高的动力学准确性 12。

这一系列演进清晰地表明，ASM模型的发展是由“理论局限”和“工程需求”双轮驱动的。工程上对除磷的需求催生了ASM2，而对同步脱氮除磷工艺的深入观测又推动了ASM2d的诞生。与此同时，学术界对微生物生理学认知的深化，特别是对ASM1“死亡-再生”理论在解释短期实验现象时的不足之处的认识，最终促成了基于储存和内源呼吸理论的ASM3平台的革命性构建。

| 模型 (Model) | 理论基础 (Theoretical Basis) | 核心处理过程 (Key Processes) | 关键微生物/组分 (Key Microorganisms/Components) | 主要应用范围 (Primary Application Scope) | 局限性 (Limitations) |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **ASM1** | 死亡-再生 (Death-Regeneration) | 碳去除、硝化、反硝化 | 异养菌、自养硝化菌、可溶/颗粒性COD组分 | 常规脱氮工艺的模拟与设计 2 | 不包含生物除磷；对微生物储存现象描述不准确；不适用于厌氧过程 9 |
| **ASM2d** | 死亡-再生 (Death-Regeneration) | 碳去除、硝化、反硝化、生物除磷、反硝化除磷 | 异养菌、自养硝化菌、聚磷菌(PAOs)、反硝化聚磷菌(DPAOs)、聚磷酸盐(Poly-P)、PHA | 同步脱氮除磷工艺（如A2/O）的模拟与优化 8 | 模型更复杂，参数更多，校准更困难；仍基于“死亡-再生”理论 10 |
| **ASM3** | 内源呼吸 (Endogenous Respiration) & 储存/生长两步法 | 碳去除、硝化、反硝化（基于储存物代谢） | 异养菌、自养硝化菌、内部储存物(X\_STO) | 需要精确描述微生物储存和底物动态响应的系统 8 | 不包含生物除磷；模型概念较新，部分参数的物理意义和测定方法仍在研究中 12 |

### **1.2 ASM在典型污水处理工艺中的应用实践**

ASM模型作为一种可扩展的平台，其生命力在于能够根据不同污水处理工艺的特殊物理化学和生物学特性进行适应性演化。工艺的特殊性是模型适应性演化的直接驱动力。

A2/O工艺建模：  
A2/O（Anaerobic-Anoxic-Oxic）工艺是实现生物脱氮除磷的经典流程，其通过厌氧、缺氧、好氧三个功能区的有机组合，为不同功能的微生物（如PAOs、反硝化菌、硝化菌）创造了适宜的生存环境 14。这种复杂的生化反应网络正是ASM模型的理想应用场景。研究人员广泛使用ASM2d或其修正版本来模拟A2/O工艺 11。通过模型，可以系统地研究关键操作参数，如污泥停留时间（Sludge Retention Time, SRT）、水温、进水碳氮比（C/N ratio）、溶解氧（Dissolved Oxygen, DO）浓度以及内外回流比等，对总氮（TN）和总磷（TP）去除效率的动态影响 15。大量的案例研究表明，经过良好校准的ASM模型能够有效地预测A2/O系统的运行性能，为工艺优化、节能降耗和稳定达标提供有力的决策支持 15。  
膜生物反应器（MBR）建模：  
膜生物反应器（Membrane Bioreactor, MBR）是一种将高效膜分离技术与传统活性污泥法相结合的新型污水处理技术，具有出水水质高、占地面积小、污泥产量低等显著优点 18。然而，MBR的独特运行特性对直接套用为常规活性污泥（Conventional Activated Sludge, CAS）工艺开发的标准ASM模型提出了严峻挑战 20。  
MBR工艺的主要特殊性包括 20：

1. **极高的SRT：** 膜的绝对截留作用使得MBR可以在非常高的SRT（通常\>20天）下运行。  
2. **高MLSS浓度：** MBR反应器内的混合液悬浮固体（MLSS）浓度远高于CAS系统。  
3. **SMP/EPS的积累：** 膜能够截留大分子的可溶性微生物产物（Soluble Microbial Products, SMP）和胞外聚合物（Extracellular Polymeric Substances, EPS），导致它们在反应器内不断积累。  
4. **高强度曝气：** 除了满足生物需氧外，通常还需要额外的曝气对膜表面进行冲刷，以减缓膜污染。

这些特性使得标准ASM模型在MBR应用中出现“失配”。例如，在高SRT条件下，传统ASM模型中被视为不可生物降解的“惰性”有机物，实际上可能发生缓慢的水解 21。更重要的是，SMP和EPS的积累是导致膜污染、增加运行成本的核心因素，而标准ASM模型中并未包含这些组分作为状态变量，因此无法预测膜污染的趋势 20。

为了解决这些问题，研究人员必须在ASM框架的基础上进行“二次开发”，创建适用于MBR的“定制版”模型。这些修改通常包括：增加SMP和EPS作为新的状态变量，并引入它们生成、利用和衰减的相关生化过程；修正水解、衰减等关键动力学过程的速率常数，以反映高SRT和高MLSS环境下的真实情况 11。这充分证明了ASM模型作为一个开放平台的适应性和扩展性。

### **1.3 机理模型的核心瓶颈：参数校准的复杂性与不确定性**

尽管ASM模型在理论上功能强大，但其在实践中面临的最大障碍，即其“阿喀琉斯之踵”，是参数校准的极端复杂性和高度不确定性。正是这一根本性的实践难题，为数据驱动方法的兴起和应用提供了广阔的空间。

过参数化与可识别性问题：  
ASM模型是典型的“过参数化”（over-parameterized）模型。以ASM1为例，它包含约20个化学计量和动力学参数，而更复杂的扩展模型（如考虑温室气体排放的ASMG1）参数数量可超过60个 1。然而，研究表明，利用从一个全尺寸污水厂通过密集测量所能获得的典型数据集，能够被唯一地、可靠地识别和估计的参数子集非常小，通常只有6到10个 1。这意味着绝大多数模型参数无法通过现场数据进行有效校准，必须依赖文献推荐的默认值或研究者的经验假定。这种做法为模型预测引入了巨大的、难以量化的不确定性，严重影响了模型的可靠性和可信度。  
校准协议的实践挑战：  
为了规范和简化复杂的校准过程，学术界发展出了一系列系统化的校准协议，如比利时根特大学BIOMATH团队提出的协议、德国的HSG协议以及美国水环境研究基金会（WERF）的指南等 5。这些协议提供了一个从明确建模目标、收集和评估数据、表征水力学和氧传递特性，到分步骤校准生物动力学参数的完整流程 23。  
然而，严格遵循这些协议在实践中是一项极为艰巨的任务。它不仅需要专业的知识和技能，还需要进行密集的现场采样、耗时的实验室分析（如呼吸计量法测定动力学参数）和专门的示踪剂实验（用于水力学模型验证） 23。整个过程成本高昂、耗时耗力，对于许多资源有限、人员技术水平不高的污水处理厂而言，几乎是不可能完成的任务 5。

数据质量与可得性：  
模型校准的基石是高质量、高频率的测量数据。然而，大多数污水厂的常规监测计划主要是为了满足排放监管要求，其监测的参数（如BOD、TSS、总氮、总磷）与ASM模型所需的组分参数（如可快速降解COD、可缓慢降解COD、颗粒性惰性COD等）并不直接对应 5。将常规监测数据转化为模型所需的输入数据，本身就需要额外的实验和复杂的换算，这又引入了新的误差来源。因此，数据收集的困难、数据质量的不确定性以及数据与模型需求的不匹配，共同构成了限制ASM模型广泛应用的另一个主要障碍 5。  
综上所述，ASM模型虽然在理论上严谨，但在实践中却因其固有的校准复杂性而面临巨大的应用鸿沟。当污水厂运营者的核心需求是获得可靠的预测和有效的控制，而实现这一目标的机理路径又过于艰难时，寻找更直接、成本更低的替代方案便成为必然选择。机器学习的兴起，恰好满足了这一需求，它绕过了复杂的生化机理和参数校准，直接从历史数据中学习输入与输出之间的映射关系，从而为污水处理的建模与控制开辟了一条全新的、更具实用性的道路。

---

## **第二部分：机理与数据的交汇：机器学习的融合与创新**

面对机理模型的实践困境，数据驱动范式，特别是机器学习（ML）和人工智能（AI），在过去二十年中迅速渗透到污水处理的各个领域，并最终催生了融合机理与数据优势的混合建模新范式。

### **2.1 数据驱动范式：机器学习在WWTPs中的应用**

AI/ML技术通过直接从数据中学习，为WWTPs的性能预测、过程优化和智能控制提供了强大的新工具。研究人员已将AI在污水处理领域的应用系统地归纳为四个关键方面：参数预测、性能分析、模型开发和过程优化 25。

出水水质预测与过程模拟：  
利用污水厂积累的大量历史运行数据，各种ML模型被广泛用于预测关键的出水水质指标。其中，人工神经网络（Artificial Neural Networks, ANN）、支持向量机（Support Vector Machines, SVM）、随机森林（Random Forest, RF）以及专门处理时间序列数据的循环神经网络（Recurrent Neural Networks, RNN）及其变体长短期记忆网络（Long Short-Term Memory, LSTM）是应用最广泛的算法 3。这些模型能够有效捕捉污水处理过程中高度非线性、动态变化的复杂关系，其对COD、TN、TP等指标的预测精度在许多研究中都显示出优于传统统计模型的性能 28。  
过程优化与智能控制：  
AI技术在过程控制领域的应用取得了尤为显著的成效，特别是在能耗巨大的曝气系统优化方面 25。曝气占WWTP总能耗的50%左右，是节能降耗的关键环节 25。

* **先进控制算法：** 模糊逻辑控制（Fuzzy Logic Control, FLC）、基于ANN的控制策略、遗传算法（Genetic Algorithm, GA）优化以及模型预测控制（Model Predictive Control, MPC）等先进控制策略，被越来越多地用于替代传统的比例-积分-微分（PID）控制器 25。  
* **显著效益：** 与固定设定值的PID控制相比，AI驱动的控制策略能够根据进水负荷和实时水质变化，动态、智能地调节溶解氧（DO）的设定点。大量模拟和实际应用案例表明，这种智能控制不仅能确保出水水质稳定达标，还能显著降低曝气能耗，节能幅度可达15%至40% 25。例如，一项在全尺寸WWTP部署的研究中，结合了LSTM和专家控制逻辑的混合策略，在6个月内将DO超调事件减少了90%以上，并节省了约18万美元的运营支出 30。

| 应用领域 (Application Area) | AI/ML技术 (AI/ML Technique) | 代表性算法 (Representative Algorithms) | 典型效益/发现 (Typical Benefits/Findings) | 参考文献ID (Reference Snippet ID) |
| :---- | :---- | :---- | :---- | :---- |
| **出水水质预测** | 监督学习 | ANN, LSTM, SVM, XGBoost, 随机森林 | 高精度预测COD, TN, TP等出水指标，捕捉非线性时序关系。 | 3 |
| **过程优化与控制** | 智能控制, 强化学习 | FLC, ANN-MPC, 遗传算法, 深度强化学习(DQN) | 显著降低曝气能耗 (15-40%)，稳定出水水质，优化化学药剂投加。 | 25 |
| **故障诊断与异常检测** | 无监督/监督学习 | SVM, 深度神经网络 (DNN) | 提前预警污泥膨胀、设备故障等异常工况，防止系统崩溃。 | 6 |
| **参数软测量** | 监督学习 | ANN, 随机森林, 模糊神经网络 | 利用易测参数 (pH, DO) 实时估算难测参数 (COD, 活性生物量)，为模型提供输入。 | 26 |

### **2.2 混合建模：融合机理洞察与数据驱动的力量**

混合建模是当前WWTP建模领域的最高水平，它代表了对“白箱”与“黑箱”模型二元对立的超越。其核心思想是承认单一范式的局限性，并通过精巧的结构设计，实现机理知识与数据模式的协同，从而达到1+1\>2的效果。

混合建模的动机：  
单纯的机理模型（白箱）虽然可解释性强，但校准困难且对未被模型化的过程无能为力；单纯的数据驱动模型（黑箱）虽然预测灵活准确，但其决策过程不透明，且在外推到训练数据范围之外的工况时，其可靠性无法保证 3。混合建模（或称“灰箱”模型）正是为了解决这一困境而生。它旨在将两者的优点结合起来：利用机理模型的结构来保证模型的基本物化和生化约束，确保其行为在物理上是合理的；同时，利用ML模型来拟合机理模型无法准确描述的复杂动态、补偿其系统性偏差或辅助其参数估计 7。  
混合模型的结构框架：  
根据机理模型和数据驱动模型的组合方式，混合模型通常可以分为三种基本结构 7：

1. **串联结构 (Serial)：** 两个模型按顺序连接，一个模型的输出是另一个模型的输入。这种结构常用于解决数据缺失或参数未知的问题。例如，利用ML模型根据易测量的在线数据（如ORP, pH）来预测ASM模型所需的、难以直接测量的输入参数（如进水COD分馏组分）；反之，也可以利用校准好的ASM模型来生成大量覆盖不同工况的“虚拟数据”，用于扩充训练数据集，从而提高后续ML模型的鲁棒性和泛化能力。  
2. **并联结构 (Parallel)：** 两个模型同时运行，其输出以某种方式进行融合。最经典的应用是利用ML模型进行残差补偿。在这种结构中，ASM模型首先对系统行为进行主要预测，然后计算其预测值与实际测量值之间的残差（即误差）。接着，训练一个ML模型，专门学习并预测这个残差。最终的系统预测结果是ASM的预测值与ML预测的残差补偿值之和。这种方法保留了机理模型的主体解释性，同时利用ML的拟合能力显著提高了整体预测精度。  
3. **循环结构 (Circular)：** 两个模型之间形成一个反馈闭环，相互迭代、共同优化。例如，ML模型的预测结果可以用来调整机理模型的某些参数，而更新后的机理模型又可以生成新的数据来进一步训练ML模型。这种结构在理论上能够实现两个模型的协同进化，但实现起来也最为复杂。

前沿混合模型案例分析：  
近期的一项研究提出了一个融合LSTM和XGBoost（一种高效的梯度提升决策树算法）的双重混合框架，用于出水水质预测，这为并联和串联结构提供了具体的例证 28。

* **第一种结构（残差修正-并联）：** 首先使用一个带有注意力机制的LSTM模型进行初步预测，然后训练一个XGBoost模型来学习并预测LSTM模型的预测残差。最终的预测值是LSTM的初始预测值加上XGBoost预测的残差。这本质上是一种并联的残差补偿策略。  
* 第二种结构（特征增强-串联）： 首先用LSTM模型从原始时间序列数据中提取隐含的动态特征，然后将这些提取出的特征与原始的输入变量合并，形成一个增强的特征集。最后，利用这个增强的特征集来训练XGBoost模型进行最终的预测。这是一种串联结构，其中LSTM扮演了“特征提取器”的角色。  
  实验结果清晰地表明，这两种混合模型的预测精度（以R2、RMSE等指标衡量）均显著优于任何单一的LSTM或XGBoost模型，证明了混合建模在提升预测性能方面的巨大潜力。

### **2.3 AI赋能：降低ASM模型的使用门槛**

除了直接用于预测和控制，AI/ML技术还可以作为强大的辅助工具，显著降低ASM这类复杂机理模型的使用门槛，促进其在更广泛的工程实践中落地。

辅助参数校准：  
面对ASM模型“过参数化”的挑战，ML算法可以发挥重要作用。通过运行大量的模型模拟，并结合敏感性分析算法（如基于随机森林的特征重要性分析），可以快速识别出对模型输出影响最大、最敏感的关键参数子集 1。这将使得建模工程师能够将有限的校准精力和资源集中在这一小部分关键参数上，而对不敏感的参数则可以放心地使用文献默认值，从而极大地简化校准流程，提高校准效率。  
开发软测量（Soft Sensors）：  
WWTPs中有许多对过程理解和模型校待至关重要的参数，但它们难以通过物理传感器进行经济、可靠的在线实时测量，例如进水COD组分、活性污泥中的微生物种群浓度等。软测量技术为此提供了解决方案。通过利用那些易于在线测量的参数（如流量、pH、DO、ORP、温度等）作为输入，可以训练一个ML模型来实时估算这些难测的关键参数 26。这些由ML模型提供的“软测量”值，可以作为ASM模型的实时输入数据，或者作为模型校准时的重要参考和验证依据，从而有效弥补物理传感器的不足。  
通过将复杂的校准流程部分自动化，以及提供数据驱动的工具来辅助建模决策，AI技术正在逐步降低非专业人员学习和使用ASM模型的陡峭曲线和成本，这对于推动基于模型的精细化运营管理在行业内的普及具有重要意义 25。

---

## **第三部分：下一个前沿：大语言模型在智慧水务中的应用探索**

如果说传统AI/ML技术是将WWTP的“自动化”提升到了“智能化”的水平，那么大语言模型（LLM），特别是基于其构建的多智能体系统（Multi-Agent Systems, MAS），则预示着一场从“智能控制”到“自主管理”的范式革命。

### **3.1 从预测AI到生成式AI：LLM的潜力与挑战**

LLM的独特潜力：  
与前述的预测式AI（如ANN、LSTM等）主要处理结构化数值数据不同，以GPT系列为代表的LLM的核心能力在于对自然语言的深度理解、生成、总结和推理 34。这一特性使其能够解锁WWTP运营管理中蕴含的大量非结构化和半结构化信息，例如操作员手写的运行日志、设备维护手册、工艺设计文档、专家诊断报告、学术论文和环境法规等 36。LLM能够通过分析这些海量文本和数据，发现隐藏的关联和趋势，为操作人员提供更全面的决策支持 35。  
在工程领域的局限性：  
然而，将通用的LLM直接应用于严谨的工程领域面临着严峻的挑战 34：

1. **幻觉（Hallucination）：** LLM在回答其知识范围之外或模糊的问题时，可能会“编造”出看似合理但实际上完全错误的信息，这在要求高可靠性的工程应用中是不可接受的。  
2. **黑箱与可解释性：** LLM的内部决策逻辑比传统的ML模型更为复杂和不透明，难以解释其给出特定建议的原因。  
3. **缺乏与物理世界的接口：** LLM本身无法直接执行物理操作或运行专业的工程模拟软件（如GPS-X, BioWin）。它需要通过代码生成或其他接口才能与外部工具和模型进行交互 34。

### **3.2 多智能体LLM系统：复杂过程管理的未来**

为了克服单一LLM的局限性，研究人员提出了多智能体系统（MAS）的框架。其核心理念是将一个宏大而复杂的任务，分解为多个定义明确的子任务，然后为每个子任务创建一个专门的、配备了特定工具的LLM智能体（Agent）。这些智能体通过类似人类团队的协作、沟通和辩论来共同完成最终目标 34。这种“集体智能”的模式，其解决复杂问题的能力远超任何单个智能体 39。

**应用场景分析：**

1. **人-机交互革新 (降低学习成本)：** LLM-EPANET框架是一个开创性的例子，它展示了如何利用LLM将用户的自然语言查询（例如，“如果城市北区的需水量增加30%，哪个节点的压力会最低？”）自动翻译成可执行的EPANET（一种供水管网模型）代码，运行模拟，并将结果以自然语言的形式反馈给用户 37。这一理念可以无缝移植到ASM模型上。未来，污水厂的工艺工程师无需学习复杂的建模软件，只需通过对话界面向系统提问：“如果我们将二沉池的回流比从60%提高到80%，对缺氧区的反硝化效率和最终出水总氮有何影响？”系统内的LLM智能体将自动配置、运行ASM模拟，并给出清晰的回答。这无疑将极大地降低复杂模型的使用门槛。  
2. **自动化过程优化 (模拟预测与优化控制)：** 一个精心设计的多智能体系统可以自主地完成整个过程优化循环。卡内基梅隆大学的一项研究展示了这样一个系统，它包含五个智能体 40：  
   * ContextAgent: 从简单的工艺描述中，利用其内置的化学工程知识，推断出合理的操作约束条件（如温度、压力范围）。  
   * ParameterAgent: 提出一组初始的操作参数。  
   * ValidationAgent: 检查这组参数是否在ContextAgent定义的约束范围内。  
   * SimulationAgent: 调用外部的专业过程模拟软件（如IDAES），使用合规的参数运行模拟，并返回结果（如成本、产率）。  
   * SuggestionAgent: 分析所有历史模拟的结果，并像一个经验丰富的工程师一样，提出下一轮更有可能成功的参数组合。  
     这个智能体“团队”通过对话和协作，自主地进行迭代优化，直至找到最优操作条件，整个过程无需人工干预。  
3. **复杂故障诊断 (综合应用)：** 像污泥膨胀这样的复杂过程问题，其成因多样，涉及生物学、化学和水力学等多个方面，并且诊断过程严重依赖于非结构化的信息，如操作员的日常观察记录和污泥的显微镜图像。传统模型对此束手无策。而一个多智能体框架则可以模拟一个专家会诊小组 36：  
   * 一个 DataAgent 负责分析SCADA系统中的传感器数据，寻找异常趋势。  
   * 一个 LogAgent 负责阅读和理解过去几周的操作日志，寻找可能的操作变更。  
   * 一个 VisionAgent (多模态LLM) 负责分析上传的污泥显微镜照片，识别丝状菌的类型和丰度。  
   * 一个 KnowledgeAgent 负责查询内部的专家知识库和外部的学术文献，寻找与当前观测现象相关的可能原因。  
   * 最后，一个 CoordinatorAgent 扮演“组长”角色，汇总所有智能体的信息，进行逻辑推理，最终给出一个包含最可能原因、置信度以及推荐应对措施的综合诊断报告。

这一系列应用场景清晰地揭示了范式的转变。传统AI/ML在WWTP中扮演的是“高级自动控制器”或“精准预测器”的角色，它们在定义明确的单一任务上表现出色。而LLM多智能体系统引入了“通用翻译官”和“智能管理者”的新角色，能够整合多源异构信息，进行复杂的推理、规划和协同，解决定义模糊、涉及多领域知识的宏观管理问题。这标志着WWTP的“智能化”正在从“自动控制”的层面，向着更高阶的“自主管理”层面演进。

### **3.3 LLM在WWTPs应用的当前挑战与未来研究方向**

尽管LLM多智能体系统展现了革命性的潜力，但其在WWTPs的规模化应用仍处于早期探索阶段，面临着诸多挑战 36：

* **关键挑战：**  
  * **高昂的计算成本：** 训练和运行大型LLM需要巨大的计算资源。  
  * **可靠性与风险：** AI决策的可靠性如何保证，以及错误决策可能带来的环境和安全风险如何管理，是亟待解决的问题。  
  * **可解释性：** 尽管多智能体框架通过任务分解提高了一定的透明度，但单个智能体内部的“黑箱”问题依然存在。  
  * **系统集成：** 如何将LLM智能体系统与污水厂现有的SCADA、DCS等控制系统进行安全、高效的集成，是一个复杂的工程问题。  
* **未来研究方向：**  
  * **领域专用模型：** 开发针对水处理领域的、规模更小、效率更高、知识更专业的LLM。  
  * **人机协同与监督：** 建立严格的验证机制和“人在回路”（human-in-the-loop）的监督框架，确保AI的建议在被采纳前经过人类专家的审核。  
  * **算法融合：** 探索如何将LLM的符号推理能力与传统的数值优化和控制算法更紧密地结合，形成新一代的混合智能系统。

---

## **结论与展望**

技术演进脉络总结：  
本报告系统梳理了自2005年以来污水生物处理模型的发展历程，清晰地展示了一条从 “基于第一性原理的机理建模（ASM）”，到 “数据驱动的预测与控制（ML/AI）”，再到 “机理与数据深度融合的混合建模”，最终迈向 “具备推理与协作能力的自主管理（多智能体LLM）” 的技术演进路径。这条路径的内在逻辑是，在追求更高效、更可持续的污水处理目标驱动下，行业不断寻求能够更好地平衡模型解释性、预测准确性和实践可用性的新工具和新方法。  
未来“智慧水厂”的图景：  
展望未来，真正的“智慧水厂”将是一个由机理、数据和知识共同驱动的高度整合的生态系统。在这个系统中：

* **ASM等机理模型** 将作为系统“数字孪生”的坚实内核，提供对核心生化过程的基本规律描述和深刻的机理洞察。  
* **ML/AI模型** 将构成系统的“神经中枢”，负责处理海量的实时传感数据，执行高频的预测、精准的控制和快速的异常检测任务。  
* **多智能体LLM系统** 则将扮演“认知大脑”的角色。它负责解析和整合包括文本、图像在内的各类非结构化信息，协调各个子系统的运行，通过自然语言与人类操作员进行无缝交互，并针对复杂的、全局性的运营管理问题做出战略性决策。

**最终建议：**

* **对研究人员而言，** 未来的研究重点应聚焦于以下几个前沿方向：深化混合建模的理论与结构创新，开发针对水处理领域的专用、可信、高效的语言模型，以及构建和验证多智能体框架在复杂过程管理中的可靠性与安全性。  
* **对行业从业者而言，** 应积极拥抱数字化转型，将建立高质量、高可用性的数据基础设施作为战略优先事项。同时，可以从成熟度较高的AI应用（如曝气智能控制、出水水质预测）入手，逐步试点和推广，积累数据和经验，为迎接由LLM驱动的下一代智慧水务浪潮做好充分准备。

---

## **附录：关键研究机构与代表性文献**

**关键研究机构/团队：**

* **IWA Task Group on Mathematical Modelling for Design and Operation of Biological Wastewater Treatment：** 作为ASM系列模型的创立者和持续推动者，是该领域无可争议的核心组织 2。  
* **BIOMATH, Ghent University (比利时根特大学)：** 在模型校准协议、不确定性分析和建模实践方面做出了卓越贡献，其开发的BIOMATH校准协议是行业标准之一 23。  
* **Technical University of Denmark (DTU, 丹麦技术大学)：** 以Mogens Henze、Gürkan Sin等学者为代表，长期处于ASM模型开发、应用以及与AI技术融合研究的前沿 1。  
* **Delft University of Technology (TU Delft, 荷兰代尔夫特理工大学)：** Mark van Loosdrecht等著名学者在该校领导的研究团队，在微生物代谢机理、颗粒污泥和新型污水处理工艺模型开发方面具有开创性贡献 2。  
* **Laval University (加拿大拉瓦尔大学) / modelEAU：** 在污水处理模型的实际应用、校准方法学和软件开发方面拥有深厚的研究积累 23。  
* **全球研究热点：** 根据近年来的文献计量分析，中国、美国、伊朗是AI技术在污水处理领域研究成果发表数量最多的国家。其中，德黑兰大学（University of Tehran）、中国科学院（Chinese Academy of Sciences）、清华大学（Tsinghua University）等是全球范围内在该交叉领域贡献卓著的研究机构 47。

**代表性综述文献：**

* Hauduc, H., et al. (2013). "Critical review of activated sludge modeling: state of process knowledge, modeling concepts, and limitations." *Biotechnology and Bioengineering*, 110(1), 24-46. 这是一篇关于ASM模型概念、理论基础和应用局限性的高被引权威综述，对理解模型演进和选择至关重要 4。  
* Gernaey, K. V., et al. (2004). "Activated sludge wastewater treatment plant modelling and simulation: state of the art." *Environmental Modelling & Software*, 19(9), 763-783. 这篇文献是对2000年代初期ASM建模与模拟技术发展水平的经典总结。  
* Brdjanovic, D., et al. (Eds.). (2015). *Applications of Activated Sludge Models*. IWA Publishing. 这本著作是为了庆祝ASM1诞生25周年而出版，汇集了全球顶尖专家关于ASM模型在各种实际工程问题中应用的丰富案例，是理论联系实践的重要参考 2。  
* Sin, G., & Al, R. (2021). "Activated sludge models at the crossroad of artificial intelligence—A perspective on advancing process modeling." *npj Clean Water*, 4(1), 23\. 该文为ASM模型与AI技术融合的未来发展方向提供了前瞻性的视角和深刻的思考 1。

#### **引用的著作**

1. Activated sludge models at the crossroad of artificial intelligence—A perspective on advancing process modeling \- DTU Research Database, 访问时间为 八月 21, 2025， [https://orbit.dtu.dk/files/242307899/s41545\_021\_00106\_5.pdf](https://orbit.dtu.dk/files/242307899/s41545_021_00106_5.pdf)  
2. Applications of Activated Sludge Models \- OAPEN Library, 访问时间为 八月 21, 2025， [https://library.oapen.org/handle/20.500.12657/52462](https://library.oapen.org/handle/20.500.12657/52462)  
3. A Review of Computational Modeling in Wastewater Treatment Processes \- PMC, 访问时间为 八月 21, 2025， [https://pmc.ncbi.nlm.nih.gov/articles/PMC10928720/](https://pmc.ncbi.nlm.nih.gov/articles/PMC10928720/)  
4. Critical Review of Activated Sludge Modeling: State of Process Knowledge, Modeling Concepts, and Limitations | Request PDF \- ResearchGate, 访问时间为 八月 21, 2025， [https://www.researchgate.net/publication/230657980\_Critical\_Review\_of\_Activated\_Sludge\_Modeling\_State\_of\_Process\_Knowledge\_Modeling\_Concepts\_and\_Limitations](https://www.researchgate.net/publication/230657980_Critical_Review_of_Activated_Sludge_Modeling_State_of_Process_Knowledge_Modeling_Concepts_and_Limitations)  
5. Calibration of Activated Sludge Model with Scarce Data Sets \- jeeng.net, 访问时间为 八月 21, 2025， [https://www.jeeng.net/pdf-93793-29670?filename=Calibration%20of%20Activated.pdf](https://www.jeeng.net/pdf-93793-29670?filename=Calibration+of+Activated.pdf)  
6. Application of computer models and Artificial Intelligence technologies to improve the quality of wastewater treatment, 访问时间为 八月 21, 2025， [https://www.e3s-conferences.org/articles/e3sconf/pdf/2024/10/e3sconf\_eea2023\_02003.pdf](https://www.e3s-conferences.org/articles/e3sconf/pdf/2024/10/e3sconf_eea2023_02003.pdf)  
7. Interdisciplinary Integration and Innovation of Hybrid Models for ..., 访问时间为 八月 21, 2025， [https://media.sciltp.com/articles/2508001093/2508001093.pdf](https://media.sciltp.com/articles/2508001093/2508001093.pdf)  
8. ACTIVATED SLUDGE MODELS ASM1, ASM2, ASM2d AND ASM3 \- IWA Publishing, 访问时间为 八月 21, 2025， [https://iwaponline.com/ebooks/book-pdf/1148/wio9781780402369.pdf](https://iwaponline.com/ebooks/book-pdf/1148/wio9781780402369.pdf)  
9. Modelling of Activated Sludge Process \- Encyclopedia.pub, 访问时间为 八月 21, 2025， [https://encyclopedia.pub/entry/39885](https://encyclopedia.pub/entry/39885)  
10. On the Use of Mathematical Models for Wastewater Treatment: A Review and Analysis of Activated Sludge Models ASM1 and ASM3 Başa \- DergiPark, 访问时间为 八月 21, 2025， [https://dergipark.org.tr/tr/download/article-file/1289327](https://dergipark.org.tr/tr/download/article-file/1289327)  
11. Modeling and simulation of an extended ASM2d model for the treatment of wastewater under different COD \- OPUS at UTS, 访问时间为 八月 21, 2025， [https://opus.lib.uts.edu.au/bitstream/10453/152194/3/D41E5C68-FE6C-4BDF-B278-0B5E3F7205DC%20AM.pdf](https://opus.lib.uts.edu.au/bitstream/10453/152194/3/D41E5C68-FE6C-4BDF-B278-0B5E3F7205DC%20AM.pdf)  
12. (PDF) Limitations of ASM1 and ASMS3: A comparison based on batch oxygen uptake rate profiles from different full-scale wastewater treatment plants \- ResearchGate, 访问时间为 八月 21, 2025， [https://www.researchgate.net/publication/7314052\_Limitations\_of\_ASM1\_and\_ASMS3\_A\_comparison\_based\_on\_batch\_oxygen\_uptake\_rate\_profiles\_from\_different\_full-scale\_wastewater\_treatment\_plants](https://www.researchgate.net/publication/7314052_Limitations_of_ASM1_and_ASMS3_A_comparison_based_on_batch_oxygen_uptake_rate_profiles_from_different_full-scale_wastewater_treatment_plants)  
13. Development of an Extended ASM3 Model for Predicting the Nitrous Oxide Emissions in a Full-Scale Wastewater Treatment Plant | Environmental Science & Technology \- ACS Publications, 访问时间为 八月 21, 2025， [https://pubs.acs.org/doi/10.1021/acs.est.8b00386](https://pubs.acs.org/doi/10.1021/acs.est.8b00386)  
14. Application of a biofilm-enhanced A2O system in the treatment of wastewater from mariculture \- Frontiers, 访问时间为 八月 21, 2025， [https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2024.1408774/full](https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2024.1408774/full)  
15. Nutrients removal and microbial activity for A 2 O Process Using Activated Sludge Models, 访问时间为 八月 21, 2025， [https://www.researchgate.net/publication/275434135\_Nutrients\_removal\_and\_microbial\_activity\_for\_A\_2\_O\_Process\_Using\_Activated\_Sludge\_Models](https://www.researchgate.net/publication/275434135_Nutrients_removal_and_microbial_activity_for_A_2_O_Process_Using_Activated_Sludge_Models)  
16. Optimization of A(2)O BNR processes using ASM and EAWAG Bio-P models: model performance | Request PDF \- ResearchGate, 访问时间为 八月 21, 2025， [https://www.researchgate.net/publication/260560798\_Optimization\_of\_A2O\_BNR\_processes\_using\_ASM\_and\_EAWAG\_Bio-P\_models\_model\_performance](https://www.researchgate.net/publication/260560798_Optimization_of_A2O_BNR_processes_using_ASM_and_EAWAG_Bio-P_models_model_performance)  
17. (PDF) A Comprehensive View of the ASM1 Dynamic Model: Study on a Practical Case, 访问时间为 八月 21, 2025， [https://www.researchgate.net/publication/359532399\_A\_Comprehensive\_View\_of\_the\_ASM1\_Dynamic\_Model\_Study\_on\_a\_Practical\_Case](https://www.researchgate.net/publication/359532399_A_Comprehensive_View_of_the_ASM1_Dynamic_Model_Study_on_a_Practical_Case)  
18. Differences Between MBR and Activated Sludge | Seven Seas Water Group, 访问时间为 八月 21, 2025， [https://sevenseaswater.com/differences-between-mbr-and-activated-sludge/](https://sevenseaswater.com/differences-between-mbr-and-activated-sludge/)  
19. The Advancement in Membrane Bioreactor (MBR) Technology toward Sustainable Industrial Wastewater Management \- MDPI, 访问时间为 八月 21, 2025， [https://www.mdpi.com/2077-0375/13/2/181](https://www.mdpi.com/2077-0375/13/2/181)  
20. Activated sludge model (ASM) based modelling of membrane ..., 访问时间为 八月 21, 2025， [https://pubmed.ncbi.nlm.nih.gov/20619870/](https://pubmed.ncbi.nlm.nih.gov/20619870/)  
21. Activated sludge models ASM1, ASM2, ASM2d and ASM3 | Semantic Scholar, 访问时间为 八月 21, 2025， [https://www.semanticscholar.org/paper/Activated-sludge-models-ASM1%2C-ASM2%2C-ASM2d-and-ASM3-Henze-Gujer/74545f88f8129d71d28fb76e995d2c41a2d65dc6](https://www.semanticscholar.org/paper/Activated-sludge-models-ASM1%2C-ASM2%2C-ASM2d-and-ASM3-Henze-Gujer/74545f88f8129d71d28fb76e995d2c41a2d65dc6)  
22. (PDF) Calibration and validation of an activated sludge model for greenhouse gases no. 1 (ASMG1): Prediction of temperature-dependent N2O emission dynamics \- ResearchGate, 访问时间为 八月 21, 2025， [https://www.researchgate.net/publication/237004921\_Calibration\_and\_validation\_of\_an\_activated\_sludge\_model\_for\_greenhouse\_gases\_no\_1\_ASMG1\_Prediction\_of\_temperature-dependent\_N2O\_emission\_dynamics](https://www.researchgate.net/publication/237004921_Calibration_and_validation_of_an_activated_sludge_model_for_greenhouse_gases_no_1_ASMG1_Prediction_of_temperature-dependent_N2O_emission_dynamics)  
23. A Comprehensive Model Calibration Procedure for Activated Sludge ..., 访问时间为 八月 21, 2025， [https://modeleau.fsg.ulaval.ca/fileadmin/modeleau/documents/Publications/pvr461.pdf](https://modeleau.fsg.ulaval.ca/fileadmin/modeleau/documents/Publications/pvr461.pdf)  
24. (PDF) Stepwise Calibration of the Activated Sludge Model No. 1 at a Partially Denitrifying Large Wastewater Treatment Plant \- ResearchGate, 访问时间为 八月 21, 2025， [https://www.researchgate.net/publication/329803090\_Stepwise\_Calibration\_of\_the\_Activated\_Sludge\_Model\_No\_1\_at\_a\_Partially\_Denitrifying\_Large\_Wastewater\_Treatment\_Plant](https://www.researchgate.net/publication/329803090_Stepwise_Calibration_of_the_Activated_Sludge_Model_No_1_at_a_Partially_Denitrifying_Large_Wastewater_Treatment_Plant)  
25. A Review of AI-Driven Control Strategies in the Activated Sludge ..., 访问时间为 八月 21, 2025， [https://www.mdpi.com/2073-4441/16/2/305](https://www.mdpi.com/2073-4441/16/2/305)  
26. Sustainable Management of Wastewater Treatment Plants Using Artificial Intelligence Techniques | Request PDF \- ResearchGate, 访问时间为 八月 21, 2025， [https://www.researchgate.net/publication/355018522\_Sustainable\_Management\_of\_Wastewater\_Treatment\_Plants\_Using\_Artificial\_Intelligence\_Techniques](https://www.researchgate.net/publication/355018522_Sustainable_Management_of_Wastewater_Treatment_Plants_Using_Artificial_Intelligence_Techniques)  
27. Hybrid model composed of machine learning and ASM3 predicts performance of industrial wastewater treatment | Request PDF \- ResearchGate, 访问时间为 八月 21, 2025， [https://www.researchgate.net/publication/382809489\_Hybrid\_model\_composed\_of\_machine\_learning\_and\_ASM3\_predicts\_performance\_of\_industrial\_wastewater\_treatment](https://www.researchgate.net/publication/382809489_Hybrid_model_composed_of_machine_learning_and_ASM3_predicts_performance_of_industrial_wastewater_treatment)  
28. Using Hybrid Machine Learning to Predict Wastewater Effluent ..., 访问时间为 八月 21, 2025， [https://www.mdpi.com/2073-4441/17/13/1851](https://www.mdpi.com/2073-4441/17/13/1851)  
29. \[2409.10898\] LLMs & XAI for Water Sustainability: Seasonal Water Quality Prediction with LIME Explainable AI and a RAG-based Chatbot for Insights \- arXiv, 访问时间为 八月 21, 2025， [https://arxiv.org/abs/2409.10898](https://arxiv.org/abs/2409.10898)  
30. Machine Learning-Assisted Expert Control in Wastewater Aeration Treatment Process Application | ACS ES\&T Engineering, 访问时间为 八月 21, 2025， [https://pubs.acs.org/doi/full/10.1021/acsestengg.5c00493](https://pubs.acs.org/doi/full/10.1021/acsestengg.5c00493)  
31. (PDF) Optimizing Control of Wastewater Treatment Plant With Reinforcement Learning: Technical Evaluation of Twin-Delayed Deep Deterministic Policy Gradient Agent \- ResearchGate, 访问时间为 八月 21, 2025， [https://www.researchgate.net/publication/383963072\_Optimizing\_Control\_of\_Wastewater\_Treatment\_Plant\_with\_Reinforcement\_Learning\_Technical\_Evaluation\_of\_Twin-Delayed\_Deep\_Deterministic\_Policy\_Gradient\_Agent](https://www.researchgate.net/publication/383963072_Optimizing_Control_of_Wastewater_Treatment_Plant_with_Reinforcement_Learning_Technical_Evaluation_of_Twin-Delayed_Deep_Deterministic_Policy_Gradient_Agent)  
32. A Review of Computational Modeling in Wastewater Treatment Processes | ACS ES\&T Water \- ACS Publications, 访问时间为 八月 21, 2025， [http://pubs.acs.org/doi/abs/10.1021/acsestwater.3c00117](http://pubs.acs.org/doi/abs/10.1021/acsestwater.3c00117)  
33. Artificial Intelligence Adoption Framework for Water and Wastewater Utilities, 访问时间为 八月 21, 2025， [https://www.waterrf.org/research/projects/artificial-intelligence-adoption-framework-water-and-wastewater-utilities](https://www.waterrf.org/research/projects/artificial-intelligence-adoption-framework-water-and-wastewater-utilities)  
34. 1 Introduction \- arXiv, 访问时间为 八月 21, 2025， [https://arxiv.org/html/2508.07880v1](https://arxiv.org/html/2508.07880v1)  
35. Harnessing the Potential of Large Language Models for Wastewater Reduction, 访问时间为 八月 21, 2025， [https://www.researchgate.net/publication/394533823\_Harnessing\_the\_Potential\_of\_Large\_Language\_Models\_for\_Wastewater\_Reduction](https://www.researchgate.net/publication/394533823_Harnessing_the_Potential_of_Large_Language_Models_for_Wastewater_Reduction)  
36. Multi-agent large language model frameworks: Unlocking new ..., 访问时间为 八月 21, 2025， [https://pubmed.ncbi.nlm.nih.gov/40090479/](https://pubmed.ncbi.nlm.nih.gov/40090479/)  
37. Large Language Models for Water Distribution Systems ... \- arXiv, 访问时间为 八月 21, 2025， [https://arxiv.org/pdf/2503.16191](https://arxiv.org/pdf/2503.16191)  
38. Large Language Model based Multi-Agents: A Survey of Progress and Challenges \- arXiv, 访问时间为 八月 21, 2025， [https://arxiv.org/html/2402.01680v1](https://arxiv.org/html/2402.01680v1)  
39. Multi-Agent LLMs for Automating Sustainable Operational Decision-Making \- PSE Community.org, 访问时间为 八月 21, 2025， [https://psecommunity.org/wp-content/plugins/wpor/includes/file/2506/LAPSE-2025.0445-1v1.pdf](https://psecommunity.org/wp-content/plugins/wpor/includes/file/2506/LAPSE-2025.0445-1v1.pdf)  
40. LLM-guided Chemical Process Optimization with a Multi-Agent Approach \- arXiv, 访问时间为 八月 21, 2025， [https://arxiv.org/html/2506.20921v1](https://arxiv.org/html/2506.20921v1)  
41. Catalysts of Thought: How LLM Agents are Reinventing Chemical Process Optimization, 访问时间为 八月 21, 2025， [https://cognaptus.com/blog/2025-06-27-catalysts-of-thought-how-llm-agents-are-reinventing-chemical-process-optimization/](https://cognaptus.com/blog/2025-06-27-catalysts-of-thought-how-llm-agents-are-reinventing-chemical-process-optimization/)  
42. Multi-Agent Large Language Model Frameworks: Unlocking New Possibilities for Optimizing Wastewater Treatment Operation | Request PDF \- ResearchGate, 访问时间为 八月 21, 2025， [https://www.researchgate.net/publication/389858694\_Multi-Agent\_Large\_Language\_Model\_Frameworks\_Unlocking\_New\_Possibilities\_for\_Optimizing\_Wastewater\_Treatment\_Operation](https://www.researchgate.net/publication/389858694_Multi-Agent_Large_Language_Model_Frameworks_Unlocking_New_Possibilities_for_Optimizing_Wastewater_Treatment_Operation)  
43. (PDF) Activated Sludge Modelling and Simulation \- ResearchGate, 访问时间为 八月 21, 2025， [https://www.researchgate.net/publication/282372267\_Activated\_Sludge\_Modelling\_and\_Simulation](https://www.researchgate.net/publication/282372267_Activated_Sludge_Modelling_and_Simulation)  
44. Activated sludge models ASM1, ASM2, ASM2d and ASM3 \- DTU Research Database, 访问时间为 八月 21, 2025， [https://orbit.dtu.dk/en/publications/activated-sludge-models-asm1-asm2-asm2d-and-asm3-2](https://orbit.dtu.dk/en/publications/activated-sludge-models-asm1-asm2-asm2d-and-asm3-2)  
45. Activated Sludge Models ASM1, ASM2, ASM2d and ASM3 | eBooks Gateway, 访问时间为 八月 21, 2025， [https://iwaponline.com/ebooks/book/96/Activated-Sludge-Models-ASM1-ASM2-ASM2d-and-ASM3](https://iwaponline.com/ebooks/book/96/Activated-Sludge-Models-ASM1-ASM2-ASM2d-and-ASM3)  
46. Applications of Activated Sludge Models | eBooks Gateway \- IWA Publishing, 访问时间为 八月 21, 2025， [https://iwaponline.com/ebooks/book/244/Applications-of-Activated-Sludge-Models](https://iwaponline.com/ebooks/book/244/Applications-of-Activated-Sludge-Models)  
47. Research progress of the artificial intelligence application in wastewater treatment during 2012–2022: a bibliometric analysis | Water Science & Technology | IWA Publishing, 访问时间为 八月 21, 2025， [https://iwaponline.com/wst/article/88/7/1750/97652/Research-progress-of-the-artificial-intelligence](https://iwaponline.com/wst/article/88/7/1750/97652/Research-progress-of-the-artificial-intelligence)  
48. Critical review of activated sludge modeling: state of process knowledge, modeling concepts, and limitations \- PubMed, 访问时间为 八月 21, 2025， [https://pubmed.ncbi.nlm.nih.gov/22886494/](https://pubmed.ncbi.nlm.nih.gov/22886494/)