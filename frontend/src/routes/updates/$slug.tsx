import { mdxComponents } from "@/components/MDX/CustomMDX"
import { Badge, Box, Button, Container, Heading, Text } from "@chakra-ui/react"
import { MDXProvider } from "@mdx-js/react"
import { createFileRoute, notFound } from "@tanstack/react-router"
import { Link } from "@tanstack/react-router"
import { FaArrowLeft } from "react-icons/fa"
import { Footer, FooterCTA, MiddayHead } from "../../components/Landing"
import { Prose } from "../../components/ui/prose"
import { getBlogPosts } from "../../utils/blog"
import { useI18n } from "@/i18n"

export const Route = createFileRoute("/updates/$slug")({
  component: UpdateDetailPage,
  loader: async ({ params }) => {
    const posts = await getBlogPosts()
    const post = posts.find((p) => p.slug === params.slug)
    if (!post) {
      throw notFound()
    }
    return { post }
  },
})

function UpdateDetailPage() {
  const { post } = Route.useLoaderData()
  const { t, language } = useI18n()
  const locale = language === "zh" ? "zh-CN" : "en-US"
  const publishedAt = new Date(post.metadata.publishedAt)
  const formattedPublishedAt = Number.isNaN(publishedAt.getTime())
    ? "-"
    : new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(publishedAt)

  return (
    <Box
      minH="100vh"
      bg={{ base: "hsl(192,85%,99.5%)", _dark: "gray.900" }}
      overflowX="hidden"
    >
      <MiddayHead />
      <Box pt="82px">
        {" "}
        {/* 为固定header留出空间: 50px(header高度) + 16px(top) + 16px(额外间距) */}
        <Container maxW="4xl" py={8}>
          {/* Back Button */}
          <Box mb={8}>
            <Button
              variant="ghost"
              size="sm"
              color="gray.600"
              _dark={{ color: "gray.300" }}
              _hover={{
                color: "gray.800",
                bg: "gray.100",
                _dark: { color: "gray.100", bg: "gray.700" },
              }}
              asChild
            >
              <Link to="/updates">
                <FaArrowLeft style={{ marginRight: "8px" }} />
                {t("updates.backToList")}
              </Link>
            </Button>
          </Box>

          {/* Article Header */}
          <Box mb={12} textAlign="center">
            {/* Status Badge */}
            <Badge
              colorScheme={post.metadata.tag === "Updates" ? "blue" : "green"}
              mb={4}
              px={3}
              py={1}
              borderRadius="full"
              fontSize="sm"
              fontWeight="medium"
            >
              {post.metadata.tag}
            </Badge>

            {/* Title */}
            <Heading
              as="h1"
              size="2xl"
              mb={4}
              fontWeight="bold"
              color="gray.800"
              _dark={{ color: "gray.100" }}
              lineHeight="1.2"
            >
              {post.metadata.title}
            </Heading>

            {/* Summary */}
            {post.metadata.summary && (
              <Text
                fontSize="xl"
                color="gray.600"
                _dark={{ color: "gray.300" }}
                mb={4}
                lineHeight="1.6"
                maxW="3xl"
                mx="auto"
              >
                {post.metadata.summary}
              </Text>
            )}

            {/* Published Date */}
            <Text fontSize="md" color="gray.500" _dark={{ color: "gray.400" }}>
              {t("updates.publishedAt", { date: formattedPublishedAt })}
            </Text>
          </Box>

          {/* Featured Image */}
          {post.metadata.image && (
            <Box mb={12} textAlign="center">
              <img
                src={post.metadata.image}
                alt={post.metadata.title}
                style={{
                  width: "100%",
                  maxWidth: "800px",
                  height: "auto",
                  borderRadius: "12px",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                }}
              />
            </Box>
          )}

          {/* Article Content */}
          <Box maxW="680px" mx="auto" className="updates-content">
            <Prose size="md" maxW="120ch">
              <MDXProvider components={mdxComponents as any}>
                <post.component />
              </MDXProvider>
            </Prose>
          </Box>

          {/* Footer */}
          <Box
            mt={16}
            pt={8}
            borderTop="1px solid"
            borderColor="gray.200"
            _dark={{ borderColor: "gray.700" }}
            textAlign="center"
          >
            <Button variant="outline" colorScheme="blue" asChild>
              <Link to="/updates">
                <FaArrowLeft style={{ marginRight: "8px" }} />
                {t("updates.viewMore")}
              </Link>
            </Button>
          </Box>
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
