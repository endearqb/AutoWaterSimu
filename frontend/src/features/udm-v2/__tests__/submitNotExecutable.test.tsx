import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CustomProvider } from "@/components/ui/provider"
import { I18nProvider } from "@/i18n"

import { NetworkV2StatusBar } from "../canvas/NetworkV2StatusBar"
import {
  UDM_NETWORK_NOT_EXECUTABLE_YET,
  UDM_V2_NOT_EXECUTABLE_MESSAGE,
  buildUdmV2ComputeJob,
  normalizeUdmV2JobSnapshot,
} from "../services/udmV2ComputeService"
import { useUdmV2FlowStore } from "../state/useUdmV2FlowStore"

describe("UDM v2 submit not executable handling", () => {
  it("submits simulation.udm_network.v1 jobs", () => {
    const { job } = buildUdmV2ComputeJob({
      schema_version: "network_simulation_input.v1",
    })

    expect(job).toMatchObject({
      schema_version: "compute_job.v1",
      job_type: "simulation.udm_network.v1",
      queue: "simulation",
      payload: { schema_version: "network_simulation_input.v1" },
    })
  })

  it("normalizes worker not-executable diagnostics to runtime pending", () => {
    const snapshot = normalizeUdmV2JobSnapshot({
      artifacts: [],
      event_count: 0,
      job: {
        job_id: "job-1",
        job_type: "simulation.udm_network.v1",
        status: "failed",
        error_code: UDM_NETWORK_NOT_EXECUTABLE_YET,
      },
    })

    expect(snapshot).toMatchObject({
      runtimeStatus: "runtime_pending",
      message: UDM_V2_NOT_EXECUTABLE_MESSAGE,
    })
  })

  it("shows the runtime pending banner", () => {
    useUdmV2FlowStore.getState().newGraph()
    useUdmV2FlowStore.getState().setRuntimeStatus("runtime_pending")

    render(
      <I18nProvider>
        <CustomProvider>
          <NetworkV2StatusBar />
        </CustomProvider>
      </I18nProvider>,
    )

    expect(
      screen.getByText(
        "UDM Network v2 execution is not available in the current runtime.",
      ),
    ).toBeInTheDocument()
  })
})
