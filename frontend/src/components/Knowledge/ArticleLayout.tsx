import {
  Box,
  Container,
  Flex,
  Heading,
  Tag,
  Text,
  VStack,
} from "@chakra-ui/react"
import type React from "react"
import type { ArticleData } from "../../data/articles/types"

interface ArticleLayoutProps {
  article: ArticleData
  children: React.ReactNode
}

export const ArticleLayout: React.FC<ArticleLayoutProps> = ({
  article,
  children,
}) => {
  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header */}
      <Box bg="white" shadow="sm" borderBottom="1px" borderColor="gray.200">
        <Container maxW="7xl" py={8}>
          <VStack gap={4} align="stretch">
            <Heading as="h1" size="2xl" color="gray.800" textAlign="center">
              {article.title}
            </Heading>
            <Text
              fontSize="lg"
              color="gray.600"
              textAlign="center"
              maxW="3xl"
              mx="auto"
            >
              {article.description}
            </Text>
            <Flex justify="center" wrap="wrap" gap={2}>
              <Tag.Root colorScheme="blue" size="md">
                {article.category}
              </Tag.Root>
              {article.tags.map((tag) => (
                <Tag.Root key={tag} variant="outline" size="md">
                  {tag}
                </Tag.Root>
              ))}
            </Flex>
          </VStack>
        </Container>
      </Box>

      {/* Content */}
      <Container maxW="7xl" py={8}>
        {children}
      </Container>
    </Box>
  )
}
