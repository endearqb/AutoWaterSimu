import copy
from typing import Any, Dict, List


UDM_SEED_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "asm1": {
        "key": "asm1",
        "name": "ASM1 (UDM Seed)",
        "description": "基于 ASM1 的 Petersen 矩阵初始模板",
        "tags": ["asm1", "petersen", "seed"],
        "components": [
            {"name": "X_BH", "label": "X_BH", "unit": "gCOD/m3", "default_value": 1000.0},
            {"name": "X_BA", "label": "X_BA", "unit": "gCOD/m3", "default_value": 200.0},
            {"name": "X_S", "label": "X_S", "unit": "gCOD/m3", "default_value": 1000.0},
            {"name": "X_i", "label": "X_i", "unit": "gCOD/m3", "default_value": 100.0},
            {"name": "X_ND", "label": "X_ND", "unit": "gN/m3", "default_value": 20.0},
            {"name": "S_O", "label": "S_O", "unit": "gO2/m3", "default_value": 2.0},
            {"name": "S_S", "label": "S_S", "unit": "gCOD/m3", "default_value": 200.0},
            {"name": "S_NO", "label": "S_NO", "unit": "gN/m3", "default_value": 10.0},
            {"name": "S_NH", "label": "S_NH", "unit": "gN/m3", "default_value": 25.0},
            {"name": "S_ND", "label": "S_ND", "unit": "gN/m3", "default_value": 6.0},
            {"name": "S_ALK", "label": "S_ALK", "unit": "mol/m3", "default_value": 7.0},
        ],
        "parameters": [
            {"name": "u_H", "default_value": 6.0, "min_value": 0.1, "max_value": 20.0, "scale": "lin"},
            {"name": "K_S", "default_value": 20.0, "min_value": 1.0, "max_value": 200.0, "scale": "lin"},
            {"name": "K_OH", "default_value": 0.2, "min_value": 0.01, "max_value": 5.0, "scale": "lin"},
            {"name": "K_NO", "default_value": 0.5, "min_value": 0.01, "max_value": 10.0, "scale": "lin"},
            {"name": "n_g", "default_value": 0.8, "min_value": 0.01, "max_value": 1.2, "scale": "lin"},
            {"name": "b_H", "default_value": 0.4, "min_value": 0.01, "max_value": 5.0, "scale": "lin"},
            {"name": "u_A", "default_value": 0.8, "min_value": 0.01, "max_value": 5.0, "scale": "lin"},
            {"name": "K_NH", "default_value": 1.0, "min_value": 0.01, "max_value": 20.0, "scale": "lin"},
            {"name": "K_OA", "default_value": 0.4, "min_value": 0.01, "max_value": 5.0, "scale": "lin"},
            {"name": "b_A", "default_value": 0.05, "min_value": 0.001, "max_value": 1.0, "scale": "lin"},
            {"name": "Y_H", "default_value": 0.67, "min_value": 0.1, "max_value": 0.95, "scale": "lin"},
            {"name": "Y_A", "default_value": 0.24, "min_value": 0.05, "max_value": 0.8, "scale": "lin"},
            {"name": "i_XB", "default_value": 0.086, "min_value": 0.01, "max_value": 0.2, "scale": "lin"},
            {"name": "i_XP", "default_value": 0.06, "min_value": 0.01, "max_value": 0.2, "scale": "lin"},
            {"name": "f_P", "default_value": 0.08, "min_value": 0.0, "max_value": 0.5, "scale": "lin"},
            {"name": "n_h", "default_value": 0.4, "min_value": 0.01, "max_value": 1.0, "scale": "lin"},
            {"name": "K_a", "default_value": 0.05, "min_value": 0.001, "max_value": 1.0, "scale": "lin"},
            {"name": "K_h", "default_value": 3.0, "min_value": 0.1, "max_value": 30.0, "scale": "lin"},
            {"name": "K_x", "default_value": 3.0, "min_value": 0.1, "max_value": 30.0, "scale": "lin"},
        ],
        "processes": [
            {
                "name": "heterotrophic_growth_aerobic",
                "rate_expr": "u_H*(S_S/(K_S+S_S))*(S_O/(K_OH+S_O))*X_BH",
                "stoich_expr": {
                    "X_BH": "1",
                    "S_S": "-1/Y_H",
                    "S_O": "1 - 1/Y_H",
                    "S_NH": "-i_XB",
                    "S_ALK": "-i_XB/14",
                },
                "stoich": {
                    "X_BH": 1.0,
                    "S_S": -1.4925373134328357,
                    "S_O": -0.4925373134328357,
                    "S_NH": -0.086,
                    "S_ALK": -0.006142857142857143,
                },
            },
            {
                "name": "heterotrophic_growth_anoxic",
                "rate_expr": "u_H*(S_S/(K_S+S_S))*(K_OH/(K_OH+S_O))*(S_NO/(K_NO+S_NO))*n_g*X_BH",
                "stoich_expr": {
                    "X_BH": "1",
                    "S_S": "-1/Y_H",
                    "S_NO": "(Y_H - 1)/(2.86*Y_H)",
                    "S_NH": "-i_XB",
                    "S_ALK": "(-i_XB - (Y_H - 1)/(2.86*Y_H))/14",
                },
                "stoich": {
                    "X_BH": 1.0,
                    "S_S": -1.4925373134328357,
                    "S_NO": -0.1722158449013673,
                    "S_NH": -0.086,
                    "S_ALK": 0.0061582746358120215,
                },
            },
            {
                "name": "autotrophic_growth",
                "rate_expr": "u_A*(S_NH/(K_NH+S_NH))*(S_O/(K_OA+S_O))*X_BA",
                "stoich_expr": {
                    "X_BA": "1",
                    "S_NH": "-(i_XB + 1/Y_A)",
                    "S_O": "1 - 4.57/Y_A",
                    "S_NO": "1/Y_A",
                    "S_ALK": "(-i_XB - 2/Y_A)/14",
                },
                "stoich": {
                    "X_BA": 1.0,
                    "S_NH": -4.252666666666666,
                    "S_O": -18.041666666666668,
                    "S_NO": 4.166666666666667,
                    "S_ALK": -0.6013809523809523,
                },
            },
            {
                "name": "heterotrophic_decay",
                "rate_expr": "b_H*X_BH",
                "stoich_expr": {
                    "X_BH": "-1",
                    "X_i": "-f_P",
                    "X_ND": "-i_XB",
                },
                "stoich": {
                    "X_BH": -1.0,
                    "X_i": -0.08,
                    "X_ND": -0.086,
                },
            },
            {
                "name": "autotrophic_decay",
                "rate_expr": "b_A*X_BA",
                "stoich_expr": {
                    "X_BA": "-1",
                    "X_i": "-f_P",
                    "X_ND": "-(2*i_XB - f_P*i_XP)",
                },
                "stoich": {
                    "X_BA": -1.0,
                    "X_i": -0.08,
                    "X_ND": -0.16720000000000002,
                },
            },
            {
                "name": "ammonification",
                "rate_expr": "K_a*(S_ND/(K_a+S_ND))*X_BH",
                "stoich_expr": {
                    "S_ND": "-1",
                    "S_NH": "1",
                    "S_ALK": "-1/14",
                },
                "stoich": {
                    "S_ND": -1.0,
                    "S_NH": 1.0,
                    "S_ALK": -0.07142857142857142,
                },
            },
            {
                "name": "hydrolysis",
                "rate_expr": "K_h*(X_S/(K_x+X_S))*X_BH",
                "stoich_expr": {
                    "X_S": "-1",
                    "S_S": "1",
                },
                "stoich": {
                    "X_S": -1.0,
                    "S_S": 1.0,
                },
            },
            {
                "name": "hydrolysis_nitrogen",
                "rate_expr": "K_h*(X_ND/(K_x+X_ND))*X_BH",
                "stoich_expr": {
                    "X_ND": "-1",
                    "S_ND": "1",
                },
                "stoich": {
                    "X_ND": -1.0,
                    "S_ND": 1.0,
                },
            },
        ],
        "meta": {"source": "seed", "base_model": "ASM1"},
    },
    "asm1slim": {
        "key": "asm1slim",
        "name": "ASM1Slim (UDM Seed)",
        "description": "基于 ASM1Slim 的简化 Petersen 矩阵初始模板",
        "tags": ["asm1slim", "petersen", "seed"],
        "components": [
            {"name": "dissolvedOxygen", "label": "DO", "unit": "mg/L", "default_value": 2.0},
            {"name": "cod", "label": "COD", "unit": "mg/L", "default_value": 200.0},
            {"name": "nitrate", "label": "NO3-N", "unit": "mg/L", "default_value": 10.0},
            {"name": "ammonia", "label": "NH4-N", "unit": "mg/L", "default_value": 25.0},
            {"name": "totalAlkalinity", "label": "ALK", "unit": "mg/L", "default_value": 100.0},
        ],
        "parameters": [
            {"name": "empiricalDenitrificationRate", "default_value": 60.0, "min_value": 0.0, "max_value": 500.0, "scale": "lin"},
            {"name": "empiricalNitrificationRate", "default_value": 15.0, "min_value": 0.0, "max_value": 200.0, "scale": "lin"},
            {"name": "empiricalCNRatio", "default_value": 5.0, "min_value": 0.1, "max_value": 30.0, "scale": "lin"},
            {"name": "codDenitrificationInfluence", "default_value": 20.0, "min_value": 0.1, "max_value": 300.0, "scale": "lin"},
            {"name": "nitrateDenitrificationInfluence", "default_value": 1.0, "min_value": 0.01, "max_value": 50.0, "scale": "lin"},
            {"name": "ammoniaNitrificationInfluence", "default_value": 2.0, "min_value": 0.01, "max_value": 50.0, "scale": "lin"},
            {"name": "aerobicCODDegradationRate", "default_value": 0.8, "min_value": 0.01, "max_value": 10.0, "scale": "lin"},
        ],
        "processes": [
            {
                "name": "aerobic_cod_removal",
                "rate_expr": "aerobicCODDegradationRate*cod*(dissolvedOxygen/(1+dissolvedOxygen))",
                "stoich_expr": {
                    "cod": "-1",
                },
                "stoich": {
                    "cod": -1.0,
                },
            },
            {
                "name": "anoxic_denitrification",
                "rate_expr": "empiricalDenitrificationRate*(cod/(codDenitrificationInfluence+cod))*(nitrate/(nitrateDenitrificationInfluence+nitrate))*empiricalCNRatio",
                "stoich_expr": {
                    "cod": "-empiricalCNRatio",
                    "nitrate": "-1",
                    "totalAlkalinity": "1/14",
                },
                "stoich": {
                    "cod": -5.0,
                    "nitrate": -1.0,
                    "totalAlkalinity": 0.07142857142857142,
                },
            },
            {
                "name": "nitrification",
                "rate_expr": "empiricalNitrificationRate*(ammonia/(ammoniaNitrificationInfluence+ammonia))*(dissolvedOxygen/(1+dissolvedOxygen))",
                "stoich_expr": {
                    "ammonia": "-1",
                    "nitrate": "1",
                    "totalAlkalinity": "-1/7",
                },
                "stoich": {
                    "ammonia": -1.0,
                    "nitrate": 1.0,
                    "totalAlkalinity": -0.14285714285714285,
                },
            },
        ],
        "meta": {"source": "seed", "base_model": "ASM1Slim"},
    },
    "asm3": {
        "key": "asm3",
        "name": "ASM3 (UDM Seed)",
        "description": "基于 ASM3 的 Petersen 矩阵初始模板",
        "tags": ["asm3", "petersen", "seed"],
        "components": [
            {"name": "X_H", "label": "X_H", "unit": "mg COD/L", "default_value": 30.0},
            {"name": "X_A", "label": "X_A", "unit": "mg COD/L", "default_value": 5.0},
            {"name": "X_S", "label": "X_S", "unit": "mg COD/L", "default_value": 25.0},
            {"name": "X_I", "label": "X_I", "unit": "mg COD/L", "default_value": 25.0},
            {"name": "X_ND", "label": "X_ND", "unit": "mg N/L", "default_value": 1.0},
            {"name": "X_STO", "label": "X_STO", "unit": "mg COD/L", "default_value": 5.0},
            {"name": "S_O", "label": "S_O", "unit": "mg O2/L", "default_value": 2.0},
            {"name": "S_S", "label": "S_S", "unit": "mg COD/L", "default_value": 20.0},
            {"name": "S_NO", "label": "S_NO", "unit": "mg N/L", "default_value": 5.0},
            {"name": "S_NH", "label": "S_NH", "unit": "mg N/L", "default_value": 20.0},
            {"name": "S_ND", "label": "S_ND", "unit": "mg N/L", "default_value": 1.0},
            {"name": "S_ALK", "label": "S_ALK", "unit": "mmol/L", "default_value": 7.0},
            {"name": "S_I", "label": "S_I", "unit": "mg COD/L", "default_value": 30.0},
        ],
        "parameters": [
            {"name": "k_H", "default_value": 3.0, "min_value": 0.1, "max_value": 30.0, "scale": "lin"},
            {"name": "K_X", "default_value": 0.1, "min_value": 0.01, "max_value": 2.0, "scale": "lin"},
            {"name": "k_STO", "default_value": 5.0, "min_value": 0.1, "max_value": 30.0, "scale": "lin"},
            {"name": "ny_NOX", "default_value": 0.8, "min_value": 0.1, "max_value": 2.0, "scale": "lin"},
            {"name": "K_O2", "default_value": 0.2, "min_value": 0.01, "max_value": 5.0, "scale": "lin"},
            {"name": "K_NOX", "default_value": 0.5, "min_value": 0.01, "max_value": 10.0, "scale": "lin"},
            {"name": "K_S", "default_value": 2.0, "min_value": 0.01, "max_value": 50.0, "scale": "lin"},
            {"name": "K_STO", "default_value": 1.0, "min_value": 0.01, "max_value": 20.0, "scale": "lin"},
            {"name": "mu_H", "default_value": 2.0, "min_value": 0.01, "max_value": 20.0, "scale": "lin"},
            {"name": "K_NH4", "default_value": 0.05, "min_value": 0.001, "max_value": 10.0, "scale": "lin"},
            {"name": "K_ALK", "default_value": 0.1, "min_value": 0.001, "max_value": 10.0, "scale": "lin"},
            {"name": "b_HO2", "default_value": 0.2, "min_value": 0.001, "max_value": 5.0, "scale": "lin"},
            {"name": "b_HNOX", "default_value": 0.1, "min_value": 0.001, "max_value": 5.0, "scale": "lin"},
            {"name": "mu_A", "default_value": 1.0, "min_value": 0.001, "max_value": 10.0, "scale": "lin"},
            {"name": "K_ANH4", "default_value": 1.0, "min_value": 0.01, "max_value": 20.0, "scale": "lin"},
            {"name": "K_AO2", "default_value": 0.4, "min_value": 0.01, "max_value": 5.0, "scale": "lin"},
            {"name": "K_AALK", "default_value": 0.5, "min_value": 0.01, "max_value": 20.0, "scale": "lin"},
            {"name": "b_AO2", "default_value": 0.05, "min_value": 0.001, "max_value": 1.0, "scale": "lin"},
            {"name": "b_ANOX", "default_value": 0.05, "min_value": 0.001, "max_value": 1.0, "scale": "lin"},
            {"name": "Y_HO2", "default_value": 0.63, "min_value": 0.1, "max_value": 1.0, "scale": "lin"},
            {"name": "Y_HNOX", "default_value": 0.54, "min_value": 0.1, "max_value": 1.0, "scale": "lin"},
            {"name": "Y_A", "default_value": 0.24, "min_value": 0.05, "max_value": 0.8, "scale": "lin"},
        ],
        "processes": [
            {
                "name": "hydrolysis",
                "rate_expr": "k_H*(X_S/(K_X+X_S))*X_H",
                "stoich_expr": {"X_S": "-1", "S_S": "1"},
                "stoich": {"X_S": -1.0, "S_S": 1.0},
            },
            {
                "name": "heterotrophic_growth_aerobic",
                "rate_expr": "mu_H*(S_S/(K_S+S_S))*(S_O/(K_O2+S_O))*X_H",
                "stoich_expr": {
                    "X_H": "1",
                    "S_S": "-1",
                    "S_O": "1 - 1/Y_HO2",
                    "S_NH": "-0.08",
                    "S_ALK": "-0.03",
                },
                "stoich": {
                    "X_H": 1.0,
                    "S_S": -1.0,
                    "S_O": -0.5873015873015872,
                    "S_NH": -0.08,
                    "S_ALK": -0.03,
                },
            },
            {
                "name": "heterotrophic_growth_anoxic",
                "rate_expr": "mu_H*(S_S/(K_S+S_S))*(K_O2/(K_O2+S_O))*(S_NO/(K_NOX+S_NO))*ny_NOX*X_H",
                "stoich_expr": {
                    "X_H": "1",
                    "S_S": "-1",
                    "S_NO": "(1 - 1/Y_HNOX)/2.86",
                    "S_NH": "-0.08",
                    "S_ALK": "0.03",
                },
                "stoich": {
                    "X_H": 1.0,
                    "S_S": -1.0,
                    "S_NO": -0.29784946236559144,
                    "S_NH": -0.08,
                    "S_ALK": 0.03,
                },
            },
            {
                "name": "storage",
                "rate_expr": "k_STO*(S_S/(K_STO+S_S))*X_H",
                "stoich_expr": {"X_STO": "1", "S_S": "-1"},
                "stoich": {"X_STO": 1.0, "S_S": -1.0},
            },
            {
                "name": "autotrophic_growth",
                "rate_expr": "mu_A*(S_NH/(K_ANH4+S_NH))*(S_O/(K_AO2+S_O))*(S_ALK/(K_AALK+S_ALK))*X_A",
                "stoich_expr": {
                    "X_A": "1",
                    "S_NH": "-(1/Y_A + 0.08)",
                    "S_O": "1 - 4.57/Y_A",
                    "S_NO": "1/Y_A",
                    "S_ALK": "(-2/Y_A - 0.08)/14",
                },
                "stoich": {
                    "X_A": 1.0,
                    "S_NH": -4.246666666666667,
                    "S_O": -18.041666666666668,
                    "S_NO": 4.166666666666667,
                    "S_ALK": -0.600952380952381,
                },
            },
            {
                "name": "heterotrophic_decay",
                "rate_expr": "b_HO2*X_H + b_HNOX*X_H*(S_NO/(K_NOX+S_NO))",
                "stoich_expr": {"X_H": "-1", "X_I": "0.2", "X_S": "0.8"},
                "stoich": {"X_H": -1.0, "X_I": 0.2, "X_S": 0.8},
            },
            {
                "name": "autotrophic_decay",
                "rate_expr": "b_AO2*X_A + b_ANOX*X_A*(S_NO/(K_NOX+S_NO))",
                "stoich_expr": {"X_A": "-1", "X_I": "1"},
                "stoich": {"X_A": -1.0, "X_I": 1.0},
            },
        ],
        "meta": {"source": "seed", "base_model": "ASM3"},
    },
}


def list_udm_seed_templates() -> List[Dict[str, Any]]:
    summaries = []
    for key, template in UDM_SEED_TEMPLATES.items():
        summaries.append(
            {
                "key": key,
                "name": template.get("name"),
                "description": template.get("description"),
                "tags": template.get("tags", []),
                "components_count": len(template.get("components", [])),
                "processes_count": len(template.get("processes", [])),
                "parameters_count": len(template.get("parameters", [])),
            }
        )
    return summaries


def get_udm_seed_template(template_key: str) -> Dict[str, Any]:
    if template_key not in UDM_SEED_TEMPLATES:
        raise KeyError(f"Unknown UDM template: {template_key}")
    return copy.deepcopy(UDM_SEED_TEMPLATES[template_key])
