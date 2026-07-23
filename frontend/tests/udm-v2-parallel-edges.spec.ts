import { type Page, expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test("routes same-endpoint edges into distinct selectable lanes", async ({
  page,
}) => {
  await page.goto("/udm-v2")
  await expect
    .poll(() => page.evaluate(() => Boolean(window.__UDM_V2_FLOW_STORE__)))
    .toBe(true)
  await injectParallelEdges(page)

  const paths = page.locator(".react-flow__edge-path")
  await expect(paths).toHaveCount(4)
  const values = await paths.evaluateAll((items) =>
    items.map((item) => item.getAttribute("d")),
  )
  expect(new Set(values).size).toBe(4)

  const signalPath = page.locator(
    '.react-flow__edge[data-id="edge-signal"] .react-flow__edge-interaction',
  )
  const signalPoint = await signalPath.evaluate((element) => {
    const path = element as SVGPathElement
    const point = path.getPointAtLength(path.getTotalLength() / 2)
    const matrix = path.getScreenCTM()
    if (!matrix) throw new Error("UDM_V2_EDGE_SCREEN_MATRIX_UNAVAILABLE")
    return {
      x: point.x * matrix.a + point.y * matrix.c + matrix.e,
      y: point.x * matrix.b + point.y * matrix.d + matrix.f,
    }
  })
  await page.mouse.click(signalPoint.x, signalPoint.y + 8)
  await expect(page.getByTestId("udm-v2-inspector-drawer")).toHaveAttribute(
    "aria-hidden",
    "false",
  )
  await expect(page.getByText("Signal name")).toBeVisible()
  await page.getByRole("button", { exact: true, name: "Graph" }).click()
  await expect(page.getByText("Flow constraints")).toBeVisible()
  await page.getByRole("button", { exact: true, name: "Element" }).click()
  await expect(page.getByText("Signal name")).toBeVisible()
})

async function injectParallelEdges(page: Page) {
  await page.evaluate(async () => {
    const nodesPath = "/src/features/udm-v2/nodes/nodeTypes.ts"
    const edgesPath = "/src/features/udm-v2/edges/edgeModel.ts"
    const { createNetworkV2Node } = await import(nodesPath)
    const { createNetworkV2EdgeData, networkV2EdgeTypeByKind } = await import(
      edgesPath
    )
    const source = createNetworkV2Node("udm_reactor", { x: 120, y: 520 })
    const target = createNetworkV2Node("udm_reactor", { x: 620, y: 520 })
    source.id = "source"
    target.id = "target"
    const kinds = ["hydraulic", "pump", "settling", "signal"]
    const edges = kinds.map((kind) => ({
      id: `edge-${kind}`,
      source: "source",
      sourceHandle: "out",
      target: "target",
      targetHandle: "in",
      type: networkV2EdgeTypeByKind[kind],
      data: createNetworkV2EdgeData(kind),
    }))
    const store = window.__UDM_V2_FLOW_STORE__
    if (!store) throw new Error("UDM_V2_DEV_STORE_UNAVAILABLE")
    store.getState().replaceGraph({
      name: "Parallel edges",
      nodes: [source, target],
      edges,
    })
  })
}
