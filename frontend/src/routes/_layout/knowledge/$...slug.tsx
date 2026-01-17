import { KnowledgeView } from "@/components/Knowledge/KnowledgeView"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/knowledge/$/slug")({
  component: KnowledgeSlugRoute,
})

function KnowledgeSlugRoute() {
  const { _splat } = Route.useParams()
  return <KnowledgeView slug={_splat} />
}
