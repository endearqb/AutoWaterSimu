import { create } from "zustand"

import {
  type UdmV2FlowStore,
  createUdmV2FlowStore,
} from "./createUdmV2FlowStore"

export const useUdmV2FlowStore = create<UdmV2FlowStore>()(createUdmV2FlowStore)
