import { type Page, expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

const apiBaseUrl = process.env.VITE_COMPUTE_API_URL || "http://localhost:8088"
const standaloneEnabled =
  process.env.VITE_APP_MODE === "standalone" ||
  process.env.VITE_AUTH_MODE === "disabled" ||
  process.env.VITE_CONTEXT_MODE === "standalone"

test.skip(!standaloneEnabled, "UDM Network v2 smoke requires standalone env")

const corsHeaders = {
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
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

test("saves, lists, loads and reloads only UDM Network v2 canvas graphs", async ({
  page,
}) => {
  const saveRequests: Array<Record<string, unknown>> = []
  let savedPayload: Record<string, unknown> | null = null

  const graphRecord = (
    graphId: string,
    name: string,
    payload: Record<string, unknown>,
  ) => ({
    created_at: "2026-06-30T00:00:00Z",
    graph_id: graphId,
    name,
    payload,
    payload_hash: "sha256:test",
    requested_by: "playwright",
    schema_version: "canvas_graph.v1",
    source_system: "test",
    version: 1,
  })

  await page.route(`${apiBaseUrl}/api/v1/canvas-graphs**`, async (route) => {
    const request = route.request()
    if (request.method() === "OPTIONS") {
      await route.fulfill({ headers: corsHeaders, status: 204 })
      return
    }

    const url = new URL(request.url())
    if (
      url.pathname === "/api/v1/canvas-graphs" &&
      request.method() === "POST"
    ) {
      const body = request.postDataJSON() as Record<string, unknown>
      saveRequests.push(body)
      savedPayload = body.canvas_graph as Record<string, unknown>
      await route.fulfill({
        body: JSON.stringify(graphRecord("graph-1", "Plant A", savedPayload)),
        contentType: "application/json",
        headers: corsHeaders,
        status: 200,
      })
      return
    }

    if (
      url.pathname === "/api/v1/canvas-graphs" &&
      request.method() === "GET"
    ) {
      await route.fulfill({
        body: JSON.stringify({
          items: [
            graphRecord("graph-1", "Plant A", savedPayload || {}),
            graphRecord("legacy", "Legacy", { graph_family: "legacy_flow" }),
          ],
          total_estimate: 2,
        }),
        contentType: "application/json",
        headers: corsHeaders,
        status: 200,
      })
      return
    }

    if (url.pathname === "/api/v1/canvas-graphs/graph-1") {
      await route.fulfill({
        body: JSON.stringify(
          graphRecord("graph-1", "Plant A", savedPayload || {}),
        ),
        contentType: "application/json",
        headers: corsHeaders,
        status: 200,
      })
      return
    }

    await route.fulfill({ headers: corsHeaders, status: 404 })
  })

  await page.goto("/udm-v2")
  await injectCanvasFixture(page)
  await expect(page.getByText("Q 100 m³/d")).toBeVisible()

  await page.getByRole("button", { exact: true, name: "Save" }).click()
  await expect.poll(() => saveRequests.length).toBe(1)
  expect(saveRequests[0].metadata).toEqual({ graph_family: "udm_network_v2" })
  expect(
    (saveRequests[0].canvas_graph as Record<string, unknown>).graph_family,
  ).toBe("udm_network_v2")

  await page.getByRole("button", { name: "More actions" }).click()
  await page.getByRole("menuitem", { name: "Load graph" }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(page.getByRole("button", { name: /Plant A/ })).toBeVisible()
  await expect(page.getByText("Legacy")).toHaveCount(0)
  await page.getByRole("button", { name: /Plant A/ }).click()
  await expect(
    page.locator(".react-flow__node", { hasText: "Reactor" }),
  ).toBeVisible({ timeout: 15_000 })

  await page.goto("/udm-v2?flowchartId=graph-1")
  await expect(
    page.locator(".react-flow__node", { hasText: "Reactor" }),
  ).toBeVisible({ timeout: 15_000 })
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
