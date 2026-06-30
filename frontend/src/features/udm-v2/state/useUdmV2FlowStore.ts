import { create } from "zustand"

import {
  createUdmV2FlowStore,
  type UdmV2FlowStore,
} from "./createUdmV2FlowStore"

export const useUdmV2FlowStore = create<UdmV2FlowStore>()(createUdmV2FlowStore)
