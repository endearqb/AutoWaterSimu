import { Button, HStack } from "@chakra-ui/react"
import { Download, FilePlus, FolderOpen, Play, Save, ShieldCheck, Upload } from "lucide-react"
import { useRef, type ChangeEvent } from "react"

import type { NetworkProcessGraphV1 } from "../contracts/generated"
import { fromNetworkProcessGraphV1 } from "../serialize/fromNetworkProcessGraphV1"
import { validateNetworkProcessGraphContract } from "../serialize/contractValidation"
import { stableStringify, toNetworkProcessGraphV1 } from "../serialize/toNetworkProcessGraphV1"
import {
  graphStateFromStandalonePayload,
  isUdmV2StandalonePayload,
} from "../services/standaloneFlowchartAdapter"
import { udmV2ComputeService } from "../services/udmV2ComputeService"
import { udmV2FlowchartService } from "../services/udmV2FlowchartService"
import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"

export function NetworkV2Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const newGraph = useUdmV2FlowStore((state) => state.newGraph)
  const validateGraph = useUdmV2FlowStore((state) => state.validateGraph)
  const replaceGraph = useUdmV2FlowStore((state) => state.replaceGraph)
  const setCurrentGraph = useUdmV2FlowStore((state) => state.setCurrentGraph)
  const setRuntimeStatus = useUdmV2FlowStore((state) => state.setRuntimeStatus)

  const saveGraph = async (saveAs = false) => {
    const state = useUdmV2FlowStore.getState()
    setRuntimeStatus("saving")
    try {
      const summary = state.currentNetworkGraphId && !saveAs
        ? await udmV2FlowchartService.updateGraph(state.currentNetworkGraphId, {
            ...state,
            saveAs,
          })
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

  const loadGraph = async () => {
    setRuntimeStatus("saving")
    try {
      const graphs = await udmV2FlowchartService.listGraphs()
      if (graphs.length === 0) {
        setRuntimeStatus("idle")
        return
      }
      const selectedId = window.prompt(
        graphs.map((graph) => `${graph.id} - ${graph.name}`).join("\n"),
        graphs[0].id,
      )
      if (!selectedId) {
        setRuntimeStatus("idle")
        return
      }
      const summary = graphs.find((graph) => graph.id === selectedId.trim())
      const payload = await udmV2FlowchartService.loadGraph(selectedId.trim())
      replaceGraph(
        graphStateFromStandalonePayload(payload, {
          id: selectedId.trim(),
          name: summary?.name,
          version: summary?.version,
        }),
      )
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
    <HStack gap={2} flexWrap="wrap">
      <Button size="sm" variant="outline" onClick={newGraph}>
        <FilePlus size={16} />
        New
      </Button>
      <Button size="sm" variant="outline" onClick={() => saveGraph(false)}>
        <Save size={16} />
        Save
      </Button>
      <Button size="sm" variant="outline" onClick={() => saveGraph(true)}>
        <Save size={16} />
        Save As
      </Button>
      <Button size="sm" variant="outline" onClick={loadGraph}>
        <FolderOpen size={16} />
        Load
      </Button>
      <Button size="sm" variant="outline" onClick={exportJson}>
        <Download size={16} />
        Export JSON
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={16} />
        Import JSON
      </Button>
      <input
        ref={fileInputRef}
        aria-label="Import UDM Network v2 JSON"
        hidden
        type="file"
        accept="application/json,.json"
        onChange={importJson}
      />
      <Button size="sm" variant="solid" colorPalette="blue" onClick={validateGraph}>
        <ShieldCheck size={16} />
        Validate
      </Button>
      <Button size="sm" variant="solid" colorPalette="green" onClick={submitGraph}>
        <Play size={16} />
        Submit
      </Button>
    </HStack>
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
