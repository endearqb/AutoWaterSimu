这是一个污水处理模型中普通异养微生物(OHOs)的动力学参数表，中文翻译如下：

| 符号 | 名称 |
|------|------|
| µOHO | OHOs的最大比生长速率 |
| µFERM_OHO | OHOs的发酵生长速率 |
| bOHO | OHOs的衰减速率 |
| ηOHO_anox | OHOs缺氧生长的降低系数 |
| ηOHO_anox_NO2red | OHOs亚硝酸盐还原时缺氧生长的降低系数(仅VFA) |
| KSB_AS | OHOs易生物降解基质的半饱和常数(活性污泥) |
| KO2_OHO_AS | OHOs氧气的半饱和常数(活性污泥) |
| KVFA_AS | OHOs挥发性脂肪酸的半饱和常数(活性污泥) |
| KMEOL_OHO_AS | OHOs甲醇的半饱和常数(活性污泥) |
| KNO3_OHO_AS | OHOs硝酸盐的半饱和常数(活性污泥) |
| LograngeSNO3 | 硝酸盐抑制亚硝酸盐还原的逻辑开关有效范围 |
| LograngeKSNO3 | 硝酸盐饱和对硝酸盐还原的逻辑开关有效范围 |
| KNO2_OHO_AS | OHOs亚硝酸盐的半饱和常数(活性污泥) |
| KVFA_OHO_SNO2_AS | OHOs在亚硝酸盐还原条件下VFA的半饱和常数(活性污泥) |
| LograngeKVFA_SNO2 | VFA饱和对亚硝酸盐还原的逻辑开关有效范围 |
| KVFA_FERM_AS | OHOs发酵过程中VFA的半饱和常数(活性污泥) |
| LograngeVFA_FERM_AS | OHOs VFA发酵的逻辑开关有效范围(活性污泥) |
| KSB_ana_AS | 主流工艺中OHOs发酵的易生物降解基质半饱和常数(活性污泥) |
| KSB_ana_DIG | 消化器中OHOs发酵的易生物降解基质半饱和常数 |

 *  * 注释： *  * 
- AS = Activated Sludge (活性污泥)
- DIG = Digester (消化器)
- VFA = Volatile Fatty Acids (挥发性脂肪酸)


 *  * 缺氧甲醇利用菌动力学参数 (MEOLO) *  * 

| 符号 | 名称 |
|------|------|
| µMEOLO | MEOLOs的最大比生长速率 |
| bMEOLO | MEOLOs的衰减速率 |
| qMEOL | MEOLOs在厌氧条件下的甲醇降解速率 |
| KMEOL_AS | MEOLOs甲醇的半饱和常数(活性污泥) |
| KiO2_MEOLO_AS | MEOLOs氧气的半抑制常数(活性污泥) |
| KNO3_MEOLO_AS | MEOLOs硝酸盐的半饱和常数(活性污泥) |
| KNO2_MEOLO_AS | MEOLOs亚硝酸盐的半饱和常数(活性污泥) |
| KMEOL_SNO2_AS | MEOLOs在亚硝酸盐还原条件下甲醇的半饱和常数(活性污泥) |
| LograngeKMEOL_SNO2 | 甲醇饱和对亚硝酸盐还原的逻辑开关有效范围 |

 *  * 注释： *  * 
- MEOLO = Methanol Oxidizing organisms under anoxic conditions (缺氧甲醇氧化菌)
- AS = Activated Sludge (活性污泥)
- MEOL = Methanol (甲醇)


 *  * 好氧氨氧化菌动力学参数 (AOB) *  * 

| 符号 | 名称 |
|------|------|
| µAOB | AOBs的最大比生长速率 |
| bAOB | AOBs的衰减速率 |
| KNHx_AOB_AS | AOBs氨氮的半饱和常数(活性污泥) |
| KCO2_AOB_pH_AS | AOBs碳酸氢盐的半饱和常数(活性污泥) |
| LograngeCO2_AOB_pH_AS | AOBs碳酸氢盐逻辑开关的有效范围(活性污泥) |
| KCO2_AOB_pH_sidestream | AOBs碳酸氢盐的半饱和常数(侧流) |
| LograngeCO2_AOB_pH_sidestream | AOBs碳酸氢盐逻辑开关的有效范围(侧流) |
| KO2_AOB_sidestream | AOBs氧气的半饱和常数(侧流) |
| KO2_AOB_AS | AOBs氧气的半饱和常数(活性污泥) |
| KNOx_AOB_AS | AOBs氮氧化物(缺氧条件)的半饱和常数(活性污泥) |
| KiHNO2_AOB_pH_AS | AOBs亚硝酸的半抑制常数(活性污泥) |
| pHlow_AOB | AOBs的pH抑制低值 |
| pHhigh_AOB | AOBs的pH抑制高值 |

 *  * 注释： *  * 
- AOB = Ammonia Oxidizing Bacteria (氨氧化菌/氨氧化细菌)
- AS = Activated Sludge (活性污泥)
- NHx = 氨氮(NH₃/NH₄⁺)
- NOx = 氮氧化物
- Sidestream = 侧流(通常指污泥消化液处理线)

这些参数用于描述将氨氮氧化为亚硝酸盐的硝化第一步反应的微生物动力学特性。

这是亚硝酸盐氧化菌(NOB)和厌氧氨氧化菌(AMX)的动力学参数表，中文翻译如下：

 *  * 亚硝酸盐氧化菌动力学参数 (NOB) *  * 

| 符号 | 名称 |
|------|------|
| µNOB | NOBs的最大比生长速率 |
| bNOB | NOBs的衰减速率 |
| KNO2_NOB_AS | NOBs亚硝酸盐的半饱和常数(活性污泥) |
| KCO2_NOB_pH_AS | NOBs碳酸氢盐的半饱和常数(活性污泥) |
| LograngeCO2_NOB_pH_AS | NOBs碳酸氢盐逻辑开关的有效范围(活性污泥) |
| KO2_NOB_sidestream | NOBs氧气的半饱和常数(侧流) |
| KO2_NOB_AS | NOBs氧气的半饱和常数(活性污泥) |
| KNOx_NOB_AS | NOBs氮氧化物(缺氧条件)的半饱和常数(活性污泥) |
| KiNH3_NOB_pH_AS | NOBs氨的半抑制常数(活性污泥) |
| pHlow_NOB | NOBs的pH抑制低值 |
| pHhigh_NOB | NOBs的pH抑制高值 |

 *  * 厌氧氨氧化菌动力学参数 (AMX) *  * 

| 符号 | 名称 |
|------|------|
| µAMX | AMX的最大比生长速率 |
| bAMX | AMXs的衰减速率 |
| KNHx_AMX_AS | AMX氨氮的半饱和常数 |
| KNO2_AMX_AS | AMX亚硝酸盐的半饱和常数 |
| KCO2_AMX_pH_AS | AMX碳酸氢盐的半饱和常数 |
| LograngeCO2_AMX_pH_AS | AMX碳酸氢盐逻辑开关的有效范围(活性污泥) |
| KiO2_AMX_AS | AMX氧气的半抑制常数(活性污泥) |
| KNOx_AMX_AS | AMX氮氧化物的半饱和常数 |
| KiHNO2_AMX_pH_AS | AMX亚硝酸的半抑制常数 |

 *  * 注释： *  *  
- NOB = Nitrite Oxidizing Bacteria (亚硝酸盐氧化菌) - 将NO₂⁻氧化为NO₃⁻
- AMX = Anammox (厌氧氨氧化菌) - 在厌氧条件下将NH₄⁺和NO₂⁻直接转化为N₂
- AS = Activated Sludge (活性污泥)


1. r1	OHO 在 VFAs 上生长，O2
rOHO_g_VFAs_O = µOHO_T * XOHO * MsatSVFA_KVFA * MsatSO2_KO2_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH


2. r2	OHO 在 VFAs 上生长，NO2
rOHO_g_VFAs_NO2 = µOHO_T * XOHO * ηOHO_anox_NO2red * MsatSVFA_KVFA * MsatSNO2_KNO2_OHO * (LoginhSNO3_KNO3_OHO * LoginhSVFA_KVFA_OHO_SNO2 + LogsatSVFA_KVFA_OHO_SNO2) * MinhSO2_KO2_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH

3. r3	OHO 在 VFAs 上生长，NO3
rOHO_g_VFAs_NO3 = µOHO_T * XOHO * ηOHO_anox * MsatSVFA_KVFA * LogsatSNO3_KNO3_OHO * (LoginhSVFA_KVFA_OHO_SNO2 + MinhSNO2_KNO2_OHO * LogsatSVFA_KVFA_OHO_SNO2) * MinhSO2_KO2_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH

4. r4	OHO 在 SB 上生长，O2
rOHO_g_SB_O = µOHO_T * XOHO * MsatSB_KSB * MinhSVFA_KVFA * MsatSO2_KO2_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH

5. r5	OHO 在 SB 上生长，NO2
rOHO_g_SB_NO2 = µOHO_T * XOHO * ηOHO_anox * MsatSB_KSB * MinhSVFA_KVFA * MsatSNO2_KNO2_OHO * MinhSO2_KO2_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH

6. r6	OHO 在 SB 上生长，NO3
rOHO_g_SB_NO3 = µOHO_T * XOHO * ηOHO_anox * MsatSB_KSB * MinhSVFA_KVFA * MsatSNO3_KNO3_OHO * MinhSO2_KO2_OHO * MinhSNO2_KNO2_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH

1. r9	OHO 在 S_MEOL 上生长，O2
rOHO_g_MEOLO_O = µOHO_T * XOHO * MsatSMEOL_KMEOL_OHO * MsatSO2_KO2_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH

1.  r10	OHO 衰减
rOHO_d = bOHO_T * XOHO * (MsatSO2_KO2_OHO + ηb_anox * MsatSNO2_KNO2_OHO * MinhSO2_KO2_OHO + ηb_anox * MsatSNO3_KNO3_OHO * MinhSNO2_KNO2_OHO * MinhSO2_KO2_OHO)

1.  r11	OHO 厌氧衰减
rOHO_d_ana = bOHO_T * XOHO * ηb_ana * MinhSNO2_KNO2_OHO * MinhSNO3_KNO3_OHO * MinhSO2_KO2_OHO

1.  r12	MEOLO 生长，NO2
rMEOLO_g_NO2 = µMEOLO_T * XMEOLO * MsatSMEOL_KMEOL * MsatSNO2_KNO2_MEOLO * (LoginhSNO3_KNO3_MEOLO * LoginhSMEOL_KMEOL_SNO2 + LogsatSMEOL_KMEOL_SNO2) * MinhSO2_KiO2_MEOLO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH

1.  r13	MEOLO 生长，NO3
rMEOLO_g_NO3 = µMEOLO_T * XMEOLO * MsatSMEOL_KMEOL * MsatSNO3_KNO3_MEOLO * LogsatSNO3_KNO3_MEOLO * (LoginhSMEOL_KMEOL_SNO2 + MinhSNO2_KNO2_MEOLO * LogsatSMEOL_KMEOL_SNO2) * MinhSO2_KiO2_MEOLO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH

1.  r14	MEOLO 衰减
r_MEOLO_d = bMEOLO_T * XMEOLO * (MsatSO2_KiO2_MEOLO + ηb_anox * MsatSNO2_KNO2_MEOLO * MinhSO2_KiO2_MEOLO + mtox_anox * MsatSNO3_KNO3_MEOLO * MinhSNO2_KNO2_MEOLO * MinhSO2_KiO2_MEOLO)

1.  r15	MEOLO 厌氧衰减
r_MEOLO_d_ana = bMEOLO_T * XMEOLO * (ηb_ana * MinhSNO2_KNO2_MEOLO * MinhSNO3_KNO3_MEOLO * MinhSO2_KiO2_MEOLO + mtox_ana)

1.  r37	AOB 生长
rAOB_g = µAOB_T * XAOB * MsatSNHx_KNHx_AOB * LogsatpHCO2_AOB * MsatSO2_KO2_AOB * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * MinhpHHNO2_AOB * BellinhpH_AOB

1.  r38	AOB 衰减
rAOB_d = bAOB_T * XAOB * (MsatSO2_KO2_AOB + ηb_anox * MsatSNOx_KNOx_AOB * MinhSO2_KO2_AOB)

1.  r39	AOB 厌氧衰减
rAOB_d_ana = bAOB_T * XAOB * (ηb_ana * MinhSNOx_KNOx_AOB * MinhSO2_KO2_AOB + mtox_ana)

1.  r40	NOB 生长
rNOB_g = µNOB_T * XNOB * MsatSNO2_KNO2_NOB * LogsatpHCO2_NOB * MsatSO2_KO2_NOB * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * MinhpHNH3_NOB * BellinhpH_NOB

1.  r41	NOB 衰减
rNOB_d = bNOB_T * XNOB * (MsatSO2_KO2_NOB + ηb_anox * MsatSNOx_KNOx_NOB * MinhSO2_KO2_NOB)

1.  r42	NOB 厌氧衰减
rNOB_d_ana = bNOB_T * XNOB * (ηb_ana * MinhSNOx_KNOx_NOB * MinhSO2_KO2_NOB + mtox_ana)

1.  r43	厌氧氨氧化菌生长
rAMX_g = µAMX_T * XAMX * MsatSNHx_KNHx_AMX * MsatSNO2_KNO2_AMX * MinhSO2_KiO2_AMX * LogsatpHCO2_AMX * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH * MinhpHHNO2_AMX

1.  r44	厌氧氨氧化菌衰减
rAMX_d = bAMX_T * XAMX * (MsatSO2_KiO2_AMX + ηb_anox * MsatSNOx_KNOx_AMX * MinhSO2_KiO2_AMX)

1.  r45	厌氧氨氧化菌厌氧衰减
rAMX_d_ana = bAMX_T * XAMX * (ηb_ana * MinhSNOx_KNOx_AMX * MinhSO2_KiO2_AMX)

1.  r60	XB 水解
rXB_hyd = qHYD_XB_T * XHET * (LogsatXHET_HYD_lim * MRsatXB_XHET_KHYD + LoginhXHET_HYD_lim * MsatXB_KXB_HYD) * (MsatSO2_KO2_OHO + ηHYD_anox * (MsatSNO2_KNO2_OHO + MsatSNO3_KNO3_OHO * MinhSNO2_KNO2_OHO) * MinhSO2_KO2_OHO + ηHYD_ana * MinhSNO3_KNO3_OHO * MinhSNO2_KNO2_OHO * MinhSO2_KO2_OHO)

1.  r61	XB_e 水解
rXBe_hyd = qHYD_XBe_T * XHET * (LogsatXHET_HYD_lim * MRsatXBe_XHET_KHYD + LoginhXHET_HYD_lim * MsatXBe_KXBe_HYD) * (MsatSO2_KO2_OHO + ηHYD_anox * (MsatSNO2_KNO2_OHO + MsatSNO3_KNO3_OHO * MinhSNO2_KNO2_OHO) * MinhSO2_KO2_OHO + ηHYD_ana * MinhSNO3_KNO3_OHO * MinhSNO2_KNO2_OHO * MinhSO2_KO2_OHO)

1.  r62	SN_B 氨化
rSNB_ammon = qAMMON_T * SN_B * XHET

1.  r63	SP_B 转化为 PO4
rSPB_PO4 =  qSPB,T*SP,B*XHET

1. r64	XE 转化
rXE_conv = qXE,T*XE

1. r65	XE_ana 水解
rXE_ana_hyd = qHYD,XBe,T*XHET*(LogsatXHET,HYD,lim*MRsatXEana,XHET,KHYD+LoginhXHET,HYD,lim*MsatXEana,KXEana,HYD)*(MsatSO2,KO2,OHO+ηHYD,anox*(MsatSNO2,KNO2,OHO+MinhSNO2,KNO2,OHO*MsatSNO3,KNO3,OHO)*MinhSO2,KO2,OHO)

1. r66	XU 转化
r_XU_conv = qXU,T*XU*MsatXU,KXU

---
1. dVFA 
dVFA_1 = -1/YOHO,VFA,ox*rOHO_g_VFAs_O           # OHO 在 VFAs 上生长，O2
dVFA_2 = -1/YOHO,VFA,anox*rOHO_g_VFAs_NO2       # OHO 在 VFAs 上生长，NO2
dVFA_3 = -1/YOHO,VFA,anox*rOHO_g_VFAs_NO3       # OHO 在 VFAs 上生长，NO3

2. dSB
dSB_1 = -1/YOHO,SB,ox*rOHO_g_SB_O               # OHO 在 SB 上生长，O2
dSB_2 = -1/YOHO,SB,anox*rOHO_g_SB_NO2           # OHO 在 SB 上生长，NO2
dSB_3 = -1/YOHO,SB,anox*rOHO_g_SB_NO3           # OHO 在 SB 上生长，NO3
dSB_4 = rXB_hyd                                 # XB 水解
dSB_5 = rXBe_hyd                                # XBe 水解
dSB_6 = rXE_ana_hyd                             # XE_ana 水解

3. dSMEOL
dSMEOL_1 = -1/YOHO,SMEOL,ox*rOHO_g_MEOLO_O      # OHO 在 S_MEOL 上生长，O2
dSMEOL_2 = -1/YMEOLO*rMEOLO_g_NO2               # MEOLO 生长，NO2
dSMEOL_3 = -1/YMEOLO*rMEOLO_g_NO3               # MEOLO 生长，NO3

4. XB
dXB_1 =-rXB_hyd                                 # XB 水解
dXB_2 = rXE_conv                                # XE 转化
dXB_3 = r_XU_conv                               # XU 转化

5. XBe
dXBe_1 = (1-fE)*rOHO_d                          # OHO 衰减
dXBe_2 = (1-fE)*rOHO_d_ana                      # OHO 厌氧衰减
dXBe_3 = (1-fE)*r_MEOLO_d                       # MEOLO 衰减
dXBe_4 = (1-fE)*r_MEOLO_d_ana                   # MEOLO 厌氧衰减
dXBe_5 = (1-fE)*rAOB_d                          # AOB 衰减
dXBe_6 = (1-fE)*rAOB_d_ana                      # AOB 厌氧衰减
dXBe_7 = (1-fE)*rNOB_d                          # NOB 衰减
dXBe_8 = (1-fE)*rNOB_d_ana                      # NOB 厌氧衰减
dXBe_9 = (1-fE)*rAMX_d                          # 厌氧氨氧化菌衰减
dXBe_10 = (1-fE)*rAMX_d_ana                     # 厌氧氨氧化菌厌氧衰减
dXBe_11 =-rXBe_hyd                              # XB_e 水解

6. XU
dXU =-r_XU_conv                                 # XU 转化 

7. XE
dXE_1 = fE*rOHO_d                               # OHO 衰减
dXE_2 = fE*r_MEOLO_d                            # MEOLO 衰减
dXE_3 = fE*rAOB_d                               # AOB 衰减
dXE_4 = fE*rNOB_d                               # NOB 衰减
dXE_5 = fE*rAMX_d                               # 厌氧氨氧化菌衰减
dXE_6 =-rXE_conv                                # XE 转化

8. XE_ana
dXE_ana_1 = fE*rOHO_d_ana                       # OHO 厌氧衰减
dXE_ana_2 = fE*r_MEOLO_d_ana                    # MEOLO 厌氧衰减
dXE_ana_3 = fE*rAOB_d_ana                       # AOB 厌氧衰减
dXE_ana_4 = fE*rNOB_d_ana                       # NOB 厌氧衰减
dXE_ana_5 = fE*rAMX_d_ana                       # 厌氧氨氧化菌厌氧衰减
dXE_ana_6 =-rXE_ana_hyd                         # XE XE_ana 水解

9. XOHO
dXOHO_1 = rOHO_g_VFAs_O
dXOHO_2 = rOHO_g_VFAs_NO2
dXOHO_3 = rOHO_g_VFAs_NO3
dXOHO_4 = rOHO_g_SB_O
dXOHO_5 = rOHO_g_SB_NO2
dXOHO_6 = rOHO_g_SB_NO3
dXOHO_7 = rOHO_g_MEOLO_O
dXOHO_8 =-rOHO_d 
dXOHO_9 =-rOHO_d_ana

10. XMEOLO
dXMEOLO_1 = rMEOLO_g_NO2
dXMEOLO_2 = rMEOLO_g_NO3
dXMEOLO_3 =-r_MEOLO_d
dXMEOLO_4 =-r_MEOLO_d_ana

11. XAOB
dXAOB_1 = rAOB_g
dXAOB_2 =-rAOB_d 
dXAOB_3 =-rAOB_d_ana

12. XNOB
dXNOB_1 = rNOB_g
dXNOB_2 =-rNOB_d
dXNOB_3 =-rNOB_d_ana

13. XAMX
dXAMX_1 = rAMX_g
dXAMX_2 =-rAMX_d
dXAMX_3 =-rAMX_d_ana

14. SNHx
dSNHx_1 =-iN,BIO * rOHO_g_VFAs_O
dSNHx_2 =-iN,BIO * rOHO_g_VFAs_NO2
dSNHx_3 =-iN,BIO * rOHO_g_VFAs_NO3
dSNHx_4 =-iN,BIO * rOHO_g_SB_O
dSNHx_5 =-iN,BIO * rOHO_g_SB_NO2
dSNHx_6 =-iN,BIO * rOHO_g_SB_NO3
dSNHx_7 =-iN,BIO * rOHO_g_MEOLO_O
dSNHx_8 =-fE*(iN,XE-iN,BIO) * rOHO_d  
dSNHx_9 =-fE*(iN,XE-iN,BIO) * rOHO_d_ana 
dSNHx_10 =-iN,BIO * rMEOLO_g_NO2 
dSNHx_11 =-iN,BIO*rMEOLO_g_NO3 
dSNHx_12 =fE*(iN,XE-iN,BIO) * r_MEOLO_d
dSNHx_13 =-fE*(iN,XE-iN,BIO) * r_MEOLO_d_ana  
dSNHx_14 =-1/YAOB-iN,BIO*rAOB_g
dSNHx_15 =-fE*(iN,XE-iN,BIO)*rAOB_d
dSNHx_16 =-fE*(iN,XE-iN,BIO)*rAOB_d_ana
dSNHx_17 =-1/YAOB-iN,BIO*rNOB_g
dSNHx_18 =-fE*(iN,XE-iN,BIO)*rNOB_d
dSNHx_19 =-fE*(iN,XE-iN,BIO)*rNOB_d_ana
dSNHx_20 =-(3*iN,BIO*AMO+2*AMN)/(5*YAMX,NO3+3-3*YAMX,NO2)/AMO*rAMX_g



 *  * 术语说明： *  * 
-  *  * AOB *  *  = 氨氧化菌（Ammonia Oxidizing Bacteria）
-  *  * NOB *  *  = 亚硝酸盐氧化菌（Nitrite Oxidizing Bacteria）
-  *  * Anammox *  *  = 厌氧氨氧化菌（Anaerobic Ammonium Oxidation）
-  *  * AMETO *  *  = 氨甲基营养菌（Ammonia Methylotrophic Organisms）
-  *  * HMETO *  *  = 异养甲基营养菌（Heterotrophic Methylotrophic Organisms）
-  *  * ALGAE *  *  = 藻类
-  *  * XB *  *  = 颗粒可生物降解有机物
-  *  * XB_e *  *  = 内源颗粒可生物降解有机物
-  *  * SN_B *  *  = 可生物降解有机氮
-  *  * SP_B *  *  = 可生物降解有机磷
-  *  * XE *  *  = 胞外聚合物
-  *  * XE_ana *  *  = 厌氧胞外聚合物
-  *  * XU *  *  = 颗粒不可生物降解有机物
-  *  * PO4 *  *  = 磷酸盐
-  *  * NO2 *  *  = 亚硝酸盐
-  *  * NO3 *  *  = 硝酸盐

OHO = 普通异养菌（Ordinary Heterotrophic Organisms）
VFAs = 挥发性脂肪酸（Volatile Fatty Acids）
SB = 可生物降解底物（Biodegradable Substrate）
FERM = 发酵
SMEOL = 甲醇可溶性有机物（Soluble Methanol Extractable Organic Liquor）
MEOLO = 甲醇氧化菌（Methanol Oxidizing Organisms）
O2 = 氧气（好氧条件）
NO2 = 亚硝酸盐
NO3 = 硝酸盐




