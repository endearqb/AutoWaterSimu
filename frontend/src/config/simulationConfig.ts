export interface SliderConfig {
  min: number
  max: number
  step: number
  defaultValue: number
  visible: boolean
  label: string
  unit?: string
}

export interface SelectConfig {
  type: "select"
  options: Array<{ value: number; label: string }>
  defaultValue: number
  visible: boolean
  label: string
  unit?: string
}

export interface InputConfig {
  type: "number" | "text"
  defaultValue: string | number
  placeholder?: string
  readOnly?: boolean
  visible: boolean
  label: string
  step?: string
}

// 计算参数接口
export interface CalculationParameters {
  hours: number
  steps_per_hour: number
  solver_method: string
  tolerance: number
  max_iterations: number
  sampling_interval_hours?: number
  max_memory_mb: number
}

// 参数验证规则接口
export interface ValidationRule {
  min?: number
  max?: number
  required?: boolean
  allowedValues?: string[]
}

// 参数验证配置
export interface ParameterValidation {
  hours: ValidationRule
  steps_per_hour: ValidationRule
  solver_method: ValidationRule
  tolerance: ValidationRule
  max_iterations: ValidationRule
  max_memory_mb: ValidationRule
}

export interface SimulationConfig {
  hours: SliderConfig
  stepsPerHour: SliderConfig
  maxIterations: SliderConfig
  maxMemoryMb: SliderConfig
  samplingIntervalHours: SelectConfig
  tolerance: InputConfig
  solverMethod: InputConfig
  defaultCalculationParams: CalculationParameters
  validation: ParameterValidation
}

// 参数验证函数
export const validateCalculationParameters = (
  params: Partial<CalculationParameters>,
  modelType: string,
): { isValid: boolean; errors: string[] } => {
  const config = simulationConfigs[modelType]
  if (!config) {
    return { isValid: false, errors: [`Unknown model type: ${modelType}`] }
  }

  const errors: string[] = []
  const validation = config.validation

  // 验证 hours
  if (params.hours !== undefined) {
    if (
      validation.hours.min !== undefined &&
      params.hours < validation.hours.min
    ) {
      errors.push(`运行时间不能小于 ${validation.hours.min} 小时`)
    }
    if (
      validation.hours.max !== undefined &&
      params.hours > validation.hours.max
    ) {
      errors.push(`运行时间不能大于 ${validation.hours.max} 小时`)
    }
  }

  // 验证 steps_per_hour
  if (params.steps_per_hour !== undefined) {
    if (
      validation.steps_per_hour.min !== undefined &&
      params.steps_per_hour < validation.steps_per_hour.min
    ) {
      errors.push(`每小时步数不能小于 ${validation.steps_per_hour.min}`)
    }
    if (
      validation.steps_per_hour.max !== undefined &&
      params.steps_per_hour > validation.steps_per_hour.max
    ) {
      errors.push(`每小时步数不能大于 ${validation.steps_per_hour.max}`)
    }
  }

  // 验证 solver_method
  if (params.solver_method !== undefined) {
    if (
      validation.solver_method.allowedValues &&
      !validation.solver_method.allowedValues.includes(params.solver_method)
    ) {
      errors.push(`不支持的求解器方法: ${params.solver_method}`)
    }
  }

  // 验证 tolerance
  if (params.tolerance !== undefined) {
    if (
      validation.tolerance.min !== undefined &&
      params.tolerance < validation.tolerance.min
    ) {
      errors.push(`计算容差不能小于 ${validation.tolerance.min}`)
    }
    if (
      validation.tolerance.max !== undefined &&
      params.tolerance > validation.tolerance.max
    ) {
      errors.push(`计算容差不能大于 ${validation.tolerance.max}`)
    }
  }

  // 验证 max_iterations
  if (params.max_iterations !== undefined) {
    if (
      validation.max_iterations.min !== undefined &&
      params.max_iterations < validation.max_iterations.min
    ) {
      errors.push(`最大迭代次数不能小于 ${validation.max_iterations.min}`)
    }
    if (
      validation.max_iterations.max !== undefined &&
      params.max_iterations > validation.max_iterations.max
    ) {
      errors.push(`最大迭代次数不能大于 ${validation.max_iterations.max}`)
    }
  }

  // 验证 max_memory_mb
  if (params.max_memory_mb !== undefined) {
    if (
      validation.max_memory_mb.min !== undefined &&
      params.max_memory_mb < validation.max_memory_mb.min
    ) {
      errors.push(`最大内存限制不能小于 ${validation.max_memory_mb.min} MB`)
    }
    if (
      validation.max_memory_mb.max !== undefined &&
      params.max_memory_mb > validation.max_memory_mb.max
    ) {
      errors.push(`最大内存限制不能大于 ${validation.max_memory_mb.max} MB`)
    }
  }

  // 验证 sampling_interval_hours
  if (params.sampling_interval_hours !== undefined) {
    if (params.sampling_interval_hours <= 0) {
      errors.push("采样间隔必须大于0")
    } else if (
      params.hours !== undefined &&
      params.sampling_interval_hours > params.hours
    ) {
      errors.push("采样间隔不能大于模拟总时间")
    } else if (
      params.steps_per_hour !== undefined &&
      params.sampling_interval_hours < 1 / params.steps_per_hour
    ) {
      errors.push("采样间隔不能小于计算步长")
    }
  }

  return { isValid: errors.length === 0, errors }
}

// 获取默认计算参数
export const getDefaultCalculationParams = (
  modelType: string,
): CalculationParameters => {
  const config = simulationConfigs[modelType]
  return (
    config?.defaultCalculationParams ||
    simulationConfigs.materialBalance.defaultCalculationParams
  )
}

export const simulationConfigs: Record<string, SimulationConfig> = {
  materialBalance: {
    hours: {
      min: 0.5,
      max: 120,
      step: 0.5,
      defaultValue: 5,
      visible: true,
      label: "运行时间",
      unit: "小时",
    },
    stepsPerHour: {
      min: 20,
      max: 100,
      step: 20,
      defaultValue: 60,
      visible: true,
      label: "每小时步数",
    },
    maxIterations: {
      min: 50,
      max: 2000,
      step: 50,
      defaultValue: 2000,
      visible: false,
      label: "最大迭代次数",
    },
    maxMemoryMb: {
      min: 256,
      max: 2048,
      step: 128,
      defaultValue: 1024,
      visible: false,
      label: "最大内存限制",
      unit: "MB",
    },
    samplingIntervalHours: {
      type: "select",
      options: [
        // { value: 0.1, label: '0.1' },
        // { value: 0.2, label: '0.2' },
        { value: 0.5, label: "0.5" },
        { value: 1, label: "1" },
      ],
      defaultValue: 1,
      visible: true,
      label: "采样间隔",
      unit: "小时",
    },
    tolerance: {
      type: "number",
      defaultValue: 1e-3,
      step: "1e-4",
      visible: false,
      label: "计算容差",
      placeholder: "1e-3",
    },
    solverMethod: {
      type: "text",
      defaultValue: "euler",
      readOnly: true,
      visible: true,
      label: "求解器方法",
      placeholder: "euler",
    },
    defaultCalculationParams: {
      hours: 1.0,
      steps_per_hour: 20,
      solver_method: "euler",
      tolerance: 1e-3,
      max_iterations: 2000,
      sampling_interval_hours: 1.0,
      max_memory_mb: 1024,
    },
    validation: {
      hours: { min: 0.5, max: 120, required: true },
      steps_per_hour: { min: 20, max: 100, required: true },
      solver_method: { allowedValues: ["euler", "rk4"], required: true },
      tolerance: { min: 1e-6, max: 1e-1, required: true },
      max_iterations: { min: 50, max: 2000, required: true },
      max_memory_mb: { min: 256, max: 2048, required: true },
    },
  },

  asm1: {
    hours: {
      min: 0.5,
      max: 120,
      step: 0.5,
      defaultValue: 2,
      visible: true,
      label: "运行时间",
      unit: "小时",
    },
    stepsPerHour: {
      min: 10,
      max: 60,
      step: 10,
      defaultValue: 20,
      visible: true,
      label: "每小时步数",
    },
    maxIterations: {
      min: 100,
      max: 5000,
      step: 100,
      defaultValue: 2000,
      visible: false,
      label: "最大迭代次数",
    },
    maxMemoryMb: {
      min: 512,
      max: 4096,
      step: 256,
      defaultValue: 2048,
      visible: false,
      label: "最大内存限制",
      unit: "MB",
    },
    samplingIntervalHours: {
      type: "select",
      options: [
        // { value: 0.1, label: '0.1' },
        // { value: 0.2, label: '0.2' },
        { value: 0.5, label: "0.5" },
        { value: 1, label: "1" },
      ],
      defaultValue: 1,
      visible: true,
      label: "采样间隔",
      unit: "小时",
    },
    tolerance: {
      type: "number",
      defaultValue: 1e-3,
      step: "1e-4",
      visible: false,
      label: "计算容差",
      placeholder: "1e-3",
    },
    solverMethod: {
      type: "text",
      defaultValue: "rk4",
      readOnly: true,
      visible: true,
      label: "求解器方法",
      placeholder: "rk4",
    },
    defaultCalculationParams: {
      hours: 2.0,
      steps_per_hour: 20,
      solver_method: "rk4",
      tolerance: 1e-3,
      max_iterations: 2000,
      sampling_interval_hours: 1.0,
      max_memory_mb: 2048,
    },
    validation: {
      hours: { min: 0.5, max: 120, required: true },
      steps_per_hour: { min: 10, max: 60, required: true },
      solver_method: {
        allowedValues: ["rk4", "scipy_solver", "euler"],
        required: true,
      },
      tolerance: { min: 1e-6, max: 1e-2, required: true },
      max_iterations: { min: 100, max: 5000, required: true },
      max_memory_mb: { min: 512, max: 4096, required: true },
    },
  },

  asm1slim: {
    hours: {
      min: 0.5,
      max: 120,
      step: 0.5,
      defaultValue: 5,
      visible: true,
      label: "运行时间",
      unit: "小时",
    },
    stepsPerHour: {
      min: 10,
      max: 60,
      step: 10,
      defaultValue: 20,
      visible: true,
      label: "每小时步数",
    },
    maxIterations: {
      min: 100,
      max: 5000,
      step: 100,
      defaultValue: 2000,
      visible: false,
      label: "最大迭代次数",
    },
    maxMemoryMb: {
      min: 512,
      max: 4096,
      step: 256,
      defaultValue: 1024,
      visible: false,
      label: "最大内存限制",
      unit: "MB",
    },
    samplingIntervalHours: {
      type: "select",
      options: [
        // { value: 0.1, label: '0.1' },
        // { value: 0.2, label: '0.2' },
        { value: 0.5, label: "0.5" },
        { value: 1, label: "1" },
      ],
      defaultValue: 1,
      visible: true,
      label: "采样间隔",
      unit: "小时",
    },
    tolerance: {
      type: "number",
      defaultValue: 1e-3,
      step: "1e-4",
      readOnly: true,
      visible: false,
      label: "计算容差",
      placeholder: "1e-3",
    },
    solverMethod: {
      type: "text",
      defaultValue: "rk4",
      readOnly: true,
      visible: true,
      label: "求解器方法",
      placeholder: "rk4",
    },
    defaultCalculationParams: {
      hours: 1.0,
      steps_per_hour: 20,
      solver_method: "rk4",
      tolerance: 1e-3,
      max_iterations: 2000,
      sampling_interval_hours: 1.0,
      max_memory_mb: 1024,
    },
    validation: {
      hours: { min: 0.5, max: 120, required: true },
      steps_per_hour: { min: 10, max: 60, required: true },
      solver_method: {
        allowedValues: ["rk4", "scipy_solver", "euler"],
        required: true,
      },
      tolerance: { min: 1e-6, max: 1e-2, required: true },
      max_iterations: { min: 100, max: 5000, required: true },
      max_memory_mb: { min: 512, max: 4096, required: true },
    },
  },

  asm3: {
    hours: {
      min: 0.5,
      max: 120,
      step: 0.5,
      defaultValue: 2,
      visible: true,
      label: "运行时间",
      unit: "小时",
    },
    stepsPerHour: {
      min: 10,
      max: 60,
      step: 10,
      defaultValue: 20,
      visible: true,
      label: "每小时步数",
    },
    maxIterations: {
      min: 100,
      max: 5000,
      step: 100,
      defaultValue: 2000,
      visible: false,
      label: "最大迭代次数",
    },
    maxMemoryMb: {
      min: 512,
      max: 4096,
      step: 256,
      defaultValue: 2048,
      visible: false,
      label: "最大内存限制",
      unit: "MB",
    },
    samplingIntervalHours: {
      type: "select",
      options: [
        { value: 0.5, label: "0.5" },
        { value: 1, label: "1" },
      ],
      defaultValue: 1,
      visible: true,
      label: "采样间隔",
      unit: "小时",
    },
    tolerance: {
      type: "number",
      defaultValue: 1e-3,
      step: "1e-4",
      visible: false,
      label: "计算容差",
      placeholder: "1e-3",
    },
    solverMethod: {
      type: "text",
      defaultValue: "rk4",
      readOnly: true,
      visible: true,
      label: "求解器方法",
      placeholder: "rk4",
    },
    defaultCalculationParams: {
      hours: 2.0,
      steps_per_hour: 20,
      solver_method: "rk4",
      tolerance: 1e-3,
      max_iterations: 2000,
      sampling_interval_hours: 1.0,
      max_memory_mb: 2048,
    },
    validation: {
      hours: { min: 0.5, max: 120, required: true },
      steps_per_hour: { min: 10, max: 60, required: true },
      solver_method: {
        allowedValues: ["rk4", "scipy_solver", "euler"],
        required: true,
      },
      tolerance: { min: 1e-6, max: 1e-2, required: true },
      max_iterations: { min: 100, max: 5000, required: true },
      max_memory_mb: { min: 512, max: 4096, required: true },
    },
  },
}

export const getSimulationConfig = (modelType: string): SimulationConfig => {
  return simulationConfigs[modelType] || simulationConfigs.materialBalance
}
