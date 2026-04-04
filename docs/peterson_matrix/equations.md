## 1. 核心速率方程

```python
r1 = µOHO_T * XOHO * MsatSVFA_KVFA * MsatSO2_KO2_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 OHO growth on VFAs, O2
r2 = µOHO_T * XOHO * ηOHO_anox_NO2red * MsatSVFA_KVFA * MsatSNO2_KNO2_OHO * ( LoginhSNO3_KNO3_OHO * LoginhSVFA_KVFA_OHO_SNO2 + LogsatSVFA_KVFA_OHO_SNO2 ) * MinhSO2_KO2_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 OHO growth on VFAs, NO2
r3 = µOHO_T * XOHO * ηOHO_anox * MsatSVFA_KVFA * LogsatSNO3_KNO3_OHO * ( LoginhSVFA_KVFA_OHO_SNO2 + MinhSNO2_KNO2_OHO * LogsatSVFA_KVFA_OHO_SNO2 ) * MinhSO2_KO2_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 OHO growth on VFAs, NO3
r4 = µOHO_T * XOHO * MsatSB_KSB * MinhSVFA_KVFA * MsatSO2_KO2_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 OHO growth on SB, O2
r5 = µOHO_T * XOHO * ηOHO_anox * MsatSB_KSB * MinhSVFA_KVFA * MsatSNO2_KNO2_OHO * MinhSO2_KO2_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 OHO growth on SB, NO2
r6 = µOHO_T * XOHO * ηOHO_anox * MsatSB_KSB * MinhSVFA_KVFA * MsatSNO3_KNO3_OHO * MinhSO2_KO2_OHO * MinhSNO2_KNO2_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 OHO growth on SB, NO3
r7 = µFERM_OHO_T * XOHO * LogsatSVFA_KVFA_FERM * MsatSB_KSB_ana * MinhSO2_KO2_OHO * MinhSNO2_KNO2_OHO * MinhSNO3_KNO3_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 SB fermentation with high VFA (OHO growth, anaerobic)
r8 = µFERM_OHO_T * XOHO * LoginhSVFA_KVFA_FERM * MsatSB_KSB_ana * MinhSO2_KO2_OHO * MinhSNO2_KNO2_OHO * MinhSNO3_KNO3_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * MsatSCO2_KCO2_BIO * BellinhpH  # g.m-3.d-1 SB fermentation with low VFA (OHO growth, anaerobic)
r9 = µOHO_T * XOHO * MsatSMEOL_KMEOL_OHO * MsatSO2_KO2_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 OHO growth on SMEOL, O2
r10 = bOHO_T * XOHO * ( MsatSO2_KO2_OHO + ηb_anox * MsatSNO2_KNO2_OHO * MinhSO2_KO2_OHO + ηb_anox * MsatSNO3_KNO3_OHO * MinhSNO2_KNO2_OHO * MinhSO2_KO2_OHO )  # g.m-3.d-1 OHO decay
r11 = bOHO_T * XOHO * ηb_ana * MinhSNO2_KNO2_OHO * MinhSNO3_KNO3_OHO * MinhSO2_KO2_OHO  # g.m-3.d-1 OHO anaerobic decay
r12 = µMEOLO_T * XMEOLO * MsatSMEOL_KMEOL * MsatSNO2_KNO2_MEOLO * ( LoginhSNO3_KNO3_MEOLO * LoginhSMEOL_KMEOL_SNO2 + LogsatSMEOL_KMEOL_SNO2 ) * MinhSO2_KiO2_MEOLO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 MEOLO growth, NO2
r13 = µMEOLO_T * XMEOLO * MsatSMEOL_KMEOL * MsatSNO3_KNO3_MEOLO * LogsatSNO3_KNO3_MEOLO * ( LoginhSMEOL_KMEOL_SNO2 + MinhSNO2_KNO2_MEOLO * LogsatSMEOL_KMEOL_SNO2 ) * MinhSO2_KiO2_MEOLO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 MEOLO growth, NO3
r14 = bMEOLO_T * XMEOLO * ( MsatSO2_KiO2_MEOLO + ηb_anox * MsatSNO2_KNO2_MEOLO * MinhSO2_KiO2_MEOLO + mtox_anox * MsatSNO3_KNO3_MEOLO * MinhSNO2_KNO2_MEOLO * MinhSO2_KiO2_MEOLO )  # g.m-3.d-1 MEOLO decay
r15 = bMEOLO_T * XMEOLO * ( ηb_ana * MinhSNO2_KNO2_MEOLO * MinhSNO3_KNO3_MEOLO * MinhSO2_KiO2_MEOLO + mtox_ana )  # g.m-3.d-1 MEOLO anaerobic decay
r37 = µAOB_T * XAOB * MsatSNHx_KNHx_AOB * LogsatpHCO2_AOB * MsatSO2_KO2_AOB * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * MinhpHHNO2_AOB * BellinhpH_AOB  # g.m-3.d-1 AOB growth
r38 = bAOB_T * XAOB * ( MsatSO2_KO2_AOB + ηb_anox * MsatSNOx_KNOx_AOB * MinhSO2_KO2_AOB )  # g.m-3.d-1 AOB decay
r39 = bAOB_T * XAOB * ( ηb_ana * MinhSNOx_KNOx_AOB * MinhSO2_KO2_AOB + mtox_ana )  # g.m-3.d-1 AOB anaerobic decay
r40 = µNOB_T * XNOB * MsatSNO2_KNO2_NOB * LogsatpHCO2_NOB * MsatSO2_KO2_NOB * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * MinhpHNH3_NOB * BellinhpH_NOB  # g.m-3.d-1 NOB growth
r41 = bNOB_T * XNOB * ( MsatSO2_KO2_NOB + ηb_anox * MsatSNOx_KNOx_NOB * MinhSO2_KO2_NOB )  # g.m-3.d-1 NOB decay
r42 = bNOB_T * XNOB * ( ηb_ana * MinhSNOx_KNOx_NOB * MinhSO2_KO2_NOB + mtox_ana )  # g.m-3.d-1 NOB anaerobic decay
r43 = µAMX_T * XAMX * MsatSNHx_KNHx_AMX * MsatSNO2_KNO2_AMX * MinhSO2_KiO2_AMX * LogsatpHCO2_AMX * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH * MinhpHHNO2_AMX  # g.m-3.d-1 Anammox growth
r44 = bAMX_T * XAMX * ( MsatSO2_KiO2_AMX + ηb_anox * MsatSNOx_KNOx_AMX * MinhSO2_KiO2_AMX )  # g.m-3.d-1 Anammox decay
r45 = bAMX_T * XAMX * ( ηb_ana * MinhSNOx_KNOx_AMX * MinhSO2_KiO2_AMX )  # g.m-3.d-1 Anammox anaerobic decay
r60 = qHYD_XB_T * XHET * ( LogsatXHET_HYD_lim * MRsatXB_XHET_KHYD + LoginhXHET_HYD_lim * MsatXB_KXB_HYD ) * ( MsatSO2_KO2_OHO + ηHYD_anox * ( MsatSNO2_KNO2_OHO + MsatSNO3_KNO3_OHO * MinhSNO2_KNO2_OHO ) * MinhSO2_KO2_OHO + ηHYD_ana * MinhSNO3_KNO3_OHO * MinhSNO2_KNO2_OHO * MinhSO2_KO2_OHO )  # g.m-3.d-1 XB hydrolysis
r61 = qHYD_XBe_T * XHET * ( LogsatXHET_HYD_lim * MRsatXBe_XHET_KHYD + LoginhXHET_HYD_lim * MsatXBe_KXBe_HYD ) * ( MsatSO2_KO2_OHO + ηHYD_anox * ( MsatSNO2_KNO2_OHO + MsatSNO3_KNO3_OHO * MinhSNO2_KNO2_OHO ) * MinhSO2_KO2_OHO + ηHYD_ana * MinhSNO3_KNO3_OHO * MinhSNO2_KNO2_OHO * MinhSO2_KO2_OHO )  # g.m-3.d-1 XB,e hydrolysis
r62 = qAMMON_T * SN_B * XHET  # g.m-3.d-1 SN,B ammonification
r63 = qSPB_T * SP_B * XHET  # g.m-3.d-1 SP,B conversion to PO4
r64 = qXE_T * XE  # g.m-3.d-1 XE conversion
r65 = qHYD_XBe_T * XHET * ( LogsatXHET_HYD_lim * MRsatXEana_XHET_KHYD + LoginhXHET_HYD_lim * MsatXEana_KXEana_HYD ) * ( MsatSO2_KO2_OHO + ηHYD_anox * ( MsatSNO2_KNO2_OHO + MinhSNO2_KNO2_OHO * MsatSNO3_KNO3_OHO ) * MinhSO2_KO2_OHO )  # g.m-3.d-1 XE,ana hydrolysis
r66 = qXU_T * XU * MsatXU_KXU  # g.m-3.d-1 XU conversion
```

## 2. 状态变量方程（按列）

```python
# 1. dSVFA
dSVFA_1 = - 1 / YOHO_VFA_ox * r1  # g.m-3.d-1 OHO growth on VFAs, O2
dSVFA_2 = - 1 / YOHO_VFA_anox * r2  # g.m-3.d-1 OHO growth on VFAs, NO2
dSVFA_3 = - 1 / YOHO_VFA_anox * r3  # g.m-3.d-1 OHO growth on VFAs, NO3
dSVFA_4 = ( 1 - YOHO_SB_ana - YOHO_H2_ana_high ) / YOHO_SB_ana * r7  # g.m-3.d-1 SB fermentation with high VFA (OHO growth, anaerobic)
dSVFA_5 = ( 1 - YOHO_SB_ana - YOHO_H2_ana_low ) / YOHO_SB_ana * r8  # g.m-3.d-1 SB fermentation with low VFA (OHO growth, anaerobic)
dSVFA = dSVFA_1 + dSVFA_2 + dSVFA_3 + dSVFA_4 + dSVFA_5

# 2. dSB
dSB_1 = - 1 / YOHO_SB_ox * r4  # g.m-3.d-1 OHO growth on SB, O2
dSB_2 = - 1 / YOHO_SB_anox * r5  # g.m-3.d-1 OHO growth on SB, NO2
dSB_3 = - 1 / YOHO_SB_anox * r6  # g.m-3.d-1 OHO growth on SB, NO3
dSB_4 = - 1 / YOHO_SB_ana * r7  # g.m-3.d-1 SB fermentation with high VFA (OHO growth, anaerobic)
dSB_5 = - 1 / YOHO_SB_ana * r8  # g.m-3.d-1 SB fermentation with low VFA (OHO growth, anaerobic)
dSB_6 = 1 * r60  # g.m-3.d-1 XB hydrolysis
dSB_7 = 1 * r61  # g.m-3.d-1 XB,e hydrolysis
dSB_8 = 1 * r65  # g.m-3.d-1 XE,ana hydrolysis
dSB = dSB_1 + dSB_2 + dSB_3 + dSB_4 + dSB_5 + dSB_6 + dSB_7 + dSB_8

# 3. dSMEOL
dSMEOL_1 = - 1 / YOHO_SMEOL_ox * r9  # g.m-3.d-1 OHO growth on SMEOL, O2
dSMEOL_2 = - 1 / YMEOLO * r12  # g.m-3.d-1 MEOLO growth, NO2
dSMEOL_3 = - 1 / YMEOLO * r13  # g.m-3.d-1 MEOLO growth, NO3
dSMEOL = dSMEOL_1 + dSMEOL_2 + dSMEOL_3

# 4. dXB
dXB_1 = - 1.0 * r60  # g.m-3.d-1 XB hydrolysis
dXB_2 = 1.0 * r64  # g.m-3.d-1 XE conversion
dXB_3 = 1.0 * r66  # g.m-3.d-1 XU conversion
dXB = dXB_1 + dXB_2 + dXB_3

# 5. dXB_e
dXB_e_1 = 1 - fE * r10  # g.m-3.d-1 OHO decay
dXB_e_2 = 1 - fE * r11  # g.m-3.d-1 OHO anaerobic decay
dXB_e_3 = 1 - fE * r14  # g.m-3.d-1 MEOLO decay
dXB_e_4 = 1 - fE * r15  # g.m-3.d-1 MEOLO anaerobic decay
dXB_e_5 = 1 - fE * r38  # g.m-3.d-1 AOB decay
dXB_e_6 = 1 - fE * r39  # g.m-3.d-1 AOB anaerobic decay
dXB_e_7 = 1 - fE * r41  # g.m-3.d-1 NOB decay
dXB_e_8 = 1 - fE * r42  # g.m-3.d-1 NOB anaerobic decay
dXB_e_9 = 1 - fE * r44  # g.m-3.d-1 Anammox decay
dXB_e_10 = 1 - fE * r45  # g.m-3.d-1 Anammox anaerobic decay
dXB_e_11 = - 1 * r61  # g.m-3.d-1 XB,e hydrolysis
dXB_e = dXB_e_1 + dXB_e_2 + dXB_e_3 + dXB_e_4 + dXB_e_5 + dXB_e_6 + dXB_e_7 + dXB_e_8 + dXB_e_9 + dXB_e_10 + dXB_e_11

# 6. dXU
dXU_1 = - 1.0 * r66  # g.m-3.d-1 XU conversion
dXU = dXU_1

# 7. dXE
dXE_1 = fE * r10  # g.m-3.d-1 OHO decay
dXE_2 = fE * r14  # g.m-3.d-1 MEOLO decay
dXE_3 = fE * r38  # g.m-3.d-1 AOB decay
dXE_4 = fE * r41  # g.m-3.d-1 NOB decay
dXE_5 = fE * r44  # g.m-3.d-1 Anammox decay
dXE_6 = - 1 * r64  # g.m-3.d-1 XE conversion
dXE = dXE_1 + dXE_2 + dXE_3 + dXE_4 + dXE_5 + dXE_6

# 8. dXE_ana
dXE_ana_1 = fE * r11  # g.m-3.d-1 OHO anaerobic decay
dXE_ana_2 = fE * r15  # g.m-3.d-1 MEOLO anaerobic decay
dXE_ana_3 = fE * r39  # g.m-3.d-1 AOB anaerobic decay
dXE_ana_4 = fE * r42  # g.m-3.d-1 NOB anaerobic decay
dXE_ana_5 = fE * r45  # g.m-3.d-1 Anammox anaerobic decay
dXE_ana_6 = - 1 * r65  # g.m-3.d-1 XE,ana hydrolysis
dXE_ana = dXE_ana_1 + dXE_ana_2 + dXE_ana_3 + dXE_ana_4 + dXE_ana_5 + dXE_ana_6

# 9. dXOHO
dXOHO_1 = 1.0 * r1  # g.m-3.d-1 OHO growth on VFAs, O2
dXOHO_2 = 1.0 * r2  # g.m-3.d-1 OHO growth on VFAs, NO2
dXOHO_3 = 1.0 * r3  # g.m-3.d-1 OHO growth on VFAs, NO3
dXOHO_4 = 1.0 * r4  # g.m-3.d-1 OHO growth on SB, O2
dXOHO_5 = 1.0 * r5  # g.m-3.d-1 OHO growth on SB, NO2
dXOHO_6 = 1.0 * r6  # g.m-3.d-1 OHO growth on SB, NO3
dXOHO_7 = 1.0 * r7  # g.m-3.d-1 SB fermentation with high VFA (OHO growth, anaerobic)
dXOHO_8 = 1.0 * r8  # g.m-3.d-1 SB fermentation with low VFA (OHO growth, anaerobic)
dXOHO_9 = 1.0 * r9  # g.m-3.d-1 OHO growth on SMEOL, O2
dXOHO_10 = - 1.0 * r10  # g.m-3.d-1 OHO decay
dXOHO_11 = - 1.0 * r11  # g.m-3.d-1 OHO anaerobic decay
dXOHO = dXOHO_1 + dXOHO_2 + dXOHO_3 + dXOHO_4 + dXOHO_5 + dXOHO_6 + dXOHO_7 + dXOHO_8 + dXOHO_9 + dXOHO_10 + dXOHO_11

# 10. dXMEOLO
dXMEOLO_1 = 1.0 * r12  # g.m-3.d-1 MEOLO growth, NO2
dXMEOLO_2 = 1.0 * r13  # g.m-3.d-1 MEOLO growth, NO3
dXMEOLO_3 = - 1.0 * r14  # g.m-3.d-1 MEOLO decay
dXMEOLO_4 = - 1.0 * r15  # g.m-3.d-1 MEOLO anaerobic decay
dXMEOLO = dXMEOLO_1 + dXMEOLO_2 + dXMEOLO_3 + dXMEOLO_4

# 11. dXAOB
dXAOB_1 = 1.0 * r37  # g.m-3.d-1 AOB growth
dXAOB_2 = - 1.0 * r38  # g.m-3.d-1 AOB decay
dXAOB_3 = - 1.0 * r39  # g.m-3.d-1 AOB anaerobic decay
dXAOB = dXAOB_1 + dXAOB_2 + dXAOB_3

# 12. dXNOB
dXNOB_1 = 1.0 * r40  # g.m-3.d-1 NOB growth
dXNOB_2 = - 1.0 * r41  # g.m-3.d-1 NOB decay
dXNOB_3 = - 1.0 * r42  # g.m-3.d-1 NOB anaerobic decay
dXNOB = dXNOB_1 + dXNOB_2 + dXNOB_3

# 13. dXAMX
dXAMX_1 = 1.0 * r43  # g.m-3.d-1 Anammox growth
dXAMX_2 = - 1.0 * r44  # g.m-3.d-1 Anammox decay
dXAMX_3 = - 1.0 * r45  # g.m-3.d-1 Anammox anaerobic decay
dXAMX = dXAMX_1 + dXAMX_2 + dXAMX_3

# 14. dSNHx
dSNHx_1 = - iN_BIO * r1  # g.m-3.d-1 OHO growth on VFAs, O2
dSNHx_2 = - iN_BIO * r2  # g.m-3.d-1 OHO growth on VFAs, NO2
dSNHx_3 = - iN_BIO * r3  # g.m-3.d-1 OHO growth on VFAs, NO3
dSNHx_4 = - iN_BIO * r4  # g.m-3.d-1 OHO growth on SB, O2
dSNHx_5 = - iN_BIO * r5  # g.m-3.d-1 OHO growth on SB, NO2
dSNHx_6 = - iN_BIO * r6  # g.m-3.d-1 OHO growth on SB, NO3
dSNHx_7 = - iN_BIO * r7  # g.m-3.d-1 SB fermentation with high VFA (OHO growth, anaerobic)
dSNHx_8 = - iN_BIO * r8  # g.m-3.d-1 SB fermentation with low VFA (OHO growth, anaerobic)
dSNHx_9 = - iN_BIO * r9  # g.m-3.d-1 OHO growth on SMEOL, O2
dSNHx_10 = - fE * ( iN_XE - iN_BIO ) * r10  # g.m-3.d-1 OHO decay
dSNHx_11 = - fE * ( iN_XE - iN_BIO ) * r11  # g.m-3.d-1 OHO anaerobic decay
dSNHx_12 = - iN_BIO * r12  # g.m-3.d-1 MEOLO growth, NO2
dSNHx_13 = - iN_BIO * r13  # g.m-3.d-1 MEOLO growth, NO3
dSNHx_14 = - fE * ( iN_XE - iN_BIO ) * r14  # g.m-3.d-1 MEOLO decay
dSNHx_15 = - fE * ( iN_XE - iN_BIO ) * r15  # g.m-3.d-1 MEOLO anaerobic decay
dSNHx_16 = - 1 / YAOB - iN_BIO * r37  # g.m-3.d-1 AOB growth
dSNHx_17 = - fE * ( iN_XE - iN_BIO ) * r38  # g.m-3.d-1 AOB decay
dSNHx_18 = - fE * ( iN_XE - iN_BIO ) * r39  # g.m-3.d-1 AOB anaerobic decay
dSNHx_19 = - iN_BIO * r40  # g.m-3.d-1 NOB growth
dSNHx_20 = - fE * ( iN_XE - iN_BIO ) * r41  # g.m-3.d-1 NOB decay
dSNHx_21 = - fE * ( iN_XE - iN_BIO ) * r42  # g.m-3.d-1 NOB anaerobic decay
dSNHx_22 = - ( 3 * iN_BIO * AMO + 2 * AMN ) / ( 5 * YAMX_NO3 + 3 - 3 * YAMX_NO2 ) / AMO * r43  # g.m-3.d-1 Anammox growth
dSNHx_23 = - fE * ( iN_XE - iN_BIO ) * r44  # g.m-3.d-1 Anammox decay
dSNHx_24 = - fE * ( iN_XE - iN_BIO ) * r45  # g.m-3.d-1 Anammox anaerobic decay
dSNHx_25 = 1 * r62  # g.m-3.d-1 SN,B ammonification
dSNHx = dSNHx_1 + dSNHx_2 + dSNHx_3 + dSNHx_4 + dSNHx_5 + dSNHx_6 + dSNHx_7 + dSNHx_8 + dSNHx_9 + dSNHx_10 + dSNHx_11 + dSNHx_12 + dSNHx_13 + dSNHx_14 + dSNHx_15 + dSNHx_16 + dSNHx_17 + dSNHx_18 + dSNHx_19 + dSNHx_20 + dSNHx_21 + dSNHx_22 + dSNHx_23 + dSNHx_24 + dSNHx_25

# 15. dSNO2
dSNO2_1 = - ( 1 - YOHO_VFA_anox ) / ( EEQN2_NO2 * YOHO_VFA_anox ) * r2  # g.m-3.d-1 OHO growth on VFAs, NO2
dSNO2_2 = ( 1 - YOHO_VFA_anox ) / ( EEQNO2_NO3 * YOHO_VFA_anox ) * r3  # g.m-3.d-1 OHO growth on VFAs, NO3
dSNO2_3 = - ( 1 - YOHO_SB_anox ) / ( EEQN2_NO2 * YOHO_SB_anox ) * r5  # g.m-3.d-1 OHO growth on SB, NO2
dSNO2_4 = ( 1 - YOHO_SB_anox ) / ( EEQNO2_NO3 * YOHO_SB_anox ) * r6  # g.m-3.d-1 OHO growth on SB, NO3
dSNO2_5 = - ( 1 - YMEOLO ) / ( EEQN2_NO2 * YMEOLO ) * r12  # g.m-3.d-1 MEOLO growth, NO2
dSNO2_6 = ( 1 - YMEOLO ) / ( EEQNO2_NO3 * YMEOLO ) * r13  # g.m-3.d-1 MEOLO growth, NO3
dSNO2_7 = 1 / YAOB * r37  # g.m-3.d-1 AOB growth
dSNO2_8 = - 1 / YNOB * r40  # g.m-3.d-1 NOB growth
dSNO2_9 = - YAMX_NO2 / ( 5 * YAMX_NO3 + 3 - 3 * YAMX_NO2 ) * ( 3 * iN_BIO * AMO + 2 * AMN ) / AMO * r43  # g.m-3.d-1 Anammox growth
dSNO2 = dSNO2_1 + dSNO2_2 + dSNO2_3 + dSNO2_4 + dSNO2_5 + dSNO2_6 + dSNO2_7 + dSNO2_8 + dSNO2_9

# 16. dSNO3
dSNO3_1 = - ( 1 - YOHO_VFA_anox ) / ( EEQNO2_NO3 * YOHO_VFA_anox ) * r3  # g.m-3.d-1 OHO growth on VFAs, NO3
dSNO3_2 = - ( 1 - YOHO_SB_anox ) / ( EEQNO2_NO3 * YOHO_SB_anox ) * r6  # g.m-3.d-1 OHO growth on SB, NO3
dSNO3_3 = - ( 1 - YMEOLO ) / ( EEQNO2_NO3 * YMEOLO ) * r13  # g.m-3.d-1 MEOLO growth, NO3
dSNO3_4 = 1 / YNOB * r40  # g.m-3.d-1 NOB growth
dSNO3_5 = YAMX_NO3 / ( 5 * YAMX_NO3 + 3 - 3 * YAMX_NO2 ) * ( 3 * iN_BIO * AMO + 2 * AMN ) / AMO * r43  # g.m-3.d-1 Anammox growth
dSNO3 = dSNO3_1 + dSNO3_2 + dSNO3_3 + dSNO3_4 + dSNO3_5

# 17. dSN_B
dSN_B_1 = XN_B / XB * r60  # g.m-3.d-1 XB hydrolysis
dSN_B_2 = XN_Be / XB_e * r61  # g.m-3.d-1 XB,e hydrolysis
dSN_B_3 = - 1 * r62  # g.m-3.d-1 SN,B ammonification
dSN_B = dSN_B_1 + dSN_B_2 + dSN_B_3

# 18. dXN_B
dXN_B_1 = - XN_B / XB * r60  # g.m-3.d-1 XB hydrolysis
dXN_B_2 = iN_XE * r64  # g.m-3.d-1 XE conversion
dXN_B_3 = iN_XE * r65  # g.m-3.d-1 XE,ana hydrolysis
dXN_B_4 = XN_U / XU * r66  # g.m-3.d-1 XU conversion
dXN_B = dXN_B_1 + dXN_B_2 + dXN_B_3 + dXN_B_4

# 19. dXN_Be
dXN_Be_1 = ( 1 - fE ) * iN_BIO * r10  # g.m-3.d-1 OHO decay
dXN_Be_2 = ( 1 - fE ) * iN_BIO * r11  # g.m-3.d-1 OHO anaerobic decay
dXN_Be_3 = ( 1 - fE ) * iN_BIO * r14  # g.m-3.d-1 MEOLO decay
dXN_Be_4 = ( 1 - fE ) * iN_BIO * r15  # g.m-3.d-1 MEOLO anaerobic decay
dXN_Be_5 = ( 1 - fE ) * iN_BIO * r38  # g.m-3.d-1 AOB decay
dXN_Be_6 = ( 1 - fE ) * iN_BIO * r39  # g.m-3.d-1 AOB anaerobic decay
dXN_Be_7 = ( 1 - fE ) * iN_BIO * r41  # g.m-3.d-1 NOB decay
dXN_Be_8 = ( 1 - fE ) * iN_BIO * r42  # g.m-3.d-1 NOB anaerobic decay
dXN_Be_9 = ( 1 - fE ) * iN_BIO * r44  # g.m-3.d-1 Anammox decay
dXN_Be_10 = ( 1 - fE ) * iN_BIO * r45  # g.m-3.d-1 Anammox anaerobic decay
dXN_Be_11 = - XN_Be / XB_e * r61  # g.m-3.d-1 XB,e hydrolysis
dXN_Be = dXN_Be_1 + dXN_Be_2 + dXN_Be_3 + dXN_Be_4 + dXN_Be_5 + dXN_Be_6 + dXN_Be_7 + dXN_Be_8 + dXN_Be_9 + dXN_Be_10 + dXN_Be_11

# 20. dXN_U
dXN_U_1 = - XN_U / XU * r66  # g.m-3.d-1 XU conversion
dXN_U = dXN_U_1

# 21. dSPO4
dSPO4_1 = - iP_BIO * r1  # g.m-3.d-1 OHO growth on VFAs, O2
dSPO4_2 = - iP_BIO * r2  # g.m-3.d-1 OHO growth on VFAs, NO2
dSPO4_3 = - iP_BIO * r3  # g.m-3.d-1 OHO growth on VFAs, NO3
dSPO4_4 = - iP_BIO * r4  # g.m-3.d-1 OHO growth on SB, O2
dSPO4_5 = - iP_BIO * r5  # g.m-3.d-1 OHO growth on SB, NO2
dSPO4_6 = - iP_BIO * r6  # g.m-3.d-1 OHO growth on SB, NO3
dSPO4_7 = - iP_BIO * r7  # g.m-3.d-1 SB fermentation with high VFA (OHO growth, anaerobic)
dSPO4_8 = - iP_BIO * r8  # g.m-3.d-1 SB fermentation with low VFA (OHO growth, anaerobic)
dSPO4_9 = - iP_BIO * r9  # g.m-3.d-1 OHO growth on SMEOL, O2
dSPO4_10 = - iP_BIO * r12  # g.m-3.d-1 MEOLO growth, NO2
dSPO4_11 = - iP_BIO * r13  # g.m-3.d-1 MEOLO growth, NO3
dSPO4_12 = - iP_BIO * r37  # g.m-3.d-1 AOB growth
dSPO4_13 = - iP_BIO * r40  # g.m-3.d-1 NOB growth
dSPO4_14 = - iP_BIO * r43  # g.m-3.d-1 Anammox growth
dSPO4_15 = 1 * r63  # g.m-3.d-1 SP,B conversion to PO4
dSPO4 = dSPO4_1 + dSPO4_2 + dSPO4_3 + dSPO4_4 + dSPO4_5 + dSPO4_6 + dSPO4_7 + dSPO4_8 + dSPO4_9 + dSPO4_10 + dSPO4_11 + dSPO4_12 + dSPO4_13 + dSPO4_14 + dSPO4_15

# 22. dSP_B
dSP_B_1 = XP_B / XB * r60  # g.m-3.d-1 XB hydrolysis
dSP_B_2 = XP_Be / XB_e * r61  # g.m-3.d-1 XB,e hydrolysis
dSP_B_3 = - 1 * r63  # g.m-3.d-1 SP,B conversion to PO4
dSP_B = dSP_B_1 + dSP_B_2 + dSP_B_3

# 23. dXP_B
dXP_B_1 = - XP_B / XB * r60  # g.m-3.d-1 XB hydrolysis
dXP_B_2 = iP_BIO * r64  # g.m-3.d-1 XE conversion
dXP_B_3 = iP_BIO * r65  # g.m-3.d-1 XE,ana hydrolysis
dXP_B_4 = XP_U / XU * r66  # g.m-3.d-1 XU conversion
dXP_B = dXP_B_1 + dXP_B_2 + dXP_B_3 + dXP_B_4

# 24. dXP_Be
dXP_Be_1 = ( 1 - fE ) * iP_BIO * r10  # g.m-3.d-1 OHO decay
dXP_Be_2 = ( 1 - fE ) * iP_BIO * r11  # g.m-3.d-1 OHO anaerobic decay
dXP_Be_3 = ( 1 - fE ) * iP_BIO * r14  # g.m-3.d-1 MEOLO decay
dXP_Be_4 = ( 1 - fE ) * iP_BIO * r15  # g.m-3.d-1 MEOLO anaerobic decay
dXP_Be_5 = ( 1 - fE ) * iP_BIO * r38  # g.m-3.d-1 AOB decay
dXP_Be_6 = ( 1 - fE ) * iP_BIO * r39  # g.m-3.d-1 AOB anaerobic decay
dXP_Be_7 = ( 1 - fE ) * iP_BIO * r41  # g.m-3.d-1 NOB decay
dXP_Be_8 = ( 1 - fE ) * iP_BIO * r42  # g.m-3.d-1 NOB anaerobic decay
dXP_Be_9 = ( 1 - fE ) * iP_BIO * r44  # g.m-3.d-1 Anammox decay
dXP_Be_10 = ( 1 - fE ) * iP_BIO * r45  # g.m-3.d-1 Anammox anaerobic decay
dXP_Be_11 = - XP_Be / XB_e * r61  # g.m-3.d-1 XB,e hydrolysis
dXP_Be = dXP_Be_1 + dXP_Be_2 + dXP_Be_3 + dXP_Be_4 + dXP_Be_5 + dXP_Be_6 + dXP_Be_7 + dXP_Be_8 + dXP_Be_9 + dXP_Be_10 + dXP_Be_11

# 25. dXP_U
dXP_U_1 = - XP_U / XU * r66  # g.m-3.d-1 XU conversion
dXP_U = dXP_U_1

# 26. dSO2
dSO2_1 = - ( 1 - YOHO_VFA_ox ) / YOHO_VFA_ox * r1  # g.m-3.d-1 OHO growth on VFAs, O2
dSO2_2 = - ( 1 - YOHO_SB_ox ) / YOHO_SB_ox * r4  # g.m-3.d-1 OHO growth on SB, O2
dSO2_3 = - ( 1 - YOHO_SMEOL_ox ) / YOHO_SMEOL_ox * r9  # g.m-3.d-1 OHO growth on SMEOL, O2
dSO2_4 = - ( EEQNO2 - YAOB ) / YAOB * r37  # g.m-3.d-1 AOB growth
dSO2_5 = - ( EEQNO2_NO3 - YNOB ) / YNOB * r40  # g.m-3.d-1 NOB growth
dSO2 = dSO2_1 + dSO2_2 + dSO2_3 + dSO2_4 + dSO2_5

# 27. dXINORG
dXINORG_1 = iINORG * r1  # g.m-3.d-1 OHO growth on VFAs, O2
dXINORG_2 = iINORG * r2  # g.m-3.d-1 OHO growth on VFAs, NO2
dXINORG_3 = iINORG * r3  # g.m-3.d-1 OHO growth on VFAs, NO3
dXINORG_4 = iINORG * r4  # g.m-3.d-1 OHO growth on SB, O2
dXINORG_5 = iINORG * r5  # g.m-3.d-1 OHO growth on SB, NO2
dXINORG_6 = iINORG * r6  # g.m-3.d-1 OHO growth on SB, NO3
dXINORG_7 = iINORG * r7  # g.m-3.d-1 SB fermentation with high VFA (OHO growth, anaerobic)
dXINORG_8 = iINORG * r8  # g.m-3.d-1 SB fermentation with low VFA (OHO growth, anaerobic)
dXINORG_9 = iINORG * r9  # g.m-3.d-1 OHO growth on SMEOL, O2
dXINORG_10 = iINORG * r12  # g.m-3.d-1 MEOLO growth, NO2
dXINORG_11 = iINORG * r13  # g.m-3.d-1 MEOLO growth, NO3
dXINORG_12 = iINORG * r37  # g.m-3.d-1 AOB growth
dXINORG_13 = iINORG * r40  # g.m-3.d-1 NOB growth
dXINORG_14 = iINORG * r43  # g.m-3.d-1 Anammox growth
dXINORG_15 = - iINORG * r61  # g.m-3.d-1 XB,e hydrolysis
dXINORG = dXINORG_1 + dXINORG_2 + dXINORG_3 + dXINORG_4 + dXINORG_5 + dXINORG_6 + dXINORG_7 + dXINORG_8 + dXINORG_9 + dXINORG_10 + dXINORG_11 + dXINORG_12 + dXINORG_13 + dXINORG_14 + dXINORG_15

```
