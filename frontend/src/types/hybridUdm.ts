export interface HybridUDMVariableMapItem {
  source_var?: string | null
  target_var: string
  enabled: boolean
  local_exempt?: boolean
  mode?: string
}

export interface HybridUDMModelPairMapping {
  source_model_id: string
  source_version: number
  target_model_id: string
  target_version: number
  variable_map: HybridUDMVariableMapItem[]
}

export interface HybridUDMSelectedModel {
  model_id: string
  version: number
  name?: string
  hash?: string
  components?: Record<string, unknown>[]
  parameters?: Record<string, unknown>[]
  processes?: Record<string, unknown>[]
  meta?: Record<string, unknown> | null
}

export interface HybridUDMConfig {
  mode: "udm_only"
  selected_models: HybridUDMSelectedModel[]
  model_pair_mappings: Record<string, HybridUDMModelPairMapping>
}
