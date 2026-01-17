import { Box, Heading, Text } from "@chakra-ui/react"
import { Tabs } from "@chakra-ui/react"
import type React from "react"
import useFlowStore from "../../stores/flowStore"

// 标签页配置接口
interface TabConfig {
  key: string
  label: string
  component: React.ComponentType<any>
  props?: Record<string, any>
}

// 检查器配置接口
interface InspectorConfig {
  // 节点选中时显示的标签页
  nodeTabs: TabConfig[]
  // 边选中时显示的面板组件
  edgePanel: {
    component: React.ComponentType<any>
    props?: Record<string, any>
  }
  // 默认选中的标签页
  defaultTab?: string
  // 自定义标题
  title?: string
  // 空状态提示文本
  emptyStateText?: string
}

interface FlowInspectorProps {
  config: InspectorConfig
  store?: () => any // 可选的自定义 store
}

const FlowInspector = ({ config, store }: FlowInspectorProps) => {
  const flowStore = store || useFlowStore
  const { selectedNode, selectedEdge } = flowStore()

  const {
    nodeTabs,
    edgePanel,
    defaultTab,
    title = "属性检查器",
    emptyStateText = "请选择一个节点或连接线查看其属性",
  } = config

  // 如果没有选中任何元素
  const renderContent = () => {
    if (!selectedNode && !selectedEdge) {
      return (
        <Box>
          <Heading size="md" mb={4}>
            {title}
          </Heading>
          <Text color="gray.500">{emptyStateText}</Text>
        </Box>
      )
    }

    // 显示节点属性
    if (selectedNode) {
      // 如果只有一个标签页，直接显示内容
      if (nodeTabs.length === 1) {
        const tab = nodeTabs[0]
        const Component = tab.component
        return (
          <Box>
            <Heading size="md" mb={4}>
              {tab.label}
            </Heading>
            <Component {...(tab.props || {})} store={flowStore} />
          </Box>
        )
      }

      // 多个标签页时使用 Tabs 组件
      const defaultTabValue = defaultTab || nodeTabs[0]?.key

      return (
        <Box>
          <Tabs.Root defaultValue={defaultTabValue} variant="enclosed">
            <Tabs.List mb={4}>
              {nodeTabs.map((tab) => (
                <Tabs.Trigger key={tab.key} value={tab.key}>
                  {tab.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            {nodeTabs.map((tab) => {
              const Component = tab.component
              return (
                <Tabs.Content key={tab.key} value={tab.key}>
                  <Component {...(tab.props || {})} store={flowStore} />
                </Tabs.Content>
              )
            })}
          </Tabs.Root>
        </Box>
      )
    }

    // 显示连接线属性
    if (selectedEdge) {
      const EdgeComponent = edgePanel.component
      return (
        <Box>
          <Heading size="md" mb={4}>
            连接参数设置
          </Heading>
          <EdgeComponent {...(edgePanel.props || {})} store={flowStore} />
        </Box>
      )
    }

    return null
  }

  return renderContent()
}

export default FlowInspector
export type { TabConfig, InspectorConfig }
