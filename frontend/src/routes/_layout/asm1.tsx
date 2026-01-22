import { createFileRoute } from "@tanstack/react-router"
import { ReactFlowProvider } from "@xyflow/react"
import { useEffect, useMemo } from "react"
import "@xyflow/react/dist/style.css"

import type { NodeTypes } from "@xyflow/react"
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
import { useI18n } from "../../i18n"
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

function ASM1Page() {
  const { t, language } = useI18n()
  const asm1DefaultNodeDataFactory = useMemo<DefaultNodeDataFactory>(() => {
    return (nodeType: string) => {
      switch (nodeType) {
        case "input":
          return { label: t("flow.node.input") }
        case "output":
          return { label: t("flow.node.output") }
        case "asm1":
          return {
            label: t("flow.node.asm1"),
            // 固定参数由 store 自动添加，无需在此处定义
          }
        default:
          return { label: t("flow.node.default") }
      }
    }
  }, [language])
  const asm1InspectorConfig = useMemo(
    () => ({
      nodeTabs: [
        {
          key: "parameters",
          label: t("flow.tab.parameters"),
          component: ASM1PropertyPanel,
          props: { isNode: true },
        },
        {
          key: "calculation",
          label: t("flow.tab.calculation"),
          component: ASM1CalculationPanel,
          props: { store: useASM1FlowStore },
        },
        {
          key: "simulation",
          label: t("flow.tab.simulation"),
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
    }),
    [language],
  )
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
