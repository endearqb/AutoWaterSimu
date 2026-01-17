import { KnowledgeContent } from "@/components/Knowledge/KnowledgeContent"
import { KnowledgeLayout } from "@/components/Knowledge/KnowledgeLayout"
import { KnowledgeSidebar } from "@/components/Knowledge/KnowledgeSidebar"
import {
  KNOWLEDGE_DEFAULT_SLUG,
  knowledgeEntries,
  knowledgeEntryMap,
  knowledgeTree,
} from "@/knowledge"

type KnowledgeViewProps = {
  slug?: string
}

export function KnowledgeView({ slug }: KnowledgeViewProps) {
  const normalizedSlug = slug && slug.length > 0 ? slug : KNOWLEDGE_DEFAULT_SLUG
  const entry =
    knowledgeEntryMap[normalizedSlug] ??
    knowledgeEntryMap[KNOWLEDGE_DEFAULT_SLUG] ??
    knowledgeEntries[0]

  return (
    <KnowledgeLayout
      sidebar={
        <KnowledgeSidebar
          nodes={knowledgeTree}
          activeSlug={entry?.slug ?? normalizedSlug}
        />
      }
      content={<KnowledgeContent entry={entry} />}
    />
  )
}
