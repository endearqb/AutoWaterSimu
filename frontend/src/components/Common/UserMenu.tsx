import { Box, Button, Flex, Text } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { FaUserAstronaut } from "react-icons/fa"
import { FiLogOut, FiUser } from "react-icons/fi"

import useAuth from "@/hooks/useAuth"
import { useI18n, useLocale } from "@/i18n"
import {
  MenuContent,
  MenuItem,
  MenuItemCommand,
  MenuItemGroup,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from "../ui/menu"

const UserMenu = () => {
  const { user, logout } = useAuth()
  const { t } = useI18n()
  const { language, setLanguage } = useLocale()

  const handleLogout = async () => {
    logout()
  }

  return (
    <>
      {/* Desktop */}
      <Flex>
        <MenuRoot>
          <MenuTrigger asChild p={2}>
            <Button data-testid="user-menu" variant="solid" maxW="sm" truncate>
              <FaUserAstronaut fontSize="18" />
              <Text>{user?.full_name || t("userMenu.userFallback")}</Text>
            </Button>
          </MenuTrigger>

          <MenuContent>
            <Link to="/settings">
              <MenuItem
                closeOnSelect
                value="user-settings"
                gap={2}
                py={2}
                style={{ cursor: "pointer" }}
              >
                <FiUser fontSize="18px" />
                <Box flex="1">{t("userMenu.profile")}</Box>
              </MenuItem>
            </Link>

            <MenuSeparator />
            <MenuItemGroup title={t("language.label")}>
              <MenuItem
                value="language-zh"
                gap={2}
                py={2}
                onClick={() => setLanguage("zh")}
                style={{ cursor: "pointer" }}
              >
                <Box flex="1">{t("language.zh")}</Box>
                {language === "zh" && <MenuItemCommand>✓</MenuItemCommand>}
              </MenuItem>
              <MenuItem
                value="language-en"
                gap={2}
                py={2}
                onClick={() => setLanguage("en")}
                style={{ cursor: "pointer" }}
              >
                <Box flex="1">{t("language.en")}</Box>
                {language === "en" && <MenuItemCommand>✓</MenuItemCommand>}
              </MenuItem>
            </MenuItemGroup>

            <MenuSeparator />
            <MenuItem
              value="logout"
              gap={2}
              py={2}
              onClick={handleLogout}
              style={{ cursor: "pointer" }}
            >
              <FiLogOut />
              {t("userMenu.logout")}
            </MenuItem>
          </MenuContent>
        </MenuRoot>
      </Flex>
    </>
  )
}

export default UserMenu
