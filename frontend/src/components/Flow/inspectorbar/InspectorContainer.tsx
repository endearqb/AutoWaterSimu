import { Box, Heading, Text } from "@chakra-ui/react"
import useFlowStore from "../../../stores/flowStore"
import type { RFState } from "../../../stores/flowStore"
import PropertyPanel from "./PropertyPanel"

interface InspectorContainerProps {
  store?: () => RFState // 可选的自定义 store
}

function InspectorContainer({}: InspectorContainerProps = {}) {
  const { selectedNode, selectedEdge } = useFlowStore()

  // 如果没有选中任何元素
  const renderContent = () => {
    if (!selectedNode && !selectedEdge) {
      return (
        <Box>
          <Heading size="md" mb={4}>
            属性检查器
          </Heading>
          <Text color="gray.500">请选择一个节点或连接线查看其属性</Text>
        </Box>
      )
    }

    // 显示节点属性
    if (selectedNode) {
      return (
        <Box>
          <PropertyPanel isNode={true} />
        </Box>
      )
    }

    // 显示连接线属性
    if (selectedEdge) {
      return (
        <Box>
          <Heading size="md" mb={4}>
            连接参数设置
          </Heading>
          <PropertyPanel isNode={false} />
        </Box>
      )
    }

    return null
  }

  return renderContent()
}

export default InspectorContainer
