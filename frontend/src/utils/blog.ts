import matter from "gray-matter"
import type { ComponentType } from "react"
import { detectDefaultLanguage, type Language } from "@/i18n"

// 保持原有导出名不变，但补充 component 字段，并统一为“MDX 组件渲染”模式
export type Metadata = {
  title: string
  publishedAt: string
  summary: string
  image?: string
  tag: string
}

export type BlogPost = {
  metadata: Metadata
  slug: string
  content: string // 原文内容（已去掉 frontmatter），用于摘要/搜索等
  component: ComponentType // MDX 组件本体
}

// 组件模块（用于渲染）
const componentModules = import.meta.glob("/src/data/updates/**/*.mdx", {
  eager: true,
}) as Record<string, { default: ComponentType }>

// 原文字符串模块（用于解析 frontmatter）
const rawModules = import.meta.glob("/src/data/updates/**/*.mdx?raw", {
  eager: true,
  import: "default",
}) as Record<string, string>

function toPosix(p: string): string {
  return p.replace(/\\/g, "/")
}

export async function getBlogPosts(language?: Language): Promise<BlogPost[]> {
  const resolvedLanguage = language ?? detectDefaultLanguage()
  const localeSegment = `/updates/${resolvedLanguage}/`

  const entries: BlogPost[] = Object.entries(componentModules)
    .filter(([filePath]) => toPosix(filePath).includes(localeSegment))
    .map(([filePath, mod]) => {
      const key = toPosix(filePath)
      const fileName = key.split("/").pop()!
      const slug = fileName.replace(/\.mdx$/, "")
      const raw = rawModules[`${key}?raw`] ?? rawModules[key] ?? ""
      const { data, content } = matter(raw ?? "")

      const metadata: Metadata = {
        title: data?.title ?? slug,
        publishedAt: data?.publishedAt ?? data?.date ?? new Date().toISOString(),
        summary:
          data?.summary ??
          data?.excerpt ??
          (content || "")
            .trim()
            .split(/\n\s*\n/)
            .find(Boolean)
            ?.trim()
            .slice(0, 180) ??
          "",
        image: data?.image,
        tag:
          data?.tag ?? (Array.isArray(data?.tags) ? data?.tags?.[0] : "") ?? "",
      } as Metadata

      return {
        metadata,
        slug,
        content: content ?? "",
        component: mod.default,
      }
    })

  entries.sort((a, b) => {
    const ta = a.metadata.publishedAt ? Date.parse(a.metadata.publishedAt) : 0
    const tb = b.metadata.publishedAt ? Date.parse(b.metadata.publishedAt) : 0
    return tb - ta
  })

  return entries
}
