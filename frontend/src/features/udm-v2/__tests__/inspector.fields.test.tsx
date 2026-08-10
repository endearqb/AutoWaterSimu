import { render, screen } from "@testing-library/react"
import type { Edge } from "@xyflow/react"
import type { ReactElement } from "react"
import { describe, expect, it } from "vitest"

import { CustomProvider } from "@/components/ui/provider"
import { I18nProvider } from "@/i18n"
import {
  type NetworkV2EdgeData,
  createNetworkV2EdgeData,
} from "../edges/edgeModel"
import { HydraulicV2Fields } from "../inspector/HydraulicV2Fields"
import { SettlingV2Fields } from "../inspector/SettlingV2Fields"
import { SignalV2Fields } from "../inspector/SignalV2Fields"

const renderField = (ui: ReactElement) =>
  render(
    <I18nProvider>
      <CustomProvider>{ui}</CustomProvider>
    </I18nProvider>,
  )

const edge = (
  type: string,
  data: NetworkV2EdgeData,
): Edge<NetworkV2EdgeData> => ({
  id: "edge-1",
  source: "source",
  target: "target",
  type,
  data,
})

describe("network v2 inspector edge fields", () => {
  it("shows hydraulic flow fields", () => {
    renderField(
      <HydraulicV2Fields
        edge={edge("hydraulic_v2", createNetworkV2EdgeData("hydraulic"))}
        diagnostics={[]}
        onPatch={() => undefined}
      />,
    )

    expect(screen.getByText("Hydraulic flow mode")).toBeInTheDocument()
    expect(screen.getByText("Component include")).toBeInTheDocument()
  })

  it("hides flow fields for settling edges", () => {
    renderField(
      <SettlingV2Fields
        edge={edge("settling_v2", createNetworkV2EdgeData("settling"))}
        diagnostics={[]}
        onPatch={() => undefined}
      />,
    )

    expect(screen.getByText("Settling transport model")).toBeInTheDocument()
    expect(screen.queryByText("Hydraulic flow mode")).not.toBeInTheDocument()
  })

  it("hides material fields for signal edges", () => {
    renderField(
      <SignalV2Fields
        edge={edge("signal_v2", createNetworkV2EdgeData("signal"))}
        diagnostics={[]}
        onPatch={() => undefined}
      />,
    )

    expect(screen.getByText("Signal name")).toBeInTheDocument()
    expect(screen.queryByText("Component include")).not.toBeInTheDocument()
  })
})
