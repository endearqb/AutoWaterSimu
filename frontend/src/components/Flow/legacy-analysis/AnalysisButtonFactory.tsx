import type { Edge } from "@xyflow/react"
import type { ReactNode } from "react"
import ASM1AnalysisButton from "./ASM1AnalysisButton"
import ASM1SlimAnalysisButton from "./ASM1SlimAnalysisButton"
import ASM3AnalysisButton from "./ASM3AnalysisButton"
import AnalysisButton from "./AnalysisButton"
import UDMAnalysisButton from "./UDMAnalysisButton"
import type { ASM1ResultData } from "./asm1-analysis"
import type { ASM1SlimResultData } from "./asm1slim-analysis"
import type { ASM3ResultData } from "./asm3-analysis"
import type { UDMResultData } from "./udm-analysis"

interface EdgeParameterConfig {
  a: number
  b: number
}

// 支持的模型类型
export type ModelType =
  | "asm1"
  | "ASM1"
  | "asm1slim"
  | "ASM1Slim"
  | "materialBalance"
  | "asm3"
  | "ASM2d"
  | "ASM3"
  | "ADM1"
  | "udm"
  | "UDM"
  | "other"

interface CreateAnalysisButtonProps {
  /** 模型类型 */
  modelType: ModelType
  /** 分析按钮的文本 */
  label?: string
  /** 分析按钮的图标 */
  icon?: ReactNode
  /** 是否禁用按钮 */
  disabled?: boolean
  /** 是否显示加载状态 */
  loading?: boolean
  /** 要分析的数据 */
  resultData?: any
  /** 连接线数据 */
  edges?: Edge[]
  /** 连接线参数配置 */
  edgeParameterConfigs?: Record<string, Record<string, EdgeParameterConfig>>
  /** 自定义分析处理函数（用于非内置模型类型） */
  onCustomAnalyze?: (data: any) => void
}

/**
 * 创建特定模型类型的分析按钮
 /**
 * 工厂函数，根据模型类型返回相应的分析按钮组件
 */
export const createAnalysisButton = ({
  modelType,
  label,
  icon,
  disabled = false,
  loading = false,
  resultData,
  edges,
  edgeParameterConfigs,
  onCustomAnalyze,
}: CreateAnalysisButtonProps): React.ComponentType => {
  // 根据模型类型返回相应的分析按钮组件
  switch (modelType) {
    case "asm1":
    case "ASM1":
      return () => (
        <ASM1AnalysisButton
          label={label || "分析ASM1数据"}
          disabled={disabled}
          loading={loading}
          resultData={resultData as ASM1ResultData}
          edges={edges}
          edgeParameterConfigs={edgeParameterConfigs}
        />
      )
    case "asm1slim":
    case "ASM1Slim":
      return () => (
        <ASM1SlimAnalysisButton
          label={label || "分析ASM1Slim数据"}
          disabled={disabled}
          loading={loading}
          resultData={resultData as ASM1SlimResultData}
          edges={edges}
          edgeParameterConfigs={edgeParameterConfigs}
        />
      )
    case "asm3":
    case "ASM3":
      return () => (
        <ASM3AnalysisButton
          label={label || "分析ASM3数据"}
          disabled={disabled}
          loading={loading}
          resultData={resultData as ASM3ResultData}
          edges={edges}
          edgeParameterConfigs={edgeParameterConfigs}
        />
      )
    case "udm":
    case "UDM":
      return () => (
        <UDMAnalysisButton
          label={label || "分析UDM数据"}
          disabled={disabled}
          loading={loading}
          resultData={resultData as UDMResultData}
          edges={edges}
          edgeParameterConfigs={edgeParameterConfigs}
        />
      )
    // 未来可以添加其他模型类型的分析按钮
    // case 'ASM2d':
    // case 'ADM1':
    default:
      // 对于未实现的模型类型或自定义类型，返回通用分析按钮
      return () => (
        <AnalysisButton
          label={label || "分析数据"}
          icon={icon}
          disabled={disabled}
          loading={loading}
          data={resultData}
          onAnalyze={onCustomAnalyze || (() => console.log("未实现的分析方法"))}
        />
      )
  }
}

export default createAnalysisButton
