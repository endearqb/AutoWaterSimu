import {
  AspectRatio,
  Badge,
  Box,
  Button,
  Container,
  Grid,
  GridItem,
  HStack,
  Heading,
  Icon,
  Image,
  Text,
  VStack,
} from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { FaBrain, FaPlay } from "react-icons/fa"

export const HeroSection = () => {
  return (
    <Box
      minH="90vh"
      bg="linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)"
      position="relative"
      overflow="hidden"
    >
      {/* Background Pattern */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        opacity="0.05"
        backgroundImage="radial-gradient(circle at 25px 25px, #38a169 2px, transparent 0), radial-gradient(circle at 75px 75px, #38a169 2px, transparent 0)"
        backgroundSize="100px 100px"
      />

      <Container maxW="container.xl" h="90vh">
        <Grid
          templateColumns={{ base: "1fr", lg: "5fr 7fr" }}
          h="full"
          alignItems="center"
          gap={8}
        >
          <GridItem>
            <VStack align="start" gap={8} py={20}>
              <Badge
                colorScheme="green"
                px={4}
                py={2}
                borderRadius="full"
                color="gray.500"
                fontSize="sm"
                fontWeight="300"
              >
                🚀 数据流驱动的智能分析平台
              </Badge>

              <Heading
                fontSize={{ base: "4xl", md: "5xl", lg: "6xl" }}
                fontWeight="700"
                lineHeight="1.1"
                color="gray.500"
              >
                <Text
                  as="span"
                  bgGradient="to-r"
                  gradientFrom="hsl(192,85%,52%)"
                  gradientTo="hsl(212,98%,55%)"
                  bgClip="text"
                  fontSize="1.8em"
                >
                  ENVDAMA
                </Text>
                <br />
                <Text as="span">智能数据分析</Text>
                <Text as="span" color="hsl(212,98%,55%)" fontSize="0.8em">
                  系统
                </Text>
              </Heading>

              <Text
                fontSize={{ base: "lg", lg: "xl" }}
                color="gray.600"
                lineHeight="1.8"
                maxW="2xl"
              >
                {/* 基于大语言模型的智能数据分析系统，融合机理模型与数据驱动分析，
                为环保企业提供本地化、可信赖的智能决策支持。 */}
                <Text as="span" fontWeight="300" color="gray.600">
                  让每个环保技术人员都拥有
                  <Text as="span" fontWeight="600" color="hsl(192,85%,52%)">
                    数据科学家
                  </Text>
                  的分析能力
                </Text>
              </Text>

              <HStack gap={4} flexWrap="wrap">
                <Button
                  size="lg"
                  colorScheme="green"
                  borderRadius="full"
                  px={8}
                  py={6}
                  fontSize="lg"
                  fontWeight="600"
                  _hover={{
                    transform: "translateY(-2px)",
                    shadow: "xl",
                  }}
                  transition="all 0.3s"
                  asChild
                >
                  <Link to="/login">
                    <Icon as={FaBrain} mr={3} />
                    免费试用
                  </Link>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  borderRadius="full"
                  px={8}
                  py={6}
                  fontSize="lg"
                  fontWeight="600"
                  borderColor="hsl(192,85%,52%)"
                  color="hsl(212,98%,55%)"
                  _hover={{
                    bg: "hsl(212,98%,55%)",
                    transform: "translateY(-2px)",
                    shadow: "lg",
                  }}
                  transition="all 0.3s"
                >
                  <Icon as={FaPlay} mr={3} />
                  产品演示
                </Button>
              </HStack>

              {/* Stats */}
              {/* <HStack gap={8} pt={4}>
                <VStack align="start" gap={1}>
                  <Text fontSize="2xl" fontWeight="bold" color="green.600">1000+</Text>
                  <Text fontSize="sm" color="gray.500">企业用户</Text>
                </VStack>
                <VStack align="start" gap={1}>
                  <Text fontSize="2xl" fontWeight="bold" color="green.600">99.9%</Text>
                  <Text fontSize="sm" color="gray.500">系统可用性</Text>
                </VStack>
                <VStack align="start" gap={1}>
                  <Text fontSize="2xl" fontWeight="bold" color="green.600">24/7</Text>
                  <Text fontSize="sm" color="gray.500">技术支持</Text>
                </VStack>
              </HStack> */}
            </VStack>
          </GridItem>

          <GridItem display={{ base: "none", lg: "block" }}>
            <AspectRatio ratio={15 / 9}>
              <Box
                borderRadius="2xl"
                overflow="hidden"
                shadow="2xl"
                transform="rotate(3deg)"
                _hover={{ transform: "rotate(0deg)" }}
                transition="all 0.5s ease"
              >
                <Image
                  alt="ENVDAMA 智能数据分析系统"
                  objectFit="cover"
                  w="full"
                  h="full"
                  src="/assets/images/flow-1.jpg"
                />
              </Box>
            </AspectRatio>
          </GridItem>
        </Grid>
      </Container>
    </Box>
  )
}
