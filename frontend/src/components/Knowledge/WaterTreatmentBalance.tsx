import {
  Box,
  Button,
  Card,
  Checkbox,
  CheckboxGroup,
  Container,
  Flex,
  Grid,
  HStack,
  Heading,
  Stack,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react"
import type React from "react"
import { useState } from "react"
import type { ChartConfig } from "../../data/articles/types"
import { InteractiveChart } from "./InteractiveChart"

interface ProcessUnit {
  id: string
  name: string
  description: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  color: string
  active?: boolean
}

const processUnits: ProcessUnit[] = [
  {
    id: "influent",
    name: "进水",
    description: "污水处理厂的原水输入点",
    position: { x: 20, y: 210 },
    size: { width: 160, height: 64 },
    color: "gray.100",
  },
  {
    id: "primary",
    name: "初沉池",
    description: "通过重力沉降去除大颗粒悬浮物",
    position: { x: 240, y: 100 },
    size: { width: 192, height: 80 },
    color: "blue.100",
  },
  {
    id: "bioreactor",
    name: "生物反应器",
    description: "微生物降解有机污染物的核心单元",
    position: { x: 240, y: 200 },
    size: { width: 192, height: 80 },
    color: "green.100",
  },
  {
    id: "sbr",
    name: "SBR",
    description: "序批式反应器，间歇运行的生物处理单元",
    position: { x: 240, y: 300 },
    size: { width: 192, height: 80 },
    color: "purple.100",
  },
  {
    id: "secondary",
    name: "二沉池",
    description: "分离活性污泥和处理后的清水",
    position: { x: 570, y: 200 },
    size: { width: 192, height: 80 },
    color: "blue.100",
  },
  {
    id: "effluent",
    name: "出水",
    description: "处理后的清洁水排放点",
    position: { x: 800, y: 210 },
    size: { width: 160, height: 64 },
    color: "gray.100",
  },
  {
    id: "sludge",
    name: "污泥处理",
    description: "处理和处置剩余污泥",
    position: { x: 570, y: 380 },
    size: { width: 192, height: 80 },
    color: "yellow.100",
  },
]

export const WaterTreatmentBalance: React.FC = () => {
  const [activeSection, setActiveSection] = useState("home")
  const [selectedUnit, setSelectedUnit] = useState("bioreactor")
  const [rtdSimulation, setRtdSimulation] = useState("ideal")
  const [checkedItems, setCheckedItems] = useState<string[]>([])

  // RTD图表数据
  const getRtdChartData = (): ChartConfig => {
    const timePoints = Array.from({ length: 50 }, (_, i) => i * 0.1)

    const datasets = {
      ideal: {
        label: "理想混合",
        data: timePoints.map((t) => Math.exp(-t)),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
      },
      shortcircuit: {
        label: "短流模式",
        data: timePoints.map((t) =>
          t < 0.5 ? 2 * Math.exp(-4 * t) : 0.1 * Math.exp(-t),
        ),
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        fill: true,
      },
      deadzone: {
        label: "死区模式",
        data: timePoints.map((t) => (t > 1 ? Math.exp(-(t - 1)) : 0)),
        borderColor: "rgb(245, 158, 11)",
        backgroundColor: "rgba(245, 158, 11, 0.1)",
        fill: true,
      },
    }

    return {
      id: "rtd-chart",
      type: "line",
      title: "水力停留时间分布 (RTD)",
      data: {
        labels: timePoints.map((t) => t.toFixed(1)),
        datasets: [datasets[rtdSimulation as keyof typeof datasets]],
      },
      options: {
        scales: {
          x: {
            title: {
              display: true,
              text: "无量纲时间 (t/τ)",
            },
          },
          y: {
            title: {
              display: true,
              text: "E(t)",
            },
          },
        },
      },
    }
  }

  // 物料平衡图表数据
  const getMassBalanceChartData = (): ChartConfig => {
    const scenarios = {
      ideal: { input: 100, output: 40, reaction: 60 },
      shortcircuit: { input: 100, output: 70, reaction: 30 },
      deadzone: { input: 100, output: 60, reaction: 40 },
    }

    const data = scenarios[rtdSimulation as keyof typeof scenarios]

    return {
      id: "mass-balance-chart",
      type: "bar",
      title: "物料平衡分析 (COD)",
      data: {
        labels: ["输入", "输出", "生物降解"],
        datasets: [
          {
            label: "COD (mg/L)",
            data: [data.input, data.output, data.reaction],
            backgroundColor: [
              "rgba(34, 197, 94, 0.8)",
              "rgba(59, 130, 246, 0.8)",
              "rgba(239, 68, 68, 0.8)",
            ],
            borderColor: [
              "rgb(34, 197, 94)",
              "rgb(59, 130, 246)",
              "rgb(239, 68, 68)",
            ],
            borderWidth: 2,
          },
        ],
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "COD浓度 (mg/L)",
            },
          },
        },
      },
    }
  }

  const checklistItems = [
    "确定系统边界和控制容积",
    "识别所有输入和输出流",
    "建立质量守恒方程",
    "收集准确的流量和浓度数据",
    "考虑化学反应和生物转化",
    "进行数据校正和平衡闭合",
    "验证模型结果的合理性",
    "建立动态监测和更新机制",
  ]

  const handleChecklistChange = (values: string[]) => {
    setCheckedItems(values)
  }

  const renderProcessFlow = () => (
    <Box
      position="relative"
      bg="white"
      p={8}
      borderRadius="xl"
      shadow="lg"
      h="500px"
    >
      {/* 处理单元 */}
      {processUnits.map((unit) => (
        <Box
          key={unit.id}
          position="absolute"
          left={`${unit.position.x}px`}
          top={`${unit.position.y}px`}
          width={`${unit.size.width}px`}
          height={`${unit.size.height}px`}
          bg={unit.color}
          border="2px"
          borderColor={selectedUnit === unit.id ? "blue.500" : "gray.300"}
          borderRadius="lg"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          transition="all 0.3s"
          _hover={{
            transform: "translateY(-4px)",
            shadow: "lg",
            borderColor: "blue.500",
          }}
          onClick={() => setSelectedUnit(unit.id)}
        >
          <Text fontWeight="semibold" textAlign="center" fontSize="sm">
            {unit.name}
          </Text>
        </Box>
      ))}

      {/* 连接箭头 */}
      <Box
        position="absolute"
        left="180px"
        top="234px"
        width="60px"
        height="8px"
        bg="gray.400"
      />
      <Box
        position="absolute"
        left="432px"
        top="234px"
        width="138px"
        height="8px"
        bg="gray.400"
      />
      <Box
        position="absolute"
        left="762px"
        top="234px"
        width="38px"
        height="8px"
        bg="gray.400"
      />
      <Box
        position="absolute"
        left="638px"
        top="280px"
        width="8px"
        height="100px"
        bg="gray.400"
      />
    </Box>
  )

  const renderConceptCards = () => (
    <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={6}>
      {[
        {
          title: "1. 质量守恒定律",
          content:
            "在一个系统中，质量不会凭空产生或消失。基本方程为：输入 - 输出 = 累积。这是所有平衡计算的基石。",
        },
        {
          title: "2. 控制容积 (CV)",
          content:
            '为进行分析而划定的虚拟边界。我们可以对单个反应器或整个工厂进行平衡计算，这取决于我们如何定义这个"容积"。',
        },
        {
          title: "3. 稳态 vs. 动态",
          content:
            "稳态：系统属性不随时间变化（累积=0）。动态：系统属性随时间变化（累积≠0），如SBR或液位变化的均衡池。",
        },
        {
          title: "4. 可变液位平衡",
          content:
            "当液位（体积V）和浓度(C)都变化时，累积项变为微分方程：d(VC)/dt = V(dC/dt) + C(dV/dt)。这是精确模拟SBR等过程的关键。",
        },
        {
          title: "5. 化学药剂投加",
          content:
            "投加的药剂（如用于除磷的铁盐）是直接的质量输入，并且会通过反应生成新的固体（污泥），必须精确计入平衡。",
        },
        {
          title: "6. 数据校正",
          content:
            "由于测量总有误差，原始数据几乎总是不平衡的。数据校正技术利用统计学方法微调数据，以强制实现质量闭合，使模型可信。",
        },
      ].map((concept, index) => (
        <Card.Root key={index} bg="gray.50" border="1px" borderColor="gray.200">
          <Card.Body>
            <Heading size="md" mb={2}>
              {concept.title}
            </Heading>
            <Text color="gray.700">{concept.content}</Text>
          </Card.Body>
        </Card.Root>
      ))}
    </Grid>
  )

  return (
    <Container maxW="7xl" py={8}>
      {/* 导航 */}
      <Flex
        justify="center"
        bg="white"
        p={2}
        borderRadius="xl"
        shadow="md"
        mb={10}
      >
        <HStack gap={2}>
          {[
            { id: "home", label: "主页：工艺流程图" },
            { id: "concepts", label: "核心概念" },
            { id: "tools", label: "实践工具箱" },
          ].map((nav) => (
            <Button
              key={nav.id}
              variant={activeSection === nav.id ? "solid" : "ghost"}
              colorScheme={activeSection === nav.id ? "blue" : "gray"}
              onClick={() => setActiveSection(nav.id)}
            >
              {nav.label}
            </Button>
          ))}
        </HStack>
      </Flex>

      {/* 主页内容 */}
      {activeSection === "home" && (
        <VStack gap={8}>
          <Card.Root bg="white" p={6} borderRadius="xl" shadow="lg" w="100%">
            <Card.Body>
              <Heading size="lg" textAlign="center" mb={4}>
                污水处理厂 (WWTP) 工艺流程模型
              </Heading>
              <Text
                textAlign="center"
                color="gray.600"
                maxW="3xl"
                mx="auto"
                mb={8}
              >
                这是我们进行物料平衡分析的虚拟工厂。整个应用将围绕这个模型展开。请点击下方的任何一个处理单元，以深入探索其内部的水力行为、物料转化和平衡计算。
              </Text>
            </Card.Body>
          </Card.Root>

          {renderProcessFlow()}

          <Card.Root bg="white" p={8} borderRadius="xl" shadow="lg" w="100%">
            <Card.Body>
              <Heading size="lg" mb={4}>
                {processUnits.find((u) => u.id === selectedUnit)?.name}模拟
              </Heading>
              <Text color="gray.700" mb={6}>
                {processUnits.find((u) => u.id === selectedUnit)?.description}
              </Text>

              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8}>
                <Box>
                  <Heading size="md" mb={2}>
                    水力停留时间分布 (RTD)
                  </Heading>
                  <Text fontSize="sm" color="gray.600" mb={4}>
                    RTD曲线揭示了水流在反应器内的实际"旅行时间"分布，是诊断水力缺陷的"心电图"。
                  </Text>
                  <HStack gap={2} mb={4} bg="gray.100" p={1} borderRadius="lg">
                    {[
                      { id: "ideal", label: "理想混合" },
                      { id: "shortcircuit", label: "短流模式" },
                      { id: "deadzone", label: "死区模式" },
                    ].map((sim) => (
                      <Button
                        key={sim.id}
                        size="sm"
                        variant={rtdSimulation === sim.id ? "solid" : "ghost"}
                        colorScheme={rtdSimulation === sim.id ? "blue" : "gray"}
                        onClick={() => setRtdSimulation(sim.id)}
                        flex={1}
                      >
                        {sim.label}
                      </Button>
                    ))}
                  </HStack>
                  <InteractiveChart config={getRtdChartData()} height={300} />
                </Box>

                <Box>
                  <Heading size="md" mb={2}>
                    物料平衡分析 (COD)
                  </Heading>
                  <Text fontSize="sm" color="gray.600" mb={4}>
                    此图展示在不同水力条件下，COD在生物反应器这个控制容积内的平衡情况。
                  </Text>
                  <Box mt={14}>
                    <InteractiveChart
                      config={getMassBalanceChartData()}
                      height={300}
                    />
                  </Box>
                </Box>
              </Grid>
            </Card.Body>
          </Card.Root>
        </VStack>
      )}

      {/* 核心概念 */}
      {activeSection === "concepts" && (
        <Card.Root bg="white" p={8} borderRadius="xl" shadow="lg">
          <Card.Body>
            <Heading size="lg" textAlign="center" mb={2}>
              核心概念解析
            </Heading>
            <Text
              textAlign="center"
              color="gray.600"
              maxW="3xl"
              mx="auto"
              mb={8}
            >
              物料平衡不是简单的加减法，它建立在一系列核心工程原理之上。本节将通过交互式卡片，为您解析构建一个可靠平衡框架所必须理解的关键概念。
            </Text>
            {renderConceptCards()}
          </Card.Body>
        </Card.Root>
      )}

      {/* 实践工具箱 */}
      {activeSection === "tools" && (
        <VStack gap={8}>
          <Card.Root bg="white" p={8} borderRadius="xl" shadow="lg" w="100%">
            <Card.Body>
              <Heading size="lg" textAlign="center" mb={2}>
                实践工具箱
              </Heading>
              <Text
                textAlign="center"
                color="gray.600"
                maxW="3xl"
                mx="auto"
                mb={8}
              >
                一个成功的物料平衡框架，不仅需要理论，更需要正确的工具和系统化的实施步骤。
              </Text>
              <Box overflowX="auto">
                <Table.Root variant="line">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader bg="gray.100">
                        特性
                      </Table.ColumnHeader>
                      <Table.ColumnHeader bg="gray.100">
                        电子表格 (如 Excel)
                      </Table.ColumnHeader>
                      <Table.ColumnHeader bg="gray.100">
                        专用模拟软件 (如 BioWin)
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    <Table.Row>
                      <Table.Cell fontWeight="semibold">成本</Table.Cell>
                      <Table.Cell>低</Table.Cell>
                      <Table.Cell>高</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell fontWeight="semibold">
                        动态模拟能力
                      </Table.Cell>
                      <Table.Cell>有限，实现复杂</Table.Cell>
                      <Table.Cell>强大，核心功能</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell fontWeight="semibold">透明度</Table.Cell>
                      <Table.Cell>高，所有公式可见</Table.Cell>
                      <Table.Cell>低，核心模型为"黑箱"</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell fontWeight="semibold">
                        理想应用场景
                      </Table.Cell>
                      <Table.Cell>单一单元的稳态分析，教学演示</Table.Cell>
                      <Table.Cell>全厂动态模拟，工艺优化评估</Table.Cell>
                    </Table.Row>
                  </Table.Body>
                </Table.Root>
              </Box>
            </Card.Body>
          </Card.Root>

          <Card.Root bg="white" p={8} borderRadius="xl" shadow="lg" w="100%">
            <Card.Body>
              <Heading size="md" mb={4}>
                行动建议清单
              </Heading>
              <CheckboxGroup
                value={checkedItems}
                onValueChange={handleChecklistChange}
              >
                <Stack gap={3}>
                  {checklistItems.map((item, index) => (
                    <Checkbox.Root key={index} value={item}>
                      {item}
                    </Checkbox.Root>
                  ))}
                </Stack>
              </CheckboxGroup>
              <Box mt={4}>
                <Text fontSize="sm" color="gray.600">
                  已完成：{checkedItems.length} / {checklistItems.length} 项
                </Text>
              </Box>
            </Card.Body>
          </Card.Root>
        </VStack>
      )}
    </Container>
  )
}
