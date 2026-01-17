import {
  Badge,
  Box,
  Container,
  Grid,
  GridItem,
  HStack,
  Heading,
  Icon,
  Text,
  VStack,
} from "@chakra-ui/react"
import { FaArrowUp, FaBrain, FaCog, FaShieldAlt, FaUsers } from "react-icons/fa"

export const CoreAdvantages = () => {
  const advantages = [
    {
      icon: FaBrain,
      title: "深度融合，双模驱动",
      description:
        "将数据驱动的机器学习模型与行业公认的机理模型深度融合，解决纯数据模型缺乏可解释性、纯机理模型与现实脱节的根本痛点",
      color: "blue",
      gradient: "linear(to-br, blue.400, blue.600)",
    },
    {
      icon: FaUsers,
      title: "赋能专家，而非取代",
      description:
        "将工艺工程师从繁琐的数据处理中解放出来，用自然语言就能调用强大的分析能力，专注于业务问题本身",
      color: "green",
      gradient: "linear(to-br, green.400, green.600)",
    },
    {
      icon: FaShieldAlt,
      title: "绝对安全，本地执行",
      description:
        "所有核心数据处理、代码生成与执行、模型计算全部在客户本地服务器完成，数据绝不离开企业内网",
      color: "purple",
      gradient: "linear(to-br, purple.400, purple.600)",
    },
    {
      icon: FaCog,
      title: "可靠可信，结果可溯",
      description:
        "每一次分析都会生成清晰、可读的Python代码和模型调用日志，客户可以审查和验证每一步分析过程",
      color: "orange",
      gradient: "linear(to-br, orange.400, orange.600)",
    },
  ]

  return (
    <Box py={20} bg={{ base: "white", _dark: "gray.900" }}>
      <Container maxW="container.xl">
        <VStack gap={16}>
          <VStack gap={6} textAlign="center">
            <Badge
              colorScheme="green"
              px={4}
              py={2}
              borderRadius="full"
              fontSize="sm"
              fontWeight="600"
            >
              ⚡ 核心优势
            </Badge>
            <Heading
              fontSize={{ base: "3xl", lg: "4xl" }}
              fontWeight="700"
              color={{ base: "gray.800", _dark: "white" }}
              textAlign="center"
            >
              四大核心优势，解决行业痛点
            </Heading>
            <Text
              fontSize="lg"
              color={{ base: "gray.600", _dark: "gray.300" }}
              maxW="3xl"
              textAlign="center"
              lineHeight="1.8"
            >
              基于大语言模型的智能数据分析系统，融合机理模型与数据驱动分析，为环保企业提供本地化、可信赖的智能决策支持
            </Text>
          </VStack>

          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={8}>
            {advantages.map((advantage, index) => (
              <GridItem key={index}>
                <Box
                  p={8}
                  bg={{ base: "white", _dark: "gray.800" }}
                  borderRadius="2xl"
                  shadow="lg"
                  border="1px"
                  borderColor={{ base: "gray.200", _dark: "gray.700" }}
                  transition="all 0.3s ease"
                  _hover={{
                    transform: "translateY(-8px)",
                    shadow: "2xl",
                    borderColor: `${advantage.color}.300`,
                  }}
                  h="full"
                >
                  <VStack align="start" gap={6} h="full">
                    <Box
                      p={4}
                      bgGradient={advantage.gradient}
                      borderRadius="xl"
                      display="inline-flex"
                    >
                      <Icon as={advantage.icon} color="white" boxSize={8} />
                    </Box>

                    <VStack align="start" gap={3} flex={1}>
                      <Heading
                        size="lg"
                        color={{ base: "gray.800", _dark: "white" }}
                        fontWeight="600"
                      >
                        {advantage.title}
                      </Heading>
                      <Text
                        color={{ base: "gray.600", _dark: "gray.300" }}
                        fontSize="md"
                        lineHeight="1.7"
                      >
                        {advantage.description}
                      </Text>
                    </VStack>

                    <HStack>
                      <Text
                        fontSize="sm"
                        color={`${advantage.color}.500`}
                        fontWeight="600"
                      >
                        了解更多
                      </Text>
                      <Icon
                        as={FaArrowUp}
                        color={`${advantage.color}.500`}
                        boxSize={4}
                        transform="rotate(45deg)"
                      />
                    </HStack>
                  </VStack>
                </Box>
              </GridItem>
            ))}
          </Grid>
        </VStack>
      </Container>
    </Box>
  )
}
