import type { NetworkV2EdgeKind } from "../edges/edgeModel"
import type { NetworkV2Port, NetworkV2PortRole } from "./nodeTypes"

export type NetworkV2PortKind =
  | "hydraulic_in"
  | "hydraulic_out"
  | "settling_in"
  | "settling_out"
  | "signal_in"
  | "signal_out"

const roleDefaults: Record<NetworkV2PortRole, NetworkV2PortKind> = {
  inlet: "hydraulic_in",
  outlet: "hydraulic_out",
  signal_in: "signal_in",
  signal_out: "signal_out",
}

const allowedEdgeKinds: Record<
  NetworkV2PortKind,
  readonly NetworkV2EdgeKind[]
> = {
  hydraulic_in: ["hydraulic", "pump"],
  hydraulic_out: ["hydraulic", "pump"],
  settling_in: ["settling"],
  settling_out: ["settling"],
  signal_in: ["signal"],
  signal_out: ["signal"],
}

export const normalizePortKind = (port: NetworkV2Port): NetworkV2PortKind =>
  port.port_kind ?? roleDefaults[port.role]

export const edgeKindsForPort = (port: NetworkV2Port) =>
  port.edgeKinds ?? allowedEdgeKinds[normalizePortKind(port)]

export const isSourcePort = (port: NetworkV2Port) =>
  normalizePortKind(port).endsWith("_out")

export const isTargetPort = (port: NetworkV2Port) =>
  normalizePortKind(port).endsWith("_in")
