/**
 * 自定义参数定义
 */
export interface CustomParameter {
  /** 参数名称 */
  name: string
  /** 参数标签 */
  label: string
  /** 参数描述 */
  description?: string
  /** 默认值 */
  defaultValue: number
}

/**
 * UI参数配置接口
 */
export interface UIParameterConfig {
  /** 最小值 */
  min: number
  /** 最大值 */
  max: number
  /** 步长 */
  step: number
  /** 单位 */
  unit: string
}

/**
 * 增强的自定义参数定义（包含UI配置）
 */
export interface EnhancedCustomParameter extends CustomParameter {
  /** UI配置 */
  ui: UIParameterConfig
}

/**
 * 边参数配置
 */
export interface EdgeParameterConfig {
  /** 比例系数 */
  a: number
  /** 常数项 */
  b: number
}

// 导入统一的计算参数配置

/**
 * 可用变量定义
 */
export interface AvailableVariable {
  /** 变量名称 */
  name: string
  /** 变量标签 */
  label: string
  /** 变量单位 */
  unit?: string
}

/**
 * 模型配置接口
 * 定义每个ASM模型的配置参数
 */
export interface ModelConfig {
  /** 模型名称 */
  modelName: string
  /** 模型显示名称 */
  displayName: string
  /** 模型描述 */
  description?: string
  /** 固定参数列表 */
  fixedParameters: CustomParameter[]
  /** 计算参数列表 */
  calculationParameters: CustomParameter[]
  /** 增强的计算参数列表（包含UI配置） */
  enhancedCalculationParameters: EnhancedCustomParameter[]
  /** 支持的节点类型 */
  nodeTypes: string[]
  /** 可用变量列表 */
  availableVariables: AvailableVariable[]
  /** 模型特定的配置 */
  modelSpecific?: Record<string, any>
}

// ========== ASM1Slim 配置 ==========

/** ASM1Slim 固定参数定义 */
const ASM1_SLIM_FIXED_PARAMETERS: CustomParameter[] = [
  {
    name: "dissolvedOxygen",
    label: "溶解氧",
    description: "溶解氧浓度 (mg/L)",
    defaultValue: 0,
  },
  {
    name: "cod",
    label: "COD",
    description: "化学需氧量 (mg/L)",
    defaultValue: 0,
  },
  {
    name: "nitrate",
    label: "硝态氮",
    description: "硝态氮浓度 (mg/L)",
    defaultValue: 0,
  },
  {
    name: "ammonia",
    label: "氨氮",
    description: "氨氮浓度 (mg/L)",
    defaultValue: 0,
  },
  {
    name: "totalAlkalinity",
    label: "总碱度",
    description: "总碱度 (mg/L)",
    defaultValue: 0,
  },
]

/** ASM1Slim 计算参数定义 */
// ASM1_SLIM_CALCULATION_PARAMETERS 已移除，使用 ASM1_SLIM_ENHANCED_CALCULATION_PARAMETERS 替代

/** ASM1Slim 增强计算参数定义（包含UI配置） */
const ASM1_SLIM_ENHANCED_CALCULATION_PARAMETERS: EnhancedCustomParameter[] = [
  {
    name: "empiricalDenitrificationRate",
    label: "经验反硝化速率",
    description: "经验反硝化速率常数",
    defaultValue: 60,
    ui: {
      min: 0,
      max: 200,
      step: 1,
      unit: "mgL⁻¹h⁻¹",
    },
  },
  {
    name: "empiricalNitrificationRate",
    label: "经验硝化速率",
    description: "经验硝化速率常数",
    defaultValue: 15,
    ui: {
      min: 0,
      max: 100,
      step: 1,
      unit: "mgL⁻¹h⁻¹",
    },
  },
  {
    name: "empiricalCNRatio",
    label: "经验碳氮比",
    description: "经验碳氮比参数",
    defaultValue: 5.0, // 统一使用配置文件的值
    ui: {
      min: 0,
      max: 20,
      step: 0.1,
      unit: "-",
    },
  },
  {
    name: "codDenitrificationInfluence",
    label: "COD浓度对反硝化速率的影响参数",
    description: "COD浓度对反硝化速率的影响系数",
    defaultValue: 20,
    ui: {
      min: 0,
      max: 100,
      step: 1,
      unit: "mgL⁻¹",
    },
  },
  {
    name: "nitrateDenitrificationInfluence",
    label: "硝态氮浓度对反硝化速率的影响参数",
    description: "硝态氮浓度对反硝化速率的影响系数",
    defaultValue: 1.0,
    ui: {
      min: 0,
      max: 10,
      step: 0.1,
      unit: "mgL⁻¹",
    },
  },
  {
    name: "ammoniaNitrificationInfluence",
    label: "氨氮浓度对硝化速率的影响参数",
    description: "氨氮浓度对硝化速率的影响系数",
    defaultValue: 2.0,
    ui: {
      min: 0,
      max: 10,
      step: 0.1,
      unit: "mgL⁻¹",
    },
  },
  {
    name: "aerobicCODDegradationRate",
    label: "好氧COD降解速率参数",
    description: "好氧条件下COD降解速率常数",
    defaultValue: 0.8,
    ui: {
      min: 0,
      max: 5,
      step: 0.1,
      unit: "h⁻¹",
    },
  },
]

/** ASM1Slim 可用变量列表 */
const ASM1_SLIM_AVAILABLE_VARIABLES: AvailableVariable[] = [
  { name: "dissolvedOxygen", label: "溶解氧", unit: "mg/L" },
  { name: "cod", label: "COD", unit: "mg/L" },
  { name: "nitrate", label: "硝态氮", unit: "mg/L" },
  { name: "ammonia", label: "氨氮", unit: "mg/L" },
  { name: "totalAlkalinity", label: "总碱度", unit: "mg/L" },
  { name: "volume", label: "体积", unit: "m³" },
]

/** ASM1Slim 模型配置 */
export const ASM1_SLIM_CONFIG: ModelConfig = {
  modelName: "asm1slim",
  displayName: "ASM1 Slim",
  description: "ASM1 Slim 活性污泥模型 - 简化版本",
  fixedParameters: ASM1_SLIM_FIXED_PARAMETERS,
  calculationParameters: [], // 使用 enhancedCalculationParameters 替代
  enhancedCalculationParameters: ASM1_SLIM_ENHANCED_CALCULATION_PARAMETERS,
  nodeTypes: ["DefaultNode", "InputNode", "OutputNode", "ASMslimNode"],
  availableVariables: ASM1_SLIM_AVAILABLE_VARIABLES,
  modelSpecific: {
    // ASM1Slim 特定配置可以在这里添加
    supportedSolverMethods: ["rk4", "scipy_solver", "euler"],
    defaultEdgeParameterConfigs: {
      // 默认边参数配置
    },
  },
}

// ========== 未来模型配置预留 ==========

/** ASM1 模型配置（预留） */
/** ASM1 固定参数定义 - 11个组分 */
const ASM1_FIXED_PARAMETERS: CustomParameter[] = [
  {
    name: "X_BH",
    label: "异养菌生物量",
    description: "异养菌生物量浓度 (mg COD/L)",
    defaultValue: 0,
  },
  {
    name: "X_BA",
    label: "自养菌生物量",
    description: "自养菌生物量浓度 (mg COD/L)",
    defaultValue: 0,
  },
  {
    name: "X_S",
    label: "缓慢降解基质",
    description: "缓慢降解基质浓度 (mg COD/L)",
    defaultValue: 0,
  },
  {
    name: "X_i",
    label: "惰性颗粒物",
    description: "惰性颗粒物浓度 (mg COD/L)",
    defaultValue: 0,
  },
  {
    name: "X_ND",
    label: "颗粒有机氮",
    description: "颗粒有机氮浓度 (mg N/L)",
    defaultValue: 0,
  },
  {
    name: "S_O",
    label: "溶解氧",
    description: "溶解氧浓度 (mg O2/L)",
    defaultValue: 0,
  },
  {
    name: "S_S",
    label: "易降解基质",
    description: "易降解基质浓度 (mg COD/L)",
    defaultValue: 0,
  },
  {
    name: "S_NO",
    label: "硝态氮",
    description: "硝态氮浓度 (mg N/L)",
    defaultValue: 0,
  },
  {
    name: "S_NH",
    label: "氨氮",
    description: "氨氮浓度 (mg N/L)",
    defaultValue: 0,
  },
  {
    name: "S_ND",
    label: "溶解有机氮",
    description: "溶解有机氮浓度 (mg N/L)",
    defaultValue: 0,
  },
  {
    name: "S_ALK",
    label: "碱度",
    description: "碱度 (mol HCO3-/L)",
    defaultValue: 0,
  },
]

/** ASM1 计算参数定义 - 19个动力学和化学计量参数 */
// ASM1_CALCULATION_PARAMETERS 已移除，使用 ASM1_ENHANCED_CALCULATION_PARAMETERS 替代

/** ASM1 增强计算参数定义（包含UI配置） */
const ASM1_ENHANCED_CALCULATION_PARAMETERS: EnhancedCustomParameter[] = [
  {
    name: "u_H",
    label: "μ_H-异养菌最大比增长速率",
    description: "异养菌最大比增长速率 (1/d)",
    defaultValue: 6.0,
    ui: {
      min: 1.0,
      max: 10.0,
      step: 0.1,
      unit: "1/d",
    },
  },
  {
    name: "K_S",
    label: "K_S-异养菌半饱和系数",
    description: "异养菌对易降解基质的半饱和常数 (g COD/m3)",
    defaultValue: 20.0,
    ui: {
      min: 5.0,
      max: 50.0,
      step: 1.0,
      unit: "g COD/m3",
    },
  },
  {
    name: "K_OH",
    label: "K_OH-异养菌的氧气半饱和系数",
    description: "异养菌对氧的半饱和常数 (g O2/m3)",
    defaultValue: 0.2,
    ui: {
      min: 0.1,
      max: 2.0,
      step: 0.01,
      unit: "g O2/m3",
    },
  },
  {
    name: "K_NO",
    label: "K_NO-异养菌的硝酸盐氮半饱和系数",
    description: "硝态氮半饱和常数 (g NO3-N/m3)",
    defaultValue: 0.5,
    ui: {
      min: 0.1,
      max: 2.0,
      step: 0.01,
      unit: "g NO3-N/m3",
    },
  },
  {
    name: "n_g",
    label: "η_g-缺氧条件下异养菌生长的校正因子η_g",
    description: "缺氧条件下的修正因子 量纲为1",
    defaultValue: 0.8,
    ui: {
      min: 0.1,
      max: 1.0,
      step: 0.01,
      unit: "-",
    },
  },
  {
    name: "b_H",
    label: "b_H-异养菌衰减系数",
    description: "异养菌衰减系数 (1/d)",
    defaultValue: 0.4, // 统一使用配置文件的值
    ui: {
      min: 0.1,
      max: 2.0,
      step: 0.01,
      unit: "1/d",
    },
  },
  {
    name: "u_A",
    label: "μ_A-自养菌最大比增长速率",
    description: "自养菌最大比增长速率 (1/d)",
    defaultValue: 0.8,
    ui: {
      min: 0.1,
      max: 2.0,
      step: 0.01,
      unit: "1/d",
    },
  },
  {
    name: "K_NH",
    label: "K_NH-自养菌的氨半饱和系数",
    description: "自养菌对氨氮的半饱和常数 (g NH3-N/m3)",
    defaultValue: 1.0,
    ui: {
      min: 0.1,
      max: 5.0,
      step: 0.1,
      unit: "g NH3-N/m3",
    },
  },
  {
    name: "K_OA",
    label: "K_OA-自养菌的氧气半饱和系数",
    description: "自养菌对氧的半饱和常数 (g O2/m3)",
    defaultValue: 0.4,
    ui: {
      min: 0.1,
      max: 2.0,
      step: 0.01,
      unit: "mg O2/m3",
    },
  },
  {
    name: "b_A",
    label: "b_A-自养菌衰减系数",
    description: "自养菌衰减系数 (1/d)",
    defaultValue: 0.05,
    ui: {
      min: 0.01,
      max: 0.5,
      step: 0.01,
      unit: "1/d",
    },
  },
  {
    name: "Y_H",
    label: "Y_H-异养菌产率系数",
    description: "每氧化污水中1gCOD形成的细胞COD质量(gCOD(细胞)/g被氧化的COD)",
    defaultValue: 0.67,
    ui: {
      min: 0.1,
      max: 0.9,
      step: 0.01,
      unit: "gCOD(细胞)/g被氧化的COD",
    },
  },
  {
    name: "Y_A",
    label: "Y_A-自养菌产率系数",
    description: "自养菌每氧化1g氨氮形成的细胞COD量 (COD(细胞)/g被氧化的氮)",
    defaultValue: 0.24,
    ui: {
      min: 0.1,
      max: 0.5,
      step: 0.01,
      unit: "COD(细胞)/g被氧化的氮",
    },
  },
  {
    name: "i_XB",
    label: "i_XB-微生物细胞含氮比例",
    description: "单位质量细胞质COD所含氮的质量 (gN/ g COD(细胞))",
    defaultValue: 0.086,
    ui: {
      min: 0.05,
      max: 0.15,
      step: 0.001,
      unit: "gN/ g COD(细胞)",
    },
  },
  {
    name: "i_XP",
    label: "i_XP-微生物产物含氮比例",
    description:
      "微生物衰减后形成的物质中，单位质量 COD 所包含的氮质量 (g(N)/g COD (衰减颗粒态产物))",
    defaultValue: 0.06,
    ui: {
      min: 0.01,
      max: 0.1,
      step: 0.001,
      unit: "g(N)/g COD (衰减颗粒态产物)",
    },
  },
  {
    name: "f_P",
    label: "f_P-微生物惰性颗粒比例",
    description: "衰减后以惰性颗粒产物存在的那部分微生物占总微生物量的比值",
    defaultValue: 0.08,
    ui: {
      min: 0.01,
      max: 0.2,
      step: 0.01,
      unit: "-",
    },
  },
  {
    name: "n_h",
    label: "n_h-缺氧条件下水解校正因子",
    description: "缺氧条件下水解校正因子 量纲为1",
    defaultValue: 0.4,
    ui: {
      min: 0.1,
      max: 1.0,
      step: 0.01,
      unit: "-",
    },
  },
  {
    name: "K_a",
    label: "K_a-最大比氨化速率",
    description: "针对有机氨的最大比氨化速率 m3/(g COD(细胞*d)",
    defaultValue: 0.05,
    ui: {
      min: 0.01,
      max: 0.5,
      step: 0.01,
      unit: "m3/(g COD(细胞*d)",
    },
  },
  {
    name: "K_h",
    label: "K_h-最大比水解速率",
    description: "最大比水解速率	(g COD/(Xs)/(g(细胞)*d)",
    defaultValue: 3.0,
    ui: {
      min: 1.0,
      max: 10.0,
      step: 0.1,
      unit: "g COD/(Xs)/(g(细胞)*d",
    },
  },
  {
    name: "K_x",
    label: "K_x-缓慢生物降解底物水解的半饱和系数",
    description: "缓慢生物降解底物水解的半饱和系数(g COD(Xs)/g(细胞))",
    defaultValue: 3.0,
    ui: {
      min: 1.0,
      max: 10.0,
      step: 0.1,
      unit: "g COD(Xs)/g(细胞)",
    },
  },
]

/** ASM1 可用变量列表 */
const ASM1_AVAILABLE_VARIABLES: AvailableVariable[] = [
  { name: "S_S", label: "易降解基质", unit: "mg COD/L" },
  { name: "S_NH", label: "氨氮", unit: "mg N/L" },
  { name: "S_NO", label: "硝态氮", unit: "mg N/L" },
  { name: "S_O", label: "溶解氧", unit: "mg O2/L" },
  { name: "S_ND", label: "溶解有机氮", unit: "mg N/L" },
  { name: "S_ALK", label: "碱度", unit: "mol HCO3-/L" },
  { name: "X_BH", label: "异养菌生物量", unit: "mg COD/L" },
  { name: "X_BA", label: "自养菌生物量", unit: "mg COD/L" },
  { name: "X_S", label: "缓慢降解基质", unit: "mg COD/L" },
  { name: "X_i", label: "惰性颗粒物", unit: "mg COD/L" },
  { name: "X_ND", label: "颗粒有机氮", unit: "mg N/L" },
  { name: "volume", label: "体积", unit: "m³" },
]

export const ASM1_CONFIG: ModelConfig = {
  modelName: "asm1",
  displayName: "ASM1",
  description: "ASM1 活性污泥模型 - 完整版本",
  fixedParameters: ASM1_FIXED_PARAMETERS,
  calculationParameters: [], // 使用 enhancedCalculationParameters 替代
  enhancedCalculationParameters: ASM1_ENHANCED_CALCULATION_PARAMETERS,
  nodeTypes: ["DefaultNode", "InputNode", "OutputNode", "ASM1Node"],
  availableVariables: ASM1_AVAILABLE_VARIABLES,
  modelSpecific: {
    supportedSolverMethods: ["rk4", "scipy_solver", "euler"],
    defaultEdgeParameterConfigs: {
      // ASM1特定的边参数配置
    },
  },
}

/** ASM2d 模型配置（预留） */
export const ASM2D_CONFIG: ModelConfig = {
  modelName: "asm2d",
  displayName: "ASM2d",
  description: "ASM2d 活性污泥模型 - 包含磷去除",
  fixedParameters: [
    // ASM2d 特定的固定参数
    // TODO: 根据ASM2d模型需求定义
  ],
  calculationParameters: [
    // ASM2d 特定的计算参数
    // TODO: 根据ASM2d模型需求定义
  ],
  enhancedCalculationParameters: [
    // ASM2d 特定的增强计算参数
    // TODO: 根据ASM2d模型需求定义
  ],
  nodeTypes: ["DefaultNode", "InputNode", "OutputNode", "ASM2dNode"],
  availableVariables: [
    // ASM2d 特定的可用变量
    // TODO: 根据ASM2d模型需求定义
  ],
}

/** ASM3 固定参数定义 - 13个组分 */
const ASM3_FIXED_PARAMETERS: CustomParameter[] = [
  {
    name: "X_H",
    label: "异养菌生物量",
    description: "异养菌生物量浓度 (mg COD/L)",
    defaultValue: 30,
  },
  {
    name: "X_A",
    label: "自养菌生物量",
    description: "自养菌生物量浓度 (mg COD/L)",
    defaultValue: 0,
  },
  {
    name: "X_S",
    label: "颗粒可降解基质",
    description: "颗粒可降解有机物浓度 (mg COD/L)",
    defaultValue: 25,
  },
  {
    name: "X_I",
    label: "颗粒惰性物质",
    description: "颗粒惰性有机物浓度 (mg COD/L)",
    defaultValue: 25,
  },
  {
    name: "X_ND",
    label: "颗粒有机氮",
    description: "颗粒有机氮浓度 (mg N/L)",
    defaultValue: 0,
  },
  {
    name: "X_STO",
    label: "储存产物",
    description: "细胞内储存产物浓度 (mg COD/L)",
    defaultValue: 0,
  },
  {
    name: "S_O",
    label: "溶解氧",
    description: "溶解氧浓度 (mg O2/L)",
    defaultValue: 4,
  },
  {
    name: "S_S",
    label: "可溶基质",
    description: "可溶有机物浓度 (mg COD/L)",
    defaultValue: 2,
  },
  {
    name: "S_NO",
    label: "硝酸盐和亚硝酸盐",
    description: "NOx-N浓度 (mg N/L)",
    defaultValue: 0,
  },
  {
    name: "S_NH",
    label: "氨氮",
    description: "NH4-N浓度 (mg N/L)",
    defaultValue: 2,
  },
  {
    name: "S_ND",
    label: "可溶有机氮",
    description: "可溶有机氮浓度 (mg N/L)",
    defaultValue: 1,
  },
  {
    name: "S_ALK",
    label: "碱度",
    description: "碱度浓度 (mmol/L)",
    defaultValue: 7,
  },
  {
    name: "S_I",
    label: "可溶惰性物质",
    description: "可溶惰性有机物浓度 (mg COD/L)",
    defaultValue: 30,
  },
]

/** ASM3 增强计算参数定义（包含UI配置） - 37个参数 */
const ASM3_ENHANCED_CALCULATION_PARAMETERS: EnhancedCustomParameter[] = [
  {
    name: "k_H",
    label: "水解速率常数",
    description: "颗粒基质水解速率常数 (d⁻¹)",
    defaultValue: 3.0,
    ui: {
      min: 0.1,
      max: 10.0,
      step: 0.1,
      unit: "d⁻¹",
    },
  },
  {
    name: "k_STO",
    label: "储存速率常数",
    description: "储存产物形成速率常数 (d⁻¹)",
    defaultValue: 5.0,
    ui: {
      min: 1.0,
      max: 20.0,
      step: 0.1,
      unit: "d⁻¹",
    },
  },
  {
    name: "K_S",
    label: "基质半饱和常数",
    description: "可溶基质半饱和常数 (mg COD/L)",
    defaultValue: 2.0,
    ui: {
      min: 0.1,
      max: 10.0,
      step: 0.1,
      unit: "mg COD/L",
    },
  },
  {
    name: "K_O2H",
    label: "异养菌氧半饱和常数",
    description: "异养菌氧半饱和常数 (mg O2/L)",
    defaultValue: 0.2,
    ui: {
      min: 0.01,
      max: 1.0,
      step: 0.01,
      unit: "mg O2/L",
    },
  },
  {
    name: "K_NO",
    label: "NOx半饱和常数",
    description: "NOx半饱和常数 (mg N/L)",
    defaultValue: 0.5,
    ui: {
      min: 0.1,
      max: 2.0,
      step: 0.1,
      unit: "mg N/L",
    },
  },
  {
    name: "K_NH4H",
    label: "异养菌氨氮半饱和常数",
    description: "异养菌氨氮半饱和常数 (mg N/L)",
    defaultValue: 0.05,
    ui: {
      min: 0.01,
      max: 0.5,
      step: 0.01,
      unit: "mg N/L",
    },
  },
  {
    name: "K_ALKH",
    label: "异养菌碱度半饱和常数",
    description: "异养菌碱度半饱和常数 (mmol/L)",
    defaultValue: 0.1,
    ui: {
      min: 0.01,
      max: 1.0,
      step: 0.01,
      unit: "mmol/L",
    },
  },
  {
    name: "K_X",
    label: "水解半饱和常数",
    description: "水解半饱和常数 (mg COD/mg COD)",
    defaultValue: 0.1,
    ui: {
      min: 0.01,
      max: 1.0,
      step: 0.01,
      unit: "mg COD/mg COD",
    },
  },
  {
    name: "mu_H",
    label: "异养菌最大比增长速率",
    description: "异养菌最大比增长速率 (d⁻¹)",
    defaultValue: 2.0,
    ui: {
      min: 0.5,
      max: 10.0,
      step: 0.1,
      unit: "d⁻¹",
    },
  },
  {
    name: "K_STO_H",
    label: "储存产物半饱和常数",
    description: "储存产物半饱和常数 (mg COD/mg COD)",
    defaultValue: 1.0,
    ui: {
      min: 0.1,
      max: 5.0,
      step: 0.1,
      unit: "mg COD/mg COD",
    },
  },
  {
    name: "b_HO2",
    label: "异养菌好氧衰亡速率",
    description: "异养菌好氧衰亡速率 (d⁻¹)",
    defaultValue: 0.2,
    ui: {
      min: 0.01,
      max: 1.0,
      step: 0.01,
      unit: "d⁻¹",
    },
  },
  {
    name: "b_HNOX",
    label: "异养菌缺氧衰亡速率",
    description: "异养菌缺氧衰亡速率 (d⁻¹)",
    defaultValue: 0.1,
    ui: {
      min: 0.01,
      max: 1.0,
      step: 0.01,
      unit: "d⁻¹",
    },
  },
  {
    name: "b_STOO2",
    label: "储存物好氧氧化速率",
    description: "储存物好氧氧化速率 (d⁻¹)",
    defaultValue: 0.2,
    ui: {
      min: 0.01,
      max: 1.0,
      step: 0.01,
      unit: "d⁻¹",
    },
  },
  {
    name: "b_STONOX",
    label: "储存物缺氧氧化速率",
    description: "储存物缺氧氧化速率 (d⁻¹)",
    defaultValue: 0.1,
    ui: {
      min: 0.01,
      max: 1.0,
      step: 0.01,
      unit: "d⁻¹",
    },
  },
  {
    name: "mu_A",
    label: "自养菌最大比增长速率",
    description: "自养菌最大比增长速率 (d⁻¹)",
    defaultValue: 1.0,
    ui: {
      min: 0.1,
      max: 5.0,
      step: 0.1,
      unit: "d⁻¹",
    },
  },
  {
    name: "K_NH4A",
    label: "自养菌氨氮半饱和常数",
    description: "自养菌氨氮半饱和常数 (mg N/L)",
    defaultValue: 1.0,
    ui: {
      min: 0.1,
      max: 5.0,
      step: 0.1,
      unit: "mg N/L",
    },
  },
  {
    name: "K_O2A",
    label: "自养菌氧半饱和常数",
    description: "自养菌氧半饱和常数 (mg O2/L)",
    defaultValue: 0.4,
    ui: {
      min: 0.1,
      max: 2.0,
      step: 0.1,
      unit: "mg O2/L",
    },
  },
  {
    name: "K_ALKA",
    label: "自养菌碱度半饱和常数",
    description: "自养菌碱度半饱和常数 (mmol/L)",
    defaultValue: 0.5,
    ui: {
      min: 0.1,
      max: 2.0,
      step: 0.1,
      unit: "mmol/L",
    },
  },
  {
    name: "b_AO2",
    label: "自养菌好氧衰亡速率",
    description: "自养菌好氧衰亡速率 (d⁻¹)",
    defaultValue: 0.05,
    ui: {
      min: 0.01,
      max: 0.5,
      step: 0.01,
      unit: "d⁻¹",
    },
  },
  {
    name: "b_ANOX",
    label: "自养菌缺氧衰亡速率",
    description: "自养菌缺氧衰亡速率 (d⁻¹)",
    defaultValue: 0.05,
    ui: {
      min: 0.01,
      max: 0.5,
      step: 0.01,
      unit: "d⁻¹",
    },
  },
  {
    name: "K_AO2",
    label: "自养菌氧抑制常数",
    description: "自养菌氧抑制常数 (mg O2/L)",
    defaultValue: 0.4,
    ui: {
      min: 0.1,
      max: 2.0,
      step: 0.1,
      unit: "mg O2/L",
    },
  },
  {
    name: "Y_STOO2",
    label: "好氧储存产率",
    description: "好氧储存产率系数 (mg COD/mg COD)",
    defaultValue: 0.85,
    ui: {
      min: 0.5,
      max: 1.0,
      step: 0.01,
      unit: "mg COD/mg COD",
    },
  },
  {
    name: "Y_STONOX",
    label: "缺氧储存产率",
    description: "缺氧储存产率系数 (mg COD/mg COD)",
    defaultValue: 0.8,
    ui: {
      min: 0.5,
      max: 1.0,
      step: 0.01,
      unit: "mg COD/mg COD",
    },
  },
  {
    name: "Y_HO2",
    label: "异养菌好氧产率",
    description: "异养菌好氧产率系数 (mg COD/mg COD)",
    defaultValue: 0.63,
    ui: {
      min: 0.4,
      max: 0.8,
      step: 0.01,
      unit: "mg COD/mg COD",
    },
  },
  {
    name: "Y_HNOX",
    label: "异养菌缺氧产率",
    description: "异养菌缺氧产率系数 (mg COD/mg COD)",
    defaultValue: 0.54,
    ui: {
      min: 0.4,
      max: 0.8,
      step: 0.01,
      unit: "mg COD/mg COD",
    },
  },
  {
    name: "Y_A",
    label: "自养菌产率",
    description: "自养菌产率系数 (mg COD/mg N)",
    defaultValue: 0.24,
    ui: {
      min: 0.1,
      max: 0.5,
      step: 0.01,
      unit: "mg COD/mg N",
    },
  },
  {
    name: "f_SI",
    label: "惰性可溶物分数",
    description: "水解产生的惰性可溶物分数 (mg COD/mg COD)",
    defaultValue: 0.0,
    ui: {
      min: 0.0,
      max: 0.3,
      step: 0.01,
      unit: "mg COD/mg COD",
    },
  },
  {
    name: "f_XI",
    label: "惰性颗粒物分数",
    description: "衰亡产生的惰性颗粒物分数 (mg COD/mg COD)",
    defaultValue: 0.1,
    ui: {
      min: 0.05,
      max: 0.3,
      step: 0.01,
      unit: "mg COD/mg COD",
    },
  },
  {
    name: "i_NSI",
    label: "可溶惰性物氮含量",
    description: "可溶惰性物氮含量 (mg N/mg COD)",
    defaultValue: 0.01,
    ui: {
      min: 0.0,
      max: 0.1,
      step: 0.001,
      unit: "mg N/mg COD",
    },
  },
  {
    name: "i_NSS",
    label: "可溶基质氮含量",
    description: "可溶基质氮含量 (mg N/mg COD)",
    defaultValue: 0.03,
    ui: {
      min: 0.0,
      max: 0.1,
      step: 0.001,
      unit: "mg N/mg COD",
    },
  },
  {
    name: "i_NXS",
    label: "颗粒基质氮含量",
    description: "颗粒基质氮含量 (mg N/mg COD)",
    defaultValue: 0.04,
    ui: {
      min: 0.0,
      max: 0.1,
      step: 0.001,
      unit: "mg N/mg COD",
    },
  },
  {
    name: "i_NXI",
    label: "颗粒惰性物氮含量",
    description: "颗粒惰性物氮含量 (mg N/mg COD)",
    defaultValue: 0.02,
    ui: {
      min: 0.0,
      max: 0.1,
      step: 0.001,
      unit: "mg N/mg COD",
    },
  },
  {
    name: "i_NBM",
    label: "生物量氮含量",
    description: "生物量氮含量 (mg N/mg COD)",
    defaultValue: 0.07,
    ui: {
      min: 0.05,
      max: 0.15,
      step: 0.001,
      unit: "mg N/mg COD",
    },
  },
  {
    name: "ny_NOX",
    label: "缺氧修正因子",
    description: "缺氧条件修正因子",
    defaultValue: 0.8,
    ui: {
      min: 0.5,
      max: 1.0,
      step: 0.01,
      unit: "-",
    },
  },
  {
    name: "i_SSXI",
    label: "颗粒惰性物TSS含量",
    description: "颗粒惰性物TSS含量 (mg TSS/mg COD)",
    defaultValue: 0.75,
    ui: {
      min: 0.5,
      max: 1.0,
      step: 0.01,
      unit: "mg TSS/mg COD",
    },
  },
  {
    name: "i_SSBM",
    label: "生物量TSS含量",
    description: "生物量TSS含量 (mg TSS/mg COD)",
    defaultValue: 0.9,
    ui: {
      min: 0.7,
      max: 1.0,
      step: 0.01,
      unit: "mg TSS/mg COD",
    },
  },
  {
    name: "i_SSSTO",
    label: "储存产物TSS含量",
    description: "储存产物TSS含量 (mg TSS/mg COD)",
    defaultValue: 0.85,
    ui: {
      min: 0.7,
      max: 1.0,
      step: 0.01,
      unit: "mg TSS/mg COD",
    },
  },
  {
    name: "k_a",
    label: "氨化速率常数",
    description: "氨化速率常数 (m³/(g COD·d))",
    defaultValue: 0.05,
    ui: {
      min: 0.01,
      max: 0.5,
      step: 0.01,
      unit: "m³/(g COD·d)",
    },
  },
]

/** ASM3 可用变量列表 */
const ASM3_AVAILABLE_VARIABLES: AvailableVariable[] = [
  { name: "S_S", label: "可溶基质", unit: "mg COD/L" },
  { name: "S_NH", label: "氨氮", unit: "mg N/L" },
  { name: "S_NO", label: "硝酸盐和亚硝酸盐", unit: "mg N/L" },
  { name: "S_O", label: "溶解氧", unit: "mg O2/L" },
  { name: "S_ND", label: "可溶有机氮", unit: "mg N/L" },
  { name: "S_ALK", label: "碱度", unit: "mmol/L" },
  { name: "S_I", label: "可溶惰性物质", unit: "mg COD/L" },
  { name: "X_H", label: "异养菌生物量", unit: "mg COD/L" },
  { name: "X_A", label: "自养菌生物量", unit: "mg COD/L" },
  { name: "X_S", label: "颗粒可降解基质", unit: "mg COD/L" },
  { name: "X_I", label: "颗粒惰性物质", unit: "mg COD/L" },
  { name: "X_ND", label: "颗粒有机氮", unit: "mg N/L" },
  { name: "X_STO", label: "储存产物", unit: "mg COD/L" },
  { name: "volume", label: "体积", unit: "m³" },
]

/** ASM3 模型配置 */
export const ASM3_CONFIG: ModelConfig = {
  modelName: "asm3",
  displayName: "ASM3",
  description: "ASM3 活性污泥模型 - 高级版本",
  fixedParameters: ASM3_FIXED_PARAMETERS,
  calculationParameters: [], // 使用 enhancedCalculationParameters 替代
  enhancedCalculationParameters: ASM3_ENHANCED_CALCULATION_PARAMETERS,
  nodeTypes: ["DefaultNode", "InputNode", "OutputNode", "ASM3Node"],
  availableVariables: ASM3_AVAILABLE_VARIABLES,
  modelSpecific: {
    supportedSolverMethods: ["rk4", "scipy_solver", "euler"],
    defaultEdgeParameterConfigs: {
      // ASM3特定的边参数配置
    },
  },
}

// ========== 配置工具函数 ==========

/**
 * 获取所有模型配置
 * @returns 模型配置映射
 */
export function getAllModelConfigs(): Record<string, ModelConfig> {
  return {
    asm1slim: ASM1_SLIM_CONFIG,
    asm1: ASM1_CONFIG,
    asm2d: ASM2D_CONFIG,
    asm3: ASM3_CONFIG,
    // 保持向后兼容性
    ASM1Slim: ASM1_SLIM_CONFIG,
    ASM1: ASM1_CONFIG,
    ASM2D: ASM2D_CONFIG,
    ASM3: ASM3_CONFIG,
  }
}

/**
 * 根据模型名称获取配置
 * @param modelName 模型名称
 * @returns 模型配置
 */
export function getModelConfig(modelName: string): ModelConfig | undefined {
  const configs = getAllModelConfigs()
  return configs[modelName]
}

/**
 * 获取模型的所有参数（固定参数 + 计算参数）
 * @param config 模型配置
 * @returns 所有参数列表
 */
export function getAllModelParameters(config: ModelConfig): CustomParameter[] {
  return [...config.fixedParameters, ...config.calculationParameters]
}

/**
 * 验证模型配置
 * @param config 模型配置
 * @returns 验证结果
 */
export function validateModelConfig(config: ModelConfig): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!config.modelName) {
    errors.push("模型名称不能为空")
  }

  if (!config.displayName) {
    errors.push("模型显示名称不能为空")
  }

  if (!config.nodeTypes || config.nodeTypes.length === 0) {
    errors.push("节点类型列表不能为空")
  }

  // 检查参数名称重复
  const allParams = getAllModelParameters(config)
  const paramNames = allParams.map((p) => p.name)
  const duplicateNames = paramNames.filter(
    (name, index) => paramNames.indexOf(name) !== index,
  )
  if (duplicateNames.length > 0) {
    errors.push(`参数名称重复: ${duplicateNames.join(", ")}`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 参数一致性验证工具函数
 * @param modelName 模型名称
 * @returns 验证结果
 */
export function validateParameterConsistency(modelName: string): {
  isValid: boolean
  errors: string[]
} {
  const config = getModelConfig(modelName)
  if (!config) {
    return {
      isValid: false,
      errors: [`模型配置未找到: ${modelName}`],
    }
  }

  const errors: string[] = []

  // 验证 enhancedCalculationParameters 是否存在
  if (!config.enhancedCalculationParameters) {
    errors.push(`模型 ${modelName} 缺少 enhancedCalculationParameters 配置`)
  } else {
    // 验证增强参数与基础参数的一致性
    const basicParams = config.calculationParameters
    const enhancedParams = config.enhancedCalculationParameters

    // 检查参数数量是否一致
    if (basicParams.length !== enhancedParams.length) {
      errors.push(
        `模型 ${modelName} 的基础参数数量(${basicParams.length})与增强参数数量(${enhancedParams.length})不一致`,
      )
    }

    // 检查每个参数的一致性
    basicParams.forEach((basicParam) => {
      const enhancedParam = enhancedParams.find(
        (p) => p.name === basicParam.name,
      )
      if (!enhancedParam) {
        errors.push(
          `模型 ${modelName} 的参数 ${basicParam.name} 在增强参数中未找到`,
        )
      } else {
        // 检查基本属性一致性
        if (basicParam.label !== enhancedParam.label) {
          errors.push(
            `模型 ${modelName} 参数 ${basicParam.name} 的标签不一致: '${basicParam.label}' vs '${enhancedParam.label}'`,
          )
        }
        if (basicParam.description !== enhancedParam.description) {
          errors.push(`模型 ${modelName} 参数 ${basicParam.name} 的描述不一致`)
        }
        if (basicParam.defaultValue !== enhancedParam.defaultValue) {
          errors.push(
            `模型 ${modelName} 参数 ${basicParam.name} 的默认值不一致: ${basicParam.defaultValue} vs ${enhancedParam.defaultValue}`,
          )
        }

        // 检查UI配置的合理性
        if (enhancedParam.ui.min >= enhancedParam.ui.max) {
          errors.push(
            `模型 ${modelName} 参数 ${basicParam.name} 的最小值(${enhancedParam.ui.min})应小于最大值(${enhancedParam.ui.max})`,
          )
        }
        if (
          enhancedParam.defaultValue < enhancedParam.ui.min ||
          enhancedParam.defaultValue > enhancedParam.ui.max
        ) {
          errors.push(
            `模型 ${modelName} 参数 ${basicParam.name} 的默认值(${enhancedParam.defaultValue})超出范围[${enhancedParam.ui.min}, ${enhancedParam.ui.max}]`,
          )
        }
        if (enhancedParam.ui.step <= 0) {
          errors.push(
            `模型 ${modelName} 参数 ${basicParam.name} 的步长(${enhancedParam.ui.step})必须大于0`,
          )
        }
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * 验证所有模型的参数一致性
 * @returns 验证结果
 */
export function validateAllModelsConsistency(): {
  isValid: boolean
  modelResults: Record<string, { isValid: boolean; errors: string[] }>
} {
  const allConfigs = getAllModelConfigs()
  const modelResults: Record<string, { isValid: boolean; errors: string[] }> =
    {}
  let overallValid = true

  Object.values(allConfigs).forEach((config) => {
    const result = validateParameterConsistency(config.modelName)
    modelResults[config.modelName] = result
    if (!result.isValid) {
      overallValid = false
    }
  })

  return {
    isValid: overallValid,
    modelResults,
  }
}

/**
 * 获取参数的验证范围
 * @param modelName 模型名称
 * @param parameterName 参数名称
 * @returns 参数范围配置
 */
export function getParameterValidationRange(
  modelName: string,
  parameterName: string,
): {
  min: number
  max: number
  step: number
  unit: string
} | null {
  const config = getModelConfig(modelName)
  if (!config?.enhancedCalculationParameters) return null

  const param = config.enhancedCalculationParameters.find(
    (p) => p.name === parameterName,
  )
  if (!param) return null

  return {
    min: param.ui.min,
    max: param.ui.max,
    step: param.ui.step,
    unit: param.ui.unit,
  }
}
