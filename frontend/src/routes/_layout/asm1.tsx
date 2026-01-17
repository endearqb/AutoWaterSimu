import { createFileRoute } from "@tanstack/react-router"
import { ReactFlowProvider } from "@xyflow/react"
import { useMemo } from "react"
import "@xyflow/react/dist/style.css"

import type { NodeTypes } from "@xyflow/react"
import { useEffect } from "react"
import FlowCanvas from "../../components/Flow/FlowCanvas"
import type { DefaultNodeDataFactory } from "../../components/Flow/FlowCanvas"
import FlowInspector from "../../components/Flow/FlowInspector"
import FlowLayout from "../../components/Flow/FlowLayout"
import { ASM1ToolbarWrapper } from "../../components/Flow/ToolbarWrapper"
import ASM1CalculationPanel from "../../components/Flow/inspectorbar/ASM1CalculationPanel"
import ASM1PropertyPanel from "../../components/Flow/inspectorbar/ASM1PropertyPanel"
import SimulationPanel from "../../components/Flow/inspectorbar/SimulationPanel"
import ASM1BubbleMenu from "../../components/Flow/menu/ASM1BubbleMenu"
import ASM1Node from "../../components/Flow/nodes/ASM1Node"
import DefaultNode from "../../components/Flow/nodes/DefaultNode"
import InputNode from "../../components/Flow/nodes/InputNode"
import OutputNode from "../../components/Flow/nodes/OutputNode"
import { useASM1FlowStore } from "../../stores/asm1FlowStore"
import { useASM1Store } from "../../stores/asm1Store"
import { useThemePaletteStore } from "../../stores/themePaletteStore"

export const Route = createFileRoute("/_layout/asm1")({
  component: ASM1Page,
})

// 创建带有store的节点类型工厂函数
const createASMNodeTypes = (store: () => any): NodeTypes => ({
  default: (props: any) => <DefaultNode {...props} store={store} />,
  input: (props: any) => <InputNode {...props} store={store} />,
  output: (props: any) => <OutputNode {...props} store={store} />,
  asm1: (props: any) => <ASM1Node {...props} store={store} />,
})

// 定义 ASM1 默认节点数据工厂函数
// 注意：ASM1 节点的固定参数现在由 useASM1FlowStore 的 addNode 函数自动添加
const asm1DefaultNodeDataFactory: DefaultNodeDataFactory = (
  nodeType: string,
) => {
  switch (nodeType) {
    case "input":
      return { label: "进水端" }
    case "output":
      return { label: "出水端" }
    case "asm1":
      return {
        label: "ASM1节点",
        // 固定参数由 store 自动添加，无需在此处定义
      }
    default:
      return { label: "默认节点" }
  }
}

// 定义 ASM1 检查器配置
const asm1InspectorConfig = {
  nodeTabs: [
    {
      key: "parameters",
      label: "参数设置",
      component: ASM1PropertyPanel,
      props: { isNode: true },
    },
    {
      key: "calculation",
      label: "计算参数",
      component: ASM1CalculationPanel,
      props: { store: useASM1FlowStore },
    },
    {
      key: "simulation",
      label: "模拟计算",
      component: SimulationPanel,
      props: {
        store: useASM1FlowStore,
        modelStore: useASM1Store,
        modelType: "asm1",
      },
    },
  ],
  edgePanel: {
    component: ASM1PropertyPanel,
    props: { isNode: false },
  },
  defaultTab: "parameters",
}

function ASM1Page() {
  // ✅ 使用 useMemo 确保 nodeTypes 引用稳定
  const asm1NodeTypes = useMemo(() => createASMNodeTypes(useASM1FlowStore), [])
  const themeStore = useThemePaletteStore()
  useEffect(() => {
    themeStore.applyStoredForModel("asm1", [
      "asm1",
      "input",
      "output",
      "default",
      "asm3",
      "asmslim",
    ])
  }, [])

  return (
    <ReactFlowProvider>
      <FlowLayout
        canvas={
          <FlowCanvas
            nodeTypes={asm1NodeTypes}
            defaultNodeDataFactory={asm1DefaultNodeDataFactory}
            store={useASM1FlowStore}
          />
        }
        inspector={
          <FlowInspector
            config={asm1InspectorConfig}
            store={useASM1FlowStore}
          />
        }
        toolbar={(props) => (
          <ASM1ToolbarWrapper
            {...props}
            store={useASM1FlowStore}
            modelStore={useASM1Store}
          />
        )}
        BubbleMenuComponent={ASM1BubbleMenu}
        store={useASM1FlowStore}
        simulationControlProps={{
          store: useASM1FlowStore,
          modelStore: useASM1Store,
          modelType: "asm1",
        }}
      />
    </ReactFlowProvider>
  )
}

export default ASM1Page
