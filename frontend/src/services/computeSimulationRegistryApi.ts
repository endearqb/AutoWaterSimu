import { DefaultService } from "@/client/compute"
import type { ProcessGraphRecord as ComputeProcessGraphRecord } from "@/client/compute"
import type { ProcessGraph } from "@/contracts"

export const computeSimulationRegistryApi = {
  registerProcessGraph(
    processGraph: ProcessGraph,
  ): Promise<ComputeProcessGraphRecord> {
    return DefaultService.registerProcessGraph({ requestBody: processGraph })
  },

  getProcessGraph(
    processGraphId: string,
    version = 1,
  ): Promise<ComputeProcessGraphRecord> {
    return DefaultService.getProcessGraph({ processGraphId, version })
  },
}
