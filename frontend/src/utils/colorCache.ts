// 颜色计算缓存系统
// 用于缓存颜色对比度计算、颜色转换等耗时操作的结果

interface CacheEntry<T> {
  value: T
  timestamp: number
}

class ColorCache {
  private static instance: ColorCache
  private contrastCache = new Map<string, CacheEntry<number>>()
  private rgbCache = new Map<
    string,
    CacheEntry<[number, number, number] | null>
  >()
  private luminanceCache = new Map<string, CacheEntry<number>>()
  private wcagCache = new Map<string, CacheEntry<boolean>>()

  // 缓存过期时间（毫秒）
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5分钟

  // 最大缓存条目数
  private readonly MAX_CACHE_SIZE = 1000

  private constructor() {
    // 定期清理过期缓存
    setInterval(() => this.cleanExpiredEntries(), 60000) // 每分钟清理一次
  }

  public static getInstance(): ColorCache {
    if (!ColorCache.instance) {
      ColorCache.instance = new ColorCache()
    }
    return ColorCache.instance
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > this.CACHE_TTL
  }

  private cleanExpiredEntries(): void {
    const now = Date.now()

    // 清理对比度缓存
    for (const [key, entry] of this.contrastCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.contrastCache.delete(key)
      }
    }

    // 清理RGB缓存
    for (const [key, entry] of this.rgbCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.rgbCache.delete(key)
      }
    }

    // 清理亮度缓存
    for (const [key, entry] of this.luminanceCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.luminanceCache.delete(key)
      }
    }

    // 清理WCAG缓存
    for (const [key, entry] of this.wcagCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.wcagCache.delete(key)
      }
    }
  }

  private limitCacheSize<T>(cache: Map<string, CacheEntry<T>>): void {
    if (cache.size > this.MAX_CACHE_SIZE) {
      // 删除最旧的条目
      const entries = Array.from(cache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

      const toDelete = entries.slice(0, cache.size - this.MAX_CACHE_SIZE + 100) // 多删除一些以避免频繁清理
      toDelete.forEach(([key]) => cache.delete(key))
    }
  }

  // 缓存颜色对比度计算
  public getContrast(
    color1: string,
    color2: string,
    calculator: () => number,
  ): number {
    const key = `${color1}-${color2}`
    const cached = this.contrastCache.get(key)

    if (cached && !this.isExpired(cached)) {
      return cached.value
    }

    const value = calculator()
    this.contrastCache.set(key, { value, timestamp: Date.now() })
    this.limitCacheSize(this.contrastCache)

    return value
  }

  // 缓存RGB转换
  public getRgb(
    hex: string,
    converter: () => [number, number, number] | null,
  ): [number, number, number] | null {
    const cached = this.rgbCache.get(hex)

    if (cached && !this.isExpired(cached)) {
      return cached.value
    }

    const value = converter()
    this.rgbCache.set(hex, { value, timestamp: Date.now() })
    this.limitCacheSize(this.rgbCache)

    return value
  }

  // 缓存亮度计算
  public getLuminance(color: string, calculator: () => number): number {
    const cached = this.luminanceCache.get(color)

    if (cached && !this.isExpired(cached)) {
      return cached.value
    }

    const value = calculator()
    this.luminanceCache.set(color, { value, timestamp: Date.now() })
    this.limitCacheSize(this.luminanceCache)

    return value
  }

  // 缓存WCAG合规性检查
  public getWcagCompliance(
    color1: string,
    color2: string,
    level: "AA" | "AAA",
    checker: () => boolean,
  ): boolean {
    const key = `${color1}-${color2}-${level}`
    const cached = this.wcagCache.get(key)

    if (cached && !this.isExpired(cached)) {
      return cached.value
    }

    const value = checker()
    this.wcagCache.set(key, { value, timestamp: Date.now() })
    this.limitCacheSize(this.wcagCache)

    return value
  }

  // 获取缓存统计信息
  public getCacheStats() {
    return {
      contrastCache: this.contrastCache.size,
      rgbCache: this.rgbCache.size,
      luminanceCache: this.luminanceCache.size,
      wcagCache: this.wcagCache.size,
      total:
        this.contrastCache.size +
        this.rgbCache.size +
        this.luminanceCache.size +
        this.wcagCache.size,
    }
  }

  // 清空所有缓存
  public clearAll(): void {
    this.contrastCache.clear()
    this.rgbCache.clear()
    this.luminanceCache.clear()
    this.wcagCache.clear()
  }

  // 预热缓存 - 为常用颜色组合预计算结果
  public warmupCache(colors: string[]): void {
    const commonBackgrounds = ["#ffffff", "#000000", "#f8f9fa", "#212529"]

    colors.forEach((color) => {
      commonBackgrounds.forEach((bg) => {
        // 预计算对比度
        this.getContrast(color, bg, () => {
          // 这里需要实际的计算逻辑，暂时返回0
          return 0
        })

        // 预计算WCAG合规性
        this.getWcagCompliance(color, bg, "AA", () => false)
        this.getWcagCompliance(color, bg, "AAA", () => false)
      })
    })
  }
}

export const colorCache = ColorCache.getInstance()

// 导出缓存装饰器函数
export const withContrastCache = (
  color1: string,
  color2: string,
  calculator: () => number,
): number => {
  return colorCache.getContrast(color1, color2, calculator)
}

export const withRgbCache = (
  hex: string,
  converter: () => [number, number, number] | null,
): [number, number, number] | null => {
  return colorCache.getRgb(hex, converter)
}

export const withLuminanceCache = (
  color: string,
  calculator: () => number,
): number => {
  return colorCache.getLuminance(color, calculator)
}

export const withWcagCache = (
  color1: string,
  color2: string,
  level: "AA" | "AAA",
  checker: () => boolean,
): boolean => {
  return colorCache.getWcagCompliance(color1, color2, level, checker)
}
