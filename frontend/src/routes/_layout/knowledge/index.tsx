import { KnowledgeView } from "@/components/Knowledge/KnowledgeView"
import { KNOWLEDGE_DEFAULT_SLUG } from "@/knowledge"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_layout/knowledge/")({
  component: KnowledgeIndexRoute,
})

function KnowledgeIndexRoute() {
  return <KnowledgeView slug={KNOWLEDGE_DEFAULT_SLUG} />
}
