import {
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  IconButton,
  Image,
  Text,
} from "@chakra-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useState } from "react"
import { FaBars, FaUserAstronaut } from "react-icons/fa"
import { FiChevronLeft, FiChevronRight, FiLogOut, FiUser } from "react-icons/fi"

import type { UserPublic } from "@/client"
import { useI18n } from "@/i18n"
import useAuth from "@/hooks/useAuth"
import {
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerRoot,
  DrawerTrigger,
} from "../ui/drawer"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "../ui/menu"
import SidebarItems from "./SidebarItems"

const Sidebar = () => {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const { user, logout } = useAuth()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // 移除自动隐藏逻辑，改为手动控制
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     if (!isHovered) {
  //       setIsCollapsed(true)
  //     }
  //   }, 3000) // 3秒后自动隐藏

  //   return () => clearTimeout(timer)
  // }, [isHovered])

  const handleMouseEnter = () => {
    // 移除自动展开功能
    setIsHovered(true) // 鼠标进入时设置为 true
  }

  const handleMouseLeave = () => {
    setIsHovered(false) // 鼠标离开时设置为 false
  }

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <>
      {/* Mobile */}
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
                {/* 移动端Logo区域 */}
                <Box p={3} borderBottom="1px" borderColor="gray.200" mb={4}>
                  <HStack gap={2} asChild>
                    <Link to="/" onClick={() => setOpen(false)}>
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
                </Box>
                <SidebarItems onClose={() => setOpen(false)} />
              </Box>
              {/* 移动端用户信息区域 */}
              <Box borderTop="1px" borderColor="gray.200" pt={4}>
                {currentUser && (
                  <Flex direction="column" gap={2}>
                    <Flex alignItems="center" gap={3} px={4} py={2}>
                      <FaUserAstronaut fontSize="18" />
                      <Box>
                        <Text fontSize="sm" fontWeight="medium">
                          {user?.full_name || t("userMenu.userFallback")}
                        </Text>
                        <Text fontSize="xs" color="gray.500" truncate>
                          {currentUser.email}
                        </Text>
                      </Box>
                    </Flex>
                    <Link to="/settings">
                      <Flex
                        alignItems="center"
                        gap={3}
                        px={4}
                        py={2}
                        _hover={{ bg: "gray.100" }}
                        onClick={() => setOpen(false)}
                      >
                        <FiUser />
                        <Text fontSize="sm">{t("userMenu.profile")}</Text>
                      </Flex>
                    </Link>
                    <Flex
                      as="button"
                      onClick={() => {
                        logout()
                        setOpen(false)
                      }}
                      alignItems="center"
                      gap={3}
                      px={4}
                      py={2}
                      _hover={{ bg: "gray.100" }}
                      w="100%"
                    >
                      <FiLogOut />
                      <Text fontSize="sm">{t("userMenu.logout")}</Text>
                    </Flex>
                  </Flex>
                )}
              </Box>
            </Flex>
          </DrawerBody>
        </DrawerContent>
      </DrawerRoot>

      {/* Desktop */}
      <Box
        data-sidebar
        display={{ base: "none", md: "flex" }}
        position="relative"
        bg="bg.subtle"
        h="100vh"
        transition="all 0.3s ease"
        w={isCollapsed ? "60px" : "240px"}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Flex direction="column" w="100%" h="100%">
          {/* Logo区域 */}
          <Box p={3} borderBottom="1px" borderColor="gray.200">
            <Flex
              align="center"
              justify={isCollapsed ? "center" : "flex-start"}
            >
              {isCollapsed ? (
                <Image
                  src="/assets/images/E-logos-1.png"
                  alt={t("app.logoAlt")}
                  boxSize={6}
                />
              ) : (
                <HStack gap={2} asChild>
                  <Link to="/">
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
          </Box>

          {/* 菜单项 */}
          <Box flex="1" overflow="hidden" position="relative">
            <SidebarItems collapsed={isCollapsed} />

            {/* 折叠按钮 - 中间靠右位置，鼠标悬停时显示 */}
            <Box
              position="absolute"
              top="50%"
              right="8px"
              transform="translateY(-50%)"
              opacity={isHovered ? 1 : 0} // 根据悬停状态控制透明度
              transition="all 0.2s ease"
              zIndex={10}
              pointerEvents={isHovered ? "auto" : "none"} // 隐藏时禁用鼠标事件
            >
              <IconButton
                variant="ghost"
                size="sm"
                onClick={toggleCollapse}
                aria-label={
                  isCollapsed ? t("common.expandSidebar") : t("common.collapseSidebar")
                }
                bg="white"
                shadow="sm"
                border="1px"
                borderColor="gray.200"
                _hover={{
                  bg: "gray.50",
                  shadow: "md",
                }}
              >
                <Box pointerEvents="none">
                  {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
                </Box>
              </IconButton>
            </Box>
          </Box>

          {/* 用户信息区域 - 底部 */}
          <Box borderTop="1px" borderColor="gray.200" p={2}>
            {currentUser && (
              <MenuRoot>
                <MenuTrigger asChild>
                  <Button
                    variant="ghost"
                    w="100%"
                    h="auto"
                    p={2}
                    data-testid="user-menu"
                    justifyContent={isCollapsed ? "center" : "flex-start"}
                  >
                    <Flex alignItems="center" gap={2} w="100%">
                      <FaUserAstronaut fontSize="18" />
                      {!isCollapsed && (
                        <Box flex="1" textAlign="left">
                          <Text fontSize="sm" fontWeight="medium" truncate>
                            {user?.full_name || t("userMenu.userFallback")}
                          </Text>
                          <Text fontSize="xs" color="gray.500" truncate>
                            {currentUser.email}
                          </Text>
                        </Box>
                      )}
                    </Flex>
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

                  <MenuItem
                    value="logout"
                    gap={2}
                    py={2}
                    onClick={logout}
                    style={{ cursor: "pointer" }}
                  >
                    <FiLogOut />
                    {t("userMenu.logout")}
                  </MenuItem>
                </MenuContent>
              </MenuRoot>
            )}
          </Box>
        </Flex>
      </Box>
    </>
  )
}

export default Sidebar
