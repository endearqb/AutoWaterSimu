import { createFileRoute } from "@tanstack/react-router"
import { ReactFlowProvider } from "@xyflow/react"
import { useEffect, useMemo } from "react"
import "@xyflow/react/dist/style.css"

import type { NodeTypes } from "@xyflow/react"
import FlowCanvas from "../../components/Flow/FlowCanvas"
import type { DefaultNodeDataFactory } from "../../components/Flow/FlowCanvas"
import FlowInspector from "../../components/Flow/FlowInspector"
import FlowLayout from "../../components/Flow/FlowLayout"
import { ASM1SlimToolbarWrapper } from "../../components/Flow/ToolbarWrapper"
import ASM1SlimCalculationPanel from "../../components/Flow/inspectorbar/ASM1SlimCalculationPanel"
import ASM1SlimPropertyPanel from "../../components/Flow/inspectorbar/ASM1SlimPropertyPanel"
import SimulationPanel from "../../components/Flow/inspectorbar/SimulationPanel"
import ASM1SlimBubbleMenu from "../../components/Flow/menu/ASM1SlimBubbleMenu"
import ASMslimNode from "../../components/Flow/nodes/ASMslimNode"
import DefaultNode from "../../components/Flow/nodes/DefaultNode"
import InputNode from "../../components/Flow/nodes/InputNode"
import OutputNode from "../../components/Flow/nodes/OutputNode"
import { useASM1SlimFlowStore } from "../../stores/asm1slimFlowStore"
import { useASM1SlimStore } from "../../stores/asm1slimStore"
import { useThemePaletteStore } from "../../stores/themePaletteStore"

export const Route = createFileRoute("/_layout/asm1slim")({
  component: ASM1SlimPage,
})

// 创建带有store的节点类型工厂函数
const createASM1SlimNodeTypes = (store: () => any): NodeTypes => ({
  default: (props: any) => <DefaultNode {...props} store={store} />,
  input: (props: any) => <InputNode {...props} store={store} />,
  output: (props: any) => <OutputNode {...props} store={store} />,
  asmslim: (props: any) => <ASMslimNode {...props} store={store} />,
})

// 定义 ASM1Slim 默认节点数据工厂函数
// 注意：ASM1slim 节点的固定参数现在由 useASM1SlimFlowStore 的 addNode 函数自动添加
const asm1slimDefaultNodeDataFactory: DefaultNodeDataFactory = (
  nodeType: string,
) => {
  switch (nodeType) {
    case "input":
      return { label: "进水端" }
    case "output":
      return { label: "出水端" }
    case "asmslim":
      return {
        label: "ASM1slim",
        // 固定参数由 store 自动添加，无需在此处定义
      }
    case "custom":
      return { label: "自定义节点" }
    default:
      return { label: "默认节点" }
  }
}

// 定义 ASM1Slim 检查器配置
const asm1slimInspectorConfig = {
  nodeTabs: [
    {
      key: "parameters",
      label: "参数设置",
      component: ASM1SlimPropertyPanel,
      props: { isNode: true },
    },
    {
      key: "calculation",
      label: "计算参数",
      component: ASM1SlimCalculationPanel,
      props: { store: useASM1SlimFlowStore },
    },
    {
      key: "simulation",
      label: "模拟计算",
      component: SimulationPanel,
      props: {
        store: useASM1SlimFlowStore,
        modelStore: useASM1SlimStore,
        modelType: "asm1slim",
      },
    },
  ],
  edgePanel: {
    component: ASM1SlimPropertyPanel,
    props: { isNode: false },
  },
  defaultTab: "parameters",
}

function ASM1SlimPage() {
  // ✅ 使用 useMemo 确保 nodeTypes 引用稳定
  const asm1slimNodeTypes = useMemo(
    () => createASM1SlimNodeTypes(useASM1SlimFlowStore),
    [],
  )
  const themeStore = useThemePaletteStore()
  useEffect(() => {
    themeStore.applyStoredForModel("asm1slim", [
      "asmslim",
      "input",
      "output",
      "default",
      "asm1",
      "asm3",
    ])
  }, [])

  return (
    <ReactFlowProvider>
      <FlowLayout
        canvas={
          <FlowCanvas
            nodeTypes={asm1slimNodeTypes}
            defaultNodeDataFactory={asm1slimDefaultNodeDataFactory}
            store={useASM1SlimFlowStore}
          />
        }
        inspector={
          <FlowInspector
            config={asm1slimInspectorConfig}
            store={useASM1SlimFlowStore}
          />
        }
        toolbar={(props) => (
          <ASM1SlimToolbarWrapper
            {...props}
            store={useASM1SlimFlowStore}
            modelStore={useASM1SlimStore}
          />
        )}
        BubbleMenuComponent={ASM1SlimBubbleMenu}
        store={useASM1SlimFlowStore}
        simulationControlProps={{
          store: useASM1SlimFlowStore,
          modelStore: useASM1SlimStore,
          modelType: "asm1slim",
        }}
      />
    </ReactFlowProvider>
  )
}

export default ASM1SlimPage
