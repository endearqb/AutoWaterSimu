import { buildKnowledgeTree } from "./build-tree"
import { knowledgeEntries } from "./mdx-manifest"

export const KNOWLEDGE_DEFAULT_SLUG = "目录内容摘要"

export {
  knowledgeEntries,
  knowledgeEntryMap,
  type KnowledgeEntry,
} from "./mdx-manifest"
export {
  buildKnowledgeTree,
  type KnowledgeTreeNode,
} from "./build-tree"

export const knowledgeTree = buildKnowledgeTree(knowledgeEntries)
