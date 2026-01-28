import { DocsView } from "@/components/Knowledge/DocsView"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/docs/$/slug")({
  component: DocsSlugRoute,
})

function DocsSlugRoute() {
  const { _splat } = Route.useParams()
  return <DocsView slug={_splat} />
}

