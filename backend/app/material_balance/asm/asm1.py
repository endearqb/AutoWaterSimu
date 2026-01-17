import torch

from .common import safe_div, monod, inhibition


def reaction(params: torch.Tensor, C: torch.Tensor) -> torch.Tensor:
    # Extract the relevant variables from the matrix
    X_BH = C[:, 0]
    X_BA = C[:, 1]
    X_S = C[:, 2]
    X_i = C[:, 3]
    X_ND = C[:, 4]
    S_O = C[:, 5]
    S_S = C[:, 6]
    S_NO = C[:, 7]
    S_NH = C[:, 8]
    S_ND = C[:, 9]
    S_ALK = C[:, 10]

    u_H, K_S, K_OH, K_NO, n_g, b_H, u_A, K_NH, K_OA, b_A, \
    Y_H, Y_A, i_XB, i_XP, f_P, n_h, K_a, K_h, K_x = params.unbind(dim=1)

    # 使用安全除法计算所有Monod/抑制函数
    KS = monod(S_S, K_S)
    KOH = monod(S_O, K_OH)
    KOHa = inhibition(S_O, K_OH)
    KNO = monod(S_NO, K_NO)
    KNH = monod(S_NH, K_NH)
    KOA = monod(S_O, K_OA)

    # 对特定条件进行覆盖（不在torch.where中写除法）
    KS = torch.where(S_S < 5, torch.zeros_like(KS), KS)
    KOH = torch.where(S_O < 0.01, torch.zeros_like(KOH), KOH)
    KOHa = torch.where(S_O < 1.5, KOHa, torch.zeros_like(KOHa))
    u_A = torch.where((S_O < 0.5) | (S_ALK < 0.5), torch.zeros_like(u_A), u_A)

    # 计算KXS和KXND，先安全算比值，再条件覆盖
    ratio_XS_XBH = safe_div(X_S, X_BH)
    ratio_XND_XBH = safe_div(X_ND, X_BH)

    KXS = X_BH.new_tensor(1.0) - safe_div(K_x, K_x + ratio_XS_XBH)
    KXND = X_BH.new_tensor(1.0) - safe_div(K_x, K_x + ratio_XND_XBH)

    # 对X_BH==0的位置进行显式覆盖
    KXS = torch.where(X_BH <= 0, torch.zeros_like(KXS), KXS)
    KXND = torch.where(X_BH <= 0, torch.zeros_like(KXND), KXND)

    # 使用安全除法处理常数除法
    dX_BHmax = safe_div(u_H * X_BH, X_BH.new_tensor(24.0))
    dX_BAmax = safe_div(u_A * X_BA, X_BH.new_tensor(24.0))

    # 计算dS_NO0，使用安全除法
    factor1 = safe_div(X_BH.new_tensor(1.0) - Y_H, X_BH.new_tensor(2.86))
    factor2 = safe_div(-X_BH.new_tensor(1.0), Y_H)
    dS_NO0 = factor1 * (factor2 * torch.min(torch.min(KS, KOHa), KNO) * n_g * dX_BHmax)

    # 计算dS_S0，使用安全除法
    dS_S0 = dS_NO0 * safe_div(X_BH.new_tensor(2.86), X_BH.new_tensor(1.0) - Y_H)

    dX_BH1 = torch.min(KS, KOH) * dX_BHmax
    dX_BH2 = -dS_S0 * Y_H
    dX_BHr = -safe_div(b_H * X_BH, X_BH.new_tensor(24.0))

    dX_BA1 = torch.min(KNH, KOA) * dX_BAmax
    dX_BAr = -safe_div(b_A * X_BA, X_BH.new_tensor(24.0))

    dX_S1 = -dX_BH1 / Y_H
    dX_S2 = -dS_S0
    dX_S3 = safe_div(-K_h * KXS * (KOH * X_BH + n_h * KOHa * KNO * X_BH), X_BH.new_tensor(24.0))

    dX_i = f_P * dX_BHr + f_P * dX_BAr

    dX_ND1 = i_XB * (dX_BHr + dX_BAr)
    dX_ND2 = (i_XB - f_P * i_XP) * dX_BAr
    dX_ND3 = -safe_div(K_h * KXND * (KOH * X_BH + n_h * KOHa * KNO * X_BH), X_BH.new_tensor(24.0))

    dS_ND1 = -safe_div(K_a * S_ND * X_BH, X_BH.new_tensor(24.0))  # 4-1 溶解有机氮增长速率-异养菌消耗
    dS_ND2 = -dX_ND3  # 4-2 溶解有机氮增长速率-异养菌水解颗粒有机氮

    dS_S1 = -safe_div(X_BH.new_tensor(1.0), Y_H) * dX_BH1  # 6-1 溶解有机物增长速率-异养菌好氧生长
    dS_S2 = dS_S0
    dS_S3 = -dX_S3  # 6-3 溶解有机物增长速率-颗粒有机物的异养菌水解

    dS_NO1 = dS_NO0
    dS_NO2 = safe_div(X_BH.new_tensor(1.0), Y_A) * dX_BA1  # 2-2 硝化硝态氮增长速率

    dS_NH1 = -(i_XB + safe_div(X_BH.new_tensor(1.0), Y_A)) * dX_BA1  # 5-1 氨氮增长速率-自养菌好氧生长
    dS_NH2 = -i_XB * dX_BH1  # 5-2 氨氮增长速率-异养菌好氧生长
    dS_NH3 = -i_XB * dX_BH2  # 5-3 氨氮增长速率-异养菌缺氧生长
    dS_NH4 = -dS_ND1  # 5-4 氨氮增长速率-溶解有机氮异养菌水解

    dS_ALK1 = dS_NH2 / 14
    dS_ALK2 = dS_NH3 / 14 - dS_NO1 / 14
    dS_ALK3 = dS_NH1 / 14 - dS_NO2 / 14
    dS_ALK4 = - dS_ND1 / 14

    dS_O1 = dS_S1 + dX_BH1
    dS_O2 = -4.57 * dS_NO2 + dX_BA1

    dX_BH = dX_BH1 + dX_BH2 + dX_BHr
    dX_BA = dX_BA1 + dX_BAr
    dS_S = dS_S1 + dS_S2 + dS_S3
    dS_NO = dS_NO1 + dS_NO2
    dS_NH = dS_NH1 + dS_NH2 + dS_NH3 + dS_NH4
    dS_ND = dS_ND1 + dS_ND2
    dX_S = dX_S1 + dX_S2 + dX_S3
    dX_i = f_P * dX_BHr + f_P * dX_BAr
    dX_ND = dX_ND1 + dX_ND2 + dX_ND3
    dS_Alk = dS_ALK1 + dS_ALK2 + dS_ALK3 + dS_ALK4
    dS_O = dS_O1 + dS_O2

    return torch.stack([dX_BH, dX_BA, dX_S, dX_i, dX_ND, dS_O, dS_S, dS_NO, dS_NH, dS_ND, dS_Alk], dim=1)
