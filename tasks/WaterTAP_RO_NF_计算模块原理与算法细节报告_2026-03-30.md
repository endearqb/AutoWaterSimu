# WaterTAP 中 RO 与 NF 计算模块原理、计算流程和算法细节报告

## 摘要

本文基于 WaterTAP 当前公开源码与官方技术文档，对其反渗透（RO）与纳滤（NF）计算模块做中文详细说明。报告重点回答 4 个问题：

1. WaterTAP 的 RO 和 NF 模块在源码层面是如何组织的。
2. 每类模块采用了什么物理原理与控制方程。
3. 它们在求解前、求解中、求解后分别做了哪些计算步骤。
4. 哪些层级适合简化为前端 JS/TS 快算，哪些层级必须保留在后端求解器。

WaterTAP 中与本报告最相关的模块可以分成两条主线：

- RO 线：`reverse_osmosis_base.py` + `reverse_osmosis_0D.py` + `reverse_osmosis_1D.py`
- NF 线：
  - 简化工程模型：`nanofiltration_0D.py`
  - 机理模型：`nanofiltration_DSPMDE_0D.py`

从建模复杂度上看：

- `RO` 的核心是膜通量、渗透压、浓差极化、质量传递和压降耦合。
- `NF 0D` 是一个“回收率 + 截留率 + 电中性补偿”的简化分离模型。
- `NF DSPM-DE 0D` 则是一个包含 Donnan 排斥、空间位阻、介电排斥、孔内扩散/对流/电迁移的机理模型。

因此，如果你的目标是“前端工程快算”，RO 适合保留到通量/渗透压/能耗级别，NF 更适合优先采用 `Nanofiltration0D` 的抽象层；`DSPM-DE` 这类模型更适合后端优化或严格研究计算。

---

## 一、WaterTAP 中 RO 模块的整体结构

### 1.1 模块分层

WaterTAP 的 RO 不是单个文件完成全部计算，而是明确分层：

- `watertap/unit_models/reverse_osmosis_base.py`
  - 放置 RO 的共用变量、共用约束、通量方程、浓差极化方程、初始化与缩放逻辑。
- `watertap/unit_models/reverse_osmosis_0D.py`
  - 在 base 上实现 0D 结构，即只在膜入口/出口离散，使用平均通量完成整体渗透产水计算。
- `watertap/unit_models/reverse_osmosis_1D.py`
  - 同样继承 base，但把进料侧通道建成 1D 膜通道并做空间离散，适合更精细的分布参数求解。

换句话说，RO 的真正“算法心脏”在 `reverse_osmosis_base.py`，而 `0D/1D` 文件主要负责：

- 膜通道几何怎么建
- 压降怎么表示
- 通量积分方式如何与状态块连接

### 1.2 0D RO 的模型结构

根据 WaterTAP 官方文档，`ReverseOsmosis0D` 的结构包括：

- 进料侧：
  - `properties_in`
  - `properties_out`
  - 膜界面状态块 `properties_interface_in / properties_interface_out`
- 渗透侧：
  - `permeate_side` 的入口/出口状态
  - `mixed_permeate` 混合渗透液状态

这种结构的核心含义是：

- 通量方程在膜入口和膜出口两个位置计算
- 膜总产水量不是直接按局部值取，而是用“平均通量 × 膜面积”来构造
- 0D 模型并不意味着完全没有空间概念，而是把空间信息压缩为“入口/出口两点 + 平均值”

### 1.3 RO 的状态变量与关键自由度

RO 文档列出的关键变量包括：

- 溶剂渗透系数 `A_comp`
- 溶质渗透系数 `B_comp`
- 溶剂密度 `dens_solvent`
- 跨膜质量通量 `flux_mass_phase_comp`
- 膜面积 `area`
- 组分回收率 `recovery_mass_phase_comp`
- 体积回收率 `recovery_vol_phase`
- 观测截留率 `rejection_phase_comp`
- 渗透侧传质 `mass_transfer_phase_comp`

可选构造变量包括：

- 压降 `deltaP`
- 浓差极化模数 `cp_modulus`
- 进料侧传质系数 `K`
- 几何量 `length`、`width`
- 水力学量 `Re`、`Sc`、`Sh`、水力直径、摩擦因子、压降梯度等

这说明 WaterTAP 的 RO 并不是单纯的“给定回收率算结果”，而是把膜分离、通道传质和通道水力学整合到同一个 Pyomo/IDAES 单元模型中。

---

## 二、RO 的物理原理与核心方程

### 2.1 Solution-Diffusion（SD）模型

WaterTAP 的 RO base 支持 `TransportModel.SD`。在源码中，溶剂和溶质通量分别写成：

- 溶剂通量：
  - 与膜水力渗透系数 `A`
  - 溶剂密度 `rho`
  - 跨膜净驱动力 `ΔP - Δπ`
  - 直接耦合

官方文档给出的 0D RO 方程可写为：

- 溶剂通量（SD）：
  - `J_solvent = rho_solvent * A * (P_f - P_p - (pi_f - pi_p))`
- 溶质通量（SD）：
  - `J_solute = B * (C_f - C_p)`

源码中这两个方程落实在 `reverse_osmosis_base.py` 的 `eq_flux_mass` 约束中。其实现细节是：

- 对溶剂：
  - 进料体相压力减去渗透侧压力
  - 再减去膜界面渗透压与渗透侧渗透压的差
- 对溶质：
  - 用膜界面浓度减去渗透侧浓度

这里非常关键的一点是：WaterTAP 在溶质项里用的是“膜界面浓度”，不是简单的体相浓度。因此 RO 的真正难点之一不是通量公式本身，而是膜界面浓度如何得到。

### 2.2 Spiegler-Kedem-Katchalsky（SKK）模型

WaterTAP 也支持 `TransportModel.SKK`，在文档中对应方程为：

- 溶剂通量（SKK）：
  - `J_solvent = rho_solvent * A * (P_f - P_p - sigma * (pi_f - pi_p))`
- 溶质通量（SKK）：
  - `J_solute = B * (C_f - C_p) + (1 - sigma) * (J_solvent / rho_solvent) * C_f`

源码额外定义：

- 反射系数 `reflect_coeff = sigma`
- `alpha = (1 - sigma) / B`

这意味着在 SKK 模式下，WaterTAP 会把：

- 反射系数引入到渗透压有效项中
- 同时引入一个由对流携带造成的溶质项

工程上可以把它理解为：

- SD 更像“膜内扩散主导”的标准 RO 近似
- SKK 更像对真实半透膜选择性不完全时的更一般表述

### 2.3 浓差极化（Concentration Polarization）

RO 的另一个关键步骤是求膜界面浓度。WaterTAP 在 `ConcentrationPolarizationType.calculated` 时采用：

- `C_interface = C_bulk * exp(Jw / kf) - (Js / Jw) * (exp(Jw / kf) - 1)`

这一定义直接出现在官方 RO 文档中，也在 `reverse_osmosis_base.py` 里通过 `eq_concentration_polarization` 约束实现。

这个方程的意义是：

- 如果没有浓差极化，膜界面浓度大致等于体相浓度
- 一旦跨膜水通量较高，膜表面溶质会被“留在进料侧”，从而导致膜界面浓度高于体相浓度
- 膜界面浓度升高以后，界面渗透压升高，又会反过来降低净驱动力

因此 WaterTAP 的 RO 是一个显式耦合闭环：

1. 压差和渗透压决定水通量
2. 水通量和传质系数决定浓差极化
3. 浓差极化抬高膜界面浓度和膜界面渗透压
4. 膜界面渗透压又反过来影响水通量

这正是 RO 不适合“只靠一条闭式公式完全解释”的根本原因。

### 2.4 传质系数与通道水力学

当 `mass_transfer_coefficient = calculated` 时，WaterTAP 会继续求：

- `k_f = D * Sh / d_h`
- `Sh = 0.46 * (Re * Sc)^0.36`
- `Sc = mu / (rho * D)`
- `Re = rho * v_f * d_h / mu`

这说明 WaterTAP 的 RO 不是简单把 `k_f` 当常数，而是允许它随着：

- 流速
- 粘度
- 扩散系数
- 几何尺寸

自动变化。

### 2.5 压降和几何

如果压降需要显式计算，WaterTAP 继续使用：

- 平板或卷式膜面积公式
- 通道截面积
- 进料流速
- 摩擦因子
- 压降梯度

文档中给出的典型关系包括：

- 平板膜面积：`A_m = L * W`
- 卷式膜面积：`A_m = 2 * L * W`
- 压降：`ΔP = (ΔP / Δx)_avg * L`
- 进料流速：`v_f = Q_f / A_c`
- 压降梯度：`ΔP / Δx = (1 / (2 d_h)) * f * rho * v_f^2`

所以 RO 在 WaterTAP 中本质上是“膜传输 + 边界层传质 + 通道流动”三部分耦合模型。

---

## 三、RO 的完整计算流程

### 3.1 建模阶段

在 `build()` 过程中，RO base 会依次完成：

1. 检查物性包是否只含一个溶剂、单液相。
2. 校验膜模型配置。
3. 构造进料侧膜通道和几何。
4. 构造进料侧状态块、物料衡算、动量衡算、等温约束。
5. 构造膜界面状态块。
6. 构造渗透侧状态块和混合渗透液状态块。
7. 建端口：
   - `inlet`
   - `retentate`
   - `permeate`
8. 增加体积回收率、质量回收率、观测截留率变量。
9. 加入通量平衡、压降、传质耦合约束。

### 3.2 计算阶段

对于 0D RO，计算顺序可以概括为：

1. 根据进料状态块得到进料体相性质。
2. 给膜界面和渗透侧状态块构造初值。
3. 在膜入口和膜出口两个离散点上分别计算：
   - 水通量
   - 溶质通量
   - 膜界面浓度
   - 界面渗透压
4. 对入口和出口通量做平均：
   - `J_avg = (J_in + J_out) / 2`
5. 用平均通量乘膜面积得到总渗透产物流量。
6. 再由总渗透流量回推出：
   - 体积回收率
   - 组分回收率
   - 观测截留率

### 3.3 初始化流程

`initialize_build()` 是 RO 求解成功的关键环节。WaterTAP 的初始化并不是简单“直接求解”，而是：

1. 初始化 feed side。
2. 根据初始化猜测生成 permeate side 的状态参数。
3. 初始化 permeate side 与 mixed permeate。
4. 检查自由度是否符合预期。
5. 调用 `interval_initializer(self)` 做区间预初始化。
6. 调用求解器。
7. 若第一次不收敛，尝试再求解一次。
8. 释放 feed side 初始化时的固定状态。

其默认初始化猜测包括：

- `solvent_recovery`
- `solute_recovery`
- `cp_modulus`
- 压降 `deltaP`

这一步非常重要，因为 RO 模型中的耦合强、非线性强，若没有合理初值：

- 渗透侧浓度可能不合理
- 膜界面渗透压可能失真
- 指数型浓差极化项会放大数值不稳定

### 3.4 数值缩放

RO base 还专门实现了 `calculate_scaling_factors()`。WaterTAP 会为：

- 回收率
- 截留率
- 通量变量
- 各类约束

设置或传播缩放因子。

这说明 WaterTAP 的 RO 不是“只要有方程就能算”，而是明确把数值稳定性视为模型设计的一部分。

---

## 四、RO 的算法细节总结

### 4.1 算法本质

RO 的核心不是一条公式，而是一个耦合求解问题：

- 未知量：
  - 局部水通量
  - 局部溶质通量
  - 膜界面浓度
  - 渗透液浓度
  - 压降相关变量
  - 回收率、截留率等结果变量
- 约束：
  - 通量方程
  - 物料平衡
  - 浓差极化
  - 界面/渗透侧状态联系
  - 水力学约束

也就是说，WaterTAP 把 RO 视为“方程组求解”而不是“公式代入”。

### 4.2 为什么 RO 可以做前端快算，但不能完整前端复刻

适合前端快算的部分：

- `A/B` 与压差、渗透压驱动的近似通量趋势
- 回收率、产水量、浓水盐度、比能耗估算
- 简化的渗透压近似
- 固定传质系数或固定浓差极化模数下的快算

不适合完整前端复刻的部分：

- 进料体相、界面、渗透侧三层状态块耦合
- 自动计算 `Re / Sc / Sh / kf`
- 1D 离散膜通道
- 求解器初始化、缩放、重试求解等数值流程

因此，若要做前端版 RO：

- 最合理的方式是保留“净驱动力 + 回收率 + 通量 + 能耗”的工程快算层
- 不要试图在前端复刻完整 RO Pyomo 单元模型

---

## 五、WaterTAP 中 NF 模块的整体结构

WaterTAP 的 NF 至少有两类代表性模型：

### 5.1 `Nanofiltration0D`

这是一个高度工程化、简化的 0D 分离模型。它不尝试细究孔内机理，而是使用：

- 溶剂回收率 `recovery_solvent`
- 溶质截留率 `rejection_comp`
- 电中性补偿离子 `electroneutrality_ion`

来构造分离结果。

它的定位更接近：

- 工程快算
- 方案筛选
- 简化流程模型中的 NF 单元

### 5.2 `NanofiltrationDSPMDE0D`

这是 WaterTAP 中机理更完整的 NF 模型，基于：

- Donnan 排斥
- Steric hindrance（空间位阻）
- Dielectric exclusion（介电排斥）
- 孔内扩散
- 孔内对流
- 电迁移
- 浓差极化

其复杂度远高于 `Nanofiltration0D`。

可以把这两个模块理解为：

- `Nanofiltration0D`：结果型分离模型
- `NanofiltrationDSPMDE0D`：机理型传输模型

---

## 六、NF 0D 模块的原理与算法

### 6.1 模型结构

根据官方文档，`Nanofiltration0D` 由 3 个状态块构成：

- `properties_in`
- `properties_retentate`
- `properties_permeate`

自由度主要包括：

- 入口状态
- 渗透液压力
- 溶剂回收率 `recovery_solvent`
- 各溶质截留率 `rejection_comp`
- 膜面积 `area`
- 可选压降 `deltaP`

### 6.2 核心方程

官方文档给出的基本方程非常直接：

- 组分物料衡算：
  - `F_in,j = F_ret,j + F_perm,j`
- 溶剂回收：
  - `Q_solvent * F_in,j = F_p,j`
- 溶质截留：
  - `r_j = 1 - C_perm,j / C_feed,j`
- 渗透液电中性：
  - `sum(F_perm,j * Z_j) = 0`
- 温度、压力关系：
  - 进出口温度相等
  - retentate 压力与进料压力之间可带压降

源码实现上，它的关键逻辑是：

1. 溶剂直接按 `recovery_solvent` 分流到 permeate。
2. 普通溶质按 `rejection_comp` 把 permeate 浓度与 feed 浓度联系起来。
3. 若指定 `electroneutrality_ion`，则该离子的截留不直接指定，而是由渗透液电中性约束反求。

这一点非常实用，因为现实 NF 对离子分离常常必须满足整体电荷平衡。

### 6.3 初始化算法

`Nanofiltration0DInitializer` 的逻辑非常清晰：

1. 先初始化 inlet state。
2. 再根据 inlet state 推测 retentate 和 permeate 的状态变量初值。
3. 对于流量变量：
   - 溶剂按 `recovery_solvent` 分流
   - 溶质按 `1 - rejection_comp` 分流
   - 电中性离子暂按溶剂分流近似初始化
4. 对于浓度和分数变量：
   - 同样按上述 split 规则先算名义分配
   - 再归一化
5. 初始化 outlet states。
6. 求解完整模型。

也就是说，`Nanofiltration0D` 的初始化并不难，它本质上依赖“先做一个 split-based 初始猜测，再交给求解器细化”。

### 6.4 为什么 `Nanofiltration0D` 很适合前端实现

这是 WaterTAP 里最适合前端化的 NF 层级之一，原因是：

- 方程闭环简单
- 自由度少
- 结果对用户可解释
- 不要求显式求孔内电势和界面配分

如果你后续要把 NF 放进首页或 calculators 页面，最适合参考的就是这个层级，而不是 DSPM-DE。

---

## 七、NF DSPM-DE 0D 模块的原理与算法

### 7.1 模型目标

`NanofiltrationDSPMDE0D` 试图回答的不是“给定截留率会得到什么结果”，而是：

- 为什么不同离子会有不同截留率
- 膜电荷、孔径、介电常数和离子价态如何共同决定分离

因此它是机理解释模型，不是简单经验分流模型。

### 7.2 结构与状态块

官方文档说明该模型一共包含 11 个状态块，覆盖：

- 进料体相入口/出口
- 膜界面入口/出口
- 孔入口入口/出口
- 孔出口入口/出口
- 渗透侧入口/出口
- 最终混合渗透液

这说明该模型把“从进料体相到渗透液”的路径拆成多个物理位置：

1. 进料体相
2. 进料侧膜界面
3. 膜孔入口
4. 膜孔出口
5. 渗透侧体相

这个分层是 DSPM-DE 能表达机理的前提。

### 7.3 核心物理组成

WaterTAP 的 DSPM-DE 模型中，离子跨膜传输由三类机制叠加：

1. 扩散
2. 对流
3. 电迁移

文档中的扩展 Nernst-Planck 关系可概括为：

- 溶质通量 = 扩散项 + 对流项 + 电迁移项

源码里这三个部分分别对应：

- `diffusive_term`
- `convective_term`
- `electromigration_term`

然后在 `eq_solute_flux_pore_domain` 中把它们加总，等于孔内溶质通量。

### 7.4 水通量方程

DSPM-DE 中水通量由 Hagen-Poiseuille 关系给出：

- `J_w = ((P_f - P_p) - Delta pi) * r_pore^2 / (8 * visc * membrane_thickness_effective)`

这意味着 WaterTAP 在这个 NF 机理模型里：

- 不再把水通量抽象成一个经验回收率
- 而是显式用孔径、膜厚、粘度和净压差决定水通量

### 7.5 配分与排斥

在膜界面上，WaterTAP 将离子配分拆成 3 个贡献因子：

1. `partition_factor_steric_comp`
   - 空间位阻项
   - 与 `lambda = r_stokes / r_pore` 有关
2. `partition_factor_born_solvation_comp`
   - Born 溶剂化自由能项
   - 反映介电环境变化带来的离子进入孔道能垒
3. `partition_factor_donnan_comp_*`
   - Donnan 电势项
   - 反映膜电荷与离子价态引起的界面排斥或富集

文档中的界面平衡表达式可以概括为：

- 膜内浓度 / 膜外浓度
  = `steric * born * donnan`

这比经验截留模型更“底层”，也更难前端化。

### 7.6 阻碍因子与孔扩散

WaterTAP 还显式计算：

- 扩散阻碍因子 `K_d`
- 对流阻碍因子 `K_c`
- 孔扩散系数 `D_p = K_d * D_inf`

这些量都来自 `lambda = r_stokes / r_pore`，也就是“离子尺寸相对孔径的比例”。

所以 DSPM-DE 的基本逻辑是：

1. 先由孔径和离子大小决定几何可进入性
2. 再由介电环境决定能量可进入性
3. 再由膜电荷和电势差决定电化学可进入性
4. 再由扩散/对流/电迁移共同决定孔内传输速率

### 7.7 浓差极化与边界层传质

若开启 `concentration_polarization_type = calculated`，WaterTAP 还会在 feed 到 interface 的边界层上写：

- 扩散回传
- 对流带入
- 电迁移项

对应源码中的 `eq_solute_flux_concentration_polarization`。

这意味着 DSPM-DE 中不仅孔内有 Nernst-Planck，孔外边界层也不是简单经验项，而是包含更复杂的传质关系。

### 7.8 初始化流程

DSPM-DE 的初始化比 NF 0D 和 RO 都更重：

1. 构造对 retentate、permeate、interface、pore entrance、pore exit 的初始状态猜测。
2. 使用：
   - `solvent_recovery`
   - `solute_recovery`
   - `deltaP`
   - `cp_modulus`
   作为初始化猜测参数。
3. 初始化所有状态块。
4. 给入口/出口通量变量赋初值。
5. 再把完整模型交给求解器。

WaterTAP 源码里对这个模型还有多处注释说明：

- 还有待进一步改进初始化鲁棒性
- 还有待进一步改进缩放
- 某些约束存在数值敏感性

这进一步说明：DSPM-DE 是研究级模型，不是轻量网页公式模型。

---

## 八、RO 与 NF 两条线的本质区别

### 8.1 RO

RO 的 WaterTAP 实现重点是：

- 水和盐的跨膜传输
- 浓差极化
- 通道压降
- 通量与总产物流量的耦合

它的复杂度主要来自：

- 渗透压反馈
- 膜界面浓度反馈
- 通道传质系数和压降反馈

### 8.2 NF 0D

NF 0D 的 WaterTAP 实现重点是：

- 回收率和截留率定义
- 组分分流
- 渗透液电中性闭合

它的复杂度较低，本质上是可解释的分离平衡/分流模型。

### 8.3 NF DSPM-DE

NF DSPM-DE 的 WaterTAP 实现重点是：

- 孔尺度机理
- 界面配分
- 膜电荷
- 介电效应
- 扩散/对流/电迁移耦合

它更像“研究型膜传输求解器中的一个 NF 单元”。

---

## 九、对前端实现的直接启示

### 9.1 可以前端化的层级

适合前端 JS/TS 的层级：

- RO：
  - 净驱动力近似
  - 回收率
  - 浓缩倍数
  - 膜面积
  - 比能耗
- NF：
  - `Nanofiltration0D` 这种回收率 + 截留率 + 电中性近似层
  - 单溶质或少数代表离子的分离趋势估算

### 9.2 不适合纯前端完整移植的层级

不建议纯前端完整移植：

- `reverse_osmosis_base.py` 的完整耦合求解链
- `reverse_osmosis_1D.py`
- `nanofiltration_DSPMDE_0D.py`

原因不是“不能写成 JS”，而是：

- 这些模块真正依赖的是非线性方程组求解，而不是单步代数运算
- 初始化、缩放、求解重试本身就是算法的一部分
- 没有 Pyomo/IDAES 求解器时，很难稳定复刻 WaterTAP 的完整行为

### 9.3 对你当前产品最有价值的抽象层

如果你的目标是“首页 / calculators 页面”：

- RO：建议采用 `reverse_osmosis_base + reverse_osmosis_0D` 的工程抽象层
  - 但只保留对用户最重要的净压差、回收率、浓水盐度、能耗和膜面积
- NF：建议优先借鉴 `Nanofiltration0D`
  - 不建议直接前端化 DSPM-DE

---

## 十、结论

WaterTAP 中的 RO 和 NF 并不是同一复杂度层级的模型。

- RO 的主线是：
  - 以 `reverse_osmosis_base.py` 为核心
  - 用膜通量、浓差极化、传质系数、压降和面积耦合求解
  - `0D` 版本采用入口/出口两点通量平均，`1D` 版本进一步做空间离散

- NF 的主线则明显分成两类：
  - `Nanofiltration0D`：工程型、结果型、适合前端抽象
  - `NanofiltrationDSPMDE0D`：机理型、研究型、依赖复杂非线性求解

从“产品化”和“前端化”的角度看，最重要的判断是：

- WaterTAP 可作为方法论来源和参数结构来源
- 但不能把所有 WaterTAP 模块都视为可以前端复刻的网页公式

对你的项目而言，最合理的路径是：

1. 把 RO 的 0D 工程抽象层做成前端快算器。
2. 把 NF 先按 `Nanofiltration0D` 的结构做成前端快算器。
3. 把 DSPM-DE 保留为“需要更高保真度时的后端研究级模块参考”。

---

## 参考来源

### 官方文档

- WaterTAP Reverse Osmosis (0D)
  - https://watertap.readthedocs.io/en/latest/technical_reference/unit_models/reverse_osmosis_0D.html
- WaterTAP Nanofiltration (0D)
  - https://watertap.readthedocs.io/en/latest/technical_reference/unit_models/nanofiltration_0D.html
- WaterTAP Nanofiltration DSPM-DE (0D)
  - https://watertap.readthedocs.io/en/latest/technical_reference/unit_models/nanofiltration_dspmde_0D.html

### 源码

- RO base
  - https://github.com/watertap-org/watertap/blob/main/watertap/unit_models/reverse_osmosis_base.py
- RO 0D
  - https://github.com/watertap-org/watertap/blob/main/watertap/unit_models/reverse_osmosis_0D.py
- RO 1D
  - https://github.com/watertap-org/watertap/blob/main/watertap/unit_models/reverse_osmosis_1D.py
- NF 0D
  - https://github.com/watertap-org/watertap/blob/main/watertap/unit_models/nanofiltration_0D.py
- NF DSPM-DE 0D
  - https://github.com/watertap-org/watertap/blob/main/watertap/unit_models/nanofiltration_DSPMDE_0D.py
