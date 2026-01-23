import { Box, Button, Text, VStack } from "@chakra-ui/react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { MiddayHead } from "../components/Landing"

export const Route = createFileRoute("/showcase")({
  component: ShowcasePage,
})

function ShowcasePage() {
  return (
    <Box minH="100vh" bg={{ base: "hsl(192,85%,99.5%)", _dark: "gray.900" }}>
      <MiddayHead />
      <Box pt="82px">
        <VStack gap={4} px={6} py={10} align="start">
          <Text fontSize="2xl" fontWeight="semibold">
            Showcase
          </Text>
          <Text color="gray.600" _dark={{ color: "gray.300" }}>
            该页面用于展示功能与案例合集。
          </Text>
          <Button asChild>
            <Link to="/canvas-home" search={{}}>
              打开画布首页
            </Link>
          </Button>
        </VStack>
      </Box>
    </Box>
  )
}

