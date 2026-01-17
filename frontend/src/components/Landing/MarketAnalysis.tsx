import {
  Badge,
  Box,
  Container,
  Grid,
  GridItem,
  HStack,
  Heading,
  Icon,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react"
import {
  FaArrowUp,
  FaChartLine,
  FaGavel,
  FaIndustry,
  FaLeaf,
  FaWater,
} from "react-icons/fa"

export const MarketAnalysis = () => {
  const marketStats = [
    {
      label: "市场规模",
      value: "1.2万亿",
      unit: "元",
      description: "2023年中国环保产业总产值",
      color: "blue",
      icon: FaChartLine,
    },
    {
      label: "年增长率",
      value: "8.5%",
      unit: "",
      description: "环保产业年复合增长率",
      color: "green",
      icon: FaArrowUp,
    },
    {
      label: "水处理占比",
      value: "35%",
      unit: "",
      description: "在环保产业中的比重",
      color: "purple",
      icon: FaWater,
    },
    {
      label: "智能化渗透率",
      value: "<15%",
      unit: "",
      description: "巨大提升空间",
      color: "orange",
      icon: FaIndustry,
    },
  ]

  const policyDrivers = [
    {
      title: "碳达峰碳中和",
      description: "2030年前实现碳达峰，2060年前实现碳中和，推动绿色低碳发展",
      impact: "高",
    },
    {
      title: "新环保法",
      description: "史上最严环保法，违法成本大幅提升，倒逼企业提升环保水平",
      impact: "高",
    },
    {
      title: "水污染防治行动计划",
      description:
        "水十条要求到2030年全国水环境质量总体改善，水生态系统功能初步恢复",
      impact: "中",
    },
    {
      title: "智能制造2025",
      description: "推动制造业数字化、网络化、智能化发展，环保行业是重点领域",
      impact: "中",
    },
  ]

  const keyMarkets = [
    {
      title: "市政污水处理",
      scale: "4200亿元",
      growth: "6.8%",
      description: "城镇化推进，污水处理需求持续增长",
    },
    {
      title: "工业废水处理",
      scale: "1800亿元",
      growth: "9.2%",
      description: "环保要求趋严，工业企业治污需求旺盛",
    },
    {
      title: "农村污水处理",
      scale: "800亿元",
      growth: "15.6%",
      description: "乡村振兴战略，农村环境治理加速",
    },
  ]

  return (
    <Box bg={{ base: "gray.50", _dark: "gray.800" }} py={20}>
      <Container maxW="container.xl">
        <VStack gap={16}>
          <VStack gap={6} textAlign="center">
            <Badge
              colorScheme="blue"
              px={4}
              py={2}
              borderRadius="full"
              fontSize="sm"
              fontWeight="600"
            >
              📊 市场分析
            </Badge>
            <Heading
              fontSize={{ base: "3xl", lg: "4xl" }}
              fontWeight="700"
              color={{ base: "gray.800", _dark: "white" }}
              textAlign="center"
            >
              万亿级市场，智能化转型正当时
            </Heading>
            <Text
              fontSize="lg"
              color={{ base: "gray.600", _dark: "gray.300" }}
              maxW="3xl"
              textAlign="center"
              lineHeight="1.8"
            >
              环保产业进入高质量发展阶段，政策驱动与技术创新双轮驱动，智能化升级需求迫切
            </Text>
          </VStack>

          {/* Market Size */}
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={6} w="full">
            {marketStats.map((stat, index) => (
              <Box
                key={index}
                p={6}
                bg={{ base: "white", _dark: "gray.700" }}
                borderRadius="xl"
                shadow="md"
                textAlign="center"
                border="1px"
                borderColor={{ base: "gray.200", _dark: "gray.600" }}
              >
                <VStack gap={3}>
                  <Icon
                    as={stat.icon}
                    color={`${stat.color}.500`}
                    boxSize={8}
                  />
                  <VStack gap={1}>
                    <Text
                      fontSize="2xl"
                      fontWeight="bold"
                      color={`${stat.color}.600`}
                    >
                      {stat.value}
                      {stat.unit}
                    </Text>
                    <Text
                      fontSize="sm"
                      color={{ base: "gray.600", _dark: "gray.300" }}
                      fontWeight="500"
                    >
                      {stat.label}
                    </Text>
                    <Text
                      fontSize="xs"
                      color={{ base: "gray.500", _dark: "gray.400" }}
                      textAlign="center"
                    >
                      {stat.description}
                    </Text>
                  </VStack>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>

          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={12}>
            {/* Policy Drivers */}
            <GridItem>
              <Box
                p={8}
                bg={{ base: "white", _dark: "gray.700" }}
                borderRadius="2xl"
                shadow="lg"
                h="full"
              >
                <VStack align="start" gap={6}>
                  <HStack>
                    <Icon as={FaGavel} color="blue.500" boxSize={6} />
                    <Heading
                      size="lg"
                      color={{ base: "gray.800", _dark: "white" }}
                    >
                      政策驱动因素
                    </Heading>
                  </HStack>

                  <VStack align="start" gap={4} w="full">
                    {policyDrivers.map((policy, index) => (
                      <Box
                        key={index}
                        p={4}
                        bg={{ base: "gray.50", _dark: "gray.600" }}
                        borderRadius="lg"
                        w="full"
                      >
                        <HStack justify="space-between" mb={2}>
                          <Text
                            fontWeight="600"
                            color={{ base: "gray.800", _dark: "white" }}
                            fontSize="sm"
                          >
                            {policy.title}
                          </Text>
                          <Badge
                            colorScheme={
                              policy.impact === "高" ? "red" : "orange"
                            }
                            size="sm"
                          >
                            {policy.impact}影响
                          </Badge>
                        </HStack>
                        <Text
                          fontSize="xs"
                          color={{ base: "gray.600", _dark: "gray.300" }}
                          lineHeight="1.6"
                        >
                          {policy.description}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                </VStack>
              </Box>
            </GridItem>

            {/* Key Markets */}
            <GridItem>
              <Box
                p={8}
                bg={{ base: "white", _dark: "gray.700" }}
                borderRadius="2xl"
                shadow="lg"
                h="full"
              >
                <VStack align="start" gap={6}>
                  <HStack>
                    <Icon as={FaLeaf} color="green.500" boxSize={6} />
                    <Heading
                      size="lg"
                      color={{ base: "gray.800", _dark: "white" }}
                    >
                      重点细分市场
                    </Heading>
                  </HStack>

                  <VStack align="start" gap={4} w="full">
                    {keyMarkets.map((market, index) => (
                      <Box
                        key={index}
                        p={4}
                        bg={{ base: "gray.50", _dark: "gray.600" }}
                        borderRadius="lg"
                        w="full"
                      >
                        <HStack justify="space-between" mb={2}>
                          <Text
                            fontWeight="600"
                            color={{ base: "gray.800", _dark: "white" }}
                            fontSize="sm"
                          >
                            {market.title}
                          </Text>
                          <HStack gap={2}>
                            <Badge colorScheme="blue" size="sm">
                              {market.scale}
                            </Badge>
                            <Badge colorScheme="green" size="sm">
                              +{market.growth}
                            </Badge>
                          </HStack>
                        </HStack>
                        <Text
                          fontSize="xs"
                          color={{ base: "gray.600", _dark: "gray.300" }}
                          lineHeight="1.6"
                        >
                          {market.description}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                </VStack>
              </Box>
            </GridItem>
          </Grid>
        </VStack>
      </Container>
    </Box>
  )
}
