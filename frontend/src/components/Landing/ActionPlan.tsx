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
  Progress,
  Text,
  VStack,
} from "@chakra-ui/react"
import {
  FaArrowRight,
  FaCalendarAlt,
  FaCheckCircle,
  FaGlobe,
  FaRocket,
  FaUsers,
} from "react-icons/fa"

export const ActionPlan = () => {
  const phases = [
    {
      phase: "第一阶段",
      title: "MVP验证与种子客户",
      duration: "6个月",
      timeline: "2024年Q1-Q2",
      progress: 75,
      color: "green",
      icon: FaRocket,
      goals: [
        "完成核心功能开发",
        "获得5-10家种子客户",
        "验证产品市场契合度",
        "建立初步的客户成功案例",
      ],
      milestones: [
        "产品Beta版本发布",
        "首批客户签约",
        "技术架构稳定",
        "用户反馈收集完成",
      ],
      investment: "500万元",
      team: "15人",
    },
    {
      phase: "第二阶段",
      title: "市场扩张与产品完善",
      duration: "12个月",
      timeline: "2024年Q3-2025年Q2",
      progress: 30,
      color: "blue",
      icon: FaUsers,
      goals: [
        "扩展到50+家客户",
        "完善产品功能矩阵",
        "建立销售和服务体系",
        "实现盈亏平衡",
      ],
      milestones: [
        "正式版本发布",
        "销售团队建立",
        "客户服务体系完善",
        "收入突破1000万",
      ],
      investment: "2000万元",
      team: "50人",
    },
    {
      phase: "第三阶段",
      title: "规模化与生态建设",
      duration: "18个月",
      timeline: "2025年Q3-2026年Q4",
      progress: 10,
      color: "purple",
      icon: FaGlobe,
      goals: [
        "服务500+家客户",
        "建立行业生态系统",
        "拓展相关领域应用",
        "准备IPO或战略并购",
      ],
      milestones: [
        "行业领导地位确立",
        "生态合作伙伴网络",
        "国际市场拓展",
        "收入突破1亿元",
      ],
      investment: "5000万元",
      team: "150人",
    },
  ]

  const keyMetrics = [
    {
      metric: "客户数量",
      current: "10家",
      target: "500+家",
      color: "green",
    },
    {
      metric: "年收入",
      current: "200万",
      target: "1亿+",
      color: "blue",
    },
    {
      metric: "团队规模",
      current: "15人",
      target: "150人",
      color: "purple",
    },
    {
      metric: "市场份额",
      current: "<1%",
      target: "10%",
      color: "orange",
    },
  ]

  return (
    <Box bg={{ base: "gray.50", _dark: "gray.800" }} py={20}>
      <Container maxW="container.xl">
        <VStack gap={16}>
          <VStack gap={6} textAlign="center">
            <Badge
              colorScheme="purple"
              px={4}
              py={2}
              borderRadius="full"
              fontSize="sm"
              fontWeight="600"
            >
              🚀 行动计划
            </Badge>
            <Heading
              fontSize={{ base: "3xl", lg: "4xl" }}
              fontWeight="700"
              color={{ base: "gray.800", _dark: "white" }}
              textAlign="center"
            >
              三阶段发展路径，稳步迈向行业领先
            </Heading>
            <Text
              fontSize="lg"
              color={{ base: "gray.600", _dark: "gray.300" }}
              maxW="3xl"
              textAlign="center"
              lineHeight="1.8"
            >
              基于市场验证的渐进式发展策略，从MVP验证到规模化扩张，每个阶段都有明确的目标和里程碑
            </Text>
          </VStack>

          {/* Development Phases */}
          <VStack gap={8} w="full">
            {phases.map((phase, index) => (
              <Box
                key={index}
                w="full"
                p={8}
                bg={{ base: "white", _dark: "gray.700" }}
                borderRadius="2xl"
                shadow="lg"
                border="1px"
                borderColor={{ base: "gray.200", _dark: "gray.600" }}
              >
                <Grid
                  templateColumns={{ base: "1fr", lg: "1fr 2fr 1fr" }}
                  gap={8}
                >
                  {/* Phase Header */}
                  <GridItem>
                    <VStack align="start" gap={4}>
                      <HStack>
                        <Box
                          p={3}
                          bg={`${phase.color}.100`}
                          borderRadius="lg"
                          display="inline-flex"
                        >
                          <Icon
                            as={phase.icon}
                            color={`${phase.color}.600`}
                            boxSize={6}
                          />
                        </Box>
                        <VStack align="start" gap={1}>
                          <Badge colorScheme={phase.color} px={3} py={1}>
                            {phase.phase}
                          </Badge>
                          <Text
                            fontSize="sm"
                            color={{ base: "gray.600", _dark: "gray.300" }}
                          >
                            {phase.duration}
                          </Text>
                        </VStack>
                      </HStack>

                      <VStack align="start" gap={2}>
                        <Heading
                          size="md"
                          color={{ base: "gray.800", _dark: "white" }}
                        >
                          {phase.title}
                        </Heading>
                        <HStack>
                          <Icon
                            as={FaCalendarAlt}
                            color="gray.500"
                            boxSize={4}
                          />
                          <Text
                            fontSize="sm"
                            color={{ base: "gray.600", _dark: "gray.300" }}
                          >
                            {phase.timeline}
                          </Text>
                        </HStack>
                      </VStack>

                      <VStack align="start" gap={2} w="full">
                        <HStack justify="space-between" w="full">
                          <Text
                            fontSize="sm"
                            color={{ base: "gray.600", _dark: "gray.300" }}
                          >
                            进度
                          </Text>
                          <Text
                            fontSize="sm"
                            fontWeight="600"
                            color={`${phase.color}.600`}
                          >
                            {phase.progress}%
                          </Text>
                        </HStack>
                        <Progress.Root
                          value={phase.progress}
                          colorPalette={phase.color}
                          size="sm"
                          w="full"
                        >
                          <Progress.Track>
                            <Progress.Range />
                          </Progress.Track>
                        </Progress.Root>
                      </VStack>
                    </VStack>
                  </GridItem>

                  {/* Goals and Milestones */}
                  <GridItem>
                    <Grid
                      templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                      gap={6}
                    >
                      <VStack align="start" gap={3}>
                        <Text
                          fontSize="sm"
                          fontWeight="600"
                          color={{ base: "gray.700", _dark: "gray.300" }}
                        >
                          核心目标
                        </Text>
                        <VStack align="start" gap={2}>
                          {phase.goals.map((goal, goalIndex) => (
                            <HStack key={goalIndex} align="start">
                              <Icon
                                as={FaCheckCircle}
                                color={`${phase.color}.500`}
                                boxSize={3}
                                mt={1}
                                flexShrink={0}
                              />
                              <Text
                                fontSize="xs"
                                color={{ base: "gray.600", _dark: "gray.300" }}
                                lineHeight="1.5"
                              >
                                {goal}
                              </Text>
                            </HStack>
                          ))}
                        </VStack>
                      </VStack>

                      <VStack align="start" gap={3}>
                        <Text
                          fontSize="sm"
                          fontWeight="600"
                          color={{ base: "gray.700", _dark: "gray.300" }}
                        >
                          关键里程碑
                        </Text>
                        <VStack align="start" gap={2}>
                          {phase.milestones.map((milestone, milestoneIndex) => (
                            <HStack key={milestoneIndex} align="start">
                              <Icon
                                as={FaArrowRight}
                                color={`${phase.color}.500`}
                                boxSize={3}
                                mt={1}
                                flexShrink={0}
                              />
                              <Text
                                fontSize="xs"
                                color={{ base: "gray.600", _dark: "gray.300" }}
                                lineHeight="1.5"
                              >
                                {milestone}
                              </Text>
                            </HStack>
                          ))}
                        </VStack>
                      </VStack>
                    </Grid>
                  </GridItem>

                  {/* Investment & Team */}
                  <GridItem>
                    <VStack align="start" gap={4}>
                      <VStack align="start" gap={2}>
                        <Text
                          fontSize="sm"
                          fontWeight="600"
                          color={{ base: "gray.700", _dark: "gray.300" }}
                        >
                          资金需求
                        </Text>
                        <Text
                          fontSize="xl"
                          fontWeight="bold"
                          color={`${phase.color}.600`}
                        >
                          {phase.investment}
                        </Text>
                      </VStack>

                      <VStack align="start" gap={2}>
                        <Text
                          fontSize="sm"
                          fontWeight="600"
                          color={{ base: "gray.700", _dark: "gray.300" }}
                        >
                          团队规模
                        </Text>
                        <Text
                          fontSize="lg"
                          fontWeight="600"
                          color={{ base: "gray.800", _dark: "white" }}
                        >
                          {phase.team}
                        </Text>
                      </VStack>

                      <Button
                        size="sm"
                        colorScheme={phase.color}
                        variant="outline"
                        w="full"
                      >
                        查看详情
                      </Button>
                    </VStack>
                  </GridItem>
                </Grid>
              </Box>
            ))}
          </VStack>

          {/* Key Metrics */}
          <VStack gap={8} w="full">
            <VStack gap={4} textAlign="center">
              <Heading size="lg" color={{ base: "gray.800", _dark: "white" }}>
                关键指标预期
              </Heading>
              <Text
                color={{ base: "gray.600", _dark: "gray.300" }}
                maxW="2xl"
                textAlign="center"
              >
                通过三个阶段的发展，我们预期在关键业务指标上实现显著增长
              </Text>
            </VStack>

            <Grid
              templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }}
              gap={6}
              w="full"
            >
              {keyMetrics.map((metric, index) => (
                <Box
                  key={index}
                  p={6}
                  bg={{ base: "white", _dark: "gray.700" }}
                  borderRadius="xl"
                  shadow="md"
                  textAlign="center"
                >
                  <VStack gap={3}>
                    <Text
                      fontSize="sm"
                      fontWeight="600"
                      color={{ base: "gray.700", _dark: "gray.300" }}
                    >
                      {metric.metric}
                    </Text>
                    <VStack gap={1}>
                      <Text
                        fontSize="lg"
                        color={{ base: "gray.600", _dark: "gray.400" }}
                      >
                        {metric.current}
                      </Text>
                      <Icon as={FaArrowRight} color="gray.400" boxSize={4} />
                      <Text
                        fontSize="xl"
                        fontWeight="bold"
                        color={`${metric.color}.600`}
                      >
                        {metric.target}
                      </Text>
                    </VStack>
                  </VStack>
                </Box>
              ))}
            </Grid>
          </VStack>
        </VStack>
      </Container>
    </Box>
  )
}
