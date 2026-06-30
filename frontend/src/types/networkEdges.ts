// Deprecated: UDM-v2 frontend owns its edge model under
// frontend/src/features/udm-v2/edges/edgeModel.ts. Keep this file only for
// legacy Flow migration cleanup until PFC-A/PFC-B removes v1 pollution.
export type NetworkEdgeKind = "hydraulic" | "pump" | "settling" | "signal"

export type NetworkComponentPolicy = {
  mode: "all" | "include" | "exclude"
  include: string[]
  exclude: string[]
}

export type NetworkFlowSpec = {
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

export type NetworkPumpSpec = {
  head_m?: number
  efficiency?: number
  energy_enabled?: boolean
  min_flow?: number
  max_flow?: number
}

export type NetworkTransportModel = {
  model_id: string
  parameters?: Record<string, number | string | boolean>
}

export type NetworkSignalSpec = {
  signal_name: string
  source_expression?: string
  target_binding?: string
  sample_period_days?: number
  delay_days?: number
  hold?: "zero_order"
  unit?: string
}

export type NetworkEdgeData = {
  edge_kind: NetworkEdgeKind
  flow: number
  a?: number
  b?: number
  component_policy: NetworkComponentPolicy
  stream_adapter?: Record<string, unknown> | null
  flow_spec?: NetworkFlowSpec
  transport_model?: NetworkTransportModel | null
  pump?: NetworkPumpSpec
  signal_spec?: NetworkSignalSpec
}

export const NETWORK_EDGE_KINDS: NetworkEdgeKind[] = [
  "hydraulic",
  "pump",
  "settling",
  "signal",
]

export const DEFAULT_NETWORK_EDGE_KIND: NetworkEdgeKind = "hydraulic"

export const NETWORK_EDGE_KIND_OPTIONS: Array<{
  kind: NetworkEdgeKind
  label: string
  shortLabel: string
  description: string
}> = [
  {
    kind: "hydraulic",
    label: "Hydraulic",
    shortLabel: "Hyd",
    description: "Mass and volume transport",
  },
  {
    kind: "pump",
    label: "Pump",
    shortLabel: "Pump",
    description: "Active hydraulic transport",
  },
  {
    kind: "settling",
    label: "Settling",
    shortLabel: "Settle",
    description: "Solid transport without volume",
  },
  {
    kind: "signal",
    label: "Signal",
    shortLabel: "Signal",
    description: "Control signal without mass",
  },
]

const basePolicy = (): NetworkComponentPolicy => ({
  mode: "all",
  include: [],
  exclude: [],
})

const solidsPolicy = (): NetworkComponentPolicy => ({
  mode: "include",
  include: ["X_TSS"],
  exclude: [],
})

const signalPolicy = (): NetworkComponentPolicy => ({
  mode: "exclude",
  include: [],
  exclude: ["COD", "X_TSS"],
})

const fixedFlow = (): NetworkFlowSpec => ({
  mode: "fixed",
  value: 0,
  unit: "m3/d",
})

export const normalizeNetworkEdgeKind = (value: unknown): NetworkEdgeKind =>
  NETWORK_EDGE_KINDS.includes(value as NetworkEdgeKind)
    ? (value as NetworkEdgeKind)
    : DEFAULT_NETWORK_EDGE_KIND

export const createNetworkEdgeData = (
  kind: NetworkEdgeKind = DEFAULT_NETWORK_EDGE_KIND,
  currentData: Record<string, unknown> = {},
): NetworkEdgeData => {
  const currentFlow = Number(currentData.flow)
  const flow = Number.isFinite(currentFlow) ? currentFlow : 0

  if (kind === "pump") {
    return {
      edge_kind: kind,
      flow,
      a: 1,
      b: 0,
      component_policy: basePolicy(),
      stream_adapter: null,
      flow_spec: { ...fixedFlow(), value: flow },
      pump: {
        head_m: 2,
        efficiency: 0.75,
        energy_enabled: true,
        min_flow: 0,
        max_flow: 1200,
      },
      transport_model: null,
    }
  }

  if (kind === "settling") {
    return {
      edge_kind: kind,
      flow,
      a: 1,
      b: 0,
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
      flow,
      a: 1,
      b: 0,
      component_policy: signalPolicy(),
      stream_adapter: null,
      signal_spec: {
        signal_name: "signal",
        source_expression: "",
        sample_period_days: 0.01,
        hold: "zero_order",
        delay_days: 0,
        unit: "",
      },
    }
  }

  return {
    edge_kind: "hydraulic",
    flow,
    a: 1,
    b: 0,
    component_policy: basePolicy(),
    stream_adapter: null,
    flow_spec: { ...fixedFlow(), value: flow },
    transport_model: null,
  }
}

export const createNetworkEdgeKindPatch = (
  kind: NetworkEdgeKind,
  currentData: Record<string, unknown> = {},
) => {
  const data = createNetworkEdgeData(kind, currentData)
  return {
    edge_kind: data.edge_kind,
    flow: data.flow,
    a: data.a,
    b: data.b,
    component_policy: data.component_policy,
    stream_adapter: data.stream_adapter,
    flow_spec: data.flow_spec,
    pump: data.pump,
    transport_model: data.transport_model,
    signal_spec: data.signal_spec,
  }
}

export const stripLegacyEdgeConfigFields = (
  data: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([key]) => !key.endsWith("_a") && !key.endsWith("_b"),
    ),
  )
