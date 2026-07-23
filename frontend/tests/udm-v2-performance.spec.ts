import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test("renders the 100-node / 300-edge performance fixture", async ({
  page,
}) => {
  await page.goto("/udm-v2")
  await expect
    .poll(() => page.evaluate(() => Boolean(window.__UDM_V2_FLOW_STORE__)))
    .toBe(true)

  await page.evaluate(async () => {
    const { createNetworkV2Node } = await import(
      "/src/features/udm-v2/nodes/nodeTypes.ts"
    )
    const { createNetworkV2EdgeData, networkV2EdgeTypeByKind } = await import(
      "/src/features/udm-v2/edges/edgeModel.ts"
    )
    const kinds = ["hydraulic", "pump", "settling", "signal"] as const
    const nodes = Array.from({ length: 100 }, (_, index) => {
      const node = createNetworkV2Node("udm_reactor", {
        x: (index % 10) * 180,
        y: Math.floor(index / 10) * 120,
      })
      node.id = `node-${index}`
      return node
    })
    const groupedEdges = Array.from({ length: 20 }, (_, group) =>
      Array.from({ length: 10 }, (_, lane) => {
        const kind = kinds[(group + lane) % kinds.length]
        return {
          id: `group-${group}-lane-${lane}`,
          source: `node-${group}`,
          sourceHandle: "out",
          target: `node-${20 + ((group * 10 + lane) % 80)}`,
          targetHandle: "in",
          type: networkV2EdgeTypeByKind[kind],
          data: createNetworkV2EdgeData(kind),
        }
      }),
    ).flat()
    const distributedEdges = Array.from({ length: 100 }, (_, index) => {
      const kind = kinds[index % kinds.length]
      return {
        id: `distributed-${index}`,
        source: `node-${index}`,
        sourceHandle: "out",
        target: `node-${(index + 17) % 100}`,
        targetHandle: "in",
        type: networkV2EdgeTypeByKind[kind],
        data: createNetworkV2EdgeData(kind),
      }
    })

    const store = window.__UDM_V2_FLOW_STORE__
    if (!store) throw new Error("UDM_V2_DEV_STORE_UNAVAILABLE")
    store.getState().replaceGraph({
      name: "100 / 300 performance fixture",
      nodes,
      edges: [...groupedEdges, ...distributedEdges],
    })
  })

  await expect(page.locator(".react-flow__node")).toHaveCount(100, {
    timeout: 10_000,
  })
  await expect(page.locator(".react-flow__edge")).toHaveCount(300, {
    timeout: 10_000,
  })
  await expect(page.getByText("100N / 300E")).toBeVisible()
})
