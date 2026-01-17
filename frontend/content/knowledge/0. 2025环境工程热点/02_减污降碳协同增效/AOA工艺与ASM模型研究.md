

# **AOA工艺结合ASM模型的模拟研究：彭永臻团队在低碳氮比城市污水处理中的应用**

## **1\. AOA工艺在低C/N城市污水中的应用：工艺创新与生物化学基础**

### **1.1. 低C/N城市污水脱氮的挑战**

城市污水处理正面临双重挑战：日益严格的总氮（TN）排放标准与污水水质中碳氮比（C/N）持续走低的趋势 1。当进水C/N比（通常指$COD/TN$）低于4或5时，传统的生物脱氮工艺（前置反硝化）会因缺乏易生物降解的有机碳源（作为电子供体）而效能大打折扣 3。为确保脱氮达标，污水处理厂（WWTPs）不得不额外投加外部碳源（如甲醇或乙酸钠），这不仅显著增加了运营成本，也违背了“低碳”运行的行业目标 4。

针对这一行业难题，北京工业大学彭永臻教授的科研团队进行了长期且深入的研究，致力于开发经济、高效的污水处理新工艺，以实现碳限制型污水的深度脱氮 1。

### **1.2. 先进AOA系统的核心生物化学：短程硝化、Anammox与内源反硝化的协同**

为了克服碳源的限制，厌氧/好氧/缺氧（Anaerobic/Aerobic/Anoxic, AOA）工艺及其衍生变体，将脱氮的重点从依赖*外源碳*转移到了挖掘*内源生物途径*的潜力上 10。这些先进AOA系统的核心在于实现了多种新型脱氮途径的复杂协同，主要包括短程硝化、厌氧氨氧化（Anammox）和内源反硝化。

短程硝化 (Partial Nitrification, PN)  
短程硝化是实现脱氮“捷径”的第一步。其目标是精确控制好氧区的运行条件（如低溶解氧、游离氨抑制等），优先富集氨氧化菌（AOB），同时抑制或淘洗掉亚硝酸盐氧化菌（NOB）11。这使得硝化作用停止在亚硝酸盐（$NO\_2^-$）阶段，而不是传统的终点产物硝酸盐（$NO\_3^-$）。实现稳定的PN至关重要，因为Anammox菌利用的是$NO\_2^-$而非$NO\_3^-$作为电子受体 13。  
厌氧氨氧化 (Anammox)  
Anammox是彭永臻团队近年来的研究核心之一 11。Anammox菌（AnAOB）是一类自养菌，它们能在厌氧条件下，以$NH\_4^+$为电子供体，以$NO\_2^-$为电子受体，直接将两者转化为$N\_2$气，此过程完全无需有机碳源 12。  
内源反硝化 (Endogenous Denitrification, EnD)  
当进水碳源（易生物降解COD）匮乏时，系统中唯一的碳源来自于微生物自身。AOA工艺的首段厌氧区（A段）一个关键作用就是诱导异养菌（OHOs）吸收和储存污水中的有机物，并以聚羟基脂肪酸酯（PHA）等形式储存在细胞内 1。在后续的缺氧区（A段），这些异养菌会利用储存的内源碳（即PHA）作为电子供体，进行反硝化，还原$NO\_3^-$ 1。  
内源短程反硝化 (Endogenous Partial Denitrification, EdPD)  
这是内源反硝化的一个关键分支。在此过程中，异养菌利用内源碳将$NO\_3^-$还原仅至$NO\_2^-$阶段即停止，从而实现了$NO\_2^-$的积累 15。  
PN-EnD/A的协同机制  
先进AOA工艺（如彭永臻团队提出的PN-EnD/A工艺）的真正创新在于上述多种途径的精密协同 10。其内部的生物化学链条可描述为：

1. **厌氧区 (A1)：** 进水在此与回流污泥混合，异养菌利用进水COD合成并储存PHA 1。  
2. **好氧区 (O)：** 通过低DO控制实现短程硝化（PN），将部分$NH\_4^+$转化为$NO\_2^-$，但不可避免地会产生部分$NO\_3^-$ 10。  
3. **缺氧区 (A2)：** 这是协同反应的核心。从好氧区流入的混合液（含有剩余$NH\_4^+$、目标产物$NO\_2^-$和副产物$NO\_3^-$）在此发生两种关键反应：  
   * **Anammox反应：** AnAOB菌利用$NH\_4^+$和$NO\_2^-$进行脱氮，实现主要的氮去除 8。  
   * **EdPD反应：** 异养菌利用在厌氧区储存的PHA，将好氧区产生的$NO\_3^-$还原为$NO\_2^-$ 15。  
4. **协同闭环：** EdPD过程产生的$NO\_2^-$随即被Anammox过程作为底物消耗掉。

在此系统中，EdPD扮演了“Anammox底物再生器”的关键角色。它将好氧区产生的“废弃”氧化剂（$NO\_3^-$）重新转化为Anammox所需的“活性”氧化剂（$NO\_2^-$）。同时，该过程利用的是*储存碳*，从而避免了与Anammox菌（自养菌）争夺进水碳源。这构成了一个高效、自持的氮去除生物链，最大化地利用了进水有限的碳源和内源生物潜力。

### **1.3. 彭永臻团队的工艺变体与贡献**

彭永臻团队的研究展现了AOA工艺的清晰演进路径。

* **基础AOA工艺：** 早期的研究（2020年之前）集中于验证AOA工艺中EnD和EdPD的可行性与重要性 2。  
* **SDR-AOA (污泥双回流AOA)：** 该工艺在传统AOA基础上，创新性地增加了*第二次污泥回流*至末端缺氧区。这一改进显著提高了缺氧区的污泥浓度（MLSS），从而增加了可用于内源反硝化的总生物量（及总储存碳）。实验证明，该措施将反硝化速率从0.1 $kgN/(m^3 \\cdot d)$ 提高到了0.17 $kgN/(m^3 \\cdot d)$ 1。  
* **PN-SAEPD (短程硝化-同步Anammox与内源短程反硝化)：** 该工艺命名（源自2020年文献）在生物化学层面上正式确立了1.2节中所述的协同机制 17。  
* **PN-EnD/A (推流式AOA)：** 近期（2024年）的研究重点转向在*推流式反应器*（Plug-Flow Reactor, PFR）中强化PN、EnD、PD和Anammox的协同作用 10。PFR构型更接近于大型污水处理厂的实际工况，使得研究成果更具工程应用价值。

### **1.4. N2O减排：AOA工艺的核心协同效益**

除了高效脱氮，彭永臻团队2024年2月发表于《Environmental Science & Technology》的研究首次系统性地评估了AOA工艺的温室气体（$N\_2O$）减排潜力 8。$N\_2O$（氧化亚氮）是一种强效温室气体，主要在硝化和反硝化过程中产生。

该研究设计了一种新型的气体收集连续流反应器，发现：

1. **$N\_2O$的“汇”：** 经过优化的、实现了高效EnD和Anammox协同的缺氧区，不仅不产生$N\_2O$，反而成为了$N\_2O$的“净消耗池”。  
2. **量化结果：** 强化的EnD+Anammox协同，使得缺氧区的$N\_2O$排放因子从0.28%（基准期）锐减至0.06%。  
3. **上游净化：** 更重要的是，缺氧区的内源反硝化过程*消除*了91.46%来自上游好氧区（传统$N\_2O$产生区）的溶解态$N\_2O$，使最终出水溶解态$N\_2O$低于0.01 mg/L 8。

这一发现具有重大意义，它表明AOA工艺不仅是低碳（节能、少碳源）的脱氮技术，还可能是负碳（减排$N\_2O$）的技术。这也对后续的数学模型提出了明确要求：一个无法描述$N\_2O$产生与消耗的AOA模型，将是不完整的。

## **2\. 模型框架选择：ASM1 vs. ASM3在AOA系统中的适用性**

为了对1.2节中描述的复杂生物化学协同作用进行定量分析、预测和优化，必须依赖数学模型。在活性污泥模型（ASM）家族中，ASM1和ASM3是应用最广的基础模型。

### **2.1. ASM1与ASM3的比较分析：内源过程与基质储存的描述**

ASM1（1987年）是活性污泥模型的开山之作。它采用“生长-衰亡”（Growth-Decay）假说来描述生物量（如$X\_H$，异养菌）的循环。在此模型中，生物量死亡后，通过“水解”过程，其组分被“再循环”为可生物降解的底物（$S\_S$）20。

ASM3（1999年）则是对ASM1的修正，旨在更准确地反映微生物的生理行为 21。ASM3的核心改进在于：

1. **基质储存：** 引入了“储存-生长”（Storage-Growth）概念。异养菌（$X\_H$）首先快速地摄取易生物降解底物（$S\_S$），并将其转化为内部储存产物（$X\_{STO}$，即模型中的PHA）20。随后，生物量的*生长*依赖于对*内部储存产物*$X\_{STO}$*的消耗*。  
2. **内源呼吸：** ASM3用“内源呼吸”（Endogenous Respiration）替代了ASM1的“衰亡”假说。在此过程中，生物量通过消耗自身的细胞组分来维持生命活动，而不是“死亡”后裂解 20。

### **2.2. 基于ASM3的必要性：模拟内源反硝化的唯一选择**

对于彭永臻团队所研究的AOA工艺（特别是SDR-AOA和PN-EnD/A），其在低C/N条件下的成功*完全依赖*于内源反硝化（EnD）1。

在此，一个关键的逻辑链条浮现：

1. AOA工艺的核心是利用内源反硝化（EnD）1。  
2. 从生物化学角度看，EnD是微生物利用*内部储存碳*（即PHA）进行呼吸的过程 1。  
3. 在ASM模型家族中，ASM1*没有*为内部储存碳设置状态变量，其“衰亡”假说无法在机理上描述EnD。  
4. ASM3*专门设计*了状态变量$X\_{STO}$（储存产物）以及相关的储存和消耗动力学 20。

因此，试图使用ASM1来模拟彭永臻团队的EnD依赖型AOA工艺，在概念上是不可行的。ASM3是能够准确描述该系统核心机制（储存与内源消耗）的*唯一*且*必需*的基础框架。

### **2.3. 标准ASM模型在模拟PN/Anammox中的固有局限性**

然而，无论是标准的ASM1还是ASM3，在应用于AOA-Anammox系统时，都存在一个*共同的、致命的缺陷* 21。

标准ASM模型为了简化，将硝化作用描述为一步法：  
$NH\_4^+ \\rightarrow NO\_3^-$ （由单一的自养菌$X\_{AUT}$催化）  
同时，它们也将反硝化描述为\*一步法\*：  
$NO\_3^- \\rightarrow N\_2$ （由异养菌$X\_H$催化）  
这种过度简化导致标准ASM模型的“词汇表”中甚至*不存在*亚硝酸盐（$S\_{NO2}$）这个状态变量。这使得模型在数学上*无法*描述以下任何一个AOA的核心过程：

* **短程硝化 (PN)：** 无法模拟$S\_{NO2}$的*产生*。  
* **Anammox：** 无法模拟$S\_{NO2}$的*消耗*。  
* **内源短程反硝化 (EdPD)：** 无法模拟$S\_{NO2}$的*积累*。  
* **$N\_2O$减排：** 无法模拟$N\_2O$（$S\_{N2O}$）的产生与消耗。

### **2.4. 结论：基于ASM3的修正是首选框架**

综上所述，模拟AOA-Anammox系统的唯一可行路径是采用*修正模型*。该模型的构建必须遵循两个基本原则：

1. **选择ASM3作为基础 (Base Model)：** 因为它提供了模拟内源反硝化所必需的$X\_{STO}$（储存产物）状态变量和动力学 20。  
2. **对ASM3进行重大修正 (Modification)：** 必须扩展模型结构，以纳入新的状态变量和生物过程 12。

## **3\. 模型开发流程：构建AOA-Anammox修正ASM模型**

构建一个能够准确描述AOA-Anammox-EnD协同作用的数学模型，是一个精细的流程，它要求在ASM3的基础上进行系统性的扩展。

### **3.1. 建立模型结构：引入两步硝化和四步反硝化**

根据12的研究，模型结构的第一步修改是解构传统的“一步法”氮循环。

两步硝化 (Two-Step Nitrification) 21  
必须将标准ASM模型中笼统的自养菌（$X\_{AUT}$）拆分为两个独立的生物功能群：

* **氨氧化菌 (AOB, $X\_{AOB}$)：** 催化硝化的第一步。  
  * 过程1 (AOB生长)：$NH\_4^+ \+ O\_2 \\rightarrow NO\_2^-$  
* **亚硝酸盐氧化菌 (NOB, $X\_{NOB}$)：** 催化硝化的第二步（在PN工艺中需要被抑制）。  
  * 过程2 (NOB生长)：$NO\_2^- \+ O\_2 \\rightarrow NO\_3^-$

四步反硝化 (Four-Step Denitrification) 12  
为了模拟$N\_2O$的产生与消耗（呼应8的研究），必须将一步法反硝化拆分为四个连续的还原过程，并将$NO\_2^-$和$N\_2O$作为关键中间产物：

* 过程3 (硝酸盐还原)：$NO\_3^- \\rightarrow NO\_2^-$  
* 过程4 (亚硝酸盐还原)：$NO\_2^- \\rightarrow N\_2O$  
* 过程5 (氧化亚氮还原)：$N\_2O \\rightarrow N\_2$

这种结构不仅是模拟$N\_2O$所必需的，也为模拟EdPD（内源短程反硝化，即过程3的强化）提供了框架。

### **3.2. 定义必要的状态变量（新组分）**

基于上述结构，模型的状态变量（Components）必须在ASM3的基础上进行扩展。根据12的分析，至少需要增加以下状态变量：

* $S\_{NO2}$：溶解态亚硝酸盐（AOB的产物；NOB、Anammox和反硝化过程4的底物）21。  
* $S\_{N2O}$：溶解态氧化亚氮（反硝化过程4的产物；过程5的底物）8。  
* $X\_{AOB}$：氨氧化菌生物量 21。  
* $X\_{NOB}$：亚硝酸盐氧化菌生物量（PN工艺中的主要竞争者）21。  
* $X\_{ANA}$：厌氧氨氧化菌生物量（AOA工艺的核心功能菌）12。

同时，ASM3中原有的状态变量$X\_{STO}$（储存产物）和$X\_H$（异养菌生物量）在该修正模型中扮演着模拟EnD和EdPD的关键角色 20。

### **3.3. 详述Anammox与内源途径的动力学与化学计量矩阵**

这是模型的核心。必须为新增的生物功能群（$X\_{AOB}$, $X\_{NOB}$, $X\_{ANA}$）定义新的生物过程（Processes）和相应的动力学方程。

1. **AOB生长：** 动力学需考虑$S\_{NH4}$和$S\_{O2}$的Monod限制，以及游离氨（FA）和游离亚硝酸（FNA）的抑制作用 14。  
2. **NOB生长：** 动力学需考虑$S\_{NO2}$和$S\_{O2}$的Monod限制，以及FA/FNA的抑制（通常NOB对FA的抑制比AOB更敏感，这是实现PN的机理之一）14。  
3. **Anammox生长 ($X\_{ANA}$)：** 这是一个全新的自养过程。其动力学方程必须是一个“双底物”模型，同时受到$S\_{NH4}$和$S\_{NO2}$的限制。此外，该过程对$S\_{O2}$（溶解氧）具有极强的抑制性 23。其化学计量比是固定的（例如，消耗约1.32 mol $NO\_2^-$对应1 mol $NH\_4^+$）。  
4. **内源反硝化 (基于$X\_{STO}$ )：** 需修改四步反硝化过程（过程3, 4, 5），使其在$S\_S$（易生物降解COD）浓度低时，自动切换为使用$X\_{STO}$作为电子供体。这通常通过一个复杂的切换函数实现。  
5. **内源短程反硝化 (EdPD)：** 这是一个高级模型概念，源自彭永臻团队的研究 15。在模型中，这可能表现为在特定条件下（如$X\_{STO}$充足但后续电子受体受限），过程3（$NO\_3^- \\rightarrow NO\_2^-$）的速率显著高于过程4（$NO\_2^- \\rightarrow N\_2O$），导致$S\_{NO2}$的净积累。

为了清晰地展示这些复杂的相互作用，通常使用Peterson矩阵（化学计量矩阵）来定义模型。

表 3.1: 修正的AOA-Anammox模型 (ASM3-Anammox) 的Peterson矩阵 (简化)  
此表定义了模型的核心数学结构。行代表状态变量（组分），列代表生物过程。单元格中的值为化学计量系数（1表示产生，负值表示消耗，空白表示不参与）。

| 组分 (Components) | 1\. AOB生长 (XAOB​) | 2\. NOB生长 (XNOB​) | 3\. Anammox生长 (XANA​) | 4\. 反硝化 (NO3-\>NO2) | 5\. 反硝化 (NO2-\>N2O) | 6\. 反硝化 (N2O-\>N2) |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| $S\_{NH4}$ | $-1/Y\_{AOB}$ |  | $-1/Y\_{ANA}$ |  |  |  |
| $S\_{NO2}$ | \+1 | $-1/Y\_{NOB}$ | $-1.32/Y\_{ANA}$ | \+1 | $-1$ |  |
| $S\_{NO3}$ |  | \+1 |  | $-1$ |  |  |
| $S\_{N2O}$ |  |  |  |  | \+1 | $-1$ |
| $S\_{N2}$ |  |  | $1/Y\_{ANA}$ |  |  | \+1 |
| $S\_{O2}$ | $-(4.57-Y\_{AOB})/Y\_{AOB}$ | $-(1.14-Y\_{NOB})/Y\_{NOB}$ | *Inhibition* |  |  |  |
| $X\_{AOB}$ | \+1 |  |  |  |  |  |
| $X\_{NOB}$ |  | \+1 |  |  |  |  |
| $X\_{ANA}$ |  |  | \+1 |  |  |  |
| $X\_{STO}$ |  |  |  | *\-(1-Y\_H)/Y\_H* | *\-(1-Y\_H)/Y\_H* | *\-(1-Y\_H)/Y\_H* |

*注：此表为高度简化的示意图，省略了碱度、异养菌生长、水解、衰亡等其他过程。反硝化过程中的$X\_{STO}$消耗系数为示意值。*

### **3.4. 推流式AOA系统的集成建模流程**

构建了模型的核心（如表3.1）后，必须将其置于一个模拟实际反应器配置（即“厂模型”）中。彭永臻团队的研究主要集中于推流式（Plug-Flow, PFR）AOA系统 10。

在模拟软件（如GPS-X, BioWin, SIMBA或MATLAB/Simulink 21）中，PFR通常通过串联多个CSTRs（连续搅拌池反应器）来实现。

**建模流程如下：**

1. **反应器配置：** 建立一个由（例如）10-20个CSTRs串联而成的反应器序列。  
2. **区域划分：** 根据AOA工艺的HRT（水力停留时间）比例（如26中研究的1:2:2），将串联的CSTRs划分为厌氧区、好氧区和缺氧区。  
3. **设定工况：**  
   * 厌氧区：设定$S\_{O2} \= 0$。  
   * 好氧区：设定一个受控的低DO（如0.3-1.2 mg/L 14），以模拟实现PN的条件。  
   * 缺氧区：设定$S\_{O2} \= 0$。  
4. **设置回流：** 添加污泥回流（RAS）和混合液内回流（MLR）。若模拟SDR-AOA 1，则需额外添加第二股污泥回流至缺氧区。  
5. **定义进水：** 设定具有低C/N特征的进水水质文件。  
6. **运行与校准：** 运行模型，并进入第4部分所述的校准流程。

## **4\. 模型校准、验证与敏感性分析**

一个结构正确的模型，如果参数错误，其预测结果也毫无价值。模型校准是整个建模工作中最为关键和耗时的一步。

### **4.1. AOA-Anammox系统的参数识别协议**

模型校准（Calibration）是指调整模型中的动力学和化学计量学参数（如最大比生长速率$\\mu\_{max}$、半饱和常数$K\_S$等），使模型的模拟输出（如出水$NH\_4^+$、$NO\_2^-$、$NO\_3^-$浓度）与中试或实际污水厂的测量数据（如彭永臻团队的6.5$m^3$中试装置 11 或全尺寸SNAD反应器 14）高度吻合的过程。

该过程通常涉及：

1. **数据采集：** 收集高质量的、动态的进出水及反应器内部关键组分的时间序列数据 1。  
2. **参数筛选：** 通过敏感性分析（见4.3节）确定对模型输出影响最大的“关键参数”。  
3. **参数优化：** 使用优化算法（如遗传算法、最小二乘法）自动调整关键参数，使模拟值与实际值之间的误差（如平方和误差）最小。

### **4.2. 关键动力学与化学计量参数的校准**

对于AOA-Anammox模型，校准的重点是新增的生物功能群（AOB, NOB, AnAOB）的动力学参数。2025年的一项针对Anammox颗粒污泥的建模研究 23，为这些关键参数提供了宝贵的校准值范围。

Anammox ($X\_{ANA}$) 动力学参数 (基于 23)

* **最大比生长速率 ($\\mu\_{ANA}$):** 0.033 – 0.10 $d^{-1}$。这是一个极低的值，证实了Anammox菌生长极其缓慢，是系统中的瓶颈。  
* **衰减速率 ($b\_{ANA}$):** 0.003 $d^{-1}$。  
* **氧半饱和常数 ($K\_{O2,ANA}$):** 0.10 $mg-O\_2/L$。这证实了Anammox菌对氧气极其敏感，微量的DO（0.1 mg/L）即可对其产生显著影响（抑制或半饱和）。  
* **氨半饱和常数 ($K\_{NH4,ANA}$):** 0.07 $mg-N/L$。  
* **亚硝酸盐半饱和常数 ($K\_{NO2,ANA}$):** 0.05 $mg-N/L$。

AOB/NOB 动力学参数 (基于 23)

* **AOB最大比生长速率 ($\\mu\_{AOB}$):** 20°C下的中位值为 0.74 $d^{-1}$ 25。  
* **NOB最大比生长速率 ($\\mu\_{NOB}$):** 20°C下的中位值为 0.65 $d^{-1}$ 25。

内源反硝化 (EnD) 动力学  
这是一个当前的难点。虽然彭永臻团队的SDR-AOA研究给出了一个总的工艺速率（0.17 $kgN/(m^3 \\cdot d)$）1，但这并不是一个可以直接用于ASM3的模型参数（如内源反硝化速率常数或$\\eta\_{ED}$因子）。对EdPD（内源短程反硝化 \[16\]）的动力学参数（即$X\_{STO}$消耗与$S\_{NO2}$生成的耦合系数）的精确校准，是当前模型应用的一个关键挑战。  
表 4.1: AOA-Anammox模型关键动力学参数校准值 (2023-2025年文献)  
此表为模型构建者提供了关键参数的文献参考基准。

| 参数 | 符号 | 功能菌群 | 校准值/范围 | 单位 | 来源 |
| :---- | :---- | :---- | :---- | :---- | :---- |
| 最大比生长速率 | $\\mu\_{ANA}$ | Anammox ($X\_{ANA}$) | 0.033 – 0.10 | $d^{-1}$ | 23 |
| 衰减速率 | $b\_{ANA}$ | Anammox ($X\_{ANA}$) | 0.003 | $d^{-1}$ | 23 |
| 氧半饱和常数 | $K\_{O2,ANA}$ | Anammox ($X\_{ANA}$) | 0.10 | $mg-O\_2/L$ | 23 |
| 氨半饱和常数 | $K\_{NH4,ANA}$ | Anammox ($X\_{ANA}$) | 0.07 | $mg-N/L$ | 23 |
| 亚硝酸盐半饱和常数 | $K\_{NO2,ANA}$ | Anammox ($X\_{ANA}$) | 0.05 | $mg-N/L$ | 23 |
| 最大比生长速率 | $\\mu\_{AOB}$ | AOB ($X\_{AOB}$) | 0.74 (中位数) | $d^{-1}$ | 25 |
| 最大比生长速率 | $\\mu\_{NOB}$ | NOB ($X\_{NOB}$) | 0.65 (中位数) | $d^{-1}$ | 25 |

### **4.3. 敏感性分析：识别过程稳定性的主控参数**

敏感性分析（SA）用于测试模型中哪些参数的微小变化会对模型的输出（如出水TN）产生最大影响。这能帮助我们识别系统的“阿喀琉斯之踵”。

基于12的分析，AOA-Anammox模型的敏感性结论如下：

* **最高敏感参数：** $\\mu\_{ANA}$（Anammox最大比生长速率）被认为是系统的*主控因素* 23。这符合认知：作为系统中生长最慢的微生物，AnAOB的生长速率是整个工艺的最终瓶颈。  
* **高敏感参数：** $\\mu\_{AOB}$（Anammox的“伙伴”）和$\\mu\_{NOB}$（Anammox的“竞争者”）23。这证实了模型的动态核心在于AOB、NOB和AnAOB三者之间的*生长动力学竞争*。  
* **高敏感参数（工况）：** $K\_{O2,ANA}$ 和 $K\_{O2,NOB}$（氧半饱和常数）23。这组参数直接决定了在低DO条件下，氧气会优先流向谁，从而决定了NOB是否能被有效抑制。

一个值得注意的现象是，12的一项研究提到，NOB和Anammox的亚硝酸盐半饱和系数（$K\_{NO2}$）对模型输出*不*敏感。而23则指出亚硝酸盐*浓度*（$S\_{NO2}$）是工艺的*限速参数*。

这两者并不矛盾。它很可能揭示了一个事实：$S\_{NO2}$浓度本身（作为一个状态变量）因为极低而成为限速步骤；但AnAOB和NOB对$S\_{NO2}$的亲和力（即$K\_{NO2}$参数）都非常高（即$K$值都非常低），导致两者在亲和力上差异不大。因此，改变$K$值这个*参数*对模拟结果影响甚微。系统中的*真正竞争*并非由亲和力（K）决定，而是由*生长速率*（$\\mu$）和*运行条件*（如DO、FA抑制）共同决定 14。

### **4.4. 验证方法：确保模型的预测能力**

校准完成后，模型必须使用一个*独立*的数据集（即未用于校准的数据，例如来自另一运行周期的实验数据）进行验证（Validation）12。验证的目的是确认模型是否具有真实的预测能力，而不是对特定数据集的“过度拟合”。彭永臻团队的中试数据 11 为此类验证提供了理想的数据源。

## **5\. 模拟结果分析与过程见解**

一个经过验证的AOA-ASM模型，将从“描述工具”转变为强大的“预测和优化工具”。

### **5.1. 基于模型的脱氮性能分析与途径解析**

彭永臻团队的AOA工艺在实验中取得了卓越的脱氮效果，例如SDR-AOA在C/N为2.67时实现了97.7%的NRE（总氮去除率）1，而优化的AOA-Anammox工艺也使NRE从67.65%提升至81.96% 8。

一个校准后的模型 28 首先应能*复现*这些高NRE值。但模型的真正价值在于*定量解析*氮去除的贡献途径。模型可以清晰地回答：“在这97.7%的去除率中，有多少百分比来自Anammox，多少来自内源反硝化？”

例如，模型可以证实16中观测到的Anammox贡献率为49.8%，或14中观测到的61%。这种定量化的“贡献度分析”是证明PN-EnD/A协同机制（见1.2节）确实按预期工作的最有力证据。

### **5.2. 模拟NOB与Anammox菌的竞争：优化运行窗口**

PN/Anammox工艺在工程应用中的最大挑战是其稳定性——NOB（“敌人”）随时可能“卷土重来”，与AnAOB（“盟友”）争夺$NO\_S{NO2}$，导致系统崩溃 12。

数学模型（如基于Benchmark Simulation Model No. 2, BSM2的BSM2-SHAMX平台 13）是测试系统鲁棒性和寻找最佳*运行窗口*的理想工具。

* **DO控制策略：** 模型可以运行“情景模拟”（What-if Scenarios）来寻找抑制NOB的最佳DO“甜点”。如23的建模研究发现，0.10 mg-O2/L是最大化AnAOB种群的最佳DO设定点，而14的稳定运行区间则在0.3-1.2 mg/L。  
* **HRT优化：** 模型可以测试不同的A/O/A HRT比例（如26中的1:2:2），以找到平衡硝化、反硝化和Anammox的最佳时间分配。  
* **高级过程控制：** 模型可用于设计更复杂的控制策略，如PID或模型预测控制（MPC）13。一项研究显示，基于模型设计的MPC控制器，与基准工况相比，能额外提高10%的脱氮率，并降低36%的运行成本 13。

### **5.3. 利用模型优化运行：降低碳源与能耗**

模型的最终应用是实现资源优化，即“节能降耗”。

* **节省碳源：** 模型可以精确计算，通过最大化内源反硝化（EnD）1，可以替代多少外部碳源的投加量 7。  
* **节省能耗：** PN/Anammox工艺（好氧呼吸仅需将$NH\_4^+$氧化至$NO\_2^-$）相比传统硝化（需氧化至$NO\_3^-$）显著降低了曝气需求 4。模型可以精确预测不同运行策略下的曝气量，从而优化风机运行，实现电耗最低 7。  
* **减少$N\_2O$：** 如1.4节所述，结合了四步反硝化的修正ASM模型，可用于设计和运行AOA工艺，使其不仅实现脱氮，还充当$N\_2O$的净消耗池，实现环境效益最大化 8。

## **6\. 综合分析与未来研究方向**

### **6.1. AOA-ASM模型互作中的知识空白**

尽管基于ASM3的修正模型在模拟AOA-Anammox工艺方面取得了长足进步，但仍存在亟待填补的知识空白。

空白1：参数的普适性与可移植性  
如12中明确指出的，当前模型最大的局限之一是参数的不可移植性。表4.1中列出的校准参数（如$\\mu\_{ANA}$）可能仅适用于特定反应器中的特定微生物群落和水质基质。将模型应用于另一个污水厂，几乎肯定需要一套全新的、昂贵的再校准工作。这是阻碍模型从学术走向广泛工程应用的主要障碍。  
空白2：简化的微生物群落代表  
现有的ASM（即便是修正版）本质上仍是“集总参数模型”（Lumped-Parameter Model）。它将“$X\_{AOB}$”或“$X\_{ANA}$”视为一个单一、同质的群体。然而，真实的微生物生态远比这复杂。

* **AOA vs. AOB：** 研究 12 已证实，在污水处理系统中存在大量的**氨氧化古菌 (Ammonia-Oxidizing Archaea, AOA)**。AOA似乎比AOB（氨氧化细菌）更适应*极低*氨氮和*极低*DO的环境 12。在低C/N的城市污水（通常是低氨氮）中，AOA可能是比AOB*更理想*的Anammox合作伙伴。  
* **模型缺陷：** 目前主流的AOA-ASM修正模型（如12中所述）*并未*包含AOA和AOB的种间竞争。这对于精确模拟系统在极限（低氨、低DO）条件下的稳定性，是一个重大的模型结构缺陷。

空白3：内源短程反硝化（EdPD）的动力学  
彭永臻团队的研究已经证实了EdPD（利用$X\_{STO}$生产$S\_{NO2}$）是AOA系统协同作用的核心 15。然而，目前文献中仍然缺乏对这一特定过程的、经过充分校准的动力学模型和参数。开发一个可靠的EdPD子模型，并将其无缝集成到ASM3-Anammox框架中，是未来建模研究的明确方向。

### **6.2. 结论：现状与未来潜力**

综合分析  
低C/N城市污水的脱氮是一个严峻的全球性挑战 1。以彭永臻教授团队为代表的科研力量，通过开发SDR-AOA、PN-EnD/A等先进AOA工艺，展示了一条极具前景的技术路线 1。该路线的核心是摒弃对外源碳的依赖，转而挖掘短程硝化（PN）、厌氧氨氧化（Anammox）以及（至关重要的）内源反硝化（EnD/EdPD）之间的复杂生物协同作用。  
模型的核心作用  
本报告的分析表明，标准的ASM1和ASM3模型由于其简化的结构（ASM1缺乏$X\_{STO}$，两者均缺乏$S\_{NO2}$），均无法用于模拟这些先进的AOA工艺 20。  
研究和应用AOA工艺*必须*依赖一个基于**ASM3框架的深度修正模型** 20。

模型修正的核心要求  
一个最小完备的AOA-Anammox模型必须包括：

1. **ASM3基础：** 以便通过$X\_{STO}$变量来模拟内源反硝化 20。  
2. **两步硝化：** 拆分$X\_{AOB}$和$X\_{NOB}$，引入$S\_{NO2}$ 21。  
3. **四步反硝化：** 引入$S\_{N2O}$，以模拟温室气体排放与削减 8。  
4. **Anammox功能群：** 引入新的$X\_{ANA}$生物量和相应的双底物动力学 12。

未来潜力  
一旦使用中试或实际数据（例如利用表4.1中的参数作为初始值 23）进行了精确校准，该模型就从一个学术工具转变为一个强大的工程设计平台。它可用于设计高级控制策略以确保系统的稳定性 13，优化工艺参数以最大限度地节省能耗 4 和碳源 7，并（如8所示）将污水厂从$N\_2O$的“源”转变为“汇”。这将是推动AOA技术最终从实验室走向大规模、高鲁棒性工程应用的关键一步 11。

#### **引用的著作**

1. Advanced nitrogen removal of low C/N ratio sewage in an anaerobic/aerobic/anoxic process through enhanced post-endogenous denitrification \- Middlebury College, 访问时间为 十一月 15, 2025， [https://miislibrarysearch.middlebury.edu/discovery/fulldisplay/cdi\_proquest\_miscellaneous\_2406306458/01MIDDLE\_INST:01MIDDLE\_INST\_cm](https://miislibrarysearch.middlebury.edu/discovery/fulldisplay/cdi_proquest_miscellaneous_2406306458/01MIDDLE_INST:01MIDDLE_INST_cm)  
2. Advanced nitrogen removal of low C/N ratio sewage in an anaerobic/aerobic/anoxic process through enhanced post-endogenous denitrification \- PubMed, 访问时间为 十一月 15, 2025， [https://pubmed.ncbi.nlm.nih.gov/32443280/](https://pubmed.ncbi.nlm.nih.gov/32443280/)  
3. Enhanced nitrogen removal from low C/N municipal wastewater in a step-feed integrated fixed-film activated sludge system: Synergizing anammox and partial denitrification with sludge fermentation liquid supplementation \- PubMed, 访问时间为 十一月 15, 2025， [https://pubmed.ncbi.nlm.nih.gov/39919405/](https://pubmed.ncbi.nlm.nih.gov/39919405/)  
4. Advancing the understanding of mainstream shortcut nitrogen removal \- Environmental Science \- The Royal Society of Chemistry, 访问时间为 十一月 15, 2025， [https://pubs.rsc.org/en/content/articlepdf/2022/ew/d2ew00247g](https://pubs.rsc.org/en/content/articlepdf/2022/ew/d2ew00247g)  
5. Combining simultaneous nitrification-endogenous denitrification and phosphorus removal with post-denitrification for low carbon/nitrogen wastewater treatment \- PubMed, 访问时间为 十一月 15, 2025， [https://pubmed.ncbi.nlm.nih.gov/27552719/](https://pubmed.ncbi.nlm.nih.gov/27552719/)  
6. Performance of anaerobic/oxic/anoxic simultaneous nitrification, denitrification and phosphorus removal system overwhelmingly dominated by Candidatus\_Competibacter: Effect of aeration time \- ResearchGate, 访问时间为 十一月 15, 2025， [https://www.researchgate.net/publication/371477387\_Performance\_of\_anaerobicoxicanoxic\_simultaneous\_nitrification\_denitrification\_and\_phosphorus\_removal\_system\_overwhelmingly\_dominated\_by\_Candidatus\_Competibacter\_Effect\_of\_aeration\_time](https://www.researchgate.net/publication/371477387_Performance_of_anaerobicoxicanoxic_simultaneous_nitrification_denitrification_and_phosphorus_removal_system_overwhelmingly_dominated_by_Candidatus_Competibacter_Effect_of_aeration_time)  
7. Optimization of nitrogen removal performance of multistage AO step-feed process for a municipal wastewater treatment plant \- 环境工程, 访问时间为 十一月 15, 2025， [http://hjgc.ic-mag.com/en/article/doi/10.13205/j.hjgc.202509001](http://hjgc.ic-mag.com/en/article/doi/10.13205/j.hjgc.202509001)  
8. Synchronous Achievement of Advanced Nitrogen Removal and N2O ..., 访问时间为 十一月 15, 2025， [https://pubmed.ncbi.nlm.nih.gov/38271692/](https://pubmed.ncbi.nlm.nih.gov/38271692/)  
9. Advanced nitrogen removal from low C/N municipal wastewater by combining partial nitrification-anammox and endogenous partial denitrification-anammox (PN/A-EPD/A) process in a single-stage reactor \- PubMed, 访问时间为 十一月 15, 2025， [https://pubmed.ncbi.nlm.nih.gov/34303093/](https://pubmed.ncbi.nlm.nih.gov/34303093/)  
10. Advanced N removal from low C/N sewage via a plug-flow anaerobic/oxic/anoxic (AOA) process: Intensification through partial nitrification, endogenous denitrification, partial denitrification, and anammox (PNEnD/A) \- PubMed, 访问时间为 十一月 15, 2025， [https://pubmed.ncbi.nlm.nih.gov/39303577](https://pubmed.ncbi.nlm.nih.gov/39303577)  
11. BJUT Publishes its First Article in Nature Sustainability as the Sole Contributing Institution, 访问时间为 十一月 15, 2025， [https://english.bjut.edu.cn/info/1033/7209.htm](https://english.bjut.edu.cn/info/1033/7209.htm)  
12. Mainstream short-cut N removal modelling: current status and ..., 访问时间为 十一月 15, 2025， [https://iwaponline.com/wst/article/85/9/2539/88293/Mainstream-short-cut-N-removal-modelling-current](https://iwaponline.com/wst/article/85/9/2539/88293/Mainstream-short-cut-N-removal-modelling-current)  
13. Wastewater Treatment System Optimization for Sustainable Operation of the SHARON–Anammox Process under Varying Carbon/Nitrogen Loadings \- MDPI, 访问时间为 十一月 15, 2025， [https://www.mdpi.com/2073-4441/15/22/4015](https://www.mdpi.com/2073-4441/15/22/4015)  
14. Full-scale simultaneous partial nitrification, anammox, and denitrification for the efficient treatment of carbon and nitrogen in low-C/N wastewater \- NIH, 访问时间为 十一月 15, 2025， [https://pmc.ncbi.nlm.nih.gov/articles/PMC11665303/](https://pmc.ncbi.nlm.nih.gov/articles/PMC11665303/)  
15. Achieving rapid endogenous partial denitrification by regulating competition and cooperation between glycogen accumulating organisms and phosphorus accumulating organisms from conventional activated sludge \- PubMed, 访问时间为 十一月 15, 2025， [https://pubmed.ncbi.nlm.nih.gov/37993071/](https://pubmed.ncbi.nlm.nih.gov/37993071/)  
16. Achieving advanced nitrogen removal from low C/N wastewater by combining endogenous partial denitrification with anammox in mainstream treatment \- PubMed, 访问时间为 十一月 15, 2025， [https://pubmed.ncbi.nlm.nih.gov/30261484/](https://pubmed.ncbi.nlm.nih.gov/30261484/)  
17. A novel partial nitrification-synchronous anammox and endogenous partial denitrification (PN-SAEPD) process for advanced nitrogen removal from municipal wastewater at ambient temperatures \- PubMed, 访问时间为 十一月 15, 2025， [https://pubmed.ncbi.nlm.nih.gov/32172056/](https://pubmed.ncbi.nlm.nih.gov/32172056/)  
18. Advanced N removal from low C/N sewage via a plug-flow ..., 访问时间为 十一月 15, 2025， [https://www.researchgate.net/publication/384044394\_Advanced\_N\_removal\_from\_low\_CN\_sewage\_via\_a\_plug-flow\_anaerobicoxicanoxic\_AOA\_process\_Intensification\_through\_partial\_nitrification\_endogenous\_denitrification\_partial\_denitrification\_and\_anammox\_PNEnD](https://www.researchgate.net/publication/384044394_Advanced_N_removal_from_low_CN_sewage_via_a_plug-flow_anaerobicoxicanoxic_AOA_process_Intensification_through_partial_nitrification_endogenous_denitrification_partial_denitrification_and_anammox_PNEnD)  
19. Advanced nitrogen removal from low carbon nitrogen ratio domestic sewage via continuous plug-flow anaerobic/oxic/anoxic system: Enhanced by endogenous denitrification | Request PDF \- ResearchGate, 访问时间为 十一月 15, 2025， [https://www.researchgate.net/publication/369633516\_Advanced\_nitrogen\_removal\_from\_low\_carbon\_nitrogen\_ratio\_domestic\_sewage\_via\_continuous\_plug-flow\_anaerobicoxicanoxic\_system\_Enhanced\_by\_endogenous\_denitrification](https://www.researchgate.net/publication/369633516_Advanced_nitrogen_removal_from_low_carbon_nitrogen_ratio_domestic_sewage_via_continuous_plug-flow_anaerobicoxicanoxic_system_Enhanced_by_endogenous_denitrification)  
20. Emerging investigator series: Modeling of Wastewater Treatment Bioprocesses: Current Development and Future Opportunities \- RSC Publishing, 访问时间为 十一月 15, 2025， [https://pubs.rsc.org/en/content/getauthorversionpdf/d1ew00739d](https://pubs.rsc.org/en/content/getauthorversionpdf/d1ew00739d)  
21. (PDF) A modified Activated Sludge Model No. 3 (ASM3) with two ..., 访问时间为 十一月 15, 2025， [https://www.researchgate.net/publication/220274931\_A\_modified\_Activated\_Sludge\_Model\_No\_3\_ASM3\_with\_two-step\_nitrification-denitrification](https://www.researchgate.net/publication/220274931_A_modified_Activated_Sludge_Model_No_3_ASM3_with_two-step_nitrification-denitrification)  
22. Twenty-five years of ASM1: past, present and future of wastewater treatment modelling, 访问时间为 十一月 15, 2025， [https://iwaponline.com/jh/article/17/5/697/3499/Twenty-five-years-of-ASM1-past-present-and-future](https://iwaponline.com/jh/article/17/5/697/3499/Twenty-five-years-of-ASM1-past-present-and-future)  
23. Maximizing the efficiency of single‐stage partial nitrification ... \- NIH, 访问时间为 十一月 15, 2025， [https://pmc.ncbi.nlm.nih.gov/articles/PMC11928780/](https://pmc.ncbi.nlm.nih.gov/articles/PMC11928780/)  
24. Maximizing the efficiency of single-stage partial nitrification/Anammox granule processes and balancing microbial competition using insights of a numerical model study \- ResearchGate, 访问时间为 十一月 15, 2025， [https://www.researchgate.net/publication/390099210\_Maximizing\_the\_efficiency\_of\_single-stage\_partial\_nitrificationAnammox\_granule\_processes\_and\_balancing\_microbial\_competition\_using\_insights\_of\_a\_numerical\_model\_study](https://www.researchgate.net/publication/390099210_Maximizing_the_efficiency_of_single-stage_partial_nitrificationAnammox_granule_processes_and_balancing_microbial_competition_using_insights_of_a_numerical_model_study)  
25. Development of simultaneous partial nitrification, anammox and denitrification (SNAD) process in a sequential batch reactor | Request PDF \- ResearchGate, 访问时间为 十一月 15, 2025， [https://www.researchgate.net/publication/49650293\_Development\_of\_simultaneous\_partial\_nitrification\_anammox\_and\_denitrification\_SNAD\_process\_in\_a\_sequential\_batch\_reactor](https://www.researchgate.net/publication/49650293_Development_of_simultaneous_partial_nitrification_anammox_and_denitrification_SNAD_process_in_a_sequential_batch_reactor)  
26. Optimization of an HRT-Fixed Plug-Flow Anaerobic-Oxic-Anoxic (AOA) Reactor \- MDPI, 访问时间为 十一月 15, 2025， [https://www.mdpi.com/2073-4441/17/5/714](https://www.mdpi.com/2073-4441/17/5/714)  
27. Hydraulic retention time optimization achieved unexpectedly high nitrogen removal rate in pilot-scale anaerobic/aerobic/anoxic system for low-strength municipal wastewater treatment | Request PDF \- ResearchGate, 访问时间为 十一月 15, 2025， [https://www.researchgate.net/publication/376055014\_Hydraulic\_retention\_time\_optimization\_achieved\_unexpectedly\_high\_nitrogen\_removal\_rate\_in\_pilot-scale\_anaerobicaerobicanoxic\_system\_for\_low-strength\_municipal\_wastewater\_treatment](https://www.researchgate.net/publication/376055014_Hydraulic_retention_time_optimization_achieved_unexpectedly_high_nitrogen_removal_rate_in_pilot-scale_anaerobicaerobicanoxic_system_for_low-strength_municipal_wastewater_treatment)  
28. Toward Energy Neutrality: Novel Wastewater Treatment Incorporating Acidophilic Ammonia Oxidation | Environmental Science & Technology \- ACS Publications, 访问时间为 十一月 15, 2025， [https://pubs.acs.org/doi/10.1021/acs.est.2c06444](https://pubs.acs.org/doi/10.1021/acs.est.2c06444)  
29. Simultaneous partial Nitritation, Anammox and Denitrification (SNAD) process for treating ammonium-rich wastewaters \- iris@unitn, 访问时间为 十一月 15, 2025， [https://iris.unitn.it/retrieve/a2d6c1b0-e1b1-49b5-8be1-23a847c41c1e/PhD\_Thesis\_Michela\_Langone.pdf](https://iris.unitn.it/retrieve/a2d6c1b0-e1b1-49b5-8be1-23a847c41c1e/PhD_Thesis_Michela_Langone.pdf)