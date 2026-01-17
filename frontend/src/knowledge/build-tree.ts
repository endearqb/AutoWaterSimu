import type { KnowledgeEntry } from "./mdx-manifest"

export type KnowledgeTreeNode = {
  slug: string
  title: string
  order: number
  isLeaf: boolean
  children?: KnowledgeTreeNode[]
}

type BranchNode = {
  slug: string
  title: string
  order: number
  isLeaf: boolean
  children?: TreeBranch
}

type TreeBranch = Record<string, BranchNode>

const DEFAULT_ORDER = Number.MAX_SAFE_INTEGER

export const buildKnowledgeTree = (
  entries: KnowledgeEntry[],
): KnowledgeTreeNode[] => {
  const root: TreeBranch = {}

  for (const entry of entries) {
    const segments = entry.slug.split("/")
    let branch = root
    let cumulative = ""

    segments.forEach((segment, index) => {
      cumulative = cumulative ? `${cumulative}/${segment}` : segment
      const isLeaf = index === segments.length - 1
      const key = segment

      if (!branch[key]) {
        branch[key] = {
          slug: cumulative,
          title: isLeaf ? entry.title : segment,
          order: isLeaf ? (entry.order ?? DEFAULT_ORDER) : DEFAULT_ORDER,
          isLeaf,
        }
      } else if (isLeaf) {
        branch[key] = {
          ...branch[key],
          title: entry.title,
          order: entry.order ?? DEFAULT_ORDER,
          isLeaf: true,
        }
      }

      if (!isLeaf) {
        if (!branch[key].children) {
          branch[key].children = {}
        }

        branch = branch[key].children as TreeBranch
      }
    })
  }

  const toArray = (node: TreeBranch): KnowledgeTreeNode[] =>
    Object.values(node)
      .map((value) => {
        if (value.children) {
          const childArray = toArray(value.children)
          const childOrders = childArray.map((child) => child.order)
          return {
            slug: value.slug,
            title: value.title,
            isLeaf: false,
            children: childArray,
            order: Math.min(value.order, ...childOrders, DEFAULT_ORDER),
          }
        }

        return {
          slug: value.slug,
          title: value.title,
          order: value.order,
          isLeaf: value.isLeaf,
        }
      })
      .sort((a, b) => {
        if (a.isLeaf && !b.isLeaf) return -1
        if (!a.isLeaf && b.isLeaf) return 1
        const orderA = a.order ?? DEFAULT_ORDER
        const orderB = b.order ?? DEFAULT_ORDER
        if (orderA !== orderB) return orderA - orderB
        return a.title.localeCompare(b.title, "zh-Hans")
      })

  return toArray(root)
}
