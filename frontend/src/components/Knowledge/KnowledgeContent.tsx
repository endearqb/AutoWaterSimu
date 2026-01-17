import { mdxComponents } from "@/components/MDX/CustomMDX"
import { useColorModeValue } from "@/components/ui/color-mode"
import { Prose } from "@/components/ui/prose"
import type { KnowledgeEntry } from "@/knowledge"
import {
  Alert,
  Box,
  HStack,
  Heading,
  Separator,
  Tag,
  Text,
} from "@chakra-ui/react"
import { MDXProvider } from "@mdx-js/react"

type KnowledgeContentProps = {
  entry?: KnowledgeEntry
}

export function KnowledgeContent({ entry }: KnowledgeContentProps) {
  const headingColor = useColorModeValue("gray.900", "gray.100")
  const subColor = useColorModeValue("gray.500", "gray.400")

  if (!entry) {
    return (
      <Alert.Root status="warning" borderRadius="md" variant="surface">
        <Alert.Indicator />
        <Box>
          <Alert.Title>内容缺失</Alert.Title>
          <Alert.Description>暂未找到对应的知识文档。</Alert.Description>
        </Box>
      </Alert.Root>
    )
  }

  const Content = entry.component

  return (
    <Box>
      <Heading size="lg" color={headingColor} mb={2}>
        {entry.title}
      </Heading>
      {entry.summary ? (
        <Text color={subColor} fontSize="md" mb={4}>
          {entry.summary}
        </Text>
      ) : null}
      {entry.tags?.length ? (
        <HStack gap={2} mb={4}>
          {entry.tags.map((tag) => (
            <Tag.Root key={tag} colorScheme="blue" size="sm" variant="solid">
              <Tag.Label>{tag}</Tag.Label>
            </Tag.Root>
          ))}
        </HStack>
      ) : null}
      <Separator my={6} />
      <Prose size="md" maxW="120ch">
        <MDXProvider components={mdxComponents as any}>
          <Content />
        </MDXProvider>
      </Prose>
    </Box>
  )
}
