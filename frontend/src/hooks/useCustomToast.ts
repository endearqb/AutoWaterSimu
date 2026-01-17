"use client"

import { toaster } from "@/components/ui/toaster"
import { t } from "@/utils/i18n"

const useCustomToast = () => {
  const showSuccessToast = (description: string) => {
    toaster.create({
      title: t("common.success"),
      description,
      type: "success",
    })
  }

  const showErrorToast = (description: string) => {
    toaster.create({
      title: t("common.error"),
      description,
      type: "error",
    })
  }

  const showWarningToast = (description: string) => {
    toaster.create({
      title: t("common.warning"),
      description,
      type: "warning",
    })
  }

  const showInfoToast = (description: string) => {
    toaster.create({
      title: t("common.info"),
      description,
      type: "info",
    })
  }

  return { showSuccessToast, showErrorToast, showWarningToast, showInfoToast }
}

export default useCustomToast
