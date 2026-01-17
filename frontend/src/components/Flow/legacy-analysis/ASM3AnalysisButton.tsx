import { Icon } from "@chakra-ui/react"
import { useState } from "react"
import { FaChartLine } from "react-icons/fa"

import type { Edge } from "@xyflow/react"
import ASM3Analyzer from "./ASM3Analyzer"
import AnalysisButton from "./AnalysisButton"
import AnalysisDialog from "./AnalysisDialog"
import type { ASM3ResultData } from "./asm3-analysis"

interface EdgeParameterConfig {
  a: number
  b: number
}

interface ASM3AnalysisButtonProps {
  /** 分析按钮的文本 */
  label?: string
  /** 是否禁用按钮 */
  disabled?: boolean
  /** 是否显示加载状态 */
  loading?: boolean
  /** 要分析的ASM3结果数据 */
  resultData?: ASM3ResultData
  /** 连接线数据 */
  edges?: Edge[]
  /** 连接线参数配置 */
  edgeParameterConfigs?: Record<string, Record<string, EdgeParameterConfig>>
  /** 分析完成回调 */
  onAnalysisComplete?: (results: any) => void
}

/**
 * ASM3分析按钮组件
 * 用于触发ASM3数据分析并显示分析结果
 */
const ASM3AnalysisButton = ({
  label = "分析ASM3数据",
  disabled = false,
  loading = false,
  resultData,
  edges,
  edgeParameterConfigs,
  onAnalysisComplete,
}: ASM3AnalysisButtonProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleAnalyze = (data: ASM3ResultData) => {
    if (data) {
      setIsDialogOpen(true)
      // 如果有回调函数，调用它
      if (onAnalysisComplete) {
        onAnalysisComplete(data)
      }
    }
  }

  return (
    <>
      <AnalysisButton
        label={label}
        icon={<Icon as={FaChartLine} />}
        disabled={disabled}
        loading={loading}
        onAnalyze={handleAnalyze}
        data={resultData}
        colorScheme="blue"
      />

      <AnalysisDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="ASM3计算结果分析"
        size="cover"
      >
        {resultData && (
          <ASM3Analyzer
            resultData={resultData}
            edges={edges}
            edgeParameterConfigs={edgeParameterConfigs}
          />
        )}
      </AnalysisDialog>
    </>
  )
}

export default ASM3AnalysisButton
