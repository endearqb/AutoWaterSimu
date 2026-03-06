import type { UDMComponentDefinition } from "@/client/types.gen"

export interface UDMNodeModelSnapshot {
  id?: string
  name?: string
  version?: number
  hash?: string
  components?: UDMComponentDefinition[]
  parameters?: Array<Record<string, unknown>>
  processes?: Array<Record<string, unknown>>
  parameterValues?: Record<string, number>
  meta?: Record<string, unknown>
}

export interface UDMNodeData extends Record<string, unknown> {
  label?: string
  udmModelId?: string
  udmModel?: UDMNodeModelSnapshot
  udmModelSnapshot?: UDMNodeModelSnapshot
  udmComponents?: UDMComponentDefinition[]
  udmComponentNames?: string[]
  udmProcesses?: Array<Record<string, unknown>>
  udmParameters?: Record<string, number>
  udmParameterValues?: Record<string, number>
  udmModelVersion?: number
  udmModelHash?: string
}
