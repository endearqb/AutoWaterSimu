export type UdmV2RouteSearch = {
  flowchartId?: string
}

export const udmV2RouteSearchSchema = {
  parse(search: Record<string, unknown>): UdmV2RouteSearch {
    const flowchartId = search.flowchartId
    return {
      flowchartId:
        typeof flowchartId === "string" && flowchartId.trim().length > 0
          ? flowchartId
          : undefined,
    }
  },
}
