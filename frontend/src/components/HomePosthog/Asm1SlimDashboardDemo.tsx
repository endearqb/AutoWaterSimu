import { Box } from "@chakra-ui/react"

import ASM1SlimAnalyzer from "@/components/Flow/legacy-analysis/ASM1SlimAnalyzer"
import { SAMPLE_ASM1SLIM_RESULT } from "@/features/posthogDemo/sampleAsm1SlimResult"

export function Asm1SlimDashboardDemo() {
  return (
    <Box w="full" h="full" bg="white" overflow="auto">
      <ASM1SlimAnalyzer resultData={SAMPLE_ASM1SLIM_RESULT} />
    </Box>
  )
}
