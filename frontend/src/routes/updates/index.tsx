import { Box, Container, Text, VStack } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { Footer, FooterCTA, MiddayHead } from "../../components/Landing"
import { Article } from "../../components/Updates/Article"
import { getBlogPosts } from "../../utils/blog"
import { useI18n } from "@/i18n"
import { z } from "zod"

const updatesSearchSchema = z.object({
  embed: z.coerce.string().optional(),
})

function redirectToAuth() {
  const target = "/login"
  try {
    window.top?.location.assign(target)
  } catch {
    window.location.assign(target)
  }
}

export const Route = createFileRoute("/updates/")({
  component: UpdatesPage,
  loader: async () => {
    const posts = await getBlogPosts()
    return { posts }
  },
  validateSearch: (search) => updatesSearchSchema.parse(search),
})

function UpdatesPage() {
  const { posts } = Route.useLoaderData()
  const { t } = useI18n()
  const { embed } = Route.useSearch()
  const isEmbedded = embed === "1" || embed === "true"
  const sortedPosts = posts.sort(
    (a, b) =>
      new Date(b.metadata.publishedAt).getTime() -
      new Date(a.metadata.publishedAt).getTime(),
  )

  return (
    <Box
      minH="100vh"
      bg={{ base: "hsl(192,85%,99.5%)", _dark: "gray.900" }}
      overflowX="hidden"
      onClickCapture={(e) => {
        if (!isEmbedded) return
        const target = e.target as HTMLElement | null
        const clickable = target?.closest?.('a,button,[role="button"]')
        if (!clickable) return
        e.preventDefault()
        e.stopPropagation()
        redirectToAuth()
      }}
    >
      {isEmbedded ? null : <MiddayHead />}
      <Box pt={isEmbedded ? 0 : "82px"}>
        {" "}
        {/* 为固定header留出空间: 50px(header高度) + 16px(top) + 16px(额外间距) */}
        <Container maxW="4xl" py={8}>
          {/* Header */}
          {/* <Box textAlign="center" mb={16}>
            <Heading
              as="h1"
              size="2xl"
              mb={4}
              fontWeight="bold"
              color="gray.800"
              _dark={{ color: "gray.100" }}
            >
              产品更新
            </Heading>
            <Text
              fontSize="lg"
              color="gray.600"
              _dark={{ color: "gray.300" }}
              maxW="2xl"
              mx="auto"
              lineHeight="1.6"
            >
              了解我们最新的功能更新、改进和发布说明
            </Text>
          </Box> */}

          {/* Articles */}
          <VStack gap={0} align="stretch">
            {sortedPosts.map((post) => (
              <Article
                key={post.slug}
                data={post}
                embed={isEmbedded ? "1" : undefined}
              />
            ))}
          </VStack>

          {/* Empty State */}
          {sortedPosts.length === 0 && (
            <Box textAlign="center" py={20}>
              <Text fontSize="lg" color="gray.500">
                {t("updates.empty")}
              </Text>
            </Box>
          )}
        </Container>
        <FooterCTA />
        {/* 这里增加一条分割线 */}
        <Box
          borderBottom="1px solid"
          borderColor="gray.200"
          _dark={{ borderColor: "gray.700" }}
        />
        <Footer />
      </Box>
    </Box>
  )
}
