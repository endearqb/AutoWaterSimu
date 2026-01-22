/**
 * 统一的文件类型验证配置
 * 与后端保持一致的文件类型验证逻辑
 */

import { t } from "./i18n"

interface FileTypeConfig {
  extensions: string[]
  mimeTypes: string[]
  maxSizeMB: number
  description: string
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  fileType?: string
  supportedExtensions: string[]
  supportedMimeTypes: string[]
  maxSizeMB: number
}

interface ValidateOptions {
  maxSizeOverrideBytes?: number
}

export class FileValidationConfig {
  // 支持的文件类型配置
  private static readonly SUPPORTED_TYPES: Record<string, FileTypeConfig> = {
    csv: {
      extensions: [".csv"],
      mimeTypes: ["text/csv", "application/csv", "text/comma-separated-values"],
      maxSizeMB: 100,
      description: "CSV",
    },
    excel: {
      extensions: [".xlsx", ".xls"],
      mimeTypes: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/excel",
        "application/x-excel",
        "application/x-msexcel",
      ],
      maxSizeMB: 100,
      description: "Excel",
    },
  }

  /**
   * 获取所有支持的文件扩展名
   */
  static getAllExtensions(): string[] {
    const extensions: string[] = []
    Object.values(FileValidationConfig.SUPPORTED_TYPES).forEach((config) => {
      extensions.push(...config.extensions)
    })
    return extensions
  }

  /**
   * 获取所有支持的MIME类型
   */
  static getAllMimeTypes(): string[] {
    const mimeTypes: string[] = []
    Object.values(FileValidationConfig.SUPPORTED_TYPES).forEach((config) => {
      mimeTypes.push(...config.mimeTypes)
    })
    return mimeTypes
  }

  /**
   * 获取最大文件大小（字节）
   */
  static getMaxFileSize(): number {
    const maxSizeMB = Math.max(
      ...Object.values(FileValidationConfig.SUPPORTED_TYPES).map(
        (config) => config.maxSizeMB,
      ),
    )
    return maxSizeMB * 1024 * 1024
  }

  /**
   * 检查文件扩展名是否被允许
   */
  static isExtensionAllowed(filename: string): boolean {
    const filenameLower = filename.toLowerCase()
    return FileValidationConfig.getAllExtensions().some((ext) =>
      filenameLower.endsWith(ext),
    )
  }

  /**
   * 检查MIME类型是否被允许
   */
  static isMimeTypeAllowed(mimeType: string): boolean {
    const mimeTypeLower = mimeType.toLowerCase()
    return FileValidationConfig.getAllMimeTypes().some(
      (mt) => mt.toLowerCase() === mimeTypeLower,
    )
  }

  /**
   * 根据文件扩展名获取文件类型
   */
  static getFileTypeByExtension(filename: string): string | null {
    const filenameLower = filename.toLowerCase()
    for (const [fileType, config] of Object.entries(
      FileValidationConfig.SUPPORTED_TYPES,
    )) {
      if (config.extensions.some((ext) => filenameLower.endsWith(ext))) {
        return fileType
      }
    }
    return null
  }

  /**
   * 根据MIME类型获取文件类型
   */
  static getFileTypeByMime(mimeType: string): string | null {
    const mimeTypeLower = mimeType.toLowerCase()
    for (const [fileType, config] of Object.entries(
      FileValidationConfig.SUPPORTED_TYPES,
    )) {
      if (config.mimeTypes.some((mt) => mt.toLowerCase() === mimeTypeLower)) {
        return fileType
      }
    }
    return null
  }

  /**
   * 验证文件
   */
  static validateFile(file: File, options?: ValidateOptions): ValidationResult {
    const errors: string[] = []
    let fileType: string | null = null

    // 检查扩展名
    if (!FileValidationConfig.isExtensionAllowed(file.name)) {
      const supportedExts = FileValidationConfig.getAllExtensions()
        .sort()
        .join(", ")
      errors.push(
        `${t("file.validation.unsupportedExtension")} ${t("file.validation.supportedFormats", { formats: supportedExts })}`,
      )
    } else {
      fileType = FileValidationConfig.getFileTypeByExtension(file.name)
    }

    // 检查MIME类型
    if (!FileValidationConfig.isMimeTypeAllowed(file.type)) {
      errors.push(`${t("file.validation.unsupportedMimeType")}: ${file.type}`)
    }

    // 检查文件大小
    const maxSize =
      options?.maxSizeOverrideBytes ?? FileValidationConfig.getMaxFileSize()
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024)
      const currentSizeMB = file.size / (1024 * 1024)
      errors.push(
        `${t("file.validation.sizeExceeded")} ${t("file.validation.sizeExceededDetail", {
          current: currentSizeMB.toFixed(1),
          max: maxSizeMB,
        })}`,
      )
    }

    return {
      isValid: errors.length === 0,
      errors,
      fileType: fileType || undefined,
      supportedExtensions: FileValidationConfig.getAllExtensions(),
      supportedMimeTypes: FileValidationConfig.getAllMimeTypes(),
      maxSizeMB: maxSize / (1024 * 1024),
    }
  }

  /**
   * 获取前端input accept属性的字符串
   */
  static getFrontendAcceptString(): string {
    const extensions = FileValidationConfig.getAllExtensions()
    const mimeTypes = FileValidationConfig.getAllMimeTypes()
    return [...extensions, ...mimeTypes].sort().join(",")
  }

  /**
   * 获取支持的文件类型描述
   */
  static getSupportedTypesDescription(): string {
    const descriptions = Object.values(
      FileValidationConfig.SUPPORTED_TYPES,
    ).map((config) => config.description)
    return descriptions.join("、")
  }
}
