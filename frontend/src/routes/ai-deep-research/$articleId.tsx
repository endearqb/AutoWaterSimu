import { useColorModeValue } from "@/components/ui/color-mode"
import {
  Alert,
  Badge,
  Box,
  Breadcrumb,
  Button,
  Container,
  HStack,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { Link } from "@tanstack/react-router"
import type React from "react"
import { FiArrowLeft, FiChevronRight } from "react-icons/fi"
import { DigitalTwinGuide } from "../../components/Knowledge/DigitalTwinGuide"
import { WaterTreatmentBalance } from "../../components/Knowledge/WaterTreatmentBalance"
import { Header } from "../../components/Landing"
import { useArticleData } from "../../hooks/useArticleData"
import { useI18n } from "@/i18n"

const ArticleDetail: React.FC = () => {
  const { articleId } = Route.useParams()
  const { getArticleById } = useArticleData()
  const { t } = useI18n()
  const article = getArticleById(articleId)

  const bgColor = useColorModeValue("gray.50", "gray.900")
  const cardBg = useColorModeValue("white", "gray.800")

  // 根据文章ID渲染对应的组件
  const renderArticleContent = () => {
    switch (articleId) {
      case "water-treatment-balance":
        return <WaterTreatmentBalance />
      case "digital-twin-guide":
        return <DigitalTwinGuide />
      default:
        return (
          <Alert.Root status="warning" borderRadius="md">
            <Alert.Indicator />
            <Alert.Title>{t("deepResearch.detail.interactiveInProgress")}</Alert.Title>
          </Alert.Root>
        )
    }
  }

  if (!article) {
    return (
      <Box bg={bgColor} minH="100vh">
        <Header />
        <Container maxW="7xl" py={8}>
          <VStack gap={8}>
            <Breadcrumb.Root>
              <Breadcrumb.List>
                <Breadcrumb.Item>
                  <Breadcrumb.Link asChild>
                    <Link to="/ai-deep-research">AI Deep Research</Link>
                  </Breadcrumb.Link>
                </Breadcrumb.Item>
                <Breadcrumb.Separator>
                  <FiChevronRight color="gray.500" />
                </Breadcrumb.Separator>
                <Breadcrumb.Item>
                  <Breadcrumb.CurrentLink>
                    {t("deepResearch.detail.notFound.title")}
                  </Breadcrumb.CurrentLink>
                </Breadcrumb.Item>
              </Breadcrumb.List>
            </Breadcrumb.Root>

            <Alert.Root status="error" borderRadius="md" maxW="md">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{t("deepResearch.detail.notFound.title")}</Alert.Title>
                <Alert.Description>
                  {t("deepResearch.detail.notFound.description")}
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>

            <Button colorScheme="blue" variant="outline" asChild>
              <Link to="/ai-deep-research">
                <HStack gap={2}>
                  <FiArrowLeft />
                  <Text>{t("deepResearch.detail.back")}</Text>
                </HStack>
              </Link>
            </Button>
          </VStack>
        </Container>
      </Box>
    )
  }

  return (
    <Box bg={bgColor} minH="100vh">
      <Header />
      <Container maxW="7xl" py={8}>
        <VStack gap={8}>
          {/* 面包屑导航 */}
          <Box w="100%">
            <Breadcrumb.Root>
              <Breadcrumb.List>
                <Breadcrumb.Item>
                  <Breadcrumb.Link asChild>
                    <Link to="/ai-deep-research">AI Deep Research</Link>
                  </Breadcrumb.Link>
                </Breadcrumb.Item>
                <Breadcrumb.Separator>
                  <FiChevronRight color="gray.500" />
                </Breadcrumb.Separator>
                <Breadcrumb.Item>
                  <Breadcrumb.Link>{article.category}</Breadcrumb.Link>
                </Breadcrumb.Item>
                <Breadcrumb.Separator>
                  <FiChevronRight color="gray.500" />
                </Breadcrumb.Separator>
                <Breadcrumb.Item>
                  <Breadcrumb.CurrentLink>
                    {article.title}
                  </Breadcrumb.CurrentLink>
                </Breadcrumb.Item>
              </Breadcrumb.List>
            </Breadcrumb.Root>
          </Box>

          {/* 返回按钮 */}
          <HStack w="100%" justify="space-between">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/ai-deep-research">{t("deepResearch.detail.back")}</Link>
            </Button>

            <HStack gap={2}>
              <Badge colorScheme="blue" fontSize="sm" px={3} py={1}>
                {article.category}
              </Badge>
            </HStack>
          </HStack>

          {/* 文章内容 */}
          <Box w="100%">{renderArticleContent()}</Box>

          {/* 文章信息卡片 */}
          <Box
            bg={cardBg}
            p={6}
            borderRadius="xl"
            shadow="md"
            w="100%"
            border="1px"
            borderColor="gray.200"
          >
            <VStack gap={4} align="start">
              <Heading size="md">{t("deepResearch.detail.about.title")}</Heading>
              <VStack align="start" gap={2} w="100%">
                <Text fontSize="sm" fontWeight="bold" color="gray.600">
                  {t("deepResearch.detail.about.tagsLabel")}
                </Text>
                <HStack gap={2} wrap="wrap">
                  {article.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      colorScheme="gray"
                      fontSize="xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                </HStack>
              </VStack>

              <VStack align="start" gap={2} w="100%">
                <Text fontSize="sm" fontWeight="bold" color="gray.600">
                  {t("deepResearch.detail.about.descriptionLabel")}
                </Text>
                <Text fontSize="sm" color="gray.700" lineHeight="1.6">
                  {article.description}
                </Text>
              </VStack>
            </VStack>
          </Box>

          {/* 相关文章推荐 */}
          {/* <Box 
            bg={cardBg} 
            p={6} 
            borderRadius="xl" 
            shadow="md" 
            w="100%"
            border="1px"
            borderColor="gray.200"
          >
            <VStack gap={4}>
              <Heading size="md" textAlign="center">
                探索更多内容
              </Heading>
              
              <HStack gap={4} wrap="wrap" justify="center">
                {articleId !== 'water-treatment-balance' && (
                  <Button
                    variant="outline"
                    colorScheme="blue"
                    size="sm"
                    asChild
                  >
                    <Link to="/knowledge/water-treatment-balance">水处理系统平衡框架</Link>
                  </Button>
                )}
                
                {articleId !== 'digital-twin-guide' && (
                  <Button
                    variant="outline"
                    colorScheme="purple"
                    size="sm"
                    asChild
                  >
                    <Link to="/knowledge/digital-twin-guide">数字孪生探索指南</Link>
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  colorScheme="gray"
                  size="sm"
                  asChild
                >
                  <Link to="/ai-deep-research">浏览所有文章</Link>
                </Button>
              </HStack>
            </VStack>
          </Box> */}
        </VStack>
      </Container>
    </Box>
  )
}

export const Route = createFileRoute("/ai-deep-research/$articleId")({
  component: ArticleDetail,
})
