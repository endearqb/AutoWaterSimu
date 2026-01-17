/**
 * 前端时间处理工具类
 * 提供统一的时间格式化和显示功能
 */

export class TimeUtils {
  /**
   * 格式化日期时间为本地时间字符串
   * @param dateTime - 日期时间字符串或Date对象
   * @param options - 格式化选项
   * @returns 格式化后的时间字符串
   */
  static formatDateTime(
    dateTime: string | Date | null | undefined,
    options: Intl.DateTimeFormatOptions = {},
  ): string {
    if (!dateTime) return "-"

    const date = typeof dateTime === "string" ? new Date(dateTime) : dateTime

    // 默认格式化选项
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      ...options,
    }

    return date.toLocaleString("zh-CN", defaultOptions)
  }

  /**
   * 格式化为简短的日期时间
   * @param dateTime - 日期时间字符串或Date对象
   * @returns 格式化后的时间字符串 (YYYY-MM-DD HH:mm)
   */
  static formatShortDateTime(
    dateTime: string | Date | null | undefined,
  ): string {
    return TimeUtils.formatDateTime(dateTime, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  /**
   * 格式化为日期
   * @param dateTime - 日期时间字符串或Date对象
   * @returns 格式化后的日期字符串 (YYYY-MM-DD)
   */
  static formatDate(dateTime: string | Date | null | undefined): string {
    return TimeUtils.formatDateTime(dateTime, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  }

  /**
   * 格式化为时间
   * @param dateTime - 日期时间字符串或Date对象
   * @returns 格式化后的时间字符串 (HH:mm:ss)
   */
  static formatTime(dateTime: string | Date | null | undefined): string {
    return TimeUtils.formatDateTime(dateTime, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  /**
   * 计算相对时间（多久之前）
   * @param dateTime - 日期时间字符串或Date对象
   * @returns 相对时间字符串
   */
  static getRelativeTime(dateTime: string | Date | null | undefined): string {
    if (!dateTime) return "-"

    const date = typeof dateTime === "string" ? new Date(dateTime) : dateTime
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) {
      return "刚刚"
    }
    if (diffMinutes < 60) {
      return `${diffMinutes}分钟前`
    }
    if (diffHours < 24) {
      return `${diffHours}小时前`
    }
    if (diffDays < 7) {
      return `${diffDays}天前`
    }
    return TimeUtils.formatDate(date)
  }

  /**
   * 计算持续时间
   * @param startTime - 开始时间
   * @param endTime - 结束时间（可选，默认为当前时间）
   * @returns 持续时间字符串
   */
  static getDuration(
    startTime: string | Date | null | undefined,
    endTime?: string | Date | null | undefined,
  ): string {
    if (!startTime) return "-"

    const start =
      typeof startTime === "string" ? new Date(startTime) : startTime
    const end = endTime
      ? typeof endTime === "string"
        ? new Date(endTime)
        : endTime
      : new Date()

    const diffMs = end.getTime() - start.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays}天 ${diffHours % 24}小时 ${diffMinutes % 60}分钟`
    }
    if (diffHours > 0) {
      return `${diffHours}小时 ${diffMinutes % 60}分钟`
    }
    if (diffMinutes > 0) {
      return `${diffMinutes}分钟 ${diffSeconds % 60}秒`
    }
    return `${diffSeconds}秒`
  }

  /**
   * 检查时间是否有效
   * @param dateTime - 日期时间字符串或Date对象
   * @returns 是否为有效时间
   */
  static isValidDateTime(dateTime: string | Date | null | undefined): boolean {
    if (!dateTime) return false

    const date = typeof dateTime === "string" ? new Date(dateTime) : dateTime
    return !Number.isNaN(date.getTime())
  }

  /**
   * 获取当前用户时区
   * @returns 时区字符串
   */
  static getUserTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }

  /**
   * 获取时区偏移量（小时）
   * @returns 时区偏移量
   */
  static getTimezoneOffset(): number {
    return -new Date().getTimezoneOffset() / 60
  }
}

// 导出常用的格式化函数作为默认导出
export const formatDateTime = TimeUtils.formatDateTime
export const formatShortDateTime = TimeUtils.formatShortDateTime
export const formatDate = TimeUtils.formatDate
export const formatTime = TimeUtils.formatTime
export const getRelativeTime = TimeUtils.getRelativeTime
export const getDuration = TimeUtils.getDuration
