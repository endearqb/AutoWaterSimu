

# **连续深度革命：Transformer架构与神经普通微分方程的综合分析**

## **第一部分：序列建模的基础范式**

为了充分理解Transformer ODE（常微分方程）的创新之处及其理论动机，必须首先解构其两个基础支柱：标准的Transformer架构和神经普通微分方程（Neural ODEs）。前者通过注意力机制重新定义了序列数据中的关系建模，而后者则将深度学习从离散分层过程重新构建为连续时间动态系统。这两者的融合，催生了一种新的模型类别，它不仅继承了父辈的优点，也带来了独特的挑战和机遇。

### **第1节 Transformer架构：关系归纳偏置的典范**

Transformer架构的问世是序列处理领域的一个分水岭，它彻底摒弃了循环神经网络（RNN）的序列化处理模式，转而完全依赖于注意力机制，从而实现了大规模并行化，并在自然语言处理（NLP）等领域取得了前所未有的成功 1。

#### **1.1 注意力机制：从序列到序列到自注意力**

序列建模的早期模型，如循环神经网络（RNN），通过其固有的序列化结构来处理数据，即一次处理一个元素 2。这种设计虽然直观，但存在两个根本性缺陷：信息瓶颈和梯度消失。在处理长序列时，信息必须通过一系列连续的隐藏状态进行传递，导致早期信息在后续步骤中逐渐稀释或丢失 3。此外，梯度在通过长序列反向传播时容易变得过小（梯度消失）或过大（梯度爆炸），极大地限制了模型捕捉长期依赖关系的能力 4。

注意力机制最初是为了缓解序列到序列模型中的信息瓶颈而提出的，它允许模型在生成输出的每一步都有选择地“关注”输入序列的不同部分 3。然而，2017年的论文《Attention Is All You Need》提出了一种更为激进的思想：完全用注意力机制取代循环结构 1。这一思想的核心是

**自注意力**（self-attention），有时也称为内部注意力（intra-attention）。在自注意力机制中，一个序列的每个元素都会与同一序列中的所有其他元素计算注意力权重，从而为自身生成一个上下文感知的表示 1。这种机制使得模型能够直接捕捉序列内任意两个位置之间的依赖关系，而不受它们之间距离的影响，从而有效地建立了全局依赖模型 1。

自注意力的核心可以通过\*\*查询（Query）、键（Key）和值（Value）\*\*的抽象来理解 3。对于输入序列中的每个元素（或其向量嵌入），模型会通过三个独立的可学习权重矩阵将其投影成三个不同的向量：

* **查询向量 (Q)**：代表当前元素正在“寻找”什么样的信息 6。  
* **键向量 (K)**：代表当前元素“包含”什么样的信息，用于响应其他元素的查询 6。  
* **值向量 (V)**：代表当前元素实际携带的内容，是最终用于构建输出表示的构件 3。

注意力权重的计算过程是，将一个元素的查询向量与序列中所有元素的键向量进行比较，以衡量它们的兼容性。在Transformer中，这种兼容性通常通过缩放点积（scaled dot-product）来计算 1。具体来说，查询矩阵

Q和键矩阵K的点积决定了注意力得分，然后通过一个缩放因子（通常是键向量维度的平方根，dk​）来调节，以防止梯度过小。最后，将这些得分通过一个softmax函数进行归一化，得到一组权重，这些权重表示每个元素对当前元素的重要性。最终，该元素的上下文感知表示是所有元素的值向量根据这些注意力权重进行的加权和 1。其数学形式可以表示为：

Attention(Q,K,V)=softmax(dk​​QKT​)V

#### **1.2 解构Transformer块：多头注意力与逐点前馈网络**

标准的Transformer模型由多个相同的“块”（block）堆叠而成，每个块都包含两个核心子层：多头自注意力机制和逐点前馈网络 1。

**多头注意力（Multi-Head Attention）** 是对基础自注意力机制的扩展。它并非执行单一的注意力计算，而是将查询、键和值向量线性投影到多个较低维度的子空间中，并在每个子空间中并行地执行注意力计算 3。这种设计允许模型在不同的表示子空间中共同关注来自不同位置的信息，从而使每个“头”（head）能够学习到不同类型的依赖关系，例如句法关系、语义关联等 1。在计算完成后，各个头的输出被拼接在一起，再通过一次线性投影恢复到原始维度，形成最终的多头注意力输出。

**逐点前馈网络（Position-wise Feed-Forward Network, FFN）** 是每个Transformer块中的第二个关键组件。它是一个全连接的前馈网络，独立地应用于序列中的每一个位置（即每个元素的表示向量） 3。通常，这个网络由两个线性层和一个非线性激活函数（如ReLU或GELU）组成 4。如果说注意力机制负责在不同元素之间路由和聚合信息，那么FFN则负责对每个元素自身的表示进行更深层次的非线性变换和特征提取 9。这种结构为模型提供了必要的表示能力，使其能够学习更复杂的函数。

**残差连接与层归一化（Residual Connections and Layer Normalization）** 是将这些组件有效粘合在一起的关键。在每个子层（即多头注意力和FFN）的周围，都使用了一个残差连接 1。这意味着子层的输入会直接加到其输出上。这种设计借鉴自计算机视觉领域的残差网络（ResNet），它极大地缓解了梯度消失问题，使得训练非常深（例如，数十甚至上百层）的Transformer模型成为可能 10。在每个残差连接之后，都会进行一次层归一化（Layer Normalization），它通过对每个样本的特征进行归一化来稳定训练过程，加速收敛 1。

#### **1.3 编码器-解码器框架及其变体**

最初的Transformer模型是为机器翻译任务设计的，采用了\*\*编码器-解码器（Encoder-Decoder）\*\*架构 1。

* **编码器（Encoder）** 由一堆相同的层组成，负责处理输入序列（例如，源语言句子），并将其转换为一系列富含上下文信息的连续表示。  
* **解码器（Decoder）** 也由一堆类似的层组成，但其结构略有不同。它以自回归的方式（一次生成一个词）生成输出序列（例如，目标语言句子）。在生成每个词时，解码器不仅会通过\*\*掩码自注意力（masked self-attention）**关注已经生成的部分，还会通过一个额外的**编码器-解码器注意力（encoder-decoder attention）\*\*层来关注编码器的完整输出，从而将源序列的信息融入到生成过程中 3。

随着时间的推移，这种基础架构演化出了多种变体，以适应不同的任务需求。例如，**编码器-only模型**（如BERT）通过双向上下文理解见长，非常适合于文本分类、命名实体识别等自然语言理解（NLU）任务 4。而

**解码器-only模型**（如GPT系列）则专注于自回归生成，在文本生成、摘要和对话系统等自然语言生成（NLG）任务中表现出色 4。

#### **1.4 内在属性与局限性：二次复杂度与数据需求**

尽管Transformer取得了巨大成功，但其架构也存在固有的局限性。最主要的瓶颈在于自注意力机制的计算和内存**复杂度**。由于需要计算序列中每对元素之间的注意力得分，其计算量和内存需求都与序列长度n成**二次方关系**（即O(n2)） 8。这使得处理非常长的序列（例如，长文档、高分辨率图像或音频）变得极其昂贵，甚至在计算上不可行。

此外，Transformer模型通常是**数据饥渴**的。为了学习到有效的表示，它们需要在大规模数据集上进行预训练 13。模型的

**可解释性**也一直是一个挑战；拥有数亿甚至数万亿参数的Transformer模型通常被视为“黑箱”，很难精确理解其做出特定决策的原因 13。最后，由于模型主要从数据中学习统计模式，它们可能缺乏常识推理能力，并且容易学习并放大训练数据中存在的偏见 13。

这些局限性，特别是二次方的计算复杂度，直接催生了对更高效序列模型架构的研究，其中就包括Transformer ODE和S4等。模型的成功并非仅仅源于注意力机制本身，而是其所有组件之间协同作用的结果。并行化的自注意力提供了全局上下文，逐点FFN提供了特征变换能力，而残差连接则使得深度堆叠成为可能。正是这种巧妙的工程组合，造就了一个功能强大且可扩展的架构。

### **第2节 神经普通微分方程：连续深度视角**

神经普通微分方程（Neural Ordinary Differential Equations, NODEs）为深度学习提供了一种全新的视角，它将传统的、由离散层构成的神经网络重新诠释为一个在连续深度或时间上演化的动态系统。这一概念的提出，为模型设计和分析带来了根本性的变革。

#### **2.1 从残差网络到连续变换**

NODE的核心思想源于对\*\*残差网络（ResNet）的深刻洞察。ResNet的一个基本块的更新规则可以写为：

ht+1​=ht​+f(ht​,θt​)

其中，ht​是第t层的隐藏状态，f是该层的变换函数（例如，一个卷积块），θt​是其参数 16。研究人员敏锐地发现，这个离散的更新步骤在形式上与求解常微分方程（ODE）的  
前向欧拉法（Forward Euler method）\*\*完全一致 10。欧拉法是用离散步长$\\Delta t

来近似一个连续动态系统的演化，其形式为y(t+\\Delta t) \\approx y(t) \+ \\Delta t \\cdot g(y(t), t)。如果我们将ResNet中的层索引t视为时间，并将f视为动态函数g$，那么ResNet的每一层都可以被看作是使用单位步长$\\Delta t=1$对某个潜在的连续系统进行的一次欧拉离散化 10。

将这一类比推向极致，我们便得到了Neural ODE的概念。与其设计一个具有离散层数的网络，不如直接定义一个描述隐藏状态$h(t)$如何随连续变量$t$（可以解释为“深度”或“时间”）变化的**常微分方程** 17。这个ODE由一个神经网络

f来参数化，其形式如下：

dtdh(t)​=f(h(t),t,θ)

其中，θ是神经网络f的权重 16。在这个框架下，一个“网络”的输出不再是经过一系列离散层计算的结果，而是这个ODE  
**初值问题**的解。给定一个输入（即初始状态h(t0​)），模型的输出$h(t\_1)$是通过一个黑箱的数值ODE求解器（numerical ODE solver）从$t\_0$到t1​积分得到的 16。

#### **2.2 神经ODE的公式化：参数化动态**

从概念上讲，一个标准的神经网络学习的是一系列离散的映射函数，而一个Neural ODE学习的是一个**向量场**f 16。这个向量场定义了状态空间中每个点

$h(t)$的“流动”方向和速度，从而将输入状态$h(t\_0)$沿着一条连续的轨迹平滑地变换到输出状态$h(t\_1)$。这种连续的变换过程与物理世界中许多动态系统的演化方式更为接近。

这种方法与通用近似定理（Universal Approximation Theorem）有着深刻的联系。该定理指出，一个具有足够宽度的单隐藏层前馈网络可以以任意精度近似任何连续函数 19。类似地，通过参数化微分方程，Neural ODEs也能够学习和表示极其广泛的函数和动态系统，为建模复杂现象提供了强大的工具 20。

#### **2.3 伴随法：内存高效的反向传播**

传统深度学习模型的一个主要内存瓶颈在于反向传播过程。为了计算梯度，必须存储前向传播过程中的所有中间层的激活值，这导致内存消耗与网络深度成线性关系 16。对于非常深的网络，这可能会超出硬件的承受能力。

Neural ODEs通过采用伴随灵敏度方法（Adjoint Sensitivity Method）优雅地解决了这个问题 16。伴随法是一种计算梯度而不必存储前向传播路径的技术。它通过求解另一个在时间上反向积分的增广ODE来计算损失函数对参数的梯度。由于在反向求解过程中，原始ODE的轨迹可以根据需要重新计算，因此无需在前向传播时缓存任何中间状态。这使得Neural ODEs的梯度计算具有

常数级别的内存成本（相对于深度而言），是其最显著的优势之一，理论上允许模型拥有“无限”的深度 16。

#### **2.4 优势与劣势：自适应计算与求解器延迟**

Neural ODEs框架的引入带来了一系列独特的优势和挑战。

**优势**：

1. **内存效率**：如上所述，伴随法提供了常数内存成本的反向传播，极大地降低了训练深层模型的内存需求 16。  
2. **自适应计算**：现代ODE求解器是高度成熟的数值工具，它们可以根据问题的复杂性动态调整计算步长，以在保证预设误差容限的前提下完成积分 16。这意味着模型的计算成本可以自适应地伸缩：对于简单的输入，求解器可能会采取较大的步长快速求解；对于复杂的输入，则会采取更小的步长进行精细计算。  
3. **处理不规则数据**：连续时间的公式化使得Neural ODEs天然适合处理**不规则采样的时间序列数据** 16。在医疗记录、金融交易等领域，数据点之间的时间间隔往往是不均匀的。对于RNN或Transformer等离散模型，处理这类数据通常需要进行插值或分箱等可能引入偏差的预处理步骤。而NODE可以直接在任意时间点上对动态进行建模，提供了一种更为原则性的解决方案 18。

**劣势**：

1. **计算速度**：这是Neural ODEs最主要的实际障碍。为了达到指定的数值精度，ODE求解器通常需要对动态函数f进行多次评估，其总计算量往往远超一个具有固定层数的标准网络的前向传播 21。这导致NODE的训练和推理速度通常较慢。  
2. **数值稳定性与限制**：为了保证ODE的解是存在且唯一的，其动态函数f必须满足某些数学条件，例如**利普希茨连续性（Lipschitz continuity）** 21。这会对网络架构的设计施加限制，例如，某些类型的激活函数或注意力机制可能不满足这些条件，需要谨慎使用或进行修改 21。

总而言之，Neural ODEs代表了从**架构工程**（设计多少层？什么类型的层？）到**动态建模**（定义什么样的连续变换规则？）的根本性思维转变。它将深度学习与微分方程这一成熟的数学领域联系起来，为模型设计提供了新的语言和工具。然而，这种优雅的理论框架也带来了显著的计算开销，这成为其在更复杂模型（如Transformer ODE）中应用时必须面对的核心挑战。

## **第二部分：Transformer ODE的兴起**

将Transformer的强大关系建模能力与Neural ODE的连续深度框架相结合，催生了Transformer ODE这一新兴的研究领域。研究人员主要通过两种不同的哲学路径来实现这种融合：一种是将标准Transformer层视为ODE的离散化步骤并加以改进；另一种则是将Transformer的权重本身连续化，构建一个真正意义上的连续动态系统。

### **第3节 将Transformer概念化为动态系统**

本节探讨了构建Transformer ODE的两种核心思想，它们分别从数值精度和模型表达力的角度出发，对Transformer架构进行了重新诠释。

#### **3.1 将Transformer视为ODE的欧拉离散化**

第一种方法源于将现有深度学习架构与数值方法进行类比。以“ODE Transformer”这篇论文为代表的研究工作，将一个完整的Transformer块（包含自注意力和FFN）视为残差更新规则$y\_{t+1} \= y\_t \+ F(y\_t)$中的函数$F$ 10。在这种视角下，一个标准的

N层Transformer模型在数学上等价于使用前向欧拉法，以单位步长对某个潜在的常微分方程进行N步求解的过程 10。

然而，欧拉法是一种简单的一阶数值求解器，其固有的**截断误差**（truncation error）较大 10。在深度模型中，每一层（即每一步积分）的误差会不断累积，可能导致数值不稳定性，并限制了模型从增加深度中获益的能力 10。这或许可以解释为什么简单地堆叠更多的Transformer层并不总能带来性能的持续提升。

#### **3.2 ODE Transformer：使用高阶求解器提升数值精度**

为了解决欧拉法精度不足的问题，这条研究路线提出，可以用更高级的数值ODE求解器来替代简单的残差结构，其中最典型的是**龙格-库塔方法（Runge-Kutta methods）** 10。

龙格-库塔方法通过在一个积分步长内计算多个中间点的斜率（即多次评估动态函数F），然后对这些斜率进行加权平均，来获得一个更高阶、更精确的近似解 10。例如，一个经典的四阶龙格-库塔（RK4）块，在计算

$y\_{t+1}$时需要对Transformer函数$F$进行四次评估 10。这种“RK块”取代了原有的Transformer块，形成了一个更复杂的、但数值上更精确的层。

这种方法的主要优势在于：

* **减少近似误差**：高阶求解器显著降低了每一步的截断误差，使得模型的演化轨迹更接近真实的ODE解，从而提升了模型的稳定性和性能 10。  
* **参数效率**：在单个RK块内部的多次函数评估中，可以共享同一组模型参数$\\theta\_t$，这在一定程度上提高了参数的利用效率 10。

#### **3.3 非自治框架：用于连续演化的时变权重**

与致力于改进求解器的第一种方法不同，第二种方法从根本上改变了动态系统本身。以Tong等人提出的模型为代表，这种方法不再假设模型权重在所有层之间是共享或独立的，而是将Transformer的注意力机制和FFN的**所有权重**都建模为**层深度索引t的连续函数** 15。

这种设计产生了一个**非自治ODE（non-autonomous ODE）**，其形式为dh(t)/dt=f(h(t),t,θ)，其中向量场f不仅依赖于当前状态h(t)，还显式地依赖于“时间”t 15。在实践中，这意味着模型的权重（例如，查询、键、值的投影矩阵）不再是固定的参数矩阵，而是由一个小型\*\*超网络（hyper-network）\*\*在运行时生成。这个超网络以连续的深度值

t作为输入，输出对应深度t处的权重 25。

这种方法的动机在于，早期的理论研究为了简化分析，常常采用权重共享（weight-sharing）的假设，即所有层的动态函数f都是相同的。然而，这一假设与实际中表现优异的大型Transformer模型的行为存在明显差异 15。强大的Transformer模型在不同深度层学习到的功能是高度分化的。非自治框架通过允许权重随深度连续变化，为模型提供了更大的表达能力，使其能够更自然地模拟这种分层的功能演化。

这两种构建Transformer ODE的思路存在着根本性的区别。第一种方法（龙格-库塔）本质上是对一个**离散模型进行数值优化**。它接受了“Transformer层是欧拉步骤”的设定，并试图通过更高阶的数值方法来“走得更好”。模型最终仍然由一系列离散的、但内部结构更复杂的块组成。第二种方法（非自治框架）则是要构建一个**真正的连续模型**。它彻底抛弃了离散的层索引，将深度视为一个实数变量，从而将模型的权重本身连续化。这种区别至关重要，因为它决定了模型的分析方式和应用潜力。非自治框架为使用动态系统理论的工具（如谱分析、李雅普诺夫指数）来分析模型的内部工作原理提供了可能，这正是其核心贡献之一 24。

### **第4节 架构创新与分析**

将Transformer与ODE框架融合，不仅催生了新的架构设计，更重要的是，它为我们提供了前所未有的工具来剖析这些复杂模型的内部动态。本节将深入探讨这些技术细节，以及它们所带来的分析和应用上的突破。

#### **4.1 连续自注意力：将点积扩展到连续域**

在像ContiFormer这样的模型中，研究人员将离散的点积自注意力机制扩展到了一个连续时间的领域 27。传统的Q、K、V是与每个离散词元（token）相关联的静态向量，而在连续自注意力中，它们被提升为

**连续的函数或轨迹** 27。

具体实现上，这些连续轨迹本身通常由它们自己的ODE来定义。例如，模型可以假设每个观测值的键（key）和值（value）函数都遵循一个简单的线性ODE进行演化。这样，任意两个时间点ti​和tj​之间的注意力得分就不再是一个简单的点积，而是通过对它们的查询函数和键函数在时间区间$\[t\_i, t\_j\]$上的点积进行**积分**来计算 27。这种设计使得模型能够捕捉到随时间连续演化的、依赖于输入的复杂关系，这对于处理具有不规则时间间隔的数据尤为重要。

#### **4.2 探测内部动态：谱分析与李雅普诺夫指数的洞见**

连续权重框架的最大优势之一是它允许我们借用动态系统理论中的成熟工具来分析模型的行为。

**QK/OV对的谱分析**：通过将权重参数化为深度t的函数，研究人员可以分析关键矩阵（如Q(t)K(t)T和O(t)V(t)）的**特征值谱**如何随深度连续演化。一项重要的发现是，这些矩阵的特征值幅度通常随着深度的增加而增大，并在靠近输出层时达到峰值 24。这表明，随着信息在网络中逐层传递，词元之间的相互作用变得越来越强烈和明确，注意力权重也趋向于更“尖锐” 30。这一经验观察结果直接挑战了早期基于权重共享假设的理论，那些理论曾预测模型在无限深度时会收敛到少数几个不动点或聚类，而这在实际的自回归语言模型中并未被观察到 15。

**用李雅普诺夫指数进行敏感度分析**：李雅普诺夫指数是衡量动态系统对初始条件敏感度的经典指标，即“蝴蝶效应”的量化。在Transformer ODE中，它被用来评估模型对输入词元微小扰动的敏感性 24。通过追踪一个微小扰动（切向量）如何通过连续的系统演化，研究人员可以量化输入序列中一个词元的变化对输出序列中另一个词元表示的影响 30。这种方法比简单地可视化注意力权重更为严谨和深刻，因为后者有时会产生误导 26。然而，这种分析面临着巨大的计算挑战：对于一个典型的Transformer模型，其状态空间的维度极高（例如，序列长度1000，嵌入维度768，状态维度为768,000），直接计算雅可比矩阵的谱几乎是不可行的，因此目前的分析往往局限于模型的特定部分或较小的模型 26。

#### **4.3 自适应微调：利用连续深度实现架构灵活性**

连续权重Transformer ODE最令人兴奋的应用之一是它为模型微调和部署提供了全新的范式，即**自适应微调（adaptive fine-tuning）** 24。

传统的迁移学习流程是预训练多个具有不同离散层数（例如，small, base, large）的模型，然后根据下游任务的需求选择一个进行微调。而一个预训练好的连续Transformer ODE模型，可以被看作是一个“主模型” 31。通过选择不同的ODE求解器评估时间点（即离散化步数和位置），可以从这个单一的连续模型中

**实例化出任意深度的离散Transformer模型** 15。

这意味着，一个在18个有效层上预训练的连续模型，可以通过简单地调整求解器的参数，被微调为一个9层、12层、18层甚至24层的模型 24。这种前所未有的灵活性，使得从业者能够用一个预训练产物来适应不同的下游任务和计算预算，而无需从头训练多个独立的模型 32。例如，对于计算资源受限的设备，可以选择较少的层数；对于需要更高性能的任务，则可以选择更多的层数。这为模型即服务（Model-as-a-Service）和高效的模型生命周期管理开辟了新的可能性。

从连续框架中获得的这些能力，表明Transformer ODE不仅仅是一种数学上的重新表述。它将模型从一个静态的、固定的计算图转变为一个动态的、可塑的系统，从而解锁了全新的分析、解释和部署模型的方法。特别是自适应微调的概念，可能对未来的机器学习运维（MLOps）产生深远影响，因为它提出了一种更优雅、更高效的模型缩放和定制化方案。

## **第三部分：应用与比较分析**

本部分将理论讨论与实际应用相结合，重点探讨Transformer ODE在时间序列分析中的优势，并将其置于更广泛的先进序列模型领域中进行比较，以明确其独特的定位和价值。

### **第5节 掌握连续与不规则时间：用于时间序列的Transformer ODE**

时间序列分析是Transformer ODE展现出最明显优势的核心应用领域。现实世界中的许多时间序列数据，本质上是连续且不规则的，这为标准深度学习模型带来了巨大挑战。

#### **5.1 不规则采样数据对标准架构的挑战**

在医疗保健（如电子健康记录）、金融（如高频交易）和工业物联网等领域，数据通常是在**不规则的时间间隔**内采集的 33。例如，病人的检查不是每天定时进行，股票交易的发生时间也非均匀分布。标准的序列模型，如RNN和Transformer，其设计初衷是处理具有固定时间步长的离散序列 36。当面对不规则数据时，它们通常需要进行预处理，例如：

* **分箱（Binning）**：将时间轴划分为固定的时间窗口，并对每个窗口内的数据进行聚合。这种方法会丢失时间戳的精确信息，并可能因窗口大小的选择而引入偏差 27。  
* **插值（Imputation）**：在缺失的时间点上估算数据值。然而，插值方法本身可能引入错误，且数据的“缺失”本身也可能是一种有用的信息，在插值过程中被丢弃了 34。

这些预处理步骤往往是次优的，可能会破坏数据的内在动态性 34。相比之下，像Neural ODEs这样的连续时间模型，由于其数学构造，能够自然地处理在任意时间点出现的观测值，无需进行强制的离散化 16。

#### **5.2 案例研究：用于连续时间建模的ContiFormer架构**

**ContiFormer**是一个专门为不规则时间序列设计的Transformer ODE模型，它旨在结合Transformer的强大关系建模能力和Neural ODE的连续时间处理能力 27。

其核心架构创新在于\*\*连续时间多头注意力（Continuous-Time Multi-Head Attention, CT-MHA）\*\*模块 28。ContiFormer将离散的查询、键、值向量推广为连续的时间函数或轨迹。具体来说，它使用一个ODE来定义每个观测值的潜在轨迹如何随时间演化 29。然后，通过在两个时间点之间对查询和键函数的内积进行积分，来计算它们之间的注意力得分。这使得模型能够捕捉到观测点之间不断演化的、依赖于输入的关系，从而打破了传统Transformer的离散特性 27。

ContiFormer的框架被证明具有很高的表达能力，通过精心设计其函数假设，可以将许多其他为不规则时间序列设计的特殊Transformer变体视为其特例 27。

#### **5.3 性能基准：插值、外推与预测**

在各种合成数据集和真实世界数据集上的实验表明，ContiFormer及类似的Transformer ODE方法在处理不规则时间序列的任务上，其性能优于传统方法和标准的Neural ODEs 27。这些任务包括：

* **插值（Interpolation）**：在已知观测点之间预测数值。  
* **外推（Extrapolation）**：预测超出已知观测范围的未来数值。  
* **分类（Classification）**：根据不规则的时间序列对其进行分类。

实验结果显示，虽然标准的Neural ODEs能够建模连续动态，但它们往往难以捕捉序列内部复杂的、长期的相关性 27。ContiFormer之所以表现更佳，是因为它成功地将Transformer强大的注意力机制（用于建模关系）与ODE的连续时间处理能力（用于处理不规则性）结合在了一起 27。它既能生成平滑的连续函数近似，又能有效保留长期信息，避免了标准NODE在外推任务中容易出现的累积误差问题 27。

这表明，Transformer ODE并非仅仅是标准Transformer的一个理论上的替代品，而是一个由问题驱动的、针对一类重要且具有挑战性的数据（即不规则时间序列）的有效解决方案。它体现了一个重要的模型设计原则：将适合数据结构（连续时间）的归纳偏置与满足任务需求（关系建模）的机制相结合。

### **第6节 先进序列模型的比较分析**

为了全面评估Transformer ODE的地位，本节将其与主要的架构亲缘体和竞争对手进行直接比较，包括标准Transformer、基础Neural ODE以及为长程依赖而生的结构化状态空间模型（S4）。

#### **6.1 Transformer ODE vs. 标准Transformer**

* **架构**：最根本的区别在于深度的表示。标准Transformer由离散的、固定的层堆叠而成，而Transformer ODE则将深度视为一个连续变量 24。在非自治框架下，这意味着标准Transformer的权重是固定的，而Transformer ODE的权重可以随深度连续变化 26。  
* **优势（Transformer ODE）**：  
  * **原则性地处理不规则时间**：这是其最明确的优势，如前一节所述。  
  * **自适应计算与微调**：提供了根据任务需求调整模型有效深度的灵活性 24。  
  * **增强的可解释性**：连续动态框架允许使用谱分析和李雅普诺夫指数等工具进行深入分析 24。  
* **局限性（Transformer ODE）**：  
  * **计算成本高昂**：ODE求解器的多次函数评估导致其训练和推理速度远慢于标准Transformer的前向传播 21。  
  * **复杂性增加**：引入了新的超参数，如求解器类型和误差容限，需要仔细调整 21。

#### **6.2 Transformer ODE vs. 神经ODE**

* **架构**：两者都使用ODE框架，但其核心区别在于定义动态的函数f。一个标准的Neural ODE通常使用一个通用的多层感知机（MLP）或卷积网络（CNN）作为其动态函数 21。而一个Transformer ODE则使用一个完整的、结构化的Transformer块（包含自注意力和FFN）作为其动态函数。  
* **优势（Transformer ODE）**：  
  * **更强的归纳偏置**：自注意力机制为建模关系型数据提供了比通用MLP强得多的归纳偏置。这使得Transformer ODE能够捕捉到简单NODE难以学习的复杂、长程依赖关系 27。  
* **局限性（Transformer ODE）**：  
  * **计算成本加剧**：Transformer块比一个简单的MLP在计算上要昂贵得多，这进一步加剧了ODE求解器的速度问题。  
  * **理论限制**：如前所述，某些复杂的注意力机制可能不满足ODE良定性所需的利普希茨连续性条件，需要特别设计 21。

#### **6.3 结构化状态空间模型（S4）：长程依赖的主要竞争者**

\*\*结构化状态空间模型（Structured State Space models, S4）\*\*是近年来崛起的一种强大的序列模型，其灵感源自经典的控制理论和动态系统 14。S4模型基于一个连续时间的线性状态空间模型，其数学形式如下：

x′(t)=Ax(t)+Bu(t)y(t)=Cx(t)+Du(t)  
其中，$x(t)$是潜在状态，$u(t)$是输入，$y(t)$是输出，A,B,C,D是可学习的参数矩阵 42。S4的巧妙之处在于，这个连续时间模型可以被精确地离散化，并能以两种等价但计算特性截然不同的方式进行计算：

1. **卷积模式**：整个输出序列可以作为输入序列与一个固定卷积核的卷积来并行计算，这使得训练过程非常高效 42。  
2. **循环模式**：模型可以像一个RNN一样，以自回归的方式进行计算，这使得推理（尤其是生成任务）非常快速 42。

S4的核心优势在于其处理长序列的**效率和性能**。其计算复杂度与序列长度N近似成**线性对数关系**（O(NlogN)），远优于Transformer的二次方复杂度 43。在专门为测试长程依赖而设计的基准测试（如Long Range Arena, LRA）上，S4及其变体通常表现出超越标准Transformer的性能 43。

#### **6.4 性能、复杂度与归纳偏置：正面比较**

| 特性 | 标准Transformer | 神经ODE (MLP-based) | Transformer ODE (非自治) | S4 / Mamba |
| :---- | :---- | :---- | :---- | :---- |
| **主要归纳偏置** | 关系建模 (所有对所有) | 连续动态 (平滑演化) | 关系建模 \+ 连续动态 | 连续信号 \+ 长期记忆 |
| **训练复杂度** | O(L2⋅D) | 慢 (求解器评估次数 × MLP成本) | 非常慢 (求解器评估次数 × Transformer块成本) | O(L⋅DlogL) (卷积模式) |
| **推理复杂度** | O(L2⋅D) | 慢 | 非常慢 | O(L⋅D) (循环模式) |
| **内存复杂度** | O(L2+L⋅D) | O(D) (伴随法) | O(D) (伴随法) | O(L⋅D) (卷积模式) |
| **长程依赖性能** | 中等 (受限于二次复杂度) | 弱 (缺乏结构化交互) | 中等 (受限于计算成本) | 强 (设计核心优势) |
| **不规则数据处理** | 弱 (需预处理) | 强 (天然支持) | 非常强 (结合注意力的优势) | 中等 (可调整步长，但非核心设计) |

*注：L为序列长度，D为模型维度。复杂度为近似值，忽略了常数项和具体实现细节。*

**分析总结**：

* **长程依赖**：在专门的长程依赖基准测试上，S4模型通常占据优势 44。然而，一些研究指出，当标准Transformer获得适当的预训练后，其与S4之间的性能差距会显著缩小，表明预训练数据和方法的选择对模型能力有巨大影响 46。  
* **计算效率**：对于长序列，S4在训练和推理效率上都远超Transformer和Transformer ODE 14。Transformer ODE由于其数值求解器的开销，通常是这几类模型中最慢的 21。  
* **归纳偏置与任务匹配**：  
  * 标准Transformer的**关系偏置**使其在需要密集、全局交互的任务（如语言建模）中表现出色。  
  * S4的**连续信号和记忆偏置**（源于其HiPPO矩阵初始化）使其在处理音频、传感器数据等具有连续特性的长序列时具有优势 42。  
  * Transformer ODE则融合了**关系偏置和连续时间偏置**，使其成为处理不规则时间序列等需要同时捕捉复杂交互和连续动态的任务的理想选择。

先进序列模型领域并未趋同于单一的最佳架构。相反，我们正目睹一场模型的“寒武纪大爆发”，其中Transformer、Transformer ODE、S4及其后继者（如Mamba）等模型，揭示了在计算复杂度、数据模态和任务需求之间存在一个根本性的权衡空间。不存在一个“万能”的解决方案，最佳模型的选择越来越依赖于具体问题的特性。

## **第四部分：挑战与未来展望**

尽管Transformer ODE在理论上极具吸引力，并在特定应用中展示了巨大潜力，但其广泛应用仍面临着严峻的挑战。本部分将对其局限性进行批判性评估，并展望连续时间序列建模的未来发展方向。

### **第7节 批判性评估：局限性与开放性问题**

本节将坦诚地探讨阻碍Transformer ODE更广泛采纳的实际障碍，这些障碍主要集中在计算成本、理论约束和分析的可行性上。

#### **7.1 计算负担：数值ODE求解器的成本与稳定性**

* **速度瓶颈**：最主要也是最显著的限制是**速度**。与标准神经网络的固定前向传播相比，数值ODE求解器为了满足精度要求，通常需要对动态函数进行大量评估，这导致训练和推理过程可能慢上几个数量级 21。这种高昂的计算成本使得使用Transformer ODE进行大规模预训练变得不切实际，严重限制了其在通用语言建模等领域的应用。  
* **数值稳定性**：ODE求解器的选择、步长控制和误差容限是至关重要的超参数，但它们的调整非常微妙。不当的设置可能导致数值不稳定，尤其是在学习到的动态系统表现出“刚性”（stiffness）时，即系统中存在变化速率差异极大的多个尺度 48。尽管自适应求解器能够调整步长，但这引入了一个复杂的  
  **精度与速度之间的权衡**，需要从业者仔细平衡 16。  
* **应用中的稳定性考量**：对数值稳定性的担忧是普遍存在的。例如，在安全多方计算（MPC）的背景下，有研究利用ODE的特性来设计更稳定的softmax近似协议，这从侧面反映了在复杂应用中保持数值稳定性的重要性和难度 49。

#### **7.2 理论约束与表示能力**

* **同胚限制**：标准的Neural ODEs只能学习**同胚**（homeomorphisms）函数，即连续且可逆的变换。这意味着它们无法表示那些会使拓扑结构发生改变的函数（例如，将两个分离的点合并为一个）。为了克服这一表示能力的限制，通常需要通过向状态空间中添加辅助维度来“增强”模型，但这无疑增加了模型的复杂性 21。  
* **对动态函数的约束**：为了保证ODE解的良定性（存在且唯一），其动态函数f必须满足特定的数学属性，如利普希茨连续性。这一要求可能会限制架构师的选择，特别是对于某些类型的注意力机制，它们可能不天然满足这些条件，需要进行修改或特别设计 21。  
* **处理非局部问题的能力**：研究表明，Transformer ODE的深度自适应性并不能从根本上解决那些需要高度非局部信息的问题，例如**奇偶校验问题（parity problem）**。对于这类问题，标准Transformer也需要足够多的层或头才能解决，这表明连续深度本身并不能替代架构固有的信息传播能力 50。

#### **7.3 动态分析中的高维挑战**

* **维度灾难**：虽然谱分析和李雅普诺夫指数等动态系统工具为模型分析提供了强大的理论框架，但它们的实际应用受到模型状态空间**高维度**的严重制约 26。对于一个处理1000个词元、嵌入维度为768的Transformer模型，其状态空间维度高达768,000。在这种尺度下，计算完整的雅可比矩阵及其谱是计算上不可行的 26。因此，目前大多数此类分析要么局限于非常小的模型，要么只分析模型的某个特定组件，其结论的普适性有待验证。

总的来说，Transformer ODE的理论优雅性和应用潜力，目前正被其严峻的实践和计算挑战所掩盖。这完美印证了“没有免费的午餐”定理：连续建模带来的好处，是以高昂的计算成本和复杂性为代价的。该领域最关键的开放性问题，不仅在于设计新的Transformer ODE架构，更在于开发更高效、更可扩展的**求解器和分析方法**，以使这些模型在实际大规模应用中变得可行。

### **第8节 连续时间序列建模的未来**

本节将超越当前的局限，展望该领域的演化路径，探讨Transformer ODE的未来研究方向以及更广泛的序列建模新范式。

#### **8.1 Transformer ODE的前景研究方向**

* **高效求解器与正则化**：开发专门针对神经网络动态的更快、更稳定的ODE求解器是至关重要的研究方向。这包括研究并行化求解技术（如并行时间求解器）51，以及通过正则化来引导模型学习“更容易求解”的动态函数，从而降低求解器开销 21。  
* **混合架构**：将不同模型的优点结合起来，构建**混合架构**，可能是在效率和表达能力之间取得更佳平衡的有效途径。例如，可以设想一个模型，其主干采用S4或Mamba等高效长程模型，而在特定层或任务头中嵌入Transformer ODE块，以处理不规则输入或进行精细的动态建模 52。  
* **扩展应用领域**：将Transformer ODE的应用从时间序列扩展到其他连续或动态领域，是一个充满机遇的方向。这包括视频处理（如CMSTR-ODE模型，用于连续事件检测和字幕生成）53、机器人学（用于学习自适应的运动控制）20，以及建模复杂的物理系统 51。  
* **深化理论理解**：通过ODE的视角，继续深入分析Transformer的内部工作机制，将为模型设计提供宝贵的指导。这包括进一步挑战权重共享等简化假设，以及利用动态系统理论来解释“归纳头”（induction heads）等复杂现象的涌现 24。

#### **8.2 超越Transformer与ODE：Mamba与扩散模型的崛起**

序列建模的未来并非仅由Transformer ODE书写。两条重要的并行发展路线正在重塑这一领域。

* **状态空间模型（如Mamba）**：S4的血统已经演化出了如**Mamba**这样的更先进模型 14。Mamba通过引入一种  
  **选择性机制**，使得状态转换矩阵能够依赖于输入，从而让模型能够根据上下文动态地决定是保留还是遗忘信息。这一创新使得Mamba在保持线性时间复杂度的同时，在语言建模等任务上达到了与Transformer相媲美的性能 14。这代表了一条在效率和性能上都极具竞争力的序列建模路径。  
* **基于扩散的语言模型**：一个新兴的范式是\*\*扩散模型（Diffusion Models）\*\*在文本生成领域的应用 54。与自回归模型一次生成一个词的方式不同，扩散模型以并行、非自回归的方式工作。它们首先生成一个完全由噪声或掩码构成的序列，然后通过一个迭代的“去噪”过程，逐步恢复出连贯的文本 54。这种方法在生成速度和可控性方面具有潜在优势，例如可以更容易地对生成文本的风格或主题进行全局调整 54。

#### **8.3 结论：迈向统一的序列建模理论**

从早期的循环模型到并行的Transformer，再到如今的连续时间和状态空间模型，序列建模领域经历了一场深刻的演化。这场演化的核心驱动力，始终是在几个关键维度之间寻求平衡的持续张力：

1. **表达能力**：如Transformer的全局注意力机制。  
2. **计算效率**：如S4/Mamba的线性扩展能力。  
3. **数据结构适应性**：如Transformer ODE对不规则连续数据的处理能力。

未来的序列建模领域不太可能由单一架构主宰，而是会走向一个**多样化、混合化和层次化**的生态系统 55。与其寻找一个“万能模型”，未来的趋势可能是构建由不同专业模块组成的复杂系统。例如，一个先进的机器人基础模型可能会在其架构中集成：

* 一个**基于ODE的输入层**，用于处理来自物理世界的连续、不规则的传感器数据。  
* 一个**基于S4/Mamba的主干**，用于高效地维持对环境的长期记忆。  
* 一个**基于Transformer的推理头**，用于进行复杂的关系推理和高层决策。

在这种背景下，Transformer ODE虽然可能因其计算成本而不会成为所有任务的最终选择，但它在序列建模的演化历程中扮演了至关重要的角色。它成功地将动态系统这一强大而优美的数学语言引入了深度学习领域，为模型分析、应用创新和架构设计开辟了新的道路，其思想和工具将持续影响下一代序列模型的构建。

#### **引用的著作**

1. Attention is All you Need \- NIPS, 访问时间为 八月 1, 2025， [https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf](https://papers.neurips.cc/paper/7181-attention-is-all-you-need.pdf)  
2. How Transformers Work: A Detailed Exploration of Transformer Architecture \- DataCamp, 访问时间为 八月 1, 2025， [https://www.datacamp.com/tutorial/how-transformers-work](https://www.datacamp.com/tutorial/how-transformers-work)  
3. From Theory to Code: Make Sense of Transformers in Machine Learning, 访问时间为 八月 1, 2025， [https://awadrahman.medium.com/from-theory-to-code-make-sense-of-transformers-in-machine-learning-51b8b23c34c5](https://awadrahman.medium.com/from-theory-to-code-make-sense-of-transformers-in-machine-learning-51b8b23c34c5)  
4. Transformer (deep learning architecture) \- Wikipedia, 访问时间为 八月 1, 2025， [https://en.wikipedia.org/wiki/Transformer\_(deep\_learning\_architecture)](https://en.wikipedia.org/wiki/Transformer_\(deep_learning_architecture\))  
5. \[draft\] Note 10: Self-Attention & Transformers 1, 访问时间为 八月 1, 2025， [https://web.stanford.edu/class/cs224n/readings/cs224n-self-attention-transformers-2023\_draft.pdf](https://web.stanford.edu/class/cs224n/readings/cs224n-self-attention-transformers-2023_draft.pdf)  
6. What is a Transformer Model? | IBM, 访问时间为 八月 1, 2025， [https://www.ibm.com/think/topics/transformer-model](https://www.ibm.com/think/topics/transformer-model)  
7. Transformers in Machine Learning \- GeeksforGeeks, 访问时间为 八月 1, 2025， [https://www.geeksforgeeks.org/machine-learning/getting-started-with-transformers/](https://www.geeksforgeeks.org/machine-learning/getting-started-with-transformers/)  
8. A Practical Survey on Faster and Lighter Transformers \- arXiv, 访问时间为 八月 1, 2025， [https://arxiv.org/pdf/2103.14636](https://arxiv.org/pdf/2103.14636)  
9. LLM Transformer Model Visually Explained \- Polo Club of Data Science, 访问时间为 八月 1, 2025， [https://poloclub.github.io/transformer-explainer/](https://poloclub.github.io/transformer-explainer/)  
10. ODE Transformer: An Ordinary Differential Equation-Inspired Model for Sequence Generation \- ACL Anthology, 访问时间为 八月 1, 2025， [https://aclanthology.org/2022.acl-long.571.pdf](https://aclanthology.org/2022.acl-long.571.pdf)  
11. What are Transformers in Artificial Intelligence? \- AWS, 访问时间为 八月 1, 2025， [https://aws.amazon.com/what-is/transformers-in-artificial-intelligence/](https://aws.amazon.com/what-is/transformers-in-artificial-intelligence/)  
12. \[Discussion\] In this age of LLMs, What are the limitations of Transformer architecture and downside to it? : r/MachineLearning \- Reddit, 访问时间为 八月 1, 2025， [https://www.reddit.com/r/MachineLearning/comments/18qh1hp/discussion\_in\_this\_age\_of\_llms\_what\_are\_the/](https://www.reddit.com/r/MachineLearning/comments/18qh1hp/discussion_in_this_age_of_llms_what_are_the/)  
13. Limitations of Transformer Architecture | by Thirupathi Thangavel \- Medium, 访问时间为 八月 1, 2025， [https://medium.com/@thirupathi.thangavel/limitations-of-transformer-architecture-4e6118cbf5a4](https://medium.com/@thirupathi.thangavel/limitations-of-transformer-architecture-4e6118cbf5a4)  
14. Beyond Transformers: Structured State Space Sequence Models, 访问时间为 八月 1, 2025， [https://cnichkawde.github.io/statespacesequencemodels.html](https://cnichkawde.github.io/statespacesequencemodels.html)  
15. Neural ODE Transformers: Analyzing Internal Dynamics and Adaptive Fine-tuning \- arXiv, 访问时间为 八月 1, 2025， [https://arxiv.org/html/2503.01329v1](https://arxiv.org/html/2503.01329v1)  
16. Neural Ordinary Differential Equations, 访问时间为 八月 1, 2025， [http://papers.neurips.cc/paper/7892-neural-ordinary-differential-equations.pdf](http://papers.neurips.cc/paper/7892-neural-ordinary-differential-equations.pdf)  
17. Neural differential equation \- Wikipedia, 访问时间为 八月 1, 2025， [https://en.wikipedia.org/wiki/Neural\_differential\_equation](https://en.wikipedia.org/wiki/Neural_differential_equation)  
18. Neural Ordinary Differential Equations (Neural ODEs): Rethinking Architecture \- Medium, 访问时间为 八月 1, 2025， [https://medium.com/@justygwen/neural-ordinary-differential-equations-neural-odes-rethinking-architecture-272a72100ebc](https://medium.com/@justygwen/neural-ordinary-differential-equations-neural-odes-rethinking-architecture-272a72100ebc)  
19. 15\. Solving Differential Equations with Deep Learning — Applied Data Analysis and Machine Learning, 访问时间为 八月 1, 2025， [https://compphysics.github.io/MachineLearning/doc/LectureNotes/\_build/html/chapter11.html](https://compphysics.github.io/MachineLearning/doc/LectureNotes/_build/html/chapter11.html)  
20. Machine learning with neural controlled differential equations \- Mathematical Institute, 访问时间为 八月 1, 2025， [https://www.maths.ox.ac.uk/node/38559](https://www.maths.ox.ac.uk/node/38559)  
21. Chapter 3: Neural Ordinary Differential Equations, 访问时间为 八月 1, 2025， [http://implicit-layers-tutorial.org/neural\_odes/](http://implicit-layers-tutorial.org/neural_odes/)  
22. \[2203.09176\] ODE Transformer: An Ordinary Differential Equation-Inspired Model for Sequence Generation \- arXiv, 访问时间为 八月 1, 2025， [https://arxiv.org/abs/2203.09176](https://arxiv.org/abs/2203.09176)  
23. \[2104.02308\] ODE Transformer: An Ordinary Differential Equation-Inspired Model for Neural Machine Translation \- arXiv, 访问时间为 八月 1, 2025， [https://arxiv.org/abs/2104.02308](https://arxiv.org/abs/2104.02308)  
24. Neural ODE Transformers: Analyzing Internal Dynamics and Adaptive Fine-tuning \- arXiv, 访问时间为 八月 1, 2025， [https://arxiv.org/abs/2503.01329](https://arxiv.org/abs/2503.01329)  
25. Neural ODE Transformers: Analyzing Internal Dynamics and ..., 访问时间为 八月 1, 2025， [https://openreview.net/forum?id=XnDyddPcBT](https://openreview.net/forum?id=XnDyddPcBT)  
26. Neural ODE Transformers: Analyzing Internal Dynamics and Adaptive Fine-tuning \- arXiv, 访问时间为 八月 1, 2025， [https://arxiv.org/html/2503.01329v2](https://arxiv.org/html/2503.01329v2)  
27. ContiFormer: Continuous-Time Transformer for Irregular Time Series ..., 访问时间为 八月 1, 2025， [https://openreview.net/forum?id=YJDz4F2AZu](https://openreview.net/forum?id=YJDz4F2AZu)  
28. NeurIPS Poster ContiFormer: Continuous-Time Transformer for Irregular Time Series Modeling, 访问时间为 八月 1, 2025， [https://neurips.cc/virtual/2023/poster/71304](https://neurips.cc/virtual/2023/poster/71304)  
29. ContiFormer: Continuous-Time Transformer for Irregular Time Series Modeling \- OpenReview, 访问时间为 八月 1, 2025， [https://openreview.net/pdf?id=YJDz4F2AZu](https://openreview.net/pdf?id=YJDz4F2AZu)  
30. \[2503.01329\] Neural ODE Transformers: Analyzing Internal ..., 访问时间为 八月 1, 2025， [https://ar5iv.labs.arxiv.org/html/2503.01329](https://ar5iv.labs.arxiv.org/html/2503.01329)  
31. Towards Adaptive Residual Network Training: A Neural-ODE Perspective \- Proceedings of Machine Learning Research, 访问时间为 八月 1, 2025， [http://proceedings.mlr.press/v119/dong20c/dong20c.pdf](http://proceedings.mlr.press/v119/dong20c/dong20c.pdf)  
32. itsShnik/adaptively-finetuning-transformers: Adaptively fine tuning transformer based models for multiple domains and multiple tasks \- GitHub, 访问时间为 八月 1, 2025， [https://github.com/itsShnik/adaptively-finetuning-transformers](https://github.com/itsShnik/adaptively-finetuning-transformers)  
33. \[2402.10635\] ContiFormer: Continuous-Time Transformer for Irregular Time Series Modeling \- arXiv, 访问时间为 八月 1, 2025， [https://arxiv.org/abs/2402.10635](https://arxiv.org/abs/2402.10635)  
34. Functional Latent Dynamics for Irregularly Sampled Time Series Forecasting \- arXiv, 访问时间为 八月 1, 2025， [https://arxiv.org/html/2405.03582v1](https://arxiv.org/html/2405.03582v1)  
35. Continuous-Time Linear Positional Embedding for Irregular Time Series Forecasting \- arXiv, 访问时间为 八月 1, 2025， [https://arxiv.org/html/2409.20092v1](https://arxiv.org/html/2409.20092v1)  
36. Comprehensive Review of Neural Differential Equations for Time Series Analysis \- arXiv, 访问时间为 八月 1, 2025， [https://arxiv.org/html/2502.09885v2](https://arxiv.org/html/2502.09885v2)  
37. ContiFormer; Continuous-Time Transformer for Irregular Time Series Modeling \- AAA (All About AI) \- Seunghan Lee, 访问时间为 八月 1, 2025， [https://seunghan96.github.io/ts/(paper)ContiFormer/](https://seunghan96.github.io/ts/\(paper\)ContiFormer/)  
38. \[1907.03907\] Latent ODEs for Irregularly-Sampled Time Series \- arXiv, 访问时间为 八月 1, 2025， [https://arxiv.org/abs/1907.03907](https://arxiv.org/abs/1907.03907)  
39. ContiFormer: Continuous-Time Transformer for Irregular Time Series Modeling \- Microsoft, 访问时间为 八月 1, 2025， [https://www.microsoft.com/en-us/research/publication/contiformer-continuous-time-transformer-for-irregular-time-series-modeling/](https://www.microsoft.com/en-us/research/publication/contiformer-continuous-time-transformer-for-irregular-time-series-modeling/)  
40. ContiFormer: Continuous-Time Transformer for Irregular Time Series Modeling, 访问时间为 八月 1, 2025， [https://seqml.github.io/contiformer/](https://seqml.github.io/contiformer/)  
41. Understanding State Space Models (SSMs) like LSSL, H3, S4 and Mamba \- Tinkerd, 访问时间为 八月 1, 2025， [https://tinkerd.net/blog/machine-learning/state-space-models/](https://tinkerd.net/blog/machine-learning/state-space-models/)  
42. Structured State Spaces: A Brief Survey of Related Models · Hazy ..., 访问时间为 八月 1, 2025， [https://hazyresearch.stanford.edu/blog/2022-01-14-s4-2](https://hazyresearch.stanford.edu/blog/2022-01-14-s4-2)  
43. From Deep to Long Learning? \- Hazy Research, 访问时间为 八月 1, 2025， [https://hazyresearch.stanford.edu/blog/2023-03-27-long-learning](https://hazyresearch.stanford.edu/blog/2023-03-27-long-learning)  
44. NeurIPS Poster Facing Off World Model Backbones: RNNs, Transformers, and S4, 访问时间为 八月 1, 2025， [https://neurips.cc/virtual/2023/poster/72223](https://neurips.cc/virtual/2023/poster/72223)  
45. \[2307.02064\] Facing Off World Model Backbones: RNNs, Transformers, and S4 \- arXiv, 访问时间为 八月 1, 2025， [https://arxiv.org/abs/2307.02064](https://arxiv.org/abs/2307.02064)  
46. Never Train from Scratch: Fair Comparison of Long-Sequence Models Requires Data-Driven Priors | OpenReview, 访问时间为 八月 1, 2025， [https://openreview.net/forum?id=PdaPky8MUn](https://openreview.net/forum?id=PdaPky8MUn)  
47. Never Train from Scratch: Fair Comparison of long-sequence models requires data-driven priors \- arXiv, 访问时间为 八月 1, 2025， [https://arxiv.org/html/2310.02980v2](https://arxiv.org/html/2310.02980v2)  
48. ODEFormer: Symbolic Regression of Dynamical Systems with Transformers | OpenReview, 访问时间为 八月 1, 2025， [https://openreview.net/forum?id=TzoHLiGVMo](https://openreview.net/forum?id=TzoHLiGVMo)  
49. SHAFT: Secure, Handy, Accurate, and Fast Transformer Inference, 访问时间为 八月 1, 2025， [https://www.ndss-symposium.org/wp-content/uploads/2025-2287-paper.pdf](https://www.ndss-symposium.org/wp-content/uploads/2025-2287-paper.pdf)  
50. \[2010.11358\] N-ODE Transformer: A Depth-Adaptive Variant of the Transformer Using Neural Ordinary Differential Equations \- arXiv, 访问时间为 八月 1, 2025， [https://arxiv.org/abs/2010.11358](https://arxiv.org/abs/2010.11358)  
51. Zymrael/awesome-neural-ode: A collection of resources regarding the interplay between differential equations, deep learning, dynamical systems, control and numerical methods. \- GitHub, 访问时间为 八月 1, 2025， [https://github.com/Zymrael/awesome-neural-ode](https://github.com/Zymrael/awesome-neural-ode)  
52. ODE Transformer: An Ordinary Differential Equation-Inspired Model for Sequence Generation | Request PDF \- ResearchGate, 访问时间为 八月 1, 2025， [https://www.researchgate.net/publication/361068870\_ODE\_Transformer\_An\_Ordinary\_Differential\_Equation-Inspired\_Model\_for\_Sequence\_Generation](https://www.researchgate.net/publication/361068870_ODE_Transformer_An_Ordinary_Differential_Equation-Inspired_Model_for_Sequence_Generation)  
53. Cross-Modal Transformer-Based Streaming Dense Video Captioning with Neural ODE Temporal Localization \- MDPI, 访问时间为 八月 1, 2025， [https://www.mdpi.com/1424-8220/25/3/707](https://www.mdpi.com/1424-8220/25/3/707)  
54. Beyond Transformers: Promising Ideas for Future LLMs \- Apolo.us, 访问时间为 八月 1, 2025， [https://www.apolo.us/blog-posts/beyond-transformers-promising-ideas-for-future-llms](https://www.apolo.us/blog-posts/beyond-transformers-promising-ideas-for-future-llms)  
55. The Future of Language Models and Transformers | IVADO, 访问时间为 八月 1, 2025， [https://ivado.ca/en/events/the-future-of-language-models-and-transformers/](https://ivado.ca/en/events/the-future-of-language-models-and-transformers/)  
56. Mamba-360: Survey of State Space Models as Transformer Alternative for Long Sequence Modelling: Methods, Applications, and Challenges \- arXiv, 访问时间为 八月 1, 2025， [https://arxiv.org/html/2404.16112v1](https://arxiv.org/html/2404.16112v1)