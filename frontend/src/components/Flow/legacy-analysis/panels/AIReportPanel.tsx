import { Card, Text, VStack } from "@chakra-ui/react"
import type React from "react"
import type { ASM1ResultData } from "../asm1-analysis"

interface AIReportPanelProps {
  resultData?: ASM1ResultData
  modelType?: "asm1" | "asm1slim" | "asm3" // 添加模型类型参数
}

const AIReportPanel: React.FC<AIReportPanelProps> = () => {
  return (
    <Card.Root>
      {/* <Card.Header>
        <Card.Title>AI报告</Card.Title>
      </Card.Header> */}
      <Card.Body>
        <VStack align="center" justify="center" h="400px" gap={4}>
          <Text fontSize="xl" color="gray.500" textAlign="center">
            🤖 AI智能分析报告
          </Text>
          <Text fontSize="lg" color="gray.400" textAlign="center">
            待开发，敬请期待
          </Text>
          <Text fontSize="sm" color="gray.300" textAlign="center">
            即将为您提供基于ASM1模型的智能分析和优化建议
          </Text>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

export default AIReportPanel
