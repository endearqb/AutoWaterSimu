# **Kats：时间序列分析综合指南及其在供水与污水处理领域的应用**

## **I. Kats简介：统一的时间序列分析工具包**

时间序列分析是数据科学和工程领域不可或缺的组成部分，它涉及理解数据随时间演变的规律、检测异常、预测未来趋势等。Kats (Kits to Analyze Time Series) 是一个由Facebook（现Meta）基础设施数据科学团队开发的Python工具包，旨在为时间序列分析提供一个轻量级、易于使用且具有普适性的框架 。

### **A. Kats是什么？起源与设计理念**

Kats的设计理念核心是打造一个时间序列分析的“一站式商店” (one-stop shop)，致力于标准化并连接时间序列分析中的不同领域 。这种方法旨在通过在单个库中提供一套全面的工具来简化数据科学家和工程师的工作流程。该工具包于2021年6月左右首次发布并开源 。  
Kats希望成为一个全面的工具包，这一目标通过整合多样化的功能带来了显著的便利性。它覆盖了预测、检测、特征提取和模拟等多个方面 。然而，这种广泛性可能意味着在高度专业化的领域，其深度与专注于单一目的的库相比可能有所不足。用户可能会发现Kats提供的通用实现适用于大多数常见情况，但在特定细分领域寻求最前沿的研究模型时，可能需要寻求其他工具。通用型工具通常优先考虑易用性和广泛的适用性，而非在每个子领域都达到顶尖的专业性能。尽管Kats包含了“先进技术” ，但时间序列研究（尤其是在深度学习等领域）的快速发展意味着专业库可能会更快地整合更新、更小众的模型。因此，虽然Kats在处理各种常见任务以及整合分析的不同阶段方面表现出色，但有非常具体、高级需求（例如，Kats中尚未包含的新型Transformer架构用于预测）的用户可能需要将其作为补充工具。

### **B. 主要优势及目标用户场景**

Kats的主要优势包括其轻量级特性、易用性、普适性和可扩展性 。它致力于成为第一个用于通用时间序列分析的综合性Python库 。  
该工具包适用于多个行业，包括电子商务、金融、容量规划、供应链管理、医药、气象、能源和天文学等 。用户可以利用Kats探索时间序列数据的基本特征、预测未来值、监控异常情况，并将时间序列数据整合到机器学习流程中 。

### **C.核心功能概览**

Kats提供了一系列强大的功能来应对时间序列分析的各种挑战：

* **预测 (Forecasting):** 包含超过10种独立的预测模型、集成学习功能、元学习（用于超参数调整和模型选择）、回测机制以及经验预测区间生成 。  
* **检测 (Detection):** 支持检测时间序列数据中的多种模式，如季节性、异常点、变化点以及趋势的缓慢变化 。  
* **特征提取 (TSFeatures):** 能够从时间序列中提取超过65种具有明确统计学定义的特征，这些特征可用于大多数机器学习模型，如分类和回归任务 。  
* **实用工具 (Utilities):** 包括时间序列模拟器等实用工具，便于用户进行实验和学习 。  
* **多变量分析 (Multivariate Analysis):** Kats的各项功能均支持多变量时间序列数据 。

## **II. Kats入门指南**

本章节将指导用户完成Kats的安装配置，并介绍其核心数据结构TimeSeriesData对象。

### **A. 安装与设置**

Kats可以通过Python的包管理器pip进行安装。标准的安装命令为：  
`pip install kats`

为了避免潜在的依赖冲突并确保获取最新功能，建议首先升级pip：  
`pip install --upgrade pip`

Kats也提供了一个最小化安装选项，该选项会忽略许多依赖项（特别是test\_requirements.txt中列出的用于测试的依赖项），从而减小安装体积。这可以通过设置环境变量来实现：  
`MINIMAL_KATS=1 pip install kats`

或者 (根据部分文档)：  
`MINIMAL=1 pip install kats`

需要注意的是，最小化安装虽然轻便，但会导致许多功能被禁用，并且在导入Kats时可能会产生警告日志 。  
**依赖管理与潜在问题:**  
Kats的完整依赖关系在setup.py文件和test\_requirements.txt文件中有详细说明 。用户，特别是那些需要将Kats集成到现有复杂环境中的用户，可能会在安装过程中遇到挑战。这些挑战通常源于Kats对其某些依赖项（如fbprophet及其底层的pystan，以及scipy和statsmodels）特定版本的要求。  
GitHub上的问题追踪列表明确记录了用户遇到的相关问题，例如fbprophet安装错误（Kats的一个依赖）、scipy和statsmodels固定版本不兼容、Cython和numpy冲突，以及普遍的pip install kats失败等情况 。部分用户甚至请求提供一个不包含fbprophet或其它pystan依赖项的安装选项 ，这进一步表明这些依赖是常见的痛点。  
因此，为了顺利安装Kats并保证其正常运行，强烈建议在隔离的虚拟环境（如conda环境或Python的venv）中进行安装。同时，密切关注并可能需要手动调整相关依赖的版本，以解决潜在的冲突。虽然“最小化安装”提供了一种绕过某些依赖问题的途径，但其功能上的限制使其并非理想的长期解决方案。

### **B. TimeSeriesData对象：Kats的支柱**

TimeSeriesData对象是Kats中用于表示单变量和多变量时间序列的基础数据结构 。几乎所有的Kats功能模块都围绕此对象进行操作。  
**初始化:**  
可以通过多种方式初始化TimeSeriesData对象：

1. **从pandas DataFrame创建:** 最常见的方式是使用一个pandas DataFrame。DataFrame必须包含一个时间列和至少一个数值列。默认情况下，时间列应命名为"time"。如果时间列名称不同，可以通过time\_col\_name参数指定 。  
   `import pandas as pd`  
   `from kats.consts import TimeSeriesData`

   `# 示例DataFrame`  
   `# df = pd.DataFrame({'time': pd.to_datetime(['2023-01-01', '2023-01-02']),`  
   `#                    'value': })`  
   `# ts = TimeSeriesData(df)`

2. **从pandas Series或DatetimeIndex创建:** 也可以直接使用pandas Series（用于时间戳和单变量数值）或DatetimeIndex（用于时间戳）和pandas DataFrame（用于多变量数值）来创建 。  
   `# 单变量示例`  
   `# time_series = pd.Series(pd.to_datetime(['2023-01-01', '2023-01-02']))`  
   `# value_series = pd.Series()`  
   `# ts_univariate = TimeSeriesData(time=time_series, value=value_series)`

   `# 多变量示例`  
   `# value_df = pd.DataFrame({'v1': , 'v2': })`  
   `# ts_multivariate = TimeSeriesData(time=time_series, value=value_df)`

3. **时间格式支持:** TimeSeriesData支持多种时间格式，包括标准的Python datetime对象、pandas.Timestamp对象、字符串（如果格式非标准或为提高效率，可使用date\_format参数指定解析格式）以及Unix时间戳（整数，此时需设置use\_unix\_time=True并可通过unix\_time\_units参数指定单位，如"s"代表秒，默认为"ns"纳秒）。

**关键属性:**

* time: 一个pandas Series对象，存储时间序列的时间值 。  
* value: 一个pandas Series（单变量）或pandas DataFrame（多变量）对象，存储时间序列的数值 。  
* min, max: 时间序列的最小值和最大值（或各变量的最小值/最大值序列）。

**操作:**  
TimeSeriesData对象支持一系列便捷操作，包括：

* **切片 (Slicing):** 选取时间序列的子集。  
* **数学运算 (Mathematical operations):** 支持加、减、乘、除等运算，具体操作在OperationsEnum中定义 。  
* **扩展 (Extend):** 将另一个TimeSeriesData对象附加到当前对象。  
* **绘图 (Plotting):** 内置绘图功能，方便快速可视化。  
* **实用函数 (Utility functions):** 如to\_dataframe()（转换回DataFrame）、to\_array()（转换为NumPy数组）、is\_empty()、is\_univariate()、freq\_infer()（推断频率）、interpolate()（插值处理缺失值）等 。

**数据验证:**  
在初始化时或通过特定方法，TimeSeriesData可以对数据进行验证，例如检查时间频率是否恒定、维度是否一致等 。  
TimeSeriesData对象作为Kats库的核心，起着至关重要的抽象层作用，确保所有模块以统一的格式处理数据。这极大地简化了Kats内部不同功能（如预测、检测）之间的互操作性。然而，对于习惯直接使用pandas DataFrame的用户而言，强制转换为此特定对象可能会增加额外的数据准备步骤。此外，其内置的验证规则（例如关于时间频率的规则）虽然有助于保证输入模型的数据质量，但对于某些原始的、不规则的真实世界数据集，可能会显得较为严格，要求用户进行额外的预处理。Kats也意识到了原始数据并非总是完美的，因此提供了如interpolate()和freq\_infer()等方法来辅助处理这些常见的数据问题 。

## **III. 核心功能：学习指南**

本章节将深入探讨Kats提供的各项核心功能，包括时间序列预测、检测算法、特征提取以及时间序列模拟。

### **A. 使用Kats进行预测**

Kats提供了一个全面的预测工具集，包括超过10种独立的预测模型、集成方法、用于超参数调整和模型选择的元学习模型、回测功能以及经验预测区间的生成能力 。  
**预测模型概览:**  
Kats库中集成了多种预测模型，涵盖了从经典统计模型到现代机器学习方法的广泛范围：

* **经典统计模型:**  
  * **线性模型 (Linear Model):** 基于线性回归进行预测 。  
  * **二次模型 (Quadratic Model):** 使用二次函数拟合趋势进行预测 。  
  * **ARIMA (Autoregressive Integrated Moving Average):** 经典的差分自回归移动平均模型 。  
  * **SARIMA (Seasonal ARIMA):** 考虑了季节性因素的ARIMA模型 。  
  * **Holt-Winters:** 指数平滑方法，能处理趋势和季节性 。  
  * **Theta模型:** 一种表现稳健的分解预测方法 。  
  * **STLF (Seasonal and Trend decomposition using Loess, followed by Forecasting):** 先进行STL分解，再对去季节性序列进行预测 。  
* **现代及机器学习模型:**  
  * **Prophet:** 由Facebook开发，对具有明显季节性和节假日效应的时间序列表现优异，对缺失数据和趋势变化具有鲁棒性 。  
  * **LSTM (Long Short-Term Memory):** 长短期记忆网络，一种递归神经网络，擅长捕捉长期依赖关系 。  
  * **VAR (Vector Autoregression):** 向量自回归模型，用于多变量时间序列预测 。  
  * **贝叶斯VAR (Bayesian VAR):** VAR模型的贝叶斯版本 。  
  * **谐波回归 (Harmonic Regression):** 使用谐波项进行季节性建模的回归方法 。  
  * **全局模型 (Global Model):** Kats 0.2.0版本中新增的基于神经网络的预测模型 。  
  * **即时预测 (Nowcasting):** NowcastingModel 专为短期预测设计 。

**基本预测流程:**  
使用Kats进行预测通常遵循以下步骤：

1. **数据准备:** 将时间序列数据转换为Kats的TimeSeriesData对象。  
2. **参数实例化:** 为所选模型创建参数实例（例如，ProphetParams, SARIMAParams）。  
3. **模型实例化:** 使用数据和参数实例化预测模型（例如，ProphetModel(data, params)）。  
4. **模型拟合:** 调用模型的fit()方法训练模型 。  
5. **生成预测:** 调用模型的predict(steps=N, freq='D')方法进行预测。该方法通常返回一个包含预测值 (fcst) 以及预测上界 (fcst\_upper) 和下界 (fcst\_lower) 的DataFrame 。  
6. **结果可视化:** 调用模型的plot()方法将历史数据和预测结果一同展示 。

**多变量预测:**  
Kats支持多变量时间序列的预测，其中向量自回归（VAR）模型是一个突出的例子 。VARModel接受多变量的TimeSeriesData对象和相应的VARParams（例如，maxlags，trend等参数）。其predict()方法返回一个字典，其中每个键对应一个指标（变量），值为该指标的预测结果（TimeSeriesData对象）。  
在复杂系统（如供水管网）中有效应用VAR模型时，需要仔细考虑哪些变量真正相互影响，以及这些关系是否随时间保持稳定。VAR模型主要捕捉线性相互依赖关系 。然而，在供水系统中，流量、压力和化学浓度等参数之间通常存在相互关联，但这些关系可能并非总是线性的或恒定的（例如，非线性化学反应、管道爆裂的阈值效应）。如果特定模型支持外生变量，或者通过特征工程捕捉非线性关系，则可能对提高预测精度至关重要。  
**短期与长期预测的考量:**  
Kats包含一个专为短期预测设计的NowcastingModel 。该模型采用机器学习方法，并预测未来指定的step步。对于长期预测，模型的选择变得尤为关键。虽然Kats提供了多种模型（如LSTM、Prophet、ARIMA等），但它们对不同预测范围的适用性各不相同。例如，LSTM理论上可以捕捉长期依赖，但也面临挑战 。  
没有任何单一模型能在所有预测时间范围上都表现最佳。模型的选择、特征工程（如果适用）以及超参数调整对长期预测的准确性至关重要。Kats提供的回测功能 对于评估模型在不同预测期（horizon）的表现至关重要。此外，Kats的元学习功能，如MetaLearnModelSelect 和 MetaLearnHPT ，有可能根据时间序列的特性 *和* 期望的预测期来推荐模型或参数，尽管目前的文档主要强调基于特征的推荐。如果这些特征能够隐含地捕捉到某些模型对特定预测期的良好预测能力，那么这将有助于针对不同预测期选择合适的模型。将预测期长度明确作为元特征纳入考量，则是一种更高级的应用。  
**表1：Kats主要预测模型总结**

| 模型名称 (Model Name) | 类型 (Type) | 单/多变量 (Uni/Multivariate) | 主要特性 (Key Characteristics) | 典型用例/预测期 (Typical Use Cases/Horizon) |
| :---- | :---- | :---- | :---- | :---- |
| Prophet | 加法模型 (Additive) | 单变量 (Univariate) | 处理强季节性、节假日效应、趋势变化点、缺失数据；可加入外生回归量 | 商业预测、网站流量、具有多重季节性的数据；短期到长期 |
| ARIMA | 统计模型 (Statistical) | 单变量 (Univariate) | 基于自回归、差分、移动平均；适用于平稳或可差分平稳的序列 | 经典的短期预测模型；金融、经济数据 |
| SARIMA | 统计模型 (Statistical) | 单变量 (Univariate) | ARIMA的扩展，能显式处理季节性模式 | 具有明显季节性的数据，如月度销售额、季度指标；短期到中期 |
| Holt-Winters | 指数平滑 (Exponential Smoothing) | 单变量 (Univariate) | 捕捉趋势和季节性 | 具有趋势和季节性的数据；短期到中期 |
| LSTM | 神经网络 (Neural Network) | 单/多变量 (Uni/Multivariate) | 捕捉复杂的非线性模式和长期依赖关系 | 复杂时间序列，如传感器数据、天气预测；需要较多数据；中长期预测，但长期依赖捕捉仍有挑战 |
| VAR | 统计模型 (Statistical) | 多变量 (Multivariate) | 捕捉多个时间序列之间的线性相互依赖关系 | 经济系统建模、多个相关指标的联合预测；短期到中期 |
| Nowcasting | 机器学习 (Machine Learning) | 单变量 (Univariate) | 专为非常短期的预测设计，预测未来指定的step步 | 实时监控、即时需求预测；极短期 |
| Theta | 分解与指数平滑 (Decomposition & Exp. Smoothing) | 单变量 (Univariate) | 简单有效，尤其适用于短期预测和季节性数据 | 短期预测，广泛适用于多种时间序列 |
| Linear Model | 回归 (Regression) | 单变量 (Univariate) | 基于线性趋势进行预测 | 具有明显线性趋势的简单序列；短期 |
| Quadratic Model | 回归 (Regression) | 单变量 (Univariate) | 基于二次趋势进行预测 | 具有非线性（二次）趋势的序列；短期 |
| Global Model | 神经网络 (Neural Network) | 单/多变量 (Uni/Multivariate) | Kats 0.2.0版本引入的神经网络模型，具体特性需查阅更新文档 | 可能适用于多种预测场景，具体取决于其架构和训练数据 |
| STLF | 分解与预测 (Decomposition & Forecasting) | 单变量 (Univariate) | STL分解后对去季节性序列进行预测（如ARIMA） | 具有复杂季节性模式的时间序列；短期到中期 |
| KatsEnsemble | 集成学习 (Ensemble) | 单/多变量 (Uni/Multivariate) | 结合多个基础模型的预测，可选择聚合方法（中位数、加权平均），可进行STL分解 | 提高预测的鲁棒性和准确性，适用于多种预测期 |

### **B. Kats中的检测算法**

Kats提供了一系列检测算法，用于识别时间序列中的各种模式，包括季节性、异常点、变化点以及趋势的缓慢变化 。  
**异常点检测 (Outlier Detection):**

* OutlierDetector: 这是一个单变量异常点检测算法，其行为类似于R语言中的异常点检测方法。它使用加法或乘法分解（通过decomp参数指定，默认为'additive'），并基于四分位距（IQR）的倍数（通过iqr\_mult参数控制，默认为3.0）来识别异常点 。检测到的异常点存储在对象的self.outliers属性中。该检测器还提供了remover(interpolate=True)方法，可以用线性插值法填充或移除异常点 。  
* MultivariateAnomalyDetector: 该检测器基于指标的联合分布来检测多变量时间序列中的异常点。目前支持使用向量自回归（VAR）和贝叶斯VAR模型进行检测 。使用此检测器前，通常需要对数据进行去季节性和去趋势处理。它返回各个指标的异常得分以及整体的异常得分。

**变化点检测 (Change Point Detection \- CPD):**  
变化点检测旨在识别时间序列中统计特性发生显著改变的时间点 。

* CUSUMDetector (累积和检测器): 用于检测时间序列均值的向上或向下偏移。该算法假设时间序列中最多只存在一个增加的变化点和一个减少的变化点，并且在进行对数似然比检验时假定数据服从高斯分布 。  
  * **主要参数:** threshold (显著性水平，默认0.01), max\_iter (最大迭代次数), delta\_std\_ratio (均值变化与标准差的比率阈值), min\_abs\_change (最小绝对变化量), change\_directions (检测的变化方向，如\['increase', 'decrease'\]), interest\_window (感兴趣的时间窗口)。  
  * **输出:** 返回一个包含TimeSeriesChangePoint对象（变化点的时间戳）和CUSUMMetadata对象（包含变化方向、变化点索引、变化前后均值mu0和mu1、对数似然比LLR、p值等信息）的列表 。  
* BOCPDetector (贝叶斯在线变化点检测器): 这是一种在线算法，即它会根据新流入的数据点实时更新对变化点发生的概率判断 。用户需要指定变化点的先验概率 (changepoint\_prior) 以及用于生成各段数据的底层概率模型。  
  * **支持的底层模型 (model参数):** NORMAL\_KNOWN\_MODEL (已知方差的正态模型，用于检测水平漂移), TREND\_CHANGE\_MODEL (假设各段由普通线性回归生成，用于检测趋势变化), POISSON\_PROCESS\_MODEL (泊松生成模型，用于计数数据)。  
  * **其他参数:** model\_parameters (对应模型的特定参数), lag (报告变化点的延迟), threshold (报告变化点的概率阈值)。  
  * **输出:** 返回TimeSeriesChangePoint对象和BOCPDMetadata对象的列表。  
* StatSigDetector (统计显著性检测器): 虽然具体细节在提供的摘要中不突出，但它被提及为Kats中的一种变化点检测算法 。  
* RobustStatDetector (鲁棒统计检测器): 另一种变化点检测算法，可能对异常点不那么敏感 。它在移动平均上使用z-score进行检测 。  
  * **参数:** p\_value\_cutoff (p值截断点), comparison\_window (比较窗口大小) 。

**趋势检测 (Trend Detection):**

* MKDetector (Mann-Kendall检测器): 这是一种非参数统计检验方法，用于检测时间序列中是否存在单调趋势（即持续增加或持续减少）。可以设置一个滑动窗口 (window\_size)进行序贯检测。  
  * **参数:** threshold (趋势强度阈值，默认0.8), alpha (显著性水平，默认0.05)。  
  * **输出:** 返回趋势方向（增加、减少或无趋势）、p值和Kendall Tau统计量。

**季节性检测 (Seasonality Detection):**

* Kats在kats.detectors.seasonality模块中提供了ACFDetector（基于自相关函数）和FFTDetector（基于快速傅里叶变换）用于检测季节性 。

**基于Prophet的检测:**

* ProphetDetectorModel: 该检测器利用Prophet模型预测未来数据点的一个置信区间，然后将实际观测值与该区间进行比较，以识别异常点 。  
  * **参数:** strictness\_factor (对应Prophet的interval\_width，控制区间宽度), uncertainty\_samples (Prophet用于计算不确定性区间的样本数)。

**解读检测器输出:**  
Kats检测算法的输出通常包含检测到的点（时间戳）、置信度得分、以及特定于检测器的元数据。例如，CUSUMMetadata提供了变化方向、幅度（delta）、对数似然比（LLR）和p值 。大多数检测器还提供了绘图功能，以便于结果的可视化 。  
Kats提供的检测算法在透明度方面存在差异。像CUSUM和MK-Test这样的算法，其检测逻辑和输出（如均值变化、p值）相对直观，易于理解为何将某个点标记为异常或变化点 。而像ProphetDetector（依赖Prophet模型的预测区间 ）或MultivariateAnomalyDetector（基于VAR模型分析联合分布 ）这类模型驱动的检测器，其内部决策过程可能更像一个“黑箱”。虽然BOCPD的“变化点概率”输出具有贝叶斯解释性，但理解先验和模型选择的相互作用需要更深入的统计知识 。在诸如水质监测等关键应用领域，初期可能更倾向于选择可解释性更强的检测器，或者需要为复杂检测器的输出配备事后解释方法，以便用户能够信任并基于检测结果采取行动。  
**表2：Kats主要检测算法总结**

| 算法名称 (Algorithm Name) | 检测类型 (Detection Type) | 主要参数 (Key Parameters) | 输出解读 (Output Interpretation) |
| :---- | :---- | :---- | :---- |
| OutlierDetector | 单变量异常点 (Univariate Outlier) | decomp ('additive'/'multiplicative'), iqr\_mult | 标记的异常点列表/时间戳，可通过插值移除 |
| MultivariateAnomalyDetector | 多变量异常点 (Multivariate Anomaly) | model\_type ('VAR'/'BAYESIAN\_VAR'), VAR模型参数 | 各指标及整体的异常得分，需要预先去季节性和去趋势 |
| CUSUMDetector | 均值变化点 (Mean Shift Changepoint) | threshold, max\_iter, delta\_std\_ratio, min\_abs\_change, change\_directions, interest\_window | 变化点时间、方向、幅度(\\Delta\\mu)、LLR、p值 |
| BOCPDetector | 在线变化点 (Online Changepoint) | model (NORMAL, TREND, POISSON), model\_parameters, lag, changepoint\_prior, threshold | 变化点时间、后验概率、所用模型元数据 |
| RobustStatDetector | 鲁棒变化点 (Robust Changepoint) | p\_value\_cutoff, comparison\_window | 变化点时间、基于移动窗口z-score的检测结果 |
| MKDetector | 单调趋势 (Monotonic Trend) | window\_size, threshold (趋势强度), alpha (显著性水平) | 趋势方向 ('increasing', 'decreasing', 'no trend')、p值、Kendall Tau统计量 |
| ACFDetector / FFTDetector | 季节性 (Seasonality) | 特定于ACF或FFT的参数 (如显著性阈值、周期范围) | 检测到的季节周期长度、强度等 |
| ProphetDetectorModel | 基于模型的异常点 (Model-based Anomaly) | strictness\_factor (Prophet区间宽度), uncertainty\_samples | 超出Prophet预测区间的点被标记为异常，返回异常得分 |

### **C. 使用TSFeatures进行特征提取**

Kats的TSFeatures模块 (kats.tsfeatures.tsfeatures) 能够从时间序列数据中提取超过65种具有明确统计学定义的特征，这些特征可用于机器学习模型的输入，从而辅助预测、分类等任务 。  
**使用方法:**

1. **初始化类:** model \= TsFeatures() 。  
2. **转换数据:** output\_features \= model.transform(ts\_object)，其中ts\_object是一个TimeSeriesData实例。该方法返回一个包含所有提取特征及其值的字典 。  
3. **选择特征:** 可以在初始化TsFeatures时通过设置布尔型参数（如seasonality\_strength=False, stl\_features=False）来排除特定的特征或特征组的计算，或者通过selected\_features参数传入一个希望计算的特征名称列表 。  
4. **特征组映射:** TsFeatures对象有一个feature\_group\_mapping属性，它是一个字典，显示了单个特征是如何被捆绑到逻辑特征组中的 。

**可提取的特征及特征组 (部分列举，基于文档):**  
Kats的TSFeatures模块提供了丰富的特征集，以下是一些关键特征和特征组的概述，其具体计算可能依赖于如window\_size（滑动窗口长度）、stl\_period（STL分解周期）、acfpacf\_lag（ACF/PACF最大滞后）等参数 ：

* **基本统计特征 (statistics组):**  
  * length: 时间序列的长度。  
  * mean: 均值。  
  * var: 方差。  
  * std: 标准差。  
* **熵相关特征:**  
  * entropy: 基于谱分析的香农熵，衡量序列的复杂性或随机性（使用spectral\_freq参数）。  
  * count\_entropy: 基于计数分布的熵。  
* **STL分解特征 (stl\_features组):** 基于Loess的季节性和趋势分解。  
  * seasonal\_strength: 季节性强度。  
  * trend\_strength: 趋势强度。  
  * spikiness: 残差的尖峰程度。  
  * linearity: 趋势的线性程度。  
  * curvature: 趋势的弯曲程度。  
  * stl\_e\_acf1, stl\_e\_acf10: STL分解后残差的自相关系数。  
  * peak, trough: 季节性峰值和谷值的位置。  
* **波动性与稳定性特征 (与level\_shift\_features相关):**  
  * lumpiness: 基于滑动窗口计算的方差的方差，衡量方差的聚集程度。  
  * stability: 基于滑动窗口计算的均值的方差，衡量均值的稳定性。  
* **平坦段特征:**  
  * flat\_spots: 使用nbins参数将序列分箱后，值保持不变的平坦段数量。  
* **Hurst指数:**  
  * hurst: 衡量时间序列的长期记忆性或持久性（使用lag\_size参数）。  
* **导数相关特征:**  
  * std1st\_der: 一阶差分的标准差。  
* **跨越点特征:**  
  * crossing\_points: 时间序列穿过其中位数的次数。  
* **二值化特征:**  
  * binarize\_mean: 高于均值的观测值所占的比例。  
* **单位根检验特征:**  
  * unitroot\_kpss: KPSS单位根检验的统计量。  
  * unitroot\_pp: Phillips-Perron单位根检验的统计量。  
* **异质性特征:**  
  * heterogeneity: 与方差变异性相关的特征。  
* **ACF/PACF特征 (acfpacf\_features组):**  
  * y\_acf1, y\_acf5 (前5个ACF的平方和), diff1y\_acf1 (一阶差分序列的ACF1), diff1y\_acf5, diff2y\_acf1, diff2y\_acf5。  
  * y\_pacf5 (前5个PACF的平方和), diff1y\_pacf5, diff2y\_pacf5。  
  * seas\_acf1, seas\_pacf1 (季节性ACF/PACF，使用period参数)。  
* **特殊自相关特征 (special\_ac组):**  
  * firstmin\_ac: 自相关函数第一个极小值出现的时间。  
  * firstzero\_ac: 自相关函数第一次穿过零点的时间。  
* **Holt及Holt-Winters模型参数特征:**  
  * holt\_params组: holt\_alpha (水平平滑参数), holt\_beta (趋势平滑参数)。  
  * hw\_params组: hw\_alpha, hw\_beta, hw\_gamma (季节性平滑参数)。  
* **ARCH统计量特征:**  
  * arch\_stat, arch\_lm: Engle's LM检验，用于检测自回归条件异方差（ARCH）效应。  
* **基于检测器的特征:**  
  * cusum\_detector组: cusum\_num (变化点数量), cusum\_conf (置信度), cusum\_cp\_index (变化点索引), cusum\_delta (均值变化量), cusum\_llr (对数似然比)。  
  * robust\_stat\_detector组: robust\_num\_cps (变化点数量), robust\_metric\_mean。  
  * bocp\_detector组: bocp\_num (变化点数量), bocp\_conf\_max (最大置信度), bocp\_conf\_mean (平均置信度)。  
  * outlier\_detector组: num\_outliers (异常点数量), pct\_outliers (异常点百分比) (使用decomp, iqr\_mult参数)。  
  * trend\_detector组: num\_trends (趋势数量), num\_increasing\_trends (上升趋势数量), mean\_abs\_tau (平均绝对Tau值) (使用threshold参数)。  
* **即时预测特征 (nowcasting组):** 使用window, n\_fast, n\_slow参数。  
  * roc\_1 (变化率), ma\_1 (移动平均), mom\_1 (动量), lag\_1 (滞后值)。  
  * macd, macdsignal, macdhist (MACD指标相关特征)。  
* **季节性特征 (seasonalities组):**  
  * seasonal\_period: 检测到的季节周期。  
  * trend\_mag: 趋势幅度（斜率）。  
  * seasonality\_mag: 季节性幅度（季节性成分的95%和5%分位数之差）。  
  * residual\_std: 残差标准差。  
* **其他:** nonlinearity (非线性度), sparsity (稀疏度) 。

尽管Kats提供了超过65种特征，功能强大，但这可能导致“维度灾难”或多重共线性问题，如果所有特征都被简单地输入到下游的机器学习模型中。有效的特征选择或降维技术对于获得最佳性能和可解释性至关重要。许多特征之间可能存在相关性（例如，不同滞后阶数的ACF，或衡量趋势强度的不同指标）。将大量可能相关的特征输入机器学习模型，可能导致过拟合、计算成本增加以及模型系数难以解释。因此，用户不应仅仅提取所有特征，而应结合领域知识或自动化的特征选择方法（例如，基于树模型的特征重要性评分，或使用PCA等技术）来为特定任务选择一个相关且非冗余的子集。Kats本身似乎除了排除特征组外，并未提供高级的特征选择工具，因此这通常需要用户在Kats之外进行操作。  
**表3：Kats TSFeatures主要特征及特征组**

| 特征/特征组 (Feature/Group Name) | 描述 (Description) | 主要相关参数 (Key Parameters Involved) | 示例用途 (Example Use Case) |
| :---- | :---- | :---- | :---- |
| length, mean, var | 基本统计量 | \- | 描述序列的基本分布特性 |
| entropy | 谱熵，衡量序列复杂度 | spectral\_freq | 评估序列的可预测性 |
| stl\_features | STL分解后的趋势强度、季节强度、尖峰度等 | stl\_period | 量化趋势和季节性影响，分析残差特性 |
| lumpiness, stability | 序列的块效应（方差的方差）和稳定性（均值的方差） | window\_size | 衡量序列的变异性模式 |
| hurst | Hurst指数，衡量长期记忆性 | lag\_size | 判断序列是均值回归、随机游走还是趋势增强 |
| acfpacf\_features | 自相关和偏自相关函数在不同滞后阶数的值 | acfpacf\_lag, period | 识别ARIMA模型的阶数，理解序列的短期依赖结构 |
| holt\_params, hw\_params | Holt及Holt-Winters指数平滑模型的拟合参数 | period | 理解指数平滑模型如何捕捉序列的水平、趋势和季节性 |
| arch\_stat | ARCH效应的检验统计量 | \- | 判断序列是否存在波动率聚集现象 |
| cusum\_detector | CUSUM检测器输出的特征，如变化点数量、置信度 | CUSUM参数 | 将变化点信息作为特征输入模型 |
| outlier\_detector | 异常点检测器输出的特征，如异常点数量和比例 | decomp, iqr\_mult | 将异常点信息作为特征 |
| nowcasting | 用于即时预测的特征，如ROC, MA, MOM, MACD等 | window, n\_fast, n\_slow | 为短期预测模型提供输入特征 |
| seasonalities | 季节性检测器输出的特征，如季节周期、季节强度 | \- | 量化序列的季节性模式 |

### **D. 时间序列模拟**

Kats提供了一个时间序列模拟器kats.utils.simulator.Simulator，用于生成合成的时间序列数据，这对于学习、实验、测试检测算法以及理解模型在受控条件下的行为非常有用 。  
**模拟器功能:**

* **初始化:** 可以使用序列长度 (n)、频率 (freq，如 'D' 代表每日) 和开始日期 (start) 来初始化模拟器 。  
* **基于STL的模拟 (stl\_sim()):** 通过组合趋势、季节性和噪声成分来生成序列 。  
  * add\_trend(): 可添加线性或S型趋势。  
  * add\_seasonality(): 可添加指定周期和幅度的加法或乘法季节性。  
  * add\_noise(): 可添加加法或乘法高斯噪声。  
* **ARIMA模型模拟 (arima\_sim()):** 根据给定的AR和MA系数、漂移项和预热期来模拟ARIMA过程 。  
* **水平漂移模拟 (level\_shift\_sim()):** 生成具有突变水平变化的时间序列。用户可以指定变化点的位置 (cp\_arr) 和每个分段的水平值 (level\_arr)。此方法还可以加入噪声、季节性和异常点（通过anomaly\_arr指定位置，z\_score\_arr指定异常程度）。level\_shift\_multivariate\_indep\_sim()则用于生成多变量的独立水平漂移序列。  
* **趋势漂移模拟 (trend\_shift\_sim()):** 生成具有趋势突变的时间序列。与水平漂移类似，可以指定变化点位置 (cp\_arr) 和各分段的趋势斜率 (trend\_arr)，并可加入噪声、季节性和异常点 。

模拟器不仅仅是用来生成简单的示例数据，它更是一个强大的工具，可以通过创建具有已知真实情况（例如特定类型的异常、变化点幅度、噪声水平）的多样化场景，来严格测试Kats检测算法的鲁棒性和敏感性。模拟器能够生成具有精确控制的异常、水平漂移和趋势变化（包括其幅度和位置）的数据 。Kats中的检测算法（如CUSUM、BOCPD、OutlierDetector等）具有多种控制其敏感性的参数 。通过生成具有不同特征的合成数据集，并使用不同参数设置应用检测器，用户可以系统地评估检测准确性（真阳性、假阳性、假阴性）、对异常/变化幅度的敏感性、对噪声的鲁棒性以及检测延迟。这使得在将检测器应用于真实的、未标记的数据之前，能够以更有原则的方式调整检测器参数并了解其性能范围。

## **IV. Kats中的高级主题**

本章节将探讨Kats中的一些高级功能，包括超参数调整、模型选择策略、集成技术以及回测和交叉验证。

### **A. 超参数调整**

Kats为用户提供了对其预测模型进行超参数调整的支持 。  
**网格搜索 (Grid Search):**  
Kats支持网格搜索方法，它会尝试用户定义的参数组合，以找到最优的参数设置 。这种方法通常与回测结合使用，即对每一组参数组合，都通过回测来评估其在历史数据上的性能 。  
**MetaLearnHPT模块:**  
Kats提供了一个名为MetaLearnHPT的模块，它采用元学习框架来推荐超参数 。

* 该模块使用一个多任务神经网络，以时间序列的特征作为输入，输出对应预测模型的推荐超参数 。  
* 用户可以使用历史数据（时间序列特征及其对应的“最佳”超参数）来训练这个元学习器，或者使用为Kats中默认预测模型（如 'arima', 'sarima', 'theta', 'prophet', 'holtwinters', 'stlf'）预训练好的元模型 。  
* MetaLearnHPT类的主要方法包括：build\_network() (构建神经网络)、train() (训练网络)、pred() (为新的时间序列预测超参数)、save\_model() 和 load\_model() 。  
* 训练元学习器的参数包括学习率、训练轮数、批大小、优化器类型（'SGD', 'Adam'）等 。

**参数搜索空间:**  
Kats中的许多模型都提供了获取默认参数搜索空间的方法（例如，STLFModel 、VARModel 、HoltWintersModel 等模型中的get\_parameter\_search\_space()静态方法）。这些默认的搜索空间可以被kats.utils.parameter\_tuning\_utils模块中的工具使用，以辅助参数调整过程 。  
尽管MetaLearnHPT是一个高级功能，但其实际效用在很大程度上取决于元训练数据集（时间序列特征及其“最佳”超参数）的质量和多样性。如果元学习器的训练数据不能很好地代表用户特定领域的时间序列特征（例如，供水数据与Facebook的基础设施数据特性可能差异很大），那么其推荐的超参数可能并非最优。Kats为MetaLearnHPT提供了一些默认模型 ，这暗示了Meta进行了一些预训练。然而，这些预训练元模型对各种外部数据集的适用范围从现有摘要中尚不完全清楚。相比之下，传统的网格搜索结合回测 ，虽然计算成本可能更高，但它直接针对用户的特定数据和问题进行优化，因此在没有合适的、针对性的元模型时，可能是更可靠且直接的获取良好超参数的途径。

### **B. 模型选择策略**

选择合适的预测模型对特定时间序列至关重要。Kats提供了以下机制来辅助模型选择：

* **回测 (Backtesting):** 用户可以利用Kats的回测工具比较不同模型在历史数据上的表现，并根据均方误差（MSE）、平均绝对百分比误差（MAPE）等评估指标来选择性能最佳的模型 。  
* **MetaLearnModelSelect模块:** 与MetaLearnHPT类似，该模块运用元学习方法，根据时间序列的特征来推荐合适的预测模型 。它可以被训练来判断在一个预定义的模型池中，哪个模型最有可能在给定的时间序列上表现最好。  
* **模型比对 (Model Fight):** 在Kats的教程中，经常会演示将多个模型应用于同一数据集，然后比较它们的预测准确性，从而为该特定序列选择最佳模型 。

### **C. 集成技术**

集成学习通过结合多个模型的预测结果来提高整体预测性能和鲁棒性。Kats对此提供了支持 。

* KatsEnsemble类允许用户指定一个基础学习器模型列表（及其各自的参数）和一个聚合方法（例如，中位数聚合或加权平均聚合）。  
* 如果检测到季节性，KatsEnsemble还可以在应用基础学习器之前执行STL分解（加法或乘法模式）。

### **D. 回测与交叉验证**

严格评估模型性能是时间序列分析的关键环节。Kats拥有一个专门的回测模块kats.utils.backtesters 。

* 该模块支持多种回测策略，包括：  
  * 简单的训练集-测试集划分。  
  * 固定窗口回测 (Fixed Window)。  
  * 扩展窗口回测 (Expanding Window)。  
  * 滚动窗口回测 (Rolling Window) 。  
* CrossValidation类专门用于执行扩展窗口和滚动窗口的交叉验证 。  
* 回测和交叉验证的结果（如MAE, MAPE, MSE, RMSE, SMAPE等误差指标）不仅用于评估模型的最终性能，也是超参数调整过程中的重要依据 。

## **V. Kats在供水与污水处理领域的应用**

Kats工具包凭借其全面的时间序列分析能力，在供水与污水处理行业展现出巨大的应用潜力。本章节将结合行业特定需求和Kats的功能，探讨其在水务领域的具体应用场景。

### **A. 供水需求预测**

准确预测城市每日、每小时或季节性的用水需求对于运营规划、水资源优化配置以及基础设施管理至关重要 。  
**相关Kats模型:**

* Prophet: 对于具有明显日、周、年季节性以及节假日效应的用水量数据表现优异，且对缺失数据和趋势变化具有鲁棒性 。在水务领域，Prophet常被用作基准模型或用于需求数据的异常检测 。  
* SARIMA: 适用于具有清晰自回归、差分、移动平均成分及季节性的时间序列，如周期性的用水模式 。  
* LSTM: 若有充足的历史数据，LSTM能够捕捉复杂的非线性用水模式和长期依赖关系 。  
* HoltWinters: 适用于同时存在趋势和季节性的用水数据 。  
* KatsEnsemble: 通过组合例如Prophet和SARIMA等多个模型的预测结果，可以提高用水需求预测的稳定性和准确性 。  
* NowcastingModel: 可用于非常短期（例如未来几小时）的用水需求预测 。

**TSFeatures应用:**  
可以从历史用水量数据中提取如季节性强度、趋势特征、ACF/PACF等特征。这些特征既可以为模型选择提供依据，也可以作为基于机器学习的预测模型（如果未使用端到端的深度学习模型）的输入变量。  
在供水需求预测中，一个重要的考量因素是外生变量的影响。用水需求往往受到天气条件（如温度、降雨量）和特殊事件（如节假日、大型活动）等外部因素的显著影响 。虽然Kats的核心模型主要关注单变量时间序列的历史数据，但其内置的ProphetModel允许加入额外的回归量（regressors），从而可以直接整合这些外部影响因素。对于其他不直接支持外生变量的经典单变量模型，一种策略是先用Kats预测基础需求，然后利用外生变量对预测残差进行建模，或者采用两阶段的建模方法。此外，如果这些影响因素本身也是时间序列数据（例如每日最高气温序列），Kats的VARModel（向量自回归模型） 可以用于对多个相关时间序列进行联合建模。这突显出在实际应用中，用户可能需要将Kats与其它库结合使用，或充分利用其更灵活的模型（如Prophet或VAR）来全面捕捉复杂的系统动态。

### **B. 水质监测与异常检测**

对供水系统中的关键水质参数（如浊度、pH值、溶解氧(DO)、余氯、电导率等）进行实时监测和异常检测，对于及时发现污染事件、设备故障或处理工艺异常至关重要，是保障饮用水安全的核心环节 。  
**相关Kats检测器:**

* OutlierDetector: 可用于发现单个传感器读数中的异常尖峰或骤降，例如水质参数的瞬时超标 。  
* CUSUMDetector: 能够有效检测水质参数均值的持续性偏移，这可能指示水源变化、处理效果下降或潜在的持续性微量污染 。  
* BOCPDetector: 适用于在线监测水质数据流，在新数据进入时实时检测参数的变化。  
* ProphetDetector: 可以通过Prophet模型建立水质参数的正常波动范围，并标记出超出该范围的异常情况 。  
* MultivariateAnomalyDetector: 可用于分析多个水质参数的联合行为，例如pH值和溶解氧同时发生异常变化，可能指示更复杂的生化反应或污染事件 。

**预测用于主动管理:**  
利用ARIMA（如在中应用于浊度预测）或LSTM等模型对水质参数进行短期预测，可以为水厂运营人员提供预警，以便提前采取调整措施，防范水质恶化。  
水质传感器数据在实际应用中往往存在噪声、缺失值以及采样频率不规则等问题 。Kats的TimeSeriesData对象提供的插值功能（interpolate()）和频率推断功能（freq\_infer()），结合OutlierDetector等工具提供的异常点移除或平滑能力 ，构成了在应用检测或预测模型之前至关重要的数据预处理步骤。Kats在水质监测领域的有效应用，将高度依赖于对原始传感器数据流进行的稳健预处理。

### **C. 污水流入量预测**

准确预测污水处理厂的每小时或每日污水流入量，对于优化处理厂的运营调度、降低能耗以及有效应对降雨事件（特别是降雨诱导的入流入渗，RDII）引起的高峰负荷具有重要意义 。  
**相关Kats模型:**

* SARIMA: 由于污水流入量通常表现出强烈的每日和每周季节性模式，SARIMA模型常被用于此类预测 。  
* LSTM: 能够捕捉复杂的非线性动态以及降雨等外部因素对流入量的影响，在污水处理应用中，其性能往往优于传统模型 。  
* Prophet: 可以处理多重季节性，并且能够方便地引入外部回归量（例如，降雨量数据）。  
* VARModel: 如果需要同时预测污水流入量以及相关的气象参数（如降雨量），VAR模型是一个合适的选择。

**TSFeatures应用:**  
可以从历史污水流入数据中提取季节性强度、与降雨量序列的滞后相关性（如果降雨量作为独立序列处理）以及趋势等特征，为模型选择或机器学习模型的输入提供信息。

### **D. 设备预测性维护**

通过分析水厂和污水厂中泵、电机、管道及其他关键设备的传感器数据（如振动、压力、温度、流量），可以预测潜在故障，从而实现主动维护，减少非计划停机时间，延长设备寿命 。  
**Kats应用:**

* **TSFeatures:** 从传感器数据中提取统计特征（例如，振动信号的均值、方差、峭度；压力数据的趋势、水平漂移等），这些特征可以作为设备健康状态的指标，或输入到机器学习模型中用于估计剩余使用寿命（RUL）。TSFeatures模块包含如std1st\_der（一阶导数标准差）、level\_shift\_features（水平漂移特征）、trend\_detector（趋势检测特征）等可能相关的特征 。  
* **异常检测:**  
  * 在振动或压力数据上使用OutlierDetector或CUSUMDetector来检测可能预示初期故障（如轴承磨损、管道应力异常）的突然尖峰或漂移 。CUSUMDetector在管道压力异常检测方面有提及 。  
  * 使用TrendDetector (MKDetector)识别传感器读数中指示设备逐渐退化的趋势。  
* **预测:** 预测传感器数值，以便判断何时可能超出正常运行阈值。

Kats提供了强大的时间序列分析工具（特征提取、异常检测、预测）。要构建一个完整的预测性维护解决方案，这些工具的输出通常需要整合到一个更大的决策框架或专门的状态监测与维护管理系统（CMMS）中。Kats可以作为早期故障检测的分析引擎。例如，TSFeatures可以从原始传感器数据生成健康指标 ，而Kats的检测器可以标记这些指标何时出现异常行为 。然而，将特定的异常模式（例如，振动频谱特征的变化）与特定的故障模式（例如，轴承剥落与不平衡）联系起来，通常需要领域专业知识或在标记了故障数据的机器学习模型（如分类模型）上进行进一步训练。这超出了Kats的直接范围，但Kats提取的特征可以作为这些后续模型的输入。因此，Kats在预测性维护中扮演着一个强大的初始分析层角色，其分析结果将为更广泛的维护决策系统提供支持。

### **E. 管网泄漏检测与异常诊断**

通过分析供水管网中不同监测点的压力和流量数据，可以识别可能指示管道爆裂、泄漏或未经授权用水的异常情况 。  
**相关Kats检测器:**

* CUSUMDetector: 对于检测可能预示新泄漏或爆管的压力突然持续下降或流量突然持续增加非常有效 。  
* OutlierDetector: 用于标记孤立的极端压力/流量读数。  
* BOCPDetector: 适用于在线监测流量/压力数据，以便在变化发生时及时检测。  
* StatSigDetector 或 RobustStatDetector: 用于识别与正常运行条件存在统计显著差异的偏差。

**TSFeatures应用:**  
诸如level\_shift\_features（水平漂移特征）或trend\_detector（趋势检测特征）等特征可以帮助识别可能指示缓慢发展的泄漏的更渐进的变化。  
**表4：Kats在供水与污水处理领域的应用与工具映射**

| 应用领域 (Application Area) | 关键数据类型 (Key Data Types) | 相关Kats工具 (Relevant Kats Tools) | 示例Kats参数/配置说明 (Example Kats Parameters/Configuration Notes) |
| :---- | :---- | :---- | :---- |
| 供水需求预测 (Water Demand Forecasting) | 日/小时用水量、季节性数据 (Daily/hourly consumption, seasonal data) | Prophet, SARIMA, LSTM, HoltWinters, KatsEnsemble, NowcastingModel | Prophet: seasonality\_mode, holidays; SARIMA: (p,d,q)(P,D,Q,s); LSTM: hidden\_size, num\_layers |
| 水质监测与异常检测 (Water Quality Monitoring & Anomaly Detection) | 浊度、pH、溶解氧、余氯、电导率等实时序列 (Real-time turbidity, pH, DO, chlorine, conductivity series) | OutlierDetector, CUSUMDetector, BOCPDetector, ProphetDetector, MultivariateAnomalyDetector, ARIMA (for forecasting) | OutlierDetector: iqr\_mult; CUSUM: threshold, change\_directions; MultivariateAnomalyDetector: VARParams |
| 污水流入量预测 (Wastewater Inflow Forecasting) | 小时/日流入量、降雨量数据 (Hourly/daily inflow, rainfall data) | SARIMA, LSTM, Prophet (with rainfall as regressor), VARModel | LSTM: 考虑降雨等外生变量的输入结构；Prophet: add\_regressor |
| 设备预测性维护 (Predictive Maintenance of Equipment) | 振动、压力、温度、流量传感器数据 (Vibration, pressure, temperature, flow sensor data) | TSFeatures, OutlierDetector, CUSUMDetector, MKDetector | TSFeatures: 提取与设备健康相关的统计特征；CUSUM: delta\_std\_ratio (用于检测压力或振动信号的显著变化) |
| 管网泄漏检测 (Leak Detection in Distribution Networks) | 压力、流量监测点数据 (Pressure, flow rate data from network nodes) | CUSUMDetector, OutlierDetector, BOCPDetector, TSFeatures (level\_shift\_features) | CUSUM: interest\_window (关注特定管段), min\_abs\_change (检测微小泄漏) |

## **VI. Kats的已知局限性**

尽管Kats是一个功能强大的工具包，但在使用过程中也应注意其潜在的局限性：

* **检测器假设:**  
  * CUSUMDetector假定时间序列中最多只有一个增加和一个减少的变化点，并且在进行假设检验时依赖高斯分布 。这对于具有多个变化点或非高斯特性的序列可能存在局限。  
* **异常检测的敏感性与调参:**  
  * 一些对比研究（例如Kats与Avora的比较）表明，Kats的某些异常检测算法可能对较小幅度的变化不够敏感，并且在某些检测器中缺乏易于调整的敏感性参数 。如果需要检测细微的异常，这可能是一个缺点。  
  * ProphetDetector的敏感性与Prophet模型的interval\_width参数相关 ，需要仔细调整。  
* **安装与依赖问题:**  
  * 用户报告了安装问题，通常与fbprophet、pystan、scipy和statsmodels等依赖项的版本冲突有关 。这表明需要谨慎管理Python环境。  
* **通用模型局限性:**  
  * 虽然Kats功能全面，但它可能并不总是包含专业库中最新的、高度特化的研究模型。  
  * 对TimeSeriesData对象的依赖，虽然标准化了接口，但可能给用户带来额外的数据准备工作。  
* **多变量异常检测:**  
  * MultivariateAnomalyDetector要求在检测前对数据进行去季节性和去趋势处理 ，这增加了预处理的负担。

Kats作为通用工具包的优势在于其广泛的适用性，但这也意味着其单个组件在高度特定的场景下，可能不如那些专注于特定任务的专用库那样优化或功能丰富。例如，虽然Kats拥有多种检测器，但一个专门用于变化点检测的库（如文献中提及的ruptures ）或专门用于异常检测的库（如adtk ）可能会在该特定领域提供更细致的算法或评估指标。在某一子领域面临高度复杂或特定问题的用户可能会发现，Kats在大多数情况下是足够的，但对于极端的专业化需求，可能需要寻求其他工具。这是软件包开发中常见的在通用性与专业性之间的权衡。

## **VII. 结论与进一步学习资源**

Kats作为一个由Meta开源的Python工具包，为时间序列分析提供了一个功能丰富且相对易用的平台。它通过统一的接口整合了预测、检测、特征提取和模拟等多种核心功能，旨在成为时间序列分析领域的“一站式商店”。  
**Kats的优势回顾:**  
Kats的突出优势在于其多功能性、易用性以及为常见时间序列分析任务提供的全面解决方案。它为用户提供了一个统一的框架来处理从数据探索、模式识别到未来预测的整个分析流程。  
**在供水与污水处理领域的应用潜力:**  
本报告详细探讨了如何将Kats的各项功能应用于水务行业的关键挑战，包括：

* 利用其多样的预测模型（如Prophet, SARIMA, LSTM）进行精准的**需水量预测**和**污水流入量预测**。  
* 运用其多种检测算法（如CUSUMDetector, OutlierDetector, ProphetDetector）实现对**水质参数的实时监控与异常检测**，以及**供水管网的泄漏检测**。  
* 通过TSFeatures模块提取水泵振动、管道压力等传感器数据的深层特征，辅助**设备的预测性维护**。

**官方学习资源:**  
为了更深入地学习和掌握Kats，建议用户参考以下官方资源：

* **项目主页:** [https://facebookresearch.github.io/Kats/](https://facebookresearch.github.io/Kats/)  
* **GitHub代码库 (源代码、问题追踪):** [https://github.com/facebookresearch/kats](https://github.com/facebookresearch/kats) (或 /Kats)  
* **GitHub教程:** [https://github.com/facebookresearch/Kats/tree/main/tutorials](https://github.com/facebookresearch/Kats/tree/main/tutorials) 。关键教程包括：  
  * kats\_101\_basics.ipynb (基础入门)  
  * kats\_201\_forecasting.ipynb (预测专题)  
  * kats\_202\_detection.ipynb (检测专题)  
  * kats\_203\_tsfeatures.ipynb (特征提取专题)  
* **API文档:** [https://facebookresearch.github.io/Kats/api/](https://facebookresearch.github.io/Kats/api/)  
* **Facebook工程博客文章:** [https://engineering.fb.com/2021/06/21/open-source/kats/](https://engineering.fb.com/2021/06/21/open-source/kats/)  
* **PyPI包页面:** [https://pypi.org/project/kats/](https://pypi.org/project/kats/)  
* **Kaggle数据集与笔记:** Kaggle等平台也提供了相关的学习案例和数据集 。

作为一个开源项目，Kats的未来发展、错误修复以及其生态系统的丰富程度（例如，社区贡献的示例、扩展）将依赖于Meta的持续维护和用户社区的积极参与 。GitHub代码库的问题追踪页面 显示了活跃的用户反馈和错误报告，而其更新日志 则表明了版本的迭代和新功能的加入。对于那些投入时间学习和应用Kats的用户，特别是在水务管理这样的专业领域，工具包的长期可行性和支持是重要的考虑因素。持续活跃的开发通常预示着该库拥有更健康的发展前景。建议长期用户关注其GitHub代码库的动态、问题列表和拉取请求，以获取最新的信息和参与到社区建设中。

#### **引用的文献**

1\. Kats: a time series library \- Kaggle, https://www.kaggle.com/datasets/konradb/kats-onestopshop-for-time-series/data 2\. ottertune/ottertune-kats: Kats, a kit to analyze time series data, a lightweight, easy-to-use, generalizable, and extendable framework to perform time series analysis, from understanding the key statistics and characteristics, detecting change points and anomalies, to forecasting future trends. \- GitHub, https://github.com/ottertune/ottertune-kats 3\. Kats \- Facebook Engineering Blog, https://facebookresearch.github.io/Kats/ 4\. Meet Kats — a one-stop shop for time series analysis \- Engineering at Meta, https://engineering.fb.com/2021/06/21/open-source/kats/ 5\. Outlier Detection in Time Series with Kats and Comet, https://www.comet.com/site/blog/outlier-detection-in-time-series-with-kats-and-comet/ 6\. Kats/tutorials/kats\_101\_basics.ipynb at main · facebookresearch/Kats \- GitHub, https://github.com/facebookresearch/Kats/blob/main/tutorials/kats\_101\_basics.ipynb 7\. facebookresearch/Kats: Kats, a kit to analyze time series data, a lightweight, easy-to-use, generalizable, and extendable framework to perform time series analysis, from understanding the key statistics and characteristics, detecting change points and anomalies, to forecasting future trends. \- GitHub, https://github.com/facebookresearch/Kats 8\. kats · PyPI, https://pypi.org/project/kats/ 9\. Issues · facebookresearch/Kats · GitHub, https://github.com/facebookresearch/Kats/issues 10\. Getting Started with Kats \- One-Stop Shop for Time Series Analysis ..., https://www.topcoder.com/thrive/articles/getting-started-with-kats-one-stop-shop-for-time-series-analysis-in-python 11\. kats.consts module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.consts.html 12\. Time Series Forecasting with Python and Facebook Kats | InfluxData, https://www.influxdata.com/blog/time-series-forecasting-python-facebook-kats/ 13\. Time Series Analysis and Forecasting with Kats \- Kaggle, https://www.kaggle.com/code/recepyilkici/time-series-analysis-and-forecasting-with-kats 14\. kats.models package — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.models.html 15\. kats.models.linear\_model module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.models.linear\_model.html 16\. kats.models.quadratic\_model module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.models.quadratic\_model.html 17\. I would like to calculate RMSE and MSE for Prophet , SARIMA and Ensemble models from KATS \- Stack Overflow, https://stackoverflow.com/questions/71390202/i-would-like-to-calculate-rmse-and-mse-for-prophet-sarima-and-ensemble-models 18\. kats.models.sarima module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.models.sarima.html 19\. kats.models.holtwinters module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.models.holtwinters.html 20\. kats.models.theta module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.models.theta.html 21\. kats.models.stlf module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.models.stlf.html 22\. kats.models.prophet module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.models.prophet.html 23\. kats.models.lstm module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.models.lstm.html 24\. Multi-variate Time Series Forecasting using Kats Model, https://www.analyticsvidhya.com/blog/2022/08/multi-variate-timeseries-forecasting-using-kats-model/ 25\. kats.models.var module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.models.var.html 26\. kats.models.bayesian\_var module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.models.bayesian\_var.html 27\. kats.models.harmonic\_regression module — Kats 0.0.1 ..., https://facebookresearch.github.io/Kats/api/kats.models.harmonic\_regression.html 28\. kats.models.nowcasting.nowcasting module — Kats 0.0.1 ..., https://facebookresearch.github.io/Kats/api/kats.models.nowcasting.nowcasting.html 29\. Source code for kats.models.nowcasting.nowcasting, https://facebookresearch.github.io/Kats/api/\_modules/kats/models/nowcasting/nowcasting.html 30\. Multi-variate Time Series Forecasting using Kats Model \- blueqat, https://blueqat.com/rag9704/c23a2f94-e606-4866-8e33-f4a79270df01 31\. Unlocking the Power of LSTM for Long Term Time Series Forecasting, https://ojs.aaai.org/index.php/AAAI/article/view/33303/35458 32\. Forecasting with Kats and InfluxDB \- The New Stack, https://thenewstack.io/forecasting-with-kats-and-influxdb/ 33\. Kats/tutorials/kats\_201\_forecasting.ipynb at main \- GitHub, https://github.com/facebookresearch/Kats/blob/main/tutorials/kats\_201\_forecasting.ipynb 34\. kats.models.metalearner.metalearner\_modelselect module — Kats ..., https://facebookresearch.github.io/Kats/api/kats.models.metalearner.metalearner\_modelselect.html 35\. kats.models.metalearner.metalearner\_hpt module — Kats 0.0.1 ..., https://facebookresearch.github.io/Kats/api/kats.models.metalearner.metalearner\_hpt.html 36\. kats.detectors.outlier module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.detectors.outlier.html 37\. Kats/tutorials/kats\_202\_detection.ipynb at main · facebookresearch/Kats \- GitHub, https://github.com/facebookresearch/Kats/blob/main/tutorials/kats\_202\_detection.ipynb 38\. kats.detectors.cusum\_detection module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.detectors.cusum\_detection.html 39\. Understanding Time Series Structural Changes | Towards Data Science, https://towardsdatascience.com/understanding-time-series-structural-changes-f6a4c44cb13c/ 40\. Kats/kats/detectors/cusum\_detection.py at main · facebookresearch/Kats \- GitHub, https://github.com/facebookresearch/Kats/blob/main/kats/detectors/cusum\_detection.py 41\. kats.detectors.bocpd module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.detectors.bocpd.html 42\. Python Anomaly Detection Library : Kats \- Dev. DA, https://dadev.tistory.com/entry/Python-Anomaly-Detection-Library-Kats 43\. kats.detectors package — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.detectors.html 44\. kats.detectors.trend\_mk module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.detectors.trend\_mk.html 45\. kats.detectors.seasonality module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.detectors.seasonality.html 46\. kats.detectors.prophet\_detector module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.detectors.prophet\_detector.html 47\. kats.tsfeatures.tsfeatures module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.tsfeatures.tsfeatures.html 48\. kats.tsfeatures.tsfeatures — Kats 0.0.1 documentation \- Facebook Engineering Blog, https://facebookresearch.github.io/Kats/api/\_modules/kats/tsfeatures/tsfeatures.html 49\. Kats/tutorials/kats\_203\_tsfeatures.ipynb at main · facebookresearch/Kats \- GitHub, https://github.com/facebookresearch/Kats/blob/main/tutorials/kats\_203\_tsfeatures.ipynb 50\. tsfeatures \- PyPI, https://pypi.org/project/tsfeatures/ 51\. Introduction to the tsfeatures package \- CRAN, https://cran.r-project.org/web/packages/tsfeatures/vignettes/tsfeatures.html 52\. Introduction to the tsfeatures package \- Software, https://pkg.robjhyndman.com/tsfeatures/articles/tsfeatures.html 53\. kats.utils.simulator module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.utils.simulator.html 54\. kats.utils package — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.utils.html 55\. kats.utils.parameter\_tuning\_utils module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.utils.parameter\_tuning\_utils.html 56\. kats.models.ensemble.kats\_ensemble module — Kats 0.0.1 ..., https://facebookresearch.github.io/Kats/api/kats.models.ensemble.kats\_ensemble.html 57\. kats.utils.backtesters module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.utils.backtesters.html 58\. Specifying a cascade water demand forecasting model using time-series analysis: a case of Jordan \- PubMed Central, https://pmc.ncbi.nlm.nih.gov/articles/PMC9868510/ 59\. (PDF) Predicting time series for water demand in the big data environment using statistical methods, machine learning and the novel analog methodology dynamic time scan forecasting \- ResearchGate, https://www.researchgate.net/publication/367373543\_Predicting\_time\_series\_for\_water\_demand\_in\_the\_big\_data\_environment\_using\_statistical\_methods\_machine\_learning\_and\_the\_novel\_analog\_methodology\_dynamic\_time\_scan\_forecasting 60\. Urban Water Demand Prediction Based on Attention Mechanism Graph Convolutional Network-Long Short-Term Memory \- MDPI, https://www.mdpi.com/2073-4441/16/6/831 61\. Short-term water demand forecasting using data-centric machine learning approaches, https://www.researchgate.net/publication/369349744\_Short-term\_water\_demand\_forecasting\_using\_data-centric\_machine\_learning\_approaches 62\. 12.2 Prophet model | Forecasting: Principles and Practice (3rd ed) \- OTexts, https://otexts.com/fpp3/prophet.html 63\. Peak Daily Water Demand Forecast Modeling Using Artificial Neural Networks, https://www.researchgate.net/publication/248880251\_Peak\_Daily\_Water\_Demand\_Forecast\_Modeling\_Using\_Artificial\_Neural\_Networks 64\. ARIMA for Time Series Forecasting: A Complete Guide \- DataCamp, https://www.datacamp.com/tutorial/arima 65\. Weather forecast using LSTM networks \- DigitalOcean, https://www.digitalocean.com/community/tutorials/weather-forecast-using-ltsm-networks 66\. Artificial intelligence in water quality monitoring: A review of water quality assessment applications \- IWA Publishing, https://iwaponline.com/wqrj/article/60/1/164/105997/Artificial-intelligence-in-water-quality 67\. 205-31: Modeling Water Quality Trend in Long Term Time Series \- SAS Support, https://support.sas.com/resources/papers/proceedings/proceedings/sugi31/205-31.pdf 68\. Development of Water Quality Analysis for Anomaly Detection and Correlation with Case Studies in Water Supply Systems \- MDPI, https://www.mdpi.com/2079-9292/14/10/1933 69\. (PDF) Water Quality Estimation and Anomaly Detection: A Review \- ResearchGate, https://www.researchgate.net/publication/374828169\_Water\_Quality\_Estimation\_and\_Anomaly\_Detection\_A\_Review 70\. (PDF) Comparative Analysis of Anomaly Detection Techniques Using Generative Adversarial Network \- ResearchGate, https://www.researchgate.net/publication/377131824\_Comparative\_Analysis\_of\_Anomaly\_Detection\_Techniques\_Using\_Generative\_Adversarial\_Network 71\. (PDF) ARIMA and TFARIMA Analysis of the Main Water Quality Parameters in the Initial Components of a Megacity's Drinking Water Supply System \- ResearchGate, https://www.researchgate.net/publication/377481036\_ARIMA\_and\_TFARIMA\_Analysis\_of\_the\_Main\_Water\_Quality\_Parameters\_in\_the\_Initial\_Components\_of\_a\_Megacity's\_Drinking\_Water\_Supply\_System 72\. ARIMA and TFARIMA Analysis of the Main Water Quality Parameters ..., https://www.mdpi.com/2306-5338/11/1/10 73\. The development of dissolved oxygen forecast model using hybrid machine learning algorithm with hydro-meteorological variables \- PMC, https://pmc.ncbi.nlm.nih.gov/articles/PMC9894995/ 74\. Hybrid Forecasting for Functional Time Series of Dissolved Oxygen ..., https://www.tandfonline.com/doi/full/10.1080/26941899.2022.2152401 75\. Using ARIMA and ETS models for forecasting water level changes for sustainable environmental management \- PMC \- PubMed Central, https://pmc.ncbi.nlm.nih.gov/articles/PMC11438880/ 76\. \[2501.07599\] Analyzing Spatio-Temporal Dynamics of Dissolved Oxygen for the River Thames using Superstatistical Methods and Machine Learning \- arXiv, https://arxiv.org/abs/2501.07599 77\. A water quality prediction model based on variational mode decomposition and the least squares support vector machine optimized by the sparrow search algorithm (VMD-SSA-LSSVM) of the Yangtze River, China \- PubMed, https://pubmed.ncbi.nlm.nih.gov/34041601/ 78\. Water quality prediction using ARIMA-SSA-LSTM combination model \- ResearchGate, https://www.researchgate.net/publication/379393110\_Water\_quality\_prediction\_using\_ARIMA-SSA-LSTM\_combination\_model 79\. Water quality prediction using ARIMA-SSA-LSTM combination model \- IWA Publishing, https://iwaponline.com/ws/article/24/4/1282/101339/Water-quality-prediction-using-ARIMA-SSA-LSTM 80\. On the Spatial-Temporal Behavior, and on the Relationship Between Water Quality and Hydrometeorological Information to Predict Dissolved Oxygen in Tropical Reservoirs. Case Study: La Miel, Hydropower Dam \- BioOne Complete, https://bioone.org/journals/air-soil-and-water-research/volume-16/issue-1/11786221221150189/On-the-Spatial-Temporal-Behavior-and-on-the-Relationship-Between/10.1177/11786221221150189.full 81\. A novel machine learning-based framework for the water quality parameters prediction using hybrid long short-term memory and locally weighted scatterplot smoothing methods | Journal of Hydroinformatics | IWA Publishing, https://iwaponline.com/jh/article/26/5/1059/101629/A-novel-machine-learning-based-framework-for-the 82\. Comparative Analysis of Inflow Forecasting using Machine Learning and Statistical Techniques: Case Study of Mangla Reservoir and Marala Headworks \- Frontiers, https://www.frontiersin.org/journals/environmental-science/articles/10.3389/fenvs.2025.1590346/full 83\. Prediction of Wastewater Treatment Plant Performance through Machine Learning Techniques \- ResearchGate, https://www.researchgate.net/publication/381355229\_Prediction\_of\_Wastewater\_Treatment\_Plant\_Performance\_through\_Machine\_Learning\_Techniques 84\. (PDF) Time Series Prediction of Wastewater Flow Rate by ..., https://www.researchgate.net/publication/347680955\_Time\_Series\_Prediction\_of\_Wastewater\_Flow\_Rate\_by\_Bidirectional\_LSTM\_Deep\_Learning 85\. Prediction model of sparse autoencoder-based bidirectional LSTM for wastewater flow rate, https://pmc.ncbi.nlm.nih.gov/articles/PMC9511464/ 86\. Short-term inflow forecasting in a dam-regulated river in Southwest Norway using causal variational mode decomposition, https://pmc.ncbi.nlm.nih.gov/articles/PMC10148885/ 87\. Multivariate multi-step LSTM model for flood runoff prediction: a case study on the Godavari River Basin in India | Journal of Water and Climate Change | IWA Publishing, https://iwaponline.com/jwcc/article/14/10/3635/97598/Multivariate-multi-step-LSTM-model-for-flood 88\. Wastewater inflow time series forecasting at low temporal resolution using SARIMA model: a case study in South Australia \- PMC, https://pmc.ncbi.nlm.nih.gov/articles/PMC9515036/ 89\. Forecasting Energy Consumption of Wastewater Treatment Plants with a Transfer Learning Approach for Sustainable Cities \- MDPI, https://www.mdpi.com/2079-9292/10/10/1149 90\. Assessment of rainfall-derived inflow and infiltration in sewer systems with machine learning approaches | Water Science & Technology | IWA Publishing, https://iwaponline.com/wst/article/89/8/1928/101590/Assessment-of-rainfall-derived-inflow-and 91\. Why You Need a Time Series Database for Predictive Maintenance \- IIoT World, https://www.iiot-world.com/predictive-analytics/predictive-maintenance/why-you-need-a-time-series-database-for-predictive-maintenance/ 92\. Predictive Maintenance in Utility Services: Sensor Data for ML \- dataforest, https://dataforest.ai/blog/predictive-maintenance-in-utility-services-sensor-data-for-ml 93\. Predictive Maintenance & Failure Analytics \- Kaggle, https://www.kaggle.com/code/canozensoy/predictive-maintenance-failure-analytics 94\. Technical Language Supervision and AI Agents for Condition Monitoring \- DiVA portal, https://www.diva-portal.org/smash/get/diva2:1950819/FULLTEXT02.pdf 95\. Feature Extraction Using Diagnostic Feature Designer | Predictive Maintenance \- YouTube, https://www.youtube.com/watch?v=oDd7aEmRNpI 96\. A feature extraction method for predictive maintenance with time‐lagged correlation–based curve‐registration model | Request PDF \- ResearchGate, https://www.researchgate.net/publication/326152495\_A\_feature\_extraction\_method\_for\_predictive\_maintenance\_with\_time-lagged\_correlation-based\_curve-registration\_model 97\. Artificial Intelligence for Predictive Maintenance Applications: Key Components, Trustworthiness, and Future Trends \- MDPI, https://www.mdpi.com/2076-3417/14/2/898 98\. A Survey of Predictive Maintenance: Systems, Purposes and Approaches \- arXiv, https://arxiv.org/html/1912.07383v2 99\. Training Machine Learning Models with Vibration Data \- enDAQ, https://endaq.com/pages/training-machine-learning-models-with-vibration-data 100\. LSTM-Autoencoder for Vibration Anomaly Detection in Vertical Carousel Storage and Retrieval System (VCSRS) \- PMC, https://pmc.ncbi.nlm.nih.gov/articles/PMC9866563/ 101\. Reshaping Industrial Maintenance with Machine Learning: Fouling Control Using Optimized Gaussian Process Regression \- ACS Publications, https://pubs.acs.org/doi/full/10.1021/acs.iecr.4c04550 102\. A guide to Kats: python tool by Meta for effective time-series analysis, https://analyticsindiamag.com/deep-tech/a-guide-to-kats-python-tool-by-meta-for-effective-time-series-analysis/ 103\. CAD \-- CUSUM Anomaly Detection | PPT \- SlideShare, https://www.slideshare.net/slideshow/cad-cusum-anomaly-detection/56185014 104\. dspace.mit.edu, https://dspace.mit.edu/bitstream/handle/1721.1/158880/Liu-shiqing-PHD-CEE-2024-thesis.pdf?sequence=-1\&isAllowed=y 105\. (PDF) The CuSum algorithm \- a small review \- ResearchGate, https://www.researchgate.net/publication/281567648\_The\_CuSum\_algorithm\_-\_a\_small\_review 106\. CUSUM Anomaly Detection | Measurement Lab, https://www.measurementlab.net/publications/CUSUMAnomalyDetection.pdf 107\. \[2410.09530\] Anomaly Detection and Inlet Pressure Prediction in Water Distribution Systems Using Machine Learning \- arXiv, https://arxiv.org/abs/2410.09530 108\. Anomaly Detection \- How to Tell Good Performance from Bad | Towards Data Science, https://towardsdatascience.com/anomaly-detection-how-to-tell-good-performance-from-bad-b57116d71a10/ 109\. Anomaly Detection \- How to Tell Good Performance from Bad ..., https://towardsdatascience.com/anomaly-detection-how-to-tell-good-performance-from-bad-b57116d71a10 110\. In 2024 which library is best for time series forecasting and anomaly detection? \[D\] \- Reddit, https://www.reddit.com/r/MachineLearning/comments/1bho0r0/in\_2024\_which\_library\_is\_best\_for\_time\_series/ 111\. kats — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/ 112\. kats.models.reconciliation.thm module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.models.reconciliation.thm.html 113\. kats.detectors.robust\_stat\_detection module — Kats 0.0.1 ..., https://facebookresearch.github.io/Kats/api/kats.detectors.robust\_stat\_detection.html 114\. kats.utils.decomposition module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.utils.decomposition.html 115\. kats.graphics.plots module — Kats 0.0.1 documentation, https://facebookresearch.github.io/Kats/api/kats.graphics.plots.html 116\. Kats (Kits to Analyze Time Series) \- Kaggle, https://www.kaggle.com/code/gauravduttakiit/kats-kits-to-analyze-time-series