import {
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  IconButton,
  Image,
  Menu,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { FaBars, FaTimes } from "react-icons/fa"
import { useI18n, useLocale } from "../../i18n"

const MotionBox = motion.create(Box)
const MotionVStack = motion.create(VStack)
const MotionText = motion.create(Text)

const listVariant = {
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
  hidden: {
    opacity: 0,
  },
}

const itemVariant = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
}

export const MiddayHead = () => {
  const { t } = useI18n()
  const { language, setLanguage } = useLocale()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [showBlur, setShowBlur] = useState(false)
  const bgColor = "rgba(255,255,255,0.7)"
  const textColor = "gray.700"
  const isZh = language === "zh"
  const isEn = language === "en"

  useEffect(() => {
    const setPixelRatio = () => {
      const pixelRatio = window.devicePixelRatio || 1
      document.documentElement.style.setProperty(
        "--pixel-ratio",
        `${1 / pixelRatio}`,
      )
    }

    setPixelRatio()
    window.addEventListener("resize", setPixelRatio)

    return () => window.removeEventListener("resize", setPixelRatio)
  }, [])

  useEffect(() => {
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  const handleToggleMenu = () => {
    setIsDrawerOpen((prev) => {
      document.body.style.overflow = prev ? "" : "hidden"
      return !prev
    })
  }

  const handleOnClick = () => {
    setShowBlur(false)
  }

  const links = [
    {
      title: t("landing.nav.knowledge"),
      type: "dropdown",
      items: [
        {
          title: t("landing.nav.deepResearch"),
          path: "/ai-deep-research",
        },
        {
          title: t("landing.nav.calculators"),
          path: "/calculators",
        },
      ],
    },
    {
      title: t("landing.nav.flow"),
      path: "/openflow",
    },
    {
      title: t("landing.nav.updates"),
      path: "/updates",
    },
  ]

  return (
    <Box
      as="header"
      position="fixed"
      top="0px"
      zIndex="50"
      px={{ base: 2, md: 4 }}
      display="flex"
      justifyContent="center"
      mt={4}
      w="100%"
      pointerEvents="none"
    >
      {/* 
        Header宽度调整说明：
        1. 原始设置：maxW="container.xl" (1280px) + w="full" 导致header过宽
        2. 调整方案：
           - 桌面端：maxW="4xl" (896px) 提供合适的宽度
           - 移动端：w="95%" 留出适当边距
           - 平板端：w="90%" 平衡显示效果
        3. 效果：header宽度更加紧凑，视觉效果更佳
      */}
      <Box
        as="nav"
        borderWidth="1px"
        borderColor="gray.300" // 修改为灰色边框
        px={4}
        display="flex"
        alignItems="center"
        justifyContent="space-between" // 添加两端对齐布局
        backdropFilter="blur(12px)"
        bg={bgColor}
        h="50px"
        zIndex={20}
        position="relative"
        borderRadius="md"
        maxW="3xl" // 从 container.xl (1280px) 调整为 4xl (896px)
        w={{ base: "95%", md: "90%", lg: "85%" }} // 响应式宽度替代 full
        pointerEvents="auto"
      >
        {/* Logo */}
        <Box
          _hover={{ transform: "scale(1.02)" }}
          transition="all 0.2s"
          cursor="pointer"
        >
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
                display={{ base: "none", sm: "block" }}
              >
                ENVDAMA
              </Heading>
            </Link>
          </HStack>
        </Box>

        {/* 右侧导航区域 */}
        <HStack gap={0} display={{ base: "none", md: "flex" }}>
          {/* Desktop Navigation */}
          <HStack gap={2} fontWeight="medium" fontSize="sm">
            {links.map((link) => {
              if (link.type === "dropdown") {
                return (
                  <Menu.Root key={link.title}>
                    <Menu.Trigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        fontSize="sm"
                        fontWeight="medium"
                        px={3}
                        py={2}
                        color={textColor}
                        _hover={{ opacity: 0.7 }}
                      >
                        {link.title}
                      </Button>
                    </Menu.Trigger>
                    <Portal>
                      <Menu.Positioner>
                        <Menu.Content>
                          {link.items?.map((item) => (
                            <Menu.Item
                              key={item.path}
                              value={item.path}
                              asChild
                            >
                              <Link to={item.path} onClick={handleOnClick}>
                                {item.title}
                              </Link>
                            </Menu.Item>
                          ))}
                        </Menu.Content>
                      </Menu.Positioner>
                    </Portal>
                  </Menu.Root>
                )
              }
              return (
                <Text
                  key={link.path}
                  asChild
                  h="32px"
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="sm"
                  fontWeight="medium"
                  px={3}
                  py={2}
                  color={textColor}
                  cursor="pointer"
                  transition="opacity 0.2s"
                  _hover={{ opacity: 0.7 }}
                  onClick={handleOnClick}
                >
                  <Link to={link.path}>{link.title}</Link>
                </Text>
              )
            })}
          </HStack>

          {/* 分隔线 */}
          <Box w="1px" h="24px" bg="gray.300" mx={3} />

          <HStack gap={1}>
            <Menu.Root>
              <Menu.Trigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  fontSize="sm"
                  fontWeight="medium"
                  px={3}
                  py={2}
                  color={textColor}
                  _hover={{ opacity: 0.7 }}
                  aria-label={t("language.label")}
                >
                  {t("language.label")}
                </Button>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content>
                    <Menu.Item
                      value="language-zh"
                      onClick={() => setLanguage("zh")}
                      fontWeight={isZh ? "semibold" : "normal"}
                    >
                      {t("language.zh")}
                    </Menu.Item>
                    <Menu.Item
                      value="language-en"
                      onClick={() => setLanguage("en")}
                      fontWeight={isEn ? "semibold" : "normal"}
                    >
                      {t("language.en")}
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>

            {/* Sign in Button */}
            <Button
              asChild
              fontSize="sm"
              fontWeight="medium"
              px={3}
              variant="ghost"
              border="none" // 移除边框
              boxShadow="none" // 移除阴影
              _hover={{}} // 移除hover效果
              _active={{}}
              _focus={{}}
            >
              <Link to="/login">{t("landing.nav.getStarted")}</Link>
            </Button>
          </HStack>
        </HStack>

        {/* Mobile Menu Button */}
        <IconButton
          variant="ghost"
          ml="auto"
          display={{ base: "flex", md: "none" }}
          p={2}
          onClick={handleToggleMenu}
          aria-label={t("landing.nav.toggleMenu")}
        >
          <FaBars />
        </IconButton>
      </Box>

      {/* Mobile Menu Overlay */}
      {isDrawerOpen && (
        <MotionBox
          position="fixed"
          bg="background"
          top="-2px"
          right={0}
          left={0}
          bottom={0}
          h="100vh"
          zIndex={10}
          px={2}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Flex
            mt={4}
            justify="space-between"
            p={3}
            px={4}
            position="relative"
            ml="1px"
          >
            <IconButton
              variant="ghost"
              onClick={handleToggleMenu}
              aria-label="Close menu"
            >
              <Image
                src="/assets/images/E-logos-1.png"
                alt={t("app.logoAlt")}
                boxSize={6}
              />
            </IconButton>

            <IconButton
              variant="ghost"
              ml="auto"
              display={{ base: "flex", md: "none" }}
              p={2}
              position="absolute"
              right="10px"
              top={2}
              onClick={handleToggleMenu}
              aria-label={t("landing.nav.closeMenu")}
            >
              <FaTimes />
            </IconButton>
          </Flex>

          <Box h="100vh" pb="150px" overflow="auto">
            <MotionVStack
              initial="hidden"
              animate="show"
              px={3}
              pt={8}
              fontSize="xl"
              color="gray.500"
              gap={8}
              mb={8}
              overflow="auto"
              variants={listVariant}
              align="stretch"
            >
              {links.map((link) => {
                if (link.type === "dropdown") {
                  return (
                    <Box key={link.title}>
                      <MotionText
                        variants={itemVariant}
                        fontSize="xl"
                        color="gray.600"
                        fontWeight="semibold"
                        mb={2}
                      >
                        {link.title}
                      </MotionText>
                      {link.items?.map((item) => (
                        <MotionText
                          key={item.path}
                          variants={itemVariant}
                          asChild
                          cursor="pointer"
                          onClick={handleToggleMenu}
                          ml={4}
                          fontSize="lg"
                          color="gray.500"
                        >
                          <Link to={item.path}>{item.title}</Link>
                        </MotionText>
                      ))}
                    </Box>
                  )
                }
                return (
                  <MotionText
                    key={link.path}
                    variants={itemVariant}
                    asChild
                    cursor="pointer"
                    onClick={handleToggleMenu}
                  >
                    <Link to={link.path}>{link.title}</Link>
                  </MotionText>
                )
              })}

              <MotionBox variants={itemVariant}>
                <Text
                  fontSize="sm"
                  textTransform="uppercase"
                  letterSpacing="wide"
                  color="gray.400"
                >
                  {t("language.label")}
                </Text>
                <HStack mt={3} gap={3}>
                  <Button
                    size="sm"
                    colorScheme="green"
                    variant={isZh ? "solid" : "outline"}
                    onClick={() => {
                      setLanguage("zh")
                      handleToggleMenu()
                    }}
                  >
                    {t("language.zh")}
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="green"
                    variant={isEn ? "solid" : "outline"}
                    onClick={() => {
                      setLanguage("en")
                      handleToggleMenu()
                    }}
                  >
                    {t("language.en")}
                  </Button>
                </HStack>
              </MotionBox>

              <MotionText
                mt="auto"
                borderTop="1px"
                pt={8}
                variants={itemVariant}
                asChild
                fontSize="xl"
                color="green.500"
                cursor="pointer"
                onClick={handleToggleMenu}
              >
                <Link to="/login">{t("landing.nav.getStarted")}</Link>
              </MotionText>
            </MotionVStack>
          </Box>
        </MotionBox>
      )}

      {/* Blur Backdrop */}
      <Box
        position="fixed"
        w="100vw"
        h="100vh"
        backdropFilter="blur(4px)"
        left={0}
        top={0}
        visibility={showBlur ? "visible" : "hidden"}
        opacity={showBlur ? 1 : 0}
        transition="all 0.3s"
        zIndex={10}
        display={{ base: "none", md: "block" }}
      />
    </Box>
  )
}
