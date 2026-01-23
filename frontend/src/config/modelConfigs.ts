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

const asm1SlimLabel = (name: string) =>
  `flow.modelParams.asm1slim.${name}.label`
const asm1SlimDescription = (name: string) =>
  `flow.modelParams.asm1slim.${name}.description`
const asm1Label = (name: string) => `flow.modelParams.asm1.${name}.label`
const asm1Description = (name: string) =>
  `flow.modelParams.asm1.${name}.description`
const asm3Label = (name: string) => `flow.modelParams.asm3.${name}.label`
const asm3Description = (name: string) =>
  `flow.modelParams.asm3.${name}.description`

// ========== ASM1Slim 配置 ==========

/** ASM1Slim 固定参数定义 */
const ASM1_SLIM_FIXED_PARAMETERS: CustomParameter[] = [
  {
    name: "dissolvedOxygen",
    label: asm1SlimLabel("dissolvedOxygen"),
    description: asm1SlimDescription("dissolvedOxygen"),
    defaultValue: 0,
  },
  {
    name: "cod",
    label: asm1SlimLabel("cod"),
    description: asm1SlimDescription("cod"),
    defaultValue: 0,
  },
  {
    name: "nitrate",
    label: asm1SlimLabel("nitrate"),
    description: asm1SlimDescription("nitrate"),
    defaultValue: 0,
  },
  {
    name: "ammonia",
    label: asm1SlimLabel("ammonia"),
    description: asm1SlimDescription("ammonia"),
    defaultValue: 0,
  },
  {
    name: "totalAlkalinity",
    label: asm1SlimLabel("totalAlkalinity"),
    description: asm1SlimDescription("totalAlkalinity"),
    defaultValue: 0,
  },
]

/** ASM1Slim 计算参数定义 */
// ASM1_SLIM_CALCULATION_PARAMETERS 已移除，使用 ASM1_SLIM_ENHANCED_CALCULATION_PARAMETERS 替代

/** ASM1Slim 增强计算参数定义（包含UI配置） */
const ASM1_SLIM_ENHANCED_CALCULATION_PARAMETERS: EnhancedCustomParameter[] = [
  {
    name: "empiricalDenitrificationRate",
    label: asm1SlimLabel("empiricalDenitrificationRate"),
    description: asm1SlimDescription("empiricalDenitrificationRate"),
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
    label: asm1SlimLabel("empiricalNitrificationRate"),
    description: asm1SlimDescription("empiricalNitrificationRate"),
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
    label: asm1SlimLabel("empiricalCNRatio"),
    description: asm1SlimDescription("empiricalCNRatio"),
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
    label: asm1SlimLabel("codDenitrificationInfluence"),
    description: asm1SlimDescription("codDenitrificationInfluence"),
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
    label: asm1SlimLabel("nitrateDenitrificationInfluence"),
    description: asm1SlimDescription("nitrateDenitrificationInfluence"),
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
    label: asm1SlimLabel("ammoniaNitrificationInfluence"),
    description: asm1SlimDescription("ammoniaNitrificationInfluence"),
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
    label: asm1SlimLabel("aerobicCODDegradationRate"),
    description: asm1SlimDescription("aerobicCODDegradationRate"),
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
  {
    name: "dissolvedOxygen",
    label: asm1SlimLabel("dissolvedOxygen"),
    unit: "mg/L",
  },
  { name: "cod", label: asm1SlimLabel("cod"), unit: "mg/L" },
  { name: "nitrate", label: asm1SlimLabel("nitrate"), unit: "mg/L" },
  { name: "ammonia", label: asm1SlimLabel("ammonia"), unit: "mg/L" },
  {
    name: "totalAlkalinity",
    label: asm1SlimLabel("totalAlkalinity"),
    unit: "mg/L",
  },
  { name: "volume", label: asm1SlimLabel("volume"), unit: "m3" },
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
    label: asm1Label("X_BH"),
    description: asm1Description("X_BH"),
    defaultValue: 0,
  },
  {
    name: "X_BA",
    label: asm1Label("X_BA"),
    description: asm1Description("X_BA"),
    defaultValue: 0,
  },
  {
    name: "X_S",
    label: asm1Label("X_S"),
    description: asm1Description("X_S"),
    defaultValue: 0,
  },
  {
    name: "X_i",
    label: asm1Label("X_i"),
    description: asm1Description("X_i"),
    defaultValue: 0,
  },
  {
    name: "X_ND",
    label: asm1Label("X_ND"),
    description: asm1Description("X_ND"),
    defaultValue: 0,
  },
  {
    name: "S_O",
    label: asm1Label("S_O"),
    description: asm1Description("S_O"),
    defaultValue: 0,
  },
  {
    name: "S_S",
    label: asm1Label("S_S"),
    description: asm1Description("S_S"),
    defaultValue: 0,
  },
  {
    name: "S_NO",
    label: asm1Label("S_NO"),
    description: asm1Description("S_NO"),
    defaultValue: 0,
  },
  {
    name: "S_NH",
    label: asm1Label("S_NH"),
    description: asm1Description("S_NH"),
    defaultValue: 0,
  },
  {
    name: "S_ND",
    label: asm1Label("S_ND"),
    description: asm1Description("S_ND"),
    defaultValue: 0,
  },
  {
    name: "S_ALK",
    label: asm1Label("S_ALK"),
    description: asm1Description("S_ALK"),
    defaultValue: 0,
  },
]

/** ASM1 计算参数定义 - 19个动力学和化学计量参数 */
// ASM1_CALCULATION_PARAMETERS 已移除，使用 ASM1_ENHANCED_CALCULATION_PARAMETERS 替代

/** ASM1 增强计算参数定义（包含UI配置） */
const ASM1_ENHANCED_CALCULATION_PARAMETERS: EnhancedCustomParameter[] = [
  {
    name: "u_H",
    label: asm1Label("u_H"),
    description: asm1Description("u_H"),
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
    label: asm1Label("K_S"),
    description: asm1Description("K_S"),
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
    label: asm1Label("K_OH"),
    description: asm1Description("K_OH"),
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
    label: asm1Label("K_NO"),
    description: asm1Description("K_NO"),
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
    label: asm1Label("n_g"),
    description: asm1Description("n_g"),
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
    label: asm1Label("b_H"),
    description: asm1Description("b_H"),
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
    label: asm1Label("u_A"),
    description: asm1Description("u_A"),
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
    label: asm1Label("K_NH"),
    description: asm1Description("K_NH"),
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
    label: asm1Label("K_OA"),
    description: asm1Description("K_OA"),
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
    label: asm1Label("b_A"),
    description: asm1Description("b_A"),
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
    label: asm1Label("Y_H"),
    description: asm1Description("Y_H"),
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
    label: asm1Label("Y_A"),
    description: asm1Description("Y_A"),
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
    label: asm1Label("i_XB"),
    description: asm1Description("i_XB"),
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
    label: asm1Label("i_XP"),
    description: asm1Description("i_XP"),
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
    label: asm1Label("f_P"),
    description: asm1Description("f_P"),
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
    label: asm1Label("n_h"),
    description: asm1Description("n_h"),
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
    label: asm1Label("K_a"),
    description: asm1Description("K_a"),
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
    label: asm1Label("K_h"),
    description: asm1Description("K_h"),
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
    label: asm1Label("K_x"),
    description: asm1Description("K_x"),
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
  { name: "S_S", label: asm1Label("S_S"), unit: "mg COD/L" },
  { name: "S_NH", label: asm1Label("S_NH"), unit: "mg N/L" },
  { name: "S_NO", label: asm1Label("S_NO"), unit: "mg N/L" },
  { name: "S_O", label: asm1Label("S_O"), unit: "mg O2/L" },
  { name: "S_ND", label: asm1Label("S_ND"), unit: "mg N/L" },
  { name: "S_ALK", label: asm1Label("S_ALK"), unit: "mol HCO3-/L" },
  { name: "X_BH", label: asm1Label("X_BH"), unit: "mg COD/L" },
  { name: "X_BA", label: asm1Label("X_BA"), unit: "mg COD/L" },
  { name: "X_S", label: asm1Label("X_S"), unit: "mg COD/L" },
  { name: "X_i", label: asm1Label("X_i"), unit: "mg COD/L" },
  { name: "X_ND", label: asm1Label("X_ND"), unit: "mg N/L" },
  { name: "volume", label: asm1Label("volume"), unit: "m3" },
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
    label: asm3Label("X_H"),
    description: asm3Description("X_H"),
    defaultValue: 30,
  },
  {
    name: "X_A",
    label: asm3Label("X_A"),
    description: asm3Description("X_A"),
    defaultValue: 0,
  },
  {
    name: "X_S",
    label: asm3Label("X_S"),
    description: asm3Description("X_S"),
    defaultValue: 25,
  },
  {
    name: "X_I",
    label: asm3Label("X_I"),
    description: asm3Description("X_I"),
    defaultValue: 25,
  },
  {
    name: "X_ND",
    label: asm3Label("X_ND"),
    description: asm3Description("X_ND"),
    defaultValue: 0,
  },
  {
    name: "X_STO",
    label: asm3Label("X_STO"),
    description: asm3Description("X_STO"),
    defaultValue: 0,
  },
  {
    name: "S_O",
    label: asm3Label("S_O"),
    description: asm3Description("S_O"),
    defaultValue: 4,
  },
  {
    name: "S_S",
    label: asm3Label("S_S"),
    description: asm3Description("S_S"),
    defaultValue: 2,
  },
  {
    name: "S_NO",
    label: asm3Label("S_NO"),
    description: asm3Description("S_NO"),
    defaultValue: 0,
  },
  {
    name: "S_NH",
    label: asm3Label("S_NH"),
    description: asm3Description("S_NH"),
    defaultValue: 2,
  },
  {
    name: "S_ND",
    label: asm3Label("S_ND"),
    description: asm3Description("S_ND"),
    defaultValue: 1,
  },
  {
    name: "S_ALK",
    label: asm3Label("S_ALK"),
    description: asm3Description("S_ALK"),
    defaultValue: 7,
  },
  {
    name: "S_I",
    label: asm3Label("S_I"),
    description: asm3Description("S_I"),
    defaultValue: 30,
  },
]

/** ASM3 增强计算参数定义（包含UI配置） - 37个参数 */
const ASM3_ENHANCED_CALCULATION_PARAMETERS: EnhancedCustomParameter[] = [

  {
    name: "k_H",
    label: asm3Label("k_H"),
    description: asm3Description("k_H"),
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
    label: asm3Label("k_STO"),
    description: asm3Description("k_STO"),
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
    label: asm3Label("K_S"),
    description: asm3Description("K_S"),
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
    label: asm3Label("K_O2H"),
    description: asm3Description("K_O2H"),
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
    label: asm3Label("K_NO"),
    description: asm3Description("K_NO"),
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
    label: asm3Label("K_NH4H"),
    description: asm3Description("K_NH4H"),
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
    label: asm3Label("K_ALKH"),
    description: asm3Description("K_ALKH"),
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
    label: asm3Label("K_X"),
    description: asm3Description("K_X"),
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
    label: asm3Label("mu_H"),
    description: asm3Description("mu_H"),
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
    label: asm3Label("K_STO_H"),
    description: asm3Description("K_STO_H"),
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
    label: asm3Label("b_HO2"),
    description: asm3Description("b_HO2"),
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
    label: asm3Label("b_HNOX"),
    description: asm3Description("b_HNOX"),
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
    label: asm3Label("b_STOO2"),
    description: asm3Description("b_STOO2"),
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
    label: asm3Label("b_STONOX"),
    description: asm3Description("b_STONOX"),
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
    label: asm3Label("mu_A"),
    description: asm3Description("mu_A"),
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
    label: asm3Label("K_NH4A"),
    description: asm3Description("K_NH4A"),
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
    label: asm3Label("K_O2A"),
    description: asm3Description("K_O2A"),
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
    label: asm3Label("K_ALKA"),
    description: asm3Description("K_ALKA"),
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
    label: asm3Label("b_AO2"),
    description: asm3Description("b_AO2"),
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
    label: asm3Label("b_ANOX"),
    description: asm3Description("b_ANOX"),
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
    label: asm3Label("K_AO2"),
    description: asm3Description("K_AO2"),
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
    label: asm3Label("Y_STOO2"),
    description: asm3Description("Y_STOO2"),
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
    label: asm3Label("Y_STONOX"),
    description: asm3Description("Y_STONOX"),
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
    label: asm3Label("Y_HO2"),
    description: asm3Description("Y_HO2"),
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
    label: asm3Label("Y_HNOX"),
    description: asm3Description("Y_HNOX"),
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
    label: asm3Label("Y_A"),
    description: asm3Description("Y_A"),
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
    label: asm3Label("f_SI"),
    description: asm3Description("f_SI"),
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
    label: asm3Label("f_XI"),
    description: asm3Description("f_XI"),
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
    label: asm3Label("i_NSI"),
    description: asm3Description("i_NSI"),
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
    label: asm3Label("i_NSS"),
    description: asm3Description("i_NSS"),
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
    label: asm3Label("i_NXS"),
    description: asm3Description("i_NXS"),
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
    label: asm3Label("i_NXI"),
    description: asm3Description("i_NXI"),
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
    label: asm3Label("i_NBM"),
    description: asm3Description("i_NBM"),
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
    label: asm3Label("ny_NOX"),
    description: asm3Description("ny_NOX"),
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
    label: asm3Label("i_SSXI"),
    description: asm3Description("i_SSXI"),
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
    label: asm3Label("i_SSBM"),
    description: asm3Description("i_SSBM"),
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
    label: asm3Label("i_SSSTO"),
    description: asm3Description("i_SSSTO"),
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
    label: asm3Label("k_a"),
    description: asm3Description("k_a"),
    defaultValue: 0.05,
    ui: {
      min: 0.01,
      max: 0.5,
      step: 0.01,
      unit: "m³/(g COD·d)",
    },
  },

]/** ASM3 可用变量列表 */
const ASM3_AVAILABLE_VARIABLES: AvailableVariable[] = [
  { name: "S_S", label: asm3Label("S_S"), unit: "mg COD/L" },
  { name: "S_NH", label: asm3Label("S_NH"), unit: "mg N/L" },
  { name: "S_NO", label: asm3Label("S_NO"), unit: "mg N/L" },
  { name: "S_O", label: asm3Label("S_O"), unit: "mg O2/L" },
  { name: "S_ND", label: asm3Label("S_ND"), unit: "mg N/L" },
  { name: "S_ALK", label: asm3Label("S_ALK"), unit: "mmol/L" },
  { name: "S_I", label: asm3Label("S_I"), unit: "mg COD/L" },
  { name: "X_H", label: asm3Label("X_H"), unit: "mg COD/L" },
  { name: "X_A", label: asm3Label("X_A"), unit: "mg COD/L" },
  { name: "X_S", label: asm3Label("X_S"), unit: "mg COD/L" },
  { name: "X_I", label: asm3Label("X_I"), unit: "mg COD/L" },
  { name: "X_ND", label: asm3Label("X_ND"), unit: "mg N/L" },
  { name: "X_STO", label: asm3Label("X_STO"), unit: "mg COD/L" },
  { name: "volume", label: asm3Label("volume"), unit: "m3" },
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




