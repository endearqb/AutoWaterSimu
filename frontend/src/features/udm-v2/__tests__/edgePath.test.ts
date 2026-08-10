import { Position } from "@xyflow/react"
import { describe, expect, it } from "vitest"

import { getNetworkV2RoutedPath } from "../edges/edgePath"

const input = {
  sourceX: 10,
  sourceY: 20,
  sourcePosition: Position.Right,
  targetX: 210,
  targetY: 120,
  targetPosition: Position.Left,
}

describe("getNetworkV2RoutedPath", () => {
  it("keeps real endpoints and finite label coordinates", () => {
    const [path, x, y] = getNetworkV2RoutedPath(input)
    expect(path.startsWith("M 10,20")).toBe(true)
    expect(path.endsWith("L 210,120")).toBe(true)
    expect(Number.isFinite(x)).toBe(true)
    expect(Number.isFinite(y)).toBe(true)
  })

  it("separates source-only and target-only lanes", () => {
    const center = getNetworkV2RoutedPath(input)[0]
    const source = getNetworkV2RoutedPath({
      ...input,
      lanes: {
        source: { index: 0, count: 2, offset: -6 },
        target: { index: 0, count: 1, offset: 0 },
      },
    })[0]
    const target = getNetworkV2RoutedPath({
      ...input,
      lanes: {
        source: { index: 0, count: 1, offset: 0 },
        target: { index: 0, count: 2, offset: 6 },
      },
    })[0]
    expect(new Set([center, source, target]).size).toBe(3)
  })
})
