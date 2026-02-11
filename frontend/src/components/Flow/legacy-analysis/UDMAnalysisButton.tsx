import { Icon } from "@chakra-ui/react"
import { useState } from "react"
import { FaChartLine } from "react-icons/fa"

import type { Edge } from "@xyflow/react"
import AnalysisButton from "./AnalysisButton"
import AnalysisDialog from "./AnalysisDialog"
import UDMAnalyzer from "./UDMAnalyzer"
import type { UDMResultData } from "./udm-analysis"

interface EdgeParameterConfig {
  a: number
  b: number
}

interface UDMAnalysisButtonProps {
  label?: string
  disabled?: boolean
  loading?: boolean
  resultData?: UDMResultData
  edges?: Edge[]
  edgeParameterConfigs?: Record<string, Record<string, EdgeParameterConfig>>
}

const UDMAnalysisButton = ({
  label = "分析UDM数据",
  disabled = false,
  loading = false,
  resultData,
  edges,
  edgeParameterConfigs,
}: UDMAnalysisButtonProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleAnalyze = (data: UDMResultData) => {
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
        title="UDM计算结果分析"
        size="cover"
      >
        {resultData && (
          <UDMAnalyzer
            resultData={resultData}
            edges={edges}
            edgeParameterConfigs={edgeParameterConfigs}
          />
        )}
      </AnalysisDialog>
    </>
  )
}

export default UDMAnalysisButton
