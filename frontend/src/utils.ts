import type { ApiError } from "./client"
import useCustomToast from "./hooks/useCustomToast"
import { t } from "./utils/i18n"

export const emailPattern = {
  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  message: t("validation.email"),
}

export const namePattern = {
  value: /^[A-Za-z\s\u00C0-\u017F]{1,30}$/,
  message: t("validation.name"),
}

export const getEmailPattern = () => ({
  value: emailPattern.value,
  message: t("validation.email"),
})

export const getNamePattern = () => ({
  value: namePattern.value,
  message: t("validation.name"),
})

export const passwordRules = (isRequired = true) => {
  const rules: any = {
    minLength: {
      value: 8,
      message: t("validation.minLength", { min: 8 }),
    },
  }

  if (isRequired) {
    rules.required = t("validation.required")
  }

  return rules
}

export const confirmPasswordRules = (
  getValues: () => any,
  isRequired = true,
) => {
  const rules: any = {
    validate: (value: string) => {
      const password = getValues().password || getValues().new_password
      return value === password ? true : t("validation.passwordMismatch")
    },
  }

  if (isRequired) {
    rules.required = t("validation.confirmPasswordRequired")
  }

  return rules
}

export const handleError = (err: ApiError) => {
  const { showErrorToast } = useCustomToast()
  const errDetail = (err.body as any)?.detail
  let errorMessage = errDetail || t("errors.somethingWentWrong")
  if (Array.isArray(errDetail) && errDetail.length > 0) {
    errorMessage = errDetail[0].msg
  }
  showErrorToast(errorMessage)
}

/**
 * 处理API错误并返回详细的错误信息
 * @param error API错误对象
 * @returns 格式化的错误信息
 */
export const getDetailedErrorMessage = (error: any): string => {
  // 处理标准的API错误响应
  if (error?.body?.detail) {
    const detail = error.body.detail

    // 如果是字符串，直接返回
    if (typeof detail === "string") {
      return detail
    }

    // 如果是验证错误数组（Pydantic格式）
    if (Array.isArray(detail)) {
      const validationErrors = detail.map((err: any) => {
        const location = err.loc ? err.loc.join(".") : "unknown"
        const message = err.msg || t("errors.validationError")
        const input = err.input
          ? ` (received: ${JSON.stringify(err.input)})`
          : ""
        return `${location}: ${message}${input}`
      })

      if (validationErrors.length === 1) {
        return validationErrors[0]
      }

      return `${t("errors.validationErrors")}\n${validationErrors.map((err) => `- ${err}`).join("\n")}`
    }

    // 如果是对象，尝试提取有用信息
    if (typeof detail === "object") {
      return JSON.stringify(detail, null, 2)
    }
  }

  // 处理其他类型的错误
  if (error?.message) {
    return error.message
  }

  if (error?.statusText) {
    return `${error.status || t("common.unknown")}: ${error.statusText}`
  }

  return t("errors.unexpected")
}

/**
 * 显示详细的错误信息
 * @param error API错误对象
 * @param defaultMessage 默认错误消息
 */
export const showDetailedError = (
  error: any,
  defaultMessage = t("errors.operationFailed"),
) => {
  const { showErrorToast } = useCustomToast()
  const errorMessage = getDetailedErrorMessage(error) || defaultMessage
  showErrorToast(errorMessage)
}
