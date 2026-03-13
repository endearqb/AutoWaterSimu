import { createFileRoute } from "@tanstack/react-router"
import { ReactFlowProvider } from "@xyflow/react"
import { useEffect, useMemo } from "react"
import { z } from "zod"
import "@xyflow/react/dist/style.css"

import type { NodeTypes } from "@xyflow/react"
import FlowCanvas from "../../components/Flow/FlowCanvas"
import type { DefaultNodeDataFactory } from "../../components/Flow/FlowCanvas"
import FlowInspector from "../../components/Flow/FlowInspector"
import FlowLayout from "../../components/Flow/FlowLayout"
import { UDMToolbarWrapper } from "../../components/Flow/ToolbarWrapper"
import { INSPECTOR_PANEL_WIDTH } from "../../components/Flow/inspectorbar/BaseInspectorContainer"
import SimulationPanel from "../../components/Flow/inspectorbar/SimulationPanel"
import UDMCalculationPanel from "../../components/Flow/inspectorbar/UDMCalculationPanel"
import UDMPropertyPanel from "../../components/Flow/inspectorbar/UDMPropertyPanel"
import UDMBubbleMenu from "../../components/Flow/menu/UDMBubbleMenu"
import TutorialGuideTabPanel from "../../components/UDM/tutorial/TutorialGuideTabPanel"
import TutorialResultsPanel from "../../components/UDM/tutorial/TutorialResultsPanel"
import DefaultNode from "../../components/Flow/nodes/DefaultNode"
import InputNode from "../../components/Flow/nodes/InputNode"
import OutputNode from "../../components/Flow/nodes/OutputNode"
import UDMNode from "../../components/Flow/nodes/UDMNode"
import { useI18n } from "../../i18n"
import { useThemePaletteStore } from "../../stores/themePaletteStore"
import { useUDMFlowStore } from "../../stores/udmFlowStore"
import { useUDMStore } from "../../stores/udmStore"
import { useUdmTutorialFlowStore } from "../../stores/udmTutorialFlowStore"
import {
  buildBoundUdmNodeData,
  type BoundUdmModelSource,
  extractBoundUdmModelSource,
} from "../../utils/udmNodeBinding"

const searchSchema = z.object({
  lessonKey: z.string().optional().catch(undefined),
  flowchartId: z.string().optional().catch(undefined),
})

export const Route = createFileRoute("/_layout/udm")({
  component: UDMPage,
  validateSearch: (search) => searchSchema.parse(search),
})

const createUDMNodeTypes = (store: () => any): NodeTypes => ({
  default: (props: any) => <DefaultNode {...props} store={store} />,
  input: (props: any) => <InputNode {...props} store={store} />,
  output: (props: any) => <OutputNode {...props} store={store} />,
  udm: (props: any) => <UDMNode {...props} store={store} />,
})

function UDMPage() {
  const { t, language } = useI18n()
  const { lessonKey, flowchartId } = Route.useSearch()
  const setTutorialLessonKey = useUdmTutorialFlowStore(
    (s) => s.setTutorialLessonKey,
  )

  // Sync lessonKey from URL into tutorial flow store
  useEffect(() => {
    setTutorialLessonKey(lessonKey ?? null)
    return () => setTutorialLessonKey(null)
  }, [lessonKey, setTutorialLessonKey])

  // Auto-reload flowchart from URL param on refresh
  useEffect(() => {
    if (!flowchartId) return
    const store = useUDMFlowStore.getState()
    if (store.currentFlowChartId) return
    store.loadFlowChart(flowchartId)
  }, [flowchartId])

  const udmDefaultNodeDataFactory = useMemo<DefaultNodeDataFactory>(() => {
    return (nodeType: string) => {
      switch (nodeType) {
        case "input":
          return { label: t("flow.node.input") }
        case "output":
          return { label: t("flow.node.output") }
        case "udm": {
          const label = t("flow.node.udm")
          const nodes = useUDMFlowStore.getState().nodes
          const uniqueModelSources = new Map<string, BoundUdmModelSource>()

          nodes.forEach((node) => {
            if (node.type !== "udm") return
            const source = extractBoundUdmModelSource(
              (node.data as Record<string, unknown> | undefined) || undefined,
            )
            if (!source) return
            uniqueModelSources.set(`${source.id}@${source.version}`, source)
          })

          if (uniqueModelSources.size === 1) {
            const model = Array.from(uniqueModelSources.values())[0]
            if (model) {
              return buildBoundUdmNodeData({ label, model })
            }
          }

          return { label }
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
        ...(lessonKey
          ? [
              {
                key: "tutorialGuide",
                label: t("flow.tab.tutorialGuide"),
                component: TutorialGuideTabPanel,
                props: {
                  lessonKey,
                },
              },
              {
                key: "tutorialResults",
                label: t("flow.tab.tutorialResults"),
                component: TutorialResultsPanel,
                props: {
                  lessonKey,
                  store: useUDMFlowStore,
                  modelStore: useUDMStore,
                },
              },
            ]
          : []),
      ],
      edgePanel: {
        component: UDMPropertyPanel,
        props: { isNode: false },
      },
      defaultTab: "parameters",
    }),
    [language, lessonKey],
  )

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
        inspectorBaseWidth={
          lessonKey ? Math.round(INSPECTOR_PANEL_WIDTH * 1.3) : undefined
        }
      />
    </ReactFlowProvider>
  )
}

export default UDMPage
