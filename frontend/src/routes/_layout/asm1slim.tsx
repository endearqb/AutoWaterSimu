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
import { useI18n } from "../../i18n"
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

function ASM1SlimPage() {
  const { t, language } = useI18n()
  const asm1slimDefaultNodeDataFactory = useMemo<DefaultNodeDataFactory>(() => {
    return (nodeType: string) => {
      switch (nodeType) {
        case "input":
          return { label: t("flow.node.input") }
        case "output":
          return { label: t("flow.node.output") }
        case "asmslim":
          return {
            label: t("flow.node.asm1slim"),
            // 固定参数由 store 自动添加，无需在此处定义
          }
        case "custom":
          return { label: t("flow.node.custom") }
        default:
          return { label: t("flow.node.default") }
      }
    }
  }, [language])
  const asm1slimInspectorConfig = useMemo(
    () => ({
      nodeTabs: [
        {
          key: "parameters",
          label: t("flow.tab.parameters"),
          component: ASM1SlimPropertyPanel,
          props: { isNode: true },
        },
        {
          key: "calculation",
          label: t("flow.tab.calculation"),
          component: ASM1SlimCalculationPanel,
          props: { store: useASM1SlimFlowStore },
        },
        {
          key: "simulation",
          label: t("flow.tab.simulation"),
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
    }),
    [language],
  )
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
