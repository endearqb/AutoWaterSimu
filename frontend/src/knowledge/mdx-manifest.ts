import matter from "gray-matter"
import type { ComponentType } from "react"

type GlobModule = {
  default: ComponentType
}

export type KnowledgeFrontmatter = {
  title?: string
  summary?: string
  order?: number
  tags?: string[]
  source?: string | string[]
  [key: string]: unknown
}

export type KnowledgeEntry = {
  slug: string
  filePath: string
  title: string
  summary?: string
  order?: number
  tags?: string[]
  frontmatter: KnowledgeFrontmatter
  component: ComponentType
  rawBody: string
}

const modules = import.meta.glob<GlobModule>(
  "../../content/knowledge/**/*.{md,mdx}",
  {
    eager: true,
  },
)

const rawSources = import.meta.glob(
  "../../content/knowledge/**/*.{md,mdx}?raw",
  {
    eager: true,
    import: "default",
  },
) as Record<string, string | { default: string }>

const normalizeSlug = (filePath: string) =>
  filePath
    .replace(/^(\.\.\/)+content\/knowledge\//, "")
    .replace(/\\/g, "/")
    .replace(/\.(md|mdx)$/, "")

export const knowledgeEntries: KnowledgeEntry[] = Object.entries(modules).map(
  ([filePath, module]) => {
    const rawModule =
      rawSources[`${filePath}?raw`] ??
      rawSources[filePath] ??
      rawSources[filePath.replace(/\.mdx$/, ".mdx?raw")]
    const raw =
      typeof rawModule === "string"
        ? rawModule
        : rawModule && typeof rawModule === "object" && "default" in rawModule
          ? rawModule.default
          : ""
    const { data, content } = matter(raw)
    const frontmatter = (data ?? {}) as KnowledgeFrontmatter
    const slug = normalizeSlug(filePath)
    const title =
      typeof frontmatter.title === "string"
        ? frontmatter.title
        : (slug.split("/").pop() ?? slug)

    return {
      slug,
      filePath,
      title,
      summary:
        typeof frontmatter.summary === "string"
          ? frontmatter.summary
          : undefined,
      order:
        typeof frontmatter.order === "number" ? frontmatter.order : undefined,
      tags: Array.isArray(frontmatter.tags)
        ? (frontmatter.tags.filter(
            (tag): tag is string => typeof tag === "string",
          ) as string[])
        : undefined,
      frontmatter,
      component: module.default,
      rawBody: content,
    }
  },
)

knowledgeEntries.sort((a, b) => {
  const orderA = a.order ?? Number.MAX_SAFE_INTEGER
  const orderB = b.order ?? Number.MAX_SAFE_INTEGER
  if (orderA !== orderB) return orderA - orderB
  return a.slug.localeCompare(b.slug)
})

export const knowledgeEntryMap = knowledgeEntries.reduce<
  Record<string, KnowledgeEntry>
>((acc, entry) => {
  acc[entry.slug] = entry
  return acc
}, {})
