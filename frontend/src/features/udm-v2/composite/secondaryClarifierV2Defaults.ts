import type { NetworkV2FlowSpec } from "../edges/edgeModel"

export const SECONDARY_CLARIFIER_V2_REFERENCE_SCHEMA_ID =
  "bsm1_clarifier_reference_8.v1"

export const SECONDARY_CLARIFIER_V2_REFERENCE_COMPONENTS = [
  "S_I",
  "S_S",
  "S_O",
  "S_NO",
  "S_NH",
  "S_ND",
  "S_ALK",
  "X_TSS",
]

export type SecondaryClarifierV2Config = {
  profile: "reference" | "reactive_pending"
  area_m2: number
  height_m: number
  layer_count: 10
  feed_layer: number
  feed_composition: Record<string, number>
  takacs: {
    v0_m_per_day: number
    v0_max_m_per_day?: number
    r_h?: number
    r_p?: number
    f_ns?: number
    x_tss_threshold?: number
  }
  flows: {
    influent_edge_id?: string
    influent_flow?: NetworkV2FlowSpec
    effluent_flow?: NetworkV2FlowSpec
    ras_flow?: NetworkV2FlowSpec
    was_flow?: NetworkV2FlowSpec
  }
}

export function createDefaultSecondaryClarifierV2Config(): SecondaryClarifierV2Config {
  return {
    profile: "reference",
    area_m2: 1500,
    height_m: 4,
    layer_count: 10,
    feed_layer: 5,
    feed_composition: {
      S_I: 30,
      S_S: 69.5,
      S_O: 0,
      S_NO: 0,
      S_NH: 31.56,
      S_ND: 6.95,
      S_ALK: 7,
      X_TSS: 211.27,
    },
    takacs: {
      v0_m_per_day: 250,
    },
    flows: {
      influent_flow: { mode: "fixed", unit: "m3/d", value: 100 },
      effluent_flow: { mode: "residual", unit: "m3/d" },
      ras_flow: { mode: "fixed", unit: "m3/d", value: 25 },
      was_flow: { mode: "fixed", unit: "m3/d", value: 5 },
    },
  }
}
