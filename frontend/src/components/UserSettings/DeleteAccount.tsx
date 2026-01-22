import { Container, Heading, Text } from "@chakra-ui/react"

import { useI18n } from "@/i18n"
import DeleteConfirmation from "./DeleteConfirmation"

const DeleteAccount = () => {
  const { t } = useI18n()

  return (
    <Container maxW="full">
      <Heading size="sm" py={4}>
        {t("userSettings.deleteAccountTitle")}
      </Heading>
      <Text>{t("userSettings.deleteAccountDescription")}</Text>
      <DeleteConfirmation />
    </Container>
  )
}
export default DeleteAccount
