import { Box, Text, VStack } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { ReactFlowProvider } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import Canvas from "../components/Flow/Canvas"
import Layout from "../components/Flow/Layout"
import InspectorContainer from "../components/Flow/inspectorbar/InspectorContainer"
import { MiddayHead } from "../components/Landing"

export const Route = createFileRoute("/openflow")({
  component: FlowPage,
})

function FlowPage() {
  return (
    <Box minH="100vh">
      <MiddayHead />
      <ReactFlowProvider>
        <Box position="relative" overflow="hidden" maxH="100%">
          <Layout canvas={<Canvas />} inspector={<InspectorContainer />} />

          {/* 左侧说明文字水印 - 仅在openflow页面显示 */}
          <Box
            position="absolute"
            left="20px"
            top="20px"
            zIndex={100}
            pointerEvents="none"
            opacity={0.6}
          >
            <VStack align="start" gap={2}>
              <Text
                fontSize="sm"
                color="gray.600"
                fontWeight="medium"
                bg="white"
                px={3}
                py={2}
                borderRadius="md"
                boxShadow="sm"
                border="1px"
                borderColor="gray.200"
              >
                💡 使用说明
              </Text>
              <VStack align="start" gap={1} ml={2}>
                {[
                  "拖拽左侧工具栏组件到画布创建节点",
                  "靠近节点边缘连接节点创建连接线",
                  "单击节点或连接线在右侧设置参数",
                  "双击节点或连接线可设置节点名和流量",
                  "计算需登录后执行，可本地导出保存",
                  "导出后的文件可使用本地导入",
                  "暂时不提供登录计算功能",
                  "暂时不提供在线保存功能",
                  "暂时不提供在线加载功能",
                  "暂时不提供加载计算数据功能",
                  "选中后使用键盘Delete键删除",
                ].map((text, index) => (
                  <Text
                    key={index}
                    fontSize="xs"
                    color="gray.500"
                    bg="white"
                    px={2}
                    py={1}
                    borderRadius="sm"
                    boxShadow="xs"
                  >
                    • {text}
                  </Text>
                ))}
              </VStack>
            </VStack>
          </Box>
        </Box>
      </ReactFlowProvider>
    </Box>
  )
}

export default FlowPage
