import {
  Badge,
  Box,
  Container,
  Grid,
  Heading,
  Icon,
  Text,
  VStack,
} from "@chakra-ui/react"
import { Card } from "@chakra-ui/react"
import {
  FaBrain,
  FaChartLine,
  FaCog,
  FaDatabase,
  FaRocket,
  FaShieldAlt,
} from "react-icons/fa"

const features = [
  {
    title: "智能数据分析",
    description:
      "基于大语言模型的智能分析引擎，自动识别数据模式，提供深度洞察和预测分析。",
    icon: FaBrain,
    color: "blue.500",
    image: "/assets/images/feature-analysis.png",
  },
  {
    title: "实时监控仪表板",
    description:
      "实时监控关键指标，自定义仪表板，支持多维度数据可视化和告警机制。",
    icon: FaChartLine,
    color: "green.500",
    image: "/assets/images/feature-dashboard.png",
  },
  {
    title: "数据集成平台",
    description:
      "无缝集成多种数据源，支持实时和批量数据处理，确保数据质量和一致性。",
    icon: FaDatabase,
    color: "purple.500",
    image: "/assets/images/feature-integration.png",
  },
  {
    title: "自动化工作流",
    description:
      "智能工作流引擎，自动化数据处理流程，减少人工干预，提高工作效率。",
    icon: FaCog,
    color: "orange.500",
    image: "/assets/images/feature-workflow.png",
  },
  {
    title: "企业级安全",
    description:
      "多层安全防护，数据加密传输和存储，符合行业安全标准和合规要求。",
    icon: FaShieldAlt,
    color: "red.500",
    image: "/assets/images/feature-security.png",
  },
  {
    title: "快速部署",
    description: "支持云端和本地部署，一键安装配置，快速上线，降低技术门槛。",
    icon: FaRocket,
    color: "cyan.500",
    image: "/assets/images/feature-deploy.png",
  },
]

export function FeatureShowcase() {
  return (
    <Box py={20} bg="gray.50" _dark={{ bg: "gray.900" }}>
      <Container maxW="container.xl">
        <VStack gap={16}>
          {/* Header */}
          <VStack gap={4} textAlign="center" maxW="3xl">
            <Badge
              colorScheme="blue"
              px={4}
              py={2}
              borderRadius="full"
              fontSize="sm"
              fontWeight="600"
            >
              🚀 核心功能
            </Badge>

            <Heading
              fontSize={{ base: "3xl", md: "4xl", lg: "5xl" }}
              fontWeight="bold"
              color="gray.800"
              _dark={{ color: "gray.100" }}
            >
              您需要的一切功能
            </Heading>

            <Text
              fontSize={{ base: "lg", lg: "xl" }}
              color="gray.600"
              _dark={{ color: "gray.400" }}
              lineHeight="1.8"
              textAlign="center"
            >
              从自动化数据处理到智能分析洞察，ENVDAMA
              为您的业务提供全方位的数据解决方案。
              让复杂的数据分析变得简单高效。
            </Text>
          </VStack>

          {/* Features Grid */}
          <Grid
            templateColumns={{
              base: "1fr",
              md: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)",
            }}
            gap={8}
            w="full"
          >
            {features.map((feature) => (
              <Card.Root
                key={feature.title}
                bg="white"
                _dark={{ bg: "gray.800" }}
                shadow="lg"
                borderRadius="xl"
                overflow="hidden"
                _hover={{
                  transform: "translateY(-4px)",
                  shadow: "xl",
                }}
                transition="all 0.3s"
                cursor="pointer"
              >
                <Card.Body p={6}>
                  <VStack align="start" gap={4}>
                    {/* Icon */}
                    <Box
                      p={3}
                      borderRadius="lg"
                      bg={`${feature.color.split(".")[0]}.50`}
                      _dark={{ bg: `${feature.color.split(".")[0]}.900` }}
                    >
                      <Icon
                        as={feature.icon}
                        w={6}
                        h={6}
                        color={feature.color}
                      />
                    </Box>

                    {/* Content */}
                    <VStack align="start" gap={2}>
                      <Heading
                        fontSize="xl"
                        fontWeight="semibold"
                        color="gray.800"
                        _dark={{ color: "gray.100" }}
                      >
                        {feature.title}
                      </Heading>

                      <Text
                        fontSize="sm"
                        color="gray.600"
                        _dark={{ color: "gray.400" }}
                        lineHeight="1.6"
                      >
                        {feature.description}
                      </Text>
                    </VStack>

                    {/* Feature Image Placeholder */}
                    <Box
                      w="full"
                      h="120px"
                      bg="gray.100"
                      _dark={{ bg: "gray.700" }}
                      borderRadius="md"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      mt={4}
                    >
                      <Text
                        fontSize="xs"
                        color="gray.500"
                        _dark={{ color: "gray.400" }}
                        textAlign="center"
                      >
                        功能预览图
                        <br />
                        {feature.title}
                      </Text>
                    </Box>
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </Grid>
        </VStack>
      </Container>
    </Box>
  )
}
