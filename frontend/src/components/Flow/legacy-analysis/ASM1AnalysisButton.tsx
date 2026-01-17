import { Icon } from "@chakra-ui/react"
import { useState } from "react"
import { FaChartLine } from "react-icons/fa"

import type { Edge } from "@xyflow/react"
import ASM1Analyzer from "./ASM1Analyzer"
import AnalysisButton from "./AnalysisButton"
import AnalysisDialog from "./AnalysisDialog"
import type { ASM1ResultData } from "./asm1-analysis"

interface EdgeParameterConfig {
  a: number
  b: number
}

interface ASM1AnalysisButtonProps {
  /** 分析按钮的文本 */
  label?: string
  /** 是否禁用按钮 */
  disabled?: boolean
  /** 是否显示加载状态 */
  loading?: boolean
  /** 要分析的ASM1结果数据 */
  resultData?: ASM1ResultData
  /** 连接线数据 */
  edges?: Edge[]
  /** 连接线参数配置 */
  edgeParameterConfigs?: Record<string, Record<string, EdgeParameterConfig>>
}

/**
 * ASM1分析按钮组件
 * 用于触发ASM1数据分析并显示分析结果
 */
const ASM1AnalysisButton = ({
  label = "分析ASM1数据",
  disabled = false,
  loading = false,
  resultData,
  edges,
  edgeParameterConfigs,
}: ASM1AnalysisButtonProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleAnalyze = (data: ASM1ResultData) => {
    if (data) {
      setIsDialogOpen(true)
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
        title="ASM1计算结果分析"
        size="cover"
      >
        {resultData && (
          <ASM1Analyzer
            resultData={resultData}
            edges={edges}
            edgeParameterConfigs={edgeParameterConfigs}
          />
        )}
      </AnalysisDialog>
    </>
  )
}

export default ASM1AnalysisButton
