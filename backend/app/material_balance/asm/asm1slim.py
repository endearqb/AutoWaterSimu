import torch

from .common import safe_div, monod


def reaction(params: torch.Tensor, C: torch.Tensor) -> torch.Tensor:
    # Extract the relevant variables from the matrix
    S_O = C[:, 0]
    S_S = C[:, 1]
    S_NO = C[:, 2]
    S_NH = C[:, 3]
    S_ALK = C[:, 4]
    # params shape: [n_asm1slim_nodes, 7]
    dSNOmax = params[:, 0]
    dSNHmax = params[:, 1]
    CNRatio = params[:, 2]
    K_S = params[:, 3]
    K_NO = params[:, 4]
    n_g = params[:, 5]
    K_NH = params[:, 6]

    # 使用安全除法计算Monod函数
    KNO = monod(S_NO, K_NO)
    KNH = monod(S_NH, K_NH)
    KS = monod(S_S, K_S)

    # 对特定条件进行覆盖（不在torch.where中写除法）
    KNH = torch.where(S_ALK < 0.4, torch.zeros_like(KNH), KNH)

    # 计算各项变化率，先计算基础值再进行条件覆盖
    dS_NO0_base = -dSNOmax * torch.min(KS, KNO)
    dS_NO0 = torch.where(S_O < 0.5, dS_NO0_base, torch.zeros_like(dS_NO0_base))

    dS_S0 = dS_NO0 * CNRatio

    dS_S1_base = -KS * dSNOmax * safe_div(CNRatio, n_g)
    dS_S1 = torch.where(S_O > 0.5, dS_S1_base, torch.zeros_like(dS_S1_base))

    dS_S2 = dS_S0
    dS_NO1 = dS_NO0

    dS_NO2_base = KNH * dSNHmax
    dS_NO2 = torch.where(S_O > 0.5, dS_NO2_base, torch.zeros_like(dS_NO2_base))

    dS_NH1 = -dS_NO2

    # 使用安全除法处理常数除法
    dS_ALK2 = -safe_div(dS_NO1, S_O.new_tensor(14.0))
    dS_ALK3 = safe_div(dS_NH1, S_O.new_tensor(14.0)) - safe_div(dS_NO2, S_O.new_tensor(14.0))

    dS_O1 = dS_S1 + dS_S1 * safe_div(CNRatio - S_O.new_tensor(2.86), CNRatio)
    dS_O2 = S_O.new_tensor(-4.57) * dS_NO2 + dS_NO2 * S_O.new_tensor(0.24)

    dS_S = dS_S1 + dS_S2
    dS_NO = dS_NO1 + dS_NO2
    dS_NH = dS_NH1
    dS_Alk = dS_ALK2 + dS_ALK3
    dS_O = dS_O1 + dS_O2

    # 这里不考虑溶解氧的变化，所以设置为0
    dS_O = torch.zeros_like(dS_O)
    return torch.stack([dS_O, dS_S, dS_NO, dS_NH, dS_Alk], dim=1)
