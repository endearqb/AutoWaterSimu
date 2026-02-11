import { createFileRoute } from "@tanstack/react-router"
import { ReactFlowProvider } from "@xyflow/react"
import { useEffect, useMemo } from "react"
import "@xyflow/react/dist/style.css"

import type { NodeTypes } from "@xyflow/react"
import FlowCanvas from "../../components/Flow/FlowCanvas"
import type { DefaultNodeDataFactory } from "../../components/Flow/FlowCanvas"
import FlowInspector from "../../components/Flow/FlowInspector"
import FlowLayout from "../../components/Flow/FlowLayout"
import { UDMToolbarWrapper } from "../../components/Flow/ToolbarWrapper"
import SimulationPanel from "../../components/Flow/inspectorbar/SimulationPanel"
import UDMCalculationPanel from "../../components/Flow/inspectorbar/UDMCalculationPanel"
import UDMPropertyPanel from "../../components/Flow/inspectorbar/UDMPropertyPanel"
import UDMBubbleMenu from "../../components/Flow/menu/UDMBubbleMenu"
import DefaultNode from "../../components/Flow/nodes/DefaultNode"
import InputNode from "../../components/Flow/nodes/InputNode"
import OutputNode from "../../components/Flow/nodes/OutputNode"
import UDMNode from "../../components/Flow/nodes/UDMNode"
import { useI18n } from "../../i18n"
import { useThemePaletteStore } from "../../stores/themePaletteStore"
import { useUDMFlowStore } from "../../stores/udmFlowStore"
import { useUDMStore } from "../../stores/udmStore"

export const Route = createFileRoute("/_layout/udm")({
  component: UDMPage,
})

// 鍒涘缓甯︽湁store鐨勮妭鐐圭被鍨嬪伐鍘傚嚱鏁?
const createUDMNodeTypes = (store: () => any): NodeTypes => ({
  default: (props: any) => <DefaultNode {...props} store={store} />,
  input: (props: any) => <InputNode {...props} store={store} />,
  output: (props: any) => <OutputNode {...props} store={store} />,
  udm: (props: any) => <UDMNode {...props} store={store} />,
})

function UDMPage() {
  const { t, language } = useI18n()
  const udmDefaultNodeDataFactory = useMemo<DefaultNodeDataFactory>(() => {
    return (nodeType: string) => {
      switch (nodeType) {
        case "input":
          return { label: t("flow.node.input") }
        case "output":
          return { label: t("flow.node.output") }
        case "udm":
          return {
            label: "UDM",
            // 鍥哄畾鍙傛暟鐢?store 鑷姩娣诲姞锛屾棤闇€鍦ㄦ澶勫畾涔?
          }
        default:
          return { label: t("flow.node.default") }
      }
    }
  }, [language])
  const udmInspectorConfig = useMemo(
    () => ({
      nodeTabs: [
        {
          key: "parameters",
          label: t("flow.tab.parameters"),
          component: UDMPropertyPanel,
          props: { isNode: true },
        },
        {
          key: "calculation",
          label: t("flow.tab.calculation"),
          component: UDMCalculationPanel,
          props: { store: useUDMFlowStore },
        },
        {
          key: "simulation",
          label: t("flow.tab.simulation"),
          component: SimulationPanel,
          props: {
            store: useUDMFlowStore,
            modelStore: useUDMStore,
            modelType: "udm",
          },
        },
      ],
      edgePanel: {
        component: UDMPropertyPanel,
        props: { isNode: false },
      },
      defaultTab: "parameters",
    }),
    [language],
  )
  // 鉁?浣跨敤 useMemo 纭繚 nodeTypes 寮曠敤绋冲畾
  const udmNodeTypes = useMemo(() => createUDMNodeTypes(useUDMFlowStore), [])
  const themeStore = useThemePaletteStore()
  useEffect(() => {
    themeStore.applyStoredForModel("udm", [
      "udm",
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
            nodeTypes={udmNodeTypes}
            defaultNodeDataFactory={udmDefaultNodeDataFactory}
            store={useUDMFlowStore}
          />
        }
        inspector={
          <FlowInspector config={udmInspectorConfig} store={useUDMFlowStore} />
        }
        toolbar={(props) => (
          <UDMToolbarWrapper
            {...props}
            store={useUDMFlowStore}
            modelStore={useUDMStore}
          />
        )}
        BubbleMenuComponent={UDMBubbleMenu}
        store={useUDMFlowStore}
        simulationControlProps={{
          store: useUDMFlowStore,
          modelStore: useUDMStore,
          modelType: "udm",
        }}
      />
    </ReactFlowProvider>
  )
}

export default UDMPage
