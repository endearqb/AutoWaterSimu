import {
  Box,
  Button,
  Link as ChakraLink,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react"
import { Link as RouterLink, useRouterState } from "@tanstack/react-router"

export const FooterCTA = () => {
  const router = useRouterState()

  // 如果在特定页面不显示CTA
  if (router.location.pathname.includes("pitch")) {
    return null
  }

  return (
    <Box maxW="100%" py={{ base: 14, md: 20 }} mx={{ base: 4, md: 16 }}>
      <Box
        border="1px"
        borderColor="gray.200"
        _dark={{ borderColor: "gray.700" }}
        textAlign="center"
        px={{ base: 10, md: 24 }}
        py={{ base: 14, md: 20 }}
        mx="auto"
        display="flex"
        alignItems="center"
        flexDirection="column"
        bg="gray.50"
        // _dark={{ bg: "gray.800" }}
        borderRadius="lg"
      >
        <Text
          fontSize={{ base: "4xl", md: "6xl", lg: "7xl" }}
          fontWeight="medium"
          bgGradient="to-r"
          gradientFrom="hsl(192,85%,52%)"
          gradientTo="hsl(212,98%,55%)"
          bgClip="text"
          color="transparent"
          letterSpacing="tight"
          lineHeight="1.2"
          mb={6}
        >
          有了ENVDAMA，何时开始都不晚
        </Text>

        <Text
          color="gray.600"
          _dark={{ color: "gray.400" }}
          mt={6}
          fontSize={{ base: "md", md: "lg" }}
          maxW="3xl"
          lineHeight="1.6"
        >
          物料平衡计算、ASM模型仿真、工艺流程设计、参数优化分析，以及您专属的智能助手。
        </Text>

        <VStack mt={{ base: 8, md: 10 }} mb={{ base: 0, md: 8 }} gap={4}>
          <HStack gap={4} flexWrap="wrap" justify="center">
            <ChakraLink
              href="https://github.com/endearqb"
              target="_blank"
              rel="noopener noreferrer"
              _hover={{ textDecoration: "none" }}
            >
              <Button
                variant="outline"
                borderColor="gray.300"
                bg={{ base: "#F2F1EF", _dark: "#1D1D1D" }}
                color="gray.700"
                h={12}
                px={6}
                display={{ base: "none", md: "flex" }}
                _hover={{
                  transform: "translateY(-1px)",
                  shadow: "md",
                }}
                transition="all 0.2s"
              >
                联系我
              </Button>
            </ChakraLink>

            <RouterLink to="/dashboard">
              <Button
                colorScheme="blue"
                h={12}
                px={6}
                _hover={{
                  transform: "translateY(-1px)",
                  shadow: "lg",
                }}
                transition="all 0.2s"
              >
                开始免费使用
              </Button>
            </RouterLink>
          </HStack>
        </VStack>
      </Box>
    </Box>
  )
}
