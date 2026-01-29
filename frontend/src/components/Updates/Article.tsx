import { Badge, Box, Heading, Text } from "@chakra-ui/react"
import { MDXProvider } from "@mdx-js/react"
import { Link } from "@tanstack/react-router"
import type { BlogPost } from "../../utils/blog"
import { mdxComponents } from "../MDX/CustomMDX"
import { Prose } from "../ui/prose"
import { useI18n } from "@/i18n"

type Props = {
  data: BlogPost
  embed?: string
}

export function Article({ data, embed }: Props) {
  const { language } = useI18n()
  const locale = language === "zh" ? "zh-CN" : "en-US"
  const publishedAt = new Date(data.metadata.publishedAt)
  const formattedPublishedAt = Number.isNaN(publishedAt.getTime())
    ? "-"
    : new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(publishedAt)

  return (
    <Box
      as="article"
      key={data.slug}
      pt={28}
      mb={20}
      mt={-28}
      id={data.slug}
      maxW="680px"
      mx="auto"
    >
      {/* Post Status Badge */}
      <Badge
        colorScheme={data.metadata.tag === "Updates" ? "blue" : "green"}
        mb={4}
        px={3}
        py={1}
        borderRadius="full"
        fontSize="sm"
        fontWeight="medium"
      >
        {data.metadata.tag}
      </Badge>

      {/* Title with Link */}
      <Link
        to="/updates/$slug"
        params={{ slug: data.slug }}
        search={embed ? { embed } : {}}
      >
        <Heading
          as="h2"
          size="xl"
          mb={6}
          fontWeight="medium"
          color="gray.800"
          _hover={{ color: "blue.600" }}
          transition="color 0.2s"
          cursor="pointer"
        >
          {data.metadata.title}
        </Heading>
      </Link>

      {/* Summary */}
      {data.metadata.summary && (
        <Text fontSize="lg" color="gray.600" mb={6} lineHeight="1.6">
          {data.metadata.summary}
        </Text>
      )}

      {/* Published Date */}
      <Text fontSize="sm" color="gray.500" mb={8}>
        {formattedPublishedAt}
      </Text>

      {/* Content */}
      <Box className="updates">
        {data.metadata.image && (
          <Box mb={12} textAlign="center">
            <img
              src={data.metadata.image}
              alt={data.metadata.title}
              style={{
                width: "100%",
                maxWidth: "1080px",
                height: "auto",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
          </Box>
        )}

        <Prose size="md" maxW="120ch">
          <MDXProvider components={mdxComponents as any}>
            <data.component />
          </MDXProvider>
        </Prose>
      </Box>
    </Box>
  )
}
