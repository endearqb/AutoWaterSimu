// 优化后的颜色计算工具函数
// 集成缓存系统以提高性能

import {
  withContrastCache,
  withLuminanceCache,
  withRgbCache,
  withWcagCache,
} from "./colorCache"

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

// 标准化十六进制颜色值
const normalizeHex = (hex: string): string => {
  if (!HEX_COLOR_REGEX.test(hex)) {
    return "#000000"
  }

  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
  }

  return hex.toLowerCase()
}

// 十六进制转RGB（带缓存）
export const hexToRgbCached = (
  hex: string,
): [number, number, number] | null => {
  const normalizedHex = normalizeHex(hex)

  return withRgbCache(normalizedHex, () => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
      normalizedHex,
    )
    return result
      ? [
          Number.parseInt(result[1], 16),
          Number.parseInt(result[2], 16),
          Number.parseInt(result[3], 16),
        ]
      : null
  })
}

// 计算相对亮度（带缓存）
export const getRelativeLuminanceCached = (hex: string): number => {
  const normalizedHex = normalizeHex(hex)

  return withLuminanceCache(normalizedHex, () => {
    const rgb = hexToRgbCached(normalizedHex)
    if (!rgb) return 0

    const [r, g, b] = rgb.map((c) => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  })
}

// 计算颜色对比度（带缓存）
export const getContrastRatioCached = (
  color1: string,
  color2: string,
): number => {
  const normalizedColor1 = normalizeHex(color1)
  const normalizedColor2 = normalizeHex(color2)

  return withContrastCache(normalizedColor1, normalizedColor2, () => {
    const lum1 = getRelativeLuminanceCached(normalizedColor1)
    const lum2 = getRelativeLuminanceCached(normalizedColor2)
    const brightest = Math.max(lum1, lum2)
    const darkest = Math.min(lum1, lum2)

    return (brightest + 0.05) / (darkest + 0.05)
  })
}

// 检查WCAG合规性（带缓存）
export const isWCAGCompliantCached = (
  color1: string,
  color2: string,
  level: "AA" | "AAA" = "AA",
): boolean => {
  const normalizedColor1 = normalizeHex(color1)
  const normalizedColor2 = normalizeHex(color2)

  return withWcagCache(normalizedColor1, normalizedColor2, level, () => {
    const contrast = getContrastRatioCached(normalizedColor1, normalizedColor2)
    return level === "AA" ? contrast >= 4.5 : contrast >= 7
  })
}

// 批量检查颜色对比度
export const batchCheckContrast = (
  colors: string[],
  backgrounds: string[] = ["#ffffff", "#000000"],
): Map<string, Map<string, number>> => {
  const results = new Map<string, Map<string, number>>()

  colors.forEach((color) => {
    const colorResults = new Map<string, number>()
    backgrounds.forEach((bg) => {
      colorResults.set(bg, getContrastRatioCached(color, bg))
    })
    results.set(color, colorResults)
  })

  return results
}

// 批量检查WCAG合规性
export const batchCheckWCAG = (
  colors: string[],
  backgrounds: string[] = ["#ffffff", "#000000"],
  level: "AA" | "AAA" = "AA",
): Map<string, Map<string, boolean>> => {
  const results = new Map<string, Map<string, boolean>>()

  colors.forEach((color) => {
    const colorResults = new Map<string, boolean>()
    backgrounds.forEach((bg) => {
      colorResults.set(bg, isWCAGCompliantCached(color, bg, level))
    })
    results.set(color, colorResults)
  })

  return results
}

// 找到最佳对比度的背景色
export const findBestContrastBackground = (
  color: string,
  backgrounds: string[] = ["#ffffff", "#000000", "#f8f9fa", "#212529"],
): { background: string; contrast: number } => {
  let bestBackground = backgrounds[0]
  let bestContrast = 0

  backgrounds.forEach((bg) => {
    const contrast = getContrastRatioCached(color, bg)
    if (contrast > bestContrast) {
      bestContrast = contrast
      bestBackground = bg
    }
  })

  return { background: bestBackground, contrast: bestContrast }
}

// 颜色可访问性评分（0-100）
export const getAccessibilityScore = (
  color: string,
  backgrounds: string[] = ["#ffffff", "#000000"],
): number => {
  const contrasts = backgrounds.map((bg) => getContrastRatioCached(color, bg))
  const maxContrast = Math.max(...contrasts)
  const minContrast = Math.min(...contrasts)

  // 基于最大对比度和最小对比度计算评分
  const maxScore = Math.min(100, (maxContrast / 21) * 100) // 21是理论最大对比度
  const minScore = Math.min(100, (minContrast / 4.5) * 50) // WCAG AA标准

  return Math.round((maxScore + minScore) / 2)
}

// 颜色可访问性建议
export interface AccessibilityRecommendation {
  level: "excellent" | "good" | "fair" | "poor"
  score: number
  suggestions: string[]
  bestBackground: string
  worstBackground: string
}

export const getAccessibilityRecommendations = (
  color: string,
  backgrounds: string[] = ["#ffffff", "#000000", "#f8f9fa", "#212529"],
): AccessibilityRecommendation => {
  const score = getAccessibilityScore(color, backgrounds)
  const contrasts = backgrounds.map((bg) => ({
    background: bg,
    contrast: getContrastRatioCached(color, bg),
  }))

  contrasts.sort((a, b) => b.contrast - a.contrast)
  const bestBackground = contrasts[0].background
  const worstBackground = contrasts[contrasts.length - 1].background

  let level: AccessibilityRecommendation["level"]
  const suggestions: string[] = []

  if (score >= 90) {
    level = "excellent"
    suggestions.push("颜色对比度优秀，符合所有可访问性标准")
  } else if (score >= 70) {
    level = "good"
    suggestions.push("颜色对比度良好，建议在关键文本中使用")
  } else if (score >= 50) {
    level = "fair"
    suggestions.push("颜色对比度一般，建议增加文本粗细或大小")
    suggestions.push("考虑使用更深或更浅的颜色变体")
  } else {
    level = "poor"
    suggestions.push("颜色对比度不足，不建议用于文本显示")
    suggestions.push("建议选择对比度更高的颜色组合")
    suggestions.push("考虑添加边框或阴影来增强可见性")
  }

  // 添加具体的背景建议
  if (contrasts[0].contrast >= 7) {
    suggestions.push(
      `推荐使用 ${bestBackground} 作为背景色（对比度: ${contrasts[0].contrast.toFixed(1)}:1）`,
    )
  }

  return {
    level,
    score,
    suggestions,
    bestBackground,
    worstBackground,
  }
}

// 防抖函数，用于优化频繁的颜色计算
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}
