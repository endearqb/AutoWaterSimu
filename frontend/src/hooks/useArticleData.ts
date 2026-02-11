import { useI18n } from "@/i18n"
import { useEffect, useState } from "react"
import {
  getAllArticles,
  getArticleById as getArticleByIdFromData,
} from "../data/articles/articleData"
import type { ArticleData } from "../data/articles/types"

export const useArticleData = () => {
  const { language } = useI18n()
  const [articles, setArticles] = useState<ArticleData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 加载文章数据
    const loadArticles = async () => {
      try {
        setLoading(true)
        // 模拟异步加载
        await new Promise((resolve) => setTimeout(resolve, 500))

        const articlesData = getAllArticles(language)
        setArticles(articlesData)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load articles")
      } finally {
        setLoading(false)
      }
    }

    loadArticles()
  }, [language])

  const getArticleById = (id: string): ArticleData | undefined => {
    return getArticleByIdFromData(id, language)
  }

  return {
    articles,
    loading,
    error,
    getArticleById,
  }
}
