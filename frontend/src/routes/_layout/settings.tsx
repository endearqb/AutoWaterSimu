import { Container, Heading, Tabs } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"

// import Appearance from "@/components/UserSettings/Appearance"
import ChangePassword from "@/components/UserSettings/ChangePassword"
import DeleteAccount from "@/components/UserSettings/DeleteAccount"
import UserInformation from "@/components/UserSettings/UserInformation"
import useAuth from "@/hooks/useAuth"
import { useI18n } from "@/i18n"

const tabsConfig = (t: (key: string) => string) => [
  { value: "my-profile", title: t("userSettings.tabProfile"), component: UserInformation },
  { value: "password", title: t("userSettings.tabPassword"), component: ChangePassword },
  // { value: "appearance", title: "Appearance", component: Appearance },
  { value: "danger-zone", title: t("userSettings.tabDanger"), component: DeleteAccount },
]

export const Route = createFileRoute("/_layout/settings")({
  component: UserSettings,
})

function UserSettings() {
  const { user: currentUser } = useAuth()
  const { t } = useI18n()
  const baseTabs = tabsConfig(t)
  const finalTabs = currentUser?.is_superuser
    ? baseTabs.slice(0, 2)
    : baseTabs

  if (!currentUser) {
    return null
  }

  return (
    <Container maxW="full">
      <Heading size="lg" textAlign={{ base: "center", md: "left" }} py={12}>
        {t("userSettings.title")}
      </Heading>

      <Tabs.Root defaultValue="my-profile" variant="subtle">
        <Tabs.List>
          {finalTabs.map((tab) => (
            <Tabs.Trigger key={tab.value} value={tab.value}>
              {tab.title}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {finalTabs.map((tab) => (
          <Tabs.Content key={tab.value} value={tab.value}>
            <tab.component />
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </Container>
  )
}
