import {
  Badge,
  Box,
  Card,
  Container,
  Flex,
  Grid,
  Heading,
  Progress,
  Slider,
  Steps,
  Tabs,
  Text,
  VStack,
} from "@chakra-ui/react"
import type React from "react"
import { useState } from "react"
import type { ChartConfig } from "../../data/articles/types"
import { InteractiveChart } from "./InteractiveChart"

interface ProcessStep {
  id: string
  title: string
  description: string
  status: "completed" | "current" | "pending"
  details: string
}

interface ModelingMetric {
  name: string
  value: number
  max: number
  color: string
}

const processSteps: ProcessStep[] = [
  {
    id: "data-collection",
    title: "数据采集",
    description: "收集现场传感器数据",
    status: "completed",
    details: "通过SCADA系统实时采集流量、水质、设备状态等关键数据",
  },
  {
    id: "data-processing",
    title: "数据处理",
    description: "清洗和标准化数据",
    status: "completed",
    details: "去除异常值，填补缺失数据，统一数据格式和时间戳",
  },
  {
    id: "pattern-analysis",
    title: "模式识别",
    description: "识别运行模式和异常",
    status: "current",
    details: "使用机器学习算法识别正常运行模式和潜在异常情况",
  },
  {
    id: "model-building",
    title: "模型构建",
    description: "建立数字孪生模型",
    status: "pending",
    details: "基于物理原理和数据驱动方法构建高保真数字孪生模型",
  },
  {
    id: "validation",
    title: "模型验证",
    description: "验证模型准确性",
    status: "pending",
    details: "通过历史数据和实时数据验证模型的预测准确性",
  },
]

const modelingMetrics: ModelingMetric[] = [
  { name: "数据完整性", value: 85, max: 100, color: "blue" },
  { name: "模型精度", value: 78, max: 100, color: "green" },
  { name: "实时性能", value: 92, max: 100, color: "purple" },
  { name: "可扩展性", value: 70, max: 100, color: "orange" },
  { name: "用户友好性", value: 88, max: 100, color: "pink" },
]

export const DigitalTwinGuide: React.FC = () => {
  const [activeStage, setActiveStage] = useState(0)
  const [energyOptimization, setEnergyOptimization] = useState(75)
  const [predictionHorizon, setPredictionHorizon] = useState(24)
  const [_, setSelectedModule] = useState("energy")

  const stages = [
    {
      id: "deconstruct",
      title: "解构现实",
      description: "深入理解污水处理的复杂现实",
    },
    {
      id: "construct",
      title: "构建虚拟",
      description: "在数字世界中重建污水厂",
    },
    {
      id: "realize",
      title: "实现价值",
      description: "通过数字孪生创造实际价值",
    },
    { id: "journey", title: "开启旅程", description: "规划您的数字化转型之路" },
  ]

  // 雷达图数据
  const getRadarChartData = (): ChartConfig => {
    return {
      id: "modeling-radar",
      type: "radar",
      title: "建模能力雷达图",
      data: {
        labels: modelingMetrics.map((m) => m.name),
        datasets: [
          {
            label: "当前水平",
            data: modelingMetrics.map((m) => m.value),
            backgroundColor: "rgba(59, 130, 246, 0.2)",
            borderColor: "rgb(59, 130, 246)",
            borderWidth: 2,
            pointBackgroundColor: "rgb(59, 130, 246)",
            pointBorderColor: "#fff",
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: "rgb(59, 130, 246)",
          },
        ],
      },
      options: {
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20,
            },
          },
        },
      },
    }
  }

  // 能耗优化图表数据
  const getEnergyOptimizationData = (): ChartConfig => {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const baseConsumption = hours.map((h) => {
      // 模拟基础能耗模式
      const baseLoad = 100
      const peakFactor = 1 + 0.3 * Math.sin(((h - 6) * Math.PI) / 12)
      return baseLoad * peakFactor
    })

    const optimizedConsumption = baseConsumption.map(
      (base) => base * (1 - energyOptimization / 200),
    )

    return {
      id: "energy-optimization",
      type: "line",
      title: "24小时能耗优化对比",
      data: {
        labels: hours.map((h) => `${h}:00`),
        datasets: [
          {
            label: "传统运行",
            data: baseConsumption,
            borderColor: "rgb(239, 68, 68)",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            fill: true,
          },
          {
            label: "AI优化运行",
            data: optimizedConsumption,
            borderColor: "rgb(34, 197, 94)",
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            fill: true,
          },
        ],
      },
      options: {
        scales: {
          x: {
            title: {
              display: true,
              text: "时间",
            },
          },
          y: {
            title: {
              display: true,
              text: "能耗 (kWh)",
            },
          },
        },
      },
    }
  }

  // 预测分析图表数据
  const getPredictionData = (): ChartConfig => {
    const timePoints = Array.from(
      { length: predictionHorizon },
      (_, i) => i + 1,
    )
    const historicalData = timePoints
      .slice(0, Math.floor(predictionHorizon * 0.7))
      .map(() => 80 + Math.random() * 40)
    const predictedData = timePoints
      .slice(Math.floor(predictionHorizon * 0.7))
      .map(() => 85 + Math.random() * 30)

    return {
      id: "prediction-analysis",
      type: "line",
      title: `${predictionHorizon}小时出水水质预测`,
      data: {
        labels: timePoints.map((t) => `${t}h`),
        datasets: [
          {
            label: "历史数据",
            data: [
              ...historicalData,
              ...Array(predictedData.length).fill(null),
            ],
            borderColor: "rgb(59, 130, 246)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            fill: false,
          },
          {
            label: "预测数据",
            data: [
              ...Array(historicalData.length).fill(null),
              ...predictedData,
            ],
            borderColor: "rgb(245, 158, 11)",
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            borderDash: [5, 5],
            fill: false,
          },
        ],
      },
      options: {
        scales: {
          x: {
            title: {
              display: true,
              text: "时间 (小时)",
            },
          },
          y: {
            title: {
              display: true,
              text: "COD去除率 (%)",
            },
          },
        },
      },
    }
  }

  const renderDeconstructStage = () => (
    <VStack gap={8}>
      <Card.Root bg="white" p={8} borderRadius="xl" shadow="lg" w="100%">
        <Card.Body>
          <Heading size="lg" textAlign="center" mb={4}>
            解构现实：理解污水处理的复杂性
          </Heading>
          <Text textAlign="center" color="gray.600" maxW="4xl" mx="auto" mb={8}>
            在构建数字孪生之前，我们必须深入理解污水处理厂的复杂现实。这个阶段我们将系统性地分解和分析现有系统。
          </Text>

          <Steps.Root
            defaultStep={2}
            count={processSteps.length}
            orientation="vertical"
            height="400px"
            gap="0"
          >
            <Steps.List>
              {processSteps.map((step, index) => (
                <Steps.Item key={index} index={index}>
                  <Steps.Indicator />
                  <Steps.Title>{step.title}</Steps.Title>
                  <Steps.Description>{step.description}</Steps.Description>
                  <Steps.Separator />
                </Steps.Item>
              ))}
            </Steps.List>
            {processSteps.map((step, index) => (
              <Steps.Content key={index} index={index}>
                <Box ml={6} mt={2}>
                  {step.details}
                </Box>
              </Steps.Content>
            ))}
          </Steps.Root>
        </Card.Body>
      </Card.Root>
    </VStack>
  )

  const renderConstructStage = () => (
    <VStack gap={8}>
      <Card.Root bg="white" p={8} borderRadius="xl" shadow="lg" w="100%">
        <Card.Body>
          <Heading size="lg" textAlign="center" mb={4}>
            构建虚拟：在数字世界重建污水厂
          </Heading>
          <Text textAlign="center" color="gray.600" maxW="4xl" mx="auto" mb={8}>
            基于对现实系统的深入理解，我们开始在数字世界中重建污水处理厂。这不仅仅是简单的3D建模，而是要构建一个能够反映真实系统行为的高保真数字孪生。
          </Text>

          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={8}>
            <Box>
              <Heading size="md" mb={4}>
                建模能力评估
              </Heading>
              <InteractiveChart config={getRadarChartData()} height={400} />
            </Box>

            <Box>
              <Heading size="md" mb={4}>
                关键建模指标
              </Heading>
              <VStack gap={4}>
                {modelingMetrics.map((metric, index) => (
                  <Box key={index} w="100%">
                    <Flex justify="space-between" mb={2}>
                      <Text fontWeight="semibold">{metric.name}</Text>
                      <Text color={`${metric.color}.500`}>{metric.value}%</Text>
                    </Flex>
                    <Progress.Root
                      value={metric.value}
                      colorScheme={metric.color}
                      size="lg"
                      borderRadius="md"
                    />
                  </Box>
                ))}
              </VStack>
            </Box>
          </Grid>
        </Card.Body>
      </Card.Root>
    </VStack>
  )

  const renderRealizeStage = () => (
    <VStack gap={8}>
      <Card.Root bg="white" p={8} borderRadius="xl" shadow="lg" w="100%">
        <Card.Body>
          <Heading size="lg" textAlign="center" mb={4}>
            实现价值：数字孪生的实际应用
          </Heading>
          <Text textAlign="center" color="gray.600" maxW="4xl" mx="auto" mb={8}>
            数字孪生的真正价值在于其实际应用。通过智能优化和预测分析，我们可以显著提升污水处理厂的运行效率。
          </Text>

          <Tabs.Root variant="enclosed" colorPalette="blue">
            <Tabs.List>
              <Tabs.Trigger
                value="energy"
                onClick={() => setSelectedModule("energy")}
              >
                能耗优化师
              </Tabs.Trigger>
              <Tabs.Trigger
                value="prediction"
                onClick={() => setSelectedModule("prediction")}
              >
                预言家
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="energy">
              <VStack gap={6}>
                <Box w="100%">
                  <Flex justify="space-between" align="center" mb={4}>
                    <Heading size="md">AI驱动的能耗优化</Heading>
                    <Badge colorScheme="green" fontSize="md" p={2}>
                      节能 {Math.round((energyOptimization / 100) * 25)}%
                    </Badge>
                  </Flex>

                  <Box mb={6}>
                    <Text mb={2}>优化强度: {energyOptimization}%</Text>
                    <Slider.Root
                      value={[energyOptimization]}
                      onValueChange={(details) =>
                        setEnergyOptimization(details.value[0])
                      }
                      min={0}
                      max={100}
                      step={5}
                      colorPalette="green"
                      width="100%"
                    >
                      <Slider.Label>25%</Slider.Label>
                      <Slider.Label>50%</Slider.Label>
                      <Slider.Label>75%</Slider.Label>
                      <Slider.Control>
                        <Slider.Track>
                          <Slider.Range />
                        </Slider.Track>
                        <Slider.Thumb index={0} />
                      </Slider.Control>
                    </Slider.Root>
                  </Box>

                  <InteractiveChart
                    config={getEnergyOptimizationData()}
                    height={400}
                  />
                </Box>
              </VStack>
            </Tabs.Content>

            <Tabs.Content value="prediction">
              <VStack gap={6}>
                <Box w="100%">
                  <Flex justify="space-between" align="center" mb={4}>
                    <Heading size="md">智能预测分析</Heading>
                    <Badge colorScheme="blue" fontSize="md" p={2}>
                      预测精度 92%
                    </Badge>
                  </Flex>

                  <Box mb={6}>
                    <Text mb={2}>预测时间窗口: {predictionHorizon} 小时</Text>
                    <Slider.Root
                      value={[predictionHorizon]}
                      onValueChange={(details) =>
                        setPredictionHorizon(details.value[0])
                      }
                      min={6}
                      max={72}
                      step={6}
                      colorPalette="blue"
                      width="100%"
                    >
                      <Slider.Label>12h</Slider.Label>
                      <Slider.Label>24h</Slider.Label>
                      <Slider.Label>48h</Slider.Label>
                      <Slider.Control>
                        <Slider.Track>
                          <Slider.Range />
                        </Slider.Track>
                        <Slider.Thumb index={0} />
                      </Slider.Control>
                    </Slider.Root>
                  </Box>

                  <InteractiveChart config={getPredictionData()} height={400} />
                </Box>
              </VStack>
            </Tabs.Content>
          </Tabs.Root>
        </Card.Body>
      </Card.Root>
    </VStack>
  )

  const renderJourneyStage = () => (
    <VStack gap={8}>
      <Card.Root bg="white" p={8} borderRadius="xl" shadow="lg" w="100%">
        <Card.Body>
          <Heading size="lg" textAlign="center" mb={4}>
            开启旅程：您的数字化转型之路
          </Heading>
          <Text textAlign="center" color="gray.600" maxW="4xl" mx="auto" mb={8}>
            数字孪生不是终点，而是数字化转型旅程的开始。让我们一起规划您的专属路线图。
          </Text>

          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={6}>
            {[
              {
                phase: "第一阶段",
                title: "基础建设",
                duration: "3-6个月",
                items: [
                  "数据采集系统升级",
                  "基础数字化平台搭建",
                  "核心团队培训",
                  "试点项目启动",
                ],
              },
              {
                phase: "第二阶段",
                title: "模型构建",
                duration: "6-12个月",
                items: [
                  "数字孪生模型开发",
                  "实时数据集成",
                  "预测算法训练",
                  "用户界面设计",
                ],
              },
              {
                phase: "第三阶段",
                title: "价值实现",
                duration: "12-18个月",
                items: [
                  "全面部署应用",
                  "运营优化实施",
                  "效益评估分析",
                  "持续改进机制",
                ],
              },
            ].map((phase, index) => (
              <Card.Root
                key={index}
                bg="gray.50"
                border="2px"
                borderColor="blue.200"
              >
                <Card.Body>
                  <Badge colorScheme="blue" mb={2}>
                    {phase.phase}
                  </Badge>
                  <Heading size="md" mb={2}>
                    {phase.title}
                  </Heading>
                  <Text color="gray.600" fontSize="sm" mb={4}>
                    预计时间：{phase.duration}
                  </Text>
                  <VStack align="start" gap={2}>
                    {phase.items.map((item, itemIndex) => (
                      <Text key={itemIndex} fontSize="sm">
                        • {item}
                      </Text>
                    ))}
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </Grid>
        </Card.Body>
      </Card.Root>
    </VStack>
  )

  const renderStageContent = () => {
    switch (activeStage) {
      case 0:
        return renderDeconstructStage()
      case 1:
        return renderConstructStage()
      case 2:
        return renderRealizeStage()
      case 3:
        return renderJourneyStage()
      default:
        return renderDeconstructStage()
    }
  }

  return (
    <Container maxW="7xl" py={8}>
      {/* 阶段导航 */}
      <Card.Root bg="white" p={6} borderRadius="xl" shadow="lg" mb={10}>
        <Card.Body>
          <Heading size="lg" textAlign="center" mb={6}>
            污水厂数字孪生交互式探索指南
          </Heading>
          <Steps.Root
            step={activeStage}
            count={stages.length}
            colorPalette="blue"
          >
            <Steps.List>
              {stages.map((stage, index) => (
                <Steps.Item
                  key={index}
                  index={index}
                  onClick={() => setActiveStage(index)}
                  cursor="pointer"
                >
                  <Steps.Indicator />
                  <Steps.Title>{stage.title}</Steps.Title>
                  <Steps.Description>{stage.description}</Steps.Description>
                  <Steps.Separator />
                </Steps.Item>
              ))}
            </Steps.List>
          </Steps.Root>
        </Card.Body>
      </Card.Root>

      {/* 阶段内容 */}
      {renderStageContent()}
    </Container>
  )
}
