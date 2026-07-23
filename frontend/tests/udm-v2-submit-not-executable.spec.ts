import { type Page, expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

const apiBaseUrl = process.env.VITE_COMPUTE_API_URL || "http://localhost:8088"
const standaloneEnabled =
  process.env.VITE_APP_MODE === "standalone" ||
  process.env.VITE_AUTH_MODE === "disabled" ||
  process.env.VITE_CONTEXT_MODE === "standalone"

test.skip(
  !standaloneEnabled,
  "UDM Network v2 submit smoke requires standalone env",
)

const notExecutableMessage =
  "UDM Network v2 wire path 已注册，simulation worker runtime 尚未执行。"
const corsHeaders = {
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-origin": "*",
}

const canvasFixture = {
  nodes: [
    {
      id: "influent",
      type: "boundary_v2",
      position: { x: 0, y: 0 },
      data: {
        label: "Influent",
        node_kind: "boundary",
        process_unit_type: "boundary",
        component_schema_id: "udm_network_minimal_components.v1",
        initial_conditions: { COD: 200, X_TSS: 120 },
        model_binding: { model_kind: "passive", reaction_enabled: false },
        parameter_binding: {},
        boundary: {
          boundary_kind: "source",
          feed_composition: { COD: 200, X_TSS: 120 },
        },
        ports: [
          { id: "out", label: "Out", role: "outlet", placement: "right" },
        ],
      },
    },
    {
      id: "reactor",
      type: "udm_reactor_v2",
      position: { x: 240, y: 0 },
      data: {
        label: "Reactor",
        node_kind: "udm_reactor",
        process_unit_type: "udm_reactor",
        component_schema_id: "udm_network_minimal_components.v1",
        initial_conditions: { COD: 50, X_TSS: 80 },
        volume_m3: 1000,
        model_binding: { model_kind: "udm", reaction_enabled: false },
        parameter_binding: {},
        ports: [
          { id: "in", label: "In", role: "inlet", placement: "left" },
          { id: "out", label: "Out", role: "outlet", placement: "right" },
        ],
      },
    },
  ],
  edges: [
    {
      id: "e_influent_reactor",
      type: "hydraulic_v2",
      source: "influent",
      sourceHandle: "out",
      target: "reactor",
      targetHandle: "in",
      data: {
        edge_kind: "hydraulic",
        component_policy: { mode: "all", include: [], exclude: [] },
        stream_adapter: null,
        flow_spec: { mode: "fixed", value: 100, unit: "m3/d" },
        transport_model: null,
      },
    },
  ],
} as const

test("submits simulation.udm_network.v1 and shows not-executable banner", async ({
  page,
}) => {
  const submittedJobs: Array<Record<string, unknown>> = []

  await page.route(`${apiBaseUrl}/api/v1/compute/jobs`, async (route) => {
    const request = route.request()
    if (request.method() === "OPTIONS") {
      await route.fulfill({ headers: corsHeaders, status: 204 })
      return
    }

    const job = request.postDataJSON() as Record<string, unknown>
    submittedJobs.push(job)
    await route.fulfill({
      body: JSON.stringify({
        artifacts: [],
        event_count: 1,
        job: {
          created_at: "2026-06-30T00:00:00Z",
          error_code: "UDM_NETWORK_NOT_EXECUTABLE_YET",
          input_json: job,
          job_id: job.job_id,
          job_type: job.job_type,
          status: "failed",
          summary: { error_code: "UDM_NETWORK_NOT_EXECUTABLE_YET" },
        },
      }),
      contentType: "application/json",
      headers: corsHeaders,
      status: 202,
    })
  })

  await page.goto("/udm-v2")
  await injectCanvasFixture(page)

  await page.getByRole("button", { name: "Submit" }).click()

  await expect.poll(() => submittedJobs.length).toBe(1)
  expect(submittedJobs[0].job_type).toBe("simulation.udm_network.v1")
  await expect(page.getByText(notExecutableMessage)).toBeVisible({
    timeout: 15_000,
  })
})

async function injectCanvasFixture(page: Page) {
  await expect
    .poll(() => page.evaluate(() => Boolean(window.__UDM_V2_FLOW_STORE__)))
    .toBe(true)
  await page.evaluate((fixture) => {
    const store = window.__UDM_V2_FLOW_STORE__
    if (!store) throw new Error("UDM_V2_DEV_STORE_UNAVAILABLE")
    store.getState().replaceGraph({
      name: "Plant A",
      nodes: fixture.nodes,
      edges: fixture.edges,
    })
  }, canvasFixture)
}
