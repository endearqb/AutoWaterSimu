import {
  Badge,
  Box,
  Button,
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
  FaChartLine,
  FaCheckCircle,
  FaCog,
  FaStar,
  FaUsers,
} from "react-icons/fa"

export const RevenueModel = () => {
  const pricingPlans = [
    {
      name: "基础版",
      price: "19,800",
      period: "年",
      description: "适合中小型污水处理厂",
      features: [
        "支持1个处理厂",
        "基础数据分析功能",
        "标准机理模型库",
        "邮件技术支持",
        "基础培训（2天）",
      ],
      color: "blue",
      popular: false,
    },
    {
      name: "专业版",
      price: "49,800",
      period: "年",
      description: "适合大型污水处理厂或集团企业",
      features: [
        "支持5个处理厂",
        "高级数据分析功能",
        "完整机理模型库",
        "自定义模型开发",
        "电话+现场技术支持",
        "深度培训（5天）",
        "季度优化咨询",
      ],
      color: "purple",
      popular: true,
    },
    {
      name: "企业版",
      price: "面议",
      period: "",
      description: "适合大型环保集团或政府平台",
      features: [
        "无限制处理厂数量",
        "全功能数据分析",
        "定制化机理模型",
        "专属模型开发",
        "7×24小时技术支持",
        "全方位培训计划",
        "月度专家咨询",
        "源码授权（可选）",
      ],
      color: "orange",
      popular: false,
    },
  ]

  const additionalServices = [
    {
      icon: FaCog,
      title: "定制化开发",
      description: "根据客户特殊需求，开发专属功能模块",
      price: "10万-50万",
      color: "blue",
    },
    {
      icon: FaUsers,
      title: "专业培训",
      description: "为客户团队提供系统性的产品使用和数据分析培训",
      price: "5000元/天",
      color: "green",
    },
    {
      icon: FaChartLine,
      title: "咨询服务",
      description: "资深专家提供工艺优化和运营改进咨询",
      price: "8000元/天",
      color: "purple",
    },
  ]

  return (
    <Box py={20} bg={{ base: "white", _dark: "gray.900" }}>
      <Container maxW="container.xl">
        <VStack gap={16}>
          <VStack gap={6} textAlign="center">
            <Badge
              colorScheme="orange"
              px={4}
              py={2}
              borderRadius="full"
              fontSize="sm"
              fontWeight="600"
            >
              💰 收费模式
            </Badge>
            <Heading
              fontSize={{ base: "3xl", lg: "4xl" }}
              fontWeight="700"
              color={{ base: "gray.800", _dark: "white" }}
              textAlign="center"
            >
              灵活的定价策略，满足不同规模需求
            </Heading>
            <Text
              fontSize="lg"
              color={{ base: "gray.600", _dark: "gray.300" }}
              maxW="3xl"
              textAlign="center"
              lineHeight="1.8"
            >
              基于SaaS订阅模式，提供多层次产品组合，确保每个客户都能找到最适合的解决方案
            </Text>
          </VStack>

          {/* Pricing Plans */}
          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={8}>
            {pricingPlans.map((plan, index) => (
              <GridItem key={index}>
                <Box
                  p={8}
                  bg={{ base: "white", _dark: "gray.800" }}
                  borderRadius="2xl"
                  shadow={plan.popular ? "2xl" : "lg"}
                  border="2px"
                  borderColor={
                    plan.popular ? `${plan.color}.300` : "transparent"
                  }
                  position="relative"
                  h="full"
                  transition="all 0.3s ease"
                  _hover={{
                    transform: "translateY(-4px)",
                    shadow: "2xl",
                  }}
                >
                  {plan.popular && (
                    <Badge
                      position="absolute"
                      top={-3}
                      left="50%"
                      transform="translateX(-50%)"
                      colorScheme={plan.color}
                      px={4}
                      py={1}
                      borderRadius="full"
                      fontSize="xs"
                      fontWeight="600"
                    >
                      <Icon as={FaStar} mr={1} boxSize={3} />
                      推荐
                    </Badge>
                  )}

                  <VStack align="start" gap={6} h="full">
                    <VStack align="start" gap={2}>
                      <Text
                        fontSize="xl"
                        fontWeight="700"
                        color={`${plan.color}.600`}
                      >
                        {plan.name}
                      </Text>
                      <Text
                        fontSize="sm"
                        color={{ base: "gray.600", _dark: "gray.300" }}
                      >
                        {plan.description}
                      </Text>
                    </VStack>

                    <HStack align="baseline">
                      <Text
                        fontSize="3xl"
                        fontWeight="bold"
                        color={{ base: "gray.800", _dark: "white" }}
                      >
                        ¥{plan.price}
                      </Text>
                      {plan.period && (
                        <Text
                          fontSize="md"
                          color={{ base: "gray.600", _dark: "gray.300" }}
                        >
                          /{plan.period}
                        </Text>
                      )}
                    </HStack>

                    <VStack align="start" gap={3} flex={1}>
                      {plan.features.map((feature, featureIndex) => (
                        <HStack key={featureIndex} align="start">
                          <Icon
                            as={FaCheckCircle}
                            color={`${plan.color}.500`}
                            boxSize={4}
                            mt={0.5}
                            flexShrink={0}
                          />
                          <Text
                            fontSize="sm"
                            color={{ base: "gray.700", _dark: "gray.300" }}
                            lineHeight="1.6"
                          >
                            {feature}
                          </Text>
                        </HStack>
                      ))}
                    </VStack>

                    <Button
                      colorScheme={plan.color}
                      size="lg"
                      w="full"
                      variant={plan.popular ? "solid" : "outline"}
                    >
                      {plan.price === "面议" ? "联系销售" : "立即购买"}
                    </Button>
                  </VStack>
                </Box>
              </GridItem>
            ))}
          </Grid>

          {/* Additional Services */}
          <VStack gap={8} w="full">
            <VStack gap={4} textAlign="center">
              <Heading size="lg" color={{ base: "gray.800", _dark: "white" }}>
                增值服务
              </Heading>
              <Text
                color={{ base: "gray.600", _dark: "gray.300" }}
                maxW="2xl"
                textAlign="center"
              >
                除了核心产品，我们还提供专业的增值服务，帮助客户最大化投资回报
              </Text>
            </VStack>

            <SimpleGrid columns={{ base: 1, md: 3 }} gap={6} w="full">
              {additionalServices.map((service, index) => (
                <Box
                  key={index}
                  p={6}
                  bg={{ base: "gray.50", _dark: "gray.800" }}
                  borderRadius="xl"
                  border="1px"
                  borderColor={{ base: "gray.200", _dark: "gray.700" }}
                  textAlign="center"
                >
                  <VStack gap={4}>
                    <Box
                      p={3}
                      bg={`${service.color}.100`}
                      borderRadius="lg"
                      display="inline-flex"
                    >
                      <Icon
                        as={service.icon}
                        color={`${service.color}.600`}
                        boxSize={6}
                      />
                    </Box>

                    <VStack gap={2}>
                      <Text
                        fontWeight="600"
                        color={{ base: "gray.800", _dark: "white" }}
                      >
                        {service.title}
                      </Text>
                      <Text
                        fontSize="sm"
                        color={{ base: "gray.600", _dark: "gray.300" }}
                        lineHeight="1.6"
                      >
                        {service.description}
                      </Text>
                      <Badge colorScheme={service.color} px={3} py={1}>
                        {service.price}
                      </Badge>
                    </VStack>
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          </VStack>
        </VStack>
      </Container>
    </Box>
  )
}
