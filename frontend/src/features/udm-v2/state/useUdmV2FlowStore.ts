import { create } from "zustand"

import {
  type UdmV2FlowStore,
  createUdmV2FlowStore,
} from "./createUdmV2FlowStore"

export const useUdmV2FlowStore = create<UdmV2FlowStore>()(createUdmV2FlowStore)

declare global {
  interface Window {
    __UDM_V2_FLOW_STORE__?: typeof useUdmV2FlowStore
  }
}

if (import.meta.env.DEV) {
  window.__UDM_V2_FLOW_STORE__ = useUdmV2FlowStore
}
