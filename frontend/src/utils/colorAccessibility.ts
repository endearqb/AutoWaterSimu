/**
 * 颜色可访问性工具函数
 * 包括 WCAG 对比度计算、色盲友好性检测等功能
 */

// 将十六进制颜色转换为 RGB
export function hexToRgb(
  hex: string,
): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null
}

// 计算相对亮度
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

// 计算对比度比率
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)

  if (!rgb1 || !rgb2) return 1

  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b)
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b)

  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

// WCAG 等级检查
export interface WCAGLevel {
  AA: boolean
  AAA: boolean
}

export function checkWCAGCompliance(
  foreground: string,
  background: string,
): {
  ratio: number
  normal: WCAGLevel
  large: WCAGLevel
} {
  const ratio = getContrastRatio(foreground, background)

  return {
    ratio,
    normal: {
      AA: ratio >= 4.5,
      AAA: ratio >= 7,
    },
    large: {
      AA: ratio >= 3,
      AAA: ratio >= 4.5,
    },
  }
}

// 色盲友好性检测
export function isColorBlindFriendly(colors: string[]): {
  protanopia: boolean
  deuteranopia: boolean
  tritanopia: boolean
  overall: boolean
} {
  // 简化的色盲友好性检测
  // 检查颜色是否有足够的亮度差异
  const luminances = colors.map((color) => {
    const rgb = hexToRgb(color)
    if (!rgb) return 0
    return getRelativeLuminance(rgb.r, rgb.g, rgb.b)
  })

  // 检查最大和最小亮度差异
  const maxLuminance = Math.max(...luminances)
  const minLuminance = Math.min(...luminances)
  const luminanceDiff = maxLuminance - minLuminance

  // 基本的色盲友好性判断（简化版）
  const isFriendly = luminanceDiff > 0.3

  return {
    protanopia: isFriendly,
    deuteranopia: isFriendly,
    tritanopia: isFriendly,
    overall: isFriendly,
  }
}

// 获取颜色的可访问性建议
export function getAccessibilityRecommendations(
  foreground: string,
  background: string,
): string[] {
  const compliance = checkWCAGCompliance(foreground, background)
  const recommendations: string[] = []

  if (!compliance.normal.AA) {
    recommendations.push("对比度不足，建议增加前景色和背景色的对比度")
  }

  if (!compliance.normal.AAA) {
    recommendations.push(
      "未达到 AAA 级别，建议进一步提高对比度以获得更好的可访问性",
    )
  }

  if (compliance.ratio < 3) {
    recommendations.push("对比度过低，可能导致视觉障碍用户无法正常阅读")
  }

  return recommendations
}

// 生成色盲友好的调色板
export const COLOR_BLIND_FRIENDLY_PALETTES = {
  // 基于 ColorBrewer 的色盲友好调色板
  qualitative: [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
    "#bcbd22",
    "#17becf",
  ],
  sequential: [
    "#f7fbff",
    "#deebf7",
    "#c6dbef",
    "#9ecae1",
    "#6baed6",
    "#4292c6",
    "#2171b5",
    "#08519c",
    "#08306b",
  ],
  diverging: [
    "#8c510a",
    "#bf812d",
    "#dfc27d",
    "#f6e8c3",
    "#f5f5f5",
    "#c7eae5",
    "#80cdc1",
    "#35978f",
    "#01665e",
  ],
}

// 验证调色板的色盲友好性
export function validateColorPalette(colors: string[]): {
  isAccessible: boolean
  issues: string[]
  suggestions: string[]
} {
  const issues: string[] = []
  const suggestions: string[] = []

  // 检查颜色数量
  if (colors.length < 2) {
    issues.push("调色板颜色数量不足")
    suggestions.push("至少需要2种颜色")
  }

  // 检查对比度
  for (let i = 0; i < colors.length - 1; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const ratio = getContrastRatio(colors[i], colors[j])
      if (ratio < 3) {
        issues.push(`颜色 ${colors[i]} 和 ${colors[j]} 对比度不足`)
        suggestions.push("考虑使用更高对比度的颜色组合")
      }
    }
  }

  // 检查色盲友好性
  const colorBlindCheck = isColorBlindFriendly(colors)
  if (!colorBlindCheck.overall) {
    issues.push("调色板可能不够色盲友好")
    suggestions.push("考虑使用基于亮度差异的颜色组合")
  }

  return {
    isAccessible: issues.length === 0,
    issues,
    suggestions,
  }
}
