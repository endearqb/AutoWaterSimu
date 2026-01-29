import { useColorModeValue } from "@/components/ui/color-mode"
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Grid,
  GridItem,
  HStack,
  Heading,
  Input,
  InputGroup,
  Portal,
  Select,
  Text,
  VStack,
  createListCollection,
} from "@chakra-ui/react"
import { Icon } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import React from "react"
import { FiSearch, FiTag } from "react-icons/fi"
import { z } from "zod"
import { Footer, FooterCTA, MiddayHead } from "../../components/Landing"
import type { ArticleData } from "../../data/articles/types"
import { useArticleData } from "../../hooks/useArticleData"
import { useI18n } from "@/i18n"

const aiDeepResearchSearchSchema = z.object({
  embed: z.coerce.string().optional(),
})

const AIDeepResearchIndex: React.FC = () => {
  const { embed } = Route.useSearch()
  const isEmbedded = embed === "1" || embed === "true"
  const { articles, loading, error } = useArticleData()
  const { t } = useI18n()
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState("all")
  const [selectedTag, setSelectedTag] = React.useState("all")

  const bgColor = useColorModeValue("background.primary", "background.primary")
  const cardBg = useColorModeValue("white", "gray.800")

  // 获取所有分类
  const categories = React.useMemo(() => {
    const cats = articles.map((article) => article.category)
    return ["all", ...Array.from(new Set(cats))]
  }, [articles])

  // 获取所有标签
  const tags = React.useMemo(() => {
    const allTags = articles.flatMap((article) => article.tags)
    return ["all", ...Array.from(new Set(allTags))]
  }, [articles])

  // 创建分类集合
  const categoryCollection = React.useMemo(() => {
    return createListCollection({
      items: categories.map((cat) => ({
        label: cat === "all" ? t("deepResearch.filters.allCategories") : cat,
        value: cat,
      })),
    })
  }, [categories, t])

  // 创建标签集合
  const tagCollection = React.useMemo(() => {
    return createListCollection({
      items: tags.map((tag) => ({
        label: tag === "all" ? t("deepResearch.filters.allTags") : tag,
        value: tag,
      })),
    })
  }, [tags, t])

  // 过滤文章
  const filteredArticles = React.useMemo(() => {
    return articles.filter((article) => {
      const matchesSearch =
        searchTerm === "" ||
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.description.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory =
        selectedCategory === "all" || article.category === selectedCategory

      const matchesTag =
        selectedTag === "all" || article.tags.includes(selectedTag)

      return matchesSearch && matchesCategory && matchesTag
    })
  }, [articles, searchTerm, selectedCategory, selectedTag])

  const renderArticleCard = (article: ArticleData) => (
    <Card.Root
      key={article.id}
      bg={cardBg}
      shadow="md"
      borderRadius="xl"
      overflow="hidden"
      transition="all 0.3s"
      cursor="pointer"
      _hover={{
        transform: "translateY(-4px)",
        shadow: "lg",
      }}
      role="button"
      tabIndex={0}
      onClick={() => {
        const url = `/assets/html/${article.id}.html`
        window.location.assign(url)
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return
        e.preventDefault()
        const url = `/assets/html/${article.id}.html`
        window.location.assign(url)
      }}
    >
      <Card.Body p={6}>
        <VStack align="start" gap={4}>
          <Flex justify="space-between" align="start" w="100%">
            <Badge
              colorScheme="blue"
              fontSize="sm"
              px={3}
              py={1}
              borderRadius="full"
            >
              {article.category}
            </Badge>
          </Flex>

          <Heading size="md" lineHeight="1.3">
            {article.title}
          </Heading>

          <Text color="gray.600" fontSize="sm" lineHeight="1.6">
            {article.description}
          </Text>

          <Flex wrap="wrap" gap={2}>
            {article.tags.map((tag, index) => (
              <Badge
                key={`${article.id}-${tag}-${index}`}
                variant="outline"
                colorScheme="gray"
                fontSize="xs"
                px={2}
                py={1}
              >
                <HStack gap={1}>
                  <Icon as={FiTag} />
                  <Text>{tag}</Text>
                </HStack>
              </Badge>
            ))}
          </Flex>

          <Button
            colorScheme="blue"
            size="sm"
            alignSelf="start"
            mt={2}
            onClick={(e) => {
              e.stopPropagation()
              const url = `/assets/html/${article.id}.html`
              window.location.assign(url)
            }}
          >
            {t("deepResearch.article.readFull")}
          </Button>
        </VStack>
      </Card.Body>
    </Card.Root>
  )

  if (loading) {
    return (
      <Box bg={bgColor} minH="100vh">
        {isEmbedded ? null : <MiddayHead />}
        <Container maxW="7xl" py={8}>
          <VStack gap={8}>
            <Text>{t("deepResearch.state.loading")}</Text>
          </VStack>
        </Container>
      </Box>
    )
  }

  if (error) {
    return (
      <Box bg={bgColor} minH="100vh">
        {isEmbedded ? null : <MiddayHead />}
        <Container maxW="7xl" py={8}>
          <VStack gap={8}>
            <Text color="red.500">
              {t("deepResearch.state.loadFailed", { error })}
            </Text>
          </VStack>
        </Container>
      </Box>
    )
  }

  return (
    <Box
      bg={bgColor}
      minH="100vh"
    >
      {isEmbedded ? null : <MiddayHead />}
      <Container maxW="7xl" py={8}>
        <VStack gap={8}>
          {/* 页面头部 */}
          <Box textAlign="center" py={8}>
            <Text
              fontSize="5xl"
              bgGradient="to-r"
              gradientFrom="hsl(192,85%,52%)"
              gradientTo="hsl(212,98%,55%)"
              bgClip="text"
              fontWeight="bold"
              maxW="2xl"
              mx="auto"
              mb={2}
            >
              {t("deepResearch.hero.title")}
              <br />
              {t("deepResearch.hero.tagline")}
            </Text>
            <Text fontSize="lg" color="gray.600" maxW="xl" mx="auto" mb={4}>
              {t("deepResearch.hero.description")}
            </Text>
            <Text fontSize="sm" color="gray.500" fontStyle="italic">
              {t("deepResearch.hero.note")}
            </Text>
          </Box>

          {/* 搜索和过滤 */}
          <Card.Root bg={cardBg} p={6} borderRadius="xl" shadow="md" w="100%">
            <Card.Body>
              <Grid
                templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
                gap={4}
              >
                <GridItem>
                  <InputGroup startElement={<FiSearch color="gray.300" />}>
                    <Input
                      ps="2.5rem"
                      placeholder={t("deepResearch.search.placeholder")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </GridItem>

                <GridItem>
                  <Select.Root
                    collection={categoryCollection}
                    value={[selectedCategory]}
                    onValueChange={(details) =>
                      setSelectedCategory(details.value[0])
                    }
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText
                          placeholder={t("deepResearch.filters.categoryPlaceholder")}
                        />
                      </Select.Trigger>
                      <Select.IndicatorGroup>
                        <Select.Indicator />
                      </Select.IndicatorGroup>
                    </Select.Control>
                    <Portal>
                      <Select.Positioner>
                        <Select.Content>
                          {categoryCollection.items.map((category) => (
                            <Select.Item key={category.value} item={category}>
                              {category.label}
                              <Select.ItemIndicator />
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Positioner>
                    </Portal>
                  </Select.Root>
                </GridItem>

                <GridItem>
                  <Select.Root
                    collection={tagCollection}
                    value={[selectedTag]}
                    onValueChange={(details) =>
                      setSelectedTag(details.value[0])
                    }
                  >
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText
                          placeholder={t("deepResearch.filters.tagPlaceholder")}
                        />
                      </Select.Trigger>
                      <Select.IndicatorGroup>
                        <Select.Indicator />
                      </Select.IndicatorGroup>
                    </Select.Control>
                    <Portal>
                      <Select.Positioner>
                        <Select.Content>
                          {tagCollection.items.map((tag) => (
                            <Select.Item key={tag.value} item={tag}>
                              {tag.label}
                              <Select.ItemIndicator />
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Positioner>
                    </Portal>
                  </Select.Root>
                </GridItem>
              </Grid>
            </Card.Body>
          </Card.Root>

          {/* 文章统计 */}
          <HStack gap={8} w="100%" justify="center">
            <VStack>
              <Text fontSize="2xl" fontWeight="bold" color="hsl(192,85%,52%)">
                {filteredArticles.length}
              </Text>
              <Text fontSize="sm" color="gray.600">
                {t("deepResearch.stats.articles")}
              </Text>
            </VStack>
            <VStack>
              <Text fontSize="2xl" fontWeight="bold" color="hsl(202,91%,53%)">
                {categories.length - 1}
              </Text>
              <Text fontSize="sm" color="gray.600">
                {t("deepResearch.stats.categories")}
              </Text>
            </VStack>
            <VStack>
              <Text fontSize="2xl" fontWeight="bold" color="hsl(212,98%,55%)">
                {tags.length - 1}
              </Text>
              <Text fontSize="sm" color="gray.600">
                {t("deepResearch.stats.tags")}
              </Text>
            </VStack>
          </HStack>

          {/* 文章列表 */}
          {filteredArticles.length > 0 ? (
            <Grid
              templateColumns={{
                base: "1fr",
                md: "repeat(2, 1fr)",
                lg: "repeat(2, 1fr)",
              }}
              gap={6}
              w="100%"
            >
              {filteredArticles.map(renderArticleCard)}
            </Grid>
          ) : (
            <Card.Root bg={cardBg} p={8} borderRadius="xl" shadow="md" w="100%">
              <Card.Body textAlign="center">
                <Text fontSize="lg" color="gray.500">
                  {t("deepResearch.empty.title")}
                </Text>
                <Text fontSize="sm" color="gray.400" mt={2}>
                  {t("deepResearch.empty.description")}
                </Text>
              </Card.Body>
            </Card.Root>
          )}
        </VStack>
      </Container>
      <Box
        borderBottom="1px solid"
        borderColor="gray.200"
        _dark={{ borderColor: "gray.700" }}
      />

      {/* Footer CTA and Footer */}
      <FooterCTA />
      <Footer />
    </Box>
  )
}

export const Route = createFileRoute("/ai-deep-research/")({
  component: AIDeepResearchIndex,
  validateSearch: (search) => aiDeepResearchSearchSchema.parse(search),
})
