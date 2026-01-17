// 优化的颜色选择器Hook
// 使用缓存、防抖和批量计算来提高性能

import { useCallback, useEffect, useMemo, useState } from "react"
import { colorCache } from "../utils/colorCache"
import {
  type AccessibilityRecommendation,
  batchCheckContrast,
  batchCheckWCAG,
  debounce,
  getAccessibilityRecommendations,
  getContrastRatioCached,
  isWCAGCompliantCached,
} from "../utils/optimizedColorUtils"

export interface ColorAccessibilityInfo {
  contrast: {
    white: number
    black: number
  }
  wcag: {
    white: {
      AA: boolean
      AAA: boolean
    }
    black: {
      AA: boolean
      AAA: boolean
    }
  }
  recommendations: AccessibilityRecommendation
}

export interface UseOptimizedColorSelectorOptions {
  debounceMs?: number
  preloadColors?: string[]
  backgroundColors?: string[]
}

export const useOptimizedColorSelector = (
  initialColor = "#000000",
  options: UseOptimizedColorSelectorOptions = {},
) => {
  const {
    debounceMs = 300,
    preloadColors = [],
    backgroundColors = ["#ffffff", "#000000"],
  } = options

  const [selectedColor, setSelectedColor] = useState(initialColor)
  const [accessibilityInfo, setAccessibilityInfo] =
    useState<ColorAccessibilityInfo | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [cacheStats, setCacheStats] = useState(colorCache.getCacheStats())

  // 预加载颜色数据
  useEffect(() => {
    if (preloadColors.length > 0) {
      // 批量预计算常用颜色的对比度和WCAG合规性
      batchCheckContrast(preloadColors, backgroundColors)
      batchCheckWCAG(preloadColors, backgroundColors, "AA")
      batchCheckWCAG(preloadColors, backgroundColors, "AAA")
    }
  }, [preloadColors, backgroundColors])

  // 计算颜色可访问性信息
  const calculateAccessibilityInfo = useCallback(
    (color: string): ColorAccessibilityInfo => {
      const whiteContrast = getContrastRatioCached(color, "#ffffff")
      const blackContrast = getContrastRatioCached(color, "#000000")

      return {
        contrast: {
          white: whiteContrast,
          black: blackContrast,
        },
        wcag: {
          white: {
            AA: isWCAGCompliantCached(color, "#ffffff", "AA"),
            AAA: isWCAGCompliantCached(color, "#ffffff", "AAA"),
          },
          black: {
            AA: isWCAGCompliantCached(color, "#000000", "AA"),
            AAA: isWCAGCompliantCached(color, "#000000", "AAA"),
          },
        },
        recommendations: getAccessibilityRecommendations(
          color,
          backgroundColors,
        ),
      }
    },
    [backgroundColors],
  )

  // 防抖的可访问性信息更新
  const debouncedUpdateAccessibility = useMemo(
    () =>
      debounce((color: string) => {
        setIsCalculating(true)

        // 使用 requestAnimationFrame 来避免阻塞UI
        requestAnimationFrame(() => {
          const info = calculateAccessibilityInfo(color)
          setAccessibilityInfo(info)
          setIsCalculating(false)
          setCacheStats(colorCache.getCacheStats())
        })
      }, debounceMs),
    [calculateAccessibilityInfo, debounceMs],
  )

  // 更新选中的颜色
  const updateSelectedColor = useCallback(
    (color: string) => {
      setSelectedColor(color)
      debouncedUpdateAccessibility(color)
    },
    [debouncedUpdateAccessibility],
  )

  // 初始化时计算可访问性信息
  useEffect(() => {
    debouncedUpdateAccessibility(selectedColor)
  }, [selectedColor, debouncedUpdateAccessibility])

  // 批量检查多个颜色的可访问性
  const batchCheckAccessibility = useCallback(
    (colors: string[]) => {
      setIsCalculating(true)

      return new Promise<Map<string, ColorAccessibilityInfo>>((resolve) => {
        requestAnimationFrame(() => {
          const results = new Map<string, ColorAccessibilityInfo>()

          colors.forEach((color) => {
            results.set(color, calculateAccessibilityInfo(color))
          })

          setIsCalculating(false)
          setCacheStats(colorCache.getCacheStats())
          resolve(results)
        })
      })
    },
    [calculateAccessibilityInfo],
  )

  // 获取推荐的颜色变体
  const getColorVariants = useCallback((baseColor: string, count = 5) => {
    const variants: string[] = []

    // 生成亮度变体
    for (let i = 0; i < count; i++) {
      // 这里简化处理，实际应该有更复杂的颜色变体算法
      variants.push(baseColor)
    }

    return variants
  }, [])

  // 清空缓存
  const clearCache = useCallback(() => {
    colorCache.clearAll()
    setCacheStats(colorCache.getCacheStats())
  }, [])

  // 预热缓存
  const warmupCache = useCallback((colors: string[]) => {
    colorCache.warmupCache(colors)
    setCacheStats(colorCache.getCacheStats())
  }, [])

  return {
    selectedColor,
    accessibilityInfo,
    isCalculating,
    cacheStats,
    updateSelectedColor,
    batchCheckAccessibility,
    getColorVariants,
    clearCache,
    warmupCache,
    // 便捷的可访问性检查函数
    checkContrast: (color1: string, color2: string) =>
      getContrastRatioCached(color1, color2),
    checkWCAG: (color1: string, color2: string, level: "AA" | "AAA" = "AA") =>
      isWCAGCompliantCached(color1, color2, level),
    getRecommendations: (color: string) =>
      getAccessibilityRecommendations(color, backgroundColors),
  }
}
