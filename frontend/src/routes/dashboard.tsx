import { createFileRoute } from "@tanstack/react-router"

import { useI18n } from "@/i18n"

export const Route = createFileRoute("/dashboard")({
  component: () => {
    const { t } = useI18n()
    return <div>{t("dashboard.placeholder")}</div>
  },
})
