import { Box, Container, Heading, Text } from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  Area,
  AreaChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useI18n } from "../../i18n"

export const Route = createFileRoute("/_layout/overview")({
  component: Overview,
})

// 从环境变量读取 API 地址
const apiUrl = import.meta.env.VITE_API_URL || "/api/v1"

interface WaterPlant {
  id: number
  name: string
  tank_long: number
  tank_width: number
  tank_height: number
  min_safe_level: number
  max_safe_level: number
  target_level: number
}

interface ProductionData {
  id: number
  plant_id: number
  timestamp: string
  production_flow: number
  supply_flow: number
  clear_well_level: number
}

// interface SimulationResult {
//   id: number
//   plant_id: number
//   timestamp: string
//   predicted_level: number
//   predicted_consumption: number
//   production_rate: number
//   status: string
// }

interface ChlorineSimulationState {
  id: number
  plant_id: number
  comp_id: number
  timestamp: string
  volume: number
  chlorine_mix: number
  chlorine_stage: number
}

interface DataPoint {
  hour: string
  value: number
  prediction: number
  isHistory: boolean
}

function Overview() {
  const { t } = useI18n()
  // 获取当前时间
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const nextDayOneAM = new Date(today)
  nextDayOneAM.setDate(nextDayOneAM.getDate() + 1)
  nextDayOneAM.setHours(1, 0, 0, 0)

  // 获取水厂信息
  const { data: plantData } = useQuery<WaterPlant>({
    queryKey: ["waterPlant"],
    queryFn: async () => {
      const response = await fetch(`${apiUrl}/water-plants/1`)
      if (!response.ok) {
        throw new Error(t("overview.errors.plant"))
      }
      return response.json()
    },
  })

  // 获取历史生产数据
  const { data: productionData } = useQuery<ProductionData[]>({
    queryKey: ["productionData", today.toISOString()],
    queryFn: async () => {
      const url = new URL(`${apiUrl}/production/data/1`)
      url.searchParams.append("start_time", today.toISOString())
      url.searchParams.append("end_time", nextDayOneAM.toISOString())

      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error(t("overview.errors.production"))
      }
      return response.json()
    },
    refetchInterval: 60000,
  })

  // 获取预测数据
  // const { data: simulationData } = useQuery<SimulationResult[]>({
  //   queryKey: ["simulationData", today.toISOString()],
  //   queryFn: async () => {
  //     const url = new URL(`${apiUrl}/simulation/results/1`)
  //     url.searchParams.append('start_time', today.toISOString())
  //     url.searchParams.append('end_time', nextDayOneAM.toISOString())

  //     const response = await fetch(url.toString())
  //     if (!response.ok) {
  //       throw new Error('获取预测数据失败')
  //     }
  //     return response.json()
  //   },
  //   refetchInterval: 60000
  // })

  const { data: simulationStates } = useQuery({
    queryKey: ["chlorineSimulation", today.toISOString()],
    queryFn: async () => {
      // 设置查询开始时间为当天0点
      const startTime = new Date(today)
      startTime.setHours(0, 0, 0, 0)

      // 设置查询结束时间
      const endTime = new Date(today)
      endTime.setHours(new Date().getHours() + 4, 59, 59, 999)

      const url = new URL(`${apiUrl}/chlorine/states/1`)
      url.searchParams.append("start_time", startTime.toISOString())
      url.searchParams.append("end_time", endTime.toISOString())

      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error(t("overview.errors.chlorine"))
      }
      const data = (await response.json()) as ChlorineSimulationState[]

      // 按时间戳分组，只保留每个时间点中 comp_id 最大的记录
      const groupedData = data.reduce(
        (acc, curr) => {
          const timestamp = new Date(curr.timestamp).getTime()
          if (!acc[timestamp] || curr.comp_id > acc[timestamp].comp_id) {
            acc[timestamp] = curr
          }
          return acc
        },
        {} as Record<number, ChlorineSimulationState>,
      )

      // 转换回数组并按时间戳倒序排列
      return Object.values(groupedData).sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
    },
  })

  // 处理数据
  const data: DataPoint[] = []

  if (plantData) {
    // 计算水池面积
    const tankArea = plantData.tank_long * plantData.tank_width

    // 生成25小时的时间点（0:00-次日1:00）
    for (let i = 0; i <= 25; i++) {
      const time = new Date(today)
      time.setHours(i)
      const isNextDay = i >= 24
      const displayHour = isNextDay ? i - 24 : i
      const hour = `${isNextDay ? t("overview.nextDayPrefix") : ""}${displayHour.toString().padStart(2, "0")}:00`
      const isHistory = time <= now

      // 查找对应时间的历史数据
      const historyPoint = productionData?.find((p) => {
        const pTime = new Date(p.timestamp)
        return (
          pTime.getHours() === time.getHours() &&
          pTime.getDate() === time.getDate()
        )
      })

      // 查找对应时间的预测数据
      const predictionPoint = simulationStates?.find((s) => {
        const sTime = new Date(s.timestamp)
        return (
          sTime.getHours() === time.getHours() &&
          sTime.getDate() === time.getDate()
        )
      })

      // 计算实际水量（立方米）
      data.push({
        hour,
        value:
          isHistory && historyPoint
            ? historyPoint.clear_well_level * tankArea
            : Number.NaN,
        prediction: predictionPoint ? predictionPoint.volume * 8 : Number.NaN, // 预测数据乘以8
        isHistory,
      })
    }
  }

  return (
    <Container maxW="full">
      <Box pt={6} m={4}>
        <Heading size="lg" mb={6}>
          {t("overview.title")}
        </Heading>

        <Box
          bg="white"
          p={6}
          borderRadius="lg"
          shadow="sm"
          border="1px"
          borderColor="gray.200"
        >
          <Text fontSize="md" mb={4} color="gray.600">
            {t("overview.subtitle")}
          </Text>

          <Box h="350px">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart
                data={data}
                margin={{
                  left: 20,
                  right: 10,
                  top: 0,
                  bottom: 10,
                }}
              >
                <XAxis
                  dataKey="hour"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  angle={-45}
                  textAnchor="end"
                  height={50}
                  minTickGap={15}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value.toFixed(1)}m³`}
                  width={55}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    const label =
                      name === "value"
                        ? t("overview.actualWater")
                        : t("overview.predictedWater")
                    return [`${value.toFixed(1)}m³`, label]
                  }}
                  labelFormatter={(label) => t("overview.timeLabel", { label })}
                  wrapperStyle={{ zIndex: 1000 }}
                />
                <Legend
                  formatter={(value) =>
                    value === "value"
                      ? t("overview.actualWater")
                      : t("overview.predictedWater")
                  }
                  wrapperStyle={{
                    borderRadius: "3px",
                    padding: "5px",
                    width: "200px",
                    maxWidth: "300px",
                    top: 0,
                    right: 0,
                  }}
                  layout="horizontal"
                  align="right"
                  verticalAlign="top"
                  iconType="circle"
                  iconSize={8}
                />
                <ReferenceLine
                  x={`${now.getHours().toString().padStart(2, "0")}:00`}
                  stroke="#666"
                  strokeDasharray="3 3"
                  label={{
                    value: t("overview.currentTime"),
                    position: "insideTopLeft",
                  }}
                />
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#000000" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#000000" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient
                    id="colorPrediction"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#ff0000" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#ff0000" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <Area
                  name="value"
                  type="monotone"
                  dataKey="value"
                  stroke="#000000"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  dot={false}
                />
                <Area
                  name="prediction"
                  type="monotone"
                  dataKey="prediction"
                  stroke="#ff0000"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fillOpacity={1}
                  fill="url(#colorPrediction)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      </Box>
    </Container>
  )
}
