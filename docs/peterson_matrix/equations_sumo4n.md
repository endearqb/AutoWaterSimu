## 1. 核心速率方程

```python
r1 = µOHO_T * XOHO * MsatSVFA_KVFA * MsatSO2_KO2_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 OHO growth on VFAs, O2
r2 = µOHO_T * XOHO * ηOHO_NO3 * MsatSVFA_KVFA_NO3 * MsatSNO3_KNO3_OHO * MinhSO2_KO2_OHO_NO3 * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 OHO growth on VFAs, NO3
r3 = µOHO_T * XOHO * ηOHO_NO2 * MsatSVFA_KVFA_NO2 * MsatSNO2_KNO2_OHO * MinhSO2_KO2_OHO_NO2 * MinhSNO_KiNO_OHO_NO2 * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 OHO growth on VFAs, NO2
r4 = µOHO_T * XOHO * ηOHO_NO * MsatSVFA_KVFA_NO * HsatSNO_KNO_OHO * MinhSO2_KO2_OHO_NO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 OHO growth on VFAs, NO
r5 = µOHO_T * XOHO * ηOHO_N2O * MsatSVFA_KVFA_N2O * MsatSN2O_KN2O_OHO * MinhSO2_KO2_OHO_N2O * MinhSNO_KiNO_OHO_N2O * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 OHO growth on VFAs, N2O
r6 = µOHO_T * XOHO * MsatSB_KSB * MinhSVFA_KVFA * MsatSO2_KO2_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 OHO growth on SB, O2
r7 = µOHO_T * XOHO * ηOHO_NO3 * MsatSB_KSB_NO3 * MinhSVFA_KVFA * MsatSNO3_KNO3_OHO * MinhSO2_KO2_OHO_NO3 * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 OHO growth on SB, NO3
r8 = µOHO_T * XOHO * ηOHO_NO2 * MsatSB_KSB_NO2 * MinhSVFA_KVFA * MsatSNO2_KNO2_OHO * MinhSO2_KO2_OHO_NO2 * MinhSNO_KiNO_OHO_NO2 * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 OHO growth on SB, NO2
r9 = µOHO_T * XOHO * ηOHO_NO * MsatSB_KSB_NO * MinhSVFA_KVFA * HsatSNO_KNO_OHO * MinhSO2_KO2_OHO_NO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 OHO growth on SB, NO
r10 = µOHO_T * XOHO * ηOHO_N2O * MsatSB_KSB_N2O * MinhSVFA_KVFA * MsatSN2O_KN2O_OHO * MinhSO2_KO2_OHO_N2O * MinhSNO_KiNO_OHO_N2O * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 OHO growth on SB, N2O
r11 = µFERM_OHO_T * XOHO * LogsatSVFA_KVFA_FERM * MsatSB_KSB_ana * MinhSO2_KO2_OHO * MinhSNO2_KNO2_OHO * MinhSNO3_KNO3_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 SB fermentation with high VFA (OHO growth, anaerobic)
r12 = µFERM_OHO_T * XOHO * LoginhSVFA_KVFA_FERM * MsatSB_KSB_ana * MinhSO2_KO2_OHO * MinhSNO2_KNO2_OHO * MinhSNO3_KNO3_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * MsatSCO2_KCO2_BIO * BellinhpH  # g.m-3.d-1 SB fermentation with low VFA (OHO growth, anaerobic)
r13 = µOHO_T * XOHO * MsatSMEOL_KMEOL_OHO * MsatSO2_KO2_OHO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 OHO growth on SMEOL, O2
r14 = bOHO_T * XOHO * ( MsatSO2_KO2_OHO + ηb_anox * MsatSNO2_KNO2_OHO * MinhSO2_KO2_OHO + ηb_anox * MsatSNO3_KNO3_OHO * MinhSNO2_KNO2_OHO * MinhSO2_KO2_OHO )  # g.m-3.d-1 OHO decay
r15 = bOHO_T * XOHO * ηb_ana * MinhSNO2_KNO2_OHO * MinhSNO3_KNO3_OHO * MinhSO2_KO2_OHO  # g.m-3.d-1 OHO anaerobic decay
r16 = µMEOLO_T * XMEOLO * MsatSMEOL_KMEOL * MsatSNO2_KNO2_MEOLO * MinhSO2_KiO2_MEOLO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 MEOLO growth, NO2
r17 = µMEOLO_T * XMEOLO * MsatSMEOL_KMEOL * MsatSNO3_KNO3_MEOLO * MinhSNO2_KNO2_MEOLO * MinhSO2_KiO2_MEOLO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 MEOLO growth, NO3
r18 = bMEOLO_T * XMEOLO * ( MsatSO2_KiO2_MEOLO + ηb_anox * MsatSNO2_KNO2_MEOLO * MinhSO2_KiO2_MEOLO + mtox_anox * MsatSNO3_KNO3_MEOLO * MinhSNO2_KNO2_MEOLO * MinhSO2_KiO2_MEOLO )  # g.m-3.d-1 MEOLO decay
r19 = bMEOLO_T * XMEOLO * ( ηb_ana * MinhSNO2_KNO2_MEOLO * MinhSNO3_KNO3_MEOLO * MinhSO2_KiO2_MEOLO + mtox_ana )  # g.m-3.d-1 MEOLO anaerobic decay
r20 = µCASTO_T * XCASTO * MRsatXSTC_XCASTO_KSTC * MsatSO2_KO2_CASTO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa_PAO * MsatSMg_KMg_PAO * BellinhpH  # g.m-3.d-1 CASTO growth on PHA, O2
r21 = µCASTO_T * XCASTO * ηCASTO_anox * MRsatXSTC_XCASTO_KSTC * MsatSNO2_KNO2_CASTO * MinhSO2_KO2_CASTO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa_PAO * MsatSMg_KMg_PAO * BellinhpH  # g.m-3.d-1 CASTO growth on PHA, NO2
r22 = µCASTO_T * XCASTO * ηCASTO_anox * MRsatXSTC_XCASTO_KSTC * MsatSNO3_KNO3_CASTO * MinhSO2_KO2_CASTO * MinhSNO2_KNO2_CASTO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa_PAO * MsatSMg_KMg_PAO * BellinhpH  # g.m-3.d-1 CASTO growth on PHA, NO3
r23 = qPAO_PP_T * XPAO / ( XPP + XPP_PAO_min ) * XPAO * MsatSO2_KO2_CASTO * LogsatSPO4_KPO4_PAO * LoginhXPP_XPAO_max * MsatSCa_KCa_PAO * MsatSMg_KMg_PAO * MsatSK_KK_PAO * BellinhpH  # g.m-3.d-1 PAO polyphosphate storage, O2
r24 = qPAO_PP_T * XPAO / ( XPP + XPP_PAO_min ) * XPAO * ηCASTO_anox * MsatSNO2_KNO2_CASTO * MinhSO2_KO2_CASTO * LogsatSPO4_KPO4_PAO * LoginhXPP_XPAO_max * MsatSCa_KCa_PAO * MsatSMg_KMg_PAO * MsatSK_KK_PAO * BellinhpH  # g.m-3.d-1 PAO polyphosphate storage, NO2
r25 = qPAO_PP_T * XPAO / ( XPP + XPP_PAO_min ) * XPAO * ηCASTO_anox * MsatSNO3_KNO3_CASTO * MinhSO2_KO2_CASTO * MinhSNO2_KNO2_CASTO * LogsatSPO4_KPO4_PAO * LoginhXPP_XPAO_max * MsatSCa_KCa_PAO * MsatSMg_KMg_PAO * MsatSK_KK_PAO * BellinhpH  # g.m-3.d-1 PAO polyphosphate storage, NO3
r26 = µPAO_lim_T * XPAO * MRsatXPHA_XPAO_KPHA * MsatSO2_KO2_CASTO * MsatSNHx_KNHx_BIO * MinhSPO4_KiPO4_lim * MsatXPP_KPP_lim * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 PAO growth on PHA, O2; PO4 limited
r27 = µPAO_lim_T * XPAO * ηCASTO_anox * MRsatXPHA_XPAO_KPHA * MinhSO2_KO2_CASTO * MsatSNO2_KNO2_CASTO * MsatSNHx_KNHx_BIO * MinhSPO4_KiPO4_lim * MsatXPP_KPP_lim * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 PAO growth on PHA, NO2; PO4 limited
r28 = µPAO_lim_T * XPAO * ηCASTO_anox * MRsatXPHA_XPAO_KPHA * MinhSO2_KO2_CASTO * MsatSNO3_KNO3_CASTO * MinhSNO2_KNO2_CASTO * MsatSNHx_KNHx_BIO * MinhSPO4_KiPO4_lim * MsatXPP_KPP_lim * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 PAO growth on PHA, NO3; PO4 limited
r29 = qPAO_PHA_T * XCASTO * actsto_PAO_ORP * MsatSVFA_KVFA_CASTO * MRsatXPP_XPAO_KPP * LoginhXPHA_XPAO_max  # g.m-3.d-1 PAO's PHA storage from VFAs and PO4 release
r30 = qGAO_PHA_T * XCASTO * actsto_GAO_ORP * MsatSVFA_KVFA_CASTO * LoginhXPHA_XGAO_max  # g.m-3.d-1 GAO's PHA storage from VFAs
r31 = bSTC_T * XCASTO * MsatSO2_KO2_CASTO * MRsatXSTC_XCASTO_KSTC  # g.m-3.d-1 CASTO aerobic maintenance
r32 = bSTC_T * ηbSTC_anox * XCASTO * MinhSO2_KO2_CASTO * MsatSNO2_KNO2_CASTO * MRsatXSTC_XCASTO_KSTC  # g.m-3.d-1 CASTO anoxic maintenance, NO2
r33 = bSTC_T * ηbSTC_anox * XCASTO * MinhSO2_KO2_CASTO * MsatSNO3_KNO3_CASTO * MinhSNO2_KNO2_CASTO * MRsatXSTC_XCASTO_KSTC  # g.m-3.d-1 CASTO anoxic maintenance, NO3
r34 = bSTC_T * ηbPHA_ana * XGAO * MinhSO2_KO2_CASTO * MinhSNO3_KNO3_CASTO * MinhSNO2_KNO2_CASTO * MRsatXPHA_XGAO_KPHA  # g.m-3.d-1 GAO anaerobic maintenance
r35 = bPP_ana_T * XPAO * LogsatXPP_KPO4_PAO * ( ηbPP_aer * MRinhXPHA_XPAO_KPHA_cle * MsatSO2_KO2_CASTO + ηbPP_anox * MinhSO2_KO2_CASTO * MsatSNO2_KNO2_CASTO + ηbPP_anox * MinhSO2_KO2_CASTO * MsatSNO3_KNO3_CASTO * MinhSNO2_KNO2_CASTO + MinhSO2_KO2_CASTO * MinhSNO3_KNO3_CASTO * MinhSNO2_KNO2_CASTO )  # g.m-3.d-1 PP cleavage for maintenance
r36 = µFERM_PAO_T * XCASTO * actferm_PAO_ORP * LogsatSVFA_KVFA_FERM * MsatSB_KSB_ana * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH  # g.m-3.d-1 SB fermentation with high VFA (PAO growth, anaerobic)
r37 = µFERM_PAO_T * XCASTO * actferm_PAO_ORP * LoginhSVFA_KVFA_FERM * MsatSB_KSB_ana * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * MsatSCO2_KCO2_BIO * BellinhpH  # g.m-3.d-1 SB fermentation with low VFA (PAO growth, anaerobic)
r38 = bCASTO_T * MRinhXSTC_XCASTO_KSTC * ( XCASTO * MsatSO2_KO2_CASTO + ηbCASTO_anox * ( XGAO + XPAO * MRinhXPP_XPAO_KPP ) * ( MsatSNO2_KNO2_CASTO + MinhSNO2_KNO2_CASTO * MsatSNO3_KNO3_CASTO ) * MinhSO2_KO2_CASTO )  # g.m-3.d-1 CASTO decay
r39 = bCASTO_T * ( ηbCASTO_ana * ( XPAO * MRinhXPP_XPAO_KPP + XGAO * MRinhXPHA_XGAO_KPHA ) * MinhSNO3_KNO3_CASTO * MinhSNO2_KNO2_CASTO * MinhSO2_KO2_CASTO + XCASTO * mtox_ana )  # g.m-3.d-1 CASTO anaerobic decay
r40 = kORPswitch * ( ORP + offsetORPswitch - SORPswitch )  # mV.d-1 ORP lag for CASTO activity switches
r41 = µAOB_T / YAOB * XAOB * MsatSO2_KO2_NHx_AOB * MsatSNHx_KNHx_NH2OH_AOB  # g.m-3.d-1 AOB NHx oxidation to NH2OH
r42 = µAOB_T * XAOB * MsatSNH2OH_KNH2OH_AOB * MsatSO2_KO2_NH2OH_AOB * MsatSNHx_KNHx_AOB * LogsatpHCO2_AOB * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH_AOB  # g.m-3.d-1 AOB NH2OH oxidation to NO
r43 = µAOB_T / YAOB * XAOB * MsatSO2_KO2_NH2OH_AOB * MsatSNO_KNO_NO2_AOB  # g.m-3.d-1 AOB NO oxidation to NO2
r44 = µAOB_T / YAOB * ƞAOB_NO_N2O * XAOB * MsatSNH2OH_KNH2OH_AOB * MsatSNO_KNO_N2O_AOB  # g.m-3.d-1 AOB NO reduction to N2O (NN pathway)
r45 = µAOB_T / YAOB * ƞAOB_NO2_N2O * XAOB * MsatSNH2OH_KNH2OH_AOB * MsatSHNO2_KHNO2_AOB * MinhSO2_KiO2_AOB  # g.m-3.d-1 AOB HNO2 reduction to N2O (ND pathway)
r46 = bAOB_T * XAOB * ( MsatSO2_KO2_AOB + ηb_anox * MsatSNOx_KNOx_AOB * MinhSO2_KO2_AOB )  # g.m-3.d-1 AOB decay
r47 = bAOB_T * XAOB * ( ηb_ana * MinhSNOx_KNOx_AOB * MinhSO2_KO2_AOB + mtox_ana )  # g.m-3.d-1 AOB anaerobic decay
r48 = µNOB_T * XNOB * MinhSNH2OH_KNH2OH_NOB * MsatSNO2_KNO2_NOB * LogsatpHCO2_NOB * MsatSO2_KO2_NOB * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * MinhpHNH3_NOB * BellinhpH_NOB  # g.m-3.d-1 NOB growth
r49 = bNOB_T * XNOB * ( MsatSO2_KO2_NOB + ηb_anox * MsatSNOx_KNOx_NOB * MinhSO2_KO2_NOB )  # g.m-3.d-1 NOB decay
r50 = bNOB_T * XNOB * ( ηb_ana * MinhSNOx_KNOx_NOB * MinhSO2_KO2_NOB + mtox_ana )  # g.m-3.d-1 NOB anaerobic decay
r51 = qNH2OH_NO2_pH * SNH2OH * SHNO2  # g.m-3.d-1 Abiotic hydroxylamine oxidation with nitrite
r52 = qNH2OH_O2 * SNH2OH^2 * MsatSO2_KO2_aBIO  # g.m-3.d-1 Abiotic hydroxylamine oxidation with oxygen
r53 = qNH2OH * SNH2OH * ( 1 + ηNH2OH_dispr_ana * MinhSO2_KO2_aBIO * MinhSNOx_KNOx_aBIO )  # g.m-3.d-1 Abiotic hydroxylamine disproportionation
r54 = µAMX_T * XAMX * MsatSNHx_KNHx_AMX * MsatSNO2_KNO2_AMX * MinhSO2_KiO2_AMX * LogsatpHCO2_AMX * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH * MinhpHHNO2_AMX  # g.m-3.d-1 Anammox growth
r55 = bAMX_T * XAMX * ( MsatSO2_KiO2_AMX + ηb_anox * MsatSNOx_KNOx_AMX * MinhSO2_KiO2_AMX )  # g.m-3.d-1 Anammox decay
r56 = bAMX_T * XAMX * ( ηb_ana * MinhSNOx_KNOx_AMX * MinhSO2_KiO2_AMX )  # g.m-3.d-1 Anammox anaerobic decay
r57 = µAMETO_T * XAMETO * HsatSVFA_AMETO * MinhSO2_KiO2_AMETO * MinhSNOx_KNO3_AMETO * LoginhpHNH3_AMETO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH_AMETO  # g.m-3.d-1 AMETO growth
r58 = bAMETO_T * XAMETO * ( mtox_aer * MsatSO2_KiO2_AMETO + mtox_anox * MsatSNOx_KNO3_AMETO * MinhSO2_KiO2_AMETO )  # g.m-3.d-1 AMETO decay
r59 = bAMETO_T * XAMETO * MinhSNOx_KNO3_AMETO * MinhSO2_KiO2_AMETO  # g.m-3.d-1 AMETO anaerobic decay
r60 = µHMETO_T * XHMETO * MsatSCO2_KCO2_BIO * MsatSH2_KH2_HMETO * MinhSO2_KiO2_HMETO * MinhSNOx_KNO3_HMETO * MsatSNHx_KNHx_BIO * MsatSPO4_KPO4_BIO * MsatSCAT_KCAT * MsatSAN_KAN * MsatSCa_KCa * MsatSMg_KMg * BellinhpH_HMETO  # g.m-3.d-1 HMETO growth
r61 = bHMETO_T * XHMETO * ( mtox_aer * MsatSO2_KiO2_HMETO + mtox_anox * MsatSNOx_KNO3_HMETO * MinhSO2_KiO2_HMETO )  # g.m-3.d-1 HMETO decay
r62 = bHMETO_T * XHMETO * ( MinhSNOx_KNO3_HMETO * MinhSO2_KiO2_HMETO )  # g.m-3.d-1 HMETO anaerobic decay
r63 = µALGAE_T * XALGAE * MsatSPO4_KPO4_BIO * MsatSCO2_KCO2_ALGAE * LightSwitch * MsatSNOx_KNOx_ALGAE * MinhSNHx_KiNHx_ALGAE  # g.m-3.d-1 ALGAE growth on Nitrate
r64 = µALGAE_T * XALGAE * MsatSNHx_KNHx_ALGAE * MsatSPO4_KPO4_BIO * MsatSCO2_KCO2_ALGAE * LightSwitch  # g.m-3.d-1 ALGAE growth on Ammonia
r65 = bALGAE_T * XALGAE * MsatSO2_KO2_ALGAE  # g.m-3.d-1 ALGAE respiration
r66 = bALGAE_T * XALGAE * MinhSO2_KO2_ALGAE  # g.m-3.d-1 ALGAE decay
r67 = qFLOC_T * XBIO * MsatCB_KCB_FLOC + qFLOC_HFO_T * XHFO * MsatCB_KCB_FLOC_HFO * BellinhpH_FLOC_HFO + qFLOC_HAO_T * XHAO * MsatCB_KCB_FLOC_HAO * BellinhpH_FLOC_HAO  # g.m-3.d-1 Flocculation of colloidal biodegradable substrate
r68 = qFLOC_T * XBIO * MsatCU_KCU_FLOC + qFLOC_HFO_T * XHFO * MsatCU_KCU_FLOC_HFO * BellinhpH_FLOC_HFO + qFLOC_HAO_T * XHAO * MsatCU_KCU_FLOC_HAO * BellinhpH_FLOC_HAO  # g.m-3.d-1 Flocculation of colloidal unbiodegradable organics
r69 = rateFLOC_CB_polymer  # g.m-3.d-1 Flocculation of colloidal biodegradable substrate with polymers
r70 = rateFLOC_CU_polymer  # g.m-3.d-1 Flocculation of colloidal unbiodegradable organics with polymers
r71 = qHYD_XB_T * XHET * ( LogsatXHET_HYD_lim * MRsatXB_XHET_KHYD + LoginhXHET_HYD_lim * MsatXB_KXB_HYD ) * ( MsatSO2_KO2_OHO + ηHYD_anox * ( MsatSNO2_KNO2_OHO + MsatSNO3_KNO3_OHO * MinhSNO2_KNO2_OHO ) * MinhSO2_KO2_OHO + ηHYD_ana * MinhSNO3_KNO3_OHO * MinhSNO2_KNO2_OHO * MinhSO2_KO2_OHO )  # g.m-3.d-1 XB hydrolysis
r72 = qHYD_XBe_T * XHET * ( LogsatXHET_HYD_lim * MRsatXBe_XHET_KHYD + LoginhXHET_HYD_lim * MsatXBe_KXBe_HYD ) * ( MsatSO2_KO2_OHO + ηHYD_anox * ( MsatSNO2_KNO2_OHO + MsatSNO3_KNO3_OHO * MinhSNO2_KNO2_OHO ) * MinhSO2_KO2_OHO + ηHYD_ana * MinhSNO3_KNO3_OHO * MinhSNO2_KNO2_OHO * MinhSO2_KO2_OHO )  # g.m-3.d-1 XB,e hydrolysis
r73 = qAMMON_T * SN_B * XHET  # g.m-3.d-1 SN,B ammonification
r74 = qSPB_T * SP_B * XHET  # g.m-3.d-1 SP,B conversion to PO4
r75 = qXE_T * XE  # g.m-3.d-1 XE conversion
r76 = qHYD_XBe_T * XHET * ( LogsatXHET_HYD_lim * MRsatXEana_XHET_KHYD + LoginhXHET_HYD_lim * MsatXEana_KXEana_HYD ) * ( MsatSO2_KO2_OHO + ηHYD_anox * ( MsatSNO2_KNO2_OHO + MinhSNO2_KNO2_OHO * MsatSNO3_KNO3_OHO ) * MinhSO2_KO2_OHO )  # g.m-3.d-1 XE,ana hydrolysis
r77 = qXU_T * XU * MsatXU_KXU  # g.m-3.d-1 XU conversion
r78 = qMEOL * SMEOL * MsatSCO2_KCO2_BIO * MinhSO2_KO2_OHO * MinhSNO3_KNO3_OHO * MinhSNO2_KNO2_OHO  # g.m-3.d-1 Anaerobic methanol conversion
r79 = qASSIM_T * XBIO * MsatSNO2_KNO2_ASSIM * MinhSNHx_KiNHx_ASSIM  # g.m-3.d-1 NO2 assimilative reduction
r80 = qASSIM_T * XBIO * MsatSNO3_KNO3_ASSIM * MinhSNO2_KNO2_ASSIM * MinhSNHx_KiNHx_ASSIM  # g.m-3.d-1 NO3 assimilative reduction
r81 = qHFOH_AGING * ( XHFO_H + XHFO_H_P )  # g.m-3.d-1 Aging of active HFO,H
r82 = qHFOL_AGING * ( XHFO_L + XHFO_L_P )  # g.m-3.d-1 Aging of active HFO,L
r83 = qP_HFO_COPREC * XHFO_H * MsatSPO4_KP_HFO_BIND  # g.m-3.d-1 Fast binding of P on active HFO,H
r84 = qP_HFO_BIND * XHFO_L * MsatSPO4_KP_HFO_BIND  # g.m-3.d-1 Slow binding of P on active HFO,L
r85 = qHFOH_DESORP * XHFO_H_P * MinhSPO4_KiP_HFO_DESORP  # g.m-3.d-1 Desorption of P from XHFO,H,P
r86 = qHFOL_DESORP * XHFO_L_P * MinhSPO4_KiP_HFO_DESORP  # g.m-3.d-1 Desorption of P from XHFO,L,P
r87 = qHFO_DISS * ( XHFO_H_P_old + XHFO_L_P_old ) * LoginhSPO4_KiP_HFO_DISS  # g.m-3.d-1 Dissolution of P from XHFO,H,P,old and XHFO,L,P,old
r88 = qHFO_RED_T * XHFO * LoginhORP_HFO * ( MsatSB_KSB + MsatSVFA_KVFA )  # g.m-3.d-1 Reduction of XHFO with organic matter
r89 = qFe2_OX_T * SFe2 * MsatSO2_KO2_OHO  # g.m-3.d-1 Oxidation of Fe2+ 
r90 = qHAOH_AGING * ( XHAO_H + XHAO_H_P )  # g.m-3.d-1 Aging of active HAO,H
r91 = qHAOL_AGING * ( XHAO_L + XHAO_L_P )  # g.m-3.d-1 Aging of active HAO,L
r92 = qP_HAO_COPREC * XHAO_H * MsatSPO4_KP_HAO_BIND  # g.m-3.d-1 Fast binding of P on active HAO,H
r93 = qP_HAO_BIND * XHAO_L * MsatSPO4_KP_HAO_BIND  # g.m-3.d-1 Slow binding of P on active HAO,L
r94 = qHAOH_DESORP * XHAO_H_P * MinhSPO4_KiP_HAO_DESORP  # g.m-3.d-1 Desorption of P from XHAO,H,P
r95 = qHAOL_DESORP * XHAO_L_P * MinhSPO4_KiP_HAO_DESORP  # g.m-3.d-1 Desorption of P from XHAO,L,P
r96 = qHAO_DISS * ( XHAO_H_P_old + XHAO_L_P_old ) * LoginhSPO4_KiP_HAO_DISS  # g.m-3.d-1 Dissolution of P from XHAO,H,P,old and XHAO,L,P,old
r97 = qCaCO3 * PrecipDrivingForceCaCO3^2  # g.m-3.d-1 Calcium carbonate precipitation
r98 = qACP * PrecipDrivingForceACP^2  # g.m-3.d-1 Amorphous calcium phosphate precipitation
r99 = qBSH * PrecipDrivingForceBSH^2  # g.m-3.d-1 Brushite precipitation
r100 = qSTR * PrecipDrivingForceSTR^3  # g.m-3.d-1 Struvite precipitation
r101 = qVivi * PrecipDrivingForceVivi^2  # g.m-3.d-1 Vivianite precipitation
r102 = qPFOA_SORP * ( SPFOA - ( XPFOA / XVSS ) * ( cg_kg * cmg_g ) / KOC_PFOA_EQ )  # g.m-3.d-1 PFOA sorption
r103 = qPFOS_SORP * ( SPFOS - ( XPFOS / XVSS ) * ( cg_kg * cmg_g ) / KOC_PFOS_EQ )  # g.m-3.d-1 PFOS sorption
r104 = qALPHA_O2 * XVSS * dampALPHA * ( SALPHA_sat - SALPHA )  # d-1 Elimination of surfactants
r105 = ktransfer_GCO2_bub  # g.m-3.d-1 Carbon dioxide gas transfer - bubbles
r106 = kLaGCH4_bub * ( SGCH4_bub_sat - SCH4 )  # g.m-3.d-1 Methane gas transfer - bubbles
r107 = kLaGH2_bub * ( SGH2_bub_sat - SH2 )  # g.m-3.d-1 Hydrogen gas transfer - bubbles
r108 = kLaGO2_bub * ( SGO2_bub_sat - SO2 )  # g.m-3.d-1 Oxygen gas transfer - bubbles
r109 = ktransfer_GNH3_bub  # g.m-3.d-1 Ammonia absorption - bubbles
r110 = kLaGNO_bub * ( SGNO_bub_sat - SNO )  # g.m-3.d-1 Nitric oxide gas transfer - bubbles
r111 = kLaGN2O_bub * ( SGN2O_bub_sat - SN2O )  # g.m-3.d-1 Nitrous oxide gas transfer - bubbles
r112 = kLaGN2_bub * ( SGN2_bub_sat - SN2 )  # g.m-3.d-1 Nitrogen gas transfer - bubbles
r113 = ktransfer_GCO2_sur  # g.m-3.d-1 Carbon dioxide gas transfer - surface
r114 = kLaGCH4_sur * ( SGCH4_sur_sat - SCH4 )  # g.m-3.d-1 Methane gas transfer - surface
r115 = kLaGH2_sur * ( SGH2_sur_sat - SH2 )  # g.m-3.d-1 Hydrogen gas transfer - surface
r116 = kLaGO2_sur * ( SGO2_sur_sat - SO2 )  # g.m-3.d-1 Oxygen gas transfer - surface
r117 = ktransfer_GNH3_sur  # g.m-3.d-1 Ammonia absorption - surface
r118 = kLaGNO_sur * ( SGNO_sur_sat - SNO )  # g.m-3.d-1 Nitric oxide gas transfer - surface
r119 = kLaGN2O_sur * ( SGN2O_sur_sat - SN2O )  # g.m-3.d-1 Nitrous oxide gas transfer - surface
r120 = kLaGN2_sur * ( SGN2_sur_sat - SN2 )  # g.m-3.d-1 Nitrogen gas transfer - surface
```

## 2. 状态变量方程（按列）

```python
# 1. dSVFA
dSVFA_1 = - 1 / YOHO_VFA_ox * r1  # g.m-3.d-1 OHO growth on VFAs, O2
dSVFA_2 = - 1 / YOHO_VFA_anox * r2  # g.m-3.d-1 OHO growth on VFAs, NO3
dSVFA_3 = - 1 / YOHO_VFA_anox * r3  # g.m-3.d-1 OHO growth on VFAs, NO2
dSVFA_4 = - 1 / YOHO_VFA_anox * r4  # g.m-3.d-1 OHO growth on VFAs, NO
dSVFA_5 = - 1 / YOHO_VFA_anox * r5  # g.m-3.d-1 OHO growth on VFAs, N2O
dSVFA_6 = ( 1 - YOHO_SB_ana - YOHO_H2_ana_high ) / YOHO_SB_ana * r11  # g.m-3.d-1 SB fermentation with high VFA (OHO growth, anaerobic)
dSVFA_7 = ( 1 - YOHO_SB_ana - YOHO_H2_ana_low ) / YOHO_SB_ana * r12  # g.m-3.d-1 SB fermentation with low VFA (OHO growth, anaerobic)
dSVFA_8 = - 1 * r29  # g.m-3.d-1 PAO's PHA storage from VFAs and PO4 release
dSVFA_9 = - 1 * r30  # g.m-3.d-1 GAO's PHA storage from VFAs
dSVFA_10 = 1 * r34  # g.m-3.d-1 GAO anaerobic maintenance
dSVFA_11 = ( 1 - YCASTO_SB_ana - YCASTO_H2_ana_high ) / YCASTO_SB_ana * r36  # g.m-3.d-1 SB fermentation with high VFA (PAO growth, anaerobic)
dSVFA_12 = ( 1 - YCASTO_SB_ana - YCASTO_H2_ana_low ) / YCASTO_SB_ana * r37  # g.m-3.d-1 SB fermentation with low VFA (PAO growth, anaerobic)
dSVFA_13 = XSTC / XCASTO * r38  # g.m-3.d-1 CASTO decay
dSVFA_14 = XSTC / XCASTO * r39  # g.m-3.d-1 CASTO anaerobic decay
dSVFA_15 = - 1 / YAMETO * r57  # g.m-3.d-1 AMETO growth
dSVFA_16 = 2 / 3 * r78  # g.m-3.d-1 Anaerobic methanol conversion
dSVFA_17 = - EEQFe2 * SVFA / ( SB + SVFA ) * r88  # g.m-3.d-1 Reduction of XHFO with organic matter
dSVFA = dSVFA_1 + dSVFA_2 + dSVFA_3 + dSVFA_4 + dSVFA_5 + dSVFA_6 + dSVFA_7 + dSVFA_8 + dSVFA_9 + dSVFA_10 + dSVFA_11 + dSVFA_12 + dSVFA_13 + dSVFA_14 + dSVFA_15 + dSVFA_16 + dSVFA_17

# 2. dSB
dSB_1 = - 1 / YOHO_SB_ox * r6  # g.m-3.d-1 OHO growth on SB, O2
dSB_2 = - 1 / YOHO_SB_anox * r7  # g.m-3.d-1 OHO growth on SB, NO3
dSB_3 = - 1 / YOHO_SB_anox * r8  # g.m-3.d-1 OHO growth on SB, NO2
dSB_4 = - 1 / YOHO_SB_anox * r9  # g.m-3.d-1 OHO growth on SB, NO
dSB_5 = - 1 / YOHO_SB_anox * r10  # g.m-3.d-1 OHO growth on SB, N2O
dSB_6 = - 1 / YOHO_SB_ana * r11  # g.m-3.d-1 SB fermentation with high VFA (OHO growth, anaerobic)
dSB_7 = - 1 / YOHO_SB_ana * r12  # g.m-3.d-1 SB fermentation with low VFA (OHO growth, anaerobic)
dSB_8 = - 1 / YCASTO_SB_ana * r36  # g.m-3.d-1 SB fermentation with high VFA (PAO growth, anaerobic)
dSB_9 = - 1 / YCASTO_SB_ana * r37  # g.m-3.d-1 SB fermentation with low VFA (PAO growth, anaerobic)
dSB_10 = 1 * r71  # g.m-3.d-1 XB hydrolysis
dSB_11 = 1 * r72  # g.m-3.d-1 XB,e hydrolysis
dSB_12 = 1 * r76  # g.m-3.d-1 XE,ana hydrolysis
dSB_13 = - EEQFe2 * SB / ( SB + SVFA ) * r88  # g.m-3.d-1 Reduction of XHFO with organic matter
dSB = dSB_1 + dSB_2 + dSB_3 + dSB_4 + dSB_5 + dSB_6 + dSB_7 + dSB_8 + dSB_9 + dSB_10 + dSB_11 + dSB_12 + dSB_13

# 3. dSMEOL
dSMEOL_1 = - 1 / YOHO_SMEOL_ox * r13  # g.m-3.d-1 OHO growth on SMEOL, O2
dSMEOL_2 = - 1 / YMEOLO * r16  # g.m-3.d-1 MEOLO growth, NO2
dSMEOL_3 = - 1 / YMEOLO * r17  # g.m-3.d-1 MEOLO growth, NO3
dSMEOL_4 = - 1 * r78  # g.m-3.d-1 Anaerobic methanol conversion
dSMEOL = dSMEOL_1 + dSMEOL_2 + dSMEOL_3 + dSMEOL_4

# 4. dCB
dCB_1 = - 1.0 * r67  # g.m-3.d-1 Flocculation of colloidal biodegradable substrate
dCB_2 = - 1.0 * r69  # g.m-3.d-1 Flocculation of colloidal biodegradable substrate with polymers
dCB = dCB_1 + dCB_2

# 5. dXB
dXB_1 = 1.0 * r67  # g.m-3.d-1 Flocculation of colloidal biodegradable substrate
dXB_2 = 1.0 * r69  # g.m-3.d-1 Flocculation of colloidal biodegradable substrate with polymers
dXB_3 = - 1.0 * r71  # g.m-3.d-1 XB hydrolysis
dXB_4 = 1.0 * r75  # g.m-3.d-1 XE conversion
dXB_5 = 1.0 * r77  # g.m-3.d-1 XU conversion
dXB = dXB_1 + dXB_2 + dXB_3 + dXB_4 + dXB_5

# 6. dXB_e
dXB_e_1 = 1 - fE * r14  # g.m-3.d-1 OHO decay
dXB_e_2 = 1 - fE * r15  # g.m-3.d-1 OHO anaerobic decay
dXB_e_3 = 1 - fE * r18  # g.m-3.d-1 MEOLO decay
dXB_e_4 = 1 - fE * r19  # g.m-3.d-1 MEOLO anaerobic decay
dXB_e_5 = 1 - fE * r38  # g.m-3.d-1 CASTO decay
dXB_e_6 = 1 - fE * r39  # g.m-3.d-1 CASTO anaerobic decay
dXB_e_7 = 1 - fE * r46  # g.m-3.d-1 AOB decay
dXB_e_8 = 1 - fE * r47  # g.m-3.d-1 AOB anaerobic decay
dXB_e_9 = 1 - fE * r49  # g.m-3.d-1 NOB decay
dXB_e_10 = 1 - fE * r50  # g.m-3.d-1 NOB anaerobic decay
dXB_e_11 = 1 - fE * r55  # g.m-3.d-1 Anammox decay
dXB_e_12 = 1 - fE * r56  # g.m-3.d-1 Anammox anaerobic decay
dXB_e_13 = 1 - fE * r58  # g.m-3.d-1 AMETO decay
dXB_e_14 = 1 - fE * r59  # g.m-3.d-1 AMETO anaerobic decay
dXB_e_15 = 1 - fE * r61  # g.m-3.d-1 HMETO decay
dXB_e_16 = 1 - fE * r62  # g.m-3.d-1 HMETO anaerobic decay
dXB_e_17 = 1 - fE * r66  # g.m-3.d-1 ALGAE decay
dXB_e_18 = - 1 * r72  # g.m-3.d-1 XB,e hydrolysis
dXB_e = dXB_e_1 + dXB_e_2 + dXB_e_3 + dXB_e_4 + dXB_e_5 + dXB_e_6 + dXB_e_7 + dXB_e_8 + dXB_e_9 + dXB_e_10 + dXB_e_11 + dXB_e_12 + dXB_e_13 + dXB_e_14 + dXB_e_15 + dXB_e_16 + dXB_e_17 + dXB_e_18

# 7. dCU
dCU_1 = - 1.0 * r68  # g.m-3.d-1 Flocculation of colloidal unbiodegradable organics
dCU_2 = - 1.0 * r70  # g.m-3.d-1 Flocculation of colloidal unbiodegradable organics with polymers
dCU = dCU_1 + dCU_2

# 8. dXU
dXU_1 = 1.0 * r68  # g.m-3.d-1 Flocculation of colloidal unbiodegradable organics
dXU_2 = 1.0 * r70  # g.m-3.d-1 Flocculation of colloidal unbiodegradable organics with polymers
dXU_3 = - 1.0 * r77  # g.m-3.d-1 XU conversion
dXU = dXU_1 + dXU_2 + dXU_3

# 9. dXPHA_PAO
dXPHA_PAO_1 = - ( XPHA_PAO / XSTC ) / YCASTO_STC_ox * r20  # g.m-3.d-1 CASTO growth on PHA, O2
dXPHA_PAO_2 = - ( XPHA_PAO / XSTC ) / YCASTO_STC_anox * r21  # g.m-3.d-1 CASTO growth on PHA, NO2
dXPHA_PAO_3 = - ( XPHA_PAO / XSTC ) / YCASTO_STC_anox * r22  # g.m-3.d-1 CASTO growth on PHA, NO3
dXPHA_PAO_4 = - 1 / YPAO_PHA_ox * r26  # g.m-3.d-1 PAO growth on PHA, O2; PO4 limited
dXPHA_PAO_5 = - 1 / YPAO_PHA_anox * r27  # g.m-3.d-1 PAO growth on PHA, NO2; PO4 limited
dXPHA_PAO_6 = - 1 / YPAO_PHA_anox * r28  # g.m-3.d-1 PAO growth on PHA, NO3; PO4 limited
dXPHA_PAO_7 = 1 * r29  # g.m-3.d-1 PAO's PHA storage from VFAs and PO4 release
dXPHA_PAO_8 = - XPHA_PAO / XSTC * r31  # g.m-3.d-1 CASTO aerobic maintenance
dXPHA_PAO_9 = - XPHA_PAO / XSTC * r32  # g.m-3.d-1 CASTO anoxic maintenance, NO2
dXPHA_PAO_10 = - XPHA_PAO / XSTC * r33  # g.m-3.d-1 CASTO anoxic maintenance, NO3
dXPHA_PAO_11 = 1 * r36  # g.m-3.d-1 SB fermentation with high VFA (PAO growth, anaerobic)
dXPHA_PAO_12 = 1 * r37  # g.m-3.d-1 SB fermentation with low VFA (PAO growth, anaerobic)
dXPHA_PAO_13 = - XPHA_PAO / XCASTO * r38  # g.m-3.d-1 CASTO decay
dXPHA_PAO_14 = - XPHA_PAO / XCASTO * r39  # g.m-3.d-1 CASTO anaerobic decay
dXPHA_PAO = dXPHA_PAO_1 + dXPHA_PAO_2 + dXPHA_PAO_3 + dXPHA_PAO_4 + dXPHA_PAO_5 + dXPHA_PAO_6 + dXPHA_PAO_7 + dXPHA_PAO_8 + dXPHA_PAO_9 + dXPHA_PAO_10 + dXPHA_PAO_11 + dXPHA_PAO_12 + dXPHA_PAO_13 + dXPHA_PAO_14

# 10. dXPHA_GAO
dXPHA_GAO_1 = - ( XPHA_GAO / XSTC ) / YCASTO_STC_ox * r20  # g.m-3.d-1 CASTO growth on PHA, O2
dXPHA_GAO_2 = - ( XPHA_GAO / XSTC ) / YCASTO_STC_anox * r21  # g.m-3.d-1 CASTO growth on PHA, NO2
dXPHA_GAO_3 = - ( XPHA_GAO / XSTC ) / YCASTO_STC_anox * r22  # g.m-3.d-1 CASTO growth on PHA, NO3
dXPHA_GAO_4 = 1 * r30  # g.m-3.d-1 GAO's PHA storage from VFAs
dXPHA_GAO_5 = - XPHA_GAO / XSTC * r31  # g.m-3.d-1 CASTO aerobic maintenance
dXPHA_GAO_6 = - XPHA_GAO / XSTC * r32  # g.m-3.d-1 CASTO anoxic maintenance, NO2
dXPHA_GAO_7 = - XPHA_GAO / XSTC * r33  # g.m-3.d-1 CASTO anoxic maintenance, NO3
dXPHA_GAO_8 = - 1 * r34  # g.m-3.d-1 GAO anaerobic maintenance
dXPHA_GAO_9 = - XPHA_GAO / XCASTO * r38  # g.m-3.d-1 CASTO decay
dXPHA_GAO_10 = - XPHA_GAO / XCASTO * r39  # g.m-3.d-1 CASTO anaerobic decay
dXPHA_GAO = dXPHA_GAO_1 + dXPHA_GAO_2 + dXPHA_GAO_3 + dXPHA_GAO_4 + dXPHA_GAO_5 + dXPHA_GAO_6 + dXPHA_GAO_7 + dXPHA_GAO_8 + dXPHA_GAO_9 + dXPHA_GAO_10

# 11. dXE
dXE_1 = fE * r14  # g.m-3.d-1 OHO decay
dXE_2 = fE * r18  # g.m-3.d-1 MEOLO decay
dXE_3 = fE * r38  # g.m-3.d-1 CASTO decay
dXE_4 = fE * r46  # g.m-3.d-1 AOB decay
dXE_5 = fE * r49  # g.m-3.d-1 NOB decay
dXE_6 = fE * r55  # g.m-3.d-1 Anammox decay
dXE_7 = fE * r58  # g.m-3.d-1 AMETO decay
dXE_8 = fE * r61  # g.m-3.d-1 HMETO decay
dXE_9 = fE * r66  # g.m-3.d-1 ALGAE decay
dXE_10 = - 1 * r75  # g.m-3.d-1 XE conversion
dXE = dXE_1 + dXE_2 + dXE_3 + dXE_4 + dXE_5 + dXE_6 + dXE_7 + dXE_8 + dXE_9 + dXE_10

# 12. dXE_ana
dXE_ana_1 = fE * r15  # g.m-3.d-1 OHO anaerobic decay
dXE_ana_2 = fE * r19  # g.m-3.d-1 MEOLO anaerobic decay
dXE_ana_3 = fE * r39  # g.m-3.d-1 CASTO anaerobic decay
dXE_ana_4 = fE * r47  # g.m-3.d-1 AOB anaerobic decay
dXE_ana_5 = fE * r50  # g.m-3.d-1 NOB anaerobic decay
dXE_ana_6 = fE * r56  # g.m-3.d-1 Anammox anaerobic decay
dXE_ana_7 = fE * r59  # g.m-3.d-1 AMETO anaerobic decay
dXE_ana_8 = fE * r62  # g.m-3.d-1 HMETO anaerobic decay
dXE_ana_9 = - 1 * r76  # g.m-3.d-1 XE,ana hydrolysis
dXE_ana = dXE_ana_1 + dXE_ana_2 + dXE_ana_3 + dXE_ana_4 + dXE_ana_5 + dXE_ana_6 + dXE_ana_7 + dXE_ana_8 + dXE_ana_9

# 13. dXOHO
dXOHO_1 = 1 * r1  # g.m-3.d-1 OHO growth on VFAs, O2
dXOHO_2 = 1 * r2  # g.m-3.d-1 OHO growth on VFAs, NO3
dXOHO_3 = 1 * r3  # g.m-3.d-1 OHO growth on VFAs, NO2
dXOHO_4 = 1 * r4  # g.m-3.d-1 OHO growth on VFAs, NO
dXOHO_5 = 1 * r5  # g.m-3.d-1 OHO growth on VFAs, N2O
dXOHO_6 = 1 * r6  # g.m-3.d-1 OHO growth on SB, O2
dXOHO_7 = 1 * r7  # g.m-3.d-1 OHO growth on SB, NO3
dXOHO_8 = 1 * r8  # g.m-3.d-1 OHO growth on SB, NO2
dXOHO_9 = 1 * r9  # g.m-3.d-1 OHO growth on SB, NO
dXOHO_10 = 1 * r10  # g.m-3.d-1 OHO growth on SB, N2O
dXOHO_11 = 1 * r11  # g.m-3.d-1 SB fermentation with high VFA (OHO growth, anaerobic)
dXOHO_12 = 1 * r12  # g.m-3.d-1 SB fermentation with low VFA (OHO growth, anaerobic)
dXOHO_13 = 1 * r13  # g.m-3.d-1 OHO growth on SMEOL, O2
dXOHO_14 = - 1 * r14  # g.m-3.d-1 OHO decay
dXOHO_15 = - 1 * r15  # g.m-3.d-1 OHO anaerobic decay
dXOHO_16 = - EEQNO2 * XOHO / XBIO * r79  # g.m-3.d-1 NO2 assimilative reduction
dXOHO_17 = - EEQNO3 * XOHO / XBIO * r80  # g.m-3.d-1 NO3 assimilative reduction
dXOHO = dXOHO_1 + dXOHO_2 + dXOHO_3 + dXOHO_4 + dXOHO_5 + dXOHO_6 + dXOHO_7 + dXOHO_8 + dXOHO_9 + dXOHO_10 + dXOHO_11 + dXOHO_12 + dXOHO_13 + dXOHO_14 + dXOHO_15 + dXOHO_16 + dXOHO_17

# 14. dXCASTO
dXCASTO_1 = 1 * r20  # g.m-3.d-1 CASTO growth on PHA, O2
dXCASTO_2 = 1 * r21  # g.m-3.d-1 CASTO growth on PHA, NO2
dXCASTO_3 = 1 * r22  # g.m-3.d-1 CASTO growth on PHA, NO3
dXCASTO_4 = - YPP_CASTO_ox * r23  # g.m-3.d-1 PAO polyphosphate storage, O2
dXCASTO_5 = - YPP_CASTO_anox * r24  # g.m-3.d-1 PAO polyphosphate storage, NO2
dXCASTO_6 = - YPP_CASTO_anox * r25  # g.m-3.d-1 PAO polyphosphate storage, NO3
dXCASTO_7 = 1 * r26  # g.m-3.d-1 PAO growth on PHA, O2; PO4 limited
dXCASTO_8 = 1 * r27  # g.m-3.d-1 PAO growth on PHA, NO2; PO4 limited
dXCASTO_9 = 1 * r28  # g.m-3.d-1 PAO growth on PHA, NO3; PO4 limited
dXCASTO_10 = - 1 * r38  # g.m-3.d-1 CASTO decay
dXCASTO_11 = - 1 * r39  # g.m-3.d-1 CASTO anaerobic decay
dXCASTO_12 = - EEQNO2 * XCASTO / XBIO * r79  # g.m-3.d-1 NO2 assimilative reduction
dXCASTO_13 = - EEQNO3 * XCASTO / XBIO * r80  # g.m-3.d-1 NO3 assimilative reduction
dXCASTO = dXCASTO_1 + dXCASTO_2 + dXCASTO_3 + dXCASTO_4 + dXCASTO_5 + dXCASTO_6 + dXCASTO_7 + dXCASTO_8 + dXCASTO_9 + dXCASTO_10 + dXCASTO_11 + dXCASTO_12 + dXCASTO_13

# 15. dXMEOLO
dXMEOLO_1 = 1 * r16  # g.m-3.d-1 MEOLO growth, NO2
dXMEOLO_2 = 1 * r17  # g.m-3.d-1 MEOLO growth, NO3
dXMEOLO_3 = - 1 * r18  # g.m-3.d-1 MEOLO decay
dXMEOLO_4 = - 1 * r19  # g.m-3.d-1 MEOLO anaerobic decay
dXMEOLO_5 = - EEQNO2 * XMEOLO / XBIO * r79  # g.m-3.d-1 NO2 assimilative reduction
dXMEOLO_6 = - EEQNO3 * XMEOLO / XBIO * r80  # g.m-3.d-1 NO3 assimilative reduction
dXMEOLO = dXMEOLO_1 + dXMEOLO_2 + dXMEOLO_3 + dXMEOLO_4 + dXMEOLO_5 + dXMEOLO_6

# 16. dXAOB
dXAOB_1 = 1 * r42  # g.m-3.d-1 AOB NH2OH oxidation to NO
dXAOB_2 = - 1 * r46  # g.m-3.d-1 AOB decay
dXAOB_3 = - 1 * r47  # g.m-3.d-1 AOB anaerobic decay
dXAOB_4 = - EEQNO2 * XAOB / XBIO * r79  # g.m-3.d-1 NO2 assimilative reduction
dXAOB_5 = - EEQNO3 * XAOB / XBIO * r80  # g.m-3.d-1 NO3 assimilative reduction
dXAOB = dXAOB_1 + dXAOB_2 + dXAOB_3 + dXAOB_4 + dXAOB_5

# 17. dXNOB
dXNOB_1 = 1 * r48  # g.m-3.d-1 NOB growth
dXNOB_2 = - 1 * r49  # g.m-3.d-1 NOB decay
dXNOB_3 = - 1 * r50  # g.m-3.d-1 NOB anaerobic decay
dXNOB_4 = - EEQNO2 * XNOB / XBIO * r79  # g.m-3.d-1 NO2 assimilative reduction
dXNOB_5 = - EEQNO3 * XNOB / XBIO * r80  # g.m-3.d-1 NO3 assimilative reduction
dXNOB = dXNOB_1 + dXNOB_2 + dXNOB_3 + dXNOB_4 + dXNOB_5

# 18. dXAMX
dXAMX_1 = 1 * r54  # g.m-3.d-1 Anammox growth
dXAMX_2 = - 1 * r55  # g.m-3.d-1 Anammox decay
dXAMX_3 = - 1 * r56  # g.m-3.d-1 Anammox anaerobic decay
dXAMX_4 = - EEQNO2 * XAMX / XBIO * r79  # g.m-3.d-1 NO2 assimilative reduction
dXAMX_5 = - EEQNO3 * XAMX / XBIO * r80  # g.m-3.d-1 NO3 assimilative reduction
dXAMX = dXAMX_1 + dXAMX_2 + dXAMX_3 + dXAMX_4 + dXAMX_5

# 19. dXAMETO
dXAMETO_1 = 1 * r57  # g.m-3.d-1 AMETO growth
dXAMETO_2 = - 1 * r58  # g.m-3.d-1 AMETO decay
dXAMETO_3 = - 1 * r59  # g.m-3.d-1 AMETO anaerobic decay
dXAMETO_4 = - EEQNO2 * XAMETO / XBIO * r79  # g.m-3.d-1 NO2 assimilative reduction
dXAMETO_5 = - EEQNO3 * XAMETO / XBIO * r80  # g.m-3.d-1 NO3 assimilative reduction
dXAMETO = dXAMETO_1 + dXAMETO_2 + dXAMETO_3 + dXAMETO_4 + dXAMETO_5

# 20. dXHMETO
dXHMETO_1 = 1 * r60  # g.m-3.d-1 HMETO growth
dXHMETO_2 = - 1 * r61  # g.m-3.d-1 HMETO decay
dXHMETO_3 = - 1 * r62  # g.m-3.d-1 HMETO anaerobic decay
dXHMETO_4 = - EEQNO2 * XHMETO / XBIO * r79  # g.m-3.d-1 NO2 assimilative reduction
dXHMETO_5 = - EEQNO3 * XHMETO / XBIO * r80  # g.m-3.d-1 NO3 assimilative reduction
dXHMETO = dXHMETO_1 + dXHMETO_2 + dXHMETO_3 + dXHMETO_4 + dXHMETO_5

# 21. dXALGAE
dXALGAE_1 = 1 * r63  # g.m-3.d-1 ALGAE growth on Nitrate
dXALGAE_2 = 1 * r64  # g.m-3.d-1 ALGAE growth on Ammonia
dXALGAE_3 = - 1 * r65  # g.m-3.d-1 ALGAE respiration
dXALGAE_4 = - 1 * r66  # g.m-3.d-1 ALGAE decay
dXALGAE_5 = - EEQNO2 * XALGAE / XBIO * r79  # g.m-3.d-1 NO2 assimilative reduction
dXALGAE_6 = - EEQNO3 * XALGAE / XBIO * r80  # g.m-3.d-1 NO3 assimilative reduction
dXALGAE = dXALGAE_1 + dXALGAE_2 + dXALGAE_3 + dXALGAE_4 + dXALGAE_5 + dXALGAE_6

# 22. dSNHx
dSNHx_1 = - iN_BIO * r1  # g.m-3.d-1 OHO growth on VFAs, O2
dSNHx_2 = - iN_BIO * r2  # g.m-3.d-1 OHO growth on VFAs, NO3
dSNHx_3 = - iN_BIO * r3  # g.m-3.d-1 OHO growth on VFAs, NO2
dSNHx_4 = - iN_BIO * r4  # g.m-3.d-1 OHO growth on VFAs, NO
dSNHx_5 = - iN_BIO * r5  # g.m-3.d-1 OHO growth on VFAs, N2O
dSNHx_6 = - iN_BIO * r6  # g.m-3.d-1 OHO growth on SB, O2
dSNHx_7 = - iN_BIO * r7  # g.m-3.d-1 OHO growth on SB, NO3
dSNHx_8 = - iN_BIO * r8  # g.m-3.d-1 OHO growth on SB, NO2
dSNHx_9 = - iN_BIO * r9  # g.m-3.d-1 OHO growth on SB, NO
dSNHx_10 = - iN_BIO * r10  # g.m-3.d-1 OHO growth on SB, N2O
dSNHx_11 = - iN_BIO * r11  # g.m-3.d-1 SB fermentation with high VFA (OHO growth, anaerobic)
dSNHx_12 = - iN_BIO * r12  # g.m-3.d-1 SB fermentation with low VFA (OHO growth, anaerobic)
dSNHx_13 = - iN_BIO * r13  # g.m-3.d-1 OHO growth on SMEOL, O2
dSNHx_14 = - fE * ( iN_XE - iN_BIO ) * r14  # g.m-3.d-1 OHO decay
dSNHx_15 = - fE * ( iN_XE - iN_BIO ) * r15  # g.m-3.d-1 OHO anaerobic decay
dSNHx_16 = - iN_BIO * r16  # g.m-3.d-1 MEOLO growth, NO2
dSNHx_17 = - iN_BIO * r17  # g.m-3.d-1 MEOLO growth, NO3
dSNHx_18 = - fE * ( iN_XE - iN_BIO ) * r18  # g.m-3.d-1 MEOLO decay
dSNHx_19 = - fE * ( iN_XE - iN_BIO ) * r19  # g.m-3.d-1 MEOLO anaerobic decay
dSNHx_20 = - iN_BIO * r20  # g.m-3.d-1 CASTO growth on PHA, O2
dSNHx_21 = - iN_BIO * r21  # g.m-3.d-1 CASTO growth on PHA, NO2
dSNHx_22 = - iN_BIO * r22  # g.m-3.d-1 CASTO growth on PHA, NO3
dSNHx_23 = iN_BIO * YPP_CASTO_ox * r23  # g.m-3.d-1 PAO polyphosphate storage, O2
dSNHx_24 = iN_BIO * YPP_CASTO_anox * r24  # g.m-3.d-1 PAO polyphosphate storage, NO2
dSNHx_25 = iN_BIO * YPP_CASTO_anox * r25  # g.m-3.d-1 PAO polyphosphate storage, NO3
dSNHx_26 = - iN_BIO * r26  # g.m-3.d-1 PAO growth on PHA, O2; PO4 limited
dSNHx_27 = - iN_BIO * r27  # g.m-3.d-1 PAO growth on PHA, NO2; PO4 limited
dSNHx_28 = - iN_BIO * r28  # g.m-3.d-1 PAO growth on PHA, NO3; PO4 limited
dSNHx_29 = - fE * ( iN_XE - iN_BIO ) * r38  # g.m-3.d-1 CASTO decay
dSNHx_30 = - fE * ( iN_XE - iN_BIO ) * r39  # g.m-3.d-1 CASTO anaerobic decay
dSNHx_31 = - 1 * r41  # g.m-3.d-1 AOB NHx oxidation to NH2OH
dSNHx_32 = - iN_BIO * r42  # g.m-3.d-1 AOB NH2OH oxidation to NO
dSNHx_33 = - fE * ( iN_XE - iN_BIO ) * r46  # g.m-3.d-1 AOB decay
dSNHx_34 = - fE * ( iN_XE - iN_BIO ) * r47  # g.m-3.d-1 AOB anaerobic decay
dSNHx_35 = - iN_BIO * r48  # g.m-3.d-1 NOB growth
dSNHx_36 = - fE * ( iN_XE - iN_BIO ) * r49  # g.m-3.d-1 NOB decay
dSNHx_37 = - fE * ( iN_XE - iN_BIO ) * r50  # g.m-3.d-1 NOB anaerobic decay
dSNHx_38 = 1 * r53  # g.m-3.d-1 Abiotic hydroxylamine disproportionation
dSNHx_39 = - ( 3 * iN_BIO * AMO + 2 * AMN ) / ( 5 * YAMX_NO3 + 3 - 3 * YAMX_NO2 ) / AMO * r54  # g.m-3.d-1 Anammox growth
dSNHx_40 = - fE * ( iN_XE - iN_BIO ) * r55  # g.m-3.d-1 Anammox decay
dSNHx_41 = - fE * ( iN_XE - iN_BIO ) * r56  # g.m-3.d-1 Anammox anaerobic decay
dSNHx_42 = - iN_BIO * r57  # g.m-3.d-1 AMETO growth
dSNHx_43 = - fE * ( iN_XE - iN_BIO ) * r58  # g.m-3.d-1 AMETO decay
dSNHx_44 = - fE * ( iN_XE - iN_BIO ) * r59  # g.m-3.d-1 AMETO anaerobic decay
dSNHx_45 = - iN_BIO * r60  # g.m-3.d-1 HMETO growth
dSNHx_46 = - fE * ( iN_XE - iN_BIO ) * r61  # g.m-3.d-1 HMETO decay
dSNHx_47 = - fE * ( iN_XE - iN_BIO ) * r62  # g.m-3.d-1 HMETO anaerobic decay
dSNHx_48 = - iN_ALGAE * r64  # g.m-3.d-1 ALGAE growth on Ammonia
dSNHx_49 = iN_ALGAE * r65  # g.m-3.d-1 ALGAE respiration
dSNHx_50 = - fE * ( iN_XE - iN_BIO ) * r66  # g.m-3.d-1 ALGAE decay
dSNHx_51 = 1 * r73  # g.m-3.d-1 SN,B ammonification
dSNHx_52 = 1 + ( iN_BIO * EEQNO2 * ( XBIO - XALGAE ) + iN_ALGAE * EEQNO2 * XALGAE ) / XBIO * r79  # g.m-3.d-1 NO2 assimilative reduction
dSNHx_53 = 1 + ( iN_BIO * EEQNO3 * ( XBIO - XALGAE ) + iN_ALGAE * EEQNO3 * XALGAE ) / XBIO * r80  # g.m-3.d-1 NO3 assimilative reduction
dSNHx_54 = - AMN / MMSTR * r100  # g.m-3.d-1 Struvite precipitation
dSNHx_55 = 1 * r109  # g.m-3.d-1 Ammonia absorption - bubbles
dSNHx_56 = 1 * r117  # g.m-3.d-1 Ammonia absorption - surface
dSNHx = dSNHx_1 + dSNHx_2 + dSNHx_3 + dSNHx_4 + dSNHx_5 + dSNHx_6 + dSNHx_7 + dSNHx_8 + dSNHx_9 + dSNHx_10 + dSNHx_11 + dSNHx_12 + dSNHx_13 + dSNHx_14 + dSNHx_15 + dSNHx_16 + dSNHx_17 + dSNHx_18 + dSNHx_19 + dSNHx_20 + dSNHx_21 + dSNHx_22 + dSNHx_23 + dSNHx_24 + dSNHx_25 + dSNHx_26 + dSNHx_27 + dSNHx_28 + dSNHx_29 + dSNHx_30 + dSNHx_31 + dSNHx_32 + dSNHx_33 + dSNHx_34 + dSNHx_35 + dSNHx_36 + dSNHx_37 + dSNHx_38 + dSNHx_39 + dSNHx_40 + dSNHx_41 + dSNHx_42 + dSNHx_43 + dSNHx_44 + dSNHx_45 + dSNHx_46 + dSNHx_47 + dSNHx_48 + dSNHx_49 + dSNHx_50 + dSNHx_51 + dSNHx_52 + dSNHx_53 + dSNHx_54 + dSNHx_55 + dSNHx_56

# 23. dSNH2OH
dSNH2OH_1 = 1 * r41  # g.m-3.d-1 AOB NHx oxidation to NH2OH
dSNH2OH_2 = - 1 / YAOB * r42  # g.m-3.d-1 AOB NH2OH oxidation to NO
dSNH2OH_3 = - 1 * r44  # g.m-3.d-1 AOB NO reduction to N2O (NN pathway)
dSNH2OH_4 = - 1 * r45  # g.m-3.d-1 AOB HNO2 reduction to N2O (ND pathway)
dSNH2OH_5 = - 0.5 * r51  # g.m-3.d-1 Abiotic hydroxylamine oxidation with nitrite
dSNH2OH_6 = - 1 * r52  # g.m-3.d-1 Abiotic hydroxylamine oxidation with oxygen
dSNH2OH_7 = - 2 * r53  # g.m-3.d-1 Abiotic hydroxylamine disproportionation
dSNH2OH = dSNH2OH_1 + dSNH2OH_2 + dSNH2OH_3 + dSNH2OH_4 + dSNH2OH_5 + dSNH2OH_6 + dSNH2OH_7

# 24. dSNO3
dSNO3_1 = - ( 1 - YOHO_VFA_anox ) / ( EEQNO2_NO3 * YOHO_VFA_anox ) * r2  # g.m-3.d-1 OHO growth on VFAs, NO3
dSNO3_2 = - ( 1 - YOHO_SB_anox ) / ( EEQNO2_NO3 * YOHO_SB_anox ) * r7  # g.m-3.d-1 OHO growth on SB, NO3
dSNO3_3 = - ( 1 - YMEOLO ) / ( EEQNO2_NO3 * YMEOLO ) * r17  # g.m-3.d-1 MEOLO growth, NO3
dSNO3_4 = - ( 1 - YCASTO_STC_anox ) / ( EEQNO2_NO3 * YCASTO_STC_anox ) * r22  # g.m-3.d-1 CASTO growth on PHA, NO3
dSNO3_5 = - YPP_CASTO_anox / EEQNO2_NO3 * r25  # g.m-3.d-1 PAO polyphosphate storage, NO3
dSNO3_6 = - ( 1 - YPAO_PHA_anox ) / ( EEQNO2_NO3 * YPAO_PHA_anox ) * r28  # g.m-3.d-1 PAO growth on PHA, NO3; PO4 limited
dSNO3_7 = - 1 / EEQNO2_NO3 * r33  # g.m-3.d-1 CASTO anoxic maintenance, NO3
dSNO3_8 = 1 / YNOB * r48  # g.m-3.d-1 NOB growth
dSNO3_9 = YAMX_NO3 / ( 5 * YAMX_NO3 + 3 - 3 * YAMX_NO2 ) * ( 3 * iN_BIO * AMO + 2 * AMN ) / AMO * r54  # g.m-3.d-1 Anammox growth
dSNO3_10 = - iN_ALGAE * SNO3 / SNOx * r63  # g.m-3.d-1 ALGAE growth on Nitrate
dSNO3_11 = - 1 * r80  # g.m-3.d-1 NO3 assimilative reduction
dSNO3 = dSNO3_1 + dSNO3_2 + dSNO3_3 + dSNO3_4 + dSNO3_5 + dSNO3_6 + dSNO3_7 + dSNO3_8 + dSNO3_9 + dSNO3_10 + dSNO3_11

# 25. dSNO2
dSNO2_1 = ( 1 - YOHO_VFA_anox ) / ( EEQNO2_NO3 * YOHO_VFA_anox ) * r2  # g.m-3.d-1 OHO growth on VFAs, NO3
dSNO2_2 = - ( 1 - YOHO_VFA_anox ) / ( EEQNO_NO2 * YOHO_VFA_anox ) * r3  # g.m-3.d-1 OHO growth on VFAs, NO2
dSNO2_3 = ( 1 - YOHO_SB_anox ) / ( EEQNO2_NO3 * YOHO_SB_anox ) * r7  # g.m-3.d-1 OHO growth on SB, NO3
dSNO2_4 = - ( 1 - YOHO_SB_anox ) / ( EEQNO_NO2 * YOHO_SB_anox ) * r8  # g.m-3.d-1 OHO growth on SB, NO2
dSNO2_5 = - ( 1 - YMEOLO ) / ( EEQN2_NO2 * YMEOLO ) * r16  # g.m-3.d-1 MEOLO growth, NO2
dSNO2_6 = ( 1 - YMEOLO ) / ( EEQNO2_NO3 * YMEOLO ) * r17  # g.m-3.d-1 MEOLO growth, NO3
dSNO2_7 = - ( 1 - YCASTO_STC_anox ) / ( EEQN2_NO2 * YCASTO_STC_anox ) * r21  # g.m-3.d-1 CASTO growth on PHA, NO2
dSNO2_8 = ( 1 - YCASTO_STC_anox ) / ( EEQNO2_NO3 * YCASTO_STC_anox ) * r22  # g.m-3.d-1 CASTO growth on PHA, NO3
dSNO2_9 = - YPP_CASTO_anox / EEQN2_NO2 * r24  # g.m-3.d-1 PAO polyphosphate storage, NO2
dSNO2_10 = YPP_CASTO_anox / EEQNO2_NO3 * r25  # g.m-3.d-1 PAO polyphosphate storage, NO3
dSNO2_11 = - ( 1 - YPAO_PHA_anox ) / ( EEQN2_NO2 * YPAO_PHA_anox ) * r27  # g.m-3.d-1 PAO growth on PHA, NO2; PO4 limited
dSNO2_12 = ( 1 - YPAO_PHA_anox ) / ( EEQNO2_NO3 * YPAO_PHA_anox ) * r28  # g.m-3.d-1 PAO growth on PHA, NO3; PO4 limited
dSNO2_13 = - 1 / EEQN2_NO2 * r32  # g.m-3.d-1 CASTO anoxic maintenance, NO2
dSNO2_14 = 1 / EEQNO2_NO3 * r33  # g.m-3.d-1 CASTO anoxic maintenance, NO3
dSNO2_15 = 1 * r43  # g.m-3.d-1 AOB NO oxidation to NO2
dSNO2_16 = 1 * r44  # g.m-3.d-1 AOB NO reduction to N2O (NN pathway)
dSNO2_17 = - 1 * r45  # g.m-3.d-1 AOB HNO2 reduction to N2O (ND pathway)
dSNO2_18 = - 1 / YNOB * r48  # g.m-3.d-1 NOB growth
dSNO2_19 = - 0.5 * r51  # g.m-3.d-1 Abiotic hydroxylamine oxidation with nitrite
dSNO2_20 = - YAMX_NO2 / ( 5 * YAMX_NO3 + 3 - 3 * YAMX_NO2 ) * ( 3 * iN_BIO * AMO + 2 * AMN ) / AMO * r54  # g.m-3.d-1 Anammox growth
dSNO2_21 = - iN_ALGAE * SNO2 / SNOx * r63  # g.m-3.d-1 ALGAE growth on Nitrate
dSNO2_22 = - 1 * r79  # g.m-3.d-1 NO2 assimilative reduction
dSNO2 = dSNO2_1 + dSNO2_2 + dSNO2_3 + dSNO2_4 + dSNO2_5 + dSNO2_6 + dSNO2_7 + dSNO2_8 + dSNO2_9 + dSNO2_10 + dSNO2_11 + dSNO2_12 + dSNO2_13 + dSNO2_14 + dSNO2_15 + dSNO2_16 + dSNO2_17 + dSNO2_18 + dSNO2_19 + dSNO2_20 + dSNO2_21 + dSNO2_22

# 26. dSNO_AOB
dSNO_AOB_1 = 1 / YAOB * r42  # g.m-3.d-1 AOB NH2OH oxidation to NO
dSNO_AOB_2 = - 1 * r43  # g.m-3.d-1 AOB NO oxidation to NO2
dSNO_AOB_3 = - 4 * r44  # g.m-3.d-1 AOB NO reduction to N2O (NN pathway)
dSNO_AOB_4 = SNO_AOB / SNO * r110  # g.m-3.d-1 Nitric oxide gas transfer - bubbles
dSNO_AOB_5 = SNO_AOB / SNO * r118  # g.m-3.d-1 Nitric oxide gas transfer - surface
dSNO_AOB = dSNO_AOB_1 + dSNO_AOB_2 + dSNO_AOB_3 + dSNO_AOB_4 + dSNO_AOB_5

# 27. dSNO_OHO
dSNO_OHO_1 = ( 1 - YOHO_VFA_anox ) / ( EEQNO_NO2 * YOHO_VFA_anox ) * r3  # g.m-3.d-1 OHO growth on VFAs, NO2
dSNO_OHO_2 = - ( 1 - YOHO_VFA_anox ) / ( EEQN2O_NO * YOHO_VFA_anox ) * r4  # g.m-3.d-1 OHO growth on VFAs, NO
dSNO_OHO_3 = ( 1 - YOHO_SB_anox ) / ( EEQNO_NO2 * YOHO_SB_anox ) * r8  # g.m-3.d-1 OHO growth on SB, NO2
dSNO_OHO_4 = - ( 1 - YOHO_SB_anox ) / ( EEQN2O_NO * YOHO_SB_anox ) * r9  # g.m-3.d-1 OHO growth on SB, NO
dSNO_OHO_5 = SNO_OHO / SNO * r110  # g.m-3.d-1 Nitric oxide gas transfer - bubbles
dSNO_OHO_6 = SNO_OHO / SNO * r118  # g.m-3.d-1 Nitric oxide gas transfer - surface
dSNO_OHO = dSNO_OHO_1 + dSNO_OHO_2 + dSNO_OHO_3 + dSNO_OHO_4 + dSNO_OHO_5 + dSNO_OHO_6

# 28. dSN2O
dSN2O_1 = ( 1 - YOHO_VFA_anox ) / ( EEQN2O_NO * YOHO_VFA_anox ) * r4  # g.m-3.d-1 OHO growth on VFAs, NO
dSN2O_2 = - ( 1 - YOHO_VFA_anox ) / ( EEQN2_N2O * YOHO_VFA_anox ) * r5  # g.m-3.d-1 OHO growth on VFAs, N2O
dSN2O_3 = ( 1 - YOHO_SB_anox ) / ( EEQN2O_NO * YOHO_SB_anox ) * r9  # g.m-3.d-1 OHO growth on SB, NO
dSN2O_4 = - ( 1 - YOHO_SB_anox ) / ( EEQN2_N2O * YOHO_SB_anox ) * r10  # g.m-3.d-1 OHO growth on SB, N2O
dSN2O_5 = 4 * r44  # g.m-3.d-1 AOB NO reduction to N2O (NN pathway)
dSN2O_6 = 2 * r45  # g.m-3.d-1 AOB HNO2 reduction to N2O (ND pathway)
dSN2O_7 = 1 * r51  # g.m-3.d-1 Abiotic hydroxylamine oxidation with nitrite
dSN2O_8 = 1 * r52  # g.m-3.d-1 Abiotic hydroxylamine oxidation with oxygen
dSN2O_9 = 1 * r53  # g.m-3.d-1 Abiotic hydroxylamine disproportionation
dSN2O_10 = 1 * r111  # g.m-3.d-1 Nitrous oxide gas transfer - bubbles
dSN2O_11 = 1 * r119  # g.m-3.d-1 Nitrous oxide gas transfer - surface
dSN2O = dSN2O_1 + dSN2O_2 + dSN2O_3 + dSN2O_4 + dSN2O_5 + dSN2O_6 + dSN2O_7 + dSN2O_8 + dSN2O_9 + dSN2O_10 + dSN2O_11

# 29. dSN2
dSN2_1 = ( 1 - YOHO_VFA_anox ) / ( EEQN2_N2O * YOHO_VFA_anox ) * r5  # g.m-3.d-1 OHO growth on VFAs, N2O
dSN2_2 = ( 1 - YOHO_SB_anox ) / ( EEQN2_N2O * YOHO_SB_anox ) * r10  # g.m-3.d-1 OHO growth on SB, N2O
dSN2_3 = ( 1 - YMEOLO ) / ( EEQN2_NO2 * YMEOLO ) * r16  # g.m-3.d-1 MEOLO growth, NO2
dSN2_4 = ( 1 - YCASTO_STC_anox ) / ( EEQN2_NO2 * YCASTO_STC_anox ) * r21  # g.m-3.d-1 CASTO growth on PHA, NO2
dSN2_5 = YPP_CASTO_anox / EEQN2_NO2 * r24  # g.m-3.d-1 PAO polyphosphate storage, NO2
dSN2_6 = ( 1 - YPAO_PHA_anox ) / ( EEQN2_NO2 * YPAO_PHA_anox ) * r27  # g.m-3.d-1 PAO growth on PHA, NO2; PO4 limited
dSN2_7 = 1 / EEQN2_NO2 * r32  # g.m-3.d-1 CASTO anoxic maintenance, NO2
dSN2_8 = 2 * ( YAMX_NO3 * AMN - 1 * AMN - 1 * YAMX_NO2 * AMN + 4 * YAMX_NO3 * iN_BIO * AMO - 3 * YAMX_NO2 * iN_BIO * AMO ) / AMO / ( 3 * YAMX_NO2 - 5 * YAMX_NO3 - 3 ) * r54  # g.m-3.d-1 Anammox growth
dSN2_9 = 1 * r112  # g.m-3.d-1 Nitrogen gas transfer - bubbles
dSN2_10 = 1 * r120  # g.m-3.d-1 Nitrogen gas transfer - surface
dSN2 = dSN2_1 + dSN2_2 + dSN2_3 + dSN2_4 + dSN2_5 + dSN2_6 + dSN2_7 + dSN2_8 + dSN2_9 + dSN2_10

# 30. dSN_B
dSN_B_1 = XN_B / XB * r71  # g.m-3.d-1 XB hydrolysis
dSN_B_2 = XN_Be / XB_e * r72  # g.m-3.d-1 XB,e hydrolysis
dSN_B_3 = - 1 * r73  # g.m-3.d-1 SN,B ammonification
dSN_B = dSN_B_1 + dSN_B_2 + dSN_B_3

# 31. dXN_B
dXN_B_1 = iN_CB * r67  # g.m-3.d-1 Flocculation of colloidal biodegradable substrate
dXN_B_2 = iN_CB * r69  # g.m-3.d-1 Flocculation of colloidal biodegradable substrate with polymers
dXN_B_3 = - XN_B / XB * r71  # g.m-3.d-1 XB hydrolysis
dXN_B_4 = iN_XE * r75  # g.m-3.d-1 XE conversion
dXN_B_5 = iN_XE * r76  # g.m-3.d-1 XE,ana hydrolysis
dXN_B_6 = XN_U / XU * r77  # g.m-3.d-1 XU conversion
dXN_B = dXN_B_1 + dXN_B_2 + dXN_B_3 + dXN_B_4 + dXN_B_5 + dXN_B_6

# 32. dXN_Be
dXN_Be_1 = ( 1 - fE ) * iN_BIO * r14  # g.m-3.d-1 OHO decay
dXN_Be_2 = ( 1 - fE ) * iN_BIO * r15  # g.m-3.d-1 OHO anaerobic decay
dXN_Be_3 = ( 1 - fE ) * iN_BIO * r18  # g.m-3.d-1 MEOLO decay
dXN_Be_4 = ( 1 - fE ) * iN_BIO * r19  # g.m-3.d-1 MEOLO anaerobic decay
dXN_Be_5 = ( 1 - fE ) * iN_BIO * r38  # g.m-3.d-1 CASTO decay
dXN_Be_6 = ( 1 - fE ) * iN_BIO * r39  # g.m-3.d-1 CASTO anaerobic decay
dXN_Be_7 = ( 1 - fE ) * iN_BIO * r46  # g.m-3.d-1 AOB decay
dXN_Be_8 = ( 1 - fE ) * iN_BIO * r47  # g.m-3.d-1 AOB anaerobic decay
dXN_Be_9 = ( 1 - fE ) * iN_BIO * r49  # g.m-3.d-1 NOB decay
dXN_Be_10 = ( 1 - fE ) * iN_BIO * r50  # g.m-3.d-1 NOB anaerobic decay
dXN_Be_11 = ( 1 - fE ) * iN_BIO * r55  # g.m-3.d-1 Anammox decay
dXN_Be_12 = ( 1 - fE ) * iN_BIO * r56  # g.m-3.d-1 Anammox anaerobic decay
dXN_Be_13 = ( 1 - fE ) * iN_BIO * r58  # g.m-3.d-1 AMETO decay
dXN_Be_14 = ( 1 - fE ) * iN_BIO * r59  # g.m-3.d-1 AMETO anaerobic decay
dXN_Be_15 = ( 1 - fE ) * iN_BIO * r61  # g.m-3.d-1 HMETO decay
dXN_Be_16 = ( 1 - fE ) * iN_BIO * r62  # g.m-3.d-1 HMETO anaerobic decay
dXN_Be_17 = ( 1 - fE ) * iN_BIO * r66  # g.m-3.d-1 ALGAE decay
dXN_Be_18 = - XN_Be / XB_e * r72  # g.m-3.d-1 XB,e hydrolysis
dXN_Be = dXN_Be_1 + dXN_Be_2 + dXN_Be_3 + dXN_Be_4 + dXN_Be_5 + dXN_Be_6 + dXN_Be_7 + dXN_Be_8 + dXN_Be_9 + dXN_Be_10 + dXN_Be_11 + dXN_Be_12 + dXN_Be_13 + dXN_Be_14 + dXN_Be_15 + dXN_Be_16 + dXN_Be_17 + dXN_Be_18

# 33. dXN_U
dXN_U_1 = iN_CU * r68  # g.m-3.d-1 Flocculation of colloidal unbiodegradable organics
dXN_U_2 = iN_CU * r70  # g.m-3.d-1 Flocculation of colloidal unbiodegradable organics with polymers
dXN_U_3 = - XN_U / XU * r77  # g.m-3.d-1 XU conversion
dXN_U = dXN_U_1 + dXN_U_2 + dXN_U_3

# 34. dSPO4
dSPO4_1 = - iP_BIO * r1  # g.m-3.d-1 OHO growth on VFAs, O2
dSPO4_2 = - iP_BIO * r2  # g.m-3.d-1 OHO growth on VFAs, NO3
dSPO4_3 = - iP_BIO * r3  # g.m-3.d-1 OHO growth on VFAs, NO2
dSPO4_4 = - iP_BIO * r4  # g.m-3.d-1 OHO growth on VFAs, NO
dSPO4_5 = - iP_BIO * r5  # g.m-3.d-1 OHO growth on VFAs, N2O
dSPO4_6 = - iP_BIO * r6  # g.m-3.d-1 OHO growth on SB, O2
dSPO4_7 = - iP_BIO * r7  # g.m-3.d-1 OHO growth on SB, NO3
dSPO4_8 = - iP_BIO * r8  # g.m-3.d-1 OHO growth on SB, NO2
dSPO4_9 = - iP_BIO * r9  # g.m-3.d-1 OHO growth on SB, NO
dSPO4_10 = - iP_BIO * r10  # g.m-3.d-1 OHO growth on SB, N2O
dSPO4_11 = - iP_BIO * r11  # g.m-3.d-1 SB fermentation with high VFA (OHO growth, anaerobic)
dSPO4_12 = - iP_BIO * r12  # g.m-3.d-1 SB fermentation with low VFA (OHO growth, anaerobic)
dSPO4_13 = - iP_BIO * r13  # g.m-3.d-1 OHO growth on SMEOL, O2
dSPO4_14 = - iP_BIO * r16  # g.m-3.d-1 MEOLO growth, NO2
dSPO4_15 = - iP_BIO * r17  # g.m-3.d-1 MEOLO growth, NO3
dSPO4_16 = - iP_BIO * r20  # g.m-3.d-1 CASTO growth on PHA, O2
dSPO4_17 = - iP_BIO * r21  # g.m-3.d-1 CASTO growth on PHA, NO2
dSPO4_18 = - iP_BIO * r22  # g.m-3.d-1 CASTO growth on PHA, NO3
dSPO4_19 = iP_BIO * YPP_CASTO_ox - 1 * r23  # g.m-3.d-1 PAO polyphosphate storage, O2
dSPO4_20 = iP_BIO * YPP_CASTO_anox - 1 * r24  # g.m-3.d-1 PAO polyphosphate storage, NO2
dSPO4_21 = iP_BIO * YPP_CASTO_anox - 1 * r25  # g.m-3.d-1 PAO polyphosphate storage, NO3
dSPO4_22 = fP_VFA * r29  # g.m-3.d-1 PAO's PHA storage from VFAs and PO4 release
dSPO4_23 = 1 * r35  # g.m-3.d-1 PP cleavage for maintenance
dSPO4_24 = XPP / XCASTO * r38  # g.m-3.d-1 CASTO decay
dSPO4_25 = XPP / XCASTO * r39  # g.m-3.d-1 CASTO anaerobic decay
dSPO4_26 = - iP_BIO * r42  # g.m-3.d-1 AOB NH2OH oxidation to NO
dSPO4_27 = - iP_BIO * r48  # g.m-3.d-1 NOB growth
dSPO4_28 = - iP_BIO * r54  # g.m-3.d-1 Anammox growth
dSPO4_29 = - iP_BIO * r57  # g.m-3.d-1 AMETO growth
dSPO4_30 = - iP_BIO * r60  # g.m-3.d-1 HMETO growth
dSPO4_31 = - iP_ALGAE * r63  # g.m-3.d-1 ALGAE growth on Nitrate
dSPO4_32 = - iP_ALGAE * r64  # g.m-3.d-1 ALGAE growth on Ammonia
dSPO4_33 = iP_ALGAE * r65  # g.m-3.d-1 ALGAE respiration
dSPO4_34 = iP_ALGAE - iP_BIO * r66  # g.m-3.d-1 ALGAE decay
dSPO4_35 = 1 * r74  # g.m-3.d-1 SP,B conversion to PO4
dSPO4_36 = ( iP_BIO * EEQNO2 * ( XBIO - XALGAE ) + iP_ALGAE * EEQNO2 * XALGAE ) / XBIO * r79  # g.m-3.d-1 NO2 assimilative reduction
dSPO4_37 = ( iP_BIO * EEQNO3 * ( XBIO - XALGAE ) + iP_ALGAE * EEQNO3 * XALGAE ) / XBIO * r80  # g.m-3.d-1 NO3 assimilative reduction
dSPO4_38 = - 1 * r83  # g.m-3.d-1 Fast binding of P on active HFO,H
dSPO4_39 = - 1 * r84  # g.m-3.d-1 Slow binding of P on active HFO,L
dSPO4_40 = ( ASFHFO_H * ( AMP / AMFe ) ) * r85  # g.m-3.d-1 Desorption of P from XHFO,H,P
dSPO4_41 = ( ASFHFO_L * ( AMP / AMFe ) ) * r86  # g.m-3.d-1 Desorption of P from XHFO,L,P
dSPO4_42 = ( ASFHFO_H * ( AMP / AMFe ) ) * XHFO_H_P_old / ( XHFO_H_P_old + XHFO_L_P_old ) + ( ASFHFO_L * ( AMP / AMFe ) ) * XHFO_L_P_old / ( XHFO_H_P_old + XHFO_L_P_old ) * r87  # g.m-3.d-1 Dissolution of P from XHFO,H,P,old and XHFO,L,P,old
dSPO4_43 = XHFO_P / XHFO * r88  # g.m-3.d-1 Reduction of XHFO with organic matter
dSPO4_44 = - 1 * r92  # g.m-3.d-1 Fast binding of P on active HAO,H
dSPO4_45 = - 1 * r93  # g.m-3.d-1 Slow binding of P on active HAO,L
dSPO4_46 = ( ASFHAO_H * ( AMP / AMAl ) ) * r94  # g.m-3.d-1 Desorption of P from XHAO,H,P
dSPO4_47 = ( ASFHAO_L * ( AMP / AMAl ) ) * r95  # g.m-3.d-1 Desorption of P from XHAO,L,P
dSPO4_48 = ( ASFHAO_H * ( AMP / AMAl ) ) * XHAO_H_P_old / ( XHAO_H_P_old + XHAO_L_P_old ) + ( ASFHAO_L * ( AMP / AMAl ) ) * XHAO_L_P_old / ( XHAO_H_P_old + XHAO_L_P_old ) * r96  # g.m-3.d-1 Dissolution of P from XHAO,H,P,old and XHAO,L,P,old
dSPO4_49 = - 2 * AMP / MMACP * r98  # g.m-3.d-1 Amorphous calcium phosphate precipitation
dSPO4_50 = - AMP / MMBSH * r99  # g.m-3.d-1 Brushite precipitation
dSPO4_51 = - AMP / MMSTR * r100  # g.m-3.d-1 Struvite precipitation
dSPO4_52 = - 2 * AMP / MMVivi * r101  # g.m-3.d-1 Vivianite precipitation
dSPO4 = dSPO4_1 + dSPO4_2 + dSPO4_3 + dSPO4_4 + dSPO4_5 + dSPO4_6 + dSPO4_7 + dSPO4_8 + dSPO4_9 + dSPO4_10 + dSPO4_11 + dSPO4_12 + dSPO4_13 + dSPO4_14 + dSPO4_15 + dSPO4_16 + dSPO4_17 + dSPO4_18 + dSPO4_19 + dSPO4_20 + dSPO4_21 + dSPO4_22 + dSPO4_23 + dSPO4_24 + dSPO4_25 + dSPO4_26 + dSPO4_27 + dSPO4_28 + dSPO4_29 + dSPO4_30 + dSPO4_31 + dSPO4_32 + dSPO4_33 + dSPO4_34 + dSPO4_35 + dSPO4_36 + dSPO4_37 + dSPO4_38 + dSPO4_39 + dSPO4_40 + dSPO4_41 + dSPO4_42 + dSPO4_43 + dSPO4_44 + dSPO4_45 + dSPO4_46 + dSPO4_47 + dSPO4_48 + dSPO4_49 + dSPO4_50 + dSPO4_51 + dSPO4_52

# 35. dXPP
dXPP_1 = 1 * r23  # g.m-3.d-1 PAO polyphosphate storage, O2
dXPP_2 = 1 * r24  # g.m-3.d-1 PAO polyphosphate storage, NO2
dXPP_3 = 1 * r25  # g.m-3.d-1 PAO polyphosphate storage, NO3
dXPP_4 = - iP_BIO * r26  # g.m-3.d-1 PAO growth on PHA, O2; PO4 limited
dXPP_5 = - iP_BIO * r27  # g.m-3.d-1 PAO growth on PHA, NO2; PO4 limited
dXPP_6 = - iP_BIO * r28  # g.m-3.d-1 PAO growth on PHA, NO3; PO4 limited
dXPP_7 = - fP_VFA * r29  # g.m-3.d-1 PAO's PHA storage from VFAs and PO4 release
dXPP_8 = - 1 * r35  # g.m-3.d-1 PP cleavage for maintenance
dXPP_9 = - XPP / XCASTO * r38  # g.m-3.d-1 CASTO decay
dXPP_10 = - XPP / XCASTO * r39  # g.m-3.d-1 CASTO anaerobic decay
dXPP = dXPP_1 + dXPP_2 + dXPP_3 + dXPP_4 + dXPP_5 + dXPP_6 + dXPP_7 + dXPP_8 + dXPP_9 + dXPP_10

# 36. dSP_B
dSP_B_1 = XP_B / XB * r71  # g.m-3.d-1 XB hydrolysis
dSP_B_2 = XP_Be / XB_e * r72  # g.m-3.d-1 XB,e hydrolysis
dSP_B_3 = - 1 * r74  # g.m-3.d-1 SP,B conversion to PO4
dSP_B = dSP_B_1 + dSP_B_2 + dSP_B_3

# 37. dXP_B
dXP_B_1 = iP_CB * r67  # g.m-3.d-1 Flocculation of colloidal biodegradable substrate
dXP_B_2 = iP_CB * r69  # g.m-3.d-1 Flocculation of colloidal biodegradable substrate with polymers
dXP_B_3 = - XP_B / XB * r71  # g.m-3.d-1 XB hydrolysis
dXP_B_4 = iP_BIO * r75  # g.m-3.d-1 XE conversion
dXP_B_5 = iP_BIO * r76  # g.m-3.d-1 XE,ana hydrolysis
dXP_B_6 = XP_U / XU * r77  # g.m-3.d-1 XU conversion
dXP_B = dXP_B_1 + dXP_B_2 + dXP_B_3 + dXP_B_4 + dXP_B_5 + dXP_B_6

# 38. dXP_Be
dXP_Be_1 = ( 1 - fE ) * iP_BIO * r14  # g.m-3.d-1 OHO decay
dXP_Be_2 = ( 1 - fE ) * iP_BIO * r15  # g.m-3.d-1 OHO anaerobic decay
dXP_Be_3 = ( 1 - fE ) * iP_BIO * r18  # g.m-3.d-1 MEOLO decay
dXP_Be_4 = ( 1 - fE ) * iP_BIO * r19  # g.m-3.d-1 MEOLO anaerobic decay
dXP_Be_5 = ( 1 - fE ) * iP_BIO * r38  # g.m-3.d-1 CASTO decay
dXP_Be_6 = ( 1 - fE ) * iP_BIO * r39  # g.m-3.d-1 CASTO anaerobic decay
dXP_Be_7 = ( 1 - fE ) * iP_BIO * r46  # g.m-3.d-1 AOB decay
dXP_Be_8 = ( 1 - fE ) * iP_BIO * r47  # g.m-3.d-1 AOB anaerobic decay
dXP_Be_9 = ( 1 - fE ) * iP_BIO * r49  # g.m-3.d-1 NOB decay
dXP_Be_10 = ( 1 - fE ) * iP_BIO * r50  # g.m-3.d-1 NOB anaerobic decay
dXP_Be_11 = ( 1 - fE ) * iP_BIO * r55  # g.m-3.d-1 Anammox decay
dXP_Be_12 = ( 1 - fE ) * iP_BIO * r56  # g.m-3.d-1 Anammox anaerobic decay
dXP_Be_13 = ( 1 - fE ) * iP_BIO * r58  # g.m-3.d-1 AMETO decay
dXP_Be_14 = ( 1 - fE ) * iP_BIO * r59  # g.m-3.d-1 AMETO anaerobic decay
dXP_Be_15 = ( 1 - fE ) * iP_BIO * r61  # g.m-3.d-1 HMETO decay
dXP_Be_16 = ( 1 - fE ) * iP_BIO * r62  # g.m-3.d-1 HMETO anaerobic decay
dXP_Be_17 = ( 1 - fE ) * iP_BIO * r66  # g.m-3.d-1 ALGAE decay
dXP_Be_18 = - XP_Be / XB_e * r72  # g.m-3.d-1 XB,e hydrolysis
dXP_Be = dXP_Be_1 + dXP_Be_2 + dXP_Be_3 + dXP_Be_4 + dXP_Be_5 + dXP_Be_6 + dXP_Be_7 + dXP_Be_8 + dXP_Be_9 + dXP_Be_10 + dXP_Be_11 + dXP_Be_12 + dXP_Be_13 + dXP_Be_14 + dXP_Be_15 + dXP_Be_16 + dXP_Be_17 + dXP_Be_18

# 39. dXP_U
dXP_U_1 = iP_CU * r68  # g.m-3.d-1 Flocculation of colloidal unbiodegradable organics
dXP_U_2 = iP_CU * r70  # g.m-3.d-1 Flocculation of colloidal unbiodegradable organics with polymers
dXP_U_3 = - XP_U / XU * r77  # g.m-3.d-1 XU conversion
dXP_U = dXP_U_1 + dXP_U_2 + dXP_U_3

# 40. dSO2
dSO2_1 = - ( 1 - YOHO_VFA_ox ) / YOHO_VFA_ox * r1  # g.m-3.d-1 OHO growth on VFAs, O2
dSO2_2 = - ( 1 - YOHO_SB_ox ) / YOHO_SB_ox * r6  # g.m-3.d-1 OHO growth on SB, O2
dSO2_3 = - ( 1 - YOHO_SMEOL_ox ) / YOHO_SMEOL_ox * r13  # g.m-3.d-1 OHO growth on SMEOL, O2
dSO2_4 = - ( 1 - YCASTO_STC_ox ) / YCASTO_STC_ox * r20  # g.m-3.d-1 CASTO growth on PHA, O2
dSO2_5 = - YPP_CASTO_ox * r23  # g.m-3.d-1 PAO polyphosphate storage, O2
dSO2_6 = - ( 1 - YPAO_PHA_ox ) / YPAO_PHA_ox * r26  # g.m-3.d-1 PAO growth on PHA, O2; PO4 limited
dSO2_7 = - 1 * r31  # g.m-3.d-1 CASTO aerobic maintenance
dSO2_8 = - EEQNH2OH * r41  # g.m-3.d-1 AOB NHx oxidation to NH2OH
dSO2_9 = - ( EEQNH2OH_NO - YAOB ) / YAOB * r42  # g.m-3.d-1 AOB NH2OH oxidation to NO
dSO2_10 = - EEQNO_NO2 * r43  # g.m-3.d-1 AOB NO oxidation to NO2
dSO2_11 = - ( EEQNO2_NO3 - YNOB ) / YNOB * r48  # g.m-3.d-1 NOB growth
dSO2_12 = EEQNH2OH - EEQN2O * r52  # g.m-3.d-1 Abiotic hydroxylamine oxidation with oxygen
dSO2_13 = 1 + iN_ALGAE * ( EEQNO3 * SNO3 / SNOx + EEQNO2 * SNO2 / SNOx ) * r63  # g.m-3.d-1 ALGAE growth on Nitrate
dSO2_14 = 1 * r64  # g.m-3.d-1 ALGAE growth on Ammonia
dSO2_15 = - 1 * r65  # g.m-3.d-1 ALGAE respiration
dSO2_16 = - EEQFe2 * r89  # g.m-3.d-1 Oxidation of Fe2+ 
dSO2_17 = 1 * r108  # g.m-3.d-1 Oxygen gas transfer - bubbles
dSO2_18 = 1 * r116  # g.m-3.d-1 Oxygen gas transfer - surface
dSO2 = dSO2_1 + dSO2_2 + dSO2_3 + dSO2_4 + dSO2_5 + dSO2_6 + dSO2_7 + dSO2_8 + dSO2_9 + dSO2_10 + dSO2_11 + dSO2_12 + dSO2_13 + dSO2_14 + dSO2_15 + dSO2_16 + dSO2_17 + dSO2_18

# 41. dSCH4
dSCH4_1 = ( 1 - YAMETO ) / YAMETO * r57  # g.m-3.d-1 AMETO growth
dSCH4_2 = ( 1 - YHMETO ) / YHMETO * r60  # g.m-3.d-1 HMETO growth
dSCH4_3 = 1 * r106  # g.m-3.d-1 Methane gas transfer - bubbles
dSCH4_4 = 1 * r114  # g.m-3.d-1 Methane gas transfer - surface
dSCH4 = dSCH4_1 + dSCH4_2 + dSCH4_3 + dSCH4_4

# 42. dSH2
dSH2_1 = YOHO_H2_ana_high / YOHO_SB_ana * r11  # g.m-3.d-1 SB fermentation with high VFA (OHO growth, anaerobic)
dSH2_2 = YOHO_H2_ana_low / YOHO_SB_ana * r12  # g.m-3.d-1 SB fermentation with low VFA (OHO growth, anaerobic)
dSH2_3 = YCASTO_H2_ana_high / YCASTO_SB_ana * r36  # g.m-3.d-1 SB fermentation with high VFA (PAO growth, anaerobic)
dSH2_4 = YCASTO_H2_ana_low / YCASTO_SB_ana * r37  # g.m-3.d-1 SB fermentation with low VFA (PAO growth, anaerobic)
dSH2_5 = - 1 / YHMETO * r60  # g.m-3.d-1 HMETO growth
dSH2_6 = 1 / 3 * r78  # g.m-3.d-1 Anaerobic methanol conversion
dSH2_7 = 1 * r107  # g.m-3.d-1 Hydrogen gas transfer - bubbles
dSH2_8 = 1 * r115  # g.m-3.d-1 Hydrogen gas transfer - surface
dSH2 = dSH2_1 + dSH2_2 + dSH2_3 + dSH2_4 + dSH2_5 + dSH2_6 + dSH2_7 + dSH2_8

# 43. dSCO2
dSCO2_1 = iCIT_VFA / YOHO_VFA_ox - iCIT_BIO * r1  # g.m-3.d-1 OHO growth on VFAs, O2
dSCO2_2 = iCIT_VFA / YOHO_VFA_anox - iCIT_BIO * r2  # g.m-3.d-1 OHO growth on VFAs, NO3
dSCO2_3 = iCIT_VFA / YOHO_VFA_anox - iCIT_BIO * r3  # g.m-3.d-1 OHO growth on VFAs, NO2
dSCO2_4 = iCIT_VFA / YOHO_VFA_anox - iCIT_BIO * r4  # g.m-3.d-1 OHO growth on VFAs, NO
dSCO2_5 = iCIT_VFA / YOHO_VFA_anox - iCIT_BIO * r5  # g.m-3.d-1 OHO growth on VFAs, N2O
dSCO2_6 = iCIT_SB / YOHO_SB_ox - iCIT_BIO * r6  # g.m-3.d-1 OHO growth on SB, O2
dSCO2_7 = iCIT_SB / YOHO_SB_anox - iCIT_BIO * r7  # g.m-3.d-1 OHO growth on SB, NO3
dSCO2_8 = iCIT_SB / YOHO_SB_anox - iCIT_BIO * r8  # g.m-3.d-1 OHO growth on SB, NO2
dSCO2_9 = iCIT_SB / YOHO_SB_anox - iCIT_BIO * r9  # g.m-3.d-1 OHO growth on SB, NO
dSCO2_10 = iCIT_SB / YOHO_SB_anox - iCIT_BIO * r10  # g.m-3.d-1 OHO growth on SB, N2O
dSCO2_11 = ( iCIT_SB - iCIT_VFA * ( 1 - YOHO_SB_ana - YOHO_H2_ana_high ) - iCIT_BIO * YOHO_SB_ana ) / YOHO_SB_ana * r11  # g.m-3.d-1 SB fermentation with high VFA (OHO growth, anaerobic)
dSCO2_12 = ( iCIT_SB - iCIT_VFA * ( 1 - YOHO_SB_ana - YOHO_H2_ana_low ) - iCIT_BIO * YOHO_SB_ana ) / YOHO_SB_ana * r12  # g.m-3.d-1 SB fermentation with low VFA (OHO growth, anaerobic)
dSCO2_13 = iCIT_MEOL / YOHO_SMEOL_ox - iCIT_BIO * r13  # g.m-3.d-1 OHO growth on SMEOL, O2
dSCO2_14 = ( 1 - fE ) * ( iCIT_BIO - iCIT_XBe ) * r14  # g.m-3.d-1 OHO decay
dSCO2_15 = ( 1 - fE ) * ( iCIT_BIO - iCIT_XBe ) * r15  # g.m-3.d-1 OHO anaerobic decay
dSCO2_16 = iCIT_MEOL / YMEOLO - iCIT_BIO * r16  # g.m-3.d-1 MEOLO growth, NO2
dSCO2_17 = iCIT_MEOL / YMEOLO - iCIT_BIO * r17  # g.m-3.d-1 MEOLO growth, NO3
dSCO2_18 = ( 1 - fE ) * ( iCIT_BIO - iCIT_XBe ) * r18  # g.m-3.d-1 MEOLO decay
dSCO2_19 = ( 1 - fE ) * ( iCIT_BIO - iCIT_XBe ) * r19  # g.m-3.d-1 MEOLO anaerobic decay
dSCO2_20 = ( iCIT_STC / YCASTO_STC_ox ) - iCIT_BIO * r20  # g.m-3.d-1 CASTO growth on PHA, O2
dSCO2_21 = ( iCIT_STC / YCASTO_STC_anox ) - iCIT_BIO * r21  # g.m-3.d-1 CASTO growth on PHA, NO2
dSCO2_22 = ( iCIT_STC / YCASTO_STC_anox ) - iCIT_BIO * r22  # g.m-3.d-1 CASTO growth on PHA, NO3
dSCO2_23 = iCIT_BIO * YPP_CASTO_ox * r23  # g.m-3.d-1 PAO polyphosphate storage, O2
dSCO2_24 = iCIT_BIO * YPP_CASTO_anox * r24  # g.m-3.d-1 PAO polyphosphate storage, NO2
dSCO2_25 = iCIT_BIO * YPP_CASTO_anox * r25  # g.m-3.d-1 PAO polyphosphate storage, NO3
dSCO2_26 = ( iCIT_PHA / YPAO_PHA_ox ) - iCIT_BIO * r26  # g.m-3.d-1 PAO growth on PHA, O2; PO4 limited
dSCO2_27 = ( iCIT_PHA / YPAO_PHA_anox ) - iCIT_BIO * r27  # g.m-3.d-1 PAO growth on PHA, NO2; PO4 limited
dSCO2_28 = ( iCIT_PHA / YPAO_PHA_anox ) - iCIT_BIO * r28  # g.m-3.d-1 PAO growth on PHA, NO3; PO4 limited
dSCO2_29 = iCIT_VFA - iCIT_PHA * r29  # g.m-3.d-1 PAO's PHA storage from VFAs and PO4 release
dSCO2_30 = iCIT_VFA - iCIT_PHA * r30  # g.m-3.d-1 GAO's PHA storage from VFAs
dSCO2_31 = iCIT_STC * r31  # g.m-3.d-1 CASTO aerobic maintenance
dSCO2_32 = iCIT_STC * r32  # g.m-3.d-1 CASTO anoxic maintenance, NO2
dSCO2_33 = iCIT_STC * r33  # g.m-3.d-1 CASTO anoxic maintenance, NO3
dSCO2_34 = iCIT_PHA - iCIT_VFA * r34  # g.m-3.d-1 GAO anaerobic maintenance
dSCO2_35 = ( iCIT_SB - iCIT_VFA * ( 1 - YCASTO_SB_ana - YCASTO_H2_ana_high ) - iCIT_PHA * YCASTO_SB_ana ) / YCASTO_SB_ana * r36  # g.m-3.d-1 SB fermentation with high VFA (PAO growth, anaerobic)
dSCO2_36 = ( iCIT_SB - iCIT_VFA * ( 1 - YCASTO_SB_ana - YCASTO_H2_ana_low ) - iCIT_PHA * YCASTO_SB_ana ) / YCASTO_SB_ana * r37  # g.m-3.d-1 SB fermentation with low VFA (PAO growth, anaerobic)
dSCO2_37 = ( 1 - fE ) * ( iCIT_BIO - iCIT_XBe ) + ( iCIT_STC - iCIT_VFA ) * XSTC / XCASTO * r38  # g.m-3.d-1 CASTO decay
dSCO2_38 = ( 1 - fE ) * ( iCIT_BIO - iCIT_XBe ) + ( iCIT_STC - iCIT_VFA ) * XSTC / XCASTO * r39  # g.m-3.d-1 CASTO anaerobic decay
dSCO2_39 = - iCIT_BIO * r42  # g.m-3.d-1 AOB NH2OH oxidation to NO
dSCO2_40 = ( 1 - fE ) * ( iCIT_BIO - iCIT_XBe ) * r46  # g.m-3.d-1 AOB decay
dSCO2_41 = ( 1 - fE ) * ( iCIT_BIO - iCIT_XBe ) * r47  # g.m-3.d-1 AOB anaerobic decay
dSCO2_42 = - iCIT_BIO * r48  # g.m-3.d-1 NOB growth
dSCO2_43 = ( 1 - fE ) * ( iCIT_BIO - iCIT_XBe ) * r49  # g.m-3.d-1 NOB decay
dSCO2_44 = ( 1 - fE ) * ( iCIT_BIO - iCIT_XBe ) * r50  # g.m-3.d-1 NOB anaerobic decay
dSCO2_45 = - iCIT_BIO * r54  # g.m-3.d-1 Anammox growth
dSCO2_46 = ( 1 - fE ) * ( iCIT_BIO - iCIT_XBe ) * r55  # g.m-3.d-1 Anammox decay
dSCO2_47 = ( 1 - fE ) * ( iCIT_BIO - iCIT_XBe ) * r56  # g.m-3.d-1 Anammox anaerobic decay
dSCO2_48 = iCIT_VFA * 1 / YAMETO - iCIT_BIO - iCIT_CH4 * ( 1 - YAMETO ) / YAMETO * r57  # g.m-3.d-1 AMETO growth
dSCO2_49 = ( 1 - fE ) * ( iCIT_BIO - iCIT_XBe ) * r58  # g.m-3.d-1 AMETO decay
dSCO2_50 = ( 1 - fE ) * ( iCIT_BIO - iCIT_XBe ) * r59  # g.m-3.d-1 AMETO anaerobic decay
dSCO2_51 = - iCIT_BIO - iCIT_CH4 * ( 1 - YHMETO ) / YHMETO * r60  # g.m-3.d-1 HMETO growth
dSCO2_52 = ( 1 - fE ) * ( iCIT_BIO - iCIT_XBe ) * r61  # g.m-3.d-1 HMETO decay
dSCO2_53 = ( 1 - fE ) * ( iCIT_BIO - iCIT_XBe ) * r62  # g.m-3.d-1 HMETO anaerobic decay
dSCO2_54 = - iCIT_ALGAE * r63  # g.m-3.d-1 ALGAE growth on Nitrate
dSCO2_55 = - iCIT_ALGAE * r64  # g.m-3.d-1 ALGAE growth on Ammonia
dSCO2_56 = iCIT_ALGAE * r65  # g.m-3.d-1 ALGAE respiration
dSCO2_57 = iCIT_ALGAE - ( 1 - fE ) * iCIT_XBe - fE * iCIT_BIO * r66  # g.m-3.d-1 ALGAE decay
dSCO2_58 = iCIT_XBe - iCIT_SB * r72  # g.m-3.d-1 XB,e hydrolysis
dSCO2_59 = iCIT_BIO - iCIT_SB * r75  # g.m-3.d-1 XE conversion
dSCO2_60 = iCIT_BIO - iCIT_SB * r76  # g.m-3.d-1 XE,ana hydrolysis
dSCO2_61 = iCIT_MEOL - iCIT_VFA * 2 / 3 * r78  # g.m-3.d-1 Anaerobic methanol conversion
dSCO2_62 = ( iCIT_BIO * EEQNO2 * ( XBIO - XALGAE ) + iCIT_ALGAE * EEQNO2 * XALGAE ) / XBIO * r79  # g.m-3.d-1 NO2 assimilative reduction
dSCO2_63 = ( iCIT_BIO * EEQNO3 * ( XBIO - XALGAE ) + iCIT_ALGAE * EEQNO3 * XALGAE ) / XBIO * r80  # g.m-3.d-1 NO3 assimilative reduction
dSCO2_64 = iCIT_SB * EEQFe2 * SB / ( SB + SVFA ) + iCIT_VFA * EEQFe2 * SVFA / ( SB + SVFA ) * r88  # g.m-3.d-1 Reduction of XHFO with organic matter
dSCO2_65 = - AMC / MMCaCO3 * r97  # g.m-3.d-1 Calcium carbonate precipitation
dSCO2_66 = 1 * r105  # g.m-3.d-1 Carbon dioxide gas transfer - bubbles
dSCO2_67 = 1 * r113  # g.m-3.d-1 Carbon dioxide gas transfer - surface
dSCO2 = dSCO2_1 + dSCO2_2 + dSCO2_3 + dSCO2_4 + dSCO2_5 + dSCO2_6 + dSCO2_7 + dSCO2_8 + dSCO2_9 + dSCO2_10 + dSCO2_11 + dSCO2_12 + dSCO2_13 + dSCO2_14 + dSCO2_15 + dSCO2_16 + dSCO2_17 + dSCO2_18 + dSCO2_19 + dSCO2_20 + dSCO2_21 + dSCO2_22 + dSCO2_23 + dSCO2_24 + dSCO2_25 + dSCO2_26 + dSCO2_27 + dSCO2_28 + dSCO2_29 + dSCO2_30 + dSCO2_31 + dSCO2_32 + dSCO2_33 + dSCO2_34 + dSCO2_35 + dSCO2_36 + dSCO2_37 + dSCO2_38 + dSCO2_39 + dSCO2_40 + dSCO2_41 + dSCO2_42 + dSCO2_43 + dSCO2_44 + dSCO2_45 + dSCO2_46 + dSCO2_47 + dSCO2_48 + dSCO2_49 + dSCO2_50 + dSCO2_51 + dSCO2_52 + dSCO2_53 + dSCO2_54 + dSCO2_55 + dSCO2_56 + dSCO2_57 + dSCO2_58 + dSCO2_59 + dSCO2_60 + dSCO2_61 + dSCO2_62 + dSCO2_63 + dSCO2_64 + dSCO2_65 + dSCO2_66 + dSCO2_67

# 44. dXINORG
dXINORG_1 = iINORG * r1  # g.m-3.d-1 OHO growth on VFAs, O2
dXINORG_2 = iINORG * r2  # g.m-3.d-1 OHO growth on VFAs, NO3
dXINORG_3 = iINORG * r3  # g.m-3.d-1 OHO growth on VFAs, NO2
dXINORG_4 = iINORG * r4  # g.m-3.d-1 OHO growth on VFAs, NO
dXINORG_5 = iINORG * r5  # g.m-3.d-1 OHO growth on VFAs, N2O
dXINORG_6 = iINORG * r6  # g.m-3.d-1 OHO growth on SB, O2
dXINORG_7 = iINORG * r7  # g.m-3.d-1 OHO growth on SB, NO3
dXINORG_8 = iINORG * r8  # g.m-3.d-1 OHO growth on SB, NO2
dXINORG_9 = iINORG * r9  # g.m-3.d-1 OHO growth on SB, NO
dXINORG_10 = iINORG * r10  # g.m-3.d-1 OHO growth on SB, N2O
dXINORG_11 = iINORG * r11  # g.m-3.d-1 SB fermentation with high VFA (OHO growth, anaerobic)
dXINORG_12 = iINORG * r12  # g.m-3.d-1 SB fermentation with low VFA (OHO growth, anaerobic)
dXINORG_13 = iINORG * r13  # g.m-3.d-1 OHO growth on SMEOL, O2
dXINORG_14 = iINORG * r16  # g.m-3.d-1 MEOLO growth, NO2
dXINORG_15 = iINORG * r17  # g.m-3.d-1 MEOLO growth, NO3
dXINORG_16 = iINORG * r20  # g.m-3.d-1 CASTO growth on PHA, O2
dXINORG_17 = iINORG * r21  # g.m-3.d-1 CASTO growth on PHA, NO2
dXINORG_18 = iINORG * r22  # g.m-3.d-1 CASTO growth on PHA, NO3
dXINORG_19 = - iINORG * YPP_CASTO_ox * r23  # g.m-3.d-1 PAO polyphosphate storage, O2
dXINORG_20 = - iINORG * YPP_CASTO_anox * r24  # g.m-3.d-1 PAO polyphosphate storage, NO2
dXINORG_21 = - iINORG * YPP_CASTO_anox * r25  # g.m-3.d-1 PAO polyphosphate storage, NO3
dXINORG_22 = iINORG * r26  # g.m-3.d-1 PAO growth on PHA, O2; PO4 limited
dXINORG_23 = iINORG * r27  # g.m-3.d-1 PAO growth on PHA, NO2; PO4 limited
dXINORG_24 = iINORG * r28  # g.m-3.d-1 PAO growth on PHA, NO3; PO4 limited
dXINORG_25 = iINORG * r36  # g.m-3.d-1 SB fermentation with high VFA (PAO growth, anaerobic)
dXINORG_26 = iINORG * r37  # g.m-3.d-1 SB fermentation with low VFA (PAO growth, anaerobic)
dXINORG_27 = iINORG * r42  # g.m-3.d-1 AOB NH2OH oxidation to NO
dXINORG_28 = iINORG * r48  # g.m-3.d-1 NOB growth
dXINORG_29 = iINORG * r54  # g.m-3.d-1 Anammox growth
dXINORG_30 = iINORG * r57  # g.m-3.d-1 AMETO growth
dXINORG_31 = iINORG * r60  # g.m-3.d-1 HMETO growth
dXINORG_32 = iINORG * r63  # g.m-3.d-1 ALGAE growth on Nitrate
dXINORG_33 = iINORG * r64  # g.m-3.d-1 ALGAE growth on Ammonia
dXINORG_34 = - iINORG * r72  # g.m-3.d-1 XB,e hydrolysis
dXINORG = dXINORG_1 + dXINORG_2 + dXINORG_3 + dXINORG_4 + dXINORG_5 + dXINORG_6 + dXINORG_7 + dXINORG_8 + dXINORG_9 + dXINORG_10 + dXINORG_11 + dXINORG_12 + dXINORG_13 + dXINORG_14 + dXINORG_15 + dXINORG_16 + dXINORG_17 + dXINORG_18 + dXINORG_19 + dXINORG_20 + dXINORG_21 + dXINORG_22 + dXINORG_23 + dXINORG_24 + dXINORG_25 + dXINORG_26 + dXINORG_27 + dXINORG_28 + dXINORG_29 + dXINORG_30 + dXINORG_31 + dXINORG_32 + dXINORG_33 + dXINORG_34

# 45. dSCAT
dSCAT_1 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r1  # g.m-3.d-1 OHO growth on VFAs, O2
dSCAT_2 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r2  # g.m-3.d-1 OHO growth on VFAs, NO3
dSCAT_3 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r3  # g.m-3.d-1 OHO growth on VFAs, NO2
dSCAT_4 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r4  # g.m-3.d-1 OHO growth on VFAs, NO
dSCAT_5 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r5  # g.m-3.d-1 OHO growth on VFAs, N2O
dSCAT_6 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r6  # g.m-3.d-1 OHO growth on SB, O2
dSCAT_7 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r7  # g.m-3.d-1 OHO growth on SB, NO3
dSCAT_8 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r8  # g.m-3.d-1 OHO growth on SB, NO2
dSCAT_9 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r9  # g.m-3.d-1 OHO growth on SB, NO
dSCAT_10 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r10  # g.m-3.d-1 OHO growth on SB, N2O
dSCAT_11 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r11  # g.m-3.d-1 SB fermentation with high VFA (OHO growth, anaerobic)
dSCAT_12 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r12  # g.m-3.d-1 SB fermentation with low VFA (OHO growth, anaerobic)
dSCAT_13 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r13  # g.m-3.d-1 OHO growth on SMEOL, O2
dSCAT_14 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r16  # g.m-3.d-1 MEOLO growth, NO2
dSCAT_15 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r17  # g.m-3.d-1 MEOLO growth, NO3
dSCAT_16 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r20  # g.m-3.d-1 CASTO growth on PHA, O2
dSCAT_17 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r21  # g.m-3.d-1 CASTO growth on PHA, NO2
dSCAT_18 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r22  # g.m-3.d-1 CASTO growth on PHA, NO3
dSCAT_19 = YPP_CASTO_ox * iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r23  # g.m-3.d-1 PAO polyphosphate storage, O2
dSCAT_20 = YPP_CASTO_anox * iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r24  # g.m-3.d-1 PAO polyphosphate storage, NO2
dSCAT_21 = YPP_CASTO_anox * iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r25  # g.m-3.d-1 PAO polyphosphate storage, NO3
dSCAT_22 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r26  # g.m-3.d-1 PAO growth on PHA, O2; PO4 limited
dSCAT_23 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r27  # g.m-3.d-1 PAO growth on PHA, NO2; PO4 limited
dSCAT_24 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r28  # g.m-3.d-1 PAO growth on PHA, NO3; PO4 limited
dSCAT_25 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r36  # g.m-3.d-1 SB fermentation with high VFA (PAO growth, anaerobic)
dSCAT_26 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r37  # g.m-3.d-1 SB fermentation with low VFA (PAO growth, anaerobic)
dSCAT_27 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r42  # g.m-3.d-1 AOB NH2OH oxidation to NO
dSCAT_28 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r48  # g.m-3.d-1 NOB growth
dSCAT_29 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r54  # g.m-3.d-1 Anammox growth
dSCAT_30 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r57  # g.m-3.d-1 AMETO growth
dSCAT_31 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r60  # g.m-3.d-1 HMETO growth
dSCAT_32 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r63  # g.m-3.d-1 ALGAE growth on Nitrate
dSCAT_33 = - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r64  # g.m-3.d-1 ALGAE growth on Ammonia
dSCAT_34 = iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * fNa * r72  # g.m-3.d-1 XB,e hydrolysis
dSCAT = dSCAT_1 + dSCAT_2 + dSCAT_3 + dSCAT_4 + dSCAT_5 + dSCAT_6 + dSCAT_7 + dSCAT_8 + dSCAT_9 + dSCAT_10 + dSCAT_11 + dSCAT_12 + dSCAT_13 + dSCAT_14 + dSCAT_15 + dSCAT_16 + dSCAT_17 + dSCAT_18 + dSCAT_19 + dSCAT_20 + dSCAT_21 + dSCAT_22 + dSCAT_23 + dSCAT_24 + dSCAT_25 + dSCAT_26 + dSCAT_27 + dSCAT_28 + dSCAT_29 + dSCAT_30 + dSCAT_31 + dSCAT_32 + dSCAT_33 + dSCAT_34

# 46. dSAN
dSAN_1 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r1  # g.m-3.d-1 OHO growth on VFAs, O2
dSAN_2 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r2  # g.m-3.d-1 OHO growth on VFAs, NO3
dSAN_3 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r3  # g.m-3.d-1 OHO growth on VFAs, NO2
dSAN_4 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r4  # g.m-3.d-1 OHO growth on VFAs, NO
dSAN_5 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r5  # g.m-3.d-1 OHO growth on VFAs, N2O
dSAN_6 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r6  # g.m-3.d-1 OHO growth on SB, O2
dSAN_7 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r7  # g.m-3.d-1 OHO growth on SB, NO3
dSAN_8 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r8  # g.m-3.d-1 OHO growth on SB, NO2
dSAN_9 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r9  # g.m-3.d-1 OHO growth on SB, NO
dSAN_10 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r10  # g.m-3.d-1 OHO growth on SB, N2O
dSAN_11 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r11  # g.m-3.d-1 SB fermentation with high VFA (OHO growth, anaerobic)
dSAN_12 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r12  # g.m-3.d-1 SB fermentation with low VFA (OHO growth, anaerobic)
dSAN_13 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r13  # g.m-3.d-1 OHO growth on SMEOL, O2
dSAN_14 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r16  # g.m-3.d-1 MEOLO growth, NO2
dSAN_15 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r17  # g.m-3.d-1 MEOLO growth, NO3
dSAN_16 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r20  # g.m-3.d-1 CASTO growth on PHA, O2
dSAN_17 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r21  # g.m-3.d-1 CASTO growth on PHA, NO2
dSAN_18 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r22  # g.m-3.d-1 CASTO growth on PHA, NO3
dSAN_19 = YPP_CASTO_ox * ( iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) + iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) ) * r23  # g.m-3.d-1 PAO polyphosphate storage, O2
dSAN_20 = YPP_CASTO_anox * ( iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) + iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) ) * r24  # g.m-3.d-1 PAO polyphosphate storage, NO2
dSAN_21 = YPP_CASTO_anox * ( iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) + iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) ) * r25  # g.m-3.d-1 PAO polyphosphate storage, NO3
dSAN_22 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r26  # g.m-3.d-1 PAO growth on PHA, O2; PO4 limited
dSAN_23 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r27  # g.m-3.d-1 PAO growth on PHA, NO2; PO4 limited
dSAN_24 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r28  # g.m-3.d-1 PAO growth on PHA, NO3; PO4 limited
dSAN_25 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r36  # g.m-3.d-1 SB fermentation with high VFA (PAO growth, anaerobic)
dSAN_26 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r37  # g.m-3.d-1 SB fermentation with low VFA (PAO growth, anaerobic)
dSAN_27 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r42  # g.m-3.d-1 AOB NH2OH oxidation to NO
dSAN_28 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r48  # g.m-3.d-1 NOB growth
dSAN_29 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r54  # g.m-3.d-1 Anammox growth
dSAN_30 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r57  # g.m-3.d-1 AMETO growth
dSAN_31 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r60  # g.m-3.d-1 HMETO growth
dSAN_32 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r63  # g.m-3.d-1 ALGAE growth on Nitrate
dSAN_33 = - iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) - iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r64  # g.m-3.d-1 ALGAE growth on Ammonia
dSAN_34 = iINORG * ( iCa_INORG * ( 2 * AMCl ) / AMCa + iMg_INORG * ( 2 * AMCl ) / AMMg ) + iINORG * ( 1 - iCa_INORG * ( AMCa + 2 * AMCl ) / AMCa - iMg_INORG * ( AMMg + 2 * AMCl ) / AMMg ) * ( 1 - fNa ) * r72  # g.m-3.d-1 XB,e hydrolysis
dSAN = dSAN_1 + dSAN_2 + dSAN_3 + dSAN_4 + dSAN_5 + dSAN_6 + dSAN_7 + dSAN_8 + dSAN_9 + dSAN_10 + dSAN_11 + dSAN_12 + dSAN_13 + dSAN_14 + dSAN_15 + dSAN_16 + dSAN_17 + dSAN_18 + dSAN_19 + dSAN_20 + dSAN_21 + dSAN_22 + dSAN_23 + dSAN_24 + dSAN_25 + dSAN_26 + dSAN_27 + dSAN_28 + dSAN_29 + dSAN_30 + dSAN_31 + dSAN_32 + dSAN_33 + dSAN_34

# 47. dSCa
dSCa_1 = - iINORG * iCa_INORG * r1  # g.m-3.d-1 OHO growth on VFAs, O2
dSCa_2 = - iINORG * iCa_INORG * r2  # g.m-3.d-1 OHO growth on VFAs, NO3
dSCa_3 = - iINORG * iCa_INORG * r3  # g.m-3.d-1 OHO growth on VFAs, NO2
dSCa_4 = - iINORG * iCa_INORG * r4  # g.m-3.d-1 OHO growth on VFAs, NO
dSCa_5 = - iINORG * iCa_INORG * r5  # g.m-3.d-1 OHO growth on VFAs, N2O
dSCa_6 = - iINORG * iCa_INORG * r6  # g.m-3.d-1 OHO growth on SB, O2
dSCa_7 = - iINORG * iCa_INORG * r7  # g.m-3.d-1 OHO growth on SB, NO3
dSCa_8 = - iINORG * iCa_INORG * r8  # g.m-3.d-1 OHO growth on SB, NO2
dSCa_9 = - iINORG * iCa_INORG * r9  # g.m-3.d-1 OHO growth on SB, NO
dSCa_10 = - iINORG * iCa_INORG * r10  # g.m-3.d-1 OHO growth on SB, N2O
dSCa_11 = - iINORG * iCa_INORG * r11  # g.m-3.d-1 SB fermentation with high VFA (OHO growth, anaerobic)
dSCa_12 = - iINORG * iCa_INORG * r12  # g.m-3.d-1 SB fermentation with low VFA (OHO growth, anaerobic)
dSCa_13 = - iINORG * iCa_INORG * r13  # g.m-3.d-1 OHO growth on SMEOL, O2
dSCa_14 = - iINORG * iCa_INORG * r16  # g.m-3.d-1 MEOLO growth, NO2
dSCa_15 = - iINORG * iCa_INORG * r17  # g.m-3.d-1 MEOLO growth, NO3
dSCa_16 = - iINORG * iCa_INORG * r20  # g.m-3.d-1 CASTO growth on PHA, O2
dSCa_17 = - iINORG * iCa_INORG * r21  # g.m-3.d-1 CASTO growth on PHA, NO2
dSCa_18 = - iINORG * iCa_INORG * r22  # g.m-3.d-1 CASTO growth on PHA, NO3
dSCa_19 = YPP_CASTO_ox * iINORG * iCa_INORG - iCa_PP * AMCa / AMP * r23  # g.m-3.d-1 PAO polyphosphate storage, O2
dSCa_20 = YPP_CASTO_anox * iINORG * iCa_INORG - iCa_PP * AMCa / AMP * r24  # g.m-3.d-1 PAO polyphosphate storage, NO2
dSCa_21 = YPP_CASTO_anox * iINORG * iCa_INORG - iCa_PP * AMCa / AMP * r25  # g.m-3.d-1 PAO polyphosphate storage, NO3
dSCa_22 = - iINORG * iCa_INORG + iCa_PP * AMCa / AMP * iP_BIO * r26  # g.m-3.d-1 PAO growth on PHA, O2; PO4 limited
dSCa_23 = - iINORG * iCa_INORG + iCa_PP * AMCa / AMP * iP_BIO * r27  # g.m-3.d-1 PAO growth on PHA, NO2; PO4 limited
dSCa_24 = - iINORG * iCa_INORG + iCa_PP * AMCa / AMP * iP_BIO * r28  # g.m-3.d-1 PAO growth on PHA, NO3; PO4 limited
dSCa_25 = iCa_PP * AMCa / AMP * fP_VFA * r29  # g.m-3.d-1 PAO's PHA storage from VFAs and PO4 release
dSCa_26 = iCa_PP * AMCa / AMP * r35  # g.m-3.d-1 PP cleavage for maintenance
dSCa_27 = - iINORG * iCa_INORG * r36  # g.m-3.d-1 SB fermentation with high VFA (PAO growth, anaerobic)
dSCa_28 = - iINORG * iCa_INORG * r37  # g.m-3.d-1 SB fermentation with low VFA (PAO growth, anaerobic)
dSCa_29 = XPP * AMCa / AMP * iCa_PP / XCASTO * r38  # g.m-3.d-1 CASTO decay
dSCa_30 = XPP * AMCa / AMP * iCa_PP / XCASTO * r39  # g.m-3.d-1 CASTO anaerobic decay
dSCa_31 = - iINORG * iCa_INORG * r42  # g.m-3.d-1 AOB NH2OH oxidation to NO
dSCa_32 = - iINORG * iCa_INORG * r48  # g.m-3.d-1 NOB growth
dSCa_33 = - iINORG * iCa_INORG * r54  # g.m-3.d-1 Anammox growth
dSCa_34 = - iINORG * iCa_INORG * r57  # g.m-3.d-1 AMETO growth
dSCa_35 = - iINORG * iCa_INORG * r60  # g.m-3.d-1 HMETO growth
dSCa_36 = - iINORG * iCa_INORG * r63  # g.m-3.d-1 ALGAE growth on Nitrate
dSCa_37 = - iINORG * iCa_INORG * r64  # g.m-3.d-1 ALGAE growth on Ammonia
dSCa_38 = iINORG * iCa_INORG * r72  # g.m-3.d-1 XB,e hydrolysis
dSCa_39 = - AMCa / MMCaCO3 * r97  # g.m-3.d-1 Calcium carbonate precipitation
dSCa_40 = - 3 * AMCa / MMACP * r98  # g.m-3.d-1 Amorphous calcium phosphate precipitation
dSCa_41 = - AMCa / MMBSH * r99  # g.m-3.d-1 Brushite precipitation
dSCa = dSCa_1 + dSCa_2 + dSCa_3 + dSCa_4 + dSCa_5 + dSCa_6 + dSCa_7 + dSCa_8 + dSCa_9 + dSCa_10 + dSCa_11 + dSCa_12 + dSCa_13 + dSCa_14 + dSCa_15 + dSCa_16 + dSCa_17 + dSCa_18 + dSCa_19 + dSCa_20 + dSCa_21 + dSCa_22 + dSCa_23 + dSCa_24 + dSCa_25 + dSCa_26 + dSCa_27 + dSCa_28 + dSCa_29 + dSCa_30 + dSCa_31 + dSCa_32 + dSCa_33 + dSCa_34 + dSCa_35 + dSCa_36 + dSCa_37 + dSCa_38 + dSCa_39 + dSCa_40 + dSCa_41

# 48. dSMg
dSMg_1 = - iINORG * iMg_INORG * r1  # g.m-3.d-1 OHO growth on VFAs, O2
dSMg_2 = - iINORG * iMg_INORG * r2  # g.m-3.d-1 OHO growth on VFAs, NO3
dSMg_3 = - iINORG * iMg_INORG * r3  # g.m-3.d-1 OHO growth on VFAs, NO2
dSMg_4 = - iINORG * iMg_INORG * r4  # g.m-3.d-1 OHO growth on VFAs, NO
dSMg_5 = - iINORG * iMg_INORG * r5  # g.m-3.d-1 OHO growth on VFAs, N2O
dSMg_6 = - iINORG * iMg_INORG * r6  # g.m-3.d-1 OHO growth on SB, O2
dSMg_7 = - iINORG * iMg_INORG * r7  # g.m-3.d-1 OHO growth on SB, NO3
dSMg_8 = - iINORG * iMg_INORG * r8  # g.m-3.d-1 OHO growth on SB, NO2
dSMg_9 = - iINORG * iMg_INORG * r9  # g.m-3.d-1 OHO growth on SB, NO
dSMg_10 = - iINORG * iMg_INORG * r10  # g.m-3.d-1 OHO growth on SB, N2O
dSMg_11 = - iINORG * iMg_INORG * r11  # g.m-3.d-1 SB fermentation with high VFA (OHO growth, anaerobic)
dSMg_12 = - iINORG * iMg_INORG * r12  # g.m-3.d-1 SB fermentation with low VFA (OHO growth, anaerobic)
dSMg_13 = - iINORG * iMg_INORG * r13  # g.m-3.d-1 OHO growth on SMEOL, O2
dSMg_14 = - iINORG * iMg_INORG * r16  # g.m-3.d-1 MEOLO growth, NO2
dSMg_15 = - iINORG * iMg_INORG * r17  # g.m-3.d-1 MEOLO growth, NO3
dSMg_16 = - iINORG * iMg_INORG * r20  # g.m-3.d-1 CASTO growth on PHA, O2
dSMg_17 = - iINORG * iMg_INORG * r21  # g.m-3.d-1 CASTO growth on PHA, NO2
dSMg_18 = - iINORG * iMg_INORG * r22  # g.m-3.d-1 CASTO growth on PHA, NO3
dSMg_19 = YPP_CASTO_ox * iINORG * iMg_INORG - iMg_PP * AMMg / AMP * r23  # g.m-3.d-1 PAO polyphosphate storage, O2
dSMg_20 = YPP_CASTO_anox * iINORG * iMg_INORG - iMg_PP * AMMg / AMP * r24  # g.m-3.d-1 PAO polyphosphate storage, NO2
dSMg_21 = YPP_CASTO_anox * iINORG * iMg_INORG - iMg_PP * AMMg / AMP * r25  # g.m-3.d-1 PAO polyphosphate storage, NO3
dSMg_22 = - iINORG * iMg_INORG + iMg_PP * AMMg / AMP * iP_BIO * r26  # g.m-3.d-1 PAO growth on PHA, O2; PO4 limited
dSMg_23 = - iINORG * iMg_INORG + iMg_PP * AMMg / AMP * iP_BIO * r27  # g.m-3.d-1 PAO growth on PHA, NO2; PO4 limited
dSMg_24 = - iINORG * iMg_INORG + iMg_PP * AMMg / AMP * iP_BIO * r28  # g.m-3.d-1 PAO growth on PHA, NO3; PO4 limited
dSMg_25 = iMg_PP * AMMg / AMP * fP_VFA * r29  # g.m-3.d-1 PAO's PHA storage from VFAs and PO4 release
dSMg_26 = iMg_PP * AMMg / AMP * r35  # g.m-3.d-1 PP cleavage for maintenance
dSMg_27 = - iINORG * iMg_INORG * r36  # g.m-3.d-1 SB fermentation with high VFA (PAO growth, anaerobic)
dSMg_28 = - iINORG * iMg_INORG * r37  # g.m-3.d-1 SB fermentation with low VFA (PAO growth, anaerobic)
dSMg_29 = XPP * AMMg / AMP * iMg_PP / XCASTO * r38  # g.m-3.d-1 CASTO decay
dSMg_30 = XPP * AMMg / AMP * iMg_PP / XCASTO * r39  # g.m-3.d-1 CASTO anaerobic decay
dSMg_31 = - iINORG * iMg_INORG * r42  # g.m-3.d-1 AOB NH2OH oxidation to NO
dSMg_32 = - iINORG * iMg_INORG * r48  # g.m-3.d-1 NOB growth
dSMg_33 = - iINORG * iMg_INORG * r54  # g.m-3.d-1 Anammox growth
dSMg_34 = - iINORG * iMg_INORG * r57  # g.m-3.d-1 AMETO growth
dSMg_35 = - iINORG * iMg_INORG * r60  # g.m-3.d-1 HMETO growth
dSMg_36 = - iINORG * iMg_INORG * r63  # g.m-3.d-1 ALGAE growth on Nitrate
dSMg_37 = - iINORG * iMg_INORG * r64  # g.m-3.d-1 ALGAE growth on Ammonia
dSMg_38 = iINORG * iMg_INORG * r72  # g.m-3.d-1 XB,e hydrolysis
dSMg_39 = - AMMg / MMSTR * r100  # g.m-3.d-1 Struvite precipitation
dSMg = dSMg_1 + dSMg_2 + dSMg_3 + dSMg_4 + dSMg_5 + dSMg_6 + dSMg_7 + dSMg_8 + dSMg_9 + dSMg_10 + dSMg_11 + dSMg_12 + dSMg_13 + dSMg_14 + dSMg_15 + dSMg_16 + dSMg_17 + dSMg_18 + dSMg_19 + dSMg_20 + dSMg_21 + dSMg_22 + dSMg_23 + dSMg_24 + dSMg_25 + dSMg_26 + dSMg_27 + dSMg_28 + dSMg_29 + dSMg_30 + dSMg_31 + dSMg_32 + dSMg_33 + dSMg_34 + dSMg_35 + dSMg_36 + dSMg_37 + dSMg_38 + dSMg_39

# 49. dSK
dSK_1 = - iK_PP * AMK / AMP * r23  # g.m-3.d-1 PAO polyphosphate storage, O2
dSK_2 = - iK_PP * AMK / AMP * r24  # g.m-3.d-1 PAO polyphosphate storage, NO2
dSK_3 = - iK_PP * AMK / AMP * r25  # g.m-3.d-1 PAO polyphosphate storage, NO3
dSK_4 = iK_PP * AMK / AMP * iP_BIO * r26  # g.m-3.d-1 PAO growth on PHA, O2; PO4 limited
dSK_5 = iK_PP * AMK / AMP * iP_BIO * r27  # g.m-3.d-1 PAO growth on PHA, NO2; PO4 limited
dSK_6 = iK_PP * AMK / AMP * iP_BIO * r28  # g.m-3.d-1 PAO growth on PHA, NO3; PO4 limited
dSK_7 = iK_PP * AMK / AMP * fP_VFA * r29  # g.m-3.d-1 PAO's PHA storage from VFAs and PO4 release
dSK_8 = iK_PP * AMK / AMP * r35  # g.m-3.d-1 PP cleavage for maintenance
dSK_9 = XPP * AMK / AMP * iK_PP / XCASTO * r38  # g.m-3.d-1 CASTO decay
dSK_10 = XPP * AMK / AMP * iK_PP / XCASTO * r39  # g.m-3.d-1 CASTO anaerobic decay
dSK = dSK_1 + dSK_2 + dSK_3 + dSK_4 + dSK_5 + dSK_6 + dSK_7 + dSK_8 + dSK_9 + dSK_10

# 50. dSFe2
dSFe2_1 = 1 * r88  # g.m-3.d-1 Reduction of XHFO with organic matter
dSFe2_2 = - 1 * r89  # g.m-3.d-1 Oxidation of Fe2+ 
dSFe2_3 = - 3 * AMFe / MMVivi * r101  # g.m-3.d-1 Vivianite precipitation
dSFe2 = dSFe2_1 + dSFe2_2 + dSFe2_3

# 51. dXHFO_H
dXHFO_H_1 = - XHFO_H / ( XHFO_H + XHFO_H_P ) * r81  # g.m-3.d-1 Aging of active HFO,H
dXHFO_H_2 = - 1 / ( ASFHFO_H * ( AMP / AMFe ) ) * r83  # g.m-3.d-1 Fast binding of P on active HFO,H
dXHFO_H_3 = 1 * r85  # g.m-3.d-1 Desorption of P from XHFO,H,P
dXHFO_H_4 = - XHFO_H / XHFO * r88  # g.m-3.d-1 Reduction of XHFO with organic matter
dXHFO_H_5 = 1 * r89  # g.m-3.d-1 Oxidation of Fe2+ 
dXHFO_H = dXHFO_H_1 + dXHFO_H_2 + dXHFO_H_3 + dXHFO_H_4 + dXHFO_H_5

# 52. dXHFO_L
dXHFO_L_1 = XHFO_H / ( XHFO_H + XHFO_H_P ) * r81  # g.m-3.d-1 Aging of active HFO,H
dXHFO_L_2 = - XHFO_L / ( XHFO_L + XHFO_L_P ) * r82  # g.m-3.d-1 Aging of active HFO,L
dXHFO_L_3 = - 1 / ( ASFHFO_L * ( AMP / AMFe ) ) * r84  # g.m-3.d-1 Slow binding of P on active HFO,L
dXHFO_L_4 = 1 * r86  # g.m-3.d-1 Desorption of P from XHFO,L,P
dXHFO_L_5 = - XHFO_L / XHFO * r88  # g.m-3.d-1 Reduction of XHFO with organic matter
dXHFO_L = dXHFO_L_1 + dXHFO_L_2 + dXHFO_L_3 + dXHFO_L_4 + dXHFO_L_5

# 53. dXHFO_old
dXHFO_old_1 = XHFO_L / ( XHFO_L + XHFO_L_P ) * r82  # g.m-3.d-1 Aging of active HFO,L
dXHFO_old_2 = 1 * r87  # g.m-3.d-1 Dissolution of P from XHFO,H,P,old and XHFO,L,P,old
dXHFO_old_3 = - XHFO_old / XHFO * r88  # g.m-3.d-1 Reduction of XHFO with organic matter
dXHFO_old = dXHFO_old_1 + dXHFO_old_2 + dXHFO_old_3

# 54. dXHFO_H_P
dXHFO_H_P_1 = - XHFO_H_P / ( XHFO_H + XHFO_H_P ) * r81  # g.m-3.d-1 Aging of active HFO,H
dXHFO_H_P_2 = 1 / ( ASFHFO_H * ( AMP / AMFe ) ) * r83  # g.m-3.d-1 Fast binding of P on active HFO,H
dXHFO_H_P_3 = - 1 * r85  # g.m-3.d-1 Desorption of P from XHFO,H,P
dXHFO_H_P_4 = - XHFO_H_P / XHFO * r88  # g.m-3.d-1 Reduction of XHFO with organic matter
dXHFO_H_P = dXHFO_H_P_1 + dXHFO_H_P_2 + dXHFO_H_P_3 + dXHFO_H_P_4

# 55. dXHFO_L_P
dXHFO_L_P_1 = - XHFO_L_P / ( XHFO_L + XHFO_L_P ) * r82  # g.m-3.d-1 Aging of active HFO,L
dXHFO_L_P_2 = 1 / ( ASFHFO_L * ( AMP / AMFe ) ) * r84  # g.m-3.d-1 Slow binding of P on active HFO,L
dXHFO_L_P_3 = - 1 * r86  # g.m-3.d-1 Desorption of P from XHFO,L,P
dXHFO_L_P_4 = - XHFO_L_P / XHFO * r88  # g.m-3.d-1 Reduction of XHFO with organic matter
dXHFO_L_P = dXHFO_L_P_1 + dXHFO_L_P_2 + dXHFO_L_P_3 + dXHFO_L_P_4

# 56. dXHFO_H_P_old
dXHFO_H_P_old_1 = XHFO_H_P / ( XHFO_H + XHFO_H_P ) * r81  # g.m-3.d-1 Aging of active HFO,H
dXHFO_H_P_old_2 = - XHFO_H_P_old / ( XHFO_H_P_old + XHFO_L_P_old ) * r87  # g.m-3.d-1 Dissolution of P from XHFO,H,P,old and XHFO,L,P,old
dXHFO_H_P_old_3 = - XHFO_H_P_old / XHFO * r88  # g.m-3.d-1 Reduction of XHFO with organic matter
dXHFO_H_P_old = dXHFO_H_P_old_1 + dXHFO_H_P_old_2 + dXHFO_H_P_old_3

# 57. dXHFO_L_P_old
dXHFO_L_P_old_1 = XHFO_L_P / ( XHFO_L + XHFO_L_P ) * r82  # g.m-3.d-1 Aging of active HFO,L
dXHFO_L_P_old_2 = - XHFO_L_P_old / ( XHFO_H_P_old + XHFO_L_P_old ) * r87  # g.m-3.d-1 Dissolution of P from XHFO,H,P,old and XHFO,L,P,old
dXHFO_L_P_old_3 = - XHFO_L_P_old / XHFO * r88  # g.m-3.d-1 Reduction of XHFO with organic matter
dXHFO_L_P_old = dXHFO_L_P_old_1 + dXHFO_L_P_old_2 + dXHFO_L_P_old_3

# 58. dXHAO_H
dXHAO_H_1 = - XHAO_H / ( XHAO_H + XHAO_H_P ) * r90  # g.m-3.d-1 Aging of active HAO,H
dXHAO_H_2 = - 1 / ( ASFHAO_H * ( AMP / AMAl ) ) * r92  # g.m-3.d-1 Fast binding of P on active HAO,H
dXHAO_H_3 = 1 * r94  # g.m-3.d-1 Desorption of P from XHAO,H,P
dXHAO_H = dXHAO_H_1 + dXHAO_H_2 + dXHAO_H_3

# 59. dXHAO_L
dXHAO_L_1 = XHAO_H / ( XHAO_H + XHAO_H_P ) * r90  # g.m-3.d-1 Aging of active HAO,H
dXHAO_L_2 = - XHAO_L / ( XHAO_L + XHAO_L_P ) * r91  # g.m-3.d-1 Aging of active HAO,L
dXHAO_L_3 = - 1 / ( ASFHAO_L * ( AMP / AMAl ) ) * r93  # g.m-3.d-1 Slow binding of P on active HAO,L
dXHAO_L_4 = 1 * r95  # g.m-3.d-1 Desorption of P from XHAO,L,P
dXHAO_L = dXHAO_L_1 + dXHAO_L_2 + dXHAO_L_3 + dXHAO_L_4

# 60. dXHAO_old
dXHAO_old_1 = XHAO_L / ( XHAO_L + XHAO_L_P ) * r91  # g.m-3.d-1 Aging of active HAO,L
dXHAO_old_2 = 1 * r96  # g.m-3.d-1 Dissolution of P from XHAO,H,P,old and XHAO,L,P,old
dXHAO_old = dXHAO_old_1 + dXHAO_old_2

# 61. dXHAO_H_P
dXHAO_H_P_1 = - XHAO_H_P / ( XHAO_H + XHAO_H_P ) * r90  # g.m-3.d-1 Aging of active HAO,H
dXHAO_H_P_2 = 1 / ( ASFHAO_H * ( AMP / AMAl ) ) * r92  # g.m-3.d-1 Fast binding of P on active HAO,H
dXHAO_H_P_3 = - 1 * r94  # g.m-3.d-1 Desorption of P from XHAO,H,P
dXHAO_H_P = dXHAO_H_P_1 + dXHAO_H_P_2 + dXHAO_H_P_3

# 62. dXHAO_L_P
dXHAO_L_P_1 = - XHAO_L_P / ( XHAO_L + XHAO_L_P ) * r91  # g.m-3.d-1 Aging of active HAO,L
dXHAO_L_P_2 = 1 / ( ASFHAO_L * ( AMP / AMAl ) ) * r93  # g.m-3.d-1 Slow binding of P on active HAO,L
dXHAO_L_P_3 = - 1 * r95  # g.m-3.d-1 Desorption of P from XHAO,L,P
dXHAO_L_P = dXHAO_L_P_1 + dXHAO_L_P_2 + dXHAO_L_P_3

# 63. dXHAO_H_P_old
dXHAO_H_P_old_1 = XHAO_H_P / ( XHAO_H + XHAO_H_P ) * r90  # g.m-3.d-1 Aging of active HAO,H
dXHAO_H_P_old_2 = - XHAO_H_P_old / ( XHAO_H_P_old + XHAO_L_P_old ) * r96  # g.m-3.d-1 Dissolution of P from XHAO,H,P,old and XHAO,L,P,old
dXHAO_H_P_old = dXHAO_H_P_old_1 + dXHAO_H_P_old_2

# 64. dXHAO_L_P_old
dXHAO_L_P_old_1 = XHAO_L_P / ( XHAO_L + XHAO_L_P ) * r91  # g.m-3.d-1 Aging of active HAO,L
dXHAO_L_P_old_2 = - XHAO_L_P_old / ( XHAO_H_P_old + XHAO_L_P_old ) * r96  # g.m-3.d-1 Dissolution of P from XHAO,H,P,old and XHAO,L,P,old
dXHAO_L_P_old = dXHAO_L_P_old_1 + dXHAO_L_P_old_2

# 65. dXCaCO3
dXCaCO3_1 = 1.0 * r97  # g.m-3.d-1 Calcium carbonate precipitation
dXCaCO3 = dXCaCO3_1

# 66. dXACP
dXACP_1 = 1.0 * r98  # g.m-3.d-1 Amorphous calcium phosphate precipitation
dXACP = dXACP_1

# 67. dXBSH
dXBSH_1 = 1.0 * r99  # g.m-3.d-1 Brushite precipitation
dXBSH = dXBSH_1

# 68. dXSTR
dXSTR_1 = 1.0 * r100  # g.m-3.d-1 Struvite precipitation
dXSTR = dXSTR_1

# 69. dXVivi
dXVivi_1 = 1.0 * r101  # g.m-3.d-1 Vivianite precipitation
dXVivi = dXVivi_1

# 70. dSPFOA
dSPFOA_1 = - 1.0 * r102  # g.m-3.d-1 PFOA sorption
dSPFOA = dSPFOA_1

# 71. dXPFOA
dXPFOA_1 = 1.0 * r102  # g.m-3.d-1 PFOA sorption
dXPFOA = dXPFOA_1

# 72. dSPFOS
dSPFOS_1 = - 1.0 * r103  # g.m-3.d-1 PFOS sorption
dSPFOS = dSPFOS_1

# 73. dXPFOS
dXPFOS_1 = 1.0 * r103  # g.m-3.d-1 PFOS sorption
dXPFOS = dXPFOS_1

# 74. dSALPHA
dSALPHA_1 = 1.0 * r104  # d-1 Elimination of surfactants
dSALPHA = dSALPHA_1

# 75. dSORPswitch
dSORPswitch_1 = 1.0 * r40  # mV.d-1 ORP lag for CASTO activity switches
dSORPswitch = dSORPswitch_1

# 76. dGCO2
dGCO2_1 = - 1.0 * r105  # g.m-3.d-1 Carbon dioxide gas transfer - bubbles
dGCO2 = dGCO2_1

# 77. dGCH4
dGCH4_1 = - 1.0 * r106  # g.m-3.d-1 Methane gas transfer - bubbles
dGCH4 = dGCH4_1

# 78. dGH2
dGH2_1 = - 1.0 * r107  # g.m-3.d-1 Hydrogen gas transfer - bubbles
dGH2 = dGH2_1

# 79. dGO2
dGO2_1 = - 1.0 * r108  # g.m-3.d-1 Oxygen gas transfer - bubbles
dGO2 = dGO2_1

# 80. dGNH3
dGNH3_1 = - 1.0 * r109  # g.m-3.d-1 Ammonia absorption - bubbles
dGNH3 = dGNH3_1

# 81. dGNO
dGNO_1 = - 1.0 * r110  # g.m-3.d-1 Nitric oxide gas transfer - bubbles
dGNO = dGNO_1

# 82. dGN2O
dGN2O_1 = - 1.0 * r111  # g.m-3.d-1 Nitrous oxide gas transfer - bubbles
dGN2O = dGN2O_1

# 83. dGN2
dGN2_1 = - 1.0 * r112  # g.m-3.d-1 Nitrogen gas transfer - bubbles
dGN2 = dGN2_1

# 84. dGCO2_atm
dGCO2_atm_1 = - Δatm * r113  # g.m-3.d-1 Carbon dioxide gas transfer - surface
dGCO2_atm = dGCO2_atm_1

# 85. dGCH4_atm
dGCH4_atm_1 = - Δatm * r114  # g.m-3.d-1 Methane gas transfer - surface
dGCH4_atm = dGCH4_atm_1

# 86. dGH2_atm
dGH2_atm_1 = - Δatm * r115  # g.m-3.d-1 Hydrogen gas transfer - surface
dGH2_atm = dGH2_atm_1

# 87. dGO2_atm
dGO2_atm_1 = - Δatm * r116  # g.m-3.d-1 Oxygen gas transfer - surface
dGO2_atm = dGO2_atm_1

# 88. dGNH3_atm
dGNH3_atm_1 = - Δatm * r117  # g.m-3.d-1 Ammonia absorption - surface
dGNH3_atm = dGNH3_atm_1

# 89. dGNO_atm
dGNO_atm_1 = - Δatm * r118  # g.m-3.d-1 Nitric oxide gas transfer - surface
dGNO_atm = dGNO_atm_1

# 90. dGN2O_atm
dGN2O_atm_1 = - Δatm * r119  # g.m-3.d-1 Nitrous oxide gas transfer - surface
dGN2O_atm = dGN2O_atm_1

# 91. dGN2_atm
dGN2_atm_1 = - Δatm * r120  # g.m-3.d-1 Nitrogen gas transfer - surface
dGN2_atm = dGN2_atm_1

```
