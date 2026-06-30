export type NetworkV2EdgeKind = "hydraulic" | "pump" | "settling" | "signal"

export type NetworkV2ReactFlowEdgeType =
  | "hydraulic_v2"
  | "pump_v2"
  | "settling_v2"
  | "signal_v2"

export type NetworkV2ComponentPolicy = {
  mode: "all" | "include" | "exclude"
  include: string[]
  exclude: string[]
}

export type NetworkV2FlowSpec = {
  mode:
    | "fixed"
    | "balanced"
    | "split_fraction"
    | "ratio_to_edge"
    | "residual"
    | "controlled"
    | "timeseries"
  value?: number
  unit?: string
  reference_edge_id?: string
  ratio?: number
  min?: number
  max?: number
  timeseries_ref?: string
  control_signal?: string
}

export type NetworkV2PumpSpec = {
  head_m?: number
  efficiency?: number
  energy_enabled?: boolean
  min_flow?: number
  max_flow?: number
}

export type NetworkV2TransportModel = {
  model_id: string
  parameters?: Record<string, number | string | boolean>
}

export type NetworkV2SignalSpec = {
  signal_name: string
  source_expression?: string
  target_binding?: string
  sample_period_days?: number
  delay_days?: number
  hold?: "zero_order"
  unit?: string
}

export type NetworkV2EdgeData = {
  edge_kind: NetworkV2EdgeKind
  component_policy: NetworkV2ComponentPolicy
  stream_adapter?: Record<string, unknown> | null
  flow_spec?: NetworkV2FlowSpec
  transport_model?: NetworkV2TransportModel | null
  pump?: NetworkV2PumpSpec
  signal_spec?: NetworkV2SignalSpec
  ui?: {
    label?: string
    diagnostics?: string[]
  }
}

export const NETWORK_V2_EDGE_KINDS: NetworkV2EdgeKind[] = [
  "hydraulic",
  "pump",
  "settling",
  "signal",
]

export const DEFAULT_NETWORK_V2_EDGE_KIND: NetworkV2EdgeKind = "hydraulic"

export const networkV2EdgeTypeByKind: Record<
  NetworkV2EdgeKind,
  NetworkV2ReactFlowEdgeType
> = {
  hydraulic: "hydraulic_v2",
  pump: "pump_v2",
  settling: "settling_v2",
  signal: "signal_v2",
}

export const NETWORK_V2_EDGE_KIND_OPTIONS: Array<{
  kind: NetworkV2EdgeKind
  label: string
  shortLabel: string
}> = [
  { kind: "hydraulic", label: "Hydraulic", shortLabel: "Hyd" },
  { kind: "pump", label: "Pump", shortLabel: "Pump" },
  { kind: "settling", label: "Settling", shortLabel: "Settle" },
  { kind: "signal", label: "Signal", shortLabel: "Signal" },
]

const basePolicy = (): NetworkV2ComponentPolicy => ({
  mode: "all",
  include: [],
  exclude: [],
})

const solidsPolicy = (): NetworkV2ComponentPolicy => ({
  mode: "include",
  include: ["X_TSS"],
  exclude: [],
})

const signalPolicy = (): NetworkV2ComponentPolicy => ({
  mode: "exclude",
  include: [],
  exclude: [],
})

const fixedFlow = (): NetworkV2FlowSpec => ({
  mode: "fixed",
  unit: "m3/d",
  value: 0,
})

export const normalizeNetworkV2EdgeKind = (
  value: unknown,
): NetworkV2EdgeKind =>
  NETWORK_V2_EDGE_KINDS.includes(value as NetworkV2EdgeKind)
    ? (value as NetworkV2EdgeKind)
    : DEFAULT_NETWORK_V2_EDGE_KIND

export function createNetworkV2EdgeData(
  kind: NetworkV2EdgeKind = DEFAULT_NETWORK_V2_EDGE_KIND,
): NetworkV2EdgeData {
  if (kind === "pump") {
    return {
      edge_kind: kind,
      component_policy: basePolicy(),
      stream_adapter: null,
      flow_spec: fixedFlow(),
      pump: {
        efficiency: 0.75,
        energy_enabled: true,
        head_m: 2,
        max_flow: 1200,
        min_flow: 0,
      },
      transport_model: null,
    }
  }

  if (kind === "settling") {
    return {
      edge_kind: kind,
      component_policy: solidsPolicy(),
      stream_adapter: null,
      transport_model: {
        model_id: "takacs_settling.v1",
        parameters: {
          area_m2: 1500,
          v0_m_per_day: 250,
        },
      },
    }
  }

  if (kind === "signal") {
    return {
      edge_kind: kind,
      component_policy: signalPolicy(),
      stream_adapter: null,
      signal_spec: {
        delay_days: 0,
        hold: "zero_order",
        sample_period_days: 0.01,
        signal_name: "signal",
        source_expression: "",
        unit: "",
      },
    }
  }

  return {
    edge_kind: "hydraulic",
    component_policy: basePolicy(),
    stream_adapter: null,
    flow_spec: fixedFlow(),
    transport_model: null,
  }
}

export function isNetworkV2EdgeTypeKindMatch(args: {
  edgeKind: NetworkV2EdgeKind
  edgeType?: string
}) {
  return networkV2EdgeTypeByKind[args.edgeKind] === args.edgeType
}
