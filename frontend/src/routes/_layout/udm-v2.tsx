import { createFileRoute } from "@tanstack/react-router"

import UdmV2Page from "@/features/udm-v2/UdmV2Page"
import { udmV2RouteSearchSchema } from "@/features/udm-v2/routeSearchSchema"

export const Route = createFileRoute("/_layout/udm-v2")({
  component: UdmV2Route,
  validateSearch: (search) => udmV2RouteSearchSchema.parse(search),
})

function UdmV2Route() {
  const search = Route.useSearch()
  return <UdmV2Page flowchartId={search.flowchartId} />
}
