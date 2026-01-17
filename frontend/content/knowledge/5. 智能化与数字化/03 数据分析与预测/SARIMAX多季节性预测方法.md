# **利用SARIMAX模型实现多重季节性叠加预测：以日度与周度季节性为例**

## **1\. SARIMAX模型与多重季节性预测概述**

时间序列预测在诸多领域均有广泛应用，从经济金融到气象预测，再到运营管理。在处理具有复杂周期性模式的时间序列数据时，选择合适的模型至关重要。季节性自回归积分移动平均模型（SARIMA）及其扩展模型SARIMAX是时间序列分析中广受欢迎的工具。

### **1.1. SARIMAX模型简介**

SARIMAX模型，全称为带外生回归量的季节性自回归积分移动平均模型 (Seasonal Autoregressive Integrated Moving Average with eXogenous regressors)，是ARIMA模型的扩展，专门用于处理具有季节性模式的时间序列数据，并且能够纳入外生变量的影响 。其核心组成部分包括：

* **自回归 (AR)**: 模型当前值与过去值之间的关系，由阶数 p 表示 。  
* **差分 (I)**: 通过对数据进行差分使其平稳，由阶数 d 表示 。  
* **移动平均 (MA)**: 模型当前值与过去误差项之间的关系，由阶数 q 表示 。  
* **季节性 (S)**: 模型的季节性成分，包括季节性自回归 (SAR, 阶数 P)、季节性差分 (SI, 阶数 D)、季节性移动平均 (SMA, 阶数 Q) 以及季节周期长度 s 。  
* **外生变量 (X)**: 模型中包含的外部预测因子，这些变量被认为会影响目标序列 。

SARIMAX模型的强大之处在于它能够同时捕捉时间序列的短期依赖、长期趋势以及季节性波动，并量化外部因素的影响 。

### **1.2. 时间序列中的季节性**

季节性是指时间序列数据中在固定时间间隔内重复出现的规律性波动或模式 。这些模式可以是每日（如每小时的电力消耗）、每周（如一周中不同天数的零售额）、每月（如月度销售数据）或每年（如年度温度变化）的周期 。准确识别和建模季节性对于提高预测精度至关重要，因为它有助于捕捉数据的周期性特征 。

### **1.3. 多重季节性的挑战**

许多高频时间序列数据，例如每小时或每日记录的数据，往往表现出多种叠加的季节性模式 。一个典型的例子是每小时的电力需求数据，它可能同时具有24小时的日度季节性（一天内不同小时的需求变化）和168小时的周度季节性（一周内不同天、不同小时的需求变化）。其他例子包括呼叫中心的呼叫量、医院的日入院人数等 。  
标准的SARIMA模型在其季节性部分 (P, D, Q, s) 中仅能指定一个季节周期长度 s 。这使得它难以直接处理具有多个不同周期长度季节性模式（例如，同时存在的24小时日度季节性和7天（或168小时）周度季节性）的序列。因此，需要采用更灵活的方法来应对这种多重季节性的挑战。

## **2\. 利用傅里叶项在SARIMAX中处理多重季节性**

对于SARIMAX模型而言，处理多重季节性的一种有效方法是将季节性模式通过傅里叶项表示，并将这些傅里叶项作为外生回归量（即模型中的“X”部分）纳入模型 。这种方法的核心在于，将复杂的季节性模式分解为一系列正弦和余弦函数，这些函数能够以不同的频率和幅度捕捉季节性变化。

### **2.1. 基本原理**

傅里叶级数理论表明，任何周期函数都可以用一系列不同频率的正弦和余弦函数的和来逼近。在时间序列分析中，如果一个序列包含周期为 M 的季节性，那么这个季节性模式可以通过包含 M/2 对正弦和余弦项的傅里叶级数来精确表示。通过将这些傅里叶项作为外生变量引入SARIMAX模型，可以将多重季节性的建模问题转化为构建合适的外生变量集的问题。模型的ARIMA部分则用于对剔除了这些确定性季节性效应后的残差序列进行建模。

### **2.2. 傅里叶项的数学表示**

对于一个具有季节周期长度 M 的时间序列，其傅里叶项可以表示为： \\sin\\left(\\frac{2\\pi kt}{M}\\right) \\quad \\text{和} \\quad \\cos\\left(\\frac{2\\pi kt}{M}\\right) 其中，t 是时间索引 (t \= 1, 2, \\dots, N)，k 是傅里叶项的阶数 (k \= 1, 2, \\dots, K)，K 是所选用的傅里叶对的数量 。每一对正弦和余弦项代表一个特定频率的季节性波动。  
对于用户提出的24小时日度季节性和周度季节性（假设数据为小时级别，则周季节性周期为 7 \\times 24 \= 168 小时），需要为每个季节性周期分别生成傅里叶项：

* 日度季节性 (M\_1 \= 24): $$ \\sin\\left(\\frac{2\\pi k\_1t}{24}\\right), \\cos\\left(\\frac{2\\pi k\_1t}{24}\\right) \\quad \\text{for } k\_1 \= 1, \\dots, K\_1 $$  
* 周度季节性 (M\_2 \= 168): $$ \\sin\\left(\\frac{2\\pi k\_2t}{168}\\right), \\cos\\left(\\frac{2\\pi k\_2t}{168}\\right) \\quad \\text{for } k\_2 \= 1, \\dots, K\_2 $$ 其中 K\_1 和 K\_2 分别是为日度和周度季节性选择的傅里叶项对数。

### **2.3. 在SARIMAX模型中设定季节性阶数**

当使用傅里叶项作为外生变量来捕捉所有已知的季节性模式时，SARIMAX模型本身的季节性参数 (P, D, Q, s) 通常应设置为 (0, 0, 0, 0\) 。这是因为季节性效应已经被外生的傅里叶项所解释。如果在Python的pmdarima库中使用auto\_arima函数，则应将seasonal参数设置为False。  
尽管傅里叶项可以处理季节性导致的非平稳性，从而使得季节性差分 D 通常不再需要，但原始序列（在剔除傅里叶项所代表的确定性季节性后）可能仍然存在趋势或其他形式的非平稳性 。因此，非季节性差分阶数 d 的选择仍然非常重要，需要通过对残差序列进行平稳性检验（如ADF检验）或观察ACF/PACF图来确定。

### **2.4. 如何选择傅里叶项的阶数K**

选择合适的傅里叶项阶数 K 对于每个季节性周期都至关重要。K 值太小可能导致模型未能充分捕捉季节性模式，使得残差中仍含有季节性信息；K 值太大则可能导致模型过拟合训练数据中的噪声，降低预测泛化能力。以下是一些选择 K 的指导原则和方法：

| 方法/指导原则 | 描述 | 示例/应用 (例如 M=24, M=168) |
| :---- | :---- | :---- |
| **理论最大值** | K 的最大取值不应超过 M/2。对于周期 M，最多有 M/2 对独立的傅里叶项可以被识别 。 | 对于 M=24, K\_{max}=12。对于 M=168, K\_{max}=84。 |
| **信息准则 (AICc, BIC)** | 迭代不同的 K 值，为每个 K 值拟合模型，并选择使得AICc (修正的赤池信息量准则) 或BIC (贝叶斯信息量准则) 最小的 K 值 。 | 尝试 K\_1 \\in \[1, \\dots, 11\] (日度), K\_2 \\in \[1, \\dots, 10\] (周度，可根据实际情况调整范围)，选择最优组合。 |
| **可视化检查/领域知识** | 绘制时间序列图、季节性子序列图或周期图 (periodogram) 来判断季节性模式的复杂程度。平滑的季节性模式通常需要较小的 K 值，而更复杂的模式（如具有多个峰值）则可能需要较大的 K 值 。 | 如果日度模式只有一个主要峰谷，较小的 K\_1 (如2-4) 可能就足够。如果周度模式在工作日和周末有显著不同且形态复杂，可能需要更大的 K\_2。 |
| **实际起始点** | 通常可以从较小的 K 值开始尝试，例如 K=2 到 K=5 。 | 日度: K\_1=3 至 5。周度: K\_2=3 至 7。 |
| **对高周期 M 的注意事项** | 对于非常长的季节周期 (高 M 值)，AICc等信息准则有时会倾向于选择过大的 K 值，导致模型过于复杂 。此时，结合领域知识和可视化检查进行主观判断可能更为稳妥。 | 对于年季节性 (M=365.25 \\times 24 \= 8766 对于小时数据)，即使AICc建议很大的 K，通常也会选择一个较小的 K (如 K \\le 10)。 |

选择 K 的过程可能影响非季节性ARIMA参数 (p,d,q) 的选择。如果 K 值选择不当，未被傅里叶项完全捕捉的季节性信息可能会“泄漏”到残差中，这可能导致需要更高阶的AR或MA项来拟合这些残余的季节性模式。反之，如果 K 值过大，傅里叶项可能过度拟合了季节性，甚至吸收了一些本应由ARIMA误差项处理的随机噪声，使得ARIMA部分变得过于简单或不稳定。因此，选择 K 和确定 (p,d,q) 阶数最好是一个迭代或联合优化的过程。

### **2.5. Python实现步骤**

以下是使用Python实现SARIMAX模型结合傅里叶项处理日度（周期24）和周度（周期168，假设数据为小时采样）季节性的步骤。  
**A. 数据准备** 首先，确保时间序列数据存储在pandas DataFrame中，并且具有一个DatetimeIndex。  
`import pandas as pd`  
`import numpy as np`  
`import statsmodels.api as sm`  
`from pmdarima.preprocessing import FourierFeaturizer`  
`from pmdarima import auto_arima`

`# 假设 y 是一个包含时间序列数据的 pandas Series，且索引为 DatetimeIndex`  
`# 例如:`  
`# N = 1000`  
`# index = pd.date_range(start='2020-01-01', periods=N, freq='H')`  
`# y = pd.Series(np.random.rand(N) + np.sin(np.arange(N) * 2 * np.pi / 24) + np.cos(np.arange(N) * 2 * np.pi / 168), index=index)`

`# 划分训练集和测试集 (示例)`  
`train_size = int(len(y) * 0.8)`  
`y_train = y[:train_size]`  
`y_test = y[train_size:]`

**B. 生成傅里叶项** 为日度季节性 (M=24) 和周度季节性 (M=168) 生成傅里叶项。这里以 K\_1=3 (日度) 和 K\_2=5 (周度) 为例。

* **使用 numpy 手动生成**:

`# 创建时间索引 t (从1开始)`  
`t_train = np.arange(1, len(y_train) + 1)`  
`t_test = np.arange(len(y_train) + 1, len(y_train) + len(y_test) + 1)`

`exog_fourier_train = pd.DataFrame()`  
`exog_fourier_test = pd.DataFrame()`

`# 日度傅里叶项 (M1=24, K1=3)`  
`for k_val in range(1, 3 + 1):`  
    `exog_fourier_train[f'daily_sin_{k_val}'] = np.sin(2 * np.pi * k_val * t_train / 24)`  
    `exog_fourier_train[f'daily_cos_{k_val}'] = np.cos(2 * np.pi * k_val * t_train / 24)`  
    `exog_fourier_test[f'daily_sin_{k_val}'] = np.sin(2 * np.pi * k_val * t_test / 24)`  
    `exog_fourier_test[f'daily_cos_{k_val}'] = np.cos(2 * np.pi * k_val * t_test / 24)`

`# 周度傅里叶项 (M2=168, K2=5)`  
`for k_val in range(1, 5 + 1):`  
    `exog_fourier_train[f'weekly_sin_{k_val}'] = np.sin(2 * np.pi * k_val * t_train / 168)`  
    `exog_fourier_train[f'weekly_cos_{k_val}'] = np.cos(2 * np.pi * k_val * t_train / 168)`  
    `exog_fourier_test[f'weekly_sin_{k_val}'] = np.sin(2 * np.pi * k_val * t_test / 168)`  
    `exog_fourier_test[f'weekly_cos_{k_val}'] = np.cos(2 * np.pi * k_val * t_test / 168)`

`# 确保外生变量与内生变量索引一致`  
`exog_fourier_train.index = y_train.index`  
`exog_fourier_test.index = y_test.index`

* **使用 pmdarima.preprocessing.FourierFeaturizer (更简洁)** : FourierFeaturizer 仅基于 y 的长度（或提供的 n\_periods）生成项，不直接使用时间戳。它通常用于 auto\_arima 的流水线中。如果直接使用，需要注意其输出格式。  
  `# # 示例:`  
  `# fourier_daily_gen = FourierFeaturizer(m=24, k=3)`  
  `# daily_terms_train, _ = fourier_daily_gen.fit_transform(y=y_train) # _ 是 y`  
  `# daily_terms_test = fourier_daily_gen.transform(y=y_test, n_periods=len(y_test)) #  是 exog`

  `# fourier_weekly_gen = FourierFeaturizer(m=168, k=5)`  
  `# weekly_terms_train, _ = fourier_weekly_gen.fit_transform(y=y_train)`  
  `# weekly_terms_test = fourier_weekly_gen.transform(y=y_test, n_periods=len(y_test))`

  `# # 合并傅里叶项`  
  `# exog_fourier_train_pmd = pd.concat([daily_terms_train, weekly_terms_train], axis=1)`  
  `# exog_fourier_test_pmd = pd.concat([daily_terms_test, weekly_terms_test], axis=1)`  
  `# exog_fourier_train_pmd.index = y_train.index`  
  `# exog_fourier_test_pmd.index = y_test.index`  
  对于本报告，后续将主要使用手动生成的傅里叶项，因其在 statsmodels.SARIMAX 中使用更直接。

**C. 模型拟合**

* **使用 statsmodels.tsa.statespace.SARIMAX**: 需要预先确定非季节性阶数 (p, d, q)。这可以通过分析剔除傅里叶项影响后的残差序列的ACF/PACF图，或使用auto\_arima对这些残差进行拟合来辅助确定。  
  `# 假设 p, d, q 已经确定, 例如 p=1, d=1, q=1`  
  `p, d, q_ = 1, 1, 1 # 使用 q_ 避免与函数名冲突`

  `model_sm = sm.tsa.statespace.SARIMAX(y_train,`  
                                       `exog=exog_fourier_train,`  
                                       `order=(p, d, q_),`  
                                       `seasonal_order=(0, 0, 0, 0), # 关键：不使用SARIMA的季节性部分`  
                                       `enforce_stationarity=False,`  
                                       `enforce_invertibility=False,`  
                                       `# simple_differencing=False # 建议在高版本statsmodels中使用，确保差分行为一致`  
                                      `)`  
  `results_sm = model_sm.fit(disp=False) # disp=False 避免打印收敛信息`  
  `print(results_sm.summary())`  
  ( 的启发，但明确seasonal\_order=(0,0,0,0))  
* **使用 pmdarima.auto\_arima**: auto\_arima 可以自动搜索最优的 (p, d, q) 阶数组合。  
  `arima_model_pmd = auto_arima(y_train,`  
                               `exogenous=exog_fourier_train,`  
                               `seasonal=False, # 关键：季节性由外生傅里叶项处理`  
                               `stepwise=True, trace=True,`  
                               `error_action='ignore',`  
                               `suppress_warnings=True,`  
                               `D=0) # 明确不需要季节性差分`  
  `print(arima_model_pmd.summary())`  
  ()

傅里叶项作为外生变量的一个显著优势在于其确定性。对于未来时间点的预测，傅里叶项的值是完全已知的，因为它们仅依赖于时间索引 t 。这避免了预测外生变量本身可能引入的额外误差层，从而使得基于傅里叶项的季节性预测在多步预测中更为稳健。

## **3\. 替代及补充方法**

虽然SARIMAX结合傅里叶项是处理多重季节性的有力工具，但在某些情况下，其他模型或方法可能更适用或提供补充视角。

### **3.1. 未观测分量模型 (UCM)**

未观测分量模型（Unobserved Components Models, UCM），也称为结构时间序列模型，将时间序列分解为多个独立的未观测到的成分，如趋势、一个或多个季节性成分、周期成分和不规则成分 。这些模型通常在状态空间框架下进行估计。  
Python的statsmodels.tsa.statespace.structural.UnobservedComponents类允许通过freq\_seasonal参数指定多个季节性成分 。freq\_seasonal接受一个字典列表，每个字典定义一个季节性成分的周期 (period) 和谐波数 (harmonics)。例如，对于日度和周度季节性： freq\_seasonal=\[{'period': 24, 'harmonics': K1}, {'period': 168, 'harmonics': K2}\] 这里的谐波数 K 类似于傅里叶项的阶数；如果未指定，则默认为 \\lfloor period/2 \\rfloor 。UCM模型也可以通过exog参数包含其他外生变量 。  
UCM的一个主要优势在于它可以更自然地对时变的季节性模式进行建模（通过将季节性成分设置为随机的），并提供对各个成分的明确分解。当季节性模式被认为是确定性的（即stochastic\_freq\_seasonal设置为False），UCM与使用傅里叶项的ARIMAX在概念上非常接近，主要区别在于估计框架和UCM能够更容易地使成分随机化。

### **3.2. TBATS模型**

TBATS模型（Trigonometric terms, Box-Cox transformation, ARMA errors, Trend, Seasonality）是专门为处理具有多重复杂季节性（包括非整数周期）的时间序列而设计的 。它使用傅里叶项来建模季节性，这一点与前述SARIMAX方法类似，但将其整合在一个指数平滑和ARMA误差的框架内。  
TBATS模型允许季节性模式随时间缓慢变化 。在Python中，可以通过sktime库（它可能封装了R的实现或提供了原生实现）使用TBATS模型 。sktime中TBATS类的sp参数接受一个包含各个季节周期的可迭代对象（例如，sp=）。  
TBATS模型的一个潜在缺点是对于长的时间序列，其估计过程可能较慢 。此外，TBATS模型通常不直接支持除用于季节性建模的傅里叶项之外的其他外生回归量。

### **3.3. 在SARIMAX中使用虚拟变量处理季节性**

另一种处理季节性的方法是为每个季节周期内的每个不同时点创建虚拟变量（dummy variables） 。例如，对于日度季节性（每小时数据，周期24），可以为一天中的0点到22点创建23个虚拟变量（23点作为基准）。类似地，对于周度季节性（一周中的某一天），可以为周一到周六创建6个虚拟变量（周日作为基准）。这些虚拟变量随后作为外生变量被纳入SARIMAX模型。Pandas的get\_dummies()函数可以方便地从datetimeindex.hour和datetimeindex.dayofweek等属性创建这些虚拟变量 。  
这种方法的优点在于概念简单且易于实现，特别是对于周期较短的季节性。然而，其缺点也很明显：

* **高维度**: 对于周期较长的季节性（如每小时的周度季节性，周期168），会产生大量的虚拟变量（例如167个），这可能导致模型参数过多、多重共线性和过拟合问题 。  
* **模式假设**: 虚拟变量假设季节性模式是“块状”的、确定性的，并且在每个时点的影响是固定的，而不是平滑过渡的。傅里叶项则能更简洁地表示平滑的季节性模式。

这些替代方法代表了季节性建模的不同策略：傅里叶项提供了确定性且参数较少的平滑模式；虚拟变量提供了确定性但参数较多且模式较“硬”的表示；UCM则允许季节性模式是随机演化的，并在一个统一的框架内估计所有成分；TBATS则专注于处理可能随时间演变的多重（包括非整数周期）季节性。

### **多重季节性处理方法比较**

下表总结了上述几种处理多重季节性方法的主要特点：

| 方法 | 如何处理多重季节性 | 处理演化季节性? | 处理其他外生变量? | 优点 | 缺点 | 典型用例/关键优势 |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **SARIMAX \+ 傅里叶项** | 将傅里叶项作为外生变量 | 否 (基本形式) | 是 | 灵活；可处理长周期；傅里叶项预测确定；与成熟的ARIMA框架结合 | 需选择K值；假设季节性模式稳定 | 具有稳定、平滑的多重季节性，且可能需要包含其他外生变量的情况。 |
| **UCM (未观测分量模型)** | 通过freq\_seasonal参数指定多个三角季节性成分 | 是 (若设为随机) | 是 | 提供成分分解；可灵活设定确定性/随机性季节；状态空间框架 | 可能较复杂；参数估计可能较慢 | 需要明确的成分分解，或季节性模式可能随时间演化。 |
| **TBATS** | 内置傅里叶项处理多重季节性，并结合指数平滑和ARMA误差 | 是 | 否 (通常) | 专为多重复杂季节性设计；可处理非整数周期；自动化程度较高 | 估计可能较慢；通常不支持其他外生变量；有时预测区间过宽 | 存在多个复杂（可能非整数周期）且可能演化的季节性，且不需要其他外生变量。 |
| **SARIMAX \+ 虚拟变量** | 将季节性虚拟变量作为外生变量 | 否 | 是 | 概念简单；易于理解和实现低周期季节性 | 对长周期产生过多变量；假设季节性模式“块状”且固定；可能过拟合 | 季节性周期短，模式相对简单固定，且希望直接解释每个时点效应（需谨慎）。傅里叶项通常更优。 |

## **4\. 实践考量与进阶主题**

在应用SARIMAX模型结合傅里叶项处理多重季节性时，还需要考虑一些实际问题和高级主题。

### **4.1. SARIMAX与傅里叶项模型的诊断**

模型拟合完成后，必须进行严格的诊断检验，以评估模型的充分性 。关键的诊断步骤包括：

* **残差分析**:  
  * **自相关性**: 残差序列应接近白噪声，即不存在显著的自相关。可以通过绘制残差的自相关函数 (ACF) 和偏自相关函数 (PACF) 图，并进行Ljung-Box检验来评估 。如果在对应于季节性周期 M\_1 或 M\_2 的滞后上，残差ACF/PACF图仍显示出显著的尖峰，这可能表明相应季节性的傅里叶项阶数 K 不足，未能完全捕捉季节性模式。此时，应首先考虑调整或增加 K 值，而不是立即通过SARIMA的季节性参数 (P,D,Q,s) 来弥补。  
  * **正态性**: 残差应大致服从正态分布。可以通过绘制残差的直方图或Q-Q图来检验。  
  * **同方差性**: 残差的方差应保持恒定，不随时间变化（即同方差）。可以通过绘制残差序列图或残差对拟合值图来观察。如果残差图显示出在某些季节性频率上存在变化的方差或模式，可能表明季节性模式本身在演化，此时固定傅里叶项的假设可能不成立，需要考虑UCM或TBATS等能处理时变季节性的模型。  
* **拟合优度**: 绘制实际观测值与模型拟合值的对比图，直观评估模型的拟合效果。  
* **样本外预测评估**: 在预留的测试集上评估模型的预测性能，常用的指标包括平均绝对误差 (MAE)、均方根误差 (RMSE) 和平均绝对百分比误差 (MAPE) 。

### **4.2. 处理超长季节周期**

傅里叶项特别适用于处理具有非常长周期的季节性模式，例如在日度数据中存在的年度季节性（周期 M \\approx 365.25）。直接在SARIMA模型的seasonal\_order中设置一个非常大的季节周期（如 s=365）可能会导致模型估计困难、参数过多以及计算效率低下等问题 。相比之下，使用少量（例如 K=3 到 10 对）傅里叶项通常就能以更简洁的方式捕捉到年度季节性模式的主要形状。

### **4.3. 使用外生傅里叶项进行预测**

如前所述，傅里叶项是时间的确定性函数。因此，要进行未来 h 步的预测，只需为未来的时间索引（例如，训练集末尾时间点 N 之后的 N+1, \\dots, N+h）生成相应的傅里叶项即可 。这些未来傅里叶项的值是已知的，可以直接作为外生变量输入到已拟合的SARIMAX模型的predict或forecast方法中，用于生成预测值。

### **4.4. 过拟合风险与模型选择**

当模型中包含多个季节性的傅里叶项（如果为每个季节性选择的 K 值都较大）以及ARIMA部分的参数时，模型复杂度会增加，从而带来过拟合的风险。过拟合的模型在训练数据上表现良好，但在未见过的新数据上预测性能较差。 为降低过拟合风险并选择合适的模型，可以采用以下策略：

* **信息准则**: 使用AIC、BIC等信息准则来平衡模型的拟合优度和复杂度，选择使信息准则最小的模型 。  
* **时间序列交叉验证**: 使用时间序列交叉验证（如滚动预测原点交叉验证）来评估模型在样本外的预测性能，并据此调整超参数（如傅里叶项的阶数 K 和ARIMA阶数 p,d,q）。  
* **简约性原则**: 在保证模型充分性的前提下，尽量选择参数较少的简约模型。

尽管傅里叶项避免了在seasonal\_order中使用非常大的 s 值带来的问题，但如果为多个季节性选择的 K\_1 和 K\_2 都很大，导致外生回归量的数量非常多，模型拟合过程（尤其是在进行 (p,d,q) 和 K 值的超参数搜索时）仍然可能具有一定的计算成本。

### **4.5. 乘法季节性**

如果时间序列的季节性效应是乘性的（例如，日度季节性的幅度随年度季节性的变化而变化，或者随趋势水平的变化而变化），直接应用加性的傅里叶项可能效果不佳。在这种情况下，可以考虑对原始时间序列进行对数变换 (log transformation) 。对数变换可以将乘性关系转化为加性关系。然后，可以在对数变换后的序列上使用傅里叶项来建模加性的季节性模式。最终的预测结果需要进行反对数变换（指数变换）才能还原到原始尺度。

## **5\. 总结与建议**

处理具有多重季节性（如24小时日度和周度季节性）的时间序列预测是一个常见的挑战。SARIMAX模型通过结合外生傅里叶项，提供了一种强大而灵活的解决方案。

### **5.1. SARIMAX与傅里叶项处理多重季节性回顾**

标准SARIMAX模型通过其季节性参数 (P,D,Q,s) 只能直接处理单一季节周期。然而，通过将傅里叶级数项（正弦和余弦对）作为外生回归变量（模型的“X”部分）引入，可以有效地对多个具有不同周期的季节性模式进行建模。关键步骤包括：

1. 识别数据中存在的所有显著季节性周期（例如，M\_1=24，M\_2=168）。  
2. 为每个季节性周期生成一组傅里叶项。  
3. 为每个季节性周期选择合适的傅里叶项阶数 K（例如，通过信息准则、可视化或交叉验证）。  
4. 将所有生成的傅里叶项合并作为外生变量集。  
5. 拟合SARIMAX模型，将傅里叶项作为exog参数传入，并将模型的seasonal\_order设置为 (0,0,0,0)（或在auto\_arima中设置seasonal=False），使得季节性完全由外生傅里叶项解释。  
6. 确定模型的非季节性ARIMA阶数 (p,d,q)。

### **5.2. 何时考虑替代方法**

尽管SARIMAX结合傅里叶项是一种通用且有效的方法，但在某些特定情况下，考虑替代模型可能更为合适：

* **季节性模式随时间显著演化**: 如果有证据表明季节性模式的形状或幅度随时间发生显著变化，那么UCM模型（设定季节性成分为随机）或TBATS模型可能提供更优的拟合和预测，因为它们能够捕捉这种时变特性。  
* **高度自动化的多重季节性处理**: 如果希望采用一种高度自动化的方法来处理多重季节性，并且计算时间不是主要瓶颈，TBATS模型是一个值得考虑的选择。  
* **对各成分的明确可解释性要求高**: 如果分析的主要目标之一是清晰地分解和解释时间序列的各个潜在成分（趋势、不同季节性等），UCM模型因其结构化的分解方式而具有优势。  
* **季节性周期非常短且模式简单固定**: 对于周期非常短且季节性模式相对简单、呈现“阶梯状”固定的情况，使用虚拟变量可能在理解上更为直接。但即便如此，对于多数具有平滑特征的季节性，傅里叶项通常因其简约性和对平滑模式的良好拟合而更受青睐。

### **5.3. 针对用户案例（24小时与周季节性）的最终建议**

对于需要同时处理24小时日度季节性和周度季节性的预测问题，建议遵循以下步骤：

1. **首选方法**: 以SARIMAX模型结合傅里叶项作为主要分析方法。  
2. **傅里叶项生成与选择**:  
   * 为日度季节性（周期 M\_1=24）和周度季节性（周期 M\_2=168，假设数据为小时级别）分别生成傅里叶项。  
   * 仔细选择傅里叶项的阶数 K\_1（日度）和 K\_2（周度）。可以从较小的 K 值开始（例如，日度 K\_1 从3-5，周度 K\_2 从3-7），利用AICc/BIC信息准则进行迭代选择，并结合对季节性模式复杂度的直观判断和残差诊断。  
3. **ARIMA阶数确定**:  
   * 使用pmdarima包中的auto\_arima函数，将生成的傅里叶项作为exogenous参数传入，并设置seasonal=False及D=0，以自动搜索最优的非季节性ARIMA阶数 (p,d,q)。  
   * 或者，可以先用普通最小二乘法 (OLS) 将原始序列对傅里叶项进行回归，然后对回归残差进行ACF/PACF分析以辅助确定 (p,d,q) 阶数。  
4. **模型拟合与诊断**: 使用选定的阶数和傅里叶项拟合statsmodels.tsa.statespace.SARIMAX模型。对拟合后的模型进行彻底的残差诊断，确保残差序列接近白噪声。  
5. **迭代与优化**: 时间序列建模往往是一个迭代的过程。基于诊断结果和样本外预测性能，可能需要回头调整傅里叶项的阶数 K 或ARIMA阶数 (p,d,q)，甚至重新评估模型选择。  
6. **探索替代方案**: 如果傅里叶项方法在充分捕捉季节性方面遇到困难（例如，残差中仍有明显季节性，或季节性模式本身存在显著演化），或者对模型的特定方面（如成分分解）有特殊需求，则应进一步探索UCM或TBATS等替代模型。

最终模型的选择应基于数据的具体特征、预测任务的目标、计算资源限制以及对模型可解释性的要求。没有一种模型是万能的，通过系统的方法比较和严格的诊断评估，才能找到最适合特定问题的预测模型。

#### **引用的文献**

1\. Complete Guide To SARIMAX in Python | GeeksforGeeks, https://www.geeksforgeeks.org/complete-guide-to-sarimax-in-python/ 2\. SARIMAX model: What is it? How can it be applied to time series? \- DataScientest, https://datascientest.com/en/sarimax-model-what-is-it-how-can-it-be-applied-to-time-series 3\. SARIMA (Seasonal Autoregressive Integrated Moving Average) \- GeeksforGeeks, https://www.geeksforgeeks.org/sarima-seasonal-autoregressive-integrated-moving-average/ 4\. What Is a SARIMAX Model? \- 365 Data Science, https://365datascience.com/tutorials/python-tutorials/sarimax/ 5\. A Seasonal Autoregressive Integrated Moving Average with Exogenous Factors (SARIMAX) Forecasting Model-Based Time Series Approach \- MDPI, https://www.mdpi.com/2411-5134/7/4/94 6\. 10 Data-Driven Insights into Seasonal ARIMA (SARIMA) Forecasting Trends, https://www.numberanalytics.com/blog/data-driven-sarima-forecasting-insights 7\. 11.1 Complex seasonality | Forecasting: Principles and Practice (2nd ed) \- OTexts, https://otexts.com/fpp2/complexseasonality.html 8\. 12.1 Complex seasonality | Forecasting: Principles and Practice (3rd ed) \- OTexts, https://otexts.com/fpp3/complexseasonality.html 9\. multiple seasonality Time series analysis in Python \- Stack Overflow, https://stackoverflow.com/questions/50711771/multiple-seasonality-time-series-analysis-in-python 10\. ARIMAX with Fourier Series \- Towards Data Science, https://towardsdatascience.com/arimax-with-fourier-series-1d92a976f45f/ 11\. pmdarima.preprocessing.FourierFeaturizer \- alkaline-ml, https://alkaline-ml.com/pmdarima/modules/generated/pmdarima.preprocessing.FourierFeaturizer.html 12\. ARIMA, SARIMA, and SARIMAX Explained | Zero To Mastery, https://zerotomastery.io/blog/arima-sarima-sarimax-explained/ 13\. SARIMAX \- Forecasting Economic Time Series \- Kaggle, https://www.kaggle.com/code/elasgustavoknaus/sarimax-forecasting-economic-time-series 14\. Seasonality in time series data \- statsmodels 0.15.0 (+651), https://www.statsmodels.org/dev/examples/notebooks/generated/statespace\_seasonal.html 15\. statsmodels.tsa.statespace.structural.UnobservedComponents, https://www.statsmodels.org/stable/generated/statsmodels.tsa.statespace.structural.UnobservedComponents.html 16\. UnobservedComponents — sktime documentation, https://www.sktime.net/en/stable/api\_reference/auto\_generated/sktime.forecasting.structural.UnobservedComponents.html 17\. Source code for statsmodels.tsa.statespace.structural, https://www.statsmodels.org/dev/\_modules/statsmodels/tsa/statespace/structural.html 18\. TBATS — sktime documentation, https://www.sktime.net/en/v0.21.1/api\_reference/auto\_generated/sktime.forecasting.tbats.TBATS.html 19\. Modeling Complex Seasonalities \- DSpace, https://dspace.ut.ee/bitstreams/30a6e3f1-1437-456e-82cd-e8f6523307b0/download 20\. Modelling time series with multiple seasonalities: an application to hourly NO 2 {\_2} pollution levels \- ResearchGate, https://www.researchgate.net/publication/390704713\_Modelling\_time\_series\_with\_multiple\_seasonalities\_an\_application\_to\_hourly\_NOdocumentclass12ptminimal\_usepackageamsmath\_usepackagewasysym\_usepackageamsfonts\_usepackageamssymb\_usepackageamsbsy\_usepacka 21\. Capturing seasonality in multiple regression for daily data \- Cross Validated, https://stats.stackexchange.com/questions/108877/capturing-seasonality-in-multiple-regression-for-daily-data 22\. pandas.get\_dummies — pandas 2.2.3 documentation \- PyData |, https://pandas.pydata.org/docs/reference/api/pandas.get\_dummies.html 23\. Pandas – get\_dummies() method \- GeeksforGeeks, https://www.geeksforgeeks.org/python-pandas-get\_dummies-method/ 24\. SARIMAX with Fourier terms for predicting travel times for on-demand public transport in Sofia | Request PDF \- ResearchGate, https://www.researchgate.net/publication/376417787\_SARIMAX\_with\_Fourier\_terms\_for\_predicting\_travel\_times\_for\_on-demand\_public\_transport\_in\_Sofia 25\. Using SARIMAX for daily data with yearly seasonal pattern \- Cross Validated, https://stats.stackexchange.com/questions/613677/using-sarimax-for-daily-data-with-yearly-seasonal-pattern