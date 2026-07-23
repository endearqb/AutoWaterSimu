import { Button, HStack, IconButton, Menu, Portal } from "@chakra-ui/react"
import {
  Download,
  FilePlus,
  FolderOpen,
  Map as MapIcon,
  MoreHorizontal,
  Play,
  Save,
  ShieldCheck,
  Upload,
} from "lucide-react"
import { type ChangeEvent, useRef, useState } from "react"

import type { NetworkProcessGraphV1 } from "../contracts/generated"
import { useUdmV2Messages } from "../i18n"
import { validateNetworkProcessGraphContract } from "../serialize/contractValidation"
import { fromNetworkProcessGraphV1 } from "../serialize/fromNetworkProcessGraphV1"
import {
  stableStringify,
  toNetworkProcessGraphV1,
} from "../serialize/toNetworkProcessGraphV1"
import {
  graphStateFromStandalonePayload,
  isUdmV2StandalonePayload,
} from "../services/standaloneFlowchartAdapter"
import type { UdmV2GraphSummary } from "../services/standaloneFlowchartAdapter"
import { udmV2ComputeService } from "../services/udmV2ComputeService"
import { udmV2FlowchartService } from "../services/udmV2FlowchartService"
import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"
import { NetworkV2LoadDialog } from "./NetworkV2LoadDialog"

export function NetworkV2Toolbar() {
  const text = useUdmV2Messages()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loadOpen, setLoadOpen] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [loadingGraphs, setLoadingGraphs] = useState(false)
  const [graphs, setGraphs] = useState<UdmV2GraphSummary[]>([])
  const newGraph = useUdmV2FlowStore((state) => state.newGraph)
  const validateGraph = useUdmV2FlowStore((state) => state.validateGraph)
  const replaceGraph = useUdmV2FlowStore((state) => state.replaceGraph)
  const setCurrentGraph = useUdmV2FlowStore((state) => state.setCurrentGraph)
  const setRuntimeStatus = useUdmV2FlowStore((state) => state.setRuntimeStatus)
  const showMiniMap = useUdmV2FlowStore((state) => state.showMiniMap)
  const setShowMiniMap = useUdmV2FlowStore((state) => state.setShowMiniMap)

  const saveGraph = async (saveAs = false) => {
    const state = useUdmV2FlowStore.getState()
    setRuntimeStatus("saving")
    try {
      const summary =
        state.currentNetworkGraphId && !saveAs
          ? await udmV2FlowchartService.updateGraph(
              state.currentNetworkGraphId,
              {
                ...state,
                saveAs,
              },
            )
          : await udmV2FlowchartService.saveGraph({ ...state, saveAs })
      setCurrentGraph({
        id: summary.id,
        name: summary.name,
        version: summary.version,
      })
      setRuntimeStatus("idle")
    } catch {
      setRuntimeStatus("failed")
    }
  }

  const openLoadDialog = async () => {
    setLoadOpen(true)
    setLoadError(false)
    setLoadingGraphs(true)
    try {
      setGraphs(await udmV2FlowchartService.listGraphs())
    } catch {
      setLoadError(true)
    } finally {
      setLoadingGraphs(false)
    }
  }

  const loadGraph = async (selectedId: string) => {
    setRuntimeStatus("saving")
    try {
      const summary = graphs.find((graph) => graph.id === selectedId)
      const payload = await udmV2FlowchartService.loadGraph(selectedId)
      replaceGraph(
        graphStateFromStandalonePayload(payload, {
          id: selectedId,
          name: summary?.name,
          version: summary?.version,
        }),
      )
      setLoadOpen(false)
    } catch {
      setRuntimeStatus("failed")
    }
  }

  const exportJson = () => {
    const state = useUdmV2FlowStore.getState()
    setRuntimeStatus("validating")
    try {
      const graph = toNetworkProcessGraphV1({
        graphId: state.currentNetworkGraphId || "udm_network_v2_canvas",
        version: state.currentNetworkGraphVersion || 1,
        sourceCanvasGraphId: state.currentNetworkGraphId || undefined,
        nodes: state.nodes,
        edges: state.edges,
        flowConstraints: state.flowConstraints,
      })
      const report = validateNetworkProcessGraphContract(graph)
      if (report.status === "invalid") {
        throw new Error("UDM_V2_GRAPH_CONTRACT_INVALID")
      }
      downloadJson(
        graph,
        `${state.currentNetworkGraphId || "udm-network-v2"}.network-process-graph.v1.json`,
      )
      setRuntimeStatus("idle")
    } catch {
      setRuntimeStatus("failed")
    }
  }

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    if (!file) {
      return
    }
    setRuntimeStatus("validating")
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>
      if (isUdmV2StandalonePayload(parsed)) {
        replaceGraph(graphStateFromStandalonePayload(parsed, { id: null }))
        return
      }

      if (parsed.schema_version === "network_process_graph.v1") {
        const graph = parsed as NetworkProcessGraphV1
        const report = validateNetworkProcessGraphContract(graph)
        if (report.status === "invalid") {
          throw new Error("UDM_V2_GRAPH_CONTRACT_INVALID")
        }
        const canvas = fromNetworkProcessGraphV1(graph)
        replaceGraph({
          id: null,
          name: "Imported UDM Network v2",
          nodes: canvas.nodes,
          edges: canvas.edges,
          validationReport: report,
        })
        return
      }

      throw new Error("UDM_V2_IMPORT_SCHEMA_UNSUPPORTED")
    } catch {
      setRuntimeStatus("failed")
    }
  }

  const submitGraph = async () => {
    const state = useUdmV2FlowStore.getState()
    setRuntimeStatus("submitting")
    try {
      const snapshot = await udmV2ComputeService.submitNetwork(state)
      setRuntimeStatus(snapshot.runtimeStatus)
    } catch {
      setRuntimeStatus("failed")
    }
  }

  return (
    <>
      <HStack gap={2} flexWrap="wrap">
        <Button size="sm" variant="outline" onClick={() => saveGraph(false)}>
          <Save size={16} />
          {text.save}
        </Button>
        <input
          ref={fileInputRef}
          aria-label="Import UDM Network v2 JSON"
          hidden
          type="file"
          accept="application/json,.json"
          onChange={importJson}
        />
        <Button
          size="sm"
          variant="solid"
          colorPalette="blue"
          onClick={validateGraph}
        >
          <ShieldCheck size={16} />
          {text.validate}
        </Button>
        <Button
          size="sm"
          variant="solid"
          colorPalette="green"
          onClick={submitGraph}
        >
          <Play size={16} />
          {text.submit}
        </Button>
        <Menu.Root>
          <Menu.Trigger asChild>
            <IconButton
              aria-label={text.more}
              title={text.more}
              size="sm"
              variant="outline"
            >
              <MoreHorizontal size={16} />
            </IconButton>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content>
                <Menu.Item value="new" onClick={newGraph}>
                  <FilePlus size={15} /> {text.newGraph}
                </Menu.Item>
                <Menu.Item value="save-as" onClick={() => saveGraph(true)}>
                  <Save size={15} /> {text.saveAs}
                </Menu.Item>
                <Menu.Item value="load" onClick={openLoadDialog}>
                  <FolderOpen size={15} /> {text.load}
                </Menu.Item>
                <Menu.Item value="export" onClick={exportJson}>
                  <Download size={15} /> {text.exportJson}
                </Menu.Item>
                <Menu.Item
                  value="import"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={15} /> {text.importJson}
                </Menu.Item>
                <Menu.Item
                  value="minimap"
                  onClick={() => setShowMiniMap(!showMiniMap)}
                >
                  <MapIcon size={15} />
                  {showMiniMap ? text.hideMiniMap : text.showMiniMap}
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </HStack>
      <NetworkV2LoadDialog
        open={loadOpen}
        loading={loadingGraphs}
        error={loadError}
        graphs={graphs}
        onClose={() => setLoadOpen(false)}
        onLoad={loadGraph}
      />
    </>
  )
}

function downloadJson(value: unknown, fileName: string) {
  const blob = new Blob([stableStringify(value)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
