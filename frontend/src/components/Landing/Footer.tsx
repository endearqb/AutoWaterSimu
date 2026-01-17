import {
  Box,
  Flex,
  Grid,
  GridItem,
  HStack,
  Icon,
  Image,
  Link,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react"
import { Link as RouterLink } from "@tanstack/react-router"
import { FaGithub, FaWeixin } from "react-icons/fa"

export const Footer = () => {
  const socialLinks = [
    { icon: FaGithub, label: "GitHub", href: "https://github.com/endearqb" },
    {
      icon: FaWeixin,
      label: "Weixin",
      href: "https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzkzMzYzMDQ3NQ==&action=getalbum&album_id=3418651377419911172#wechat_redirect",
    },
  ]

  const features = [
    { name: "物料平衡", href: "/materialbalance" },
    { name: "ASM1模型", href: "/asm1" },
    { name: "ASM1Slim", href: "/asm1slim" },
    { name: "仪表板", href: "/dashboard" },
    { name: "流程图编辑", href: "/openflow" },
  ]

  const knowledgeCategories = [
    { name: "污水处理工艺", href: "/knowledge" },
    { name: "ASM模型理论", href: "/knowledge" },
    { name: "物料平衡计算", href: "/knowledge" },
    { name: "工艺设计指南", href: "/knowledge" },
    { name: "参数配置手册", href: "/knowledge" },
    { name: "案例分析", href: "/knowledge" },
  ]

  const company = [
    { name: "关于我", href: "/about" },
    { name: "技术团队也是我", href: "/team" },
    { name: "联系我", href: "/contact" },
    { name: "开源项目", href: "https://github.com/endearqb" },
  ]

  return (
    <Box
      as="footer"
      // _dark={{ borderColor: "gray.700", bg: "gray.900" }}
      pt={{ base: 4, md: 6 }}
      px={{ base: 4, md: 6 }}
      mx={{ base: 4, md: 12 }}
      // 增加顶部边距
      mt={12}
      overflow="hidden"
    >
      <Box
        maxW="100%"
        // 增加底部边距
        mb={12}
        mx="auto"
      >
        {/* Header Section */}
        <Flex
          justify="space-between"
          align="center"
          _dark={{ borderColor: "gray.700" }}
          pb={{ base: 10, md: 16 }}
          mb={8}
          direction={{ base: "column", md: "row" }}
          gap={{ base: 6, md: 0 }}
        >
          <RouterLink to="/">
            <Image
              src="/assets/images/E-logos-1.png"
              alt="ENVDAMA Logo"
              boxSize={12}
            />
          </RouterLink>

          <Text
            fontSize={{ base: "lg", md: "2xl" }}
            fontWeight="normal"
            textAlign={{ base: "center", md: "right" }}
            color="gray.700"
            _dark={{ color: "gray.300" }}
          >
            为您精心准备的污水处理工艺学习平台
          </Text>
        </Flex>
        <Separator my={8} />

        {/* Main Content */}
        <Grid
          templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
          gap={8}
          w="full"
        >
          {/* Left Side - Links */}
          <GridItem>
            <Grid
              templateColumns={{ base: "1fr", sm: "repeat(3, 1fr)" }}
              gap={8}
              h="full"
            >
              {/* Features */}
              <VStack align="start" gap={4}>
                <Text
                  fontWeight="medium"
                  fontSize="lg"
                  color="gray.900"
                  _dark={{ color: "white" }}
                >
                  功能特性
                </Text>
                <VStack align="start" gap={2}>
                  {features.map((feature, index) => (
                    <RouterLink key={index} to={feature.href}>
                      <Text
                        color="gray.600"
                        _dark={{ color: "gray.400" }}
                        _hover={{
                          color: "blue.600",
                          _dark: { color: "blue.400" },
                        }}
                        transition="color 0.2s ease"
                        fontSize="sm"
                        cursor="pointer"
                      >
                        {feature.name}
                      </Text>
                    </RouterLink>
                  ))}
                </VStack>
              </VStack>

              {/* Knowledge */}
              <VStack align="start" gap={4}>
                <Text
                  fontWeight="medium"
                  fontSize="lg"
                  color="gray.900"
                  _dark={{ color: "white" }}
                >
                  知识库
                </Text>
                <VStack align="start" gap={2}>
                  {knowledgeCategories.map((category, index) => (
                    <RouterLink key={index} to={category.href}>
                      <Text
                        color="gray.600"
                        _dark={{ color: "gray.400" }}
                        _hover={{
                          color: "blue.600",
                          _dark: { color: "blue.400" },
                        }}
                        transition="color 0.2s ease"
                        fontSize="sm"
                        cursor="pointer"
                      >
                        {category.name}
                      </Text>
                    </RouterLink>
                  ))}
                </VStack>
              </VStack>

              {/* Company */}
              <VStack align="start" gap={4}>
                <Text
                  fontWeight="medium"
                  fontSize="lg"
                  color="gray.900"
                  _dark={{ color: "white" }}
                >
                  团队信息
                </Text>
                <VStack align="start" gap={2}>
                  {company.map((item, index) =>
                    item.href.startsWith("http") ? (
                      <Link
                        key={index}
                        href={item.href}
                        target="_blank"
                        color="gray.600"
                        _dark={{ color: "gray.400" }}
                        _hover={{
                          color: "blue.600",
                          _dark: { color: "blue.400" },
                        }}
                        transition="color 0.2s ease"
                        fontSize="sm"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <RouterLink key={index} to={item.href}>
                        <Text
                          color="gray.600"
                          _dark={{ color: "gray.400" }}
                          _hover={{
                            color: "blue.600",
                            _dark: { color: "blue.400" },
                          }}
                          transition="color 0.2s ease"
                          fontSize="sm"
                          cursor="pointer"
                        >
                          {item.name}
                        </Text>
                      </RouterLink>
                    ),
                  )}
                </VStack>
              </VStack>
            </Grid>
          </GridItem>

          {/* Right Side - Social & Newsletter */}
          <GridItem>
            <Flex
              direction="column"
              align={{ base: "start", md: "end" }}
              h="full"
              justify="space-between"
            >
              <VStack align={{ base: "start", md: "end" }} gap={8} mb={8}>
                {/* Social Links */}
                <VStack align={{ base: "start", md: "end" }} gap={4}>
                  <Text
                    fontWeight="medium"
                    fontSize="lg"
                    color="gray.900"
                    _dark={{ color: "white" }}
                  >
                    关注我
                  </Text>
                  <HStack gap={4}>
                    {socialLinks.map((social, index) => (
                      <Link key={index} href={social.href} target="_blank">
                        <Icon
                          as={social.icon}
                          boxSize={6}
                          color="gray.600"
                          _dark={{ color: "gray.400" }}
                          _hover={{
                            color: "blue.600",
                            _dark: { color: "blue.400" },
                          }}
                          transition="color 0.2s ease"
                        />
                      </Link>
                    ))}
                  </HStack>
                </VStack>

                {/* Newsletter Placeholder */}
                <VStack align={{ base: "start", md: "end" }} gap={4}>
                  <Text
                    fontWeight="medium"
                    fontSize="lg"
                    color="gray.900"
                    _dark={{ color: "white" }}
                  >
                    Everything is Changeable
                  </Text>
                  <Text
                    fontSize="sm"
                    color="gray.600"
                    _dark={{ color: "gray.400" }}
                    textAlign={{ base: "left", md: "right" }}
                  >
                    一切皆流，无物常驻
                  </Text>
                </VStack>
              </VStack>

              {/* Copyright */}
              <HStack gap={4} align="center">
                <Link href="https://beian.miit.gov.cn/">
                  浙ICP备2022029831号-3
                </Link>
                <Separator
                  orientation="vertical"
                  h="20px"
                  display={{ base: "none", md: "block" }}
                />
                <Text
                  fontSize="sm"
                  color="gray.500"
                  _dark={{ color: "gray.500" }}
                >
                  © 2025 ENVDAMA. 保留所有权利。
                </Text>
              </HStack>
            </Flex>
          </GridItem>
        </Grid>
      </Box>
    </Box>
  )
}
