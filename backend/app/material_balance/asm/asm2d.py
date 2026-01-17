import torch

from .common import safe_div, monod, inhibition


def rates(P: torch.Tensor, C: torch.Tensor) -> torch.Tensor:
    """
    计算 ASM2d 的 21 个“过程速率”（reaction rates），仅反应项；形状 [batch, 21]
    """
    # ---- 0) 防止负值传播，Clamp 输入状态 ----
    C = torch.clamp(C, min=0)

    # ---- 1) 解包状态量（逐列） ----
    S_O2, S_N2, S_NH4, S_NO3, S_PO4, S_F, S_A, S_I, S_ALK, \
    X_I, X_S, X_H, X_PAO, X_PP, X_PHA, X_AUT, X_MeOH, X_MeP = C.unbind(dim=1)

    # ---- 2) 解包参数（逐列） ----
    k_H, K_O2, K_X, K_NO3, eta_NO3, eta_fe, \
    mu_H, K_O2_H, K_F, K_A_H, K_NH4_H, K_P_H, K_ALK_H, K_NO3_H, eta_NO3_H, \
    q_fe, K_fe, b_H, \
    q_PHA, K_A_PAO, K_ALK_PAO, K_PP, \
    q_PP, K_O2_PAO, K_PS, K_PHA, K_MAX, K_IPP, eta_NO3_PAO, K_NO3_PAO, \
    mu_PAO, K_NH4_PAO, K_P_PAO, b_PAO, b_PP, b_PHA, \
    mu_AUT, K_O2_AUT, K_NH4_AUT, K_P_AUT, K_ALK_AUT, b_AUT, \
    k_PRE, k_RED, K_ALK_PRE = P.unbind(dim=1)

    # ---- 3) 常量/函数与安全 Monod ----
    one = S_O2.new_tensor(1.0)

    def M(S: torch.Tensor, K: torch.Tensor) -> torch.Tensor:
        return monod(S, K)

    # 兼硝酸盐门控（好氧、缺氧、厌氧三态）
    f_O2_H = M(S_O2, K_O2)        # 水解：O2 门控
    f_NO3_Hy = M(S_NO3, K_NO3)      # 水解：NO3 门控
    low_O2_H = inhibition(S_O2, K_O2)
    low_NO3 = inhibition(S_NO3, K_NO3)

    f_O2_HH = M(S_O2, K_O2_H)      # 异养生长：O2 门控
    f_NO3_HH = M(S_NO3, K_NO3_H)

    f_O2_PAO = M(S_O2, K_O2_PAO)    # PAO：O2 门控
    f_NO3_PAO = M(S_NO3, K_NO3_PAO)

    f_O2_AUT = M(S_O2, K_O2_AUT)    # 自养：O2 门控

    # 组成/比值项
    XS_over_XH = safe_div(X_S, X_H)
    XPP_over_XPAO = safe_div(X_PP, X_PAO)
    XPHA_over_XPAO = safe_div(X_PHA, X_PAO)

    # ---- 4) 过程速率 r0~r20（全向量化） ----

    rates_list = []

    # (0) 好氧水解：k_H * (XS/XH)/(K_X+XS/XH) * X_H * f_O2
    r0 = k_H * safe_div(XS_over_XH, K_X + XS_over_XH) * X_H * f_O2_H
    rates_list.append(r0)

    # (1) 缺氧水解：同上 * eta_NO3 * (低氧) * f_NO3
    r1 = k_H * safe_div(XS_over_XH, K_X + XS_over_XH) * X_H \
         * eta_NO3 * low_O2_H * f_NO3_Hy
    rates_list.append(r1)

    # (2) 厌氧水解：同上 * eta_fe * (低氧) * (低 NO3)
    r2 = k_H * safe_div(XS_over_XH, K_X + XS_over_XH) * X_H \
         * eta_fe * low_O2_H * low_NO3
    rates_list.append(r2)

    # —— 异养生长（N/P/ALK 营养限制统一项）——
    nutrient_H = M(S_NH4, K_NH4_H) * M(S_PO4, K_P_H) * M(S_ALK, K_ALK_H)

    # (3) 好氧异养（底物 S_F 通道）
    r3 = mu_H * nutrient_H * X_H * M(S_F, K_F) * safe_div(S_F, S_F + S_A) * f_O2_HH
    rates_list.append(r3)

    # (4) 好氧异养（底物 S_A 通道）
    r4 = mu_H * nutrient_H * X_H * M(S_A, K_A_H) * safe_div(S_A, S_F + S_A) * f_O2_HH
    rates_list.append(r4)

    # (5) 缺氧异养（底物 S_F 通道）
    r5 = mu_H * nutrient_H * X_H * M(S_F, K_F) * safe_div(S_F, S_F + S_A) \
         * eta_NO3_H * inhibition(S_O2, K_O2_H) * f_NO3_HH
    rates_list.append(r5)

    # (6) 缺氧异养（底物 S_A 通道）
    r6 = mu_H * nutrient_H * X_H * M(S_A, K_A_H) * safe_div(S_A, S_F + S_A) \
         * eta_NO3_H * inhibition(S_O2, K_O2_H) * f_NO3_HH
    rates_list.append(r6)

    # (7) 发酵（低氧/低 NO3 条件）
    r7 = q_fe * X_H * inhibition(S_O2, K_O2_H) * inhibition(S_NO3, K_NO3_H) \
         * M(S_F, K_fe) * M(S_ALK, K_ALK_H)
    rates_list.append(r7)

    # (8) 异养衰亡
    r8 = b_H * X_H
    rates_list.append(r8)

    # —— PAO 模块 —— #
    # 储存/生长的营养限制
    nutrient_PAO = M(S_ALK, K_ALK_PAO)

    # (9) PHA 储存（厌氧以 VFA 为主）
    r9 = q_PHA * X_PAO * M(S_A, K_A_PAO) * nutrient_PAO * M(XPP_over_XPAO, K_PP)
    rates_list.append(r9)

    # PP 储存的通用“材质三项”：PHA、PP 上限、PO4
    pha_term = M(XPHA_over_XPAO, K_PHA)
    cap_term = M(K_MAX - XPP_over_XPAO, K_IPP)
    po4_term = M(S_PO4, K_PS)

    # (10) PP 好氧储存
    r10 = q_PP * X_PAO * nutrient_PAO * pha_term * cap_term * po4_term * f_O2_PAO
    rates_list.append(r10)

    # (11) PP 缺氧储存
    r11 = q_PP * X_PAO * nutrient_PAO * pha_term * cap_term * po4_term \
          * eta_NO3_PAO * inhibition(S_O2, K_O2_PAO) * f_NO3_PAO
    rates_list.append(r11)

    # —— PAO 生长（以 PHA 为碳源）
    nutrient_PAO_growth = M(S_NH4, K_NH4_PAO) * M(S_PO4, K_P_PAO) * nutrient_PAO

    # (12) PAO 好氧生长
    r12 = mu_PAO * X_PAO * nutrient_PAO_growth * pha_term * f_O2_PAO
    rates_list.append(r12)

    # (13) PAO 缺氧生长
    r13 = mu_PAO * X_PAO * nutrient_PAO_growth * pha_term \
          * eta_NO3_PAO * inhibition(S_O2, K_O2_PAO) * f_NO3_PAO
    rates_list.append(r13)

    # (14) PAO 衰亡（受碱度门控）
    r14 = b_PAO * X_PAO * nutrient_PAO
    rates_list.append(r14)

    # (15) PP 衰亡（受碱度门控）
    r15 = b_PP * X_PP * nutrient_PAO
    rates_list.append(r15)

    # (16) PHA 衰亡（受碱度门控）
    r16 = b_PHA * X_PHA * nutrient_PAO
    rates_list.append(r16)

    # —— 自养（硝化）模块 —— #
    nutrient_AUT = M(S_NH4, K_NH4_AUT) * M(S_PO4, K_P_AUT) * M(S_ALK, K_ALK_AUT)

    # (17) 自养好氧生长（硝化）
    r17 = mu_AUT * X_AUT * nutrient_AUT * f_O2_AUT
    rates_list.append(r17)

    # (18) 自养衰亡
    r18 = b_AUT * X_AUT
    rates_list.append(r18)

    # —— 化学凝聚/沉淀 —— #
    # (19) 磷与 Fe(OH)3 结合生成 FePO4（简化一阶：~ S_PO4 * X_MeOH）
    r19 = k_PRE * S_PO4 * X_MeOH
    rates_list.append(r19)

    # (20) FePO4 的碱度促溶（红溶）
    r20 = k_RED * X_MeP * M(S_ALK, K_ALK_PRE)
    rates_list.append(r20)

    # 拼为 [batch, 21]
    return torch.stack(rates_list, dim=1)


def dC_dt(P: torch.Tensor, C: torch.Tensor, stoich: torch.Tensor) -> torch.Tensor:
    """
    基于 process rates 与计量矩阵，返回 dC/dt|reaction
    """
    process_rates = rates(P, C)      # [B, 21]
    # dC = rates · (stoich)^T
    return process_rates @ stoich.T  # [B, n_states]
