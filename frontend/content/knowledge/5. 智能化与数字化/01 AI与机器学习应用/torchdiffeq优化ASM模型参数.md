# **利用 torchdiffeq 和 torch.autograd 提升活性污泥模型 (ASM) 分析与优化能力**

## **I. 引言**

活性污泥模型 (Activated Sludge Models, ASMs) 是污水处理领域描述生物和化学过程动力学的核心工具。这些模型，如 ASM1、ASM2d 和 ASM3 等，通过一系列常微分方程 (Ordinary Differential Equations, ODEs) 来模拟污水处理厂 (Wastewater Treatment Plants, WWTPs) 中关键组分（如底物、生物量、氮磷等）的浓度变化 1。ASMs 对于 WWTPs 的设计、运营优化、控制策略开发以及操作人员培训至关重要。然而，ASM 的有效应用面临诸多挑战，包括模型参数的不确定性、大量参数校准的复杂性、以及基于模型的先进过程控制与优化策略实施的难度 3。传统的参数敏感性分析和校准方法往往计算成本高昂，尤其对于参数众多的复杂模型。

近年来，以 PyTorch 为代表的深度学习框架及其生态系统为科学计算带来了新的机遇。torchdiffeq 是一个在 PyTorch 中实现的、用于求解常微分方程的库，它提供了多种数值求解器 5。更重要的是，torchdiffeq 与 PyTorch 的自动微分引擎 torch.autograd 紧密集成，能够精确且高效地计算 ODE 求解过程相对于模型参数或初值的梯度 7。这种能力的结合，特别是通过伴随灵敏度方法 (Adjoint Sensitivity Method) 实现的梯度计算，为克服传统 ASM 分析的瓶颈提供了强大的工具。它不仅极大地提高了梯度计算的效率和内存使用效率（尤其是对于长时间积分或高维系统），还使得基于梯度的优化算法能直接应用于复杂的 ODE 系统 8。这预示着 ASM 参数敏感性分析、参数校准以及更复杂的过程优化问题（如基于模型的控制）将迎来一场方法学上的革新，使得这些先前因计算复杂度而难以企及的任务变得可行。

本报告旨在深入调研并阐述如何利用 torchdiffeq 提供的 ODE 求解能力，结合 torch.autograd 的自动、精确且高效的梯度计算特性，为 ASM 模型的参数敏感性分析、基于梯度的参数校准算法（如梯度下降法及其变种）以及更复杂的优化问题（如过程优化，包括出水水质指数 EQI 和运行成本指数 OCI 的优化）开辟新的途径。

## **II. 基础：torchdiffeq 与 torch.autograd 在 ODE 系统中的应用**

在深入探讨 ASM 的具体应用之前，首先需要理解 torchdiffeq 和 torch.autograd 在求解和分析 ODE 系统方面的核心功能和原理。

### **A. torchdiffeq 概览**

torchdiffeq 是一个 PyTorch 库，提供了多种可微分的 ODE 求解器 5。其核心功能是通过 odeint 函数实现，该函数用于求解形如 dy/dt=f(t,y) 的初值问题 (Initial Value Problem, IVP)，其中 y(t0​)=y0​ 6。odeint 接受定义的动力学函数 func、初始状态 y0 以及评估时间点 t 作为输入。

torchdiffeq 支持多种求解器，这些求解器大致可分为自适应步长求解器和固定步长求解器 10：

* **自适应步长求解器 (Adaptive Solvers):** 如 dopri8、dopri5 (默认求解器)、bosh3、adaptive\_heun。这类求解器能根据求解过程中的误差估计动态调整步长，以在满足用户设定的容差前提下提高计算效率和精度 10。关键参数包括相对容差 rtol 和绝对容差 atol，它们共同决定了每一步的接受与否 10。  
* **固定步长求解器 (Fixed Solvers):** 如 euler、midpoint、rk4、explicit\_adams、implicit\_adams。这类求解器使用固定的时间步长进行积分，用户通常需要指定 step\_size 10。

选择合适的求解器及其参数（如 rtol, atol, method）对求解的精度、速度和稳定性至关重要 10。例如，对于可能存在刚性 (stiffness) 的 ASM 系统，求解器的选择和容差设置需要特别注意，不当的选择可能导致计算缓慢或结果不准确，进而影响后续的梯度计算和优化过程。

### **B. torchdiffeq 中的伴随灵敏度方法 (odeint\_adjoint)**

尽管通过 odeint 直接对求解器内部操作进行反向传播在理论上可行，但对于步数较多的 ODE 求解，这种方法的内存消耗会非常大，因为它需要存储前向传播过程中的所有中间状态 8。为了解决这个问题，torchdiffeq 提供了 odeint\_adjoint 函数，它实现了基于伴随灵敏度方法的梯度计算 6。

伴随灵敏度方法的核心思想是，通过求解一个辅助的伴随 ODE 系统（反向积分），来计算损失函数相对于 ODE 系统参数或初值的梯度，而无需存储前向路径的所有中间计算结果 8。这使得梯度计算的内存复杂度达到 O(1)（相对于积分步数），极大地扩展了可处理问题的规模和复杂度 8。

odeint\_adjoint 的关键参数包括 10：

* adjoint\_rtol, adjoint\_atol: 用于反向伴随系统求解的相对和绝对容差，默认使用前向传播的容差值。  
* adjoint\_method: 用于反向伴随系统求解的数值方法，默认使用前向传播的方法。  
* adjoint\_params: 一个包含需要计算梯度的参数的元组。默认情况下，如果 func 是一个 torch.nn.Module 实例，它会自动包含 func.parameters()。如果 func 不是 nn.Module 或没有参数，则必须明确指定，例如 adjoint\_params=()。

一个重要的使用前提是，当使用 odeint\_adjoint 时，定义 ODE 动力学 f(t,y) 的函数 func 必须是一个 torch.nn.Module 的子类 6。这是因为 odeint\_adjoint 需要通过这种方式来收集和追踪与动力学相关的参数。这种结构化的要求实际上促进了模型定义的模块化和参数管理的规范化，对于复杂的 ASM 模型而言，这本身就是一种良好的实践。此外，为后向伴随方程的求解指定不同于前向求解的数值方法和容差 (adjoint\_method, adjoint\_rtol, adjoint\_atol)，为处理前向和后向系统可能具有不同数值特性（如刚度）的情况提供了灵活性。

### **C. torch.autograd 的自动微分机制**

torch.autograd 是 PyTorch 的核心自动微分引擎，它为神经网络训练提供了动力 7。其基本原理是构建一个计算图 (Directed Acyclic Graph, DAG)，记录所有张量上的操作。在这个图中，叶节点是输入张量，根节点是输出张量。当在某个输出张量（通常是标量损失函数）上调用 .backward() 方法时，autograd 会从根节点开始，利用链式法则反向遍历计算图，计算并累积所有 requires\_grad=True 的叶节点张量（即模型参数或需要梯度的输入）的梯度，并将这些梯度存储在相应张量的 .grad 属性中 7。

当 torch.autograd 与 torchdiffeq 结合使用时，ODE 求解过程（无论是 odeint 还是 odeint\_adjoint）本身被视为计算图中的一个可微分操作。odeint\_adjoint 的特殊之处在于它如何高效地计算这个“大操作”的梯度。最终用户通常只需要确保他们的 ODE 动力学函数 func (作为 nn.Module) 中的参数是 torch.nn.Parameter 类型，并且损失函数是基于 odeint\_adjoint 的输出构建的。随后的 loss.backward() 调用将无缝地触发伴随方法的执行，并填充相关参数的梯度。这种无缝集成为在复杂的 ODE 系统（如 ASMs）中应用基于梯度的先进分析和优化技术铺平了道路，用户无需手动推导或实现复杂的伴随方程求解过程。

## **III. ASM 模型的参数敏感性分析 (PSA)**

参数敏感性分析 (PSA) 是理解和评估复杂数学模型（如 ASM）的关键步骤。它旨在量化模型输出对输入参数变化的响应程度 13。

### **A. ASM 参数敏感性分析的重要性**

对于 ASM 而言，PSA 具有多重意义：

* **识别关键参数：** ASMs 通常包含数十个动力学和化学计量学参数，并非所有参数对模型预测的影响都同等重要。PSA 可以帮助识别那些对特定模型输出（如出水污染物浓度、关键过程速率）影响最大的参数子集 3。  
* **指导参数校准：** 在参数校准过程中，应优先关注高敏感度的参数，因为它们对模型拟合优度的贡献更大。对不敏感参数的调整可能收效甚微，甚至引入不必要的模型复杂度 13。  
* **模型简化与降阶：** 如果某些参数对关注的输出几乎没有影响，可以考虑将其固定为文献值或从模型中移除，从而简化模型，降低计算负担和过拟合风险 13。  
* **理解模型行为与不确定性传播：** PSA 揭示了模型内部参数如何影响其动态行为，有助于深入理解模型的内在机制，并评估参数不确定性如何传播到模型预测结果 13。

### **B. 基于梯度的 PSA 方法论**

利用 torchdiffeq 和 torch.autograd，可以高效地执行基于梯度的局部敏感性分析。其核心是计算模型输出（或由输出衍生的某个目标函数）相对于模型参数的偏导数，即梯度 ∂O/∂θj​，其中 O 是输出，$ \\theta\_j $是第 j 个参数。

1\. 将 ASM 动力学定义为 nn.Module  
首先，需要将 ASM 的 ODE 系统封装在一个继承自 torch.nn.Module 的类中。模型的所有待分析参数（如最大比生长速率 μmax,H​、半饱和常数 KS​ 等）都应定义为该模块的 torch.nn.Parameter。

Python

import torch  
import torch.nn as nn  
from torchdiffeq import odeint\_adjoint

class ASM\_Dynamics(nn.Module):  
    def \_\_init\_\_(self, initial\_params):  
        super().\_\_init\_\_()  
        \# 例如: initial\_params \= {'mu\_max\_H': 4.0, 'K\_S': 10.0,...}  
        self.mu\_max\_H \= nn.Parameter(torch.tensor(\[initial\_params\['mu\_max\_H'\]\]))  
        self.K\_S \= nn.Parameter(torch.tensor(\]))  
        \#... 定义其他所有相关的 ASM 参数作为 nn.Parameter

    def forward(self, t, y):  
        \# y 是包含状态变量 (S\_S, X\_BH, S\_O 等) 的张量  
        \# 利用 self.mu\_max\_H, self.K\_S 等参数实现 ASM 的微分方程组  
        \# 例如:  
        \# S\_S, X\_BH, S\_O \= y, y, y \# 假设的索引  
        \# growth\_rate \= self.mu\_max\_H \* (S\_S / (self.K\_S \+ S\_S)) \* (S\_O / (K\_O\_H \+ S\_O)) \* X\_BH  
        \#... 其他速率项  
        \# dy\_dt \= torch.stack(\[...\]) \# 包含所有状态变量导数的张量  
        \# return dy\_dt  
        pass \# 占位符，实际应为 ASM 方程

2\. 使用 odeint\_adjoint 获取 ∂(Output)/∂(Parameter)  
定义 ODE 的初始状态 y0 和评估时间点 t\_eval。实例化 ASM 动力学模型，并使用 odeint\_adjoint 求解。至关重要的是，通过 adjoint\_params 参数明确指定需要计算梯度的参数 10。

Python

\# 假设 asm\_model 是 ASM\_Dynamics 的一个实例  
\# y0 是初始条件张量, t\_eval 是时间点张量

\# 指定针对 asm\_model 的所有 nn.Parameter 进行梯度计算  
\# 或者可以传递一个特定的参数子集: adjoint\_params=(asm\_model.mu\_max\_H, asm\_model.K\_S)  
pred\_y \= odeint\_adjoint(asm\_model, y0, t\_eval, adjoint\_params=tuple(asm\_model.parameters()))

\# 选择一个感兴趣的输出，例如最后一个时间点的第一个状态变量  
output\_of\_interest \= pred\_y\[-1, 0\]

\# 计算该输出相对于指定参数的梯度  
output\_of\_interest.backward()

\# 梯度值存储在参数的.grad 属性中  
sensitivity\_mu\_max\_H \= asm\_model.mu\_max\_H.grad  
sensitivity\_K\_S \= asm\_model.K\_S.grad  
\#... 其他参数的梯度

这种方法允许我们获得任何在 ASM\_Dynamics 模块中定义为 torch.nn.Parameter 的参数的精确梯度。这不仅包括传统的动力学/化学计量学参数，如果模型结构允许，还可能包括更抽象的参数或混合模型中神经网络部分的参数（例如，用于描述某些未知过程或修正项的嵌入式小型神经网络的权重）1。这意味着可以分析混合 ASM 模型中“学习到”的部分对整体输出的影响程度，从而深入了解数据驱动组件的重要性和行为。

3\. 处理多输出和时变敏感性  
如果需要分析多个输出或在多个时间点的敏感性，可能需要多次调用 backward()。如果计算图需要在后续对不同输出的 backward() 调用中重用，则需设置 retain\_graph=True。或者，如果适用，可以将多个输出聚合成一个标量损失函数。对于整个轨迹 y(t) 对参数 θ 的敏感性，可以考虑使用 torch.autograd.functional.jacobian，但其与 odeint\_adjoint 结合用于全轨迹敏感性的计算成本需要仔细评估，因为伴随方法对标量损失函数最为高效。  
下表总结了使用 torchdiffeq 进行 ASM 参数敏感性分析的概念框架：

**表 1: 使用 torchdiffeq 进行 ASM 参数敏感性分析的概念框架**

| 步骤 | 描述 | 关键 torchdiffeq/autograd 工具或概念 | 重要考量 |
| :---- | :---- | :---- | :---- |
| 1\. 定义 ASM 为 nn.Module | 将 ASM 的 ODE 系统封装在 nn.Module 子类中，待分析参数定义为 nn.Parameter。 | torch.nn.Module, torch.nn.Parameter | 确保所有目标参数均已正确声明为 nn.Parameter。 |
| 2\. 选择感兴趣的输出 | 确定一个或多个用于敏感性分析的模型输出，例如特定组分在特定时间的浓度，或基于整个轨迹的某个聚合指标 (如 EQI)。 | 模型输出的张量切片或基于输出的计算。 | 对于伴随方法，最终用于调用 .backward() 的应为标量；若输出为多维，需选择分量或进行聚合。 |
| 3\. 使用 odeint\_adjoint 求解 ODE | 调用 odeint\_adjoint 求解 ODE，并通过 adjoint\_params 参数指定需要计算梯度的参数。 | odeint\_adjoint, adjoint\_params | 正确设置 adjoint\_params 以包含所有目标参数；选择合适的求解器和容差。 |
| 4\. 通过 loss.backward() 计算梯度 | 对选定的标量输出（或由其衍生的损失函数）调用 .backward() 方法，以计算该输出相对于 adjoint\_params 中指定参数的梯度。 | tensor.backward() | 若需对多个独立输出计算梯度，可能需要使用 retain\_graph=True 或分别计算。 |
| 5\. 提取并归一化梯度 | 从参数的 .grad 属性中提取计算得到的梯度值。对原始梯度进行归一化处理（如计算相对敏感性指数）以便于比较。 | parameter.grad, 归一化公式 | 选择合适的归一化方法以消除参数尺度和单位差异带来的影响，确保敏感性比较的公平性。 |
| 6\. 可视化与解读敏感性 | 使用图表（如条形图、龙卷风图、热力图）将归一化后的敏感性指数可视化，并解读其大小、符号和相对重要性。 | matplotlib 等可视化库 | 确保可视化清晰传达关键信息，如参数排序、影响方向等。 |

### **C. 解读敏感性结果**

* **大小和符号：** 梯度的大小（绝对值）表示参数对输出影响的强度，绝对值越大，敏感性越高。梯度的符号表示影响的方向：正梯度表示输出随参数增加而增加，负梯度则相反 7。  
* **参数尺度差异与敏感性指数归一化：** ASM 参数通常具有截然不同的物理单位和数值范围（例如，μmax​ 单位为 d−1，而 KS​ 单位为 mg/L）。直接比较原始梯度（例如，∂O/∂μmax​ 与 ∂O/∂KS​）可能会产生误导，因为参数的量纲和名义值会影响梯度的数值大小 13。 为了进行公平比较，需要对敏感性指数进行归一化。一种常用的方法是计算**相对敏感性指数 (Relative Sensitivity Index)** 或**弹性 (Elasticity)** 4： $$ S\_{ij}^{rel} \= \\frac{\\partial O\_i / O\_i}{\\partial \\theta\_j / \\theta\_j} \= \\frac{\\partial O\_i}{\\partial \\theta\_j} \\cdot \\frac{\\theta\_j}{O\_i} $$ 该指数是无量纲的，表示参数 θj​ 发生 1% 的变化时，输出 Oi​ 变化的百分比。计算它需要 Oi​ 和 θj​ 的名义值，Oi​ 可以是模型在名义参数值下的输出。其他归一化方法包括用参数的标准差或范围来缩放梯度 18。 选择合适的归一化方法对于正确排序参数重要性至关重要 13。若不进行归一化，PSA 可能会错误地将名义值较大的参数识别为最敏感的，即使它们的相对影响很小。这直接影响后续的参数校准、模型简化或实验设计工作，因为这些工作依赖于对参数影响力的准确评估 3。  
* **局部与全局敏感性概念：** 基于梯度的方法本质上提供的是**局部敏感性**，即在参数空间中特定点（当前参数值）的敏感性 4。这对于理解模型在某个操作点或已校准参数集周围的行为非常有价值。 全局敏感性分析 (Global Sensitivity Analysis, GSA) 方法（如 Sobol 指数法、Morris 筛选法）则探索整个参数空间，能够捕捉非线性效应和参数间的交互作用，但通常计算成本更高，且多为基于采样的方法，与 autograd 的梯度计算机制不同（尽管梯度信息有时可用于指导 GSA）3。本报告主要关注由 torchdiffeq 实现的基于梯度的局部敏感性分析。 尽管如此，通过 torchdiffeq 高效计算得到的局部敏感性信息，可以作为一种计算成本较低的筛选步骤，用于识别那些可能值得进行更昂贵全局敏感性分析的参数子集，或者为 GSA 的参数范围设定提供参考。这种方式使得局部敏感性分析和全局敏感性分析可以协同工作，对于参数维度较高的 ASM 模型，这有助于使 GSA 更易于处理。

### **D. 多参数敏感性的可视化技术**

有效的可视化对于传达多参数敏感性分析的结果至关重要。

* **条形图/龙卷风图 (Bar Charts/Tornado Plots)：** 对于单个输出，可以绘制所有参数的归一化敏感性指数的条形图。龙卷风图尤其适合可视化不同参数对输出影响范围的排序，其中条形的长度代表敏感性大小，清晰地对参数进行排序 24。  
* **热力图 (Heatmaps)：** 如果获得了多个输出（或单个输出在多个时间点）对多个参数的敏感性，可以使用热力图来可视化这个敏感性矩阵 26。行可以代表参数，列可以代表输出或时间点，颜色的深浅表示归一化敏感性的大小。  
* **时间序列图 (Time-Series Plots)：** 对于特定参数，可以绘制其对某个输出变量的敏感性随时间变化的曲线。这能显示参数的影响力在模拟过程中的演变情况。

Python 中的 matplotlib 26 和 seaborn 等库，以及专门的敏感性分析可视化包（如 SALib 的绘图功能，或 sensitivity 包 27），都可以用于生成这些图表。

## **IV. ASM 模型的基于梯度的参数校准**

参数校准是 ASM 应用中的一个核心环节，旨在通过调整模型参数，使模型预测尽可能地与实验观测数据吻合 28。

### **A. 将校准问题构建为优化任务**

参数校准的本质是一个优化问题：寻找一组 ASM 参数 θASM​，使得模型预测值 ypred​(θASM​) 与观测数据 yobs​ 之间的差异最小化 28。这个差异通常通过一个损失函数 L(ypred​(θASM​),yobs​) 来量化。  
因此，校准过程可以表示为：  
θASM​min​L(ypred​(θASM​),yobs​)  
文献 29 为 Bouc-Wen 模型提供了一个清晰的示例，其中 torchdiffeq 在优化循环内用于生成预测数据。

### **B. 利用 torchdiffeq 梯度与 PyTorch 优化器**

基于梯度的优化算法（如随机梯度下降 SGD、Adam、L-BFGS 等）需要损失函数相对于待校准参数的梯度，即 ∂L/∂θASM​ 7。如前所述，torchdiffeq.odeint\_adjoint 能够高效提供这些梯度。当 asm\_model.parameters()（或其特定子集）被传递给 adjoint\_params，并且这些参数也注册到 PyTorch 优化器中时，标准的 PyTorch 训练循环即可应用于参数校准：

1. **前向传播：** 使用当前的 θASM​ 求解 ASM 的 ODE，得到预测值 ypred​。  
2. **计算损失：** 根据 ypred​ 和 yobs​ 计算损失值 L。  
3. **梯度清零：** 调用 optimizer.zero\_grad() 清除先前累积的梯度。  
4. **反向传播：** 调用 loss.backward()，autograd 将自动计算 ∂L/∂θASM​ 并将其存储在参数的 .grad 属性中。  
5. **参数更新：** 调用 optimizer.step()，优化器根据计算得到的梯度更新 θASM​。

这个流程与标准的 PyTorch 模型训练流程非常相似 7。torchdiffeq 的调用无缝集成在循环内部。这种方法允许同时估计大量的 ASM 参数，这对于传统方法来说通常是一个主要挑战。odeint\_adjoint 的效率使得这在实践中变得可行，因为 ASM 可能包含数十个动力学和化学计量学参数，手动或非梯度方法在参数维度增加时会面临“维度灾难” 13。基于梯度的优化方法在处理高维问题时通常表现更好，前提是梯度能够有效获取 6。

### **C. 为 ASM 校准定义损失函数**

损失函数的选择对校准结果有显著影响：

* **均方误差 (Mean Squared Error, MSE)：** 是一种常见的选择，L=N1​∑(ypred,i​−yobs,i​)2。它可以应用于一个或多个状态变量在不同时间点的比较。  
* **加权均方误差 (Weighted MSE)：** 如果某些状态变量或时间点更为重要，或者它们的测量尺度/方差不同，可以在 MSE 的基础上引入权重。  
* **对数似然函数 (Log-Likelihood)：** 如果对测量噪声有概率性假设（例如，高斯噪声），则可以通过最大化似然函数（等价于最小化负对数似然函数）来进行参数估计。  
* **ASM 的特定考量：** ASM 具有多个状态变量。损失函数可以是针对选定的关键变量（如出水氨氮 SNH​、硝态氮 SNO​、化学需氧量 CODeffluent​ 等）的 MSE 之和。具体选择取决于可用的测量数据类型和质量。文献 29 提及使用带噪声的合成时间序列数据进行训练，并定义了一个损失泛函。

整个流程（ODE 求解 \+ 损失计算）的可微性意味着可以在损失函数中轻松加入对参数本身的正则化项（例如 L1/L2 正则化，以鼓励稀疏性或较小的参数值）。这有助于防止在数据有限或噪声较大时发生过拟合，提高校准后 ASM 参数的泛化能力 11。这为将先验知识或期望的性质（如模型简洁性）融入 ASM 校准过程提供了一种有原则的方法，从而增强了模型的鲁棒性。

此外，如果损失函数的某些部分可以编码 ASM 应遵循的物理约束或已知关系（除了匹配时间序列数据之外），那么该框架就支持“物理信息”校准。例如，可以将不明确包含在 ODE 中的质量平衡一致性检查，或对某些未校准内部变量的界限，表述为损失函数中的附加可微项 28。torch.autograd 同样会通过这些基于物理的损失项进行反向传播。这可以将校准引向更符合物理实际的参数集，尤其是在数据稀疏的情况下，从而使校准后的 ASM 更加可靠。

### **D. 实践工作流与代码结构 (概念性)**

以下是一个概念性的 ASM 参数校准工作流和代码结构：

Python

import torch  
import torch.nn as nn  
import torch.optim as optim  
from torchdiffeq import odeint\_adjoint

\# 1\. 定义 ASM 动力学模型 (ASM\_Dynamics 类，如前文所示)  
\# initial\_param\_guesses 是包含参数初始猜测值的字典  
asm\_model \= ASM\_Dynamics(initial\_param\_guesses)

\# 2\. 定义优化器  
\# 将 asm\_model 的参数传递给优化器  
optimizer \= optim.Adam(asm\_model.parameters(), lr=0.01)

\# 3\. 加载/定义观测数据  
\# y0\_obs: 观测数据的初始状态 (torch.Tensor)  
\# t\_obs: 观测数据对应的时间点 (torch.Tensor)  
\# y\_obs: 观测数据值 (torch.Tensor)，维度应与 y\_pred 中用于比较的部分匹配

\# 4\. 训练 (校准) 循环  
num\_epochs \= 1000  
for epoch in range(num\_epochs):  
    optimizer.zero\_grad()  
      
    \# 使用当前参数求解 ODE  
    \# 确保 odeint 的评估时间点 t\_obs 与观测数据的时间点一致  
    \# adjoint\_params 可以明确指定，或者如果模型中只有待校准参数，也可省略让其自动拾取  
    y\_pred \= odeint\_adjoint(asm\_model, y0\_obs, t\_obs,   
                            adjoint\_params=tuple(asm\_model.parameters()))  
      
    \# 计算损失，例如，针对特定状态变量的 MSE  
    \# selected\_states\_indices 是 y\_pred 和 y\_obs 中对应于要比较的状态变量的索引  
    loss \= nn.functional.mse\_loss(y\_pred\[:, selected\_states\_indices\],   
                                  y\_obs\[:, selected\_states\_indices\])  
      
    \# 可以添加参数正则化项到 loss 中  
    \# e.g., l1\_lambda \= 0.001  
    \# l1\_norm \= sum(p.abs().sum() for p in asm\_model.parameters())  
    \# loss \= loss \+ l1\_lambda \* l1\_norm

    loss.backward()  
    optimizer.step()  
      
    if epoch % 100 \== 0:  
        print(f'Epoch {epoch}: Loss \= {loss.item()}')  
        \# 可以加入收敛性检查逻辑

\# 校准完成后的参数存储在 asm\_model.parameters() 中  
\# 例如: calibrated\_mu\_max\_H \= asm\_model.mu\_max\_H.item()

## **V. ASM 系统的高级过程优化**

除了参数校准，torchdiffeq 和 torch.autograd 的组合还为更高级的 ASM 系统过程优化问题提供了强大的支持，例如优化污水处理厂的运行策略以达到特定的经济或环境目标。

### **A. 为 ASM 优化定义目标函数**

过程优化需要一个标量目标函数来进行最小化或最大化。该函数应封装 WWTP 期望的运行目标。

* **出水水质指数 (Effluent Quality Index, EQI)：** 这是污水处理基准测试（如 BSM1, BSM2）中常用的一个综合指标，它在一个评估周期内结合了出水中关键污染物的加权浓度（如总悬浮固体 TSS、化学需氧量 COD、凯氏氮 SNKj​、硝态氮 SNO​、五日生化需氧量 BOD5）30。EQI 值越低，表示出水水质越好。BSM2 中的 EQI 计算公式通常为 30： $$ EQI \= \\frac{1}{T\_{obs} \\cdot 1000} \\int\_{t\_{start}}^{t\_{end}} \\left( \\sum\_{k} B\_k \\cdot C\_{k,e}(t) \\right) Q\_e(t) dt $$ 其中 Tobs​ 是评估周期，Bk​ 是污染物 k 的权重因子，Ck,e​(t) 是污染物 k 在 t 时刻的出水浓度，Qe​(t) 是 t 时刻的出水流量。权重因子 Bk​ 反映了每种污染物相对的环境影响 30。  
* **运行成本指数 (Operational Cost Index, OCI)：** OCI 用于量化 WWTP 的运行成本，通常包括泵送能耗、曝气能耗、混合能耗和污泥处置费用等 32。曝气能耗往往是 OCI 中的主导因素 33。OCI 的具体计算公式可能有所不同，但一般是将这些成本组成部分加权求和。例如，BSM2 的 OCI 可能包含曝气能 (AE)、泵送能 (PE)、混合能 (ME)、污泥产生量 (SP)、甲烷产量 (用于能源回收) 和加热能 (HE) 等项 33。  
* **组合目标函数：** 在实际应用中，往往需要在出水水质和运行成本之间进行权衡。因此，可以构建一个组合目标函数，例如 min(α⋅EQI+β⋅OCI)，其中权重 α 和 β 反映了对出水水质和运行成本的相对重视程度 34。

这些指数通常是在一个模拟周期内对 ODE 解的轨迹进行积分得到的，使其成为泛函。torchdiffeq 和 autograd 能够计算这类积分型目标函数相对于控制变量的梯度。这种通过 ODE 求解器对复杂、积分形式的目标函数（如 EQI 和 OCI）进行微分的能力是一个显著的进步。它使得可以直接优化整体工厂性能指标，而不是仅仅优化替代变量或中间变量。这为直接基于梯度的这些高级性能指标优化提供了可能，比单独优化某个出水浓度要强大得多。

### **B. 使用 torchdiffeq 构建过程优化问题**

可以将待优化的控制变量（例如，溶解氧 DO 设定点、污泥回流率、外部碳源投加量等）视为参数 θcontrol​。这些控制参数可能直接影响 ASM 的动力学过程（例如，DO 影响反应速率），或者作为 ODE 函数 f(t,y,θASM​,θcontrol​) 的输入。优化的目标是找到一组 θcontrol​，使得选定的目标函数（EQI、OCI 或其组合）最小化。

优化循环的结构与参数校准类似，但梯度是针对 θcontrol​ 计算的：

Python

\# control\_params (例如 DO\_setpoint) 定义为 torch.nn.Parameter  
\# objective\_function 基于 odeint\_adjoint 的输出 y\_pred 计算 EQI/OCI  
\# loss \= objective\_function(y\_pred, control\_params) \# 目标函数也可能直接依赖于控制参数本身  
\# loss.backward() \# 计算损失相对于 control\_params 的梯度  
\# optimizer.step() \# 更新 control\_params

文献 35 提供了一个使用通用微分方程进行最优控制的示例，其中神经网络参数化了控制输入 u(t)，损失函数依赖于状态轨迹和控制努力。这是一个更高级的形式，但阐明了基本原理。

### **C. 动态控制与优化策略的途径**

* **设定点优化：** 如上所述，寻找控制器（如 DO 的 PI 控制器）的最优恒定设定点。  
* **时变控制曲线优化：** 如果控制动作可以随时间变化（例如，每日的 DO 曲线），这些曲线可以用某种方式参数化（例如，通过神经网络 35，或分段常数值），然后优化这些参数 θcontrol​。  
* **模型预测控制 (Model Predictive Control, MPC)：** 尽管完整的 MPC 实现较为复杂，但高效预测未来状态并获得相对于控制动作的梯度的能力是 MPC 框架的关键组成部分 36。torchdiffeq 可以用作 MPC 框架内的预测模型，梯度信息则有助于在每个控制时域的优化步骤。

将 torchdiffeq 与可学习的控制策略（例如，参数化控制动作的神经网络，如 35 所示）相结合，为发现新颖的、可能非直觉的 ASM 动态控制策略打开了大门，这些策略的性能可能优于传统的固定设定点或启发式控制。传统的 ASM 控制通常依赖于 PI 控制器，其设定点通过手动调整或经验优化得到 39。WWTP 复杂且时变的进水条件使得固定策略往往次优 34。神经网络可以表示从系统状态（或时间）到控制动作的复杂非线性映射 u(t)=NN(y(t),t;θNN​) 35。神经网络的参数 θNN​ 可以使用来自 odeint\_adjoint 和 autograd 的梯度进行优化，以最小化 EQI/OCI。这种基于机理 ASM 模型的数据驱动控制发现，可能产生难以手动设计的自适应高效运行策略，是迈向“自优化”WWTP 的一步。

过程优化通常需要许多次迭代（模拟和梯度计算），因此伴随方法的计算效率至关重要。若无此效率，对长运行周期（例如 BSM2 EQI 所需的一年 30）进行优化将难以实现。odeint\_adjoint 的 O(1) 内存消耗和高效梯度计算 8 是解决实际 ASM 过程优化问题的关键促成因素。

## **VI. 实践执行：最佳实践与注意事项**

在实际应用 torchdiffeq 和 torch.autograd 进行 ASM 分析与优化时，遵循一些最佳实践并考虑潜在的数值问题至关重要。

### **A. 为 odeint\_adjoint 构建 nn.Module**

如前所述，定义 ODE 动力学的函数 func 必须继承自 torch.nn.Module 6。所有需要进行敏感性分析、校准或作为优化控制策略一部分的 ASM 参数，都必须在该模块内部声明为 torch.nn.Parameter。

Python

import torch  
import torch.nn as nn

class ASM\_ODE\_Practical(nn.Module):  
    def \_\_init\_\_(self, kinetic\_params, stoich\_params, control\_params\_initial\_values):  
        super().\_\_init\_\_()  
        \# 动力学参数  
        self.mu\_H \= nn.Parameter(torch.tensor(kinetic\_params\['mu\_H'\]))  
        self.K\_S \= nn.Parameter(torch.tensor(kinetic\_params))  
        \#... 其他动力学参数  
          
        \# 化学计量学参数 (如果也需要校准或分析敏感性)  
        self.Y\_H \= nn.Parameter(torch.tensor(stoich\_params\['Y\_H'\]))  
        \#... 其他化学计量学参数

        \# 控制参数 (如果作为优化变量)  
        self.DO\_setpoint \= nn.Parameter(torch.tensor(control\_params\_initial\_values))  
        \#... 其他可优化的控制输入

        \# 非参数化的常数可以直接作为属性  
        self.K\_OH \= torch.tensor(0.2) \# 示例：一个固定的半饱和常数

    def forward(self, t, y\_state\_vars):  
        \# y\_state\_vars: 当前状态变量浓度的张量  
        \# S\_S, X\_BH, S\_O, S\_NO,... \= y\_state\_vars, y\_state\_vars,...

        \# 使用 self.mu\_H, self.K\_S, self.Y\_H, self.DO\_setpoint 等参数  
        \# 以及 y\_state\_vars 来实现完整的 ASM ODE 方程组。  
        \# 例如，一个简化的生长速率项：  
        \# S\_O\_actual \= self.DO\_setpoint \# 假设 DO 被完美控制到设定点  
        \# specific\_growth\_rate\_H \= self.mu\_H \* (y\_state\_vars / (self.K\_S \+ y\_state\_vars)) \* \\  
        \#                          (S\_O\_actual / (self.K\_OH \+ S\_O\_actual))  
        \# dX\_BH\_dt \= specific\_growth\_rate\_H \* y\_state\_vars\[idx\_Xbh\] \#... 减去衰减等  
        \# dS\_S\_dt \= \- (1/self.Y\_H) \* specific\_growth\_rate\_H \* y\_state\_vars\[idx\_Xbh\] \#... 加上水解等  
          
        \# dy\_dt \= torch.cat(\[...\]) \# 包含所有状态变量导数的向量  
        \# return dy\_dt  
        pass \# 占位符

这种结构确保了 odeint\_adjoint 在设置了 adjoint\_params 时（或默认情况下，如果它们是模块中唯一的 nn.Parameter）能够找到这些参数并计算其梯度 10。对于复杂的 ASM 模型，func 模块可能封装了核心动力学参数之外的其他 nn.Parameter（例如，用于数据预处理的参数，或辅助神经网络的参数，这些网络不直接参与导数计算）。明确地仅将相关的 ASM 参数传递给 adjoint\_params，可以确保梯度计算仅针对预期变量高效进行，这对于特定 ASM 组件的 PSA 和校准至关重要。

### **B. 为 ASM 选择合适的求解器和伴随选项**

* **刚性问题 (Stiffness)：** 由于不同生物和化学反应的时间尺度差异很大，ASM 模型可能表现出刚性 11。  
* **刚性系统求解器：** 虽然 torchdiffeq 的默认求解器 dopri5 是一种优秀的通用非刚性求解器，但对于刚性的 ASM，可能需要考虑：  
  * 隐式 Adams 方法（如 implicit\_adams, adams），前提是它们对特定问题稳定有效 6。  
  * 使用更严格的相对和绝对容差 (rtol, atol)，但这会增加计算时间 10。  
  * 有时，重新表述模型的某些部分或（在混合模型中）使用特定的激活函数可以缓解刚性 11。  
* **伴随选项：**  
  * 如果伴随系统表现出与前向系统不同的刚性特性，可以使用 adjoint\_method 为反向传播指定一个可能不同、更鲁棒的求解器 10。  
  * 尝试调整 adjoint\_rtol 和 adjoint\_atol 用于反向传播。  
  * adjoint\_options={"norm": "seminorm"} 选项可能提高自适应步长求解器的效率，值得尝试 10。

ODE 求解器及其容差的选择不仅影响前向求解的准确性，也显著影响反向传播中梯度计算的准确性和稳定性。不准确的前向求解会导致错误的梯度，无论伴随方法本身实现得多好。这是因为伴随方法依赖于前向求解的轨迹 y(t) 来定义伴随 ODE 和梯度积分 8。如果 y(t) 因容差过大或求解器不当而不准确，那么沿此轨迹评估的雅可比矩阵 ∂f/∂y 和 ∂f/∂θ 也会不准确，这种不准确性会传播到伴随方程的解 a(t) 及最终计算的梯度 ∂L/∂θ。因此，确保足够精确的前向求解是获得可靠梯度的先决条件，这意味着可能需要在计算量和梯度可靠性之间进行权衡。

### **C. 数值稳定性及其他考量**

* **参数边界/约束：** ASM 参数通常具有物理意义上的边界（例如，速率常数必须为正）。在校准或优化过程中，参数可能会超出这些边界。  
  * 处理方法：参数重参数化（例如，如果 θ\>0，则优化 log(θ)），或使用约束优化算法（尽管 torch.optim 主要提供无约束算法，可能需要外部库或在损失函数中加入惩罚项）。文献 29 描述了使用 sigmoid/tanh 函数将输出缩放到期望范围。  
* **非光滑激活函数 (若与神经网络混合)：** 如果在 ODE 中嵌入神经网络，应避免使用 ReLU/LeakyReLU 等非光滑激活函数，优先选择如 Softplus, Tanh, Swish 等光滑激活函数 11。这对于纯机理 ASM 参数处理不太相关，但对混合 ASM-NN 模型很重要。  
* **最大步数：** 如果求解器过早终止，可以在 odeint 的 options 中增加 max\_num\_steps 10。  
* **初始步长：** 如果默认的经验选择存在问题，可以指定 first\_step 10。  
* **不连续性：** 如果 ASM 动力学函数 func 在特定时间存在已知的不连续性（例如，由于控制逻辑在特定时间发生变化），可以将这些时间点通过 options 参数中的 grid\_points 或 t\_stops (或更明确的 jump\_t 10) 传递给 odeint，以帮助求解器适应。

对于包含不同时间尺度的过程（例如，快速的底物消耗与缓慢的生物量增长）的 ASM，通常首选自适应步长求解器。然而，动力学的频繁剧烈变化（例如，由进水负荷的突然变化或激进的控制动作引起）可能会对自适应求解器构成挑战，可能导致非常小的 dt 和缓慢的进展 11。这可能需要仔细调整求解器参数，或者在已知的高度动态阶段暂时使用固定步长求解器。

### **D. 示例代码片段 (概念性)**

以下为一些概念性的代码片段，旨在演示核心集成，而非一个完整可运行的 ASM。

1. **定义 ASM\_ODE\_Practical 模块** (已在 VI.A 中展示)。  
2. **基本的 PSA 循环：**  
   Python  
   \# 假设 model, y0, t\_eval 已定义  
   \# output\_selector 是一个函数，从 pred\_y 中选择标量输出  
   pred\_y \= odeint\_adjoint(model, y0, t\_eval, adjoint\_params=tuple(model.parameters()))  
   scalar\_output \= output\_selector(pred\_y)   
   scalar\_output.backward()  
   \# for param\_name, param\_value in model.named\_parameters():  
   \#     if param\_value.grad is not None:  
   \#         print(f'Sensitivity for {param\_name}: {param\_value.grad.item()}')

3. **基本的校准循环：** (已在 IV.D 中通过 ASM\_ODE\_Practical 和优化器设置展示了更完整的结构)。  
4. **定义类 EQI 的目标函数：**  
   Python  
   def calculate\_eqi\_like\_objective(y\_trajectory, effluent\_flow\_rates, weights, time\_points):  
       \# y\_trajectory: (num\_time\_points, num\_states)  
       \# effluent\_flow\_rates: (num\_time\_points,)  
       \# weights: 字典或列表，包含各污染物组分的权重 (B\_k)  
       \# time\_points: 对应的时间点，用于计算积分的 dt

       \# 假设 y\_trajectory 的特定列对应 TSS\_e, COD\_e, S\_NKj\_e, S\_NO\_e, BOD\_e  
       \# pollutant\_concentrations \= y\_trajectory\] 

       \# weighted\_pollutant\_load \= torch.sum(pollutant\_concentrations \* weights\_tensor, dim=1)  
       \# total\_load\_over\_time \= weighted\_pollutant\_load \* effluent\_flow\_rates

       \# 积分 (梯形法则示例)  
       \# dt \= time\_points\[1:\] \- time\_points\[:-1\]  
       \# integral\_eqi \= torch.sum(0.5 \* (total\_load\_over\_time\[1:\] \+ total\_load\_over\_time\[:-1\]) \* dt)

       \# T\_obs \= time\_points\[-1\] \- time\_points  
       \# eqi\_objective \= (1 / (T\_obs \* 1000)) \* integral\_eqi   
       \# return eqi\_objective  
       pass \# 占位符

这些片段旨在说明 torchdiffeq 和 autograd 如何集成到典型的分析和优化任务中。

## **VII. 结论：开启 ASM 建模的新前沿**

torch.autograd 与 torchdiffeq 的结合为活性污泥模型的分析与优化带来了革命性的变化。这种组合的核心优势在于能够高效、精确地计算复杂 ASM 模型输出或目标函数相对于任意模型参数或控制输入的梯度。

**核心益处回顾：**

* **高效的梯度计算：** 伴随灵敏度方法使得梯度计算的内存开销与积分步数无关 (O(1))，计算成本也远低于传统的有限差分法，尤其适用于参数众多、积分时间长的 ASM 系统 8。  
* **全面的参数敏感性分析：** 使得对 ASM 所有参数（包括动力学、化学计量学乃至混合模型中的数据驱动部分参数）进行系统性的局部敏感性分析成为可能，超越了传统的一次一参数 (one-at-a-time) 方法的局限性 14。  
* **稳健的参数校准：** 为基于梯度的优化算法（如 Adam、L-BFGS）在 ASM 参数校准中的应用提供了坚实基础，能够同时校准大量参数，并易于结合正则化项和物理约束，提高校准的鲁棒性和物理真实性 7。  
* **先进的过程优化：** 使得能够直接针对如出水水质指数 (EQI) 和运行成本指数 (OCI) 这样的综合性、积分型目标函数进行优化，为设计更优的 WWTP 运行和控制策略（包括动态控制策略）开辟了道路 30。  
* **混合建模的增强：** 极大地促进了机理模型 (ASM) 与机器学习模型 (如神经网络) 相结合的混合建模方法的发展，因为整个混合系统的梯度可以端到端地计算，便于训练和优化 1。

未来展望与潜在研究方向：  
这一技术组合的应用潜力远未被完全发掘，未来值得探索的方向包括：

* **标准化 torchdiffeq ASM 库：** 开发具有预定义参数结构和接口的标准化、可微分 ASM 库（类似 PyPoo 但以可微分为核心特性），降低用户的使用门槛，促进更广泛的应用。  
* **实时自适应控制与优化：** 将这些可微分 ASM 模型与强化学习或其他在线学习框架结合，开发能够实时适应进水变化和过程扰动的 WWTP 智能控制系统。  
* **实验设计指导：** 利用参数敏感性分析的结果来指导实验设计，以便收集对模型校准和验证最具有信息量的数据，从而更有效地减少模型不确定性。  
* **高阶敏感性与不确定性量化：** 探索利用 torch.autograd 计算二阶敏感性（Hessian 矩阵）的可能性，用于更高级的优化算法（如牛顿法）和更全面的不确定性量化（如基于二阶泰勒展开的误差传播）43。  
* **数字孪生集成：** 将这些高度灵活和可优化的可微分 ASM 模型作为核心组件，集成到更广泛的 WWTP 数字孪生平台中，实现对物理实体的精确模拟、预测、优化和控制。

真正的变革潜力在于能够更紧密、更动态地连接机理理解（编码于 ASM 中）与实际运行数据。该框架允许模型从数据中持续学习（通过校准），并基于精炼后的模型持续优化操作（通过过程优化）。这种由高效梯度计算驱动的迭代式“数据-模型-优化”闭环，有望引领 WWTPs 实现前所未有的自适应管理水平，使其更具韧性、效率和对动态环境的适应能力。

此外，这些先进工具的可及性（得益于 PyTorch 生态的普及和 torchdiffeq 等库对复杂数值方法的封装 5）有望培养新一代的“计算环境工程师”。他们将同时具备污水处理领域的专业知识和驾驭这些复杂系统所需的数据科学/机器学习技能，从而加速 WWTP 建模与控制领域的创新。

最后，尽管本报告聚焦于 ASM，但所讨论的原理和技术具有广泛的适用性，可推广至任何使用基于 ODE 的模型且需要参数敏感性分析、校准或优化的科学与工程领域（例如，系统生物学 45、化学动力学 42、药物代谢动力学等）。ASM 的应用是这一通用且强大方法论的一个具体而有影响力的用例，凸显了可微分编程在现代科学计算中的基础性地位 8。

#### **引用的著作**

1. Hybrid differential equations: integrating mechanistic and data-driven techniques for modelling of water systems \- ResearchGate, 访问时间为 六月 9, 2025， [https://www.researchgate.net/profile/Ward-Quaghebeur/publication/358416350\_Hybrid\_differential\_equations\_Integrating\_mechanistic\_and\_data-driven\_techniques\_for\_modelling\_of\_water\_systems/links/620398e653fa31414829bf13/Hybrid-differential-equations-Integrating-mechanistic-and-data-driven-techniques-for-modelling-of-water-systems.pdf](https://www.researchgate.net/profile/Ward-Quaghebeur/publication/358416350_Hybrid_differential_equations_Integrating_mechanistic_and_data-driven_techniques_for_modelling_of_water_systems/links/620398e653fa31414829bf13/Hybrid-differential-equations-Integrating-mechanistic-and-data-driven-techniques-for-modelling-of-water-systems.pdf)  
2. yajeddig/pypoo: A modular Python framework for ... \- GitHub, 访问时间为 六月 9, 2025， [https://github.com/yajeddig/pypoo](https://github.com/yajeddig/pypoo)  
3. A comprehensive evaluation of various sensitivity analysis methods \- MTSU, 访问时间为 六月 9, 2025， [https://w1.mtsu.edu/faculty/wding/files/eval\_sensitivity2014.pdf](https://w1.mtsu.edu/faculty/wding/files/eval_sensitivity2014.pdf)  
4. Comparison of Model Evaluation Methods to Develop a Comprehensive Watershed Simulation Model \- Digital Commons @ Cal Poly, 访问时间为 六月 9, 2025， [https://digitalcommons.calpoly.edu/cgi/viewcontent.cgi?article=1272\&context=cenv\_fac](https://digitalcommons.calpoly.edu/cgi/viewcontent.cgi?article=1272&context=cenv_fac)  
5. Learning Physics with PyTorch \- Kaggle, 访问时间为 六月 9, 2025， [https://www.kaggle.com/code/shivanshuman/learning-physics-with-pytorch](https://www.kaggle.com/code/shivanshuman/learning-physics-with-pytorch)  
6. PyTorch Implementation of Differentiable ODE Solvers \- GitHub, 访问时间为 六月 9, 2025， [https://github.com/xuanqing94/torchdiffeq](https://github.com/xuanqing94/torchdiffeq)  
7. A Gentle Introduction to torch.autograd \- PyTorch documentation, 访问时间为 六月 9, 2025， [https://docs.pytorch.org/tutorials/beginner/blitz/autograd\_tutorial.html](https://docs.pytorch.org/tutorials/beginner/blitz/autograd_tutorial.html)  
8. \[1806.07366\] Neural Ordinary Differential Equations \- ar5iv \- arXiv, 访问时间为 六月 9, 2025， [https://ar5iv.labs.arxiv.org/html/1806.07366](https://ar5iv.labs.arxiv.org/html/1806.07366)  
9. Building a Basic Neural ODE Model | GeeksforGeeks, 访问时间为 六月 9, 2025， [https://www.geeksforgeeks.org/building-a-basic-neural-ode-model/](https://www.geeksforgeeks.org/building-a-basic-neural-ode-model/)  
10. torchdiffeq/FURTHER\_DOCUMENTATION.md at master · rtqichen ..., 访问时间为 六月 9, 2025， [https://github.com/rtqichen/torchdiffeq/blob/master/FURTHER\_DOCUMENTATION.md](https://github.com/rtqichen/torchdiffeq/blob/master/FURTHER_DOCUMENTATION.md)  
11. torchdiffeq/FAQ.md at master \- GitHub, 访问时间为 六月 9, 2025， [https://github.com/rtqichen/torchdiffeq/blob/master/FAQ.md](https://github.com/rtqichen/torchdiffeq/blob/master/FAQ.md)  
12. torchdiffeq/examples/README.md at master \- GitHub, 访问时间为 六月 9, 2025， [https://github.com/rtqichen/torchdiffeq/blob/master/examples/README.md](https://github.com/rtqichen/torchdiffeq/blob/master/examples/README.md)  
13. Sensitivity analysis \- Wikipedia, 访问时间为 六月 9, 2025， [https://en.wikipedia.org/wiki/Sensitivity\_analysis](https://en.wikipedia.org/wiki/Sensitivity_analysis)  
14. Differential methods for assessing sensitivity in biological models \- PMC \- PubMed Central, 访问时间为 六月 9, 2025， [https://pmc.ncbi.nlm.nih.gov/articles/PMC9232177/](https://pmc.ncbi.nlm.nih.gov/articles/PMC9232177/)  
15. Sensitivity analysis of environmental models: A systematic review with practical workflow, 访问时间为 六月 9, 2025， [https://www.researchgate.net/publication/294889912\_Sensitivity\_analysis\_of\_environmental\_models\_A\_systematic\_review\_with\_practical\_workflow](https://www.researchgate.net/publication/294889912_Sensitivity_analysis_of_environmental_models_A_systematic_review_with_practical_workflow)  
16. (PDF) Hybrid differential equations: Integrating mechanistic and data ..., 访问时间为 六月 9, 2025， [https://www.researchgate.net/publication/358416350\_Hybrid\_differential\_equations\_Integrating\_mechanistic\_and\_data-driven\_techniques\_for\_modelling\_of\_water\_systems](https://www.researchgate.net/publication/358416350_Hybrid_differential_equations_Integrating_mechanistic_and_data-driven_techniques_for_modelling_of_water_systems)  
17. When to normalize data in regression? \- GeeksforGeeks, 访问时间为 六月 9, 2025， [https://www.geeksforgeeks.org/when-to-normalize-data-in-regression/](https://www.geeksforgeeks.org/when-to-normalize-data-in-regression/)  
18. Essential Normalization Methods for Effective Machine Learning Preprocessing, 访问时间为 六月 9, 2025， [https://www.numberanalytics.com/blog/essential-normalization-methods-machine-learning-preprocessing](https://www.numberanalytics.com/blog/essential-normalization-methods-machine-learning-preprocessing)  
19. On the consistency of adjoint sensitivity analysis for structural optimization of linear dynamic problems | Request PDF \- ResearchGate, 访问时间为 六月 9, 2025， [https://www.researchgate.net/publication/271657130\_On\_the\_consistency\_of\_adjoint\_sensitivity\_analysis\_for\_structural\_optimization\_of\_linear\_dynamic\_problems](https://www.researchgate.net/publication/271657130_On_the_consistency_of_adjoint_sensitivity_analysis_for_structural_optimization_of_linear_dynamic_problems)  
20. model-free importance indicators for dependent input \- Andrea Saltelli, 访问时间为 六月 9, 2025， [http://www.andreasaltelli.eu/file/repository/PROCEEDINGS\_SAMO\_2001\_Madrid.pdf](http://www.andreasaltelli.eu/file/repository/PROCEEDINGS_SAMO_2001_Madrid.pdf)  
21. Normalization vs. Standardization: Key Differences Explained \- DataCamp, 访问时间为 六月 9, 2025， [https://www.datacamp.com/tutorial/normalization-vs-standardization](https://www.datacamp.com/tutorial/normalization-vs-standardization)  
22. Assessing convergence in global sensitivity analysis: a review of methods for assessing and monitoring convergence \- OSTI.GOV, 访问时间为 六月 9, 2025， [https://www.osti.gov/servlets/purl/2564053](https://www.osti.gov/servlets/purl/2564053)  
23. Sensitivity analysis of hydrological model parameters based on improved Morris method with the double-Latin hypercube sampling \- IWA Publishing, 访问时间为 六月 9, 2025， [https://iwaponline.com/hr/article/54/2/220/93102/Sensitivity-analysis-of-hydrological-model](https://iwaponline.com/hr/article/54/2/220/93102/Sensitivity-analysis-of-hydrological-model)  
24. Tornado and Importance Plots \- CRAN, 访问时间为 六月 9, 2025， [https://cran.r-project.org/web/packages/tornado/vignettes/tornadoVignette.html](https://cran.r-project.org/web/packages/tornado/vignettes/tornadoVignette.html)  
25. Tornado Diagrams: The Simple Way to Visualize Business Risks \- Motion, 访问时间为 六月 9, 2025， [https://www.usemotion.com/blog/tornado-diagram](https://www.usemotion.com/blog/tornado-diagram)  
26. Machine-Learning/Sensitivity Analysis in AI and ML with Python.md at main \- GitHub, 访问时间为 六月 9, 2025， [https://github.com/xbeat/Machine-Learning/blob/main/Sensitivity%20Analysis%20in%20AI%20and%20ML%20with%20Python.md](https://github.com/xbeat/Machine-Learning/blob/main/Sensitivity%20Analysis%20in%20AI%20and%20ML%20with%20Python.md)  
27. Sensitivity Analysis in Python \- GitHub Pages, 访问时间为 六月 9, 2025， [https://nickderobertis.github.io/sensitivity/auto\_examples/sensitivity\_analysis.html](https://nickderobertis.github.io/sensitivity/auto_examples/sensitivity_analysis.html)  
28. (PDF) Neural Parameter Calibration for Reliable Hysteresis Prediction in Bolted Joint Assemblies \- ResearchGate, 访问时间为 六月 9, 2025， [https://www.researchgate.net/publication/390056562\_Neural\_Parameter\_Calibration\_for\_Reliable\_Hysteresis\_Prediction\_in\_Bolted\_Joint\_Assemblies](https://www.researchgate.net/publication/390056562_Neural_Parameter_Calibration_for_Reliable_Hysteresis_Prediction_in_Bolted_Joint_Assemblies)  
29. XX DINAME, 访问时间为 六月 9, 2025， [https://repositorio.unesp.br/bitstreams/ba4a2261-977e-490c-a63e-07ac4072d8b0/download](https://repositorio.unesp.br/bitstreams/ba4a2261-977e-490c-a63e-07ac4072d8b0/download)  
30. Evaluating Machine Learning-Based Soft Sensors for Effluent Quality Prediction in Wastewater Treatment Under Variable Weather Conditions \- MDPI, 访问时间为 六月 9, 2025， [https://www.mdpi.com/1424-8220/25/6/1692](https://www.mdpi.com/1424-8220/25/6/1692)  
31. Evaluating Machine Learning-Based Soft Sensors for Effluent Quality Prediction in Wastewater Treatment Under Variable Weather Conditions, 访问时间为 六月 9, 2025， [https://pmc.ncbi.nlm.nih.gov/articles/PMC11945289/](https://pmc.ncbi.nlm.nih.gov/articles/PMC11945289/)  
32. Exploring the effects of faults on the performance of a biological wastewater treatment process \- IWA Publishing, 访问时间为 六月 9, 2025， [https://iwaponline.com/wst/article/90/2/474/103125/Exploring-the-effects-of-faults-on-the-performance](https://iwaponline.com/wst/article/90/2/474/103125/Exploring-the-effects-of-faults-on-the-performance)  
33. Benchmark Simulation Model No 2: Finalisation of plant layout and default control strategy, 访问时间为 六月 9, 2025， [https://www.researchgate.net/publication/47661244\_Benchmark\_Simulation\_Model\_No\_2\_Finalisation\_of\_plant\_layout\_and\_default\_control\_strategy](https://www.researchgate.net/publication/47661244_Benchmark_Simulation_Model_No_2_Finalisation_of_plant_layout_and_default_control_strategy)  
34. Effluent quality EQ index and operation cost index OCI by scatter graph... \- ResearchGate, 访问时间为 六月 9, 2025， [https://www.researchgate.net/figure/Effluent-quality-EQ-index-and-operation-cost-index-OCI-by-scatter-graph-for-all-and-each\_fig21\_372739619](https://www.researchgate.net/figure/Effluent-quality-EQ-index-and-operation-cost-index-OCI-by-scatter-graph-for-all-and-each_fig21_372739619)  
35. Solving Optimal Control Problems with Universal Differential Equations · SciMLSensitivity.jl, 访问时间为 六月 9, 2025， [https://docs.sciml.ai/SciMLSensitivity/dev/examples/optimal\_control/optimal\_control/](https://docs.sciml.ai/SciMLSensitivity/dev/examples/optimal_control/optimal_control/)  
36. Model predictive control \- Wikipedia, 访问时间为 六月 9, 2025， [https://en.wikipedia.org/wiki/Model\_predictive\_control](https://en.wikipedia.org/wiki/Model_predictive_control)  
37. Improved Long Short-Term Memory-based Wastewater Treatment Simulators for Deep Reinforcement Learning \- arXiv, 访问时间为 六月 9, 2025， [https://arxiv.org/html/2403.15091v1](https://arxiv.org/html/2403.15091v1)  
38. Model Predictive Control Of Wastewater Systems Advances In Industrial Control, 访问时间为 六月 9, 2025， [http://www2.centre-cired.fr/95312053/control/need/train/model+predictive+control+of+wastewater+systems+advances+in+industrial+control.pdf](http://www2.centre-cired.fr/95312053/control/need/train/model+predictive+control+of+wastewater+systems+advances+in+industrial+control.pdf)  
39. Machine learning and genetic algorithm for effluent quality optimization in wastewater treatment \- ScholarWorks, 访问时间为 六月 9, 2025， [https://scholarworks.calstate.edu/downloads/w0892m486](https://scholarworks.calstate.edu/downloads/w0892m486)  
40. Enhancing the Performance of a Simulated WWTP: Comparative Analysis of Control Strategies for the BSM2 Model \- MDPI, 访问时间为 六月 9, 2025， [https://www.mdpi.com/2227-7390/11/16/3471](https://www.mdpi.com/2227-7390/11/16/3471)  
41. Data-Driven Differentiable Model for Dynamic Prediction and Control in Wastewater Treatment | Request PDF \- ResearchGate, 访问时间为 六月 9, 2025， [https://www.researchgate.net/publication/391404823\_Data-Driven\_Differentiable\_Model\_for\_Dynamic\_Prediction\_and\_Control\_in\_Wastewater\_Treatment](https://www.researchgate.net/publication/391404823_Data-Driven_Differentiable_Model_for_Dynamic_Prediction_and_Control_in_Wastewater_Treatment)  
42. Metaheuristic assisted neural differential equation modeling in activated sludge process, 访问时间为 六月 9, 2025， [https://www.researchgate.net/publication/384832245\_Metaheuristic\_assisted\_neural\_differential\_equation\_modeling\_in\_activated\_sludge\_process](https://www.researchgate.net/publication/384832245_Metaheuristic_assisted_neural_differential_equation_modeling_in_activated_sludge_process)  
43. First-Order Comprehensive Adjoint Sensitivity Analysis Methodology ..., 访问时间为 六月 9, 2025， [https://scholarcommons.sc.edu/cgi/viewcontent.cgi?article=1895\&context=emec\_facpub](https://scholarcommons.sc.edu/cgi/viewcontent.cgi?article=1895&context=emec_facpub)  
44. Sensitivity Analysis on Loss Landscape \- arXiv, 访问时间为 六月 9, 2025， [https://arxiv.org/html/2403.01128v1](https://arxiv.org/html/2403.01128v1)  
45. MxlPy \- Python Package for Mechanistic Learning in Life Science | bioRxiv, 访问时间为 六月 9, 2025， [https://www.biorxiv.org/content/10.1101/2025.05.06.652335v1.full-text](https://www.biorxiv.org/content/10.1101/2025.05.06.652335v1.full-text)  
46. MxlPy \- Python Package for Mechanistic Learning in Life Science \- bioRxiv, 访问时间为 六月 9, 2025， [https://www.biorxiv.org/content/biorxiv/early/2025/05/10/2025.05.06.652335.full.pdf](https://www.biorxiv.org/content/biorxiv/early/2025/05/10/2025.05.06.652335.full.pdf)  
47. Uncertainpy: A Python toolbox for uncertainty quantification and sensitivity analysis in computational neuroscience | bioRxiv, 访问时间为 六月 9, 2025， [https://www.biorxiv.org/content/10.1101/274779v1.full-text](https://www.biorxiv.org/content/10.1101/274779v1.full-text)  
48. \[2503.08059\] Symbolic Neural Ordinary Differential Equations \- arXiv, 访问时间为 六月 9, 2025， [https://arxiv.org/abs/2503.08059](https://arxiv.org/abs/2503.08059)  
49. \[1806.07366\] Neural Ordinary Differential Equations \- arXiv, 访问时间为 六月 9, 2025， [https://arxiv.org/abs/1806.07366](https://arxiv.org/abs/1806.07366)