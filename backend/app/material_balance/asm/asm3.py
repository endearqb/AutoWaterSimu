import torch

from .common import safe_div, monod, inhibition


def reaction(params: torch.Tensor, C: torch.Tensor) -> torch.Tensor:
    """
    仅计算 ASM3 的“反应项”dC/dt|reaction（不含体积/进出流项，也不含 KLa 与温度修正）
    期望的状态量顺序（13 个）：
        0  X_H    异养菌
        1  X_A    自养硝化菌
        2  X_S    颗粒可降解有机物
        3  X_I    颗粒惰性有机物
        4  X_ND   颗粒有机氮
        5  X_STO  储存产物（聚合物）
        6  S_O    溶解氧
        7  S_S    可溶性可降解有机物
        8  S_NO   硝酸盐/亚硝酸盐氮（NOx-）
        9  S_NH   铵氮（NH4+-N）
        10 S_ND   可溶性有机氮
        11 S_ALK  碱度（以当量计）
        12 S_I    可溶惰性有机物

    参数向量 params 采用 37 个参数（与常见 ASM3 记法一致）：
        —— 前 21 个为动力学/饱和常数等（可被温度修正）——
        0  k_H       # 颗粒基质水解最大速率（d^-1）
        1  K_X       # 水解：XS/XH 比的半饱和常数（无量纲）
        2  k_STO     # 储存速率常数（d^-1）
        3  ny_NOX    # 缺氧修正系数（η_NOX）
        4  K_O2      # 异养过程 DO 半饱和（mgO2/L）
        5  K_NOX     # 异养缺氧过程 NOx- 半饱和（mgN/L）
        6  K_S       # S_S 半饱和（mgCOD/L）
        7  K_STO     # X_STO/XH 半饱和（无量纲）
        8  mu_H      # 异养最大生长速率（d^-1）
        9  K_NH4     # NH4 半饱和（mgN/L）
        10 K_ALK     # 碱度半饱和（meq/L 或等效单位）
        11 b_HO2     # 异养好氧内源衰亡（d^-1）
        12 b_HNOX    # 异养缺氧内源衰亡（d^-1）
        13 b_STOO2   # 储存物好氧氧化（d^-1）
        14 b_STONOX  # 储存物缺氧氧化（d^-1）
        15 mu_A      # 自养最大生长速率（d^-1）
        16 K_ANH4    # 自养 NH4 半饱和（mgN/L）
        17 K_AO2     # 自养 DO 半饱和（mgO2/L）
        18 K_AALK    # 自养碱度半饱和（meq/L）
        19 b_AO2     # 自养好氧内源衰亡（d^-1）
        20 b_ANOX    # 自养缺氧内源衰亡（d^-1）
        —— 后 16 个为化学计量/组成参数（通常不做温度修正）——
        21 f_SI
        22 Y_STOO2
        23 Y_STONOX
        24 Y_HO2
        25 Y_HNOX
        26 Y_A
        27 f_XI
        28 i_NSI
        29 i_NSS
        30 i_NXI
        31 i_NXS
        32 i_NBM
        33 i_SSXI
        34 i_SSXS
        35 i_SSBM
        36 i_SSSTO

    返回：
        dC/dt（反应项），形状 [batch, 13]
    """

    # =========================
    # 1) 解包状态量（逐列取，保持批量一维）——
    # =========================
    X_H = C[:, 0]   # 异养菌
    X_A = C[:, 1]   # 自养菌
    X_S = C[:, 2]   # 颗粒可降解有机物
    X_I = C[:, 3]   # 颗粒惰性有机物
    X_ND = C[:, 4]  # 颗粒有机氮
    X_STO = C[:, 5]   # 储存产物
    S_O = C[:, 6]   # 溶解氧
    S_S = C[:, 7]   # 可溶易降解有机物
    S_NO = C[:, 8]   # NOx-
    S_NH = C[:, 9]   # NH4-N
    S_ND = C[:, 10]  # 可溶有机氮
    S_ALK = C[:, 11]  # 碱度
    S_I = C[:, 12]   # 可溶惰性有机物

    # =========================
    # 2) 解包参数（向量化，逐列）——
    # =========================
    k_H, K_X, k_STO, ny_NOX, K_O2, K_NOX, K_S, K_STO, mu_H, K_NH4, K_ALK, \
    b_HO2, b_HNOX, b_STOO2, b_STONOX, mu_A, K_ANH4, K_AO2, K_AALK, b_AO2, b_ANOX = params[:, :21].unbind(dim=1)

    f_SI, Y_STOO2, Y_STONOX, Y_HO2, Y_HNOX, Y_A, f_XI, i_NSI, i_NSS, i_NXI, \
    i_NXS, i_NBM, i_SSXI, i_SSXS, i_SSBM, i_SSSTO = params[:, 21:37].unbind(dim=1)

    # =========================
    # 3) 单调/抑制项（全部用安全除法，避免除零）——
    # =========================
    one = X_H.new_tensor(1.0)                                 # 常数 1（与张量的 dtype/device 一致）
    XS_XH = safe_div(X_S, X_H)                           # XS/XH 比值（用于水解饱和项）
    XSTO_XH = safe_div(X_STO, X_H)                           # XSTO/XH 比值（用于储存驱动的生长）
    f_O2 = monod(S_O, K_O2)
    f_NOX = monod(S_NO, K_NOX)
    f_S = monod(S_S, K_S)
    f_STO = monod(XSTO_XH, K_STO)
    f_NH4_H = monod(S_NH, K_NH4)
    f_ALK_H = monod(S_ALK, K_ALK)
    f_O2A = monod(S_O, K_AO2)
    f_NH4_A = monod(S_NH, K_ANH4)
    f_ALK_A = monod(S_ALK, K_AALK)
    f_noO2 = inhibition(S_O, K_O2)

    # =========================
    # 4) 过程速率（与文献常见 proc1~proc12 对齐）——
    # =========================
    r1 = k_H * safe_div(XS_XH, K_X + XS_XH) * X_H                          # 1. 颗粒基质水解
    r2 = k_STO * f_O2 * f_S * X_H                                                 # 2. 好氧储存
    r3 = k_STO * ny_NOX * f_noO2 * f_NOX * f_S * X_H                               # 3. 缺氧储存
    r4 = mu_H * f_O2 * f_NH4_H * f_ALK_H * f_STO * X_H                           # 4. 好氧异养（用储存物生长）
    r5 = mu_H * ny_NOX * f_noO2 * f_NOX * f_NH4_H * f_ALK_H * f_STO * X_H         # 5. 缺氧异养（用储存物生长）
    r6 = b_HO2 * f_O2 * X_H                                                     # 6. 异养好氧内源衰亡
    r7 = b_HNOX * f_noO2 * f_NOX * X_H                                             # 7. 异养缺氧内源衰亡
    r8 = b_STOO2 * f_O2 * X_STO                                                  # 8. 储存物好氧氧化
    r9 = b_STONOX * f_noO2 * f_NOX * X_STO                                          # 9. 储存物缺氧氧化
    r10 = mu_A * f_O2A * f_NH4_A * f_ALK_A * X_A                                   # 10. 自养硝化（好氧）
    r11 = b_AO2 * f_O2A * X_A                                                       # 11. 自养好氧内源衰亡
    r12 = b_ANOX * inhibition(S_O, K_AO2) * f_NOX * X_A

    # =========================
    # 5) 化学计量系数（与参考实现一致的系数展开）——
    # =========================
    cn1 = 64.0/14.0   # NOx-O2 当量系数
    cn2 = 24.0/14.0   # NOx ↔ N 的计量修正

    # x 系列（COD/O2/NOx 相关）
    x1 = 1.0 - f_SI
    x2 = -1.0 + Y_STOO2
    x3 = (-1.0 + Y_STONOX) / (cn1 - cn2)
    x4 = 1.0 - 1.0 / Y_HO2
    x5 = (1.0 - 1.0 / Y_HNOX) / (cn1 - cn2)
    x6 = -1.0 + f_XI
    x7 = (f_XI - 1.0) / (cn1 - cn2)
    x8 = -1.0
    x9 = -1.0 / (cn1 - cn2)
    x10 = -(cn1) / Y_A + 1.0
    x11 = f_XI - 1.0
    x12 = (f_XI - 1.0) / (cn1 - cn2)

    # y 系列（氮守恒/计量）
    y1 = -f_SI * i_NSI - (1.0 - f_SI) * i_NSS + i_NXS
    y2 = i_NSS
    y3 = i_NSS
    y4 = -i_NBM
    y5 = -i_NBM
    y6 = -f_XI * i_NXI + i_NBM
    y7 = -f_XI * i_NXI + i_NBM
    y10 = -1.0 / Y_A - i_NBM
    y11 = -f_XI * i_NXI + i_NBM
    y12 = -f_XI * i_NXI + i_NBM

    # z 系列（碱度折算，除以 14 把 N→当量）
    z1 = y1 / 14.0
    z2 = y2 / 14.0
    z3 = y3 / 14.0 - x3 / 14.0
    z4 = y4 / 14.0
    z5 = y5 / 14.0 - x5 / 14.0
    z6 = y6 / 14.0
    z7 = y7 / 14.0 - x7 / 14.0
    z9 = -x9 / 14.0
    z10 = y10 / 14.0 - 1.0 / (Y_A * 14.0)
    z11 = y11 / 14.0
    z12 = y12 / 14.0 - x12 / 14.0

    # t 系列（悬浮固体惰性配比；此处只用到 f_XI 的去向，不显式计入 XTSS）
    t2 = Y_STOO2 * i_SSSTO
    t3 = Y_STONOX * i_SSSTO
    t4 = i_SSBM - 1.0 / Y_HO2 * i_SSSTO
    t5 = i_SSBM - 1.0 / Y_HNOX * i_SSSTO
    t6 = f_XI * i_SSXI - i_SSBM
    t7 = f_XI * i_SSXI - i_SSBM
    t8 = -i_SSSTO
    t9 = -i_SSSTO
    t10 = i_SSBM
    t11 = f_XI * i_SSXI - i_SSBM
    t12 = f_XI * i_SSXI - i_SSBM

    # =========================
    # 6) 组装各状态量的“反应项”——
    # =========================

    # 溶解氧：储存/生长/衰亡/自养硝化等对 O2 的净效应（不含 KLa，KLa 请在外层叠加）
    dS_O = x2*r2 + x4*r4 + x6*r6 + x8*r8 + x10*r10 + x11*r11

    # 可溶惰性：由水解把 XS 中的惰性部分转为 SI
    dS_I = f_SI * r1

    # 可溶基质：水解贡献与储存消耗的净效应
    dS_S = x1*r1 - r2 - r3

    # NH4-N：按氮计量把各过程折算到铵氮（同你 ASM3 实现）
    dS_NH = (y1*r1 + y2*r2 + y3*r3 + y4*r4 + y5*r5 + y6*r6 + y7*r7
             + y10*r10 + y11*r11 + y12*r12)

    # NOx-：缺氧储存/反硝化、自养硝化对 NOx- 的综合影响
    dS_NO = x3*r3 + x5*r5 + x7*r7 + x9*r9 + (1.0 / Y_A)*r10 + x12*r12

    # 碱度：把氮相关过程按等价当量折算
    dS_ALK = (z1*r1 + z2*r2 + z3*r3 + z4*r4 + z5*r5 + z6*r6 + z7*r7
              + z9*r9 + z10*r10 + z11*r11 + z12*r12)

    # 颗粒惰性：由菌体衰亡按 f_XI 进入惰性颗粒库
    dX_I = f_XI*(r6 + r7 + r11 + r12)

    # 颗粒基质 XS：被水解消耗
    dX_S = -r1

    # 异养菌：由储存驱动的生长，减去内源衰亡
    dX_H = r4 + r5 - r6 - r7

    # 储存产物：由储存生成，生长与氧化消耗
    dX_STO = Y_STOO2*r2 + Y_STONOX*r3 - (1.0/Y_HO2)*r4 - (1.0/Y_HNOX)*r5 - r8 - r9

    # 自养菌：好氧增长，减内源衰亡（含可选缺氧衰亡）
    dX_A = r10 - r11 - r12

    # —— 有机氮相（S_ND & X_ND）：采用与你 ASM1 一致的处理 ——
    # 颗粒有机氮由菌体衰亡产生 + 水解转为 S_ND
    # （衰亡来源：X_H -> r6+r7，X_A -> r11+r12；水解按与 XS 相同的动力学模板）
    hyd_XND = k_H * safe_div(safe_div(X_ND, X_H), K_X + safe_div(X_ND, X_H)) * X_H  # X_ND 的“类水解”
    dX_ND = ((i_NBM - f_XI*i_NXI) * (r6 + r7)    # 异养衰亡 -> X_ND 份额
             + (i_NBM - f_XI*i_NXI) * (r11 + r12)  # 自养衰亡 -> X_ND 份额
             - hyd_XND)                           # 颗粒有机氮被水解

    # 溶有机氮：被异养同化/降解（K_a 项），并由 X_ND 水解补给
    dS_ND = -(K_A := params[:, 16]*0 + 0.0)    # 占位，避免静态检查报错
    #  若你已有“溶有机氮同化速率常数 K_a（d^-1）”，请把它作为额外参数传入；
    #  下面给出一个与 ASM1 同步的写法（假设 K_a 在 ASM3param 的外部单独管理）：
    # dS_ND = - safe_div(self.K_a * S_ND * X_H, one) + hyd_XND

    # 若你已经在 ASM1 用的 K_a、K_h、n_h 等常数想直接沿用，可把它们以类属性提供，这里改成：
    # if hasattr(self, "K_a") and hasattr(self, "K_h") and hasattr(self, "n_h"):
    #     # 采用与 ASM1 一致的“溶有机氮同化 + X_ND 水解补给”结构
    #     dS_ND = - safe_div(self.K_a * S_ND * X_H, one) + \
    #             safe_div(self.K_h * ( safe_div(X_ND, X_H) /
    #             (K_X + safe_div(X_ND, X_H)) ) * ( f_O2*X_H + self.n_h * f_noO2 * f_NOX * X_H ), one)
    #     # 同时把 dX_ND 的“类水解”改为与上式一致：
    #     dX_ND = ( (i_NBM - f_XI*i_NXI) * (r6 + r7 + r11 + r12)
    #               - safe_div(self.K_h * ( safe_div(X_ND, X_H) /
    #                 (K_X + safe_div(X_ND, X_H)) ) * ( f_O2*X_H + self.n_h * f_noO2 * f_NOX * X_H ), one) )

    # =========================
    # 7) 返回拼装（顺序与输入一致）
    # =========================
    return torch.stack([
        dX_H,    # 0  异养菌
        dX_A,    # 1  自养菌
        dX_S,    # 2  颗粒可降解有机物
        dX_I,    # 3  颗粒惰性有机物
        dX_ND,   # 4  颗粒有机氮
        dX_STO,  # 5  储存产物
        dS_O,    # 6  溶解氧（不含 KLa）
        dS_S,    # 7  可溶有机物
        dS_NO,   # 8  NOx-
        dS_NH,   # 9  NH4-N
        dS_ND,   # 10 溶有机氮
        dS_ALK,  # 11 碱度
        dS_I     # 12 可溶惰性有机物
    ], dim=1)
