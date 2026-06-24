import {
  Box,
  Flex,
  HStack,
  Heading,
  IconButton,
  Image,
  Switch,
  Text,
} from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { useState } from "react"
import { FaBars } from "react-icons/fa"
import { FiChevronLeft, FiChevronRight } from "react-icons/fi"

import { useI18n, useLocale } from "@/i18n"
import {
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerRoot,
  DrawerTrigger,
} from "../ui/drawer"
import SidebarItems from "./SidebarItems"

const StandaloneSidebar = () => {
  const { t } = useI18n()
  const { language, setLanguage } = useLocale()
  const [open, setOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const languageSwitch = (collapsed = false) => (
    <HStack
      justify={collapsed ? "center" : "space-between"}
      align="center"
      px={1}
      py={2}
    >
      {!collapsed && (
        <Text
          fontSize="xs"
          color={language === "zh" ? "gray.900" : "gray.500"}
        >
          {t("language.zh")}
        </Text>
      )}
      <Switch.Root
        checked={language === "en"}
        onCheckedChange={(details) =>
          setLanguage(details.checked ? "en" : "zh")
        }
        colorPalette="gray"
      >
        <Switch.HiddenInput aria-label={t("language.label")} />
        <Switch.Control />
      </Switch.Root>
      {!collapsed && (
        <Text
          fontSize="xs"
          color={language === "en" ? "gray.900" : "gray.500"}
        >
          {t("language.en")}
        </Text>
      )}
    </HStack>
  )

  const logo = (collapsed = false, close?: () => void) => (
    <Flex align="center" justify={collapsed ? "center" : "flex-start"}>
      {collapsed ? (
        <Image
          src="/assets/images/E-logos-1.png"
          alt={t("app.logoAlt")}
          boxSize={6}
        />
      ) : (
        <HStack gap={2} asChild>
          <Link to="/" onClick={close}>
            <Image
              src="/assets/images/E-logos-1.png"
              alt={t("app.logoAlt")}
              boxSize={6}
            />
            <Heading
              size="lg"
              fontWeight="medium"
              bgGradient="to-r"
              gradientFrom="hsl(192,85%,52%)"
              gradientTo="hsl(212,98%,55%)"
              bgClip="text"
              letterSpacing="tight"
            >
              ENVDAMA
            </Heading>
          </Link>
        </HStack>
      )}
    </Flex>
  )

  return (
    <>
      <DrawerRoot
        placement="start"
        open={open}
        onOpenChange={(e) => setOpen(e.open)}
      >
        <DrawerBackdrop />
        <DrawerTrigger asChild>
          <IconButton
            variant="ghost"
            color="inherit"
            display={{ base: "flex", md: "none" }}
            aria-label={t("common.openMenu")}
            position="absolute"
            zIndex="100"
            m={4}
          >
            <FaBars />
          </IconButton>
        </DrawerTrigger>
        <DrawerContent maxW="xs">
          <DrawerCloseTrigger />
          <DrawerBody>
            <Flex flexDir="column" justify="space-between" h="100%">
              <Box>
                <Box p={3} borderBottom="1px" borderColor="gray.200" mb={4}>
                  {logo(false, () => setOpen(false))}
                </Box>
                <SidebarItems onClose={() => setOpen(false)} />
              </Box>
              <Box borderTop="1px" borderColor="gray.200" pt={4}>
                {languageSwitch()}
              </Box>
            </Flex>
          </DrawerBody>
        </DrawerContent>
      </DrawerRoot>

      <Box
        data-sidebar
        display={{ base: "none", md: "flex" }}
        position="relative"
        bg="bg.subtle"
        h="100vh"
        transition="all 0.3s ease"
        w={isCollapsed ? "60px" : "240px"}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Flex direction="column" w="100%" h="100%">
          <Box p={3} borderBottom="1px" borderColor="gray.200">
            {logo(isCollapsed)}
          </Box>

          <Box flex="1" overflow="hidden" position="relative">
            <SidebarItems collapsed={isCollapsed} />
            <Box
              position="absolute"
              top="50%"
              right="8px"
              transform="translateY(-50%)"
              opacity={isHovered ? 1 : 0}
              transition="all 0.2s ease"
              zIndex={10}
              pointerEvents={isHovered ? "auto" : "none"}
            >
              <IconButton
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed((value) => !value)}
                aria-label={
                  isCollapsed
                    ? t("common.expandSidebar")
                    : t("common.collapseSidebar")
                }
                bg="white"
                shadow="sm"
                border="1px"
                borderColor="gray.200"
                _hover={{ bg: "gray.50", shadow: "md" }}
              >
                <Box pointerEvents="none">
                  {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
                </Box>
              </IconButton>
            </Box>
          </Box>

          <Box borderTop="1px" borderColor="gray.200" p={2}>
            {languageSwitch(isCollapsed)}
          </Box>
        </Flex>
      </Box>
    </>
  )
}

export default StandaloneSidebar
