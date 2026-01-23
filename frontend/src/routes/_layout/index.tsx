import { Box, Container, Text } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"

import useAuth from "@/hooks/useAuth"
import { useI18n } from "@/i18n"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

function Dashboard() {
  const { user: currentUser } = useAuth()
  const { t } = useI18n()
  const displayName = currentUser?.full_name || currentUser?.email || ""

  return (
    <Container maxW="full">
      <Box pt={12} m={4}>
        <Text fontSize="2xl" truncate maxW="sm">
          {t("dashboard.greeting", { name: displayName })}
        </Text>
        <Text>{t("dashboard.welcomeBack")}</Text>
      </Box>
    </Container>
  )
}
