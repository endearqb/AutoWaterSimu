/**
 * 国际化配置
 * 统一管理前端的错误信息、成功信息和警告信息
 */

export type Language = "zh" | "en"

export interface I18nMessages {
  // 通用消息
  common: {
    success: string
    error: string
    warning: string
    loading: string
    cancel: string
    confirm: string
    delete: string
    save: string
    edit: string
    create: string
    update: string
    submit: string
    reset: string
    close: string
    retry: string
    unknown: string
    minute: string
    second: string
  }

  // 文件相关
  file: {
    file: string
    uploadSuccess: string
    uploadFailed: string
    uploading: string
    deleteFile: string
    invalidExtension: string
    invalidMimeType: string
    fileSizeExceeded: string
    upload: {
      success: string
      error: string
      invalidType: string
      sizeExceeded: string
      empty: string
      processing: string
    }
    download: {
      success: string
      error: string
      noResult: string
    }
    validation: {
      unsupportedExtension: string
      unsupportedMimeType: string
      sizeExceeded: string
    }
  }

  // 数据分析相关
  analysis: {
    task: {
      created: string
      running: string
      completed: string
      failed: string
      cancelled: string
      notFound: string
    }
    error: {
      dataEmpty: string
      dataInvalid: string
      processingFailed: string
      timeout: string
      networkError: string
    }
  }

  // 数据分析界面
  dataAnalysis: {
    uploadFile: string
    selectFile: string
    analyzing: string
    analysisComplete: string
    analysisError: string
    noResults: string
    downloadResults: string
    taskCancelled: string
    taskDeleted: string
    noDownloadableResults: string
    downloadStarted: string
    downloadFailed: string
    downloadError: string
    noDownloadLink: string
    status: {
      pending: string
      running: string
      completed: string
      failed: string
      cancelled: string
    }
  }

  // API相关
  api: {
    error: {
      network: string
      timeout: string
      unauthorized: string
      forbidden: string
      notFound: string
      serverError: string
      unknown: string
    }
  }

  // 表单验证
  validation: {
    required: string
    email: string
    password: string
    minLength: string
    maxLength: string
    numeric: string
  }
}

const messages: Record<Language, I18nMessages> = {
  zh: {
    common: {
      success: "成功",
      error: "错误",
      warning: "警告",
      loading: "加载中...",
      cancel: "取消",
      confirm: "确认",
      delete: "删除",
      save: "保存",
      edit: "编辑",
      create: "创建",
      update: "更新",
      submit: "提交",
      reset: "重置",
      close: "关闭",
      retry: "重试",
      unknown: "未知",
      minute: "分钟",
      second: "秒",
    },
    file: {
      file: "文件",
      uploadSuccess: "文件上传成功",
      uploadFailed: "文件上传失败",
      uploading: "上传中",
      deleteFile: "删除文件",
      invalidExtension: "不支持的文件扩展名",
      invalidMimeType: "不支持的文件类型",
      fileSizeExceeded: "文件大小超过限制",
      upload: {
        success: "文件上传成功",
        error: "文件上传失败",
        invalidType: "不支持的文件类型",
        sizeExceeded: "文件大小超过限制",
        empty: "文件不能为空",
        processing: "正在处理文件...",
      },
      download: {
        success: "文件下载成功",
        error: "文件下载失败",
        noResult: "该任务暂无可下载的结果",
      },
      validation: {
        unsupportedExtension: "不支持的文件扩展名",
        unsupportedMimeType: "不支持的文件类型",
        sizeExceeded: "文件大小超过限制",
      },
    },
    analysis: {
      task: {
        created: "分析任务已创建",
        running: "分析任务正在运行",
        completed: "分析任务已完成",
        failed: "分析任务失败",
        cancelled: "分析任务已取消",
        notFound: "未找到分析任务",
      },
      error: {
        dataEmpty: "数据为空或无效",
        dataInvalid: "数据格式无效",
        processingFailed: "数据处理失败",
        timeout: "分析超时",
        networkError: "网络连接错误",
      },
    },
    api: {
      error: {
        network: "网络连接失败",
        timeout: "请求超时",
        unauthorized: "未授权访问",
        forbidden: "权限不足",
        notFound: "资源未找到",
        serverError: "服务器内部错误",
        unknown: "未知错误",
      },
    },
    validation: {
      required: "此字段为必填项",
      email: "请输入有效的邮箱地址",
      password: "密码格式不正确",
      minLength: "长度不能少于{min}个字符",
      maxLength: "长度不能超过{max}个字符",
      numeric: "请输入有效的数字",
    },
    dataAnalysis: {
      uploadFile: "上传文件",
      selectFile: "选择文件",
      analyzing: "分析中...",
      analysisComplete: "分析完成",
      analysisError: "分析错误",
      noResults: "无结果",
      downloadResults: "下载结果",
      taskCancelled: "任务已取消",
      taskDeleted: "任务已删除",
      noDownloadableResults: "该任务暂无可下载的结果",
      downloadStarted: "分析结果下载已开始",
      downloadFailed: "下载失败",
      downloadError: "下载过程中发生错误",
      noDownloadLink: "未收到下载链接",
      status: {
        pending: "等待中",
        running: "运行中",
        completed: "已完成",
        failed: "失败",
        cancelled: "已取消",
      },
    },
  },
  en: {
    common: {
      success: "Success",
      error: "Error",
      warning: "Warning",
      loading: "Loading...",
      cancel: "Cancel",
      confirm: "Confirm",
      delete: "Delete",
      save: "Save",
      edit: "Edit",
      create: "Create",
      update: "Update",
      submit: "Submit",
      reset: "Reset",
      close: "Close",
      retry: "Retry",
      unknown: "Unknown",
      minute: "min",
      second: "s",
    },
    file: {
      file: "File",
      uploadSuccess: "File uploaded successfully",
      uploadFailed: "File upload failed",
      uploading: "Uploading",
      deleteFile: "Delete file",
      invalidExtension: "Unsupported file extension",
      invalidMimeType: "Unsupported file type",
      fileSizeExceeded: "File size exceeds limit",
      upload: {
        success: "File uploaded successfully",
        error: "File upload failed",
        invalidType: "Unsupported file type",
        sizeExceeded: "File size exceeds limit",
        empty: "File cannot be empty",
        processing: "Processing file...",
      },
      download: {
        success: "File downloaded successfully",
        error: "File download failed",
        noResult: "No downloadable results for this task",
      },
      validation: {
        unsupportedExtension: "Unsupported file extension",
        unsupportedMimeType: "Unsupported file type",
        sizeExceeded: "File size exceeds limit",
      },
    },
    analysis: {
      task: {
        created: "Analysis task created",
        running: "Analysis task is running",
        completed: "Analysis task completed",
        failed: "Analysis task failed",
        cancelled: "Analysis task cancelled",
        notFound: "Analysis task not found",
      },
      error: {
        dataEmpty: "Data is empty or invalid",
        dataInvalid: "Invalid data format",
        processingFailed: "Data processing failed",
        timeout: "Analysis timeout",
        networkError: "Network connection error",
      },
    },
    api: {
      error: {
        network: "Network connection failed",
        timeout: "Request timeout",
        unauthorized: "Unauthorized access",
        forbidden: "Insufficient permissions",
        notFound: "Resource not found",
        serverError: "Internal server error",
        unknown: "Unknown error",
      },
    },
    validation: {
      required: "This field is required",
      email: "Please enter a valid email address",
      password: "Invalid password format",
      minLength: "Must be at least {min} characters",
      maxLength: "Must not exceed {max} characters",
      numeric: "Please enter a valid number",
    },
    dataAnalysis: {
      uploadFile: "Upload File",
      selectFile: "Select File",
      analyzing: "Analyzing...",
      analysisComplete: "Analysis Complete",
      analysisError: "Analysis Error",
      noResults: "No Results",
      downloadResults: "Download Results",
      taskCancelled: "Task Cancelled",
      taskDeleted: "Task Deleted",
      noDownloadableResults: "No downloadable results for this task",
      downloadStarted: "Analysis results download started",
      downloadFailed: "Download failed",
      downloadError: "Error occurred during download",
      noDownloadLink: "No download link received",
      status: {
        pending: "Pending",
        running: "Running",
        completed: "Completed",
        failed: "Failed",
        cancelled: "Cancelled",
      },
    },
  },
}

class I18n {
  private currentLanguage: Language = "zh"

  setLanguage(language: Language) {
    this.currentLanguage = language
  }

  getCurrentLanguage(): Language {
    return this.currentLanguage
  }

  t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split(".")
    let value: any = messages[this.currentLanguage]

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k]
      } else {
        console.warn(`Translation key not found: ${key}`)
        return key
      }
    }

    if (typeof value !== "string") {
      console.warn(`Translation value is not a string: ${key}`)
      return key
    }

    // 替换参数
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match
      })
    }

    return value
  }

  // 便捷方法
  success(message?: string): string {
    return message || this.t("common.success")
  }

  error(message?: string): string {
    return message || this.t("common.error")
  }

  warning(message?: string): string {
    return message || this.t("common.warning")
  }
}

export const i18n = new I18n()

// 导出便捷函数
export const t = (key: string, params?: Record<string, string | number>) =>
  i18n.t(key, params)
export const setLanguage = (language: Language) => i18n.setLanguage(language)
export const getCurrentLanguage = () => i18n.getCurrentLanguage()
