import { createFileRoute } from "@tanstack/react-router"
import { ReactFlowProvider } from "@xyflow/react"
import { useEffect, useMemo } from "react"
import "@xyflow/react/dist/style.css"

import FlowCanvas from "../../components/Flow/FlowCanvas"
import FlowInspector from "../../components/Flow/FlowInspector"
import FlowLayout from "../../components/Flow/FlowLayout"
import { ToolbarWrapper } from "../../components/Flow/ToolbarWrapper"
import PropertyPanel from "../../components/Flow/inspectorbar/PropertyPanel"
import MaterialBalanceBubbleMenu from "../../components/Flow/menu/MaterialBalanceBubbleMenu"

import type { NodeTypes } from "@xyflow/react"
import type { DefaultNodeDataFactory } from "../../components/Flow/FlowCanvas"
import SimulationPanel from "../../components/Flow/inspectorbar/SimulationPanel"
import DefaultNode from "../../components/Flow/nodes/DefaultNode"
import InputNode from "../../components/Flow/nodes/InputNode"
import OutputNode from "../../components/Flow/nodes/OutputNode"
import { useI18n } from "../../i18n"
import useFlowStore from "../../stores/flowStore"
import { useMaterialBalanceStore } from "../../stores/materialBalanceStore"
import { useThemePaletteStore } from "../../stores/themePaletteStore"

export const Route = createFileRoute("/_layout/materialbalance")({
  component: MaterialBalancePage,
})

// 创建带有store的节点类型工厂函数
const createNodeTypes = (store: () => any): NodeTypes => ({
  default: (props: any) => <DefaultNode {...props} store={store} />,
  input: (props: any) => <InputNode {...props} store={store} />,
  output: (props: any) => <OutputNode {...props} store={store} />,
})

function MaterialBalancePage() {
  const { t, language } = useI18n()
  const defaultNodeDataFactory = useMemo<DefaultNodeDataFactory>(() => {
    return (nodeType: string) => {
      switch (nodeType) {
        case "input":
          return { label: t("flow.node.input") }
        case "output":
          return { label: t("flow.node.output") }
        default:
          return { label: t("flow.node.default") }
      }
    }
  }, [language])
  const inspectorConfig = useMemo(
    () => ({
      nodeTabs: [
        {
          key: "parameters",
          label: t("flow.tab.parameters"),
          component: PropertyPanel,
          props: { isNode: true },
        },
        {
          key: "simulation",
          label: t("flow.tab.simulation"),
          component: SimulationPanel,
          props: {
            store: useFlowStore,
            modelStore: useMaterialBalanceStore,
            modelType: "materialBalance",
          },
        },
      ],
      edgePanel: {
        component: PropertyPanel,
        props: { isNode: false },
      },
      defaultTab: "parameters",
    }),
    [language],
  )
  // ✅ 使用 useMemo 确保 nodeTypes 引用稳定
  const nodeTypes = useMemo(() => createNodeTypes(useFlowStore), [])
  const themeStore = useThemePaletteStore()
  useEffect(() => {
    themeStore.applyStoredForModel("materialBalance", [
      "default",
      "input",
      "output",
      "asm1",
      "asm3",
      "asmslim",
    ])
  }, [])

  return (
    <ReactFlowProvider>
      <FlowLayout
        canvas={
          <FlowCanvas
            nodeTypes={nodeTypes}
            defaultNodeDataFactory={defaultNodeDataFactory}
            store={useFlowStore}
          />
        }
        inspector={
          <FlowInspector config={inspectorConfig} store={useFlowStore} />
        }
        toolbar={(props) => (
          <ToolbarWrapper
            {...props}
            store={useFlowStore}
            modelStore={useMaterialBalanceStore}
          />
        )}
        BubbleMenuComponent={MaterialBalanceBubbleMenu}
        store={useFlowStore}
        simulationControlProps={{
          store: useFlowStore,
          modelStore: useMaterialBalanceStore,
          modelType: "materialBalance",
        }}
      />
    </ReactFlowProvider>
  )
}

export default MaterialBalancePage
