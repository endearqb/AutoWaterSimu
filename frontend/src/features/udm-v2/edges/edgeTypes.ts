import type { EdgeTypes } from "@xyflow/react"

import { HydraulicV2Edge } from "./HydraulicV2Edge"
import { PumpV2Edge } from "./PumpV2Edge"
import { SettlingV2Edge } from "./SettlingV2Edge"
import { SignalV2Edge } from "./SignalV2Edge"

export const networkV2EdgeTypes: EdgeTypes = {
  hydraulic_v2: HydraulicV2Edge,
  pump_v2: PumpV2Edge,
  settling_v2: SettlingV2Edge,
  signal_v2: SignalV2Edge,
}
